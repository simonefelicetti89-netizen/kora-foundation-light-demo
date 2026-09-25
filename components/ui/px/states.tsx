'use client';

// KORA-WP-140 — the seven canonical states, one component each.
//
// These are NOT variants of a shared state component. A variant flag is exactly
// how ZERO and NO DATA came to render identically: NoDataState was a
// pass-through to EmptyState, so the two carried the same shape and the same
// meaning. Here each state has its own required evidence, so the compiler
// refuses the substitution the old code allowed.
//
// SUPPRESSED delegates to the existing Privacy Boundary rather than
// re-implementing it. The canonical grammar names that component the reference
// implementation, so reusing it is the only way "preserved, never regressed"
// can be proven rather than asserted.
//
// Typography here is deliberately unchanged from the values already used by the
// KORA-WP-125 primitives (StateBlock 14.5/12.5, Status 11.5). KORA-WP-139 owns
// the type scale; this package introduces no typographic decision of its own.

import type { ReactNode } from 'react';
import { CircleAlert, CircleSlash, Clock, Hourglass, LoaderCircle, Minus } from 'lucide-react';
import { PX } from '@/lib/design/kora-design-tokens';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import type { PrivacySuppressReason } from '@/lib/types';
import {
  stateSemantics,
  stateTreatment,
  type SurfaceStateInput,
  type SurfaceStateKind,
} from '@/lib/design/surface-state-grammar';

// ── shared frame ─────────────────────────────────────────────────────────────
// Presentation only. It carries no `tone`, `variant` or `color` prop: treatment
// is derived from the state kind, so no caller can dress one state as another.

function StateFrame({
  kind, icon, title, body, action,
}: {
  kind: SurfaceStateKind;
  icon: ReactNode;
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  const s = stateSemantics(kind);
  const t = stateTreatment(kind);
  return (
    <div
      data-px-state={kind}
      role={s.ariaRole}
      aria-live={s.ariaLive}
      style={{
        display: 'grid', gap: 8, justifyItems: 'start',
        padding: '26px 20px',
        borderRadius: PX.rInner,
        background: t.tint,
        border: `1px solid ${t.edge}`,
        fontFamily: PX.sans,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 30, height: 30, borderRadius: PX.rInner, display: 'grid', placeItems: 'center',
          background: PX.l1, border: `1px solid ${t.edge}`, color: t.fill,
        }}
      >
        {icon}
      </span>
      <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.008em', color: PX.ink }}>{title}</h4>
      <p style={{ margin: 0, maxWidth: '62ch', fontSize: 12.5, lineHeight: 1.6, color: PX.ink3 }}>{body}</p>
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

// ── 1. ZERO — measured, and the measurement is zero ──────────────────────────
// A finding, not a gap. It requires WHAT was measured, which is precisely what
// NO DATA cannot supply.

export function Zero({ measured }: { measured: string }) {
  return (
    <StateFrame
      kind="ZERO"
      icon={<Minus size={15} strokeWidth={2.2} />}
      title="Nessuna attività nel periodo"
      body={<>Il dato è stato misurato: <strong style={{ color: PX.ink }}>{measured}</strong> risulta pari a zero per questo periodo. È un risultato, non un dato mancante.</>}
    />
  );
}

// ── 2. NO DATA — nothing was ever supplied ───────────────────────────────────

export function NoData({ missing, action }: { missing: string; action?: ReactNode }) {
  return (
    <StateFrame
      kind="NO_DATA"
      icon={<CircleSlash size={15} strokeWidth={2} />}
      title="Dato non disponibile"
      body={<>Nessun dato è stato fornito per <strong style={{ color: PX.ink }}>{missing}</strong>. Non è una misurazione pari a zero: la raccolta dati non è ancora avvenuta.</>}
      action={action}
    />
  );
}

// ── 3. INSUFFICIENT DATA — supplied, below the stating threshold ─────────────

export function InsufficientData({ measure, have, need }: { measure: string; have: number; need: number }) {
  return (
    <StateFrame
      kind="INSUFFICIENT_DATA"
      icon={<Hourglass size={15} strokeWidth={2} />}
      title="Dati insufficienti per esprimere un valore"
      body={<>Per <strong style={{ color: PX.ink }}>{measure}</strong> sono disponibili {have} evidenze sulle {need} necessarie. Il valore non viene mostrato finché la soglia metodologica non è raggiunta.</>}
    />
  );
}

// ── 4. SUPPRESSED — withheld by a privacy boundary ───────────────────────────
// Delegates to the reference implementation. role="status" comes from there and
// is deliberately NOT an alert: a boundary is KORA working correctly.

export function Suppressed({
  reason, groupSize, dataType,
}: {
  reason: PrivacySuppressReason;
  groupSize?: number;
  dataType?: string;
}) {
  return (
    <div data-px-state="SUPPRESSED">
      <PrivacyBoundaryNotice reason={reason} groupSize={groupSize} dataType={dataType} />
    </div>
  );
}

// ── 5. NOT YET AVAILABLE — will exist, does not exist yet ────────────────────

export function NotYetAvailable({ title, expected }: { title?: string; expected: string }) {
  return (
    <StateFrame
      kind="NOT_YET_AVAILABLE"
      icon={<Clock size={15} strokeWidth={2} />}
      title={title ?? 'Non ancora disponibile'}
      body={<>{expected} Non è un errore: il dato sarà disponibile quando la condizione descritta sarà soddisfatta.</>}
    />
  );
}

// ── 6. LOADING — in flight ───────────────────────────────────────────────────

export function Loading({ label = 'Caricamento in corso.' }: { label?: string }) {
  return (
    <StateFrame
      kind="LOADING"
      icon={<LoaderCircle size={15} strokeWidth={2} />}
      title="Caricamento"
      body={label}
    />
  );
}

// ── 7. ERROR — something failed. The only fault state. ───────────────────────

export function ErrorState({ what, retry }: { what: string; retry?: ReactNode }) {
  return (
    <StateFrame
      kind="ERROR"
      icon={<CircleAlert size={15} strokeWidth={2} />}
      title="Errore"
      body={what}
      action={retry}
    />
  );
}

// ── exhaustive dispatcher ────────────────────────────────────────────────────
// An unrecognised state throws through stateSemantics rather than degrading to
// ERROR — silently rendering the unknown as a fault is the conflation this
// package removes.

export function SurfaceStateView({ state }: { state: SurfaceStateInput }) {
  switch (state.kind) {
    case 'ZERO':              return <Zero measured={state.measured} />;
    case 'NO_DATA':           return <NoData missing={state.missing} action={state.action} />;
    case 'INSUFFICIENT_DATA': return <InsufficientData measure={state.measure} have={state.have} need={state.need} />;
    case 'SUPPRESSED':        return <Suppressed reason={state.reason} groupSize={state.groupSize} dataType={state.dataType} />;
    case 'NOT_YET_AVAILABLE': return <NotYetAvailable title={state.title} expected={state.expected} />;
    case 'LOADING':           return <Loading label={state.label} />;
    case 'ERROR':             return <ErrorState what={state.what} retry={state.retry} />;
    default: {
      const unreachable: never = state;
      stateSemantics((unreachable as { kind: SurfaceStateKind }).kind);
      return null;
    }
  }
}
