'use client';

// KORA-WP-125 — Italian-first date control.
//
// THE DEFECT THIS EXISTS FOR (KORA-WP-039 D5): a bare <input type="date">
// renders its visible text in the BROWSER's locale, so an Italian-first
// Product showed "03/31/2024" next to its own "31 mar 2024". The two halves of
// one panel disagreed about what day it was.
//
// HOW THIS SOLVES IT WITHOUT A CUSTOM CALENDAR: the native control is kept —
// it stays keyboard-usable, screen-reader-correct and gives every platform its
// own accessible picker — but it is rendered transparent and overlaid with the
// Italian rendering of the same value. The user still types and picks natively;
// what they READ is always Italian.
//
// STORAGE IS UNTOUCHED: value and onChange remain ISO `yyyy-mm-dd`, exactly as
// a raw input would emit. This control changes presentation, never semantics.

import { useId } from 'react';
import { CalendarDays } from 'lucide-react';
import { PX } from '@/lib/design/kora-design-tokens';

export interface DateFieldProps {
  /** ISO `yyyy-mm-dd`, or '' for empty. Unchanged from the native contract. */
  value: string;
  onChange: (isoValue: string) => void;
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
}

/** ISO `yyyy-mm-dd` → `31 mar 2024`. Empty string for an unset or invalid value. */
export function formatIsoDateItalian(iso: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const [y, mo, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(y, mo - 1, day);
  // Round-trip guard: Date silently rolls 2024-13-45 over into 2025. A date
  // the calendar does not contain must render as empty, never as another day.
  if (Number.isNaN(d.getTime()) || d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return '';
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function DateField({
  value, onChange, label, hint, error, id, min, max, disabled = false, required = false,
}: DateFieldProps) {
  const auto = useId();
  const inputId = id ?? `px-date-${auto}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errId = error ? `${inputId}-err` : undefined;
  const shown = formatIsoDateItalian(value);

  return (
    <div style={{ display: 'grid', gap: 7, minWidth: 0, fontFamily: PX.sans }}>
      <label htmlFor={inputId} style={{ fontSize: '13px', fontWeight: 700, color: PX.ink2 }}>
        {label}{required ? ' *' : ''}
      </label>

      <div style={{ position: 'relative', minWidth: 0 }}>
        <input
          id={inputId}
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errId, hintId].filter(Boolean).join(' ') || undefined}
          onChange={(e) => onChange(e.target.value)}
          style={{
            height: 36, width: '100%', padding: '0 36px 0 12px',
            font: 'inherit', fontSize: '13px',
            // The native text is hidden, not removed: the control keeps its
            // role, its keyboard behaviour and its platform picker.
            color: 'transparent',
            background: disabled ? PX.l0 : PX.l1,
            border: `1px solid ${error ? PX.risk : PX.line2}`,
            borderRadius: PX.rCtl,
            boxShadow: disabled ? 'none' : PX.sh1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        {/* The Italian rendering the operator actually reads. Not focusable and
            not announced — the native input above owns both. */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', left: 13, top: 0, height: 36,
            display: 'flex', alignItems: 'center',
            fontSize: '13px', fontVariantNumeric: 'tabular-nums',
            color: disabled ? PX.inkMute : (shown ? PX.ink : PX.inkMute),
            pointerEvents: 'none',
          }}
        >
          {shown || 'gg mmm aaaa'}
        </span>
        <CalendarDays
          size={14} strokeWidth={2.2} aria-hidden="true"
          style={{ position: 'absolute', right: 11, top: 11, color: PX.ink3, pointerEvents: 'none' }}
        />
      </div>

      {hint ? <span id={hintId} style={{ fontSize: '12px', color: PX.ink3 }}>{hint}</span> : null}
      {error ? (
        <span id={errId} style={{ fontSize: '12px', fontWeight: 700, color: PX.risk }}>{error}</span>
      ) : null}
    </div>
  );
}
