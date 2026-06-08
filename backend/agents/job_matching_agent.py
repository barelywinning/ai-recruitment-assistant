"""
Job Matching Agent — ADK-style agent.
Compares candidate profile against job description → match score + analysis.
"""
import json
import re
import os
from typing import Dict, Any, List

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class JobMatchingAgent:
    """
    Agent 2: Evaluates how well a candidate matches a job description.
    Uses Gemini AI for semantic comparison beyond simple keyword matching.
    """

    AGENT_NAME = "Job Matching Agent"

    MATCHING_PROMPT = """You are an expert technical recruiter. Analyze how well the candidate profile matches the job description.

Candidate Profile:
{candidate_profile}

Job Description:
{job_description}

Return ONLY a valid JSON object (no markdown, no explanation):
{{
  "match_score": <number 0-100>,
  "matching_skills": ["skill1", "skill2", ...],
  "missing_skills": ["skill1", "skill2", ...],
  "strengths": [
    "Specific strength relative to this role",
    ...
  ],
  "weaknesses": [
    "Specific gap or weakness relative to this role",
    ...
  ],
  "experience_match": "<Excellent|Good|Partial|Poor>",
  "education_match": "<Excellent|Good|Partial|Poor>",
  "overall_assessment": "2-3 sentence summary"
}}

Scoring guide:
- 85-100: Excellent match, candidate exceeds requirements
- 70-84: Good match, minor gaps
- 50-69: Partial match, some significant gaps
- 30-49: Poor match, major gaps
- 0-29: Not suitable

Be precise and objective. Focus on technical and domain requirements.
"""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def run(
        self,
        candidate_profile: Dict[str, Any],
        job_description: str
    ) -> Dict[str, Any]:
        """
        Main agent entry point.
        Args:
            candidate_profile: Output from ResumeScreeningAgent
            job_description: Raw job description text
        Returns:
            Match analysis dict
        """
        if not job_description or len(job_description.strip()) < 20:
            return self._fallback_result("Job description too short")

        try:
            profile_str = json.dumps(candidate_profile, indent=2)
            prompt = self.MATCHING_PROMPT.format(
                candidate_profile=profile_str[:4000],
                job_description=job_description[:4000]
            )

            response = self.model.generate_content(prompt)
            raw = response.text.strip()

            # Strip markdown
            raw = re.sub(r'^```json\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'^```\s*', '', raw, flags=re.MULTILINE)
            raw = raw.strip()

            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
            else:
                result = json.loads(raw)

            # Ensure required fields
            result.setdefault("match_score", 50)
            result.setdefault("matching_skills", [])
            result.setdefault("missing_skills", [])
            result.setdefault("strengths", [])
            result.setdefault("weaknesses", [])

            # Clamp score
            result["match_score"] = max(0, min(100, float(result["match_score"])))

            return {
                "success": True,
                "agent": self.AGENT_NAME,
                "data": result
            }

        except json.JSONDecodeError as e:
            return self._fallback_result(f"JSON parsing error: {e}")
        except Exception as e:
            return self._fallback_result(f"Gemini API error: {e}")

    def _fallback_result(self, error: str) -> Dict[str, Any]:
        return {
            "success": False,
            "agent": self.AGENT_NAME,
            "error": error,
            "data": {
                "match_score": 0,
                "matching_skills": [],
                "missing_skills": [],
                "strengths": [],
                "weaknesses": [],
                "experience_match": "Unknown",
                "education_match": "Unknown",
                "overall_assessment": "Analysis failed."
            }
        }
