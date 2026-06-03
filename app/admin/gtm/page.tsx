import Link from 'next/link';
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

// ─── Static GTM data ──────────────────────────────────────────────────────────

interface ScenarioCard {
  label: string;
  safeguard: string;
  safeguardStyle: string;
  cardStyle: string;
  metrics: [string, string][];
  copy: string;
}

const SCENARIO_S1: ScenarioCard = {
  label: 'S1 — Stato attuale',
  safeguard: 'WARNING',
  safeguardStyle: 'border-amber-300 bg-amber-100 text-amber-700',
  cardStyle: 'border-amber-200 bg-amber-50',
  metrics: [
    ['KORA Index',      '34'],
    ['Confidence Score','60%'],
    ['Activation Rate', '38%'],
    ['MAR',             '22%'],
    ['Activation Debt', '€45k'],
  ],
  copy: "Activation Rate 38%, Activation Safeguard WARNING, KORA Index 34, Activation Debt €45k. Il valore people è concentrato su pochi gruppi e il bottom 50% resta poco attivato.",
};

const SCENARIO_S2: ScenarioCard = {
  label: 'S2 — Post-intervento',
  safeguard: 'CLEAR',
  safeguardStyle: 'border-green-300 bg-green-100 text-green-700',
  cardStyle: 'border-green-200 bg-green-50',
  metrics: [
    ['KORA Index',      '54'],
    ['Confidence Score','72%'],
    ['Activation Rate', '52%'],
    ['MAR',             '38%'],
    ['Activation Debt', 'ridotto'],
  ],
  copy: "Activation Rate 52%, Activation Safeguard CLEAR, KORA Index 54, distribuzione più bilanciata e debito di attivazione ridotto.",
};

interface GTMTrackStep { n: number; label: string; href: string; roleNote?: string }
interface GTMTrack {
  id: string;
  duration: string;
  title: string;
  audience: string;
  goal: string;
  message: string;
  deliverable: string;
  presenterNote: string;
  cardStyle: string;
  letterStyle: string;
  steps: GTMTrackStep[];
}

const GTM_TRACKS: GTMTrack[] = [
  {
    id: 'A',
    duration: '15 min',
    title: 'Pitch rapido',
    audience: 'CEO / board / investor intro',
    goal: 'Far capire in pochi minuti perché KORA misura attivazione organizzativa e genera un Decision Pack.',
    message: 'KORA trasforma spesa people e iniziative reali in intelligence organizzativa verificata.',
    deliverable: 'Board Pack / Decision Pack',
    presenterNote: 'Non entrare nei dettagli tecnici: problema, indice, debito, output.',
    cardStyle: 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)]',
    letterStyle: 'text-[rgba(6,3,43,0.30)]',
    steps: [
      { n: 1, label: 'Demo Guide',              href: '/demo-guide' },
      { n: 2, label: 'Company Workspace',        href: '/company' },
      { n: 3, label: 'Activation Debt',          href: '/company/activation' },
      { n: 4, label: 'Reports & Board Pack',     href: '/company/reports' },
    ],
  },
  {
    id: 'B',
    duration: '30 min',
    title: 'Discovery commerciale',
    audience: 'CHRO + CFO',
    goal: 'Mostrare dal dato al KORA Index, dal debito di attivazione al budget, fino al report direzionale.',
    message: 'Dal dato al debt, dal budget al Board Pack — con privacy lavoratore garantita.',
    deliverable: 'KORA Index, Activation Debt, Budget-to-Human-Impact, Board Pack, privacy architecture',
    presenterNote: 'Usare My KORA per chiudere il tema sorveglianza/privacy.',
    cardStyle: 'border-[rgba(43,92,230,0.15)] bg-[rgba(43,92,230,0.05)]',
    letterStyle: 'text-[rgba(43,92,230,0.60)]',
    steps: [
      { n: 1, label: 'Demo Guide',              href: '/demo-guide' },
      { n: 2, label: 'Company Workspace',        href: '/company' },
      { n: 3, label: 'KORA Index Detail',        href: '/company/kora-index' },
      { n: 4, label: 'Activation Debt',          href: '/company/activation' },
      { n: 5, label: 'Budget-to-Human-Impact',  href: '/company/financial' },
      { n: 6, label: 'Reports & Board Pack',     href: '/company/reports' },
      { n: 7, label: 'My KORA Worker Layer',     href: '/my-kora',   roleNote: 'passa a WORKER' },
    ],
  },
  {
    id: 'C',
    duration: '60 min',
    title: 'Deep dive pilot',
    audience: 'CTO / HR Ops / ESG / pilot sponsor / investor technical reviewer',
    goal: 'Mostrare end-to-end intelligence, worker trust, partner, advisor e rete territoriale.',
    message: 'KORA è una piattaforma multi-sided: azienda, lavoratore, partner, advisor e territorio.',
    deliverable: 'Full platform walkthrough + pilot package',
    presenterNote: 'Spiegare chiaramente i cambi ruolo: company, worker, partner, advisor, admin.',
    cardStyle: 'border-[rgba(107,122,146,0.15)] bg-[rgba(107,122,146,0.05)]',
    letterStyle: 'text-[rgba(107,122,146,0.60)]',
    steps: [
      { n: 1,  label: 'Demo Guide',              href: '/demo-guide' },
      { n: 2,  label: 'Company Workspace',        href: '/company' },
      { n: 3,  label: 'KORA Index Detail',        href: '/company/kora-index' },
      { n: 4,  label: 'Dati & Evidenze',          href: '/company/data' },
      { n: 5,  label: 'Activation Debt',          href: '/company/activation' },
      { n: 6,  label: 'Pillar & Iniziative',      href: '/company/pillars' },
      { n: 7,  label: 'Budget-to-Human-Impact',  href: '/company/financial' },
      { n: 8,  label: 'Reports & Board Pack',     href: '/company/reports' },
      { n: 9,  label: 'My KORA Worker Layer',     href: '/my-kora',         roleNote: 'passa a WORKER' },
      { n: 10, label: 'Partner Workspace',        href: '/partner',         roleNote: 'passa a PARTNER' },
      { n: 11, label: 'Advisor Workspace',        href: '/advisor',         roleNote: 'passa a ADVISOR' },
      { n: 12, label: 'Activation Network',       href: '/admin/network',   roleNote: 'passa a KORA_ADMIN' },
      { n: 13, label: 'Future Vision',            href: '/future-vision' },
    ],
  },
];

