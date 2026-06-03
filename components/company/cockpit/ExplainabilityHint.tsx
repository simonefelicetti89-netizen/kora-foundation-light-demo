'use client';

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export function ExplainabilityHint() {
  return (
    <div
      className="flex items-center gap-3 px-5 py-3.5"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
      }}
    >
      {/* Violet pointer dot */}
      <span
        className="flex-shrink-0 w-2 h-2 rounded-full"
        style={{ background: TOKENS.accent }}
      />

      <p style={{ fontSize: '12px', color: 'rgba(6,3,43,0.60)', lineHeight: 1.5 }}>
        Clicca un numero per la derivazione completa —&nbsp;
        <Link
          href="/company/kora-index"
          className="transition-opacity hover:opacity-75"
          style={{ color: TOKENS.accent, fontWeight: 500 }}
        >
          scomposizione analitica KORA Index →
        </Link>
      </p>
    </div>
  );
}
