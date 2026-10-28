import fs from 'fs';
import path from 'path';

export interface EventInfo {
  name: string;
  start_date: string;
  end_date: string;
  daily_start_time: string;
  daily_end_time: string;
  timezone: string;
  venue: string;
  description: string;
  is_demonstration_data: boolean;
  status: string;
}

export interface SessionRecord {
  id: string;
  title: string;
  date: string;
  day_label: string;
  start_time: string;
  end_time: string;
  timezone: string;
  speaker_id: string | null;
  speaker_name: string;
  venue_id: string;
  venue_name: string;
  category: string;
  status: string;
  description: string;
}

export interface SpeakerRecord {
  id: string;
  name: string;
  title: string;
  biography: string;
  expertise: string[];
  sessions: string[];
  avatar_key: string;
}

export interface VenueRecord {
  id: string;
  name: string;
  building: string;
  floor: string;
  room: string;
  capacity: number;
  directions: string;
  accessibility: string;
}

export interface FaqRecord {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  timestamp: string;
  priority: string;
  content: string;
}

export interface OrganizerContact {
  role: string;
  email: string;
  phone: string;
  location: string;
  hours: string;
}

export interface EventDataset {
  event: EventInfo;
  sessions: SessionRecord[];
  speakers: SpeakerRecord[];
  venues: VenueRecord[];
  faqs: FaqRecord[];
  announcements: AnnouncementRecord[];
  organizer_contacts: OrganizerContact[];
}

export interface SourceReference {
  type: 'session' | 'speaker' | 'venue' | 'faq' | 'announcement' | 'event' | 'contact';
  id: string;
  title: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceReference[];
}

export interface RetrievalResult {
  intents: string[];
  isPromptInjection: boolean;
  event: EventInfo;
  matchedSessions: SessionRecord[];
  matchedSpeakers: SpeakerRecord[];
  matchedVenues: VenueRecord[];
  matchedFaqs: FaqRecord[];
  matchedAnnouncements: AnnouncementRecord[];
  matchedContacts: OrganizerContact[];
  simultaneousGroups: { date: string; start_time: string; sessions: SessionRecord[] }[];
  sources: SourceReference[];
  suggestedQuestions: string[];
}

let cachedDataset: EventDataset | null = null;

