from typing import Optional
from fastapi import APIRouter, Query
from backend.services.event_retrieval import load_event_dataset

router = APIRouter()


@router.get("/api/speakers")
async def get_speakers(search: Optional[str] = Query(default=None)):
    data = load_event_dataset()
    speakers = data["speakers"]
    if search and search.strip():
        q = search.strip().lower()
        speakers = [
            s
            for s in speakers
            if q
            in f"{s['name']} {s['title']} {s['biography']} {' '.join(s['expertise'])}".lower()
        ]
    enriched = [
        {
            **spk,
            "session_details": [
                sess for sess in data["sessions"] if sess["id"] in spk["sessions"]
            ],
        }
        for spk in speakers
    ]
    return {"total": len(enriched), "speakers": enriched}
