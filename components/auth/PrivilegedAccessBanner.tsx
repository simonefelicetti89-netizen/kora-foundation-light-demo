'use client';

// components/auth/PrivilegedAccessBanner.tsx
// B168 Phase 5 — Banner persistente per accesso privilegiato KORA service team.
// Sticky top, non dismissibile.
//
// KORA-WP-139: Hanken Grotesk is gone — it was the last consumer of a second UI
// family. It was partly a SIGNALLING device here, so the signal was moved onto
// structure rather than dropped: the label now carries the canonical `meta`
// role (uppercase, tracked, weight 700 — the eyebrow role), and the subtext the
// `caption` role. Prominence is unchanged or stronger, and every non-typographic
// signal this banner already had is untouched: role="alert", aria-live, sticky
// placement, the pulsing dot, and the per-variant colour. Colour was never the
// only signal here and still is not.
//
// Varianti:
//   amber     → Foundation Light demo (dati sintetici)
//   navy      → Ambiente live / pilot (dati reali — azione registrata)
//   blueprint → Future Vision screens

import type { BannerVariant } from '@/lib/auth/access-matrix';

interface BannerConfig {
  label:    string;
  subtext?: string;
  bg:       string;
  border:   string;
  text:     string;
  dot:      string;
}

const BANNER: Record<BannerVariant, BannerConfig> = {
  amber: {
    label:   'DEMO ENVIRONMENT',
    subtext: 'Dati sintetici · Accesso KORA service team',
    bg:      'bg-kora-warning/10',
    border:  'border-kora-warning/40',
    text:    'text-kora-warning-text',
    dot:     'bg-kora-warning',
  },
  navy: {
    label:   'KORA SERVICE TEAM ACCESS',
    subtext: 'Ambiente live · Azione registrata in audit log',
    bg:      'bg-kora-ink',
    border:  'border-kora-info-text',
    text:    'text-white/70',
    dot:     'bg-kora-info',
  },
  blueprint: {
    label:   'FUTURE ENVIRONMENT',
    subtext: 'Vista forecast · Dati non operativi',
    bg:      'bg-kora-info/10',
    border:  'border-kora-info/30',
    text:    'text-kora-info-text',
    dot:     'bg-kora-info',
  },
};

interface Props {
  variant: BannerVariant;
}

export function PrivilegedAccessBanner({ variant }: Props) {
  const cfg = BANNER[variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`sticky top-0 z-50 w-full border-b px-4 py-2 ${cfg.bg} ${cfg.border} ${cfg.text}`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2.5">
        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${cfg.dot}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
        </span>

        <span className="kt-meta">
          {cfg.label}
        </span>

        {cfg.subtext && (
          <>
            <span className="opacity-40">·</span>
            <span className="kt-caption opacity-70">
              {cfg.subtext}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
