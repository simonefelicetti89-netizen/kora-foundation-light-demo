'use client';
// C-12: Onboarding — stato del percorso di onboarding KORA.
// Scopo: mostrare lo stato attuale dell'onboarding e i prossimi passi.
// I dettagli operativi sono gestiti lato KORA Admin.

import Link from 'next/link';
import { DemoFlowBanner } from '@/components/admin/DemoFlowBanner';
import { useRole, useScenario } from '@/lib/demo-state';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { useScoringResult } from '@/lib/scoring-result';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';

// ── Onboarding status tokens ──────────────────────────────────────────────────

const ONBOARDING_STATUS_LABEL: Record<string, string> = {
  not_started:                    'Non avviato',
  profile_complete:               'Profilo completato',
  workforce_baseline_complete:    'Baseline completata',
  program_data_loaded:            'Dati programmi ricevuti',
  hr_kpi_added:                   'KPI HR ricevuti',
  readiness_check_passed:         'Readiness verificata',
  ready_for_scoring:              'Output in preparazione',
  pipeline_active:                'Elaborazione attiva',
  decision_pack_ready:            'Decision Pack disponibile',
  fully_onboarded:                'Completamente onboardato',
  blocked_insufficient_workforce: 'Organico insufficiente',
};

function onboardingToken(status: string): { bg: string; text: string } {
  if (['fully_onboarded', 'decision_pack_ready', 'readiness_check_passed'].includes(status))
    return { bg: TOKENS.safeguard.pass.bg, text: TOKENS.safeguard.pass.text };
  if (status.startsWith('blocked'))
    return { bg: TOKENS.safeguard.cap.bg, text: TOKENS.safeguard.cap.text };
  if (['not_started'].includes(status))
    return { bg: TOKENS.inkBorder, text: TOKENS.inkHint };
  return { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text };
}

function tenantStatusToken(status: string): { bg: string; text: string } {
  if (status === 'active' || status === 'pilot')  return { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  };
  if (status === 'blocked')                       return { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   };
  return                                                 { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text };
}

// ── Status card ───────────────────────────────────────────────────────────────

function StatusCard({ label, value, note, ok }: { label: string; value: string; note?: string; ok?: boolean }) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem' }}>
      <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: ok === true ? TOKENS.safeguard.pass.text : ok === false ? TOKENS.safeguard.cap.text : TOKENS.ink, marginTop: 6 }}>
        {value}
      </p>
      {note && <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 4, lineHeight: 1.55 }}>{note}</p>}
    </div>
  );
}

