'use client';

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const BASE_INPUT: React.CSSProperties = {
  fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
  fontSize:      14,
  color:         TOKENS.ink,
  background:    TOKENS.surface,
  border:        TOKENS.cardBorder,
  borderRadius:  10,
  padding:       '10px 13px',
  width:         '100%',
  outline:       'none',
  transition:    'border-color 200ms ease',
  lineHeight:    1.4,
};

// Label component
function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontSize:      11,
        fontWeight:    600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color:         TOKENS.inkHint,
        display:       'block',
        marginBottom:  5,
      }}
    >
      {children}{required && <span style={{ color: TOKENS.accent, marginLeft: 3 }}>*</span>}
    </label>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────

interface FieldInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string;
  error?:     string;
  required?:  boolean;
  darkBg?:    boolean;
}

export function FieldInput({ label, error, id, required, darkBg = false, ...props }: FieldInputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const dark: React.CSSProperties = darkBg ? {
    color:      '#EFEBE2',
    background: 'rgba(247,245,239,0.05)',
    border:     '1px solid rgba(247,245,239,0.12)',
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <FieldLabel htmlFor={inputId!} required={required}>{label}</FieldLabel>}
      <input
        id={inputId}
        aria-required={required}
        aria-invalid={!!error}
        style={{
          ...BASE_INPUT,
          ...dark,
          borderColor: error ? TOKENS.critical : undefined,
        }}
        {...props}
      />
      {error && (
        <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: 11.5, color: TOKENS.critical, marginTop: 3 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Select ───────────────────────────────────────────────────────────────────

interface FieldSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string;
  error?:    string;
  required?: boolean;
  darkBg?:   boolean;
  children:  ReactNode;
}

export function FieldSelect({ label, error, id, required, darkBg = false, children, ...props }: FieldSelectProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const dark: React.CSSProperties = darkBg ? {
    color:      '#EFEBE2',
    background: 'rgba(247,245,239,0.05)',
    border:     '1px solid rgba(247,245,239,0.12)',
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <FieldLabel htmlFor={inputId!} required={required}>{label}</FieldLabel>}
      <select
        id={inputId}
        aria-required={required}
        aria-invalid={!!error}
        style={{ ...BASE_INPUT, ...dark, appearance: 'auto' }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: 11.5, color: TOKENS.critical, marginTop: 3 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Textarea ─────────────────────────────────────────────────────────────────

interface FieldTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:    string;
  error?:    string;
  required?: boolean;
  darkBg?:   boolean;
}

export function FieldTextarea({ label, error, id, required, darkBg = false, ...props }: FieldTextareaProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const dark: React.CSSProperties = darkBg ? {
    color:      '#EFEBE2',
    background: 'rgba(247,245,239,0.05)',
    border:     '1px solid rgba(247,245,239,0.12)',
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <FieldLabel htmlFor={inputId!} required={required}>{label}</FieldLabel>}
      <textarea
        id={inputId}
        aria-required={required}
        aria-invalid={!!error}
        style={{
          ...BASE_INPUT,
          ...dark,
          resize:    'vertical',
          minHeight: 96,
          borderColor: error ? TOKENS.critical : undefined,
        }}
        {...props}
      />
      {error && (
        <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: 11.5, color: TOKENS.critical, marginTop: 3 }}>
          {error}
        </p>
      )}
    </div>
  );
}
