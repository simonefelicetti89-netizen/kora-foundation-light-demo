'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { isAdminRole } from '@/lib/permissions';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { PillarChart } from '@/components/charts/PillarChart';
import { WarningCard } from '@/components/cards/WarningCard';
import { NextActionCard } from '@/components/cards/NextActionCard';
import { SafeguardBadge } from '@/components/badges/SafeguardBadge';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { cn } from '@/lib/utils';
import type { PillarCode } from '@/lib/types';

// ─── Static landing data ──────────────────────────────────────────────────────

const VALUE_PILLARS = [
  {
    id: 'misura',
    title: 'Misura',
    body: "KORA Index, Confidence Score e Activation Safeguard per leggere la maturità dell'attivazione.",
    cardStyle: 'border-indigo-200 bg-indigo-50',
    titleStyle: 'text-indigo-800',
    bodyStyle: 'text-indigo-700',
  },
  {
    id: 'diagnostica',
    title: 'Diagnostica',
    body: 'Activation Debt, Silent Majority e gap per pillar/sede per capire dove resta valore inattivato.',
    cardStyle: 'border-amber-200 bg-amber-50',
    titleStyle: 'text-amber-800',
    bodyStyle: 'text-amber-700',
  },
  {
    id: 'decide',
    title: 'Decide',
    body: 'Budget-to-Impact, People KPI Correlation e Board Pack per portare insight a CEO, HR, ESG e Finance.',
    cardStyle: 'border-green-200 bg-green-50',
    titleStyle: 'text-green-800',
    bodyStyle: 'text-green-700',
  },
] as const;

interface WorkspaceRoute {
  href: string;
  title: string;
  copy: string;
  status: string;
  active: boolean;
}

const WORKSPACE_ROUTES: WorkspaceRoute[] = [
  {
    href: '/company/kora-index',
    title: 'KORA Index',
    copy: 'Capisci come viene costruito il KORA Index e quali componenti lo spiegano.',
    status: 'Attivo in Foundation Light',
    active: true,
  },
  {
    href: '/company/activation',
    title: 'Debito di Attivazione',
    copy: "Scopri chi resta fuori dall'attivazione significativa e dove il valore si concentra.",
    status: 'Attivo in Foundation Light',
    active: true,
  },
  {
    href: '/company/financial',
    title: 'Budget-to-Impact',
    copy: 'Collega budget people/welfare/training a Impact Units, Activation Debt e KPI HR.',
    status: 'Attivo in Foundation Light',
    active: true,
  },
  {
    href: '/company/reports',
    title: 'Reports & Board Pack',
    copy: 'Trasforma l\'intelligence KORA in output direzionali per CEO, HR, ESG e Finance.',
    status: 'Attivo in Foundation Light',
    active: true,
  },
  {
    href: '/company/data',
    title: 'Dati & Evidenze',
    copy: 'Vedi quali fonti dati alimentano il processo KORA, sempre a livello batch/metadati.',
    status: 'Attivo in Foundation Light',
    active: true,
  },
  {
    href: '/company/pillars',
    title: 'Pillar & Iniziative',
    copy: 'Analizza LIFE, GROWTH, CONNECTION, IMPACT, LEGACY e le iniziative collegate.',
    status: 'Attivo in Foundation Light',
    active: true,
  },
];

interface PipelineStep {
  label: string;
  note: string | null;
  highlight?: boolean;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { label: 'Dati sorgente',         note: null },
  { label: 'UEF / Review',          note: null },
  { label: 'Impact Units',          note: null },
  { label: 'PIB privato',           note: 'privato', highlight: true },
  { label: 'Aggregazione aziendale',note: null },
  { label: 'KORA Index',            note: null },
  { label: 'Activation Debt',       note: null },
  { label: 'Budget-to-Impact',      note: null },
  { label: 'Board Pack',            note: null },
];

const COMPANY_CAN_SEE = [
  'KORA Index aziendale',
  'Activation Debt',
  'Pillar coverage',
  'Trend aggregati',
  'Budget-to-Impact',
  'Report e raccomandazioni',
];

const COMPANY_CANNOT_SEE = [
  'PIB individuale',
  'Timeline personale',
  'Dynamic Impact CV',
  'Scelte individuali',
  'Singoli eventi personali',
  'Profilo lavoratore',
  'Ranking lavoratori',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricTile({ label, value, code, description }: {
  label: string; value: string; code: string; description?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs font-mono text-slate-400 mt-0.5">{code}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1.5 leading-snug border-t border-slate-100 pt-1.5 text-left">
          {description}
        </p>
      )}
    </div>
  );
}

