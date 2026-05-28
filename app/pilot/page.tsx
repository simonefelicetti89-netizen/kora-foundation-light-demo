// PL-01: Foundation Light Pilot — commercial packaging page
// Static. No backend. No forms. No live data.
// Rewritten Sprint 2: full commercial upgrade — pricing, FAQ, data requirements, deliverables.

import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── Data ─────────────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    id: 'diagnostic',
    title: 'Foundation Light Diagnostic',
    duration: '4–6 settimane',
    price: '€7.500–12.000',
    priceNote: 'indicativo · dipende da perimetro e qualità dati disponibili',
    highlight: false,
    items: [
      'Un perimetro aziendale',
      'Inventario e classificazione dati esistenti',
      'Eligibility Gate (Eligible / Limited / Blocked)',
      'KORA Index preliminare — 10 componenti',
      'Confidence Score e Activation Safeguard',
      'Activation Debt per pillar',
      'Board Pack Preview',
    ],
    deliverable: 'Board Pack Preview',
    style: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  {
    id: 'pilot',
    title: 'Foundation Light Pilot',
    duration: '6–8 settimane',
    price: '€12.000–18.000',
    priceNote: 'indicativo · include sessione advisor KORA e workshop esecutivo',
    highlight: true,
    items: [
      'Tutto il pacchetto Diagnostic',
      'Mapping approfondito Budget Evidence',
      'Budget-to-Human-Impact — lettura direzionale',
      'HR KPI preview (correlazione aggregata)',
      'Decision Pack completo — board-ready',
      'Revisione advisor KORA',
      'Workshop esecutivo (2 ore)',
    ],
    deliverable: 'Decision Pack + Workshop',
    style: 'border-slate-800 ring-1 ring-slate-800/20',
    badge: 'bg-slate-900 text-white border-slate-900',
  },
  {
    id: 'strategic',
    title: 'Strategic Pilot',
    duration: '8–10 settimane',
    price: '€18.000–25.000',
    priceNote: 'indicativo · multi-sito o multi-reparto · advisor incluso',
    highlight: false,
    items: [
      'Tutto il pacchetto Pilot',
      'Multi-sito o multi-reparto',
      'Inventario dati approfondito per cluster',
      'Analisi gap per sede (privacy-safe, N ≥ 10)',
      'Roadmap di riallocazione budget dettagliata',
      'Board workshop C-suite',
      'Preparazione per fase Pilot Calibration',
    ],
    deliverable: 'Decision Pack + Board Workshop + Roadmap',
    style: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
  },
] as const;

const WHAT_YOU_GET = [
  {
    title: 'Inventario dati',
    desc: 'Classificazione di ogni fonte dati disponibile: welfare, formazione, HR, ESG, eventi aziendali. Base documentale per tutto il pilot.',
  },
  {
    title: 'Eligibility Gate',
    desc: 'Ogni tipologia di evento classificata: Eligible (genera Impact Units), Limited (Economic Relief, 0 IU) o Blocked (compliance obbligatoria, 0 IU). Con motivazione metodologica per ogni categoria.',
  },
  {
    title: 'Budget Evidence Review',
    desc: 'Valutazione della qualità delle fonti budget: Documentato, Dichiarato, Stimato, Non valorizzato. La qualità determina il peso nel BTI engine e influenza il Confidence Score.',
  },
  {
    title: 'Budget-to-Human-Impact',
    desc: 'Prima lettura direzionale di quanto il budget people e welfare si converte in attivazione verificata. Composizione: deep activation spend vs economic relief spend.',
  },
  {
    title: 'Activation Debt',
    desc: 'Stima del budget non convertito in Impact Units, distribuito per pillar (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY) e sede — aggregato, nessun dato individuale.',
  },
  {
    title: 'KORA Index preliminare',
    desc: 'Indice organizzativo a 10 componenti con macroblocchi (Reach, Quality, Equity, BTI). Accompagnato da Confidence Score esterno e Activation Safeguard (CLEAR / WARNING / FLAGGED).',
  },
  {
    title: 'Confidence Score',
    desc: 'Indicatore esterno di affidabilità dati, separato dal KORA Index (peso = 0 nel punteggio). Segnala quanto le conclusioni sono basate su fonti verificate vs dichiarate o stimate.',
  },
  {
    title: 'HR KPI preview',
    desc: 'Lettura direzionale aggregata di segnali HR (turnover, engagement, assenteismo) correlati all\'attivazione. Associativo — correlazione ≠ causalità. Solo pacchetto Pilot e Strategic.',
  },
  {
    title: 'Decision Pack / Board Pack',
    desc: 'Report strutturato e board-ready: KORA Index, distribuzione pillar, BTI, Activation Debt, next actions, note metodologiche. Esportabile come PDF dal browser.',
  },
  {
    title: 'Workshop esecutivo',
    desc: 'Sessione di lettura e interpretazione del Decision Pack con il team direzionale. Identificazione delle priorità di riallocazione. Solo pacchetto Pilot e Strategic.',
  },
] as const;