// C-14: Company Onboarding Room — Stato Progetto
export default function CompanyOnboardingRoom() {
  const { activeRole }  = useRole();
  const { activeScenario } = useScenario();

  const companyId  = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const tenant     = tenantService.getTenant(companyId);
  const intake     = companyDataIntakeService.getDataReadinessSummary(companyId);
  const workerSumm = workerProvisioningService.getWorkerProvisioningSummary(companyId);
  const nextAction = companyOnboardingService.getNextBestAction(companyId);
  const pipeline   = companyOnboardingService.getPipelineReadiness(companyId);
  const checks     = companyOnboardingService.getReadinessChecks(companyId);
  const { data: scoring } = useScoringResult({ tenantId: companyId, scenarioId: activeScenario });
  const hasIndex = scoring?.status === 'ok';

  workerProvisioningService.assertEmployerCannotViewIndividualPIB(companyId, '');

  if (!tenant) {
    return (
      <div className="space-y-5">
        <PageMasthead eyebrow="Stato progetto" title="Stato progetto" subline="Avanzamento pilot e governance Foundation Light." />
        <div style={{ background: TOKENS.safeguard.cap.bg, border: `1px solid ${TOKENS.safeguard.cap.dot}44`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.safeguard.cap.text }}>Azienda non trovata</p>
          <Link href="/company" style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 8, display: 'block' }}>← Executive Cockpit</Link>
        </div>
      </div>
    );
  }

  const onbLabel  = ONBOARDING_STATUS_LABEL[tenant.onboarding_status] ?? tenant.onboarding_status.replace(/_/g, ' ');
  const obTk      = onboardingToken(tenant.onboarding_status);
  const tsTk      = tenantStatusToken(tenant.tenant_status);

  const companyReadinessChecks = checks.filter((c) => !c.blocking || c.status !== 'ok');
  const allClear = checks.length > 0 && checks.every((c) => c.status === 'ok');

  return (
    <div className="space-y-5">

      <DemoFlowBanner
        title="Synthetic Demo Flow — Stato Onboarding"
        description="Questa pagina mostra dati sintetici Meridiana. Lo stato onboarding reale è visibile nel Workspace Live."
        canonicalHref="/company/workspace"
        canonicalLabel="Workspace Live"
      />

      {/* 1. PageMasthead */}
      <PageMasthead
        eyebrow="Stato progetto · Foundation Light Pilot"
        title="Stato progetto"
        subline={`${tenant.company_name} · avanzamento pilot e governance della pipeline KORA.`}
        meta={`${activeScenario} · dati sintetici demo`}
      />

      {/* Status badges row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span style={{ fontSize: '11px', fontWeight: 500, background: tsTk.bg, color: tsTk.text, borderRadius: 4, padding: '3px 8px' }}>
          {tenant.tenant_status}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 500, background: obTk.bg, color: obTk.text, borderRadius: 4, padding: '3px 8px' }}>
          {onbLabel}
        </span>
      </div>

      {/* 2. Service-assisted model notice */}
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem 1.25rem', fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
        <p style={{ fontWeight: 600, color: TOKENS.ink, marginBottom: 6 }}>Stato del progetto KORA per la tua azienda.</p>
        <p>KORA opera la pipeline sui dati ricevuti dal cliente. L&apos;azienda visualizza output aggregati e Decision Pack, senza operare intake, review o scoring.</p>
        <p style={{ marginTop: 4 }}>Il KORA Operator gestisce data intake, validazione UEF e scoring readiness. L&apos;azienda invia i file a KORA.</p>
        <p style={{ marginTop: 4, color: TOKENS.inkHint }}>Il PIB individuale resta privato al lavoratore.</p>
      </div>

      {/* 3. Advisor review banner — condizionale */}
      {hasIndex && (
        <div style={{ background: TOKENS.safeguard.watch.bg, border: `1px solid ${TOKENS.safeguard.watch.dot}44`, borderRadius: TOKENS.cardRadius, padding: '1rem 1.25rem', fontSize: '12px', color: TOKENS.safeguard.watch.text, lineHeight: 1.65 }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Bozza disponibile — revisione advisor richiesta</p>
          <p>Il Decision Pack è stato generato. Un advisor KORA deve completare la revisione prima della versione certificata.</p>
        </div>
      )}

      {/* 4. Prossima azione */}
      <SectionLabel>Prossima azione</SectionLabel>
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.accent}33`, borderRadius: TOKENS.cardRadius, padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink }}>{nextAction.action}</p>
        {nextAction.detail && (
          <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 6, lineHeight: 1.6 }}>{nextAction.detail}</p>
        )}
      </div>

      {/* 5. Status grid — 6 card */}
      <SectionLabel>Stato progetto</SectionLabel>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatusCard
          label="Dati ricevuti"
          value={intake.intake_status === 'ready_for_ingestion' ? 'Ricevuti' : intake.intake_status === 'not_started' ? 'In attesa' : hasIndex ? 'Revisione advisor' : intake.intake_status.replace(/_/g, ' ')}
          note={`${intake.total_rows} righe · ${intake.ready_for_ingestion_rows} elaborate`}
          ok={intake.intake_status === 'ready_for_ingestion'}
        />
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem' }}>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>Worker Roster</p>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2rem', color: TOKENS.ink, lineHeight: 1, margin: '8px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
            {workerSumm?.total_workers ?? 0}
          </p>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>{workerSumm?.active_worker_accounts ?? 0} attivi</p>
        </div>
        <StatusCard
          label="KORA Index"
          value={hasIndex ? 'Disponibile' : 'Non disponibile'}
          note={hasIndex ? 'Elaborazione completata' : 'In attesa di dati e validazione'}
          ok={hasIndex}
        />
        <StatusCard
          label="Decision Pack"
          value={hasIndex ? 'Disponibile' : 'Non disponibile'}
          note={hasIndex ? 'Report pronto' : 'Disponibile dopo elaborazione KORA'}
          ok={hasIndex}
        />
        <StatusCard
          label="Elaborazione KORA"
          value={pipeline.status === 'ok' ? 'Completata' : pipeline.status === 'blocked' ? 'Bloccata' : hasIndex ? 'Advisor review' : 'In corso'}
          note="Stato elaborazione KORA"
          ok={pipeline.status === 'ok'}
        />
        <StatusCard
          label="Fase"
          value={onbLabel}
          note="Stato onboarding corrente"
        />
      </div>

      {/* 6. Readiness checklist */}
      {checks.length > 0 && (
        <>
          <SectionLabel>Readiness Checklist</SectionLabel>
          {allClear ? (
            <div style={{ background: TOKENS.safeguard.pass.bg, border: `1px solid ${TOKENS.safeguard.pass.dot}44`, borderRadius: TOKENS.cardRadius, padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.safeguard.pass.text }}>Tutti i requisiti soddisfatti — elaborazione KORA attiva.</p>
            </div>
          ) : (
            <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
              {companyReadinessChecks.slice(0, 5).map((c, i) => {
                const isOk       = c.status === 'ok';
                const isBlocking = c.blocking && !isOk && !hasIndex;
                const isAdvisory = !isOk && !isBlocking;
                const iconColor  = isOk ? TOKENS.safeguard.pass.dot : isBlocking ? TOKENS.safeguard.cap.text : TOKENS.safeguard.watch.text;
                const icon       = isOk ? '✓' : isBlocking ? '✕' : '!';
                return (
                  <div
                    key={c.label}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < companyReadinessChecks.slice(0, 5).length - 1 ? TOKENS.cardBorder : 'none',
                      background: isOk ? TOKENS.surface : isBlocking ? TOKENS.safeguard.cap.bg : TOKENS.safeguard.watch.bg,
                    }}
                  >
                    <span style={{ marginTop: 2, fontWeight: 700, fontSize: '13px', flexShrink: 0, color: iconColor }}>{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink }}>{c.label}</p>
                      <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 3, lineHeight: 1.55 }}>{c.detail}</p>
                    </div>
                    {isBlocking && (
                      <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '9px', fontWeight: 700, color: TOKENS.safeguard.cap.text, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                        Richiesto
                      </span>
                    )}
                    {isAdvisory && !isOk && (
                      <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '9px', fontWeight: 700, color: TOKENS.safeguard.watch.text, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                        Revisione
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 7. Come funziona KORA */}
      <SectionLabel>Come funziona il processo KORA</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          'KORA riceve i file aziendali, valida i dati, costruisce la workforce baseline e produce il KORA Index.',
          'L\'azienda collabora fornendo dati ed evidenze a KORA — non gestisce intake, review o scoring.',
          'Il PIB individuale dei lavoratori non è visibile qui. KORA mostra solo stato aggregato e output.',
        ].map((note) => (
          <div key={note} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: TOKENS.inkHint, flexShrink: 0, marginTop: 2 }}>·</span>
            <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>{note}</p>
          </div>
        ))}
      </div>

      {/* 8. CTAs */}
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/company/kora-index" style={{ borderRadius: 6, background: TOKENS.ink, padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none' }}>
          KORA Index →
        </Link>
        <Link href="/company/reports" style={{ borderRadius: 6, border: `1px solid ${TOKENS.accent}55`, background: `${TOKENS.accent}0a`, padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
          Decision Pack →
        </Link>
        <Link href="/company/profile" style={{ fontSize: '12px', color: TOKENS.inkHint, textDecoration: 'underline' }}>
          Profilo & Stato KORA
        </Link>
        <Link href="/company" style={{ fontSize: '12px', color: TOKENS.inkHint, textDecoration: 'underline' }}>
          ← Executive Cockpit
        </Link>
      </div>

      {/* 9. ProvenanceFooter */}
      <ProvenanceFooter
        methodologyVersionId="KORA Index v1.0"
        calibrationStatus="pre_empirical_calibration"
        reportingPeriod={tenant.analysis_period ?? activeScenario}
      />
    </div>
  );
}
