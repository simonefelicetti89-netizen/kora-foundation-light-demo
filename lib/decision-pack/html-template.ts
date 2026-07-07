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
import {
  activationOpportunityService,
  deriveSignalsSlim,
  type ActivationOpportunity,
  type OpportunityPriority,
} from '@/services/activation-opportunity/ActivationOpportunityService';
import { getMacroblockStatusForScore } from '@/lib/methodology-config/v0.1';

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

// ── Executive brief page — B77-B ─────────────────────────────────────────────
// Board-readable one-pager. No jargon. No formulas. Fits one printed page.

function buildExecutiveBriefPage(data: PdfData): string {
  const { meta, executiveBrief } = data;
  if (!executiveBrief) return '';

  const sfColor = data.koraIndex.safeguardStatus === 'CLEAR' ? '#059669'
    : data.koraIndex.safeguardStatus === 'WARNING' ? '#d97706' : '#dc2626';
  const sfBg = data.koraIndex.safeguardStatus === 'CLEAR' ? '#ecfdf5'
    : data.koraIndex.safeguardStatus === 'WARNING' ? '#fffbeb' : '#fef2f2';

  const rows: Array<{ label: string; content: string; accent?: boolean }> = [
    { label: 'PERCHÉ',               content: executiveBrief.primaryConstraint },
    { label: 'OPPORTUNITÀ PRINCIPALE', content: executiveBrief.wasteSignal },
    { label: 'AZIONE PRIORITARIA',   content: executiveBrief.primaryAction, accent: true },
  ];

  const rowsHtml = rows.map(({ label, content, accent }) => `
    <tr>
      <td style="padding:14px 16px 14px 0;width:180px;vertical-align:top;border-bottom:1px solid #eaebf4;">
        <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${accent ? '#C76F3D' : '#9899b3'};">${esc(label)}</span>
      </td>
      <td style="padding:14px 0;vertical-align:top;border-bottom:1px solid #eaebf4;">
        <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:${accent ? '600' : '400'};line-height:1.6;color:${accent ? '#06032B' : '#4b4c6a'};">${esc(content)}</span>
      </td>
    </tr>
  `).join('');

  return `
  <div style="page-break-before:always;min-height:100vh;padding:56px 72px;background:#F8F8FC;font-family:'Plus Jakarta Sans',sans-serif;box-sizing:border-box;">

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:20px;border-bottom:2px solid #06032B;">
      <div>
        <p style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9899b3;margin:0 0 6px;">Executive Brief — KORA Intelligence™</p>
        <h1 style="font-size:26px;font-weight:400;color:#06032B;letter-spacing:-0.02em;margin:0 0 4px;">${esc(meta.companyName)}</h1>
        <p style="font-size:12px;color:#9899b3;margin:0;">${esc(meta.reportingPeriod)} · ${esc(fmtDate(meta.generatedAt))}</p>
      </div>
      <div style="text-align:right;">
        <span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:#f0f0f9;color:#6156F5;border:1px solid #d4d2f8;">pre_empirical_calibration</span>
      </div>
    </div>

    <!-- Status -->
    <div style="background:${sfBg};border:1px solid ${sfColor}22;border-radius:10px;padding:20px 24px;margin-bottom:32px;">
      <p style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${sfColor};margin:0 0 6px;">COME STIAMO</p>
      <p style="font-size:22px;font-weight:700;color:${sfColor};margin:0 0 10px;letter-spacing:-0.01em;">${esc(executiveBrief.organizationStatus)}</p>
      <p style="font-size:12px;color:#4b4c6a;line-height:1.65;margin:0;">
        KORA Index™: <strong style="color:#06032B;">${Math.round(data.koraIndex.value * 10) / 10}/100</strong>
        &nbsp;·&nbsp;Activation Safeguard: <strong style="color:${sfColor};">${esc(data.koraIndex.safeguardStatus)}</strong>
        &nbsp;·&nbsp;Data Reliability Index™: <strong style="color:#06032B;">${Math.round(data.koraIndex.confidenceScore * 100)}%</strong>
      </p>
    </div>

    <!-- Four questions table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
      <tbody>${rowsHtml}</tbody>
    </table>

    <!-- Confidence note -->
    <div style="background:#f0f0f9;border-radius:8px;padding:14px 20px;margin-bottom:24px;">
      <p style="font-size:11px;color:#4b4c6a;line-height:1.55;margin:0;">${esc(executiveBrief.confidenceNote)}</p>
    </div>

    <!-- Footer disclaimer -->
    <p style="font-size:9.5px;color:#9899b3;line-height:1.6;margin:0;padding-top:16px;border-top:1px solid #eaebf4;">
      Questo brief è generato da KORA Foundation Light (pre_empirical_calibration). I valori sono diagnostici e di pilota — non certificati, non regulatory-grade. Non sostituisce analisi HR, consulenza legale, fiscale o ESG. KORA misura l'attivazione a livello organizzativo, non individuale.
    </p>

  </div>`;
}

