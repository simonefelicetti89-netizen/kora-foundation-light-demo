'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import { useScoringResult } from '@/lib/scoring-result';
import { demoDataService } from '@/services/demo-data/DemoDataService';
import { koraContributionService } from '@/services/kora-contribution/KoraContributionService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { PILLAR_CODES, PILLAR_LABELS } from '@/lib/constants/kora';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { DecisionContext } from '@/components/ui/DecisionContext';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';
import { ExplainabilityHint } from '@/components/company/cockpit/ExplainabilityHint';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { cn } from '@/lib/utils';
import type { PillarCode } from '@/lib/types';

function pct(val: number) { return `${(val * 100).toFixed(0)}%`; }
function eur(val: number) { return `€${val.toLocaleString('it-IT')}`; }

const SOURCE_TYPE_LABELS: Record<string, string> = {
  welfare_provider: 'Initiative Provider',
  lms_training:     'Piattaforma di Apprendimento',
  esg_initiatives:  'Iniziative ESG & Impact',
  manual_upload:    'Caricamento Evidenze Manuale',
  partner_events:   'Flusso Evidenze Partner',
  hris_population:  'Fonte Popolazione Workforce',
  hr_system:        'Sistema HR',
};

const ADDITIONALITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  mandatory_legal_minimum:        { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text,   label: 'Minimo legale'       },
  additional_beyond_requirement:  { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text,  label: 'Oltre il minimo'     },
  strategic_company_initiative:   { bg: 'rgba(43,92,230,0.10)',    text: '#1B2A4A',                   label: 'Iniziativa strategica' },
  collective_verified_initiative: { bg: 'rgba(199,111,61,0.10)',    text: TOKENS.accent,               label: 'Collettiva verificata' },
};

const REVIEW_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  approved:                    { bg: TOKENS.safeguard.pass.bg,   text: TOKENS.safeguard.pass.text,  label: 'Approvato KORA'              },
  under_kora_review:           { bg: TOKENS.safeguard.watch.bg,  text: TOKENS.safeguard.watch.text, label: 'In Revisione KORA'           },
  advisor_review_required:     { bg: 'rgba(186,117,23,0.12)',    text: '#854F0B',                   label: 'Revisione Advisor Richiesta' },
  partner_validation_required: { bg: 'rgba(199,111,61,0.10)',     text: TOKENS.accent,               label: 'Validazione Partner Richiesta' },
  blocked_by_design:           { bg: TOKENS.safeguard.cap.bg,    text: TOKENS.safeguard.cap.text,   label: 'Escluso per Design'          },
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active:    { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  },
  completed: { bg: TOKENS.inkBorder,          text: TOKENS.inkSecondary         },
  planning:  { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
  archived:  { bg: TOKENS.inkBorder,          text: TOKENS.inkHint              },
};

const VERIFICATION_STYLE: Record<string, string> = {
  verified:    TOKENS.safeguard.pass.text,
  partial:     TOKENS.safeguard.watch.text,
  not_started: TOKENS.inkHint,
};

// Pillar color ramp — sorted by share descending, rank 0 gets accent
function pillarFill(rank: number): string {
  if (rank === 0) return TOKENS.accent;
  const opacities = [0, 0.65, 0.50, 0.35, 0.22];
  return `rgba(6,3,43,${opacities[rank] ?? 0.22})`;
}

interface InitiativePreview {
  id: string; title: string; type: string; pillars: string[];
  additionality: string; additionality_label: string; review_status: string;
  evidence_requirement: string; kora_relevance: string;
  economic_contribution: string | null; kora_note: string | null;
}

