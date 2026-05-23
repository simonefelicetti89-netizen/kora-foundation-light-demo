'use client';

import { useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { uefReviewService } from '@/services/uef-review/UEFReviewService';
import { iuComputationService } from '@/services/iu-computation/IUComputationService';
import { cn } from '@/lib/utils';
import type { ImpactUnitComputationResult, ImpactUnitFactorTrace, PillarCode } from '@/lib/types';

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       'text-green-700',
  GROWTH:     'text-blue-700',
  CONNECTION: 'text-purple-700',
  IMPACT:     'text-orange-700',
  LEGACY:     'text-amber-700',
};

const ELIGIBILITY_BADGE: Record<string, string> = {
  eligible: 'bg-green-50 text-green-700 border-green-200',
  limited:  'bg-amber-50 text-amber-700 border-amber-200',
  blocked:  'bg-red-50 text-red-700 border-red-200',
};

function FactorRow({ trace }: { trace: ImpactUnitFactorTrace }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span className="w-8 shrink-0 rounded bg-slate-100 px-1 py-0.5 text-center text-[10px] font-bold font-mono text-slate-600">
        {trace.factor_code}
      </span>
      <span className="w-28 shrink-0 text-xs text-slate-500">{trace.label}</span>
      <span className={cn(
        'w-12 shrink-0 text-right text-xs font-mono font-semibold',
        trace.value === 0 ? 'text-red-500' : trace.value >= 1.0 ? 'text-green-600' : 'text-slate-700',
      )}>
        {trace.value.toFixed(2)}
      </span>
      <span className="flex-1 text-[10px] text-slate-400 leading-snug">{trace.reason}</span>
      {trace.foundation_light_stub && (
        <span className="shrink-0 rounded border border-slate-100 bg-slate-50 px-1 py-0.5 text-[9px] text-slate-300">
          stub
        </span>
      )}
    </div>
  );
}

