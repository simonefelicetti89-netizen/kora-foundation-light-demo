'use client';

// KORA-WP-125 — shared workspace composition. HANDOFF §5, §18.
//
// WHITESPACE IS ALLOWED. DEAD SPACE IS NOT.
//
// The canonical desktop pattern from HANDOFF §18 is a working column plus a
// contextual rail — NOT a single stack of equal-weight cards, and NOT a narrow
// editorial column floating in an empty canvas. These primitives exist so the
// five representative surfaces compose the same way instead of each inventing
// a layout, and so future page WPs inherit the composition rather than the
// card soup.
//
// Rules encoded here, so no page has to rediscover them:
//   - 12 columns, minmax(0,1fr) tracks (a bare 1fr takes a min-content floor);
//   - the rail carries actionable items first, then reference;
//   - both columns are nested single columns, so a taller rail cannot stretch
//     a working-column row and open a gap (HANDOFF §18 rule 4);
//   - below the rail breakpoint everything becomes one column, in DOM order,
//     so the working column always precedes the rail on a phone.

import type { CSSProperties, ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';

/** Page masthead: eyebrow, title, one-line purpose, and real actions. */
export function PageHead({
  eyebrow, title, lead, actions, meta,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  /** Real Product actions only — never a decorative button. */
  actions?: ReactNode;
  /** Small factual chips: status, period, provenance. */
  meta?: ReactNode;
}) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
      <div style={{ minWidth: 0, flex: '1 1 420px', display: 'grid', gap: 6 }}>
        {eyebrow && (
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3, fontFamily: PX.sans }}>
            {eyebrow}
          </p>
        )}
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.028em', color: PX.ink, fontFamily: PX.sans, lineHeight: 1.15 }}>
          {title}
        </h1>
        {lead && (
          <p style={{ margin: 0, maxWidth: '78ch', fontSize: 13, lineHeight: 1.6, color: PX.ink2, fontFamily: PX.sans }}>
            {lead}
          </p>
        )}
        {meta && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>{meta}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>{actions}</div>}
    </header>
  );
}

/** 12-column workspace. Children are placed with <Col>. */
export function Workspace({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="px-grid" style={style}>{children}</div>;
}

/** A column span. `main` (8) and `rail` (4) are the canonical §18 pair; the
 *  numeric spans exist for surfaces whose real content is wide and shallow
 *  rather than tall, where an 8+4 split would leave the lower canvas empty. */
export type ColSpan = 'main' | 'rail' | 'full' | 'half' | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export function Col({
  span, children, style,
}: {
  span: ColSpan;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <div className={`px-col px-col-${span}`} style={style}>{children}</div>;
}

/** A full-width band: the page's primary statement, not a card. Used where the
 *  most important thing on the surface deserves the whole measure rather than
 *  a column — HANDOFF §1's "a panel exists because the information is a
 *  meaningful autonomous object". */
export function Band({
  children, tone = 'plain', style,
}: {
  children: ReactNode;
  tone?: 'plain' | 'inset';
  style?: CSSProperties;
}) {
  const surface: CSSProperties = tone === 'inset'
    ? { background: PX.l2, border: `1px solid ${PX.l2Edge}` }
    : { background: PX.l1, border: `1px solid ${PX.line}`, boxShadow: PX.sh1 };
  return (
    <div className="px-col px-col-full" style={{ borderRadius: PX.rPanel, minWidth: 0, ...surface, ...style }}>
      {children}
    </div>
  );
}

/** Two or more equal regions inside one surface, separated by a rule instead
 *  of by a gap — so related information reads as one object, not as N cards
 *  (HANDOFF §1: two adjacent signals of the same kind belong in ONE surface
 *  with two labelled regions). */
export function SplitRegion({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 }) {
  // The count is declared, not auto-fitted — see the .px-split rule for why.
  return <div className="px-split" style={{ ['--px-split-cols' as string]: String(columns) }}>{children}</div>;
}

export function SplitPart({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0, padding: '16px 18px' }}>
      {label && (
        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3 }}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

/** A labelled region inside a column. Regions stack in ONE nested column. */
export function Region({
  label, actions, children, tone = 'plain', padded = true,
}: {
  label?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** `inset` = the L2 analytical panel; `plain` = the L1 working surface. */
  tone?: 'plain' | 'inset';
  padded?: boolean;
}) {
  const surface: CSSProperties = tone === 'inset'
    ? { background: PX.l2, border: `1px solid ${PX.l2Edge}`, borderRadius: PX.rInner }
    : { background: PX.l1, border: `1px solid ${PX.line}`, borderRadius: PX.rPanel, boxShadow: PX.sh1 };
  return (
    <section style={{ minWidth: 0, fontFamily: PX.sans, ...surface }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 18px', borderBottom: `1px solid ${PX.line}` }}>
          <span style={{ flex: '0 1 auto', minWidth: 0, overflowWrap: 'anywhere', fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3 }}>
            {label}
          </span>
          {actions && <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>{actions}</div>}
        </div>
      )}
      <div style={padded ? { padding: '16px 18px', minWidth: 0 } : { minWidth: 0 }}>{children}</div>
    </section>
  );
}

/** A compact metric. Never invented — every value must come from real state. */
export function Metric({
  label, value, hint, tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'ink' | 'mute';
}) {
  return (
    <div style={{ minWidth: 0, padding: '11px 13px', background: PX.l2, border: `1px solid ${PX.l2Edge}`, borderRadius: PX.rInner }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 21, fontWeight: 750, letterSpacing: '-0.022em', fontVariantNumeric: 'tabular-nums', color: tone === 'mute' ? PX.inkMute : PX.ink }}>
        {value}
      </div>
      {hint && <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 600, color: PX.ink3, overflowWrap: 'anywhere' }}>{hint}</div>}
    </div>
  );
}

/** Metric strip: auto-fitting, so it never leaves a ragged final row. */
export function MetricStrip({ children }: { children: ReactNode }) {
  return <div className="px-metrics">{children}</div>;
}

/** Key/value pairs — the drawer grammar, for factual records. */
export function Facts({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="px-facts">
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt style={{ color: PX.ink3, fontWeight: 600 }}>{k}</dt>
          <dd style={{ margin: 0, fontWeight: 650, minWidth: 0, overflowWrap: 'anywhere' }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A designed unavailable/empty state. An absent value is still a Product
 *  statement: it says what is missing, why, and what happens next. */
export function StateBlock({
  title, body, action, tone = 'idle',
}: {
  title: string;
  body: ReactNode;
  /** Only render when a real action exists. */
  action?: ReactNode;
  tone?: 'idle' | 'pending';
}) {
  return (
    <div style={{ padding: '26px 20px', display: 'grid', gap: 8, justifyItems: 'start', fontFamily: PX.sans }}>
      <div aria-hidden="true" style={{
        width: 30, height: 30, borderRadius: PX.rInner, display: 'grid', placeItems: 'center',
        background: tone === 'pending' ? PX.infoTint : PX.inkWash,
        border: `1px solid ${tone === 'pending' ? PX.infoTint : PX.line}`,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: PX.rPill, background: tone === 'pending' ? PX.info : PX.inkMute }} />
      </div>
      <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.008em', color: PX.ink }}>{title}</h4>
      <p style={{ margin: 0, maxWidth: '62ch', fontSize: 12.5, lineHeight: 1.6, color: PX.ink3 }}>{body}</p>
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
