// lib/decision-pack/html-template.ts
// Executive-grade HTML template for KORA Decision Pack PDF.
// SERVER-SIDE ONLY — uses fs/path for logo embedding.
// Target: board-ready, strategy-consulting grade, McKinsey-style.
//
// Design system:
//   #06032B — deep navy (brand base, strong text)
//   #6156F5 — KORA purple (primary accent, section markers)
//   #C8FF47 — KORA lime (single highlight dot per cover, very selective)
//   neutrals — #F8F8FC light lavender-grey, #eaebf4 borders, #9899b3 secondary text

import fs from 'fs';
import path from 'path';
import type { PdfData } from './pdf-data';

function getLogoBase64(variant: 'white' | 'dark'): string {
  const file = variant === 'white' ? 'logo-white.png' : 'logo-dark.png';
  const filePath = path.join(process.cwd(), 'public', 'kora', file);
  try {
    const buf = fs.readFileSync(filePath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    // Fallback: transparent 1×1 pixel PNG if asset missing
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

function fmtNum(n: number, decimals = 1) { return n.toFixed(decimals); }
function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function safeguardColor(s: string) {
  if (s === 'CLEAR')   return '#059669';
  if (s === 'WARNING') return '#d97706';
  if (s === 'FLAGGED') return '#dc2626';
  return '#6b7280';
}
function safeguardBg(s: string) {
  if (s === 'CLEAR')   return '#ecfdf5';
  if (s === 'WARNING') return '#fffbeb';
  if (s === 'FLAGGED') return '#fef2f2';
  return '#f9fafb';
}
function safeguardLabel(s: string) {
  if (s === 'CLEAR')   return '&#11044; CLEAR';
  if (s === 'WARNING') return '&#9711; WARNING';
  if (s === 'FLAGGED') return '&#8855; FLAGGED';
  return s;
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildDecisionPackHtml(data: PdfData): string {
  const logoWhite = getLogoBase64('white');
  const logoDark  = getLogoBase64('dark');
  const { meta, koraIndex, auditSummary } = data;

  const generatedAt   = fmtDateTime(meta.generatedAt);
  const sf            = koraIndex.safeguardStatus;
  const sfColor       = safeguardColor(sf);
  const sfBg          = safeguardBg(sf);
  const kiVal         = fmtNum(koraIndex.value);
  const arPct         = Math.round(koraIndex.activationRate * 100);
  const marPct        = Math.round(koraIndex.meaningfulActivationRate * 100);
  const csPct         = Math.round(koraIndex.confidenceScore * 100);

  // Strategic reading — derived from live data values, no recalculation
  const insights = [
    {
      label: 'Attivazione organizzativa',
      text: `L'organizzazione registra un Activation Rate del ${arPct}%, con una quota di attivazione significativa (Meaningful AR) pari al ${marPct}%. ${sf === 'CLEAR' ? 'Il profilo supera le soglie operative dell\'Activation Safeguard, qualificando l\'output per la fase pilot.' : sf === 'WARNING' ? 'Il profilo è in zona WARNING — uno o più parametri sono tra soglia minima e operativa. Si raccomanda un\'analisi di allargamento della partecipazione.' : 'Il profilo è sotto soglia minima. Il Decision Pack è preliminare e richiede revisione metodologica prima di qualsiasi uso operativo.'}`,
    },
    {
      label: 'Confidence Score e qualità del dato',
      text: `Il Confidence Score è ${csPct}%, indicatore esterno al KORA Index che misura la qualità e completezza dell\'evidenza disponibile. Il CS non influenza il valore del KORA Index: è un\'informazione complementare sulla solidità del dato. Un CS più elevato si ottiene aumentando la copertura di fonti verificate e la completezza dei record UEF.`,
    },
    {
      label: 'KORA Index e Activation Safeguard',
      text: `Il KORA Index è ${kiVal}, calcolato su metodologia KORA v0.1 (pre-empirical calibration). Lo stato dell\'Activation Safeguard è "${sf}". ${sf === 'CLEAR' ? 'L\'organizzazione soddisfa i criteri AR ≥ 40% e MAR ≥ 30%, condizione necessaria per output interpretativi qualificati.' : sf === 'WARNING' ? 'Uno o più parametri di attivazione richiedono attenzione. Il KORA Index è generato ma deve essere contestualizzato prima dell\'uso decisionale.' : 'I parametri di attivazione non raggiungono le soglie minime (AR < 20% o MAR < 15%). Necessaria una revisione del perimetro di attivazione.'} I pesi dei componenti v3 saranno calibrati empiricamente nella fase post-pilot (Delphi Study).`,
    },
    {
      label: 'Posizionamento metodologico',
      text: `Questo Decision Pack è generato da KORA Foundation Light con dati sintetici su tenant OP-001. La fase attuale è pre-empirical calibration: i valori rappresentano intelligence diagnostica di pilot, non output certificati né raccomandazioni operative formali. La validazione empirica dei pesi del KORA Index v3 è pianificata post-pilot. Ogni interpretazione deve essere validata con il team metodologico KORA prima di presentazioni a board o stakeholder.`,
    },
  ];

  const recommendations = [
    { n: '01', title: 'Avviare Gate 3B — revisione legal/privacy', text: 'Prima di introdurre dati reali, completare la revisione: policy di pseudonimizzazione, retention, consenso worker e right-to-erasure. Gate 3B è prerequisito per qualsiasi pilot con dati reali.' },
    { n: '02', title: 'Definire scope e popolazione del pilot', text: 'Identificare il perimetro organizzativo: unità di business, periodo, fonti dati. Verificare che ogni segmento rendicontato abbia almeno 10 worker (N≥10 enforcement è non negoziabile).' },
    { n: '03', title: 'Revisione advisor metodologico', text: 'Far revisionare questo Decision Pack draft con un advisor KORA prima di presentarlo a board, HR director o stakeholder ESG. Il pack richiede revisione umana prima di essere promosso da draft a ready.' },
    { n: '04', title: 'Mappare e verificare le fonti dati', text: 'Completare il Data Source Register: welfare provider, LMS, HR system, ESG. Per ogni fonte verificare formato, frequenza e livello di evidenza (verified / partially verified / unverified).' },
    { n: '05', title: 'Pianificare la calibrazione empirica', text: 'Coordinarsi con il team KORA per il Delphi Study che calibrerà i pesi definitivi del KORA Index v3. La fase pre-empirical calibration è temporanea — i pesi v0.1 sono provvisori.' },
    { n: '06', title: 'Preparare comunicazione interna workforce', text: 'KORA misura l\'attivazione organizzativa — non individui, non performance, non welfare. Definire un piano di comunicazione chiaro per la workforce prima del pilot: la trasparenza metodologica è fondamentale per la fiducia.' },
  ];

  const auditRows = auditSummary.slice(0, 10).map(e => `
    <tr>
      <td class="at-action">${escHtml(e.action)}</td>
      <td class="at-type">${e.resourceType ? escHtml(e.resourceType) : '—'}</td>
      <td class="at-ts">${e.createdAt ? escHtml(fmtDateTime(e.createdAt)) : '—'}</td>
    </tr>`).join('');

  const dpVersionShort = meta.decisionPackVersionId.length > 34
    ? meta.decisionPackVersionId.slice(0, 34) + '…'
    : meta.decisionPackVersionId;

  const css = `
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size:A4; margin:0; }
    body {
      font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
      color:#06032B; background:#fff;
      -webkit-print-color-adjust:exact; print-color-adjust:exact;
      font-size:10pt; line-height:1.5;
    }
    .page {
      width:210mm; position:relative; overflow:hidden;
      page-break-after:always; break-after:page;
    }

    /* ── COVER ── */
    .cover { background:#06032B; height:297mm; display:flex; flex-direction:column; }
    .cv-top { padding:36pt 40pt 0; display:flex; align-items:center; justify-content:space-between; }
    .cv-logo { height:26pt; width:auto; }
    .cv-badge {
      font-size:6.5pt; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
      color:rgba(255,255,255,.4); border:1px solid rgba(255,255,255,.15);
      padding:4pt 8pt; border-radius:2pt;
    }
    .cv-body { flex:1; display:flex; flex-direction:column; justify-content:center; padding:0 40pt; }
    .cv-eyebrow {
      font-size:7.5pt; font-weight:600; letter-spacing:.25em; text-transform:uppercase;
      color:#6156F5; margin-bottom:14pt;
    }
    .cv-title {
      font-size:40pt; font-weight:700; color:#fff; letter-spacing:-.025em;
      line-height:1.02; margin-bottom:6pt;
    }
    .cv-sub { font-size:15pt; font-weight:400; color:rgba(255,255,255,.45); letter-spacing:-.01em; margin-bottom:36pt; }
    .cv-rule { width:32pt; height:2pt; background:#6156F5; margin-bottom:28pt; }
    .cv-meta { display:grid; grid-template-columns:1fr 1fr; gap:14pt; margin-bottom:28pt; }
    .cv-ml { font-size:6.5pt; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.3); margin-bottom:3pt; }
    .cv-mv { font-size:11pt; font-weight:500; color:rgba(255,255,255,.82); letter-spacing:-.01em; }
    .cv-ver { font-size:7pt; color:rgba(255,255,255,.22); letter-spacing:.03em; line-height:1.4; font-family:'Courier New',monospace; }
    .cv-bottom {
      padding:18pt 40pt; border-top:1px solid rgba(255,255,255,.07);
      display:flex; align-items:center; justify-content:space-between;
    }
    .cv-disclaimer { font-size:7pt; color:rgba(255,255,255,.28); letter-spacing:.04em; line-height:1.45; max-width:300pt; }
    .cv-lime { width:6pt; height:6pt; border-radius:50%; background:#C8FF47; flex-shrink:0; }

    /* ── CONTENT PAGES ── */
    .cp {
      background:#fff; padding:28pt 40pt 22pt;
      height:297mm; display:flex; flex-direction:column;
    }
    .ph {
      display:flex; align-items:center; justify-content:space-between;
      padding-bottom:13pt; border-bottom:1px solid #eaebf4; margin-bottom:22pt;
    }
    .ph-left { display:flex; align-items:center; gap:9pt; }
    .ph-bar { width:3pt; height:13pt; background:#6156F5; border-radius:1.5pt; }
    .ph-label { font-size:7pt; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#6156F5; }
    .ph-right { display:flex; align-items:center; gap:11pt; }
    .ph-tenant { font-size:7pt; color:#c7c8dc; letter-spacing:.08em; }
    .ph-logo { height:15pt; width:auto; opacity:.65; }
    .pc { flex:1; overflow:hidden; }
    .pf {
      margin-top:auto; padding-top:11pt; border-top:1px solid #eaebf4;
      display:flex; align-items:center; justify-content:space-between;
    }
    .pf-text { font-size:6.5pt; color:#b0b1cc; letter-spacing:.04em; }
    .pf-badge {
      font-size:6pt; font-weight:700; color:#d97706; background:#fffbeb;
      border:1px solid #fde68a; padding:2pt 6pt; border-radius:2pt; letter-spacing:.05em;
    }

    /* ── EXECUTIVE SNAPSHOT ── */
    .ki-hero {
      display:flex; align-items:flex-start; gap:16pt;
      padding:18pt 22pt; background:#06032B; border-radius:5pt;
      margin-bottom:16pt; position:relative; overflow:hidden;
    }
    .ki-hero::after {
      content:''; position:absolute; right:-16pt; bottom:-16pt;
      width:70pt; height:70pt; border-radius:50%; background:rgba(97,86,245,.14);
    }
    .ki-main { flex:1; }
    .ki-lbl { font-size:7pt; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.4); margin-bottom:3pt; }
    .ki-val { font-size:50pt; font-weight:700; color:#fff; letter-spacing:-.03em; line-height:1; margin-bottom:3pt; }
    .ki-meta { font-size:7.5pt; color:rgba(255,255,255,.35); letter-spacing:.04em; }
    .ki-right { display:flex; flex-direction:column; gap:9pt; align-items:flex-end; }
    .sf-badge {
      display:inline-block; font-size:9pt; font-weight:700; letter-spacing:.06em;
      padding:6pt 12pt; border-radius:3pt;
      color:${sfColor}; background:${sfBg};
    }
    .ki-calib { font-size:6.5pt; color:rgba(255,255,255,.28); text-align:right; line-height:1.35; max-width:110pt; }

    /* ── KPI GRID ── */
    .kpi-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:9pt; margin-bottom:14pt; }
    .kpi {
      padding:13pt 15pt; border:1px solid #eaebf4; border-radius:4pt; background:#fafafa;
    }
    .kpi-hi { border-color:#c7c4f8; background:#f5f4ff; }
    .kpi-lbl { font-size:6.5pt; font-weight:700; letter-spacing:.15em; text-transform:uppercase; color:#9899b3; margin-bottom:5pt; }
    .kpi-val { font-size:22pt; font-weight:700; color:#06032B; letter-spacing:-.02em; line-height:1; }
    .kpi-sub { font-size:7.5pt; color:#9899b3; margin-top:3pt; }

    /* ── INTERPRETATION ── */
    .interp {
      padding:11pt 15pt; border-left:3pt solid ${sfColor}; background:${sfBg};
      border-radius:0 4pt 4pt 0; margin-bottom:12pt;
    }
    .interp-lbl { font-size:6.5pt; font-weight:700; letter-spacing:.15em; text-transform:uppercase; color:${sfColor}; margin-bottom:3pt; }
    .interp-text { font-size:9pt; color:#3d3a6a; line-height:1.52; }

    /* ── PACK VERSION BOX ── */
    .pvb {
      padding:9pt 14pt; background:#f8f8fc; border:1px solid #eaebf4;
      border-radius:4pt; display:flex; gap:18pt; flex-wrap:wrap;
    }
    .pvb-lbl { font-size:6.5pt; font-weight:700; letter-spacing:.15em; text-transform:uppercase; color:#9899b3; margin-bottom:2pt; }
    .pvb-val { font-size:7.5pt; font-weight:500; color:#3d3a6a; font-family:'Courier New',monospace; }

    /* ── INSIGHT CARDS ── */
    .insight-list { display:flex; flex-direction:column; gap:12pt; }
    .insight {
      padding:13pt 17pt; border:1px solid #eaebf4; border-radius:4pt;
      display:flex; gap:13pt; align-items:flex-start;
    }
    .ins-num { font-size:17pt; font-weight:700; color:#eaebf4; letter-spacing:-.03em; line-height:1; flex-shrink:0; width:18pt; }
    .ins-title { font-size:9.5pt; font-weight:700; color:#06032B; letter-spacing:-.01em; margin-bottom:3pt; }
    .ins-text { font-size:8pt; color:#555670; line-height:1.56; }
    .ins-note {
      margin-top:14pt; padding:9pt 13pt; background:#f8f8fc;
      border:1px solid #eaebf4; border-radius:4pt;
    }

    /* ── METRICS ROW ── */
    .mr { display:grid; grid-template-columns:repeat(4,1fr); gap:8pt; margin-bottom:18pt; }
    .mm {
      padding:9pt 10pt; border:1px solid #eaebf4; border-radius:4pt; text-align:center;
    }
    .mm-val { font-size:17pt; font-weight:700; color:#06032B; letter-spacing:-.02em; line-height:1; }
    .mm-lbl { font-size:6.5pt; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#9899b3; margin-top:3pt; }

    /* ── AUDIT TABLE ── */
    .sec-lbl { font-size:7pt; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#9899b3; margin-bottom:7pt; margin-top:14pt; }
    .at { width:100%; border-collapse:collapse; font-size:7.5pt; }
    .at thead tr th {
      text-align:left; padding:5pt 9pt; border-bottom:1.5px solid #06032B;
      font-size:6.5pt; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#06032B;
    }
    .at tbody tr { border-bottom:1px solid #f0f0f6; }
    .at tbody tr:last-child { border-bottom:none; }
    .at-action { padding:5pt 9pt; font-size:7.5pt; color:#3d3a6a; font-weight:500; font-family:'Courier New',monospace; }
    .at-type { padding:5pt 9pt; font-size:7pt; color:#9899b3; }
    .at-ts { padding:5pt 9pt; font-size:7pt; color:#9899b3; white-space:nowrap; }

    /* ── BOUNDARY GRID ── */
    .bg { display:grid; grid-template-columns:1fr 1fr; gap:9pt; margin-bottom:14pt; }
    .bi {
      padding:11pt 13pt; border:1px solid #eaebf4; border-radius:4pt;
      display:flex; gap:9pt; align-items:flex-start;
    }
    .bi-ic { font-size:14pt; flex-shrink:0; line-height:1; margin-top:1pt; }
    .bi-title { font-size:8pt; font-weight:700; color:#06032B; margin-bottom:2pt; }
    .bi-desc { font-size:7pt; color:#7778a0; line-height:1.42; }
    .bn {
      padding:11pt 14pt; background:#f5f4ff; border:1px solid #c7c4f8;
      border-radius:4pt; font-size:8pt; color:#3d3a6a; line-height:1.52;
    }

    /* ── RECOMMENDATIONS ── */
    .rl { display:flex; flex-direction:column; gap:9pt; }
    .ri {
      display:flex; gap:13pt; align-items:flex-start;
      padding:11pt 15pt; border:1px solid #eaebf4; border-radius:4pt;
    }
    .ri-n { font-size:8.5pt; font-weight:700; color:#6156F5; letter-spacing:.06em; flex-shrink:0; width:16pt; margin-top:1pt; }
    .ri-title { font-size:9pt; font-weight:700; color:#06032B; letter-spacing:-.01em; margin-bottom:2pt; }
    .ri-text { font-size:7.5pt; color:#555670; line-height:1.5; }
  `;

  const activationInterpText = sf === 'CLEAR'
    ? `L'organizzazione soddisfa i criteri dell'Activation Safeguard (AR ≥ 40%, MAR ≥ 30%). Il KORA Index è qualificato per la generazione di output interpretativi nella fase pilot.`
    : sf === 'WARNING'
    ? `Activation Safeguard in zona WARNING: uno o più parametri sono tra soglia minima e operativa. Il KORA Index è generato, ma richiede approfondimento prima di qualsiasi uso decisionale formale.`
    : `Attenzione: parametri di attivazione sotto soglia minima (AR < 20% o MAR < 15%). Il KORA Index è preliminare. Non utilizzare per decisioni operative senza revisione metodologica.`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>KORA Decision Pack — ${escHtml(meta.tenantCode)} — ${escHtml(meta.reportingPeriod)}</title>
<style>${css}</style>
</head>
<body>

<!-- ═══════════════════════════════════════════
     PAGE 1 — COVER
     ═══════════════════════════════════════════ -->
<div class="page cover">
  <div class="cv-top">
    <img src="${logoWhite}" class="cv-logo" alt="KORA">
    <span class="cv-badge">Synthetic Live v1</span>
  </div>

  <div class="cv-body">
    <div class="cv-eyebrow">Human Impact Intelligence Platform</div>
    <div class="cv-title">KORA<br>Decision Pack</div>
    <div class="cv-sub">Synthetic Live v1 &nbsp;·&nbsp; ${escHtml(meta.reportingPeriod)}</div>
    <div class="cv-rule"></div>
    <div class="cv-meta">
      <div>
        <div class="cv-ml">Organizzazione</div>
        <div class="cv-mv">${escHtml(meta.companyName)}</div>
      </div>
      <div>
        <div class="cv-ml">Tenant Code</div>
        <div class="cv-mv">${escHtml(meta.tenantCode)}</div>
      </div>
      <div>
        <div class="cv-ml">Periodo</div>
        <div class="cv-mv">${escHtml(meta.reportingPeriod)}</div>
      </div>
      <div>
        <div class="cv-ml">Generato il</div>
        <div class="cv-mv">${escHtml(generatedAt)}</div>
      </div>
    </div>
    <div class="cv-ver">
      Version: ${escHtml(dpVersionShort)}
      &nbsp;·&nbsp; Status: <span style="color:rgba(97,86,245,.7);font-weight:600;">${escHtml(meta.decisionPackStatus.toUpperCase())}</span>
    </div>
  </div>

  <div class="cv-bottom">
    <div class="cv-disclaimer">
      KORA Foundation Light &nbsp;·&nbsp; Dati sintetici, solo uso dimostrativo &nbsp;·&nbsp; Non è una certificazione<br>
      Non è consulenza legale, fiscale o privacy &nbsp;·&nbsp; Non basato su dati reali di persone o organizzazioni<br>
      KORA misura l'attivazione organizzativa — non individui. KORA Methodology v0.1 — pre_empirical_calibration.
    </div>
    <div class="cv-lime"></div>
  </div>
</div>


<!-- ═══════════════════════════════════════════
     PAGE 2 — EXECUTIVE SNAPSHOT
     ═══════════════════════════════════════════ -->
<div class="page cp">
  <div class="ph">
    <div class="ph-left"><div class="ph-bar"></div><span class="ph-label">Executive Snapshot</span></div>
    <div class="ph-right">
      <span class="ph-tenant">${escHtml(meta.tenantCode)} &nbsp;·&nbsp; ${escHtml(meta.reportingPeriod)}</span>
      <img src="${logoDark}" class="ph-logo" alt="KORA">
    </div>
  </div>

  <div class="pc">
    <div class="ki-hero">
      <div class="ki-main">
        <div class="ki-lbl">KORA Index</div>
        <div class="ki-val">${kiVal}</div>
        <div class="ki-meta">${escHtml(koraIndex.methodologyVersionId)} &nbsp;·&nbsp; ${escHtml(meta.decisionPackVersionId.slice(0,28))}…</div>
      </div>
      <div class="ki-right">
        <span class="sf-badge">${safeguardLabel(sf)}</span>
        <div class="ki-calib">pre_empirical<br>calibration<br>KORA Index v3</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi kpi-hi">
        <div class="kpi-lbl">Confidence Score</div>
        <div class="kpi-val">${csPct}%</div>
        <div class="kpi-sub">esterno al KORA Index</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Activation Rate</div>
        <div class="kpi-val">${arPct}%</div>
        <div class="kpi-sub">workforce con ≥1 IU</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Meaningful AR</div>
        <div class="kpi-val">${marPct}%</div>
        <div class="kpi-sub">sopra soglia materiale</div>
      </div>
    </div>

    <div class="interp">
      <div class="interp-lbl">Activation Safeguard &nbsp;·&nbsp; ${escHtml(sf)}</div>
      <div class="interp-text">${activationInterpText}</div>
    </div>

    <div class="pvb">
      <div>
        <div class="pvb-lbl">Decision Pack Version</div>
        <div class="pvb-val">${escHtml(dpVersionShort)}</div>
      </div>
      <div>
        <div class="pvb-lbl">Status</div>
        <div class="pvb-val" style="color:#d97706;font-family:inherit;font-weight:700;">${escHtml(meta.decisionPackStatus.toUpperCase())}</div>
      </div>
      <div>
        <div class="pvb-lbl">is_current</div>
        <div class="pvb-val" style="color:${koraIndex.isCurrent ? '#059669' : '#d97706'};font-family:inherit;font-weight:700;">${koraIndex.isCurrent ? '✓ YES' : 'NO'}</div>
      </div>
      <div>
        <div class="pvb-lbl">Componenti KORA Index</div>
        <div class="pvb-val">${koraIndex.componentCount > 0 ? koraIndex.componentCount : '10'} / 10</div>
      </div>
    </div>
  </div>

  <div class="pf">
    <span class="pf-text">KORA Foundation Light &nbsp;·&nbsp; Synthetic Data Only &nbsp;·&nbsp; Not a Certification</span>
    <span class="pf-badge">pre_empirical_calibration</span>
  </div>
</div>


<!-- ═══════════════════════════════════════════
     PAGE 3 — STRATEGIC READING
     ═══════════════════════════════════════════ -->
<div class="page cp">
  <div class="ph">
    <div class="ph-left"><div class="ph-bar"></div><span class="ph-label">Strategic Reading</span></div>
    <div class="ph-right">
      <span class="ph-tenant">${escHtml(meta.tenantCode)} &nbsp;·&nbsp; ${escHtml(meta.reportingPeriod)}</span>
      <img src="${logoDark}" class="ph-logo" alt="KORA">
    </div>
  </div>

  <div class="pc">
    <p style="font-size:8.5pt;color:#555670;line-height:1.6;margin-bottom:14pt;max-width:430pt;">
      Messaggi sintetici derivati dalla lettura dei dati live sintetici OP-001. Intelligence diagnostica di pilot — non raccomandazioni operative certificate. Validare con il team metodologico KORA prima di qualsiasi utilizzo formale.
    </p>
    <div class="insight-list">
      ${insights.map((ins, i) => `
      <div class="insight">
        <div class="ins-num">0${i + 1}</div>
        <div>
          <div class="ins-title">${escHtml(ins.label)}</div>
          <div class="ins-text">${escHtml(ins.text)}</div>
        </div>
      </div>`).join('')}
    </div>
    <div class="ins-note">
      <span style="font-size:7pt;color:#9899b3;line-height:1.5;">
        <span style="display:inline-block;width:5pt;height:5pt;border-radius:50%;background:#C8FF47;margin-right:4pt;vertical-align:middle;"></span>
        <strong style="color:#3d3a6a;">Nota metodologica:</strong>
        Questo Decision Pack è generato da dati sintetici su tenant OP-001 a scopo dimostrativo.
        Nessun valore si riferisce a dati reali o a specifiche organizzazioni.
      </span>
    </div>
  </div>

  <div class="pf">
    <span class="pf-text">KORA Foundation Light &nbsp;·&nbsp; Synthetic Data Only &nbsp;·&nbsp; Not a Certification</span>
    <span class="pf-badge">pre_empirical_calibration</span>
  </div>
</div>


<!-- ═══════════════════════════════════════════
     PAGE 4 — ACTIVATION & EVIDENCE
     ═══════════════════════════════════════════ -->
<div class="page cp">
  <div class="ph">
    <div class="ph-left"><div class="ph-bar"></div><span class="ph-label">Activation &amp; Evidence</span></div>
    <div class="ph-right">
      <span class="ph-tenant">${escHtml(meta.tenantCode)} &nbsp;·&nbsp; ${escHtml(meta.reportingPeriod)}</span>
      <img src="${logoDark}" class="ph-logo" alt="KORA">
    </div>
  </div>

  <div class="pc">
    <div class="mr">
      <div class="mm">
        <div class="mm-val" style="color:#6156F5;">${kiVal}</div>
        <div class="mm-lbl">KORA Index</div>
      </div>
      <div class="mm">
        <div class="mm-val" style="color:${sfColor};">${arPct}%</div>
        <div class="mm-lbl">Activation Rate</div>
      </div>
      <div class="mm">
        <div class="mm-val">${marPct}%</div>
        <div class="mm-lbl">Meaningful AR</div>
      </div>
      <div class="mm">
        <div class="mm-val">${csPct}%</div>
        <div class="mm-lbl">Confidence Score</div>
      </div>
    </div>

    <div style="padding:11pt 15pt;border:1px solid #eaebf4;border-radius:4pt;margin-bottom:4pt;background:#fafafa;">
      <div style="font-size:7pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#9899b3;margin-bottom:5pt;">Lettura Activation</div>
      <p style="font-size:8pt;color:#3d3a6a;line-height:1.55;">
        Con un Activation Rate di <strong>${arPct}%</strong> e un Meaningful Activation Rate di <strong>${marPct}%</strong>,
        ${arPct >= 80
          ? 'il profilo è ad alta intensità: la grande maggioranza della workforce ha generato Impact Units significative nel periodo.'
          : arPct >= 40
          ? 'il profilo è operativo. Il Meaningful AR indica che una quota sostanziale dell\'attivazione è di qualità significativa.'
          : 'il perimetro di attivazione è limitato. Raccomandato un\'analisi delle barriere di partecipazione prima del pilot con dati reali.'}
        Il Confidence Score (<strong>${csPct}%</strong>) è indicatore esterno: misura qualità e completezza dell'evidenza, non il livello di attivazione organizzativa.
      </p>
    </div>

    <div class="sec-lbl">Audit Trail — ultime ${Math.min(auditSummary.length, 10)} azioni</div>
    <table class="at">
      <thead>
        <tr>
          <th style="width:42%;">Azione</th>
          <th style="width:30%;">Resource Type</th>
          <th style="width:28%;">Timestamp</th>
        </tr>
      </thead>
      <tbody>
        ${auditRows || '<tr><td colspan="3" style="padding:7pt 9pt;color:#9899b3;font-size:7.5pt;">Nessun evento audit disponibile.</td></tr>'}
      </tbody>
    </table>
    <div style="margin-top:7pt;font-size:6.5pt;color:#c7c8dc;">
      Audit trail sintetico — nessun valore PII, token o secret incluso. Dati generati per uso dimostrativo.
    </div>
  </div>

  <div class="pf">
    <span class="pf-text">KORA Foundation Light &nbsp;·&nbsp; Synthetic Data Only &nbsp;·&nbsp; Not a Certification</span>
    <span class="pf-badge">pre_empirical_calibration</span>
  </div>
</div>


<!-- ═══════════════════════════════════════════
     PAGE 5 — METHODOLOGICAL & PRIVACY BOUNDARY
     ═══════════════════════════════════════════ -->
<div class="page cp">
  <div class="ph">
    <div class="ph-left"><div class="ph-bar"></div><span class="ph-label">Methodological &amp; Privacy Boundary</span></div>
    <div class="ph-right">
      <span class="ph-tenant">${escHtml(meta.tenantCode)} &nbsp;·&nbsp; ${escHtml(meta.reportingPeriod)}</span>
      <img src="${logoDark}" class="ph-logo" alt="KORA">
    </div>
  </div>

  <div class="pc">
    <p style="font-size:8.5pt;color:#3d3a6a;line-height:1.58;margin-bottom:14pt;max-width:440pt;">
      KORA è progettata secondo principi di privacy-by-design. I confini metodologici e di privacy sono parte non negoziabile del framework — nessun output può essere letto al di fuori di questi confini.
    </p>
    <div class="bg">
      <div class="bi">
        <div class="bi-ic">&#128274;</div>
        <div>
          <div class="bi-title">N≥10 Enforcement</div>
          <div class="bi-desc">Ogni segmento della workforce (dipartimento, seniority, sede) è rendicontato solo se conta ≥10 worker. Sotto soglia il segmento è soppresso o raggruppato in bucket anonimo.</div>
        </div>
      </div>
      <div class="bi">
        <div class="bi-ic">&#128737;</div>
        <div>
          <div class="bi-title">PII Guard attivo</div>
          <div class="bi-desc">Ogni payload in ingresso è analizzato per rilevamento automatico di PII (email, CF, IBAN, telefono, chiavi nome). PII rilevata viene redatta prima della persistenza.</div>
        </div>
      </div>
      <div class="bi">
        <div class="bi-ic">&#127970;</div>
        <div>
          <div class="bi-title">Tenant Isolation</div>
          <div class="bi-desc">Ogni tenant vede esclusivamente i propri dati. La segregazione è enforced via Row Level Security a livello database — non solo applicativo.</div>
        </div>
      </div>
      <div class="bi">
        <div class="bi-ic">&#128101;</div>
        <div>
          <div class="bi-title">Misura organizzativa, non individuale</div>
          <div class="bi-desc">Il KORA Index è un output company-level. I dati individuali (PIB, IU, UEF) esistono solo come stadi intermedi aggregati — mai visibili ai ruoli employer.</div>
        </div>
      </div>
      <div class="bi">
        <div class="bi-ic">&#128202;</div>
        <div>
          <div class="bi-title">Confidence Score esterno al KORA Index</div>
          <div class="bi-desc">Il CS non è un componente del KORA Index v3. È un indicatore esterno di qualità del dato: va sempre mostrato affianco al KORA Index, mai sommato o incorporato nel suo valore.</div>
        </div>
      </div>
      <div class="bi">
        <div class="bi-ic">&#9879;</div>
        <div>
          <div class="bi-title">Pre-empirical calibration</div>
          <div class="bi-desc">I pesi del KORA Index v3 sono in fase pre-empirical calibration (v0.1). La calibrazione definitiva (Delphi Study) è pianificata post-pilot. Nessun output è da considerarsi certificato.</div>
        </div>
      </div>
    </div>
    <div class="bn">
      <strong>KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.</strong><br>
      Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.<br>
      <span style="color:#6b6c8a;">Documento sintetico generato da dati dimostrativi. Non rappresenta una valutazione, una certificazione o un parere professionale.</span>
    </div>
  </div>

  <div class="pf">
    <span class="pf-text">KORA Foundation Light &nbsp;·&nbsp; Synthetic Data Only &nbsp;·&nbsp; Not a Certification</span>
    <span class="pf-badge">pre_empirical_calibration</span>
  </div>
</div>


<!-- ═══════════════════════════════════════════
     PAGE 6 — RECOMMENDATIONS & NEXT ACTIONS
     ═══════════════════════════════════════════ -->
<div class="page cp" style="page-break-after:avoid;break-after:avoid;">
  <div class="ph">
    <div class="ph-left"><div class="ph-bar"></div><span class="ph-label">Recommendations &amp; Next Actions</span></div>
    <div class="ph-right">
      <span class="ph-tenant">${escHtml(meta.tenantCode)} &nbsp;·&nbsp; ${escHtml(meta.reportingPeriod)}</span>
      <img src="${logoDark}" class="ph-logo" alt="KORA">
    </div>
  </div>

  <div class="pc">
    <p style="font-size:8.5pt;color:#555670;line-height:1.55;margin-bottom:12pt;max-width:440pt;">
      Azioni prioritarie per procedere dal Decision Pack draft verso un pilot operativo. Sequenza strutturata sui gate KORA.
    </p>
    <div class="rl">
      ${recommendations.map(r => `
      <div class="ri">
        <div class="ri-n">${escHtml(r.n)}</div>
        <div>
          <div class="ri-title">${escHtml(r.title)}</div>
          <div class="ri-text">${escHtml(r.text)}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div class="pf">
    <span class="pf-text">KORA Foundation Light &nbsp;·&nbsp; Synthetic Data Only &nbsp;·&nbsp; Not a Certification &nbsp;·&nbsp; Not Legal/Privacy Advice</span>
    <span style="font-size:6.5pt;color:#c7c8dc;">${escHtml(generatedAt)}</span>
  </div>
</div>

</body>
</html>`;
}
