"""
Agent Coordinator — Google ADK-style orchestration layer.
Manages A2A communication pipeline with full logging.
Pipeline: ResumeScreening → JobMatching → CandidateRanking → InterviewCoordination
"""
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from agents.resume_screening_agent import ResumeScreeningAgent
from agents.job_matching_agent import JobMatchingAgent
from agents.candidate_ranking_agent import CandidateRankingAgent
from agents.interview_agent import InterviewCoordinationAgent
from mcp_servers.ats_mcp import ATSMCPServer
from mcp_servers.calendar_mcp import CalendarMCPServer
from mcp_servers.resume_parser_mcp import ResumeParserMCPServer
from core.database import AgentLog


class AgentCoordinator:
    """
    Central coordinator implementing Google ADK-style multi-agent orchestration.
    
    Agent Communication Protocol:
    - Each agent receives standardized input from the previous agent
    - All communications are logged to the database
    - MCP servers are called for external integrations
    - Full pipeline execution is atomic from the caller's perspective
    """

    def __init__(self, db: Session):
        self.db = db

        # Initialize agents
        self.resume_agent = ResumeScreeningAgent()
        self.matching_agent = JobMatchingAgent()
        self.ranking_agent = CandidateRankingAgent()
        self.interview_agent = InterviewCoordinationAgent()

        # Initialize MCP servers
        self.ats_mcp = ATSMCPServer(db)
        self.calendar_mcp = CalendarMCPServer()
        self.parser_mcp = ResumeParserMCPServer()

        # In-memory communication log for current session
        self._session_logs: List[Dict[str, Any]] = []

    def run_full_pipeline(
        self,
        file_bytes: bytes,
        filename: str,
        job_description: str
    ) -> Dict[str, Any]:
        """
        Execute the complete 4-agent pipeline.
        
        Args:
            file_bytes: Raw PDF file bytes
            filename: Original filename
            job_description: Target job description
            
        Returns:
            Complete evaluation result with all agent outputs
        """
        self._session_logs = []
        pipeline_start = time.time()

        # ── Step 0: MCP Resume Parser ──────────────────────────────────────────
        self._log_communication(
            from_agent="Coordinator",
            to_agent="ResumeParser MCP",
            message=f"Sending PDF '{filename}' for text extraction",
            candidate_id=None
        )

        extract_result = self.parser_mcp.extract_text(file_bytes, filename)
        if not extract_result["success"]:
            return {"error": f"PDF extraction failed: {extract_result.get('error')}", "logs": self._session_logs}

        clean_result = self.parser_mcp.clean_resume(extract_result["text"])
        parse_result = self.parser_mcp.parse_resume(clean_result["cleaned_text"])

        self._log_communication(
            from_agent="ResumeParser MCP",
            to_agent="Resume Screening Agent",
            message=f"Extracted {clean_result['cleaned_length']} chars from {extract_result['page_count']} pages. Sections: {parse_result['sections_detected']}",
            candidate_id=None
        )

        # ── Step 1: Resume Screening Agent ────────────────────────────────────
        screening_result = self.resume_agent.run(
            resume_text=clean_result["cleaned_text"],
            parser_hints=parse_result
        )

        candidate_profile = screening_result["data"]
        candidate_name = candidate_profile.get("candidate_name", "Unknown")

        # Save initial candidate record
        candidate_record = self.ats_mcp.save_candidate({
            **candidate_profile,
            "job_description": job_description,
            "resume_text": clean_result["cleaned_text"][:10000],
        })
        candidate_id = candidate_record["id"]

        self._log_communication(
            from_agent="Resume Screening Agent",
            to_agent="Job Matching Agent",
            message=f"Candidate '{candidate_name}' profiled. Skills: {len(candidate_profile.get('skills', []))} | Experience: {len(candidate_profile.get('experience', []))} entries",
            candidate_id=candidate_id
        )

        # ── Step 2: Job Matching Agent ─────────────────────────────────────────
        matching_result = self.matching_agent.run(
            candidate_profile=candidate_profile,
            job_description=job_description
        )

        match_data = matching_result["data"]
        match_score = match_data.get("match_score", 0)

        self._log_communication(
            from_agent="Job Matching Agent",
            to_agent="Candidate Ranking Agent",
            message=f"Match score: {match_score:.1f}%. Matching skills: {len(match_data.get('matching_skills', []))} | Missing: {len(match_data.get('missing_skills', []))}",
            candidate_id=candidate_id
        )

        # ── Step 3: Candidate Ranking Agent ───────────────────────────────────
        ranking_result = self.ranking_agent.run(
            candidate_profile=candidate_profile,
            match_analysis=match_data
        )

        ranking_data = ranking_result["data"]
        hiring_score = ranking_data.get("hiring_score", 0)
        recommendation = ranking_data.get("recommendation", "Consider")

        self._log_communication(
            from_agent="Candidate Ranking Agent",
            to_agent="Interview Coordination Agent",
            message=f"Hiring score: {hiring_score:.1f}/100 | Recommendation: {recommendation}",
            candidate_id=candidate_id
        )

        # ── Step 4: Interview Coordination Agent ──────────────────────────────
        interview_result = self.interview_agent.run(
            candidate_profile=candidate_profile,
            match_analysis=match_data,
            ranking_data=ranking_data
        )

        interview_questions = interview_result["data"]

        # ── MCP: Calendar — Generate Interview Slots ──────────────────────────
        self._log_communication(
            from_agent="Interview Coordination Agent",
            to_agent="Calendar MCP",
            message=f"Requesting {recommendation}-level interview schedule for {candidate_name}",
            candidate_id=candidate_id
        )

        interview_slots = self.calendar_mcp.create_interview_slot(
            candidate_id=candidate_id,
            candidate_name=candidate_name,
            recommendation=recommendation
        )

        self._log_communication(
            from_agent="Calendar MCP",
            to_agent="ATS MCP",
            message=f"Generated {len(interview_slots)} interview rounds. Saving complete evaluation to ATS.",
            candidate_id=candidate_id
        )

        # ── MCP: ATS — Save Complete Evaluation ───────────────────────────────
        updated_record = self.ats_mcp.save_candidate({
            "id": candidate_id,
            **candidate_profile,
            "job_description": job_description,
            "match_score": match_score,
            "matching_skills": match_data.get("matching_skills", []),
            "missing_skills": match_data.get("missing_skills", []),
            "strengths": match_data.get("strengths", []),
            "weaknesses": match_data.get("weaknesses", []),
            "hiring_score": hiring_score,
            "recommendation": recommendation,
            "reasoning": ranking_data.get("reasoning", ""),
            "interview_questions": interview_questions,
            "interview_slots": interview_slots,
            "resume_text": clean_result["cleaned_text"][:10000],
        })

        # Save all logs to DB
        self._save_logs_to_db(candidate_id)

        elapsed = round(time.time() - pipeline_start, 2)

        self._log_communication(
            from_agent="ATS MCP",
            to_agent="Coordinator",
            message=f"Pipeline complete in {elapsed}s. Candidate ID: {candidate_id} saved to ATS.",
            candidate_id=candidate_id
        )

        return {
            "success": True,
            "candidate_id": candidate_id,
            "screening": candidate_profile,
            "matching": match_data,
            "ranking": ranking_data,
            "interview_questions": interview_questions,
            "interview_slots": interview_slots,
            "agent_logs": self._session_logs,
            "pipeline_duration_seconds": elapsed
        }

    def _log_communication(
        self,
        from_agent: str,
        to_agent: str,
        message: str,
        candidate_id: Optional[int] = None,
        status: str = "success"
    ):
        """Record an A2A communication event."""
        entry = {
            "from_agent": from_agent,
            "to_agent": to_agent,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": status,
            "candidate_id": candidate_id
        }
        self._session_logs.append(entry)

    def _save_logs_to_db(self, candidate_id: int):
        """Persist all session logs to the database."""
        for log in self._session_logs:
            db_log = AgentLog(
                candidate_id=candidate_id,
                from_agent=log["from_agent"],
                to_agent=log["to_agent"],
                message=log["message"],
                status=log["status"]
            )
            self.db.add(db_log)
        self.db.commit()

    def get_agent_logs(
        self,
        candidate_id: Optional[int] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Retrieve agent communication logs from database."""
        query = self.db.query(AgentLog)
        if candidate_id:
            query = query.filter(AgentLog.candidate_id == candidate_id)
        logs = query.order_by(AgentLog.timestamp.desc()).limit(limit).all()
        return [
            {
                "id": log.id,
                "from_agent": log.from_agent,
                "to_agent": log.to_agent,
                "message": log.message,
                "timestamp": log.timestamp.isoformat() + "Z",
                "status": log.status,
                "candidate_id": log.candidate_id
            }
            for log in logs
        ]
