'use client';

import type { ReactNode } from 'react';

/**
 * The T2 row: the index, then exactly three supporting signals.
 *
 * Desktop places the index first and wider; the phone gives the index its own
 * row and puts the three signals side by side beneath it. That difference is
 * declared here rather than left to a reflow, because stacking four equal
 * blocks on a phone is what the approved design was written against.
 *
 * Three signals. Not four — the fourth slot is where an extra metric creeps
 * above the fold, so the type admits exactly three.
 */
export function SignalRow({ index, signals }: {
  index: ReactNode;
  signals: [ReactNode, ReactNode, ReactNode];
}) {
  return (
    <div className="kora-signals" data-kora-region="signals">
      <div className="kora-signal-index">{index}</div>
      <div className="kora-signal-vline" aria-hidden="true" />
      <div className="kora-signal-trio">
        {signals[0]}
        <div className="kora-signal-vline" aria-hidden="true" />
        {signals[1]}
        <div className="kora-signal-vline" aria-hidden="true" />
        {signals[2]}
      </div>
    </div>
  );
}

/** One signal cell. `mark` is a semantic dot — the only colour permitted here. */
export function Signal({ label, shortLabel, value, sub, mark }: {
  label: string;
  shortLabel?: string;
  value: ReactNode;
  sub?: ReactNode;
  mark?: string;
}) {
  return (
    <div className="kora-signal">
      <p className="kt-meta" style={{ color: 'rgba(255,255,255,0.50)', marginBottom: 8 }}>
        <span className="kora-lbl-full">{label}</span>
        {shortLabel && <span className="kora-lbl-short">{shortLabel}</span>}
      </p>
      <p style={{ color: '#FFFFFF', display: 'flex', alignItems: 'baseline', gap: 6 }}>
        {mark && <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: mark, flex: '0 0 auto' }} />}
        {value}
      </p>
      {sub && <p className="kt-caption kora-signal-sub" style={{ color: 'rgba(255,255,255,0.50)', marginTop: 6 }}>{sub}</p>}
    </div>
  );
}
