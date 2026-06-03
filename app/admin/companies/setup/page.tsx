'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { lifecycleService } from '@/services/lifecycle/LifecycleService';
import type { CompanyAdminProvisioningDraft, ReadinessItemStatus } from '@/lib/types';

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Identità Azienda' },
  { id: 2, label: 'Perimetro Operativo' },
  { id: 3, label: 'Contesto Budget' },
  { id: 4, label: 'Fonti Dati' },
  { id: 5, label: 'Policy Strutturali' },
  { id: 6, label: 'Primo Admin' },
  { id: 7, label: 'Worker Roster' },
  { id: 8, label: 'Readiness' },
];

// ── Initial wizard state ──────────────────────────────────────────────────────

interface WizardState {
  // Step 1
  company_name: string;
  legal_name: string;
  vat_number: string;
  fiscal_code: string;
  sector: string;
  territory: string;
  headquarters_location: string;
  employee_count: string;
  size_band: string;
  kora_plan: string;
  analysis_period: string;
  assigned_advisor: string;
  onboarding_owner: string;
  // Step 2
  included_legal_entities: string;
  excluded_legal_entities: string;
  included_sites: string;
  excluded_sites: string;
  reporting_period_start: string;
  reporting_period_end: string;
  scope_limitations: string;
  // Step 3
  total_welfare_budget: string;
  welfare_budget: string;
  fringe_benefit_budget: string;
  training_budget: string;
  esg_budget: string;
  fiscal_notes: string;
  budget_owner: string;
  finance_contact: string;
  // Step 4 — data sources checklist
  data_sources: Set<string>;
  // Step 5 — structural policies checklist
  structural_policies: Set<string>;
  // Step 6 — admin provisioning
  admin_name: string;
  admin_email: string;
  admin_role: string;
  password_setup_mode: string;
  // Step 7 — worker roster
  expected_worker_count: string;
  worker_roster_source: string;
  my_kora_enabled: boolean;
  pib_private_enabled: boolean;
  worker_invitation_mode: string;
}

const INITIAL: WizardState = {
  company_name: '', legal_name: '', vat_number: '', fiscal_code: '',
  sector: '', territory: '', headquarters_location: '',
  employee_count: '', size_band: 'mid_50_249', kora_plan: 'Foundation Light',
  analysis_period: '2025', assigned_advisor: '', onboarding_owner: '',
  included_legal_entities: '', excluded_legal_entities: '',
  included_sites: '', excluded_sites: '',
  reporting_period_start: '2025-01-01', reporting_period_end: '2025-12-31',
  scope_limitations: '',
  total_welfare_budget: '', welfare_budget: '', fringe_benefit_budget: '',
  training_budget: '', esg_budget: '', fiscal_notes: '',
  budget_owner: '', finance_contact: '',
  data_sources: new Set(),
  structural_policies: new Set(),
  admin_name: '', admin_email: '', admin_role: 'COMPANY_ADMIN',
  password_setup_mode: 'invite_link',
  expected_worker_count: '', worker_roster_source: '',
  my_kora_enabled: true, pib_private_enabled: true,
  worker_invitation_mode: 'invite_link',
};

// ── Lookup data ───────────────────────────────────────────────────────────────

const SECTORS = [
  'manifattura', 'servizi_professionali', 'tecnologia', 'sanita',
  'educazione', 'retail', 'finanza', 'logistica', 'costruzioni',
  'hospitality', 'media', 'sociale', 'energia', 'altro',
];
const SECTOR_LABELS: Record<string, string> = {
  manifattura: 'Manifattura & Produzione', servizi_professionali: 'Servizi Professionali',
  tecnologia: 'Tecnologia & Software', sanita: 'Sanità & Farmaceutica',
  educazione: 'Educazione & Formazione', retail: 'Retail & Grande Distribuzione',
  finanza: 'Finanza & Assicurazioni', logistica: 'Logistica & Trasporti',
  costruzioni: 'Costruzioni & Ingegneria', hospitality: 'Hospitality & Turismo',
  media: 'Media & Comunicazione', sociale: 'Terzo Settore & No-profit',
  energia: 'Energia & Utilities', altro: 'Altro',
};

