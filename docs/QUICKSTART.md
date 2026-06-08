# Quick Start Guide

## Prerequisites

- Python 3.10+
- Node.js 18+
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com)

---

## 1. Clone & Setup Backend

```bash
cd ai-recruitment-assistant/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## 2. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Gemini API key
GEMINI_API_KEY=your_actual_api_key_here
```

## 3. Start Backend

```bash
# From the backend/ directory
uvicorn main:app --reload --port 8000
```

Verify: Open http://localhost:8000/health — should return `{"status":"healthy"}`

---

## 4. Setup Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open: http://localhost:5173

---

## 5. Usage

1. Navigate to **Candidate Screening Portal**
2. Upload a PDF resume
3. Paste a job description
4. Click **Run Full AI Evaluation**
5. View results: match score, ranking, interview questions, schedule
6. Download the **PDF Report**
7. Check **Recruiter Dashboard** for analytics

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/upload_resume | Full pipeline evaluation |
| POST | /api/job_match | Re-run job matching |
| POST | /api/rank_candidate | Re-run ranking |
| POST | /api/generate_interview | Regenerate interview questions |
| GET | /api/candidates | List all candidates |
| GET | /api/candidates/{id} | Get single candidate |
| GET | /api/dashboard | Dashboard statistics |
| GET | /api/agent_logs | Agent communication logs |
| GET | /api/report/{id} | Download PDF report |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `DATABASE_URL` | SQLite database path | `sqlite:///./recruitment.db` |
