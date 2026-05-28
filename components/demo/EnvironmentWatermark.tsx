'use client';

import { useEnvironment } from '@/lib/demo-state';
import type { Environment } from '@/lib/types';

const WATERMARK_TEXT: Partial<Record<Environment, string>> = {
  demo:   'DEMO · DATI SIMULATI',
  future: 'ROADMAP · NON ATTIVO',
  // live: no watermark — real environment, no simulation label needed
};

export function EnvironmentWatermark() {
  const { activeEnvironment } = useEnvironment();
  const text = WATERMARK_TEXT[activeEnvironment];

  if (!text) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-6 right-6 z-10 select-none"
    >
      <p
        className="font-mono text-sm font-bold uppercase tracking-[0.25em] origin-bottom-right"
        style={{
          color:     'var(--env-accent)',
          opacity:   0.18,
          transform: 'rotate(-18deg)',
        }}
      >
        {text}
      </p>
    </div>
  );
}
