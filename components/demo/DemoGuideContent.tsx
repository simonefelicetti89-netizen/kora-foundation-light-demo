import Link from 'next/link';
import { PipelineConnectorBanner } from '@/components/demo/PipelineConnectorBanner';
import { WorkspaceSwitcher } from '@/components/demo/WorkspaceSwitcher';
import { StakeholderPaths } from '@/components/demo/StakeholderPaths';

const DEMO_12_MIN: {
  step: number;
  label: string;
  href: string;
  duration: string;
  objective: string;
  pitch: string;
}[] = [
  {
    step: 1, label: 'KORA Foundation Light Experience', href: '/demo-guide', duration: '1 min',
    objective: 'Storia KORA, percorsi stakeholder, cosa è attivo, come usarla in una call',
    pitch: "Tre parole chiave: misura, spiega, attiva. Il resto viene da sé.",
  },
  {
    step: 2, label: 'Executive Cockpit', href: '/company', duration: '1.5 min',
    objective: 'KORA Index · Confidence Score · Activation Safeguard · Insight C-suite',
    pitch: "Il CEO vede in un'unica schermata lo stato di attivazione, le priorità direzionali e i segnali critici.",
  },
  {
    step: 3, label: 'Come nasce il KORA Index', href: '/company/kora-index', duration: '1.5 min',
    objective: 'Pipeline 14-stage · 10 componenti · Explainability · Confidence breakdown',
    pitch: "KORA è una piattaforma metodologica: ogni numero è tracciabile, spiegabile e versioned.",
  },
  {
    step: 4, label: 'Debito di Attivazione', href: '/company/activation', duration: '1.5 min',
    objective: 'Activation Debt · Silent Majority · Pillar gap · Site gap · Next actions',
    pitch: "Chi non è ancora attivato? KORA rende visibile la maggioranza silenziosa senza esporre individui.",
  },
  {
    step: 5, label: 'Budget-to-Human-Impact', href: '/company/financial', duration: '1.5 min',
    objective: 'Governance finanziaria · Budget per pillar · Costo per IU · HR KPI Correlation',
    pitch: "Il CFO collega budget people a Impact Units prodotti — senza claim di ROI garantito.",
  },
  {
    step: 6, label: 'Reports / Board Narrative', href: '/company/reports', duration: '1 min',
    objective: 'Board Narrative Generator · Executive Snapshot · Limiti espliciti · CSR/ESG disclaimer',
    pitch: "Output direzionale con metodologia, Confidence Score e disclaimer integrati — pronto per il board.",
  },
  {
    step: 7, label: 'My KORA Worker Layer', href: '/my-kora', duration: '1 min',
    objective: 'PIB privato · Dynamic Impact CV · Consent & Sharing Vault · KORA Link stepper',
    pitch: "Il lavoratore vede il proprio impatto personale. Il datore di lavoro non accede mai a questo layer.",
  },
  {
    step: 8, label: 'Partner Operating Preview', href: '/partner', duration: '1 min',
    objective: 'Protocollo evidenze · Coorti aggregate · Agenda operativa · Financial preview',
    pitch: "Il partner abilita azioni verificabili — non gestisce un marketplace.",
  },
  {
    step: 9, label: 'Advisor Process Audit', href: '/advisor', duration: '1 min',
    objective: 'Evidence Protocol Review · Trust Ledger · Boundary Advisor-reviewed ≠ Certified',
    pitch: "L'Advisor audita il processo, non valida ogni azione — Advisor-reviewed ≠ KORA Certified.",
  },
  {
    step: 10, label: 'Future Vision', href: '/future-vision', duration: '0.5 min',
    objective: 'Moduli post-pilot · KORA Certified · KORA Link · Value Chain · Advisor Academy',
    pitch: "KORA si estende verso un ecosistema certificato — nessuna funzionalità attiva in Foundation Light.",
  },
];

