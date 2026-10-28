import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  MessageSquare,
  Database,
  Cpu,
} from 'lucide-react';

export interface SourceItem {
  type: string;
  id: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: SourceItem[];
  suggestedQuestions?: string[];
  aiGenerated?: boolean;
  fallbackUsed?: boolean;
  modelUsed?: string;
  notice?: string;
  isError?: boolean;
  failedPrompt?: string;
}

interface ChatAssistantSectionProps {
  isDark: boolean;
  externalPrompt: string | null;
  onExternalPromptConsumed: () => void;
}

const INITIAL_SUGGESTIONS = [
  'Who is the keynote speaker?',
  'Where is the AI workshop taking place?',
  'Which sessions are happening simultaneously?',
  'What sessions are available for cybersecurity?',
  'Where can I find the registration desk?',
  'Is lunch included?',
  'What should I bring to the event?',
  'How can I contact the event organizers?',
  'Can you summarize the complete event schedule?',
];

function formatTimeNow(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={idx} className="h-2" />;
    }

    // Parse bold **text** and italic *text*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={pIdx} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={pIdx}>{part}</React.Fragment>;
    });

    if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
      return (
        <div key={idx} className="pl-3 py-0.5 leading-relaxed">
          {formattedLine}
        </div>
      );
    }

    return (
      <p key={idx} className="py-0.5 leading-relaxed">
        {formattedLine}
      </p>
    );
  });
}

