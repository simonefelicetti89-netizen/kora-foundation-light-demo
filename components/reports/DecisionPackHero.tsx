import type { KoraIndexOutput, MacroblockScore, ScenarioId } from '@/lib/types';
import type { ActivationSafeguardResult } from '@/lib/types';
import type { ConfidenceRecord } from '@/lib/types';

interface Props {
  output: KoraIndexOutput;
  s1Output: KoraIndexOutput;
  s2Output: KoraIndexOutput;
  activeScenario: ScenarioId;
  safeguard: ActivationSafeguardResult | null;
  confidence: ConfidenceRecord | null;
  s1Macroblocks: MacroblockScore[];
  s2Macroblocks: MacroblockScore[];
}

const SAFEGUARD_COLORS: Record<string, string> = {
  CLEAR:   'text-[#2F7D55] bg-[rgba(47,125,85,0.08)] border-[rgba(47,125,85,0.22)]',
  WARNING: 'text-amber-700 bg-[rgba(217,154,43,0.08)] border-[rgba(217,154,43,0.25)]',
  FLAGGED: 'text-[#9E3B2F] bg-[rgba(158,59,47,0.06)] border-[rgba(158,59,47,0.20)]',
};

const MB_ACCENT: Record<string, string> = {
  REACH:  'text-blue-700',
  QUALITY:'text-violet-700',
  EQUITY: 'text-[rgba(6,3,43,0.62)]',
  BTI:    'text-amber-700',
};

function scoreDelta(a: number, b: number) {
  const d = b - a;
  if (d === 0) return null;
  return { value: d, positive: d > 0 };
}

