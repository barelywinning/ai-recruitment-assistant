# System Architecture

## Overview

The AI Recruitment Assistant is a multi-agent platform following Google ADK (Agent Development Kit) principles. Agents communicate in a directed pipeline, with all inter-agent messages logged for transparency.

## Agent Pipeline

```
PDF Upload
    ↓
ResumeParser MCP (pdfplumber + PyPDF2)
    ↓
Resume Screening Agent (Gemini AI)
    ↓  → Candidate profile JSON
Job Matching Agent (Gemini AI)
    ↓  → Match score + skills analysis
Candidate Ranking Agent (Gemini AI)
    ↓  → Hiring score + recommendation
Interview Coordination Agent (Gemini AI)
    ↓  → 20 tailored interview questions
Calendar MCP → Interview schedule
    ↓
ATS MCP → Save to SQLite
    ↓
Response to Frontend
```

## MCP Servers

| Server | Functions | Storage |
|--------|-----------|---------|
| ATS MCP | save_candidate, get_candidate, list_candidates | SQLite |
| Calendar MCP | create_interview_slot, get_schedule | In-memory |
| ResumeParser MCP | extract_text, clean_resume, parse_resume | Stateless |

## Agent Communication Protocol

All inter-agent messages follow this schema:
```json
{
  "from_agent": "Resume Screening Agent",
  "to_agent": "Job Matching Agent",
  "message": "Candidate 'John Doe' profiled. Skills: 15 | Experience: 3 entries",
  "timestamp": "2024-01-01T10:10:00Z",
  "status": "success",
  "candidate_id": 42
}
```

## Database Schema

### candidates
- id, candidate_name, email, phone
- skills, experience, education, certifications (JSON)
- job_description, match_score, matching_skills, missing_skills (JSON)
- strengths, weaknesses (JSON)
- hiring_score, recommendation, reasoning
- interview_questions, interview_slots (JSON)
- resume_text, created_at, updated_at

### agent_logs
- id, candidate_id
- from_agent, to_agent, message
- timestamp, status

## Security Notes

- API keys via environment variables only
- File upload limited to 10MB PDF
- CORS configured (restrict in production)
- SQLite suitable for demo; use PostgreSQL in production
