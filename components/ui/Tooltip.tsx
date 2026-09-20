'use client';

import { useState, useRef, useId, isValidElement, cloneElement } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { TOKENS, BUTTON_TOKENS } from '@/lib/design/kora-design-tokens';

interface TooltipProps {
  content:  ReactNode;   // tooltip content
  children: ReactNode;   // trigger element
  side?:    'top' | 'bottom' | 'left' | 'right';
}

// Tooltip — cosmic-blue background, terracotta border, Jakarta.
// WCAG: keyboard accessible (focus), closes on blur, tooltip content
// exposed to screen readers via aria-describedby on the trigger element
// (not merely visible on hover — a sighted-only affordance otherwise).
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': tooltipId })
    : children;

  const pos: React.CSSProperties =
    side === 'top'    ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }
  : side === 'bottom' ? { top:    'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }
  : side === 'left'   ? { right:  'calc(100% + 8px)', top:  '50%', transform: 'translateY(-50%)' }
  :                     { left:   'calc(100% + 8px)', top:  '50%', transform: 'translateY(-50%)' };

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {trigger}
      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position:     'absolute',
            zIndex:       300,
            background:   TOKENS.ink,
            color:        BUTTON_TOKENS.primary.color,
            border:       `1px solid rgba(199,111,61,0.45)`,
            borderRadius: 10,
            padding:      '8px 12px',
            minWidth:     120,
            maxWidth:     280,
            boxShadow:    '0 12px 32px rgba(6,3,43,0.22)',
            fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:     12,
            lineHeight:   1.5,
            whiteSpace:   'normal',
            pointerEvents: 'none',
            ...pos,
          }}
        >
          {content}
        </div>
      )}
    </span>
  );
}