const STORY_90: { n: number; title: string; body: string; tag: string }[] = [
  {
    n: 1,
    title: "L'azienda ha dati sparsi",
    body: 'Welfare, training, CSR, HR KPI, attività partner, Excel — fonti eterogenee, formati incompatibili, nessuna vista unificata.',
    tag: 'Input grezzo',
  },
  {
    n: 2,
    title: 'KORA li normalizza',
    body: 'AI Onboarding → UEF draft. Un operatore umano approva ogni record prima che entri nella pipeline. Nessuna automazione cieca.',
    tag: 'Stage 1–5',
  },
  {
    n: 3,
    title: 'Le azioni diventano Impact Units',
    body: 'Feature Vector → fattori di correzione (CQ, EV, AGF) → Impact Units per pillar → PIB privato del lavoratore.',
    tag: 'Stage 6–11',
  },
  {
    n: 4,
    title: "L'azienda vede solo aggregati",
    body: 'Company Aggregation sopra soglia privacy (≥10 lavoratori). Nessun PIB individuale, nessun nome, nessun ID.',
    tag: 'Stage 12',
  },
  {
    n: 5,
    title: 'Nascono KORA Index e Confidence Score',
    body: 'Activation Safeguard (CLEAR/WARNING/FLAGGED) → KORA Index 10 componenti → Confidence Score inseparabile.',
    tag: 'Stage 13–14',
  },
  {
    n: 6,
    title: 'KORA mostra dove manca attivazione',
    body: 'Activation Debt identifica la maggioranza silenziosa. Budget-to-Human-Impact collega spesa a IU prodotti per pillar.',
    tag: 'Explainability',
  },
  {
    n: 7,
    title: 'Il board riceve un Decision Pack',
    body: 'Reports, Board Narrative Generator, Next Actions. Con metodologia versionata, limiti espliciti e Confidence Score.',
    tag: 'Output',
  },
];

const READINESS: { label: string; status: 'active' | 'future' | 'blocked'; note?: string }[] = [
  { label: 'Action-to-Index visibile',                          status: 'active' },
  { label: 'KORA Index + Confidence Score',                     status: 'active' },
  { label: 'Activation Safeguard (CLEAR / WARNING / FLAGGED)',  status: 'active' },
  { label: 'Activation Debt / Silent Majority',                 status: 'active' },
  { label: 'Budget-to-Human-Impact + HR KPI Correlation',      status: 'active' },
  { label: 'Board Pack / Board Narrative Generator',            status: 'active' },
  { label: 'My KORA privacy/value layer',                       status: 'active' },
  { label: 'Partner Operating Preview',                         status: 'active' },
  { label: 'Advisor Process Audit',                             status: 'active' },
  { label: 'Role-based demo navigation (8 ruoli)',              status: 'active' },
  { label: 'Future Vision screens (labeled inactive)',          status: 'active' },
  { label: 'KORA Certified',                                    status: 'future',  note: 'Post-pilot' },
  { label: 'KORA Link NFC/QR operativo',                        status: 'future',  note: 'Post-pilot' },
  { label: 'Partner Marketplace transazionale',                 status: 'future',  note: 'Post-pilot' },
  { label: 'Worker Wallet',                                     status: 'future',  note: 'Post-pilot' },
  { label: 'Live HRIS / LMS integrations',                      status: 'blocked', note: 'Gate 3' },
  { label: 'Production SQL / Auth',                             status: 'blocked', note: 'Gate 2' },
];

