// KORA Foundation Light — Product Vision Prototype
// This route is the official handover guide for Next and external stakeholders.
// Static — no backend, no demo state, no client logic.

import Link from 'next/link';
import { cn } from '@/lib/utils';

const EVALUATE_ITEMS = [
  {
    label: 'Executive Cockpit',
    href: '/company',
    shows: 'KORA Index, Confidence Score, Activation Safeguard e priorità direzionali in una vista C-suite.',
    why: 'Punto di ingresso board-ready — mostra come l\'intelligence si traduce in decisione.',
  },
  {
    label: 'KORA Index',
    href: '/company/kora-index',
    shows: '10 componenti, 4 macroblocks, pipeline 14-stage, explainability e Confidence Score.',
    why: 'Cuore metodologico — ogni numero è tracciabile, spiegabile e versionato.',
  },
  {
    label: 'Activation Debt',
    href: '/company/activation',
    shows: 'Maggioranza silenziosa, concentrazione IU, distribuzione per sito e dipartimento, next actions.',
    why: 'Traduce la sotto-attivazione in segnale quantificato — senza esporre individui.',
  },
  {
    label: 'Budget-to-Human-Impact',
    href: '/company/financial',
    shows: 'Governance finanziaria, budget per pillar, costo per IU, BTI macroblock.',
    why: 'Connette la spesa people al segnale di attivazione — non promette ROI garantito.',
  },
  {
    label: 'Data Room',
    href: '/company/data',
    shows: 'Pipeline di ingestion, status UEF, scoring readiness e data quality layer.',
    why: 'Mostra il backstage della metodologia — da dati grezzi a IU computati.',
  },
  {
    label: 'Decision Pack',
    href: '/company/reports',
    shows: 'Report board-ready con KORA Index, pillar analysis, raccomandazioni e disclaimer espliciti.',
    why: 'Output finale per CEO, HR, ESG e Finance — con limiti metodologici integrati.',
  },
  {
    label: 'KORA Contribution',
    href: '/company/contribution',
    shows: 'Indicatore companion per il contributo collettivo e territoriale oltre il perimetro aziendale.',
    why: 'Segnala l\'estensione ecosistemica — distinto dal KORA Index e mai aggregato ad esso.',
  },
  {
    label: 'Future Vision',
    href: '/future-vision',
    shows: 'Roadmap architetturale in 4 fasi: Foundation Light → Pilot → Ecosystem → Worker-Owned.',
    why: 'Mostra dove KORA va, non solo dove è ora — infrastruttura, non feature dump.',
  },
];

const KORA_IS_NOT = [
  'Welfare platform o benefits marketplace',
  'HR dashboard o strumento di monitoraggio lavoratori',
  'Sistema di sorveglianza o ranking individuale',
  'Marketplace transazionale con prezzi e disponibilità',
  'Sistema di gamification con XP, badge o leaderboard',
  'Strumento di governance della spesa o compliance fiscale',
  'Garanzia di compliance ESG, normativa o certificazione legale',
];

const PRINCIPLES = [
  'KORA misura organizzazioni, non individui. L\'output è sempre aggregato a livello aziendale.',
  'Il Worker PIB (Personal Impact Balance) è privato al lavoratore. Mai visibile a ruoli employer.',
  'Il datore di lavoro vede solo aggregati anonimi sopra soglia privacy (N ≥ 10 lavoratori per segmento).',
  'Confidence Score è esterno al KORA Index — peso = 0. Segnala affidabilità dei dati, non impatto.',
  'Activation Safeguard è un gate interpretativo (CLEAR / WARNING / FLAGGED) — non entra nel calcolo del KORA Index.',
  'La compliance obbligatoria è Blocked by design — D.Lgs. 81/08, DVR, DPI = 0 IU, 0 KORA Index.',
  'I benefit economici generici (buoni pasto, fringe, voucher) sono Limited — tracciati nel BTI, 0 IU.',
  'I programmi Eligible sono volontari, aggiuntivi rispetto al minimo legale e verificabili con evidenza.',
];

