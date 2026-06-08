"""
Database setup using SQLAlchemy with SQLite.
"""
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./recruitment.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class CandidateRecord(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    candidate_name = Column(String, index=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    skills = Column(JSON, default=[])
    experience = Column(JSON, default=[])
    education = Column(JSON, default=[])
    certifications = Column(JSON, default=[])
    job_description = Column(Text, nullable=True)
    match_score = Column(Float, nullable=True)
    matching_skills = Column(JSON, default=[])
    missing_skills = Column(JSON, default=[])
    strengths = Column(JSON, default=[])
    weaknesses = Column(JSON, default=[])
    hiring_score = Column(Float, nullable=True)
    recommendation = Column(String, nullable=True)
    reasoning = Column(Text, nullable=True)
    interview_questions = Column(JSON, default={})
    interview_slots = Column(JSON, default=[])
    resume_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, nullable=True)
    from_agent = Column(String)
    to_agent = Column(String)
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="success")


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
