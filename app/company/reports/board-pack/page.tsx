// C-07-BP: Board Pack Preview — print-ready, McKinsey-style strategic document
// Canonical S1 values — Meridiana Group Q1–Q3 2025 — KORA_DOCTRINE.md §4
// Static server component. No backend. No PDF library. Print-to-PDF via browser.

import Link from 'next/link';
import { PrintButton } from './PrintButton';

export const metadata = {
  title: 'Board Pack Preview — Meridiana Group — KORA Foundation Light',
};

// ── Canonical S1 constants ─────────────────────────────────────────────────────

const COMPANY   = 'Meridiana Group S.r.l.';
const PERIOD    = 'Q1–Q3 2025';
const SCENARIO  = 'S1 Baseline';
const METHOD_ID = 'KORA-METHOD-v0.1.0';
const CALIB     = 'pre_empirical_calibration';
const GENERATED = '1 ottobre 2025';

const KORA_INDEX        = 34;
const CS_PCT            = 60;
const SAFEGUARD         = 'WARNING';

const TOTAL_WORKERS     = 250;
const ACTIVE_WORKERS    = 93;
const MEANINGFUL_ACTIVE = 54;
const NEVER_ACTIVATED   = 157;   // 250 − 93
const TOP12_PCT_IU      = 64;
const BOTTOM50_PCT_IU   = 12;

const BUDGET_TOTAL           = 185_000;
const BUDGET_USED            = 112_000;
const DEEP_ACTIVATION_SPEND  = 58_000;
const ECONOMIC_RELIEF_SPEND  = 54_000;
const ACTIVATION_DEBT_EUR    = 45_000;
const COST_PER_IU            = 22.4;

const ELIGIBLE_RECORDS = 1_276;
const LIMITED_RECORDS  = 3_820;
const BLOCKED_RECORDS  = 318;

// ── Helpers ────────────────────────────────────────────────────────────────────

function eur(n: number) {
  return `€${n.toLocaleString('it-IT')}`;
}

// Section-level page footer (prints on every section)
function DocFooter({ page, of = 8 }: { page: number; of?: number }) {
  return (
    <div className="mt-8 pt-3 border-t border-[rgba(6,3,43,0.08)] flex items-center justify-between text-[9px] text-[rgba(6,3,43,0.40)] font-mono print-footer">
      <span>KORA Foundation Light · Decision Pack Preview · {COMPANY} · {PERIOD}</span>
      <span className="text-[rgba(6,3,43,0.28)] italic">Demo sintetica — non condividere come report certificato</span>
      <span>Pag. {page} / {of}</span>
    </div>
  );
}

// Exhibit-style label (consulting "Exhibit N — Title")
function Exhibit({ n, title, src }: { n: string; title: string; src?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[9px] uppercase tracking-[0.12em] text-[rgba(6,3,43,0.40)] font-semibold">
        Exhibit {n}{src ? ` · ${src}` : ''}
      </p>
      <p className="text-[11px] font-bold text-[rgba(6,3,43,0.78)] mt-0.5">{title}</p>
    </div>
  );
}

// Strong section heading: thick top rule + title
function SectionTitle({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <div className="border-t-2 border-[#06032B] pt-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[9px] font-mono text-[rgba(6,3,43,0.40)] uppercase tracking-widest">{n}</span>
          <h2 className="text-[15px] font-bold tracking-tight text-[#06032B] leading-tight">{title}</h2>
        </div>
        {sub && <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-0.5 ml-7">{sub}</p>}
      </div>
    </div>
  );
}

// Clean key metric — no card border, pure typographic
function KPI({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] uppercase tracking-[0.1em] text-[rgba(6,3,43,0.40)] font-semibold leading-none">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-[26px] font-bold text-[#06032B] leading-none tracking-tight">{value}</span>
        {unit && <span className="text-[11px] text-[rgba(6,3,43,0.52)] font-normal">{unit}</span>}
      </div>
      {note && <p className="text-[9px] text-[rgba(6,3,43,0.52)] leading-tight">{note}</p>}
    </div>
  );
}

