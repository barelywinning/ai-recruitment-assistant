# 🚀 RecruitAI: AI-Powered Recruitment Assistant

RecruitAI is a production-ready, multi-agent recruitment automation platform. Following Google's ADK (Agent Development Kit) design principles, it orchestrates a specialized pipeline of AI agents and Model Context Protocol (MCP) servers to automate the hiring workflow: from resume parsing and screening to job matching, candidate ranking, and interview coordination.

---

## 🌟 Key Features

- **🤖 4 Specialized AI Agents** (Orchestrated Sequentially):
  - **Resume Screening Agent**: Standardizes candidate metadata and profiles from parsed resumes.
  - **Job Matching Agent**: Conducts semantic gap analysis and extracts matching & missing skills.
  - **Candidate Ranking Agent**: Assigns overall scores, identifies strengths/weaknesses, and classifies candidates.
  - **Interview Coordination Agent**: Generates 20 custom interview questions tailored to the candidate's gaps.
- **⚡ 3 Custom MCP Servers**:
  - **ATS Server**: Direct database persistence for candidate records and agent logs.
  - **Calendar Server**: Simulates real-time recruiter calendar availability and schedules slot rounds.
  - **Resume Parser Server**: Implements robust double-pass PDF extraction (`pdfplumber` + `PyPDF2`).
- **📊 Modern Recruiter Dashboard**: Warm, dark-themed dashboard styled with Space Grotesk and DM Sans. Includes interactive Recharts, candidate search, filtering, and logs.
- **📄 Report Generator**: Instantly generate and download comprehensive ReportLab PDF summaries.

---

## 🏗️ System Architecture

RecruitAI uses a sequential agent pipeline where each agent consumes the structured output of the preceding agent, communicating via a standardized JSON interface. Every transmission is persisted in SQLite as an **Agent Communication Log** for auditability.

```
                  ┌──────────────────────────────┐
                  │      Upload Resume (PDF)     │
                  └──────────────┬───────────────┘
                                 │
                   [ ResumeParser MCP Server ]
                                 │  (Text & Structure Extraction)
                                 ▼
                  ┌──────────────────────────────┐
                  │    Resume Screening Agent    │
                  └──────────────┬───────────────┘
                                 │  (Standardized JSON Profile)
                                 ▼
                  ┌──────────────────────────────┐
                  │      Job Matching Agent      │
                  └──────────────┬───────────────┘
                                 │  (Semantic Gaps & Skills)
                                 ▼
                  ┌──────────────────────────────┐
                  │   Candidate Ranking Agent    │
                  └──────────────┬───────────────┘
                                 │  (Hiring Score & Status)
                                 ▼
                  ┌──────────────────────────────┐
                  │ Interview Coordination Agent │
                  └──────────────┬───────────────┘
                                 │  (Tailored Question Bank)
                                 ▼
                   [ Calendar & ATS MCP Servers ]
                                 │  (Schedule & Save to SQLite)
                                 ▼
                  ┌──────────────────────────────┐
                  │      Recruiter Frontend      │
                  └──────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | React (Vite), TailwindCSS, Recharts, Lucide Icons |
| **Backend** | FastAPI, Python 3.10+ |
| **AI Orchestration** | Google Gemini 1.5 Flash (via `google-generativeai`) |
| **Database** | SQLite + SQLAlchemy (Async ORM) |
| **PDF Extraction** | `pdfplumber`, `PyPDF2` |
| **Report Generation** | `reportlab` |

---

## 🚦 Quick Start Guide

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Gemini API Key** (Get one from [Google AI Studio](https://aistudio.google.com))

---

### 1. Setup Backend Server

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

Open `.env` and configure your API Key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key
DATABASE_URL=sqlite:///./recruitment.db
```

Start the FastAPI application:
```bash
uvicorn main:app --reload --port 8000
```
Verify the server is running at: `http://localhost:8000/health`

---

### 2. Setup Frontend Application

```bash
cd ../frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```

Open the dashboard in your browser: `http://localhost:5173`

---

## 🔌 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | System health check & Gemini connection status |
| `/api/upload_resume` | `POST` | Primary entrypoint: runs full 4-agent evaluation pipeline |
| `/api/candidates` | `GET` | Fetches list of all processed candidates |
| `/api/candidates/{id}` | `GET` | Fetches details, question bank, and calendar slots for a candidate |
| `/api/dashboard` | `GET` | Aggregated analytics & distribution metrics for chart views |
| `/api/agent_logs` | `GET` | Fetches agent-to-agent communication logs |
| `/api/report/{id}` | `GET` | Downloads generated PDF assessment report |

---

## 🔒 Security & Best Practices

1. **Environment Separation**: API credentials and database paths are loaded strictly via `.env`.
2. **Robust Error Mitigation**: Gracefully handles failed or partial PDF parsing by switching engines dynamically.
3. **Structured Schemas**: Strict Pydantic classes dictate exact JSON schemas expected from LLM calls to prevent parsing failures.
