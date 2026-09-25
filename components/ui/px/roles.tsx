'use client';

// KORA-WP-140 — the nine canonical surface roles, one component each.
//
// A ROLE IS NOT A CARD. The defect this replaces is card monoculture: every
// piece of information wrapped in the same rounded rectangle, so a board-level
// judgment, a legal disclaimer and a privacy boundary all read at the same
// weight. Here the role is declared, and the surface treatment follows from it.
//
// WHAT THESE COMPONENTS OWN: elevation, border, background, density, structural
// variant, and the assistive-technology semantics that make one role
// distinguishable from another without sight.
//
// WHAT THEY DO NOT OWN: the typography of caller content (KORA-WP-139), page
// composition and archetypes (141), data encoding (142). Content is passed as
// children and keeps its own text styling, so the KORA-WP-139 migration lands
// as a separate, clean diff.
//
// NO ROLE ACCEPTS A `tone`, `variant` OR `color` PROP. Where a treatment must
// vary, the caller states a semantic Assessment and the treatment is derived —
// so a danger treatment on a healthy value has no entry point.

import type { CSSProperties, ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';
import {
  assessmentTreatment,
  ROLE_CONTRACT,
  type Assessment,
} from '@/lib/design/surface-state-grammar';
import { Suppressed } from './states';
import type { PrivacySuppressReason } from '@/lib/types';

const L1: CSSProperties = {
  background: PX.l1, border: `1px solid ${PX.line}`, borderRadius: PX.rPanel, boxShadow: PX.sh1,
};

function Eyebrow({ children, color = PX.ink3 }: { children: ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase',
      color, overflowWrap: 'anywhere',
    }}>
      {children}
    </span>
  );
}

// ── 1. Hero Judgment ─────────────────────────────────────────────────────────
// The single conclusion the surface is answerable for. Elevated above every
// other role, and at most one per surface — a second hero means two jobs.

