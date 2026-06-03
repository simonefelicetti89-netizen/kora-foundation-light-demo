'use client';

import Link from 'next/link';
import { useDemoState } from '@/lib/demo-state';
import { isViewerRole } from '@/lib/permissions';
import { SafeguardBadge } from '@/components/badges/SafeguardBadge';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { useScoringResult } from '@/lib/scoring-result';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { reportGeneratorService } from '@/services/report-generator/ReportGeneratorService';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';
import { ExplainabilityHint } from '@/components/company/cockpit/ExplainabilityHint';
import type { PillarCode } from '@/lib/types';

// ─── Pillar config — ink ramp, no rainbow ─────────────────────────────────────

const PILLARS: Array<{
  code: PillarCode;
  label: string;
  description: string;
  rank: number;
}> = [
  { code: 'LIFE',       label: 'LIFE',       description: 'Salute, benessere, prevenzione, supporto psicologico, nutrizione, attività fisica.', rank: 0 },
  { code: 'GROWTH',     label: 'GROWTH',     description: 'Formazione, competenze, sviluppo professionale, certificazioni, upskilling digitale.', rank: 1 },
  { code: 'CONNECTION', label: 'CONNECTION', description: 'Mentoring, supporto tra colleghi, collaborazione, comunità interne, coesione di team.', rank: 2 },
  { code: 'IMPACT',     label: 'IMPACT',     description: 'Volontariato, progetti sociali, iniziative ambientali, contributo territoriale.', rank: 3 },
  { code: 'LEGACY',     label: 'LEGACY',     description: 'Trasferimento di conoscenza, mentoring senior-junior, continuità culturale.', rank: 4 },
];

const PILLAR_RAMP = [
  TOKENS.accent,
  'rgba(6,3,43,0.65)',
  'rgba(6,3,43,0.50)',
  'rgba(6,3,43,0.35)',
  'rgba(6,3,43,0.22)',
];

// ─── Macroblock config ─────────────────────────────────────────────────────────

const MACROBLOCKS: Array<{
  code: string;
  label: string;
  description: string;
}> = [
  { code: 'REACH',   label: 'Activation Reach',        description: 'Quanto l\'attivazione raggiunge realmente la forza lavoro. Una reach alta significa che l\'impatto è distribuito, non concentrato su pochi.' },
  { code: 'QUALITY', label: 'Activation Quality',      description: 'Quanto le iniziative generano attivazione significativa, verificabile e continuativa. Qualità alta = profondità, non solo presenza.' },
  { code: 'EQUITY',  label: 'Distribution & Equity',   description: 'Quanto l\'attivazione è distribuita equamente tra pillar e popolazione. Squilibri segnalano concentrazioni che riducono il valore organizzativo.' },
  { code: 'BTI',     label: 'Budget-to-Human-Impact',  description: 'Quanto il budget people/welfare si trasforma in attivazione umana reale. Benefit monetari e compliance non equivalgono automaticamente ad attivazione profonda.' },
];

function macroblockStatusLabel(score: number): string {
  if (score >= 70) return 'Solido';
  if (score >= 50) return 'In sviluppo';
  if (score >= 35) return 'Da rafforzare';
  return 'Critico';
}

function macroblockStatusToken(score: number): { bg: string; text: string } {
  if (score >= 70) return { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  };
  if (score >= 50) return { bg: `${TOKENS.accent}14`,      text: TOKENS.accent               };
  if (score >= 35) return { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text };
  return                  { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   };
}

function macroblockAccentColor(code: string): string {
  if (code === 'REACH')   return TOKENS.accent;
  if (code === 'QUALITY') return 'rgba(6,3,43,0.65)';
  if (code === 'EQUITY')  return 'rgba(6,3,43,0.45)';
  return TOKENS.safeguard.watch.dot;
}

function pct(val: number): string { return `${(val * 100).toFixed(0)}%`; }
function eur(val: number): string  { return `€${val.toLocaleString('it-IT')}`; }

function safeguardToken(status: string): { bg: string; text: string } {
  if (status === 'CLEAR')   return { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  };
  if (status === 'FLAGGED') return { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   };
  return                           { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text };
}

// ─── C-SV: KORA Shared View ───────────────────────────────────────────────────

