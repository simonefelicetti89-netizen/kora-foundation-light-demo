'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { workforceBaselineService } from '@/services/workforce-baseline/WorkforceBaselineService';
import { tenantService } from '@/services/tenant/TenantService';
import type { WorkforceDimensionType } from '@/lib/types';

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
  not_started:                  'Non avviato',
  uploaded:                     'Caricato',
  validated:                    'Validato',
  needs_review:                 'Richiede revisione',
  below_company_threshold:      'Sotto soglia aziendale',
  privacy_suppression_required: 'Soppressione privacy richiesta',
  ready_for_aggregation:        'Pronto per aggregazione',
};

const UPLOAD_STATUS_COLORS: Record<string, string> = {
  not_started:                  'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]',
  uploaded:                     'border-blue-200 bg-blue-50 text-blue-700',
  validated:                    'border-green-200 bg-green-50 text-green-700',
  needs_review:                 'border-amber-200 bg-amber-50 text-amber-700',
  below_company_threshold:      'border-red-200 bg-red-50 text-red-700',
  privacy_suppression_required: 'border-amber-200 bg-amber-50 text-amber-700',
  ready_for_aggregation:        'border-emerald-200 bg-emerald-50 text-emerald-700',
};

// A-18: KORA Admin — Workforce Baseline
export default function AdminWorkforceBaselinePage() {
  const [activeDimension, setActiveDimension] = useState<WorkforceDimensionType>('department');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('meridiana-group');

  const tenants     = tenantService.getTenants();
  const baselines   = workforceBaselineService.getAvailableWorkforceBaselines();
  const baseline    = workforceBaselineService.getWorkforceBaseline(selectedCompanyId);
  const batch       = workforceBaselineService.getUploadBatch(selectedCompanyId);
  const readiness   = workforceBaselineService.getWorkforceBaselineReadiness(selectedCompanyId);
  const validation  = workforceBaselineService.validateWorkforceBaseline(selectedCompanyId);
  const visibleGroups = workforceBaselineService.getGroupsByDimension(selectedCompanyId, activeDimension);
  const suppressed  = workforceBaselineService.getSuppressedGroups(selectedCompanyId);

  const selectedTenant = tenants.find((t) => t.company_id === selectedCompanyId);

  if (!baseline) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">KORA Admin — Validazione Workforce</p>
          <h1 className="text-xl font-bold text-[#06032B] mt-0.5">Workforce Baseline</h1>
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Azienda cliente</p>
          <div className="flex flex-wrap gap-2">
            {tenants.map((t) => {
              const hasBaseline = baselines.some((b) => b.company_id === t.company_id);
              return (
                <button key={t.company_id} type="button" onClick={() => setSelectedCompanyId(t.company_id)}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${selectedCompanyId === t.company_id ? 'border-[rgba(6,3,43,0.14)] bg-[rgba(199,111,61,0.08)] text-[rgba(6,3,43,0.72)]' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.62)] hover:border-[rgba(6,3,43,0.14)]'}`}>
                  {t.company_name}{!hasBaseline && <span className="ml-1 text-[9px] text-[rgba(6,3,43,0.40)]">(nessuna baseline)</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-xs text-amber-800 space-y-2">
          <p className="font-semibold">Baseline non ancora caricata</p>
          <p>{selectedTenant?.company_name ?? selectedCompanyId} non ha ancora una workforce baseline.</p>
          <p>Onboarding status: {selectedTenant?.onboarding_status?.replace(/_/g, ' ') ?? 'non avviato'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          KORA Admin — Validazione Workforce Azienda Cliente
        </p>
        <h1 className="text-xl font-bold text-[#06032B] mt-0.5">Workforce Baseline</h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">
          Validazione aggregata della popolazione aziendale — gestita lato KORA Admin.
        </p>
      </div>

      {/* ── Admin identity ── */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-4 py-3 text-xs text-[rgba(6,3,43,0.88)] leading-relaxed space-y-1">
        <p>
          <span className="font-semibold">KORA Admin — gestione azienda cliente.</span>{' '}
          Questa sezione è riservata agli operatori KORA.
        </p>
        <p>
          Il portale azienda mostra solo output e stato; il setup operativo resta lato KORA Admin.
          KORA misura l&apos;organizzazione, non gli individui.
        </p>
      </div>

      {/* ── Company selector ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Azienda cliente</p>
        <div className="flex flex-wrap gap-2">
          {tenants.map((t) => {
            const hasBaseline = baselines.some((b) => b.company_id === t.company_id);
            return (
              <button
                key={t.company_id}
                type="button"
                onClick={() => setSelectedCompanyId(t.company_id)}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCompanyId === t.company_id
                    ? 'border-[rgba(6,3,43,0.14)] bg-[rgba(199,111,61,0.08)] text-[rgba(6,3,43,0.72)]'
                    : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.62)] hover:border-[rgba(6,3,43,0.14)]'
                }`}
              >
                {t.company_name}
                {!hasBaseline && <span className="ml-1 text-[9px] text-[rgba(6,3,43,0.40)]">(nessuna baseline)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Upload batch status ── */}
      {batch && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Stato Upload Workforce</p>
            <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold',
              UPLOAD_STATUS_COLORS[batch.upload_status] ?? 'border-[rgba(6,3,43,0.08)] text-[rgba(6,3,43,0.52)]'
            )}>
              {UPLOAD_STATUS_LABELS[batch.upload_status] ?? batch.upload_status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            {[
              ['Record totali',   batch.total_rows],
              ['Record validi',   batch.valid_rows],
              ['Record non validi', batch.invalid_rows],
              ['Duplicati',       batch.duplicate_rows],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className="text-[rgba(6,3,43,0.78)] font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] text-blue-700 leading-relaxed">
            Nessun dato individuale — solo aggregati. Cluster &lt; 10 lavoratori soppressi per privacy (N≥10).
            KORA misura l&apos;organizzazione, non gli individui.
          </div>
        </div>
      )}

      {/* ── Validation result ── */}
      {validation && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Validazione</p>
            <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold',
              validation.minimum_company_threshold_met
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            )}>
              {validation.minimum_company_threshold_met ? 'SOGLIA SODDISFATTA' : 'SOTTO SOGLIA'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            {[
              ['Lavoratori totali',   validation.total_workers],
              ['Soglia minima',       validation.minimum_company_threshold],
              ['Completezza baseline', `${(validation.baseline_completeness_score * 100).toFixed(0)}%`],
              ['Cluster soppressi',   validation.suppressed_groups],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className="text-[rgba(6,3,43,0.78)] font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {validation.warnings.length > 0 && (
            <div className="space-y-1">
              {validation.warnings.map((warning, i) => (
                <div key={i} className="rounded px-3 py-2 text-[10px] bg-amber-50 text-amber-700">
                  {warning}
                </div>
              ))}
            </div>
          )}
          {validation.limitations.length > 0 && (
            <div className="space-y-1">
              {validation.limitations.map((note, i) => (
                <p key={i} className="text-[10px] text-[rgba(6,3,43,0.40)] leading-relaxed">{note}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Aggregate groups by dimension ── */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">Gruppi Aggregati per Dimensione</p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
            Solo gruppi ≥ 10 lavoratori. Nessun dato individuale — aggregati per privacy.
          </p>
        </div>

        {/* Dimension tabs */}
        <div className="flex flex-wrap gap-2">
          {DIMENSION_KEYS.map((dim) => (
            <button
              key={dim}
              type="button"
              onClick={() => setActiveDimension(dim)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                activeDimension === dim
                  ? 'border-[rgba(6,3,43,0.35)] bg-[#06032B] text-white'
                  : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.62)] hover:border-[rgba(6,3,43,0.14)]',
              )}
            >
              {DIMENSION_LABELS[dim]}
            </button>
          ))}
        </div>

        {/* Groups grid */}
        {visibleGroups.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleGroups.map((g) => (
              <div key={g.group_id} className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[#F8F6F1] p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)]">{g.dimension_label}</p>
                    <p className="text-[9px] font-mono text-[rgba(6,3,43,0.40)]">{g.dimension_type}</p>
                  </div>
                  <span className="text-lg font-bold text-[rgba(6,3,43,0.78)] shrink-0">{g.employee_count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(6,3,43,0.05)]">
                  <div
                    className="h-1.5 rounded-full bg-[#C76F3D]"
                    style={{ width: `${Math.min(g.share_of_workforce * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] text-[rgba(6,3,43,0.40)]">
                  <span>{(g.share_of_workforce * 100).toFixed(1)}% del totale</span>
                  {!g.included_in_breakdown && (
                    <span className="text-amber-600 font-semibold">soppresso</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[rgba(6,3,43,0.40)] italic">Nessun gruppo visibile per questa dimensione.</p>
        )}

        {suppressed.length > 0 && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700">
            {suppressed.length} cluster sotto soglia privacy (N &lt; 10) — soppressi. Soglia: N≥10.
          </div>
        )}
      </div>

      {/* ── Readiness ── */}
      {readiness && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Readiness Pipeline</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-[10px]">
            {[
              ['Company threshold N≥30',  validation?.minimum_company_threshold_met ? '✓ OK' : '✕ Non soddisfatta'],
              ['Privacy per portale',      readiness.privacy_safe_for_company_view ? '✓ OK' : '✕ Verificare'],
              ['Completezza baseline',     validation ? `${(validation.baseline_completeness_score * 100).toFixed(0)}%` : '—'],
              ['Activation reach',         readiness.activation_reach_ready ? '✓ Pronto' : '✕ Non pronto'],
              ['Equity distribuzione',     readiness.distribution_equity_ready ? '✓ Pronto' : '✕ Non pronto'],
              ['Cluster soppressi',        validation ? `${validation.suppressed_groups}` : '—'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className={cn('text-[rgba(6,3,43,0.78)] font-semibold mt-0.5',
                  (value as string).startsWith('✕') ? 'text-rose-600' :
                  (value as string).startsWith('✓') ? 'text-emerald-600' : ''
                )}>
                  {value}
                </p>
              </div>
            ))}
          </div>
          {readiness.next_action && (
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] italic leading-relaxed">{readiness.next_action}</p>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="border-t border-[rgba(6,3,43,0.05)] pt-4 flex items-center gap-4 flex-wrap">
        <Link href="/admin/companies" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          ← Company Registry
        </Link>
        <Link href="/admin/companies/onboarding" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          Onboarding Studio
        </Link>
        <Link href="/company/ingestion" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          AI Ingestion →
        </Link>
      </div>

    </div>
  );
}
