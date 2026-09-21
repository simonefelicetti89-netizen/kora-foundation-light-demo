'use client';

import { useId } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { PX, TOKENS } from '@/lib/design/kora-design-tokens';

// KORA-WP-125 — HANDOFF §11: bordered, elevated inputs on L1, 36px, radius 8.
// The control is the shared one, so adapting it here is what makes every form
// in the Product converge rather than each page restyling its own inputs.
const BASE_INPUT: React.CSSProperties = {
  fontFamily:    PX.sans,
  fontSize:      13,
  color:         PX.ink,
  background:    PX.l1,
  border:        `1px solid ${PX.line2}`,
  borderRadius:  PX.rCtl,
  boxShadow:     PX.sh1,
  padding:       '8px 12px',
  minHeight:     36,
  width:         '100%',
  outline:       'none',
  transition:    `border-color ${PX.t1} ${PX.ease}, box-shadow ${PX.t1} ${PX.ease}`,
  lineHeight:    1.4,
};

// Label component
function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontFamily:    PX.sans,
        fontSize:      12.5,
        fontWeight:    700,
        color:         PX.ink2,
        display:       'block',
        marginBottom:  7,
      }}
    >
      {children}{required && <span style={{ color: PX.risk, marginLeft: 3 }}>*</span>}
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
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const dark: React.CSSProperties = darkBg ? {
    color:      TOKENS.canvas,
    background: 'rgba(247,245,239,0.05)',
    border:     '1px solid rgba(247,245,239,0.12)',
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <FieldLabel htmlFor={inputId} required={required}>{label}</FieldLabel>}
      <input
        id={inputId}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        style={{
          ...BASE_INPUT,
          ...dark,
          borderColor: error ? TOKENS.critical : undefined,
        }}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: 11.5, color: TOKENS.critical, marginTop: 3 }}>
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
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const dark: React.CSSProperties = darkBg ? {
    color:      TOKENS.canvas,
    background: 'rgba(247,245,239,0.05)',
    border:     '1px solid rgba(247,245,239,0.12)',
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <FieldLabel htmlFor={inputId} required={required}>{label}</FieldLabel>}
      <select
        id={inputId}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        style={{ ...BASE_INPUT, ...dark, appearance: 'auto' }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: 11.5, color: TOKENS.critical, marginTop: 3 }}>
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
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const dark: React.CSSProperties = darkBg ? {
    color:      TOKENS.canvas,
    background: 'rgba(247,245,239,0.05)',
    border:     '1px solid rgba(247,245,239,0.12)',
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <FieldLabel htmlFor={inputId} required={required}>{label}</FieldLabel>}
      <textarea
        id={inputId}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
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
        <p id={errorId} role="alert" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: 11.5, color: TOKENS.critical, marginTop: 3 }}>
          {error}
        </p>
      )}
    </div>
  );
}
