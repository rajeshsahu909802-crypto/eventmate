from typing import Optional
from fastapi import APIRouter, Query
from backend.services.event_retrieval import load_event_dataset, find_simultaneous_sessions

router = APIRouter()


@router.get("/api/event")
async def get_event_info():
    data = load_event_dataset()
    simultaneous = find_simultaneous_sessions()
    return {
        "event": data["event"],
        "stats": {
            "total_speakers": len(data["speakers"]),
            "total_sessions": len(data["sessions"]),
            "total_venues": len(data["venues"]),
            "total_faqs": len(data["faqs"]),
            "simultaneous_slots": len(simultaneous),
        },
        "upcoming_sessions": data["sessions"][:4],
        "announcements": data["announcements"],
        "organizer_contacts": data["organizer_contacts"],
    }


@router.get("/api/venues")
async def get_venues(search: Optional[str] = Query(default=None)):
    data = load_event_dataset()
    venues = data["venues"]
    if search and search.strip():
        q = search.strip().lower()
        venues = [
            v
            for v in venues
            if q in f"{v['name']} {v['building']} {v['floor']} {v['room']} {v['directions']}".lower()
        ]
    enriched = [
        {
            **v,
            "sessions": [s for s in data["sessions"] if s["venue_id"] == v["id"]],
        }
        for v in venues
    ]
    return {"total": len(enriched), "venues": enriched}


@router.get("/api/faqs")
async def get_faqs(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
):
    data = load_event_dataset()
    faqs = data["faqs"]
    if category and category != "all":
        faqs = [f for f in faqs if f["category"].lower() == category.lower()]
    if search and search.strip():
        q = search.strip().lower()
        faqs = [
            f for f in faqs if q in f"{f['category']} {f['question']} {f['answer']}".lower()
        ]
    categories = sorted(list({f["category"] for f in data["faqs"]}))
    return {"total": len(faqs), "available_categories": categories, "faqs": faqs}
