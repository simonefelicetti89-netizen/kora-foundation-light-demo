'use client';

// KORA-WP-129 Wave 4b (W3A) — shared pieces for the Worker ENTRY surfaces:
// /worker/setup-password and /worker/onboarding.
//
// SCOPED DELIBERATELY. These two surfaces are the only account-establishment
// surfaces in the Worker environment and they share a form grammar nothing
// else needs. Migrating a Product-wide form primitive instead would touch
// already Founder-accepted W1/W2 surfaces, which this package is not
// authorised to do — so the scope is the folder, not the Product.
//
// Both surfaces render INSIDE the root layout's document and the Worker shell
// (neither route is in AppShell's PUBLIC_ROUTE_PREFIXES). They therefore
// compose as ordinary Product surfaces. Before W3A they painted their own
// full-viewport frames inside the shell's canvas, which produced two competing
// page frames and, on setup-password, a second KORA logo beside the sidebar's.

import type { CSSProperties, ReactNode } from 'react';
import { SPACE, PX, typeStyle } from '@/lib/design/kora-design-tokens';
import { Caption, Label, Secondary } from '@/components/ui/px';

/** The reading measure for an entry surface: one column, never the full canvas. */
export const ENTRY_MEASURE = 560;

/** A labelled control with its helper text and error wired for screen readers. */
export function Field({
  id, label, hint, error, children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: boolean;
  children: (a: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div style={{ display: 'grid', gap: SPACE.sm }}>
      {/* Native <label htmlFor> pairing kept: KORA-WP-073 audited this surface
          as already compliant, and the canonical role rides inside it. */}
      <label htmlFor={id}><Label style={{ color: PX.ink2 }}>{label}</Label></label>
      {children({ id, describedBy: hintId, invalid: !!error })}
      {hint && <Caption id={hintId} style={{ margin: 0, color: PX.ink3 }}>{hint}</Caption>}
    </div>
  );
}

/** Input styling shared by both entry surfaces. Not a new design system — the
 *  same PX surface, border, radius and control height every other Product
 *  control already uses. */
export function entryInputStyle(invalid = false): CSSProperties {
  return {
    ...typeStyle('body'),
    lineHeight: 1.4,
    color: PX.ink,
    background: PX.l1,
    border: `1px solid ${invalid ? PX.risk : PX.line2}`,
    borderRadius: PX.rCtl,
    padding: '11px 14px',
    width: '100%',
    minHeight: 44,
    outline: 'none',
    display: 'block',
    transition: `border-color ${PX.t2} ${PX.ease}`,
  };
}

export function PrimaryAction({
  children, onClick, type = 'button', disabled, busy, full,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  busy?: boolean;
  full?: boolean;
}) {
  const off = disabled || busy;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={off}
      style={{
        ...typeStyle('secondary', { weight: 700 }),
        background: off ? PX.inkMute : PX.ink,
        color: '#fff', border: 'none', borderRadius: PX.rCtl,
        padding: '12px 24px', minHeight: 44,
        width: full ? '100%' : undefined,
        cursor: off ? 'not-allowed' : 'pointer',
        transition: `background ${PX.t2} ${PX.ease}`,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...typeStyle('secondary', { weight: 600 }),
        background: 'transparent', border: `1px solid ${PX.line2}`,
        borderRadius: PX.rCtl, padding: '12px 20px', minHeight: 44,
        color: PX.ink2, cursor: 'pointer',
        transition: `border-color ${PX.t2} ${PX.ease}`,
      }}
    >
      {children}
    </button>
  );
}

/** A requirement the reader can check against what they have typed. State is
 *  carried by a word and a mark, never by colour alone. */
export function Requirement({ met, children }: { met: boolean | null; children: ReactNode }) {
  const mark = met === null ? '·' : met ? '✓' : '·';
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, listStyle: 'none', margin: 0 }}>
      <span
        aria-hidden="true"
        style={{
          flex: 'none', width: 18, textAlign: 'center',
          color: met ? PX.ok : PX.inkMute, fontWeight: 700, lineHeight: 1.5,
        }}
      >
        {mark}
      </span>
      <Secondary as="span" style={{ color: met ? PX.ink2 : PX.ink3 }}>
        {children}
        <span className="sr-only">{met === true ? ' — soddisfatto' : ' — non ancora soddisfatto'}</span>
      </Secondary>
    </li>
  );
}