// Inline bar (single-row horizontal bar)
function Bar({ label, pct, dark = false }: { label: string; pct: number; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-[10px] text-[rgba(6,3,43,0.62)] shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[rgba(6,3,43,0.05)] rounded-full">
        <div
          className={`h-1.5 rounded-full ${dark ? 'bg-[#06032B]' : 'bg-[rgba(6,3,43,0.35)]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-[10px] font-mono text-[rgba(6,3,43,0.52)]">{pct}%</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BoardPackPreview() {
  return (
    <>
      {/* ── Print & screen CSS ──────────────────────────────────────────────── */}
      <style>{`
        @media print {
          [role="banner"], header, aside, .no-print { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; height: auto !important; }
          body, html { background: white !important; height: auto !important; overflow: visible !important; }
          .bp-doc { max-width: 100% !important; box-shadow: none !important; margin: 0 !important; }
          .page-break { page-break-before: always; break-before: page; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
          .print-footer { display: flex !important; }
          table { border-collapse: collapse; }
          td, th { padding: 4px 8px !important; }
        }
        @page { size: A4 portrait; margin: 14mm 18mm; }
        .print-footer { }
      `}</style>

      {/* ── Screen-only top bar ─────────────────────────────────────────────── */}
      <div className="no-print mb-4 flex items-center justify-between gap-4 border-b border-[rgba(6,3,43,0.08)] pb-3">
        <Link
          href="/company/reports"
          className="text-xs text-[rgba(6,3,43,0.52)] hover:text-[#06032B] underline underline-offset-2 transition-colors"
        >
          ← Decision Pack Console
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-[rgba(6,3,43,0.40)] italic">
            Documento ottimizzato per stampa A4 · salva come PDF dal browser
          </p>
          <PrintButton />
        </div>
      </div>

      {/* ── Document body ───────────────────────────────────────────────────── */}
      <div className="bp-doc max-w-[794px] mx-auto bg-[#F8F6F1] text-[#06032B] pb-8">

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 1 — COVER
        ══════════════════════════════════════════════════════════════════ */}
        <div className="avoid-break min-h-[900px] flex flex-col px-1">

          {/* Top rule + eyebrow */}
          <div className="border-t-4 border-[#06032B] pt-5 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-[rgba(6,3,43,0.40)] font-semibold mb-1">
                  KORA Foundation Light · Decision Pack Preview
                </p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-[rgba(6,3,43,0.40)]">
                  Preparato per: Executive / HR / Finance / ESG
                </p>
              </div>
              <div className="text-right text-[9px] text-[rgba(6,3,43,0.40)] font-mono space-y-0.5">
                <p>Draft Preview · {GENERATED}</p>
                <p>{METHOD_ID}</p>
              </div>
            </div>
          </div>

          {/* Company + period */}
          <div className="mb-6">
            <h1 className="text-[42px] font-bold tracking-tight text-[#06032B] leading-none mb-2">
              {COMPANY}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold text-[rgba(6,3,43,0.62)] border border-[rgba(6,3,43,0.14)] rounded px-2 py-0.5">{PERIOD}</span>
              <span className="text-[11px] font-semibold text-[rgba(6,3,43,0.62)] border border-[rgba(6,3,43,0.14)] rounded px-2 py-0.5">{SCENARIO}</span>
              <span className="text-[11px] text-amber-700 border border-amber-200 bg-amber-50 rounded px-2 py-0.5">
                Bozza — revisione advisor richiesta
              </span>
            </div>
          </div>

          {/* Horizontal rule */}
          <div className="border-t border-[rgba(6,3,43,0.14)] mb-8" />

          {/* Thesis statement */}
          <div className="mb-10">
            <p className="text-[9px] uppercase tracking-[0.12em] text-[rgba(6,3,43,0.40)] font-semibold mb-2">
              Diagnosi principale
            </p>
            <p className="text-[22px] font-light text-[rgba(6,3,43,0.90)] leading-snug tracking-tight">
              La spesa esiste.<br />
              L&apos;attivazione significativa è ancora concentrata.
            </p>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-4 gap-6 mb-10">
            <div className="space-y-1 avoid-break">
              <p className="text-[9px] uppercase tracking-[0.1em] text-[rgba(6,3,43,0.40)] font-semibold">KORA Index v3</p>
              <p className="text-[52px] font-bold text-[#06032B] leading-none">{KORA_INDEX}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">/ 100 · pre-calibration</p>
            </div>
            <div className="space-y-1 avoid-break border-l border-[rgba(6,3,43,0.08)] pl-6">
              <p className="text-[9px] uppercase tracking-[0.1em] text-[rgba(6,3,43,0.40)] font-semibold">Confidence Score</p>
              <p className="text-[40px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{CS_PCT}%</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">esterno · peso 0</p>
            </div>
            <div className="space-y-1 avoid-break border-l border-[rgba(6,3,43,0.08)] pl-6">
              <p className="text-[9px] uppercase tracking-[0.1em] text-amber-600 font-semibold">Activation Safeguard</p>
              <p className="text-[28px] font-bold text-amber-700 leading-none mt-1">{SAFEGUARD}</p>
              <p className="text-[10px] text-amber-600">soglia CLEAR non raggiunta</p>
            </div>
            <div className="space-y-1 avoid-break border-l border-[rgba(6,3,43,0.08)] pl-6">
              <p className="text-[9px] uppercase tracking-[0.1em] text-[rgba(6,3,43,0.40)] font-semibold">Activation Debt</p>
              <p className="text-[28px] font-bold text-[#06032B] leading-none mt-1">{eur(ACTIVATION_DEBT_EUR)}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">budget non convertito in IU</p>
            </div>
          </div>

          {/* Document metadata */}
          <div className="mt-auto border-t border-[rgba(6,3,43,0.08)] pt-5">
            <div className="grid grid-cols-3 gap-6 text-[10px] text-[rgba(6,3,43,0.52)]">
              <div className="space-y-1">
                <p className="font-semibold text-[rgba(6,3,43,0.78)]">Preparato per</p>
                <p>Executive Leadership<br />HR · Finance · ESG</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[rgba(6,3,43,0.78)]">Preparato da</p>
                <p>KORA Foundation Light<br />Human Impact Intelligence Platform</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[rgba(6,3,43,0.78)]">Versione</p>
                <p className="font-mono">{METHOD_ID}<br />{CALIB}</p>
              </div>
            </div>
          </div>

          <DocFooter page={1} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 2 — EXECUTIVE SUMMARY
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break avoid-break px-1 pt-6">
          <SectionTitle n="01" title="Executive Summary" />

          {/* Memo header */}
          <div className="border border-[rgba(6,3,43,0.08)] rounded px-5 py-4 mb-5 text-[11px] avoid-break">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              {[
                ['A:', 'Executive Leadership · HR · Finance · ESG'],
                ['Da:', 'KORA Foundation Light'],
                ['Oggetto:', `${COMPANY} — Decision Pack ${PERIOD}`],
                ['Data:', GENERATED],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="font-semibold text-[rgba(6,3,43,0.52)] w-14 shrink-0">{k}</span>
                  <span className="text-[rgba(6,3,43,0.90)]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4 key findings */}
          <div className="grid grid-cols-4 gap-4 mb-6 avoid-break">
            <div className="border-t-2 border-[rgba(6,3,43,0.85)] pt-3 space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">KORA Index</p>
              <p className="text-[28px] font-bold text-[#06032B] leading-none">34<span className="text-[13px] font-normal text-[rgba(6,3,43,0.40)]">/100</span></p>
              <p className="text-[10px] text-[rgba(6,3,43,0.62)]">Activation Reach 30 · Quality 37 · Equity 40 · BTI 28</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.14)] pt-3 space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Attivazione</p>
              <p className="text-[28px] font-bold text-[#06032B] leading-none">38<span className="text-[13px] font-normal text-[rgba(6,3,43,0.40)]">%</span></p>
              <p className="text-[10px] text-[rgba(6,3,43,0.62)]">{NEVER_ACTIVATED} lavoratori mai attivati su {TOTAL_WORKERS}</p>
            </div>
            <div className="border-t-2 border-amber-400 pt-3 space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-amber-600 font-semibold">Safeguard</p>
              <p className="text-[28px] font-bold text-amber-700 leading-none">WARN</p>
              <p className="text-[10px] text-amber-700">AR 38% (soglia CLEAR: 40%)</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.14)] pt-3 space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Budget</p>
              <p className="text-[28px] font-bold text-[#06032B] leading-none">€185k</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.62)]">Utilizzato {eur(BUDGET_USED)} · Debt {eur(ACTIVATION_DEBT_EUR)}</p>
            </div>
          </div>

          {/* What this means */}
          <div className="mb-5 avoid-break">
            <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-2">Cosa significa</p>
            <p className="text-[12px] text-[rgba(6,3,43,0.78)] leading-relaxed">
              Meridiana Group investe in persone e welfare — ma l&apos;attivazione significativa è
              concentrata in una minoranza della workforce. Il top 12% dei lavoratori genera il {TOP12_PCT_IU}%
              degli Impact Units totali. Il {Math.round(NEVER_ACTIVATED / TOTAL_WORKERS * 100)}% della forza lavoro
              (157 persone su 250) non ha generato Impact Units nel periodo Q1–Q3 2025.
              Il Plant Bergamo ha un Activation Rate dell&apos;11% — il gap critico del portfolio.
              Il budget allocato esiste; la conversione in attivazione profonda è incompleta.
            </p>
          </div>

          {/* Three columns: risks / opportunities / decisions */}
          <div className="grid grid-cols-3 gap-5 avoid-break">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-2 border-b border-[rgba(6,3,43,0.08)] pb-1">
                Rischi principali
              </p>
              <ul className="space-y-2 text-[11px] text-[rgba(6,3,43,0.78)]">
                <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">1.</span>Plant Bergamo/Operations: AR 11% — rischio concentrazione attivazione in sede HQ.</li>
                <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">2.</span>48% del budget classificato Economic Relief (0 IU) — ROI people limitato.</li>
                <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">3.</span>Confidence Score 60% — dati parzialmente non verificati. Board Pack non certificabile senza revisione advisor.</li>
              </ul>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-2 border-b border-[rgba(6,3,43,0.08)] pb-1">
                Opportunità immediate
              </p>
              <ul className="space-y-2 text-[11px] text-[rgba(6,3,43,0.78)]">
                <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">1.</span>Riallocare €20k–25k da Economic Relief a programmi Eligible aumenta KORA Index stimato +8–12 punti.</li>
                <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">2.</span>Programmi LIFE+CONNECTION mirati a Plant Bergamo portano AR sopra soglia CLEAR.</li>
                <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">3.</span>Scenario S2 già modellato: KORA Index 54, Safeguard CLEAR — usarlo come target 6 mesi.</li>
              </ul>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-2 border-b border-[rgba(6,3,43,0.08)] pb-1">
                Decisioni necessarie
              </p>
              <ul className="space-y-2 text-[11px] text-[rgba(6,3,43,0.78)]">
                <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">1.</span>Autorizzare revisione advisor KORA prima della distribuzione formale del Board Pack.</li>
                <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">2.</span>Avviare workshop esecutivo per validare scenario S2 come target operativo Q4–Q1.</li>
              </ul>
            </div>
          </div>

          <DocFooter page={2} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 3 — KORA INDEX SNAPSHOT
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break px-1 pt-6">
          <SectionTitle
            n="02"
            title="KORA Index v3 — Snapshot"
            sub="4 macroblocchi · 9 componenti analitici · Confidence Score esterno"
          />

          {/* Macroblocks */}
          <Exhibit n="2.1" title="Decomposizione KORA Index per macroblocco" />
          <div className="grid grid-cols-4 gap-4 mb-6 avoid-break">
            {[
              { label: 'Activation Reach',      weight: 25, value: 30, comps: 'AR · MAR',           note: 'AR 38% · MAR 22%' },
              { label: 'Activation Quality',     weight: 30, value: 37, comps: 'NI · VR · CO',       note: 'NI 41 · VR 41 · CO 28' },
              { label: 'Distribution & Equity',  weight: 25, value: 40, comps: 'WB · PC · PB · EQ',  note: 'PC 60 · EQ 38' },
              { label: 'Budget-to-Human-Impact', weight: 20, value: 28, comps: 'BTI Engine',          note: `BTI Score ${ACTIVATION_DEBT_EUR > 0 ? 'limitato da Activation Debt' : ''}` },
            ].map((mb) => (
              <div key={mb.label} className="avoid-break border-t-2 border-[rgba(6,3,43,0.08)] pt-3 space-y-2">
                <div className="flex items-baseline justify-between gap-1">
                  <p className="text-[10px] font-bold text-[rgba(6,3,43,0.90)] leading-tight">{mb.label}</p>
                  <span className="text-[9px] font-mono text-[rgba(6,3,43,0.40)] shrink-0">peso {mb.weight}%</span>
                </div>
                <p className="text-[32px] font-bold text-[#06032B] leading-none">{mb.value}</p>
                <div className="h-1.5 bg-[rgba(6,3,43,0.05)] rounded-full">
                  <div className="h-1.5 bg-[rgba(6,3,43,0.65)] rounded-full" style={{ width: `${mb.value}%` }} />
                </div>
                <p className="text-[9px] font-mono text-[rgba(6,3,43,0.40)]">{mb.comps}</p>
                <p className="text-[9px] text-[rgba(6,3,43,0.52)]">{mb.note}</p>
              </div>
            ))}
          </div>

          {/* 10-component table */}
          <Exhibit n="2.2" title="Dettaglio 10 componenti — valori S1 Baseline" />
          <div className="avoid-break mb-4">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Cod.</th>
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Componente</th>
                  <th className="py-1.5 pr-4 text-right text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Valore</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Macroblocco</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: 'AR',  label: 'Activation Rate',           val: '38%',  mb: 'Activation Reach' },
                  { code: 'MAR', label: 'Meaningful Activation Rate', val: '22%',  mb: 'Activation Reach' },
                  { code: 'NI',  label: 'Normalized Intensity',       val: '41',   mb: 'Activation Quality' },
                  { code: 'VR',  label: 'Verification Rate',          val: '41',   mb: 'Activation Quality' },
                  { code: 'CO',  label: 'Continuity',                 val: '28',   mb: 'Activation Quality' },
                  { code: 'WB',  label: 'Worker Balance',             val: '29',   mb: 'Distribution & Equity' },
                  { code: 'PC',  label: 'Pillar Coverage',            val: '60',   mb: 'Distribution & Equity' },
                  { code: 'PB',  label: 'Pillar Balance',             val: '34',   mb: 'Distribution & Equity' },
                  { code: 'EQ',  label: 'Equity',                     val: '38',   mb: 'Distribution & Equity' },
                  { code: 'CS',  label: 'Confidence Score',           val: '60%',  mb: '— esterno, peso 0' },
                ].map((c) => (
                  <tr key={c.code} className={`border-b ${c.code === 'CS' ? 'border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]/40' : 'border-[rgba(6,3,43,0.05)]'}`}>
                    <td className="py-1.5 pr-4 font-mono font-bold text-[rgba(6,3,43,0.78)]">{c.code}</td>
                    <td className={`py-1.5 pr-4 ${c.code === 'CS' ? 'text-[rgba(6,3,43,0.52)] italic' : 'text-[rgba(6,3,43,0.90)]'}`}>{c.label}</td>
                    <td className={`py-1.5 pr-4 text-right font-mono font-bold ${c.code === 'CS' ? 'text-[rgba(6,3,43,0.40)]' : 'text-[#06032B]'}`}>{c.val}</td>
                    <td className={`py-1.5 text-[10px] ${c.code === 'CS' ? 'text-[rgba(6,3,43,0.40)] italic' : 'text-[rgba(6,3,43,0.52)]'}`}>{c.mb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CS external note */}
          <div className="border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] rounded px-4 py-3 avoid-break">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Confidence Score</p>
                <p className="text-[24px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{CS_PCT}%</p>
                <p className="text-[9px] text-[rgba(6,3,43,0.52)]">External indicator · weight 0</p>
              </div>
              <div className="text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed border-l border-[rgba(6,3,43,0.08)] pl-4">
                Il Confidence Score è <strong>esterno</strong> al KORA Index v3: peso = 0.
                Indica la qualità e completezza dei dati usati per il calcolo.
                CS 60% = dati parzialmente verificati — alcuni record basati su dichiarazione interna.
                Non influenza il KORA Index, ma deve essere mostrato in ogni output formale.
              </div>
            </div>
          </div>

          <DocFooter page={3} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 4 — ACTIVATION DEBT & WORKFORCE
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break px-1 pt-6">
          <SectionTitle
            n="03"
            title="Activation Debt & Forza Lavoro"
            sub="Vista aggregata azienda · nessun dato individuale · N ≥ 10 per segmento"
          />

          {/* Key metrics */}
          <div className="grid grid-cols-4 gap-6 mb-6 avoid-break">
            <KPI label="Forza lavoro" value={`${TOTAL_WORKERS}`} note="Meridiana Group S.r.l." />
            <KPI label="Lavoratori attivi" value={`${ACTIVE_WORKERS}`} unit={`AR ${Math.round(ACTIVE_WORKERS / TOTAL_WORKERS * 100)}%`} />
            <KPI label="Attivazione significativa" value={`${MEANINGFUL_ACTIVE}`} unit={`MAR ${Math.round(MEANINGFUL_ACTIVE / TOTAL_WORKERS * 100)}%`} />
            <KPI label="Mai attivati" value={`${NEVER_ACTIVATED}`} note={`${Math.round(NEVER_ACTIVATED / TOTAL_WORKERS * 100)}% della forza lavoro`} />
          </div>

          {/* IU concentration */}
          <Exhibit n="3.1" title="Concentrazione Impact Units — distribuzione aggregata interna" />
          <div className="mb-5 space-y-2.5 avoid-break border border-[rgba(6,3,43,0.05)] rounded px-4 py-4">
            <Bar label={`Top 12% (${Math.round(TOTAL_WORKERS * 0.12)} lav.)`} pct={TOP12_PCT_IU} dark />
            <Bar label="Fascia media (38–88%)" pct={100 - TOP12_PCT_IU - BOTTOM50_PCT_IU} />
            <Bar label="Bottom 50%" pct={BOTTOM50_PCT_IU} />
            <p className="text-[10px] text-[rgba(6,3,43,0.52)] pt-1">
              Il top 12% genera il {TOP12_PCT_IU}% degli Impact Units totali. Alta concentrazione = Activation Debt strutturale.
              Nessun nominativo. Nessun PIB individuale visibile.
            </p>
          </div>

          {/* Site gap table */}
          <Exhibit n="3.2" title="Activation Rate per sede — gap critico Plant Bergamo" />
          <div className="avoid-break mb-5">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Sede</th>
                  <th className="py-1.5 pr-4 text-right text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Lavoratori</th>
                  <th className="py-1.5 pr-4 text-right text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Activation Rate</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { site: 'Sede Milano (HQ)',    n: 100, ar: 60, status: 'CLEAR', flag: false },
                  { site: 'Plant Bergamo',        n: 90,  ar: 11, status: 'CRITICO', flag: true },
                  { site: 'Sede Torino',          n: 35,  ar: 38, status: 'WARNING', flag: false },
                  { site: 'Remoto / distribuito', n: 25,  ar: 55, status: 'CLEAR', flag: false },
                ].map((s) => (
                  <tr key={s.site} className={`border-b border-[rgba(6,3,43,0.05)] ${s.flag ? 'bg-red-50/60' : ''}`}>
                    <td className={`py-2 pr-4 font-semibold ${s.flag ? 'text-red-800' : 'text-[rgba(6,3,43,0.90)]'}`}>{s.site}</td>
                    <td className="py-2 pr-4 text-right font-mono text-[rgba(6,3,43,0.62)]">{s.n}</td>
                    <td className={`py-2 pr-4 text-right font-mono font-bold ${s.flag ? 'text-red-700' : s.ar >= 40 ? 'text-[rgba(6,3,43,0.90)]' : 'text-amber-700'}`}>{s.ar}%</td>
                    <td className="py-2">
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                        s.flag ? 'border-red-200 bg-red-50 text-red-700' :
                        s.status === 'CLEAR' ? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)]' :
                        'border-amber-200 bg-amber-50 text-amber-700'
                      }`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-1">Sedi con N &lt; 10 soppresse per safe_aggregation_threshold = 10. Nessun nominativo.</p>
          </div>

          {/* Implications */}
          <div className="border-t border-[rgba(6,3,43,0.08)] pt-4 avoid-break">
            <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-2">Implicazioni operative</p>
            <ul className="space-y-1.5 text-[11px] text-[rgba(6,3,43,0.78)]">
              <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">·</span>Plant Bergamo (90 lavoratori, AR 11%) richiede intervento prioritario. Senza azione, il gap sito/HQ si consolida.</li>
              <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">·</span>Worker Balance (WB = 29) segnala distribuzione irregolare degli IU — intervento di equità necessario.</li>
              <li className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">·</span>157 lavoratori mai attivati rappresentano il principale potenziale inespresso del portfolio.</li>
            </ul>
          </div>

          <DocFooter page={4} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 5 — BUDGET-TO-HUMAN-IMPACT + BUDGET EVIDENCE
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break px-1 pt-6">
          <SectionTitle
            n="04"
            title="Budget-to-Human-Impact"
            sub={`Peso KORA Index: 20% (macroblocco BTI) · Valore S1: 28/100 · ${PERIOD}`}
          />

          {/* BTI metrics */}
          <div className="grid grid-cols-3 gap-6 mb-6 avoid-break">
            <KPI label="Budget totale welfare/people" value={eur(BUDGET_TOTAL)} note="allocato Q1–Q3 2025" />
            <KPI label="Budget utilizzato" value={eur(BUDGET_USED)} note={`${Math.round(BUDGET_USED / BUDGET_TOTAL * 100)}% del totale allocato`} />
            <KPI label="Activation Debt" value={eur(ACTIVATION_DEBT_EUR)} note="budget non convertito in IU" />
            <KPI label="Deep Activation Spend" value={eur(DEEP_ACTIVATION_SPEND)} note={`${Math.round(DEEP_ACTIVATION_SPEND / BUDGET_USED * 100)}% del budget usato`} />
            <KPI label="Economic Relief Spend" value={eur(ECONOMIC_RELIEF_SPEND)} note={`${Math.round(ECONOMIC_RELIEF_SPEND / BUDGET_USED * 100)}% del budget usato · 0 IU`} />
            <KPI label="Costo per Impact Unit" value={`€${COST_PER_IU}`} note="deep_activation_spend / IU totali" />
          </div>

          {/* Segmented bar */}
          <Exhibit n="4.1" title={`Composizione budget utilizzato — ${eur(BUDGET_USED)}`} />
          <div className="h-8 rounded flex overflow-hidden border border-[rgba(6,3,43,0.08)] mb-2 avoid-break">
            <div
              className="bg-[#06032B] flex items-center justify-center"
              style={{ width: `${Math.round(DEEP_ACTIVATION_SPEND / BUDGET_USED * 100)}%` }}
            >
              <span className="text-[9px] font-bold text-white px-1">
                Deep Activation · {Math.round(DEEP_ACTIVATION_SPEND / BUDGET_USED * 100)}%
              </span>
            </div>
            <div className="bg-[rgba(6,3,43,0.35)] flex items-center justify-center flex-1">
              <span className="text-[9px] font-semibold text-white">
                Economic Relief · {Math.round(ECONOMIC_RELIEF_SPEND / BUDGET_USED * 100)}%
              </span>
            </div>
          </div>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)] mb-6">
            Economic Relief (buoni pasto, voucher, fringe) = 0 Impact Units. Tracciato come <span className="font-mono">economic_relief_spend</span> nel BTI Engine — non convertito in attivazione.
          </p>

          {/* Budget Evidence Quality */}
          <div className="border-t-2 border-[#06032B] pt-3 mb-3">
            <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-0.5">Budget Evidence Quality</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.52)]">Preview metodologica — valori non certificati nel dataset demo</p>
          </div>
          <Exhibit n="4.2" title="Qualità della fonte budget — distribuzione per tier" src="KORA Budget Evidence Model v0.1" />

          <div className="avoid-break mb-5">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Tier</th>
                  <th className="py-1.5 pr-4 text-right text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Share</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Descrizione</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tier: 'Documentato (L3–L4)',     pct: 62, desc: 'Fatture, contratti, accordi firmati, export provider verificato' },
                  { tier: 'Dichiarato (L1–L2)',       pct: 24, desc: 'Dichiarazione HR / reportistica interna — non verificato da terzi' },
                  { tier: 'Stimato (L0–L1)',          pct: 10, desc: 'Stima senza fonte strutturata — abbassa il Confidence Score' },
                  { tier: 'Non valorizzato / N/A',   pct: 4,  desc: 'Spesa non quantificata o non applicabile (programmi in natura)' },
                ].map((r) => (
                  <tr key={r.tier} className="border-b border-[rgba(6,3,43,0.05)]">
                    <td className="py-2 pr-4 font-semibold text-[rgba(6,3,43,0.90)]">{r.tier}</td>
                    <td className="py-2 pr-4 text-right font-mono font-bold text-[#06032B]">{r.pct}%</td>
                    <td className="py-2 text-[rgba(6,3,43,0.62)]">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-[rgba(6,3,43,0.08)] rounded px-4 py-3 avoid-break">
            <p className="text-[11px] font-bold text-[rgba(6,3,43,0.90)] mb-1">Il budget non è un dato valido se non ha una fonte.</p>
            <p className="text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed">
              La qualità della fonte budget determina il peso di ogni record nel BTI Engine.
              Un budget stimato o dichiarato riceve un trust score inferiore rispetto a uno documentato —
              questo si riflette nel Confidence Score (CS = {CS_PCT}% in questo scenario).
              Correlazione ≠ causalità. Budget invested ≠ Human impact.
            </p>
          </div>

          <DocFooter page={5} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 6 — ELIGIBILITY GATE + CARE ECONOMY SIGNAL
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break px-1 pt-6">
          <SectionTitle
            n="05"
            title="Eligibility Gate"
            sub="Classificazione metodologica di ogni record — nessuna discrezionalità"
          />

          {/* Gate counts */}
          <div className="grid grid-cols-3 gap-6 mb-6 avoid-break">
            <div className="border-t-2 border-[#06032B] pt-3">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-1">Eligible</p>
              <p className="text-[40px] font-bold text-[#06032B] leading-none">{ELIGIBLE_RECORDS.toLocaleString('it-IT')}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.62)] mt-1">record · generano Impact Units</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.14)] pt-3">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-1">Limited</p>
              <p className="text-[40px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{LIMITED_RECORDS.toLocaleString('it-IT')}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.62)] mt-1">record · 0 IU · solo BTI engine</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.08)] pt-3">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-1">Blocked</p>
              <p className="text-[40px] font-bold text-[rgba(6,3,43,0.40)] leading-none">{BLOCKED_RECORDS.toLocaleString('it-IT')}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-1">record · 0 IU · governance only</p>
            </div>
          </div>

          {/* Gate logic table */}
          <Exhibit n="5.1" title="Logica dell'Eligibility Gate — classificazione per record" />
          <div className="avoid-break mb-6">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Gate</th>
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Logica</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Esempi</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    gate: 'Eligible',
                    logic: 'Volontario, aggiuntivo rispetto al minimo legale, verificabile. Genera IU → KORA Index.',
                    ex: 'Upskilling, mentoring, prevenzione, supporto psicologico, volontariato, inclusione, KM transfer',
                  },
                  {
                    gate: 'Limited',
                    logic: 'Cash-like o fringe. 0 IU. Tracciato nel BTI Engine come economic_relief_spend. Non è spesa sbagliata — è spesa che può diventare più intelligente.',
                    ex: 'Buoni pasto, card carburante, voucher shopping, fringe benefit generici',
                  },
                  {
                    gate: 'Blocked',
                    logic: 'Compliance obbligatoria per legge (D.Lgs 81/08, DVR, DPI, GDPR mandatory). 0 IU per design. La conformità è una baseline, non impatto.',
                    ex: 'DVR, DUVRI, sorveglianza sanitaria obbligatoria, DPI, formazione sicurezza cogente',
                  },
                ].map((r, i) => (
                  <tr key={r.gate} className={i < 2 ? 'border-b border-[rgba(6,3,43,0.05)]' : ''}>
                    <td className="py-2.5 pr-4 align-top">
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                        r.gate === 'Eligible' ? 'border-[rgba(6,3,43,0.85)] bg-[#06032B] text-white' :
                        r.gate === 'Limited'  ? 'border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.78)]' :
                                                'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.40)]'
                      }`}>{r.gate}</span>
                    </td>
                    <td className="py-2.5 pr-4 align-top text-[rgba(6,3,43,0.78)]">{r.logic}</td>
                    <td className="py-2.5 align-top text-[rgba(6,3,43,0.52)]">{r.ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Care Economy Signal */}
          <div className="border-t-2 border-[rgba(6,3,43,0.08)] pt-4 avoid-break">
            <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-0.5">Care Economy Signal</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.52)] mb-3">Preview · modulo premium non attivo in Foundation Light · aggregato aziendale · nessun dato familiare individuale</p>

            <div className="grid grid-cols-2 gap-4 text-[11px]">
              {[
                { label: 'Childcare & Supporto Genitorialità', body: 'Presenza di programmi aziendali per genitori e caregivers. Pillar LIFE + LEGACY. Equity di accesso da verificare.' },
                { label: 'Flessibilità per Cura', body: 'Smart working strutturato, ROL aggiuntivi caregiver, diritto alla disconnessione. Già classificabili come Eligible se formalizzati.' },
                { label: 'Solo dati aggregati', body: 'Nessun dato familiare individuale raccolto. Aggregazioni sopra soglia N ≥ 10. Nessun profiling individuale.' },
                { label: 'Modulo non certificato', body: 'Non validato empiricamente. Non usare per rendicontazione ESG/HR formale. Output direzionale. Preview metodologica.' },
              ].map((item) => (
                <div key={item.label} className="border-l-2 border-[rgba(6,3,43,0.08)] pl-3 space-y-0.5">
                  <p className="font-semibold text-[rgba(6,3,43,0.78)]">{item.label}</p>
                  <p className="text-[rgba(6,3,43,0.52)]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <DocFooter page={6} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 7 — RECOMMENDATIONS & 90-DAY ROADMAP
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break px-1 pt-6">
          <SectionTitle
            n="06"
            title="Raccomandazioni & Piano 90 Giorni"
            sub="Output direzionale — non garantisce risultati · pre_empirical_calibration"
          />

          {/* Recommendations table */}
          <Exhibit n="6.1" title="Piano d'azione prioritario" />
          <div className="avoid-break mb-6">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-3 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Prior.</th>
                  <th className="py-1.5 pr-3 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Azione</th>
                  <th className="py-1.5 pr-3 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Effetto atteso</th>
                  <th className="py-1.5 pr-3 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Owner</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Orizzonte</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    p: 'Alta', action: 'Attivare programmi LIFE e CONNECTION per Plant Bergamo / Operations',
                    effect: 'AR Operations: da 11% verso soglia WARNING (20%). Riduce gap sito più critico.',
                    owner: 'HR · Plant Manager', horizon: '0–30 gg',
                  },
                  {
                    p: 'Alta', action: 'Ribilanciare €20k–25k da Economic Relief verso programmi Eligible',
                    effect: 'KORA Index stimato +8–12 punti. BTI Score migliora. Activation Debt ridotto.',
                    owner: 'HR · CFO', horizon: '30–60 gg',
                  },
                  {
                    p: 'Media', action: 'Rafforzare programmi GROWTH e CONNECTION su HQ e Torino',
                    effect: 'Pillar Balance (PB) migliora. Pillar Coverage mantiene 5/5. Growth sottorappresentato (27%).',
                    owner: 'HR · L&D', horizon: '30–60 gg',
                  },
                  {
                    p: 'Media', action: 'Completare revisione advisor KORA prima della distribuzione formale',
                    effect: 'CS può salire da 60% a 70%+. Board Pack diventa distribuibile formalmente.',
                    owner: 'HR · Advisor KORA', horizon: '0–30 gg',
                  },
                  {
                    p: 'Media', action: 'Raccogliere evidenze documentali per budget classificato Stimato (10%)',
                    effect: 'Abbatte Evidence Debt. CS migliora. BTI Engine più preciso.',
                    owner: 'Finance · HR', horizon: '30–60 gg',
                  },
                  {
                    p: 'Bassa', action: 'Validare scenario S2 come target operativo Q4–Q1 in workshop esecutivo',
                    effect: 'S2: KORA Index 54, Safeguard CLEAR. Framework decisionale per riallocazione budget.',
                    owner: 'C-Suite · HR', horizon: '60–90 gg',
                  },
                ].map((r, idx) => (
                  <tr key={idx} className={idx < 5 ? 'border-b border-[rgba(6,3,43,0.05)]' : ''}>
                    <td className="py-2 pr-3 align-top">
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                        r.p === 'Alta'  ? 'border-[rgba(6,3,43,0.85)] bg-[#06032B] text-white' :
                        r.p === 'Media' ? 'border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.78)]' :
                                          'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.40)]'
                      }`}>{r.p}</span>
                    </td>
                    <td className="py-2 pr-3 align-top font-semibold text-[rgba(6,3,43,0.90)]">{r.action}</td>
                    <td className="py-2 pr-3 align-top text-[rgba(6,3,43,0.62)]">{r.effect}</td>
                    <td className="py-2 pr-3 align-top text-[rgba(6,3,43,0.52)] whitespace-nowrap">{r.owner}</td>
                    <td className="py-2 align-top font-mono text-[rgba(6,3,43,0.52)] whitespace-nowrap">{r.horizon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 90-day cadence */}
          <Exhibit n="6.2" title="Cadenza operativa suggerita — 90 giorni" />
          <div className="avoid-break">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Fase</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Attività</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { phase: 'Settimane 1–2', activity: 'Revisione advisor KORA · Raccolta evidenze budget Stimato · Briefing HR su gap Plant Bergamo' },
                  { phase: 'Settimane 3–4', activity: 'Redesign programmi LIFE/CONNECTION per Operations · Riallocazione budget Relief→Eligible · Approvazione piano' },
                  { phase: 'Settimane 5–8', activity: 'Lancio programmi nuovi · Attivazione push Plant Bergamo · Monitoraggio AR settimanale' },
                  { phase: 'Settimane 9–12', activity: 'Misurazione intermedia · Scenario S2 — confronto direzionale · Workshop C-Suite · Preparazione Board Pack Q4' },
                ].map((r, i) => (
                  <tr key={i} className={i < 3 ? 'border-b border-[rgba(6,3,43,0.05)]' : ''}>
                    <td className="py-2 pr-4 font-semibold text-[rgba(6,3,43,0.78)] whitespace-nowrap align-top">{r.phase}</td>
                    <td className="py-2 text-[rgba(6,3,43,0.62)]">{r.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DocFooter page={7} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 8 — METHODOLOGY & BOUNDARIES
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page-break px-1 pt-6">
          <SectionTitle n="07" title="Metodologia & Confini" />

          <div className="avoid-break mb-5">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold w-44">Elemento</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Valore / nota</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Metodologia',          `${METHOD_ID} · ${CALIB}`],
                  ['Dati',                 'Sintetici demo — non dati reali di Meridiana Group'],
                  ['Produzione',           'production_ready: false · Foundation Light v0.1'],
                  ['Calibrazione',         'Delphi Study post-pilot — non ancora eseguita. Pesi v0.1 pre-empirici.'],
                  ['Confidence Score',     'Esterno al KORA Index v3 · peso = 0 · indicatore affidabilità dati'],
                  ['Activation Safeguard', 'Gate interpretivo — non una componente del punteggio KORA Index'],
                  ['Causalità',            'Correlazione ≠ causalità — tutti i segnali KORA sono associativi, non predittivi'],
                  ['Sorveglianza',         'Nessun dato individuale lavoratore esposto al datore di lavoro. PIB è worker-private.'],
                  ['Privacy',              'N ≥ 10 per segmento · pseudonimizzazione · PIB non visibile employer'],
                  ['Assurance ESG',        'KORA non garantisce conformità normativa ESG/CSR'],
                  ['Consulenza',           'Non sostituisce consulenza legale, fiscale o assurance esterna'],
                  ['Output',               'Direzionale · non certificazione pubblica · non attestazione regolatoria'],
                  ['Compliance',           'La conformità legale (Blocked) è una baseline, non impatto. KORA non la trasforma in IU.'],
                  ['Economic Relief',      'Budget Limited (buoni pasto, voucher) tracciato nel BTI Engine — 0 Impact Units per design'],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-[rgba(6,3,43,0.05)]">
                    <td className="py-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.62)] align-top">{label}</td>
                    <td className="py-1.5 text-[rgba(6,3,43,0.78)]">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-[rgba(6,3,43,0.08)] rounded px-4 py-3 avoid-break">
            <p className="text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed">
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
              Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
              Il Decision Pack è un output direzionale in {CALIB}. Revisione advisor KORA raccomandata prima di ogni uso formale.
            </p>
            <p className="text-[9px] font-mono text-[rgba(6,3,43,0.40)] mt-2">
              {METHOD_ID} · {CALIB} · production_ready: false · synthetic_demo_data: true · {GENERATED}
            </p>
          </div>

          <DocFooter page={8} />
        </div>

      </div>
    </>
  );
}
