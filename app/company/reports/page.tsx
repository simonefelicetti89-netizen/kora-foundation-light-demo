'use client';

import { useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { scenarioService } from '@/services/scenario/ScenarioService';

// ─── Report card static definitions ──────────────────────────────────────────

type ReportStatus = 'demo' | 'preview' | 'future' | 'preview-info';

interface ReportCard {
  id: string;
  title: string;
  purpose: string;
  audience: string[];
  status: ReportStatus;
  statusLabel: string;
  contents: string[];
  claimBoundary: string;
  csrDisclaimer?: boolean;
}

const REPORT_CARDS: ReportCard[] = [
  {
    id: 'executive-snapshot',
    title: 'KORA Executive Snapshot',
    purpose:
      'Vista executive completa del KORA Index: tutte le componenti, Confidence Score, Activation Safeguard, findings e azioni raccomandate con metodologia e limiti espliciti.',
    audience: ['Board', 'C-Suite', 'HR Senior', 'ESG'],
    status: 'demo',
    statusLabel: 'Demo disponibile',
    contents: [
      'KORA Index + Confidence Score',
      'Activation Safeguard',
      '10 componenti con pesi',
      'Top findings e azioni raccomandate',
      'Note metodologiche e limiti',
    ],
    claimBoundary:
      'Intelligence diagnostica organizzativa — non certificazione, non rating regolatorio, non misurazione individuale.',
  },
  {
    id: 'hr-people',
    title: 'HR / People Activation Report',
    purpose:
      'Lettura aggregata di attivazione, partecipazione e continuità della workforce per periodo.',
    audience: ['HR & People', 'HR Director', 'CHRO'],
    status: 'preview',
    statusLabel: 'Preview',
    contents: [
      'Activation Rate e MAR',
      'Continuità cross-periodo',
      'Distribuzione pillar aggregata',
      'Verifica evidenze per tipologia fonte',
    ],
    claimBoundary:
      'Solo dati aggregati sopra soglia privacy — nessuna previsione di performance individuale. Correlazione ≠ causalità.',
  },
  {
    id: 'esg-csr',
    title: 'ESG / CSR Evidence Annex',
    purpose:
      'KORA organizza evidenze people/social strutturate, verificate e spiegabili per supportare rendicontazione interna, stakeholder reporting e dialogo ESG.',
    audience: ['ESG / Sustainability', 'Comitato CSR', 'Auditor'],
    status: 'preview',
    statusLabel: 'Preview — non compliance',
    contents: [
      'Mappatura pillar IMPACT e LEGACY',
      'Qualità e verifica evidenze',
      'Iniziative people/social verificate',
      'Gap evidence identificati',
      'Limiti metodologici espliciti',
    ],
    claimBoundary:
      'Non garantisce conformità CSRD/ESRS — evidenza people strutturata, non motore di compliance.',
    csrDisclaimer: true,
  },
  {
    id: 'financial',
    title: 'Financial Governance Report',
    purpose:
      'Vista informativa su allocazione budget attivazione e alignment con Impact Units prodotte per pillar.',
    audience: ['CFO', 'Finance', 'Comitato Amministrazione'],
    status: 'preview-info',
    statusLabel: 'Preview informativa',
    contents: [
      'Budget attivazione vs. Impact Units prodotte',
      'Costo per IU — indicativo',
      'Allocation per pillar',
      'Allocazione budget di attivazione per perimetro',
    ],
    claimBoundary:
      'Vista informativa su allocazione budget e activation alignment — non contabilità, non pagamento, non fiscal compliance.',
  },
  {
    id: 'partner-ecosystem',
    title: 'Partner & Ecosystem Report',
    purpose:
      "Contributo dei partner e dell'ecosistema KORA all'attivazione organizzativa.",
    audience: ['CHRO', 'Responsabile Partnership', 'ESG'],
    status: 'future',
    statusLabel: 'Future Vision / Not Active in Foundation Light',
    contents: [
      'Partner attivi e contributo per pillar',
      'Iniziative collettive verificate',
      'Ecosistema KORA Contribution',
    ],
    claimBoundary: 'Non attivo in Foundation Light — disponibile nella fase Pilot.',
  },
  {
    id: 'public-snapshot',
    title: 'Public KORA Snapshot',
    purpose:
      "Comunicazione trasparente dell'attivazione organizzativa verso stakeholder esterni.",
    audience: ['Investor Relations', 'Comunicazione', 'Stakeholder'],
    status: 'future',
    statusLabel: 'Future Vision / Not Active in Foundation Light',
    contents: [
      'KORA Index pubblico con trust layer',
      'Impegno organizzativo comunicabile',
      'Framework approvazione pubblicazione',
    ],
    claimBoundary:
      'Nessuna condivisione reale, nessun ranking pubblico, nessun social sharing attivo in Foundation Light.',
  },
];

const STATUS_STYLES: Record<ReportStatus, { badge: string; card: string }> = {
  demo:           { badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', card: 'border-indigo-200 ring-1 ring-indigo-100' },
  preview:        { badge: 'bg-blue-100 text-blue-700 border-blue-200',       card: 'border-slate-200' },
  'preview-info': { badge: 'bg-sky-100 text-sky-700 border-sky-200',          card: 'border-slate-200' },
  future:         { badge: 'bg-slate-100 text-slate-500 border-slate-200',    card: 'border-slate-200 opacity-70' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

// C-07: Reports — Board Pack MVP
export default function Reports() {
  const { activeScenario } = useScenario();

  const output      = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');
  const safeguard   = scoringSimulatorService.getActivationSafeguard('meridiana-group', activeScenario);
  const confidence  = scoringSimulatorService.getConfidenceRecord('meridiana-group', activeScenario);
  const explanation = explainabilityService.getExplanation('meridiana-group', activeScenario);
  const scenario    = scenarioService.getScenario(activeScenario);

  const nextActions      = explanation?.next_best_actions.slice(0, 3) ?? [];
  const weakComponents   = explanation?.weak_components ?? [];
  const strongComponents = explanation?.strong_components ?? [];

  const dataCompletenessLabel = confidence
    ? `${Math.round(confidence.data_completeness * 100)}%`
    : 'Dato demo non disponibile in questa preview.';

  return (
    <div className="space-y-10 max-w-4xl">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Report e Board Pack</h1>
        <p className="text-sm text-slate-500 mt-1">
          Output executive generati da KORA Foundation Light con metodologia, Confidence Score,
          calibration_status e limiti espliciti.
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          <span>Solo dati sintetici</span>
          <span className="opacity-50">·</span>
          <span>Pre-calibrazione empirica</span>
          <span className="opacity-50">·</span>
          <span>Foundation Light v0.1</span>
        </div>
      </div>

      {/* ── Report cards ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Report Direzionali & Decision Pack
        </p>
        <p className="text-xs text-slate-400 mb-4">
          KORA trasforma activation intelligence, evidenze e raccomandazioni in output leggibili per board, HR, ESG e finance — senza claim regolatori o certificativi.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {REPORT_CARDS.map((card) => {
            const styles = STATUS_STYLES[card.status];
            return (
              <div
                key={card.id}
                className={`rounded-lg border bg-white p-4 space-y-3 ${styles.card}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{card.title}</p>
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
                    {card.statusLabel}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">{card.purpose}</p>

                <div className="flex flex-wrap gap-1">
                  {card.audience.map((a) => (
                    <span key={a} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {a}
                    </span>
                  ))}
                </div>

                <ul className="space-y-1">
                  {card.contents.map((c) => (
                    <li key={c} className="flex gap-1.5 text-xs text-slate-500">
                      <span className="text-slate-300 shrink-0 mt-0.5">·</span>
                      {c}
                    </li>
                  ))}
                </ul>

                <div className="rounded bg-slate-50 border border-slate-100 px-2.5 py-2 text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-500">Perimetro: </span>
                  {card.claimBoundary}
                </div>

                {card.csrDisclaimer && (
                  <div className="rounded bg-amber-50 border border-amber-100 px-2.5 py-2 text-[11px] text-amber-700 leading-relaxed">
                    KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e
                    spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale,
                    fiscale, assurance o reporting obbligatorio.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KORA Executive Snapshot ── */}
      <div className="space-y-6 border-t border-slate-200 pt-10">

        {/* Section title + export CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Report disponibile
            </p>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              KORA Executive Snapshot — Demo
            </h2>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors print:hidden"
          >
            Esporta Board Pack — demo
          </button>
        </div>
        <p className="text-xs text-slate-400 -mt-3 print:hidden">
          Export simulato per Foundation Light — nessuna generazione regolatoria.
        </p>

        {/* A. Report header */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-slate-400">Azienda</p>
            <p className="font-semibold text-slate-800">Meridiana Group S.r.l.</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Scenario / Periodo</p>
            <p className="font-semibold text-slate-800">{scenario.label}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Metodologia</p>
            <p className="font-mono text-xs text-slate-700 mt-0.5">{output.methodology_version_id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Stato calibrazione</p>
            <span className="inline-block mt-0.5 text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Pre-Empirical Calibration
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400">Completezza dati</p>
            <p className="font-semibold text-slate-700">{dataCompletenessLabel}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Tipo output</p>
            <p className="text-slate-600">Demo sintetico — Foundation Light v0.1</p>
          </div>
        </div>

        {/* B. KORA Index Hero — CS + Safeguard + Calibration non-suppressible */}
        <KoraIndexHero output={output} />

        {/* B2. Intelligence positioning note */}
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 leading-relaxed">
          Questo output è intelligence diagnostica organizzativa. Non è una certificazione, non è un rating
          regolatorio e non misura individui. Il KORA Index misura l&apos;attivazione aggregata dell&apos;organizzazione
          su 10 componenti metodologici — prodotto da dati verificati su scala workforce.
        </div>

        {/* C. 10-component breakdown — all 10 required, EQ = Equity */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Breakdown 10 componenti
          </p>
          <ComponentBreakdown components={output.components} />
        </div>

        {/* D. Activation Safeguard */}
        <ActivationSafeguardPanel
          result={safeguard}
          explanation={explanation?.safeguard_explanation}
        />

        {/* E. Top findings */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Principali evidenze diagnostiche
          </p>

          {explanation ? (
            <p className="text-sm text-slate-600 leading-relaxed">
              {explanation.kora_index_explanation}
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Dato demo non disponibile in questa preview.
            </p>
          )}

          {strongComponents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-2">Punti di forza</p>
              <div className="space-y-2">
                {strongComponents.map((c) => (
                  <div key={c.code} className="flex gap-2 text-xs">
                    <span className="font-mono font-bold text-emerald-700 w-8 shrink-0">{c.code}</span>
                    <span className="text-slate-600">{c.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {weakComponents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-2">Aree di miglioramento prioritario</p>
              <div className="space-y-2">
                {weakComponents.map((c) => (
                  <div key={c.code} className="flex gap-2 text-xs">
                    <span className="font-mono font-bold text-amber-700 w-8 shrink-0">{c.code}</span>
                    <span className="text-slate-600">{c.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* F. Recommended actions */}
        {nextActions.length > 0 && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Azioni consigliate — impatto atteso direzionale
            </p>
            <div className="space-y-4">
              {nextActions.map((a) => (
                <div key={a.priority} className="flex gap-3">
                  <span className="font-mono text-sm font-bold text-indigo-300 shrink-0 w-5">
                    {a.priority}.
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-indigo-900">{a.action}</p>
                    <p className="text-xs text-indigo-700 leading-relaxed">{a.detail}</p>
                    <div className="flex gap-1 flex-wrap">
                      {a.target_components.map((code) => (
                        <span
                          key={code}
                          className="font-mono text-[10px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-indigo-400 border-t border-indigo-100 pt-3">
              Le azioni raccomandate sono direzionali — potenziale miglioramento non garantito.
              Priorità e effort da valutare nel contesto organizzativo specifico.
            </p>
          </div>
        )}

        {/* G. Privacy / No-Surveillance note — mandatory */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 leading-relaxed">
          <span className="font-semibold">Privacy garantita: </span>
          Il report contiene solo dati aggregati sopra soglia privacy (≥10 lavoratori per segmento).
          Nessun PIB individuale, timeline personale o Dynamic Impact CV è visibile all&apos;azienda.
          I lavoratori mantengono il controllo del proprio layer personale.
        </div>

        {/* H. Methodology and limitations block — mandatory */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
            Metodologia e limitazioni
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Questo KORA Index è prodotto con metodologia Foundation Light v0.1, attualmente in fase di
            calibrazione empirica. I pesi e le soglie rappresentano una baseline implementativa strutturata.
            L&apos;output è intelligence diagnostica organizzativa, non misurazione certificata. I parametri
            saranno raffinati tramite Delphi Study e programma pilota.
          </p>
          {confidence?.limitations && (
            <p className="text-xs text-amber-600 leading-relaxed border-t border-amber-200 pt-2">
              {confidence.limitations}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="font-mono text-[10px] bg-white border border-amber-200 rounded px-1.5 py-0.5 text-amber-700">
              {output.methodology_version_id}
            </span>
            <span className="text-[10px] bg-white border border-amber-200 rounded px-1.5 py-0.5 text-amber-700">
              pre_empirical_calibration
            </span>
            <span className="text-[10px] bg-white border border-amber-200 rounded px-1.5 py-0.5 text-amber-700">
              synthetic_demo_data
            </span>
          </div>
        </div>

        {/* I. CSR/ESG disclaimer — mandatory */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Nota CSR/ESG: </span>
          KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e
          spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale,
          fiscale, assurance o reporting obbligatorio.
        </div>

      </div>

      {/* ── Board Narrative Generator ── */}
      <div className="space-y-6 border-t border-slate-200 pt-10">

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">Board Narrative Generator</h2>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500">
              Demo
            </span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
            Narrativa direzionale generata da template KORA su dati sintetici demo.
            Nessun LLM esterno, nessun dato reale lavoratore.
          </p>
        </div>

        {/* Mandatory narrative disclaimer — non-suppressible */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 leading-relaxed">
          <span className="font-semibold">Nota: </span>
          Questa narrativa è generata da template demo su dati sintetici. Non usa LLM esterni su dati
          HR/lavoratore, non dimostra causalità, non garantisce ROI, compliance, certificazione o assurance.
        </div>

        {/* A. CEO Summary */}
        <div className="rounded-lg border border-indigo-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              CEO Summary
            </p>
            <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
              Narrativa direzionale
            </span>
          </div>
          <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <p>
              <span className="font-semibold">KORA Index:</span>{' '}
              {output.kora_index_value} / 100 —{' '}
              <span className="font-semibold">Confidence Score:</span>{' '}
              {Math.round(output.confidence_score * 100)}% —{' '}
              <span className="font-semibold">Activation Safeguard:</span>{' '}
              <span className={
                output.safeguard_status === 'CLEAR' ? 'text-green-700 font-bold' :
                output.safeguard_status === 'FLAGGED' ? 'text-red-700 font-bold' :
                'text-amber-700 font-bold'
              }>
                {output.safeguard_status}
              </span>
            </p>
            <p>
              Meridiana Group ha registrato un KORA Index di{' '}
              <span className="font-semibold">{output.kora_index_value}/100</span> nel periodo {output.reporting_period},
              con un Confidence Score del{' '}
              <span className="font-semibold">{Math.round(output.confidence_score * 100)}%</span>.
              {output.safeguard_status === 'WARNING' && (
                <span className="text-amber-700">
                  {' '}L&apos;Activation Safeguard indica che la partecipazione è ancora sotto le soglie ottimali —
                  il KORA Index è da interpretare con cautela direzionale.
                </span>
              )}
              {output.safeguard_status === 'CLEAR' && (
                <span className="text-green-700">
                  {' '}L&apos;Activation Safeguard è CLEAR: entrambe le soglie sono superate e il KORA Index
                  può essere interpretato con piena validità direzionale.
                </span>
              )}
              {output.safeguard_status === 'FLAGGED' && (
                <span className="text-red-700">
                  {' '}L&apos;Activation Safeguard è FLAGGED: attivazione insufficiente — azioni strutturali urgenti
                  prima di interpretare il KORA Index.
                </span>
              )}
            </p>
            {explanation && (
              <p className="text-slate-600">{explanation.kora_index_explanation}</p>
            )}
            <p className="text-slate-600">
              <span className="font-semibold">Priorità strategica:</span>{' '}
              {nextActions[0]
                ? nextActions[0].action
                : "Aumentare copertura e qualità delle evidenze per migliorare Confidence Score e componenti deboli."}
            </p>
          </div>
        </div>

        {/* B. CHRO Actions */}
        <div className="rounded-lg border border-blue-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              CHRO Actions
            </p>
            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
              HR & People
            </span>
          </div>
          <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <p>
              L&apos;analisi di partecipazione rivela una concentrazione significativa degli Impact Unit:
              una minoranza di lavoratori genera la quota predominante dell&apos;attivazione misurata.
              Questa è la <span className="font-semibold">maggioranza silenziosa</span> — lavoratori
              mai attivati o con attivazione nominale.
            </p>
            {weakComponents.length > 0 && (
              <p>
                <span className="font-semibold">Pillar con Debt elevato:</span>{' '}
                {weakComponents.slice(0, 3).map((c) => c.code).join(', ')}.
                EQ (Equity) misura l&apos;equità distributiva dell&apos;attivazione tra segmenti — non la qualità delle evidenze.
              </p>
            )}
            <p className="font-semibold text-blue-800 text-xs mt-2">3 azioni raccomandate per HR:</p>
            <ul className="space-y-1">
              {(nextActions.length > 0 ? nextActions : [
                { action: 'Estendere programmi LIFE ai reparti con AR sotto soglia', detail: 'Priorità sedi con AR < 30%' },
                { action: 'Aumentare Verification Rate convertendo evidenze auto-dichiarate', detail: 'Partner verificati e protocollo evidenze' },
                { action: 'Attivare programma LEGACY e CONNECTION nelle fasce senior', detail: 'Copertura pillar insufficiente' },
              ]).slice(0, 3).map((a, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-600">
                  <span className="text-blue-300 shrink-0 mt-0.5 font-bold">{i + 1}.</span>
                  {a.action}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400 border-t border-blue-100 pt-2 mt-2">
              Il layer My KORA del lavoratore (PIB, Dynamic Impact CV, timeline personale) resta privato
              e non è accessibile ad HR. Solo dati aggregati sopra soglia privacy (≥10 lavoratori).
            </p>
          </div>
        </div>

        {/* C. CFO Budget View */}
        <div className="rounded-lg border border-emerald-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              CFO Budget View
            </p>
            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              Finance
            </span>
          </div>
          <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <p>
              KORA fornisce una vista informativa sull&apos;allineamento tra budget people/welfare e
              attivazione effettivamente misurata. Non è contabilità, non è pagamento, non è fiscal compliance.
            </p>
            <div className="grid grid-cols-3 gap-3 my-3">
              <div className="rounded border border-slate-100 bg-slate-50 p-2 text-center">
                <p className="text-xs text-slate-400">Activation Debt stimato</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">€84.000</p>
                <p className="text-[10px] text-slate-400">stima sintetica demo</p>
              </div>
              <div className="rounded border border-slate-100 bg-slate-50 p-2 text-center">
                <p className="text-xs text-slate-400">Costo per IU</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">Vedi Financial</p>
                <p className="text-[10px] text-slate-400">informativo · non certificato</p>
              </div>
              <div className="rounded border border-slate-100 bg-slate-50 p-2 text-center">
                <p className="text-xs text-slate-400">KORA Index</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">{output.kora_index_value}/100</p>
                <p className="text-[10px] text-slate-400">output direzionale</p>
              </div>
            </div>
            <div className="rounded bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">Disclaimer CFO:</span>{' '}
              KORA non garantisce ROI sul budget people. La correlazione tra budget e KORA Index è
              indicativa — correlazione ≠ causalità. Nessun output di compliance fiscale o payroll.
            </div>
          </div>
        </div>

        {/* D. ESG / CSR Evidence Annex */}
        <div className="rounded-lg border border-teal-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
              ESG / CSR Evidence Annex
            </p>
            <span className="rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-600">
              Sustainability
            </span>
          </div>
          <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <p>
              KORA organizza evidenze people/social strutturate, verificate e spiegabili per supportare
              la rendicontazione CSR/ESG interna, lo stakeholder reporting e il dialogo con auditor ESG.
              Le evidenze sono classificate per pillar IMPACT e LEGACY e qualificate per livello di verifica.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Verification Rate', value: `${safeguard ? Math.round(safeguard.ar_value * 100) : '—'}%`, note: 'VR — evidenze verificate/parziali' },
                { label: 'Confidence Score', value: `${Math.round(output.confidence_score * 100)}%`, note: 'CS — affidabilità dati sottostanti' },
              ].map((m) => (
                <div key={m.label} className="rounded border border-slate-100 bg-slate-50 p-2">
                  <p className="text-xs text-slate-400">{m.label}</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{m.value}</p>
                  <p className="text-[10px] text-slate-400">{m.note}</p>
                </div>
              ))}
            </div>
            <div className="rounded bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">Disclaimer ESG obbligatorio: </span>
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e
              spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale,
              fiscale, assurance o reporting obbligatorio.
            </div>
          </div>
        </div>

        {/* E. Worker Trust Note */}
        <div className="rounded-lg border border-violet-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              Worker Trust Note
            </p>
            <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">
              Lavoratori
            </span>
          </div>
          <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
            <p>
              L&apos;azienda vede <span className="font-semibold">esclusivamente intelligence aggregata</span>.
              Nessun nominativo, nessun ID lavoratore, nessuna timeline individuale è mai accessibile
              alle viste datoriali.
            </p>
            <ul className="space-y-2">
              {[
                'Il datore di lavoro vede solo dati aggregati sopra soglia privacy (≥10 lavoratori per segmento).',
                'Il PIB (Personal Impact Balance) è privato del lavoratore — non è mai visibile al datore di lavoro.',
                "Il Dynamic Impact CV è di proprietà del lavoratore — condiviso solo con consenso esplicito.",
                'KORA non classifica, non rankifica, non sorveglia i singoli lavoratori.',
                'Nessun output KORA è utilizzabile come strumento di performance management individuale.',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-xs text-slate-600">
                  <span className="text-violet-300 shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Board Narrative CTAs */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {['Copia narrativa — demo', 'Porta nel Board Pack — demo', 'Esporta — demo'].map((label) => (
            <button
              key={label}
              disabled
              className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed"
              title="Demo — nessuna generazione reale in Foundation Light."
            >
              {label}
            </button>
          ))}
          <span className="text-[10px] text-slate-400 italic self-center">
            Demo — nessun export reale, nessun LLM esterno, nessun dato individuale.
          </span>
        </div>

      </div>
    </div>
  );
}