function InsightTile({ label, labelColor, title, body }: {
  label: string; labelColor: string; title: string; body: string;
}) {
  return (
    <div className={cn('rounded border p-3', labelColor)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-70">{label}</p>
      <p className="text-sm font-semibold text-slate-800 leading-snug">{title}</p>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">{body}</p>
    </div>
  );
}

function pct(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

// ─── C-01: Executive Cockpit ──────────────────────────────────────────────────

export default function ExecutiveCockpit() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const isAdmin = isAdminRole(activeRole);

  const output      = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');
  const aggregate   = scoringSimulatorService.getCompanyAggregate('meridiana-group', activeScenario);
  const warnings    = explainabilityService.getWarnings('meridiana-group', activeScenario);
  const actions     = explainabilityService.getNextBestActions('meridiana-group', activeScenario);
  const weakComps   = explainabilityService.getTopWeakComponents('meridiana-group', activeScenario);
  const strongComps = explainabilityService.getTopStrongComponents('meridiana-group', activeScenario);

  const pillarData = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  const mainWeakness = weakComps[0];
  const mainStrength = strongComps[0];
  const nextAction   = actions[0];

  return (
    <div className="space-y-6">

      {/* ── Company Executive Entry Hero ─────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Company Workspace
        </p>
        <h1 className="text-2xl font-bold text-slate-900">KORA Company Workspace</h1>
        <p className="text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
          Il layer aziendale per trasformare azioni reali, welfare, formazione e iniziative people
          in intelligence organizzativa verificata.
        </p>
        <div className="mt-3 inline-block rounded border border-indigo-200 bg-indigo-50 px-4 py-2">
          <p className="text-sm font-semibold text-indigo-800">
            KORA misura l&apos;organizzazione, non sorveglia le persone.
          </p>
        </div>

        <div className="grid gap-3 mt-5 sm:grid-cols-3">
          {VALUE_PILLARS.map((p) => (
            <div key={p.id} className={cn('rounded-lg border p-4', p.cardStyle)}>
              <p className={cn('text-xs font-bold uppercase tracking-wide mb-1.5', p.titleStyle)}>
                {p.title}
              </p>
              <p className={cn('text-xs leading-relaxed', p.bodyStyle)}>{p.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100 leading-relaxed">
          L&apos;azienda vede solo aggregati sopra soglia privacy. Non vede PIB individuali,
          timeline personali, scelte individuali o Dynamic Impact CV.
        </p>
      </div>

      {/* ── Cosa puoi fare da qui ─────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Cosa puoi fare da qui
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WORKSPACE_ROUTES.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                  {r.title}
                </p>
                <span className={cn(
                  'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                  r.active
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700',
                )}>
                  {r.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{r.copy}</p>
              <p className="mt-2 text-xs text-indigo-400 group-hover:text-indigo-600 transition-colors">
                Vai →
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Dal dato al board ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Dal dato al board
        </h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-1.5">
                <div className={cn(
                  'flex items-center gap-1 rounded border px-2.5 py-1.5',
                  step.highlight ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white',
                )}>
                  <span className={cn(
                    'text-xs font-medium',
                    step.highlight ? 'text-rose-700' : 'text-slate-700',
                  )}>
                    {step.label}
                  </span>
                  {step.note && (
                    <span className="rounded bg-rose-100 px-1 py-0.5 text-[9px] font-semibold text-rose-600">
                      {step.note}
                    </span>
                  )}
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <span className="text-xs text-slate-300">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 pt-2.5 border-t border-slate-200 text-xs font-medium text-rose-600">
            Il PIB resta privato. L&apos;azienda vede solo output aggregati e spiegabili.
          </p>
        </div>
      </div>

      {/* ── Privacy promise ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Cosa vede l&apos;azienda / cosa non vede mai
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-green-800">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                ✓
              </span>
              L&apos;azienda vede
            </p>
            <ul className="space-y-1.5">
              {COMPANY_CAN_SEE.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-green-700">
                  <span className="mt-0.5 shrink-0 text-green-400">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-rose-800">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                ✕
              </span>
              L&apos;azienda non vede mai
            </p>
            <ul className="space-y-1.5">
              {COMPANY_CANNOT_SEE.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-rose-700">
                  <span className="mt-0.5 shrink-0 text-rose-400">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Ecosystem preview ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Il layer ecosistemico
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-1 text-sm font-semibold text-slate-800">Partner</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Abilitano azioni e servizi secondo protocolli evidenze.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-1 text-sm font-semibold text-slate-800">Advisor</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Eseguono Advisor Process Audit, Evidence Protocol Review e controlli periodici.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Activation Network</p>
              {!isAdmin && (
                <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  Vista interna KORA
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mostra copertura territoriale, partner, pillar e gap di attivazione.
            </p>
            {isAdmin && (
              <Link
                href="/admin/network"
                className="mt-2 inline-block text-xs text-indigo-500 transition-colors hover:text-indigo-700"
              >
                Vai ad Activation Network →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Dashboard Operativo divider ───────────────────────────────────────── */}
      <div className="border-t border-slate-200 pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Dashboard Operativo
        </p>
      </div>

      {/* Snapshot insight tiles */}
      {(mainWeakness || mainStrength || nextAction) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {mainWeakness && (
            <InsightTile
              label="Punto debole"
              labelColor="border-rose-200 bg-rose-50"
              title={`${mainWeakness.label} (${(mainWeakness.value * 100).toFixed(0)}%)`}
              body={mainWeakness.explanation}
            />
          )}
          {mainStrength && (
            <InsightTile
              label="Punto di forza"
              labelColor="border-green-200 bg-green-50"
              title={`${mainStrength.label} (${(mainStrength.value * 100).toFixed(0)}%)`}
              body={mainStrength.explanation}
            />
          )}
          {nextAction && (
            <InsightTile
              label="Prossima priorità"
              labelColor="border-blue-200 bg-blue-50"
              title={nextAction.action}
              body={nextAction.detail}
            />
          )}
        </div>
      )}

      {/* Scenario context label */}
      <div className={cn(
        'rounded border px-3 py-2 text-xs font-medium',
        activeScenario === 'S2'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-amber-200 bg-amber-50 text-amber-700',
      )}>
        {activeScenario === 'S2'
          ? `Scenario Post-Reallocation (S2) — Scenario migliorato: KORA Index ${output.kora_index_value}, Activation Safeguard ${output.safeguard_status}, distribuzione più bilanciata.`
          : activeScenario === 'S1'
          ? `Scenario Baseline (S1) — Scenario iniziale: KORA Index ${output.kora_index_value}, Activation Safeguard ${output.safeguard_status}, Activation Debt elevato.`
          : 'Scenario demo — dati sintetici Foundation Light.'}
      </div>

      {/* KORA Index Hero (CS + Safeguard + Calibration non-suppressible) */}
      <KoraIndexHero output={output} />

      {/* Activation Safeguard */}
      <div
        className={cn(
          'rounded-lg border p-4',
          output.safeguard_status === 'CLEAR'   ? 'bg-green-50 border-green-200' :
          output.safeguard_status === 'FLAGGED' ? 'bg-red-50 border-red-200' :
                                                   'bg-amber-50 border-amber-200',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Activation Safeguard
            </p>
            <p className="max-w-lg text-xs leading-relaxed text-slate-700">
              Verifica se l&apos;attivazione è abbastanza ampia e significativa prima di interpretare il KORA Index.
              {output.safeguard_status === 'CLEAR' && (
                <span className="text-green-700">
                  {' '}Entrambe le soglie superate: il KORA Index può essere interpretato con piena validità.
                </span>
              )}
              {output.safeguard_status === 'WARNING' && (
                <span className="text-amber-700">
                  {' '}Una o entrambe le soglie non sono ancora raggiunte: il KORA Index è visibile ma da interpretare con cautela.
                </span>
              )}
              {output.safeguard_status === 'FLAGGED' && (
                <span className="text-red-700">
                  {' '}Attivazione insufficiente: il KORA Index è bloccato o fortemente qualificato. Serve AR ≥ 20% e MAR ≥ 15%.
                </span>
              )}
            </p>
          </div>
          <SafeguardBadge status={output.safeguard_status} className="shrink-0" />
        </div>
      </div>

      {/* Activation Summary */}
      {aggregate && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Riepilogo Attivazione
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Activation Rate"       value={pct(aggregate.activation_rate)}            code="AR"  description="Quota della forza lavoro con almeno un'Impact Unit approvata." />
            <MetricTile label="Meaningful Activation" value={pct(aggregate.meaningful_activation_rate)} code="MAR" description="Quota che supera la soglia di materialità — non solo nominale." />
            <MetricTile label="Continuity Rate"       value={pct(aggregate.continuity_rate)}            code="CO"  description="Lavoratori attivi in più periodi di rendicontazione." />
            <MetricTile label="Verification Rate"     value={pct(aggregate.verification_rate)}          code="VR"  description="Attività supportata da evidenze verificate o parzialmente verificate." />
          </div>
        </div>
      )}

      {/* Pillar Distribution + Component Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PillarChart data={pillarData} />
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            KORA Index v3 — Componenti Analitici
          </h2>
          <p className="mb-1 text-[10px] text-slate-400 leading-snug">
            KORA Index v3 = 4 macroblocchi pesati. I componenti analitici spiegano il dettaglio, ma non sono tutti pesati allo stesso modo.
          </p>
          <p className="mb-3 text-[10px] text-slate-400 leading-snug">
            KORA riconosce anche policy organizzative strutturali — come flessibilità, congedi migliorativi, diritto alla disconnessione o policy di fiducia — solo se formalizzate, verificabili, aggregate e privacy-safe.
          </p>
          <ComponentBreakdown components={output.components} />
        </div>
      </div>

      {/* Warnings + Next Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Segnali Chiave
          </h2>
          {warnings.length > 0 ? (
            <div className="space-y-2">
              {warnings.map((w) => (
                <WarningCard key={w.code} warning={w} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
              Nessun segnale critico per questo scenario.
            </p>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Azioni Raccomandate
          </h2>
          {actions.length > 0 ? (
            <div className="space-y-2">
              {actions.slice(0, 3).map((a) => (
                <NextActionCard key={a.priority} action={a} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
              Nessuna azione disponibile per questo scenario.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {output.methodology_version_id} · {output.calibration_status} · {output.reporting_period}
      </p>
    </div>
  );
}
