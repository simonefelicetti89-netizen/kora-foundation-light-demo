'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface BoardAction {
  priority: number;
  action:   string;
  detail:   string;
  signal?:  string;
  effort?:  string;
}

interface BoardActionsProps {
  actions: BoardAction[];
}

// BoardActions — 3 board-level recommended actions.
// Shown BEFORE the technical breakdown panels.
// Purpose: executive can understand what to decide without reading the full analysis.
export function BoardActions({ actions }: BoardActionsProps) {
  if (!actions.length) return null;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:      '1.375rem',
          color:         TOKENS.ink,
          letterSpacing: '-0.01em',
          lineHeight:    1.2,
          marginBottom:  4,
        }}>
          Azioni raccomandate al board
        </p>
        <p style={{
          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:   '11px',
          color:      TOKENS.inkHint,
        }}>
          Segnali direzionali — correlazione ≠ causalità
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actions.slice(0, 3).map((a, i) => (
          <div
            key={i}
            style={{
              background:   i === 0 ? TOKENS.ink : TOKENS.surface,
              border:       i === 0 ? `1px solid rgba(255,255,255,0.08)` : TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              padding:      '18px 22px',
              display:      'flex',
              gap:          16,
              alignItems:   'flex-start',
              boxShadow:    TOKENS.cardShadow,
            }}
          >
            {/* Priority number */}
            <div style={{
              width:        28,
              height:       28,
              borderRadius: '50%',
              background:   i === 0 ? TOKENS.accent : TOKENS.inkBorder,
              color:        i === 0 ? '#FFF' : TOKENS.inkHint,
              fontSize:     '11px',
              fontWeight:   700,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              flexShrink:   0,
              marginTop:    2,
            }}>
              {a.priority}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Action */}
              <p style={{
                fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontWeight:  700,
                fontSize:    '13.5px',
                color:       i === 0 ? '#FFFFFF' : TOKENS.ink,
                lineHeight:  1.3,
                letterSpacing: '-0.005em',
                marginBottom: 6,
              }}>
                {a.action}
              </p>

              {/* Detail */}
              <p style={{
                fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:   '11.5px',
                color:      i === 0 ? 'rgba(255,255,255,0.60)' : TOKENS.inkSecondary,
                lineHeight: 1.5,
              }}>
                {a.detail}
              </p>

              {/* Signal + effort */}
              {(a.signal || a.effort) && (
                <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                  {a.signal && (
                    <span style={{
                      fontFamily:  'Plus Jakarta Sans, var(--font-jakarta)',
                      fontSize:    '10px',
                      color:       i === 0 ? TOKENS.accent : TOKENS.success,
                      fontWeight:  600,
                    }}>
                      ↑ {a.signal}
                    </span>
                  )}
                  {a.effort && (
                    <span style={{
                      fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)',
                      fontSize:   '10px',
                      color:      i === 0 ? 'rgba(255,255,255,0.35)' : TOKENS.inkHint,
                    }}>
                      Effort: {a.effort}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
