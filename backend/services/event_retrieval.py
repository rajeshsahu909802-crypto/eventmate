import json
import re
from typing import Any
from backend.config import DATA_FILE_PATH

_CACHED_DATA: dict[str, Any] | None = None

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.I),
    re.compile(r"reveal\s+(your\s+)?(api\s*key|secret|system\s*prompt|instructions|credentials)", re.I),
    re.compile(r"print\s+(process\.env|gemma_api_key|gemini_api_key)", re.I),
    re.compile(r"you\s+are\s+now\s+(dan|unrestricted|jailbroken)", re.I),
    re.compile(r"disregard\s+(the\s+)?source\s+of\s+truth", re.I),
]


def load_event_dataset() -> dict[str, Any]:
    global _CACHED_DATA
    if _CACHED_DATA is None:
        with open(DATA_FILE_PATH, "r", encoding="utf-8") as f:
            _CACHED_DATA = json.load(f)
    return _CACHED_DATA


def detect_prompt_injection(message: str) -> bool:
    return any(p.search(message) for p in INJECTION_PATTERNS)


def find_simultaneous_sessions() -> list[dict[str, Any]]:
    data = load_event_dataset()
    grouped: dict[str, list[dict[str, Any]]] = {}
    for s in data.get("sessions", []):
        key = f"{s['date']}|{s['start_time']}"
        grouped.setdefault(key, []).append(s)
    result = []
    for key, sessions in grouped.items():
        if len(sessions) > 1:
            date_str, start_time = key.split("|")
            result.append({"date": date_str, "start_time": start_time, "sessions": sessions})
    return result


def retrieve_relevant_context(message: str, history: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    history = history or []
    data = load_event_dataset()
    is_injection = detect_prompt_injection(message)
    q_lower = message.lower()

    is_followup = bool(
        re.search(
            r"\b(that\s+session|this\s+session|where\s+is\s+it|where\s+is\s+that|what\s+time\s+does\s+it|when\s+is\s+it|that\s+speaker)\b",
            q_lower,
        )
    )

    recent_ids: set[str] = set()
    contextual_text = message
    if history:
        for turn in history[-4:]:
            for src in turn.get("sources", []):
                recent_ids.add(src.get("id", ""))
        if is_followup:
            contextual_text = " ".join(t.get("content", "") for t in history[-4:]) + " " + message

    stopwords = {
        "the", "and", "for", "are", "but", "not", "you", "all", "any", "can",
        "what", "when", "where", "which", "who", "how", "with", "from", "that",
        "this", "there", "their", "have", "will", "about", "does", "get", "find",
        "service", "available", "taking", "place", "speaking", "session", "sessions",
        "speaker", "speakers", "venue", "venues", "event", "time",
    }
    tokens = [
        w
        for w in re.sub(r"[^a-z0-9\s-]", " ", contextual_text.lower()).split()
        if len(w) >= 3 and w not in stopwords
    ]

    intents: list[str] = []
    if re.search(r"\b(schedule|session|sessions|time|start|end|today|day\s*1|day\s*2|summarize|complete)\b", q_lower):
        intents.append("schedule")
    if re.search(r"\b(simultaneous(ly)?|same\s+time|parallel|overlap(ping)?|concurrent(ly)?)\b", q_lower):
        intents.append("simultaneous")
    if re.search(r"\b(speaker|speakers|keynote|who\s+is|sharma|mehta|nair|deshmukh|krishnan|verma)\b", q_lower):
        intents.append("speaker")
    if re.search(r"\b(venue|where|room|hall|ballroom|lab|auditorium|studio|atrium|registration\s+desk|floor)\b", q_lower):
        intents.append("venue")
    if re.search(r"\b(faq|lunch|food|bring|laptop|certificate|wifi|wi-fi|entry|register|registration)\b", q_lower):
        intents.append("faq")
    if re.search(r"\b(contact|organizer|organizers|email|phone|helpdesk)\b", q_lower):
        intents.append("contact")
    if not intents:
        intents.append("general")

    matched_sessions = []
    for s in data["sessions"]:
        score = 0
        hay = f"{s['title']} {s['speaker_name']} {s['venue_name']} {s['category']} {s['description']}".lower()
        if is_followup and s["id"] in recent_ids:
            score += 10
        if "keynote" in q_lower and s["category"].lower() == "keynote":
            score += 8
        if "cybersecurity" in q_lower and s["category"].lower() == "cybersecurity":
            score += 8
        if "workshop" in q_lower and "workshop" in s["category"].lower():
            score += 8
        for t in tokens:
            if t in hay:
                score += 2
        if score >= 4:
            matched_sessions.append(s)

    matched_speakers = []
    for spk in data["speakers"]:
        score = 0
        hay = f"{spk['name']} {spk['title']} {spk['biography']} {' '.join(spk['expertise'])}".lower()
        if is_followup and spk["id"] in recent_ids:
            score += 10
        if "keynote" in q_lower and spk["id"] == "spk-001":
            score += 9
        for t in tokens:
            if t in hay:
                score += 2
        if score >= 4:
            matched_speakers.append(spk)

    for spk in matched_speakers:
        for sid in spk["sessions"]:
            s_obj = next((x for x in data["sessions"] if x["id"] == sid), None)
            if s_obj and s_obj not in matched_sessions:
                matched_sessions.append(s_obj)

    matched_venues = []
    for v in data["venues"]:
        score = 0
        hay = f"{v['name']} {v['building']} {v['floor']} {v['room']} {v['directions']}".lower()
        if is_followup and v["id"] in recent_ids:
            score += 10
        if "registration" in q_lower and v["id"] == "venue-001":
            score += 10
        for t in tokens:
            if t in hay:
                score += 2
        if score >= 4:
            matched_venues.append(v)

    if "venue" in intents or is_followup:
        for s in matched_sessions:
            v_obj = next((x for x in data["venues"] if x["id"] == s["venue_id"]), None)
            if v_obj and v_obj not in matched_venues:
                matched_venues.append(v_obj)

    matched_faqs = []
    for faq in data["faqs"]:
        score = 0
        hay = f"{faq['category']} {faq['question']} {faq['answer']}".lower()
        for t in tokens:
            if t in hay:
                score += 2
        if score >= 4:
            matched_faqs.append(faq)

    simultaneous_groups = find_simultaneous_sessions() if "simultaneous" in intents else []

    sources = []
    for spk in matched_speakers[:3]:
        sources.append({"type": "speaker", "id": spk["id"], "title": f"{spk['name']} — {spk['title']}"})
    for s in matched_sessions[:4]:
        sources.append({"type": "session", "id": s["id"], "title": s["title"]})
    for v in matched_venues[:3]:
        sources.append({"type": "venue", "id": v["id"], "title": v["name"]})
    for f in matched_faqs[:2]:
        sources.append({"type": "faq", "id": f["id"], "title": f"FAQ: {f['category']}"})
    if not sources:
        sources.append({"type": "event", "id": "event-overview", "title": data["event"]["name"]})

    suggested = [
        "When is the keynote session?",
        "Where is the AI workshop taking place?",
        "Which sessions are happening simultaneously?",
    ]

    return {
        "intents": intents,
        "is_prompt_injection": is_injection,
        "event": data["event"],
        "matched_sessions": matched_sessions,
        "matched_speakers": matched_speakers,
        "matched_venues": matched_venues,
        "matched_faqs": matched_faqs,
        "simultaneous_groups": simultaneous_groups,
        "organizer_contacts": data["organizer_contacts"],
        "sources": sources,
        "suggested_questions": suggested,
    }
