'use client';

import { useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { uefReviewService } from '@/services/uef-review/UEFReviewService';
import { iuComputationService } from '@/services/iu-computation/IUComputationService';
import { dynamicScoringPreviewService } from '@/services/dynamic-scoring/DynamicScoringPreviewService';
import { cn } from '@/lib/utils';
import type { ImpactUnitComputationResult, ImpactUnitFactorTrace, PillarCode, DynamicScoringPreviewOutput } from '@/lib/types';

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

const SAFEGUARD_BADGE: Record<string, string> = {
  CLEAR:   'bg-green-50 text-green-700 border-green-200',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
  FLAGGED: 'bg-red-50 text-red-700 border-red-200',
};

const DELTA_COLOR = (delta: number) =>
  delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-slate-500';

function DynamicPreviewSection({ preview }: { preview: DynamicScoringPreviewOutput }) {
  const deltaSign = preview.delta_vs_canonical >= 0 ? '+' : '';

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-amber-800">
            Preview Dinamico Sperimentale — Foundation Light v0.1
          </p>
          <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
            {preview.calculation_mode}
          </span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          Questo preview è calcolato da metriche proxy derivate dal batch IU — non è il KORA Index ufficiale.
          Il KORA Index ufficiale è quello canonico basato su seed scenario ({preview.official_index_source}).
          Non usare per decision-making.
        </p>
      </div>

      {/* Score comparison */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">KORA Index Ufficiale</p>
          <p className="text-3xl font-bold text-slate-800">{preview.canonical_kora_index}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">seed canonico</p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-center">
          <p className="text-xs text-indigo-600 mb-1">Preview Score Dinamico</p>
          <p className="text-3xl font-bold text-indigo-700">{preview.dynamic_preview_score}</p>
          <p className="text-[10px] text-indigo-500 mt-0.5">stima proxy</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Delta vs Canonico</p>
          <p className={cn('text-3xl font-bold', DELTA_COLOR(preview.delta_vs_canonical))}>
            {deltaSign}{preview.delta_vs_canonical}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">punti differenza</p>
        </div>
      </div>

      {/* Macroblock previews */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {preview.macroblocks.map((mb) => {
          const mbd = mb.delta >= 0 ? '+' : '';
          return (
            <div key={mb.code} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold text-slate-500">{mb.code}</span>
                <span className={cn('text-[10px] font-mono', DELTA_COLOR(mb.delta))}>
                  {mbd}{mb.delta}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-tight">{mb.label}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">Preview</p>
                  <p className="text-xl font-bold text-indigo-700">{mb.preview_score}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Canonico</p>
                  <p className="text-lg font-semibold text-slate-500">{mb.canonical_seed_score}</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-indigo-400"
                  style={{ width: `${Math.min(mb.preview_score, 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-300 leading-snug">{mb.proxy_basis}</p>
            </div>
          );
        })}
      </div>

      {/* Safeguard + CS proxy */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Activation Safeguard (proxy)</span>
          <span className={cn('rounded border px-2 py-0.5 text-xs font-semibold', SAFEGUARD_BADGE[preview.safeguard_preview.status])}>
            {preview.safeguard_preview.status}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            AR={preview.aggregation.proxy_ar.toFixed(2)} MAR={preview.aggregation.proxy_mar.toFixed(2)}
          </span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-2 min-w-max">
          <span className="text-xs text-slate-400">CS Proxy</span>
          <span className="text-sm font-bold text-slate-700">{preview.confidence_score_proxy.toFixed(2)}</span>
          <span className="text-[10px] text-slate-300 font-mono">{preview.calibration_status}</span>
        </div>
      </div>

      {/* Trace */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Traccia Computazione Proxy
        </h3>
        <div className="space-y-2">
          {preview.trace.map((step, i) => (
            <div key={i} className="flex gap-3 text-[11px] border-b border-slate-50 last:border-0 pb-1.5 last:pb-0">
              <span className="w-5 shrink-0 font-mono text-slate-300">{i + 1}.</span>
              <span className="w-36 shrink-0 font-semibold text-slate-600">{step.step}</span>
              <span className="w-48 shrink-0 text-slate-400 font-mono truncate">{step.output}</span>
              <span className="flex-1 text-slate-300 leading-snug">{step.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Limitations */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Limitazioni del Preview Dinamico ({preview.limitations.length})
        </p>
        <ul className="space-y-1">
          {preview.limitations.map((lim, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] text-slate-400">
              <span className="shrink-0 mt-0.5 text-slate-300">·</span>
              {lim}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-slate-300 font-mono">
          {preview.methodology_version} · production_ready: {String(preview.production_ready)}
        </p>
      </div>
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

  // Dynamic scoring preview: live IU results → proxy macroblock scores → preview KORA Index
  const dynamicPreview = dynamicScoringPreviewService.getDynamicScoringPreview('meridiana-group', activeScenario);

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
            Il KORA Index v3 mostrato sotto è letto dal <strong>seed canonico</strong> — non è ricalcolato dinamicamente da IU live.
            La sezione successiva mostra un <strong>Preview Dinamico sperimentale</strong> basato su metriche proxy: non sostituisce questo output ufficiale.
          </p>
        </div>
        <KoraIndexHero output={output} />
      </div>

      {/* ── Dynamic Scoring Preview ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Preview Dinamico — Stima Proxy da Batch IU
        </h2>
        <DynamicPreviewSection preview={dynamicPreview} />
      </div>

      <p className="text-xs text-slate-400">
        {output.methodology_version_id} · {output.calibration_status} · Dati demo sintetici · synthetic_demo_data: true
      </p>
    </div>
  );
}