const PILOT_INCLUDES = [
  { n: '01', title: 'Prima lettura KORA Index organizzativo',    body: '10 componenti, Confidence Score, Activation Safeguard, metodologia versionata.' },
  { n: '02', title: 'Activation Debt Diagnostic',               body: 'Silent Majority, concentrazione, pillar debt, gap per sede/reparto sopra soglia privacy.' },
  { n: '03', title: 'Budget-to-Human-Impact',                   body: 'Lettura direzionale della spesa people/welfare/training rispetto a Impact Units e priorità di investimento.' },
  { n: '04', title: 'HR KPI Correlation Preview',                body: 'Correlazioni aggregate e direzionali. Correlazione ≠ causalità.' },
  { n: '05', title: 'Board / Decision Pack',                     body: 'CEO Summary, CHRO Actions, CFO Budget View, ESG Annex, Worker Trust Note.' },
  { n: '06', title: 'My KORA Worker Layer Preview',              body: 'PIB privato, timeline personale, Dynamic Impact CV, Consent & Sharing Vault.' },
  { n: '07', title: 'Partner / Advisor Ecosystem Preview',       body: 'Partner Operating Preview, Advisor Process Audit, Evidence Protocol Review, Activation Network.' },
];

const PILOT_EXCLUDES = [
  'nessun sistema di produzione',
  'nessun database production',
  'nessuna auth reale',
  'nessuna integrazione HRIS/LMS live',
  'nessun booking reale',
  'nessun wallet',
  'nessun pagamento',
  'nessun marketplace transazionale',
  'nessuna certificazione KORA',
  'nessun ROI garantito',
  'nessuna retention garantita',
  'nessuna riduzione assenteismo garantita',
  'nessuna compliance ESG/fiscale/legale garantita',
];

