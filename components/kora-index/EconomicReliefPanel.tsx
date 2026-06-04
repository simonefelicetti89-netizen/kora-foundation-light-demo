'use client';

import { cn } from '@/lib/utils';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { EconomicReliefSummary } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';

interface EconomicReliefPanelProps {
  s1?: EconomicReliefSummary | null;
  s2?: EconomicReliefSummary | null;
  s1BtiScore?: number;
  s2BtiScore?: number;
}

function EurAmount({ value, currency = 'EUR' }: { value: number; currency?: string }) {
  return <span>{value.toLocaleString('it-IT', { style: 'currency', currency, maximumFractionDigits: 0 })}</span>;
}

function ShareBar({ share, label, isAccent }: { share: number; label: string; isAccent?: boolean }) {
  const pct = Math.round(share * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: TOKENS.inkSecondary }}>{label}</span>
        <span className="font-semibold" style={{ color: TOKENS.ink }}>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full" style={{ background: TOKENS.inkTrack }}>
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct}%`, background: isAccent ? TOKENS.accent : TOKENS.safeguard.pass.dot }}
        />
      </div>
    </div>
  );
}

function ScenarioColumn({ label, summary, btiScore, highlight }: {
  label: string; summary: EconomicReliefSummary; btiScore?: number; highlight?: boolean;
}) {
  return (
    <div
      className="rounded-[10px] p-4 space-y-4"
      style={highlight
        ? { background: TOKENS.ink, border: 'none' }
        : { background: TOKENS.surface, border: TOKENS.cardBorder }
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest"
          style={{ color: highlight ? 'rgba(244,241,233,0.50)' : TOKENS.inkHint }}>
          {label}
        </p>
        {btiScore !== undefined && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={highlight
              ? { background: 'rgba(255,255,255,0.10)', color: 'rgba(244,241,233,0.75)' }
              : { background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text }
            }
          >
            BTI {btiScore}
          </span>
        )}
      </div>
      <div className="space-y-3">
        <ShareBar share={summary.economic_relief_share} label="Quota benefit monetari" />
        <ShareBar share={summary.deep_activation_share} label="Quota attivazione profonda" isAccent />
      </div>
      <div className="space-y-1.5 text-xs">
        {[
          ['Spesa benefit monetari', <EurAmount key="er" value={summary.economic_relief_spend} currency={summary.currency} />],
          ['Spesa attivazione profonda', <EurAmount key="da" value={summary.deep_activation_spend} currency={summary.currency} />],
          ['Budget usato totale',   <EurAmount key="bt" value={summary.total_used_budget}      currency={summary.currency} />],
        ].map(([lbl, val]) => (
          <div key={lbl as string} className="flex justify-between" style={{ borderTop: highlight ? '1px solid rgba(255,255,255,0.08)' : TOKENS.cardBorder, paddingTop: 6 }}>
            <span style={{ color: highlight ? 'rgba(244,241,233,0.50)' : TOKENS.inkSecondary }}>{lbl}</span>
            <span className="font-semibold" style={{ color: highlight ? '#FFFFFF' : TOKENS.ink }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EconomicReliefPanel({ s1, s2, s1BtiScore, s2BtiScore }: EconomicReliefPanelProps) {
  return (
    <div
      className="p-5 space-y-5"
      style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}
    >
      <div>
        <p className="font-kora-sans text-kora-ink" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
          Benefit monetari &amp; opportunità di attivazione
        </p>
        <p className="mt-0.5 text-xs" style={{ color: TOKENS.inkHint }}>Sollievo economico e opportunità di attivazione</p>
        <p className="mt-2 text-xs leading-relaxed max-w-2xl" style={{ color: TOKENS.inkSecondary }}>
          Questi benefit offrono sostegno economico, ma generano profondità di attivazione limitata.{' '}
          <span className="font-semibold" style={{ color: TOKENS.ink }}>Non è spesa sbagliata. È spesa che può diventare più intelligente.</span>
        </p>
      </div>

      {s1 && s2 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScenarioColumn label="S1 — Q1–Q3 2025" summary={s1} btiScore={s1BtiScore} />
            <ScenarioColumn label="S2 — Q1–Q4 2025" summary={s2} btiScore={s2BtiScore} highlight />
          </div>
          <div
            className="rounded-[10px] p-3 space-y-1.5 text-xs"
            style={{ background: TOKENS.safeguard.pass.bg, color: TOKENS.safeguard.pass.text }}
          >
            <p className="font-semibold">Cosa è cambiato in S2:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Quota benefit monetari: <span className="font-semibold">{Math.round(s1.economic_relief_share * 100)}%</span> → <span className="font-semibold">{Math.round(s2.economic_relief_share * 100)}%</span> (−{Math.round((s1.economic_relief_share - s2.economic_relief_share) * 100)} pp)</li>
              <li>Quota attivazione profonda: <span className="font-semibold">{Math.round(s1.deep_activation_share * 100)}%</span> → <span className="font-semibold">{Math.round(s2.deep_activation_share * 100)}%</span> (+{Math.round((s2.deep_activation_share - s1.deep_activation_share) * 100)} pp)</li>
              {s1BtiScore !== undefined && s2BtiScore !== undefined && (
                <li>BTI Score: <span className="font-semibold">{s1BtiScore}</span> → <span className="font-semibold">{s2BtiScore}</span> (+{s2BtiScore - s1BtiScore} punti)</li>
              )}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-sm" style={{ color: TOKENS.inkHint }}>Dati Economic Relief non disponibili per questo scenario.</p>
      )}
    </div>
  );
}
