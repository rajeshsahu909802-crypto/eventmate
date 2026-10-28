from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import CORS_ALLOWED_ORIGINS, GEMMA_MODEL
from backend.routes import chat, event, schedule, speakers
from backend.services.event_retrieval import load_event_dataset

app = FastAPI(
    title="EventMate — AI Event Assistant API",
    description="Grounded event information assistant powered by Google Gemma.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(event.router)
app.include_router(schedule.router)
app.include_router(speakers.router)
app.include_router(chat.router)


@app.get("/api/health")
async def health_check():
    data = load_event_dataset()
    return {
        "status": "ok",
        "service": "EventMate AI Event Assistant API",
        "configured_model": GEMMA_MODEL,
        "dataset_loaded": bool(data.get("event", {}).get("name")),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
