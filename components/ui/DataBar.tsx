'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface DataBarProps {
  value:    number;   // 0–100
  color?:   string;   // defaults to TOKENS.accent
  height?:  number;   // px, defaults to 7
  label?:   string;   // left label
  suffix?:  string;   // right value label (e.g. "30" or "30%")
  animate?: boolean;  // true: use CSS transition (no JS observer needed)
}

// DataBar — token-driven horizontal bar for macroblock/pillar scores.
// Pair with useReveal: set data-w attribute and let useReveal trigger width.
export function DataBar({
  value,
  color   = TOKENS.accent,
  height  = 7,
  label,
  suffix,
  animate = true,
}: DataBarProps) {
  const pct = `${Math.min(Math.max(Math.round(value), 0), 100)}%`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {(label || suffix) && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          {label && (
            <p style={{
              fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:    '13px',
              fontWeight:  600,
              color:       TOKENS.ink,
              flex:        1,
              minWidth:    0,
              overflow:    'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:  'nowrap',
            }}>
              {label}
            </p>
          )}
          {suffix && (
            <span style={{
              fontFamily:         'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:         700,
              fontSize:           '15px',
              color:              TOKENS.ink,
              letterSpacing:      '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              flexShrink:         0,
            }}>
              {suffix}
            </span>
          )}
        </div>
      )}
      <div style={{
        height:       height,
        borderRadius: 999,
        background:   TOKENS.inkBorder,
        overflow:     'hidden',
      }}>
        <div
          className="blk-fill"
          data-w={String(Math.round(value))}
          style={{
            height:       '100%',
            borderRadius: 999,
            background:   color,
            width:        animate ? pct : 0,
            transition:   animate ? 'width 1.3s cubic-bezier(0.16,1,0.3,1)' : undefined,
          }}
        />
      </div>
    </div>
  );
}
