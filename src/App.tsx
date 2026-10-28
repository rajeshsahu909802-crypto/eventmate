import React, { useEffect, useState } from 'react';
import {
  Search,
  Sun,
  Moon,
  Calendar,
  MapPin,
  User,
  HelpCircle,
  MessageSquare,
  RotateCcw,
  ArrowUpRight,
} from 'lucide-react';
import {
  HeroAssistantVisual,
  SpeakerAvatarIllustration,
} from './components/EventVisuals';
import { ChatAssistantSection } from './components/ChatAssistantSection';

interface EventOverviewData {
  event: {
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
  };
  stats: {
    total_speakers: number;
    total_sessions: number;
    total_venues: number;
    total_faqs: number;
    simultaneous_slots: number;
  };
  upcoming_sessions: SessionItem[];
  announcements: {
    id: string;
    title: string;
    timestamp: string;
    priority: string;
    content: string;
  }[];
  organizer_contacts: {
    role: string;
    email: string;
    phone: string;
    location: string;
    hours: string;
  }[];
}

interface SessionItem {
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

interface SpeakerItem {
  id: string;
  name: string;
  title: string;
  biography: string;
  expertise: string[];
  sessions: string[];
  avatar_key: string;
  session_details: SessionItem[];
}

interface VenueItem {
  id: string;
  name: string;
  building: string;
  floor: string;
  room: string;
  capacity: number;
  directions: string;
  accessibility: string;
  sessions: SessionItem[];
}

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const HERO_SUGGESTED_QUESTIONS = [
  'What is the schedule for today?',
  'Who is the keynote speaker?',
  'Where is the AI workshop taking place?',
  'Which sessions are happening simultaneously?',
  'Is lunch included?',
];

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [heroInput, setHeroInput] = useState<string>('');
  const [externalChatPrompt, setExternalChatPrompt] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<EventOverviewData | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [faqCategories, setFaqCategories] = useState<string[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Schedule filters
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('all');
  const [scheduleSearch, setScheduleSearch] = useState<string>('');

  // Directory & FAQ filters
  const [speakerSearch, setSpeakerSearch] = useState<string>('');
  const [venueSearch, setVenueSearch] = useState<string>('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('all');
  const [faqSearch, setFaqSearch] = useState<string>('');

  async function fetchAllEventData() {
    setIsInitialLoading(true);
    setLoadError(null);
    try {
      const [evRes, schedRes, spkRes, venRes, faqRes] = await Promise.all([
        fetch('/api/event'),
        fetch('/api/schedule'),
        fetch('/api/speakers'),
        fetch('/api/venues'),
        fetch('/api/faqs'),
      ]);

      if (!evRes.ok || !schedRes.ok || !spkRes.ok || !venRes.ok || !faqRes.ok) {
        throw new Error('Failed to load one or more event data endpoints.');
      }

      const [evData, schedData, spkData, venData, faqData] = await Promise.all([
        evRes.json(),
        schedRes.json(),
        spkRes.json(),
        venRes.json(),
        faqRes.json(),
      ]);

      setOverview(evData);
      setSessions(schedData.sessions || []);
      setSpeakers(spkData.speakers || []);
      setVenues(venData.venues || []);
      setFaqs(faqData.faqs || []);
      setFaqCategories(faqData.available_categories || []);
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Unable to load conference dataset from backend API.'
      );
    } finally {
      setIsInitialLoading(false);
    }
  }

  useEffect(() => {
    void fetchAllEventData();
  }, []);

  function triggerAssistantQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setExternalChatPrompt(trimmed);
    const el = document.getElementById('assistant');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Client-side responsive filtering synced with dataset
  const filteredSessions = sessions.filter((s) => {
    if (selectedDate !== 'all' && s.date !== selectedDate) return false;
    if (
      selectedCategory !== 'all' &&
      s.category.toLowerCase() !== selectedCategory.toLowerCase()
    ) {
      return false;
    }
    if (selectedVenue !== 'all' && s.venue_id !== selectedVenue) return false;
    if (selectedSpeaker !== 'all' && s.speaker_id !== selectedSpeaker) return false;
    if (scheduleSearch.trim()) {
      const q = scheduleSearch.toLowerCase().trim();
      const hay = `${s.title} ${s.speaker_name} ${s.venue_name} ${s.category} ${s.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredSpeakers = speakers.filter((spk) => {
    if (!speakerSearch.trim()) return true;
    const q = speakerSearch.toLowerCase().trim();
    return (
      spk.name.toLowerCase().includes(q) ||
      spk.title.toLowerCase().includes(q) ||
      spk.biography.toLowerCase().includes(q) ||
      spk.expertise.some((e) => e.toLowerCase().includes(q))
    );
  });

  const filteredVenues = venues.filter((v) => {
    if (!venueSearch.trim()) return true;
    const q = venueSearch.toLowerCase().trim();
    return (
      v.name.toLowerCase().includes(q) ||
      v.building.toLowerCase().includes(q) ||
      v.floor.toLowerCase().includes(q) ||
      v.room.toLowerCase().includes(q) ||
      v.directions.toLowerCase().includes(q)
    );
  });

  const filteredFaqs = faqs.filter((f) => {
    if (
      selectedFaqCategory !== 'all' &&
      f.category.toLowerCase() !== selectedFaqCategory.toLowerCase()
    ) {
      return false;
    }
    if (!faqSearch.trim()) return true;
    const q = faqSearch.toLowerCase().trim();
    return (
      f.category.toLowerCase().includes(q) ||
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q)
    );
  });

  const uniqueDates = Array.from(new Set(sessions.map((s) => s.date)));
  const uniqueCategories = Array.from(new Set(sessions.map((s) => s.category)));

  return (
    <div
      className={`min-h-screen transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* A. TOP NAVIGATION — Strictly 3-Zone Top Bar Contract */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-slate-950/90 border-slate-800'
            : 'bg-white/95 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#home"
            className={`text-lg font-bold tracking-tight font-display whitespace-nowrap shrink-0 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            EventMate
          </a>

          {/* Zone 2: 5 concise single-line text navigation links */}
          <nav
            aria-label="Primary Navigation"
            className={`hidden md:flex items-center gap-7 text-sm font-medium ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            <a
              href="#dashboard"
              className="hover:text-blue-600 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Overview
            </a>
            <a
              href="#schedule"
              className="hover:text-blue-600 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Schedule
            </a>
            <a
              href="#speakers"
              className="hover:text-blue-600 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Speakers
            </a>
            <a
              href="#venues"
              className="hover:text-blue-600 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Venues
            </a>
            <a
              href="#faqs"
              className="hover:text-blue-600 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              FAQs
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <a
              href="#assistant"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              Ask EventMate AI
            </a>
          </div>
        </div>
      </header>

      {/* Secondary Workspace Bar: Demonstration Data Notice & Theme Toggle */}
      <div
        className={`border-b text-xs transition-colors ${
          isDark
            ? 'bg-slate-900/70 border-slate-800 text-slate-300'
            : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Demonstration Dataset Active:</span>
            <span>
              {overview?.event.name || 'Demo Technology Conference 2026'} · Verified sample
              records for schedule, speaker, and venue retrieval
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile quick links */}
            <div className="flex md:hidden items-center gap-3 font-medium">
              <a href="#schedule" className="hover:underline whitespace-nowrap">
                Schedule
              </a>
              <a href="#speakers" className="hover:underline whitespace-nowrap">
                Speakers
              </a>
              <a href="#venues" className="hover:underline whitespace-nowrap">
                Venues
              </a>
              <a href="#faqs" className="hover:underline whitespace-nowrap">
                FAQs
              </a>
            </div>

            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border font-medium transition-colors whitespace-nowrap shrink-0 ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              aria-label="Toggle color theme"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>Dark Navy Theme</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main id="home" className="max-w-7xl mx-auto px-6 py-10 space-y-16">
        {/* Error state if backend dataset fails to load */}
        {loadError && (
          <div
            className={`rounded-xl border p-6 flex items-center justify-between gap-4 ${
              isDark
                ? 'bg-red-950/50 border-red-800 text-red-200'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div>
              <h2 className="text-base font-semibold">Event Data Unavailable</h2>
              <p className="text-sm mt-1">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchAllEventData()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Loading
            </button>
          </div>
        )}

        {/* B. HERO SECTION */}
        <section aria-labelledby="hero-heading" className="pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Proposition + Prominent Chat Input + Suggested Questions */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <p
                  className={`text-xs font-mono tracking-wide ${
                    isDark ? 'text-blue-400' : 'text-blue-700'
                  }`}
                >
                  {overview?.event.name || 'Demo Technology Conference 2026'} ·{' '}
                  {overview?.event.start_date || '2026-11-14'} to{' '}
                  {overview?.event.end_date || '2026-11-15'} ·{' '}
                  {overview?.event.timezone || 'Asia/Kolkata'}
                </p>

                <h1
                  id="hero-heading"
                  className="font-display font-bold tracking-tight text-balance"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', lineHeight: 1.12 }}
                >
                  Your Event, Simplified with AI
                </h1>

                <p
                  className={`text-base sm:text-lg max-w-2xl leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  Ask anything about the event. Get instant answers about schedules,
                  speakers, venues, and more.
                </p>
              </div>

              {/* Prominent Hero Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!heroInput.trim()) return;
                  const q = heroInput;
                  setHeroInput('');
                  triggerAssistantQuestion(q);
                }}
                className={`p-2 rounded-xl border transition-colors ${
                  isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-300 shadow-xs'
                }`}
              >
                <label htmlFor="hero-quick-ask" className="sr-only">
                  Ask anything about the event
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <MessageSquare
                      className={`w-4 h-4 ml-3 shrink-0 ${
                        isDark ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    />
                    <input
                      id="hero-quick-ask"
                      type="text"
                      value={heroInput}
                      onChange={(e) => setHeroInput(e.target.value)}
                      placeholder="Ask e.g. 'Where is the AI workshop taking place?' or 'Who is the keynote speaker?'"
                      className={`w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none ${
                        isDark
                          ? 'text-white placeholder-slate-500'
                          : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    Ask AI
                  </button>
                </div>
              </form>

              {/* Suggested Questions */}
              <div className="space-y-2">
                <p
                  className={`text-xs font-medium ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Try asking EventMate:
                </p>
                <div className="flex flex-wrap gap-2">
                  {HERO_SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => triggerAssistantQuestion(question)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-blue-500 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-blue-600 hover:text-blue-700'
                      }`}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Visual Representing Intelligent Event Assistant */}
            <div className="lg:col-span-5 flex">
              <HeroAssistantVisual isDark={isDark} />
            </div>
          </div>
        </section>

        {/* C. EVENT INFORMATION DASHBOARD */}
        <section
          id="dashboard"
          aria-labelledby="dashboard-heading"
          className="scroll-mt-24 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b pb-4 border-slate-200 dark:border-slate-800">
            <div>
              <h2 id="dashboard-heading" className="text-2xl font-bold tracking-tight">
                Event Information Dashboard
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Verified metrics, upcoming sessions, and live organizer announcements from the
                event dataset.
              </p>
            </div>
            <span
              className={`text-xs font-mono tabular-nums ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Timezone: {overview?.event.timezone || 'Asia/Kolkata'} · Doors Open:{' '}
              {overview?.event.daily_start_time || '08:30 IST'}
            </span>
          </div>

          {/* 4-Column Full-Width KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className={`rounded-xl border p-5 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Event Dates
              </p>
              <p className="text-xl font-bold font-mono tabular-nums mt-1.5">
                {overview ? `${overview.event.start_date} – ${overview.event.end_date}` : '2026-11-14 – 2026-11-15'}
              </p>
              <p className={`text-xs mt-1 font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {overview?.event.daily_start_time || '08:30 IST'} – {overview?.event.daily_end_time || '18:00 IST'}
              </p>
            </div>

            <div
              className={`rounded-xl border p-5 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Verified Speakers
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums mt-1.5">
                {overview ? overview.stats.total_speakers : 6} Speakers
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                AI · Cybersecurity · Cloud · Robotics
              </p>
            </div>

            <div
              className={`rounded-xl border p-5 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Conference Sessions
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums mt-1.5">
                {overview ? overview.stats.total_sessions : 11} Sessions
              </p>
              <p className={`text-xs mt-1 tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Includes {overview ? overview.stats.simultaneous_slots : 3} parallel time slots
              </p>
            </div>

            <div
              className={`rounded-xl border p-5 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Primary Venue
              </p>
              <p className="text-base font-bold mt-1.5 line-clamp-1">
                BITCC, Whitefield, Bengaluru
              </p>
              <p className={`text-xs mt-1 tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {overview ? overview.stats.total_venues : 6} mapped halls &amp; labs
              </p>
            </div>
          </div>

          {/* Upcoming Sessions & Important Announcements */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Upcoming Sessions */}
            <div
              className={`lg:col-span-7 rounded-xl border p-6 flex flex-col justify-between ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold">Upcoming Day 1 Sessions</h3>
                  <a
                    href="#schedule"
                    className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
                  >
                    View Full Schedule
                  </a>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(overview?.upcoming_sessions || sessions.slice(0, 4)).map((s) => (
                    <div key={s.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div
                        className={`flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <span>{s.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {s.start_time}–{s.end_time} IST
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{s.venue_name}</span>
                        <span aria-hidden="true">·</span>
                        <span>{s.category}</span>
                      </div>
                      <p className="text-sm font-semibold mt-1">{s.title}</p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Speaker: {s.speaker_name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Important Announcements & Organizer Desk */}
            <div
              className={`lg:col-span-5 rounded-xl border p-6 flex flex-col justify-between space-y-6 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <h3 className="text-base font-bold mb-4">Important Announcements</h3>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(overview?.announcements || []).map((ann) => (
                    <div key={ann.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div
                        className={`flex items-center gap-2 text-xs font-mono tabular-nums ${
                          isDark ? 'text-blue-400' : 'text-blue-700'
                        }`}
                      >
                        <span>{ann.priority}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ann.title}</span>
                      </div>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {ann.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`pt-4 border-t text-xs space-y-1.5 ${
                  isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'
                }`}
              >
                <p className="font-semibold text-sm">Organizer Information Desk</p>
                {overview?.organizer_contacts?.slice(0, 2).map((c) => (
                  <p key={c.role} className="font-mono tabular-nums">
                    {c.role}: {c.email} · {c.phone}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* D. AI CHAT INTERFACE */}
        <ChatAssistantSection
          isDark={isDark}
          externalPrompt={externalChatPrompt}
          onExternalPromptConsumed={() => setExternalChatPrompt(null)}
        />

        {/* E. EVENT SCHEDULE */}
        <section
          id="schedule"
          aria-labelledby="schedule-heading"
          className="scroll-mt-24 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
            <div>
              <h2 id="schedule-heading" className="text-2xl font-bold tracking-tight">
                Event Schedule
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Filter verified sessions by date, category, venue, or speaker. All times in{' '}
                {overview?.event.timezone || 'Asia/Kolkata'} (IST).
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                triggerAssistantQuestion('Which sessions are happening simultaneously?')
              }
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-blue-400 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span>Check Simultaneous Sessions</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Schedule Filter Controls */}
          <div
            className={`rounded-xl border p-5 space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search input */}
              <div className="lg:col-span-2 relative">
                <label htmlFor="schedule-search" className="sr-only">
                  Search sessions
                </label>
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="schedule-search"
                  type="text"
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  placeholder="Search session title, topic, speaker..."
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Date Select */}
              <div>
                <label htmlFor="filter-date" className="sr-only">
                  Filter by Date
                </label>
                <select
                  id="filter-date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Dates (Nov 14 &amp; 15)</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>
                      {d === '2026-11-14' ? 'Day 1 — Nov 14, 2026' : 'Day 2 — Nov 15, 2026'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Venue Select */}
              <div>
                <label htmlFor="filter-venue" className="sr-only">
                  Filter by Venue
                </label>
                <select
                  id="filter-venue"
                  value={selectedVenue}
                  onChange={(e) => setSelectedVenue(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Venues</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speaker Select */}
              <div>
                <label htmlFor="filter-speaker" className="sr-only">
                  Filter by Speaker
                </label>
                <select
                  id="filter-speaker"
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Speakers</option>
                  {speakers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Category Segmented Filter Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Categories ({sessions.length})
                </button>
                {uniqueCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {(selectedDate !== 'all' ||
                selectedCategory !== 'all' ||
                selectedVenue !== 'all' ||
                selectedSpeaker !== 'all' ||
                scheduleSearch !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('all');
                    setSelectedCategory('all');
                    setSelectedVenue('all');
                    setSelectedSpeaker('all');
                    setScheduleSearch('');
                  }}
                  className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap shrink-0"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Schedule List */}
          {isInitialLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-28 rounded-xl border animate-pulse ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div
              className={`rounded-xl border p-10 text-center space-y-3 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <Calendar className="w-8 h-8 mx-auto text-slate-400" />
              <h3 className="text-base font-semibold">No Matching Sessions Found</h3>
              <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                No conference sessions match your active filter criteria. Reset the filters or ask
                EventMate AI for assistance.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('all');
                  setSelectedCategory('all');
                  setSelectedVenue('all');
                  setSelectedSpeaker('all');
                  setScheduleSearch('');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reset Schedule Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-xl border p-5 transition-colors ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-3xl">
                      {/* Zero-Pill Unboxed Metadata Line */}
                      <div
                        className={`flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums ${
                          isDark ? 'text-blue-400' : 'text-blue-700'
                        }`}
                      >
                        <span>{session.day_label}</span>
                        <span aria-hidden="true">·</span>
                        <span>{session.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {session.start_time} – {session.end_time} IST
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{session.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{session.status}</span>
                      </div>

                      <h3 className="text-base font-bold">{session.title}</h3>

                      <p
                        className={`text-sm leading-relaxed ${
                          isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {session.description}
                      </p>

                      <div
                        className={`pt-1 flex flex-wrap items-center gap-2 text-xs ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <span>Speaker: {session.speaker_name}</span>
                        <span aria-hidden="true">·</span>
                        <span>Venue: {session.venue_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          triggerAssistantQuestion(
                            `Tell me about the session "${session.title}" and where it takes place.`
                          )
                        }
                        className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                          isDark
                            ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Ask AI About Session
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* F. SPEAKER DIRECTORY */}
        <section
          id="speakers"
          aria-labelledby="speakers-heading"
          className="scroll-mt-24 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
            <div>
              <h2 id="speakers-heading" className="text-2xl font-bold tracking-tight">
                Speaker Directory
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Verified biographies, areas of expertise, and associated conference sessions.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <label htmlFor="speaker-search" className="sr-only">
                Search speakers
              </label>
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input
                id="speaker-search"
                type="text"
                value={speakerSearch}
                onChange={(e) => setSpeakerSearch(e.target.value)}
                placeholder="Search speaker name or expertise..."
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {filteredSpeakers.length === 0 ? (
            <div
              className={`rounded-xl border p-8 text-center space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <User className="w-7 h-7 mx-auto text-slate-400" />
              <p className="text-sm font-semibold">No matching speakers in dataset</p>
              <button
                type="button"
                onClick={() => setSpeakerSearch('')}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear speaker search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpeakers.map((spk) => (
                <div
                  key={spk.id}
                  className={`rounded-xl border p-6 flex flex-col justify-between space-y-4 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <SpeakerAvatarIllustration avatarKey={spk.avatar_key} name={spk.name} />
                      <div>
                        <h3 className="text-base font-bold">{spk.name}</h3>
                        <p
                          className={`text-xs mt-0.5 leading-snug ${
                            isDark ? 'text-blue-400' : 'text-blue-700'
                          }`}
                        >
                          {spk.title}
                        </p>
                      </div>
                    </div>

                    <p
                      className={`text-sm leading-relaxed ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {spk.biography}
                    </p>

                    {/* Unboxed expertise metadata */}
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="font-semibold">Expertise: </span>
                      {spk.expertise.map((exp, idx) => (
                        <React.Fragment key={exp}>
                          {idx > 0 && <span aria-hidden="true"> · </span>}
                          <span>{exp}</span>
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Associated Sessions */}
                    <div
                      className={`pt-3 border-t text-xs space-y-1.5 ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                      }`}
                    >
                      <p className="font-semibold">Associated Sessions:</p>
                      {spk.session_details.map((s) => (
                        <p
                          key={s.id}
                          className={`font-mono tabular-nums ${
                            isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          • {s.title} ({s.day_label}, {s.start_time}–{s.end_time} IST ·{' '}
                          {s.venue_name})
                        </p>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      triggerAssistantQuestion(
                        `What sessions is ${spk.name} presenting and when do they start?`
                      )
                    }
                    className={`w-full py-2 px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      isDark
                        ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Ask AI About {spk.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* G. VENUE DIRECTORY */}
        <section
          id="venues"
          aria-labelledby="venues-heading"
          className="scroll-mt-24 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
            <div>
              <h2 id="venues-heading" className="text-2xl font-bold tracking-tight">
                Venue &amp; Wayfinding Directory
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Confirmed buildings, floors, room numbers, step-by-step directions, and
                accessibility facilities.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <label htmlFor="venue-search" className="sr-only">
                Search venues
              </label>
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input
                id="venue-search"
                type="text"
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
                placeholder="Search hall, room, floor, or wing..."
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {filteredVenues.length === 0 ? (
            <div
              className={`rounded-xl border p-8 text-center space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <MapPin className="w-7 h-7 mx-auto text-slate-400" />
              <p className="text-sm font-semibold">No matching venues found</p>
              <button
                type="button"
                onClick={() => setVenueSearch('')}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear venue search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredVenues.map((venue) => (
                <div
                  key={venue.id}
                  className={`rounded-xl border p-6 flex flex-col justify-between space-y-4 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div
                      className={`flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums ${
                        isDark ? 'text-blue-400' : 'text-blue-700'
                      }`}
                    >
                      <span>{venue.building}</span>
                      <span aria-hidden="true">·</span>
                      <span>{venue.floor}</span>
                      <span aria-hidden="true">·</span>
                      <span>{venue.room}</span>
                      <span aria-hidden="true">·</span>
                      <span>Capacity: {venue.capacity}</span>
                    </div>

                    <h3 className="text-lg font-bold">{venue.name}</h3>

                    <div className="space-y-2 text-sm">
                      <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                        <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                          Directions:{' '}
                        </strong>
                        {venue.directions}
                      </p>
                      <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                        <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                          Accessibility:{' '}
                        </strong>
                        {venue.accessibility}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {venue.sessions.length} scheduled session(s)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        triggerAssistantQuestion(
                          `How do I find ${venue.name} and what accessibility facilities are available there?`
                        )
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        isDark
                          ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Ask Wayfinding Directions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* H. EVENT FAQ */}
        <section id="faqs" aria-labelledby="faqs-heading" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
            <div>
              <h2 id="faqs-heading" className="text-2xl font-bold tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Searchable guidelines for registration, entry requirements, timings, food,
                certificates, workshops, technical support, and organizer contacts.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <label htmlFor="faq-search" className="sr-only">
                Search FAQs
              </label>
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input
                id="faq-search"
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search FAQs (e.g. lunch, Wi-Fi, laptop)..."
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Interactive FAQ Category Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedFaqCategory('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedFaqCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : isDark
                  ? 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Topics ({faqs.length})
            </button>
            {faqCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedFaqCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedFaqCategory === cat
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredFaqs.length === 0 ? (
            <div
              className={`rounded-xl border p-8 text-center space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <HelpCircle className="w-7 h-7 mx-auto text-slate-400" />
              <p className="text-sm font-semibold">No matching FAQ entries</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedFaqCategory('all');
                  setFaqSearch('');
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Reset FAQ filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredFaqs.map((faq) => (
                <div
                  key={faq.id}
                  className={`rounded-xl border p-6 flex flex-col justify-between space-y-3 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <p
                      className={`text-xs font-mono ${
                        isDark ? 'text-blue-400' : 'text-blue-700'
                      }`}
                    >
                      Category · {faq.category}
                    </p>
                    <h3 className="text-base font-bold">{faq.question}</h3>
                    <p
                      className={`text-sm leading-relaxed ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Quiet Footer */}
      <footer
        className={`mt-16 border-t py-10 text-xs transition-colors ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-500'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className={`font-display font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              EventMate — AI-Powered Event Assistant
            </p>
            <p>
              Demonstration dataset configured for Demo Technology Conference 2026 · Grounded
              Gemma &amp; Gemini API Architecture.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#dashboard" className="hover:underline">
              Overview
            </a>
            <a href="#assistant" className="hover:underline">
              AI Assistant
            </a>
            <a href="#schedule" className="hover:underline">
              Schedule
            </a>
            <a href="#speakers" className="hover:underline">
              Speakers
            </a>
            <a href="#venues" className="hover:underline">
              Venues
            </a>
            <a href="#faqs" className="hover:underline">
              FAQs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
