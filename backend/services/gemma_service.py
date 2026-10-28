from typing import Any
import httpx
from backend.config import GEMMA_API_KEY, GEMMA_MODEL, GEMMA_API_URL, AI_TIMEOUT_SECONDS
from backend.services.context_builder import (
    EVENTMATE_SYSTEM_PROMPT,
    build_deterministic_local_answer,
    build_grounded_prompt,
)


async def generate_gemma_answer(
    user_message: str,
    retrieval: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
    force_local: bool = False,
) -> dict[str, Any]:
    if retrieval.get("is_prompt_injection"):
        return {
            "answer": build_deterministic_local_answer(user_message, retrieval),
            "ai_generated": False,
            "fallback_used": False,
            "model_used": "security-guardrail",
            "notice": "Request blocked by EventMate prompt-injection security policy.",
        }

    if force_local or not GEMMA_API_KEY or GEMMA_API_KEY == "your_actual_api_key_placeholder":
        return {
            "answer": build_deterministic_local_answer(user_message, retrieval),
            "ai_generated": False,
            "fallback_used": True,
            "model_used": "local-verified-fallback",
            "notice": "AI API key not configured or local mode requested; using verified local dataset search.",
        }

    grounded_prompt = build_grounded_prompt(user_message, retrieval, history)
    endpoint = f"{GEMMA_API_URL.rstrip('/')}/{GEMMA_MODEL}:generateContent"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{EVENTMATE_SYSTEM_PROMPT}\n\n{grounded_prompt}"}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.9,
            "maxOutputTokens": 1024,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=AI_TIMEOUT_SECONDS) as client:
            response = await client.post(
                endpoint,
                params={"key": GEMMA_API_KEY},
                json=payload,
            )

        if response.status_code in (401, 403):
            return {
                "answer": build_deterministic_local_answer(user_message, retrieval),
                "ai_generated": False,
                "fallback_used": True,
                "model_used": "local-verified-fallback",
                "notice": "AI API authentication failed. Showing verified local dataset search instead.",
            }

        if response.status_code == 429:
            return {
                "answer": build_deterministic_local_answer(user_message, retrieval),
                "ai_generated": False,
                "fallback_used": True,
                "model_used": "local-verified-fallback",
                "notice": "AI API rate limit reached. Showing verified local dataset search instead.",
            }

        response.raise_for_status()
        body = response.json()
        candidates = body.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            text = "".join(p.get("text", "") for p in parts).strip()
            if text:
                return {
                    "answer": text[:4000],
                    "ai_generated": True,
                    "fallback_used": False,
                    "model_used": GEMMA_MODEL,
                    "notice": None,
                }
    except httpx.TimeoutException:
        notice = "AI model request timed out. Showing verified local dataset search instead."
    except Exception:
        notice = "AI model service unavailable. Showing verified local dataset search instead."
    else:
        notice = "Empty response from model. Showing verified local dataset search instead."

    return {
        "answer": build_deterministic_local_answer(user_message, retrieval),
        "ai_generated": False,
        "fallback_used": True,
        "model_used": "local-verified-fallback",
        "notice": notice,
    }