const DATA_SOURCES = [
  { id: 'hr_master', label: 'HR master aggregate' },
  { id: 'workforce_baseline', label: 'Workforce baseline' },
  { id: 'welfare_provider', label: 'Welfare provider export' },
  { id: 'lms_training', label: 'LMS / training export' },
  { id: 'finance_budget', label: 'Finance / budget file' },
  { id: 'esg_programs', label: 'People / ESG program records' },
  { id: 'policy_register', label: 'Company policy register' },
  { id: 'collective_agreements', label: 'Accordi collettivi' },
  { id: 'esg_report', label: 'ESG / sustainability report' },
  { id: 'partner_evidence', label: 'Partner / provider evidence' },
  { id: 'hr_kpi', label: 'HR KPI context' },
  { id: 'evidence_archive', label: 'Evidence archive' },
];

const STRUCTURAL_POLICIES = [
  { id: 'ferie_illimitate', label: 'Ferie illimitate' },
  { id: 'disconnessione', label: 'Diritto alla disconnessione' },
  { id: 'no_meeting', label: 'No meeting zone' },
  { id: 'smart_working', label: 'Smart / hybrid working policy' },
  { id: 'parental_leave', label: 'Enhanced parental leave' },
  { id: 'caregiving', label: 'Caregiving flexibility' },
  { id: 'rol_aggiuntivi', label: 'ROL aggiuntivi / protected categories' },
  { id: 'solidarity_leave', label: 'Solidarity leave fund' },
  { id: 'kids_campus', label: 'Kids@Campus' },
  { id: 'dog_campus', label: 'Dog@Campus' },
  { id: 'ccnl_plus', label: 'CCNL migliorativo work-life balance' },
];

// ── Readiness computation ─────────────────────────────────────────────────────

type ReadinessItem = { label: string; status: ReadinessItemStatus };

function computeReadiness(s: WizardState): ReadinessItem[] {
  const headcount = parseInt(s.employee_count) || 0;
  const hasIdentity  = !!(s.company_name && s.legal_name && s.sector && s.headquarters_location);
  const hasScope     = !!(s.reporting_period_start && s.reporting_period_end);
  const hasBudget    = !!(s.total_welfare_budget);
  const hasSources   = s.data_sources.size >= 3;
  const hasPolicies  = s.structural_policies.size >= 1;
  const hasAdmin     = !!(s.admin_name && s.admin_email);
  const hasWorkers   = !!(s.expected_worker_count && parseInt(s.expected_worker_count) >= 30);
  const privacy_ok   = headcount >= 30;

  return [
    { label: 'Identità azienda',           status: hasIdentity ? 'ready_for_pipeline' : 'draft' },
    { label: 'Perimetro operativo',         status: hasScope ? 'ready_for_pipeline' : 'draft' },
    { label: 'Contesto budget disponibile', status: hasBudget ? 'ready_for_pipeline' : 'draft' },
    { label: 'Fonti dati & evidenze',       status: hasSources ? 'ready_for_pipeline' : 'data_required' },
    { label: 'Policy strutturali',          status: hasPolicies ? 'ready_for_pipeline' : 'draft' },
    { label: 'Primo admin aziendale',       status: hasAdmin ? 'access_required' : 'access_required' },
    { label: 'Worker roster',               status: hasWorkers ? 'data_required' : 'data_required' },
    { label: 'Privacy boundary',            status: privacy_ok ? 'ready_for_pipeline' : 'privacy_review_required' },
    { label: 'Portal activation',           status: (hasIdentity && hasAdmin) ? 'ready_for_company_portal' : 'draft' },
    { label: 'Pipeline readiness',          status: (hasIdentity && hasScope && hasSources) ? 'ready_for_pipeline' : 'draft' },
  ];
}

const READINESS_BADGE: Record<ReadinessItemStatus, string> = {
  blocked:                  'border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',
  draft:                    'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]',
  data_required:            'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700',
  access_required:          'border-blue-200 bg-blue-50 text-blue-600',
  privacy_review_required:  'border-purple-200 bg-purple-50 text-purple-700',
  ready_for_pipeline:       'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',
  ready_for_company_portal: 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',
};