const NEXT_ROUTE = [
  { step: 1, label: 'Executive Cockpit',       href: '/company',              note: 'Vista C-suite — KORA Index, Safeguard, priorità' },
  { step: 2, label: 'KORA Index Detail',        href: '/company/kora-index',  note: '10 componenti, macroblocks, explainability' },
  { step: 3, label: 'Activation Debt',          href: '/company/activation',  note: 'Maggioranza silenziosa, concentrazione, siti' },
  { step: 4, label: 'Budget-to-Human-Impact',   href: '/company/financial',   note: 'BTI, costo per IU, governance finanziaria' },
  { step: 5, label: 'Data Room',                href: '/company/data',        note: 'Ingestion, UEF, scoring readiness' },
  { step: 6, label: 'Decision Pack',            href: '/company/reports',     note: 'Report board-ready, pillar, raccomandazioni' },
  { step: 7, label: 'KORA Contribution',        href: '/company/contribution', note: 'Companion indicator — ecosistema e territorio' },
  { step: 8, label: 'Future Vision',            href: '/future-vision',        note: 'Roadmap architetturale in 4 fasi' },
];

const NEXT_PRIORITIES = [
  'Usare il prototipo per capire la logica KORA — non copiare la UI letteralmente.',
  'Aiutare a convertire la logica in design di prodotto professionale e coerente.',
  'Preservare la dottrina: no welfare, no gamification, no marketplace, no surveillance.',
  'Rimuovere qualsiasi interpretazione HR dashboard, benefit booking o social network.',
  'Definire un design system con gerarchia executive, densità informativa e identità KORA.',
  'Migliorare la navigazione mantenendo separazione employer / worker layer visivamente ovvia.',
  'Non aggiungere funzionalità — capire quelle esistenti prima di proporne di nuove.',
];