const DATA_REQUIRED = [
  {
    label: 'Workers aggregati',
    desc: 'Headcount per dipartimento e sede — organigramma sintetico. Nessun nominativo individuale. N ≥ 10 per segmento. Necessario per AR/MAR e segmentazione privacy-safe.',
    required: true,
  },
  {
    label: 'Initiatives',
    desc: 'Lista iniziative/programmi aziendali con tipologia, pillar indicativo e budget (anche dichiarato). Anche in forma di policy o accordo sindacale.',
    required: true,
  },
  {
    label: 'Participation',
    desc: 'Utilizzo aggregato per iniziativa, dipartimento e sede. Nessun nominativo. N ≥ 10 per segmento. Base per la stima AR/MAR e Activation Debt.',
    required: true,
  },
  {
    label: 'Registri budget welfare / people',
    desc: 'Budget allocato e utilizzato per categoria di iniziativa. Anche dichiarato se non documentato — verrà classificato nella Budget Evidence review.',
    required: true,
  },
  {
    label: 'Export provider welfare / LMS',
    desc: 'File dal provider welfare (es. Easy Welfare, Jointly) o LMS. Supplemento opzionale — integra il Data Pack aziendale ma non è richiesto per avviare il pilot.',
    required: false,
  },
  {
    label: 'HR KPI aggregati',
    desc: 'Turnover, assenteismo, engagement survey (se disponibili). Opzionale — arricchisce l\'HR KPI preview. Aggregati di dipartimento, non individuali.',
    required: false,
  },
] as const;

const PHASES = [
  {
    n: '01',
    title: 'Kickoff & Inventario Dati',
    desc: 'Definizione del perimetro aziendale. Raccolta e verifica dei dataset disponibili. Prima valutazione della qualità e completezza.',
    output: 'Data inventory checklist',
  },
  {
    n: '02',
    title: 'Invio File & Mapping / Budget Evidence',
    desc: 'L\'azienda invia i file a KORA. KORA normalizza e classifica la Budget Evidence (Documentato / Dichiarato / Stimato). Preparazione per l\'Eligibility Gate.',
    output: 'Budget Evidence classification',
  },
  {
    n: '03',
    title: 'Eligibility Gate & Classificazione',
    desc: 'Ogni record classificato: Eligible → genera IU, Limited → solo BTI, Blocked → governance. Output: tassonomia KORA completa dei programmi aziendali.',
    output: 'Eligibility Gate report',
  },
  {
    n: '04',
    title: 'KORA Index / BTI / Activation Debt',
    desc: 'Calcolo KORA Index (10 componenti, 4 macroblocchi), Confidence Score, Activation Safeguard. Budget-to-Human-Impact. Activation Debt per pillar e sede.',
    output: 'KORA Index + BTI + Debt',
  },
  {
    n: '05',
    title: 'Decision Pack & Workshop Esecutivo',
    desc: 'Consolidamento in Decision Pack board-ready. Revisione advisor (pacchetti Pilot e Strategic). Workshop di lettura con C-suite. Roadmap di intervento.',
    output: 'Decision Pack + Workshop',
  },
] as const;

