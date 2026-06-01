// lib/decision-pack/html-template.ts
// B8/B12 — Board-Grade Decision Pack PDF.
// SERVER-SIDE ONLY — uses fs/path for logo embedding.
//
// Design: board memo / strategy consulting grade.
// No audit trail. No wall of text. No dashboard clutter.
// All values from PdfData — no hardcoding.
//
// Palette:
//   #06032B — deep navy (cover bg, strong text)
//   #6156F5 — KORA violet (accent, section markers)
//   #C8FF47 — KORA lime (single dot, cover only)
//   #F8F8FC — light surface, #eaebf4 borders, #9899b3 secondary

import fs from 'fs';
import path from 'path';
import type { PdfData } from './pdf-data';

function getLogoBase64(variant: 'white' | 'dark'): string {
  const file = variant === 'white' ? 'logo-white.png' : 'logo-dark.png';
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'kora', file));
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' }); }
  catch { return iso; }
}

function fmtDateTime(iso: string) {
  try { return new Date(iso).toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return iso; }
}

function fmtEur(n: number): string {
  return `€${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function sfColor(s: string) {
  if (s==='CLEAR')   return '#059669';
  if (s==='WARNING') return '#d97706';
  if (s==='FLAGGED') return '#dc2626';
  return '#6b7280';
}
function sfBg(s: string) {
  if (s==='CLEAR')   return '#ecfdf5';
  if (s==='WARNING') return '#fffbeb';
  if (s==='FLAGGED') return '#fef2f2';
  return '#f9fafb';
}
function sfLabel(s: string) {
  if (s==='CLEAR')   return '● CLEAR';
  if (s==='WARNING') return '○ WARNING';
  if (s==='FLAGGED') return '⊗ FLAGGED';
  return s;
}

// ── Pillar colors — readable in both color and B&W print ─────────────────────
const PILLAR_COLORS: Record<string, string> = {
  LIFE:       '#4A90D9',
  GROWTH:     '#6156F5',
  CONNECTION: '#8B72E0',
  IMPACT:     '#059669',
  LEGACY:     '#1E3A5F',
};

const PILLAR_FULL: Record<string, string> = {
  LIFE:       'LIFE — Salute & Benessere',
  GROWTH:     'GROWTH — Crescita & Formazione',
  CONNECTION: 'CONNECTION — Mentoring & Comunità',
  IMPACT:     'IMPACT — Impatto Territoriale',
  LEGACY:     'LEGACY — Trasferimento Conoscenza',
};

const PILLAR_ORDER = ['LIFE','GROWTH','CONNECTION','IMPACT','LEGACY'] as const;

export function buildDecisionPackHtml(data: PdfData): string {
  const logoWhite = getLogoBase64('white');
  const logoDark  = getLogoBase64('dark');
  const { meta, koraIndex, pillarDistribution, bti } = data;

  const sf       = koraIndex.safeguardStatus;
  const kiVal    = Math.round(koraIndex.value * 10) / 10;
  const arPct    = Math.round(koraIndex.activationRate * 100);
  const marPct   = Math.round(koraIndex.meaningfulActivationRate * 100);
  const csPct    = Math.round(koraIndex.confidenceScore * 100);
  const genDate  = fmtDate(meta.generatedAt);
  const genFull  = fmtDateTime(meta.generatedAt);

  // Pillar helpers
  const pillarTotal = pillarDistribution
    ? PILLAR_ORDER.reduce((s, k) => s + (pillarDistribution[k] ?? 0), 0)
    : 0;
  const pillarPct = (k: typeof PILLAR_ORDER[number]) =>
    pillarTotal > 0 ? Math.round(((pillarDistribution?.[k] ?? 0) / pillarTotal) * 100) : 0;

  // Sorted pillars for imbalance detection
  const pillarsSorted = pillarDistribution
    ? [...PILLAR_ORDER].sort((a, b) => (pillarDistribution[b] ?? 0) - (pillarDistribution[a] ?? 0))
    : null;
  const dominantPillar = pillarsSorted?.[0];
  const weakestPillar  = pillarsSorted?.[4];
  const dominantPct    = dominantPillar ? pillarPct(dominantPillar as typeof PILLAR_ORDER[number]) : 0;

  // Board memo statement — derived from live data
  const boardStatement =
    sf === 'CLEAR'   ? `Con un Activation Rate del ${arPct}% e Meaningful AR del ${marPct}%, l'organizzazione soddisfa i criteri dell'Activation Safeguard. Il KORA Index di ${kiVal}/100 indica un'attivazione organizzativa in progressione, con margini di miglioramento nella qualità e distribuzione.`
  : sf === 'WARNING' ? `Con un Activation Rate del ${arPct}% e Meaningful AR del ${marPct}%, l'organizzazione è in zona WARNING. Il KORA Index di ${kiVal}/100 è disponibile ma richiede attenzione: uno o più parametri non raggiungono ancora le soglie operative. È necessaria una revisione del perimetro di attivazione.`
  :                    `Activation Safeguard FLAGGED: AR ${arPct}%, MAR ${marPct}%. I parametri di attivazione sono sotto soglia minima. Il KORA Index di ${kiVal}/100 è generato in via preliminare — richiede revisione metodologica prima di qualsiasi uso decisionale.`;

  // Dynamic decisions — 3 max, data-driven ─────────────────────────────────
  const decisions: Array<{n:string; decision:string; implication:string; responsible:string}> = [];

  // Decision 1: activation strategy
  if (sf === 'CLEAR') {
    decisions.push({ n:'01',
      decision: 'Consolidare e scalare il programma di attivazione',
      implication: `Activation Safeguard CLEAR (AR ${arPct}%, MAR ${marPct}%). Il profilo è operativo. Il Board deve decidere se consolidare l'attuale perimetro o estendere il programma a nuovi segmenti workforce.`,
      responsible: 'HR Director',
    });
  } else if (sf === 'WARNING') {
    decisions.push({ n:'01',
      decision: 'Espandere il perimetro di attivazione',
      implication: `Con AR ${arPct}% e MAR ${marPct}% in zona WARNING, la maggioranza della workforce non è ancora attivata significativamente. Il Board deve decidere se allocare budget aggiuntivo o ridefinire il perimetro programma.`,
      responsible: 'HR Director · CFO',
    });
  } else {
    decisions.push({ n:'01',
      decision: 'Revisione immediata del programma',
      implication: `Activation Safeguard FLAGGED: parametri sotto soglia minima (AR ${arPct}%, MAR ${marPct}%). Prima di procedere con il pilot, il Board deve decidere se sospendere, ridisegnare o continuare con scope ridotto.`,
      responsible: 'CEO · HR Director',
    });
  }

  // Decision 2: budget / pillar based
  if (bti && bti.activationDebtEur > 0) {
    decisions.push({ n:'02',
      decision: 'Riallocare il budget people verso attivazione profonda',
      implication: `Activation Debt stimato: ${fmtEur(bti.activationDebtEur)}. Una quota del budget welfare (${fmtEur(bti.economicReliefSpend)}) è allocata a benefit monetari che non generano Impact Units. Il Board deve decidere se riallocare verso programmi eligible verificabili.`,
      responsible: 'CFO · HR Director',
    });
  } else if (pillarDistribution && dominantPillar && weakestPillar && dominantPct > 60) {
    decisions.push({ n:'02',
      decision: 'Riequilibrare la distribuzione dei pillar',
      implication: `Pillar dominante: ${dominantPillar} (${dominantPct}%). Pillar sotto-rappresentato: ${weakestPillar} (${pillarPct(weakestPillar as typeof PILLAR_ORDER[number])}%). Il Board deve decidere se bilanciare l'offerta programmi verso i pillar mancanti.`,
      responsible: 'HR Director',
    });
  } else {
    decisions.push({ n:'02',
      decision: 'Definire il perimetro del pilot reale',
      implication: 'Completare il Data Source Register e definire i segmenti workforce da includere. Ogni segmento rendicontato richiede N≥10 lavoratori (enforcement non negoziabile).',
      responsible: 'HR Director · KORA Advisor',
    });
  }

  // Decision 3: Decision Pack status promotion
  decisions.push({ n:'03',
    decision: 'Validare e promuovere questo Decision Pack',
    implication: `Questo pack è in stato "${esc(meta.decisionPackStatus)}". Prima di presentarlo a stakeholder, richiedere validazione advisor KORA. Lo stato deve essere promosso a "ready" dopo revisione metodologica formale.`,
    responsible: 'KORA Advisor · Board Secretary',
  });

  // ── CSS ────────────────────────────────────────────────────────────────────
  const css = `
    *{margin:0;padding:0;box-sizing:border-box;}
    @page{size:A4;margin:0;}
    body{
      font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
      color:#06032B; background:#fff;
      -webkit-print-color-adjust:exact; print-color-adjust:exact;
      font-size:10pt; line-height:1.55;
    }
    .page{
      width:210mm; position:relative; overflow:hidden;
      page-break-after:always; break-after:page;
    }

    /* ── COVER ─────────────────────────────────────────────────────────── */
    .cover{ background:#06032B; height:297mm; display:flex; flex-direction:column; }
    .cv-top{
      padding:30pt 40pt 0; display:flex; align-items:center;
      justify-content:space-between;
    }
    .cv-logo{ height:24pt; width:auto; }
    .cv-badge{
      font-size:6.5pt; font-weight:700; letter-spacing:.16em;
      text-transform:uppercase; color:rgba(255,255,255,.4);
      border:1px solid rgba(255,255,255,.14); padding:3.5pt 8pt; border-radius:2pt;
    }
    .cv-body{
      flex:1; display:flex; flex-direction:column;
      justify-content:center; padding:0 40pt 0;
    }
    .cv-eyebrow{
      font-size:7.5pt; font-weight:700; letter-spacing:.28em;
      text-transform:uppercase; color:#6156F5; margin-bottom:18pt;
    }
    /* Company name is the HERO — bigger than the product name */
    .cv-company{
      font-size:32pt; font-weight:700; color:#fff;
      letter-spacing:-.02em; line-height:1.05; margin-bottom:8pt;
    }
    .cv-product{
      font-size:12pt; font-weight:400; color:rgba(255,255,255,.42);
      letter-spacing:.04em; margin-bottom:32pt;
    }
    .cv-rule{ width:28pt; height:2pt; background:#6156F5; margin-bottom:28pt; }
    /* KI as visual anchor on cover */
    .cv-ki-block{ display:flex; align-items:baseline; gap:10pt; margin-bottom:22pt; }
    .cv-ki-num{
      font-size:64pt; font-weight:700; color:#fff;
      letter-spacing:-.04em; line-height:1;
    }
    .cv-ki-denom{ font-size:20pt; color:rgba(255,255,255,.35); font-weight:400; }
    .cv-ki-label{
      font-size:7pt; font-weight:700; letter-spacing:.2em;
      text-transform:uppercase; color:rgba(255,255,255,.35);
      align-self:flex-end; margin-bottom:6pt;
    }
    .cv-pills{ display:flex; gap:10pt; margin-bottom:28pt; flex-wrap:wrap; }
    .cv-sf{
      font-size:10.5pt; font-weight:700; letter-spacing:.04em;
      padding:6pt 14pt; border-radius:3pt;
    }
    .cv-cs{
      font-size:9pt; font-weight:600; color:rgba(255,255,255,.6);
      padding:7pt 14pt; border:1px solid rgba(255,255,255,.18);
      border-radius:3pt; display:flex; align-items:center; gap:6pt;
    }
    .cv-cs-val{ font-size:14pt; font-weight:700; color:#fff; }
    .cv-meta-row{
      display:flex; gap:24pt; flex-wrap:wrap;
    }
    .cv-ml{
      font-size:6.5pt; font-weight:700; letter-spacing:.18em;
      text-transform:uppercase; color:rgba(255,255,255,.28); margin-bottom:3pt;
    }
    .cv-mv{ font-size:10pt; font-weight:500; color:rgba(255,255,255,.72); }
    .cv-bottom{
      padding:16pt 40pt; border-top:1px solid rgba(255,255,255,.07);
      display:flex; align-items:center; justify-content:space-between;
    }
    .cv-disclaimer{
      font-size:6.5pt; color:rgba(255,255,255,.24);
      letter-spacing:.03em; line-height:1.45; max-width:320pt;
    }
    .cv-lime{ width:6pt; height:6pt; border-radius:50%; background:#C8FF47; flex-shrink:0; }

    /* ── CONTENT PAGE SHELL ────────────────────────────────────────────── */
    .cp{ background:#fff; padding:26pt 40pt 20pt; height:297mm; display:flex; flex-direction:column; }
    .ph{
      display:flex; align-items:center; justify-content:space-between;
      padding-bottom:12pt; border-bottom:1px solid #eaebf4; margin-bottom:20pt;
    }
    .ph-left{ display:flex; align-items:center; gap:8pt; }
    .ph-bar{ width:3pt; height:12pt; background:#6156F5; border-radius:1.5pt; }
    .ph-label{ font-size:7pt; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#6156F5; }
    .ph-right{ display:flex; align-items:center; gap:10pt; }
    .ph-company{ font-size:7.5pt; font-weight:600; color:#3d3a6a; }
    .ph-tenant{ font-size:6.5pt; color:#c7c8dc; letter-spacing:.06em; }
    .ph-logo{ height:14pt; width:auto; opacity:.55; }
    .pc{ flex:1; overflow:hidden; display:flex; flex-direction:column; }
    .pf{
      margin-top:auto; padding-top:10pt; border-top:1px solid #eaebf4;
      display:flex; align-items:center; justify-content:space-between;
    }
    .pf-text{ font-size:6.5pt; color:#b0b1cc; letter-spacing:.03em; }
    .pf-badge{
      font-size:6pt; font-weight:700; color:#d97706; background:#fffbeb;
      border:1px solid #fde68a; padding:2pt 6pt; border-radius:2pt;
    }

    /* ── BOARD MEMO HERO ───────────────────────────────────────────────── */
    .bm-statement{
      padding:16pt 20pt; background:#06032B; border-radius:5pt;
      margin-bottom:20pt;
    }
    .bm-stmt-label{
      font-size:6.5pt; font-weight:700; letter-spacing:.22em;
      text-transform:uppercase; color:rgba(255,255,255,.38); margin-bottom:8pt;
    }
    .bm-stmt-text{
      font-size:12pt; color:#F8F8FC; line-height:1.55;
      font-weight:400; letter-spacing:-.005em;
    }
    .bm-metrics{
      display:grid; grid-template-columns:1fr 1fr 1fr;
      gap:12pt; margin-bottom:16pt;
    }
    .bm-metric{ text-align:center; padding:16pt 10pt; }
    .bm-metric-label{
      font-size:7pt; font-weight:700; letter-spacing:.18em;
      text-transform:uppercase; color:#9899b3; margin-bottom:8pt;
    }
    .bm-metric-val{
      font-weight:700; color:#06032B;
      letter-spacing:-.03em; line-height:1;
    }
    .bm-metric-sub{ font-size:7.5pt; color:#9899b3; margin-top:4pt; }
    .bm-interp{
      padding:11pt 16pt; border-left:3pt solid ${sfColor(sf)}; background:${sfBg(sf)};
      border-radius:0 4pt 4pt 0; font-size:10pt; color:#3d3a6a; line-height:1.55;
    }

    /* ── ACTIVATION ARCHITECTURE ───────────────────────────────────────── */
    .aa-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14pt; margin-bottom:18pt; }
    .aa-card{
      padding:18pt 20pt; border:1px solid #eaebf4; border-radius:5pt; background:#fafafa;
    }
    .aa-card-hi{ border-color:#c7c4f8; background:#f5f4ff; }
    .aa-label{
      font-size:7pt; font-weight:700; letter-spacing:.18em;
      text-transform:uppercase; color:#9899b3; margin-bottom:8pt;
    }
    .aa-val{
      font-size:42pt; font-weight:700; color:#06032B;
      letter-spacing:-.03em; line-height:1;
    }
    .aa-unit{ font-size:14pt; color:#9899b3; font-weight:400; margin-left:3pt; }
    .aa-desc{ font-size:9pt; color:#555670; margin-top:6pt; line-height:1.5; }
    .aa-sf{
      display:inline-flex; align-items:center; gap:8pt;
      padding:10pt 18pt; border-radius:4pt; margin-bottom:16pt;
    }
    .aa-sf-label{ font-size:11pt; font-weight:700; letter-spacing:.04em; }
    .aa-context{
      padding:12pt 16pt; background:#f8f8fc; border:1px solid #eaebf4;
      border-radius:4pt; font-size:10pt; color:#555670; line-height:1.55;
    }

    /* ── PILLAR BALANCE ────────────────────────────────────────────────── */
    .pb-list{ display:flex; flex-direction:column; gap:14pt; margin-bottom:18pt; }
    .pb-row{ display:flex; flex-direction:column; gap:5pt; }
    .pb-head{ display:flex; justify-content:space-between; align-items:baseline; }
    .pb-name{ font-size:10pt; font-weight:700; color:#06032B; }
    .pb-pct{ font-size:12pt; font-weight:700; letter-spacing:-.01em; }
    .pb-track{ height:10pt; background:#eaebf4; border-radius:5pt; overflow:hidden; }
    .pb-fill{ height:10pt; border-radius:5pt; }
    .pb-count{ font-size:7pt; color:#9899b3; margin-top:2pt; }
    .pb-stub{
      padding:20pt; text-align:center; color:#9899b3; font-size:10pt;
      border:1px dashed #eaebf4; border-radius:4pt;
    }
    .pb-note{
      padding:10pt 14pt; background:#f5f4ff; border:1px solid #c7c4f8;
      border-radius:4pt; font-size:9.5pt; color:#3d3a6a; line-height:1.52;
    }

    /* ── FINANCIAL GOVERNANCE ──────────────────────────────────────────── */
    .fg-kpi-row{
      display:grid; grid-template-columns:1fr 1fr 1fr 1fr;
      gap:10pt; margin-bottom:18pt;
    }
    .fg-kpi{
      padding:14pt 12pt; border:1px solid #eaebf4; border-radius:4pt; background:#fafafa;
    }
    .fg-kpi-hi{ border-color:#c7c4f8; background:#f5f4ff; }
    .fg-kpi-warn{ border-color:#fde68a; background:#fffbeb; }
    .fg-kpi-label{
      font-size:6.5pt; font-weight:700; letter-spacing:.16em;
      text-transform:uppercase; color:#9899b3; margin-bottom:6pt;
    }
    .fg-kpi-val{
      font-size:18pt; font-weight:700; color:#06032B;
      letter-spacing:-.02em; line-height:1;
    }
    .fg-kpi-sub{ font-size:7.5pt; color:#9899b3; margin-top:3pt; }
    .fg-bar-section{ margin-bottom:18pt; }
    .fg-bar-lbl{
      font-size:7pt; font-weight:700; letter-spacing:.14em;
      text-transform:uppercase; color:#9899b3; margin-bottom:8pt;
    }
    .fg-stacked{ display:flex; height:16pt; border-radius:4pt; overflow:hidden; }
    .fg-seg-a{ background:#06032B; height:16pt; display:flex; align-items:center; justify-content:center; }
    .fg-seg-b{ background:#eaebf4; height:16pt; display:flex; align-items:center; justify-content:center; }
    .fg-seg-txt{ font-size:6.5pt; font-weight:700; color:#fff; padding:0 6pt; white-space:nowrap; overflow:hidden; }
    .fg-seg-txt-b{ font-size:6.5pt; font-weight:700; color:#9899b3; padding:0 6pt; white-space:nowrap; overflow:hidden; }
    .fg-legend{ display:flex; gap:14pt; margin-top:7pt; }
    .fg-leg{ display:flex; align-items:center; gap:4pt; font-size:7.5pt; color:#555670; }
    .fg-leg-dot{ width:7pt; height:7pt; border-radius:50%; flex-shrink:0; }
    .fg-stub{ padding:20pt; text-align:center; color:#9899b3; font-size:10pt; border:1px dashed #eaebf4; border-radius:4pt; }
    .fg-note{
      padding:11pt 14pt; background:#fffbeb; border:1px solid #fde68a;
      border-radius:4pt; font-size:9.5pt; color:#92400e; line-height:1.52;
    }

    /* ── EVIDENCE & CONFIDENCE ─────────────────────────────────────────── */
    .ev-cs-block{
      display:flex; align-items:center; gap:20pt;
      padding:20pt 24pt; background:#06032B; border-radius:5pt; margin-bottom:18pt;
    }
    .ev-cs-num{ font-size:52pt; font-weight:700; color:#fff; letter-spacing:-.04em; line-height:1; }
    .ev-cs-unit{ font-size:18pt; color:rgba(255,255,255,.4); font-weight:400; }
    .ev-cs-right{ flex:1; }
    .ev-cs-title{ font-size:7pt; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.38); margin-bottom:6pt; }
    .ev-cs-desc{ font-size:9.5pt; color:rgba(255,255,255,.65); line-height:1.5; }
    .ev-tier-grid{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10pt; margin-bottom:18pt; }
    .ev-tier{
      padding:12pt 14pt; border:1px solid #eaebf4; border-radius:4pt;
      text-align:center; background:#fafafa;
    }
    .ev-tier-label{ font-size:7pt; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#9899b3; margin-bottom:6pt; }
    .ev-tier-val{ font-size:13pt; font-weight:700; color:#06032B; }
    .ev-tier-sub{ font-size:7.5pt; color:#9899b3; margin-top:3pt; }
    .ev-not-list{ display:flex; flex-direction:column; gap:7pt; }
    .ev-not-item{ display:flex; gap:8pt; font-size:10pt; color:#555670; line-height:1.5; }
    .ev-not-x{ color:#dc2626; font-weight:700; flex-shrink:0; }

    /* ── DECISION AGENDA ───────────────────────────────────────────────── */
    .da-list{ display:flex; flex-direction:column; gap:12pt; }
    .da-item{
      display:flex; gap:14pt; align-items:flex-start;
      padding:14pt 18pt; border:1px solid #eaebf4; border-radius:5pt;
    }
    .da-n{
      font-size:20pt; font-weight:700; color:#6156F5;
      letter-spacing:-.02em; line-height:1; flex-shrink:0; width:22pt; margin-top:2pt;
    }
    .da-body{ flex:1; }
    .da-decision{ font-size:11pt; font-weight:700; color:#06032B; letter-spacing:-.01em; margin-bottom:5pt; }
    .da-impl{ font-size:9.5pt; color:#555670; line-height:1.55; margin-bottom:5pt; }
    .da-resp{ font-size:7.5pt; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#9899b3; }
    .da-note{
      margin-top:14pt; padding:10pt 14pt; background:#f8f8fc;
      border:1px solid #eaebf4; border-radius:4pt;
      font-size:8.5pt; color:#7778a0; line-height:1.5;
    }

    /* ── METHODOLOGY & PROVENANCE ──────────────────────────────────────── */
    .mp-grid{ display:grid; grid-template-columns:1fr 1fr; gap:9pt; margin-bottom:16pt; }
    .mp-item{
      padding:11pt 13pt; border:1px solid #eaebf4; border-radius:4pt;
      display:flex; gap:9pt; align-items:flex-start;
    }
    .mp-ic{ font-size:14pt; flex-shrink:0; line-height:1; margin-top:1pt; }
    .mp-title{ font-size:8.5pt; font-weight:700; color:#06032B; margin-bottom:2pt; }
    .mp-desc{ font-size:7.5pt; color:#7778a0; line-height:1.42; }
    .mp-csrdisclaimer{
      padding:12pt 16pt; background:#f5f4ff; border:1px solid #c7c4f8;
      border-radius:4pt; font-size:8.5pt; color:#3d3a6a; line-height:1.52;
      margin-bottom:16pt;
    }
    .mp-prov{
      padding:10pt 16pt; background:#f8f8fc; border:1px solid #eaebf4;
      border-radius:4pt; display:flex; flex-wrap:wrap; gap:20pt;
    }
    .mp-prov-item{ }
    .mp-prov-lbl{ font-size:6.5pt; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:#9899b3; margin-bottom:2pt; }
    .mp-prov-val{ font-size:8.5pt; font-weight:500; color:#3d3a6a; font-family:'Courier New',monospace; }
  `;

  // Page header helper (repeated on every content page)
  function pageHeader(label: string) {
    return `
  <div class="ph">
    <div class="ph-left"><div class="ph-bar"></div><span class="ph-label">${esc(label)}</span></div>
    <div class="ph-right">
      <span class="ph-company">${esc(meta.companyName)}</span>
      <span class="ph-tenant">${esc(meta.tenantCode)} &nbsp;·&nbsp; ${esc(meta.reportingPeriod)}</span>
      <img src="${logoDark}" class="ph-logo" alt="KORA">
    </div>
  </div>`;
  }

  // Page footer helper
  function pageFooter() {
    return `
  <div class="pf">
    <span class="pf-text">KORA Foundation Light &nbsp;·&nbsp; ${esc(meta.companyName)} &nbsp;·&nbsp; Not a Certification &nbsp;·&nbsp; Organization-Level Only</span>
    <span class="pf-badge">pre_empirical_calibration</span>
  </div>`;
  }

  // Pillar bar HTML builder
  function pillarBars(collapsed = false): string {
    if (!pillarDistribution || pillarTotal === 0) {
      return `<div class="pb-stub">Pillar analysis not available. Run scoring from approved UEF records to populate this section.</div>`;
    }
    const sorted = collapsed
      ? [...PILLAR_ORDER]
      : [...PILLAR_ORDER].sort((a, b) => (pillarDistribution[b] ?? 0) - (pillarDistribution[a] ?? 0));

    return `<div class="pb-list">
      ${sorted.map(k => {
        const pct = pillarPct(k as typeof PILLAR_ORDER[number]);
        const count = pillarDistribution[k as typeof PILLAR_ORDER[number]] ?? 0;
        const color = PILLAR_COLORS[k] ?? '#6156F5';
        return `
      <div class="pb-row">
        <div class="pb-head">
          <span class="pb-name">${esc(PILLAR_FULL[k] ?? k)}</span>
          <span class="pb-pct" style="color:${color};">${pct}%</span>
        </div>
        <div class="pb-track">
          <div class="pb-fill" style="width:${pct}%;background:${color};"></div>
        </div>
        <div class="pb-count">${count} eventi classificati</div>
      </div>`;
      }).join('')}
    </div>`;
  }

  // ── HTML OUTPUT ─────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>KORA Decision Pack — ${esc(meta.companyName)} — ${esc(meta.reportingPeriod)}</title>
<style>${css}</style>
</head>
<body>


<!-- ═══════════════════════════════════════════
     PAGE 1 — COVER
     Company as hero · KI as visual anchor
     ═══════════════════════════════════════════ -->
<div class="page cover">
  <div class="cv-top">
    <img src="${logoWhite}" class="cv-logo" alt="KORA">
    <span class="cv-badge">${esc(meta.syntheticData ? 'Synthetic Demo' : 'Foundation Light v0.1')}</span>
  </div>

  <div class="cv-body">
    <div class="cv-eyebrow">KORA Human Impact Intelligence Platform</div>

    <!-- Company name is the HERO — bigger than the product name -->
    <div class="cv-company">${esc(meta.companyName)}</div>
    <div class="cv-product">KORA Decision Pack &nbsp;·&nbsp; ${esc(meta.reportingPeriod)}</div>

    <div class="cv-rule"></div>

    <!-- KORA Index as visual anchor -->
    <div class="cv-ki-block">
      <span class="cv-ki-label">KORA Index v3</span>
      <span class="cv-ki-num">${kiVal}</span>
      <span class="cv-ki-denom">/100</span>
    </div>

    <div class="cv-pills">
      <span class="cv-sf" style="color:${sfColor(sf)};background:${sfBg(sf)};">${sfLabel(sf)}</span>
      <span class="cv-cs">
        <span style="font-size:7pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.38);">CS</span>
        <span class="cv-cs-val">${csPct}%</span>
        <span style="font-size:7pt;color:rgba(255,255,255,.3);">esterno</span>
      </span>
    </div>

    <div class="cv-meta-row">
      <div>
        <div class="cv-ml">Organizzazione</div>
        <div class="cv-mv">${esc(meta.companyName)}</div>
      </div>
      <div>
        <div class="cv-ml">Tenant</div>
        <div class="cv-mv" style="font-family:'Courier New',monospace;font-size:9pt;">${esc(meta.tenantCode)}</div>
      </div>
      <div>
        <div class="cv-ml">Periodo</div>
        <div class="cv-mv">${esc(meta.reportingPeriod)}</div>
      </div>
      <div>
        <div class="cv-ml">Generato il</div>
        <div class="cv-mv">${esc(genDate)}</div>
      </div>
    </div>
  </div>

  <div class="cv-bottom">
    <div class="cv-disclaimer">
      KORA misura l'attivazione organizzativa — non individui.
      Dati sintetici/demo · Foundation Light v0.1 · pre_empirical_calibration
      Non è una certificazione ESG · Non è consulenza legale o fiscale.
      ${esc(meta.decisionPackVersionId.slice(0, 40))}
    </div>
    <div class="cv-lime"></div>
  </div>
</div>


<!-- ═══════════════════════════════════════════
     PAGE 2 — BOARD MEMO
     Statement + 3 hero metrics
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Board Memo')}
  <div class="pc">

    <div class="bm-statement">
      <div class="bm-stmt-label">Cosa deve sapere il board</div>
      <div class="bm-stmt-text">${esc(boardStatement)}</div>
    </div>

    <div class="bm-metrics">
      <div class="bm-metric" style="border:1px solid #eaebf4;border-radius:5pt;">
        <div class="bm-metric-label">KORA Index v3</div>
        <div class="bm-metric-val" style="font-size:56pt;">${kiVal}</div>
        <div class="bm-metric-sub">/100 · ${esc(koraIndex.methodologyVersionId)}</div>
      </div>
      <div class="bm-metric" style="border:1px solid #c7c4f8;border-radius:5pt;background:#f5f4ff;">
        <div class="bm-metric-label">Confidence Score</div>
        <div class="bm-metric-val" style="font-size:40pt;color:#6156F5;">${csPct}%</div>
        <div class="bm-metric-sub">indicatore esterno · peso = 0</div>
      </div>
      <div class="bm-metric" style="border:1px solid ${sfColor(sf)}33;border-radius:5pt;background:${sfBg(sf)};">
        <div class="bm-metric-label">Activation Safeguard</div>
        <div class="bm-metric-val" style="font-size:22pt;color:${sfColor(sf)};">${sfLabel(sf)}</div>
        <div class="bm-metric-sub">AR ${arPct}% · MAR ${marPct}%</div>
      </div>
    </div>

    <div class="bm-interp">
      ${sf === 'CLEAR'   ? `L'organizzazione soddisfa i criteri dell'Activation Safeguard (AR ≥ 40%, MAR ≥ 30%). Il KORA Index è qualificato per output interpretativi nella fase pilot.`
      : sf === 'WARNING' ? `Activation Safeguard in zona WARNING. Il KORA Index è disponibile ma richiede analisi approfondita prima di qualsiasi uso decisionale formale.`
      :                    `Attenzione: parametri di attivazione sotto soglia minima. Il KORA Index è preliminare — non utilizzare per decisioni operative senza revisione metodologica.`}
    </div>

    <div style="margin-top:auto;padding-top:10pt;">
      <p style="font-size:7pt;color:#9899b3;letter-spacing:.03em;">
        Decision Pack Version: <span style="font-family:'Courier New',monospace;">${esc(meta.decisionPackVersionId.slice(0,36))}</span>
        &nbsp;·&nbsp; Status: <strong style="color:${meta.decisionPackStatus==='exported'?'#059669':meta.decisionPackStatus==='ready'?'#6156F5':'#d97706'};">${esc(meta.decisionPackStatus.toUpperCase())}</strong>
        &nbsp;·&nbsp; ${esc(koraIndex.calibrationStatus)}
      </p>
    </div>

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE 3 — ACTIVATION ARCHITECTURE
     AR/MAR hero + interpretation
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Activation Architecture')}
  <div class="pc">

    <div class="aa-grid">
      <div class="aa-card">
        <div class="aa-label">Activation Rate</div>
        <div>
          <span class="aa-val">${arPct}</span><span class="aa-unit">%</span>
        </div>
        <div class="aa-desc">Quota della workforce con almeno un evento attivato e verificato nel periodo.</div>
      </div>
      <div class="aa-card aa-card-hi">
        <div class="aa-label">Meaningful Activation Rate</div>
        <div>
          <span class="aa-val" style="color:#6156F5;">${marPct}</span><span class="aa-unit" style="color:#6156F5;">%</span>
        </div>
        <div class="aa-desc">Quota della workforce con attivazione sopra soglia di materialità — non solo presenza minima.</div>
      </div>
    </div>

    <div class="aa-sf" style="background:${sfBg(sf)};border:1.5px solid ${sfColor(sf)}44;">
      <span class="aa-sf-label" style="color:${sfColor(sf)};">${sfLabel(sf)}</span>
      <span style="font-size:9.5pt;color:#555670;">
        ${sf === 'CLEAR'   ? 'Soglie operative soddisfatte (AR ≥ 40%, MAR ≥ 30%). Output qualificato per interpretazione pilot.'
        : sf === 'WARNING' ? 'Uno o più parametri tra soglia minima e operativa. Analisi di allargamento partecipazione raccomandata.'
        :                    'Parametri sotto soglia minima (AR < 20% o MAR < 15%). Revisione perimetro necessaria prima di uso decisionale.'}
      </span>
    </div>

    <div class="aa-context">
      <strong style="display:block;margin-bottom:6pt;font-size:9.5pt;">Nota metodologica</strong>
      L'Activation Rate misura la distribuzione dell'attivazione sull'intera workforce — non la qualità dei singoli programmi.
      Un AR elevato con MAR basso indica partecipazione diffusa ma poco profonda.
      Un MAR elevato indica attivazione significativa per chi partecipa, ma potenzialmente concentrata.
      Entrambi i parametri devono essere letti in combinazione con il Pillar Balance e il BTI Score.
      <br><br>
      <strong>KORA non misura individui.</strong> Tutti i valori sono aggregati company-level.
      Nessun worker è identificabile in questo report.
    </div>

    <div style="margin-top:auto;">
      <p style="font-size:7.5pt;color:#9899b3;">
        Componenti KORA Index v3: ${koraIndex.componentCount > 0 ? koraIndex.componentCount : 10} / 10 &nbsp;·&nbsp;
        ${esc(koraIndex.methodologyVersionId)} &nbsp;·&nbsp; ${esc(koraIndex.calibrationStatus)}
      </p>
    </div>

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE 4 — PILLAR BALANCE
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Pillar Balance')}
  <div class="pc">

    <p style="font-size:10pt;color:#555670;line-height:1.6;margin-bottom:18pt;max-width:440pt;">
      Distribuzione dell'attivazione sui 5 pillar KORA per il periodo ${esc(meta.reportingPeriod)}.
      Output aggregato aziendale — nessun dato individuale. Evento classificato per pillar
      tramite tassonomia BCM.
    </p>

    ${pillarBars()}

    ${pillarDistribution && dominantPillar && dominantPct > 60 ? `
    <div class="pb-note">
      <strong>Nota squilibrio:</strong> Il pillar ${esc(dominantPillar)} rappresenta il ${dominantPct}% dell'attivazione classificata.
      Una distribuzione più equilibrata (Pillar Balance — PB) contribuisce positivamente al KORA Index v3.
      Considerare programmi nei pillar meno rappresentati.
    </div>` : ''}

    <div style="margin-top:auto;padding-top:10pt;">
      <p style="font-size:7.5pt;color:#9899b3;">
        Totale eventi classificati: <strong style="color:#06032B;">${pillarTotal > 0 ? pillarTotal : '—'}</strong>
        &nbsp;·&nbsp; Pillar Balance contribuisce al macroblocco Distribution &amp; Equity (25%)
      </p>
    </div>

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE 5 — FINANCIAL GOVERNANCE
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Financial Governance')}
  <div class="pc">

    <p style="font-size:10pt;color:#555670;line-height:1.6;margin-bottom:16pt;max-width:440pt;">
      Lettura informativa del rapporto tra budget people/welfare e attivazione verificata.
      Questa sezione non dimostra causalità, non garantisce ROI, non certifica compliance.
      Correlazione ≠ causalità.
    </p>

    ${bti ? `
    <div class="fg-kpi-row">
      <div class="fg-kpi fg-kpi-hi">
        <div class="fg-kpi-label">Budget People / Welfare</div>
        <div class="fg-kpi-val">${esc(fmtEur(bti.totalPeopleWelfareBudget))}</div>
        <div class="fg-kpi-sub">welfare, formazione, iniziative people</div>
      </div>
      <div class="fg-kpi" style="border-color:#6156F5;background:#f5f4ff;">
        <div class="fg-kpi-label">BTI Score</div>
        <div class="fg-kpi-val" style="color:#6156F5;font-size:22pt;">${bti.btiScore > 0 ? Math.round(bti.btiScore) : '—'}<span style="font-size:12pt;font-weight:400;color:#9899b3;">/100</span></div>
        <div class="fg-kpi-sub">Budget-to-Human-Impact</div>
      </div>
      <div class="fg-kpi fg-kpi-warn">
        <div class="fg-kpi-label">Activation Debt (stima)</div>
        <div class="fg-kpi-val" style="color:#92400e;">${bti.activationDebtEur > 0 ? esc(fmtEur(bti.activationDebtEur)) : '—'}</div>
        <div class="fg-kpi-sub">budget non convertito in attivazione</div>
      </div>
      <div class="fg-kpi">
        <div class="fg-kpi-label">Costo per Impact Unit</div>
        <div class="fg-kpi-val">${bti.costPerImpactUnit != null ? esc(fmtEur(bti.costPerImpactUnit)) : '—'}</div>
        <div class="fg-kpi-sub">solo budget-mediated · indicativo</div>
      </div>
    </div>

    ${bti.totalPeopleWelfareBudget > 0 ? (() => {
      const totalB = bti.totalPeopleWelfareBudget;
      const deepB  = Math.max(0, totalB - bti.economicReliefSpend);
      const deepPct = Math.round((deepB / totalB) * 100);
      const reliefPct = Math.round((bti.economicReliefSpend / totalB) * 100);
      return `
    <div class="fg-bar-section">
      <div class="fg-bar-lbl">Composizione spesa — Attivazione profonda vs Economic Relief</div>
      <div class="fg-stacked">
        <div class="fg-seg-a" style="width:${deepPct}%;">
          ${deepPct > 12 ? `<span class="fg-seg-txt">${deepPct}% Attivazione</span>` : ''}
        </div>
        <div class="fg-seg-b" style="width:${reliefPct}%;">
          ${reliefPct > 12 ? `<span class="fg-seg-txt-b">${reliefPct}% Relief</span>` : ''}
        </div>
      </div>
      <div class="fg-legend">
        <div class="fg-leg"><div class="fg-leg-dot" style="background:#06032B;"></div>Attivazione profonda (${deepPct}%)</div>
        <div class="fg-leg"><div class="fg-leg-dot" style="background:#eaebf4;border:1px solid #c7c8dc;"></div>Economic relief / benefit monetari (${reliefPct}%)</div>
      </div>
    </div>`;
    })() : ''}

    <div class="fg-note">
      <strong>Nota:</strong> L'Activation Debt è una stima direzionale — non garantito.
      Il BTI Score è un indicatore informativo: non dimostra causalità, non certifica ROI, non sostituisce analisi finanziaria indipendente.
      Economic relief (buoni pasto, voucher generici) non genera Impact Units ma è spesa welfare legittima.
    </div>

    ` : `
    <div class="fg-stub">
      Financial Governance non disponibile per questo batch.
      Verificare che il batch sia stato creato con file CSV contenente dati budget (importo, fonte)
      e che il BTI sia stato calcolato in fase di scoring.
    </div>
    `}

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE 6 — EVIDENCE & CONFIDENCE
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Evidence &amp; Confidence')}
  <div class="pc">

    <div class="ev-cs-block">
      <div>
        <span class="ev-cs-num">${csPct}</span><span class="ev-cs-unit">%</span>
      </div>
      <div class="ev-cs-right">
        <div class="ev-cs-title">Confidence Score &nbsp;·&nbsp; indicatore esterno</div>
        <div class="ev-cs-desc">
          Il Confidence Score misura la qualità e completezza delle evidenze disponibili.
          Non influenza il valore del KORA Index — è un indicatore esterno con peso = 0 nel calcolo.
          Va mostrato sempre affianco al KORA Index come segnale di affidabilità.
        </div>
      </div>
    </div>

    <div class="ev-tier-grid">
      <div class="ev-tier">
        <div class="ev-tier-label">Misurato</div>
        <div class="ev-tier-val" style="color:#059669;">AR · MAR · VR · WB</div>
        <div class="ev-tier-sub">calcolato dal motore KORA su dati verificati</div>
      </div>
      <div class="ev-tier">
        <div class="ev-tier-label">Stimato</div>
        <div class="ev-tier-val" style="color:#d97706;">BTI · Activation Debt</div>
        <div class="ev-tier-sub">direzionale · modello sintetico demo</div>
      </div>
      <div class="ev-tier">
        <div class="ev-tier-label">Non certificato</div>
        <div class="ev-tier-val" style="color:#6b7280;">ROI · ESG · Compliance</div>
        <div class="ev-tier-sub">fuori perimetro KORA Foundation Light</div>
      </div>
    </div>

    <p style="font-size:10pt;font-weight:700;color:#06032B;margin-bottom:10pt;">KORA non certifica:</p>
    <div class="ev-not-list">
      <div class="ev-not-item"><span class="ev-not-x">✕</span>Conformità normativa ESG, legale o fiscale</div>
      <div class="ev-not-item"><span class="ev-not-x">✕</span>Performance individuale dei lavoratori</div>
      <div class="ev-not-item"><span class="ev-not-x">✕</span>ROI garantito o relazione causale tra spesa e outcome</div>
      <div class="ev-not-item"><span class="ev-not-x">✕</span>Dati sanitari individuali — solo programmi aggregati</div>
      <div class="ev-not-item"><span class="ev-not-x">✕</span>Validità legale o assurance contabile</div>
    </div>

    <div style="margin-top:auto;padding-top:10pt;">
      <p style="font-size:7.5pt;color:#9899b3;">
        ${esc(koraIndex.calibrationStatus)} &nbsp;·&nbsp;
        Delphi Study calibration: post-pilot &nbsp;·&nbsp;
        ${esc(koraIndex.methodologyVersionId)}
      </p>
    </div>

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE 7 — DECISION AGENDA
     3 decisioni board-level · dati-driven
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Decision Agenda')}
  <div class="pc">

    <p style="font-size:10pt;color:#555670;line-height:1.6;margin-bottom:16pt;max-width:440pt;">
      Decisioni raccomandate basate sui dati di questo Decision Pack.
      Queste non sono istruzioni operative — sono input per la discussione board.
      Ogni decisione richiede validazione con il team KORA prima di implementazione.
    </p>

    <div class="da-list">
      ${decisions.map(d => `
      <div class="da-item">
        <div class="da-n">${esc(d.n)}</div>
        <div class="da-body">
          <div class="da-decision">${esc(d.decision)}</div>
          <div class="da-impl">${esc(d.implication)}</div>
          <div class="da-resp">→ ${esc(d.responsible)}</div>
        </div>
      </div>`).join('')}
    </div>

    <div class="da-note">
      <strong>Nota:</strong> Queste raccomandazioni sono generate automaticamente dai valori di questo Decision Pack.
      Non sono raccomandazioni operative certificate né consulenza professionale.
      Richiedono revisione advisor KORA prima di presentazione a board, stakeholder ESG o partner.
    </div>

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE 8 — METHODOLOGY & PROVENANCE
     Privacy boundary + technical audit
     ═══════════════════════════════════════════ -->
<div class="page cp" style="page-break-after:avoid;break-after:avoid;">
  ${pageHeader('Methodology &amp; Provenance')}
  <div class="pc">

    <div class="mp-grid">
      <div class="mp-item">
        <div class="mp-ic">🔒</div>
        <div>
          <div class="mp-title">Organization-Level Only</div>
          <div class="mp-desc">Il KORA Index è un output aziendale aggregato. Nessun worker è identificabile. Nessun ranking individuale.</div>
        </div>
      </div>
      <div class="mp-item">
        <div class="mp-ic">🛡️</div>
        <div>
          <div class="mp-title">N≥10 Privacy Threshold</div>
          <div class="mp-desc">Ogni segmento workforce è rendicontato solo se conta ≥10 lavoratori. Sotto soglia: soppresso o raggruppato.</div>
        </div>
      </div>
      <div class="mp-item">
        <div class="mp-ic">🏗️</div>
        <div>
          <div class="mp-title">PII Guard Attivo</div>
          <div class="mp-desc">Ogni payload in ingresso è analizzato per PII. Rilevamenti rilevati sono redatti o bloccati prima della persistenza.</div>
        </div>
      </div>
      <div class="mp-item">
        <div class="mp-ic">📊</div>
        <div>
          <div class="mp-title">Confidence Score Esterno</div>
          <div class="mp-desc">Il CS non è un componente del KORA Index v3 (peso = 0). È un indicatore di qualità dati — sempre mostrato affianco all'indice.</div>
        </div>
      </div>
      <div class="mp-item">
        <div class="mp-ic">⚗️</div>
        <div>
          <div class="mp-title">Pre-Empirical Calibration</div>
          <div class="mp-desc">I pesi v0.1 sono provvisori. Calibrazione definitiva post-pilot (Delphi Study). Output direzionale, non certificato.</div>
        </div>
      </div>
      <div class="mp-item">
        <div class="mp-ic">🚫</div>
        <div>
          <div class="mp-title">No Worker Surveillance</div>
          <div class="mp-desc">KORA misura l'attivazione organizzativa, non individui. Il PIB individuale è privato al lavoratore. Mai visibile al datore.</div>
        </div>
      </div>
    </div>

    <div class="mp-csrdisclaimer">
      KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
      Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
    </div>

    <div class="mp-prov">
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Organizzazione</div>
        <div class="mp-prov-val">${esc(meta.companyName)}</div>
      </div>
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Tenant Code</div>
        <div class="mp-prov-val">${esc(meta.tenantCode)}</div>
      </div>
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Periodo</div>
        <div class="mp-prov-val">${esc(meta.reportingPeriod)}</div>
      </div>
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Generato il</div>
        <div class="mp-prov-val">${esc(genFull)}</div>
      </div>
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Version ID</div>
        <div class="mp-prov-val" style="word-break:break-all;">${esc(meta.decisionPackVersionId.slice(0,38))}…</div>
      </div>
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Metodologia</div>
        <div class="mp-prov-val">${esc(koraIndex.methodologyVersionId)}</div>
      </div>
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Calibrazione</div>
        <div class="mp-prov-val">${esc(koraIndex.calibrationStatus)}</div>
      </div>
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Status</div>
        <div class="mp-prov-val">${esc(meta.decisionPackStatus.toUpperCase())}</div>
      </div>
    </div>

  </div>
  ${pageFooter()}
</div>


</body>
</html>`;
}
