'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';

type Variant = 'primary' | 'ghost' | 'ink' | 'digital';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  children:  ReactNode;
  fullWidth?: boolean;
}

// KORA-WP-125: the shared Product button now speaks the Product register.
// HANDOFF §7 is explicit that an earth tone on a button is a defect, so the
// primary CTA is the Violet gradient, not terracotta. The API — variant, size,
// fullWidth — is unchanged, so every existing call site keeps working.
// md/lg preserve the WP-047 44px touch-target baseline.
const SIZES: Record<Size, { padding: string; fontSize: string; minHeight: string }> = {
  sm: { padding: '7px 13px',  fontSize: '12px', minHeight: '32px' },
  md: { padding: '10px 18px', fontSize: '13px', minHeight: '44px' },
  lg: { padding: '13px 26px', fontSize: '14px', minHeight: '48px' },
};

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: {
    background: `linear-gradient(180deg, ${PX.btnFrom}, ${PX.btnTo})`,
    color:      PX.onViolet,
    border:     'none',
    boxShadow:  PX.btnShadow,
  },
  ghost: {
    background: PX.l1,
    color:      PX.ink,
    border:     `1px solid ${PX.line2}`,
    boxShadow:  PX.sh1,
  },
  ink: {
    background: PX.ink,
    color:      PX.onViolet,
    border:     'none',
    boxShadow:  PX.inkShadow,
  },
  digital: {
    background: 'transparent',
    color:      PX.ink2,
    border:     'none',
    boxShadow:  'none',
  },
};

export function Button({
  variant = 'primary',
  size    = 'md',
  fullWidth = false,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const sz  = SIZES[size];
  const vr  = VARIANTS[variant];

  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        fontFamily:    PX.sans,
        fontWeight:    700,
        letterSpacing: '-0.005em',
        borderRadius:  PX.rCtl,
        cursor:        disabled ? 'not-allowed' : 'pointer',
        // HANDOFF §13: 90ms feedback. Motion never decorates — so no lift.
        transition:    `background ${PX.t1} ${PX.ease}, box-shadow ${PX.t1} ${PX.ease}, opacity ${PX.t1} ${PX.ease}`,
        display:       'inline-flex',
        alignItems:    'center',
        justifyContent: 'center',
        gap:           8,
        width:         fullWidth ? '100%' : undefined,
        opacity:       disabled ? 0.45 : 1,
        textDecoration: 'none',
        ...sz,
        ...vr,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        if (variant === 'primary') {
          el.style.background = `linear-gradient(180deg, ${PX.btnHoverFrom}, ${PX.btnHoverTo})`;
        } else if (variant === 'ghost') {
          el.style.background  = PX.rowHover;
          el.style.borderColor = PX.ctlHoverBorderStrong;
        } else if (variant === 'ink') {
          el.style.background = PX.inkHover;
        } else if (variant === 'digital') {
          el.style.background = PX.inkWash;
        }
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        el.style.transform  = '';
        el.style.boxShadow  = vr.boxShadow as string ?? '';
        el.style.background = vr.background as string;
        el.style.borderColor = '';
      }}
    >
      {children}
    </button>
  );
}
