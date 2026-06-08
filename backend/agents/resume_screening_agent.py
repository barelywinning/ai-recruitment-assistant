"""
Resume Screening Agent — ADK-style agent.
Accepts resume text → Gemini AI → structured candidate profile JSON.
"""
import json
import re
import os
from typing import Dict, Any

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class ResumeScreeningAgent:
    """
    Agent 1: Extracts structured candidate data from raw resume text.
    Uses Gemini AI to produce a normalized candidate profile.
    """

    AGENT_NAME = "Resume Screening Agent"

    EXTRACTION_PROMPT = """You are a professional resume parser. Analyze the following resume text and extract structured information.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{{
  "candidate_name": "Full Name",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    "Job Title at Company (Year-Year): Key responsibilities",
    ...
  ],
  "education": [
    "Degree in Field from University (Year)",
    ...
  ],
  "certifications": [
    "Certification Name (Issuer, Year)",
    ...
  ]
}}

Rules:
- skills: extract ALL technical and soft skills mentioned
- experience: summarize each position in one line
- education: include degree, field, institution, year
- certifications: include all professional certifications, courses, and credentials
- If a field is not found, use empty array [] or null

Resume Text:
{resume_text}
"""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def run(self, resume_text: str, parser_hints: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Main agent entry point.
        Args:
            resume_text: Cleaned resume text
            parser_hints: Optional hints from ResumeParserMCP
        Returns:
            Structured candidate profile dict
        """
        if not resume_text or len(resume_text.strip()) < 50:
            return self._fallback_result("Resume text too short or empty")

        try:
            prompt = self.EXTRACTION_PROMPT.format(resume_text=resume_text[:8000])
            response = self.model.generate_content(prompt)
            raw = response.text.strip()

            # Strip markdown code fences if present
            raw = re.sub(r'^```json\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'^```\s*', '', raw, flags=re.MULTILINE)
            raw = raw.strip()

            # Find JSON object
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
            else:
                result = json.loads(raw)

            # Apply parser hints if Gemini missed email/phone
            if parser_hints:
                if not result.get("email") and parser_hints.get("email_hint"):
                    result["email"] = parser_hints["email_hint"]
                if not result.get("phone") and parser_hints.get("phone_hint"):
                    result["phone"] = parser_hints["phone_hint"]

            # Ensure required fields
            result.setdefault("candidate_name", "Unknown Candidate")
            result.setdefault("skills", [])
            result.setdefault("experience", [])
            result.setdefault("education", [])
            result.setdefault("certifications", [])

            return {
                "success": True,
                "agent": self.AGENT_NAME,
                "data": result
            }

        except json.JSONDecodeError as e:
            return self._fallback_result(f"JSON parsing error: {e}", resume_text)
        except Exception as e:
            return self._fallback_result(f"Gemini API error: {e}")

    def _fallback_result(self, error: str, resume_text: str = "") -> Dict[str, Any]:
        """Fallback when AI fails — extract basics with regex."""
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)
        return {
            "success": False,
            "agent": self.AGENT_NAME,
            "error": error,
            "data": {
                "candidate_name": "Unknown Candidate",
                "email": email_match.group(0) if email_match else None,
                "phone": None,
                "skills": [],
                "experience": [],
                "education": [],
                "certifications": [],
            }
        }