function SampleTraceCard({ result }: { result: ImpactUnitComputationResult }) {
  const badge = ELIGIBILITY_BADGE[result.eligibility] ?? 'bg-slate-50 text-slate-500 border-slate-200';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 font-mono">{result.record_id}</p>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{result.action_family.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize', badge)}>
            {result.eligibility}
          </span>
          {result.primary_pillar && (
            <span className={cn('text-[10px] font-mono font-semibold', PILLAR_COLORS[result.primary_pillar])}>
              {result.primary_pillar}
            </span>
          )}
        </div>
      </div>

      {/* Formula trace */}
      <div className="rounded-md border border-slate-100 bg-slate-50 p-3 space-y-0">
        {result.formula_trace.map((t) => (
          <FactorRow key={t.factor_code} trace={t} />
        ))}
      </div>

      {/* IU result */}
      <div className={cn(
        'rounded-md border px-3 py-2 text-xs font-mono',
        result.impact_units_total > 0
          ? 'border-green-200 bg-green-50 text-green-700'
          : result.blocked ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-slate-200 bg-slate-50 text-slate-500',
      )}>
        <span className="font-semibold">IU = NM × BC × CQ × EV × CF × AGF = </span>
        {result.normalized_magnitude_nm.toFixed(2)} × {result.base_contribution_bc.toFixed(2)} × {result.completeness_quality_cq.toFixed(2)} × {result.evidence_verification_ev.toFixed(2)} × {result.contextual_factor_cf.toFixed(2)} × {result.anti_gaming_factor_agf.toFixed(2)} = <span className="font-bold">{result.impact_units_total.toFixed(4)}</span>
      </div>

      {result.exclusion_reason && (
        <p className="text-[11px] text-slate-400 italic leading-snug">{result.exclusion_reason}</p>
      )}

      {/* Pillar distribution */}
      {result.impact_units_total > 0 && Object.keys(result.impact_units_by_pillar).length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {(Object.entries(result.impact_units_by_pillar) as [PillarCode, number][]).map(([p, iu]) => (
            <span key={p} className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono', ELIGIBILITY_BADGE.eligible)}>
              {p}: {iu.toFixed(4)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// C-06: Scoring Run
export default function ScoringRun() {
  const { activeScenario } = useScenario();
  const output = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');

  // IU computation consumes UEF-reviewed rows — canonical pipeline lineage (UEF Review → IU Computation)
  const analyzedRows = uefReviewService.getAllReviewedPipelineRows();
  const summary = iuComputationService.getIUComputationSummary(analyzedRows);
  const allResults = iuComputationService.computeIUForRecords(analyzedRows);

  // Pick one representative sample for each category
  const sampleEligible  = allResults.find((r) => r.computed);
  const sampleLimited   = allResults.find((r) => r.limited);
  const sampleBlocked   = allResults.find((r) => r.blocked);
  const samples = [sampleEligible, sampleLimited, sampleBlocked].filter(Boolean) as ImpactUnitComputationResult[];

  const pillarEntries = Object.entries(summary.impact_units_by_pillar) as [PillarCode, number][];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Scoring Run</h1>
        <p className="text-sm text-slate-500">
          Pipeline IU → PIB → Aggregazione Aziendale → Activation Safeguard → KORA Index.
        </p>
      </div>

      {/* ── IU Computation Status Banner ── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-indigo-800">Foundation Light: IU Computation Stub Attivo</p>
          <span className="rounded border border-indigo-300 bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
            v0.1 pre-empirical
          </span>
        </div>
        <p className="text-xs text-indigo-700 leading-relaxed">
          IU = NM × BC × CQ × EV × CF × AGF — formula canonica attiva. Fattori sono stub deterministic conservativi (Foundation Light v0.1).
          La calibrazione empirica completa avverrà post Delphi Study.
        </p>
        <p className="text-xs text-indigo-600 font-medium mt-1.5">
          Il KORA Index v3 rimane guidato dagli output scenari canonici pre-computati.
          Il calcolo IU → PIB → aggregazione aziendale → macroblocks è il passo successivo di implementazione.
        </p>
      </div>

      {/* ── IU Summary Stats ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Riepilogo Computazione IU — Batch Ingestion Demo
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-xs text-slate-400">Record Totali</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{summary.total_records}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
            <p className="text-xs text-green-600">IU Computate</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{summary.computed_records}</p>
            <p className="text-[10px] text-green-500 mt-0.5">Eligible + approved</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
            <p className="text-xs text-amber-600">Limited (0 IU)</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{summary.limited_records}</p>
            <p className="text-[10px] text-amber-500 mt-0.5">BTI governance only</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
            <p className="text-xs text-red-600">Blocked (0 IU)</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{summary.blocked_records}</p>
            <p className="text-[10px] text-red-500 mt-0.5">Blocked by Design</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
            <p className="text-xs text-blue-600">Review Required (0 IU)</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{summary.review_required_records}</p>
            <p className="text-[10px] text-blue-500 mt-0.5">Pending review</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-xs text-slate-400">IU Totali Calcolate</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{summary.total_impact_units.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">sum(IU eligible)</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-xs text-slate-400">CQ Medio</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{summary.average_cq.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Completeness Quality</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-xs text-slate-400">EV Medio</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{summary.average_ev.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Evidence Verification</p>
          </div>
        </div>
      </div>

      {/* ── IU by Pillar ── */}
      {pillarEntries.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">IU per Pillar</h2>
          <div className="space-y-2">
            {pillarEntries.map(([pillar, iu]) => (
              <div key={pillar} className="flex items-center gap-3">
                <span className={cn('w-20 text-xs font-mono font-semibold', PILLAR_COLORS[pillar])}>
                  {pillar}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-indigo-400"
                    style={{ width: `${Math.min((iu / summary.total_impact_units) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-500 w-16 text-right">{iu.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sample Formula Traces ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Tracce Formula — Esempi (Eligible · Limited · Blocked)
        </h2>
        {samples.length > 0 ? (
          <div className="space-y-4">
            {samples.map((s) => (
              <SampleTraceCard key={s.record_id} result={s} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 rounded-lg border border-slate-200 bg-white p-4">
            Nessun record disponibile per le tracce di esempio.
          </p>
        )}
      </div>

      {/* ── KORA Index (canonical seed output) ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          KORA Index — Output Scenario Canonico (pre-computato)
        </h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 mb-3">
          <p className="text-xs text-amber-700">
            Foundation Light separa la computazione IU preview dagli output KORA Index canonici per scenario.
            Il KORA Index v3 mostrato sotto è letto dal seed canonico — non è ancora ricalcolato dinamicamente
            dagli IU appena computati. Il passo successivo è: IU → PIB → aggregazione aziendale → macroblocks → KORA Index.
          </p>
        </div>
        <KoraIndexHero output={output} />
      </div>

      {/* ── What's missing for full dynamic KORA Index ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Gap verso KORA Index dinamico completo
        </p>
        <ul className="space-y-1">
          {[
            'IU → PIB aggregazione per worker (Stage 11)',
            'PIB → Company Aggregation (Stage 12)',
            'Company Aggregation → Macroblock scores (REACH, QUALITY, EQUITY, BTI)',
            'Macroblock scores → KORA Index v3 (Stage 14)',
            'Confidence Score dinamico da qualità evidenze batch',
            'Activation Safeguard dinamico da AR/MAR computati',
            'Report generator wiring su output dinamici',
          ].map((item) => (
            <li key={item} className="flex gap-1.5 text-[11px] text-slate-400">
              <span className="shrink-0 mt-0.5 text-slate-300">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-400">
        {output.methodology_version_id} · {output.calibration_status} · Dati demo sintetici · synthetic_demo_data: true
      </p>
    </div>
  );
}
