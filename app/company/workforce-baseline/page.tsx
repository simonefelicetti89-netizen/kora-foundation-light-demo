'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { workforceBaselineService } from '@/services/workforce-baseline/WorkforceBaselineService';
import type {
  WorkforceAggregateGroup,
  WorkforceDimensionType,
  WorkforceBaselineReadiness,
  WorkforceBaselineUploadBatch,
} from '@/lib/types';

// ── Constants ───────────────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<WorkforceDimensionType, string> = {
  site:              'Sede',
  department:        'Dipartimento',
  role_family:       'Famiglia professionale',
  seniority_band:    'Fascia di seniority',
  contract_type:     'Tipo di contratto',
  employment_status: 'Status occupazionale',
  other:             'Altro',
};

const DIMENSION_KEYS: WorkforceDimensionType[] = [
  'site', 'department', 'role_family', 'seniority_band', 'contract_type', 'employment_status',
];

const UPLOAD_STATUS_LABELS: Record<string, string> = {
  not_started:                 'Non avviato',
  uploaded:                    'Caricato',
  validated:                   'Validato',
  needs_review:                'Richiede revisione',
  below_company_threshold:     'Sotto soglia aziendale',
  privacy_suppression_required:'Soppressione privacy richiesta',
  ready_for_aggregation:       'Pronto per aggregazione',
};

const UPLOAD_STATUS_COLORS: Record<string, string> = {
  not_started:                  'border-slate-200 bg-slate-50 text-slate-500',
  uploaded:                     'border-blue-200 bg-blue-50 text-blue-700',
  validated:                    'border-green-200 bg-green-50 text-green-700',
  needs_review:                 'border-amber-200 bg-amber-50 text-amber-700',
  below_company_threshold:      'border-red-200 bg-red-50 text-red-700',
  privacy_suppression_required: 'border-amber-200 bg-amber-50 text-amber-700',
  ready_for_aggregation:        'border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold',
};

const READINESS_ICON: Record<string, string> = {
  high:   '●',
  medium: '◑',
  low:    '○',
};
const READINESS_COLOR: Record<string, string> = {
  high:   'text-emerald-600',
  medium: 'text-amber-600',
  low:    'text-red-500',
};

const PIPELINE_STATUS_COLORS: Record<string, string> = {
  active:      'border-green-200 bg-green-50 text-green-700',
  pending:     'border-amber-200 bg-amber-50 text-amber-700',
  not_started: 'border-slate-100 bg-slate-50 text-slate-400',
};

// ── Sub-components ───────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function StatCard({
  label, value, unit, note, highlight,
}: {
  label: string; value: string | number; unit?: string; note?: string; highlight?: 'ok' | 'warn' | 'error';
}) {
  const border = highlight === 'ok' ? 'border-green-200' : highlight === 'warn' ? 'border-amber-200' : highlight === 'error' ? 'border-red-200' : 'border-slate-200';
  return (
    <div className={cn('rounded-lg border bg-white p-4', border)}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">
        {value}{unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
      </p>
      {note && <p className="mt-1 text-[11px] text-slate-400 leading-snug">{note}</p>}
    </div>
  );
}

function GroupRow({ group }: { group: WorkforceAggregateGroup }) {
  return (
    <div className={cn(
      'flex items-center gap-3 border-b border-slate-50 py-2 last:border-0',
      !group.included_in_breakdown && 'opacity-50',
    )}>
      <span className="flex-1 text-xs text-slate-700">{group.dimension_label}</span>
      <span className="w-10 shrink-0 text-right text-xs font-mono text-slate-600">{group.employee_count}</span>
      <span className="w-14 shrink-0 text-right text-[11px] text-slate-400">
        {(group.share_of_workforce * 100).toFixed(1)}%
      </span>
      <span className="w-16 shrink-0 text-right text-[11px] text-slate-400">
        {(group.data_completeness * 100).toFixed(0)}% compl.
      </span>
      {group.included_in_breakdown ? (
        <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-600">visibile</span>
      ) : (
        <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500">soppresso</span>
      )}
    </div>
  );
}

function ReadinessRow({ label, ready, note }: { label: string; ready: boolean; note?: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-50 py-2.5 last:border-0">
      <span className={cn('shrink-0 text-sm font-semibold', ready ? 'text-green-600' : 'text-amber-500')}>
        {ready ? '✓' : '⚠'}
      </span>
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-700">{label}</p>
        {note && <p className="mt-0.5 text-[11px] text-slate-400">{note}</p>}
      </div>
      <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px]',
        ready ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700',
      )}>
        {ready ? 'Pronto' : 'Attenzione'}
      </span>
    </div>
  );
}

