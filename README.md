# EventMate — AI-Powered Event Assistant

EventMate is a production-grade, responsive AI Event Assistant web application powered by Google's **Gemma** (`gemma-3-27b-it`) and **Gemini** models. It acts as a 24/7 virtual conference information desk that answers attendee inquiries strictly grounded in verified event data (`backend/data/event_data.json`).

---

## 1. Architecture & Project Structure

```text
event-assistant/
├── src/                               # Primary React + TypeScript + Tailwind UI
│   ├── App.tsx                        # Responsive conference hub & dashboard
│   ├── components/
│   │   ├── ChatAssistantSection.tsx   # Multi-turn conversational AI assistant
│   │   └── EventVisuals.tsx           # Architectural vector visuals & portraits
│   └── index.css                      # Typography & layout styles
├── server/                            # Node/Express runtime API server (Port 3000)
│   ├── app.ts                         # REST API routes, validation, rate limiting
│   └── services/
│       ├── eventRetrieval.ts          # Intent classification & context retrieval
│       ├── contextBuilder.ts          # Master System Prompt & grounded builder
│       └── gemmaService.ts            # Google GenAI SDK integration & fallback
├── backend/                           # Modular Python FastAPI backend
│   ├── main.py                        # FastAPI entry point
│   ├── config.py                      # Environment variable configuration
│   ├── schemas.py                     # Pydantic validation models
│   ├── routes/
│   │   ├── chat.py                    # POST /api/chat
│   │   ├── event.py                   # GET /api/event, /api/venues, /api/faqs
│   │   ├── schedule.py                # GET /api/schedule
│   │   └── speakers.py                # GET /api/speakers
│   ├── services/
│   │   ├── gemma_service.py           # Async Google Gemma REST API integration
│   │   ├── event_retrieval.py         # Keyword & multi-turn retrieval service
│   │   └── context_builder.py         # Master System Prompt & local fallback
│   └── data/
│       └── event_data.json            # Fictional demonstration conference dataset
├── frontend/                          # Standalone HTML5/CSS3/ES6+ frontend
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── tests/
│   ├── api.test.ts                    # Automated Node/TypeScript API test suite
│   └── test_api.py                    # Pytest test suite for FastAPI backend
├── .env.example                       # Environment variable placeholders
├── requirements.txt                   # Python dependencies
├── Dockerfile                         # Container deployment configuration
└── package.json
```

---

## 2. Obtaining & Configuring Gemma API Credentials

1. Visit **Google AI Studio** (`https://aistudio.google.com/apikey`) and create an API key.
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Set your API key and preferred Gemma model identifier in `.env`:
   ```env
   GEMINI_API_KEY="your_actual_google_ai_studio_key"
   GEMMA_API_KEY="your_actual_google_ai_studio_key"
   GEMMA_MODEL="gemma-3-27b-it"
   GEMMA_API_URL="https://generativelanguage.googleapis.com/v1beta/models"
   ```
4. **Never commit `.env`** to version control (`.env` is listed in `.gitignore`).

---

## 3. Running the Application

### Option A: Full-Stack Node/Express + Vite Server (Default on Port 3000)
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### Option B: Python FastAPI Backend + Standalone Frontend
```bash
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

---

## 4. Testing the Application & Chat Endpoint

### Run the Automated Test Suite (No Real API Key Required)
```bash
npm test
```
Or with Pytest:
```bash
pytest tests/test_api.py
```

### Manual cURL Test for `POST /api/chat`
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Who is the keynote speaker?",
    "session_id": "demo-session-01"
  }'
```

---

## 5. Troubleshooting Guidance

- **Missing or Invalid API Key**: If `GEMMA_API_KEY` / `GEMINI_API_KEY` is missing or invalid, EventMate does not pretend an AI answer was generated. Instead, it automatically switches to its **Verified Local Dataset Search** fallback and displays a clear notice badge on the message.
- **Rate Limits (HTTP 429)**: The `/api/chat` endpoint enforces per-client rate limiting (`RATE_LIMIT_MAX_REQUESTS`, default 20 requests/minute). Wait for the window to reset or adjust `RATE_LIMIT_MAX_REQUESTS` in `.env`.
- **Customizing Event Data**: Replace the fictional demonstration records in `backend/data/event_data.json` with your verified conference schedule, speakers, venues, and FAQs prior to production launch.

---

## 6. Deployment & Production Security Recommendations

- Build for production:
  ```bash
  npm run build
  npm start
  ```
- Or build and run with Docker:
  ```bash
  docker build -t eventmate-assistant .
  docker run -p 3000:3000 --env-file .env eventmate-assistant
  ```
- **Security Checklist**:
  - Keep API keys strictly in server-side environment secrets (Cloud Run Secrets / AWS Secrets Manager).
  - Restrict `CORS_ALLOWED_ORIGINS` to your production domain.
  - Keep prompt-injection detection and strict source-of-truth grounding enabled.
