'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';
import type {
  CompanyOnboardingRecord,
  OnboardingReadinessCheck,
  WorkforceCluster,
  PipelineStageLink,
  HRKPIContextRecord,
} from '@/lib/types';

// ── Constants ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  not_started:                    'Non avviato',
  profile_complete:               'Profilo completato',
  workforce_baseline_complete:    'Baseline workforce completata',
  program_data_loaded:            'Dati programmi caricati',
  hr_kpi_added:                   'KPI HR aggiunti',
  readiness_check_passed:         'Controlli superati',
  pipeline_active:                'Pipeline attiva',
  decision_pack_ready:            'Decision Pack pronto',
  blocked_insufficient_workforce: 'Bloccato — organico insufficiente',
};

const STATUS_COLORS: Record<string, string> = {
  not_started:                    'bg-slate-100 text-slate-600',
  profile_complete:               'bg-blue-50 text-blue-700',
  workforce_baseline_complete:    'bg-blue-50 text-blue-700',
  program_data_loaded:            'bg-amber-50 text-amber-700',
  hr_kpi_added:                   'bg-amber-50 text-amber-700',
  readiness_check_passed:         'bg-green-50 text-green-700',
  pipeline_active:                'bg-green-50 text-green-700',
  decision_pack_ready:            'bg-emerald-50 text-emerald-700 font-semibold',
  blocked_insufficient_workforce: 'bg-red-50 text-red-700',
};

const PIPELINE_STEPS = [
  { key: '1-ingestion',    label: 'AI Ingestion' },
  { key: '2-uef-review',   label: 'UEF Review' },
  { key: '3-scoring',      label: 'Scoring' },
  { key: '4-decision-pack',label: 'Decision Pack' },
  { key: '5-kora-index',   label: 'KORA Index' },
];

const READINESS_COLORS: Record<string, string> = {
  ok:      'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
};

const READINESS_ICONS: Record<string, string> = {
  ok:      '✓',
  warning: '⚠',
  blocked: '✗',
};

const PIPELINE_STATUS_COLORS: Record<string, string> = {
  active:      'bg-green-50 text-green-700 border-green-200',
  pending:     'bg-amber-50 text-amber-700 border-amber-200',
  not_started: 'bg-slate-50 text-slate-400 border-slate-200',
};

