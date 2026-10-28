import React from 'react';

export const HeroAssistantVisual: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <div
      className={`relative w-full h-full min-h-[340px] rounded-xl border overflow-hidden flex flex-col justify-between p-6 transition-colors ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : 'bg-slate-900 border-slate-800 text-white'
      }`}
    >
      {/* Subtle architectural grid & ambient radial light */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 600 420"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="archGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#6366F1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </linearGradient>
          <pattern id="confGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#475569"
              strokeWidth="0.6"
              strokeOpacity="0.45"
            />
          </pattern>
        </defs>
        <rect width="600" height="420" fill="url(#confGrid)" />
        <circle cx="480" cy="90" r="190" fill="url(#archGrad)" />
        <path
          d="M40 360 C160 270, 310 270, 560 150"
          fill="none"
          stroke="#60A5FA"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        <path
          d="M40 390 C200 310, 350 320, 560 220"
          fill="none"
          stroke="#818CF8"
          strokeWidth="1"
        />
      </svg>

      {/* Top row: Conference Wayfinding & Grounded Retrieval Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-mono text-blue-400 tracking-wide">
            EventMate Grounded Knowledge Desk
          </p>
          <h3 className="text-base font-semibold text-white mt-0.5">
            Bengaluru International Tech Convention Centre
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400 tabular-nums">
          Nov 14–15, 2026 · IST
        </span>
      </div>

      {/* Middle interactive preview of grounded retrieval */}
      <div className="relative z-10 my-5 space-y-3">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3.5">
          <p className="text-xs text-slate-400 mb-1">Attendee Inquiry</p>
          <p className="text-sm font-medium text-slate-100">
            &ldquo;Where is the AI workshop taking place and what should I bring?&rdquo;
          </p>
        </div>

        <div className="bg-blue-950/60 border border-blue-800/60 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-blue-300 mb-1.5 font-mono tabular-nums">
            <span>Verified Record Match · sess-003 &amp; venue-003</span>
            <span>11:00–13:00 IST</span>
          </div>
          <p className="text-sm text-slate-100 leading-relaxed">
            The <strong className="text-white">Hands-On AI Workshop</strong> takes place in{' '}
            <strong className="text-white">AI Innovation Lab 204</strong> (East Technical Wing, Level 2).
            Bring your badge QR code, photo ID, and a charged laptop with Python 3.11+.
          </p>
        </div>
      </div>

      {/* Bottom architectural metrics */}
      <div className="relative z-10 grid grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
        <div>
          <span className="text-slate-400 block">Grounded Sessions</span>
          <span className="text-sm font-semibold font-mono text-white tabular-nums">
            11 Verified
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Convention Halls</span>
          <span className="text-sm font-semibold font-mono text-white tabular-nums">
            6 Mapped Venues
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Hallucination Guard</span>
          <span className="text-sm font-semibold font-mono text-blue-400 tabular-nums">
            Strict Source-Only
          </span>
        </div>
      </div>
    </div>
  );
};

export const SpeakerAvatarIllustration: React.FC<{
  avatarKey: string;
  name: string;
}> = ({ avatarKey, name }) => {
  const palettes: Record<
    string,
    { bg1: string; bg2: string; suit: string; accent: string; glasses?: boolean }
  > = {
    ananya: { bg1: '#1E293B', bg2: '#0F172A', suit: '#1D4ED8', accent: '#93C5FD' },
    vikram: {
      bg1: '#1E1B4B',
      bg2: '#0F172A',
      suit: '#334155',
      accent: '#A5B4FC',
      glasses: true,
    },
    priya: { bg1: '#172554', bg2: '#0F172A', suit: '#4338CA', accent: '#7DD3FC' },
    rohan: { bg1: '#0F172A', bg2: '#1E293B', suit: '#0369A1', accent: '#BAE6FD' },
    meera: { bg1: '#1E1B4B', bg2: '#111827', suit: '#4F46E5', accent: '#C4B5FD' },
    arjun: {
      bg1: '#0F172A',
      bg2: '#1E293B',
      suit: '#1E40AF',
      accent: '#60A5FA',
      glasses: true,
    },
  };

  const theme = palettes[avatarKey] || palettes.ananya;
  const initials = name
    .replace(/^Dr\.\s+/i, '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <div
      className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 select-none"
      aria-label={`Portrait illustration of ${name}`}
    >
      <svg
        viewBox="0 0 80 80"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`grad-${avatarKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.bg1} />
            <stop offset="100%" stopColor={theme.bg2} />
          </linearGradient>
        </defs>
        <rect width="80" height="80" fill={`url(#grad-${avatarKey})`} />
        <circle cx="66" cy="14" r="24" fill={theme.accent} fillOpacity="0.12" />
        {/* Stylized architectural portrait silhouette */}
        <path
          d="M16 80 C16 60, 64 60, 64 80 Z"
          fill={theme.suit}
        />
        <path
          d="M33 62 L40 74 L47 62 Z"
          fill="#F8FAFC"
          fillOpacity="0.85"
        />
        <circle cx="40" cy="34" r="14" fill="#E2E8F0" />
        {theme.glasses && (
          <g stroke="#1E293B" strokeWidth="1.6" fill="none">
            <rect x="31" y="31" width="7" height="5" rx="1" />
            <rect x="42" y="31" width="7" height="5" rx="1" />
            <line x1="38" y1="33" x2="42" y2="33" />
          </g>
        )}
        <text
          x="10"
          y="20"
          fill={theme.accent}
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="600"
        >
          {initials}
        </text>
      </svg>
    </div>
  );
};
