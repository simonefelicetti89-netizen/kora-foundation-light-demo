'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import { useScoringResult } from '@/lib/scoring-result';
import { demoDataService } from '@/services/demo-data/DemoDataService';
import { koraContributionService } from '@/services/kora-contribution/KoraContributionService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { cn } from '@/lib/utils';
import { PILLAR_CODES, PILLAR_LABELS } from '@/lib/constants/kora';
import type { PillarCode } from '@/lib/types';

const PILLAR_COLORS: Record<PillarCode, string> = {
  LIFE:       'bg-green-500',
  GROWTH:     'bg-blue-500',
  CONNECTION: 'bg-purple-500',
  IMPACT:     'bg-orange-500',
  LEGACY:     'bg-amber-500',
};

const PILLAR_LIGHT: Record<PillarCode, string> = {
  LIFE:       'bg-green-50 border-green-200 text-green-700',
  GROWTH:     'bg-blue-50 border-blue-200 text-blue-700',
  CONNECTION: 'bg-purple-50 border-purple-200 text-purple-700',
  IMPACT:     'bg-orange-50 border-orange-200 text-orange-700',
  LEGACY:     'bg-amber-50 border-amber-200 text-amber-700',
};

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  planning:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  archived:  'bg-slate-50 text-slate-400 border-slate-200',
};

const VERIFICATION_BADGE: Record<string, string> = {
  verified:     'text-green-600',
  partial:      'text-yellow-600',
  not_started:  'text-slate-400',
};