const INITIATIVE_PREVIEW: InitiativePreview[] = [
  {
    id: 'ip-01', title: 'Workshop Cultura della Sicurezza Avanzata',
    type: 'Iniziativa Aziendale Interna', pillars: ['LIFE', 'CONNECTION'],
    additionality: 'additional_beyond_requirement', additionality_label: 'Oltre il minimo legale',
    review_status: 'advisor_review_required',
    evidence_requirement: 'Presenze verificate + evidenza di sessione strutturata',
    kora_relevance: 'Migliora MAR e CO — attivazione significativa con segnale di continuità su LIFE e CONNECTION',
    economic_contribution: null,
    kora_note: 'KORA premia l\'addizionalità. I corsi obbligatori per legge (es. D.Lgs. 81/2008) sono classificati Blocked — generano 0 IU. Questo workshop va oltre il minimo legale: è addizionale, verificabile e può generare IU reali su LIFE e CONNECTION.',
  },
  {
    id: 'ip-02', title: 'Giornata della Sostenibilità',
    type: 'Iniziativa Aziendale Interna', pillars: ['IMPACT', 'CONNECTION'],
    additionality: 'strategic_company_initiative', additionality_label: 'Iniziativa strategica',
    review_status: 'under_kora_review',
    evidence_requirement: 'Registro aggregato delle presenze + evidenza attività strutturata',
    kora_relevance: 'Copre il gap del pillar IMPACT — migliora PC (Pillar Coverage) e PB (Pillar Balance)',
    economic_contribution: null, kora_note: null,
  },
  {
    id: 'ip-03', title: 'Iniziativa Cross-Azienda di Volontariato',
    type: 'Iniziativa Collettiva', pillars: ['IMPACT', 'LEGACY', 'CONNECTION'],
    additionality: 'collective_verified_initiative', additionality_label: 'Collettiva — verificata',
    review_status: 'partner_validation_required',
    evidence_requirement: 'Verifica partner + partecipazione aggregata sopra soglia',
    kora_relevance: 'Alta rilevanza KORA Contribution — portata cross-aziendale, territoriale, evidenza partner richiesta',
    economic_contribution: 'Intenzione di co-finanziamento dichiarata',
    kora_note: 'Ammissibile a KORA Contribution se verificata e sopra la soglia di partecipazione. Il denaro da solo non è impatto — il contributo economico si attiva solo se abbinato a partecipazione verificata dei lavoratori.',
  },
  {
    id: 'ip-04', title: 'Corso di Sicurezza Obbligatorio (D.Lgs. 81/2008)',
    type: 'Attività di Compliance', pillars: [],
    additionality: 'mandatory_legal_minimum', additionality_label: 'Minimo legale',
    review_status: 'blocked_by_design',
    evidence_requirement: 'Registro presenze — contesto evidenza obbligatorio, non attivante',
    kora_relevance: '0 IU · 0 KORA Index · 0 PIB · 0 Contribution · Blocked by Design. KORA non trasforma la compliance in impatto.',
    economic_contribution: null,
    kora_note: 'Attività obbligatoria per legge (D.Lgs. 81/2008) — classificata Blocked. Genera 0 Impact Units e non contribuisce al KORA Index. Non è una penalizzazione: è design architetturale. La conformità legale è una baseline, non impatto.',
  },
];