export default function DemoGuidePage() {
  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── 1. Hero ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Guida alla Lettura del Prototipo
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">
          KORA Foundation Light — Product Vision Prototype
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
          Una mappa navigabile della logica KORA: indice, dati, activation debt, eligibility,
          BTI, privacy boundary e Decision Pack.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {[
            { label: 'Product Vision Prototype', style: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
            { label: 'Demo data sintetici',       style: 'border-slate-200 bg-slate-100 text-slate-600' },
            { label: 'Non UI finale',             style: 'border-amber-200 bg-amber-50 text-amber-700' },
            { label: 'Non production-ready',      style: 'border-rose-200 bg-rose-50 text-rose-600' },
            { label: 'Foundation Light v0.1',     style: 'border-slate-200 bg-slate-100 text-slate-600' },
          ].map(({ label, style }) => (
            <span key={label} className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', style)}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── 2. Come leggere questo prototipo ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Come leggere questo prototipo
        </h2>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-5 py-4 space-y-2">
          {[
            { icon: '✓', text: 'Mostra la logica di prodotto e la direzione della piattaforma.' },
            { icon: '✓', text: 'Riferimento per allineare prodotto, metodologia e direzione visiva.' },
            { icon: '✕', text: 'Non è UX/UI finale — il design visivo è un placeholder funzionale.' },
            { icon: '✕', text: 'Non è un SaaS in produzione — nessun DB, nessuna auth, nessuna API live.' },
            { icon: '✕', text: 'Non è codice da copiare letteralmente — è un modello architetturale.' },
            { icon: '✕', text: 'Non è una demo commerciale di feature — è la logica del sistema.' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-2.5">
              <span className={cn(
                'mt-0.5 text-xs font-bold shrink-0',
                icon === '✓' ? 'text-indigo-500' : 'text-rose-400',
              )}>
                {icon}
              </span>
              <p className="text-xs text-indigo-900 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Cosa valutare ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Cosa valutare — Aree chiave del prototipo
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {EVALUATE_ITEMS.map((item, i) => (
            <div
              key={item.label}
              className={cn(
                'px-4 py-3 flex items-start gap-3',
                i < EVALUATE_ITEMS.length - 1 ? 'border-b border-slate-100' : '',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                  <span className="text-[10px] text-slate-400">·</span>
                  <p className="text-xs text-slate-500">{item.shows}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed italic">{item.why}</p>
              </div>
              <Link
                href={item.href}
                className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors whitespace-nowrap"
              >
                Vai →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Cosa KORA non è ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Cosa KORA non è — Confini dottrinali
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-500 mb-2">
              KORA non è — mai
            </p>
            <ul className="space-y-1.5">
              {KORA_IS_NOT.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-rose-400 font-bold text-xs shrink-0">✕</span>
                  <p className="text-xs text-rose-800 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-2">
              KORA è
            </p>
            <ul className="space-y-1.5">
              {[
                'Human Impact Intelligence Platform',
                'Activation Orchestration Layer',
                'Evidence & Trust Layer',
                'Privacy-first, worker-owned layer',
                'Board-ready decision system',
                'Metodologia versionata e spiegabile',
                'Infrastruttura di impatto umano condiviso',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500 font-bold text-xs shrink-0">✓</span>
                  <p className="text-xs text-green-800 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 5. Principi non negoziabili ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Principi non negoziabili
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {PRINCIPLES.map((p, i) => (
            <div
              key={p}
              className={cn(
                'flex items-start gap-3 px-4 py-3',
                i < PRINCIPLES.length - 1 ? 'border-b border-slate-100' : '',
              )}
            >
              <span className="mt-0.5 text-slate-300 font-bold text-xs shrink-0 w-4 text-center">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. Demo vs Real Product ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Demo vs Prodotto Reale
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-2">
              Demo Mode — Foundation Light
            </p>
            <ul className="space-y-1.5">
              {[
                'Dataset sintetico: Meridiana Group S.r.l.',
                'Scenari S1 / S2 pre-seeded',
                'Usato per spiegare la logica di prodotto',
                'Nessun DB, nessuna auth, nessuna API live',
                'I seed sintetici non devono mai alimentare tenant reali',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400 text-xs shrink-0">·</span>
                  <p className="text-xs text-amber-900 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-2">
              Direzione Prodotto Reale
            </p>
            <ul className="space-y-1.5">
              {[
                'Tenant reali con dati propri (uploaded / integration)',
                'Eligibility engine su eventi reali',
                'UEF / IU engine computato in tempo reale',
                'BTI engine su budget aziendali reali',
                'Confidence / Safeguard da qualità dati reali',
                'Privacy-safe aggregation su workforce reale',
                'Decision Pack da output computati, non da seed',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-400 text-xs shrink-0">·</span>
                  <p className="text-xs text-blue-900 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-2 rounded border border-rose-100 bg-rose-50 px-3 py-2">
          <p className="text-[10px] font-semibold text-rose-700">
            I dati demo sintetici non devono mai essere usati per tenant reali. Dati reali richiedono onboarding, privacy architecture e consenso esplicito.
          </p>
        </div>
      </section>

      {/* ── 7. Percorso consigliato per la review di Next ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
          Percorso consigliato per Next
        </h2>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          Leggere nell&apos;ordine. Ogni schermata costruisce sulla precedente.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {NEXT_ROUTE.map((item, i) => (
            <Link
              key={item.step}
              href={item.href}
              className={cn(
                'flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors',
                i < NEXT_ROUTE.length - 1 ? 'border-b border-slate-100' : '',
              )}
            >
              <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0">
                {item.step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.note}</p>
              </div>
              <span className="text-[10px] text-slate-300 shrink-0">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 8. Cosa chiediamo a Next ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Cosa chiediamo a Next — Handover Priorities
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          {NEXT_PRIORITIES.map((p) => (
            <div key={p} className="flex items-start gap-2.5">
              <span className="mt-0.5 text-indigo-400 font-bold text-xs shrink-0">→</span>
              <p className="text-xs text-slate-700 leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 9. Boundary Box ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1.5">
        <p className="font-semibold text-slate-600">Confini del prototipo</p>
        <ul className="space-y-1 pl-3">
          <li className="list-disc leading-relaxed">Dati demo sintetici — nessun dato aziendale reale.</li>
          <li className="list-disc leading-relaxed">Foundation Light v0.1 — pre-calibrazione empirica.</li>
          <li className="list-disc leading-relaxed"><span className="font-mono">calibration_status: pre_empirical_calibration</span> · Confidence Score esterno.</li>
          <li className="list-disc leading-relaxed">Nessun production claim, assurance, compliance guarantee o ROI certificato.</li>
          <li className="list-disc leading-relaxed">Foundation Light è il punto di ingresso attuale — non la versione finale del prodotto.</li>
        </ul>
      </div>

      {/* ── Navigation ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <Link
          href="/company"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Executive Cockpit →
        </Link>
        <Link
          href="/future-vision"
          className="text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          Future Vision →
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Foundation Light · Product Vision Prototype · synthetic_demo_data: true · v0.1
      </p>
    </div>
  );
}
