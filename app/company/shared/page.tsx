'use client';

import Link from 'next/link';
import { useDemoState } from '@/lib/demo-state';
import { isViewerRole } from '@/lib/permissions';
import { SafeguardBadge } from '@/components/badges/SafeguardBadge';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { reportGeneratorService } from '@/services/report-generator/ReportGeneratorService';
import { cn } from '@/lib/utils';
import type { PillarCode } from '@/lib/types';

// ─── Pillar display config ────────────────────────────────────────────────────

const PILLARS: Array<{
  code: PillarCode;
  label: string;
  description: string;
  accent: string;
  heading: string;
}> = [
  {
    code: 'LIFE',
    label: 'LIFE',
    description: 'Salute, benessere, prevenzione, supporto psicologico, nutrizione, attività fisica.',
    accent: 'border-rose-200 bg-rose-50',
    heading: 'text-rose-700',
  },
  {
    code: 'GROWTH',
    label: 'GROWTH',
    description: 'Formazione, competenze, sviluppo professionale, certificazioni, upskilling digitale.',
    accent: 'border-violet-200 bg-violet-50',
    heading: 'text-violet-700',
  },
  {
    code: 'CONNECTION',
    label: 'CONNECTION',
    description: 'Mentoring, supporto tra colleghi, collaborazione, comunità interne, coesione di team.',
    accent: 'border-blue-200 bg-blue-50',
    heading: 'text-blue-700',
  },
  {
    code: 'IMPACT',
    label: 'IMPACT',
    description: 'Volontariato, progetti sociali, iniziative ambientali, contributo territoriale.',
    accent: 'border-green-200 bg-green-50',
    heading: 'text-green-700',
  },
  {
    code: 'LEGACY',
    label: 'LEGACY',
    description: 'Trasferimento di conoscenza, mentoring senior-junior, continuità culturale.',
    accent: 'border-amber-200 bg-amber-50',
    heading: 'text-amber-700',
  },
];

// ─── Macroblock display config ────────────────────────────────────────────────

const MACROBLOCKS: Array<{
  code: string;
  label: string;
  description: string;
  accent: string;
  heading: string;
}> = [
  {
    code: 'REACH',
    label: 'Activation Reach',
    description: 'Quanto l\'attivazione raggiunge realmente la forza lavoro. Una reach alta significa che l\'impatto è distribuito, non concentrato su pochi.',
    accent: 'border-blue-200 bg-blue-50',
    heading: 'text-blue-800',
  },
  {
    code: 'QUALITY',
    label: 'Activation Quality',
    description: 'Quanto le iniziative generano attivazione significativa, verificabile e continuativa. Qualità alta = profondità, non solo presenza.',
    accent: 'border-violet-200 bg-violet-50',
    heading: 'text-violet-800',
  },
  {
    code: 'EQUITY',
    label: 'Distribution & Equity',
    description: 'Quanto l\'attivazione è distribuita equamente tra pillar e popolazione. Squilibri segnalano concentrazioni che riducono il valore organizzativo.',
    accent: 'border-teal-200 bg-teal-50',
    heading: 'text-teal-800',
  },
  {
    code: 'BTI',
    label: 'Budget-to-Human-Impact',
    description: 'Quanto il budget people/welfare si trasforma in attivazione umana reale. Economic Relief e compliance non equivalgono automaticamente a Deep Activation.',
    accent: 'border-amber-200 bg-amber-50',
    heading: 'text-amber-800',
  },
];

function macroblockStatusLabel(score: number): string {
  if (score >= 70) return 'Solido';
  if (score >= 50) return 'In sviluppo';
  if (score >= 35) return 'Da rafforzare';
  return 'Critico';
}

