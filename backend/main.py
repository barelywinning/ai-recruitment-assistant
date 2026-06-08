"""
AI-Powered Recruitment Assistant — FastAPI Backend
Main application entry point with all API endpoints.
"""
import io
import os
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

load_dotenv()

from core.database import create_tables, get_db, CandidateRecord
from core.agent_coordinator import AgentCoordinator
from mcp_servers.ats_mcp import ATSMCPServer

app = FastAPI(
    title="AI Recruitment Assistant API",
    description="Multi-agent recruitment platform powered by Gemini AI",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
@app.on_event("startup")
def startup():
    create_tables()


# ─── Health Check ────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Recruitment Assistant",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))
    }


# ─── Upload & Full Pipeline ───────────────────────────────────────────────────

@app.post("/api/upload_resume")
async def upload_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload a PDF resume and run the full 4-agent evaluation pipeline.
    Returns complete candidate evaluation including match score, ranking, and interview questions.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    if len(job_description.strip()) < 20:
        raise HTTPException(status_code=400, detail="Job description too short")

    coordinator = AgentCoordinator(db)
    result = coordinator.run_full_pipeline(
        file_bytes=file_bytes,
        filename=file.filename,
        job_description=job_description
    )

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


# ─── Job Match (standalone) ───────────────────────────────────────────────────

@app.post("/api/job_match")
def job_match(
    candidate_id: int,
    job_description: str,
    db: Session = Depends(get_db)
):
    """Re-run job matching for an existing candidate with a new job description."""
    ats = ATSMCPServer(db)
    candidate = ats.get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    from agents.job_matching_agent import JobMatchingAgent
    agent = JobMatchingAgent()
    result = agent.run(candidate, job_description)
    return result


# ─── Rank Candidate (standalone) ──────────────────────────────────────────────

@app.post("/api/rank_candidate")
def rank_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Re-run ranking for an existing candidate."""
    ats = ATSMCPServer(db)
    candidate = ats.get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    from agents.candidate_ranking_agent import CandidateRankingAgent
    agent = CandidateRankingAgent()
    match_data = {
        "match_score": candidate.get("match_score", 0),
        "matching_skills": candidate.get("matching_skills", []),
        "missing_skills": candidate.get("missing_skills", []),
        "strengths": candidate.get("strengths", []),
        "weaknesses": candidate.get("weaknesses", []),
    }
    result = agent.run(candidate, match_data)
    return result


# ─── Generate Interview Questions (standalone) ────────────────────────────────

@app.post("/api/generate_interview")
def generate_interview(candidate_id: int, db: Session = Depends(get_db)):
    """Regenerate interview questions for an existing candidate."""
    ats = ATSMCPServer(db)
    candidate = ats.get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    from agents.interview_agent import InterviewCoordinationAgent
    agent = InterviewCoordinationAgent()
    match_data = {
        "match_score": candidate.get("match_score", 0),
        "matching_skills": candidate.get("matching_skills", []),
        "missing_skills": candidate.get("missing_skills", []),
        "strengths": candidate.get("strengths", []),
        "weaknesses": candidate.get("weaknesses", []),
    }
    ranking_data = {
        "hiring_score": candidate.get("hiring_score", 0),
        "recommendation": candidate.get("recommendation", "Consider"),
        "reasoning": candidate.get("reasoning", ""),
    }
    result = agent.run(candidate, match_data, ranking_data)

    # Update in ATS
    if result["success"]:
        ats.save_candidate({
            "id": candidate_id,
            "interview_questions": result["data"]
        })

    return result


# ─── List Candidates ──────────────────────────────────────────────────────────

@app.get("/api/candidates")
def list_candidates(
    search: Optional[str] = None,
    recommendation: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List all candidates with optional search and filtering."""
    ats = ATSMCPServer(db)
    candidates = ats.list_candidates(
        search=search,
        recommendation=recommendation,
        limit=limit,
        offset=offset
    )
    return {"candidates": candidates, "total": len(candidates)}


# ─── Get Single Candidate ─────────────────────────────────────────────────────

@app.get("/api/candidates/{candidate_id}")
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Get a single candidate by ID."""
    ats = ATSMCPServer(db)
    candidate = ats.get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    """Get aggregated dashboard statistics."""
    ats = ATSMCPServer(db)
    return ats.get_dashboard_stats()


# ─── Agent Communication Logs ─────────────────────────────────────────────────

@app.get("/api/agent_logs")
def get_agent_logs(
    candidate_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get agent communication logs."""
    coordinator = AgentCoordinator(db)
    logs = coordinator.get_agent_logs(candidate_id=candidate_id, limit=limit)
    return {"logs": logs}


