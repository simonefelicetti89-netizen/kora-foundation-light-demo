'use client';
// C-11: Profilo & Stato — metadati azienda e stato della pipeline KORA.
// Scopo: rispondere a 'dove siamo nel percorso KORA e cosa manca per il Decision Pack?'
// Read-only: nessuna modifica disponibile al company admin dal portale.

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';
import { useScoringResult } from '@/lib/scoring-result';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';
import { ExplainabilityHint } from '@/components/company/cockpit/ExplainabilityHint';

// ── Onboarding status → KORA tokens ──────────────────────────────────────────

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

function onboardingToken(status: string): { bg: string; text: string } {
  if (['fully_onboarded', 'decision_pack_ready'].includes(status)) return { bg: TOKENS.safeguard.pass.bg, text: TOKENS.safeguard.pass.text };
  if (['not_started'].includes(status)) return { bg: TOKENS.inkBorder, text: TOKENS.inkHint };
  if (status.startsWith('blocked')) return { bg: TOKENS.safeguard.cap.bg, text: TOKENS.safeguard.cap.text };
  return { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text };
}

function safeguardToken(status: string): { bg: string; text: string; label: string } {
  if (status === 'CLEAR')   return { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text,  label: 'Clear'   };
  if (status === 'FLAGGED') return { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text,   label: 'Flagged' };
  return                           { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text, label: 'Warning' };
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}>{label}</p>
      <p style={{ fontSize: mono ? '10px' : '12px', color: TOKENS.ink, marginTop: 3, fontFamily: mono ? 'monospace' : undefined }}>{value}</p>
    </div>
  );
}

