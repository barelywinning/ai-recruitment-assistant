"""
Calendar MCP Server.
Provides: create_interview_slot(), get_schedule()
Generates realistic mock interview schedules.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import random


class CalendarMCPServer:
    """
    MCP Server for interview scheduling.
    Generates realistic mock interview slots.
    """

    INTERVIEWERS = [
        "Sarah Chen (Engineering Lead)",
        "Marcus Johnson (HR Manager)",
        "Priya Patel (Technical Architect)",
        "David Kim (Product Manager)",
        "Emily Rodriguez (Senior Engineer)",
        "Alex Thompson (CTO)",
    ]

    MODES = ["Video Call (Zoom)", "Video Call (Teams)", "In-Person", "Phone Screen"]

    def __init__(self):
        self.server_name = "Calendar-MCP-v1"
        self._slots: Dict[str, List[Dict]] = {}  # candidate_id -> slots

    def create_interview_slot(
        self,
        candidate_id: int,
        candidate_name: str,
        recommendation: str = "Hire"
    ) -> List[Dict[str, Any]]:
        """
        Generate interview slots based on recommendation level.
        Strong Hire → 4 rounds, Hire → 3 rounds, Consider → 2 rounds, Reject → 0 rounds
        """
        num_rounds = {
            "Strong Hire": 4,
            "Hire": 3,
            "Consider": 2,
            "Reject": 0,
        }.get(recommendation, 2)

        if num_rounds == 0:
            return []

        slots = []
        base_date = datetime.utcnow() + timedelta(days=3)

        round_names = [
            ("Phone Screen", 30, "Phone Screen"),
            ("Technical Round 1", 60, "Video Call (Zoom)"),
            ("Technical Round 2", 90, "In-Person"),
            ("Final HR + Culture Fit", 45, "In-Person"),
        ]

        for i in range(num_rounds):
            round_name, duration, mode = round_names[i]
            # Schedule each round 2 days apart
            slot_date = base_date + timedelta(days=i * 2)
            # Pick a business-hours time slot
            hour = random.choice([9, 10, 11, 14, 15, 16])

            slots.append({
                "round": i + 1,
                "round_name": round_name,
                "date": slot_date.strftime("%Y-%m-%d"),
                "time": f"{hour:02d}:00",
                "duration": f"{duration} minutes",
                "interviewer": self.INTERVIEWERS[i % len(self.INTERVIEWERS)],
                "mode": mode,
                "candidate_name": candidate_name,
                "status": "Scheduled",
                "meeting_link": f"https://zoom.us/j/{random.randint(10000000, 99999999)}" if "Zoom" in mode else None,
            })

        self._slots[str(candidate_id)] = slots
        return slots

    def get_schedule(self, candidate_id: int) -> Dict[str, Any]:
        """
        Retrieve the interview schedule for a candidate.
        """
        slots = self._slots.get(str(candidate_id), [])
        return {
            "candidate_id": candidate_id,
            "total_rounds": len(slots),
            "slots": slots,
            "schedule_created_at": datetime.utcnow().isoformat(),
        }

    def get_available_slots(self, days_ahead: int = 14) -> List[Dict[str, Any]]:
        """
        Return generic available interview windows for the next N days.
        """
        available = []
        base = datetime.utcnow() + timedelta(days=1)

        for day_offset in range(days_ahead):
            date = base + timedelta(days=day_offset)
            if date.weekday() >= 5:  # Skip weekends
                continue
            for hour in [9, 10, 14, 15, 16]:
                available.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "time": f"{hour:02d}:00",
                    "available": True,
                    "interviewer": random.choice(self.INTERVIEWERS),
                })

        return available[:20]  # Return 20 slots