const READINESS_LABEL: Record<ReadinessItemStatus, string> = {
  blocked:                  'Bloccato',
  draft:                    'Bozza',
  data_required:            'Dati richiesti',
  access_required:          'Accesso da configurare',
  privacy_review_required:  'Privacy review',
  ready_for_pipeline:       'Pronto per pipeline',
  ready_for_company_portal: 'Pronto per portale',
};

// ── Field helpers ─────────────────────────────────────────────────────────────

function Input({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[rgba(6,3,43,0.62)]">
        {label}{required && <span className="text-[rgba(158,59,47,0.75)] ml-0.5">*</span>}
      </label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-[rgba(6,3,43,0.08)] px-3 py-2 text-sm text-[rgba(6,3,43,0.90)] placeholder:text-[rgba(6,3,43,0.28)] focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[rgba(6,3,43,0.62)]">
        {label}{required && <span className="text-[rgba(158,59,47,0.75)] ml-0.5">*</span>}
      </label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[rgba(6,3,43,0.08)] px-3 py-2 text-sm text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        <option value="">— Seleziona —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Checklist({ items, selected, onChange, doctrine }: {
  items: { id: string; label: string }[];
  selected: Set<string>;
  onChange: (id: string) => void;
  doctrine?: string;
}) {
  return (
    <div className="space-y-3">
      {doctrine && (
        <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 leading-relaxed">
          {doctrine}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const checked = selected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                checked ? 'border-[rgba(6,3,43,0.35)] bg-[#06032B] text-white' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.78)] hover:border-[rgba(6,3,43,0.14)]'
              }`}
            >
              <span className={`shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                checked ? 'bg-[#F8F6F1] text-[#06032B] font-bold' : 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.40)]'
              }`}>
                {checked ? '✓' : ''}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{selected.size} elementi selezionati</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EnterpriseOnboardingWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [draft, setDraft] = useState<ReturnType<typeof tenantService.createTenantDraft> | null>(null);
  const [adminDraft, setAdminDraft] = useState<CompanyAdminProvisioningDraft | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function update<K extends keyof WizardState>(field: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSet(field: 'data_sources' | 'structural_policies', id: string) {
    setState((prev) => {
      const next = new Set(prev[field]);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...prev, [field]: next };
    });
  }

  function handleCreateDraft() {
    const headcount = parseInt(state.employee_count) || 0;
    const newDraft = tenantService.createTenantDraft({
      company_name: state.company_name,
      legal_name: state.legal_name,
      vat_number: state.vat_number || undefined,
      fiscal_code: state.fiscal_code || undefined,
      sector: state.sector,
      territory: state.territory,
      headquarters_location: state.headquarters_location,
      employee_count: headcount,
      size_band: state.size_band as Parameters<typeof tenantService.createTenantDraft>[0]['size_band'],
      kora_plan: state.kora_plan,
      analysis_period: state.analysis_period,
    });
    setDraft(newDraft);

    if (state.admin_name && state.admin_email) {
      const ad = accountProvisioningService.createCompanyAdminDraft(
        newDraft.company_id,
        newDraft.tenant_id,
        {
          admin_name: state.admin_name,
          admin_email: state.admin_email,
          admin_role: state.admin_role as 'COMPANY_ADMIN' | 'COMPANY_VIEWER',
          password_setup_mode: state.password_setup_mode as CompanyAdminProvisioningDraft['password_setup_mode'],
        },
      );
      setAdminDraft(ad);
    }

    lifecycleService.logLifecycleEvent(
      'KORA_ADMIN', 'admin-001', 'tenant', newDraft.tenant_id,
      'create_draft', 'Enterprise Onboarding Wizard completato',
      `Bozza creata per ${state.company_name}`,
    );

    setResult({ type: 'success', message: `Bozza tenant creata: ${newDraft.tenant_id}` });
  }

  const readiness = computeReadiness(state);
  const readyCount = readiness.filter(r => ['ready_for_pipeline', 'ready_for_company_portal'].includes(r.status)).length;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          KORA Admin — Enterprise Company Onboarding
        </p>
        <h1 className="text-xl font-bold text-[#06032B] mt-0.5">Enterprise Onboarding</h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">
          Configura una nuova azienda cliente per il pilota KORA Foundation Light.
        </p>
      </div>

      {/* ── Admin note ── */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-4 py-3 text-xs text-[rgba(6,3,43,0.88)] leading-relaxed">
        <span className="font-semibold">KORA Admin — gestione azienda cliente.</span>{' '}
        Questa sezione è riservata agli operatori KORA. Il cliente non vede questo wizard.
        Gli utenti aziendali sono company-scoped: vedono solo la propria azienda.
      </div>

      {/* ── Stepper ── */}
      <div className="overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  s.id === step
                    ? 'bg-[#06032B] text-white'
                    : s.id < step
                    ? 'bg-[rgba(6,3,43,0.12)] text-[rgba(6,3,43,0.78)] hover:bg-[rgba(6,3,43,0.18)]'
                    : 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.40)] hover:bg-[rgba(6,3,43,0.12)]'
                }`}
              >
                <span>{s.id}</span>
                <span>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="mx-1 text-[rgba(6,3,43,0.28)] text-xs">›</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Demo disclaimer ── */}
      <div className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-3 py-2 text-xs text-[#8A5A00]">
        <span className="font-semibold">Bozza demo di sessione.</span>{' '}
        Nessun dato viene salvato permanentemente. La persistenza database sarà collegata in produzione.
        Nessuna password reale salvata. Nessuna email reale inviata.
      </div>

      {/* ─────────────────────── STEP CONTENT ─────────────────────────────── */}

      {/* STEP 1 — Identità azienda */}
      {step === 1 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">1 — Identità Azienda</h2>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Dati anagrafici e coordinare dell&apos;azienda cliente.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nome commerciale" value={state.company_name} onChange={(v) => update('company_name', v)} placeholder="es. Meridiana Group" required />
            <Input label="Ragione sociale" value={state.legal_name} onChange={(v) => update('legal_name', v)} placeholder="es. Meridiana Group S.r.l." required />
            <Input label="P. IVA" value={state.vat_number} onChange={(v) => update('vat_number', v)} placeholder="IT12345678901" />
            <Input label="Codice Fiscale" value={state.fiscal_code} onChange={(v) => update('fiscal_code', v)} placeholder="12345678901" />
            <Select label="Settore" value={state.sector} onChange={(v) => update('sector', v)}
              options={SECTORS.map((s) => ({ value: s, label: SECTOR_LABELS[s] ?? s }))} required />
            <Input label="Territorio" value={state.territory} onChange={(v) => update('territory', v)} placeholder="es. Lombardia — Nord Italia" required />
            <Input label="Sede principale" value={state.headquarters_location} onChange={(v) => update('headquarters_location', v)} placeholder="es. Milano, MI" required />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[rgba(6,3,43,0.62)]">N. dipendenti <span className="text-[rgba(158,59,47,0.75)]">*</span></label>
              <input type="number" min={1} value={state.employee_count}
                onChange={(e) => update('employee_count', e.target.value)}
                placeholder="es. 250"
                className="w-full rounded-md border border-[rgba(6,3,43,0.08)] px-3 py-2 text-sm text-[rgba(6,3,43,0.90)] placeholder:text-[rgba(6,3,43,0.28)] focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              {state.employee_count && parseInt(state.employee_count) < 30 && (
                <p className="text-[10px] text-[rgba(158,59,47,0.90)]">Foundation Light richiede almeno 30 lavoratori.</p>
              )}
            </div>
            <Select label="Fascia dimensionale" value={state.size_band} onChange={(v) => update('size_band', v)}
              options={[
                { value: 'small_30_49', label: '30–49 lavoratori' },
                { value: 'mid_50_249', label: '50–249 lavoratori' },
                { value: 'large_250_999', label: '250–999 lavoratori' },
                { value: 'enterprise_1000_plus', label: '1000+ lavoratori' },
              ]}
            />
            <Select label="Piano KORA" value={state.kora_plan} onChange={(v) => update('kora_plan', v)}
              options={[{ value: 'Foundation Light', label: 'Foundation Light' }]}
            />
            <Select label="Periodo di analisi" value={state.analysis_period} onChange={(v) => update('analysis_period', v)}
              options={['2025', '2024', '2023'].map((y) => ({ value: y, label: y }))}
            />
            <Input label="Advisor assegnato" value={state.assigned_advisor} onChange={(v) => update('assigned_advisor', v)} placeholder="es. Advisor Demo 1" />
            <Input label="Owner onboarding KORA" value={state.onboarding_owner} onChange={(v) => update('onboarding_owner', v)} placeholder="es. KORA Admin" />
          </div>
        </section>
      )}

      {/* STEP 2 — Perimetro operativo */}
      {step === 2 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">2 — Perimetro Operativo</h2>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Definisci le entità legali, i siti e la popolazione in scope per il KORA Index.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Entità legali incluse" value={state.included_legal_entities} onChange={(v) => update('included_legal_entities', v)} placeholder="es. Meridiana Group S.r.l." />
            <Input label="Entità legali escluse" value={state.excluded_legal_entities} onChange={(v) => update('excluded_legal_entities', v)} placeholder="es. Subsidiary estere" />
            <Input label="Siti inclusi" value={state.included_sites} onChange={(v) => update('included_sites', v)} placeholder="es. Milano HQ, Bergamo Plant" />
            <Input label="Siti esclusi" value={state.excluded_sites} onChange={(v) => update('excluded_sites', v)} placeholder="es. Cantieri temporanei" />
            <Input label="Inizio periodo di riferimento" value={state.reporting_period_start} onChange={(v) => update('reporting_period_start', v)} placeholder="2025-01-01" />
            <Input label="Fine periodo di riferimento" value={state.reporting_period_end} onChange={(v) => update('reporting_period_end', v)} placeholder="2025-12-31" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[rgba(6,3,43,0.62)]">Limitazioni di scope</label>
            <textarea value={state.scope_limitations} onChange={(e) => update('scope_limitations', e.target.value)}
              placeholder="es. Interinali esclusi, contratti < 3 mesi esclusi..."
              rows={3}
              className="w-full rounded-md border border-[rgba(6,3,43,0.08)] px-3 py-2 text-sm text-[rgba(6,3,43,0.90)] placeholder:text-[rgba(6,3,43,0.28)] focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>
          <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Il perimetro definisce la popolazione analizzata. Solo i lavoratori in scope contribuiscono al KORA Index.
            Gruppi &lt; 10 lavoratori sono soppressi per privacy.
          </div>
        </section>
      )}

      {/* STEP 3 — Contesto Budget & Fonti Disponibili */}
      {step === 3 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">3 — Contesto Budget & Dati Disponibili</h2>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Raccoglie il contesto operativo budget per attivare l&apos;azienda. Classificazione fiscale a seguire.</p>
          </div>

          <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 leading-relaxed space-y-1">
            <p className="font-semibold">Perimetro fiscale — non richiesto in onboarding.</p>
            <p>L&apos;onboarding attiva l&apos;azienda e raccoglie il contesto operativo. Il perimetro fiscale viene classificato successivamente in Data Intake / Budget-to-Human-Impact.</p>
            <p className="text-blue-600">L&apos;azienda può iniziare caricando file e documenti esterni senza scegliere subito una categoria fiscale.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Budget people/welfare disponibile — stima orientativa (€)" value={state.total_welfare_budget} onChange={(v) => update('total_welfare_budget', v)} placeholder="es. 280000" />
            <Input label="Budget owner / referente Finance" value={state.budget_owner} onChange={(v) => update('budget_owner', v)} placeholder="es. CFO / HR Director" />
            <Input label="Referente Finance" value={state.finance_contact} onChange={(v) => update('finance_contact', v)} placeholder="es. Luca Moretti" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[rgba(6,3,43,0.62)]">Note contesto budget (opzionale)</label>
            <textarea value={state.fiscal_notes} onChange={(e) => update('fiscal_notes', e.target.value)}
              placeholder="es. Budget approssimato, accordi in corso di definizione, contatto Finance da coinvolgere..."
              rows={3}
              className="w-full rounded-md border border-[rgba(6,3,43,0.08)] px-3 py-2 text-sm text-[rgba(6,3,43,0.90)] placeholder:text-[rgba(6,3,43,0.28)] focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>

          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.52)] space-y-1">
            <p>Le categorie fiscali non sono un prerequisito di onboarding: servono nella fase di classificazione, allocazione budget e governance finanziaria.</p>
            <p>La classificazione Eligible / Limited / Blocked e il perimetro welfare/fringe/people ESG vengono definiti in Data Intake, con supporto KORA Admin e Advisor.</p>
          </div>
        </section>
      )}

      {/* STEP 4 — Fonti dati & evidenze */}
      {step === 4 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">4 — Fonti Dati & Evidenze</h2>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Seleziona le fonti dati disponibili per questa azienda.</p>
          </div>
          <Checklist
            items={DATA_SOURCES}
            selected={state.data_sources}
            onChange={(id) => toggleSet('data_sources', id)}
            doctrine="Le fonti dati determinano la qualità del Confidence Score e l'affidabilità del KORA Index. Più fonti verificate → CS più alto."
          />
        </section>
      )}

      {/* STEP 5 — Policy strutturali */}
      {step === 5 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">5 — Policy Strutturali</h2>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Seleziona le policy organizzative formali attive in azienda.</p>
          </div>
          <Checklist
            items={STRUCTURAL_POLICIES}
            selected={state.structural_policies}
            onChange={(id) => toggleSet('structural_policies', id)}
            doctrine="Non tutte le azioni KORA passano da un partner o da una fattura. KORA riconosce anche policy organizzative strutturali, se formalizzate, verificabili, aggregate e privacy-safe. La fiducia organizzativa è misurabile solo come capacità collettiva, non come controllo individuale."
          />
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.52)]">
            Le policy strutturali generano Impact Units aggregate senza un costo diretto. Non sono budget-mediated.
            Il dato individuale di utilizzo non viene mai raccolto (individual_usage_visible = false).
          </div>
        </section>
      )}

      {/* STEP 6 — Primo admin aziendale */}
      {step === 6 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">6 — Primo Admin Aziendale</h2>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Configura il primo accesso company-scoped per il cliente.</p>
          </div>
          <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 leading-relaxed space-y-0.5">
            <p><span className="font-semibold">Foundation Light usa ruoli semplici ma supporta più utenti per azienda.</span></p>
            <p><span className="font-semibold">Scoping aziendale.</span> Gli utenti aziendali sono company-scoped: vedono solo la propria azienda.</p>
            <p>La creazione password reale richiede backend / auth provider. Questa versione prepara una bozza invito / accesso.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nome admin" value={state.admin_name} onChange={(v) => update('admin_name', v)} placeholder="es. Marco Bianchi" required />
            <Input label="Email admin" value={state.admin_email} onChange={(v) => update('admin_email', v)} placeholder="es. m.bianchi@azienda.it" required />
            <Select label="Ruolo" value={state.admin_role} onChange={(v) => update('admin_role', v)}
              options={[
                { value: 'COMPANY_ADMIN',  label: 'COMPANY_ADMIN — accesso completo portale aziendale' },
                { value: 'COMPANY_VIEWER', label: 'COMPANY_VIEWER — sola lettura (Executive Cockpit e KORA Index)' },
              ]}
            />
            <Select label="Modalità accesso" value={state.password_setup_mode} onChange={(v) => update('password_setup_mode', v)}
              options={[
                { value: 'invite_link', label: 'Invite link (produzione — non reale in demo)' },
                { value: 'temporary_password_manual_demo', label: 'Password temporanea manuale (solo demo)' },
                { value: 'external_auth_pending', label: 'Auth provider esterno (da configurare)' },
              ]}
            />
          </div>
          {state.password_setup_mode === 'temporary_password_manual_demo' && (
            <div className="rounded border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] px-3 py-2.5 text-xs text-[#9E3B2F]">
              <span className="font-semibold">Solo demo.</span>{' '}
              La password temporanea manuale è esclusivamente per sessioni demo locali.
              Non viene salvata in nessun database. In produzione usare sempre invite link o auth provider esterno.
            </div>
          )}
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.52)]">
            COMPANY_ADMIN: executive-cockpit, kora-index, reports, financial, pillars, activation, contribution, profile. COMPANY_VIEWER: executive-cockpit, kora-index, profile. È possibile aggiungere ulteriori utenti con ruolo COMPANY_VIEWER per condividere l&apos;accesso in sola lettura.
            Sezioni operative (setup, ingestion, uef-review, scoring) rimangono gestite lato KORA Admin.
          </div>
        </section>
      )}

      {/* STEP 7 — Worker roster & My KORA */}
      {step === 7 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">7 — Worker Roster & My KORA</h2>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Configura le basi per la popolazione lavoratori e My KORA.</p>
          </div>
          <div className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(199,111,61,0.08)] px-3 py-2.5 text-xs text-[rgba(6,3,43,0.88)] leading-relaxed space-y-0.5">
            <p><span className="font-semibold">Privacy boundary costituzionale.</span> Il PIB individuale resta privato al lavoratore.</p>
            <p>L&apos;azienda vede solo aggregati privacy-safe (N≥10). employer_can_view_individual_pib = false su ogni record.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="N. lavoratori attesi nel roster" value={state.expected_worker_count} onChange={(v) => update('expected_worker_count', v)} placeholder="es. 250" required />
            <Select label="Fonte roster" value={state.worker_roster_source} onChange={(v) => update('worker_roster_source', v)}
              options={[
                { value: 'csv_upload_demo', label: 'CSV upload (demo)' },
                { value: 'hris_export_demo', label: 'HRIS export (demo)' },
                { value: 'manual_aggregate_entry', label: 'Inserimento manuale aggregato' },
                { value: 'future_api', label: 'API futura (da configurare)' },
              ]}
            />
            <Select label="Modalità invito lavoratori" value={state.worker_invitation_mode} onChange={(v) => update('worker_invitation_mode', v)}
              options={[
                { value: 'invite_link', label: 'Link invito individuale' },
                { value: 'bulk_email', label: 'Email massiva (demo)' },
                { value: 'manual', label: 'Attivazione manuale' },
              ]}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'My KORA abilitato',
                desc: 'I lavoratori possono accedere al loro spazio personale KORA.',
                field: 'my_kora_enabled' as const,
              },
              {
                label: 'PIB privato abilitato',
                desc: 'Il PIB individuale è visibile al solo lavoratore. Sempre privato.',
                field: 'pib_private_enabled' as const,
              },
            ].map(({ label, desc, field }) => (
              <button
                key={field}
                type="button"
                onClick={() => update(field, !state[field])}
                className={`rounded-lg border p-3 text-left transition-all ${
                  state[field] ? 'border-[rgba(6,3,43,0.35)] bg-[#06032B]' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] hover:border-[rgba(6,3,43,0.14)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${state[field] ? 'text-white' : 'text-[rgba(6,3,43,0.90)]'}`}>{label}</span>
                  {state[field] && <span className="rounded bg-[rgba(47,125,85,0.08)]0 px-1 py-0.5 text-[8px] font-bold text-white">ON</span>}
                </div>
                <p className={`text-[10px] mt-1 leading-snug ${state[field] ? 'text-[rgba(6,3,43,0.28)]' : 'text-[rgba(6,3,43,0.52)]'}`}>{desc}</p>
              </button>
            ))}
          </div>
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.52)] leading-relaxed">
            Privacy threshold N=10: gruppi con meno di 10 lavoratori sono soppressi automaticamente in tutti gli aggregati aziendali.
            L&apos;azienda non può mai identificare un lavoratore individuale.
          </div>
        </section>
      )}

      {/* STEP 8 — Readiness finale */}
      {step === 8 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">8 — Readiness Finale</h2>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
              {readyCount} / {readiness.length} elementi pronti.
            </p>
          </div>

          {/* Readiness matrix */}
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
            <div className="px-4 py-2 bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Matrice Readiness</p>
            </div>
            <div className="divide-y divide-[rgba(6,3,43,0.05)]">
              {readiness.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(6,3,43,0.03)]">
                  <p className="text-xs text-[rgba(6,3,43,0.78)]">{item.label}</p>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${READINESS_BADGE[item.status]}`}>
                    {READINESS_LABEL[item.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {state.company_name && (
            <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-2">
              <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)]">Riepilogo azienda</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-[10px]">
                <div><p className="text-[rgba(6,3,43,0.40)]">Azienda</p><p className="text-[rgba(6,3,43,0.78)] font-semibold">{state.company_name}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Dipendenti</p><p className="text-[rgba(6,3,43,0.78)] font-semibold">{state.employee_count || '—'}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Settore</p><p className="text-[rgba(6,3,43,0.78)] font-semibold">{(SECTOR_LABELS[state.sector] ?? state.sector) || '—'}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Piano</p><p className="text-[rgba(6,3,43,0.78)] font-semibold">{state.kora_plan}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Fonti dati</p><p className="text-[rgba(6,3,43,0.78)] font-semibold">{state.data_sources.size} selezionate</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Policy strutturali</p><p className="text-[rgba(6,3,43,0.78)] font-semibold">{state.structural_policies.size} selezionate</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Admin aziendale</p><p className="text-[rgba(6,3,43,0.78)] font-semibold">{state.admin_name || '—'}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">My KORA</p><p className="text-[rgba(6,3,43,0.78)] font-semibold">{state.my_kora_enabled ? 'Abilitato' : 'Non abilitato'}</p></div>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleCreateDraft}
              disabled={!(state.company_name && state.legal_name)}
              className="rounded-lg bg-[#06032B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Crea bozza tenant
            </button>
            {draft && (
              <>
                <Link href="/admin/companies" className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-2.5 text-xs font-semibold text-[rgba(6,3,43,0.78)] hover:bg-[rgba(6,3,43,0.03)] transition-colors">
                  Company Registry →
                </Link>
                <button
                  type="button"
                  onClick={() => { setState(INITIAL); setDraft(null); setAdminDraft(null); setResult(null); setStep(1); }}
                  className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.52)] hover:bg-[rgba(6,3,43,0.05)] transition-colors"
                >
                  Archivia bozza
                </button>
              </>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded border px-3 py-2 text-xs ${
              result.type === 'success' ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]' : 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]'
            }`}>
              {result.message}
            </div>
          )}

          {/* Admin draft preview */}
          {adminDraft && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800">Bozza accesso admin aziendale</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><p className="text-blue-600">ID provisioning</p><p className="text-blue-800 font-mono">{adminDraft.provisioning_id}</p></div>
                <div><p className="text-blue-600">Ruolo</p><p className="text-blue-800">{adminDraft.admin_role}</p></div>
                <div><p className="text-blue-600">Modalità accesso</p><p className="text-blue-800">{adminDraft.password_setup_mode}</p></div>
                <div><p className="text-blue-600">Invito</p><p className="text-blue-800">{adminDraft.invitation_status}</p></div>
              </div>
              <p className="text-[10px] font-mono text-blue-500">{adminDraft.security_notes}</p>
            </div>
          )}

          <p className="text-[10px] font-mono text-[rgba(6,3,43,0.28)]">
            demo_session_only: true · production_ready: false · synthetic_demo_data: true
          </p>
        </section>
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between border-t border-[rgba(6,3,43,0.05)] pt-5">
        <div className="flex gap-3">
          {step > 1 && (
            <button type="button" onClick={() => setStep((s) => s - 1)}
              className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-2 text-xs font-semibold text-[rgba(6,3,43,0.78)] hover:bg-[rgba(6,3,43,0.03)] transition-colors">
              ← Indietro
            </button>
          )}
          {step < STEPS.length && (
            <button type="button" onClick={() => setStep((s) => s + 1)}
              className="rounded bg-[#06032B] px-4 py-2 text-xs font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors">
              Avanti →
            </button>
          )}
        </div>
        <Link href="/admin/companies" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          ← Company Registry
        </Link>
      </div>

    </div>
  );
}
