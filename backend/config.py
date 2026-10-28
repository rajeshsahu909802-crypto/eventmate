import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE_PATH = BASE_DIR / "data" / "event_data.json"

GEMMA_API_KEY: str = os.getenv("GEMMA_API_KEY") or os.getenv("GEMINI_API_KEY") or ""
GEMMA_MODEL: str = os.getenv("GEMMA_MODEL", "gemma-3-27b-it")
GEMMA_API_URL: str = os.getenv(
    "GEMMA_API_URL",
    "https://generativelanguage.googleapis.com/v1beta/models",
)

AI_TIMEOUT_SECONDS: float = float(os.getenv("AI_TIMEOUT_MS", "15000")) / 1000.0
RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_MS", "60000")) // 1000
RATE_LIMIT_MAX_REQUESTS: int = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "20"))
MAX_MESSAGE_LENGTH: int = 600

CORS_ALLOWED_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