// C-05: Pillars & Initiatives
export default function PillarsInitiatives() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const companyId   = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(companyId);
  const companyName = tenant?.company_name ?? companyId;

  const { data: scoring } = useScoringResult({ tenantId: companyId, scenarioId: activeScenario });
  const aggregate   = scoring?.aggregate;
  const programs    = demoDataService.getPrograms(companyId);
  const initiatives = koraContributionService.getCollectiveInitiatives(companyId, activeScenario);
  const pillarDist  = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  return (
    <div className="space-y-5">
      <PageMasthead
        eyebrow={`Pillar Intelligence · ${activeScenario}`}
        title="Pillar Intelligence"
        subline={`${companyName} · ${aggregate?.reporting_period ?? activeScenario} · distribuzione aggregata`}
      />
      <DecisionContext
        question="Come sono distribuiti budget e attivazione tra i 5 pilastri KORA e dove è il gap?"
        boundary="Aggregato aziendale · N≥10 per segmento · nessun dato individuale"
      />

      {/* ── Distribuzione pillar ── */}
      <SectionLabel>Distribuzione IU per pillar</SectionLabel>
      <ChartFrame subtitle="Distribuzione aggregata a livello aziendale. Nessun dato individuale del lavoratore.">
        {(() => {
          const sorted = PILLAR_CODES.map((code) => ({
            code,
            label: PILLAR_LABELS[code],
            val: pillarDist?.[code] ?? 0,
          })).sort((a, b) => b.val - a.val);
          return (
            <div className="space-y-3">
              {sorted.map(({ code, label, val }, rank) => (
                <div key={code}>
                  <div className="flex justify-between mb-1.5">
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink }}>
                      {label}
                      <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 400, fontSize: '11px', color: TOKENS.inkHint, marginLeft: 6 }}>
                        {code}
                      </span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: rank === 0 ? TOKENS.accent : TOKENS.ink }}>
                      {pct(val)}
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 9999, background: TOKENS.inkTrack, overflow: 'hidden' }}>
                    <div style={{ height: 7, borderRadius: 9999, width: `${val * 100}%`, background: pillarFill(rank), transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </ChartFrame>

      {/* ── Portfolio programmi ── */}
      <SectionLabel>Portfolio programmi</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
        <table className="w-full" style={{ fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${TOKENS.ink}` }}>
              {['Programma', 'Pillar', 'Fonte', 'Budget', `Partecipazione (${activeScenario})`, 'Stato'].map((h, i) => (
                <th key={h} className={i > 2 ? 'text-right' : 'text-left'} style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {programs.map((prog) => {
              const rate = activeScenario === 'S2' ? prog.expected_participation_rate_s2 : prog.expected_participation_rate_s1;
              const allPillars = [...prog.pillars_primary, ...prog.pillars_secondary];
              const isBlocked = prog.kora_eligibility === 'blocked';
              return (
                <tr
                  key={prog.id}
                  style={{
                    borderBottom: TOKENS.cardBorder,
                    background: isBlocked ? TOKENS.safeguard.cap.bg : undefined,
                  }}
                >
                  <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                    <p style={{ fontWeight: 600, color: TOKENS.ink }}>{prog.name}</p>
                    <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 2 }} className="line-clamp-1">{prog.description}</p>
                    {isBlocked && (
                      <p style={{ fontSize: '10px', color: TOKENS.safeguard.cap.text, fontWeight: 600, marginTop: 2 }}>
                        Blocked by Design · 0 IU · 0 KORA Index · 0 PIB · 0 Contribution
                      </p>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                    {isBlocked ? (
                      <span style={{ fontSize: '10px', background: TOKENS.safeguard.cap.bg, color: TOKENS.safeguard.cap.text, borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                        Escluso — governance baseline
                      </span>
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        {allPillars.map((p) => (
                          <span key={p} style={{ fontFamily: 'var(--font-jakarta)', fontSize: '10px', fontWeight: 600, background: TOKENS.inkBorder, color: TOKENS.ink, borderRadius: 4, padding: '2px 6px', border: TOKENS.cardBorder }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', color: TOKENS.inkSecondary }}>
                    {SOURCE_TYPE_LABELS[prog.source_type] ?? prog.source_type.replace(/_/g, ' ')}
                  </td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', fontFamily: 'var(--font-jakarta)', color: isBlocked ? TOKENS.inkHint : TOKENS.ink }}>
                    {eur(prog.budget_eur_approx)}
                    {isBlocked && <span style={{ display: 'block', fontSize: '10px', color: TOKENS.inkHint }}>escl. da IU</span>}
                  </td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                    <span style={{
                      fontFamily: 'var(--font-jakarta)', fontWeight: 700,
                      color: isBlocked ? TOKENS.inkHint : rate >= 0.40 ? TOKENS.safeguard.pass.text : rate >= 0.20 ? TOKENS.safeguard.watch.text : TOKENS.safeguard.cap.text,
                    }}>
                      {pct(rate)}
                    </span>
                    {isBlocked && <span style={{ display: 'block', fontSize: '10px', color: TOKENS.inkHint }}>conformità</span>}
                  </td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                    {(() => {
                      const sb = STATUS_BADGE[prog.status] ?? STATUS_BADGE.active;
                      return (
                        <span style={{ fontSize: '10px', fontWeight: 500, background: sb.bg, color: sb.text, borderRadius: 4, padding: '2px 7px' }}>
                          {prog.status}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: '11px', color: TOKENS.inkHint, padding: '10px 16px', borderTop: TOKENS.cardBorder }}>
          I valori del budget sono indicativi. I tassi di partecipazione sono stime di scenario.
        </p>
      </div>

      {/* ── Iniziative collettive ── */}
      <SectionLabel>Iniziative collettive</SectionLabel>
      {initiatives.length > 0 ? (
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
          <table className="w-full" style={{ fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${TOKENS.ink}` }}>
                {['Iniziativa', 'Pillar', 'Territorio', 'Partecipanti', 'Verifica', 'Stato'].map((h, i) => (
                  <th key={h} className={i === 3 ? 'text-right' : 'text-left'} style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initiatives.map((init) => (
                <tr key={init.id} style={{ borderBottom: TOKENS.cardBorder }}>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                    <p style={{ fontWeight: 600, color: TOKENS.ink }}>{init.name}</p>
                    {init.companies_involved.length > 1 && (
                      <p style={{ fontSize: '11px', color: TOKENS.accent, marginTop: 2 }}>Cross-azienda</p>
                    )}
                    {init.partner_name && (
                      <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 2 }}>Partner: {init.partner_name}</p>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                    <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '10px', fontWeight: 600, background: TOKENS.inkBorder, color: TOKENS.ink, borderRadius: 4, padding: '2px 6px', border: TOKENS.cardBorder }}>
                      {init.pillar}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', color: TOKENS.inkSecondary }}>{init.territory}</td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', fontFamily: 'var(--font-jakarta)' }}>
                    <span style={{ fontWeight: 700, color: TOKENS.ink }}>{init.aggregate_participation_count}</span>
                    <span style={{ color: TOKENS.inkHint }}> / {init.aggregate_target_participants}</span>
                  </td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: VERIFICATION_STYLE[init.verification_status] ?? TOKENS.inkHint }}>
                      {init.verification_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                    {(() => {
                      const sb = STATUS_BADGE[init.status] ?? STATUS_BADGE.planning;
                      return (
                        <span style={{ fontSize: '10px', fontWeight: 500, background: sb.bg, color: sb.text, borderRadius: 4, padding: '2px 7px' }}>
                          {init.status}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint, padding: '10px 16px', borderTop: TOKENS.cardBorder }}>
            Solo partecipazione aggregata. Nessun dato individuale del lavoratore è mostrato.
          </p>
        </div>
      ) : (
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.5rem', textAlign: 'center', color: TOKENS.inkHint }}>
          Nessuna iniziativa collettiva registrata per questo scenario.
        </div>
      )}

      {/* ── Initiative Studio Preview ── */}
      <SectionLabel>Initiative Studio</SectionLabel>
      <div style={{ background: 'rgba(186,117,23,0.06)', border: '1px solid rgba(186,117,23,0.20)', borderRadius: TOKENS.cardRadius, padding: '12px 16px', marginBottom: 4 }}>
        <p style={{ fontSize: '11px', color: '#854F0B' }}>
          <span style={{ fontWeight: 600 }}>Pilot Preview — non attivo in Foundation Light. </span>
          Crea, proponi o unisciti a iniziative che KORA può validare, orchestrare e misurare.
        </p>
      </div>
      <div className="space-y-3">
        {INITIATIVE_PREVIEW.map((init) => {
          const isBlocked = init.review_status === 'blocked_by_design';
          const rsb = REVIEW_STATUS_BADGE[init.review_status] ?? REVIEW_STATUS_BADGE.under_kora_review;
          const ab  = ADDITIONALITY_BADGE[init.additionality] ?? ADDITIONALITY_BADGE.strategic_company_initiative;
          return (
            <div key={init.id} style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
              {/* Header */}
              <div className="flex flex-wrap items-start gap-2 mb-3">
                <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, flex: 1, minWidth: 0 }}>{init.title}</p>
                <span style={{ fontSize: '10px', color: TOKENS.inkSecondary, background: TOKENS.inkBorder, borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
                  {init.type}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 500, background: rsb.bg, color: rsb.text, borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
                  {rsb.label}
                </span>
              </div>
              {/* Pillars + additionality */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {init.pillars.map((p) => (
                  <span key={p} style={{ fontFamily: 'var(--font-jakarta)', fontSize: '10px', fontWeight: 600, background: TOKENS.inkBorder, color: TOKENS.ink, borderRadius: 4, padding: '2px 6px', border: TOKENS.cardBorder }}>
                    {p}
                  </span>
                ))}
                <span style={{ fontSize: '10px', fontWeight: 500, background: ab.bg, color: ab.text, borderRadius: 4, padding: '2px 7px' }}>
                  {ab.label}
                </span>
              </div>
              {/* Evidence + relevance */}
              <div className="grid gap-1.5 sm:grid-cols-2 mb-3">
                <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>
                  <span style={{ fontWeight: 500, color: TOKENS.inkHint }}>Evidenza richiesta: </span>
                  {init.evidence_requirement}
                </p>
                <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>
                  <span style={{ fontWeight: 500, color: TOKENS.inkHint }}>Rilevanza KORA: </span>
                  {init.kora_relevance}
                </p>
                {init.economic_contribution && (
                  <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }} className="sm:col-span-2">
                    <span style={{ fontWeight: 500, color: TOKENS.inkHint }}>Contributo economico: </span>
                    <span style={{ color: TOKENS.accent }}>{init.economic_contribution}</span>
                    <span style={{ color: TOKENS.inkHint }}> — solo intento di governance, non esecuzione di pagamento</span>
                  </p>
                )}
              </div>
              {/* KORA note */}
              {init.kora_note && (
                <div style={{
                  borderRadius: 8, padding: '10px 12px', fontSize: '11px', lineHeight: 1.6, marginBottom: 12,
                  background: isBlocked ? TOKENS.safeguard.cap.bg : 'rgba(186,117,23,0.08)',
                  color:      isBlocked ? TOKENS.safeguard.cap.text : '#854F0B',
                  border:     isBlocked ? `1px solid ${TOKENS.safeguard.cap.dot}33` : '1px solid rgba(186,117,23,0.20)',
                }}>
                  {init.kora_note}
                </div>
              )}
              <button
                disabled
                style={{ borderRadius: 6, border: TOKENS.cardBorder, background: TOKENS.inkBorder, padding: '6px 12px', fontSize: '11px', color: TOKENS.inkHint, cursor: 'not-allowed' }}
              >
                {init.additionality === 'mandatory_legal_minimum'
                  ? 'Registra Attività Compliance — Disponibile in fase pilot'
                  : 'Proponi Iniziativa — Disponibile in fase pilot'}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Explainability hint ── */}
      <ExplainabilityHint />

      {/* ── Provenance footer ── */}
      {aggregate && (
        <ProvenanceFooter
          methodologyVersionId={aggregate.methodology_version_id}
          calibrationStatus={aggregate.calibration_status}
          reportingPeriod={aggregate.reporting_period}
        />
      )}
    </div>
  );
}
