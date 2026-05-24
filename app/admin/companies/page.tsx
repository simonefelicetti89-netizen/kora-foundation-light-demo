import Link from 'next/link';
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';

const SAFEGUARD_PILL: Record<string, string> = {
  CLEAR:   'border-green-200 bg-green-50 text-green-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
  FLAGGED: 'border-rose-200 bg-rose-50 text-rose-700',
};

const ONBOARDING_PILL: Record<string, string> = {
  fully_onboarded:              'border-green-200 bg-green-50 text-green-700',
  profile_complete:             'border-blue-200 bg-blue-50 text-blue-700',
  workforce_baseline_complete:  'border-blue-200 bg-blue-50 text-blue-700',
  program_data_loaded:          'border-indigo-200 bg-indigo-50 text-indigo-700',
  not_started:                  'border-slate-200 bg-slate-50 text-slate-500',
};

// A-15: KORA Admin — Company Registry
export default function AdminCompanyRegistry() {
  const portfolio     = adminPreviewService.getCompanyPortfolioPreview();
  const onboardingRec = companyOnboardingService.getOnboardingCompanies();

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          KORA Admin — Company Registry
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Company Registry</h1>
        <p className="text-sm text-slate-500 mt-1">
          Da qui KORA crea, configura e governa le aziende cliente.
        </p>
      </div>

      {/* ── Admin identity ── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 leading-relaxed">
        <span className="font-semibold">KORA Admin — gestione azienda cliente.</span>{' '}
        Questa sezione è riservata agli operatori KORA.
        Il portale azienda mostra solo output e stato; il setup operativo resta lato KORA Admin.
      </div>

      {/* ── Action strip ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/admin/companies/setup"
          className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          + Crea nuova azienda
        </Link>
        <Link
          href="/admin/companies/onboarding"
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Onboarding Studio
        </Link>
        <Link
          href="/admin/companies/workforce-baseline"
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Workforce Baseline
        </Link>
      </div>

      {/* ── Company table ── */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Aziende nel portfolio — {portfolio.length} totali
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {portfolio.map((c) => {
            const onb = onboardingRec.find((r) => r.company_id === c.id);
            return (
              <div key={c.id} className="px-4 py-4 space-y-2 hover:bg-slate-50 transition-colors">

                {/* Row header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{c.company_name}</p>
                      {c.is_primary_demo && (
                        <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600">
                          DEMO PRIMARIO
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">company_id: {c.id}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {c.safeguard_status && (
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${SAFEGUARD_PILL[c.safeguard_status] ?? ''}`}>
                        {c.safeguard_status}
                      </span>
                    )}
                    {onb && (
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${ONBOARDING_PILL[onb.onboarding_status] ?? 'border-slate-200 text-slate-400'}`}>
                        {onb.onboarding_status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Data grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 text-[10px]">
                  <div>
                    <p className="text-slate-400">Settore</p>
                    <p className="text-slate-700 font-medium">{c.sector}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Territorio</p>
                    <p className="text-slate-700 font-medium">{c.territory}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Dipendenti</p>
                    <p className="text-slate-700 font-medium">{c.headcount}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Completezza dati</p>
                    <p className="text-slate-700 font-medium">{(c.data_completeness * 100).toFixed(0)}%</p>
                  </div>
                  {c.kora_index_value !== null && (
                    <div>
                      <p className="text-slate-400">KORA Index</p>
                      <p className="text-slate-700 font-bold">{c.kora_index_value}</p>
                    </div>
                  )}
                  {c.confidence_score !== null && (
                    <div>
                      <p className="text-slate-400">CS</p>
                      <p className="text-slate-700 font-medium">{(c.confidence_score * 100).toFixed(0)}%</p>
                    </div>
                  )}
                </div>

                {/* Action links */}
                <div className="flex items-center gap-3 flex-wrap border-t border-slate-100 pt-2">
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Dettaglio →
                  </Link>
                  <Link
                    href="/admin/companies/onboarding"
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Onboarding
                  </Link>
                  <Link
                    href="/admin/companies/workforce-baseline"
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Workforce Baseline
                  </Link>
                  <Link
                    href="/company/reports"
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Decision Pack
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Admin · synthetic_demo_data: true · Foundation Light v0.1
      </p>
    </div>
  );
}