const FAQS = [
  {
    q: 'È una piattaforma welfare o un marketplace di servizi?',
    a: 'No. KORA non eroga benefit, non gestisce voucher, non ha un catalogo servizi. È uno strumento di misurazione e intelligence — misura l\'attivazione organizzativa prodotta dalla spesa welfare e people, non la spesa stessa.',
  },
  {
    q: 'È un sistema di monitoraggio HR o di valutazione dei lavoratori?',
    a: 'No. KORA misura l\'organizzazione, non gli individui. Il KORA Index è un output company-level. Nessun nominativo, nessun ranking, nessun PIB individuale è visibile al datore di lavoro. Privacy N ≥ 10 per segmento.',
  },
  {
    q: 'Avete bisogno di dati individuali dei lavoratori?',
    a: 'No. Il pilot lavora su dati aggregati per tipologia di iniziativa, dipartimento e sede. Nessun file con nomi, codici fiscali o dati personali individuali è richiesto o accettato in Foundation Light.',
  },
  {
    q: 'È una certificazione ESG o una conformità normativa?',
    a: 'No. KORA Foundation Light è in pre_empirical_calibration — output direzionale, non certificato. Supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate e spiegabili, ma non garantisce conformità normativa e non sostituisce consulenza ESG, legale o assurance.',
  },
  {
    q: 'Si può partire da file Excel o CSV?',
    a: 'Sì. Foundation Light è progettato per partire da export standard: welfare provider, LMS, gestionale HR, file budget. Non richiede integrazioni API o database aziendali. Un file Excel ben strutturato è sufficiente per avviare il pilot.',
  },
  {
    q: 'Quanto sono affidabili gli output?',
    a: 'Dipende dalla qualità e completezza delle evidenze fornite — ed è esattamente quello che misura il Confidence Score (CS). Un CS alto (es. 70%+) indica evidenze verificate e documentate. Un CS basso segnala dati parziali o dichiarati. Ogni output è accompagnato dal CS e dall\'etichetta pre_empirical_calibration.',
  },
  {
    q: 'Cosa succede se le evidenze budget sono incomplete o mancanti?',
    a: 'I record vengono comunque classificati nell\'Eligibility Gate, ma la loro qualità viene marcata come "Stimato" o "Non valorizzato" nella Budget Evidence review. Il contributo al BTI engine è ridotto o marcato low-confidence. Il Confidence Score scende di conseguenza — segnalando dove il dato è debole.',
  },
] as const;

const OUTPUT_LINKS = [
  { label: 'Board Pack Preview',        href: '/company/reports/board-pack', desc: 'Visualizza il Board Pack del pilot demo — Meridiana Group S1' },
  { label: 'Executive Cockpit',         href: '/company',                    desc: 'KORA Index, CS, Safeguard, priorità operative' },
  { label: 'Stato Dati & Evidenze',     href: '/company/data',               desc: 'Stato dati ricevuti da KORA — elaborazione Operator' },
  { label: 'KORA Index — Dettaglio',    href: '/company/kora-index',         desc: '10 componenti, macroblocchi, Eligibility Gate' },
  { label: 'Activation & Debt',         href: '/company/activation',         desc: 'Distribuzione per pillar e sede, Activation Debt' },
  { label: 'Budget-to-Human-Impact',    href: '/company/financial',          desc: 'Budget-to-activation, deep activation share, HR KPI' },
  { label: 'Roadmap Architetturale',    href: '/future-vision',              desc: 'Dove va KORA dopo Foundation Light' },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
      {children}
    </p>
  );
}

