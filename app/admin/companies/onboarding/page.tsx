'use client';
// A-01c: Company Onboarding Studio — revisione readiness onboarding.
// Scopo: controllare e avanzare l'onboarding di una company assegnata,
//        verificando ogni step (dati, UEF, scoring, Decision Pack).

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DemoFlowBanner } from '@/components/admin/DemoFlowBanner';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';
import type { OnboardingReadinessCheck } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  not_started:                    'Non avviato',
  profile_complete:               'Profilo completato',
  workforce_baseline_complete:    'Baseline workforce completata',
  program_data_loaded:            'Dati programmi caricati',
  hr_kpi_loaded:                  'HR KPI caricati',
  ready_for_scoring:              'Pronto per scoring',
  fully_onboarded:                'Completamente onboardato',
};

const STATUS_COLORS: Record<string, string> = {
  not_started:                  'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]',
  profile_complete:             'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  workforce_baseline_complete:  'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  program_data_loaded:          'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]',
  hr_kpi_loaded:                'bg-[rgba(107,122,146,0.10)] text-[#344256] border-[rgba(107,122,146,0.22)]',
  ready_for_scoring:            'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  fully_onboarded:              'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
};

function ReadinessCheck({ check }: { check: OnboardingReadinessCheck }) {
  const isOk = check.status === 'ok';
  const isBlocking = check.blocking && !isOk;
  return (
    <div className={cn('rounded-md border p-3', isOk ? 'border-[rgba(47,125,85,0.22)] bg-green-50' : isBlocking ? 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)]' : 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]')}>
      <div className="flex items-start gap-2">
        <span className={cn('text-xs font-bold shrink-0', isOk ? 'text-green-600' : isBlocking ? 'text-[rgba(158,59,47,0.90)]' : 'text-[#D99A2B]')}>
          {isOk ? '✓' : isBlocking ? '✕' : '!'}
        </span>
        <div>
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)]">{check.label}</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-0.5">{check.detail}</p>
          {isBlocking && (
            <span className="text-[9px] font-semibold text-[rgba(158,59,47,0.90)] uppercase tracking-wide">Bloccante</span>
          )}
        </div>
      </div>
    </div>
  );
}