export function HeroJudgment({
  eyebrow, verdict, children, actions,
}: {
  eyebrow: string;
  /** The conclusion itself. Not a page title. */
  verdict: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      data-px-role="HERO_JUDGMENT"
      style={{
        ...L1, boxShadow: PX.sh2, borderLeft: `3px solid ${PX.violet}`,
        padding: '20px 22px', minWidth: 0, fontFamily: PX.sans, display: 'grid', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        {actions && <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>{actions}</div>}
      </div>
      <div style={{ minWidth: 0 }}>{verdict}</div>
      {children}
    </section>
  );
}

// ── 2. Primary Metric ────────────────────────────────────────────────────────
// The headline quantity a decision turns on.

export function PrimaryMetric({
  label, children, footnote,
}: {
  label: string;
  children: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div
      data-px-role="PRIMARY_METRIC"
      style={{
        minWidth: 0, fontFamily: PX.sans, padding: '16px 18px',
        background: PX.l1, border: `1px solid ${PX.line2}`, borderRadius: PX.rInner,
        boxShadow: PX.sh1, display: 'grid', gap: 6,
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <div style={{ minWidth: 0, fontVariantNumeric: 'tabular-nums' }}>{children}</div>
      {footnote && <div style={{ minWidth: 0, color: PX.ink3 }}>{footnote}</div>}
    </div>
  );
}

// ── 3. Supporting Metric ─────────────────────────────────────────────────────
// Qualifies the primary. Inset and unelevated so it cannot compete with it.

export function SupportingMetric({
  label, children, footnote,
}: {
  label: string;
  children: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div
      data-px-role="SUPPORTING_METRIC"
      style={{
        minWidth: 0, fontFamily: PX.sans, padding: '14px 16px',
        background: PX.l2, border: `1px solid ${PX.l2Edge}`, borderRadius: PX.rInner,
        display: 'grid', gap: 6,
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <div style={{ minWidth: 0, fontVariantNumeric: 'tabular-nums' }}>{children}</div>
      {footnote && <div style={{ minWidth: 0, color: PX.ink3 }}>{footnote}</div>}
    </div>
  );
}

// ── 4. Evidence Panel ────────────────────────────────────────────────────────
// Provenance and reasoning. It explains; it never instructs.

export function EvidencePanel({
  label, children, provenance,
}: {
  /** Omit when the content already carries its own visible heading — one
   *  heading per conceptual block. The role stays identifiable structurally. */
  label?: string;
  children: ReactNode;
  provenance?: ReactNode;
}) {
  return (
    <section data-px-role="EVIDENCE_PANEL" style={{ ...L1, minWidth: 0, fontFamily: PX.sans }}>
      {label && (
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${PX.line}` }}>
          <Eyebrow>{label}</Eyebrow>
        </div>
      )}
      <div style={{ padding: '16px 18px', minWidth: 0 }}>{children}</div>
      {provenance && (
        <div style={{ padding: '10px 18px', borderTop: `1px solid ${PX.line}`, background: PX.l2, color: PX.ink3, minWidth: 0 }}>
          {provenance}
        </div>
      )}
    </section>
  );
}

// ── 5. Warning / Safeguard ───────────────────────────────────────────────────
// Takes an Assessment, never a tone. A healthy assessment cannot be dressed as
// a danger, because there is no parameter with which to ask for one. `watch`
// and `risk` require a stated reason, so nothing is marked dangerous casually.

export function WarningSafeguard({
  label, assessment, children,
}: {
  label: string;
  assessment: Assessment;
  children?: ReactNode;
}) {
  const t = assessmentTreatment(assessment);
  const reason = assessment.kind === 'watch' || assessment.kind === 'risk' ? assessment.reason : undefined;
  return (
    <section
      data-px-role="WARNING_SAFEGUARD"
      data-px-assessment={assessment.kind}
      role={assessment.kind === 'risk' ? 'alert' : 'status'}
      style={{
        minWidth: 0, fontFamily: PX.sans, display: 'grid', gap: 8,
        padding: '16px 18px', borderRadius: PX.rPanel,
        background: t.tint, border: `1px solid ${t.edge}`, borderLeft: `3px solid ${t.fill}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Eyebrow color={t.text}>{label}</Eyebrow>
        <span style={{
          marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: t.text,
          overflowWrap: 'anywhere', minWidth: 0,
        }}>
          {assessment.label}
        </span>
      </div>
      {reason && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: t.text, maxWidth: '72ch' }}>{reason}</p>
      )}
      {children}
    </section>
  );
}

// ── 6. Action ────────────────────────────────────────────────────────────────
// Real, available next steps. A future capability is not an Action; it is a
// NOT YET AVAILABLE state, and must be rendered as one.

export function ActionGroup({
  label, children, note,
}: {
  label?: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div
      data-px-role="ACTION"
      style={{
        minWidth: 0, fontFamily: PX.sans, display: 'grid', gap: 10,
        padding: '14px 18px', background: PX.l1, border: `1px solid ${PX.line}`,
        borderRadius: PX.rPanel, boxShadow: PX.sh1,
      }}
    >
      {label && <Eyebrow>{label}</Eyebrow>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>{children}</div>
      {note && <div style={{ color: PX.ink3, minWidth: 0 }}>{note}</div>}
    </div>
  );
}

// ── 7. Disclosure ────────────────────────────────────────────────────────────
// Methodology, calibration, limitation, legal. Deliberately quiet: a permanent
// boundary is not an alarm and must not borrow alarm treatment. This is the
// role that keeps mandatory KORA labels legible without making them shout.

export function Disclosure({
  label, children,
}: {
  /** Omit when the content already carries its own visible heading. */
  label?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-px-role="DISCLOSURE"
      style={{
        minWidth: 0, fontFamily: PX.sans, display: 'grid', gap: 8,
        padding: '14px 18px', background: PX.inkWash,
        border: `1px solid ${PX.line}`, borderRadius: PX.rInner,
      }}
    >
      {label && <Eyebrow>{label}</Eyebrow>}
      <div style={{ minWidth: 0, color: PX.ink3 }}>{children}</div>
    </section>
  );
}

// ── 8. Suppressed / Boundary ─────────────────────────────────────────────────
// The role wrapper over the reference implementation. Never an alert, never
// silent. It renders the existing Privacy Boundary unchanged.

export function BoundarySurface({
  reason, groupSize, dataType,
}: {
  reason: PrivacySuppressReason;
  groupSize?: number;
  dataType?: string;
}) {
  return (
    <div data-px-role="SUPPRESSED_BOUNDARY" style={{ minWidth: 0 }}>
      <Suppressed reason={reason} groupSize={groupSize} dataType={dataType} />
    </div>
  );
}

// ── 9. Operational Row ───────────────────────────────────────────────────────
// A record in a working list. Rows, not cards: two adjacent records of the same
// kind belong in one list.

export function OperationalRow({
  children, lead, trailing,
}: {
  children: ReactNode;
  lead?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      data-px-role="OPERATIONAL_ROW"
      style={{
        minWidth: 0, fontFamily: PX.sans, display: 'flex', alignItems: 'center',
        gap: 12, flexWrap: 'wrap', padding: '11px 16px',
        borderBottom: `1px solid ${PX.line}`, background: PX.l1,
      }}
    >
      {lead && <span style={{ flex: 'none' }}>{lead}</span>}
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>{children}</div>
      {trailing && <div style={{ flex: 'none', display: 'flex', gap: 8, alignItems: 'center' }}>{trailing}</div>}
    </div>
  );
}

/** Re-exported so a consumer can read a role's documented use and non-use. */
export { ROLE_CONTRACT };
