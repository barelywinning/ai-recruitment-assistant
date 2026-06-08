"""
ATS (Applicant Tracking System) MCP Server.
Provides: save_candidate(), get_candidate(), list_candidates()
Backed by SQLite via SQLAlchemy.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from core.database import CandidateRecord


class ATSMCPServer:
    """
    MCP Server for Applicant Tracking System operations.
    Simulates an enterprise ATS integration.
    """

    def __init__(self, db: Session):
        self.db = db
        self.server_name = "ATS-MCP-v1"

    def save_candidate(self, candidate_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save or update a candidate in the ATS database.
        Returns the saved candidate record with assigned ID.
        """
        candidate_id = candidate_data.get("id")

        if candidate_id:
            # Update existing
            record = self.db.query(CandidateRecord).filter(
                CandidateRecord.id == candidate_id
            ).first()
            if record:
                for key, value in candidate_data.items():
                    if hasattr(record, key) and key != "id":
                        setattr(record, key, value)
                record.updated_at = datetime.utcnow()
                self.db.commit()
                self.db.refresh(record)
                return self._serialize(record)

        # Create new
        record = CandidateRecord(
            candidate_name=candidate_data.get("candidate_name", "Unknown"),
            email=candidate_data.get("email"),
            phone=candidate_data.get("phone"),
            skills=candidate_data.get("skills", []),
            experience=candidate_data.get("experience", []),
            education=candidate_data.get("education", []),
            certifications=candidate_data.get("certifications", []),
            job_description=candidate_data.get("job_description"),
            match_score=candidate_data.get("match_score"),
            matching_skills=candidate_data.get("matching_skills", []),
            missing_skills=candidate_data.get("missing_skills", []),
            strengths=candidate_data.get("strengths", []),
            weaknesses=candidate_data.get("weaknesses", []),
            hiring_score=candidate_data.get("hiring_score"),
            recommendation=candidate_data.get("recommendation"),
            reasoning=candidate_data.get("reasoning"),
            interview_questions=candidate_data.get("interview_questions", {}),
            interview_slots=candidate_data.get("interview_slots", []),
            resume_text=candidate_data.get("resume_text"),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return self._serialize(record)

    def get_candidate(self, candidate_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single candidate by ID.
        Returns None if not found.
        """
        record = self.db.query(CandidateRecord).filter(
            CandidateRecord.id == candidate_id
        ).first()
        return self._serialize(record) if record else None

    def list_candidates(
        self,
        search: Optional[str] = None,
        recommendation: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List candidates with optional filtering.
        """
        query = self.db.query(CandidateRecord)

        if search:
            query = query.filter(
                CandidateRecord.candidate_name.ilike(f"%{search}%") |
                CandidateRecord.email.ilike(f"%{search}%")
            )

        if recommendation:
            query = query.filter(
                CandidateRecord.recommendation == recommendation
            )

        records = query.order_by(
            CandidateRecord.created_at.desc()
        ).offset(offset).limit(limit).all()

        return [self._serialize(r) for r in records]

    def get_dashboard_stats(self) -> Dict[str, Any]:
        """
        Aggregate statistics for the recruiter dashboard.
        """
        all_records = self.db.query(CandidateRecord).all()
        total = len(all_records)

        if total == 0:
            return {
                "total_candidates": 0,
                "average_match_score": 0,
                "recommendation_breakdown": {},
                "score_distribution": [],
                "top_candidates": []
            }

        scores = [r.match_score for r in all_records if r.match_score is not None]
        avg_score = sum(scores) / len(scores) if scores else 0

        rec_breakdown: Dict[str, int] = {}
        for r in all_records:
            rec = r.recommendation or "Pending"
            rec_breakdown[rec] = rec_breakdown.get(rec, 0) + 1

        # Score buckets for distribution chart
        buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
        for r in all_records:
            if r.match_score is not None:
                s = r.match_score
                if s <= 20:
                    buckets["0-20"] += 1
                elif s <= 40:
                    buckets["21-40"] += 1
                elif s <= 60:
                    buckets["41-60"] += 1
                elif s <= 80:
                    buckets["61-80"] += 1
                else:
                    buckets["81-100"] += 1

        score_dist = [{"range": k, "count": v} for k, v in buckets.items()]

        top = sorted(
            [r for r in all_records if r.hiring_score is not None],
            key=lambda x: x.hiring_score,
            reverse=True
        )[:5]

        return {
            "total_candidates": total,
            "average_match_score": round(avg_score, 1),
            "recommendation_breakdown": rec_breakdown,
            "score_distribution": score_dist,
            "top_candidates": [self._serialize(r) for r in top]
        }

    def _serialize(self, record: CandidateRecord) -> Dict[str, Any]:
        return {
            "id": record.id,
            "candidate_name": record.candidate_name,
            "email": record.email,
            "phone": record.phone,
            "skills": record.skills or [],
            "experience": record.experience or [],
            "education": record.education or [],
            "certifications": record.certifications or [],
            "job_description": record.job_description,
            "match_score": record.match_score,
            "matching_skills": record.matching_skills or [],
            "missing_skills": record.missing_skills or [],
            "strengths": record.strengths or [],
            "weaknesses": record.weaknesses or [],
            "hiring_score": record.hiring_score,
            "recommendation": record.recommendation,
            "reasoning": record.reasoning,
            "interview_questions": record.interview_questions or {},
            "interview_slots": record.interview_slots or [],
            "resume_text": record.resume_text,
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        }
