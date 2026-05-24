import Link from 'next/link';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';

const COMPANY_ID = 'meridiana-group';
const SCENARIO = 'S2';

const ONBOARDING_LABELS: Record<string, string> = {
  not_started:                 'Non avviato',
  profile_complete:            'Profilo completato',
  workforce_baseline_complete: 'Baseline completata',
  program_data_loaded:         'Dati programma caricati',
  hr_kpi_loaded:               'HR KPI caricati',
  ready_for_scoring:           'Pronto per scoring',
  decision_pack_ready:         'Decision Pack pronto',
  fully_onboarded:             'Completamente onboardato',
};

const ONBOARDING_COLORS: Record<string, string> = {
  not_started:                 'border-slate-200 bg-slate-50 text-slate-500',
  profile_complete:            'border-blue-200 bg-blue-50 text-blue-700',
  workforce_baseline_complete: 'border-blue-200 bg-blue-50 text-blue-700',
  program_data_loaded:         'border-indigo-200 bg-indigo-50 text-indigo-700',
  ready_for_scoring:           'border-amber-200 bg-amber-50 text-amber-700',
  decision_pack_ready:         'border-green-200 bg-green-50 text-green-700',
  fully_onboarded:             'border-green-200 bg-green-50 text-green-700',
};

// C-17: Company Profile — company-scoped, read-only
export default function CompanyProfilePage() {
  const record = companyOnboardingService.getCompanyOnboardingRecord(COMPANY_ID);
  const koraOutput = scoringSimulatorService.score(COMPANY_ID, SCENARIO, '2025');
  const tenant = tenantService.getTenant(COMPANY_ID);
  const companyAccounts = accountProvisioningService.getAccountsForCompany(COMPANY_ID);
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(COMPANY_ID);
  workerProvisioningService.assertEmployerCannotViewIndividualPIB(COMPANY_ID, '');

  if (!record) return <div className="p-8 text-sm text-slate-500">Profilo non trovato.</div>;

  const { profile, workforce_baseline, readiness_checks } = record;
  const passedChecks  = readiness_checks.filter((c) => c.status === 'ok').length;
  const totalChecks   = readiness_checks.length;

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Il Tuo Spazio KORA
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">{profile.company_name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Stai visualizzando lo spazio KORA della tua azienda.
        </p>
      </div>

      {/* ── Company-scoped boundary note ── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 leading-relaxed space-y-1">
        <p>
          <span className="font-semibold">Stai visualizzando lo spazio KORA della tua azienda.</span>{' '}
          Gli utenti aziendali vedono solo la propria azienda.
        </p>
        <p>
          Il PIB individuale resta privato al lavoratore. L&apos;azienda vede solo aggregati privacy-safe.
        </p>
        <p>
          Il setup operativo e la validazione dati sono gestiti lato KORA Admin.
        </p>
      </div>

      {/* ── Tenant identity ── */}
      {tenant && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Identità Tenant</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
            {[
              ['Azienda', tenant.company_name],
              ['Settore', tenant.sector],
              ['Territorio', tenant.territory],
              ['Sede principale', tenant.headquarters_location],
              ['Dipendenti', String(tenant.employee_count)],
              ['Piano KORA', tenant.kora_plan],
              ['Periodo di analisi', tenant.analysis_period],
              ['Stato tenant', tenant.tenant_status],
              ['company_id', COMPANY_ID],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                <p className={`text-slate-700 mt-0.5 capitalize ${label === 'company_id' ? 'font-mono text-[10px]' : ''}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Access scope ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Accesso & Utenti Aziendali</p>
        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <div><p className="text-slate-400">Scope accesso</p><p className="text-slate-700 font-semibold">company_scoped</p></div>
          <div><p className="text-slate-400">Utenti configurati</p><p className="text-slate-700 font-semibold">{companyAccounts.length}</p></div>
          <div><p className="text-slate-400">Sezioni visibili</p><p className="text-slate-700 font-semibold">Intelligence, Reports, Financial</p></div>
          <div><p className="text-slate-400">Sezioni operative</p><p className="text-slate-700 font-semibold">Gestite da KORA Admin</p></div>
        </div>
        <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
          Il setup operativo, l&apos;ingestion e lo scoring sono gestiti lato KORA Admin e non sono visibili nel portale aziendale.
        </div>
      </div>

      {/* ── Worker / My KORA status ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Worker & My KORA</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-[10px]">
          <div><p className="text-slate-400">My KORA abilitati</p><p className="text-slate-700 font-bold text-sm mt-0.5">{workerSummary.my_kora_enabled_count}</p></div>
          <div><p className="text-slate-400">PIB privato</p><p className="text-slate-700 font-bold text-sm mt-0.5">{workerSummary.pib_private_enabled_count}</p></div>
          <div><p className="text-slate-400">Lavoratori in roster</p><p className="text-slate-700 font-bold text-sm mt-0.5">{workerSummary.total_workers}</p></div>
        </div>
        <div className="rounded border border-indigo-100 bg-indigo-50 px-3 py-2 text-[10px] text-indigo-700 leading-relaxed">
          Questo spazio è personale: l&apos;azienda non vede il PIB individuale del lavoratore.
          L&apos;azienda vede solo aggregati anonimizzati sopra soglia privacy (N≥10).
        </div>
      </div>

      {/* ── KORA Status ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Stato KORA</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
          {/* KORA Index */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] text-slate-400">KORA Index</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{koraOutput.kora_index_value}</p>
            <p className="text-[9px] text-slate-400 font-mono mt-0.5">/100</p>
          </div>

          {/* Confidence Score */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-[10px] text-blue-500">Confidence Score</p>
            <p className="text-2xl font-bold text-blue-700 mt-0.5">{Math.round(koraOutput.confidence_score * 100)}%</p>
            <p className="text-[9px] text-blue-400 mt-0.5">Indicatore esterno di affidabilità dati</p>
          </div>

          {/* Safeguard */}
          <div className={`rounded-lg border p-3 ${
            koraOutput.safeguard_status === 'CLEAR'
              ? 'border-green-200 bg-green-50'
              : koraOutput.safeguard_status === 'WARNING'
              ? 'border-amber-200 bg-amber-50'
              : 'border-rose-200 bg-rose-50'
          }`}>
            <p className="text-[10px] text-slate-400">Activation Safeguard</p>
            <p className={`text-lg font-bold mt-0.5 ${
              koraOutput.safeguard_status === 'CLEAR' ? 'text-green-700' :
              koraOutput.safeguard_status === 'WARNING' ? 'text-amber-700' : 'text-rose-700'
            }`}>
              {koraOutput.safeguard_status}
            </p>
          </div>
        </div>

        <p className="text-[10px] font-mono text-slate-400">
          {koraOutput.methodology_version_id} · calibration_status: pre_empirical_calibration · synthetic_demo_data: true
        </p>
      </div>

      {/* ── Onboarding/data status summary ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Stato Dati & Pipeline</p>

        <div className="flex items-center gap-3 flex-wrap">
          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${ONBOARDING_COLORS[record.onboarding_status] ?? 'border-slate-200 text-slate-500'}`}>
            {ONBOARDING_LABELS[record.onboarding_status] ?? record.onboarding_status}
          </span>
          <span className="text-xs text-slate-500">
            {passedChecks}/{totalChecks} check superati
          </span>
        </div>

        {/* Workforce baseline summary */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 grid grid-cols-2 gap-2 sm:grid-cols-3 text-[10px]">
          {[
            ['Lavoratori totali', `${workforce_baseline.total_employees}`],
            ['Foundation Light', workforce_baseline.foundation_light_eligible ? 'Idonea' : 'Non idonea'],
            ['Soglia privacy N≥10', 'Applicata su tutti i cluster'],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-slate-400">{label}</p>
              <p className="text-slate-700 font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500 leading-relaxed">
          Il setup operativo e la validazione dati sono gestiti lato KORA Admin.
          Contatta il tuo referente KORA per aggiornamenti sui dati.
        </div>
      </div>

      {/* ── Navigation to company portal sections ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Il Tuo Portale KORA</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { href: '/company', label: 'Executive Cockpit', desc: 'Panoramica KORA Index e attivazione.' },
            { href: '/company/kora-index', label: 'KORA Index', desc: 'Dettaglio completo del KORA Index.' },
            { href: '/company/reports', label: 'Decision Pack', desc: 'Report e Decision Pack.' },
            { href: '/company/financial', label: 'Governance Finanziaria', desc: 'Budget-to-Human-Impact e BTI.' },
            { href: '/company/pillars', label: 'Pilastri & Iniziative', desc: 'Distribuzione per pillar KORA.' },
            { href: '/company/activation', label: 'Attivazione', desc: 'Dati di attivazione e partecipazione.' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
            >
              <div>
                <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        Foundation Light v0.1 · pre_empirical_calibration · synthetic_demo_data: true · company_scoped
      </p>

    </div>
  );
}
