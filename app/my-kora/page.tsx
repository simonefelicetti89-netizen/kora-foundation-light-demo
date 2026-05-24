'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRole, useScenario, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { cn } from '@/lib/utils';

// ─── Pillar styling ───────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  LIFE: 'bg-green-500', GROWTH: 'bg-blue-500', CONNECTION: 'bg-purple-500',
  IMPACT: 'bg-orange-500', LEGACY: 'bg-amber-500',
};

const PILLAR_LIGHT: Record<string, string> = {
  LIFE: 'bg-green-50 text-green-700 border-green-200',
  GROWTH: 'bg-blue-50 text-blue-700 border-blue-200',
  CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
  IMPACT: 'bg-orange-50 text-orange-700 border-orange-200',
  LEGACY: 'bg-amber-50 text-amber-700 border-amber-200',
};

const PILLAR_TEXT: Record<string, string> = {
  LIFE: 'text-green-700', GROWTH: 'text-blue-700', CONNECTION: 'text-purple-700',
  IMPACT: 'text-orange-700', LEGACY: 'text-amber-700',
};

const TREND_ICON: Record<string, string> = { up: '↑', stable: '→', down: '↓' };
const TREND_COLOR: Record<string, string> = { up: 'text-green-500', stable: 'text-slate-400', down: 'text-red-400' };

const VERIF_LABEL: Record<string, string> = {
  verified: 'Verificato', partial: 'Parziale', self_declared: 'Autodichiarato',
};
const VERIF_COLOR: Record<string, string> = {
  verified: 'text-green-600', partial: 'text-yellow-600', self_declared: 'text-slate-400',
};
const IU_COLOR: Record<string, string> = {
  high: 'text-green-600', medium: 'text-blue-600', low: 'text-slate-400',
};

// ─── Enhanced pillar detail — inline synthetic data extending service data ────

const PILLAR_ENHANCED: Record<string, { continuity: string; latest: string }> = {
  LIFE:       { continuity: 'media', latest: 'Check prevenzione e benessere' },
  GROWTH:     { continuity: 'alta',  latest: 'Corso leadership avanzato' },
  CONNECTION: { continuity: 'media', latest: 'Workshop community team' },
  IMPACT:     { continuity: 'alta',  latest: 'Volontariato territoriale' },
  LEGACY:     { continuity: 'bassa', latest: 'Mentoring neoassunti' },
};

const CONTINUITY_BADGE: Record<string, string> = {
  alta:  'bg-green-50 text-green-700 border-green-200',
  media: 'bg-amber-50 text-amber-700 border-amber-200',
  bassa: 'bg-red-50 text-red-600 border-red-200',
};

// ─── Timeline extra attributes — keyed by service timeline item ID ────────────

const TIMELINE_EXTRA: Record<string, {
  source: string;
  visibility: string;
  can_become: string | null;
}> = {
  'tl-001': { source: 'Welfare Provider',  visibility: 'Solo sopra soglia',    can_become: null },
  'tl-002': { source: 'LMS aziendale',     visibility: 'Privato/aggregabile', can_become: 'Dynamic Impact CV + IU' },
  'tl-003': { source: 'Welfare Provider',  visibility: 'Privato',             can_become: null },
  'tl-004': { source: 'Partner evento',    visibility: 'Privato',             can_become: null },
  'tl-005': { source: 'LMS aziendale',     visibility: 'Privato/aggregabile', can_become: 'Dynamic Impact CV' },
  'tl-006': { source: 'Partner ESG',       visibility: 'Privato',             can_become: 'Dynamic Impact CV' },
  'tl-007': { source: 'Partner evento',    visibility: 'Privato',             can_become: 'Dynamic Impact CV' },
  'tl-008': { source: 'Upload manuale',    visibility: 'Privato',             can_become: null },
};

// ─── KORA Link / QR stepper steps ────────────────────────────────────────────

const KORA_LINK_STEPS = [
  { label: 'Azione reale',            desc: 'Partecipi a un evento, corso o iniziativa verificabile.' },
  { label: 'QR / KORA Link',         desc: 'Scansioni il QR o usi KORA Link — solo simulazione demo.' },
  { label: 'Evidenza generata',       desc: "Viene generata un'evidenza candidata con metadati di categoria." },
  { label: 'UEF candidate',          desc: 'Il record diventa un UEF candidate — pipeline di validazione avviata.' },
  { label: 'Review',                  desc: 'Advisor o partner conferma la categoria e il pillar assegnato.' },
  { label: 'Impact Units',           desc: 'Se approvato, genera IU calcolate nel tuo PIB privato.' },
  { label: 'PIB privato aggiornato', desc: 'Il tuo Personal Impact Balance si aggiorna — visibile solo a te.' },
  { label: 'Aggregazione aziendale', desc: "Contribuisce all'aggregato aziendale solo sopra soglia privacy — in forma anonima." },
];

