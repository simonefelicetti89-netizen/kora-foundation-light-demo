// C-07-BP: Board Pack Preview — print-ready route
// Canonical S1 scenario values — Meridiana Group Q1–Q3 2025
// All values from KORA_DOCTRINE.md §4 — do not derive from services.
// This page is intentionally static: no backend, no PDF library.

import Link from 'next/link';

export const metadata = {
  title: 'Board Pack Preview — Meridiana Group — KORA Foundation Light',
};

// ── Canonical S1 constants ────────────────────────────────────────────────────
// Source: KORA_DOCTRINE.md §4

const COMPANY     = 'Meridiana Group S.r.l.';
const PERIOD      = 'Q1–Q3 2025';
const SCENARIO    = 'S1 Baseline';
const METHOD_ID   = 'KORA-METHOD-v0.1.0';
const CALIB       = 'pre_empirical_calibration';
const GENERATED   = '2025-10-01';

const KORA_INDEX  = 34;
const CS_PCT      = 60;
const SAFEGUARD   = 'WARNING';

const TOTAL_WORKERS     = 250;
const ACTIVE_WORKERS    = 93;
const MEANINGFUL_ACTIVE = 54;
const NEVER_ACTIVATED   = 157;  // 250 − 93
const TOP12_PCT_IU      = 64;
const BOTTOM50_PCT_IU   = 12;

const BUDGET_TOTAL            = 185_000;
const BUDGET_USED             = 112_000;
const DEEP_ACTIVATION_SPEND   = 58_000;
const ECONOMIC_RELIEF_SPEND   = 54_000;
const ACTIVATION_DEBT_EUR     = 45_000;
const COST_PER_IU             = 22.4;

const ELIGIBLE_RECORDS = 1_276;
const LIMITED_RECORDS  = 3_820;
const BLOCKED_RECORDS  = 318;

const MACROBLOCKS = [
  { label: 'Activation Reach',       weight: 25, value: 30, components: 'AR · MAR' },
  { label: 'Activation Quality',      weight: 30, value: 37, components: 'NI · VR · CO' },
  { label: 'Distribution & Equity',   weight: 25, value: 40, components: 'WB · PC · PB · EQ' },
  { label: 'Budget-to-Human-Impact',  weight: 20, value: 28, components: 'BudgetToHumanImpactEngine' },
] as const;

const PILLARS = [
  { code: 'LIFE',       share: 44 },
  { code: 'GROWTH',     share: 27 },
  { code: 'CONNECTION', share: 12 },
  { code: 'IMPACT',     share: 11 },
  { code: 'LEGACY',     share:  6 },
] as const;

const COMPONENTS = [
  { code: 'AR',  label: 'Activation Rate',         value: 38, macroblock: 'Reach' },
  { code: 'MAR', label: 'Meaningful Activation',   value: 22, macroblock: 'Reach' },
  { code: 'NI',  label: 'Normalized Intensity',    value: 41, macroblock: 'Quality' },
  { code: 'VR',  label: 'Verification Rate',        value: 41, macroblock: 'Quality' },
  { code: 'CO',  label: 'Continuity',               value: 28, macroblock: 'Quality' },
  { code: 'WB',  label: 'Worker Balance',           value: 29, macroblock: 'Equity' },
  { code: 'PC',  label: 'Pillar Coverage',          value: 60, macroblock: 'Equity' },
  { code: 'PB',  label: 'Pillar Balance',           value: 34, macroblock: 'Equity' },
  { code: 'EQ',  label: 'Equity (distrib.)',        value: 38, macroblock: 'Equity' },
  { code: 'CS',  label: 'Confidence Score',         value: 60, macroblock: '— esterno, peso 0' },
] as const;

