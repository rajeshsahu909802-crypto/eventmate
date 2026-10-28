import time
from fastapi import APIRouter, HTTPException, Request
from backend.config import RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS
from backend.schemas import ChatRequest, ChatResponse
from backend.services.event_retrieval import retrieve_relevant_context
from backend.services.gemma_service import generate_gemma_answer

router = APIRouter()

SESSION_HISTORY: dict[str, list[dict]] = {}
RATE_LIMIT_BUCKETS: dict[str, dict[str, float]] = {}


@router.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest, request: Request):
    client_host = request.client.host if request.client else "default-client"
    now = time.time()
    bucket = RATE_LIMIT_BUCKETS.get(client_host)
    if not bucket or now > bucket["reset_at"]:
        RATE_LIMIT_BUCKETS[client_host] = {
            "count": 1,
            "reset_at": now + RATE_LIMIT_WINDOW_SECONDS,
        }
    else:
        bucket["count"] += 1
        if bucket["count"] > RATE_LIMIT_MAX_REQUESTS:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please wait before sending another question.",
            )

    history = SESSION_HISTORY.get(payload.session_id, [])
    retrieval = retrieve_relevant_context(payload.message, history)
    result = await generate_gemma_answer(
        payload.message,
        retrieval,
        history,
        force_local=(payload.mode == "local"),
    )

    updated = (
        history
        + [
            {"role": "user", "content": payload.message},
            {
                "role": "assistant",
                "content": result["answer"],
                "sources": retrieval["sources"],
            },
        ]
    )[-10:]
    SESSION_HISTORY[payload.session_id] = updated

    return ChatResponse(
        answer=result["answer"],
        sources=retrieval["sources"],
        suggested_questions=retrieval["suggested_questions"],
        session_id=payload.session_id,
        ai_generated=result["ai_generated"],
        fallback_used=result["fallback_used"],
        model_used=result["model_used"],
        notice=result["notice"],
    )