function macroblockStatusClass(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-700';
  if (score >= 50) return 'bg-blue-100 text-blue-700';
  if (score >= 35) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function pct(val: number): string {
  return `${(val * 100).toFixed(0)}%`;
}

function eur(val: number): string {
  return `€${val.toLocaleString('it-IT')}`;
}

// ─── C-SV: KORA Shared View ───────────────────────────────────────────────────

export default function KoraSharedView() {
  const { activeRole, activeScenario } = useDemoState();

  const currentUser = accountProvisioningService.getCurrentDemoUser(activeRole);
  const companyId   = currentUser.company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(companyId);
  const hasKoraData = !!scoringSimulatorService.getKoraIndexOutput(companyId, activeScenario);

  const output      = scoringSimulatorService.score(companyId, activeScenario, '2025');
  const aggregate   = scoringSimulatorService.getCompanyAggregate(companyId, activeScenario);
  const macroblocks = scoringSimulatorService.getMacroblockScores(companyId, activeScenario);

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
    <div className="space-y-6 max-w-5xl">

      {/* ── A. Hero ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
              {tenant?.company_name ?? companyId}
            </p>
            <h1 className="text-2xl font-bold text-slate-900">KORA Shared View</h1>
            <p className="mt-1.5 text-sm text-slate-500 max-w-xl leading-relaxed">
              Vista sintetica e privacy-safe dell&apos;impatto organizzativo, pensata per board, intranet e condivisione interna.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Read-only · Privacy-safe · Company-scoped
            </span>
            {tenant?.analysis_period && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Periodo: {tenant.analysis_period}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-5 py-4 mb-4">
          <p className="text-sm font-semibold text-indigo-800">
            KORA misura l&apos;organizzazione, non gli individui.
          </p>
          <p className="mt-1 text-xs text-indigo-600 leading-relaxed">
            Una sintesi leggibile dell&apos;impatto umano organizzativo, senza dati individuali.
          </p>
        </div>

        <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 leading-relaxed">
          Questa vista non mostra dati individuali, PIB personali, worker roster o backstage metodologico.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] text-amber-600">
            synthetic_demo_data: true · Foundation Light v0.1
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
            {output.methodology_version_id}
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
            {output.calibration_status}
          </span>
        </div>
      </div>

      {/* ── B. KORA Index Snapshot ──────────────────────────────────────────── */}
      {!hasKoraData ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-3">
          <p className="text-sm font-semibold text-amber-800">KORA Index non ancora disponibile</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Questa azienda non ha ancora dati sufficienti per generare una KORA Shared View completa.
            Il KORA Index sarà disponibile al termine della pipeline dati.
          </p>
          {tenant && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-[10px] pt-1">
              {[
                ['Onboarding', tenant.onboarding_status?.replace(/_/g, ' ') ?? 'non avviato'],
                ['Readiness dati', tenant.data_readiness_status ?? '—'],
                ['Decision Pack', tenant.decision_pack_status ?? '—'],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-amber-600">{label}</p>
                  <p className="text-amber-800 font-semibold mt-0.5 capitalize">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
            KORA Index Snapshot
          </p>

          <div className="flex flex-wrap items-start gap-6 mb-6">
            <div>
              <p className="text-[10px] text-slate-400 mb-1">KORA Index v3</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-slate-900">
                  {output.kora_index_value}
                </span>
                <span className="text-lg text-slate-400 font-medium">/100</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {activeScenario === 'S2'
                  ? 'Scenario Post-Intervento'
                  : activeScenario === 'S1'
                  ? 'Scenario Baseline'
                  : 'Scenario demo'}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Confidence Score</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-700">
                    {(output.confidence_score * 100).toFixed(0)}%
                  </span>
                  <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                    ESTERNO · peso = 0
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400 max-w-xs leading-snug">
                  Indicatore esterno di affidabilità dei dati. Non entra nel calcolo del KORA Index.
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 mb-1">Activation Safeguard</p>
                <SafeguardBadge status={output.safeguard_status} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-1 text-[10px] text-slate-400">
            <p>{output.methodology_version_id} · {output.calibration_status}</p>
            <p className="leading-snug">{output.limitations_text}</p>
          </div>
        </div>
      )}

      {hasKoraData && (<>

      {/* ── C. Four Macroblock Summary ──────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sintesi per Macroblock
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MACROBLOCKS.map(({ code, label, description, accent, heading }) => {
            const mb = macroblocks.find((m) => m.code === code);
            const score = mb?.score ?? 0;
            return (
              <div key={code} className={cn('rounded-xl border p-5 flex flex-col gap-3', accent)}>
                <div>
                  <p className={cn('text-xs font-bold uppercase tracking-wide', heading)}>{label}</p>
                  {mb && (
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-800">{score}</span>
                      <span className="text-sm text-slate-400">/100</span>
                    </div>
                  )}
                  {mb && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', macroblockStatusClass(score))}>
                        {macroblockStatusLabel(score)}
                      </span>
                      <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500">
                        Peso {(mb.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed flex-1">{description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── D. Pillar Snapshot ──────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Pillar di Attivazione
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map(({ code, label, description, accent, heading }) => {
            const share = pillarData?.[code];
            return (
              <div key={code} className={cn('rounded-xl border p-4 flex flex-col gap-2', accent)}>
                <p className={cn('text-xs font-bold uppercase tracking-wide', heading)}>{label}</p>
                {share !== undefined && (
                  <p className="text-2xl font-bold text-slate-800">{pct(share)}</p>
                )}
                <p className="text-[10px] text-slate-600 leading-relaxed flex-1">{description}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-slate-400">
          Distribuzione aggregata aziendale · nessun dato individuale lavoratore
        </p>
      </div>

      {/* ── E. Budget-to-Human-Impact Summary ──────────────────────────────── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-4">
          Budget-to-Human-Impact
        </p>

        {btiRecord ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3 mb-5">
              <div>
                <p className="text-[10px] text-amber-600 mb-1">Deep Activation Share</p>
                <p className="text-3xl font-bold text-slate-800">{pct(btiRecord.deep_activation_share)}</p>
                <p className="mt-0.5 text-[10px] text-amber-700">del budget in attivazione profonda</p>
              </div>
              <div>
                <p className="text-[10px] text-amber-600 mb-1">Economic Relief Share</p>
                <p className="text-3xl font-bold text-slate-800">{pct(btiRecord.economic_relief_share)}</p>
                <p className="mt-0.5 text-[10px] text-amber-700">voucher, fringe, benefit monetari</p>
              </div>
              {btiRecord.reallocation_opportunity_eur > 0 && (
                <div>
                  <p className="text-[10px] text-amber-600 mb-1">Opportunità di Riallocazione</p>
                  <p className="text-2xl font-bold text-slate-800">{eur(btiRecord.reallocation_opportunity_eur)}</p>
                  <p className="mt-0.5 text-[10px] text-amber-700 leading-snug">
                    {btiRecord.reallocation_opportunity_description_it}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-amber-100 bg-white/60 px-4 py-3 text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Nota dottrinale:</span>{' '}
              Economic Relief è utile come sollievo economico, ma non equivale automaticamente a Deep Activation.
              KORA misura ciò che accade dopo la spesa.
            </div>

            <p className="mt-3 text-[10px] text-amber-600">
              Compliance esclusa · 0 Impact Units per design metodologico
            </p>
          </>
        ) : (
          <p className="text-sm text-amber-700">
            Dati Budget-to-Human-Impact non ancora disponibili per questa azienda.
          </p>
        )}
      </div>

      {/* ── F. Structural Policy Recognition ───────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Policy Strutturali Riconosciute
        </p>

        {structuralPolicies.length > 0 ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl font-bold text-slate-800">{structuralPolicies.length}</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">policy strutturali identificate</p>
                <p className="text-xs text-slate-500">formalizzate, verificabili, aggregate e privacy-safe</p>
              </div>
            </div>

            <ul className="space-y-2 mb-5">
              {structuralPolicies.slice(0, 5).map((row, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="mt-0.5 shrink-0 text-slate-300">·</span>
                  {row.raw_name}
                </li>
              ))}
              {structuralPolicies.length > 5 && (
                <li className="text-xs text-slate-400">
                  + {structuralPolicies.length - 5} ulteriori policy registrate
                </li>
              )}
            </ul>
          </>
        ) : (
          <p className="text-sm text-slate-500 mb-4">
            Nessuna policy strutturale registrata per questa azienda.
          </p>
        )}

        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-[10px] text-slate-500 leading-relaxed">
          KORA riconosce anche policy organizzative strutturali, se formalizzate, verificabili, aggregate e privacy-safe.
          Non implica tracciamento dell&apos;utilizzo individuale.
        </div>
      </div>

      {/* ── G. Decision Pack Status ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Decision Pack
        </p>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                'rounded px-2 py-0.5 text-xs font-semibold',
                decisionPackStatus === 'ready'
                  ? 'bg-green-100 text-green-700'
                  : decisionPackStatus === 'advisor_review_required'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-500',
              )}>
                {decisionPackStatus === 'ready'
                  ? 'Disponibile'
                  : decisionPackStatus === 'advisor_review_required'
                  ? 'In revisione advisor'
                  : 'Non disponibile'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              {decisionPackStatus === 'ready'
                ? 'Il Decision Pack è pronto con Executive Summary, KORA Index v3, analisi BTI e raccomandazioni diagnostiche.'
                : decisionPackStatus === 'advisor_review_required'
                ? 'Il Decision Pack è in attesa di revisione advisor (Confidence Score < 55%).'
                : 'Il Decision Pack sarà disponibile al termine della pipeline dati.'}
            </p>
          </div>

          <div>
            {!isViewer && decisionPackStatus === 'ready' ? (
              <Link
                href="/company/reports"
                className="inline-block rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                Vai ai Report →
              </Link>
            ) : isViewer && decisionPackStatus === 'ready' ? (
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                Disponibile in consultazione read-only
              </span>
            ) : (
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-400">
                Decision Pack non ancora disponibile
              </span>
            )}
          </div>
        </div>
      </div>

      </>)}

      {/* ── H. Privacy Boundary ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 mb-4">
          Confine Privacy
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-rose-800 mb-3">
              Questa vista non contiene mai:
            </p>
            <ul className="space-y-2">
              {[
                'PIB individuale del lavoratore',
                'Ranking o classifica lavoratori',
                'Dati a livello di singolo worker',
                'Timeline o CV personale',
                'Produttività o performance individuali',
                'Salari, ferie individuali o congedi',
                'Stato di salute o dati sensibili',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-rose-700">
                  <span className="mt-0.5 shrink-0 text-rose-400">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-100 bg-white/60 p-4">
            <p className="text-sm font-semibold text-rose-800 mb-2">
              Il PIB individuale resta privato al lavoratore.
            </p>
            <p className="text-xs text-rose-700 leading-relaxed">
              L&apos;azienda vede solo aggregati privacy-safe. Il Personal Impact Balance è
              un indicatore intermedio privato — mai visibile al datore di lavoro.
            </p>
            <p className="mt-3 text-xs text-rose-700 leading-relaxed">
              Solo aggregati con gruppo ≥ 10 lavoratori sono presentati. Segmenti più piccoli
              sono soppressi per prevenire ri-identificazione.
            </p>
          </div>
        </div>
      </div>

      {/* ── I. Footer / Methodology Boundary ───────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-5 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Confini Metodologici
        </p>
        <div className="grid gap-2 sm:grid-cols-2 text-[10px] text-slate-500">
          <p>
            <span className="font-semibold">Metodologia:</span> {output.methodology_version_id}
          </p>
          <p>
            <span className="font-semibold">Stato calibrazione:</span>{' '}
            <span className="text-amber-600 font-semibold">pre_empirical_calibration</span>
          </p>
          <p>
            <span className="font-semibold">production_ready:</span>{' '}
            <span className="text-rose-600">false</span>
          </p>
          <p>
            <span className="font-semibold">Dati:</span> sintetici demo · synthetic_demo_data: true
          </p>
        </div>
        <p className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 leading-relaxed">
          KORA Shared View è una sintesi interna, non una certificazione pubblica. Non garantisce conformità normativa
          e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
        </p>
      </div>

    </div>
  );
}