const RECOMMENDATIONS = [
  {
    n: 1,
    priority: 'Alta',
    title: 'Chiudere il gap Plant Bergamo / Operations',
    body: 'Activation Rate Operations: 11% — il più basso tra tutti i dipartimenti. Plant Bergamo è il sito con AR più critico. Priorità: programmi LIFE e CONNECTION specifici per questo cluster.',
  },
  {
    n: 2,
    priority: 'Alta',
    title: 'Ribilanciare Economic Relief verso Deep Activation',
    body: '48% della spesa (€54.000) è classificata Economic Relief — genera 0 IU. Convertire €20k–25k in programmi Eligible può migliorare significativamente il KORA Index.',
  },
  {
    n: 3,
    priority: 'Media',
    title: 'Rafforzare i programmi GROWTH e CONNECTION',
    body: 'GROWTH (27%) e CONNECTION (12%) sono sottorappresentati rispetto al potenziale. Upskilling, mentoring e community interna sono i pillar con il maggiore potenziale di espansione.',
  },
  {
    n: 4,
    priority: 'Media',
    title: 'Completare la revisione advisor prima del Board Pack finale',
    body: 'Il Decision Pack è in stato Bozza. Revisione advisor KORA richiesta prima della versione certificata. Nessun output da presentare a Board o ESG officer senza revisione completata.',
  },
  {
    n: 5,
    priority: 'Bassa',
    title: 'Preparare lo scenario S2 per confronto direzionale',
    body: 'Lo scenario S2 (KORA Index = 54, Safeguard CLEAR) mostra l\'effetto di una riallocazione strategica. Usarlo come target operativo nel workshop esecutivo.',
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function eur(n: number) {
  return `€${n.toLocaleString('it-IT')}`;
}

function Divider() {
  return <div className="border-t border-slate-200 my-6" />;
}

function SectionHeading({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{n}</span>
        <h2 className="text-base font-bold text-slate-900 leading-tight">{title}</h2>
      </div>
      {sub && <p className="text-xs text-slate-500 mt-0.5 ml-8">{sub}</p>}
    </div>
  );
}

function MetricBlock({ label, value, sub, note }: { label: string; value: string; sub?: string; note?: string }) {
  return (
    <div className="border border-slate-200 rounded p-3 space-y-0.5">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold leading-tight">{label}</p>
      <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      {sub && <p className="text-[10px] font-mono text-slate-400">{sub}</p>}
      {note && <p className="text-[10px] text-slate-500 italic leading-snug">{note}</p>}
    </div>
  );
}

function BarRow({ label, pct, color = 'bg-slate-400' }: { label: string; pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-[11px] font-mono text-slate-600 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const style =
    p === 'Alta'  ? 'bg-slate-900 text-white border-slate-900' :
    p === 'Media' ? 'bg-slate-200 text-slate-700 border-slate-300' :
                    'bg-slate-100 text-slate-400 border-slate-200';
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${style}`}>
      {p}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BoardPackPreview() {
  return (
    <>
      {/* ── Print CSS: hide app chrome, expose content ── */}
      <style>{`
        @media print {
          [role="banner"], header, aside, .no-print { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; height: auto !important; }
          body, html { background: white !important; height: auto !important; }
          .page-break { page-break-before: always; break-before: page; padding-top: 0; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
          .board-pack-root { max-width: 100% !important; }
        }
        @page { size: A4 portrait; margin: 14mm 18mm; }
      `}</style>

      <div className="board-pack-root max-w-3xl mx-auto text-slate-900 pb-16">

        {/* ── Screen-only nav ──────────────────────────────────────────────── */}
        <div className="no-print mb-6 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
          <Link
            href="/company/reports"
            className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
          >
            ← Decision Pack Console
          </Link>
          <p className="text-[11px] text-slate-400 italic text-right">
            Preview stampabile — usare il browser per <strong className="font-semibold text-slate-600">Salva come PDF</strong>.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — COVER
        ══════════════════════════════════════════════════════════════════ */}
        <div className="avoid-break border border-slate-300 rounded-xl p-8 space-y-5 mb-8">

          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
              KORA Foundation Light · Decision Pack
            </p>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">{COMPANY}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {PERIOD}
              </span>
              <span className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {SCENARIO}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5 grid grid-cols-3 gap-4">
            <div className="text-center border border-slate-200 rounded-lg p-4">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">KORA Index v3</p>
              <p className="text-5xl font-bold text-slate-900 mt-1 leading-none">{KORA_INDEX}</p>
              <p className="text-[10px] text-slate-400 mt-1">/100</p>
            </div>
            <div className="text-center border border-slate-200 rounded-lg p-4">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Confidence Score</p>
              <p className="text-4xl font-bold text-slate-700 mt-1 leading-none">{CS_PCT}%</p>
              <p className="text-[10px] text-slate-400 mt-1">esterno · peso&nbsp;0</p>
            </div>
            <div className="text-center border border-amber-200 bg-amber-50 rounded-lg p-4">
              <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Activation Safeguard</p>
              <p className="text-3xl font-bold text-amber-700 mt-1 leading-none">{SAFEGUARD}</p>
              <p className="text-[10px] text-amber-500 mt-1">soglia CLEAR non raggiunta</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-1 text-[11px] text-slate-500">
            <div className="flex flex-wrap gap-4">
              <span>Status: <span className="font-semibold text-slate-700">Bozza disponibile — revisione advisor richiesta</span></span>
              <span>Generato: <span className="font-mono">{GENERATED}</span></span>
            </div>
            <div className="flex flex-wrap gap-4 font-mono">
              <span>{METHOD_ID}</span>
              <span className="text-amber-600">{CALIB}</span>
              <span className="text-slate-400">production_ready: false</span>
              <span className="text-slate-400">synthetic_demo_data: true</span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — EXECUTIVE SUMMARY
        ══════════════════════════════════════════════════════════════════ */}
        <div className="avoid-break mb-8">
          <SectionHeading n="02" title="Executive Summary" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            <MetricBlock label="KORA Index" value={`${KORA_INDEX}/100`} sub="S1 Baseline" />
            <MetricBlock label="Confidence Score" value={`${CS_PCT}%`} sub="esterno · peso 0" />
            <MetricBlock label="Activation Safeguard" value={SAFEGUARD} sub="soglia CLEAR non raggiunta" />
            <MetricBlock label="Activation Debt" value={eur(ACTIVATION_DEBT_EUR)} sub="budget non convertito in IU" />
          </div>

          <div className="border border-slate-200 rounded-lg px-5 py-4 bg-slate-50 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Diagnosi principale</p>
            <p className="text-sm text-slate-700 leading-relaxed">
              La spesa esiste, ma l&apos;attivazione significativa è concentrata e non raggiunge in modo equilibrato tutta la workforce.
              Il top 12% dei lavoratori genera il {TOP12_PCT_IU}% degli Impact Units totali.
              Il {NEVER_ACTIVATED} lavoratori ({Math.round(NEVER_ACTIVATED / TOTAL_WORKERS * 100)}% della forza lavoro) non ha ancora generato alcun Impact Unit nel periodo.
            </p>
            <p className="text-[11px] text-slate-500 italic">
              Il KORA Index misura l&apos;organizzazione — non gli individui. Nessun dato individuale è visibile a questo livello.
              Confidence Score esterno (CS = {CS_PCT}%): dati parzialmente verificati. Revisione advisor consigliata.
            </p>
          </div>
        </div>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — KORA INDEX SNAPSHOT
        ══════════════════════════════════════════════════════════════════ */}
        <div className="avoid-break mb-8">
          <SectionHeading
            n="03"
            title="KORA Index Snapshot"
            sub="4 macroblocchi · 9 componenti analitici · Confidence Score esterno"
          />

          {/* Macroblocks */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {MACROBLOCKS.map((mb) => (
              <div key={mb.label} className="border border-slate-200 rounded-lg p-4 space-y-2 avoid-break">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800 leading-snug">{mb.label}</p>
                  <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                    {mb.weight}%
                  </span>
                </div>
                <p className="text-3xl font-bold text-slate-900 leading-none">{mb.value}</p>
                <p className="text-[10px] font-mono text-slate-400">{mb.components}</p>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div className="h-1.5 rounded-full bg-slate-700" style={{ width: `${mb.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* 10 components table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Codice</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Componente</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">Valore</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Macroblocco</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENTS.map((c, i) => (
                  <tr key={c.code} className={i < COMPONENTS.length - 1 ? 'border-b border-slate-100' : ''}>
                    <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">{c.code}</td>
                    <td className="px-3 py-1.5 text-slate-600">{c.label}</td>
                    <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-900">
                      {c.code === 'CS' ? `${c.value}%` : c.value}
                    </td>
                    <td className={`px-3 py-1.5 text-[10px] font-mono ${c.code === 'CS' ? 'text-slate-400 italic' : 'text-slate-500'}`}>
                      {c.macroblock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">
            CS (Confidence Score) è esterno al KORA Index v3 — peso = 0 — indicatore di affidabilità dati, non di impatto.
            Activation Safeguard è un gate interpretivo, non una componente del punteggio.
          </p>
        </div>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — ACTIVATION DEBT & WORKFORCE
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break avoid-break mb-8">
          <SectionHeading
            n="04"
            title="Activation Debt & Forza Lavoro"
            sub="Vista aggregata — nessun dato individuale · N ≥ 10 per segmento"
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <MetricBlock label="Forza Lavoro Totale" value={`${TOTAL_WORKERS}`} sub="Meridiana Group S.r.l." />
            <MetricBlock label="Lavoratori Attivi" value={`${ACTIVE_WORKERS}`} sub={`AR = ${Math.round(ACTIVE_WORKERS / TOTAL_WORKERS * 100)}%`} />
            <MetricBlock label="Attivazione Significativa" value={`${MEANINGFUL_ACTIVE}`} sub={`MAR = ${Math.round(MEANINGFUL_ACTIVE / TOTAL_WORKERS * 100)}%`} />
            <MetricBlock label="Mai Attivati" value={`${NEVER_ACTIVATED}`} sub={`${Math.round(NEVER_ACTIVATED / TOTAL_WORKERS * 100)}% della forza lavoro`} note="Maggioranza silenziosa" />
          </div>

          {/* IU Concentration */}
          <div className="border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Concentrazione Impact Units — distribuzione interna (aggregata)
            </p>
            <div className="space-y-2.5">
              <BarRow label={`Top 12% (${Math.round(TOTAL_WORKERS * 0.12)} lav.)`}    pct={TOP12_PCT_IU}    color="bg-slate-700" />
              <BarRow label="Fascia 38–88%"                                             pct={100 - TOP12_PCT_IU - BOTTOM50_PCT_IU} color="bg-slate-400" />
              <BarRow label="Bottom 50%"                                                pct={BOTTOM50_PCT_IU} color="bg-slate-200" />
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Il top 12% genera il {TOP12_PCT_IU}% degli Impact Units totali. Alta concentrazione = Activation Debt strutturale.
              Nessun nominativo. Nessun PIB individuale.
            </p>
          </div>

          {/* Site gap */}
          <div className="border border-amber-100 bg-amber-50 rounded-lg p-4 space-y-2 avoid-break">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Gap critico — Plant Bergamo / Operations
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { site: 'Sede Milano (HQ)',     workers: 100, ar: 60 },
                { site: 'Plant Bergamo',         workers:  90, ar: 11, critical: true },
                { site: 'Sede Torino',           workers:  35, ar: 38 },
                { site: 'Remoto / distribuito',  workers:  25, ar: 55 },
              ].map((s) => (
                <div key={s.site} className={`rounded border p-2.5 space-y-1 ${s.critical ? 'border-red-200 bg-white' : 'border-amber-200/60 bg-white/60'}`}>
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-slate-800 text-[11px] leading-tight">{s.site}</p>
                    {s.critical && <span className="rounded border border-red-200 bg-red-50 px-1 py-0.5 text-[9px] font-bold text-red-600">CRITICO</span>}
                  </div>
                  <p className="text-[10px] text-slate-500">{s.workers} lav. · AR <span className={`font-bold ${s.critical ? 'text-red-600' : 'text-slate-700'}`}>{s.ar}%</span></p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-amber-700">
              Sedi con &lt;10 lavoratori soppresse per soglia privacy (safe_aggregation_threshold = 10).
              Plant Bergamo: AR 11% — intervento prioritario.
            </p>
          </div>
        </div>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 5 — BUDGET-TO-HUMAN-IMPACT
        ══════════════════════════════════════════════════════════════════ */}
        <div className="avoid-break mb-8">
          <SectionHeading
            n="05"
            title="Budget-to-Human-Impact"
            sub="Peso nel KORA Index: 20% (macroblocco BTI) · Valore S1: 28/100"
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
            <MetricBlock label="Budget Totale"          value={eur(BUDGET_TOTAL)}           sub="welfare + people Q1–Q3 2025" />
            <MetricBlock label="Budget Utilizzato"      value={eur(BUDGET_USED)}            sub={`${Math.round(BUDGET_USED / BUDGET_TOTAL * 100)}% del totale`} />
            <MetricBlock label="Activation Debt"        value={eur(ACTIVATION_DEBT_EUR)}    sub="budget non convertito in IU" note="Priorità di intervento" />
            <MetricBlock label="Deep Activation Spend"  value={eur(DEEP_ACTIVATION_SPEND)}  sub={`${Math.round(DEEP_ACTIVATION_SPEND / BUDGET_USED * 100)}% del budget usato`} />
            <MetricBlock label="Economic Relief Spend"  value={eur(ECONOMIC_RELIEF_SPEND)}  sub={`${Math.round(ECONOMIC_RELIEF_SPEND / BUDGET_USED * 100)}% del budget usato · 0 IU`} />
            <MetricBlock label="Costo per Impact Unit"  value={`€${COST_PER_IU}`}          sub="deep_activation_spend / IU totali" />
          </div>

          {/* BTI split bar */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-2 mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Composizione budget utilizzato ({eur(BUDGET_USED)})
            </p>
            <div className="h-5 rounded flex overflow-hidden border border-slate-200">
              <div className="bg-slate-700 flex items-center justify-center"
                style={{ width: `${Math.round(DEEP_ACTIVATION_SPEND / BUDGET_USED * 100)}%` }}>
                <span className="text-[9px] font-bold text-white px-1">
                  Deep Activation {Math.round(DEEP_ACTIVATION_SPEND / BUDGET_USED * 100)}%
                </span>
              </div>
              <div className="bg-slate-300 flex items-center justify-center flex-1">
                <span className="text-[9px] font-semibold text-slate-600">
                  Economic Relief {Math.round(ECONOMIC_RELIEF_SPEND / BUDGET_USED * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="border border-slate-100 bg-slate-50 rounded px-4 py-3 text-[11px] text-slate-600 leading-relaxed">
            Le cifre di budget sono informative. Il budget grezzo non alimenta direttamente il KORA Index: entra solo attraverso
            il Budget-to-Human-Impact Score (macroblocco BTI, peso 20%). Economic Relief genera 0 Impact Units —
            è tracciato nel BTI engine come <span className="font-mono">economic_relief_spend</span>.
            Correlazione ≠ causalità.
          </div>
        </div>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 6 — BUDGET EVIDENCE QUALITY
        ══════════════════════════════════════════════════════════════════ */}
        <div className="avoid-break mb-8">
          <SectionHeading
            n="06"
            title="Budget Evidence Quality"
            sub="Preview metodologica — valori non certificati nel dataset demo"
          />

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Documentato',           desc: 'Budget con fonte documentata (fatture, accordi, contratti firmati)',               pct: 62, color: 'bg-slate-700' },
              { label: 'Dichiarato',             desc: 'Budget da dichiarazione HR / reportistica interna — non verificato da terzi',     pct: 24, color: 'bg-slate-400' },
              { label: 'Stimato',               desc: 'Budget stimato — senza fonte strutturata. Limita il Confidence Score.',           pct: 10, color: 'bg-slate-300' },
              { label: 'Non valorizzato / N/A', desc: 'Spesa non quantificata o non applicabile (es. programmi in natura)',              pct:  4, color: 'bg-slate-200' },
            ].map((row) => (
              <div key={row.label} className="border border-slate-200 rounded-lg p-3 space-y-1.5 avoid-break">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11px] font-semibold text-slate-700">{row.label}</p>
                  <span className="text-[11px] font-mono font-bold text-slate-700">{row.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div className={`h-1.5 rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">{row.desc}</p>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 bg-slate-50 rounded px-4 py-3 text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">Il budget non è un dato valido se non ha una fonte.</p>
            <p>
              La qualità della fonte budget determina il peso di ciascun record nel Budget-to-Human-Impact engine.
              Un budget stimato o dichiarato ha un trust score inferiore rispetto a un budget documentato —
              questo si riflette nel Confidence Score (CS = {CS_PCT}% in questo scenario).
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              Preview metodologica — valori non certificati nel dataset demo · Source quality ≠ Budget amount
            </p>
          </div>
        </div>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 7 — ELIGIBILITY GATE
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break avoid-break mb-8">
          <SectionHeading
            n="07"
            title="Eligibility Gate"
            sub="Classificazione metodologica di ogni record — nessuna discrezionalità"
          />

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="border border-slate-200 rounded-lg p-4 text-center space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Eligible</p>
              <p className="text-4xl font-bold text-slate-900">{ELIGIBLE_RECORDS.toLocaleString('it-IT')}</p>
              <p className="text-[10px] text-slate-500">record · generano IU</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 text-center space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Limited</p>
              <p className="text-4xl font-bold text-slate-700">{LIMITED_RECORDS.toLocaleString('it-IT')}</p>
              <p className="text-[10px] text-slate-500">record · 0 IU · solo BTI</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 text-center space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Blocked</p>
              <p className="text-4xl font-bold text-slate-400">{BLOCKED_RECORDS.toLocaleString('it-IT')}</p>
              <p className="text-[10px] text-slate-500">record · 0 IU · governance only</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {[
              {
                gate: 'Eligible',
                badge: 'border-slate-800 bg-slate-900 text-white',
                title: 'Genera Impact Units → KORA Index',
                body: 'Programmi volontari, aggiuntivi e verificabili: upskilling, mentoring, prevenzione, supporto psicologico, volontariato, inclusione, community, future/pension. Generano IU e contribuiscono al KORA Index.',
              },
              {
                gate: 'Limited',
                badge: 'border-slate-400 bg-slate-100 text-slate-700',
                title: '0 IU — Economic Relief → BTI engine',
                body: 'Benefit cash-like: buoni pasto, card carburante, fringe generici, voucher. Non è spesa sbagliata — è spesa che può diventare più intelligente. Tracciata nel Budget-to-Human-Impact engine come economic_relief_spend.',
              },
              {
                gate: 'Blocked',
                badge: 'border-slate-300 bg-slate-50 text-slate-500',
                title: '0 IU — Blocked by Design',
                body: 'Compliance obbligatoria per legge: D.Lgs 81/08, DVR/DUVRI, DPI, sorveglianza sanitaria obbligatoria, GDPR mandatory. La conformità legale è una baseline, non impatto. Non penalizzato — escluso per design.',
              },
            ].map((row, i) => (
              <div key={row.gate} className={i < 2 ? 'border-b border-slate-100' : ''}>
                <div className="flex gap-4 items-start px-4 py-3">
                  <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold mt-0.5 ${row.badge}`}>
                    {row.gate}
                  </span>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{row.title}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{row.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 8 — CARE ECONOMY SIGNAL PREVIEW
        ══════════════════════════════════════════════════════════════════ */}
        <div className="avoid-break mb-8">
          <SectionHeading n="08" title="Care Economy Signal" sub="Preview — modulo non certificato in Foundation Light" />

          <div className="border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Preview metodologica
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                non certificato · Foundation Light v0.1
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Il Care Economy Signal è un indicatore direzionale aggregato che misura la presenza aziendale
              in programmi di supporto alla cura (caregiving, childcare, supporto familiare, flessibilità per caregiver).
              Non è un modulo attivo in Foundation Light — è una preview dell&apos;intelligenza disponibile in fasi successive.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Childcare & Supporto Famiglia',  desc: 'Presenza di programmi di supporto alla genitorialità e caregiving aziendale. Rilevanza: alta (pillar LIFE, LEGACY).' },
                { label: 'Equity di Accesso',              desc: 'I programmi care sono accessibili equamente a tutti i segmenti della workforce? Indicatore futuro — modulo premium.' },
                { label: 'Solo dati aggregati',            desc: 'Nessun dato familiare individuale è raccolto o elaborato. Aggregazioni solo sopra soglia N ≥ 10 per privacy.' },
                { label: 'Non certificato',                desc: 'Questo modulo non è validato empiricamente. Non usare per rendicontazione ESG o HR formale. Output direzionale.' },
              ].map((item) => (
                <div key={item.label} className="border border-slate-100 rounded p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-700">{item.label}</p>
                  <p className="text-[10px] text-slate-500 leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 font-mono">
              Care Economy Signal · preview · nessun dato familiare individuale · aggregato aziendale solo · non certificato
            </p>
          </div>
        </div>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 9 — PILLAR BALANCE & RECOMMENDATIONS
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break mb-8">
          <SectionHeading
            n="09"
            title="Distribuzione Pillar & Raccomandazioni"
            sub="Pillar = grammatica dell'impatto KORA · 5 pillar · Q1–Q3 2025"
          />

          {/* Pillar bars */}
          <div className="border border-slate-200 rounded-lg p-4 mb-5 space-y-2.5 avoid-break">
            {PILLARS.map((p) => (
              <BarRow
                key={p.code}
                label={p.code}
                pct={p.share}
                color={
                  p.code === 'LIFE'       ? 'bg-slate-700' :
                  p.code === 'GROWTH'     ? 'bg-slate-500' :
                  p.code === 'CONNECTION' ? 'bg-slate-400' :
                  p.code === 'IMPACT'     ? 'bg-slate-300' :
                                            'bg-slate-200'
                }
              />
            ))}
            <p className="text-[10px] text-slate-400 pt-1">
              LIFE dominante (44%) — parzialmente Economic Relief classificato Limited.
              CONNECTION (12%) e LEGACY (6%) sottorappresentati.
            </p>
          </div>

          {/* Recommendations */}
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Piano d&apos;azione — 90 giorni
          </p>
          <div className="space-y-2">
            {RECOMMENDATIONS.map((rec) => (
              <div key={rec.n} className="border border-slate-200 rounded-lg px-4 py-3 flex gap-4 items-start avoid-break">
                <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                    {rec.n}
                  </span>
                  <PriorityBadge p={rec.priority} />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800 leading-snug">{rec.title}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{rec.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 10 — METHODOLOGY & BOUNDARIES
        ══════════════════════════════════════════════════════════════════ */}
        <div className="avoid-break mb-8">
          <SectionHeading n="10" title="Metodologia & Confini" />

          <div className="border border-slate-200 rounded-lg px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                ['Metodologia',       `${METHOD_ID} · ${CALIB}`],
                ['Calibrazione',      'Delphi Study post-pilot — non ancora eseguita'],
                ['Dati',              'Sintetici demo — non dati reali aziendali'],
                ['Produzione',        'production_ready: false · Foundation Light v0.1'],
                ['Confidence Score',  'Esterno al KORA Index v3 · peso = 0 · indicatore affidabilità dati'],
                ['Activation Safeguard', 'Gate interpretivo — non componente del punteggio'],
                ['Causalità',         'Correlazione ≠ causalità — tutti i segnali KORA sono associativi'],
                ['Sorveglianza',      'Nessun dato individuale lavoratore esposto al datore di lavoro'],
                ['Privacy',           'N ≥ 10 per segmento · PIB worker-private · pseudonimizzazione'],
                ['Assurance ESG',     'KORA non garantisce conformità normativa ESG/CSR'],
                ['Consulenza',        'Non sostituisce consulenza legale, fiscale o assurance'],
                ['Output',            'Direzionale · non certificazione pubblica · non attestazione regolatoria'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-2 text-[11px]">
                  <span className="shrink-0 font-semibold text-slate-500 w-36">{label}</span>
                  <span className="text-slate-700 leading-snug">{value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-3">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
                Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
                Il Decision Pack è un output direzionale in pre_empirical_calibration. Revisione advisor KORA raccomandata prima di ogni uso formale.
              </p>
            </div>

            <p className="text-[10px] font-mono text-slate-400 pt-1">
              {METHOD_ID} · {CALIB} · production_ready: false · synthetic_demo_data: true · {GENERATED}
            </p>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between gap-4 text-[10px] text-slate-400">
          <span className="font-mono">{METHOD_ID} · {COMPANY} · {PERIOD}</span>
          <span className="no-print italic">Preview stampabile — usare il browser per Salva come PDF.</span>
          <span className="font-mono">pre_empirical_calibration</span>
        </div>

      </div>
    </>
  );
}