export function buildDecisionPackHtml(data: PdfData): string {
  const logoWhite = getLogoBase64('white');
  const logoDark  = getLogoBase64('dark');
  const { meta, koraIndex, pillarDistribution, bti, iuSummary, pibAggregation, enrichment, reportingAlignment, reportingReadiness, normativeMappingLight, components, macroblocks, contributionSummary } = data;

  const sf       = koraIndex.safeguardStatus;
  const kiVal    = Math.round(koraIndex.value * 10) / 10;
  const arPct    = Math.round(koraIndex.activationRate * 100);
  const marPct   = Math.round(koraIndex.meaningfulActivationRate * 100);
  // B24: relief gap — difference attributable to limited/economic relief records
  const reliefGapPct = arPct - marPct;
  const reliefGapWarning = reliefGapPct > 20;
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
  // B24: board statement leads with MAR (primary signal), then AR (broad reach).
  // When reliefGapPct > 20pp, the statement explicitly notes economic relief inflation.
  const reliefNote = reliefGapWarning
    ? ` Il gap di ${reliefGapPct}pp tra AR e MAR è attribuibile principalmente a benefit economici ad ampia copertura (voucher, fringe benefit) che non generano attivazione profonda.`
    : '';
  const boardStatement =
    sf === 'CLEAR'
      ? `Meaningful Activation Rate del ${marPct}% (segnale primario) e Activation Rate del ${arPct}% (reach complessivo incluso economic relief). L'organizzazione soddisfa i criteri dell'Activation Safeguard. Il KORA Index di ${kiVal}/100 indica un'attivazione organizzativa in progressione, con margini di miglioramento nella qualità e distribuzione.${reliefNote}`
    : sf === 'WARNING'
      ? `Meaningful Activation Rate del ${marPct}% (segnale primario) e Activation Rate del ${arPct}% (reach complessivo) in zona WARNING. Il KORA Index di ${kiVal}/100 è disponibile ma richiede attenzione: uno o più parametri non raggiungono ancora le soglie operative. È necessaria una revisione del perimetro di attivazione.${reliefNote}`
    :   `Activation Safeguard FLAGGED: MAR ${marPct}% (segnale primario), AR ${arPct}% (reach complessivo). I parametri di attivazione sono sotto soglia minima. Il KORA Index di ${kiVal}/100 è generato in via preliminare — richiede revisione metodologica prima di qualsiasi uso decisionale.${reliefNote}`;

  // Dynamic decisions — 3 max, data-driven ─────────────────────────────────
  const decisions: Array<{n:string; decision:string; implication:string; responsible:string}> = [];

  // Decision 1: activation strategy
  if (sf === 'CLEAR') {
    decisions.push({ n:'01',
      decision: 'Consolidare e scalare il programma di attivazione',
      implication: `Activation Safeguard CLEAR (MAR ${marPct}% — segnale primario · AR ${arPct}% — reach complessivo). Il profilo è operativo. Il Board deve decidere se consolidare l'attuale perimetro o estendere il programma a nuovi segmenti workforce.`,
      responsible: 'HR Director',
    });
  } else if (sf === 'WARNING') {
    decisions.push({ n:'01',
      decision: 'Espandere il perimetro di attivazione',
      implication: `Con MAR ${marPct}% (segnale primario) e AR ${arPct}% (reach complessivo) in zona WARNING, la maggioranza della workforce non è ancora attivata significativamente. Il Board deve decidere se allocare budget aggiuntivo o ridefinire il perimetro programma.`,
      responsible: 'HR Director · CFO',
    });
  } else {
    decisions.push({ n:'01',
      decision: 'Revisione immediata del programma',
      implication: `Activation Safeguard FLAGGED: parametri sotto soglia minima (MAR ${marPct}% — segnale primario · AR ${arPct}%). Prima di procedere con il pilot, il Board deve decidere se sospendere, ridisegnare o continuare con scope ridotto.`,
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
      width:210mm; position:relative;
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
    .cp{ background:#fff; padding:26pt 40pt 20pt; min-height:297mm; display:flex; flex-direction:column; }
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
    .pc{ flex:1; display:flex; flex-direction:column; }
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
    .bm-metric{ text-align:center; padding:16pt 10pt; break-inside:avoid; }
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
      break-inside:avoid;
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
    /* ── B24: Reach Semantics ──────────────────────────────────────────────── */
    .rs-block{
      padding:12pt 16pt; border:1px solid #eaebf4; border-radius:4pt;
      margin-bottom:14pt; background:#fafafa; break-inside:avoid;
    }
    .rs-block-warn{ border-color:#fde68a; background:#fffbeb; }
    .rs-title{
      font-size:7pt; font-weight:700; letter-spacing:.2em;
      text-transform:uppercase; color:#9899b3; margin-bottom:10pt;
    }
    .rs-row{
      display:flex; justify-content:space-between; align-items:baseline;
      padding:4pt 0; border-bottom:1px solid #eaebf4;
    }
    .rs-row:last-child{ border-bottom:none; }
    .rs-label{ font-size:9pt; color:#555670; }
    .rs-label-primary{ font-size:9pt; font-weight:700; color:#06032B; }
    .rs-val{ font-size:11pt; font-weight:700; color:#06032B; }
    .rs-val-primary{ font-size:13pt; font-weight:700; color:#6156F5; }
    .rs-val-gap{ font-size:11pt; font-weight:700; }
    .rs-badge{
      font-size:7pt; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
      padding:2pt 6pt; border-radius:2pt; margin-left:6pt;
    }
    .rs-note{ font-size:8.5pt; color:#92400e; margin-top:8pt; line-height:1.5; }

    /* ── PILLAR BALANCE ────────────────────────────────────────────────── */
    .pb-list{ display:flex; flex-direction:column; gap:14pt; margin-bottom:18pt; }
    .pb-row{ display:flex; flex-direction:column; gap:5pt; break-inside:avoid; }
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
      break-inside:avoid;
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
    .fg-seg-c{ background:#fde68a; height:16pt; display:flex; align-items:center; justify-content:center; }
    .fg-seg-d{ background:#eaebf4; height:16pt; display:flex; align-items:center; justify-content:center; }
    .fg-seg-txt-c{ font-size:6.5pt; font-weight:700; color:#92400e; padding:0 6pt; white-space:nowrap; overflow:hidden; }
    .fg-seg-txt-d{ font-size:6.5pt; font-weight:700; color:#9899b3; padding:0 6pt; white-space:nowrap; overflow:hidden; }
    .fg-class-grid{
      display:grid; grid-template-columns:1fr 1fr 1fr 1fr;
      gap:8pt; margin-top:10pt; margin-bottom:14pt;
    }
    .fg-class-card{
      padding:10pt 12pt; border:1px solid #eaebf4; border-radius:4pt; background:#fafafa;
      break-inside:avoid;
    }
    .fg-class-label{ font-size:6.5pt; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#9899b3; margin-bottom:5pt; }
    .fg-class-count{ font-size:16pt; font-weight:700; color:#06032B; letter-spacing:-.02em; line-height:1; }
    .fg-class-amount{ font-size:7.5pt; color:#7778a0; margin-top:3pt; }
    .fg-board-note{
      padding:11pt 14pt; background:#f5f4ff; border:1px solid #c7c4f8;
      border-radius:4pt; font-size:9pt; color:#3d3a6a; line-height:1.52; margin-bottom:12pt;
      break-inside:avoid;
    }
    .fg-warning{
      padding:10pt 14pt; background:#fef2f2; border:1px solid #fca5a5;
      border-radius:4pt; font-size:9pt; color:#991b1b; line-height:1.52; margin-bottom:10pt;
      break-inside:avoid;
    }

    /* ── EVIDENCE ENRICHMENT ───────────────────────────────────────────────── */
    .ev-enrich-section{ margin-top:14pt; }
    .ev-enrich-title{ font-size:8pt; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#9899b3; margin-bottom:10pt; }
    .ev-lvl-row{ display:flex; gap:8pt; margin-bottom:10pt; }
    .ev-lvl-card{
      flex:1; padding:10pt 8pt; border:1px solid #eaebf4; border-radius:4pt;
      text-align:center; background:#fafafa; break-inside:avoid;
    }
    .ev-lvl-label{ font-size:6.5pt; font-weight:700; letter-spacing:.12em; text-transform:uppercase; margin-bottom:5pt; }
    .ev-lvl-count{ font-size:18pt; font-weight:700; letter-spacing:-.02em; line-height:1; }
    .ev-meta-row{ display:flex; gap:10pt; margin-bottom:12pt; flex-wrap:wrap; }
    .ev-meta-card{
      padding:10pt 14pt; border:1px solid #eaebf4; border-radius:4pt; background:#fafafa; flex:1; min-width:100pt;
      break-inside:avoid;
    }
    .ev-meta-label{ font-size:6.5pt; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#9899b3; margin-bottom:5pt; }
    .ev-meta-val{ font-size:16pt; font-weight:700; color:#06032B; letter-spacing:-.02em; line-height:1; }
    .ev-meta-sub{ font-size:7pt; color:#9899b3; margin-top:3pt; }
    .ev-enrich-warning{
      padding:10pt 14pt; background:#fffbeb; border:1px solid #fde68a;
      border-radius:4pt; font-size:9pt; color:#92400e; line-height:1.52; margin-bottom:10pt;
    }
    .ev-enrich-stub{
      padding:14pt; text-align:center; color:#9899b3; font-size:9pt;
      border:1px dashed #eaebf4; border-radius:4pt;
    }

    /* ── EVIDENCE & CONFIDENCE ─────────────────────────────────────────── */
    .ev-cs-block{
      display:flex; align-items:center; gap:20pt;
      padding:20pt 24pt; background:#06032B; border-radius:5pt; margin-bottom:18pt;
      break-inside:avoid;
    }
    .ev-cs-num{ font-size:52pt; font-weight:700; color:#fff; letter-spacing:-.04em; line-height:1; }
    .ev-cs-unit{ font-size:18pt; color:rgba(255,255,255,.4); font-weight:400; }
    .ev-cs-right{ flex:1; }
    .ev-cs-title{ font-size:7pt; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.38); margin-bottom:6pt; }
    .ev-cs-desc{ font-size:9.5pt; color:rgba(255,255,255,.65); line-height:1.5; }
    .ev-tier-grid{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10pt; margin-bottom:18pt; }
    .ev-tier{
      padding:12pt 14pt; border:1px solid #eaebf4; border-radius:4pt;
      text-align:center; background:#fafafa; break-inside:avoid;
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
      break-inside:avoid;
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
      display:flex; gap:9pt; align-items:flex-start; break-inside:avoid;
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

    /* ── REPORTING READINESS (B19) ─────────────────────────────────────────── */
    .rd-counters{ display:flex; gap:8pt; margin-bottom:14pt; flex-wrap:wrap; }
    .rd-counter{
      flex:1; min-width:70pt; padding:10pt 12pt; border:1px solid #eaebf4;
      border-radius:4pt; text-align:center; break-inside:avoid;
    }
    .rd-counter-val{ font-size:20pt; font-weight:700; letter-spacing:-.02em; line-height:1; }
    .rd-counter-label{
      font-size:6pt; font-weight:700; letter-spacing:.14em;
      text-transform:uppercase; color:#9899b3; margin-top:4pt;
    }
    .rd-gap-list{ display:flex; flex-direction:column; gap:6pt; margin-bottom:10pt; }
    .rd-gap-row{
      padding:8pt 12pt; border:1px solid #eaebf4; border-radius:4pt;
      background:#fafafa; break-inside:avoid;
    }
    .rd-gap-head{ display:flex; align-items:center; gap:8pt; margin-bottom:4pt; }
    .rd-gap-label{ font-size:8pt; font-weight:700; color:#06032B; flex:1; }
    .rd-gap-badge{
      font-size:5.5pt; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
      padding:2pt 5pt; border-radius:2pt; flex-shrink:0;
    }
    .rd-badge-ready  { background:#dcfce7; color:#166534; }
    .rd-badge-caveat { background:#fef9c3; color:#854d0e; }
    .rd-badge-needs  { background:#fee2e2; color:#991b1b; }
    .rd-badge-notready{ background:#f3f4f6; color:#6b7280; }
    .rd-gap-owner{ font-size:6pt; color:#9899b3; letter-spacing:.06em; text-transform:uppercase; }
    .rd-gap-missing{ font-size:7.5pt; color:#555670; margin-bottom:3pt; }
    .rd-gap-actions{ font-size:7pt; color:#7778a0; }
    .rd-b19-caveat{
      padding:8pt 12pt; background:#f8f8fc; border:1px solid #eaebf4;
      border-radius:4pt; font-size:7pt; color:#9899b3; line-height:1.5; margin-top:8pt;
    }

    /* ── REPORTING ALIGNMENT (B18) ─────────────────────────────────────────── */
    .ra-section{ margin-bottom:16pt; }
    .ra-header{
      font-size:7pt; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
      color:#9899b3; margin-bottom:10pt;
    }
    .ra-noclaim{
      padding:10pt 14pt; background:#fffbeb; border:1px solid #fde68a;
      border-radius:4pt; font-size:8.5pt; color:#92400e; line-height:1.52; margin-bottom:12pt;
      break-inside:avoid;
    }
    .ra-area-row{
      display:flex; align-items:flex-start; gap:10pt;
      padding:8pt 12pt; border:1px solid #eaebf4; border-radius:4pt;
      background:#fafafa; margin-bottom:6pt; break-inside:avoid;
    }
    .ra-area-badge{
      font-size:6pt; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
      padding:2pt 5pt; border-radius:2pt; flex-shrink:0; margin-top:1pt;
    }
    .ra-area-strong{ background:#dcfce7; color:#166534; }
    .ra-area-medium{ background:#fef9c3; color:#854d0e; }
    .ra-area-weak  { background:#fee2e2; color:#991b1b; }
    .ra-area-body{ flex:1; }
    .ra-area-label{ font-size:8.5pt; font-weight:700; color:#06032B; margin-bottom:2pt; }
    .ra-area-meta{ font-size:7.5pt; color:#7778a0; margin-bottom:3pt; }
    .ra-area-evidence{ font-size:7pt; color:#9899b3; }
    .ra-stub{
      padding:12pt; text-align:center; color:#9899b3; font-size:9pt;
      border:1px dashed #eaebf4; border-radius:4pt; margin-bottom:8pt;
    }
    .ra-caveat{
      padding:8pt 12pt; background:#f8f8fc; border:1px solid #eaebf4;
      border-radius:4pt; font-size:7pt; color:#9899b3; line-height:1.5;
    }

    /* ── NORMATIVE MAPPING LIGHT ───────────────────────────────────────── */
    .nm-section{ margin-bottom:16pt; padding:12pt 14pt; background:#f9f8ff; border:1px solid #e0dff8; border-radius:6pt; break-inside:avoid; }
    .nm-header{ font-size:7pt; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:#6156F5; margin-bottom:3pt; }
    .nm-subtitle{ font-size:7.5pt; color:#9899b3; margin-bottom:8pt; }
    .nm-disclaimer{ padding:8pt 10pt; background:#fffbeb; border:1px solid #fde68a; border-radius:4pt; font-size:7.5pt; color:#92400e; line-height:1.5; margin-bottom:8pt; }
    .nm-badge-row{ display:flex; gap:6pt; flex-wrap:wrap; margin-bottom:10pt; }
    .nm-badge-calib{ font-size:6pt; font-weight:700; background:#ede9ff; color:#6156F5; border-radius:3pt; padding:2pt 6pt; letter-spacing:.06em; }
    .nm-badge-noclaim{ font-size:6pt; font-weight:600; background:#f0fdf4; color:#166534; border-radius:3pt; padding:2pt 6pt; }
    .nm-table{ width:100%; border-collapse:collapse; font-size:7.5pt; margin-bottom:8pt; }
    .nm-table th{ padding:5pt 7pt; background:#f3f2ff; color:#6156F5; font-size:6.5pt; font-weight:700; letter-spacing:.08em; text-transform:uppercase; border-bottom:1px solid #e0dff8; text-align:left; }
    .nm-table td{ padding:5pt 7pt; border-bottom:1px solid #eaebf4; vertical-align:top; color:#444; }
    .nm-table tr:last-child td{ border-bottom:none; }
    .nm-pillar{ display:inline-block; font-size:6pt; font-weight:700; background:#ede9ff; color:#6156F5; border-radius:3pt; padding:1pt 4pt; margin-right:2pt; }
    .nm-strength{ display:inline-block; font-size:6pt; font-weight:700; border-radius:3pt; padding:2pt 5pt; }
    .nm-strength-direct{ background:#dcfce7; color:#166534; }
    .nm-strength-indirect{ background:#fef9c3; color:#854d0e; }
    .nm-strength-ctx{ background:#fee2e2; color:#991b1b; }
    .nm-footer{ font-size:6pt; color:#9899b3; letter-spacing:.06em; text-align:right; }

    /* ── TABLE OF CONTENTS ─────────────────────────────────────────────── */
    .toc-page{ background:#f8f8fc; }
    .toc-title{
      font-size:9pt; font-weight:700; letter-spacing:.22em;
      text-transform:uppercase; color:#6156F5; margin-bottom:24pt;
    }
    .toc-list{ display:flex; flex-direction:column; gap:0; }
    .toc-row{
      display:flex; align-items:baseline; padding:9pt 0;
      border-bottom:1px solid #eaebf4;
    }
    .toc-num{
      font-size:9pt; font-weight:700; color:#6156F5;
      letter-spacing:.04em; width:24pt; flex-shrink:0;
    }
    .toc-label{ font-size:10.5pt; font-weight:600; color:#06032B; flex:1; }
    .toc-sub{ font-size:7.5pt; color:#9899b3; margin-top:2pt; }
    .toc-dots{ flex:1; border-bottom:1px dotted #d4d2f8; margin:0 10pt 3pt; }

    /* ── COVER IMPROVEMENTS ────────────────────────────────────────────── */
    .cv-doc-type{
      font-size:9pt; font-weight:700; letter-spacing:.08em;
      color:#fff; margin-bottom:4pt;
    }
    .cv-subtitle{
      font-size:9pt; font-weight:400; color:rgba(255,255,255,.45);
      letter-spacing:.01em; margin-bottom:26pt;
    }
    .cv-confidential{
      font-size:6pt; font-weight:700; letter-spacing:.22em; text-transform:uppercase;
      color:#C8FF47; border:1px solid rgba(200,255,71,.35); padding:3pt 8pt; border-radius:2pt;
    }

    /* ── MACROBLOCK DIAGNOSIS ──────────────────────────────────────────── */
    .mb-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12pt; margin-bottom:18pt; }
    .mb-card{
      padding:18pt 20pt; border:1px solid #eaebf4; border-radius:6pt;
      background:#fff; break-inside:avoid;
    }
    .mb-card-reach { border-top:3pt solid #06032B; }
    .mb-card-quality{ border-top:3pt solid #059669; }
    .mb-card-equity { border-top:3pt solid #6156F5; }
    .mb-card-bti    { border-top:3pt solid #d97706; }
    .mb-code{
      font-size:7pt; font-weight:700; letter-spacing:.22em; text-transform:uppercase;
      color:#9899b3; margin-bottom:4pt;
    }
    .mb-weight{
      font-size:7pt; font-weight:600; color:#9899b3;
    }
    .mb-score{
      font-size:38pt; font-weight:700; color:#06032B;
      letter-spacing:-.04em; line-height:1; margin:8pt 0 4pt;
    }
    .mb-denom{ font-size:14pt; font-weight:400; color:#9899b3; }
    .mb-contribution{
      font-size:8pt; color:#555670; margin-bottom:8pt;
    }
    .mb-desc{ font-size:8.5pt; color:#7778a0; line-height:1.5; }
    .mb-status{
      display:inline-block; font-size:6.5pt; font-weight:700; letter-spacing:.1em;
      text-transform:uppercase; padding:2pt 7pt; border-radius:2pt; margin-top:8pt;
    }

    /* ── DIAGNOSTIC COMPONENTS ─────────────────────────────────────────── */
    .comp-table{ width:100%; border-collapse:collapse; font-size:8.5pt; }
    .comp-thead th{
      padding:6pt 8pt; text-align:left; font-size:6pt; font-weight:700;
      letter-spacing:.16em; text-transform:uppercase; color:#9899b3;
      border-bottom:1.5px solid #06032B; background:#f8f8fc;
    }
    .comp-row{ border-bottom:1px solid #eaebf4; }
    .comp-row:hover{ background:#f8f8fc; }
    .comp-code{
      padding:8pt 8pt; font-family:'Courier New',monospace; font-size:9pt;
      font-weight:700; color:#6156F5; white-space:nowrap;
    }
    .comp-name{ padding:8pt 8pt; font-weight:600; color:#06032B; }
    .comp-mb{
      padding:8pt 8pt; font-size:7pt; font-weight:600; letter-spacing:.06em;
      text-transform:uppercase; color:#9899b3;
    }
    .comp-val{
      padding:8pt 8pt; font-size:12pt; font-weight:700; color:#06032B;
      letter-spacing:-.02em; text-align:right; white-space:nowrap;
    }
    .comp-weight{ padding:8pt 8pt; color:#9899b3; text-align:right; white-space:nowrap; }
    .comp-desc{ padding:8pt 8pt; font-size:7.5pt; color:#7778a0; line-height:1.4; max-width:160pt; }
    .comp-external{ color:#d97706; }

    /* ── ELIGIBILITY & DATA QUALITY ────────────────────────────────────── */
    .elig-grid{ display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10pt; margin-bottom:18pt; }
    .elig-card{
      padding:14pt 12pt; border:1px solid #eaebf4; border-radius:5pt;
      text-align:center; background:#fafafa; break-inside:avoid;
    }
    .elig-count{ font-size:28pt; font-weight:700; color:#06032B; letter-spacing:-.03em; line-height:1; }
    .elig-label{
      font-size:6pt; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
      color:#9899b3; margin-top:5pt;
    }
    .elig-desc{ font-size:7pt; color:#b0b1cc; margin-top:3pt; line-height:1.4; }

    /* ── CONTRIBUTION COMPANION ────────────────────────────────────────── */
    .contrib-hero{
      padding:20pt 24pt; background:#06032B; border-radius:6pt; margin-bottom:18pt;
      break-inside:avoid; display:flex; gap:20pt; align-items:center;
    }
    .contrib-score-block{ flex-shrink:0; }
    .contrib-score{ font-size:52pt; font-weight:700; color:#C8FF47; letter-spacing:-.04em; line-height:1; }
    .contrib-score-label{
      font-size:6.5pt; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
      color:rgba(255,255,255,.38); margin-top:4pt;
    }
    .contrib-right{ flex:1; }
    .contrib-level{ font-size:14pt; font-weight:700; color:#fff; margin-bottom:6pt; }
    .contrib-desc{ font-size:9pt; color:rgba(255,255,255,.60); line-height:1.5; }
    .contrib-kpi-row{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10pt; margin-bottom:16pt; }
    .contrib-kpi{
      padding:12pt 14pt; border:1px solid #eaebf4; border-radius:4pt;
      background:#fafafa; text-align:center; break-inside:avoid;
    }
    .contrib-kpi-val{ font-size:20pt; font-weight:700; color:#06032B; letter-spacing:-.02em; line-height:1; }
    .contrib-kpi-label{
      font-size:6pt; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
      color:#9899b3; margin-top:4pt;
    }
    .contrib-nota{
      padding:11pt 16pt; background:#f5f4ff; border:1px solid #c7c4f8;
      border-radius:4pt; font-size:9pt; color:#3d3a6a; line-height:1.55;
    }
    .contrib-na{
      padding:30pt 20pt; text-align:center; border:1px dashed #d4d2f8;
      border-radius:6pt; background:#f8f8fc;
    }
    .contrib-na-label{ font-size:11pt; font-weight:600; color:#3d3a6a; margin-bottom:8pt; }
    .contrib-na-desc{ font-size:9pt; color:#9899b3; line-height:1.55; max-width:340pt; margin:0 auto; }
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
<body data-testid="decision-pack-preview">


<!-- ═══════════════════════════════════════════
     PAGE 1 — COVER
     Company as hero · KI as visual anchor
     ═══════════════════════════════════════════ -->
<div class="page cover">
  <div class="cv-top">
    <img src="${logoWhite}" class="cv-logo" alt="KORA">
    <div style="display:flex;gap:8pt;align-items:center;">
      <span class="cv-confidential">Pilot Confidential</span>
      <span class="cv-badge">${esc(meta.isLiveData ? 'KORA Foundation Light' : 'Synthetic Demo')}</span>
    </div>
  </div>

  <div class="cv-body">
    <div class="cv-eyebrow">KORA Human Impact Intelligence Platform</div>

    <!-- Document type and company name -->
    <div class="cv-doc-type">KORA Decision Pack™</div>
    <div class="cv-subtitle">Human Activation &amp; Budget-to-Human-Impact Diagnostic</div>

    <!-- Company name is the HERO — bigger than the product name -->
    <div class="cv-company">${esc(meta.companyName)}</div>
    <div class="cv-product">${esc(meta.reportingPeriod)} &nbsp;·&nbsp; ${esc(koraIndex.methodologyVersionId)}</div>

    <div class="cv-rule"></div>

    <!-- KORA Index as visual anchor -->
    <div class="cv-ki-block">
      <span class="cv-ki-label">KORA Index v1.0</span>
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
        <div class="cv-ml">Azienda</div>
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
      Dati sintetici/demo · KORA Foundation Light · pre_empirical_calibration
      Non è una certificazione ESG · Non è consulenza legale o fiscale.
      ${esc(meta.decisionPackVersionId.slice(0, 40))}
    </div>
    <div class="cv-lime"></div>
  </div>
</div>


<!-- ═══════════════════════════════════════════
     TOC — TABLE OF CONTENTS
     ═══════════════════════════════════════════ -->
<div class="page cp toc-page">
  ${pageHeader('Indice dei Contenuti')}
  <div class="pc">

    <div class="toc-title">KORA Decision Pack™ — Struttura del Documento</div>

    <div class="toc-list">
      <div class="toc-row">
        <span class="toc-num">1</span>
        <div style="flex:1;">
          <div class="toc-label">Executive Summary</div>
          <div class="toc-sub">Risponde a: Come stiamo? Perché? Opportunità principale. Azione prioritaria.</div>
        </div>
      </div>
      <div class="toc-row">
        <span class="toc-num">2</span>
        <div style="flex:1;">
          <div class="toc-label">KORA Index &amp; Activation Safeguard</div>
          <div class="toc-sub">Valore KORA Index v1.0, Confidence Score, Activation Safeguard, Reach Semantics.</div>
        </div>
      </div>
      <div class="toc-row">
        <span class="toc-num">3</span>
        <div style="flex:1;">
          <div class="toc-label">Macroblock Diagnosis</div>
          <div class="toc-sub">Score di REACH, QUALITY, EQUITY e BTI con peso e contributo al KORA Index.</div>
        </div>
      </div>
      <div class="toc-row">
        <span class="toc-num">4</span>
        <div style="flex:1;">
          <div class="toc-label">Diagnostic Components</div>
          <div class="toc-sub">I 10 componenti diagnostici: AR, MAR, EVQ, INT, CONT, EQW, EQS, PC, PB, CS.</div>
        </div>
      </div>
      <div class="toc-row">
        <span class="toc-num">5</span>
        <div style="flex:1;">
          <div class="toc-label">Budget-to-Human-Impact (BTI™)</div>
          <div class="toc-sub">Allocazione budget welfare, Activation Debt, costo per Impact Unit.</div>
        </div>
      </div>
      <div class="toc-row">
        <span class="toc-num">6</span>
        <div style="flex:1;">
          <div class="toc-label">Eligibility &amp; Data Quality</div>
          <div class="toc-sub">Classificazione record: eligible, limited, blocked, review required. Distribuzione evidenze.</div>
        </div>
      </div>
      <div class="toc-row">
        <span class="toc-num">7</span>
        <div style="flex:1;">
          <div class="toc-label">Impact Units™ &amp; PIB Aggregation</div>
          <div class="toc-sub">Totale IU computate, distribuzione per pillar, strato aggregato PIB.</div>
        </div>
      </div>
      <div class="toc-row">
        <span class="toc-num">8</span>
        <div style="flex:1;">
          <div class="toc-label">KORA Contribution™</div>
          <div class="toc-sub">Indicatore companion: impegno collettivo ed ecosistema. Non modifica il KORA Index.</div>
        </div>
      </div>
      <div class="toc-row">
        <span class="toc-num">9</span>
        <div style="flex:1;">
          <div class="toc-label">Recommendations &amp; 90-Day Action Plan</div>
          <div class="toc-sub">Tre decisioni board-level con ownership e implicazioni operative.</div>
        </div>
      </div>
      <div class="toc-row" style="border-bottom:none;">
        <span class="toc-num">10</span>
        <div style="flex:1;">
          <div class="toc-label">Methodology &amp; Privacy Notes</div>
          <div class="toc-sub">Governance metodologica, privacy boundary, calibration status, provenance.</div>
        </div>
      </div>
    </div>

    <div style="margin-top:auto;padding-top:14pt;border-top:1px solid #eaebf4;">
      <p style="font-size:8pt;color:#9899b3;line-height:1.6;">
        <strong>Come leggere questo documento:</strong> ogni sezione collega un numero a una decisione — indice, causa, azione.
        Generato da KORA Foundation Light — calibrazione pre-empirica.
        I valori sono diagnostici e di pilota, non certificati. Non sostituisce analisi HR, consulenza ESG, legale o fiscale.
        KORA misura l'attivazione organizzativa — non individui. Nessun lavoratore è identificabile in questo documento.
      </p>
    </div>

  </div>
  ${pageFooter()}
</div>


${buildExecutiveBriefPage(data)}


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
        <div class="bm-metric-label">KORA Index v1.0</div>
        <div class="bm-metric-val" style="font-size:56pt;">${kiVal}</div>
        <div class="bm-metric-sub">/100 · ${esc(koraIndex.methodologyVersionId)}</div>
        <div style="font-size:7pt;color:#9899b3;margin-top:6pt;line-height:1.4;text-align:left;padding:0 3pt;">Efficacia nel convertire iniziative people in attivazione verificata, distribuita e significativa. Output aziendale aggregato — nessun individuo misurabile.</div>
        <div style="font-size:6.5pt;color:#b0b1cc;margin-top:5pt;line-height:1.4;text-align:left;padding:0 3pt;border-top:1px solid #eaebf4;padding-top:5pt;">Benchmark settoriale: non disponibile in KORA Foundation Light (calibrazione pre-empirica). Confronto settoriale pianificato post-pilot (Delphi Study).</div>
      </div>
      <div class="bm-metric" style="border:1px solid #c7c4f8;border-radius:5pt;background:#f5f4ff;">
        <div class="bm-metric-label">Confidence Score</div>
        <div class="bm-metric-val" style="font-size:40pt;color:#6156F5;">${csPct}%</div>
        <div class="bm-metric-sub">indicatore esterno · peso = 0</div>
        <div style="font-size:7pt;color:#9899b3;margin-top:6pt;line-height:1.4;text-align:left;padding:0 3pt;">Qualità e completezza delle evidenze. Non entra nel KORA Index — mostrato sempre affianco come affidabilità dato.</div>
      </div>
      <div class="bm-metric" style="border:1px solid ${sfColor(sf)}33;border-radius:5pt;background:${sfBg(sf)};">
        <div class="bm-metric-label">Activation Safeguard</div>
        <div class="bm-metric-val" style="font-size:22pt;color:${sfColor(sf)};">${sfLabel(sf)}</div>
        <div class="bm-metric-sub">MAR ${marPct}% · AR ${arPct}%</div>
        <div style="font-size:7pt;color:#9899b3;margin-top:6pt;line-height:1.4;text-align:left;padding:0 3pt;">Gate interpretativo — previene overclaim quando partecipazione, evidenza o review sono insufficienti.</div>
      </div>
    </div>

    <div class="bm-interp">
      ${sf === 'CLEAR'   ? `L'organizzazione soddisfa i criteri dell'Activation Safeguard (MAR ≥ 30%, AR ≥ 40%). Il KORA Index è qualificato per output interpretativi nella fase pilot.`
      : sf === 'WARNING' ? `Activation Safeguard in zona WARNING. Il KORA Index è disponibile ma richiede analisi approfondita prima di qualsiasi uso decisionale formale.`
      :                    `Attenzione: parametri di attivazione sotto soglia minima. Il KORA Index è preliminare — non utilizzare per decisioni operative senza revisione metodologica.`}
    </div>

    <!-- B25: Macroblock definitions — 4-column compact strip -->
    <div style="margin-top:12pt;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6pt;">
      <div style="padding:8pt 9pt;border:1px solid #eaebf4;border-radius:4pt;background:#fafafa;break-inside:avoid;">
        <div style="font-size:6.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#06032B;margin-bottom:4pt;">REACH · 25%</div>
        <div style="font-size:7.5pt;color:#555670;line-height:1.4;">Reach complessivo (AR) e attivazione significativa (MAR). MAR è il segnale primario. AR include economic relief.</div>
      </div>
      <div style="padding:8pt 9pt;border:1px solid #eaebf4;border-radius:4pt;background:#fafafa;break-inside:avoid;">
        <div style="font-size:6.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#06032B;margin-bottom:4pt;">QUALITY · 30%</div>
        <div style="font-size:7.5pt;color:#555670;line-height:1.4;">Profondità, evidenza e qualità dell'attivazione. La quantità di iniziative da sola non produce qualità.</div>
      </div>
      <div style="padding:8pt 9pt;border:1px solid #c7c4f8;border-radius:4pt;background:#f5f4ff;break-inside:avoid;">
        <div style="font-size:6.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6156F5;margin-bottom:4pt;">EQUITY · 25%</div>
        <div style="font-size:7.5pt;color:#555670;line-height:1.4;">Distribuzione sui 5 pillar KORA. Combina Pillar Coverage (PC) e Pillar Balance (PB). Non misura equità individuale.</div>
      </div>
      <div style="padding:8pt 9pt;border:1px solid #eaebf4;border-radius:4pt;background:#fafafa;break-inside:avoid;">
        <div style="font-size:6.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#06032B;margin-bottom:4pt;">BTI · 20%</div>
        <div style="font-size:7.5pt;color:#555670;line-height:1.4;">Budget convertito in attivazione reale. Deep Activation vs Economic Relief vs Compliance Blocked.</div>
      </div>
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
     PAGE — MACROBLOCK DIAGNOSIS (§3)
     Score per macroblocco con peso e contributo
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Macroblock Diagnosis')}
  <div class="pc">

    <p style="font-size:10pt;color:#555670;line-height:1.6;margin-bottom:16pt;max-width:460pt;">
      Il KORA Index v1.0 è composto da 4 macroblocchi con pesi differenziati. Ogni macroblocco esprime una
      dimensione strategica dell'attivazione organizzativa. I valori sono pre-calibrazione empirica (v0.1).
    </p>

    ${macroblocks && macroblocks.length === 4 ? (() => {
      const MB_DESC: Record<string, { desc: string; cardClass: string; color: string }> = {
        REACH:   { desc: "Misura quanto l'attivazione raggiunge la popolazione aziendale. Combina Activation Rate (reach complessivo) e Meaningful Activation Rate (segnale primario — esclude economic relief).", cardClass: 'mb-card-reach',   color: '#06032B' },
        QUALITY: { desc: "Misura la profondità e la qualità dell'attivazione. Combina intensità normalizzata (INT), evidence quality (EVQ) e continuità cross-periodo (CONT).", cardClass: 'mb-card-quality', color: '#059669' },
        EQUITY:  { desc: "Misura la distribuzione dell'attivazione sui 5 pillar KORA. Combina Pillar Coverage (PC — quanti pillar attivi) e Pillar Balance (PB — quanto equilibrata la distribuzione).", cardClass: 'mb-card-equity',  color: '#6156F5' },
        BTI:     { desc: "Misura l'efficienza del budget people. Budget-to-Human-Impact: quota di welfare convertita in attivazione profonda vs economic relief vs compliance blocked.", cardClass: 'mb-card-bti',    color: '#d97706' },
      };
      const statusForScore = getMacroblockStatusForScore;
      return `
    <div class="mb-grid">
      ${macroblocks.map(mb => {
        const info = MB_DESC[mb.code] ?? { desc: '', cardClass: '', color: '#06032B' };
        const contrib = +(mb.score * mb.weight / 100).toFixed(1);
        const st = statusForScore(mb.score);
        return `
      <div class="mb-card ${info.cardClass}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div class="mb-code">${esc(mb.code)}</div>
          <span class="mb-weight">peso ${Math.round(mb.weight * 100)}%</span>
        </div>
        <div class="mb-score" style="color:${info.color};">${Math.round(mb.score)}<span class="mb-denom">/100</span></div>
        <div class="mb-contribution">Contributo al KORA Index: <strong>+${contrib} pt</strong></div>
        <div class="mb-desc">${esc(info.desc)}</div>
        <span class="mb-status" style="background:${st.bg};color:${st.color};">${esc(st.label)}</span>
      </div>`;
      }).join('')}
    </div>

    <div style="padding:11pt 16pt;background:#f8f8fc;border:1px solid #eaebf4;border-radius:4pt;font-size:8.5pt;color:#555670;line-height:1.55;">
      <strong>Come leggere:</strong> il contributo di ogni macroblocco al KORA Index è score × peso.
      Un REACH di ${Math.round(macroblocks.find(m=>m.code==='REACH')?.score??0)}/100 × 25% contribuisce
      ${+(((macroblocks.find(m=>m.code==='REACH')?.score??0)*0.25)/100).toFixed(1)} pt al valore finale.
      Somma dei contributi = KORA Index (pre-calibrazione empirica, v0.1).
      Calibrazione definitiva post-pilot (Delphi Study).
    </div>
    `;
    })() : `
    <div style="padding:24pt;text-align:center;border:1px dashed #eaebf4;border-radius:6pt;color:#9899b3;">
      <div style="font-size:11pt;font-weight:600;color:#555670;margin-bottom:8pt;">Dati macroblocchi non disponibili</div>
      <div style="font-size:9pt;">Eseguire il ciclo di scoring dalla pipeline v1.0+ per popolare questa sezione.</div>
    </div>
    `}

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE — DIAGNOSTIC COMPONENTS (§4)
     I 10 componenti del KORA Index v1.0
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Diagnostic Components')}
  <div class="pc">

    <p style="font-size:10pt;color:#555670;line-height:1.6;margin-bottom:14pt;max-width:460pt;">
      Il KORA Index v1.0 è composto da 10 componenti fissi. Ogni componente misura una dimensione specifica
      dell'attivazione organizzativa. Il Confidence Score (CS) è esterno al KORA Index — peso = 0.
    </p>

    ${components && components.length > 0 ? (() => {
      const COMP_DESC: Record<string, string> = {
        AR:   'Activation Rate — share of workforce con almeno un IU approvato nel periodo',
        MAR:  'Meaningful Activation Rate — share con IU sopra soglia materialità (segnale primario)',
        INT:  'Normalized Intensity — intensità media IU per worker attivo, normalizzata sul target',
        EVQ:  'Evidence Quality — solidità e verificabilità delle fonti evidenza per IU approvate',
        CONT: 'Continuity — share workers con engagement cross-periodo sostenuto',
        EQW:  'Equity Workers — distribuzione IU tra workers attivi (equità individuale, Gini-based)',
        PC:   'Pillar Coverage — numero pillar con presenza significativa (su 5 totali)',
        PB:   'Pillar Balance — equità distribuzione IU tra pillar coperti',
        EQS:  'Equity Segments — equità del tasso di attivazione tra dipartimenti/sedi (N≥10)',
        BTI:  'Budget-to-Human-Impact — efficienza budget welfare → attivazione profonda',
        CS:   'Confidence Score — qualità e completezza dati. Esterno al KORA Index (peso = 0)',
      };
      const nonExternal = components.filter(c => !c.external);
      const external    = components.filter(c => c.external);
      const renderRow = (c: typeof components[0]) => {
        const val100 = c.external ? Math.round(c.value * 100) : Math.round(c.value * 100);
        const weightPct = c.external ? '—' : `${(c.weight * 100).toFixed(1)}%`;
        return `
      <tr class="comp-row">
        <td class="comp-code">${esc(c.code)}</td>
        <td class="comp-name">${esc(c.label)}</td>
        <td class="comp-mb">${esc(c.macroblock ?? (c.external ? 'EXTERNAL' : '—'))}</td>
        <td class="comp-val${c.external ? ' comp-external' : ''}">${val100}${c.code === 'CS' ? '%' : c.code === 'PC' ? '/5' : '%'}</td>
        <td class="comp-weight">${weightPct}</td>
        <td class="comp-desc">${esc(COMP_DESC[c.code] ?? c.label)}</td>
      </tr>`;
      };
      return `
    <table class="comp-table">
      <thead class="comp-thead">
        <tr>
          <th>Codice</th>
          <th>Nome</th>
          <th>Macroblocco</th>
          <th style="text-align:right;">Valore</th>
          <th style="text-align:right;">Peso</th>
          <th>Descrizione</th>
        </tr>
      </thead>
      <tbody>
        ${nonExternal.map(renderRow).join('')}
        ${external.map(renderRow).join('')}
      </tbody>
    </table>
    <div style="margin-top:12pt;padding:9pt 14pt;background:#fffbeb;border:1px solid #fde68a;border-radius:4pt;font-size:8pt;color:#92400e;line-height:1.5;">
      <strong>CS = Confidence Score</strong> è un indicatore esterno al KORA Index v1.0 (peso = 0). Non entra nel calcolo.
      Viene mostrato affianco al KORA Index come indicatore di affidabilità dei dati sottostanti.
      EQS = Equity Segments misura l'equità del tasso di attivazione tra segmenti workforce (dipartimenti/sedi) — l'equità tra singoli lavoratori è misurata separatamente da EQW (Equity Workers).
    </div>
    `;
    })() : `
    <div style="padding:24pt;text-align:center;border:1px dashed #eaebf4;border-radius:6pt;color:#9899b3;">
      <div style="font-size:11pt;font-weight:600;color:#555670;margin-bottom:8pt;">Componenti non disponibili</div>
      <div style="font-size:9pt;">Eseguire il ciclo di scoring dalla pipeline v1.0+ (con components JSON) per popolare questa sezione.</div>
    </div>
    `}

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
        <div class="aa-label">Activation Rate <span class="rs-badge" style="background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db;">REACH COMPLESSIVO</span></div>
        <div>
          <span class="aa-val">${arPct}</span><span class="aa-unit">%</span>
        </div>
        <div class="aa-desc">Reach complessivo: include eligible + economic relief (voucher, fringe benefit, benefit monetari). Non equivale a deep activation. Vedere MAR per il segnale primario.</div>
      </div>
      <div class="aa-card aa-card-hi">
        <div class="aa-label">Meaningful Activation Rate <span class="rs-badge" style="background:#f5f4ff;color:#6156F5;border:1px solid #c7c4f8;">SEGNALE PRIMARIO</span></div>
        <div>
          <span class="aa-val" style="color:#6156F5;">${marPct}</span><span class="aa-unit" style="color:#6156F5;">%</span>
        </div>
        <div class="aa-desc">Segnale primario di attivazione profonda: solo record eligible. Esclude economic relief e benefit monetari. Usa questo valore per decisioni strategiche.</div>
      </div>
    </div>

    <!-- B24: Reach Semantics breakdown -->
    <div class="rs-block${reliefGapWarning ? ' rs-block-warn' : ''}">
      <div class="rs-title">Reach Semantics — Composizione dell'Activation Rate</div>
      <div class="rs-row">
        <span class="rs-label-primary">Meaningful Activation Rate (MAR) <span class="rs-badge" style="background:#f5f4ff;color:#6156F5;border:1px solid #c7c4f8;">PRIMARIO</span></span>
        <span class="rs-val-primary">${marPct}%</span>
      </div>
      <div class="rs-row">
        <span class="rs-label">Activation Rate (AR) — reach complessivo incl. economic relief</span>
        <span class="rs-val">${arPct}%</span>
      </div>
      <div class="rs-row">
        <span class="rs-label">Gap AR → MAR <span style="font-size:8pt;color:#9899b3;">(differenza attribuibile a economic relief)</span></span>
        <span class="rs-val-gap" style="color:${reliefGapWarning ? '#d97706' : '#9899b3'};">${reliefGapPct > 0 ? '+' : ''}${reliefGapPct}pp${reliefGapWarning ? ' ⚠' : ''}</span>
      </div>
      <div class="rs-row">
        <span class="rs-label">Compliance Baseline (blocked) — non genera IU</span>
        <span class="rs-val" style="color:#9899b3;">esclusa da AR/MAR</span>
      </div>
      ${reliefGapWarning ? `<div class="rs-note">⚠ Gap AR→MAR elevato (${reliefGapPct}pp): l'Activation Rate è significativamente influenzato da benefit economici ad ampia copertura (voucher, fringe benefit, welfare wallet). MAR è il segnale rilevante per valutare la profondità dell'attivazione people.</div>` : ''}
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
      <strong style="display:block;margin-bottom:6pt;font-size:9.5pt;">Nota metodologica — Reach ≠ Profondità</strong>
      <strong>MAR è il segnale primario.</strong> Misura la quota di workforce raggiunta da iniziative eligible con potenziale di attivazione profonda.
      AR include anche il reach da benefit economici (voucher, fringe benefit, welfare wallet) che non generano Impact Units.
      Un AR elevato con MAR basso non è un segnale positivo: indica copertura diffusa ma prevalentemente monetaria.
      Compliance baseline (formazione obbligatoria, sicurezza) è esclusa da entrambi — non genera attivazione KORA.
      <br><br>
      Leggere AR/MAR in combinazione con Pillar Balance e BTI Score per un quadro completo.
      <br>
      <strong>KORA non misura individui.</strong> Tutti i valori sono aggregati company-level. Nessun worker è identificabile.
    </div>

    <div style="margin-top:auto;">
      <p style="font-size:7.5pt;color:#9899b3;">
        Componenti KORA Index v1.0: ${koraIndex.componentCount > 0 ? koraIndex.componentCount : 10} / 10 &nbsp;·&nbsp;
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

    <!-- B25: EQUITY = PC + PB definition -->
    <div style="padding:11pt 14pt;border:1px solid #c7c4f8;background:#f5f4ff;border-radius:4pt;margin-bottom:14pt;break-inside:avoid;">
      <div style="font-size:6.5pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#6156F5;margin-bottom:6pt;">EQUITY — Distribution &amp; Equity Macroblock · 25%</div>
      <div style="font-size:9pt;color:#3d3a6a;line-height:1.5;">
        EQUITY misura se l'attivazione è distribuita su più dimensioni KORA, non concentrata in un singolo pillar.
        Combina <strong>Pillar Coverage (PC)</strong> — quanti dei 5 pillar hanno presenza significativa —
        e <strong>Pillar Balance (PB)</strong> — quanto è equa la distribuzione tra i pillar coperti.
        Alta EQUITY riflette un programma people diversificato. Non misura equità tra lavoratori individuali.
      </div>
    </div>

    <p style="font-size:10pt;color:#555670;line-height:1.6;margin-bottom:14pt;max-width:440pt;">
      Distribuzione dell'attivazione sui 5 pillar KORA per il periodo ${esc(meta.reportingPeriod)}.
      Output aggregato aziendale — nessun dato individuale. Evento classificato per pillar
      tramite tassonomia BCM.
    </p>

    ${pillarBars()}

    ${pillarDistribution && dominantPillar && dominantPct > 60 ? `
    <div class="pb-note">
      <strong>Nota squilibrio:</strong> Il pillar ${esc(dominantPillar)} rappresenta il ${dominantPct}% dell'attivazione classificata.
      Una distribuzione più equilibrata (Pillar Balance — PB) contribuisce positivamente al KORA Index v1.0.
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

    ${bti ? (() => {
      const totalB     = bti.totalPeopleWelfareBudget;
      const deepPct    = totalB > 0 ? Math.round((bti.deepActivationSpend    / totalB) * 100) : 0;
      const reliefPct  = totalB > 0 ? Math.round((bti.economicReliefSpend    / totalB) * 100) : 0;
      const blockedPct = totalB > 0 ? Math.round((bti.blockedComplianceSpend / totalB) * 100) : 0;
      const unknownPct = Math.max(0, 100 - deepPct - reliefPct - blockedPct);
      return `
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

    ${totalB > 0 ? `
    <div class="fg-bar-section">
      <div class="fg-bar-lbl">Classificazione budget — Deep Activation · Economic Relief · Compliance Blocked · Unknown</div>
      <div class="fg-stacked">
        <div class="fg-seg-a" style="width:${deepPct}%;">
          ${deepPct > 10 ? `<span class="fg-seg-txt">${deepPct}% Deep</span>` : ''}
        </div>
        <div class="fg-seg-b" style="width:${reliefPct}%;">
          ${reliefPct > 10 ? `<span class="fg-seg-txt-b">${reliefPct}% Relief</span>` : ''}
        </div>
        <div class="fg-seg-c" style="width:${blockedPct}%;">
          ${blockedPct > 10 ? `<span class="fg-seg-txt-c">${blockedPct}% Blocked</span>` : ''}
        </div>
        <div class="fg-seg-d" style="width:${unknownPct}%;">
          ${unknownPct > 10 ? `<span class="fg-seg-txt-d">${unknownPct}% N/D</span>` : ''}
        </div>
      </div>
      <div class="fg-legend">
        <div class="fg-leg"><div class="fg-leg-dot" style="background:#06032B;"></div>Deep Activation — ${esc(fmtEur(bti.deepActivationSpend))} (${deepPct}%)</div>
        <div class="fg-leg"><div class="fg-leg-dot" style="background:#c7c8dc;border:1px solid #b0b1cc;"></div>Economic Relief — ${esc(fmtEur(bti.economicReliefSpend))} (${reliefPct}%)</div>
        <div class="fg-leg"><div class="fg-leg-dot" style="background:#fde68a;border:1px solid #f59e0b;"></div>Compliance Blocked — ${esc(fmtEur(bti.blockedComplianceSpend))} (${blockedPct}%)</div>
        ${unknownPct > 0 ? `<div class="fg-leg"><div class="fg-leg-dot" style="background:#eaebf4;border:1px solid #c7c8dc;"></div>Non classificato (${unknownPct}%)</div>` : ''}
      </div>
    </div>` : ''}

    ${enrichment && enrichment.approvedUefRecords > 0 ? `
    <div class="fg-class-grid">
      <div class="fg-class-card" style="border-color:#06032B22;background:#f8f8fc;">
        <div class="fg-class-label" style="color:#06032B;">Deep Activation</div>
        <div class="fg-class-count">${enrichment.budgetClassBreakdown.deepActivation.count}</div>
        <div class="fg-class-amount">${enrichment.budgetClassBreakdown.deepActivation.count > 0 ? esc(fmtEur(enrichment.budgetClassBreakdown.deepActivation.amount)) : '—'} · iniziative</div>
      </div>
      <div class="fg-class-card" style="border-color:#c7c8dc;">
        <div class="fg-class-label">Economic Relief</div>
        <div class="fg-class-count">${enrichment.budgetClassBreakdown.economicRelief.count}</div>
        <div class="fg-class-amount">${enrichment.budgetClassBreakdown.economicRelief.count > 0 ? esc(fmtEur(enrichment.budgetClassBreakdown.economicRelief.amount)) : '—'} · iniziative</div>
      </div>
      <div class="fg-class-card" style="border-color:#fde68a;background:#fffbeb;">
        <div class="fg-class-label" style="color:#92400e;">Compliance Blocked</div>
        <div class="fg-class-count" style="color:#92400e;">${enrichment.budgetClassBreakdown.complianceBlocked.count}</div>
        <div class="fg-class-amount">${enrichment.budgetClassBreakdown.complianceBlocked.count > 0 ? esc(fmtEur(enrichment.budgetClassBreakdown.complianceBlocked.amount)) : '—'} · iniziative</div>
      </div>
      <div class="fg-class-card">
        <div class="fg-class-label">Unknown / To Review</div>
        <div class="fg-class-count" style="color:#9899b3;">${enrichment.budgetClassBreakdown.unknown.count}</div>
        <div class="fg-class-amount">${enrichment.budgetClassBreakdown.unknown.count > 0 && enrichment.budgetClassBreakdown.unknown.amount > 0 ? esc(fmtEur(enrichment.budgetClassBreakdown.unknown.amount)) : '—'} · iniziative</div>
      </div>
    </div>

    <div class="fg-board-note">
      Questo budget non è semplice spesa: è classificato per qualità di attivazione e livello di evidenza.
      Deep Activation genera Impact Units verificabili. Economic Relief è spesa welfare legittima ma non genera IU.
      Compliance Blocked è budget bloccato da requisiti normativi — non riallocabile senza revisione legale.
    </div>` : ''}

    ${enrichment?.needsEnrichmentOpen && enrichment.needsEnrichmentOpen > 0 ? `
    <div class="fg-warning">
      <strong>Attenzione board:</strong> L'interpretazione finanziaria è direzionalmente utile ma non definitiva — ${enrichment.needsEnrichmentOpen} iniziative richiedono ancora enrichment budget/evidenza prima di finalizzare la classificazione.
    </div>` : ''}

    <div class="fg-note">
      <strong>Nota:</strong> L'Activation Debt è una stima direzionale — non garantito.
      Il BTI Score è un indicatore informativo: non dimostra causalità, non certifica ROI, non sostituisce analisi finanziaria indipendente.
      Economic relief (buoni pasto, voucher generici, welfare wallet) non genera Impact Units ma è spesa welfare legittima.
      Le Structural People Policies (smart working, assicurazione sanitaria, previdenza, leadership program) sono infrastruttura organizzativa:
      KORA le valuta per evidenza, uptake e copertura — non per sola esistenza della policy.
      ${bti.budgetEvidenceQuality > 0 ? `Qualità evidenze budget: ${Math.round(bti.budgetEvidenceQuality * 100)}%.` : ''}
    </div>
`;
    })() : `
    <div class="fg-stub">
      Financial Governance non disponibile per questo batch.
      ${enrichment === null ? 'Batch lineage non disponibile: riepilogo classificazione finanziaria non generato.' : 'Verificare che il batch sia stato creato con dati budget (importo, fonte) e che il BTI sia stato calcolato in fase di scoring.'}
    </div>
    `}

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE — ELIGIBILITY & DATA QUALITY (§6)
     Record classification + evidence distribution
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Eligibility &amp; Data Quality')}
  <div class="pc">

    <p style="font-size:10pt;color:#555670;line-height:1.6;margin-bottom:16pt;max-width:460pt;">
      Ogni record UEF è classificato da un gate di eligibilità prima del calcolo IU.
      La classificazione determina se un'iniziativa genera Impact Units, è tracciata solo in BTI, o è esclusa per design.
    </p>

    ${iuSummary ? (() => {
      const total = iuSummary.totalRecords;
      const elig  = iuSummary.computedRecords;
      const lim   = iuSummary.limitedRecords;
      const blk   = iuSummary.blockedRecords;
      const rev   = iuSummary.reviewRequiredRecords;
      const eligPct = total > 0 ? Math.round(elig / total * 100) : 0;
      const limPct  = total > 0 ? Math.round(lim  / total * 100) : 0;
      const blkPct  = total > 0 ? Math.round(blk  / total * 100) : 0;
      const revPct  = total > 0 ? Math.round(rev  / total * 100) : 0;
      return `
    <div class="elig-grid">
      <div class="elig-card" style="border-top:3pt solid #059669;">
        <div class="elig-count" style="color:#059669;">${elig}</div>
        <div class="elig-label">Eligible</div>
        <div class="elig-desc">${eligPct}% del totale · generano Impact Units</div>
      </div>
      <div class="elig-card" style="border-top:3pt solid #d97706;">
        <div class="elig-count" style="color:#d97706;">${lim}</div>
        <div class="elig-label">Limited</div>
        <div class="elig-desc">${limPct}% · economic relief · tracciati solo in BTI</div>
      </div>
      <div class="elig-card" style="border-top:3pt solid #dc2626;">
        <div class="elig-count" style="color:#dc2626;">${blk}</div>
        <div class="elig-label">Blocked</div>
        <div class="elig-desc">${blkPct}% · compliance baseline · IU = 0 by design</div>
      </div>
      <div class="elig-card" style="border-top:3pt solid #7778a0;">
        <div class="elig-count" style="color:#7778a0;">${rev}</div>
        <div class="elig-label">In Review</div>
        <div class="elig-desc">${revPct}% · IU computation sospesa</div>
      </div>
    </div>

    <div style="padding:10pt 14pt;background:#f8f8fc;border:1px solid #eaebf4;border-radius:4pt;font-size:8.5pt;color:#555670;line-height:1.6;margin-bottom:16pt;">
      <strong>Eligible:</strong> iniziative con potenziale di attivazione profonda — generano IU e contribuiscono al KORA Index. ·
      <strong>Limited (Economic Relief):</strong> benefit monetari (voucher, fringe, welfare wallet) — tracciati in BTI, no IU. ·
      <strong>Blocked (Compliance):</strong> formazione obbligatoria, sicurezza — esclusi per architettura, IU = 0. ·
      <strong>In Review:</strong> in attesa di validazione advisor — IU computation sospesa.
    </div>
    ${enrichment ? (() => {
      const lvl = enrichment.evidenceLevelBreakdown;
      const totalEv = Object.values(lvl).reduce((s,v) => s+v, 0);
      const lvlPct = (n: number) => totalEv > 0 ? Math.round(n/totalEv*100) : 0;
      const EV_DESC: Record<string, string> = {
        L0: 'Autodichiarato', L1: 'Fattura/documento', L2: 'Dato verificato provider',
        L3: 'Partecipazione confirmata', L4: 'Attestazione indipendente',
      };
      const EV_COLOR: Record<string, string> = { L0: '#dc2626', L1: '#d97706', L2: '#059669', L3: '#6156F5', L4: '#06032B' };
      return `
    <div class="ev-enrich-title">Distribuzione Livelli di Evidenza</div>
    <div class="ev-lvl-row">
      ${(['L0','L1','L2','L3','L4'] as const).map(l => `
      <div class="ev-lvl-card" style="border-top:2.5pt solid ${EV_COLOR[l]};">
        <div class="ev-lvl-label" style="color:${EV_COLOR[l]};">${l}</div>
        <div class="ev-lvl-count" style="color:${EV_COLOR[l]};">${lvlPct(lvl[l])}%</div>
        <div style="font-size:6.5pt;color:#9899b3;margin-top:3pt;">${EV_DESC[l]}</div>
        <div style="font-size:7pt;color:#b0b1cc;">${lvl[l]} record</div>
      </div>`).join('')}
    </div>
    ${enrichment.averageFinancialConfidence !== null ? `
    <div style="padding:8pt 12pt;background:#fafafa;border:1px solid #eaebf4;border-radius:4pt;font-size:8pt;color:#555670;">
      Confidence finanziaria media: <strong>${Math.round(enrichment.averageFinancialConfidence * 100)}%</strong>
      ${enrichment.averageFinancialConfidence < 0.5 ? ' <span style="color:#d97706;font-weight:600;">⚠ sotto soglia operativa (< 50%)</span>' : ''}
      &nbsp;·&nbsp; Record arricchiti manualmente: <strong>${enrichment.manualEnrichmentCount}</strong>
    </div>` : ''}
    `;
    })() : ''}
    `;
    })() : `
    <div style="padding:24pt;text-align:center;border:1px dashed #eaebf4;border-radius:6pt;color:#9899b3;">
      <div style="font-size:11pt;font-weight:600;color:#555670;margin-bottom:8pt;">Dati eligibilità non disponibili</div>
      <div style="font-size:9pt;">Completare intake, enrichment e scoring dalla pipeline v1.0+.</div>
    </div>
    `}

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE 6 — IMPACT UNITS™ TRACE LAYER
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('Impact Units™ — Strato di Computazione')}
  <div class="pc">

    <p style="font-size:10pt;color:#555670;line-height:1.6;margin-bottom:16pt;max-width:440pt;">
      Impact Units™ (IU) è lo strato computazionale canonico del 14° stage della metodologia KORA.
      Formula: IU = NM × BC × CQ × EV × CF × AGF. Ogni record UEF approvato genera un valore IU.
      Questa sezione mostra l'aggregato — i dettagli per-record (factor trace) sono riservati al server.
    </p>

    ${iuSummary ? (() => {
      const totalIU    = iuSummary.totalImpactUnits;
      const computed   = iuSummary.computedRecords;
      const total      = iuSummary.totalRecords;
      const computedPct = total > 0 ? Math.round((computed / total) * 100) : 0;
      const pillarKeys = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
      const pillarColors: Record<string, string> = {
        LIFE: '#10B981', GROWTH: '#6156F5', CONNECTION: '#F59E0B', IMPACT: '#EF4444', LEGACY: '#8B5CF6',
      };
      return `
    <div class="fg-kpi-row">
      <div class="fg-kpi fg-kpi-hi">
        <div class="fg-kpi-label">Total Impact Units™</div>
        <div class="fg-kpi-val">${totalIU > 0 ? totalIU.toFixed(2) : '—'}</div>
        <div class="fg-kpi-sub">IU generate da record approvati</div>
      </div>
      <div class="fg-kpi" style="border-color:#6156F5;background:#f5f4ff;">
        <div class="fg-kpi-label">Record Computati</div>
        <div class="fg-kpi-val" style="color:#6156F5;">${computed}<span style="font-size:10pt;font-weight:400;color:#9899b3;"> / ${total}</span></div>
        <div class="fg-kpi-sub">${computedPct}% dei record eligible producono IU</div>
      </div>
      <div class="fg-kpi">
        <div class="fg-kpi-label">Qualità Media (CQ)</div>
        <div class="fg-kpi-val">${Math.round(iuSummary.averageCq * 100)}%</div>
        <div class="fg-kpi-sub">completeness quality — media ponderata</div>
      </div>
      <div class="fg-kpi">
        <div class="fg-kpi-label">Verifica Media (EV)</div>
        <div class="fg-kpi-val">${Math.round(iuSummary.averageEv * 100)}%</div>
        <div class="fg-kpi-sub">evidence verification — media ponderata</div>
      </div>
    </div>

    ${totalIU > 0 ? `
    <div class="fg-bar-section">
      <div class="fg-bar-lbl">Distribuzione IU per Pillar</div>
      <div class="fg-class-grid">
        ${pillarKeys.map((p) => {
          const iu  = iuSummary.impactUnitsByPillar[p] ?? 0;
          const pct = totalIU > 0 ? Math.round((iu / totalIU) * 100) : 0;
          return `
        <div class="fg-class-card" style="border-color:${pillarColors[p]}33;background:${pillarColors[p]}0d;">
          <div class="fg-class-label" style="color:${pillarColors[p]};">${esc(p)}</div>
          <div class="fg-class-count">${iu > 0 ? iu.toFixed(2) : '—'}</div>
          <div class="fg-class-amount">${pct}% del totale IU</div>
        </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${iuSummary.blockedRecords > 0 || iuSummary.limitedRecords > 0 || iuSummary.reviewRequiredRecords > 0 ? `
    <div class="fg-board-note">
      ${iuSummary.blockedRecords > 0 ? `<strong>${iuSummary.blockedRecords} record Blocked by Design</strong> — compliance obbligatoria. IU = 0 per architettura. ` : ''}
      ${iuSummary.limitedRecords > 0 ? `<strong>${iuSummary.limitedRecords} record Economic Relief</strong> — tracciati solo in BTI. No IU. ` : ''}
      ${iuSummary.reviewRequiredRecords > 0 ? `<strong>${iuSummary.reviewRequiredRecords} record in Human Review</strong> — IU computation sospesa fino a revisione. ` : ''}
    </div>` : ''}

    <div class="fg-note">
      <strong>Nota metodologica:</strong> Impact Units™ è uno strato di computazione, non un punteggio di performance individuale.
      I fattori NM, BC, CQ, EV, CF e AGF sono stub pre-calibrazione empirica (KORA Foundation Light).
      CF (Continuity Factor) è una proxy sito-based in v0.1 — il valore canonico richiede dati cross-periodo post-PIB.
      Tutti i parametri vengono letti da <code>lib/methodology-config/v0.1.ts</code> — nessun valore codificato a mano.
      ${iuSummary.calibrationStatus ? `calibration_status: <strong>${esc(iuSummary.calibrationStatus)}</strong>` : ''} ·
      ${iuSummary.methodologyVersion ? `methodology: <strong>${esc(iuSummary.methodologyVersion)}</strong>` : ''}
    </div>
`;
    })() : `
    <div class="fg-stub">
      Impact Units™ non disponibili per questo batch.
      Verificare che il batch sia stato elaborato con la pipeline v1.0+ e che i record UEF abbiano approved_for_impact_units = true.
    </div>
    `}

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE 6B — PIB AGGREGATION SUMMARY (AG-01)
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('PIB Aggregation — Stage 11 / AG-01')}
  <div class="pc">

    <div class="fg-intro">
      Personal Impact Balance (PIB) è lo strato intermedio obbligatorio tra Impact Units™ e il KORA Index.
      Ogni calcolo del KORA Index passa attraverso i PIB individuali — regola AG-01 (doc 10 §26).
      In KORA Foundation Light, i record UEF sono aggregati per programma; i PIB individuali per lavoratore
      saranno disponibili in Pilot+ con la conferma di partecipazione via My KORA.
    </div>

    ${!pibAggregation && iuSummary ? `
    <div style="margin-bottom:18pt;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10pt;margin-bottom:12pt;">
        <div style="padding:14pt 12pt;border:1px solid #eaebf4;border-radius:4pt;background:#fafafa;text-align:center;">
          <div style="font-size:7pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9899b3;margin-bottom:5pt;">Lavoratori attivati (stima)</div>
          <div style="font-size:22pt;font-weight:700;color:#06032B;letter-spacing:-.03em;line-height:1;">${arPct}%</div>
          <div style="font-size:7pt;color:#9899b3;margin-top:3pt;">Activation Rate — bounded reach</div>
        </div>
        <div style="padding:14pt 12pt;border:1px solid #c7c4f8;border-radius:4pt;background:#f5f4ff;text-align:center;">
          <div style="font-size:7pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#6156F5;margin-bottom:5pt;">Attivazione profonda (stima)</div>
          <div style="font-size:22pt;font-weight:700;color:#6156F5;letter-spacing:-.03em;line-height:1;">${marPct}%</div>
          <div style="font-size:7pt;color:#9899b3;margin-top:3pt;">Meaningful Activation Rate — segnale primario</div>
        </div>
        <div style="padding:14pt 12pt;border:1px solid #eaebf4;border-radius:4pt;background:#fafafa;text-align:center;">
          <div style="font-size:7pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9899b3;margin-bottom:5pt;">Total Impact Units™</div>
          <div style="font-size:22pt;font-weight:700;color:#06032B;letter-spacing:-.03em;line-height:1;">${iuSummary.totalImpactUnits > 0 ? iuSummary.totalImpactUnits.toFixed(1) : '—'}</div>
          <div style="font-size:7pt;color:#9899b3;margin-top:3pt;">aggregate da ${iuSummary.computedRecords} record eligible</div>
        </div>
      </div>
      <div style="padding:12pt 16pt;background:#f5f4ff;border:1px solid #c7c4f8;border-radius:4pt;font-size:9pt;color:#3d3a6a;line-height:1.55;">
        <strong>AG-01 — Strato Intermedio Obbligatorio:</strong> In KORA Foundation Light, il PIB è utilizzato come
        strato aggregato di metodologia per garantire che il KORA Index non bypassa la fase di aggregazione individuale.
        I dati AR/MAR qui rappresentati derivano dal motore di attivazione (bounded reach, stima aggregata).
        <br>
        <strong>Il PIB individuale per lavoratore non è mai visibile al datore di lavoro</strong> — regola costituzionale D-04.
        I record PIB individuali saranno disponibili in Pilot+ con conferma partecipazione via My KORA.
      </div>
    </div>
    ` : ''}
    ${pibAggregation ? (() => {
      const totalIU    = pibAggregation.totalIU;
      const avgPIB     = pibAggregation.avgEstimatedPIB;
      const arPct2     = Math.round(pibAggregation.estimatedAR * 100);
      const marPct2    = Math.round(pibAggregation.estimatedMAR * 100);
      return `
    <div class="fg-kpi-row">
      <div class="fg-kpi">
        <div class="fg-kpi-val">${totalIU.toFixed(2)}</div>
        <div class="fg-kpi-label">Total Impact Units™</div>
      </div>
      <div class="fg-kpi">
        <div class="fg-kpi-val">${avgPIB.toFixed(3)}</div>
        <div class="fg-kpi-label">Avg Estimated PIB / worker attivo</div>
      </div>
      <div class="fg-kpi">
        <div class="fg-kpi-val">${pibAggregation.activatedWorkers}</div>
        <div class="fg-kpi-label">Lavoratori attivati (stima bounded reach)</div>
      </div>
      <div class="fg-kpi">
        <div class="fg-kpi-val">${pibAggregation.meaningfulWorkers}</div>
        <div class="fg-kpi-label">Lavoratori meaningful (stima bounded reach)</div>
      </div>
    </div>

    <div class="fg-kpi-row" style="margin-top:8pt;">
      <div class="fg-kpi">
        <div class="fg-kpi-val">${arPct2}%</div>
        <div class="fg-kpi-label">AR stimato (da motore attivazione)</div>
      </div>
      <div class="fg-kpi">
        <div class="fg-kpi-val">${marPct2}%</div>
        <div class="fg-kpi-label">MAR stimato (da motore attivazione)</div>
      </div>
      <div class="fg-kpi">
        <div class="fg-kpi-val">${pibAggregation.wbEstimate !== null ? pibAggregation.wbEstimate.toFixed(3) : '—'}</div>
        <div class="fg-kpi-label">EQW Gini${pibAggregation.wbEstimate === null ? ' (n/d — aggregate model)' : ''}</div>
      </div>
      <div class="fg-kpi">
        <div class="fg-kpi-val">${pibAggregation.workforceCount}</div>
        <div class="fg-kpi-label">Forza lavoro baseline</div>
      </div>
    </div>

    ${totalIU > 0 ? `
    <div style="margin-top:12pt;">
      <div style="font-size:8.5pt;font-weight:700;color:#06032B;margin-bottom:6pt;">IU per Pillar (componente PIB)</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6pt;">
      ${PILLAR_ORDER.map(p => {
        const iu    = pibAggregation.pillarTotals[p] ?? 0;
        const share = Math.round((pibAggregation.pillarShares[p] ?? 0) * 100);
        const color = PILLAR_COLORS[p] ?? '#6156F5';
        return `
        <div style="background:#f8f8fc;border:1px solid #eaebf4;border-radius:6pt;padding:8pt;text-align:center;">
          <div style="font-size:7pt;font-weight:700;color:${color};letter-spacing:.04em;">${esc(p)}</div>
          <div style="font-size:11pt;font-weight:700;color:#06032B;margin:3pt 0;">${iu.toFixed(2)}</div>
          <div style="font-size:7pt;color:#9899b3;">${share}% del totale</div>
        </div>`;
      }).join('')}
      </div>
    </div>
    ` : ''}

    <div class="fg-note" style="margin-top:12pt;">
      <strong>AG-01 — Mandatory Intermediate Layer:</strong> questo strato garantisce che il KORA Index
      non venga calcolato direttamente da aggregati aziendali bypassando il PIB individuale.
      In v0.1 (aggregate_estimate): AR/MAR derivati dal motore di attivazione (bounded reach).
      L'EQW Gini è null — richiede distribuzione PIB individuale.
      PIB individuale: <strong>mai visibile al datore di lavoro</strong> (D-04 / privacy constitutional rule).
      ${pibAggregation.estimationBasis === 'aggregate_estimate' ? `
      <span style="color:#d97706;font-weight:600;">estimation_basis=aggregate_estimate</span> ·
      PIB individuali disponibili in Pilot+ con My KORA participation confirmation.
      ` : `<span style="color:#059669;font-weight:600;">estimation_basis=individual_pib</span>`}
      · ${esc(pibAggregation.calibrationStatus)} · ${esc(pibAggregation.methodologyVersion)}
    </div>
`;
    })() : ''}

  </div>
  ${pageFooter()}
</div>


<!-- ═══════════════════════════════════════════
     PAGE 7 — EVIDENCE & CONFIDENCE
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
        <div class="ev-tier-val" style="color:#059669;">AR · MAR · EVQ · EQW</div>
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

    <div class="ev-enrich-section">
    ${enrichment ? (() => {
      const evl = enrichment.evidenceLevelBreakdown;
      const totalEvl = evl.L0 + evl.L1 + evl.L2 + evl.L3 + evl.L4;
      return `
      <div class="ev-enrich-title">Enrichment Trace — Approvati per scoring (${enrichment.approvedUefRecords} su ${enrichment.totalUefRecords} record totali)</div>

      <div class="ev-lvl-row">
        <div class="ev-lvl-card" style="border-color:#059669;background:#ecfdf5;">
          <div class="ev-lvl-label" style="color:#059669;">L3 / L4</div>
          <div class="ev-lvl-count" style="color:#059669;">${evl.L3 + evl.L4}</div>
          <div style="font-size:7pt;color:#059669;margin-top:3pt;">Terze parti / Verificato</div>
        </div>
        <div class="ev-lvl-card" style="border-color:#6156F5;background:#f5f4ff;">
          <div class="ev-lvl-label" style="color:#6156F5;">L2</div>
          <div class="ev-lvl-count" style="color:#6156F5;">${evl.L2}</div>
          <div style="font-size:7pt;color:#6156F5;margin-top:3pt;">Documento interno</div>
        </div>
        <div class="ev-lvl-card" style="border-color:#d97706;background:#fffbeb;">
          <div class="ev-lvl-label" style="color:#d97706;">L1</div>
          <div class="ev-lvl-count" style="color:#d97706;">${evl.L1}</div>
          <div style="font-size:7pt;color:#d97706;margin-top:3pt;">Auto-dichiarato</div>
        </div>
        <div class="ev-lvl-card" style="border-color:#fca5a5;background:#fef2f2;">
          <div class="ev-lvl-label" style="color:#dc2626;">L0</div>
          <div class="ev-lvl-count" style="color:#dc2626;">${evl.L0}</div>
          <div style="font-size:7pt;color:#dc2626;margin-top:3pt;">Nessuna evidenza</div>
        </div>
        <div class="ev-lvl-card">
          <div class="ev-lvl-label">Totale</div>
          <div class="ev-lvl-count">${totalEvl}</div>
          <div style="font-size:7pt;color:#9899b3;margin-top:3pt;">record classificati</div>
        </div>
      </div>

      <div class="ev-meta-row">
        <div class="ev-meta-card">
          <div class="ev-meta-label">Enrichment manuale</div>
          <div class="ev-meta-val">${enrichment.manualEnrichmentCount}</div>
          <div class="ev-meta-sub">record con override budget/evidenza manuale</div>
        </div>
        <div class="ev-meta-card">
          <div class="ev-meta-label">Enrichment completato (B11)</div>
          <div class="ev-meta-val">${enrichment.enrichedRecords}</div>
          <div class="ev-meta-sub">record arricchiti con classificazione B11</div>
        </div>
        <div class="ev-meta-card" style="${enrichment.needsEnrichmentOpen > 0 ? 'border-color:#fde68a;background:#fffbeb;' : ''}">
          <div class="ev-meta-label" style="${enrichment.needsEnrichmentOpen > 0 ? 'color:#92400e;' : ''}">Enrichment aperto</div>
          <div class="ev-meta-val" style="${enrichment.needsEnrichmentOpen > 0 ? 'color:#92400e;' : 'color:#059669;'}">${enrichment.needsEnrichmentOpen}</div>
          <div class="ev-meta-sub">${enrichment.needsEnrichmentOpen > 0 ? 'iniziative richiedono ancora dati budget/evidenza' : 'nessun enrichment pendente'}</div>
        </div>
        ${enrichment.averageFinancialConfidence !== null ? `
        <div class="ev-meta-card">
          <div class="ev-meta-label">Confidence finanziaria media</div>
          <div class="ev-meta-val">${Math.round(enrichment.averageFinancialConfidence * 100)}%</div>
          <div class="ev-meta-sub">media sui record approvati</div>
        </div>` : ''}
      </div>

      ${enrichment.remainingWarnings.length > 0 ? `
      <div class="ev-enrich-warning">
        <strong>Avvisi enrichment:</strong>
        <ul style="margin-top:5pt;margin-left:14pt;">
          ${enrichment.remainingWarnings.map(w => `<li style="margin-bottom:3pt;">${esc(w)}</li>`).join('')}
        </ul>
      </div>` : ''}
`;
    })() : `
      <div class="ev-enrich-stub">Enrichment trace non disponibile per questo Decision Pack.</div>
`}
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
     PAGE — KORA CONTRIBUTION™ (§8)
     Indicatore companion — non modifica KORA Index
     ═══════════════════════════════════════════ -->
<div class="page cp">
  ${pageHeader('KORA Contribution™ — Companion Indicator')}
  <div class="pc">

    ${contributionSummary ? (() => {
      const levelColor = (lv: string) => lv === 'alto' ? '#059669' : lv === 'medio' ? '#d97706' : '#9899b3';
      return `
    <div class="contrib-hero">
      <div class="contrib-score-block">
        <div class="contrib-score">${Math.round(contributionSummary.contributionScore)}</div>
        <div style="font-size:20pt;color:rgba(200,255,71,.5);font-weight:400;line-height:1;">/100</div>
        <div class="contrib-score-label">Contribution Score</div>
      </div>
      <div class="contrib-right">
        <div class="contrib-level" style="color:${levelColor(contributionSummary.contributionLevel)};">${esc(contributionSummary.contributionLevel.charAt(0).toUpperCase() + contributionSummary.contributionLevel.slice(1))}</div>
        <div class="contrib-desc">KORA Contribution™ misura l'impegno collettivo e l'attivazione dell'ecosistema aziendale.
        Non modifica il KORA Index — è un companion indicator che arricchisce il quadro diagnostico.</div>
      </div>
    </div>

    <div class="contrib-kpi-row">
      <div class="contrib-kpi">
        <div class="contrib-kpi-val">${contributionSummary.totalContributionIU.toFixed(1)}</div>
        <div class="contrib-kpi-label">Total Contribution IU</div>
      </div>
      <div class="contrib-kpi">
        <div class="contrib-kpi-val">${contributionSummary.initiativeCount}</div>
        <div class="contrib-kpi-label">Iniziative Contribution</div>
      </div>
      <div class="contrib-kpi">
        <div class="contrib-kpi-val">${contributionSummary.ecosystemPartnerCount}</div>
        <div class="contrib-kpi-label">Partner Ecosistema</div>
      </div>
    </div>

    ${contributionSummary.pillarSplit ? `
    <div style="margin-bottom:16pt;">
      <div style="font-size:7pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9899b3;margin-bottom:8pt;">Distribuzione Pillar Contribution</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8pt;">
        ${['IMPACT','CONNECTION','LEGACY'].map(p => {
          const pct = Math.round((contributionSummary.pillarSplit?.[p as 'IMPACT'|'CONNECTION'|'LEGACY'] ?? 0) * 100);
          return `<div style="padding:10pt;border:1px solid #eaebf4;border-radius:4pt;text-align:center;background:#fafafa;">
            <div style="font-size:7pt;font-weight:700;color:${PILLAR_COLORS[p]};letter-spacing:.04em;margin-bottom:4pt;">${esc(p)}</div>
            <div style="font-size:18pt;font-weight:700;color:#06032B;">${pct}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
    `;
    })() : `
    <div class="contrib-na">
      <div class="contrib-na-label">KORA Contribution™ — Dati non disponibili in questo pacchetto</div>
      <div class="contrib-na-desc">
        KORA Contribution™ è un indicatore companion che misura l'impegno collettivo e l'ecosistema aziendale.
        I dati di Contribution non sono ancora attivi per questo periodo di reporting.
        Disponibile in pilota con attivazione della pipeline KORA Contribution.
      </div>
    </div>
    `}

    <div class="contrib-nota" style="margin-top:${contributionSummary ? '0' : '18pt'};">
      <strong>KORA Contribution™ è un indicatore companion.</strong>
      Non modifica il KORA Index™ e non entra nella formula di calcolo. Viene mostrato separatamente come
      misura complementare dell'attivazione collettiva e dell'ecosistema di partner. &nbsp;·&nbsp;
      <span style="font-family:'Courier New',monospace;font-size:8pt;">notKoraIndexComponent: true</span>
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
          <div class="mp-desc">Il CS non è un componente del KORA Index v1.0 (peso = 0). È un indicatore di qualità dati — sempre mostrato affianco all'indice.</div>
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
      I campi chiave sono tracciati con provenance di origine: file sorgente, mappatura colonne, completamento manuale, merge multi-file o derivazione da regola.
    </div>

    <!-- B18 — Reporting Alignment / ESRS Readiness ─────────────────────── -->
    <div class="ra-section">
      <div class="ra-header">Reporting Alignment / ESRS Readiness</div>

      <div class="ra-noclaim">
        <strong>KORA does not certify CSRD/ESRS compliance.</strong>
        This section maps approved initiatives to possible reporting support areas and evidence gaps.
        Use as input for board, HR, ESG and sustainability reporting discussions — not as assurance or certification.
      </div>

      ${reportingAlignment && reportingAlignment.areas.length > 0 ? `
      <p style="font-size:8.5pt;color:#555670;margin-bottom:10pt;">
        <strong>${reportingAlignment.totalMappedInitiatives}</strong> approved initiative${reportingAlignment.totalMappedInitiatives !== 1 ? 's' : ''} mapped
        to ${reportingAlignment.areas.length} reporting area${reportingAlignment.areas.length !== 1 ? 's' : ''}.
      </p>

      ${reportingAlignment.areas.slice(0, 6).map(a => {
        const maxStrength =
          a.strong > 0 ? 'strong' :
          a.medium > 0 ? 'medium' : 'weak';
        const badgeClass =
          maxStrength === 'strong' ? 'ra-area-strong' :
          maxStrength === 'medium' ? 'ra-area-medium' : 'ra-area-weak';
        const strengthLabel =
          maxStrength === 'strong' ? 'Strong' :
          maxStrength === 'medium' ? 'Medium' : 'Weak';
        return `
      <div class="ra-area-row">
        <span class="ra-area-badge ${badgeClass}">${esc(strengthLabel)}</span>
        <div class="ra-area-body">
          <div class="ra-area-label">${esc(a.label)}</div>
          <div class="ra-area-meta">${a.count} initiative${a.count !== 1 ? 's' : ''} · ${a.strong > 0 ? `${a.strong} strong` : ''}${a.medium > 0 ? `${a.strong > 0 ? ' · ' : ''}${a.medium} medium` : ''}${a.weak > 0 ? `${(a.strong + a.medium) > 0 ? ' · ' : ''}${a.weak} weak` : ''} evidence</div>
          <div class="ra-area-evidence" style="font-size:6.5pt;color:#b0b1cc;">${esc(a.code)}</div>
        </div>
      </div>`;
      }).join('')}

      <div class="ra-caveat">${esc(reportingAlignment.caveat)}</div>
      ` : `
      <div class="ra-stub">
        Reporting alignment data not available for this period.
        Initiatives processed with B18 interpreter will populate this section.
      </div>
      <div class="ra-caveat">${esc('KORA does not certify CSRD/ESRS compliance. This section maps initiatives to possible reporting support areas only.')}</div>
      `}

      ${reportingReadiness ? (() => {
        const rdBadge = (r: string) =>
          r === 'report_ready'      ? 'rd-badge-ready'   :
          r === 'usable_with_caveat' ? 'rd-badge-caveat'  :
          r === 'needs_evidence'     ? 'rd-badge-needs'   : 'rd-badge-notready';
        const rdLabel = (r: string) =>
          r === 'report_ready'      ? 'Report Ready'     :
          r === 'usable_with_caveat' ? 'Usable + Caveat'  :
          r === 'needs_evidence'     ? 'Needs Evidence'   : 'Not Ready';

        return `
      <div style="margin-top:14pt;">
        <div class="ra-header">Evidence Gap Summary — Readiness per Reporting Area (B19)</div>

        <div class="rd-counters">
          <div class="rd-counter" style="border-color:#bbf7d0;background:#f0fdf4;">
            <div class="rd-counter-val" style="color:#166534;">${reportingReadiness.reportReady}</div>
            <div class="rd-counter-label">Report Ready</div>
          </div>
          <div class="rd-counter" style="border-color:#fde68a;background:#fffbeb;">
            <div class="rd-counter-val" style="color:#854d0e;">${reportingReadiness.usableWithCaveat}</div>
            <div class="rd-counter-label">Usable + Caveat</div>
          </div>
          <div class="rd-counter" style="border-color:#fca5a5;background:#fef2f2;">
            <div class="rd-counter-val" style="color:#991b1b;">${reportingReadiness.needsEvidence}</div>
            <div class="rd-counter-label">Needs Evidence</div>
          </div>
          <div class="rd-counter">
            <div class="rd-counter-val" style="color:#6b7280;">${reportingReadiness.notReady}</div>
            <div class="rd-counter-label">Not Ready</div>
          </div>
        </div>

        ${reportingReadiness.topEvidenceGaps.length > 0 ? `
        <div style="font-size:7pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9899b3;margin-bottom:8pt;">Top Evidence Gaps — Azioni prioritarie</div>
        <div class="rd-gap-list">
          ${reportingReadiness.topEvidenceGaps.map(g => `
          <div class="rd-gap-row">
            <div class="rd-gap-head">
              <span class="rd-gap-label">${esc(g.areaLabel)}</span>
              <span class="rd-gap-badge ${rdBadge(g.readiness)}">${esc(rdLabel(g.readiness))}</span>
              <span class="rd-gap-owner">${esc(g.ownerHint)}</span>
            </div>
            ${g.missingEvidence.length > 0 ? `
            <div class="rd-gap-missing">
              <strong>Mancante:</strong> ${g.missingEvidence.map(m => esc(m)).join(' · ')}
            </div>` : ''}
            ${g.recommendedActions.length > 0 ? `
            <div class="rd-gap-actions">
              <strong>Azione:</strong> ${g.recommendedActions.slice(0,2).map(a => esc(a)).join(' · ')}
            </div>` : ''}
          </div>`).join('')}
        </div>` : ''}

        <div class="rd-b19-caveat">
          <strong>Nota B19:</strong> ${esc(reportingReadiness.caveat)}
          Report Ready ≠ CSRD compliant. Usable with Caveat = evidenza parziale, utile ma non sufficiente per reporting formale.
          Needs Evidence = raccogliere dati prima di includere nell'ESG/CSR report.
        </div>
      </div>`;
      })() : ''}
    </div>
    <!-- ─────────────────────────────────────────────────────────────────── -->

    <!-- B138-B: Normative Mapping Light — framework-level board summary ─────── -->
    ${normativeMappingLight ? (() => {
      const strengthLabel = (s: string) =>
        s === 'direct' ? 'Diretto' : s === 'indirect' ? 'Indiretto' : 'Contestuale';
      const strengthClass = (s: string) =>
        s === 'direct' ? 'nm-strength-direct' : s === 'indirect' ? 'nm-strength-indirect' : 'nm-strength-ctx';

      const byFramework = new Map<string, { label: string; areas: typeof normativeMappingLight.areas }>();
      for (const a of normativeMappingLight.areas) {
        if (!byFramework.has(a.framework)) {
          byFramework.set(a.framework, { label: a.framework_label, areas: [] });
        }
        byFramework.get(a.framework)!.areas.push(a);
      }

      const FW_USE_LABELS: Record<string, string> = {
        ESRS_S1:     'base indicativa per la lettura delle condizioni di lavoro',
        GRI:         'lettura indicativa delle evidenze relative a benefit e occupazione',
        ISO_30414:   'contesto indicativo per organizzare evidenze su competenze e formazione',
        UNI_PdR_125: 'contesto indicativo per evidenze su equità e inclusione',
        SDG:         'riferimento aspirazionale per iniziative salute e benessere',
      };

      return `
    <div class="nm-section">
      <div class="nm-header">Normative Mapping Light</div>
      <div class="nm-subtitle">Indicative, non-certificative alignment · Foundation Light</div>
      <div class="nm-disclaimer">
        KORA mappa le evidenze di attivazione organizzativa rispetto ad alcuni riferimenti di human capital e sustainability reporting.
        La mappatura è indicativa e non-certificativa: non costituisce compliance ESG, audit, assurance, reporting legale,
        certificazione o validazione scientifica. Non sostituisce consulenza legale, ESG, fiscale, HR o attività di assurance/revisione.
      </div>
      <div class="nm-badge-row">
        <span class="nm-badge-calib">pre_empirical_calibration</span>
        <span class="nm-badge-noclaim">non-certificativa · non-compliance · non-assurance</span>
      </div>
      <table class="nm-table">
        <thead>
          <tr>
            <th>Framework</th>
            <th>Aree</th>
            <th>Pillar principali</th>
            <th>Forza prevalente</th>
            <th>Uso indicativo</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from(byFramework.entries()).map(([fwKey, fw]) => {
            const areaCount = fw.areas.length;
            const allPillars = [...new Set(fw.areas.flatMap(a => a.kora_pillars))].slice(0, 3);
            const strengthCounts: Record<string, number> = {};
            for (const a of fw.areas) strengthCounts[a.strength] = (strengthCounts[a.strength] ?? 0) + 1;
            const prevStrength = Object.entries(strengthCounts).sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'indirect';
            const usoIt = FW_USE_LABELS[fwKey] ?? '';
            return `
          <tr>
            <td><strong>${esc(fw.label)}</strong></td>
            <td style="text-align:center;">${areaCount}</td>
            <td>${allPillars.map(p => `<span class="nm-pillar">${esc(p)}</span>`).join(' ')}</td>
            <td><span class="nm-strength ${strengthClass(prevStrength)}">${esc(strengthLabel(prevStrength))}</span></td>
            <td style="font-size:6.5pt;color:#666;">${esc(usoIt)}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="nm-footer">
        v${esc(normativeMappingLight.version)} · ${normativeMappingLight.areas.length} aree totali · ${byFramework.size} framework
      </div>
    </div>`;
    })() : ''}
    <!-- ─────────────────────────────────────────────────────────────────── -->

    <!-- B79-P0-4: Methodology disclosure — mandatory pilot-grade framing ────── -->
    <div style="margin-top:18pt;padding:12pt 14pt;background:#faf9ff;border:1px solid #d4d2f8;border-radius:6pt;">
      <div style="font-size:8pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6156F5;margin-bottom:8pt;">Note Metodologiche — KORA Foundation Light</div>
      <table style="width:100%;border-collapse:collapse;font-size:7.5pt;color:#444;">
        <tbody>
          <tr style="border-bottom:1px solid #e8e7f7;">
            <td style="padding:5pt 8pt;font-weight:600;color:#06032B;width:38%;">Stato calibrazione</td>
            <td style="padding:5pt 8pt;"><span style="background:#f0f0f9;color:#6156F5;padding:2px 8px;border-radius:3px;font-size:7pt;font-weight:700;">pre_empirical_calibration</span> — pesi v0.1 provvisori. Calibrazione definitiva (Delphi Study) è pianificata post-pilot. Output diagnostici e di pilota, non certificati.</td>
          </tr>
          <tr style="border-bottom:1px solid #e8e7f7;">
            <td style="padding:5pt 8pt;font-weight:600;color:#06032B;">NM — Normalized Magnitude</td>
            <td style="padding:5pt 8pt;">NM = 1.0 in KORA Foundation Light (stub uniforme). La calibrazione empirica differenzierà l'intensità per tipo di evento. Tutti i valori IU riflettono questo stub.</td>
          </tr>
          <tr style="border-bottom:1px solid #e8e7f7;">
            <td style="padding:5pt 8pt;font-weight:600;color:#06032B;">CF — Continuity Factor</td>
            <td style="padding:5pt 8pt;">CF è una proxy sito/cluster in v0.1. Il valore canonico (cross-periodo, basato su PIB individuale) richiede dati multi-periodo non disponibili in questo pilota.</td>
          </tr>
          <tr style="border-bottom:1px solid #e8e7f7;">
            <td style="padding:5pt 8pt;font-weight:600;color:#06032B;">Pesi KORA Index v1.0</td>
            <td style="padding:5pt 8pt;">REACH 25% · QUALITY 30% · EQUITY 25% · BTI 20% — calibrazione v0.1 pre-empirica. Non validati esternamente. Non vi è benchmark di settore disponibile in KORA Foundation Light.</td>
          </tr>
          <tr>
            <td style="padding:5pt 8pt;font-weight:600;color:#06032B;">Uso consentito</td>
            <td style="padding:5pt 8pt;">Output diagnostico per discussione interna e pilota KORA. Non regulatory-grade. Non sostituisce analisi HR, consulenza ESG, legale o fiscale certificata. Non utilizzare per decisioni operative senza revisione advisor KORA.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mp-prov">
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Organizzazione</div>
        <div class="mp-prov-val">${esc(meta.companyName)}</div>
      </div>
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Codice azienda</div>
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
      <div class="mp-prov-item">
        <div class="mp-prov-lbl">Fonte dati</div>
        <div class="mp-prov-val">${meta.isLiveData ? 'Dati reali aziendali' : 'Dati sintetici demo'}</div>
      </div>
    </div>

  </div>
  ${pageFooter()}
</div>

${/* ── 10 Diagnostic Components + 4 Macroblocks (v1.0) ── */ ''}
${(components && components.length > 0) || (macroblocks && macroblocks.length > 0) ? `
<div class="page" style="padding:28pt 32pt;">
  <div style="font-size:8pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#6156F5;margin-bottom:12pt;">
    Scomposizione Metodologica — KORA KORA Foundation Light
  </div>

  ${macroblocks && macroblocks.length > 0 ? `
  <div style="margin-bottom:18pt;">
    <div style="font-size:7pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#06032B;margin-bottom:8pt;">4 Macroblocchi</div>
    <table style="width:100%;border-collapse:collapse;font-size:8pt;">
      <thead>
        <tr style="background:#f0f0fa;">
          <th style="text-align:left;padding:5pt 7pt;color:#555670;font-weight:600;">Macroblocco</th>
          <th style="text-align:center;padding:5pt 7pt;color:#555670;font-weight:600;">Peso</th>
          <th style="text-align:center;padding:5pt 7pt;color:#555670;font-weight:600;">Score</th>
          <th style="text-align:left;padding:5pt 7pt;color:#555670;font-weight:600;">Barra</th>
        </tr>
      </thead>
      <tbody>
        ${macroblocks.map(m => `
        <tr style="border-top:1px solid #eaebf4;">
          <td style="padding:5pt 7pt;font-weight:600;color:#06032B;">${esc(m.label || m.code)}</td>
          <td style="padding:5pt 7pt;text-align:center;color:#555670;">${Math.round(m.weight * 100)}%</td>
          <td style="padding:5pt 7pt;text-align:center;font-weight:700;color:#06032B;">${Math.round(m.score)}/100</td>
          <td style="padding:5pt 7pt;">
            <div style="background:#eaebf4;border-radius:3pt;height:7pt;width:120pt;">
              <div style="background:#6156F5;border-radius:3pt;height:7pt;width:${Math.round(Math.min(100,Math.max(0,m.score)))}%;"></div>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${components && components.length > 0 ? `
  <div>
    <div style="font-size:7pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#06032B;margin-bottom:8pt;">10 Componenti Diagnostici</div>
    <table style="width:100%;border-collapse:collapse;font-size:7.5pt;">
      <thead>
        <tr style="background:#f0f0fa;">
          <th style="text-align:left;padding:4pt 6pt;color:#555670;font-weight:600;">Cod.</th>
          <th style="text-align:left;padding:4pt 6pt;color:#555670;font-weight:600;">Componente</th>
          <th style="text-align:center;padding:4pt 6pt;color:#555670;font-weight:600;">Macroblocco</th>
          <th style="text-align:center;padding:4pt 6pt;color:#555670;font-weight:600;">Valore</th>
          <th style="text-align:center;padding:4pt 6pt;color:#555670;font-weight:600;">Peso eff.</th>
        </tr>
      </thead>
      <tbody>
        ${components.map(c => {
          const pct    = Math.round(c.value * 100);
          const extLbl = c.external ? '(esterno)' : '';
          const mbLbl  = c.macroblock ?? extLbl;
          return `
        <tr style="border-top:1px solid #eaebf4;">
          <td style="padding:4pt 6pt;font-weight:700;color:#6156F5;">${esc(c.code)}</td>
          <td style="padding:4pt 6pt;color:#06032B;">${esc(c.label)}</td>
          <td style="padding:4pt 6pt;text-align:center;color:#555670;font-size:7pt;">${esc(mbLbl)}</td>
          <td style="padding:4pt 6pt;text-align:center;font-weight:600;color:#06032B;">${pct}%</td>
          <td style="padding:4pt 6pt;text-align:center;color:#555670;">${c.external ? '0 (est.)' : (Math.round(c.weight * 1000) / 10) + '%'}</td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="margin-top:8pt;font-size:6.5pt;color:#9899b3;line-height:1.5;">
      CS = Data Reliability Index™ — esterno al KORA Index™ (peso = 0). Mostrato sempre affianco come indicatore di affidabilità dati. ${meta.methodologyNote}
    </div>
  </div>` : ''}

  ${pageFooter()}
</div>` : ''}


${/* ── Evidence Intelligence™ — aggregate-only, no individual data ── */ ''}
${(iuSummary || enrichment) ? (() => {
  const avgEv   = iuSummary?.averageEv ?? null;
  const lvl     = enrichment?.evidenceLevelBreakdown ?? null;
  const cs      = koraIndex.confidenceScore;
  const total   = lvl ? (lvl.L0 + lvl.L1 + lvl.L2 + lvl.L3 + lvl.L4) : 0;
  const pct     = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
  const evPct   = avgEv !== null ? Math.round(avgEv * 100) : null;
  const evLabel = avgEv === null ? 'N/D' : avgEv >= 0.75 ? 'Buona' : avgEv >= 0.60 ? 'Accettabile' : 'Debole';
  const evColor = avgEv === null ? '#9899b3' : avgEv >= 0.75 ? '#059669' : avgEv >= 0.60 ? '#d97706' : '#dc2626';
  return `
<div class="page" style="padding:28pt 32pt;">
  <div style="font-size:8pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#6156F5;margin-bottom:12pt;">
    Evidence Intelligence™ — Qualità Evidenza Aggregata
  </div>

  <div style="font-size:7pt;color:#9899b3;margin-bottom:14pt;">
    Indicatore metodologico Foundation Light · Aggregate only — nessun dato individuale lavoratore ·
    non modifica KORA Index™ né IU · pre_empirical_calibration · not_kora_index_component: true
  </div>

  ${avgEv !== null ? `
  <div style="display:flex;gap:16pt;margin-bottom:16pt;flex-wrap:wrap;">

    <div style="flex:1;min-width:120pt;border:1px solid #eaebf4;border-radius:6pt;padding:12pt;background:#f8f8fc;">
      <div style="font-size:7pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#555670;margin-bottom:6pt;">
        EV Factor Medio
      </div>
      <div style="font-size:22pt;font-weight:800;color:${evColor};line-height:1;">${evPct}%</div>
      <div style="margin-top:4pt;font-size:7.5pt;font-weight:600;color:${evColor};">${evLabel}</div>
      <div style="margin-top:6pt;font-size:6.5pt;color:#9899b3;line-height:1.5;">
        EV = Evidence Verification factor nella formula IU™.<br>
        Range metodologico: 0.50 (solo autodichiarato) → 1.00 (terza parte verificata).
      </div>
    </div>

    <div style="flex:1;min-width:120pt;border:1px solid #eaebf4;border-radius:6pt;padding:12pt;background:#f8f8fc;">
      <div style="font-size:7pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#555670;margin-bottom:6pt;">
        Data Reliability Index™
      </div>
      <div style="font-size:22pt;font-weight:800;color:#6156F5;line-height:1;">${Math.round(cs * 100)}%</div>
      <div style="margin-top:4pt;font-size:7.5pt;font-weight:600;color:#6156F5;">
        ${cs >= 0.70 ? 'High' : cs >= 0.45 ? 'Medium' : 'Low'} confidence
      </div>
      <div style="margin-top:6pt;font-size:6.5pt;color:#9899b3;line-height:1.5;">
        Mostrato sempre affianco al KORA Index™.<br>
        Peso nel KORA Index™ = 0 (indicatore esterno di affidabilità dati).
      </div>
    </div>
  </div>` : ''}

  ${lvl && total > 0 ? `
  <div style="margin-bottom:16pt;">
    <div style="font-size:7pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#06032B;margin-bottom:8pt;">
      Distribuzione Livelli Evidenza (L0–L4)
    </div>

    <div style="display:flex;height:10pt;border-radius:4pt;overflow:hidden;margin-bottom:6pt;">
      ${pct(lvl.L4) > 0 ? `<div style="width:${pct(lvl.L4)}%;background:#059669;" title="L4: ${pct(lvl.L4)}%"></div>` : ''}
      ${pct(lvl.L3) > 0 ? `<div style="width:${pct(lvl.L3)}%;background:#34d399;" title="L3: ${pct(lvl.L3)}%"></div>` : ''}
      ${pct(lvl.L2) > 0 ? `<div style="width:${pct(lvl.L2)}%;background:#d97706;" title="L2: ${pct(lvl.L2)}%"></div>` : ''}
      ${pct(lvl.L1) > 0 ? `<div style="width:${pct(lvl.L1)}%;background:#f87171;" title="L1: ${pct(lvl.L1)}%"></div>` : ''}
      ${pct(lvl.L0) > 0 ? `<div style="width:${pct(lvl.L0)}%;background:#dc2626;" title="L0: ${pct(lvl.L0)}%"></div>` : ''}
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:7.5pt;">
      <thead>
        <tr style="background:#f0f0fa;">
          <th style="text-align:left;padding:4pt 6pt;color:#555670;font-weight:600;">Livello</th>
          <th style="text-align:left;padding:4pt 6pt;color:#555670;font-weight:600;">Descrizione</th>
          <th style="text-align:center;padding:4pt 6pt;color:#555670;font-weight:600;">Conteggio</th>
          <th style="text-align:center;padding:4pt 6pt;color:#555670;font-weight:600;">%</th>
          <th style="text-align:left;padding:4pt 6pt;color:#555670;font-weight:600;">Barra</th>
        </tr>
      </thead>
      <tbody>
        ${[
          { code:'L4', label:'Verificata terza parte', count: lvl.L4, color:'#059669' },
          { code:'L3', label:'Verificata interna', count: lvl.L3, color:'#34d399' },
          { code:'L2', label:'Documentazione parziale', count: lvl.L2, color:'#d97706' },
          { code:'L1', label:'Autodichiarata con fonte', count: lvl.L1, color:'#f87171' },
          { code:'L0', label:'Autodichiarata', count: lvl.L0, color:'#dc2626' },
        ].map(row => `
        <tr style="border-top:1px solid #eaebf4;">
          <td style="padding:4pt 6pt;font-weight:700;color:#06032B;">${row.code}</td>
          <td style="padding:4pt 6pt;color:#555670;">${row.label}</td>
          <td style="padding:4pt 6pt;text-align:center;font-weight:600;color:#06032B;">${row.count}</td>
          <td style="padding:4pt 6pt;text-align:center;color:#555670;">${pct(row.count)}%</td>
          <td style="padding:4pt 6pt;">
            <div style="background:#eaebf4;border-radius:3pt;height:6pt;width:80pt;">
              <div style="background:${row.color};border-radius:3pt;height:6pt;width:${pct(row.count)}%;"></div>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div style="margin-top:8pt;font-size:6.5pt;color:#9899b3;line-height:1.5;">
      L0–L4 classificati da UEF pipeline per ogni iniziativa approvata per scoring.
      L3/L4 = evidenza forte · L2 = parziale/accettabile · L0/L1 = autodichiarata/debole.
      Total record nella distribuzione: ${total}.
    </div>
  </div>` : '<div style="font-size:8pt;color:#9899b3;margin-bottom:12pt;">Distribuzione livelli evidenza non disponibile per questo periodo.</div>'}

  <div style="border-top:1px solid #eaebf4;padding-top:10pt;font-size:6.5pt;color:#9899b3;line-height:1.6;">
    Evidence Intelligence™ è un indicatore metodologico KORA Foundation Light.
    Non modifica il KORA Index™ né la formula IU™.
    EV factor è una componente della formula IU — il suo miglioramento può contribuire a migliorare l'Evidence Quality (EVQ).
    Data Reliability Index™ è esterno al KORA Index™ (peso = 0): sempre mostrato affianco come indicatore di affidabilità.
    Aggregate only — nessun dato individuale lavoratore · pre_empirical_calibration · not_kora_index_component: true
  </div>

  ${pageFooter()}
</div>`;
})() : ''}

${(() => {
  // ── Activation Opportunities — B87-B ──────────────────────────────────────
  // Deterministic rule-based recommendations from KORA signals. No AI. No LLM.
  // Top 5 opportunities by priority.
  // not_kora_index_component: true · not_predictions: true · not_roi_claims: true

  const signals = deriveSignalsSlim({
    safeguardStatus:          koraIndex.safeguardStatus,
    confidenceScore:          koraIndex.confidenceScore,
    activationRate:           koraIndex.activationRate,
    meaningfulActivationRate: koraIndex.meaningfulActivationRate,
    components:               (components ?? []).map(c => ({ code: c.code, value: c.value })),
    pillarDistribution:       pillarDistribution ?? {},
    economicReliefShare:      bti
      ? bti.economicReliefSpend / Math.max(bti.totalPeopleWelfareBudget, 1)
      : undefined,
  });

  const opps: ActivationOpportunity[] = activationOpportunityService.computeFromSignals(signals).slice(0, 5);
  if (opps.length === 0) return '';

  const priorityLabel = (p: OpportunityPriority): string =>
    p === 'critical' ? 'CRITICA' : p === 'high' ? 'ALTA' : p === 'medium' ? 'MEDIA' : 'BASSA';

  const priorityColor = (p: OpportunityPriority): string =>
    p === 'critical' ? '#9E3B2F' : p === 'high' ? '#C76F3D' : p === 'medium' ? '#8A5A00' : '#9899b3';

  const priorityBg = (p: OpportunityPriority): string =>
    p === 'critical' ? '#fef2f2' : p === 'high' ? '#fff7f0' : p === 'medium' ? '#fffbeb' : '#f9fafb';

  return `
<div class="page" style="page-break-before:always;">
  <div style="margin-bottom:22pt;">
    <p style="font-size:7pt;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#6156F5;margin-bottom:6pt;">
      Activation Opportunity Engine™
    </p>
    <p style="font-size:16pt;font-weight:800;letter-spacing:-.02em;color:#06032B;margin-bottom:4pt;">
      Opportunità di Attivazione
    </p>
    <p style="font-size:8.5pt;color:#7778a0;line-height:1.5;margin-bottom:0;">
      Raccomandazioni deterministiche basate sui segnali KORA. Nessuna AI. Nessuna previsione. Nessuna claim ROI.
      Ogni opportunità è spiegata dal segnale che l'ha generata. KORA Foundation Light — pre-calibrazione empirica.
    </p>
  </div>

  ${opps.map((opp, idx) => `
  <div style="background:#fafafa;border:1pt solid #eaebf4;border-radius:5pt;margin-bottom:12pt;overflow:hidden;break-inside:avoid;">
    <div style="height:3pt;background:${opp.pillar === 'ALL' ? '#6156F5' : opp.pillar === 'COMPANY' ? '#C76F3D' : '#C76F3D'};"></div>
    <div style="padding:12pt 14pt;">
      <div style="display:flex;align-items:center;gap:8pt;margin-bottom:8pt;flex-wrap:wrap;">
        <span style="font-size:5.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;background:${priorityBg(opp.priority)};color:${priorityColor(opp.priority)};border:1pt solid ${priorityColor(opp.priority)}44;border-radius:10pt;padding:2pt 7pt;">
          ${priorityLabel(opp.priority)}
        </span>
        ${opp.pillar !== 'ALL' && opp.pillar !== 'COMPANY'
          ? `<span style="font-size:5.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6156F5;background:#f5f4ff;border:1pt solid #c7c4f8;border-radius:10pt;padding:2pt 7pt;">${opp.pillar}</span>`
          : ''}
        <span style="font-size:7pt;font-weight:600;color:#06032B;">${esc(opp.title)}</span>
      </div>

      <div style="background:#f5f4ff;border:1pt solid #e0defd;border-radius:4pt;padding:8pt 10pt;margin-bottom:8pt;">
        <p style="font-size:6pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6156F5;margin-bottom:3pt;">Segnale rilevato</p>
        <p style="font-size:7.5pt;color:#3d3a6a;line-height:1.4;margin:0;">${esc(opp.sourceSignal)}</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8pt;">
        <div style="background:#f0fdf4;border:1pt solid #bbf7d0;border-radius:4pt;padding:7pt 9pt;">
          <p style="font-size:6pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#166534;margin-bottom:3pt;">Beneficio atteso</p>
          <p style="font-size:7.5pt;color:#14532d;line-height:1.4;margin:0;">${esc(opp.expectedImpact)}</p>
        </div>
        <div style="background:#fff7f0;border:1pt solid #fed7aa;border-radius:4pt;padding:7pt 9pt;">
          <p style="font-size:6pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#C76F3D;margin-bottom:3pt;">Azione raccomandata</p>
          <p style="font-size:7.5pt;color:#7c2d12;line-height:1.4;margin:0;">${esc(opp.recommendedAction)}</p>
        </div>
      </div>

      <p style="font-size:6pt;color:#9899b3;letter-spacing:.08em;text-transform:uppercase;margin:7pt 0 0 0;">
        Regola ${opp.ruleId} · ${idx + 1}/${opps.length} opportunità · nessuna AI
      </p>
    </div>
  </div>`).join('')}

  <div style="border-top:1pt solid #eaebf4;padding-top:9pt;font-size:6.5pt;color:#9899b3;line-height:1.6;">
    Activation Opportunity Engine™ — regole deterministiche · no AI · no LLM · no previsioni · no claim ROI.
    Le opportunità sono derivate dai segnali KORA (AR, MAR, EVQ, INT, CONT, EQS, Pillar Distribution, Confidence Score).
    Non modificano il KORA Index™ né alcuna formula metodologica.
    KORA Foundation Light · pre_empirical_calibration · not_kora_index_component: true
  </div>

  ${pageFooter()}
</div>`;
})()}


</body>
</html>`;
}
