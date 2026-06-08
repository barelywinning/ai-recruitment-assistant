"""
Pydantic models for request/response validation.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


# ─── Resume Screening ────────────────────────────────────────────────────────

class ResumeScreeningResult(BaseModel):
    candidate_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    experience: List[str] = []
    education: List[str] = []
    certifications: List[str] = []


# ─── Job Matching ─────────────────────────────────────────────────────────────

class JobMatchRequest(BaseModel):
    candidate_id: int
    job_description: str


class JobMatchResult(BaseModel):
    match_score: float
    matching_skills: List[str] = []
    missing_skills: List[str] = []
    strengths: List[str] = []
    weaknesses: List[str] = []


# ─── Candidate Ranking ────────────────────────────────────────────────────────

class RankingResult(BaseModel):
    hiring_score: float
    recommendation: str  # Strong Hire / Hire / Consider / Reject
    reasoning: str
    category_scores: Dict[str, float] = {}


# ─── Interview ────────────────────────────────────────────────────────────────

class InterviewQuestions(BaseModel):
    technical: List[str] = []
    hr: List[str] = []
    project_based: List[str] = []
    follow_up: List[str] = []


class InterviewSlot(BaseModel):
    date: str
    time: str
    duration: str
    interviewer: str
    mode: str


# ─── Full Pipeline ────────────────────────────────────────────────────────────

class FullEvaluationResult(BaseModel):
    candidate_id: int
    screening: ResumeScreeningResult
    matching: JobMatchResult
    ranking: RankingResult
    interview: InterviewQuestions
    interview_slots: List[InterviewSlot] = []
    agent_logs: List[Dict[str, Any]] = []


# ─── Agent Log ────────────────────────────────────────────────────────────────

class AgentLogEntry(BaseModel):
    id: int
    candidate_id: Optional[int]
    from_agent: str
    to_agent: str
    message: str
    timestamp: datetime
    status: str

    class Config:
        from_attributes = True


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_candidates: int
    average_match_score: float
    recommendation_breakdown: Dict[str, int]
    score_distribution: List[Dict[str, Any]]
    top_candidates: List[Dict[str, Any]]


# ─── Candidate List ───────────────────────────────────────────────────────────

class CandidateSummary(BaseModel):
    id: int
    candidate_name: str
    email: Optional[str]
    match_score: Optional[float]
    hiring_score: Optional[float]
    recommendation: Optional[str]
    skills: List[str]
    strengths: List[str]
    weaknesses: List[str]
    created_at: datetime

    class Config:
        from_attributes = True
