'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { koraContributionService } from '@/services/kora-contribution/KoraContributionService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { cn } from '@/lib/utils';
import type { CollectiveInitiative } from '@/services/kora-contribution/KoraContributionService';

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       'bg-green-100 text-green-700 border-green-200',
  GROWTH:     'bg-blue-100 text-blue-700 border-blue-200',
  CONNECTION: 'bg-purple-100 text-purple-700 border-purple-200',
  IMPACT:     'bg-orange-100 text-orange-700 border-orange-200',
  LEGACY:     'bg-amber-100 text-amber-700 border-amber-200',
};

const LEVEL_STYLES: Record<string, { badge: string; bar: string; label: string }> = {
  minimal:  { badge: 'bg-slate-100 text-slate-600 border-slate-200',    bar: 'bg-slate-300',    label: 'Embrionale' },
  emerging: { badge: 'bg-blue-100 text-blue-700 border-blue-200',       bar: 'bg-blue-500',     label: 'Emergente'  },
  active:   { badge: 'bg-green-100 text-green-700 border-green-200',    bar: 'bg-green-500',    label: 'Attivo'     },
  advanced: { badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', bar: 'bg-indigo-600',   label: 'Avanzato'   },
};

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  planning:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  archived:  'bg-slate-50 text-slate-400 border-slate-200',
};