// C-17: Company Profile — company-scoped, read-only
export default function CompanyProfilePage() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();

  const currentUser = accountProvisioningService.getCurrentDemoUser(activeRole);
  const COMPANY_ID  = currentUser.company_id ?? 'meridiana-group';

  const record        = companyOnboardingService.getCompanyOnboardingRecord(COMPANY_ID);
  const { data: scoring } = useScoringResult({ tenantId: COMPANY_ID, scenarioId: activeScenario });
  const koraOutput    = scoring?.koraIndex;
  const tenant        = tenantService.getTenant(COMPANY_ID);
  const companyAccounts = accountProvisioningService.getAccountsForCompany(COMPANY_ID);
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(COMPANY_ID);
  workerProvisioningService.assertEmployerCannotViewIndividualPIB(COMPANY_ID, '');

  // No record/tenant state
  if (!tenant && !record) {
    return (
      <div className="space-y-5">
        <PageMasthead eyebrow="Il tuo spazio KORA" title="Profilo & Stato" subline="Configurazione aziendale e stato della pipeline KORA." />
        <div style={{ background: TOKENS.safeguard.watch.bg, border: `1px solid ${TOKENS.safeguard.watch.dot}44`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.safeguard.watch.text }}>Onboarding pendente</p>
          <p style={{ fontSize: '12px', color: TOKENS.safeguard.watch.text, marginTop: 6, lineHeight: 1.6 }}>Il profilo aziendale non è ancora disponibile. L&apos;azienda è in fase di configurazione lato KORA Admin.</p>
          <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.safeguard.watch.text, opacity: 0.75, marginTop: 8 }}>company_id: {COMPANY_ID} · synthetic_demo_data: true</p>
        </div>
      </div>
    );
  }

  const profile = record?.profile ?? {
    company_name: tenant?.company_name ?? COMPANY_ID,
    legal_form: tenant?.legal_name ?? '—',
    sector: tenant?.sector ?? '—',
    location: tenant?.headquarters_location ?? '—',
    foundation_year: '—',
    contact_role: '—',
    employee_count: tenant?.employee_count ?? 0,
  };
  const workforce_baseline = record?.workforce_baseline ?? {
    total_employees: tenant?.employee_count ?? 0,
    foundation_light_eligible: (tenant?.employee_count ?? 0) >= 30,
    suppressed_cluster_count: 0,
    eligibility_note: 'Baseline workforce non ancora caricata.',
  };
  const readiness_checks = record?.readiness_checks ?? [];
  const passedChecks = readiness_checks.filter((c) => c.status === 'ok').length;
  const totalChecks  = readiness_checks.length;
  const obToken = record ? onboardingToken(record.onboarding_status) : { bg: TOKENS.inkBorder, text: TOKENS.inkHint };

  return (
    <div className="space-y-5">

      {/* 1. PageMasthead */}
      <PageMasthead
        eyebrow="Il tuo spazio KORA · Profilo & Stato"
        title={profile.company_name as string}
        subline="Configurazione aziendale, stato della pipeline KORA e accesso al workspace."
        meta={`${activeScenario} · dati sintetici demo · company-scoped`}
      />

      {/* 2. Company-scoped boundary note */}
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.accent}33`, borderRadius: TOKENS.cardRadius, padding: '1rem 1.25rem', fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
        <p><span style={{ fontWeight: 600, color: TOKENS.ink }}>Stai visualizzando lo spazio KORA della tua azienda.</span> Gli utenti aziendali vedono solo la propria azienda.</p>
        <p style={{ marginTop: 4 }}>Il PIB individuale resta privato al lavoratore. L&apos;azienda vede solo aggregati privacy-safe (N≥10).</p>
        <p style={{ marginTop: 4 }}>Il setup operativo e la validazione dati sono gestiti lato KORA Admin.</p>
      </div>

      {/* 3. Tenant identity */}
      {tenant && (
        <>
          <SectionLabel>Identità tenant</SectionLabel>
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label="Azienda"           value={tenant.company_name} />
              <InfoRow label="Settore"            value={tenant.sector} />
              <InfoRow label="Territorio"         value={tenant.territory} />
              <InfoRow label="Sede principale"    value={tenant.headquarters_location} />
              <InfoRow label="Dipendenti"         value={String(tenant.employee_count)} />
              <InfoRow label="Piano KORA"         value={tenant.kora_plan} />
              <InfoRow label="Periodo di analisi" value={tenant.analysis_period} />
              <InfoRow label="Stato tenant"       value={tenant.tenant_status} />
              <InfoRow label="company_id"         value={COMPANY_ID} mono />
            </div>
          </div>
        </>
      )}

      {/* 4. Access scope */}
      <SectionLabel>Accesso & utenti aziendali</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Scope accesso"   value="company_scoped" />
          <InfoRow label="Utenti configurati" value={String(companyAccounts.length)} />
          <InfoRow label="Sezioni visibili"   value="Intelligence, Reports, Financial" />
          <InfoRow label="Sezioni operative"  value="Gestite da KORA Admin" />
        </div>
        <div style={{ marginTop: 12, background: TOKENS.inkBorder, borderRadius: 8, padding: '10px 12px', fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Il setup operativo, l&apos;ingestion e lo scoring sono gestiti lato KORA Admin e non sono visibili nel portale aziendale.
        </div>
      </div>

      {/* 5. Worker & My KORA */}
      <SectionLabel>Worker & My KORA</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'My KORA abilitati',   value: workerSummary.my_kora_enabled_count },
            { label: 'PIB privato',         value: workerSummary.pib_private_enabled_count },
            { label: 'Lavoratori in roster', value: workerSummary.total_workers },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.875rem', color: TOKENS.ink, lineHeight: 1, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, background: `${TOKENS.accent}08`, border: `1px solid ${TOKENS.accent}22`, borderRadius: 8, padding: '10px 12px', fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questo spazio è personale: l&apos;azienda non vede il PIB individuale del lavoratore. L&apos;azienda vede solo aggregati anonimizzati sopra soglia privacy (N≥10).
        </div>
      </div>

      {/* 6. Stato KORA */}
      <SectionLabel>Stato KORA</SectionLabel>
      {koraOutput ? (
        <div className="grid grid-cols-3 gap-4">
          {/* KORA Index */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.125rem' }}>
            <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>KORA Index</p>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2.5rem', color: TOKENS.ink, lineHeight: 1, margin: '8px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
              {koraOutput.kora_index_value}
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>/100</p>
          </div>
          {/* Confidence Score */}
          <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.accent}33`, borderRadius: TOKENS.cardRadius, padding: '1.125rem' }}>
            <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>Confidence Score</p>
            <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2.5rem', color: TOKENS.accent, lineHeight: 1, margin: '8px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(koraOutput.confidence_score * 100)}%
            </p>
            <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>Indicatore esterno di affidabilità dati</p>
          </div>
          {/* Activation Safeguard */}
          {(() => {
            const sg = safeguardToken(koraOutput.safeguard_status);
            return (
              <div style={{ background: sg.bg, border: `1px solid ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadius, padding: '1.125rem' }}>
                <p style={{ fontSize: '11px', color: sg.text, opacity: 0.75 }}>Activation Safeguard</p>
                <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.75rem', color: sg.text, lineHeight: 1, margin: '8px 0 4px' }}>
                  {sg.label}
                </p>
                <p style={{ fontSize: '11px', color: sg.text, opacity: 0.75 }}>Stato soglia attivazione</p>
              </div>
            );
          })()}
        </div>
      ) : (
        <div style={{ background: TOKENS.safeguard.watch.bg, border: `1px solid ${TOKENS.safeguard.watch.dot}44`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.safeguard.watch.text }}>KORA Index non ancora disponibile</p>
          <p style={{ fontSize: '12px', color: TOKENS.safeguard.watch.text, opacity: 0.85, marginTop: 6 }}>Il KORA Index sarà disponibile al termine della pipeline dati.</p>
          <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.safeguard.watch.text, opacity: 0.65, marginTop: 8 }}>
            onboarding: {tenant?.onboarding_status ?? 'not_started'} · data_readiness: {tenant?.data_readiness_status ?? '—'}
          </p>
        </div>
      )}

      {/* 7. Stato Dati & Pipeline */}
      <SectionLabel>Stato dati & pipeline</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <div className="flex items-center gap-3 flex-wrap mb-4">
          {record ? (
            <>
              <span style={{ fontSize: '11px', fontWeight: 500, background: obToken.bg, color: obToken.text, borderRadius: 4, padding: '3px 8px' }}>
                {ONBOARDING_LABELS[record.onboarding_status] ?? record.onboarding_status}
              </span>
              <span style={{ fontSize: '12px', color: TOKENS.inkSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {passedChecks}/{totalChecks} check superati
              </span>
            </>
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 500, background: TOKENS.inkBorder, color: TOKENS.inkHint, borderRadius: 4, padding: '3px 8px' }}>
              Onboarding non avviato
            </span>
          )}
        </div>
        {/* Workforce baseline grid */}
        <div className="grid grid-cols-3 gap-4" style={{ background: TOKENS.inkBorder, borderRadius: 8, padding: '12px' }}>
          {[
            ['Lavoratori totali',   String(workforce_baseline.total_employees)],
            ['Foundation Light',    workforce_baseline.foundation_light_eligible ? 'Idonea' : 'Non idonea'],
            ['Soglia privacy N≥10', 'Applicata su tutti i cluster'],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>{label}</p>
              <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginTop: 3 }}>{value}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Il setup operativo e la validazione dati sono gestiti lato KORA Admin. Contatta il tuo referente KORA per aggiornamenti sui dati.
        </div>
      </div>

      {/* 8. Portale KORA */}
      <SectionLabel>Il tuo portale KORA</SectionLabel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: '/company',             label: 'Executive Cockpit',     desc: 'Panoramica KORA Index e attivazione.' },
          { href: '/company/kora-index',  label: 'KORA Index',            desc: 'Dettaglio completo del KORA Index.' },
          { href: '/company/reports',     label: 'Decision Pack',         desc: 'Report e Decision Pack.' },
          { href: '/company/financial',   label: 'Governance Finanziaria',desc: 'Budget-to-Human-Impact e BTI.' },
          { href: '/company/pillars',     label: 'Pilastri & Iniziative', desc: 'Distribuzione per pillar KORA.' },
          { href: '/company/activation',  label: 'Attivazione',           desc: 'Dati di attivazione e partecipazione.' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{ display: 'block', background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '0.875rem', textDecoration: 'none', transition: 'border-color 0.15s' }}
          >
            <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink }}>{item.label}</p>
            <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 3 }}>{item.desc}</p>
          </Link>
        ))}
      </div>

      <ExplainabilityHint />

      {/* 9. ProvenanceFooter */}
      <ProvenanceFooter
        methodologyVersionId={koraOutput?.methodology_version_id ?? 'KORA Methodology v0.1'}
        calibrationStatus={koraOutput?.calibration_status ?? 'pre_empirical_calibration'}
        reportingPeriod={koraOutput?.reporting_period ?? activeScenario}
      />
    </div>
  );
}
