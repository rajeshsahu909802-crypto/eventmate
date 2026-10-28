import express, { Request, Response, NextFunction } from 'express';
import {
  ChatTurn,
  getFaqsFiltered,
  getScheduleFiltered,
  getSpeakersEnriched,
  getVenuesEnriched,
  loadEventDataset,
  retrieveRelevantContext,
  findSimultaneousSessions,
} from './services/eventRetrieval';
import {
  generateEventAssistantReply,
  getConfiguredModelName,
} from './services/gemmaService';

const MAX_MESSAGE_LENGTH = 600;
const MAX_SESSION_TURNS = 10;

// In-memory conversation store keyed by session_id
const sessionHistoryStore = new Map<string, ChatTurn[]>();

// Rate limiting store keyed by client identifier
interface RateBucket {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateBucket>();

export function resetServerStateForTests() {
  sessionHistoryStore.clear();
  rateLimitStore.clear();
}

export function createApiApp(options?: {
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  replyGenerator?: typeof generateEventAssistantReply;
}) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim());

  // Restricted CORS middleware
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.run.app'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // GET /api/health
  app.get('/api/health', (_req: Request, res: Response) => {
    const data = loadEventDataset();
    res.status(200).json({
      status: 'ok',
      service: 'EventMate AI Event Assistant API',
      configured_model: getConfiguredModelName(),
      dataset_loaded: Boolean(data?.event?.name),
      timestamp: new Date().toISOString(),
    });
  });

  // GET /api/event
  app.get('/api/event', (_req: Request, res: Response) => {
    try {
      const data = loadEventDataset();
      const simultaneous = findSimultaneousSessions();
      res.status(200).json({
        event: data.event,
        stats: {
          total_speakers: data.speakers.length,
          total_sessions: data.sessions.length,
          total_venues: data.venues.length,
          total_faqs: data.faqs.length,
          simultaneous_slots: simultaneous.length,
        },
        upcoming_sessions: data.sessions.slice(0, 4),
        announcements: data.announcements,
        organizer_contacts: data.organizer_contacts,
      });
    } catch {
      res.status(500).json({ error: 'Unable to load event overview information.' });
    }
  });

  // GET /api/schedule
  app.get('/api/schedule', (req: Request, res: Response) => {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const speaker = typeof req.query.speaker === 'string' ? req.query.speaker : undefined;
      const venue = typeof req.query.venue === 'string' ? req.query.venue : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const sessions = getScheduleFiltered({ date, speaker, venue, category, search });
      const data = loadEventDataset();
      const categories = Array.from(new Set(data.sessions.map((s) => s.category)));
      const dates = Array.from(new Set(data.sessions.map((s) => s.date)));

      res.status(200).json({
        timezone: data.event.timezone,
        total: sessions.length,
        available_dates: dates,
        available_categories: categories,
        sessions,
      });
    } catch {
      res.status(500).json({ error: 'Unable to retrieve event schedule.' });
    }
  });

  // GET /api/speakers
  app.get('/api/speakers', (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const speakers = getSpeakersEnriched(search);
      res.status(200).json({
        total: speakers.length,
        speakers,
      });
    } catch {
      res.status(500).json({ error: 'Unable to retrieve speaker directory.' });
    }
  });

  // GET /api/venues
  app.get('/api/venues', (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const venues = getVenuesEnriched(search);
      res.status(200).json({
        total: venues.length,
        venues,
      });
    } catch {
      res.status(500).json({ error: 'Unable to retrieve venue directory.' });
    }
  });

  // GET /api/faqs
  app.get('/api/faqs', (req: Request, res: Response) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const faqs = getFaqsFiltered({ category, search });
      const data = loadEventDataset();
      const categories = Array.from(new Set(data.faqs.map((f) => f.category)));

      res.status(200).json({
        total: faqs.length,
        available_categories: categories,
        faqs,
      });
    } catch {
      res.status(500).json({ error: 'Unable to retrieve event FAQs.' });
    }
  });

  // POST /api/chat
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      // Rate limit enforcement
      const windowMs = options?.rateLimitWindowMs ?? (Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000);
      const maxReqs = options?.rateLimitMax ?? (Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 20);
      const clientKey =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'default-client';

      const now = Date.now();
      const bucket = rateLimitStore.get(clientKey);
      if (!bucket || now > bucket.resetAt) {
        rateLimitStore.set(clientKey, { count: 1, resetAt: now + windowMs });
      } else {
        bucket.count += 1;
        if (bucket.count > maxReqs) {
          res.status(429).json({
            error: 'Rate limit exceeded. Please wait a moment before sending another question.',
            retry_after_seconds: Math.ceil((bucket.resetAt - now) / 1000),
          });
          return;
        }
      }

      const { message, session_id, mode, clear_session } = req.body || {};

      if (clear_session && typeof session_id === 'string') {
        sessionHistoryStore.delete(session_id);
        res.status(200).json({ status: 'cleared', session_id });
        return;
      }

      if (typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({
          error: 'Please provide a valid non-empty question in the "message" field.',
        });
        return;
      }

      const trimmedMessage = message.trim();
      if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
        res.status(400).json({
          error: `Question exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`,
        });
        return;
      }

      const sessionId =
        typeof session_id === 'string' && session_id.trim().length > 0
          ? session_id.trim().slice(0, 64)
          : 'default-session';

      const history = sessionHistoryStore.get(sessionId) || [];
      const retrieval = retrieveRelevantContext(trimmedMessage, history);

      const generator = options?.replyGenerator || generateEventAssistantReply;
      const aiResult = await generator(trimmedMessage, retrieval, history, {
        forceLocalFallback: mode === 'local',
      });

      // Update multi-turn conversation history
      const updatedHistory: ChatTurn[] = [
        ...history,
        { role: 'user', content: trimmedMessage },
        { role: 'assistant', content: aiResult.answer, sources: retrieval.sources },
      ].slice(-MAX_SESSION_TURNS);
      sessionHistoryStore.set(sessionId, updatedHistory);

      res.status(200).json({
        answer: aiResult.answer,
        sources: retrieval.sources,
        suggested_questions: retrieval.suggestedQuestions,
        session_id: sessionId,
        ai_generated: aiResult.ai_generated,
        fallback_used: aiResult.fallback_used,
        model_used: aiResult.model_used,
        notice: aiResult.notice,
      });
    } catch {
      res.status(500).json({
        error: 'An unexpected error occurred while processing your question. Please try again.',
      });
    }
  });

  return app;
}
