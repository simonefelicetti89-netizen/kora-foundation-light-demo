'use client';

import type {
  KoraIndexOutput,
  CompanyAggregateExtended,
  PillarCode,
  SafeguardStatus,
} from '@/lib/types';

interface Action {
  priority: number;
  action: string;
  detail: string;
  target_components: string[];
}

interface BoardLedgerMiniProps {
  output: KoraIndexOutput;
  aggregate: CompanyAggregateExtended | null;
  pillarData: Partial<Record<PillarCode, number>>;
  primaryAction: Action | null;
  s1Output?: KoraIndexOutput | null;
}

function getWeakPillar(
  pillarData: Partial<Record<PillarCode, number>>,
): { code: string; pct: number } {
  const entries = Object.entries(pillarData) as [PillarCode, number][];
  if (entries.length === 0) return { code: 'LEGACY', pct: 6 };
  const sorted = [...entries].sort((a, b) => a[1] - b[1]);
  return { code: sorted[0][0], pct: Math.round(sorted[0][1] * 100) };
}

function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

const SAFEGUARD_BADGE: Record<SafeguardStatus, React.CSSProperties> = {
  CLEAR:   { background: 'rgba(200,255,71,0.11)', border: '1px solid rgba(200,255,71,0.36)', color: '#2B4A00' },
  WARNING: { background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.28)', color: '#78350F' },
  FLAGGED: { background: 'rgba(239,68,68,0.09)',  border: '1px solid rgba(239,68,68,0.28)',  color: '#7F1D1D' },
};

const COL = '116px 136px 1fr';
const ROW_PAD = '13px 26px';

export function BoardLedgerMini({
  output,
  aggregate,
  pillarData,
  primaryAction,
  s1Output,
}: BoardLedgerMiniProps) {
  const ki     = Math.round(output.kora_index_value);
  const safeg  = output.safeguard_status;
  const ar     = aggregate != null ? Math.round(aggregate.activation_rate * 100) : null;
  const co     = aggregate != null ? Math.round(aggregate.continuity_rate * 100) : null;
  const weak   = getWeakPillar(pillarData);
  const delta  = s1Output != null
    ? Math.round(output.kora_index_value - s1Output.kora_index_value)
    : null;

  const badgeStyle = SAFEGUARD_BADGE[safeg] ?? SAFEGUARD_BADGE['WARNING'];

  const decisionLabel  = primaryAction
    ? truncate(primaryAction.action, 22)
    : 'Analizza gap strutturale';
  const decisionDetail = primaryAction
    ? truncate(primaryAction.detail, 60)
    : 'Priorità al pillar con minore copertura nel periodo.';

  return (
    <div
      className="overflow-hidden"
      style={{
        borderTop:    'none',
        borderRight:  '1px solid rgba(6,3,43,0.08)',
        borderBottom: '1px solid rgba(6,3,43,0.08)',
        borderLeft:   '3px solid #6156F5',
        borderRadius: '0 0 0 8px',
        background:   '#FFFFFF',
      }}
    >
      {/* Column headers */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: COL,
          padding: '6px 26px',
          background: 'rgba(6,3,43,0.016)',
          borderBottom: '1px solid rgba(6,3,43,0.08)',
        }}
      >
        {(['Segnale', 'Valore', 'Lettura board'] as const).map((h) => (
          <p key={h} className="font-mono text-black/25" style={{ fontSize: '6px', letterSpacing: '0.20em' }}>
            {h.toUpperCase()}
          </p>
        ))}
      </div>

      {/* Row 1 — Stato attuale */}
      <div
        className="grid items-center"
        style={{ gridTemplateColumns: COL, padding: ROW_PAD, borderBottom: '1px solid rgba(6,3,43,0.042)', gap: 8 }}
      >
        <p className="text-[11px] font-semibold text-black/40">Stato attuale</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-semibold text-kora-cosmic-blue">KI&nbsp;{ki}</span>
          <span
            className="font-mono font-medium rounded"
            style={{ ...badgeStyle, fontSize: '7px', letterSpacing: '0.05em', padding: '2px 5px' }}
          >
            {safeg}
          </span>
        </div>
        <p className="text-[11px] text-kora-cosmic-blue/65 leading-[1.48]">
          {delta != null && delta > 0 ? `+${delta} pts vs S1. ` : ''}
          Activation quality {safeg === 'CLEAR' ? 'in crescita' : 'sotto soglia'}.
        </p>
      </div>

      {/* Row 2 — Driver primario */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: COL,
          padding: ROW_PAD,
          borderBottom: '1px solid rgba(6,3,43,0.042)',
          gap: 8,
          background: 'rgba(6,3,43,0.010)',
        }}
      >
        <p className="text-[11px] font-semibold" style={{ color: 'rgba(97,86,245,0.68)' }}>
          Driver primario
        </p>
        <p className="text-[12.5px] font-semibold text-kora-cosmic-blue">
          AR&nbsp;{ar != null ? `${ar}%` : '—'}
        </p>
        <p className="text-[11px] text-kora-cosmic-blue/65 leading-[1.48]">
          Soglia CLEAR {safeg === 'CLEAR' ? 'superata' : 'non raggiunta'}.
          {co != null ? ` Continuity (CO ${co}%) ${co >= 35 ? 'stabile' : 'ancora debole'}.` : ''}
        </p>
      </div>

      {/* Row 3 — Vincolo strutturale */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: COL,
          padding: ROW_PAD,
          borderBottom: '1px solid rgba(6,3,43,0.042)',
          gap: 8,
          background: 'rgba(180,83,9,0.055)',
        }}
      >
        <p className="text-[11px] font-semibold" style={{ color: '#B45309' }}>
          Vincolo strutturale
        </p>
        <p className="text-[12.5px] font-semibold" style={{ color: '#B45309' }}>
          {weak.code}&nbsp;{weak.pct}%
        </p>
        <p className="text-[11px] text-kora-cosmic-blue/65 leading-[1.48]">
          Gap pillar — comprime PB e Distribution &amp; Equity.
        </p>
      </div>

      {/* Row 4 — Decisione (climax) */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: COL,
          padding: '15px 26px',
          gap: 8,
          background: 'rgba(97,86,245,0.052)',
          borderTop: '1px solid rgba(97,86,245,0.09)',
        }}
      >
        <p
          className="font-semibold"
          style={{ fontSize: '10.5px', color: '#6156F5', letterSpacing: '0.01em' }}
        >
          Decisione
        </p>
        <p className="text-[12.5px] font-semibold text-kora-cosmic-blue">{decisionLabel}</p>
        <p className="text-[11px] text-kora-cosmic-blue/65 leading-[1.48]">{decisionDetail}</p>
      </div>
    </div>
  );
}