const PILOT_SOURCES = [
  { title: 'Welfare provider export',                body: 'CSV/Excel: categorie, periodi, utilizzo aggregato.' },
  { title: 'LMS / formazione',                       body: 'Completamenti, tipologie corso, periodi, mapping pillar.' },
  { title: 'HR population file',                     body: 'Perimetro workforce anonimizzato/pseudonimizzato, senza dati sensibili non necessari.' },
  { title: 'Iniziative people / ESG / CSR',          body: 'Eventi, programmi, iniziative territoriali, partecipazione aggregata.' },
  { title: 'Budget welfare / training / people ESG', body: 'Budget allocato per area, se disponibile, per Budget-to-Human-Impact.' },
  { title: 'Partner / advisor evidence',             body: 'Protocollo evidenze, stato review, audit processo, sample check demo.' },
];

const PILOT_CRITERIA = [
  'Prima lettura KORA Index prodotta entro finestra concordata',
  'Activation Debt identificato su almeno un segmento organizzativo',
  'Budget-to-Human-Impact generato per almeno un perimetro di spesa',
  'Board Pack generato e discusso con leadership',
  'Privacy architecture validata con HR/legal',
  'Next actions definiti',
];

const STAGE_STYLES: Record<string, string> = {
  pilot_active:   'bg-green-100 text-green-800 border-green-200',
  pilot_proposed: 'bg-[rgba(43,92,230,0.10)] text-[#1B2A4A] border-[rgba(43,92,230,0.22)]',
  demo_shown:     'bg-[rgba(6,3,43,0.06)] text-[rgba(6,3,43,0.85)] border-[rgba(199,111,61,0.22)]',
  contacted:      'bg-yellow-100 text-yellow-800 border-yellow-200',
  prospect:       'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
};

// ─── A-09: KORA GTM & Pilot Console ──────────────────────────────────────────

