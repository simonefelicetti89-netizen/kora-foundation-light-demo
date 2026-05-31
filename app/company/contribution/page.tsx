'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { koraContributionService } from '@/services/kora-contribution/KoraContributionService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';
import { ExplainabilityHint } from '@/components/company/cockpit/ExplainabilityHint';
import type { CollectiveInitiative } from '@/services/kora-contribution/KoraContributionService';

// ── Level config — KORA semantic tokens ──────────────────────────────────────

const LEVEL_CONFIG: Record<string, { bg: string; text: string; barFill: string; label: string }> = {
  minimal:  { bg: TOKENS.inkBorder,              text: TOKENS.inkSecondary,        barFill: 'rgba(20,18,46,0.25)', label: 'Embrionale' },
  emerging: { bg: TOKENS.safeguard.watch.bg,     text: TOKENS.safeguard.watch.text, barFill: TOKENS.safeguard.watch.dot, label: 'Emergente'  },
  active:   { bg: TOKENS.safeguard.pass.bg,      text: TOKENS.safeguard.pass.text,  barFill: TOKENS.safeguard.pass.dot,  label: 'Attivo'     },
  advanced: { bg: `${TOKENS.accent}18`,           text: TOKENS.accent,               barFill: TOKENS.accent,              label: 'Avanzato'   },
};

// ── Status / verification → KORA tokens ───────────────────────────────────────