export function DecisionPackHero({
  output, s1Output, s2Output, activeScenario,
  safeguard, confidence,
  s1Macroblocks, s2Macroblocks,
}: Props) {
  const indexDelta = scoreDelta(s1Output.kora_index_value, s2Output.kora_index_value);
  const safeguardStyle = SAFEGUARD_COLORS[output.safeguard_status] ?? SAFEGUARD_COLORS.WARNING;

  const executiveSentence = (() => {
    if (activeScenario === 'S2' && indexDelta && indexDelta.positive) {
      return `KORA Index v1.0 passa da ${s1Output.kora_index_value} a ${s2Output.kora_index_value} dopo una riallocazione parziale del budget da Economic Relief verso iniziative più profonde. Il sistema mostra un miglioramento strutturale, ma mantiene Activation Debt e opportunità residue di riallocazione.`;
    }
    if (output.safeguard_status === 'CLEAR') {
      return `KORA Index v1.0 è ${output.kora_index_value}/100 con Activation Safeguard CLEAR — entrambe le soglie di attivazione sono superate. Il sistema produce intelligence direzionale con validità interpretativa piena.`;
    }
    if (output.safeguard_status === 'FLAGGED') {
      return `KORA Index v1.0 è ${output.kora_index_value}/100 con Activation Safeguard FLAGGED — attivazione insufficiente. Azioni strutturali sono necessarie prima di interpretare il KORA Index come indicatore direzionale affidabile.`;
    }
    return `KORA Index v1.0 è ${output.kora_index_value}/100 con Activation Safeguard WARNING — attivazione parziale. Il KORA Index è da interpretare con cautela direzionale.`;
  })();

  return (
    <div className="space-y-6">

      {/* ── A. Executive Summary ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-6 space-y-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">A — Executive Summary</p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* KORA Index */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">KORA Index v1.0</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-[#06032B]">{output.kora_index_value}</span>
              <span className="text-sm text-[rgba(6,3,43,0.40)] mb-1">/100</span>
              {activeScenario === 'S2' && indexDelta && (
                <span className={`text-sm font-bold mb-1 ${indexDelta.positive ? 'text-[rgba(47,125,85,0.90)]' : 'text-[rgba(158,59,47,0.90)]'}`}>
                  {indexDelta.positive ? '+' : ''}{indexDelta.value}
                </span>
              )}
            </div>
            {activeScenario === 'S2' && (
              <p className="text-[10px] text-[rgba(6,3,43,0.40)]">da {s1Output.kora_index_value} (S1) → {s2Output.kora_index_value} (S2)</p>
            )}
          </div>

          {/* Confidence Score — external */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">Confidence Score</p>
            <div className="flex items-end gap-1.5">
              <span className="text-4xl font-bold text-[rgba(6,3,43,0.78)]">{Math.round(output.confidence_score * 100)}%</span>
            </div>
            <span className="inline-block text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
              Esterno al KORA Index — indicatore affidabilità
            </span>
          </div>

          {/* Activation Safeguard */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">Activation Safeguard</p>
            <span className={`inline-flex items-center rounded border px-3 py-1.5 text-base font-bold ${safeguardStyle}`}>
              {output.safeguard_status}
            </span>
            {safeguard && (
              <p className="text-[10px] text-[rgba(6,3,43,0.40)]">
                AR {Math.round(safeguard.ar_value * 100)}% · MAR {Math.round(safeguard.mar_value * 100)}%
              </p>
            )}
          </div>

          {/* Calibration */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">Calibrazione</p>
            <span className="inline-block text-[11px] font-semibold bg-[rgba(217,154,43,0.08)] text-amber-700 border border-[rgba(217,154,43,0.25)] rounded px-2 py-1">
              Pre-Empirical Calibration
            </span>
            <p className="text-[10px] font-mono text-[rgba(6,3,43,0.40)]">{output.methodology_version_id}</p>
          </div>
        </div>

        {/* Interpretation sentence */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-sm text-[rgba(6,3,43,0.78)] leading-relaxed">
          {executiveSentence}
        </div>

        {confidence?.limitations && (
          <p className="text-xs text-[rgba(6,3,43,0.40)] leading-relaxed border-t border-[rgba(6,3,43,0.05)] pt-3">
            <span className="font-semibold text-[rgba(6,3,43,0.52)]">Limitazioni: </span>
            {confidence.limitations}
          </p>
        )}
      </div>

      {/* ── B. Methodology Snapshot ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">B — Methodology Snapshot</p>
          <span className="text-[10px] text-[rgba(6,3,43,0.40)] italic">
            Previous equal weights (0.10 × 10) were provisional scaffolding and are no longer canonical.
          </span>
        </div>

        {/* Macroblock table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[rgba(6,3,43,0.05)]">
                <th className="py-2 text-left text-xs font-semibold text-[rgba(6,3,43,0.40)] w-40">Macroblock</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">Peso</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">Score S1</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">Score S2</th>
                <th className="py-2 text-right text-xs font-semibold text-[rgba(6,3,43,0.40)]">Δ</th>
                <th className="py-2 text-left pl-4 text-xs font-semibold text-[rgba(6,3,43,0.40)]">Componenti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {s1Macroblocks.map((mb) => {
                const s2mb = s2Macroblocks.find((m) => m.code === mb.code);
                const delta = s2mb ? s2mb.score - mb.score : null;
                const accent = MB_ACCENT[mb.code] ?? 'text-[rgba(6,3,43,0.78)]';
                return (
                  <tr key={mb.code} className="hover:bg-[rgba(6,3,43,0.03)] transition-colors">
                    <td className="py-3 pr-3">
                      <span className={`font-semibold ${accent}`}>{mb.label}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-mono text-xs text-[rgba(6,3,43,0.62)]">{Math.round(mb.weight * 100)}%</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-mono font-semibold text-[rgba(6,3,43,0.78)]">{mb.score}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-mono font-semibold text-[rgba(6,3,43,0.78)]">{s2mb?.score ?? '—'}</span>
                    </td>
                    <td className="py-3 text-right">
                      {delta !== null ? (
                        <span className={`font-mono text-xs font-bold ${delta > 0 ? 'text-[rgba(47,125,85,0.90)]' : delta < 0 ? 'text-[rgba(158,59,47,0.90)]' : 'text-[rgba(6,3,43,0.40)]'}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      ) : <span className="text-[rgba(6,3,43,0.28)]">—</span>}
                    </td>
                    <td className="py-3 pl-4 text-xs text-[rgba(6,3,43,0.40)]">
                      {mb.component_codes.length > 0
                        ? mb.component_codes.join(', ')
                        : <span className="italic text-[rgba(6,3,43,0.28)]">BudgetToHumanImpactEngine</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* CS + Safeguard notes */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-700 leading-relaxed">
            <span className="font-semibold">Confidence Score (CS): </span>
            esterno al calcolo del KORA Index v1.0. Peso = 0. Indicatore di affidabilità dei dati sottostanti, non componente pesato.
          </div>
          <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed">
            <span className="font-semibold">Activation Safeguard: </span>
            gate interpretativo indipendente. CLEAR = AR ≥ 40% AND MAR ≥ 30%. Non è un componente del KORA Index.
          </div>
        </div>
      </div>
    </div>
  );
}