const PIPELINE_STATUS_LABELS: Record<string, string> = {
  active:      'Attivo',
  pending:     'In preparazione',
  not_started: 'Non avviato',
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

function InfoCard({ label, value, unit, note }: { label: string; value: string | number; unit?: string; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">
        {value}{unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
      </p>
      {note && <p className="mt-1 text-[11px] text-slate-400 leading-snug">{note}</p>}
    </div>
  );
}

function CheckRow({ check }: { check: OnboardingReadinessCheck }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-3', READINESS_COLORS[check.status])}>
      <span className="shrink-0 text-sm font-bold">{READINESS_ICONS[check.status]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{check.label}</p>
        <p className="mt-0.5 text-[11px] opacity-80">{check.detail}</p>
      </div>
      {check.blocking && (
        <span className="shrink-0 rounded border border-current px-1.5 py-0.5 text-[10px] opacity-70">bloccante</span>
      )}
    </div>
  );
}

function ClusterRow({ cluster }: { cluster: WorkforceCluster }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-50 py-2 last:border-0">
      <span className="w-32 shrink-0 text-[11px] text-slate-400 capitalize">{cluster.cluster_type.replace(/_/g, ' ')}</span>
      <span className="flex-1 text-xs text-slate-700">{cluster.label}</span>
      <span className="w-10 shrink-0 text-right text-xs font-mono text-slate-600">{cluster.employee_count}</span>
      {cluster.privacy_threshold_met ? (
        <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-600">visibile</span>
      ) : (
        <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500">soppresso</span>
      )}
    </div>
  );
}

function PipelineLinkCard({ link }: { link: PipelineStageLink }) {
  return (
    <div className={cn('rounded-lg border p-4', PIPELINE_STATUS_COLORS[link.status])}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">{link.label}</p>
          <p className="mt-0.5 text-[11px] opacity-70">{link.description}</p>
        </div>
        <span className="shrink-0 rounded border border-current px-1.5 py-0.5 text-[10px]">
          {PIPELINE_STATUS_LABELS[link.status]}
        </span>
      </div>
      {link.status === 'active' && (
        <a href={link.href} className="mt-2 inline-block text-[11px] font-medium underline underline-offset-2">
          Apri →
        </a>
      )}
    </div>
  );
}

function KPIRow({ record }: { record: HRKPIContextRecord }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-50 py-2.5 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700">{record.label}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{record.interpretation}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-sm font-semibold font-mono text-slate-800">{record.value}</span>
        <span className="ml-1 text-[11px] text-slate-400">{record.unit}</span>
      </div>
      <span className="shrink-0 rounded bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-400 border border-slate-100">
        contesto
      </span>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────────

export default function OnboardingStudio() {
  const companies = companyOnboardingService.getOnboardingCompanies();
  const [selectedId, setSelectedId] = useState<string>(companies[0]?.company_id ?? '');

  const record: CompanyOnboardingRecord | null = companyOnboardingService.getCompanyOnboardingRecord(selectedId);
  const nextAction = companyOnboardingService.getNextBestAction(selectedId);
  const pipelineReadiness = companyOnboardingService.getPipelineReadiness(selectedId);
  const suppressedClusters = companyOnboardingService.getPrivacyThresholdWarnings(selectedId);

  if (!record) {
    return (
      <div className="p-8 text-sm text-slate-500">Azienda non trovata.</div>
    );
  }

  const { profile, workforce_baseline, program_data_summary, hr_kpi_context, readiness_checks, pipeline_links } = record;
  const isEligible = companyOnboardingService.isFoundationLightEligible(selectedId);

  return (
    <div className="space-y-8 p-6 max-w-5xl">

      {/* ── A: Header ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Onboarding Studio</h1>
            <p className="mt-1 text-sm text-slate-500">
              Configura la tua azienda per la pipeline KORA. KORA misura l&apos;organizzazione, non gli individui.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              pre_empirical_calibration
            </span>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400">
              synthetic_demo_data
            </span>
          </div>
        </div>
      </div>

      {/* ── B: Pipeline Stepper ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Pipeline KORA</p>
        <div className="flex items-center gap-0">
          {PIPELINE_STEPS.map((step, i) => {
            const link = pipeline_links.find((l) => l.stage === step.key);
            const isActive = link?.status === 'active';
            return (
              <div key={step.key} className="flex items-center">
                <div className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs',
                  isActive
                    ? 'border-green-200 bg-green-50 text-green-700 font-medium'
                    : 'border-slate-100 bg-slate-50 text-slate-400',
                )}>
                  <span className="text-[10px] font-mono">{i + 1}</span>
                  <span>{step.label}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="h-px w-4 bg-slate-200 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── C: Company Selector ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Seleziona Azienda"
          subtitle="Cambia azienda demo per esplorare scenari diversi di onboarding."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {companies.map((c) => (
            <button
              key={c.company_id}
              onClick={() => setSelectedId(c.company_id)}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                selectedId === c.company_id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <p className="text-sm font-semibold text-slate-800">{c.company_name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{c.profile.employee_count} lavoratori · {c.profile.sector}</p>
              <span className={cn('mt-2 inline-block rounded px-1.5 py-0.5 text-[10px]', STATUS_COLORS[c.onboarding_status])}>
                {STATUS_LABELS[c.onboarding_status] ?? c.onboarding_status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── D: Company Profile ────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader title="Profilo Aziendale" subtitle={profile.company_name} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InfoCard label="Forma giuridica" value={profile.legal_form} />
          <InfoCard label="Settore" value={profile.sector} />
          <InfoCard label="Sede principale" value={profile.location} />
          <InfoCard label="Anno fondazione" value={profile.foundation_year} />
          <InfoCard label="Organico totale" value={profile.employee_count} unit="lavoratori" />
          <InfoCard label="Ruolo referente" value={profile.contact_role} />
        </div>
      </div>

      {/* ── E: Foundation Light Eligibility ──────────────────────── */}
      <div className={cn(
        'rounded-xl border p-5',
        isEligible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
      )}>
        <div className="flex items-start gap-3">
          <span className={cn('text-xl', isEligible ? 'text-green-600' : 'text-red-500')}>
            {isEligible ? '✓' : '✗'}
          </span>
          <div>
            <p className={cn('text-sm font-semibold', isEligible ? 'text-green-800' : 'text-red-800')}>
              Foundation Light {isEligible ? 'Abilitato' : 'Non abilitato'}
            </p>
            <p className={cn('mt-0.5 text-xs', isEligible ? 'text-green-700' : 'text-red-700')}>
              {workforce_baseline.eligibility_note}
            </p>
            {!isEligible && (
              <p className="mt-2 text-xs text-red-600">
                Requisito minimo: 30 lavoratori per garantire la soglia privacy N≥10 nei cluster.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── F: Workforce Baseline ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Baseline Workforce"
          subtitle="Organico per sito e cluster. Cluster con N<10 soppressi per privacy."
        />
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoCard label="Totale lavoratori" value={workforce_baseline.total_employees} />
          <InfoCard label="Siti" value={workforce_baseline.sites.length} />
          <InfoCard label="Cluster totali" value={workforce_baseline.clusters.length} />
          <InfoCard
            label="Cluster soppressi"
            value={workforce_baseline.suppressed_cluster_count}
            note={workforce_baseline.suppressed_cluster_count > 0 ? 'N<10 — non inclusi nel breakdown' : undefined}
          />
        </div>

        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-slate-600">Siti</p>
          <div className="rounded-lg border border-slate-100 divide-y divide-slate-50">
            {workforce_baseline.sites.map((site) => (
              <div key={site.site_id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-xs text-slate-700">{site.name}</span>
                <span className="text-xs text-slate-500">{site.location}</span>
                <span className="w-12 text-right text-xs font-mono text-slate-600">{site.employee_count}</span>
                <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-600">visibile</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-600">Cluster</p>
          <div className="rounded-lg border border-slate-100 px-4 py-1">
            {workforce_baseline.clusters.map((cluster) => (
              <ClusterRow key={cluster.cluster_id} cluster={cluster} />
            ))}
          </div>
        </div>

        {suppressedClusters.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">
              {suppressedClusters.length} cluster soppresso{suppressedClusters.length > 1 ? 'i' : ''} per privacy (N&lt;10)
            </p>
            <p className="mt-0.5 text-[11px] text-amber-700">{workforce_baseline.suppression_note}</p>
          </div>
        )}
      </div>

      {/* ── G: Raw Program Data ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Dati Programmi"
          subtitle={`Welfare, formazione e iniziative collettive — periodo ${program_data_summary.period}`}
        />
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InfoCard label="Programmi totali" value={program_data_summary.total_programs} />
          <InfoCard label="Welfare" value={program_data_summary.welfare_programs} />
          <InfoCard label="Formazione" value={program_data_summary.training_programs} />
          <InfoCard label="Volontariato" value={program_data_summary.volunteering_programs} />
          <InfoCard label="Collettivi" value={program_data_summary.collective_programs} />
          <InfoCard
            label="Budget totale"
            value={`€${program_data_summary.total_budget_eur.toLocaleString('it-IT')}`}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
          <div>
            <p className="text-xs text-slate-600">
              Fonti: {program_data_summary.data_sources.join(', ')}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{program_data_summary.upload_note}</p>
          </div>
          <span className={cn(
            'rounded border px-2 py-0.5 text-[10px] font-medium',
            program_data_summary.upload_status === 'loaded'
              ? 'border-green-200 bg-green-50 text-green-700'
              : program_data_summary.upload_status === 'partial'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-white text-slate-400',
          )}>
            {program_data_summary.upload_status === 'loaded' ? 'Completo'
              : program_data_summary.upload_status === 'partial' ? 'Parziale'
              : 'Non avviato'}
          </span>
        </div>
      </div>

      {/* ── H: HR KPI Context ─────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="KPI HR — Contesto"
          subtitle="Indicatori di contesto. Non entrano nel calcolo del KORA Index."
        />
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5">
          <p className="text-xs font-medium text-blue-800">Correlazione ≠ causalità</p>
          <p className="mt-0.5 text-[11px] text-blue-600">
            I KPI HR sono utilizzati come contesto interpretativo e non come componenti dirette del KORA Index.
          </p>
          <p className="mt-0.5 text-[11px] text-blue-600">{hr_kpi_context.correlation_disclaimer}</p>
        </div>
        <div className="rounded-lg border border-slate-100 px-4 py-1">
          {hr_kpi_context.records.map((kpi) => (
            <KPIRow key={kpi.kpi_id} record={kpi} />
          ))}
        </div>
      </div>

      {/* ── I: Readiness Checklist ────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Controlli di Prontezza"
          subtitle="Tutti i check bloccanti devono essere superati prima di avviare la pipeline."
        />
        <div className="space-y-2">
          {readiness_checks.map((check) => (
            <CheckRow key={check.check_id} check={check} />
          ))}
        </div>
        {pipelineReadiness.blocking_checks.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-800">Pipeline bloccata</p>
            <p className="mt-0.5 text-[11px] text-red-700">
              {pipelineReadiness.blocking_checks.length} check bloccante{pipelineReadiness.blocking_checks.length > 1 ? 'i' : ''} non superato{pipelineReadiness.blocking_checks.length > 1 ? 'i' : ''}.
              Risolvi prima di procedere.
            </p>
          </div>
        )}
      </div>

      {/* ── J: Next Best Action ───────────────────────────────────── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Prossima azione consigliata</p>
        <p className="text-sm font-semibold text-blue-900">{nextAction.action}</p>
        {nextAction.detail && (
          <p className="mt-1 text-xs text-blue-700">{nextAction.detail}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className={cn('rounded px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[record.onboarding_status])}>
            {STATUS_LABELS[record.onboarding_status] ?? record.onboarding_status}
          </span>
        </div>
      </div>

      {/* ── K: Pipeline Links ─────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SectionHeader
          title="Fasi della Pipeline"
          subtitle="Naviga alle fasi downstream della pipeline KORA."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pipeline_links.map((link) => (
            <PipelineLinkCard key={link.stage} link={link} />
          ))}
        </div>
      </div>

      {/* ── L: Methodology & Privacy Boundary ────────────────────── */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Confini metodologici e privacy</p>
        <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
          <p>
            <span className="font-medium text-slate-600">KORA misura l&apos;organizzazione, non gli individui.</span>{' '}
            Il KORA Index è un output aggregato a livello aziendale. I dati individuali (PIB, IU, UEF) sono
            intermedi obbligatori — mai esposti a ruoli employer.
          </p>
          <p>
            <span className="font-medium text-slate-600">Soglia privacy N≥10.</span>{' '}
            Cluster con meno di 10 lavoratori vengono soppressi automaticamente per prevenire la re-identificazione.
            L&apos;analisi per cluster è disponibile solo per gruppi che superano la soglia.
          </p>
          <p>
            <span className="font-medium text-slate-600">KPI HR — solo contesto.</span>{' '}
            I KPI HR (turnover, assenteismo, engagement) sono indicatori di contesto per interpretare il KORA Index.
            Non entrano nel calcolo. Correlazione ≠ causalità.
          </p>
          <p>
            <span className="font-medium text-slate-600">Demo-safe oggi. Production-oriented domani.</span>{' '}
            Foundation Light v0.1 opera su dati sintetici. La calibrazione empirica (Delphi Study) è post-pilota.
            Tutti i pesi sono provvisori (v0.1). I risultati non devono essere usati per decision-making certificato.
          </p>
          <p>
            <span className="font-medium text-slate-600">Stato di calibrazione:</span>{' '}
            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">
              pre_empirical_calibration
            </span>{' '}
            — Metodologia KORA v0.1 · Foundation Light.
          </p>
        </div>
      </div>

    </div>
  );
}
