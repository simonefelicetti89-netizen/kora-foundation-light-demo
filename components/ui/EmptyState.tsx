'use client';

import type { ReactNode } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface EmptyStateProps {
  title:    string;   // scopo: perché questo stato esiste
  body?:    string;   // contesto aggiuntivo
  action?:  ReactNode; // next step (Button o link)
  icon?:    ReactNode; // illustrazione opzionale (SVG o emoji)
  variant?: 'default' | 'warning' | 'access-denied';
}

// EmptyState — stato vuoto con scopo dichiarato e next step.
// Risponde a: perché sono qui? cosa devo fare?
export function EmptyState({ title, body, action, icon, variant = 'default' }: EmptyStateProps) {
  const bg     = variant === 'warning'       ? TOKENS.safeguard.watch.bg
               : variant === 'access-denied' ? TOKENS.safeguard.cap.bg
               : TOKENS.taupe;
  const border = variant === 'warning'       ? `1px solid ${TOKENS.safeguard.watch.dot}40`
               : variant === 'access-denied' ? `1px solid ${TOKENS.safeguard.cap.dot}40`
               : TOKENS.cardBorder;

  return (
    <div
      // KORA-WP-129 Wave 4b (T2) — READINESS marker. Deliberately NOT a state
      // classification.
      //
      // KORA-WP-126's capture protocol must know a surface has RESOLVED before
      // it records evidence; a loading surface must never satisfy that. This
      // component is pre-KORA-WP-140 and emits nothing a capture can wait on,
      // so surfaces resolving through it (via NoDataState) could not be
      // evidenced at all.
      //
      // Why not `data-px-state`: that attribute is KORA-WP-140's grammar and
      // names one of seven kinds. EmptyState does not implement that grammar,
      // so reusing it would either claim a semantic this component lacks or
      // invent an eighth kind. This is an orthogonal readiness flag — no second
      // state system, and no semantic change here.
      //
      // Loading stays distinguishable: KORA-WP-140's own `Loading` renders
      // through StateFrame with `data-px-state="LOADING"` and never sets this.
      data-px-resolved="true"
      role={variant === 'access-denied' ? 'alert' : undefined}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
        gap:            16,
        minHeight:      320,
        borderRadius:   TOKENS.cardRadius,
        background:     bg,
        border:         border,
        padding:        '40px 32px',
      }}
    >
      {icon && (
        <div aria-hidden="true" style={{ fontSize: 36, opacity: 0.5 }}>{icon}</div>
      )}
      <p style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    700,
        fontSize:      '15px',
        color:         variant === 'warning' ? TOKENS.safeguard.watch.text
                     : variant === 'access-denied' ? TOKENS.safeguard.cap.text
                     : TOKENS.ink,
        letterSpacing: '-0.005em',
        lineHeight:    1.3,
        maxWidth:      360,
      }}>
        {title}
      </p>
      {body && (
        <p style={{
          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:   '13px',
          color:      TOKENS.inkSecondary,
          lineHeight: 1.6,
          maxWidth:   400,
        }}>
          {body}
        </p>
      )}
      {action && (
        <div style={{ marginTop: 8 }}>
          {action}
        </div>
      )}
    </div>
  );
}