# ─── PDF Report Generation ────────────────────────────────────────────────────

@app.get("/api/report/{candidate_id}")
def download_report(candidate_id: int, db: Session = Depends(get_db)):
    """Generate and download a PDF evaluation report for a candidate."""
    ats = ATSMCPServer(db)
    candidate = ats.get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    pdf_bytes = generate_pdf_report(candidate)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="report_{candidate["candidate_name"].replace(" ", "_")}_{candidate_id}.pdf"'
        }
    )


def generate_pdf_report(candidate: dict) -> bytes:
    """Generate a professional PDF evaluation report using ReportLab."""
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

    buffer = io.BytesIO()

    # Color palette
    PRIMARY = HexColor("#6366f1")   # Indigo
    ACCENT = HexColor("#8b5cf6")    # Violet
    SUCCESS = HexColor("#10b981")   # Green
    WARNING = HexColor("#f59e0b")   # Amber
    DANGER = HexColor("#ef4444")    # Red
    DARK = HexColor("#1e1b4b")      # Dark indigo
    LIGHT_BG = HexColor("#f8fafc")
    BORDER = HexColor("#e2e8f0")

    rec_colors = {
        "Strong Hire": SUCCESS,
        "Hire": HexColor("#3b82f6"),
        "Consider": WARNING,
        "Reject": DANGER,
    }

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    elements = []

    # ── Header ────────────────────────────────────────────────────────────────
    header_style = ParagraphStyle(
        "Header",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=white,
        alignment=TA_CENTER,
        spaceAfter=4
    )
    sub_style = ParagraphStyle(
        "Sub",
        parent=styles["Normal"],
        fontSize=11,
        textColor=HexColor("#c7d2fe"),
        alignment=TA_CENTER,
    )

    header_table = Table(
        [[
            Paragraph("AI Recruitment Assistant", header_style),
        ]],
        colWidths=[6.5 * inch]
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
        ("ROUNDEDCORNERS", [8]),
        ("TOPPADDING", (0, 0), (-1, -1), 20),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.1 * inch))

    elements.append(Paragraph(
        f"Candidate Evaluation Report • Generated {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}",
        ParagraphStyle("gen", parent=styles["Normal"], fontSize=9, textColor=HexColor("#64748b"), alignment=TA_CENTER)
    ))
    elements.append(Spacer(1, 0.25 * inch))

    # ── Section helper ────────────────────────────────────────────────────────
    def section_title(text):
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(
            text,
            ParagraphStyle("SectionTitle", parent=styles["Heading2"],
                          fontSize=13, textColor=DARK, spaceAfter=6)
        ))
        elements.append(HRFlowable(width="100%", thickness=1, color=BORDER))
        elements.append(Spacer(1, 0.08 * inch))

    def bullet_item(text):
        return Paragraph(
            f"• {text}",
            ParagraphStyle("bullet", parent=styles["Normal"], fontSize=10,
                          leftIndent=12, spaceAfter=3)
        )

    # ── Candidate Summary Card ────────────────────────────────────────────────
    section_title("Candidate Profile")

    rec = candidate.get("recommendation", "Pending")
    rec_color = rec_colors.get(rec, PRIMARY)
    match_score = candidate.get("match_score", 0) or 0
    hiring_score = candidate.get("hiring_score", 0) or 0

    summary_data = [
        ["Candidate Name", candidate.get("candidate_name", "N/A")],
        ["Email", candidate.get("email", "N/A") or "N/A"],
        ["Match Score", f"{match_score:.1f}%"],
        ["Hiring Score", f"{hiring_score:.1f}/100"],
        ["Recommendation", rec],
    ]

    summary_table = Table(summary_data, colWidths=[2 * inch, 4.5 * inch])
    summary_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("TEXTCOLOR", (0, -1), (1, -1), rec_color),
        ("FONTNAME", (0, -1), (1, -1), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [white, LIGHT_BG]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(summary_table)

    # ── Skills ────────────────────────────────────────────────────────────────
    skills = candidate.get("skills", [])
    if skills:
        section_title("Skills")
        skills_text = " • ".join(skills[:20])
        elements.append(Paragraph(skills_text, ParagraphStyle(
            "skills", parent=styles["Normal"], fontSize=10, leading=16
        )))

    # ── Experience ────────────────────────────────────────────────────────────
    experience = candidate.get("experience", [])
    if experience:
        section_title("Work Experience")
        for exp in experience[:5]:
            elements.append(bullet_item(str(exp)))

    # ── Education ─────────────────────────────────────────────────────────────
    education = candidate.get("education", [])
    if education:
        section_title("Education")
        for edu in education[:3]:
            elements.append(bullet_item(str(edu)))

    # ── Match Analysis ────────────────────────────────────────────────────────
    section_title("Job Match Analysis")

    matching = candidate.get("matching_skills", [])
    missing = candidate.get("missing_skills", [])
    strengths = candidate.get("strengths", [])
    weaknesses = candidate.get("weaknesses", [])

    if matching:
        elements.append(Paragraph("Matching Skills:", ParagraphStyle(
            "bold", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold"
        )))
        elements.append(Paragraph(
            " • ".join(matching[:10]),
            ParagraphStyle("match", parent=styles["Normal"], fontSize=10,
                          textColor=SUCCESS, spaceAfter=6)
        ))

    if missing:
        elements.append(Paragraph("Missing Skills:", ParagraphStyle(
            "bold", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold"
        )))
        elements.append(Paragraph(
            " • ".join(missing[:10]),
            ParagraphStyle("miss", parent=styles["Normal"], fontSize=10,
                          textColor=DANGER, spaceAfter=6)
        ))

    # ── Strengths & Weaknesses ────────────────────────────────────────────────
    if strengths or weaknesses:
        section_title("Strengths & Weaknesses")

        sw_data = [["✓ Strengths", "✗ Areas of Improvement"]]
        max_rows = max(len(strengths), len(weaknesses), 1)
        for i in range(min(max_rows, 4)):
            s = strengths[i] if i < len(strengths) else ""
            w = weaknesses[i] if i < len(weaknesses) else ""
            sw_data.append([s, w])

        sw_table = Table(sw_data, colWidths=[3.25 * inch, 3.25 * inch])
        sw_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), SUCCESS),
            ("BACKGROUND", (1, 0), (1, 0), DANGER),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_BG]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(sw_table)

    # ── Hiring Recommendation ─────────────────────────────────────────────────
    section_title("Hiring Recommendation")

    reasoning = candidate.get("reasoning", "No reasoning provided.")
    elements.append(Paragraph(
        f"<b>Decision: {rec}</b>",
        ParagraphStyle("rec", parent=styles["Normal"], fontSize=12,
                      textColor=rec_color, spaceAfter=6)
    ))
    elements.append(Paragraph(
        reasoning,
        ParagraphStyle("reason", parent=styles["Normal"], fontSize=10,
                      leading=14, textColor=HexColor("#374151"))
    ))

    # ── Interview Questions ────────────────────────────────────────────────────
    iq = candidate.get("interview_questions", {})
    if iq:
        section_title("Interview Questions")

        categories = [
            ("Technical Questions", iq.get("technical", []), PRIMARY),
            ("HR Questions", iq.get("hr", []), ACCENT),
            ("Project-Based Questions", iq.get("project_based", []), SUCCESS),
            ("Follow-up Questions", iq.get("follow_up", []), WARNING),
        ]

        for cat_name, questions, color in categories:
            if questions:
                elements.append(Paragraph(
                    cat_name,
                    ParagraphStyle("cat", parent=styles["Normal"],
                                  fontSize=11, fontName="Helvetica-Bold",
                                  textColor=color, spaceAfter=4, spaceBefore=8)
                ))
                for i, q in enumerate(questions[:5], 1):
                    elements.append(Paragraph(
                        f"{i}. {q}",
                        ParagraphStyle("q", parent=styles["Normal"],
                                      fontSize=9, leading=13, leftIndent=10, spaceAfter=3)
                    ))

    # ── Interview Schedule ─────────────────────────────────────────────────────
    slots = candidate.get("interview_slots", [])
    if slots:
        section_title("Proposed Interview Schedule")

        slot_data = [["Round", "Date", "Time", "Duration", "Interviewer", "Mode"]]
        for slot in slots:
            slot_data.append([
                f"Round {slot.get('round', '')}",
                slot.get('date', ''),
                slot.get('time', ''),
                slot.get('duration', ''),
                slot.get('interviewer', ''),
                slot.get('mode', ''),
            ])

        slot_table = Table(
            slot_data,
            colWidths=[0.6*inch, 1*inch, 0.6*inch, 0.9*inch, 2*inch, 1.4*inch]
        )
        slot_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_BG]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(slot_table)

    # ── Footer ────────────────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    elements.append(Paragraph(
        "Generated by AI Recruitment Assistant • Powered by Gemini AI • Confidential",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=8,
                      textColor=HexColor("#9ca3af"), alignment=TA_CENTER, spaceBefore=6)
    ))

    doc.build(elements)
    return buffer.getvalue()


# ── __init__.py placeholders ──────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