const STATUS_TOKEN: Record<string, { bg: string; text: string }> = {
  active:    { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  },
  completed: { bg: TOKENS.inkBorder,          text: TOKENS.inkSecondary         },
  planning:  { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
  archived:  { bg: TOKENS.inkBorder,          text: TOKENS.inkHint              },
};

const VERIF_COLOR: Record<string, string> = {
  verified:    TOKENS.safeguard.pass.text,
  partial:     TOKENS.safeguard.watch.text,
  not_started: TOKENS.inkHint,
  pending:     TOKENS.accent,
};

// ── Pillar pills — ink, no rainbow ────────────────────────────────────────────

const INITIATIVE_TYPE_LABELS: Record<string, string> = {
  cross_company_volunteering:    'Volontariato Cross-Azienda',
  internal_mentoring_collective: 'Mentoring Collettivo Interno',
  collective_upskilling:         'Upskilling Collettivo',
  collective_community_event:    'Evento Comunitario Collettivo',
  partner_collective_event:      'Evento Collettivo Partner',
};

const ARCHITECTURE_LAYERS = [
  {
    id: 'internal',
    accentColor: TOKENS.ink,
    title: 'Attivazione Collettiva Interna',
    description: 'Iniziative che coinvolgono gruppi, team o comunità di lavoratori all\'interno dell\'organizzazione.',
    measures: ['Programmi strutturati per gruppi di lavoratori', 'Qualità e continuità della partecipazione collettiva', 'Knowledge transfer, mentoring, eventi interni documentati'],
    data_needed: 'Registro aggregato partecipanti · evidenze strutturate di sessione · validazione advisor',
    why: 'Segnala se l\'attivazione è distribuita collettivamente o rimane individuale e frammentata.',
    types: ['internal_mentoring_collective', 'collective_upskilling', 'collective_community_event'],
  },
  {
    id: 'territorial',
    accentColor: TOKENS.safeguard.watch.dot,
    title: 'Attivazione Territoriale & Comunitaria',
    description: 'Contributo verificabile al territorio: volontariato, iniziative scuola-lavoro, progetti sociali e ambientali.',
    measures: ['Volontariato territoriale documentato', 'Progetti a beneficio di comunità locali', 'Iniziative ambientali con evidenza verificabile'],
    data_needed: 'Partnership territoriali documentate · partecipazione aggregata verificata · evidenze partner',
    why: 'Il segnale più visibile per reporting ESG people-side. Connette l\'organizzazione al territorio.',
    types: ['cross_company_volunteering', 'partner_collective_event'],
  },
  {
    id: 'ecosystem',
    accentColor: TOKENS.accent,
    title: 'Attivazione Ecosistema & Cross-Company',
    description: 'Programmi multi-azienda, collaborazioni con partner e advisor. Impatto condiviso oltre il perimetro del singolo tenant.',
    measures: ['Iniziative congiunte con altre aziende', 'Programmi territoriali condivisi con partner', 'Attivazione verificata della value chain'],
    data_needed: 'Evidenze cross-company · validazione advisor · registro partecipazione aggregata multi-tenant',
    why: 'Il segnale più strategico: KORA come infrastruttura di impatto umano condiviso tra organizzazioni.',
    types: ['cross_company_volunteering'],
  },
] as const;

const PIPELINE_STEPS = [
  'Idea / Iniziativa',
  'Eligibility Gate',
  'Evidenza & Advisor Review',
  'Partecipazione Collettiva Verificata',
  'Contribution Signal',
  'Decision Pack & Ecosystem Reporting',
];

// ── InitiativeCard — KORA style ────────────────────────────────────────────────

function InitiativeCard({ initiative }: { initiative: CollectiveInitiative }) {
  const st  = STATUS_TOKEN[initiative.status] ?? STATUS_TOKEN.planning;
  const vc  = VERIF_COLOR[initiative.verification_status] ?? TOKENS.inkHint;
  const typeLabel = INITIATIVE_TYPE_LABELS[initiative.initiative_type] ?? initiative.initiative_type.replace(/_/g, ' ');
  const isCross = initiative.companies_involved.length > 1;

  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, lineHeight: 1.35 }}>{initiative.name}</p>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 2 }}>{initiative.territory}</p>
          {isCross && (
            <p style={{ fontSize: '11px', color: TOKENS.accent, fontWeight: 500, marginTop: 2 }}>
              Cross-azienda · {initiative.companies_involved.length} organizzazioni
            </p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          {/* Pillar — ink pill */}
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '10px', fontWeight: 700, background: TOKENS.inkBorder, color: TOKENS.ink, borderRadius: 4, padding: '2px 7px', border: TOKENS.cardBorder }}>
            {initiative.pillar}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 500, background: st.bg, color: st.text, borderRadius: 4, padding: '2px 7px' }}>
            {initiative.status}
          </span>
        </div>
      </div>

      <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}>
        {typeLabel}
      </p>
      <p style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.6 }} className="line-clamp-2">{initiative.description}</p>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>Partecipanti</p>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '15px', color: TOKENS.ink, fontVariantNumeric: 'tabular-nums' }}>
            {initiative.aggregate_participation_count}
            <span style={{ fontWeight: 400, fontSize: '11px', color: TOKENS.inkHint }}> / {initiative.aggregate_target_participants}</span>
          </p>
        </div>
        <div>
          <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>Verifica</p>
          <p style={{ fontSize: '11px', fontWeight: 500, color: vc, textTransform: 'capitalize' }}>
            {initiative.verification_status.replace(/_/g, ' ')}
          </p>
        </div>
        <div>
          <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>Advisor</p>
          <p style={{ fontSize: '11px', fontWeight: 500, color: TOKENS.inkSecondary, textTransform: 'capitalize' }}>
            {initiative.advisor_validation_status.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {initiative.partner_name && (
        <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>
          Partner: <span style={{ color: TOKENS.inkSecondary }}>{initiative.partner_name}</span>
        </p>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

// C-03: KORA Contribution — strategic reframe
export default function KoraContribution() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();
  const companyId   = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(companyId);
  const companyName = tenant?.company_name ?? companyId;

  const summary                 = koraContributionService.getContributionSummary(companyId, activeScenario);
  const contributionInitiatives = koraContributionService.getContributionInitiatives(companyId, activeScenario);
  const allInitiatives          = koraContributionService.getCollectiveInitiatives(companyId, activeScenario);
  const nonContribInits         = allInitiatives.filter((i) => !i.kora_contribution_relevant);

  const levelCfg      = LEVEL_CONFIG[summary?.contribution_level ?? 'minimal'] ?? LEVEL_CONFIG.minimal;
  const scorePct      = summary ? Math.min(summary.contribution_score, 100) : 0;
  const planningCount = summary
    ? Math.max(0, summary.collective_initiatives_count - summary.active_initiatives_count - summary.completed_initiatives_count)
    : 0;

  const internalInits    = contributionInitiatives.filter((i) => ARCHITECTURE_LAYERS[0].types.includes(i.initiative_type as never));
  const territorialInits = contributionInitiatives.filter((i) => ARCHITECTURE_LAYERS[1].types.includes(i.initiative_type as never));
  const ecosystemInits   = contributionInitiatives.filter((i) => i.companies_involved.length > 1);
  const layerInitCounts  = [internalInits, territorialInits, ecosystemInits];

  const signals = summary ? [
    { label: 'Partecipazioni collettive verificate', value: summary.verified_initiative_participations > 0 ? `${summary.verified_initiative_participations} nel periodo di reporting` : 'Non ancora sufficienti nel dataset demo', ok: summary.verified_initiative_participations > 0 },
    { label: 'Iniziative collettive attive', value: summary.active_initiatives_count > 0 ? `${summary.active_initiatives_count} attiva/e nel periodo` : planningCount > 0 ? `${planningCount} in planning — partecipazione non ancora avviata` : 'Nessuna nel perimetro demo corrente', ok: summary.active_initiatives_count > 0 },
    { label: 'Iniziative territoriali', value: territorialInits.length > 0 ? `${territorialInits.length} iniziativa/e territoriale/i — verifica ${territorialInits.every(i => i.verification_status === 'verified') ? 'completata' : 'in corso'}` : planningCount > 0 ? '1 in planning, nessuna ancora verificata' : 'Non presenti nel dataset demo corrente', ok: territorialInits.length > 0 },
    { label: 'Cross-company activation', value: summary.cross_company_initiatives_count > 0 ? `${summary.cross_company_initiatives_count} programma/i cross-company attivo/i` : `Non presente — ${summary.ecosystem_partners_active} partner ecosistema attivi`, ok: summary.cross_company_initiatives_count > 0 },
    { label: 'Evidenza advisor-verified', value: summary.completed_initiatives_count > 0 ? `${summary.completed_initiatives_count} iniziativa/e completata/e e validata/e da advisor` : 'Non ancora disponibile nel perimetro demo', ok: summary.completed_initiatives_count > 0 },
  ] : [];

  return (
    <div className="space-y-5">

      {/* 1. PageMasthead */}
      <PageMasthead
        eyebrow={`KORA Contribution · ${activeScenario} · Indicatore Companion`}
        title="KORA Contribution"
        subline="Il segnale che misura quanto l'organizzazione genera valore collettivo verificabile oltre il proprio perimetro interno."
        meta={`${companyName} · Foundation Light Preview · pre_empirical_calibration · dati sintetici`}
      />

      {/* Badge row — Companion / Non-Index / Preview / Pre-calibrazione */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Indicatore Companion',        bg: `${TOKENS.accent}14`, text: TOKENS.accent          },
          { label: 'Non incluso nel KORA Index',  bg: TOKENS.inkBorder,     text: TOKENS.inkSecondary    },
          { label: 'Foundation Light Preview',    bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
          { label: 'Pre-calibrazione empirica',   bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
        ].map(({ label, bg, text }) => (
          <span key={label} style={{ fontSize: '10px', fontWeight: 500, background: bg, color: text, borderRadius: 4, padding: '3px 8px' }}>
            {label}
          </span>
        ))}
      </div>

      {/* 2. KORA Index vs KORA Contribution contrast */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 8 }}>KORA Index</p>
          <p style={{ fontSize: '12.5px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
            Misura ciò che accade <strong style={{ color: TOKENS.ink }}>dentro</strong> l&apos;organizzazione: attivazione della workforce, qualità, equità e budget-to-human-impact.
          </p>
        </div>
        <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.accent}33`, borderRadius: TOKENS.cardRadius, padding: '1rem' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 8 }}>KORA Contribution</p>
          <p style={{ fontSize: '12.5px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>
            Misura ciò che l&apos;organizzazione <strong style={{ color: TOKENS.ink }}>attiva nel territorio e nell&apos;ecosistema</strong>: iniziative collettive verificate, contributo comunitario, attivazione cross-company.
          </p>
        </div>
      </div>

      {/* 3. Score */}
      <SectionLabel>Contribution Score — {summary?.reporting_period ?? activeScenario}</SectionLabel>
      <ChartFrame>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div className="flex items-end gap-3">
              <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '3.25rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {summary?.contribution_score ?? 0}
              </span>
              <span style={{ fontSize: '13px', color: TOKENS.inkHint, paddingBottom: 8 }}>/100</span>
              <span style={{ fontSize: '11px', fontWeight: 500, background: levelCfg.bg, color: levelCfg.text, borderRadius: 4, padding: '3px 9px', marginBottom: 8 }}>
                {levelCfg.label}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 6 }}>
              {scorePct <= 15 ? 'Contributo collettivo ancora embrionale nel dataset demo' : scorePct < 50 ? 'Contributo collettivo in fase emergente — segnali positivi, verifica da completare' : 'Contributo collettivo consolidato'}
            </p>
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 9999, background: TOKENS.inkTrack, overflow: 'hidden', marginTop: 16 }}>
          <div style={{ height: 6, borderRadius: 9999, width: `${scorePct}%`, background: levelCfg.barFill }} />
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', background: TOKENS.safeguard.watch.bg, borderRadius: 8, fontSize: '12px', color: TOKENS.safeguard.watch.text, lineHeight: 1.6 }}>
          Il punteggio basso non indica fallimento operativo. Segnala che le iniziative territoriali, cross-company o collettive verificate non sono ancora sufficientemente presenti nel perimetro Foundation Light.
        </div>
        {summary?.contribution_explanation && (
          <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 10, lineHeight: 1.6 }}>{summary.contribution_explanation}</p>
        )}
      </ChartFrame>

      {/* 4. Stats row */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Iniziative collettive',     value: summary.collective_initiatives_count,       sub: undefined },
            { label: 'Partecipazioni verificate',  value: summary.verified_initiative_participations, sub: 'aggregato' },
            { label: 'Cross-azienda',             value: summary.cross_company_initiatives_count,    sub: undefined },
            { label: 'Partner ecosistema',        value: summary.ecosystem_partners_active,          sub: undefined },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '2rem', color: TOKENS.ink, lineHeight: 1, margin: '8px 0 4px', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              {sub && <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 5. Architecture layers */}
      <SectionLabel>Contribution Architecture — tre layer strategici</SectionLabel>
      <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65, marginBottom: 4 }}>
        KORA Contribution è strutturato in tre layer. Ogni layer misura una dimensione distinta del valore collettivo generato oltre il perimetro aziendale.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {ARCHITECTURE_LAYERS.map((layer, idx) => {
          const layerInits = layerInitCounts[idx];
          const hasActive  = layerInits.some((i) => i.status === 'active' || i.status === 'completed');
          return (
            <div key={layer.id} style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1rem', borderLeft: `3px solid ${layer.accentColor}` }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginBottom: 8 }}>{layer.title}</p>
              <p style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.65, marginBottom: 10 }}>{layer.description}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                {layer.measures.map((m) => (
                  <li key={m} style={{ fontSize: '11px', color: TOKENS.inkSecondary, paddingLeft: 12, position: 'relative', lineHeight: 1.55 }}>
                    <span style={{ position: 'absolute', left: 0, color: TOKENS.inkHint }}>·</span>
                    {m}
                  </li>
                ))}
              </ul>
              <div style={{ background: TOKENS.inkBorder, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 3 }}>Stato demo</p>
                  <p style={{ fontSize: '11px', color: TOKENS.ink }}>
                    {layerInits.length > 0 ? `${layerInits.length} iniziativa/e — ${hasActive ? 'attiva/e o completata/e' : 'da verificare'}` : 'Segnale non ancora maturo nel dataset demo corrente'}
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 3 }}>Dati necessari</p>
                  <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>{layer.data_needed}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 3 }}>Perché conta</p>
                  <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55, fontStyle: 'italic' }}>{layer.why}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. Pipeline */}
      <SectionLabel>Pipeline di contributo — architettura target</SectionLabel>
      <ChartFrame>
        <div className="flex flex-wrap items-center gap-2">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div style={{ background: TOKENS.inkBorder, border: TOKENS.cardBorder, borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint }}>
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p style={{ fontSize: '12px', fontWeight: 500, color: TOKENS.ink, marginTop: 2, whiteSpace: 'nowrap' }}>{step}</p>
              </div>
              {i < PIPELINE_STEPS.length - 1 && <span style={{ color: TOKENS.inkHint, fontWeight: 700 }}>→</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: TOKENS.cardBorder }}>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>
            <span style={{ fontWeight: 600, color: TOKENS.inkSecondary }}>Architettura target:</span>{' '}
            questa è la pipeline verso cui KORA evolve operativamente. Foundation Light prevede la logica di questa pipeline. Nessuna contribution certificata è prodotta in questa fase demo.
          </p>
        </div>
      </ChartFrame>

      {/* 7. Diagnostic signals */}
      {summary && signals.length > 0 && (
        <>
          <SectionLabel>Segnali diagnostici — dataset demo</SectionLabel>
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
            {signals.map((sig, i) => (
              <div
                key={sig.label}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < signals.length - 1 ? TOKENS.cardBorder : 'none',
                  background: sig.ok ? TOKENS.surface : 'rgba(20,18,46,0.025)',
                }}
              >
                <span style={{ marginTop: 2, fontSize: '13px', fontWeight: 700, flexShrink: 0, color: sig.ok ? TOKENS.safeguard.pass.dot : TOKENS.inkHint }}>
                  {sig.ok ? '✓' : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink }}>{sig.label}</p>
                  <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 2 }}>{sig.value}</p>
                </div>
                {!sig.ok && (
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fontWeight: 700, color: TOKENS.inkHint, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                    Gap di attivazione
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 8. Contribution-relevant initiatives */}
      {contributionInitiatives.length > 0 && (
        <>
          <SectionLabel>Iniziative Contribution-Relevant</SectionLabel>
          <div className="space-y-3">
            {contributionInitiatives.map((init) => (
              <InitiativeCard key={init.id} initiative={init} />
            ))}
          </div>
        </>
      )}

      {/* 9. Non-contribution initiatives */}
      {nonContribInits.length > 0 && (
        <>
          <SectionLabel>Altre iniziative collettive</SectionLabel>
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, overflow: 'hidden' }}>
            {nonContribInits.map((init, i) => (
              <div
                key={init.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: i < nonContribInits.length - 1 ? TOKENS.cardBorder : 'none',
                }}
              >
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: '10px', fontWeight: 700, background: TOKENS.inkBorder, color: TOKENS.ink, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                  {init.pillar}
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink }}>{init.name}</p>
                  <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>{init.territory} · {init.status}</p>
                </div>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fontWeight: 500, color: TOKENS.inkHint, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                  Non contribution-relevant
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>
            Iniziative collettive non ancora qualificate per KORA Contribution in questo scenario.
          </p>
        </>
      )}

      {/* 10. Contribution Opportunity */}
      <SectionLabel>Contribution Opportunity — prossimi passi per {companyName}</SectionLabel>
      <ChartFrame>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Convertire le iniziative in planning in programmi collettivi strutturati — con evidenze verificabili e advisor review.',
            'Attivare partnership territoriali nell\'area Bergamo, dove il Plant è sottorappresentato nell\'attivazione.',
            'Connettere la partecipazione dei lavoratori a outcomes comunitari verificati per generare segnale territoriale.',
            'Avanzare l\'Advisor Review sulle iniziative con evidenze parziali per aumentare il Verification Rate di contributo.',
            'Preparare i layer futuri: KORA Certified, KORA Value Chain, ecosystem reporting strutturato.',
          ].map((opp) => (
            <div key={opp} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: TOKENS.accent, fontWeight: 700, fontSize: '12px', flexShrink: 0, marginTop: 1 }}>→</span>
              <p style={{ fontSize: '12.5px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>{opp}</p>
            </div>
          ))}
        </div>
      </ChartFrame>

      {/* 11. Methodology boundary */}
      <SectionLabel>Confini metodologici</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.125rem' }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'KORA Contribution è un indicatore companion — non è una componente del KORA Index.',
            'Foundation Light mostra una preview, non un punteggio certificato.',
            'Richiede evidenze collettive e territoriali verificate per maturare.',
            'Nessun dato individuale del lavoratore è esposto in questa vista.',
            'Confidence e calibrazione migliorano con la qualità e il volume delle evidenze.',
          ].map((note) => (
            <li key={note} style={{ display: 'flex', gap: 8, fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
              <span style={{ flexShrink: 0, color: TOKENS.inkHint, marginTop: 2 }}>·</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      {/* ExplainabilityHint */}
      <ExplainabilityHint />

      {/* 12. CTAs */}
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/company/kora-index" style={{ borderRadius: 6, background: TOKENS.ink, padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none' }}>
          KORA Index →
        </Link>
        <Link href="/company/reports" style={{ borderRadius: 6, border: `1px solid ${TOKENS.accent}55`, background: `${TOKENS.accent}0a`, padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
          Decision Pack →
        </Link>
        <Link href="/future-vision" style={{ fontSize: '12px', color: TOKENS.inkHint, textDecoration: 'underline' }}>
          Future Vision →
        </Link>
        <Link href="/company" style={{ fontSize: '12px', color: TOKENS.inkHint, textDecoration: 'underline' }}>
          ← Executive Cockpit
        </Link>
      </div>

      {/* 13. ProvenanceFooter */}
      <ProvenanceFooter
        methodologyVersionId={summary?.methodology_version_id ?? 'KORA Methodology v0.1'}
        calibrationStatus="pre_empirical_calibration"
        reportingPeriod={summary?.reporting_period ?? activeScenario}
      />
    </div>
  );
}