const VERIFICATION_STYLES: Record<string, string> = {
  verified:    'text-green-600',
  partial:     'text-yellow-600',
  not_started: 'text-slate-400',
  pending:     'text-blue-500',
};

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
    accent: 'border-blue-200 bg-blue-50',
    titleColor: 'text-blue-800',
    noteColor: 'text-blue-700',
    title: 'Attivazione Collettiva Interna',
    description: 'Iniziative che coinvolgono gruppi, team o comunità di lavoratori all\'interno dell\'organizzazione.',
    measures: [
      'Programmi strutturati per gruppi di lavoratori',
      'Qualità e continuità della partecipazione collettiva',
      'Knowledge transfer, mentoring, eventi interni documentati',
    ],
    data_needed: 'Registro aggregato partecipanti · evidenze strutturate di sessione · validazione advisor',
    why: 'Segnala se l\'attivazione è distribuita collettivamente o rimane individuale e frammentata.',
    types: ['internal_mentoring_collective', 'collective_upskilling', 'collective_community_event'],
  },
  {
    id: 'territorial',
    accent: 'border-orange-200 bg-orange-50',
    titleColor: 'text-orange-800',
    noteColor: 'text-orange-700',
    title: 'Attivazione Territoriale & Comunitaria',
    description: 'Contributo verificabile al territorio: volontariato, iniziative scuola-lavoro, progetti sociali e ambientali.',
    measures: [
      'Volontariato territoriale documentato',
      'Progetti a beneficio di comunità locali',
      'Iniziative ambientali con evidenza verificabile',
    ],
    data_needed: 'Partnership territoriali documentate · partecipazione aggregata verificata · evidenze partner',
    why: 'Il segnale più visibile per reporting ESG people-side. Connette l\'organizzazione al territorio.',
    types: ['cross_company_volunteering', 'partner_collective_event'],
  },
  {
    id: 'ecosystem',
    accent: 'border-violet-200 bg-violet-50',
    titleColor: 'text-violet-800',
    noteColor: 'text-violet-700',
    title: 'Attivazione Ecosistema & Cross-Company',
    description: 'Programmi multi-azienda, collaborazioni con partner e advisor. Impatto condiviso oltre il perimetro del singolo tenant.',
    measures: [
      'Iniziative congiunte con altre aziende',
      'Programmi territoriali condivisi con partner',
      'Attivazione verificata della value chain',
    ],
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

function InitiativeCard({ initiative }: { initiative: CollectiveInitiative }) {
  const pillarStyle = PILLAR_COLORS[initiative.pillar] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const statusStyle = STATUS_STYLES[initiative.status] ?? STATUS_STYLES.planning;
  const verifStyle  = VERIFICATION_STYLES[initiative.verification_status] ?? 'text-slate-400';
  const typeLabel   = INITIATIVE_TYPE_LABELS[initiative.initiative_type] ?? initiative.initiative_type.replace(/_/g, ' ');
  const isCrossCompany = initiative.companies_involved.length > 1;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{initiative.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{initiative.territory}</p>
          {isCrossCompany && (
            <p className="text-xs text-indigo-500 font-medium mt-0.5">Cross-azienda · {initiative.companies_involved.length} organizzazioni</p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium', pillarStyle)}>
            {initiative.pillar}
          </span>
          <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium', statusStyle)}>
            {initiative.status}
          </span>
        </div>
      </div>

      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{typeLabel}</p>
      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{initiative.description}</p>

      <div className="grid grid-cols-3 gap-2 pt-0.5">
        <div>
          <p className="text-xs text-slate-400">Partecipanti</p>
          <p className="text-sm font-semibold text-slate-700">
            {initiative.aggregate_participation_count}
            <span className="text-xs font-normal text-slate-400"> / {initiative.aggregate_target_participants}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Verifica</p>
          <p className={cn('text-xs font-medium capitalize', verifStyle)}>
            {initiative.verification_status.replace(/_/g, ' ')}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Advisor</p>
          <p className="text-xs font-medium text-slate-600 capitalize">
            {initiative.advisor_validation_status.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {initiative.partner_name && (
        <p className="text-xs text-slate-400">
          Partner: <span className="text-slate-600">{initiative.partner_name}</span>
        </p>
      )}
    </div>
  );
}

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

  const levelStyle    = LEVEL_STYLES[summary?.contribution_level ?? 'minimal'] ?? LEVEL_STYLES.minimal;
  const scorePct      = summary ? Math.min(summary.contribution_score, 100) : 0;
  const planningCount = summary
    ? Math.max(0, summary.collective_initiatives_count - summary.active_initiatives_count - summary.completed_initiatives_count)
    : 0;

  // Classify contribution-relevant initiatives by architecture layer
  const internalInits   = contributionInitiatives.filter((i) =>
    ARCHITECTURE_LAYERS[0].types.includes(i.initiative_type as never),
  );
  const territorialInits = contributionInitiatives.filter((i) =>
    ARCHITECTURE_LAYERS[1].types.includes(i.initiative_type as never),
  );
  const ecosystemInits  = contributionInitiatives.filter((i) => i.companies_involved.length > 1);

  const layerInitCounts = [internalInits, territorialInits, ecosystemInits];

  // Diagnostic signals — zeros framed as activation gaps, not failures
  const signals = summary ? [
    {
      label: 'Partecipazioni collettive verificate',
      value: summary.verified_initiative_participations > 0
        ? `${summary.verified_initiative_participations} nel periodo di reporting`
        : 'Non ancora sufficienti nel dataset demo',
      ok: summary.verified_initiative_participations > 0,
    },
    {
      label: 'Iniziative collettive attive',
      value: summary.active_initiatives_count > 0
        ? `${summary.active_initiatives_count} attiva/e nel periodo`
        : planningCount > 0
          ? `${planningCount} in planning — partecipazione non ancora avviata`
          : 'Nessuna nel perimetro demo corrente',
      ok: summary.active_initiatives_count > 0,
    },
    {
      label: 'Iniziative territoriali',
      value: territorialInits.length > 0
        ? `${territorialInits.length} iniziativa/e territoriale/i — verifica ${territorialInits.every(i => i.verification_status === 'verified') ? 'completata' : 'in corso'}`
        : planningCount > 0
          ? '1 in planning, nessuna ancora verificata'
          : 'Non presenti nel dataset demo corrente',
      ok: territorialInits.length > 0,
    },
    {
      label: 'Cross-company activation',
      value: summary.cross_company_initiatives_count > 0
        ? `${summary.cross_company_initiatives_count} programma/i cross-company attivo/i`
        : `Non presente — ${summary.ecosystem_partners_active} partner ecosistema attivi`,
      ok: summary.cross_company_initiatives_count > 0,
    },
    {
      label: 'Evidenza advisor-verified',
      value: summary.completed_initiatives_count > 0
        ? `${summary.completed_initiatives_count} iniziativa/e completata/e e validata/e da advisor`
        : 'Non ancora disponibile nel perimetro demo',
      ok: summary.completed_initiatives_count > 0,
    },
  ] : [];

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ── 1. Hero / Strategic Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Indicatore Companion
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">KORA Contribution</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
          Il segnale che misura quanto l&apos;organizzazione genera valore collettivo verificabile oltre il proprio perimetro interno.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="rounded border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            Companion Indicator
          </span>
          <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Non incluso nel KORA Index
          </span>
          <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Foundation Light Preview
          </span>
          <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
            Pre-calibrazione empirica
          </span>
        </div>
      </div>

      {/* ── KORA Index vs KORA Contribution contrast ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">KORA Index</p>
          <p className="text-xs text-slate-700 leading-relaxed">
            Misura ciò che accade <strong>dentro</strong> l&apos;organizzazione: attivazione della workforce,
            qualità, equità e budget-to-human-impact.
          </p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mb-1.5">KORA Contribution</p>
          <p className="text-xs text-indigo-900 leading-relaxed">
            Misura ciò che l&apos;organizzazione <strong>attiva nel territorio e nell&apos;ecosistema</strong>:
            iniziative collettive verificate, contributo comunitario, attivazione cross-company.
          </p>
        </div>
      </div>

      {/* ── 2. Score Interpretation ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Contribution Score — {summary?.reporting_period ?? activeScenario}
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-start gap-4 flex-wrap">
            <div>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-slate-800">{summary?.contribution_score ?? 0}</span>
                <span className="text-sm text-slate-400 pb-1.5">/ 100</span>
                <span className={cn('rounded border px-2 py-0.5 text-xs font-semibold mb-1.5', levelStyle.badge)}>
                  {levelStyle.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(summary?.contribution_score ?? 0) <= 15
                  ? 'Contributo collettivo ancora embrionale nel dataset demo'
                  : (summary?.contribution_score ?? 0) < 50
                  ? 'Contributo collettivo in fase emergente — segnali positivi, verifica da completare'
                  : 'Contributo collettivo consolidato'}
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div className={cn('h-1.5 rounded-full transition-all', levelStyle.bar)} style={{ width: `${scorePct}%` }} />
          </div>
          <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800 leading-relaxed">
            Il punteggio basso non indica fallimento operativo. Segnala che le iniziative territoriali,
            cross-company o collettive verificate non sono ancora sufficientemente presenti nel perimetro
            Foundation Light.
          </div>
          {summary?.contribution_explanation && (
            <p className="text-xs text-slate-600 leading-relaxed">{summary.contribution_explanation}</p>
          )}
        </div>
      </section>

      {/* ── Stats row ── */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Iniziative collettive',    value: summary.collective_initiatives_count },
            { label: 'Partecipazioni verificate', value: summary.verified_initiative_participations, sub: 'aggregato' },
            { label: 'Cross-azienda',            value: summary.cross_company_initiatives_count },
            { label: 'Partner ecosistema',       value: summary.ecosystem_partners_active },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
              {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── 3. Contribution Architecture ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
          Contribution Architecture — Tre Layer Strategici
        </h2>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          KORA Contribution è strutturato in tre layer. Ogni layer misura una dimensione distinta del valore collettivo generato oltre il perimetro aziendale.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {ARCHITECTURE_LAYERS.map((layer, idx) => {
            const layerInits = layerInitCounts[idx];
            const hasActive  = layerInits.some((i) => i.status === 'active' || i.status === 'completed');
            return (
              <div key={layer.id} className={cn('rounded-lg border p-4 space-y-3', layer.accent)}>
                <p className={cn('text-xs font-bold uppercase tracking-wide', layer.titleColor)}>
                  {layer.title}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">{layer.description}</p>
                <ul className="space-y-0.5 pl-3">
                  {layer.measures.map((m) => (
                    <li key={m} className="list-disc text-xs text-slate-600 leading-relaxed">{m}</li>
                  ))}
                </ul>
                <div className="rounded border border-white/60 bg-white/50 px-2.5 py-2 space-y-1.5">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">STATO DEMO</p>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {layerInits.length > 0
                        ? `${layerInits.length} iniziativa/e — ${hasActive ? 'attiva/e o completata/e' : 'da verificare'}`
                        : 'Segnale non ancora maturo nel dataset demo corrente'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">DATI NECESSARI</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{layer.data_needed}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">PERCHÉ CONTA</p>
                    <p className={cn('text-xs mt-0.5 leading-relaxed', layer.noteColor)}>{layer.why}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. Contribution Pipeline ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Pipeline di Contributo — Architettura Target
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-1.5">
                <div className="rounded bg-slate-50 border border-slate-200 px-2.5 py-1.5 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="text-xs font-medium text-slate-700 leading-snug mt-0.5 whitespace-nowrap">{step}</p>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <span className="text-slate-300 font-bold text-sm">→</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
            <p className="text-[10px] text-slate-500">
              <span className="font-semibold">Architettura target:</span> questa è la pipeline verso cui KORA evolve operativamente.
            </p>
            <p className="text-[10px] text-slate-500">
              Foundation Light prevede la logica di questa pipeline. Nessuna contribution certificata è prodotta in questa fase demo.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. Demo Diagnostic Signals ── */}
      {summary && signals.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Segnali Diagnostici — Dataset Demo
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {signals.map((sig, i) => (
              <div
                key={sig.label}
                className={cn(
                  'flex items-start gap-3 px-4 py-3',
                  i < signals.length - 1 ? 'border-b border-slate-100' : '',
                  !sig.ok ? 'bg-slate-50' : '',
                )}
              >
                <span className={cn(
                  'mt-0.5 text-xs font-bold shrink-0 w-3 text-center',
                  sig.ok ? 'text-green-500' : 'text-slate-300',
                )}>
                  {sig.ok ? '✓' : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{sig.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{sig.value}</p>
                </div>
                {!sig.ok && (
                  <span className="shrink-0 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                    Gap di attivazione
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 6a. Contribution-relevant initiatives ── */}
      {contributionInitiatives.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Iniziative Contribution-Relevant
          </h2>
          <div className="space-y-3">
            {contributionInitiatives.map((init) => (
              <InitiativeCard key={init.id} initiative={init} />
            ))}
          </div>
        </section>
      )}

      {/* ── 6b. Non-contribution initiatives (context) ── */}
      {nonContribInits.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Altre Iniziative Collettive
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {nonContribInits.map((init, i) => (
              <div
                key={init.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5',
                  i < nonContribInits.length - 1 ? 'border-b border-slate-100' : '',
                )}
              >
                <span className={cn(
                  'rounded border px-1.5 py-0.5 text-xs font-mono shrink-0',
                  PILLAR_COLORS[init.pillar] ?? 'bg-slate-100 text-slate-600 border-slate-200',
                )}>
                  {init.pillar}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{init.name}</p>
                  <p className="text-[10px] text-slate-400">{init.territory} · {init.status}</p>
                </div>
                <span className="shrink-0 text-[9px] font-medium text-slate-400 uppercase tracking-wide">
                  Non contribution-relevant
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Iniziative collettive non ancora qualificate per KORA Contribution in questo scenario.
          </p>
        </section>
      )}

      {/* ── 7. Strategic Opportunity ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Contribution Opportunity — Prossimi Passi per {companyName}
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          {[
            'Convertire le iniziative in planning in programmi collettivi strutturati — con evidenze verificabili e advisor review.',
            'Attivare partnership territoriali nell\'area Bergamo, dove il Plant è sottorappresentato nell\'attivazione.',
            'Connettere la partecipazione dei lavoratori a outcomes comunitari verificati per generare segnale territoriale.',
            'Avanzare l\'Advisor Review sulle iniziative con evidenze parziali per aumentare il Verification Rate di contributo.',
            'Preparare i layer futuri: KORA Certified, KORA Value Chain, ecosystem reporting strutturato.',
          ].map((opp) => (
            <div key={opp} className="flex items-start gap-2.5">
              <span className="mt-0.5 text-indigo-400 font-bold text-xs shrink-0">→</span>
              <p className="text-xs text-slate-700 leading-relaxed">{opp}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. Methodology Boundary Box ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1.5">
        <p className="font-semibold text-slate-600">Confini metodologici</p>
        <ul className="space-y-1 pl-3">
          <li className="list-disc leading-relaxed">KORA Contribution è un indicatore companion — non è una componente del KORA Index.</li>
          <li className="list-disc leading-relaxed">Foundation Light mostra una preview, non un punteggio certificato.</li>
          <li className="list-disc leading-relaxed">Richiede evidenze collettive e territoriali verificate per maturare.</li>
          <li className="list-disc leading-relaxed">Nessun dato individuale del lavoratore è esposto in questa vista.</li>
          <li className="list-disc leading-relaxed">Confidence e calibrazione migliorano con la qualità e il volume delle evidenze.</li>
        </ul>
        <p className="text-[10px] text-slate-400 pt-1 font-mono">
          {summary?.methodology_version_id ?? 'KORA Methodology v0.1'} · calibration_status: pre_empirical_calibration · synthetic_demo_data: true
        </p>
      </div>

      {/* ── 9. Navigation / CTAs ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <Link
          href="/company/kora-index"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          KORA Index →
        </Link>
        <Link
          href="/company/reports"
          className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
        >
          Decision Pack →
        </Link>
        <Link
          href="/future-vision"
          className="text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          Future Vision →
        </Link>
        <Link
          href="/company"
          className="text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          ← Executive Cockpit
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Contribution · synthetic_demo_data: true · company_id: {companyId} · {activeScenario}
      </p>
    </div>
  );
}