export default function KoraSharedView() {
  const { activeRole, activeScenario } = useDemoState();

  const currentUser = accountProvisioningService.getCurrentDemoUser(activeRole);
  const companyId   = currentUser.company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(companyId);
  const { data: scoring } = useScoringResult({ tenantId: companyId, scenarioId: activeScenario });
  const hasKoraData = scoring?.status === 'ok';
  const output      = scoring?.koraIndex;
  const aggregate   = scoring?.aggregate;
  const macroblocks = output?.macroblocks ?? [];

  const btiResult = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(
    companyId, activeScenario, activeRole,
  );
  const btiRecord = btiResult.allowed ? btiResult.record : undefined;

  const structuralPolicies = companyDataIntakeService.getStructuralPolicyRows(companyId);

  const decisionPackStatus = hasKoraData
    ? reportGeneratorService.getDecisionPackReadiness(companyId, activeScenario)
    : 'data_review_required';

  const isViewer = isViewerRole(activeRole);

  const pillarData = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  return (
    <div className="space-y-5">

      {/* ── A. PageMasthead ─────────────────────────────────────────────────── */}
      <PageMasthead
        eyebrow={`KORA Shared View · ${activeScenario} · ${tenant?.company_name ?? companyId}`}
        title="Spazio condiviso KORA"
        subline="Vista sintetica e privacy-safe dell'impatto organizzativo — board, intranet e condivisione interna. Nessun dato individuale."
        meta={`${tenant?.analysis_period ?? activeScenario} · Read-only · Company-scoped · dati sintetici demo`}
      />

      {/* Badge row */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Read-only · Privacy-safe · Company-scoped', bg: `${TOKENS.accent}14`, text: TOKENS.accent },
          tenant?.analysis_period ? { label: `Periodo: ${tenant.analysis_period}`, bg: TOKENS.inkBorder, text: TOKENS.inkSecondary } : null,
        ].filter(Boolean).map((b) => b && (
          <span key={b.label} style={{ fontSize: '11px', fontWeight: 500, background: b.bg, color: b.text, borderRadius: 4, padding: '3px 8px' }}>
            {b.label}
          </span>
        ))}
      </div>

      {/* "KORA misura l'organizzazione" highlight */}
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.accent}33`, borderRadius: TOKENS.cardRadius, padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 6 }}>
          KORA misura l&apos;organizzazione, non gli individui.
        </p>
        <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
          Una sintesi leggibile dell&apos;impatto umano organizzativo, senza dati individuali.
          Questa vista non mostra dati individuali, PIB personali, worker roster o backstage metodologico.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span style={{ fontFamily: 'monospace', fontSize: '10px', background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, borderRadius: 4, padding: '2px 7px' }}>
            synthetic_demo_data: true · Foundation Light v0.1
          </span>
          {output?.methodology_version_id && (
            <span style={{ fontFamily: 'monospace', fontSize: '10px', background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 7px' }}>
              {output.methodology_version_id}
            </span>
          )}
          {output?.calibration_status && (
            <span style={{ fontFamily: 'monospace', fontSize: '10px', background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 7px' }}>
              {output.calibration_status}
            </span>
          )}
        </div>
      </div>

      {/* ── B. KORA Index Snapshot ──────────────────────────────────────────── */}
      <SectionLabel>KORA Index Snapshot</SectionLabel>

      {!hasKoraData ? (
        <div style={{ background: TOKENS.safeguard.watch.bg, border: `1px solid ${TOKENS.safeguard.watch.dot}44`, borderRadius: TOKENS.cardRadius, padding: '1.5rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.safeguard.watch.text, marginBottom: 8 }}>
            KORA Index non ancora disponibile
          </p>
          <p style={{ fontSize: '12px', color: TOKENS.safeguard.watch.text, opacity: 0.85, lineHeight: 1.65, marginBottom: 14 }}>
            Questa azienda non ha ancora dati sufficienti per generare una KORA Shared View completa.
            Il KORA Index sarà disponibile al termine della pipeline dati.
          </p>
          {tenant && (
            <div className="grid grid-cols-3 gap-4">
              {[
                ['Onboarding', tenant.onboarding_status?.replace(/_/g, ' ') ?? 'non avviato'],
                ['Readiness dati', tenant.data_readiness_status ?? '—'],
                ['Decision Pack', tenant.decision_pack_status ?? '—'],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p style={{ fontSize: '10px', color: TOKENS.safeguard.watch.text, opacity: 0.75 }}>{label}</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.safeguard.watch.text, marginTop: 3, textTransform: 'capitalize' }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.5rem' }}>
          <div className="grid gap-6 lg:grid-cols-3 mb-5">
            {/* KORA Index value */}
            <div>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 8 }}>KORA Index v3</p>
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '3.5rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {output?.kora_index_value}
                </span>
                <span style={{ fontSize: '1.125rem', color: TOKENS.inkHint, fontWeight: 500 }}>/100</span>
              </div>
              <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 6 }}>
                {activeScenario === 'S2' ? 'Scenario Post-Intervento' : activeScenario === 'S1' ? 'Scenario Baseline' : 'Scenario demo'}
              </p>
            </div>

            {/* Confidence Score */}
            <div>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 8 }}>Confidence Score</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2.25rem', color: TOKENS.accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {((output?.confidence_score ?? 0) * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: '11px', fontWeight: 500, background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 7px' }}>
                  ESTERNO · peso = 0
                </span>
              </div>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, lineHeight: 1.55 }}>
                Indicatore esterno di affidabilità dei dati. Non entra nel calcolo del KORA Index.
              </p>
            </div>

            {/* Safeguard */}
            <div>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 8 }}>Activation Safeguard</p>
              {output && <SafeguardBadge status={output.safeguard_status} />}
            </div>
          </div>

          <div style={{ borderTop: TOKENS.cardBorder, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>
              {output?.methodology_version_id} · {output?.calibration_status}
            </p>
            {output?.limitations_text && (
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, lineHeight: 1.55 }}>
                {output.limitations_text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Sezioni presenti solo con dati KORA ────────────────────────────── */}
      {hasKoraData && (
        <>

          {/* ── C. Macroblock Summary ────────────────────────────────────────── */}
          <SectionLabel>Sintesi per macroblocco</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MACROBLOCKS.map(({ code, label, description }) => {
              const mb    = macroblocks.find((m) => m.code === code);
              const score = mb?.score ?? 0;
              const st    = macroblockStatusToken(score);
              const ac    = macroblockAccentColor(code);
              return (
                <div
                  key={code}
                  style={{
                    background:   TOKENS.surface,
                    border:       TOKENS.cardBorder,
                    borderLeft:   `3px solid ${ac}`,
                    borderRadius: TOKENS.cardRadius,
                    padding:      '1rem',
                    display:      'flex', flexDirection: 'column', gap: 10,
                  }}
                >
                  <div>
                    <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.ink }}>
                      {label}
                    </p>
                    {mb && (
                      <div className="flex items-baseline gap-2 mt-2">
                        <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                          {score}
                        </span>
                        <span style={{ fontSize: '13px', color: TOKENS.inkHint }}>/100</span>
                      </div>
                    )}
                    {mb && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span style={{ fontSize: '10px', fontWeight: 500, background: st.bg, color: st.text, borderRadius: 4, padding: '2px 7px' }}>
                          {macroblockStatusLabel(score)}
                        </span>
                        <span style={{ fontSize: '10px', background: TOKENS.inkBorder, color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 7px' }}>
                          Peso {(mb.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.65, flex: 1 }}>
                    {description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── D. Pillar Snapshot ───────────────────────────────────────────── */}
          <SectionLabel>Pillar di attivazione</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PILLARS.map(({ code, label, description, rank }) => {
              const share = pillarData?.[code];
              const fill  = PILLAR_RAMP[rank] ?? PILLAR_RAMP[4];
              return (
                <div
                  key={code}
                  style={{
                    background:   TOKENS.surface,
                    border:       TOKENS.cardBorder,
                    borderLeft:   `3px solid ${fill}`,
                    borderRadius: TOKENS.cardRadius,
                    padding:      '1rem',
                    display:      'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.ink }}>
                    {label}
                  </p>
                  {share !== undefined && (
                    <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.75rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {pct(share)}
                    </p>
                  )}
                  <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6, flex: 1 }}>
                    {description}
                  </p>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>
            Distribuzione aggregata aziendale · nessun dato individuale lavoratore
          </p>

          {/* ── E. Budget-to-Human-Impact ────────────────────────────────────── */}
          <SectionLabel>Budget-to-Human-Impact</SectionLabel>
          <ChartFrame>
            {btiRecord ? (
              <>
                <div className="grid gap-5 sm:grid-cols-3 mb-5">
                  <div>
                    <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 6 }}>Quota attivazione profonda</p>
                    <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2.25rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {pct(btiRecord.deep_activation_share)}
                    </p>
                    <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 4 }}>del budget in attivazione profonda</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 6 }}>Quota benefit monetari</p>
                    <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2.25rem', color: TOKENS.safeguard.watch.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {pct(btiRecord.economic_relief_share)}
                    </p>
                    <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 4 }}>voucher, fringe, benefit monetari</p>
                  </div>
                  {btiRecord.reallocation_opportunity_eur > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 6 }}>Opportunità di riallocazione</p>
                      <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.75rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {eur(btiRecord.reallocation_opportunity_eur)}
                      </p>
                      <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 4, lineHeight: 1.55 }}>
                        {btiRecord.reallocation_opportunity_description_it}
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ background: TOKENS.inkBorder, borderRadius: 8, padding: '10px 14px', fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
                  <span style={{ fontWeight: 600, color: TOKENS.ink }}>Nota dottrinale: </span>
                  I benefit monetari sono utili come sollievo economico, ma non equivalgono automaticamente ad attivazione profonda.
                  KORA misura ciò che accade dopo la spesa.
                </div>
                <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 10 }}>
                  Compliance esclusa · 0 Impact Units per design metodologico
                </p>
              </>
            ) : (
              <p style={{ fontSize: '13px', color: TOKENS.inkHint }}>
                Dati Budget-to-Human-Impact non ancora disponibili per questa azienda.
              </p>
            )}
          </ChartFrame>

          {/* ── F. Structural Policy Recognition ────────────────────────────── */}
          <SectionLabel>Policy strutturali riconosciute</SectionLabel>
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
            {structuralPolicies.length > 0 ? (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '3rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {structuralPolicies.length}
                  </span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink }}>policy strutturali identificate</p>
                    <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>formalizzate, verificabili, aggregate e privacy-safe</p>
                  </div>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {structuralPolicies.slice(0, 5).map((row, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: '12px', color: TOKENS.inkSecondary }}>
                      <span style={{ color: TOKENS.inkHint, flexShrink: 0 }}>·</span>
                      {row.raw_name}
                    </li>
                  ))}
                  {structuralPolicies.length > 5 && (
                    <li style={{ fontSize: '11px', color: TOKENS.inkHint }}>
                      + {structuralPolicies.length - 5} ulteriori policy registrate
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <p style={{ fontSize: '13px', color: TOKENS.inkHint, marginBottom: 14 }}>
                Nessuna policy strutturale registrata per questa azienda.
              </p>
            )}
            <div style={{ background: TOKENS.inkBorder, borderRadius: 8, padding: '10px 14px', fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
              KORA riconosce anche policy organizzative strutturali, se formalizzate, verificabili, aggregate e privacy-safe.
              Non implica tracciamento dell&apos;utilizzo individuale.
            </div>
          </div>

          {/* ── G. Decision Pack Status ──────────────────────────────────────── */}
          <SectionLabel>Decision Pack</SectionLabel>
          {(() => {
            const isReady   = decisionPackStatus === 'ready';
            const isReview  = decisionPackStatus === 'advisor_review_required';
            const dpToken   = isReady ? TOKENS.safeguard.pass : isReview ? TOKENS.safeguard.watch : { bg: TOKENS.inkBorder, text: TOKENS.inkSecondary, dot: TOKENS.inkHint };
            const dpLabel   = isReady ? 'Disponibile' : isReview ? 'In revisione advisor' : 'Non disponibile';
            const dpText    = isReady
              ? 'Il Decision Pack è pronto con Executive Summary, KORA Index v3, analisi BTI e raccomandazioni diagnostiche.'
              : isReview
              ? 'Il Decision Pack è in attesa di revisione advisor (Confidence Score < 55%).'
              : 'Il Decision Pack sarà disponibile al termine della pipeline dati.';
            return (
              <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 500, background: dpToken.bg, color: dpToken.text, borderRadius: 4, padding: '3px 8px', display: 'inline-block', marginBottom: 8 }}>
                    {dpLabel}
                  </span>
                  <p style={{ fontSize: '12.5px', color: TOKENS.inkSecondary, lineHeight: 1.65, maxWidth: '40rem' }}>
                    {dpText}
                  </p>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {!isViewer && isReady ? (
                    <Link href="/company/reports" style={{ borderRadius: 6, border: `1px solid ${TOKENS.accent}55`, background: `${TOKENS.accent}0a`, padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
                      Vai ai Report →
                    </Link>
                  ) : isViewer && isReady ? (
                    <span style={{ fontSize: '11px', color: TOKENS.inkSecondary, background: TOKENS.inkBorder, borderRadius: 6, padding: '7px 14px' }}>
                      Disponibile in consultazione read-only
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: TOKENS.inkHint, background: TOKENS.inkBorder, borderRadius: 6, padding: '7px 14px' }}>
                      Decision Pack non ancora disponibile
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

        </>
      )}

      {/* ── H. Privacy Boundary ─────────────────────────────────────────────── */}
      <SectionLabel>Confine privacy</SectionLabel>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: what is NEVER shown */}
        <div style={{ background: TOKENS.safeguard.cap.bg, border: `1px solid ${TOKENS.safeguard.cap.dot}33`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.safeguard.cap.text, marginBottom: 12 }}>
            Questa vista non contiene mai:
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'PIB individuale del lavoratore',
              'Ranking o classifica lavoratori',
              'Dati a livello di singolo worker',
              'Timeline o CV personale',
              'Produttività o performance individuali',
              'Salari, ferie individuali o congedi',
              'Stato di salute o dati sensibili',
            ].map((item) => (
              <li key={item} style={{ display: 'flex', gap: 8, fontSize: '12px', color: TOKENS.safeguard.cap.text }}>
                <span style={{ flexShrink: 0, fontWeight: 700 }}>✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        {/* Right: privacy-by-design explanation */}
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 8 }}>
              Il PIB individuale resta privato al lavoratore.
            </p>
            <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
              L&apos;azienda vede solo aggregati privacy-safe. Il Personal Impact Balance è un indicatore intermedio
              privato — mai visibile al datore di lavoro.
            </p>
          </div>
          <div style={{ background: TOKENS.inkBorder, borderRadius: 8, padding: '10px 14px', fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
            Solo aggregati con gruppo ≥ 10 lavoratori sono presentati. Segmenti più piccoli sono soppressi per prevenire ri-identificazione.
          </div>
        </div>
      </div>

      {/* ── I. Confini metodologici ──────────────────────────────────────────── */}
      <SectionLabel>Confini metodologici</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          {[
            ['Metodologia', output?.methodology_version_id ?? 'KORA Methodology v0.1'],
            ['Stato calibrazione', output?.calibration_status ?? 'pre_empirical_calibration'],
            ['production_ready', 'false'],
            ['Dati', 'sintetici demo · synthetic_demo_data: true'],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p style={{ fontSize: '10px', color: TOKENS.inkHint, fontWeight: 500 }}>{label}</p>
              <p style={{ fontSize: '12px', color: TOKENS.ink, marginTop: 3, fontFamily: label === 'Metodologia' || label === 'production_ready' ? 'monospace' : undefined }}>
                {value}
              </p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65, paddingTop: 12, borderTop: TOKENS.cardBorder }}>
          KORA Shared View è una sintesi interna, non una certificazione pubblica. Non garantisce conformità normativa
          e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
        </p>
      </div>

      {/* ── ExplainabilityHint ──────────────────────────────────────────────── */}
      <ExplainabilityHint />

      {/* ── ProvenanceFooter ────────────────────────────────────────────────── */}
      <ProvenanceFooter
        methodologyVersionId={output?.methodology_version_id ?? 'KORA Methodology v0.1'}
        calibrationStatus={output?.calibration_status ?? 'pre_empirical_calibration'}
        reportingPeriod={output?.reporting_period ?? activeScenario}
      />

    </div>
  );
}