export function loadEventDataset(): EventDataset {
  if (cachedDataset) {
    return cachedDataset;
  }
  const dataPath = path.resolve(process.cwd(), 'backend/data/event_data.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  cachedDataset = JSON.parse(raw) as EventDataset;
  return cachedDataset;
}

export function getScheduleFiltered(filters: {
  date?: string;
  speaker?: string;
  venue?: string;
  category?: string;
  search?: string;
}): SessionRecord[] {
  const data = loadEventDataset();
  return data.sessions.filter((session) => {
    if (filters.date && filters.date !== 'all' && session.date !== filters.date) {
      return false;
    }
    if (
      filters.speaker &&
      filters.speaker !== 'all' &&
      session.speaker_id !== filters.speaker &&
      !session.speaker_name.toLowerCase().includes(filters.speaker.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.venue &&
      filters.venue !== 'all' &&
      session.venue_id !== filters.venue &&
      !session.venue_name.toLowerCase().includes(filters.venue.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.category &&
      filters.category !== 'all' &&
      session.category.toLowerCase() !== filters.category.toLowerCase()
    ) {
      return false;
    }
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      const hay = `${session.title} ${session.speaker_name} ${session.venue_name} ${session.category} ${session.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function getSpeakersEnriched(search?: string) {
  const data = loadEventDataset();
  return data.speakers
    .filter((spk) => {
      if (!search || !search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        spk.name.toLowerCase().includes(q) ||
        spk.title.toLowerCase().includes(q) ||
        spk.biography.toLowerCase().includes(q) ||
        spk.expertise.some((e) => e.toLowerCase().includes(q))
      );
    })
    .map((spk) => ({
      ...spk,
      session_details: data.sessions.filter((s) => spk.sessions.includes(s.id)),
    }));
}

export function getVenuesEnriched(search?: string) {
  const data = loadEventDataset();
  return data.venues
    .filter((v) => {
      if (!search || !search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        v.name.toLowerCase().includes(q) ||
        v.building.toLowerCase().includes(q) ||
        v.room.toLowerCase().includes(q) ||
        v.floor.toLowerCase().includes(q) ||
        v.directions.toLowerCase().includes(q)
      );
    })
    .map((v) => ({
      ...v,
      sessions: data.sessions.filter((s) => s.venue_id === v.id),
    }));
}

export function getFaqsFiltered(filters: { category?: string; search?: string }): FaqRecord[] {
  const data = loadEventDataset();
  return data.faqs.filter((faq) => {
    if (
      filters.category &&
      filters.category !== 'all' &&
      faq.category.toLowerCase() !== filters.category.toLowerCase()
    ) {
      return false;
    }
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      const hay = `${faq.category} ${faq.question} ${faq.answer}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function findSimultaneousSessions(): { date: string; start_time: string; sessions: SessionRecord[] }[] {
  const data = loadEventDataset();
  const map = new Map<string, SessionRecord[]>();
  for (const s of data.sessions) {
    const key = `${s.date}|${s.start_time}`;
    const list = map.get(key) || [];
    list.push(s);
    map.set(key, list);
  }
  const groups: { date: string; start_time: string; sessions: SessionRecord[] }[] = [];
  for (const [key, list] of map.entries()) {
    if (list.length > 1) {
      const [date, start_time] = key.split('|');
      groups.push({ date, start_time, sessions: list });
    }
  }
  return groups;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /reveal\s+(your\s+)?(api\s*key|secret|system\s*prompt|instructions|credentials)/i,
  /print\s+(process\.env|gemma_api_key|gemini_api_key)/i,
  /you\s+are\s+now\s+(dan|unrestricted|jailbroken)/i,
  /disregard\s+(the\s+)?source\s+of\s+truth/i,
  /bypass\s+security/i,
];

export function detectPromptInjection(message: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'his', 'how', 'man', 'new', 'now',
  'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say',
  'she', 'too', 'use', 'what', 'when', 'where', 'which', 'while', 'whom', 'why',
  'with', 'from', 'that', 'this', 'there', 'their', 'they', 'have', 'will',
  'would', 'could', 'should', 'about', 'into', 'more', 'some', 'such', 'than',
  'then', 'them', 'these', 'those', 'very', 'your', 'does', 'get', 'find',
  'tell', 'service', 'available', 'taking', 'place', 'speaking', 'session',
  'sessions', 'speaker', 'speakers', 'venue', 'venues', 'event', 'time',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export function retrieveRelevantContext(
  message: string,
  history: ChatTurn[] = []
): RetrievalResult {
  const data = loadEventDataset();
  const isPromptInjection = detectPromptInjection(message);
  const qLower = message.toLowerCase();

  // Check if message uses conversational follow-up references ("that session", "it", "where is that", "what time does it start", "who is speaking there")
  const isFollowUp =
    /\b(that\s+session|this\s+session|it\s+start|where\s+is\s+it|where\s+is\s+that|when\s+is\s+it|when\s+is\s+that|what\s+time\s+does\s+it|his\s+session|her\s+session|their\s+session|that\s+speaker|that\s+workshop|that\s+talk)\b/i.test(
      message
    );

  // Combine current query with recent history if it's a follow-up
  let contextualText = message;
  const recentSourceIds = new Set<string>();
  if (history.length > 0) {
    const lastTurns = history.slice(-4);
    for (const turn of lastTurns) {
      if (turn.sources) {
        turn.sources.forEach((s) => recentSourceIds.add(s.id));
      }
    }
    if (isFollowUp) {
      contextualText = `${lastTurns.map((t) => t.content).join(' ')} ${message}`;
    }
  }

  const tokens = tokenize(contextualText);
  const intents: string[] = [];

  if (/\b(schedule|agenda|session|sessions|talk|talks|time|start|end|today|day\s*1|day\s*2|november|nov|14|15|summarize|summary|complete|all\s+sessions)\b/i.test(qLower)) {
    intents.push('schedule');
  }
  if (/\b(simultaneous(ly)?|same\s+time|parallel|overlap(ping)?|concurrent(ly)?|clashing)\b/i.test(qLower)) {
    intents.push('simultaneous');
  }
  if (/\b(speaker|speakers|keynote|who\s+is|presenting|presenter|dr\.|sharma|mehta|nair|deshmukh|krishnan|verma)\b/i.test(qLower)) {
    intents.push('speaker');
  }
  if (/\b(venue|where|room|hall|ballroom|lab|auditorium|studio|atrium|registration\s+desk|floor|building|directions|find|location|accessibility|wheelchair)\b/i.test(qLower)) {
    intents.push('venue');
  }
  if (/\b(faq|lunch|food|meal|refreshment|coffee|bring|laptop|certificate|wifi|wi-fi|internet|entry|id|badge|register|registration|check-in|support)\b/i.test(qLower)) {
    intents.push('faq');
  }
  if (/\b(contact|organizer|organizers|email|phone|call|helpdesk|emergency|reach)\b/i.test(qLower)) {
    intents.push('contact');
  }
  if (/\b(announcement|announcements|notice|update|news)\b/i.test(qLower)) {
    intents.push('announcement');
  }

  if (intents.length === 0) {
    intents.push('general');
  }

  // Score sessions
  const matchedSessions: SessionRecord[] = [];
  const wantsFullSchedule =
    /\b(complete\s+event\s+schedule|summarize\s+the\s+complete|full\s+schedule|all\s+sessions|what\s+is\s+the\s+schedule|schedule\s+for\s+today)\b/i.test(
      qLower
    );

  for (const session of data.sessions) {
    let score = 0;
    const hay = `${session.title} ${session.speaker_name} ${session.venue_name} ${session.category} ${session.description} ${session.day_label} ${session.date}`.toLowerCase();

    if (wantsFullSchedule) score += 5;
    if (isFollowUp && recentSourceIds.has(session.id)) score += 10;
    if (qLower.includes('keynote') && session.category.toLowerCase() === 'keynote') score += 8;
    if (qLower.includes('cybersecurity') && session.category.toLowerCase() === 'cybersecurity') score += 8;
    if ((qLower.includes('ai workshop') || qLower.includes('workshop')) && session.category.toLowerCase().includes('workshop')) score += 8;
    if (qLower.includes('day 1') || qLower.includes('nov 14') || qLower.includes('november 14')) {
      if (session.date === '2026-11-14') score += 5;
    }
    if (qLower.includes('day 2') || qLower.includes('nov 15') || qLower.includes('november 15')) {
      if (session.date === '2026-11-15') score += 5;
    }

    for (const token of tokens) {
      if (token.length >= 3 && hay.includes(token)) {
        score += 2;
      }
    }

    if (score >= 4) {
      matchedSessions.push(session);
    }
  }

  // Score speakers
  const matchedSpeakers: SpeakerRecord[] = [];
  for (const spk of data.speakers) {
    let score = 0;
    const hay = `${spk.name} ${spk.title} ${spk.biography} ${spk.expertise.join(' ')}`.toLowerCase();
    if (isFollowUp && recentSourceIds.has(spk.id)) score += 10;
    if (qLower.includes('keynote') && spk.id === 'spk-001') score += 9;
    if (qLower.includes('keynote') && spk.id === 'spk-004') score += 6;
    if (qLower.includes('cybersecurity') && hay.includes('cybersecurity')) score += 8;

    for (const token of tokens) {
      if (token.length >= 3 && hay.includes(token)) {
        score += 2;
      }
    }
    if (score >= 4) {
      matchedSpeakers.push(spk);
    }
  }

  // Ensure sessions of matched speakers are included, and vice versa
  for (const spk of matchedSpeakers) {
    for (const sessId of spk.sessions) {
      const s = data.sessions.find((item) => item.id === sessId);
      if (s && !matchedSessions.some((ms) => ms.id === s.id)) {
        matchedSessions.push(s);
      }
    }
  }

  // Score venues
  const matchedVenues: VenueRecord[] = [];
  for (const venue of data.venues) {
    let score = 0;
    const hay = `${venue.name} ${venue.building} ${venue.floor} ${venue.room} ${venue.directions} ${venue.accessibility}`.toLowerCase();
    if (isFollowUp && recentSourceIds.has(venue.id)) score += 10;
    if (qLower.includes('registration') && venue.id === 'venue-001') score += 10;
    if ((qLower.includes('ai workshop') || qLower.includes('workshop')) && venue.id === 'venue-003') score += 8;
    if (qLower.includes('lunch') && venue.id === 'venue-006') score += 7;

    for (const token of tokens) {
      if (token.length >= 3 && hay.includes(token)) {
        score += 2;
      }
    }
    if (score >= 4) {
      matchedVenues.push(venue);
    }
  }

  // If matched sessions have venues and user asked about venue/where, include those venues
  if (intents.includes('venue') || isFollowUp) {
    for (const sess of matchedSessions) {
      const v = data.venues.find((item) => item.id === sess.venue_id);
      if (v && !matchedVenues.some((mv) => mv.id === v.id)) {
        matchedVenues.push(v);
      }
    }
  }

  // Score FAQs
  const matchedFaqs: FaqRecord[] = [];
  for (const faq of data.faqs) {
    let score = 0;
    const hay = `${faq.category} ${faq.question} ${faq.answer}`.toLowerCase();
    for (const token of tokens) {
      if (token.length >= 3 && hay.includes(token)) {
        score += 2;
      }
    }
    if (qLower.includes('lunch') && faq.id === 'faq-004') score += 10;
    if (qLower.includes('bring') && faq.id === 'faq-005') score += 10;
    if (qLower.includes('registration') && faq.id === 'faq-001') score += 8;
    if (qLower.includes('start') && faq.id === 'faq-003') score += 8;
    if (qLower.includes('contact') && faq.id === 'faq-008') score += 8;
    if (qLower.includes('certificate') && faq.id === 'faq-006') score += 10;
    if ((qLower.includes('wifi') || qLower.includes('wi-fi')) && faq.id === 'faq-007') score += 10;

    if (score >= 4) {
      matchedFaqs.push(faq);
    }
  }

  const simultaneousGroups = intents.includes('simultaneous') ? findSimultaneousSessions() : [];
  if (intents.includes('simultaneous')) {
    for (const grp of simultaneousGroups) {
      for (const s of grp.sessions) {
        if (!matchedSessions.some((ms) => ms.id === s.id)) {
          matchedSessions.push(s);
        }
      }
    }
  }

  const matchedContacts =
    intents.includes('contact') || matchedSessions.length === 0
      ? data.organizer_contacts
      : [];

  const matchedAnnouncements =
    intents.includes('announcement') || intents.includes('simultaneous')
      ? data.announcements
      : [];

  // Build deduplicated sources list
  const sources: SourceReference[] = [];
  const addSource = (ref: SourceReference) => {
    if (!sources.some((s) => s.id === ref.id && s.type === ref.type)) {
      sources.push(ref);
    }
  };

  matchedSpeakers.slice(0, 4).forEach((s) =>
    addSource({ type: 'speaker', id: s.id, title: `${s.name} — ${s.title}` })
  );
  matchedSessions.slice(0, 6).forEach((s) =>
    addSource({ type: 'session', id: s.id, title: `${s.title} (${s.day_label}, ${s.start_time}–${s.end_time})` })
  );
  matchedVenues.slice(0, 4).forEach((v) =>
    addSource({ type: 'venue', id: v.id, title: `${v.name} (${v.building}, ${v.floor})` })
  );
  matchedFaqs.slice(0, 3).forEach((f) =>
    addSource({ type: 'faq', id: f.id, title: `FAQ: ${f.category}` })
  );
  if (intents.includes('contact')) {
    addSource({ type: 'contact', id: 'org-contacts', title: 'Organizer Contact Directory' });
  }
  if (sources.length === 0) {
    addSource({ type: 'event', id: 'event-overview', title: data.event.name });
  }

  // Build contextual follow-up questions
  const suggestedQuestions: string[] = [];
  if (matchedSpeakers.length > 0 && matchedSessions.length > 0) {
    const firstSession = matchedSessions[0];
    suggestedQuestions.push(`Where does "${firstSession.title}" take place?`);
    suggestedQuestions.push(`What time does "${firstSession.title}" start and end?`);
  } else if (matchedSessions.length > 0) {
    const firstSession = matchedSessions[0];
    suggestedQuestions.push(`Where is ${firstSession.venue_name} located?`);
    if (firstSession.speaker_id) {
      suggestedQuestions.push(`Who is speaking at "${firstSession.title}"?`);
    }
  }
  if (suggestedQuestions.length < 3) {
    const defaults = [
      'Which sessions are happening simultaneously?',
      'Where is the AI workshop taking place?',
      'What sessions are available for cybersecurity?',
      'Is lunch included with registration?',
      'How can I contact the event organizers?',
    ];
    for (const d of defaults) {
      if (
        suggestedQuestions.length < 3 &&
        d.toLowerCase() !== qLower &&
        !suggestedQuestions.includes(d)
      ) {
        suggestedQuestions.push(d);
      }
    }
  }

  return {
    intents,
    isPromptInjection,
    event: data.event,
    matchedSessions,
    matchedSpeakers,
    matchedVenues,
    matchedFaqs,
    matchedAnnouncements,
    matchedContacts,
    simultaneousGroups,
    sources,
    suggestedQuestions: suggestedQuestions.slice(0, 3),
  };
}