const STATUS_STYLE = {
  active:  { label: 'Attivo in Foundation Light', cls: 'bg-green-50 text-green-700 border-green-200' },
  future:  { label: 'Future Vision',              cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  blocked: { label: 'Non attivo',                 cls: 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]' },
} as const;

export function DemoGuideContent() {
  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── 1. Hero ── */}
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Foundation Light v0.1
          </span>
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-xs font-medium text-[rgba(6,3,43,0.52)]">
            Solo dati sintetici
          </span>
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-xs font-medium text-[rgba(6,3,43,0.52)]">
            Pre-calibrazione empirica
          </span>
        </div>

        <h1 className="text-3xl font-bold text-[#06032B] leading-tight">
          KORA Foundation Light Demo Experience
        </h1>
        <p className="mt-2 text-base text-[rgba(6,3,43,0.62)] leading-relaxed max-w-2xl">
          La demo commerciale di KORA: dal dato grezzo all&apos;intelligence organizzativa,
          dal lavoratore al board, dal partner all&apos;Advisor.
        </p>

        <div className="mt-4 rounded border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="text-sm font-semibold text-indigo-800">
            KORA trasforma azioni reali in intelligence organizzativa verificata —
            senza esporre dati individuali dei lavoratori.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { title: 'Misura',  body: 'KORA Index · Confidence Score · Activation Safeguard' },
            { title: 'Spiega', body: 'Action-to-Index · Explainability · Activation Debt' },
            { title: 'Attiva', body: 'Partner · Advisor · My KORA · Reports' },
          ].map((p) => (
            <div key={p.title} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3">
              <p className="text-sm font-bold text-[rgba(6,3,43,0.90)]">{p.title}</p>
              <p className="mt-1 text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700">Limitazioni obbligatorie</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Foundation Light usa dati sintetici demo e{' '}
            <span className="font-mono">calibration_status = pre_empirical_calibration</span>.
            Non produce certificazioni, compliance assurance o causalità ROI.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/company"
            className="rounded-md bg-[#06032B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors"
          >
            Apri il Cockpit Aziendale
          </Link>
          <Link
            href="/my-kora"
            className="rounded-md border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-2.5 text-sm font-semibold text-[rgba(6,3,43,0.78)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
          >
            Apri My KORA
          </Link>
        </div>
      </div>

      {/* ── 2. Cosa può comprare un'azienda oggi ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Offerta commerciale
        </h2>
        <p className="text-lg font-bold text-[#06032B] mb-4">
          Cosa può comprare un&apos;azienda oggi
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              letter: 'A',
              title: 'KORA Readiness & Data Inventory',
              body: 'Mappatura delle fonti dati people/welfare/training/CSR e readiness per generare una prima intelligence KORA.',
              color: 'border-indigo-200 bg-indigo-50',
              lc: 'text-indigo-300',
            },
            {
              letter: 'B',
              title: 'KORA Foundation Light Pilot',
              body: 'Pilot 60–90 giorni per trasformare dati esistenti in KORA Index, Activation Debt, Confidence Score e Board Pack.',
              color: 'border-blue-200 bg-blue-50',
              lc: 'text-blue-300',
            },
            {
              letter: 'C',
              title: 'People Activation Decision Pack',
              body: 'Output direzionale per CEO, HR, ESG e Finance: report, narrative, limiti, next actions.',
              color: 'border-emerald-200 bg-emerald-50',
              lc: 'text-emerald-300',
            },
            {
              letter: 'D',
              title: 'Partner / Advisor Activation Preview',
              body: "Prima vista dell'ecosistema: partner, protocolli evidenze, Advisor Process Audit e opportunità worker.",
              color: 'border-violet-200 bg-violet-50',
              lc: 'text-violet-300',
            },
          ].map((card) => (
            <div key={card.letter} className={`rounded-lg border p-5 ${card.color}`}>
              <div className="flex items-start gap-3">
                <span className={`text-2xl font-black leading-none shrink-0 ${card.lc}`}>{card.letter}</span>
                <div>
                  <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{card.title}</p>
                  <p className="mt-1.5 text-xs text-[rgba(6,3,43,0.62)] leading-relaxed">{card.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
          <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed">
            KORA Foundation Light non richiede integrazioni live per il primo pilot.
            Lavora su dati sintetici/demo o dataset concordati, con metodologia versionata e limiti espliciti.
          </p>
        </div>
      </div>

      {/* GTM pointer */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.62)] mb-1">Script demo & Pilot Package dettagliato</p>
        <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          Lo script demo completo (percorsi 15/30/60 minuti), il Pilot Package dettagliato,
          i success criteria e la privacy story per il presenter sono disponibili nella
          KORA GTM Console (accesso: ruoli admin KORA).
        </p>
      </div>

      {/* ── 3. La storia KORA in 90 secondi ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Narrativa prodotto
        </h2>
        <p className="text-lg font-bold text-[#06032B] mb-4">
          La storia KORA in 90 secondi
        </p>
        <div className="space-y-2">
          {STORY_90.map((s, i) => (
            <div key={s.n} className="flex gap-3 items-start rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
              <div className="shrink-0 flex flex-col items-center gap-1">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 flex items-center justify-center">
                  {s.n}
                </span>
                {i < STORY_90.length - 1 && <div className="w-px h-4 bg-[rgba(6,3,43,0.12)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{s.title}</p>
                  <span className="rounded bg-[rgba(6,3,43,0.05)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.52)]">{s.tag}</span>
                </div>
                <p className="mt-0.5 text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Stakeholder demo paths ── */}
      <StakeholderPaths />

      {/* ── 5. Multi-sided workspace switcher ── */}
      <WorkspaceSwitcher />

      {/* ── 6. Action-to-Index pipeline ── */}
      <PipelineConnectorBanner />

      {/* ── 7. Percorso demo 12 minuti ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Percorso consigliato
        </h2>
        <p className="text-lg font-bold text-[#06032B] mb-1">
          Percorso consigliato per demo aziendale — 12 minuti
        </p>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mb-4 leading-relaxed">
          Sequenza lineare ottimale per una presentazione completa a buyer, advisor o stakeholder tecnici.
        </p>
        <div className="space-y-2">
          {DEMO_12_MIN.map((step) => (
            <Link
              key={step.step}
              href={step.href}
              className="flex items-start gap-4 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 hover:border-[rgba(6,3,43,0.14)] hover:shadow-sm transition-all"
            >
              <div className="shrink-0 flex flex-col items-center gap-1">
                <span className="w-6 h-6 rounded-full bg-[rgba(6,3,43,0.05)] text-xs font-bold text-[rgba(6,3,43,0.52)] flex items-center justify-center">
                  {step.step}
                </span>
                <span className="text-[10px] font-mono text-[rgba(6,3,43,0.28)]">{step.duration}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{step.label}</p>
                <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5 leading-relaxed">{step.objective}</p>
                <p className="text-xs text-[rgba(6,3,43,0.62)] mt-1 italic leading-relaxed">&ldquo;{step.pitch}&rdquo;</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 8. Perché KORA non è una dashboard HR ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Differenziazione
        </h2>
        <p className="text-lg font-bold text-[#06032B] mb-4">
          Perché KORA non è una dashboard HR
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-5">
            <p className="text-xs font-semibold text-rose-700 mb-3">KORA non è</p>
            <ul className="space-y-2">
              {[
                'Welfare platform',
                'HR surveillance tool',
                'ESG dashboard generica',
                'Marketplace di servizi',
                'Social network aziendale',
                'Sistema di ranking lavoratori',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-sm text-rose-800">
                  <span className="text-rose-300 shrink-0 mt-0.5">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50 p-5">
            <p className="text-xs font-semibold text-green-700 mb-3">KORA è</p>
            <ul className="space-y-2">
              {[
                'Human Impact Intelligence Platform',
                'Activation Orchestration Layer',
                'Evidence & Trust Layer',
                'Privacy-first worker-owned layer',
                'Board-ready decision system',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-sm text-green-800">
                  <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── 9. Cosa viene misurato ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-4">
          Cosa viene misurato
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5">
            <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)] mb-3">KORA misura</p>
            <ul className="space-y-2">
              {[
                'Tasso di attivazione organizzativa e distribuzione',
                'Bilanciamento della partecipazione tra dipartimenti e pillar',
                'Copertura pillar su LIFE, GROWTH, CONNECTION, IMPACT, LEGACY',
                'Qualità del contributo verificata vs. autodichiarata',
                "Continuità dell'engagement tra periodi",
                "Confidence Score che riflette l'affidabilità delle evidenze",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-[rgba(6,3,43,0.78)]">
                  <span className="mt-0.5 shrink-0 text-[rgba(6,3,43,0.28)]">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-5">
            <p className="text-xs font-semibold text-rose-700 mb-3">KORA non misura</p>
            <ul className="space-y-2">
              {[
                'Prestazioni o produttività individuale del lavoratore',
                'Benessere, stato di salute o sorveglianza del lavoratore',
                'Punteggi PIB individuali visibili ai datori di lavoro',
                'Classifiche, leaderboard o idoneità ai premi',
                'Utilizzo del marketplace o attività di prenotazione benefit',
                'Qualsiasi metrica che valuta o sorveglia i lavoratori individualmente',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-rose-800">
                  <span className="mt-0.5 shrink-0 text-rose-300">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── 10. Stato demo commerciale ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Readiness commerciale
        </h2>
        <p className="text-lg font-bold text-[#06032B] mb-4">
          Stato demo commerciale
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {READINESS.map((item) => {
              const s = STATUS_STYLE[item.status];
              return (
                <div key={item.label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <p className="text-sm text-[rgba(6,3,43,0.78)]">{item.label}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.note && (
                      <span className="text-xs font-mono text-[rgba(6,3,43,0.40)]">{item.note}</span>
                    )}
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 11. Una società, due momenti nel tempo ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-2">
          Una società, due momenti nel tempo
        </h2>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mb-4">
          Meridiana Group S.r.l. è la principale società demo sintetica.
          Due scenari mostrano KORA prima e dopo aver agito sulle sue raccomandazioni.
          Passa tra di essi con i pulsanti{' '}
          <span className="font-semibold text-[rgba(6,3,43,0.78)]">Demo Scenario</span> nella barra superiore.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold text-[#06032B]">S1 — Baseline</span>
              <span className="rounded border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
                WARNING
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
              {[['KORA Index', '34'], ['Confidence', '60%'], ['Attivazione', '38%'], ['Significativa', '22%']].map(([l, v]) => (
                <div key={l} className="text-xs">
                  <span className="text-[rgba(6,3,43,0.52)]">{l}</span>
                  <span className="font-bold text-[rgba(6,3,43,0.90)] ml-1.5">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed italic border-t border-yellow-200 pt-3">
              &ldquo;Iniziative frammentate, continuità debole, partecipazione disomogenea.
              Il 12% dei lavoratori genera il 64% dell&apos;impatto misurato.&rdquo;
            </p>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold text-[#06032B]">S2 — Migliorato</span>
              <span className="rounded border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                CLEAR
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
              {[['KORA Index', '54'], ['Confidence', '72%'], ['Attivazione', '52%'], ['Significativa', '38%']].map(([l, v]) => (
                <div key={l} className="text-xs">
                  <span className="text-[rgba(6,3,43,0.52)]">{l}</span>
                  <span className="font-bold text-[rgba(6,3,43,0.90)] ml-1.5">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed italic border-t border-green-200 pt-3">
              &ldquo;Miglior bilanciamento, evidenze più solide, continuità maggiore e attivazione più ampia.
              L&apos;Activation Safeguard è passato a CLEAR.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ── 12. Privacy Story Bridge ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Privacy lavoratore
        </h2>
        <p className="text-lg font-bold text-[#06032B] mb-2">
          La garanzia privacy lavoratore
        </p>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mb-4 leading-relaxed">
          Il datore di lavoro vede l&apos;organizzazione, non la persona.
          Usa il WorkspaceSwitcher per passare al ruolo WORKER e
          esplorare il layer personale del lavoratore.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold text-green-800 mb-2">L&apos;azienda VEDE</p>
            <ul className="space-y-1.5">
              {[
                'Aggregati sopra soglia privacy (≥10 lavoratori)',
                'KORA Index aziendale — 10 componenti',
                'Activation Debt — stima aggregata',
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
            <p className="text-xs font-semibold text-rose-800 mb-2">L&apos;azienda NON VEDE</p>
            <ul className="space-y-1.5">
              {[
                'PIB individuale del lavoratore',
                'Timeline personale del lavoratore',
                'Scelte individuali del lavoratore',
                'Dynamic Impact CV del lavoratore',
                'Singoli eventi personali',
                'Profilo lavoratore',
                'Worker ranking o classifica individuale',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-rose-700">
                  <span className="text-rose-400 shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            href="/my-kora"
            className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            Apri My KORA — demo
          </Link>
          <p className="text-[11px] text-[rgba(6,3,43,0.40)]">
            Passa a WORKER nel WorkspaceSwitcher prima di aprire My KORA per esplorare il layer personale.
          </p>
        </div>
      </div>

      {/* ── 13. Stato della demo ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)] mb-4">
          Stato della demo
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Dati',                    'Solo sintetici — nessun dato aziendale reale'],
            ['Calibrazione',            'Pre-empirica — metodologia v0.1, pesi provvisori'],
            ['Account lavoratori',      'Nessuno — nessun record di partecipazione reale'],
            ['Backend',                 'Nessun DB in produzione, nessuna auth, nessuna API live'],
            ['Pagamenti / marketplace', 'Nessuno — esclusi da Foundation Light'],
            ['Accesso datore lavoro',   'Il datore di lavoro non vede mai i dati individuali dei lavoratori'],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <span className="text-xs font-semibold text-[rgba(6,3,43,0.52)] shrink-0 w-40">{label}</span>
              <span className="text-xs text-[rgba(6,3,43,0.40)] leading-relaxed">{value}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-[rgba(6,3,43,0.40)] border-t border-[rgba(6,3,43,0.08)] pt-3">
          KORA Foundation Light v0.1 · Metodologia v0.1 · Società demo: Meridiana Group S.r.l. (sintetica)
        </p>
      </div>

    </div>
  );
}
