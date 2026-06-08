"""
Candidate Ranking Agent — ADK-style agent.
Generates overall hiring score and recommendation category.
"""
import json
import re
import os
from typing import Dict, Any

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class CandidateRankingAgent:
    """
    Agent 3: Synthesizes screening + matching data into a final hiring decision.
    Produces: score (0-100), recommendation, and detailed reasoning.
    """

    AGENT_NAME = "Candidate Ranking Agent"

    RANKING_PROMPT = """You are a senior hiring manager making a final recruitment decision.

Candidate Profile:
{candidate_profile}

Job Match Analysis:
{match_analysis}

Based on all available information, provide a comprehensive hiring recommendation.

Return ONLY a valid JSON object (no markdown, no explanation):
{{
  "hiring_score": <number 0-100>,
  "recommendation": "<Strong Hire|Hire|Consider|Reject>",
  "reasoning": "Detailed 3-5 sentence explanation of the decision",
  "category_scores": {{
    "technical_skills": <0-100>,
    "experience": <0-100>,
    "education": <0-100>,
    "cultural_fit": <0-100>,
    "communication": <0-100>
  }},
  "key_positives": ["point1", "point2", "point3"],
  "key_concerns": ["concern1", "concern2"],
  "next_steps": ["Recommended action 1", "Recommended action 2"]
}}

Recommendation thresholds:
- Strong Hire: hiring_score >= 85, candidate clearly exceeds requirements
- Hire: hiring_score 70-84, solid candidate who meets most requirements  
- Consider: hiring_score 50-69, has potential but notable gaps
- Reject: hiring_score < 50, does not meet minimum requirements

Be decisive and professional. The reasoning must justify the recommendation.
"""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def run(
        self,
        candidate_profile: Dict[str, Any],
        match_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Main agent entry point.
        Args:
            candidate_profile: Output from ResumeScreeningAgent
            match_analysis: Output from JobMatchingAgent
        Returns:
            Hiring recommendation dict
        """
        try:
            prompt = self.RANKING_PROMPT.format(
                candidate_profile=json.dumps(candidate_profile, indent=2)[:3000],
                match_analysis=json.dumps(match_analysis, indent=2)[:3000]
            )

            response = self.model.generate_content(prompt)
            raw = response.text.strip()

            raw = re.sub(r'^```json\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'^```\s*', '', raw, flags=re.MULTILINE)
            raw = raw.strip()

            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
            else:
                result = json.loads(raw)

            # Validate recommendation
            valid_recs = ["Strong Hire", "Hire", "Consider", "Reject"]
            if result.get("recommendation") not in valid_recs:
                score = float(result.get("hiring_score", 50))
                result["recommendation"] = self._score_to_recommendation(score)

            result.setdefault("hiring_score", 50)
            result.setdefault("reasoning", "Evaluation completed.")
            result.setdefault("category_scores", {})
            result.setdefault("key_positives", [])
            result.setdefault("key_concerns", [])
            result.setdefault("next_steps", [])

            result["hiring_score"] = max(0, min(100, float(result["hiring_score"])))

            return {
                "success": True,
                "agent": self.AGENT_NAME,
                "data": result
            }

        except json.JSONDecodeError as e:
            return self._fallback_result(f"JSON parsing error: {e}", match_analysis)
        except Exception as e:
            return self._fallback_result(f"Gemini API error: {e}", match_analysis)

    def _score_to_recommendation(self, score: float) -> str:
        if score >= 85:
            return "Strong Hire"
        elif score >= 70:
            return "Hire"
        elif score >= 50:
            return "Consider"
        return "Reject"

    def _fallback_result(self, error: str, match_analysis: Dict = None) -> Dict[str, Any]:
        score = 0
        if match_analysis:
            score = match_analysis.get("match_score", 0)
        return {
            "success": False,
            "agent": self.AGENT_NAME,
            "error": error,
            "data": {
                "hiring_score": score,
                "recommendation": self._score_to_recommendation(score),
                "reasoning": "Automated ranking failed. Manual review required.",
                "category_scores": {},
                "key_positives": [],
                "key_concerns": [],
                "next_steps": ["Conduct manual review"],
            }
        }
