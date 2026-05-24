import Link from 'next/link';
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';

const SAFEGUARD_PILL: Record<string, string> = {
  CLEAR:   'border-green-200 bg-green-50 text-green-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
  FLAGGED: 'border-rose-200 bg-rose-50 text-rose-700',
};

interface TabSection {
  id: string;
  label: string;
  href?: string;
  status: 'active' | 'coming_next';
  description: string;
}

const TABS: TabSection[] = [
  { id: 'overview',    label: 'Overview',            status: 'active',      description: 'Profilo e stato generale dell\'azienda cliente.', href: '' },
  { id: 'setup',       label: 'Setup',               status: 'active',      description: 'Configurazione profilo aziendale.', href: '/admin/companies/setup' },
  { id: 'onboarding',  label: 'Onboarding',          status: 'active',      description: 'Readiness pipeline e gestione onboarding.', href: '/admin/companies/onboarding' },
  { id: 'workforce',   label: 'Workforce Baseline',  status: 'active',      description: 'Validazione aggregata della popolazione aziendale.', href: '/admin/companies/workforce-baseline' },
  { id: 'program',     label: 'Program/Budget Data', status: 'coming_next', description: 'Upload e validazione dati programma e budget — prossimo blocco.' },
  { id: 'hrkpi',       label: 'HR KPI Context',      status: 'coming_next', description: 'Upload contesto HR KPI — prossimo blocco.' },
  { id: 'ingestion',   label: 'AI Ingestion',         status: 'active',      description: 'Mapping tassonomia BCM e batch fonti.', href: '/company/ingestion' },
  { id: 'uef',         label: 'UEF Review',           status: 'active',      description: 'Revisione umana degli UEF prima dello scoring.', href: '/company/uef-review' },
  { id: 'scoring',     label: 'Scoring Run',          status: 'active',      description: 'Simulazione scoring KORA Index.', href: '/company/scoring' },
  { id: 'decisionpack', label: 'Decision Pack',       status: 'active',      description: 'Generazione Report e Decision Pack.', href: '/company/reports' },
  { id: 'users',       label: 'Users & Access',       status: 'coming_next', description: 'Gestione utenti aziendali e accessi — prossimo blocco.' },
  { id: 'audit',       label: 'Audit',                status: 'coming_next', description: 'Audit trail operativo — prossimo blocco.' },
];

// A-19: KORA Admin — Company Detail
export default function AdminCompanyDetail({ params }: { params: { companyId: string } }) {
  const { companyId } = params;
  const portfolio = adminPreviewService.getCompanyPortfolioPreview();
  const company = portfolio.find((c) => c.id === companyId);
  const onboarding = companyOnboardingService.getCompanyOnboardingRecord(companyId);

  if (!company) {
    return (
      <div className="space-y-4 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">KORA Admin</p>
        <h1 className="text-xl font-bold text-slate-900">Azienda non trovata</h1>
        <p className="text-sm text-slate-500">company_id: <span className="font-mono">{companyId}</span> non presente nel portfolio demo.</p>
        <Link href="/admin/companies" className="text-xs font-semibold text-indigo-600 hover:underline">← Company Registry</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          KORA Admin — Vista Operativa Azienda Cliente
        </p>
        <div className="flex items-start gap-3 mt-0.5">
          <h1 className="text-xl font-bold text-slate-900">{company.company_name}</h1>
          {company.safeguard_status && (
            <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold self-center ${SAFEGUARD_PILL[company.safeguard_status] ?? ''}`}>
              {company.safeguard_status}
            </span>
          )}
          {company.is_primary_demo && (
            <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600 self-center">
              DEMO PRIMARIO
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-slate-400 mt-0.5">company_id: {companyId}</p>
      </div>

      {/* ── Admin identity ── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 leading-relaxed">
        <span className="font-semibold">Vista operativa KORA Admin.</span>{' '}
        Il cliente azienda non vede questa console tecnica.
      </div>

      {/* ── Company summary strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Settore', company.sector],
          ['Territorio', company.territory],
          ['Dipendenti', String(company.headcount)],
          ['Completezza dati', `${(company.data_completeness * 100).toFixed(0)}%`],
          ...(company.kora_index_value !== null ? [['KORA Index', String(company.kora_index_value)]] : []),
          ...(company.confidence_score !== null ? [['CS', `${(company.confidence_score * 100).toFixed(0)}%`]] : []),
          ...(onboarding ? [['Onboarding', onboarding.onboarding_status.replace(/_/g, ' ')]] : []),
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[10px] text-slate-400">{label}</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Operational lifecycle tabs ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Lifecycle Operativo — KORA Admin
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className={`rounded-lg border p-4 ${
                tab.status === 'active'
                  ? 'border-slate-200 bg-white'
                  : 'border-slate-100 bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800">{tab.label}</p>
                {tab.status === 'coming_next' && (
                  <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-slate-400 shrink-0">
                    coming next
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">{tab.description}</p>
              {tab.status === 'active' && tab.href && (
                <Link
                  href={tab.href}
                  className="mt-2 inline-block text-[10px] font-semibold text-indigo-600 hover:underline"
                >
                  Apri →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="border-t border-slate-100 pt-4 flex items-center gap-4">
        <Link href="/admin/companies" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
          ← Company Registry
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Admin · synthetic_demo_data: true · company_id: {companyId}
      </p>
    </div>
  );
}