// A-17: KORA Admin — Company Onboarding Studio
export default function AdminOnboardingStudio() {
  const companies = companyOnboardingService.getOnboardingCompanies();
  const [selectedId, setSelectedId] = useState<string>(companies[0]?.company_id ?? '');

  const record = companyOnboardingService.getCompanyOnboardingRecord(selectedId);
  const nextAction = companyOnboardingService.getNextBestAction(selectedId);
  const pipelineReadiness = companyOnboardingService.getPipelineReadiness(selectedId);
  const suppressedClusters = companyOnboardingService.getPrivacyThresholdWarnings(selectedId);
  const isEligible = companyOnboardingService.isFoundationLightEligible(selectedId);

  if (!record) return <div className="p-8 text-sm text-[rgba(6,3,43,0.52)]">Azienda non trovata.</div>;

  const { profile, workforce_baseline, program_data_summary, readiness_checks, pipeline_links } = record;

  return (
    <div className="space-y-8 max-w-5xl">

      <DemoFlowBanner
        title="Synthetic Demo Flow — Dati sintetici Meridiana"
        description="Questo flusso mostra dati demo sintetici. Non modifica alcun tenant live. Per l'onboarding reale usa il flusso Crea Azienda."
        canonicalHref="/admin/companies/new"
        canonicalLabel="Crea Azienda (live)"
      />

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          KORA Admin — Onboarding Azienda Cliente
        </p>
        <h1 className="text-xl font-bold text-[#06032B] mt-0.5">Company Onboarding Studio</h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">
          Gestione onboarding, validazione dati e pipeline readiness per l&apos;azienda cliente.
        </p>
      </div>

      {/* ── Admin identity ── */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-4 py-3 text-xs text-[rgba(6,3,43,0.88)] leading-relaxed space-y-1">
        <p>
          <span className="font-semibold">KORA Admin — gestione azienda cliente.</span>{' '}
          Questa sezione è riservata agli operatori KORA.
        </p>
        <p>Il cliente azienda non vede questa console tecnica.</p>
      </div>

      {/* ── Company selector ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.62)] uppercase tracking-widest">Seleziona Azienda Cliente</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {companies.map((c) => (
            <button
              key={c.company_id}
              onClick={() => setSelectedId(c.company_id)}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                selectedId === c.company_id ? 'border-[rgba(6,3,43,0.14)] bg-[rgba(199,111,61,0.08)]' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] hover:border-[rgba(6,3,43,0.14)]',
              )}
            >
              <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{c.company_name}</p>
              <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">{c.profile.employee_count} lavoratori · {c.profile.sector}</p>
              <span className={cn('mt-2 inline-block rounded border px-1.5 py-0.5 text-[10px]', STATUS_COLORS[c.onboarding_status] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)]')}>
                {STATUS_LABELS[c.onboarding_status] ?? c.onboarding_status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Foundation Light eligibility ── */}
      <div className={cn('rounded-xl border p-5', isEligible ? 'border-[rgba(47,125,85,0.22)] bg-green-50' : 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)]')}>
        <div className="flex items-center gap-2">
          <span className={cn('text-lg font-bold', isEligible ? 'text-green-700' : 'text-[#9E3B2F]')}>
            {isEligible ? '✓' : '✕'}
          </span>
          <p className={cn('text-sm font-semibold', isEligible ? 'text-[#2F7D55]' : 'text-[#9E3B2F]')}>
            {isEligible ? 'Idonea Foundation Light' : 'Non idonea Foundation Light'}
          </p>
        </div>
        {!isEligible && (
          <p className="text-xs text-[#9E3B2F] mt-1">
            Foundation Light richiede almeno 30 lavoratori. Verificare il workforce baseline.
          </p>
        )}
        {suppressedClusters.length > 0 && (
          <p className="text-xs text-[#8A5A00] mt-2">
            {suppressedClusters.length} cluster sotto soglia privacy (&lt; 10 lavoratori) — soppressi.
          </p>
        )}
      </div>

      {/* ── Company profile ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Profilo Azienda Cliente</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ['Forma giuridica', profile.legal_form],
            ['Settore', profile.sector],
            ['Sede principale', profile.location],
            ['Anno fondazione', profile.foundation_year],
            ['Organico totale', `${profile.employee_count} lavoratori`],
            ['Ruolo referente', profile.contact_role],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-xs text-[rgba(6,3,43,0.78)] mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Workforce baseline summary ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Workforce Baseline</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ['Totale lavoratori', workforce_baseline.total_employees],
            ['Threshold N≥30', workforce_baseline.foundation_light_eligible ? '✓ Soddisfatta' : '✕ Non soddisfatta'],
            ['Cluster soppressi', workforce_baseline.suppressed_cluster_count],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{label}</p>
              <p className="text-xs text-[rgba(6,3,43,0.78)] font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[rgba(6,3,43,0.40)] leading-relaxed">{workforce_baseline.eligibility_note}</p>
        <Link href="/admin/companies/workforce-baseline" className="text-xs font-semibold text-[#C76F3D] hover:underline">
          Apri Workforce Baseline →
        </Link>
      </div>

      {/* ── Program data summary ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Dati Programma</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ['Programmi totali', program_data_summary.total_programs],
            ['Budget welfare (€)', program_data_summary.welfare_budget_eur.toLocaleString('it-IT')],
            ['Budget formazione (€)', program_data_summary.training_budget_eur.toLocaleString('it-IT')],
            ['Stato upload', program_data_summary.upload_status],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{label}</p>
              <p className="text-xs text-[rgba(6,3,43,0.78)] font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Readiness checks ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">Pipeline Readiness</p>
          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold',
            pipelineReadiness.status === 'ok' ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]' :
            pipelineReadiness.status === 'warning' ? 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]' :
            'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',
          )}>
            {pipelineReadiness.status.toUpperCase()}
          </span>
        </div>
        {pipelineReadiness.blocking_checks.length > 0 && (
          <p className="text-xs text-[rgba(158,59,47,0.90)]">
            {pipelineReadiness.blocking_checks.length} check bloccante{pipelineReadiness.blocking_checks.length > 1 ? 'i' : ''} non superato{pipelineReadiness.blocking_checks.length > 1 ? 'i' : ''}.
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {readiness_checks.map((check) => (
            <ReadinessCheck key={check.check_id} check={check} />
          ))}
        </div>
      </div>

      {/* ── Next action ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">Next Best Action — KORA Admin</p>
        <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{nextAction.action}</p>
        <p className="text-xs text-[rgba(6,3,43,0.52)]">{nextAction.detail}</p>
      </div>

      {/* ── Pipeline links ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Pipeline KORA — Fasi Operative</p>
        <div className="space-y-2">
          {pipeline_links.map((link) => (
            <div key={link.stage} className={cn('flex items-center justify-between gap-2 rounded p-2',
              link.status === 'active' ? 'bg-[rgba(199,111,61,0.08)]' : 'bg-[rgba(6,3,43,0.03)]'
            )}>
              <div>
                <p className={cn('text-xs font-semibold',
                  link.status === 'active' ? 'text-[rgba(6,3,43,0.72)]' : 'text-[rgba(6,3,43,0.52)]'
                )}>
                  {link.label}
                </p>
                <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{link.description}</p>
              </div>
              <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold shrink-0',
                link.status === 'active' ? 'border-[rgba(199,111,61,0.22)] bg-[#F8F6F1] text-[rgba(6,3,43,0.72)]' :
                'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.40)]',
              )}>
                {link.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="border-t border-[rgba(6,3,43,0.05)] pt-4 flex items-center gap-4 flex-wrap">
        <Link href="/admin/companies" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          ← Company Registry
        </Link>
        <Link href="/admin/companies/setup" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          Company Setup
        </Link>
        <Link href="/admin/companies/workforce-baseline" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          Workforce Baseline →
        </Link>
      </div>

    </div>
  );
}