function Rule() {
  return <div className="border-t border-slate-100 my-8" />;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PilotPage() {
  return (
    <div className="space-y-0 max-w-3xl">

      {/* ══════════════════════════════════════════════════════════════════
          1 — HERO
      ══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pb-8 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
            Offerta commerciale · Foundation Light v0.1
          </p>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            KORA Foundation Light Pilot
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
            Un percorso guidato per trasformare dati welfare, people, formazione e iniziative aziendali
            in una prima lettura di attivazione umana, Budget-to-Human-Impact e decisioni operative.
          </p>
          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            Non è un SaaS self-service. Non è una piattaforma welfare. Non è un sistema di monitoraggio.
            È un prodotto diagnostico guidato — ogni pilot è supportato dal team KORA.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            ['Guided Pilot',           'bg-slate-900 text-white border-slate-900'],
            ['4–10 settimane',         'bg-slate-100 text-slate-700 border-slate-200'],
            ['Excel / CSV ready',      'bg-slate-100 text-slate-700 border-slate-200'],
            ['Board Pack Preview',     'bg-green-50 text-green-700 border-green-200'],
            ['No worker surveillance', 'bg-slate-100 text-slate-700 border-slate-200'],
            ['pre_empirical_calibration', 'bg-amber-50 text-amber-700 border-amber-200 font-mono'],
          ].map(([label, style]) => (
            <span key={label} className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', style)}>
              {label}
            </span>
          ))}
        </div>

        {/* Quick metric strip */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { label: 'Durata',      value: '4–10 sett.' },
            { label: 'Investimento', value: '€7.500–25k' },
            { label: 'Deliverable', value: 'Decision Pack' },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{m.label}</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      <Rule />

      {/* ══════════════════════════════════════════════════════════════════
          2 — WHAT COMPANIES GET
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Cosa ottiene l&apos;azienda</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          {WHAT_YOU_GET.map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-1">
              <p className="text-xs font-semibold text-slate-800">{item.title}</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ══════════════════════════════════════════════════════════════════
          3 — WHAT WE NEED FROM THE COMPANY
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Dati richiesti all&apos;azienda</SectionLabel>

        <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-green-800">
            Perimetro company-enabled — nessun dato individuale richiesto.
          </p>
          <p className="text-[10px] text-green-700 mt-0.5 leading-relaxed">
            Foundation Light misura come fondi e iniziative aziendali vengono attivati dai lavoratori — non cosa fanno nella loro vita privata.
            Input attesi: Workers aggregati, Initiatives, Participation (+ Registri budget). Export provider welfare/LMS opzionali.
            Nessun upload individuale lavoratore: i lavoratori non inviano file alla pipeline KORA in Foundation Light Pilot.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {DATA_REQUIRED.map((row, i) => (
            <div key={row.label} className={cn('flex gap-4 px-4 py-3', i < DATA_REQUIRED.length - 1 ? 'border-b border-slate-100' : '')}>
              <div className="shrink-0 pt-0.5">
                <span className={cn(
                  'rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap',
                  row.required
                    ? 'border-slate-800 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-400',
                )}>
                  {row.required ? 'Richiesto' : 'Opzionale'}
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs font-semibold text-slate-800">{row.label}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">{row.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-slate-400 mt-2">
          I file vengono inviati a KORA in formato Excel o CSV. Nessuna integrazione API richiesta in Foundation Light.
          KORA Operator analizza, classifica ed elabora i file prima di produrre il KORA Index.
        </p>

        <Link
          href="/admin/companies/data-intake"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Demo: Data Intake Studio (strumento KORA Operator) →
        </Link>
      </section>

      <Rule />

      {/* ══════════════════════════════════════════════════════════════════
          4 — PILOT PROCESS
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Il percorso pilot — 5 fasi</SectionLabel>

        <div className="space-y-0 rounded-lg border border-slate-200 bg-white overflow-hidden">
          {PHASES.map((phase, i) => (
            <div key={phase.n} className={cn('flex gap-5 px-5 py-4', i < PHASES.length - 1 ? 'border-b border-slate-100' : '')}>
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                  {phase.n}
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-800">{phase.title}</p>
                  <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 whitespace-nowrap">
                    {phase.output}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{phase.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ══════════════════════════════════════════════════════════════════
          5 — PACKAGES / PRICING
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Pacchetti pilot — prezzi indicativi</SectionLabel>
        <p className="text-[10px] text-slate-400 mb-5 -mt-2 leading-relaxed">
          Il costo finale dipende da perimetro aziendale, qualità e completezza dei dati, numero di siti coinvolti e coinvolgimento advisor.
          Ogni pilot inizia con una valutazione preliminare di fattibilità dati — senza impegno automatico.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <div key={pkg.id} className={cn('rounded-xl border p-5 space-y-4 relative flex flex-col', pkg.style)}>
              {pkg.highlight && (
                <span className="absolute -top-3 left-4 rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">
                  Raccomandato
                </span>
              )}

              <div className="space-y-2">
                <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold', pkg.badge)}>
                  {pkg.duration}
                </span>
                <p className={cn('text-sm font-bold leading-snug', pkg.highlight ? 'text-white' : 'text-slate-900')}>
                  {pkg.title}
                </p>
              </div>

              <ul className="space-y-1.5 flex-1">
                {pkg.items.map((item) => (
                  <li key={item} className="flex gap-1.5 text-[10px]">
                    <span className={cn('shrink-0 mt-0.5', pkg.highlight ? 'text-slate-400' : 'text-slate-300')}>·</span>
                    <span className={pkg.highlight ? 'text-slate-300' : 'text-slate-600'}>{item}</span>
                  </li>
                ))}
              </ul>

              <div className={cn('border-t pt-3 space-y-0.5', pkg.highlight ? 'border-slate-700' : 'border-slate-100')}>
                <p className={cn('text-lg font-bold', pkg.highlight ? 'text-white' : 'text-slate-900')}>
                  {pkg.price}
                </p>
                <p className={cn('text-[9px] leading-relaxed', pkg.highlight ? 'text-slate-400' : 'text-slate-400')}>
                  {pkg.priceNote}
                </p>
                <p className={cn('text-[10px] font-semibold mt-1', pkg.highlight ? 'text-slate-300' : 'text-slate-500')}>
                  Deliverable: {pkg.deliverable}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] text-slate-500 leading-relaxed">
          Prezzi indicativi senza IVA. Il costo esatto viene definito dopo la valutazione preliminare di fattibilità dati.
          Advisory opzionale aggiuntiva disponibile a sessione (€1.500–3.000/sessione).
          Nessun abbonamento SaaS automatico — Foundation Light è un prodotto diagnostico guidato.
        </div>
      </section>

      <Rule />

      {/* ══════════════════════════════════════════════════════════════════
          6 — FAQ / OBJECTIONS
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Domande frequenti</SectionLabel>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {FAQS.map((faq, i) => (
            <div key={i} className={cn('px-5 py-4 space-y-1.5', i < FAQS.length - 1 ? 'border-b border-slate-100' : '')}>
              <p className="text-xs font-semibold text-slate-800">{faq.q}</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ══════════════════════════════════════════════════════════════════
          7 — WHAT IT IS NOT
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Cosa NON è il Foundation Light Pilot</SectionLabel>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {[
            'Non è un SaaS self-service: ogni pilot è guidato e supportato dal team KORA.',
            'Non è una piattaforma welfare, HR software o marketplace di servizi.',
            'Non è un sistema di sorveglianza, valutazione individuale o gamification dei lavoratori.',
            'Non produce certificazione ESG, conformità normativa obbligatoria o assurance contabile.',
            'Non garantisce ROI o dimostra causalità tra spesa e outcome organizzativi — correlazione ≠ causalità.',
            'Non sostituisce consulenza legale, fiscale, assurance o reporting normativo obbligatorio.',
            'Non richiede integrazioni API, database aziendali o accesso a sistemi HR interni.',
          ].map((item, i, arr) => (
            <div key={i} className={cn('flex gap-3 px-4 py-2.5 text-xs text-slate-600', i < arr.length - 1 ? 'border-b border-slate-100' : '')}>
              <span className="shrink-0 font-bold text-slate-300 mt-0.5">—</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ══════════════════════════════════════════════════════════════════
          8 — BOUNDARIES
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Confini metodologici</SectionLabel>

        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              ['Metodologia',         'KORA-METHOD-v0.1.0 · pre_empirical_calibration'],
              ['Calibrazione',        'Delphi Study post-pilot — non ancora eseguita'],
              ['Output',             'Direzionale · non certificazione · non attestazione'],
              ['Confidence Score',   'Esterno al KORA Index v3 · peso = 0 · affidabilità dati'],
              ['Privacy',            'N ≥ 10 per segmento · PIB worker-private · no nominativi'],
              ['Sorveglianza',       'Nessun dato individuale lavoratore esposto al datore'],
              ['ESG / CSR',          'Evidenze strutturate — non conformità normativa garantita'],
              ['SaaS',               'Foundation Light è diagnostico guidato · non self-service'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2 text-[11px]">
                <span className="shrink-0 font-semibold text-slate-400 w-32">{label}</span>
                <span className="text-slate-700 leading-snug">{value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-500 leading-relaxed">
            KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
            Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          </div>
        </div>
      </section>

      <Rule />

      {/* ══════════════════════════════════════════════════════════════════
          9 — DEMO OUTPUTS & CTAs
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Output dimostrativi — Foundation Light demo</SectionLabel>
        <p className="text-[10px] text-slate-400 mb-4 -mt-2">
          Questi link mostrano gli output del pilot su dati sintetici demo (Meridiana Group S.r.l.).
          Il pilot reale produce gli stessi output su dati aziendali reali.
          synthetic_demo_data: true · pre_empirical_calibration
        </p>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden mb-6">
          {OUTPUT_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group',
                i < OUTPUT_LINKS.length - 1 ? 'border-b border-slate-100' : '',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">{link.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{link.desc}</p>
              </div>
              <span className="shrink-0 text-[10px] text-slate-400 mt-0.5 group-hover:text-slate-600">→</span>
            </Link>
          ))}
        </div>

        {/* Primary CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/company/reports/board-pack"
            className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Board Pack Preview →
          </Link>
          <Link
            href="/demo-guide"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Demo Guide
          </Link>
          <Link
            href="/future-vision"
            className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
          >
            Future Vision
          </Link>
        </div>
      </section>

      {/* ── Footer monospace ─────────────────────────────────────────────── */}
      <p className="text-[10px] font-mono text-slate-300 pt-6">
        Foundation Light Pilot · offerta indicativa senza IVA · KORA-METHOD-v0.1.0 · pre_empirical_calibration · synthetic_demo_data: true
      </p>

    </div>
  );
}
