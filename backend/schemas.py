from typing import Optional
from pydantic import BaseModel, Field, field_validator


class SourceReference(BaseModel):
    type: str
    id: str
    title: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=600, description="Attendee question")
    session_id: str = Field(default="default-session", max_length=64)
    mode: Optional[str] = Field(default="ai", description="Either 'ai' or 'local'")

    @field_validator("message")
    @classmethod
    def validate_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be empty or whitespace only.")
        return cleaned


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceReference]
    suggested_questions: list[str]
    session_id: str
    ai_generated: bool = True
    fallback_used: bool = False
    model_used: str = "gemma-3-27b-it"
    notice: Optional[str] = None
