'use client';

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export function ExplainabilityHint() {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4"
      style={{
        background:   TOKENS.taupe,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
        borderLeft:   `3px solid ${TOKENS.accent}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:   '12px',
          color:      TOKENS.inkSecondary,
          lineHeight: 1.5,
        }}>
          Ogni numero è tracciabile: 14-stage pipeline · formula IU verificabile · metodo versionato.
          <Link
            href="/company/kora-index"
            style={{ color: TOKENS.accent, fontWeight: 600, marginLeft: 8, textDecoration: 'none' }}
          >
            Scomposizione analitica KORA Index →
          </Link>
        </p>
      </div>
    </div>
  );
}
