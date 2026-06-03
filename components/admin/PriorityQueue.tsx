'use client';

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export interface PriorityItem {
  id:       string;
  urgency:  'alta' | 'media' | 'bassa';
  type:     string;
  title:    string;
  detail:   string;
  href?:    string;
  action?:  string;
}

interface PriorityQueueProps {
  items: PriorityItem[];
}

const URGENCY_CONFIG = {
  alta:  { dot: TOKENS.critical, label: 'Alta', bg: 'rgba(158,59,47,0.06)', border: 'rgba(158,59,47,0.18)' },
  media: { dot: TOKENS.warning,  label: 'Media', bg: 'rgba(217,154,43,0.06)', border: 'rgba(217,154,43,0.18)' },
  bassa: { dot: TOKENS.inkHint,  label: 'Bassa', bg: TOKENS.inkBorder, border: TOKENS.inkBorder },
};

// PriorityQueue — shows what KORA operator must review TODAY.
// Items derived from live preview services — pure frontend computation.
export function PriorityQueue({ items }: PriorityQueueProps) {
  if (!items.length) {
    return (
      <div style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
        padding:      '24px',
        display:      'flex',
        alignItems:   'center',
        gap:          16,
        boxShadow:    TOKENS.cardShadow,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: TOKENS.success, flexShrink: 0 }} />
        <div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 600, fontSize: '13px', color: TOKENS.ink }}>
            Nessuna azione urgente
          </p>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '11.5px', color: TOKENS.inkSecondary, marginTop: 3 }}>
            Tutte le company pipeline sono aggiornate. Nessuna submission in attesa di revisione.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => {
        const urg = URGENCY_CONFIG[item.urgency];
        const content = (
          <div
            style={{
              background:   urg.bg,
              border:       `1px solid ${urg.border}`,
              borderRadius: TOKENS.cardRadius,
              padding:      '16px 20px',
              display:      'flex',
              alignItems:   'flex-start',
              gap:          14,
              transition:   'box-shadow 150ms ease',
              cursor:       item.href ? 'pointer' : 'default',
            }}
          >
            {/* Urgency dot */}
            <div style={{ paddingTop: 4, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: urg.dot }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                  fontSize:      '9px',
                  fontWeight:    700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color:         urg.dot,
                }}>
                  {urg.label}
                </span>
                <span style={{ fontSize: '9px', color: TOKENS.inkHint }}>·</span>
                <span style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9px', color: TOKENS.inkHint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {item.type}
                </span>
              </div>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 700, fontSize: '13px', color: TOKENS.ink, lineHeight: 1.3, marginBottom: 4 }}>
                {item.title}
              </p>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.45 }}>
                {item.detail}
              </p>
            </div>

            {item.href && (
              <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.accent }}>
                  {item.action ?? 'Rivedi'} →
                </span>
              </div>
            )}
          </div>
        );

        return item.href ? (
          <Link key={item.id} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
            {content}
          </Link>
        ) : (
          <div key={item.id}>{content}</div>
        );
      })}
    </div>
  );
}
