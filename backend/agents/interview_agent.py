"""
Interview Coordination Agent — ADK-style agent.
Generates categorized interview questions tailored to candidate + role.
"""
import json
import re
import os
from typing import Dict, Any, List

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class InterviewCoordinationAgent:
    """
    Agent 4: Generates targeted interview questions based on candidate profile
    and identified gaps/strengths from the matching analysis.
    """

    AGENT_NAME = "Interview Coordination Agent"

    INTERVIEW_PROMPT = """You are a senior technical interviewer. Generate targeted interview questions for this candidate.

Candidate Profile:
{candidate_profile}

Job Match Analysis (strengths, weaknesses, missing skills):
{match_analysis}

Hiring Recommendation:
{ranking_data}

Generate exactly 5 questions for each category. Make questions specific to this candidate's profile and the identified gaps.

Return ONLY a valid JSON object (no markdown, no explanation):
{{
  "technical": [
    "Question 1...",
    "Question 2...",
    "Question 3...",
    "Question 4...",
    "Question 5..."
  ],
  "hr": [
    "Question 1...",
    "Question 2...",
    "Question 3...",
    "Question 4...",
    "Question 5..."
  ],
  "project_based": [
    "Question 1...",
    "Question 2...",
    "Question 3...",
    "Question 4...",
    "Question 5..."
  ],
  "follow_up": [
    "Question 1...",
    "Question 2...",
    "Question 3...",
    "Question 4...",
    "Question 5..."
  ]
}}

Guidelines:
- technical: Probe specific technical skills, especially any missing skills identified
- hr: Culture fit, motivation, career goals, team dynamics, salary expectations
- project_based: Real scenarios or past project deep-dives relevant to the role
- follow_up: Clarifying questions about resume gaps, transitions, or ambiguous points

Questions must be specific, not generic. Reference the candidate's actual skills and experience.
"""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def run(
        self,
        candidate_profile: Dict[str, Any],
        match_analysis: Dict[str, Any],
        ranking_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Main agent entry point.
        Args:
            candidate_profile: Output from ResumeScreeningAgent
            match_analysis: Output from JobMatchingAgent
            ranking_data: Output from CandidateRankingAgent
        Returns:
            Dict with categorized interview questions
        """
        try:
            prompt = self.INTERVIEW_PROMPT.format(
                candidate_profile=json.dumps(candidate_profile, indent=2)[:2000],
                match_analysis=json.dumps(match_analysis, indent=2)[:2000],
                ranking_data=json.dumps(ranking_data, indent=2)[:1000]
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

            # Ensure exactly 5 questions per category
            for category in ["technical", "hr", "project_based", "follow_up"]:
                result.setdefault(category, [])
                # Pad with generic if fewer than 5
                while len(result[category]) < 5:
                    result[category].append(
                        f"Additional {category} question - please elaborate on your experience."
                    )
                result[category] = result[category][:5]  # Cap at 5

            return {
                "success": True,
                "agent": self.AGENT_NAME,
                "data": result
            }

        except json.JSONDecodeError as e:
            return self._fallback_questions(candidate_profile)
        except Exception as e:
            return self._fallback_questions(candidate_profile, str(e))

    def _fallback_questions(
        self,
        candidate_profile: Dict[str, Any],
        error: str = ""
    ) -> Dict[str, Any]:
        name = candidate_profile.get("candidate_name", "the candidate")
        skills = candidate_profile.get("skills", [])
        skill_str = skills[0] if skills else "your primary skill"

        return {
            "success": False,
            "agent": self.AGENT_NAME,
            "error": error,
            "data": {
                "technical": [
                    f"Can you walk us through your experience with {skill_str}?",
                    "Describe a technically challenging project you've worked on.",
                    "How do you approach debugging complex production issues?",
                    "What is your experience with system design and architecture?",
                    "How do you stay current with new technologies in your field?",
                ],
                "hr": [
                    f"What attracted you to this role, {name}?",
                    "How do you handle conflicts within a team?",
                    "Where do you see yourself in 5 years?",
                    "What is your preferred work style — independent or collaborative?",
                    "What are your salary expectations for this position?",
                ],
                "project_based": [
                    "Describe the most impactful project you have delivered.",
                    "How did you handle a situation where requirements changed mid-project?",
                    "Tell us about a time you had to meet a tight deadline.",
                    "Describe a project failure and what you learned from it.",
                    "How do you prioritize competing tasks on a project?",
                ],
                "follow_up": [
                    "Can you clarify the gap in your employment history?",
                    "What specific responsibilities did you hold in your last role?",
                    "Why are you leaving your current position?",
                    "Can you provide references from your most recent employer?",
                    "Is there anything on your resume you'd like to expand on?",
                ]
            }
        }
