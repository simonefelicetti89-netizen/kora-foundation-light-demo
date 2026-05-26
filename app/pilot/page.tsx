// PL-01: Foundation Light Pilot — commercial packaging page
// Static. No backend. No forms. No live data.

import Link from 'next/link';
import { cn } from '@/lib/utils';

const PILOT_PHASES = [
  {
    n: '01',
    title: 'Kickoff & Inventario Dati',
    desc: 'Definizione del perimetro aziendale, raccolta dei dataset disponibili (welfare, formazione, people, ESG), analisi della qualità e completezza dei dati esistenti.',
  },
  {
    n: '02',
    title: 'Mapping & Eligibility Gate',
    desc: 'Classificazione di ogni tipologia di evento/spesa nel sistema KORA: Eligible (genera IU), Limited (0 IU, solo BTI), Blocked (escluso per design). Verifica della soglia di attivazione.',
  },
  {
    n: '03',
    title: 'KORA Index, BTI & Activation Debt',
    desc: 'Calcolo del KORA Index preliminare con 10 componenti, Confidence Score, Activation Safeguard. Lettura Budget-to-Human-Impact e stima dell\'Activation Debt per pillar.',
  },
  {
    n: '04',
    title: 'Preparazione Decision Pack',
    desc: 'Consolidamento degli output in un Decision Pack board-ready: KORA Index, distribuzione pillar, BTI, Activation Debt, Next Best Actions e note metodologiche.',
  },
  {
    n: '05',
    title: 'Workshop Esecutivo & Roadmap',
    desc: 'Sessione di lettura del Decision Pack con il team direzionale. Identificazione delle priorità di riallocazione budget e degli interventi ad alto impatto.',
  },
];

