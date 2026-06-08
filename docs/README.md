# AI-Powered Recruitment Assistant

A production-ready, multi-agent recruitment platform powered by **Gemini AI**, **FastAPI**, and **React**.

## Features

- **4 Specialized AI Agents** (ADK-style architecture)
  - Resume Screening Agent — extracts structured candidate data from PDFs
  - Job Matching Agent — calculates semantic match score vs job description
  - Candidate Ranking Agent — generates hiring score & Strong Hire/Hire/Consider/Reject
  - Interview Coordination Agent — generates 5 tailored questions per category
- **Agent-to-Agent Communication** with full timeline logging
- **3 MCP Servers** — ATS (SQLite), Calendar (interview slots), Resume Parser (pdfplumber)
- **Modern Recruiter Dashboard** with Recharts visualizations
- **PDF Report Generation** (ReportLab)
- **Candidate Search & Filtering**
- **Dark Mode** premium UI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TailwindCSS + Recharts |
| Backend | FastAPI + Python |
| AI | Gemini 1.5 Flash |
| Database | SQLite (SQLAlchemy) |
| PDF Parse | pdfplumber + PyPDF2 |
| Reports | ReportLab |

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for setup instructions.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details.