function pct(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

function eur(val: number) {
  return `€${val.toLocaleString('it-IT')}`;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  welfare_provider: 'Initiative Provider',
  lms_training:     'Piattaforma di Apprendimento',
  esg_initiatives:  'Iniziative ESG & Impact',
  manual_upload:    'Caricamento Evidenze Manuale',
  partner_events:   'Flusso Evidenze Partner',
  hris_population:  'Fonte Popolazione Workforce',
  hr_system:        'Sistema HR',
};

const ADDITIONALITY_BADGE: Record<string, string> = {
  mandatory_legal_minimum:       'bg-rose-50 text-rose-700 border-rose-200',
  additional_beyond_requirement: 'bg-green-50 text-green-700 border-green-200',
  strategic_company_initiative:  'bg-blue-50 text-blue-700 border-blue-200',
  collective_verified_initiative:'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const REVIEW_STATUS_BADGE: Record<string, string> = {
  approved:                   'bg-green-50 text-green-700 border-green-200',
  under_kora_review:          'bg-yellow-50 text-yellow-700 border-yellow-200',
  advisor_review_required:    'bg-orange-50 text-orange-700 border-orange-200',
  partner_validation_required:'bg-purple-50 text-purple-700 border-purple-200',
  blocked_by_design:          'bg-rose-50 text-rose-700 border-rose-200',
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  approved:                   'Approvato KORA',
  under_kora_review:          'In Revisione KORA',
  advisor_review_required:    'Revisione Advisor Richiesta',
  partner_validation_required:'Validazione Partner Richiesta',
  blocked_by_design:          'Escluso per Design',
};

interface InitiativePreview {
  id: string;
  title: string;
  type: string;
  pillars: string[];
  additionality: string;
  additionality_label: string;
  review_status: string;
  evidence_requirement: string;
  kora_relevance: string;
  economic_contribution: string | null;
  kora_note: string | null;
}

const INITIATIVE_PREVIEW: InitiativePreview[] = [
  {
    id: 'ip-01',
    title: 'Workshop Cultura della Sicurezza Avanzata',
    type: 'Iniziativa Aziendale Interna',
    pillars: ['LIFE', 'CONNECTION'],
    additionality: 'additional_beyond_requirement',
    additionality_label: 'Oltre il minimo legale',
    review_status: 'advisor_review_required',
    evidence_requirement: 'Presenze verificate + evidenza di sessione strutturata',
    kora_relevance: 'Migliora MAR e CO — attivazione significativa con segnale di continuità su LIFE e CONNECTION',
    economic_contribution: null,
    kora_note: 'KORA premia l\'addizionalità. I corsi obbligatori per legge (es. D.Lgs. 81/2008) sono classificati Blocked — generano 0 IU. Questo workshop va oltre il minimo legale: è addizionale, verificabile e può generare IU reali su LIFE e CONNECTION.',
  },
  {
    id: 'ip-02',
    title: 'Giornata della Sostenibilità',
    type: 'Iniziativa Aziendale Interna',
    pillars: ['IMPACT', 'CONNECTION'],
    additionality: 'strategic_company_initiative',
    additionality_label: 'Iniziativa strategica',
    review_status: 'under_kora_review',
    evidence_requirement: 'Registro aggregato delle presenze + evidenza attività strutturata',
    kora_relevance: 'Copre il gap del pillar IMPACT — migliora PC (Pillar Coverage) e PB (Pillar Balance)',
    economic_contribution: null,
    kora_note: null,
  },
  {
    id: 'ip-03',
    title: 'Iniziativa Cross-Azienda di Volontariato',
    type: 'Iniziativa Collettiva',
    pillars: ['IMPACT', 'LEGACY', 'CONNECTION'],
    additionality: 'collective_verified_initiative',
    additionality_label: 'Collettiva — verificata',
    review_status: 'partner_validation_required',
    evidence_requirement: 'Verifica partner + partecipazione aggregata sopra soglia',
    kora_relevance: 'Alta rilevanza KORA Contribution — portata cross-aziendale, territoriale, evidenza partner richiesta',
    economic_contribution: 'Intenzione di co-finanziamento dichiarata',
    kora_note: 'Ammissibile a KORA Contribution se verificata e sopra la soglia di partecipazione. Il denaro da solo non è impatto — il contributo economico si attiva solo se abbinato a partecipazione verificata dei lavoratori.',
  },
  {
    id: 'ip-04',
    title: 'Corso di Sicurezza Obbligatorio (D.Lgs. 81/2008)',
    type: 'Attività di Compliance',
    pillars: [],
    additionality: 'mandatory_legal_minimum',
    additionality_label: 'Minimo legale',
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

  const pillarDist = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Pilastri & Iniziative</h1>
        <p className="text-sm text-slate-500">
          {companyName} — {aggregate?.reporting_period ?? activeScenario}
        </p>
      </div>

      {/* Pillar distribution overview */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Distribuzione Pillar — IU Aggregato
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          {PILLAR_CODES.map((code) => {
            const val = pillarDist?.[code] ?? 0;
            const barColor = PILLAR_COLORS[code];
            return (
              <div key={code}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">{PILLAR_LABELS[code]}</span>
                  <span className="font-mono font-semibold text-slate-600">{pct(val)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className={cn('h-2 rounded-full', barColor)} style={{ width: `${val * 100}%` }} />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-slate-400 pt-1">
            Distribuzione aggregata a livello aziendale. Nessun dato individuale del lavoratore.
          </p>
        </div>
      </div>

      {/* Program portfolio */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Portfolio Programmi
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Programma</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Pillar</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Fonte</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Budget</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">
                  Tasso Part. ({activeScenario})
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Stato</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((prog) => {
                const rate =
                  activeScenario === 'S2'
                    ? prog.expected_participation_rate_s2
                    : prog.expected_participation_rate_s1;
                const allPillars = [...prog.pillars_primary, ...prog.pillars_secondary];
                const isBlocked = prog.kora_eligibility === 'blocked';
                return (
                  <tr key={prog.id} className={cn(
                    'border-b border-slate-100 last:border-0 hover:bg-slate-50',
                    isBlocked && 'bg-rose-50/40',
                  )}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">{prog.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{prog.description}</p>
                      {isBlocked && (
                        <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          Blocked by Design · 0 IU · 0 KORA Index · 0 PIB · 0 Contribution
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {isBlocked ? (
                        <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700">
                          Escluso — governance baseline
                        </span>
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          {allPillars.map((p) => (
                            <span
                              key={p}
                              className={cn(
                                'rounded border px-1.5 py-0.5 text-xs font-mono',
                                PILLAR_LIGHT[p as PillarCode] ?? 'bg-slate-100 text-slate-600 border-slate-200',
                              )}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {SOURCE_TYPE_LABELS[prog.source_type] ?? prog.source_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-mono text-slate-700">
                      {isBlocked
                        ? <span className="text-slate-400">{eur(prog.budget_eur_approx)}<br /><span className="text-[10px]">escl. da IU</span></span>
                        : eur(prog.budget_eur_approx)
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isBlocked ? (
                        <span className="text-xs text-slate-400">
                          {pct(rate)}<br /><span className="text-[10px]">conformità</span>
                        </span>
                      ) : (
                        <span className={cn(
                          'text-xs font-semibold',
                          rate >= 0.40 ? 'text-green-600' :
                          rate >= 0.20 ? 'text-yellow-600' : 'text-red-500',
                        )}>
                          {pct(rate)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'rounded border px-1.5 py-0.5 text-xs capitalize',
                        STATUS_BADGE[prog.status] ?? STATUS_BADGE.active,
                      )}>
                        {prog.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          I valori del budget sono indicativi. I tassi di partecipazione sono stime di scenario.
        </p>
      </div>

      {/* Collective initiatives */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Iniziative Collettive
        </h2>
        {initiatives.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Iniziativa</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Pillar</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Territorio</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Partecipanti</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Verifica</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Stato</th>
                </tr>
              </thead>
              <tbody>
                {initiatives.map((init) => {
                  const verifStyle = VERIFICATION_BADGE[init.verification_status] ?? 'text-slate-400';
                  const statusStyle = STATUS_BADGE[init.status] ?? STATUS_BADGE.planning;
                  const pillarStyle = PILLAR_LIGHT[init.pillar as PillarCode] ?? 'bg-slate-100 text-slate-600 border-slate-200';
                  return (
                    <tr key={init.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800">{init.name}</p>
                        {init.companies_involved.length > 1 && (
                          <p className="text-xs text-indigo-500 mt-0.5">Cross-azienda</p>
                        )}
                        {init.partner_name && (
                          <p className="text-xs text-slate-400 mt-0.5">Partner: {init.partner_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-xs font-mono', pillarStyle)}>
                          {init.pillar}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{init.territory}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-mono text-slate-700">
                        {init.aggregate_participation_count}
                        <span className="text-slate-400"> / {init.aggregate_target_participants}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('text-xs font-medium capitalize', verifStyle)}>
                          {init.verification_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-xs capitalize', statusStyle)}>
                          {init.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
            Nessuna iniziativa collettiva registrata per questo scenario.
          </div>
        )}
        <p className="mt-1.5 text-xs text-slate-400">
          Solo partecipazione aggregata. Nessun dato individuale del lavoratore è mostrato.
        </p>
      </div>

      {/* Initiative Studio Preview */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Initiative Studio
          </h2>
          <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Pilot Preview — non attivo in Foundation Light
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-2xl">
          Crea, proponi o unisciti a iniziative che KORA può validare, orchestrare e misurare.
          KORA passa dal misurare ciò che è accaduto all&apos;orchestrare ciò che dovrebbe accadere dopo.
        </p>

        <div className="space-y-3">
          {INITIATIVE_PREVIEW.map((init) => (
            <div key={init.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              {/* Header row */}
              <div className="flex flex-wrap items-start gap-2">
                <p className="text-sm font-semibold text-slate-800 flex-1 min-w-0">{init.title}</p>
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-500 shrink-0">
                  {init.type}
                </span>
                <span className={cn(
                  'rounded border px-1.5 py-0.5 text-xs font-medium shrink-0',
                  REVIEW_STATUS_BADGE[init.review_status] ?? 'bg-slate-50 text-slate-500 border-slate-200',
                )}>
                  {REVIEW_STATUS_LABELS[init.review_status] ?? init.review_status}
                </span>
              </div>

              {/* Pillars + additionality */}
              <div className="flex flex-wrap items-center gap-1.5">
                {init.pillars.map((p) => (
                  <span key={p} className={cn(
                    'rounded border px-1.5 py-0.5 text-xs font-mono',
                    PILLAR_LIGHT[p as PillarCode] ?? 'bg-slate-100 text-slate-600 border-slate-200',
                  )}>
                    {p}
                  </span>
                ))}
                <span className={cn(
                  'rounded border px-1.5 py-0.5 text-xs font-medium',
                  ADDITIONALITY_BADGE[init.additionality] ?? 'bg-slate-50 text-slate-500 border-slate-200',
                )}>
                  {init.additionality_label}
                </span>
              </div>

              {/* Evidence + relevance grid */}
              <div className="grid gap-1.5 sm:grid-cols-2 text-xs">
                <div className="text-slate-600">
                  <span className="font-medium text-slate-400">Evidenza richiesta: </span>
                  {init.evidence_requirement}
                </div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-400">Rilevanza KORA: </span>
                  {init.kora_relevance}
                </div>
                {init.economic_contribution && (
                  <div className="sm:col-span-2 text-slate-600">
                    <span className="font-medium text-slate-400">Contributo economico: </span>
                    <span className="text-indigo-600">{init.economic_contribution}</span>
                    <span className="text-slate-400 ml-1">— solo intento di governance, non esecuzione di pagamento</span>
                  </div>
                )}
              </div>

              {/* KORA methodology note */}
              {init.kora_note && (
                <div className={cn(
                  'rounded border px-3 py-2 text-xs leading-relaxed',
                  init.review_status === 'blocked_by_design'
                    ? 'border-rose-100 bg-rose-50 text-rose-700'
                    : 'border-amber-100 bg-amber-50 text-amber-700',
                )}>
                  {init.kora_note}
                </div>
              )}

              {/* Disabled CTA */}
              <div>
                <button
                  disabled
                  className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                >
                  {init.additionality === 'mandatory_legal_minimum'
                    ? 'Registra Attività Compliance — Disponibile in fase pilot'
                    : 'Proponi Iniziativa — Disponibile in fase pilot'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Foundation Light Preview. </span>
            Nessuna iniziativa viene inviata, approvata, finanziata o attivata da questa schermata.
            L&apos;Initiative Studio e i workflow di orchestrazione KORA sono disponibili in fase pilot.
          </p>
        </div>
      </div>
    </div>
  );
}