// Shareable items count matches CV service data (3 verified+shareable items in synthetic demo)
const HERO_SHAREABLE_ITEMS = 3;

// ─── Page ─────────────────────────────────────────────────────────────────────

// W-01: My KORA Home
export default function MyKoraHome() {
  const [koraLinkStep, setKoraLinkStep] = useState(0);
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const { activePersona } = usePersona();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My KORA</h1>
          <p className="text-sm text-slate-500">Spazio personale del lavoratore</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">Accesso Limitato</p>
          <p className="mt-1 text-xs text-rose-600 max-w-sm mx-auto">
            My KORA è uno spazio privato del lavoratore. I ruoli datore di lavoro e admin non possono accedere
            ai dati individuali. I dati individuali del lavoratore non sono mai visibili al di fuori della
            sessione del lavoratore stesso.
          </p>
          <p className="mt-3 text-xs font-mono text-rose-400">Ruolo attivo: {activeRole}</p>
          <p className="mt-1 text-xs text-rose-400">Passa al ruolo WORKER per visualizzare questo spazio.</p>
        </div>
      </div>
    );
  }

  const preview = myKoraPreviewService.getMyKoraHomePreview(
    activePersona?.id ?? 'persona-a',
    activeScenario,
  );
  const workerCompanyId = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const aggregate = scoringSimulatorService.getCompanyAggregate(workerCompanyId, activeScenario);

  if (!preview) return null;

  const strongestPillar = preview.pib_light.pillar_breakdown.reduce(
    (a, b) => (b.score > a.score ? b : a),
    preview.pib_light.pillar_breakdown[0],
  );

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">My KORA</h1>
        <p className="text-sm text-slate-500">
          {activePersona ? activePersona.display_name : preview.persona_label}
          {' '}— {activeScenario}
        </p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">
          Il layer personale del lavoratore: PIB privato, timeline personale, opportunità e Dynamic Impact CV
          sotto controllo del lavoratore.
        </p>
        <p className="text-[11px] text-indigo-600 font-semibold mt-1">
          Questo spazio è personale: l&apos;azienda non vede il tuo PIB individuale.
        </p>
      </div>

      {/* ── Core privacy statement — non-suppressible ── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-sm font-bold text-indigo-900">
          Il dato è mio. Posso capirlo, proteggerlo, usarlo e trasformarlo in valore personale.
        </p>
        <p className="text-xs text-indigo-700 mt-1.5 leading-relaxed">
          Il datore di lavoro non vede il tuo PIB individuale, la tua timeline personale, le tue scelte
          o il tuo Dynamic Impact CV. Solo dati aggregati e anonimizzati — sopra soglia privacy —
          contribuiscono al KORA Index aziendale.
        </p>
        <p className="text-[11px] text-indigo-500 mt-1.5 italic">
          My KORA non è performance management. Non è una classifica. Non è accessibile al datore di lavoro.
        </p>
      </div>

      {/* ── Hero metric cards — 4 cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-400">PIB privato</p>
          <div className="flex items-end gap-1 mt-1">
            <span className="text-2xl font-bold text-slate-800">{preview.pib_light.overall_index}</span>
            <span className="text-sm text-slate-400 pb-0.5">/ 100</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Personal Impact Balance</p>
          <p className="text-[10px] text-indigo-500 mt-1 italic">Visibile solo nel tuo layer personale.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-400">Pillar più forte</p>
          <p className={cn('text-2xl font-bold mt-1', PILLAR_TEXT[strongestPillar?.pillar ?? ''] ?? 'text-slate-800')}>
            {strongestPillar?.pillar ?? '—'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">score {strongestPillar?.score ?? 0}</p>
          <p className="text-[10px] text-indigo-500 mt-1 italic">Pillar con maggiore continuità personale.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-400">Opportunità</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{preview.opportunities.length + 3}</p>
          <p className="text-xs text-slate-400 mt-0.5">iniziative e servizi</p>
          <p className="text-[10px] text-indigo-500 mt-1 italic">Suggeriti per te — visibili solo a te.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-400">Elementi condivisibili</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{HERO_SHAREABLE_ITEMS}</p>
          <p className="text-xs text-slate-400 mt-0.5">Dynamic Impact CV</p>
          <p className="text-[10px] text-indigo-500 mt-1 italic">Badge / esperienze esportabili solo se decidi tu.</p>
        </div>
      </div>

      {/* ── Il tuo PIB privato — enhanced pillar section ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Il tuo PIB privato</h2>
          <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-mono text-indigo-600">
            privato-lavoratore
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {preview.pib_light.active_pillars} pillar attivi · {preview.pib_light.total_events} eventi · {preview.pib_light.period}
        </p>

        <div className="divide-y divide-slate-50">
          {preview.pib_light.pillar_breakdown.map((p) => {
            const extra = PILLAR_ENHANCED[p.pillar];
            const contBadge = extra ? CONTINUITY_BADGE[extra.continuity] : '';
            return (
              <div key={p.pillar} className="py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs font-mono font-semibold', PILLAR_TEXT[p.pillar] ?? 'text-slate-600')}>
                      {p.pillar}
                    </span>
                    {extra && (
                      <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', contBadge)}>
                        continuità {extra.continuity}
                      </span>
                    )}
                    <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                      Privato
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-mono text-slate-500 shrink-0">
                    {p.score}
                    <span className={cn('text-xs', TREND_COLOR[p.trend])}>
                      {TREND_ICON[p.trend]}
                    </span>
                    <span className="text-slate-300 ml-1">{p.event_count} eventi</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 mb-1">
                  <div
                    className={cn('h-1.5 rounded-full', PILLAR_COLORS[p.pillar] ?? 'bg-slate-400')}
                    style={{ width: `${p.score}%` }}
                  />
                </div>
                {extra && (
                  <p className="text-[10px] text-slate-400 italic">Ultima attività: {extra.latest}</p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 leading-relaxed">
          Questi valori non vengono mostrati all&apos;azienda. L&apos;azienda vede solo aggregati sopra soglia
          privacy (≥10 lavoratori). Il PIB è un indicatore personale — non un voto, non una classifica,
          non un parametro di performance.
        </p>
      </div>

      {/* ── Personal impact timeline — enhanced ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">Timeline personale</h2>
          <span className="text-xs text-slate-400 font-mono">privata</span>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          La timeline personale appartiene al lavoratore. Può contribuire agli aggregati aziendali solo in
          forma anonima e sopra soglia privacy.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {preview.timeline.map((item) => {
              const extra = TIMELINE_EXTRA[item.id];
              return (
                <div key={item.id} className="px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-start gap-3">
                    <div className="text-xs font-mono text-slate-400 w-24 shrink-0 mt-0.5">{item.date}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{item.category}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono',
                          PILLAR_LIGHT[item.pillar] ?? 'bg-slate-100 text-slate-600 border-slate-200',
                        )}>
                          {item.pillar}
                        </span>
                        {extra && <span className="text-[10px] text-slate-400">{extra.source}</span>}
                        <span className={cn('text-[10px] font-medium', VERIF_COLOR[item.verification_status])}>
                          {VERIF_LABEL[item.verification_status] ?? item.verification_status}
                        </span>
                        <span className={cn('text-[10px] font-mono', IU_COLOR[item.iu_contribution])}>
                          IU: {item.iu_contribution}
                        </span>
                      </div>
                      {extra && (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                            {extra.visibility}
                          </span>
                          {extra.can_become && (
                            <span className="text-[10px] text-indigo-500 italic">
                              → può alimentare: {extra.can_become}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Solo visualizzazione a livello di categoria. Nessun dettaglio sanitario, nome o identificatore personale.
        </p>
      </div>

      {/* ── Company KORA Snapshot — aggregate only ── */}
      {aggregate && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Company KORA Snapshot</h2>
            <span className="text-xs text-slate-400 font-mono">aggregato · non individuale</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-400">Activation Rate</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {(aggregate.activation_rate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Verification Rate</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {(aggregate.verification_rate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Lavoratori Attivi</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {aggregate.active_worker_count}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Solo dati aggregati aziendali — nessun dato individuale è mostrato o condiviso.
          </p>
        </div>
      )}

      {/* ── KORA Link / QR Action Preview — stepper ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-semibold text-slate-700">KORA Link / QR — Action Preview</h2>
              <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-500">
                Demo
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Simula come un&apos;azione reale diventa evidenza, UEF candidate, Impact Units e aggiornamento
              del PIB privato.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {KORA_LINK_STEPS.map((step, i) => {
            const stepNum = i + 1;
            const isComplete = koraLinkStep >= stepNum;
            return (
              <div
                key={step.label}
                className={cn(
                  'flex items-start gap-3 rounded-md border p-2.5 transition-colors',
                  isComplete ? 'border-green-200 bg-green-50' : 'border-slate-100 bg-slate-50',
                )}
              >
                <span className={cn(
                  'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5',
                  isComplete ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500',
                )}>
                  {isComplete ? '✓' : stepNum}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold', isComplete ? 'text-green-700' : 'text-slate-600')}>
                    {step.label}
                  </p>
                  <p className={cn('text-[10px] leading-snug', isComplete ? 'text-green-600' : 'text-slate-400')}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pt-1">
          {koraLinkStep < KORA_LINK_STEPS.length ? (
            <button
              onClick={() => setKoraLinkStep((s) => s + 1)}
              className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              {koraLinkStep === 0
                ? 'Simula azione — demo'
                : `Prossimo step (${koraLinkStep + 1}/${KORA_LINK_STEPS.length})`}
            </button>
          ) : (
            <button
              onClick={() => setKoraLinkStep(0)}
              className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Ricomincia simulazione
            </button>
          )}
          <span className="text-[10px] text-slate-400 italic">
            Simulazione locale. Nessun QR/NFC reale, nessuna identità reale, nessuna scrittura su backend.
          </span>
        </div>
      </div>

      {/* ── Worker trust explainer ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Cosa vede l&apos;azienda?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold text-green-800 mb-2">L&apos;azienda VEDE:</p>
            <ul className="space-y-1.5">
              {[
                'Aggregati sopra soglia privacy (≥10 lavoratori)',
                'KORA Index aziendale (10 componenti)',
                'Activation Debt (stima aggregata)',
                'Pillar coverage organizzativa',
                'Trend organizzativi e report aggregati',
                'Raccomandazioni di investimento',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-green-700">
                  <span className="text-green-400 shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold text-rose-800 mb-2">L&apos;azienda NON VEDE:</p>
            <ul className="space-y-1.5">
              {[
                'Il tuo PIB individuale',
                'La tua timeline personale',
                'Le tue scelte individuali',
                'Il tuo Dynamic Impact CV',
                'I singoli eventi personali',
                'Il tuo profilo lavoratore',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-rose-700">
                  <span className="text-rose-400 shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] font-semibold text-rose-700 italic">
              Il datore di lavoro vede l&apos;organizzazione, non te.
            </p>
          </div>
        </div>
      </div>

      {/* ── Future Vision: KORA Activation Community ── */}
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-xs font-semibold text-orange-700">Opportunità dalla KORA Activation Community</p>
          <span className="rounded border border-orange-300 bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
            Future Vision / Non attivo in Foundation Light
          </span>
        </div>
        <ul className="space-y-1">
          {[
            'Iniziative territoriali condivise tra più aziende',
            'Opportunità partner verificate con evidenza collettiva',
            'Contributo aggregato a community — worker-controlled',
            'Badge collettivi portabili nel Dynamic Impact CV',
          ].map((item) => (
            <li key={item} className="flex gap-1.5 text-xs text-orange-700">
              <span className="text-orange-400 shrink-0 mt-0.5">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Navigation cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link href="/my-kora/dynamic-cv" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors">
          <p className="text-sm font-semibold text-slate-700">Dynamic Impact CV</p>
          <p className="text-xs text-slate-400 mt-0.5">Il tuo portfolio di impatto verificato</p>
        </Link>
        <Link href="/my-kora/privacy" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors">
          <p className="text-sm font-semibold text-slate-700">Privacy & Sharing</p>
          <p className="text-xs text-slate-400 mt-0.5">Consent & Sharing Vault</p>
        </Link>
        <Link href="/my-kora/opportunities" className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 hover:bg-indigo-100 transition-colors">
          <p className="text-sm font-semibold text-indigo-700">Opportunità</p>
          <p className="text-xs text-indigo-500 mt-0.5">Iniziative e servizi suggeriti per te</p>
        </Link>
      </div>

      {/* ── Synthetic demo notice ── */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-400 leading-relaxed">
        Dati sintetici demo. My KORA è una preview del layer personale. Non rappresenta account reali,
        identità reali, wallet, booking, pagamenti o certificazioni attive.
        <span className="block mt-0.5 font-mono text-slate-300">
          synthetic_demo_data: true · Foundation Light Preview · KORA Methodology v0.1
        </span>
      </div>
    </div>
  );
}
