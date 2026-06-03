'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { tenantService } from '@/services/tenant/TenantService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import type { CompanyRawDataRow } from '@/lib/types';

type RowFilter = 'all' | 'eligible' | 'limited' | 'blocked' | 'structural_policy' | 'review_required' | 'missing_fields' | 'ready';

const FILTER_LABELS: Record<RowFilter, string> = {
  all:             'Tutte',
  ready:           'Pronte ingestion',
  eligible:        'Candidate eligible',
  limited:         'Candidate limited',
  blocked:         'Bloccate',
  structural_policy: 'Policy strutturali',
  review_required: 'Review required',
  missing_fields:  'Campi mancanti',
};

const ELIGIBILITY_BADGE: Record<string, string> = {
  eligible:        'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',
  limited:         'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700',
  blocked:         'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',
  review_required: 'border-blue-200 bg-blue-50 text-blue-700',
  structural_policy: 'border-violet-200 bg-violet-50 text-violet-700',
};

const PERIMETER_LABELS: Record<string, string> = {
  welfare:               'Welfare',
  fringe_benefit:        'Fringe benefit',
  people_esg:            'People / ESG',
  training:              'Formazione',
  territorial_community: 'Territorio',
  pension_future:        'Previdenza',
  compliance_excluded:   'Compliance',
  unknown:               'Non definito',
};

const PERIMETER_DEPTH_COLOR: Record<string, string> = {
  high:   'text-[rgba(47,125,85,0.90)]',
  medium: 'text-blue-600',
  low:    'text-amber-600',
  none:   'text-[rgba(6,3,43,0.40)]',
};

const INTAKE_STATUS_LABELS: Record<string, string> = {
  not_started:                 'Non avviato',
  draft:                       'Bozza',
  partial:                     'Parziale',
  validation_required:         'Validazione richiesta',
  ready_for_ingestion:         'Pronto per ingestion',
  blocked_missing_required_fields: 'Bloccato — campi mancanti',
};

const INTAKE_STATUS_COLORS: Record<string, string> = {
  not_started:                 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]',
  draft:                       'border-blue-200 bg-blue-50 text-blue-700',
  partial:                     'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700',
  validation_required:         'border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]',
  ready_for_ingestion:         'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',
  blocked_missing_required_fields: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',
};

