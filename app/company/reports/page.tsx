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
    </div>
  );
}