export default function GtmPilotConsole() {
  const pipeline = adminPreviewService.getFounderValidationPreview();
  const gates    = adminPreviewService.getGateStatusPreview();
  const totalArr = pipeline.reduce((s, e) => s + e.potential_arr_eur, 0);

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-[#06032B]">KORA GTM & Pilot Console</h1>
          <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
            Vista interna KORA
          </span>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Internal GTM
          </span>
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-xs font-medium text-[rgba(6,3,43,0.40)]">
            Foundation Light
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.52)] max-w-2xl leading-relaxed">
          Console interna KORA per preparare demo, discovery call, proposta pilota e percorso Foundation Light.
        </p>
        <div className="mt-2 inline-block rounded border border-rose-200 bg-rose-50 px-3 py-1.5">
          <p className="text-xs font-semibold text-rose-700">Vista interna KORA — non dashboard cliente.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-[rgba(6,3,43,0.40)]">
          <span>synthetic_demo_data: true</span>
          <span>·</span>
          <span>calibration_status: pre_empirical_calibration</span>
          <span>·</span>
          <span>methodology_version_id: KORA Methodology v0.1</span>
        </div>
      </div>

      {/* ── S1 → S2 Scenario Presenter Narrative ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Scenario demo
        </h2>
        <p className="text-base font-bold text-[#06032B] mb-1">S1 → S2: scenario demo</p>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mb-4 leading-relaxed">
          Usare il selettore scenario per raccontare il passaggio da fotografia iniziale
          a scenario post-intervento. Non presentare S2 come previsione garantita.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-3">
          {[SCENARIO_S1, SCENARIO_S2].map((sc) => (
            <div key={sc.label} className={`rounded-lg border p-4 ${sc.cardStyle}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-[#06032B]">{sc.label}</span>
                <span className={`rounded border px-1.5 py-0.5 text-xs font-bold ${sc.safeguardStyle}`}>
                  {sc.safeguard}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                {sc.metrics.map(([l, v]) => (
                  <div key={l} className="text-xs">
                    <span className="text-[rgba(6,3,43,0.52)]">{l}</span>
                    <span className="font-bold text-[rgba(6,3,43,0.90)] ml-1.5">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed border-t border-[rgba(6,3,43,0.08)] pt-2">
                {sc.copy}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-mono text-amber-700">
          Scenario sintetico dimostrativo. Non rappresenta previsione, causalità o ROI garantito.
        </div>
      </div>

      {/* ── Demo Script ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Demo Script
        </h2>
        <p className="text-base font-bold text-[#06032B] mb-4">Demo Script — 15 / 30 / 60 minuti</p>
        <div className="space-y-4">
          {GTM_TRACKS.map((track) => (
            <div key={track.id} className={`rounded-lg border p-5 ${track.cardStyle}`}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-2xl font-black leading-none ${track.letterStyle}`}>{track.id}</span>
                <span className="text-sm font-bold text-[rgba(6,3,43,0.90)]">{track.title}</span>
                <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-xs font-semibold text-[rgba(6,3,43,0.62)]">
                  {track.duration}
                </span>
                <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]/70 px-1.5 py-0.5 text-xs font-medium text-[rgba(6,3,43,0.52)]">
                  {track.audience}
                </span>
                <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                  Uso interno KORA
                </span>
              </div>

              <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]/60 px-3 py-2.5 mb-3 space-y-1.5">
                <p className="text-xs text-[rgba(6,3,43,0.62)]">
                  <span className="font-semibold text-[rgba(6,3,43,0.78)]">Obiettivo: </span>
                  {track.goal}
                </p>
                <p className="text-xs text-[rgba(6,3,43,0.62)]">
                  <span className="font-semibold text-[rgba(6,3,43,0.78)]">Messaggio chiave: </span>
                  <span className="italic">&ldquo;{track.message}&rdquo;</span>
                </p>
                <p className="text-xs text-[rgba(6,3,43,0.62)]">
                  <span className="font-semibold text-[rgba(6,3,43,0.78)]">Deliverable: </span>
                  {track.deliverable}
                </p>
                <p className="text-xs text-amber-700 border-t border-[rgba(6,3,43,0.05)] pt-1.5">
                  <span className="font-semibold">Nota presenter: </span>
                  {track.presenterNote}
                </p>
              </div>

              <div className="space-y-1">
                {track.steps.map((step) => (
                  <Link
                    key={step.n}
                    href={step.href}
                    className="flex items-center gap-2.5 rounded-md border border-white/80 bg-[#F8F6F1]/50 px-3 py-2 hover:bg-[#F8F6F1] hover:shadow-sm transition-all"
                  >
                    <span className="w-5 h-5 rounded-full bg-[rgba(6,3,43,0.05)] text-[10px] font-bold text-[rgba(6,3,43,0.52)] flex items-center justify-center shrink-0">
                      {step.n}
                    </span>
                    <span className="text-xs font-medium text-[rgba(6,3,43,0.78)] flex-1">{step.label}</span>
                    {step.roleNote && (
                      <span className="text-[10px] font-mono text-[rgba(6,3,43,0.40)] shrink-0 rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1 py-0.5">
                        {step.roleNote}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Privacy Story per il presenter ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Privacy story
        </h2>
        <p className="text-base font-bold text-[#06032B] mb-4">Privacy story da raccontare in demo</p>

        <div className="grid gap-4 sm:grid-cols-2 mb-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold text-green-800 mb-3">L&apos;azienda vede</p>
            <ul className="space-y-1.5">
              {[
                'Aggregati sopra soglia privacy',
                'KORA Index aziendale',
                'Activation Debt',
                'Pillar coverage',
                'Trend organizzativi',
                'Report e raccomandazioni',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-green-700">
                  <span className="text-green-400 shrink-0 mt-0.5">·</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold text-rose-800 mb-3">L&apos;azienda NON vede</p>
            <ul className="space-y-1.5">
              {[
                'PIB individuale',
                'Timeline personale',
                'Scelte individuali',
                'Dynamic Impact CV',
                'Singoli eventi personali',
                'Profilo lavoratore',
                'Worker ranking',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-rose-700">
                  <span className="text-rose-400 shrink-0 mt-0.5">·</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span className="font-semibold">Nota presenter: </span>
          Usare My KORA per dimostrare che il lavoratore ha un layer personale e che l&apos;azienda vede solo aggregati.
        </div>
      </div>

      {/* ── Pilot Package ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Pilot Package
        </h2>
        <p className="text-base font-bold text-[#06032B] mb-1">KORA Foundation Light Pilot Package</p>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mb-5 leading-relaxed">Cosa propone KORA nel primo pilot aziendale.</p>

        {/* A */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-3">A — Cosa include</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PILOT_INCLUDES.map((card) => (
              <div key={card.n} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-[rgba(6,3,43,0.28)] shrink-0 mt-0.5">{card.n}</span>
                  <div>
                    <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{card.title}</p>
                    <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5 leading-relaxed">{card.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* B */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-3">B — Cosa NON include</p>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <ul className="grid gap-1 sm:grid-cols-2">
              {PILOT_EXCLUDES.map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-rose-700">
                  <span className="text-rose-400 shrink-0 mt-0.5">✕</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* C */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-3">C — Fonti dati tipiche richieste</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PILOT_SOURCES.map((src) => (
              <div key={src.title} className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2.5">
                <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)]">{src.title}</p>
                <p className="text-[11px] text-[rgba(6,3,43,0.40)] mt-0.5 leading-relaxed">{src.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[rgba(6,3,43,0.40)] leading-relaxed">
            Le fonti variano per azienda. In Foundation Light si lavora su dataset concordati o sintetici,
            con esclusione dei dati sensibili non necessari.
          </p>
        </div>

        {/* D */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-3">D — Success criteria indicativi</p>
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
            <ul className="space-y-1.5">
              {PILOT_CRITERIA.map((item) => (
                <li key={item} className="flex gap-2 text-xs text-[rgba(6,3,43,0.62)]">
                  <span className="text-green-400 shrink-0 mt-0.5">·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-[rgba(6,3,43,0.40)] italic border-t border-[rgba(6,3,43,0.05)] pt-2">
              Criteri indicativi — non contrattuali.
            </p>
          </div>
        </div>

        {/* E */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-3">E — Pilot positioning</p>
          <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#06032B]">Foundation Light Pilot</p>
                <p className="text-xs text-[rgba(6,3,43,0.72)] mt-1 leading-relaxed max-w-lg">
                  Percorso 60–90 giorni per trasformare dati people/welfare/training/CSR esistenti
                  in una prima intelligence KORA — con KORA Index, Activation Debt,
                  Budget-to-Human-Impact e Board Pack.
                </p>
                <p className="text-[11px] text-[rgba(6,3,43,0.52)] mt-2">
                  Pricing da definire in base a perimetro, fonti dati e durata pilot.
                </p>
              </div>
              <div className="shrink-0">
                <button
                  disabled
                  className="rounded-md border border-[rgba(6,3,43,0.14)] bg-[#F8F6F1] px-4 py-2 text-xs font-semibold text-[rgba(6,3,43,0.40)] cursor-not-allowed"
                >
                  Prepara proposta pilota — demo
                </button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[rgba(199,111,61,0.22)] flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-[rgba(6,3,43,0.40)]">
              <span>synthetic_demo_data: true</span>
              <span>·</span>
              <span>calibration_status: pre_empirical_calibration</span>
              <span>·</span>
              <span>methodology_version_id: KORA Methodology v0.1</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── GTM Pipeline ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Pipeline commerciale
        </h2>
        <p className="text-base font-bold text-[#06032B] mb-4">Go-to-Market Pipeline</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
            <p className="text-xs text-[rgba(6,3,43,0.40)]">Pipeline companies</p>
            <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)] mt-1">{pipeline.length}</p>
          </div>
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
            <p className="text-xs text-[rgba(6,3,43,0.40)]">Active pilots</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {pipeline.filter((e) => e.stage === 'pilot_active').length}
            </p>
          </div>
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
            <p className="text-xs text-[rgba(6,3,43,0.40)]">Potential ARR</p>
            <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)] mt-1">
              €{(totalArr / 1000).toFixed(0)}k
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {pipeline.map((e) => (
            <div key={e.company_name} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{e.company_name}</p>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STAGE_STYLES[e.stage] ?? STAGE_STYLES.prospect}`}>
                      {e.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-[rgba(6,3,43,0.52)] mt-1">{e.signal}</p>
                  <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Next: {e.next_action}</p>
                </div>
                <p className="shrink-0 text-sm font-mono text-[rgba(6,3,43,0.52)]">
                  €{e.potential_arr_eur.toLocaleString('it-IT')}/yr
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gate & Methodology Status ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Methodology & Gate Status
        </h2>
        <div className="space-y-2">
          {gates.gates.map((g) => (
            <div key={g.id} className="flex items-start gap-3 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-3">
              <span className={`shrink-0 mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                g.status === 'CLOSED'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}>
                {g.status}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">{g.label}</p>
                <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5 leading-relaxed">Blocks: {g.blocks}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[rgba(6,3,43,0.40)] font-mono">
          {gates.methodology_version_id} · calibration: {gates.calibration_status}
        </p>
      </div>

    </div>
  );
}