export const ChatAssistantSection: React.FC<ChatAssistantSectionProps> = ({
  isDark,
  externalPrompt,
  onExternalPromptConsumed,
}) => {
  const [sessionId] = useState<string>(() => `evt-sess-${Math.random().toString(36).slice(2, 9)}`);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Hello! I am **EventMate**, your virtual event information desk for **Demo Technology Conference 2026**.\n\nAsk me anything about session schedules, keynote speakers, workshop rooms, simultaneous sessions, lunch & refreshments, or registration requirements. All answers are strictly grounded in the verified conference dataset.',
      timestamp: formatTimeNow(),
      sources: [{ type: 'event', id: 'event-overview', title: 'Demo Technology Conference 2026' }],
      suggestedQuestions: [
        'Who is the keynote speaker?',
        'Where is the AI workshop taking place?',
        'Which sessions are happening simultaneously?',
      ],
      aiGenerated: false,
      modelUsed: 'system-ready',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'ai' | 'local'>('ai');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      const promptToRun = externalPrompt;
      onExternalPromptConsumed();
      void sendQuestion(promptToRun);
    }
  }, [externalPrompt]);

  async function sendQuestion(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: formatTimeNow(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          session_id: sessionId,
          mode: searchMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: formatTimeNow(),
        sources: data.sources || [],
        suggestedQuestions: data.suggested_questions || [],
        aiGenerated: data.ai_generated,
        fallbackUsed: data.fallback_used,
        modelUsed: data.model_used,
        notice: data.notice,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Unable to reach the EventMate assistant service.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errMsg,
          timestamp: formatTimeNow(),
          isError: true,
          failedPrompt: trimmed,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearConversation() {
    if (isLoading) return;
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          clear_session: true,
        }),
      });
    } catch {
      // Ignore network error on clear
    }
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'Conversation cleared. Ask me any question about the **Demo Technology Conference 2026** schedule, speakers, venues, or FAQs.',
        timestamp: formatTimeNow(),
        sources: [{ type: 'event', id: 'event-overview', title: 'Demo Technology Conference 2026' }],
        suggestedQuestions: [
          'What time does the event start?',
          'What sessions are available for cybersecurity?',
          'Is lunch included?',
        ],
        modelUsed: 'system-ready',
      },
    ]);
  }

  function handleCopyMessage(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion(input);
    }
  }

  const latestSuggestions =
    messages
      .slice()
      .reverse()
      .find((m) => m.role === 'assistant' && m.suggestedQuestions && m.suggestedQuestions.length > 0)
      ?.suggestedQuestions || INITIAL_SUGGESTIONS.slice(0, 3);

  return (
    <section
      id="assistant"
      aria-labelledby="assistant-heading"
      className="scroll-mt-24"
    >
      <div
        className={`rounded-xl border transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top bar of the AI Assistant panel */}
        <div
          className={`flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div>
            <h2 id="assistant-heading" className="text-xl font-bold tracking-tight">
              EventMate Conversational Assistant
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              24/7 Grounded Event Information Desk · Multi-turn context enabled · Strict source verification
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Interactive Mode Selector (Gemma AI vs Local Verified Search) */}
            <div
              className={`flex items-center gap-1 p-1 rounded-lg border ${
                isDark
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-100 border-slate-200'
              }`}
              role="group"
              aria-label="Response engine mode"
            >
              <button
                type="button"
                onClick={() => setSearchMode('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  searchMode === 'ai'
                    ? isDark
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-900 shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Gemma AI Grounded
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('local')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  searchMode === 'local'
                    ? isDark
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-900 shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Local Dataset Search
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearConversation}
              disabled={isLoading || messages.length <= 1}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 ${
                isDark
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Conversation
            </button>
          </div>
        </div>

        {/* Quick Question Starters Bar */}
        <div
          className={`px-6 py-3 border-b flex items-center gap-2 overflow-x-auto ${
            isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span
            className={`text-xs font-medium whitespace-nowrap shrink-0 mr-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Quick inquiries:
          </span>
          {INITIAL_SUGGESTIONS.slice(0, 6).map((q) => (
            <button
              key={q}
              type="button"
              disabled={isLoading}
              onClick={() => void sendQuestion(q)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-blue-500/60 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-600 hover:text-blue-700'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message History Viewport */}
        <div
          ref={chatScrollRef}
          className="h-[440px] overflow-y-auto px-6 py-5 space-y-5"
          role="log"
          aria-live="polite"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Metadata Header: Role · Timestamp · Engine */}
                <div
                  className={`flex items-center gap-2 text-xs mb-1.5 font-mono tabular-nums ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  <span>{isUser ? 'You' : 'EventMate Assistant'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{msg.timestamp}</span>
                  {!isUser && msg.modelUsed && msg.modelUsed !== 'system-ready' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {msg.fallbackUsed
                          ? 'Verified Local Dataset Search'
                          : `Model: ${msg.modelUsed}`}
                      </span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-3xl rounded-xl px-5 py-4 text-sm ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : msg.isError
                      ? isDark
                        ? 'bg-red-950/60 border border-red-800 text-red-200'
                        : 'bg-red-50 border border-red-200 text-red-900'
                      : isDark
                      ? 'bg-slate-800/90 border border-slate-700/80 text-slate-100'
                      : 'bg-slate-100/90 border border-slate-200/80 text-slate-900'
                  }`}
                >
                  {msg.isError ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Request could not be completed</span>
                      </div>
                      <p>{msg.content}</p>
                      {msg.failedPrompt && (
                        <button
                          type="button"
                          onClick={() => void sendQuestion(msg.failedPrompt!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Retry Question
                        </button>
                      )}
                    </div>
                  ) : (
                    <div>{renderFormattedText(msg.content)}</div>
                  )}

                  {/* Notice when fallback search was used */}
                  {!isUser && msg.notice && (
                    <p
                      className={`mt-3 pt-2.5 border-t text-xs ${
                        isDark
                          ? 'border-slate-700 text-amber-300'
                          : 'border-slate-200 text-amber-800'
                      }`}
                    >
                      Note: {msg.notice}
                    </p>
                  )}

                  {/* Grounded Sources & Copy Answer button */}
                  {!isUser && !msg.isError && (
                    <div
                      className={`mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-4 text-xs ${
                        isDark
                          ? 'border-slate-700/80 text-slate-400'
                          : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">Verified sources:</span>
                        {msg.sources && msg.sources.length > 0 ? (
                          msg.sources.map((src, sIdx) => (
                            <React.Fragment key={`${src.type}-${src.id}`}>
                              {sIdx > 0 && <span aria-hidden="true">·</span>}
                              <span>{src.title}</span>
                            </React.Fragment>
                          ))
                        ) : (
                          <span>Event Dataset</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className={`inline-flex items-center gap-1 font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isDark
                            ? 'text-slate-300 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        aria-label="Copy assistant answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Answer</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <div
                className={`text-xs mb-1.5 font-mono ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                EventMate Assistant · Retrieving verified event records...
              </div>
              <div
                className={`rounded-xl px-5 py-3.5 text-sm border flex items-center gap-3 ${
                  isDark
                    ? 'bg-slate-800/90 border-slate-700 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-blue-500 animate-pulse" />
                <span>Synthesizing grounded answer from conference records...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Follow-Up Questions */}
        <div
          className={`px-6 py-3 border-t flex flex-wrap items-center gap-2 ${
            isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          <span
            className={`text-xs font-medium mr-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Suggested follow-ups:
          </span>
          {latestSuggestions.map((followUp) => (
            <button
              key={followUp}
              type="button"
              disabled={isLoading}
              onClick={() => void sendQuestion(followUp)}
              className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                isDark
                  ? 'border-slate-700 bg-slate-800/70 text-blue-300 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-blue-700 hover:bg-blue-50'
              }`}
            >
              {followUp}
            </button>
          ))}
        </div>

        {/* Chat Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendQuestion(input);
          }}
          className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}
        >
          <label htmlFor="eventmate-chat-input" className="sr-only">
            Ask a question about the event schedule, speakers, venues, or FAQs
          </label>
          <div className="flex items-end gap-3">
            <textarea
              id="eventmate-chat-input"
              ref={textareaRef}
              rows={2}
              maxLength={600}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask about today's schedule, keynote speaker, AI workshop room, simultaneous sessions, or lunch... (Enter to send, Shift+Enter for new line)"
              className={`w-full resize-none rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Ask AI</span>
            </button>
          </div>
          <div
            className={`mt-2 flex items-center justify-between text-xs font-mono tabular-nums ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            <span>Press Enter to send · Shift+Enter for a new line</span>
            <span>{input.length}/600 chars</span>
          </div>
        </form>
      </div>
    </section>
  );
};
