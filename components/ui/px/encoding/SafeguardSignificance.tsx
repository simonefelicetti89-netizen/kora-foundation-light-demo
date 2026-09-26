'use client';

import { PX } from '@/lib/design/kora-design-tokens';
import { assessmentTreatment, type Assessment } from '@/lib/design/surface-state-grammar';
import { getThresholds } from '@/lib/methodology-config/v0.1';
import type { SafeguardStatus } from '@/lib/types';

const CLAIM: Record<SafeguardStatus, Assessment> = {
  CLEAR:   { kind: 'ok',    label: 'Clear' },
  WARNING: { kind: 'watch', label: 'Warning', reason: 'Almeno una soglia minima di attivazione non è soddisfatta.' },
  FLAGGED: { kind: 'risk',  label: 'Flagged', reason: 'Attivazione sotto la soglia strutturale minima.' },
};

/**
 * KORA-WP-142 — Activation Safeguard significance.
 *
 * The state itself is WP140 semantics and is NOT re-encoded here. What this adds
 * is WHY the state holds: the Safeguard is defined on AR and MAR against config
 * thresholds, and a reader who sees only the word "Clear" cannot tell whether it
 * was cleared comfortably or by a point.
 *
 * The status is mapped to a claim from a closed record — there is no colour,
 * tone or variant prop, so an arbitrary prop cannot change the semantic state.
 */
export function SafeguardSignificance({
  status, ar, mar,
}: {
  status: SafeguardStatus;
  /** 0–1, or null when the input itself is missing. */
  ar:  number | null;
  mar: number | null;
}) {
  const t     = getThresholds();
  const claim = CLAIM[status] ?? CLAIM.WARNING;
  const treat = assessmentTreatment(claim);
  const pct   = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

  const rules = [
    { code: 'AR',  value: ar,  clear: t.CLEAR.AR,  met: ar  !== null && ar  >= t.CLEAR.AR  },
    { code: 'MAR', value: mar, clear: t.CLEAR.MAR, met: mar !== null && mar >= t.CLEAR.MAR },
  ];

  return (
    <div data-kora-encoding="safeguard-significance" data-safeguard-status={status}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: treat.fill }} />
        <p className="kt-label" style={{ color: treat.text }}>Activation Safeguard™ · {claim.label}</p>
      </div>
      {'reason' in claim && (
        <p className="kt-caption" style={{ color: PX.ink3, marginTop: 4 }}>{claim.reason}</p>
      )}

      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 4 }}>
        {rules.map((r) => (
          <li key={r.code} className="kt-caption kt-num" style={{ color: r.met ? PX.ink2 : PX.ink3 }}>
            <span aria-hidden="true">{r.met ? '✓' : '✗'}</span>{' '}
            {r.code} {pct(r.value)} {r.met ? '≥' : '<'} {pct(r.clear)}
            <span style={{ color: PX.inkMute }}>{' · soglia CLEAR'}</span>
          </li>
        ))}
      </ul>
      <p className="kt-caption" style={{ color: PX.inkMute, marginTop: 4 }}>
        Regola: CLEAR richiede AR ≥ {pct(t.CLEAR.AR)} E MAR ≥ {pct(t.CLEAR.MAR)} · safeguard_thresholds
      </p>
    </div>
  );
}