const PACKAGES = [
  {
    id: 'diagnostic',
    title: 'Foundation Light Diagnostic',
    duration: '6 settimane',
    price: '€12k–18k',
    priceNote: 'indicativo — dipende da perimetro e qualità dati disponibili',
    items: [
      'Un perimetro aziendale',
      'Inventario dati disponibili',
      'Eligibility Gate classification',
      'KORA Index preliminare (10 componenti)',
      'Confidence Score e Activation Safeguard',
      'Budget-to-Human-Impact — lettura direzionale',
      'Activation Debt per pillar',
      'Decision Pack (formato board-ready)',
    ],
    style: 'border-slate-200',
    badgeStyle: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  {
    id: 'advisor',
    title: 'Foundation Light + Advisor Review',
    duration: '8 settimane',
    price: '€18k–25k',
    priceNote: 'indicativo — include sessione advisor KORA',
    items: [
      'Tutto il pacchetto Diagnostic',
      'Sessione di review con advisor KORA certificato',
      'Verifica qualità evidenze e classification',
      'Decision Pack revisionato post-advisor',
      'Roadmap di intervento prioritizzata',
      'Note metodologiche per rendicontazione CSR/ESG',
    ],
    style: 'border-kora-violet/30 ring-1 ring-kora-violet/20',
    badgeStyle: 'bg-violet-50 text-violet-700 border-violet-200',
    featured: true,
  },
  {
    id: 'strategic',
    title: 'Foundation Light Strategic Pilot',
    duration: '10–12 settimane',
    price: '€25k–40k',
    priceNote: 'indicativo — multi-sito, multi-reparto',
    items: [
      'Tutto il pacchetto Advisor Review',
      'Più dipartimenti e/o siti aziendali',
      'Inventario dati approfondito',
      'Analisi gap per sede/cluster (privacy-safe)',
      'Roadmap di riallocazione budget dettagliata',
      'Workshop esecutivo con C-suite',
      'Preparazione per fase Pilot Calibration',
    ],
    style: 'border-slate-200',
    badgeStyle: 'bg-slate-100 text-slate-600 border-slate-200',
  },
];

const OUTPUT_LINKS = [
  { label: 'Executive Cockpit',          href: '/company',            desc: 'KORA Index, CS, Safeguard, priorità operative' },
  { label: 'KORA Index — Dettaglio',     href: '/company/kora-index', desc: '10 componenti, macroblocchi, Eligibility Gate' },
  { label: 'Attivazione & Debt',         href: '/company/activation', desc: 'Distribuzione per pillar e sede, Activation Debt' },
  { label: 'Budget-to-Human-Impact',     href: '/company/financial',  desc: 'Lettura budget-to-activation, deep activation share' },
  { label: 'Decision Pack',              href: '/company/reports',    desc: 'Report board-ready — struttura e governance' },
  { label: 'Roadmap Architetturale',     href: '/future-vision',      desc: 'Dove va KORA dopo Foundation Light' },
];

const NOT_LIST = [
  'Non è un SaaS self-service: ogni pilot è guidato e supportato dal team KORA.',
  'Non è una piattaforma welfare o marketplace di servizi.',
  'Non è un sistema di sorveglianza o valutazione individuale dei lavoratori.',
  'Non produce certificazione ESG o conformità normativa obbligatoria.',
  'Non garantisce ROI o dimostra causalità tra spesa e outcome organizzativi.',
  'Non sostituisce consulenza legale, fiscale, assurance o reporting obbligatorio.',
];

export default function PilotPage() {
  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── Hero ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Prima offerta commerciale
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          KORA Foundation Light Pilot
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
          Un percorso guidato per trasformare dati people, welfare e iniziative aziendali
          in una prima lettura di attivazione umana, budget-to-impact e decisioni operative.
          Nessun software da installare. Nessun dato inventato. Solo ciò che già esiste in azienda,
          trasformato in intelligenza organizzativa strutturata.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {[
            ['Guided Pilot',              'bg-slate-900 text-white border-slate-900'],
            ['6–12 settimane',            'bg-slate-100 text-slate-700 border-slate-200'],
            ['Dati aziendali esistenti',  'bg-slate-100 text-slate-700 border-slate-200'],
            ['Decision Pack finale',      'bg-green-50 text-green-700 border-green-200'],
            ['Advisor review disponibile','bg-violet-50 text-violet-700 border-violet-200'],
          ].map(([label, style]) => (
            <span key={label} className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', style)}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── What companies get ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Cosa ottiene l&apos;azienda
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {[
            { title: 'Inventario dati',               desc: 'Classificazione di ogni fonte dati disponibile: welfare, formazione, HR, ESG, eventi aziendali.' },
            { title: 'Eligibility Gate',              desc: 'Ogni tipologia di evento classificata: Eligible, Limited o Blocked — con motivazione metodologica.' },
            { title: 'Budget-to-Human-Impact',        desc: 'Prima lettura direzionale di quanto il budget people e welfare si converte in attivazione verificata.' },
            { title: 'Activation Debt',               desc: 'Stima del budget non convertito in Impact Units, distribuito per pillar e sede (privacy-safe).' },
            { title: 'KORA Index preliminare',        desc: 'Indice organizzativo a 10 componenti con Confidence Score e Activation Safeguard.' },
            { title: 'Decision Pack board-ready',     desc: 'Report strutturato per C-suite: KORA Index, distribuzione pillar, BTI, next actions, note metodologiche.' },
            { title: 'Workshop esecutivo',            desc: 'Sessione di lettura e interpretazione del Decision Pack con il team direzionale.' },
            { title: 'Roadmap di riallocazione',      desc: 'Identificazione delle priorità di intervento per migliorare l\'attivazione organizzativa nel prossimo periodo.' },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
              <p className="text-xs font-semibold text-slate-800">{item.title}</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who it is for ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          A chi è rivolto
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-slate-700 mb-1">Dimensione aziendale</p>
              <p className="text-slate-500">200–1.000 dipendenti. Aziende con spesa people, welfare e/o ESG già in corso.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Buyer tipico</p>
              <p className="text-slate-500">HR Director, CFO, ESG Officer, CEO — chi ha responsabilità di rendicontazione o allocazione budget people.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Domanda di partenza</p>
              <p className="text-slate-500">&ldquo;Stiamo spendendo in welfare e formazione: ma questa spesa diventa davvero attivazione organizzativa?&rdquo;</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Settori</p>
              <p className="text-slate-500">Manifatturiero, servizi, grande distribuzione, terziario avanzato. Qualsiasi azienda con dati people strutturati.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pilot process ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Il percorso pilot — 5 fasi
        </h2>
        <div className="space-y-2">
          {PILOT_PHASES.map((phase, i) => (
            <div key={phase.n} className="flex gap-4 items-start">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {phase.n}
                </div>
                {i < PILOT_PHASES.length - 1 && (
                  <div className="w-px h-full min-h-[1.5rem] bg-slate-200 mt-1" />
                )}
              </div>
              <div className="pb-4 flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{phase.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{phase.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Example outputs ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Output dimostrativi — Foundation Light
        </h2>
        <p className="text-[10px] text-slate-400 mb-3">
          Questi link mostrano gli output del pilot su dati sintetici demo. Il pilot reale produce gli stessi output su dati aziendali reali.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {OUTPUT_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors',
                i < OUTPUT_LINKS.length - 1 ? 'border-b border-slate-100' : '',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{link.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{link.desc}</p>
              </div>
              <span className="shrink-0 text-[10px] text-slate-400 mt-0.5">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Commercial packages ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Pacchetti pilot
        </h2>
        <p className="text-[10px] text-slate-400 mb-4">
          Prezzi indicativi — il costo finale dipende da perimetro, qualità dati, numero di siti e coinvolgimento advisor.
          Nessun impegno automatico. Ogni pilot inizia con una valutazione di fattibilità dati.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <div key={pkg.id} className={cn('rounded-xl border p-4 space-y-3 relative', pkg.style)}>
              {pkg.featured && (
                <span className="absolute -top-2.5 left-3 rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-700 uppercase tracking-wide">
                  Raccomandato
                </span>
              )}
              <div>
                <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold', pkg.badgeStyle)}>
                  {pkg.duration}
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">{pkg.title}</p>
              </div>
              <ul className="space-y-1">
                {pkg.items.map((item) => (
                  <li key={item} className="flex gap-1.5 text-[10px] text-slate-600">
                    <span className="shrink-0 text-slate-400 mt-0.5">·</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 pt-2">
                <p className="text-sm font-bold text-slate-900">{pkg.price}</p>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">{pkg.priceNote}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── What it is not ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Cosa NON è il Foundation Light Pilot
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {NOT_LIST.map((item, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2.5 px-4 py-2.5 text-xs text-slate-600',
                i < NOT_LIST.length - 1 ? 'border-b border-slate-100' : '',
              )}
            >
              <span className="shrink-0 text-slate-300 font-bold">—</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* ── Boundary box ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-500 space-y-1.5">
        <p className="font-semibold text-slate-600">Confini metodologici</p>
        <ul className="space-y-1 pl-3">
          <li className="list-disc leading-relaxed">Utilizza i dati people/welfare/ESG già disponibili in azienda — nessun dato inventato.</li>
          <li className="list-disc leading-relaxed">Metodologia v0.1 / pre_empirical_calibration — la calibrazione empirica è post-pilot.</li>
          <li className="list-disc leading-relaxed">Non produce certificazione. Non sostituisce assurance ESG, consulenza legale o fiscale.</li>
          <li className="list-disc leading-relaxed">Nessun dato individuale visibile all&apos;azienda: privacy N≥10, PIB worker-private.</li>
          <li className="list-disc leading-relaxed">Il Confidence Score dipende dalla qualità dei dati disponibili — potrebbe essere basso nel primo pilot.</li>
          <li className="list-disc leading-relaxed">
            KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
            Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          </li>
        </ul>
      </div>

      {/* ── CTA ── */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <Link
          href="/demo-guide"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Demo Guide →
        </Link>
        <Link
          href="/company"
          className="text-slate-500 hover:text-slate-800 underline underline-offset-2"
        >
          Executive Cockpit
        </Link>
        <Link
          href="/company/reports"
          className="text-slate-500 hover:text-slate-800 underline underline-offset-2"
        >
          Decision Pack
        </Link>
        <Link
          href="/future-vision"
          className="text-slate-500 hover:text-slate-800 underline underline-offset-2"
        >
          Future Vision
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        Foundation Light Pilot · offerta indicativa · methodology v0.1 · pre_empirical_calibration · synthetic_demo_data: true
      </p>

    </div>
  );
}
