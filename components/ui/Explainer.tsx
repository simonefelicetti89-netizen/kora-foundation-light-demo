'use client';

import { useState } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface ExplainerProps {
  what:     string;   // "cosa misura" — definizione operativa
  how:      string;   // "come si legge" — interpretazione
  source?:  string;   // "da dove viene" — fonte dati, opzionale
  compact?: boolean;  // solo icona info con tooltip, nessuna label espansa
}

// Explainer — primitivo firma KORA.
// Ogni metrica non autoesplicativa DEVE avere un Explainer.
// Struttura: "cosa misura · come si legge" + opzionale "da dove viene".
// In compact mode: icona ⓘ con tooltip al hover.
export function Explainer({ what, how, source, compact = false }: ExplainerProps) {
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <button
          type="button"
          aria-label="Informazioni su questa metrica"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          16,
            height:         16,
            borderRadius:   '50%',
            background:     TOKENS.inkBorder,
            border:         'none',
            cursor:         'pointer',
            color:          TOKENS.inkHint,
            fontSize:       10,
            fontFamily:     'ui-monospace, monospace',
            fontWeight:     700,
            padding:        0,
            flexShrink:     0,
            minWidth:       16,
          }}
        >
          i
        </button>
        {open && (
          <div
            role="tooltip"
            style={{
              position:    'absolute',
              bottom:      'calc(100% + 8px)',
              left:        '50%',
              transform:   'translateX(-50%)',
              zIndex:      300,
              background:  TOKENS.ink,
              color:       '#FFFFFF',
              border:      `1px solid ${TOKENS.accentSoft}`,
              borderRadius: 10,
              padding:     '10px 14px',
              minWidth:    220,
              maxWidth:    320,
              boxShadow:   '0 12px 32px rgba(6,3,43,0.22)',
              whiteSpace:  'normal',
              fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            }}
          >
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.accent, marginBottom: 5 }}>
              cosa misura
            </p>
            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: 8 }}>{what}</p>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.accent, marginBottom: 5 }}>
              come si legge
            </p>
            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{how}</p>
            {source && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '8px 0' }} />
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{source}</p>
              </>
            )}
          </div>
        )}
      </span>
    );
  }

  return (
    <div style={{
      background:   `${TOKENS.accent}06`,
      border:       `1px solid ${TOKENS.accentSoft}`,
      borderLeft:   `3px solid ${TOKENS.accent}`,
      borderRadius: '0 10px 10px 0',
      padding:      '10px 14px',
      display:      'flex',
      flexDirection: 'column',
      gap:          6,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.accent, flexShrink: 0, paddingTop: 1 }}>
          cosa misura
        </span>
        <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
          {what}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.accent, flexShrink: 0, paddingTop: 1 }}>
          come si legge
        </span>
        <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
          {how}
        </p>
      </div>
      {source && (
        <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10.5px', color: TOKENS.inkMeta, lineHeight: 1.5, paddingTop: 2, borderTop: `1px solid ${TOKENS.inkBorder}`, marginTop: 2 }}>
          {source}
        </p>
      )}
    </div>
  );
}