// A-20: KORA Admin — Tenant-Scoped Data Intake & Fiscal Perimeter
export default function AdminDataIntakePage({ params }: { params: { companyId: string } }) {
  const { companyId } = params;
  const [activeFilter, setActiveFilter] = useState<RowFilter>('all');

  const tenant       = tenantService.getTenant(companyId);
  const plan         = companyDataIntakeService.getBudgetFiscalPlan(companyId);
  const batches      = companyDataIntakeService.getRawDataBatches(companyId);
  const summary      = companyDataIntakeService.getDataReadinessSummary(companyId);
  const pipelineLinks = companyDataIntakeService.getPipelineLinks(companyId);
  const hasKoraData  = !!scoringSimulatorService.getKoraIndexOutput(companyId, 'S1');

  const allRows        = companyDataIntakeService.getRawDataRows(companyId);
  const eligible       = companyDataIntakeService.getEligibleCandidates(companyId);
  const limited        = companyDataIntakeService.getLimitedCandidates(companyId);
  const blocked        = companyDataIntakeService.getBlockedCandidates(companyId);
  const structural     = companyDataIntakeService.getStructuralPolicyRows(companyId);
  const reviewRequired = companyDataIntakeService.getReviewRequiredRows(companyId);
  const missingFields  = companyDataIntakeService.getRowsWithMissingFields(companyId);
  const readyRows      = companyDataIntakeService.getRowsReadyForIngestion(companyId);

  const visibleRows: CompanyRawDataRow[] = (() => {
    switch (activeFilter) {
      case 'eligible':         return eligible;
      case 'limited':          return limited;
      case 'blocked':          return blocked;
      case 'structural_policy': return structural;
      case 'review_required':  return reviewRequired;
      case 'missing_fields':   return missingFields;
      case 'ready':            return readyRows;
      default:                 return allRows;
    }
  })();

  const filterCounts: Record<RowFilter, number> = {
    all:              allRows.length,
    ready:            readyRows.length,
    eligible:         eligible.length,
    limited:          limited.length,
    blocked:          blocked.length,
    structural_policy: structural.length,
    review_required:  reviewRequired.length,
    missing_fields:   missingFields.length,
  };

  return (
    <div className="space-y-8 max-w-6xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          KORA Admin — Data Intake & Fiscal Perimeter
        </p>
        <h1 className="text-xl font-bold text-[#06032B] mt-0.5">
          {tenant?.company_name ?? companyId}
        </h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">
          Prepara budget, perimetro fiscale, iniziative, policy e dati grezzi prima di AI Ingestion, Eligibility Gate e UEF Review.
        </p>
      </div>

      {/* ── Admin identity banner ── */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-4 py-3 text-xs text-[rgba(6,3,43,0.88)] leading-relaxed space-y-1">
        <p><span className="font-semibold">Questa sezione è riservata agli operatori KORA.</span></p>
        <p>Il cliente azienda vede solo stato, readiness e output — non il backstage operativo.</p>
        <p>KORA Admin governa la piattaforma, non sorveglia i lavoratori.</p>
      </div>

      {/* ── A: Company Context ── */}
      <section className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Contesto Azienda</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
          {[
            ['Azienda', tenant?.company_name ?? companyId],
            ['company_id', companyId],
            ['tenant_id', tenant?.tenant_id ?? '—'],
            ['Stato tenant', tenant?.tenant_status ?? '—'],
            ['Data readiness', tenant?.data_readiness_status ?? '—'],
            ['Onboarding', tenant?.onboarding_status?.replace(/_/g, ' ') ?? '—'],
            ['KORA Index', hasKoraData ? 'Disponibile' : 'Non disponibile'],
            ['Decision Pack', tenant?.decision_pack_status ?? '—'],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
              <p className={cn('text-[rgba(6,3,43,0.78)] font-medium mt-0.5', (label === 'company_id' || label === 'tenant_id') ? 'font-mono text-[9px]' : '')}>{value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', INTAKE_STATUS_COLORS[summary.intake_status] ?? 'border-[rgba(6,3,43,0.08)] text-[rgba(6,3,43,0.52)]')}>
            Intake: {INTAKE_STATUS_LABELS[summary.intake_status] ?? summary.intake_status}
          </span>
          <span className="text-[10px] text-[rgba(6,3,43,0.52)] italic">{summary.next_action}</span>
        </div>
      </section>

      {/* ── B: Budget & Fiscal Perimeter ── */}
      {plan && plan.fiscal_perimeters.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Budget & Perimetro Fiscale</p>
            <p className="text-xs text-[rgba(6,3,43,0.52)] mt-1">
              Il perimetro fiscale viene definito prima della scelta delle iniziative o dei partner.
              KORA non parte dal catalogo servizi: parte dal budget, dal perimetro e dall&apos;obiettivo di attivazione.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px] rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
            {[
              ['Budget totale people/welfare', `€${plan.total_people_welfare_budget_eur.toLocaleString('it-IT')}`],
              ['Deep activation', `€${plan.deep_activation_budget_eur.toLocaleString('it-IT')}`],
              ['Economic relief', `€${plan.economic_relief_budget_eur.toLocaleString('it-IT')}`],
              ['Compliance esclusa', `€${plan.compliance_excluded_budget_eur.toLocaleString('it-IT')}`],
              ['Non allocato', `€${plan.unallocated_budget_eur.toLocaleString('it-IT')}`],
              ['Opportunità riallocazione', `€${plan.reallocation_opportunity_eur.toLocaleString('it-IT')}`],
              ['Policy strutturali (non-budget)', String(plan.structural_policy_non_budget_mediated_count)],
              ['Allocation quality', `${(plan.allocation_quality_score * 100).toFixed(0)}%`],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className="text-[rgba(6,3,43,0.78)] font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Perimeter cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.fiscal_perimeters.map((fp) => (
              <div key={fp.perimeter_code} className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[#F8F6F1] p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)]">{fp.label}</p>
                    <p className="text-[9px] font-mono text-[rgba(6,3,43,0.40)]">{fp.perimeter_code}</p>
                  </div>
                  <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold shrink-0', ELIGIBILITY_BADGE[fp.default_eligibility] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]')}>
                    {fp.default_eligibility}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div><p className="text-[rgba(6,3,43,0.40)]">Allocato</p><p className="font-semibold text-[rgba(6,3,43,0.78)]">€{fp.allocated_budget_eur.toLocaleString('it-IT')}</p></div>
                  <div><p className="text-[rgba(6,3,43,0.40)]">Disponibile</p><p className="font-semibold text-[rgba(6,3,43,0.78)]">€{fp.available_budget_eur.toLocaleString('it-IT')}</p></div>
                  <div>
                    <p className="text-[rgba(6,3,43,0.40)]">Profondità</p>
                    <p className={cn('font-semibold', PERIMETER_DEPTH_COLOR[fp.activation_depth])}>{fp.activation_depth}</p>
                  </div>
                  <div>
                    <p className="text-[rgba(6,3,43,0.40)]">Pillar</p>
                    <p className="text-[rgba(6,3,43,0.78)] font-semibold">{fp.compatible_pillars.join(', ') || '—'}</p>
                  </div>
                </div>
                {fp.risk_flags.length > 0 && (
                  <div className="space-y-0.5">
                    {fp.risk_flags.map((rf, i) => (
                      <p key={i} className="text-[9px] text-amber-700 bg-[rgba(217,154,43,0.08)] rounded px-2 py-1 leading-relaxed">{rf}</p>
                    ))}
                  </div>
                )}
                <p className="text-[9px] text-[rgba(6,3,43,0.40)] leading-relaxed line-clamp-2">{fp.methodology_notes}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-5 space-y-2">
          <p className="text-xs font-semibold text-[#8A5A00]">Perimetro fiscale non ancora definito</p>
          <p className="text-xs text-amber-700">
            Prima di caricare dati programmi, definire il budget people/welfare e il perimetro fiscale.
            KORA non parte dal catalogo: parte dal budget e dall&apos;obiettivo di attivazione.
          </p>
          <Link href="/admin/companies/setup" className="text-xs font-semibold text-[#C76F3D] hover:underline">
            → Enterprise Onboarding (Passo 3: Budget & Fiscale)
          </Link>
        </section>
      )}

      {/* ── C: Allocation Quality ── */}
      {plan && plan.total_people_welfare_budget_eur > 0 && (
        <section className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Qualità Allocazione</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            {[
              ['Economic Relief', `€${plan.economic_relief_budget_eur.toLocaleString('it-IT')}`, 'text-amber-600'],
              ['Deep Activation', `€${plan.deep_activation_budget_eur.toLocaleString('it-IT')}`, 'text-[rgba(47,125,85,0.90)]'],
              ['Compliance Excluded', `€${plan.compliance_excluded_budget_eur.toLocaleString('it-IT')}`, 'text-[rgba(6,3,43,0.52)]'],
              ['Non-budget-mediated policies', String(plan.structural_policy_non_budget_mediated_count), 'text-violet-600'],
              ['Riallocazione possibile', `€${plan.reallocation_opportunity_eur.toLocaleString('it-IT')}`, 'text-blue-600'],
              ['Allocation quality score', `${(plan.allocation_quality_score * 100).toFixed(0)}%`, plan.allocation_quality_score >= 0.7 ? 'text-[rgba(47,125,85,0.90)]' : 'text-amber-600'],
            ].map(([label, value, color]) => (
              <div key={label as string}>
                <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className={cn('font-semibold mt-0.5', color as string)}>{value}</p>
              </div>
            ))}
          </div>
          {plan.limitations.map((l, i) => (
            <p key={i} className="text-[10px] text-[rgba(6,3,43,0.40)] italic leading-relaxed">{l}</p>
          ))}
        </section>
      )}

      {/* ── D: Raw Data Batch Summary ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          Batch Dati Grezzi — {batches.length} batch
        </p>
        {batches.length === 0 ? (
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.40)]">
            Nessun batch caricato. Caricare il primo batch dopo aver definito il perimetro fiscale.
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]">
                  {['Fonte', 'Tipo', 'Caricato il', 'Tot righe', 'Valide', 'Non valide', 'Pronte', 'Bloccate', 'Limited', 'Strutturali', 'Review', 'Stato'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-[rgba(6,3,43,0.52)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.batch_id} className="border-b border-[rgba(6,3,43,0.05)] last:border-0 hover:bg-[rgba(6,3,43,0.03)]">
                    <td className="px-3 py-2">
                      <p className="font-medium text-[rgba(6,3,43,0.90)]">{b.source_name}</p>
                      <p className="text-[9px] text-[rgba(6,3,43,0.40)] font-mono">{b.source_file_name}</p>
                    </td>
                    <td className="px-3 py-2 font-mono text-[rgba(6,3,43,0.52)]">{b.source_type.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-[rgba(6,3,43,0.52)]">{b.uploaded_at.slice(0, 10)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[rgba(6,3,43,0.78)]">{b.total_rows}</td>
                    <td className="px-3 py-2 text-right font-mono text-[rgba(47,125,85,0.90)]">{b.valid_rows}</td>
                    <td className="px-3 py-2 text-right font-mono text-[rgba(158,59,47,0.75)]">{b.invalid_rows}</td>
                    <td className="px-3 py-2 text-right font-mono text-[#2F7D55] font-semibold">{b.ready_for_ingestion_count}</td>
                    <td className="px-3 py-2 text-right font-mono text-[rgba(158,59,47,0.90)]">{b.blocked_candidate_count}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-600">{b.limited_candidate_count}</td>
                    <td className="px-3 py-2 text-right font-mono text-violet-600">{b.structural_policy_count}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-600">{b.review_required_candidate_count}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap',
                        b.upload_status === 'approved' ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]' :
                        b.upload_status === 'validated' ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]' :
                        b.upload_status === 'review_required' ? 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700' :
                        'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'
                      )}>
                        {b.upload_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] text-blue-700 leading-relaxed">
          Solo metadati batch — nessun contenuto grezzo individuale. Nessun worker_id, nome, dato sanitario o retributivo.
          production_ready: false · synthetic_demo_data: true
        </div>
      </section>

      {/* ── E: Raw Rows Table ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          Righe Dati — {allRows.length} totali
        </p>
        <p className="text-xs text-[rgba(6,3,43,0.40)] italic">
          Questi sono hint pre-ingestion — non classificazione finale. La classificazione ufficiale avviene nell&apos;Eligibility Gate.
        </p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FILTER_LABELS) as RowFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors',
                activeFilter === f
                  ? 'border-[rgba(6,3,43,0.35)] bg-[#06032B] text-white'
                  : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.62)] hover:border-[rgba(6,3,43,0.14)]',
              )}
            >
              {FILTER_LABELS[f]}
              <span className={cn('ml-1', activeFilter === f ? 'text-[rgba(6,3,43,0.40)]' : 'text-[rgba(6,3,43,0.40)]')}>
                {filterCounts[f]}
              </span>
            </button>
          ))}
        </div>

        {allRows.length === 0 ? (
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.40)]">
            Nessuna riga disponibile. Caricare un batch dopo aver definito il perimetro fiscale.
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.40)]">
            Nessuna riga per questo filtro.
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]">
                  {['Nome', 'Categoria', 'Perimetro', 'Mandatory', 'Provider', 'Importo', 'Evidenza', 'Eligibility hint', 'Pronta', 'Campi mancanti'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-[rgba(6,3,43,0.52)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.row_id} className={cn('border-b border-[rgba(6,3,43,0.05)] last:border-0 hover:bg-[rgba(6,3,43,0.03)]', !row.ready_for_ingestion && 'opacity-70')}>
                    <td className="px-3 py-2 max-w-xs">
                      <p className="font-medium text-[rgba(6,3,43,0.90)] line-clamp-1">{row.raw_name}</p>
                      <p className="text-[9px] text-[rgba(6,3,43,0.40)] font-mono mt-0.5">{row.row_id}</p>
                    </td>
                    <td className="px-3 py-2 font-mono text-[rgba(6,3,43,0.52)] whitespace-nowrap">{row.row_category.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn('text-[9px] font-semibold', row.fiscal_perimeter === 'compliance_excluded' ? 'text-[rgba(158,59,47,0.90)]' : row.fiscal_perimeter === 'fringe_benefit' ? 'text-amber-600' : row.fiscal_perimeter === 'unknown' ? 'text-[rgba(6,3,43,0.40)]' : 'text-[#2F7D55]')}>
                        {PERIMETER_LABELS[row.fiscal_perimeter] ?? row.fiscal_perimeter}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('text-[9px] font-mono', row.mandatory_status === 'mandatory_legal' || row.mandatory_status === 'mandatory_role' ? 'text-[rgba(158,59,47,0.90)]' : row.mandatory_status === 'unknown' ? 'text-amber-600' : 'text-[rgba(6,3,43,0.62)]')}>
                        {row.mandatory_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[rgba(6,3,43,0.52)]">{row.provider_name ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-[rgba(6,3,43,0.62)] whitespace-nowrap">
                      {row.amount_eur != null ? `€${row.amount_eur.toLocaleString('it-IT')}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('text-[9px]', row.evidence_status === 'missing' || row.evidence_status === 'unknown' ? 'text-[rgba(158,59,47,0.90)] font-semibold' : row.evidence_status === 'self_declared' ? 'text-amber-600' : 'text-[rgba(6,3,43,0.62)]')}>
                        {row.evidence_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap',
                        ELIGIBILITY_BADGE[row.expected_eligibility_hint] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'
                      )}>
                        {row.expected_eligibility_hint.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('font-bold text-sm', row.ready_for_ingestion ? 'text-[rgba(47,125,85,0.90)]' : 'text-[rgba(158,59,47,0.75)]')}>
                        {row.ready_for_ingestion ? '✓' : '✕'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {row.missing_fields.length > 0 ? (
                        <span className="text-[9px] text-[rgba(158,59,47,0.90)] font-semibold">{row.missing_fields.length} campi</span>
                      ) : (
                        <span className="text-[9px] text-[rgba(6,3,43,0.28)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── F: Candidate Classification Preview ── */}
      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Classificazione Candidati — Pre-ingestion</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5 italic">
            Hint pre-ingestion — non classificazione finale. La classificazione ufficiale avviene nell&apos;Eligibility Gate.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Eligible candidates', count: eligible.length, color: 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)]', textColor: 'text-[#2F7D55]', note: 'Potenzialmente eligible per IU' },
            { label: 'Limited candidates', count: limited.length, color: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]', textColor: 'text-amber-700', note: 'BTI only — 0 IU per design' },
            { label: 'Blocked candidates', count: blocked.length, color: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)]', textColor: 'text-[#9E3B2F]', note: '0 IU · 0 KORA Index · governance only' },
            { label: 'Policy strutturali', count: structural.length, color: 'border-violet-200 bg-violet-50', textColor: 'text-violet-700', note: 'Non-budget-mediated · aggregate-only' },
            { label: 'Review required', count: reviewRequired.length, color: 'border-blue-200 bg-blue-50', textColor: 'text-blue-700', note: '0 IU finché non revisionati' },
          ].map((card) => (
            <div key={card.label} className={cn('rounded-lg border p-3 space-y-1.5', card.color)}>
              <p className={cn('text-xs font-semibold', card.textColor)}>{card.label}</p>
              <p className={cn('text-3xl font-bold', card.textColor)}>{card.count}</p>
              <p className={cn('text-[10px] leading-relaxed', card.textColor, 'opacity-80')}>{card.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── G: Missing Data Panel ── */}
      {missingFields.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Campi Mancanti — {missingFields.length} righe</p>
          <div className="rounded-lg border border-[rgba(158,59,47,0.12)] bg-[#F8F6F1] divide-y divide-[rgba(6,3,43,0.05)] overflow-hidden">
            {missingFields.map((row) => (
              <div key={row.row_id} className="px-4 py-3 space-y-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)]">{row.raw_name}</p>
                  <span className="text-[9px] font-mono text-[rgba(6,3,43,0.40)]">{row.row_id}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {row.missing_fields.map((f) => (
                    <span key={f} className="rounded bg-[rgba(158,59,47,0.06)] border border-[rgba(158,59,47,0.20)] px-1.5 py-0.5 text-[9px] text-[#9E3B2F] font-mono">{f}</span>
                  ))}
                </div>
                {row.validation_warnings.length > 0 && (
                  <p className="text-[10px] text-amber-700 leading-relaxed">{row.validation_warnings[0]}</p>
                )}
                <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{row.notes}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── H: Pipeline Handoff ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Handoff Pipeline</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {pipelineLinks.map((link) => (
            <Link
              key={link.stage}
              href={link.href}
              className={cn(
                'rounded-lg border p-3 space-y-1 transition-colors',
                link.available
                  ? 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] hover:bg-[rgba(6,3,43,0.06)]'
                  : 'border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] opacity-60 pointer-events-none',
              )}
            >
              <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)]">{link.label}</p>
              <p className={cn('text-[10px] leading-relaxed', link.available ? 'text-[rgba(6,3,43,0.72)]' : 'text-[rgba(6,3,43,0.40)]')}>{link.note}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── I: Methodology Boundary ── */}
      <section className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Confini Metodologici</p>
        <div className="grid gap-2 sm:grid-cols-2 text-[10px] text-[rgba(6,3,43,0.62)] leading-relaxed">
          {[
            'KORA non trasforma la compliance in impatto.',
            'La conformità legale è una baseline, non impatto.',
            'Non è spesa sbagliata. È spesa che può diventare più intelligente.',
            'Non tutte le azioni KORA passano da un partner o da una fattura.',
            'KORA riconosce anche policy organizzative strutturali, se formalizzate, verificabili, aggregate e privacy-safe.',
            'Il rilievo (Economic Relief) ≠ profondità di attivazione.',
            'Questi sono hint pre-ingestion — la classificazione ufficiale avviene nell\'Eligibility Gate.',
            'Nessun dato individuale di lavoratore in questa sezione.',
          ].map((note, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[rgba(6,3,43,0.28)] shrink-0 mt-0.5">·</span>
              <p>{note}</p>
            </div>
          ))}
        </div>
        <p className="text-[9px] font-mono text-[rgba(6,3,43,0.40)]">
          KORA Admin · synthetic_demo_data: true · pre_empirical_calibration · company_id: {companyId}
        </p>
      </section>

      {/* ── Navigation ── */}
      <div className="border-t border-[rgba(6,3,43,0.05)] pt-4 flex items-center gap-4 flex-wrap">
        <Link href={`/admin/companies/${companyId}`} className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          ← Company Detail
        </Link>
        <Link href="/admin/companies" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          Company Registry
        </Link>
        <Link href="/admin/companies/workforce-baseline" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          Workforce Baseline
        </Link>
        <Link href="/company/ingestion" className="text-xs text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.72)] underline underline-offset-2">
          AI Ingestion →
        </Link>
      </div>

    </div>
  );
}
