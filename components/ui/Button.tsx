'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { TOKENS, BUTTON_TOKENS } from '@/lib/design/kora-design-tokens';

type Variant = 'primary' | 'ghost' | 'ink' | 'digital';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  children:  ReactNode;
  fullWidth?: boolean;
}

const SIZES: Record<Size, { padding: string; fontSize: string; minHeight: string }> = {
  sm: { padding: '7px 14px',  fontSize: '12px', minHeight: '36px' },
  md: { padding: '10px 20px', fontSize: '13px', minHeight: '44px' },
  lg: { padding: '13px 28px', fontSize: '14px', minHeight: '48px' },
};

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: {
    background:  BUTTON_TOKENS.primary.background,
    color:       BUTTON_TOKENS.primary.color,
    border:      'none',
    boxShadow:   BUTTON_TOKENS.primary.shadow,
  },
  ghost: {
    background:  BUTTON_TOKENS.secondary.background,
    color:       BUTTON_TOKENS.secondary.color,
    border:      BUTTON_TOKENS.secondary.border,
    boxShadow:   'none',
  },
  ink: {
    background:  TOKENS.ink,
    color:       '#FFFFFF',
    border:      'none',
    boxShadow:   '0 4px 14px rgba(6,3,43,0.20)',
  },
  digital: {
    background:  BUTTON_TOKENS.digital.background,
    color:       BUTTON_TOKENS.digital.color,
    border:      'none',
    boxShadow:   'none',
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
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    700,
        letterSpacing: '-0.005em',
        borderRadius:  BUTTON_TOKENS.primary.radius,
        cursor:        disabled ? 'not-allowed' : 'pointer',
        transition:    'transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease',
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
          el.style.transform  = 'translateY(-2px)';
          el.style.boxShadow  = '0 8px 22px rgba(199,111,61,0.35)';
        } else if (variant === 'ghost') {
          el.style.background = TOKENS.accentHover;
          el.style.borderColor = TOKENS.accent;
        } else if (variant === 'ink') {
          el.style.transform  = 'translateY(-1px)';
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
