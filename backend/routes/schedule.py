from typing import Optional
from fastapi import APIRouter, Query
from backend.services.event_retrieval import load_event_dataset

router = APIRouter()


@router.get("/api/schedule")
async def get_schedule(
    date: Optional[str] = Query(default=None),
    speaker: Optional[str] = Query(default=None),
    venue: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
):
    data = load_event_dataset()
    sessions = data["sessions"]

    if date and date != "all":
        sessions = [s for s in sessions if s["date"] == date]
    if speaker and speaker != "all":
        q_spk = speaker.lower()
        sessions = [
            s
            for s in sessions
            if s["speaker_id"] == speaker or q_spk in s["speaker_name"].lower()
        ]
    if venue and venue != "all":
        q_ven = venue.lower()
        sessions = [
            s
            for s in sessions
            if s["venue_id"] == venue or q_ven in s["venue_name"].lower()
        ]
    if category and category != "all":
        sessions = [s for s in sessions if s["category"].lower() == category.lower()]
    if search and search.strip():
        q = search.strip().lower()
        sessions = [
            s
            for s in sessions
            if q
            in f"{s['title']} {s['speaker_name']} {s['venue_name']} {s['category']} {s['description']}".lower()
        ]

    available_dates = sorted(list({s["date"] for s in data["sessions"]}))
    available_categories = sorted(list({s["category"] for s in data["sessions"]}))

    return {
        "timezone": data["event"]["timezone"],
        "total": len(sessions),
        "available_dates": available_dates,
        "available_categories": available_categories,
        "sessions": sessions,
    }
