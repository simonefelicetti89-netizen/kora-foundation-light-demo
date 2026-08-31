'use client';
// A-01e: Workforce Baseline Admin — inserimento baseline workforce.
// Scopo: caricare o verificare la baseline headcount/segmenti
//        necessaria come fondamento per il calcolo KORA Index™.
//
// B-TRUTH first canonical seed group (2026-08-31): retired the synthetic
// data path (WorkforceBaselineService, data/synthetic/workforce-baseline.json).
// Now reads live personal.workforce_baseline via /api/admin/workforce-baseline
// and the live tenant registry via /api/admin/tenants — the exact same live
// path a DEMO-kind or LIVE-kind tenant both traverse identically. Several
// synthetic-only fields (upload-process stats, editorial completeness score,
// warnings/limitations text, activation/equity readiness flags) have no live
// source and are not shown — see lib/live/workforce-baseline-view.ts for the
// full field disposition. No placeholder values invented for any of them.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { WorkforceBaselineView } from '@/lib/live/workforce-baseline-view';

interface LiveTenant {
  id: string;
  tenantCode: string;
  companyName: string;
  onboardingStatus: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  site:              'Sede',
  department:        'Dipartimento',
  role_family:       'Famiglia professionale',
  seniority_band:    'Fascia di seniority',
  contract_type:     'Tipo di contratto',
  employment_status: 'Status occupazionale',
  other:             'Altro',
};

// A-18: KORA Admin — Workforce Baseline
export default function AdminWorkforceBaselinePage() {
  const [tenants, setTenants] = useState<LiveTenant[]>([]);
  const [tenantIdsWithBaseline, setTenantIdsWithBaseline] = useState<Set<string>>(new Set());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeDimension, setActiveDimension] = useState<string>('department');
  const [baseline, setBaseline] = useState<WorkforceBaselineView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/admin/tenants').then((r) => (r.ok ? r.json() : { tenants: [] })),
      fetch('/api/admin/workforce-baseline').then((r) => (r.ok ? r.json() : { tenantIdsWithBaseline: [] })),
    ]).then(([tenantsRes, baselinesRes]) => {
      if (cancelled) return;
      const liveTenants: LiveTenant[] = tenantsRes.tenants ?? [];
      setTenants(liveTenants);
      setTenantIdsWithBaseline(new Set(baselinesRes.tenantIdsWithBaseline ?? []));
      if (liveTenants.length > 0) setSelectedTenantId(liveTenants[0].id);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const fetchBaseline = useCallback((tenantId: string) => {
    if (!tenantId) return;
    fetch(`/api/admin/workforce-baseline?tenantId=${encodeURIComponent(tenantId)}`)
      .then((r) => (r.ok ? r.json() : { baseline: null }))
      .then((res) => setBaseline(res.baseline ?? null))
      .catch(() => setBaseline(null));
  }, []);

  useEffect(() => {
    if (selectedTenantId) fetchBaseline(selectedTenantId);
  }, [selectedTenantId, fetchBaseline]);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const visibleGroups = (baseline?.aggregateGroups ?? []).filter((g) => g.dimension_type === activeDimension);
  const dimensionKeys = [...new Set((baseline?.aggregateGroups ?? []).map((g) => g.dimension_type))];

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <p className="text-xs text-[rgba(6,3,43,0.40)]">Caricamento…</p>
      </div>
    );
  }

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
              const hasBaseline = tenantIdsWithBaseline.has(t.id);
              return (
                <button key={t.id} type="button" onClick={() => setSelectedTenantId(t.id)}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${selectedTenantId === t.id ? 'border-[rgba(6,3,43,0.14)] bg-[rgba(199,111,61,0.08)] text-[rgba(6,3,43,0.72)]' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.62)] hover:border-[rgba(6,3,43,0.14)]'}`}>
                  {t.companyName}{!hasBaseline && <span className="ml-1 text-[9px] text-[rgba(6,3,43,0.40)]">(nessuna baseline)</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-5 text-xs text-[#8A5A00] space-y-2">
          <p className="font-semibold">Baseline non ancora caricata</p>
          <p>{selectedTenant?.companyName ?? 'Azienda selezionata'} non ha ancora una workforce baseline.</p>
          <p>Onboarding status: {selectedTenant?.onboardingStatus?.replace(/_/g, ' ') ?? 'non avviato'}</p>
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
            const hasBaseline = tenantIdsWithBaseline.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTenantId(t.id)}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedTenantId === t.id
                    ? 'border-[rgba(6,3,43,0.14)] bg-[rgba(199,111,61,0.08)] text-[rgba(6,3,43,0.72)]'
                    : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.62)] hover:border-[rgba(6,3,43,0.14)]'
                }`}
              >
                {t.companyName}
                {!hasBaseline && <span className="ml-1 text-[9px] text-[rgba(6,3,43,0.40)]">(nessuna baseline)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Validation result ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Validazione</p>
          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold',
            baseline.minimumCompanyThresholdMet
              ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]'
              : 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]'
          )}>
            {baseline.minimumCompanyThresholdMet ? 'SOGLIA SODDISFATTA' : 'SOTTO SOGLIA'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-[10px]">
          {[
            ['Lavoratori totali',   baseline.totalWorkers],
            ['Soglia minima',       baseline.minimumCompanyThreshold],
            ['Soglia gruppo (N≥)',  baseline.minimumGroupSize],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
              <p className="text-[rgba(6,3,43,0.78)] font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] text-blue-700 leading-relaxed">
          Nessun dato individuale — solo aggregati. Cluster &lt; {baseline.minimumGroupSize} lavoratori soppressi per privacy prima della scrittura.
          KORA misura l&apos;organizzazione, non gli individui.
        </div>
      </div>

      {/* ── Aggregate groups by dimension ── */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">Gruppi Aggregati per Dimensione</p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
            Solo gruppi ≥ {baseline.minimumGroupSize} lavoratori. Nessun dato individuale — aggregati per privacy.
          </p>
        </div>

        {dimensionKeys.length > 0 ? (
          <>
            {/* Dimension tabs */}
            <div className="flex flex-wrap gap-2">
              {dimensionKeys.map((dim) => (
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
                  {DIMENSION_LABELS[dim] ?? dim}
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
                        <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)]">{g.group_label}</p>
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
                    <div className="text-[9px] text-[rgba(6,3,43,0.40)]">
                      {(g.share_of_workforce * 100).toFixed(1)}% del totale
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[rgba(6,3,43,0.40)] italic">Nessun gruppo visibile per questa dimensione.</p>
            )}
          </>
        ) : (
          <p className="text-xs text-[rgba(6,3,43,0.40)] italic">
            Nessuna suddivisione per dimensione registrata per questa baseline.
          </p>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="border-t border-[rgba(6,3,43,0.05)] pt-4 flex items-center gap-4 flex-wrap">
        <Link href="/admin/companies" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          ← Company Registry
        </Link>
        <Link href="/admin/companies" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          Onboarding Studio
        </Link>
        <Link href="/company/ingestion" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          KORA Intake Engine™ →
        </Link>
      </div>

    </div>
  );
}