function BatchStatRow({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn('text-xs font-semibold font-mono', warn ? 'text-amber-600' : 'text-slate-700')}>{value}</span>
    </div>
  );
}

function UploadBatchPanel({ batch }: { batch: WorkforceBaselineUploadBatch }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">{batch.source_file_name}</p>
          <p className="mt-0.5 text-xs text-slate-400">{batch.uploaded_by} · {new Date(batch.uploaded_at).toLocaleDateString('it-IT')}</p>
        </div>
        <span className={cn('rounded border px-2 py-0.5 text-[10px]', UPLOAD_STATUS_COLORS[batch.upload_status])}>
          {UPLOAD_STATUS_LABELS[batch.upload_status] ?? batch.upload_status}
        </span>
      </div>
      <div className="rounded-lg border border-slate-100 px-4 py-1">
        <BatchStatRow label="Righe totali" value={batch.total_rows} />
        <BatchStatRow label="Righe valide" value={batch.valid_rows} />
        <BatchStatRow label="Righe non valide" value={batch.invalid_rows} warn={batch.invalid_rows > 0} />
        <BatchStatRow label="Duplicati rimossi" value={batch.duplicate_rows} warn={batch.duplicate_rows > 0} />
        <BatchStatRow label="Tipo fonte" value={batch.source_type.replace(/_/g, ' ')} />
      </div>
      {batch.missing_fields.length > 0 && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-800">Campi mancanti</p>
          {batch.missing_fields.map((f, i) => (
            <p key={i} className="mt-0.5 text-[11px] text-amber-700">· {f}</p>
          ))}
        </div>
      )}
      {batch.validation_warnings.length > 0 && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">Avvisi di validazione</p>
          {batch.validation_warnings.map((w, i) => (
            <p key={i} className="mt-0.5 text-[11px] text-slate-500">· {w}</p>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-400 italic">
        Upload demo — backend reale CSV/Excel in attesa di produzione.
      </p>
    </div>
  );
}

function ReadinessPanel({ readiness }: { readiness: WorkforceBaselineReadiness }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-100 px-4 py-1">
        <ReadinessRow label="Activation Reach" ready={readiness.activation_reach_ready} note="Organico ≥30 e completezza baseline ≥70%" />
        <ReadinessRow label="Distribution & Equity" ready={readiness.distribution_equity_ready} note="Almeno una dimensione con gruppi visibili, privacy-safe" />
        <ReadinessRow label="Breakdown per sede" ready={readiness.site_breakdown_ready} note="Tutti i siti visibili soddisfano N≥10" />
        <ReadinessRow label="Breakdown dipartimentale" ready={readiness.department_breakdown_ready} note="Almeno alcuni dipartimenti visibili, soppressi flaggati" />
        <ReadinessRow label="Breakdown famiglie professionali" ready={readiness.role_family_breakdown_ready} note="Almeno alcune famiglie visibili" />
        <ReadinessRow label="Vista aziendale privacy-safe" ready={readiness.privacy_safe_for_company_view} note="Nessun gruppo sotto soglia incluso come visibile" />
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
        <span className={cn('text-base', READINESS_COLOR[readiness.confidence_contribution])}>
          {READINESS_ICON[readiness.confidence_contribution]}
        </span>
        <div>
          <p className="text-xs font-medium text-slate-700">
            Contributo al Confidence Score: <span className={cn('capitalize', READINESS_COLOR[readiness.confidence_contribution])}>{readiness.confidence_contribution}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Basato su completezza, righe non valide, campi mancanti, livello di soppressione.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-xs font-semibold text-blue-800">Prossima azione consigliata</p>
        <p className="mt-0.5 text-xs text-blue-700">{readiness.next_action}</p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────────

export default function WorkforceBaselinePage() {
  const companies = workforceBaselineService.getAvailableWorkforceBaselines();
  const [selectedId, setSelectedId] = useState<string>(companies[0]?.company_id ?? '');
  const [activeDimension, setActiveDimension] = useState<WorkforceDimensionType>('site');

  const record = workforceBaselineService.getWorkforceBaseline(selectedId);
  const batch = workforceBaselineService.getUploadBatch(selectedId);
  const validation = workforceBaselineService.validateWorkforceBaseline(selectedId);
  const readiness = workforceBaselineService.getWorkforceBaselineReadiness(selectedId);
  const visibleGroups = workforceBaselineService.getVisibleGroups(selectedId);
  const suppressedGroups = workforceBaselineService.getSuppressedGroups(selectedId);
  const dimensionGroups = workforceBaselineService.getGroupsByDimension(selectedId, activeDimension);
  const pipelineLinks = workforceBaselineService.getWorkforcePipelineLinks(selectedId);
  const isThresholdMet = workforceBaselineService.isCompanyThresholdMet(selectedId);
  const isPrivacySafe = workforceBaselineService.isPrivacySafeForCompanyView(selectedId);

  if (!record || !batch || !validation || !readiness) {
    return <div className="p-8 text-sm text-slate-500">Azienda non trovata.</div>;
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl">

      {/* ── A: Header ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">KORA Workforce Baseline</h1>
            <p className="mt-1 text-sm text-slate-500">
              Validazione aggregata della popolazione aziendale per reach, distribuzione, equità e soglie privacy.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-700">
              KORA misura l&apos;organizzazione, non gli individui.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              Foundation Light
            </span>
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              pre_empirical_calibration
            </span>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400">
              synthetic_demo_data · production_ready: false
            </span>
          </div>
        </div>
      </div>

      {/* ── B: Company Selector ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Seleziona Azienda"
          subtitle="Esplora la baseline di un'azienda demo. Alba Manufacturing mostra l'applicazione della soglia privacy N<10."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {companies.map((c) => {
            const v = c.validation_result;
            return (
              <button
                key={c.company_id}
                onClick={() => setSelectedId(c.company_id)}
                className={cn(
                  'rounded-lg border p-4 text-left transition-colors',
                  selectedId === c.company_id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300',
                )}
              >
                <p className="text-sm font-semibold text-slate-800">{c.company_name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {v.total_workers} lavoratori · {v.visible_groups} gruppi visibili · {v.suppressed_groups} soppressi
                </p>
                <span className={cn('mt-2 inline-block rounded border px-1.5 py-0.5 text-[10px]', UPLOAD_STATUS_COLORS[v.readiness_status])}>
                  {UPLOAD_STATUS_LABELS[v.readiness_status] ?? v.readiness_status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── C: Baseline Summary Cards ────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader title="Riepilogo Baseline" subtitle={record.company_name} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Totale lavoratori"
            value={validation.total_workers}
            highlight={isThresholdMet ? 'ok' : 'error'}
            note={isThresholdMet ? 'Soglia N≥30 soddisfatta' : 'Sotto soglia N=30'}
          />
          <StatCard
            label="Gruppi visibili"
            value={validation.visible_groups}
            note={`su ${validation.total_groups} totali`}
          />
          <StatCard
            label="Gruppi soppressi"
            value={validation.suppressed_groups}
            highlight={validation.suppressed_groups > 0 ? 'warn' : 'ok'}
            note={validation.suppressed_groups > 0 ? 'N<10 — privacy protetta' : 'Nessuna soppressione'}
          />
          <StatCard
            label="Completezza baseline"
            value={`${(validation.baseline_completeness_score * 100).toFixed(0)}%`}
            highlight={validation.baseline_completeness_score >= 0.9 ? 'ok' : validation.baseline_completeness_score >= 0.7 ? 'warn' : 'error'}
          />
          <StatCard
            label="Vista aziendale"
            value={isPrivacySafe ? 'Privacy-safe' : 'Revisione richiesta'}
            highlight={isPrivacySafe ? 'ok' : 'warn'}
          />
          <StatCard
            label="Contributo CS"
            value={readiness.confidence_contribution}
            highlight={readiness.confidence_contribution === 'high' ? 'ok' : readiness.confidence_contribution === 'medium' ? 'warn' : 'error'}
          />
          <StatCard
            label="Tasso duplicati"
            value={`${(validation.duplicate_rate * 100).toFixed(1)}%`}
            highlight={validation.duplicate_rate < 0.01 ? 'ok' : 'warn'}
          />
          <StatCard
            label="Tasso righe non valide"
            value={`${(validation.invalid_row_rate * 100).toFixed(1)}%`}
            highlight={validation.invalid_row_rate < 0.01 ? 'ok' : 'warn'}
          />
        </div>
        {validation.warnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-1">
            {validation.warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-amber-700">⚠ {w}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── D: Upload Simulation Panel ───────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Upload Batch"
          subtitle="Simulazione caricamento dati workforce. Nessun file reale elaborato in Foundation Light."
        />
        <UploadBatchPanel batch={batch} />
      </div>

      {/* ── E: Privacy Threshold Panel ───────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Soglie Privacy"
          subtitle="Regole di aggregazione e soppressione applicate alla baseline."
        />
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-semibold text-green-800">Soglia aziendale minima</p>
              <p className="mt-1 text-2xl font-bold text-green-700">N ≥ 30</p>
              <p className="mt-1 text-[11px] text-green-600">
                L&apos;azienda deve avere almeno 30 lavoratori per accedere a Foundation Light.
                {isThresholdMet
                  ? ` ${record.company_name}: ${validation.total_workers} lavoratori — ✓ soddisfatta.`
                  : ` ${record.company_name}: ${validation.total_workers} lavoratori — ✗ non soddisfatta.`
                }
              </p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-800">Soglia privacy cluster</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">N ≥ 10</p>
              <p className="mt-1 text-[11px] text-blue-600">
                Soglia privacy: i cluster sotto N=10 non vengono mostrati singolarmente.
                Aggregati o soppressi per prevenire la re-identificazione.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-1.5 text-[11px] text-slate-500">
            <p>· Un cluster sotto N=10 non viene incluso nel breakdown aziendale come gruppo autonomo.</p>
            <p>· Il suo contributo è visibile solo nell&apos;aggregato totale dell&apos;azienda.</p>
            <p>· La soppressione non significa che quei lavoratori siano esclusi dal KORA Index aziendale.</p>
            <p>· KORA non espone Worker PIB individuali, dati sensibili individuali o ranking dei lavoratori.</p>
          </div>
        </div>
      </div>

      {/* ── F: Aggregate Breakdown by Dimension ──────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Breakdown Aggregato per Dimensione"
          subtitle="Solo gruppi con N≥10 sono inclusi nel breakdown. Workforce Baseline abilita letture aggregate di reach, distribuzione ed equità — non il monitoraggio individuale."
        />
        <div className="mb-4 flex flex-wrap gap-1.5">
          {DIMENSION_KEYS.map((dim) => {
            const groups = workforceBaselineService.getGroupsByDimension(selectedId, dim);
            if (groups.length === 0) return null;
            return (
              <button
                key={dim}
                onClick={() => setActiveDimension(dim)}
                className={cn(
                  'rounded-md border px-3 py-1 text-xs transition-colors',
                  activeDimension === dim
                    ? 'border-blue-300 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                )}
              >
                {DIMENSION_LABELS[dim]}
                <span className="ml-1.5 text-[10px] opacity-60">
                  ({groups.filter((g) => g.included_in_breakdown).length}/{groups.length})
                </span>
              </button>
            );
          })}
        </div>
        {dimensionGroups.length > 0 ? (
          <div className="rounded-lg border border-slate-100 px-4 py-1">
            <div className="flex items-center gap-3 border-b border-slate-100 py-1.5 mb-1">
              <span className="flex-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Gruppo</span>
              <span className="w-10 shrink-0 text-right text-[10px] font-medium text-slate-400">N</span>
              <span className="w-14 shrink-0 text-right text-[10px] font-medium text-slate-400">Quota</span>
              <span className="w-16 shrink-0 text-right text-[10px] font-medium text-slate-400">Completezza</span>
              <span className="w-16 shrink-0 text-[10px] font-medium text-slate-400">Visibilità</span>
            </div>
            {dimensionGroups.map((g) => <GroupRow key={g.group_id} group={g} />)}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Nessun gruppo disponibile per questa dimensione.</p>
        )}
        <p className="mt-2 text-[11px] text-slate-400">
          Visibili: {visibleGroups.filter((g) => g.dimension_type === activeDimension).length} · Soppressi: {suppressedGroups.filter((g) => g.dimension_type === activeDimension).length}
        </p>
      </div>

      {/* ── G: Suppressed Groups Panel ───────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Gruppi Soppressi"
          subtitle="Cluster con N<10 — non inclusi nel breakdown per privacy. Contribuiscono all'aggregato aziendale totale."
        />
        {suppressedGroups.length === 0 ? (
          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-700">✓ Nessun cluster soppresso</p>
            <p className="mt-0.5 text-xs text-green-600">Tutti i gruppi soddisfano la soglia privacy N≥10.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {suppressedGroups.map((g) => (
              <div key={g.group_id} className="rounded-lg border border-red-100 bg-red-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-red-800">{g.dimension_label}</p>
                    <p className="mt-0.5 text-[11px] text-red-600">
                      {DIMENSION_LABELS[g.dimension_type]} · N={g.employee_count} · {(g.share_of_workforce * 100).toFixed(1)}% della workforce
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600 font-medium">
                    N&lt;10
                  </span>
                </div>
                {g.suppression_reason && (
                  <p className="mt-1.5 text-[11px] text-red-500 italic">{g.suppression_reason}</p>
                )}
              </div>
            ))}
            <p className="text-[11px] text-slate-400 pt-1">
              {suppressedGroups.length} gruppo{suppressedGroups.length > 1 ? 'i' : ''} soppresso{suppressedGroups.length > 1 ? 'i' : ''} su {validation.total_groups} totali.
              La vista aggregata aziendale rimane privacy-safe.
            </p>
          </div>
        )}
      </div>

      {/* ── H: Readiness Panel ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Readiness per la Pipeline"
          subtitle="Cosa questa baseline abilita nelle fasi successive della pipeline KORA."
        />
        <ReadinessPanel readiness={readiness} />
        {validation.limitations.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1">
            <p className="text-[11px] font-medium text-slate-500">Limitazioni:</p>
            {validation.limitations.map((l, i) => (
              <p key={i} className="text-[11px] text-slate-400">· {l}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── I: Pipeline Impact ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Impatto sulla Pipeline"
          subtitle="Cosa questa baseline abiliterà nelle fasi future del KORA Index."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: 'Activation Reach (AR/MAR)', note: 'Quanti lavoratori hanno almeno un IU approvato nel periodo — requires baseline per calcolo accurato.' },
            { label: 'Distribution & Equity (WB/EQ)', note: 'Come l\'attivazione è distribuita tra siti, dipartimenti, fasce di seniority — richiede breakdown per cluster.' },
            { label: 'Cluster sotto-attivati', note: 'Identificazione di gruppi con attivazione inferiore alla media aziendale — solo per cluster visibili N≥10.' },
            { label: 'Confidence Score dinamico', note: 'La completezza baseline contribuirà al Confidence Score futuro — alta completezza = Confidence Score più affidabile.' },
            { label: 'Activation Safeguard dinamico', note: 'Activation Safeguard (CLEAR/WARNING/FLAGGED) userà AR/MAR calcolati sulla workforce baseline reale.' },
            { label: 'Decision Pack S1/S2', note: 'I scenari S1/S2 potranno confrontare diversi assetti di workforce baseline — dimensionamento futuro.' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">{item.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-800">
            Foundation Light non collega ancora questa baseline al KORA Index ufficiale.
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700">
            La connessione dinamica sarà abilitata dopo Gate 2 (CTO Review) e calibrazione empirica (Delphi Study).
          </p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pipelineLinks.filter((l) => l.stage !== '0-workforce-baseline').map((link) => (
            <div key={link.stage} className={cn('rounded-lg border px-3 py-2', PIPELINE_STATUS_COLORS[link.status])}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">{link.label}</p>
                <span className="text-[10px] capitalize opacity-70">{link.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="mt-0.5 text-[10px] opacity-60">{link.description}</p>
              {link.status === 'active' && (
                <a href={link.href} className="mt-1 inline-block text-[11px] font-medium underline underline-offset-2">
                  Apri →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── J: Privacy / Methodology Boundary ────────────────────── */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Confini privacy e metodologici</p>
        <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
          <p>
            <span className="font-medium text-slate-600">KORA misura l&apos;organizzazione, non gli individui.</span>{' '}
            La Workforce Baseline è uno strato aggregato. Nessun dato individuale è esposto.
          </p>
          <p>
            <span className="font-medium text-slate-600">KORA non espone Worker PIB individuali, dati sensibili individuali o ranking dei lavoratori.</span>{' '}
            PIB, IU e UEF sono intermedi obbligatori che non raggiungono mai la vista employer.
          </p>
          <p>
            <span className="font-medium text-slate-600">Soglia privacy: i cluster sotto N=10 non vengono mostrati singolarmente.</span>{' '}
            Aggregati o soppressi per prevenire la re-identificazione. Contribuiscono all&apos;aggregato aziendale totale.
          </p>
          <p>
            <span className="font-medium text-slate-600">Workforce Baseline abilita letture aggregate di reach, distribuzione ed equità — non il monitoraggio individuale.</span>{' '}
            Nessuna classificazione individuale, nessun ranking, nessuna sorveglianza.
          </p>
          <p>
            <span className="font-medium text-slate-600">Stato di calibrazione:</span>{' '}
            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">
              pre_empirical_calibration
            </span>{' '}
            — Metodologia KORA v0.1 · Foundation Light · {record.methodology_notes}
          </p>
        </div>
      </div>

    </div>
  );
}
