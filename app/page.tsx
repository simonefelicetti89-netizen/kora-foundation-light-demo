// KORA Landing — Hero correction: #08061F, Impact Field, no logo in hero body
// Server component. No hooks, no backend, no sidebar.

import Image from 'next/image';
import Link from 'next/link';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { TOKENS } from '@/lib/design/kora-design-tokens';

// ── Constants ────────────────────────────────────────────────────────────────

const HERO_BG = '#08061F'; // near-black, no blue saturation — enterprise dark

// ── KORA Impact Field — Option A visual ──────────────────────────────────────
// 5 pillar nodes on orbital ring around KORA ring gauge center.
// Pure SVG static. No JS, no libraries.

const NODES = [
  { id: 'LIFE',       x: 220, y:  68, r: 8,   accent: true  },
  { id: 'GROWTH',     x: 353, y: 164, r: 6,   accent: false },
  { id: 'CONNECTION', x: 301, y: 322, r: 5.5, accent: false },
  { id: 'IMPACT',     x: 139, y: 322, r: 5.5, accent: false },
  { id: 'LEGACY',     x:  87, y: 164, r: 5,   accent: false },
] as const;

const CX = 220;
const CY = 210;

function KoraImpactField() {
  const R    = 46;
  const CIRC = 2 * Math.PI * R;
  const dash = (34 / 100) * CIRC;

  return (
    <svg
      viewBox="0 0 440 430"
      width="100%"
      style={{ maxWidth: 460, display: 'block' }}
      role="img"
      aria-label="KORA Impact Field — 5 pillar activation visualization, demo data"
    >
      {/* Label top */}
      <text x={CX} y={20} textAnchor="middle"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fill: 'rgba(247,245,239,0.25)', letterSpacing: '0.10em' }}>
        KORA INDEX v3 · FOUNDATION LIGHT · SYNTHETIC DEMO
      </text>

      {/* Outer dashed orbit */}
      <circle cx={CX} cy={CY} r={140} fill="none"
        stroke="rgba(247,245,239,0.06)" strokeWidth="1" strokeDasharray="5 9" />

      {/* Inner faint rings */}
      <circle cx={CX} cy={CY} r={95}  fill="none" stroke="rgba(247,245,239,0.025)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={52}  fill="none" stroke="rgba(247,245,239,0.025)" strokeWidth="1" />

      {/* Radial lines: center → each node */}
      {NODES.map((n) => (
        <line key={`l-${n.id}`}
          x1={CX} y1={CY} x2={n.x} y2={n.y}
          stroke="rgba(247,245,239,0.07)" strokeWidth="1"
        />
      ))}

      {/* Cross-orbit connectors between adjacent nodes (subtle) */}
      {NODES.map((n, i) => {
        const next = NODES[(i + 1) % NODES.length];
        return (
          <line key={`c-${n.id}`}
            x1={n.x} y1={n.y} x2={next.x} y2={next.y}
            stroke="rgba(247,245,239,0.04)" strokeWidth="1"
          />
        );
      })}

      {/* Center: ring gauge track */}
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="rgba(247,245,239,0.07)" strokeWidth="9" />

      {/* Center: ring gauge fill (34%) */}
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="#6156F5" strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${CIRC}`}
        transform={`rotate(-90 ${CX} ${CY})`}
      />

      {/* Center text */}
      <text x={CX} y={CY - 5} textAnchor="middle"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '22px', fontWeight: '700', fill: '#F7F5EF' }}>
        34
      </text>
      <text x={CX} y={CY + 14} textAnchor="middle"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '10px', fill: 'rgba(247,245,239,0.36)' }}>
        /100
      </text>

      {/* Nodes */}
      {NODES.map((n) => (
        <g key={n.id}>
          {n.accent && (
            <circle cx={n.x} cy={n.y} r={n.r + 9} fill="none"
              stroke="rgba(97,86,245,0.20)" strokeWidth="1" />
          )}
          <circle cx={n.x} cy={n.y} r={n.r}
            fill={n.accent ? '#6156F5' : 'rgba(247,245,239,0.52)'}
          />
        </g>
      ))}

      {/* Node labels */}
      <text x={CX} y={46} textAnchor="middle"
        style={{ fontFamily: 'monospace', fontSize: '8.5px', fill: 'rgba(247,245,239,0.44)', letterSpacing: '0.07em' }}>
        LIFE
      </text>
      <text x={374} y={168} textAnchor="start"
        style={{ fontFamily: 'monospace', fontSize: '8.5px', fill: 'rgba(247,245,239,0.36)', letterSpacing: '0.07em' }}>
        GROWTH
      </text>
      <text x={CX + 30} y={345} textAnchor="middle"
        style={{ fontFamily: 'monospace', fontSize: '8.5px', fill: 'rgba(247,245,239,0.36)', letterSpacing: '0.07em' }}>
        CONNECTION
      </text>
      <text x={CX - 30} y={345} textAnchor="middle"
        style={{ fontFamily: 'monospace', fontSize: '8.5px', fill: 'rgba(247,245,239,0.36)', letterSpacing: '0.07em' }}>
        IMPACT
      </text>
      <text x={66} y={168} textAnchor="end"
        style={{ fontFamily: 'monospace', fontSize: '8.5px', fill: 'rgba(247,245,239,0.36)', letterSpacing: '0.07em' }}>
        LEGACY
      </text>

      {/* Confidence Score — bottom right */}
      <text x={415} y={350} textAnchor="end"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fill: 'rgba(247,245,239,0.28)', letterSpacing: '0.10em' }}>
        CONFIDENCE SCORE
      </text>
      <text x={415} y={372} textAnchor="end"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '21px', fontWeight: '700', fill: '#6156F5' }}>
        60%
      </text>
      <text x={415} y={388} textAnchor="end"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fill: 'rgba(247,245,239,0.22)' }}>
        esterno · peso = 0
      </text>

      {/* Activation Safeguard — bottom center-right */}
      <circle cx={245} cy={404} r={4.5} fill="#D4A017" />
      <text x={256} y={409} textAnchor="start"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '10.5px', fontWeight: '600', fill: '#D4A017' }}>
        Warning
      </text>
      <text x={256} y={423} textAnchor="start"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fill: 'rgba(247,245,239,0.24)' }}>
        Activation Safeguard
      </text>
    </svg>
  );
}

// ── Page data ─────────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    id: 'diagnostic', title: 'Foundation Light Diagnostic',
    duration: '4–6 settimane', price: '€7.500–12.000',
    priceNote: 'indicativo · dipende da perimetro e qualità dati',
    highlight: false, deliverable: 'Board Pack Preview',
    items: [
      'Inventario e classificazione dati esistenti',
      'Eligibility Gate (Eligible / Limited / Blocked)',
      'KORA Index preliminare — 10 componenti',
      'Confidence Score e Activation Safeguard',
      'Activation Debt per pillar',
    ],
  },
  {
    id: 'pilot', title: 'Foundation Light Pilot',
    duration: '6–8 settimane', price: '€12.000–18.000',
    priceNote: 'include sessione advisor KORA e workshop esecutivo',
    highlight: true, deliverable: 'Decision Pack + Workshop',
    items: [
      'Tutto il pacchetto Diagnostic',
      'Budget-to-Human-Impact — lettura direzionale',
      'HR KPI preview (correlazione aggregata)',
      'Decision Pack completo — board-ready',
      'Workshop esecutivo (2 ore)',
    ],
  },
  {
    id: 'strategic', title: 'Strategic Pilot',
    duration: '8–10 settimane', price: '€18.000–25.000',
    priceNote: 'multi-sito o multi-reparto · advisor incluso',
    highlight: false, deliverable: 'Decision Pack + Board Workshop + Roadmap',
    items: [
      'Tutto il pacchetto Pilot',
      'Multi-sito o multi-reparto',
      'Roadmap di riallocazione budget dettagliata',
      'Board workshop C-suite',
      'Preparazione per fase Pilot Calibration',
    ],
  },
] as const;

const OUTPUTS = [
  { label: 'Executive Cockpit',    href: '/company',            accent: false, desc: 'KORA Index, Safeguard, priorità operative — prima lettura C-suite.' },
  { label: 'KORA Index Detail',    href: '/company/kora-index', accent: false, desc: '10 componenti, 4 macroblocchi, pipeline 14-stage, explainability.' },
  { label: 'Activation & Debt',    href: '/company/activation', accent: false, desc: 'Maggioranza silenziosa, concentrazione IU, Activation Debt per sito e pillar.' },
  { label: 'Financial Governance', href: '/company/financial',  accent: false, desc: 'Budget-to-Human-Impact, costo per IU, correlazione KPI aggregata.' },
  { label: 'Decision Pack',        href: '/company/reports',    accent: true,  desc: 'Report board-ready: KORA Index, pillar analysis, raccomandazioni e confini espliciti.' },
] as const;

const FAQS = [
  { q: 'È una piattaforma welfare o un marketplace?',       a: 'No. KORA non eroga benefit. Misura l\'attivazione organizzativa prodotta dalla spesa welfare e people — non la spesa stessa.' },
  { q: 'Avete bisogno di dati individuali dei lavoratori?', a: 'No. Il pilot lavora su dati aggregati per tipologia di iniziativa, dipartimento e sede. Nessun nominativo richiesto o accettato.' },
  { q: 'È una certificazione ESG o compliance normativa?',  a: 'No. Foundation Light è pre_empirical_calibration — output direzionale. Supporta rendicontazione CSR/ESG ma non garantisce conformità normativa e non sostituisce consulenza ESG, legale o assurance.' },
  { q: 'Si può partire da file Excel o CSV?',               a: 'Sì. Foundation Light è progettato per export standard: welfare provider, LMS, gestionale HR, file budget. Nessuna integrazione API richiesta.' },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-inter)', color: TOKENS.ink }}>

      {/* ── NAV — integrata con hero, dark seamless ───────────────────────── */}
      <nav
        style={{
          position:       'sticky',
          top:            0,
          zIndex:         50,
          background:     HERO_BG,
          borderBottom:   '1px solid rgba(247,245,239,0.07)',
          padding:        '0 3rem',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          height:         72,
        }}
      >
        {/* logo-white.png: light logo su fondo scuro. Clear space 24px rispettato via padding. */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <Image
            src="/kora/logo-white.png"
            alt="KORA"
            width={100}
            height={45}
            priority
            style={{ display: 'block', opacity: 0.86 }}
          />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/demo-guide"
            style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(247,245,239,0.58)', textDecoration: 'none' }}>
            Guida demo
          </Link>
          <Link href="/company"
            style={{
              fontSize: '13px', fontWeight: 600,
              color: '#F7F5EF',
              border: '1px solid rgba(247,245,239,0.24)',
              borderRadius: 7,
              padding: '8px 20px',
              textDecoration: 'none',
            }}>
            Executive Cockpit →
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          background:  HERO_BG,
          minHeight:   'calc(100vh - 72px)',
          display:     'flex',
          alignItems:  'center',
          padding:     '4rem 3rem',
        }}
      >
        <div style={{ maxWidth: 1160, margin: '0 auto', width: '100%' }}>
          <div className="grid gap-16 lg:grid-cols-2 items-center">

            {/* LEFT — statement, CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              <p style={{
                fontFamily:    'var(--font-inter)',
                fontWeight:    500,
                fontSize:      '10.5px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color:         'rgba(247,245,239,0.38)',
              }}>
                Human Impact Intelligence Platform
              </p>

              <h1
                className="font-kora-serif"
                style={{
                  fontSize:      'clamp(4rem, 8vw, 7rem)',
                  letterSpacing: '-0.042em',
                  lineHeight:    0.97,
                  color:         '#F7F5EF',
                  margin:        0,
                }}
              >
                Misura ciò che accade dopo la spesa.
              </h1>

              <p style={{
                fontSize:  '17px',
                color:     'rgba(247,245,239,0.68)',
                lineHeight: 1.65,
                maxWidth:  '52ch',
              }}>
                KORA trasforma dati aggregati su welfare, formazione e iniziative aziendali
                in intelligence di attivazione organizzativa, evidenze e Decision Pack board-ready.
              </p>

              {/* CTAs — visibili above fold */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.875rem' }}>
                <Link
                  href="#foundation-light"
                  style={{
                    borderRadius:  8,
                    background:    '#F7F5EF',
                    padding:       '13px 30px',
                    fontSize:      '14px',
                    fontWeight:    700,
                    color:         HERO_BG,
                    textDecoration:'none',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Scopri Foundation Light →
                </Link>
                <Link
                  href="/demo-guide"
                  style={{
                    borderRadius:  8,
                    border:        '1.5px solid rgba(247,245,239,0.26)',
                    padding:       '12px 28px',
                    fontSize:      '14px',
                    fontWeight:    600,
                    color:         'rgba(247,245,239,0.72)',
                    textDecoration:'none',
                  }}
                >
                  Guida demo
                </Link>
                <Link href="/company/reports"
                  style={{ fontSize: '13px', color: 'rgba(247,245,239,0.36)', textDecoration: 'none' }}>
                  Decision Pack
                </Link>
              </div>

              {/* Boundary */}
              <p style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(247,245,239,0.28)', lineHeight: 1.65 }}>
                KORA misura organizzazioni, non individui. · pre_empirical_calibration
              </p>
            </div>

            {/* RIGHT — KORA Impact Field (Option A) */}
            <div className="hidden lg:flex" style={{ justifyContent: 'center', alignItems: 'center' }}>
              <KoraImpactField />
            </div>

          </div>
        </div>
      </section>

      {/* ── IL VUOTO — canvas ────────────────────────────────────────────── */}
      <section style={{ background: TOKENS.canvas, padding: '6rem 3rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)', letterSpacing: '-0.030em', lineHeight: 1.12, marginBottom: '1.5rem', maxWidth: '18ch' }}
          >
            Le organizzazioni spendono. Ma non sanno cosa accade dopo.
          </p>
          <p style={{ fontSize: '15px', color: TOKENS.inkSecondary, lineHeight: 1.72, maxWidth: '58ch', marginBottom: '3.5rem' }}>
            Welfare, formazione, iniziative people: miliardi investiti ogni anno.
            La distanza tra la spesa e ciò che viene davvero attivato è invisibile, non misurata.
            KORA nasce per rendere leggibile quella distanza.
          </p>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '1rem' }}>
                Cosa le aziende vedono oggi
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  'Spesa welfare: totale annuo allocato',
                  'Training completions: count registrato',
                  'Partecipazione: percentuale aggregata',
                  'Engagement survey: punteggio medio',
                  'ESG reporting: dati rendicontati',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '14px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: TOKENS.inkHint, marginTop: 2 }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: '1rem' }}>
                Cosa KORA rivela
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  'Activation Rate: % workforce con attivazione verificata',
                  'Impact Units: intensità per pillar e lavoratore',
                  'Activation Debt: budget non convertito in attivazione',
                  'Confidence Score: qualità delle evidenze raccolte',
                  'Decision Pack: raccomandazioni board-ready spiegabili',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '14px', color: TOKENS.ink, lineHeight: 1.55 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: TOKENS.accent, marginTop: 2 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY (white) ──────────────────────────────────────────────── */}
      <section style={{ background: TOKENS.surface, padding: '5rem 3rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Una nuova categoria
          </p>
          <h2 className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '3rem' }}>
            Non welfare. Non HR. Non sorveglianza.
          </h2>
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '1rem' }}>
                KORA non è — mai
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {['Welfare platform o benefits marketplace','HR dashboard o strumento di valutazione lavoratori','Sistema di sorveglianza, ranking o gamification','Certificazione ESG automatica o compliance garantita','ROI garantito o previsione causale di outcome'].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '14px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: 'rgba(20,18,46,0.22)', marginTop: 2 }}>✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: '1rem' }}>
                KORA è
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {['Human Impact Intelligence Platform','Misura organizzazioni — mai individui','Collega budget, attivazione verificata, evidenza, decisione','KORA Index · Confidence Score · Activation Safeguard','Metodologia versionata, spiegabile, privacy-first'].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '14px', color: TOKENS.ink, lineHeight: 1.55 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: TOKENS.accent, marginTop: 2 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUNDATION LIGHT (canvas) ─────────────────────────────────────── */}
      <section id="foundation-light" style={{ background: TOKENS.canvas, padding: '6rem 3rem', borderTop: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Offerta pilot
          </p>
          <h2 className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '0.875rem' }}>
            Foundation Light
          </h2>
          <p style={{ fontSize: '15px', color: TOKENS.inkSecondary, lineHeight: 1.70, maxWidth: '60ch', marginBottom: '0.75rem' }}>
            Un percorso guidato da 4 a 10 settimane, supportato dal team KORA.
            Non un SaaS self-service — un prodotto diagnostico con deliverable verificati e confini metodologici espliciti.
          </p>
          <p style={{ fontSize: '12px', color: TOKENS.inkHint, marginBottom: '3rem', lineHeight: 1.6 }}>
            Il costo dipende da perimetro, qualità dei dati e siti coinvolti.
            Ogni pilot inizia con una valutazione preliminare — senza impegno automatico.
          </p>

          <div className="grid gap-5 sm:grid-cols-3" style={{ marginBottom: '3rem' }}>
            {PACKAGES.map((pkg) => (
              <div key={pkg.id} style={{
                background:    TOKENS.surface,
                border:        pkg.highlight ? `2px solid ${TOKENS.accent}` : TOKENS.cardBorder,
                borderRadius:  14, padding: '1.625rem',
                display: 'flex', flexDirection: 'column', gap: 16,
                position: 'relative',
                boxShadow: pkg.highlight ? `0 0 0 4px ${TOKENS.accent}10` : 'none',
              }}>
                {pkg.highlight && (
                  <span style={{ position: 'absolute', top: -13, left: 18, fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: TOKENS.accent, color: '#FFF', borderRadius: 4, padding: '2px 9px' }}>
                    Raccomandato
                  </span>
                )}
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 600, background: pkg.highlight ? `${TOKENS.accent}14` : TOKENS.inkBorder, color: pkg.highlight ? TOKENS.accent : TOKENS.inkHint, borderRadius: 4, padding: '2px 8px' }}>
                    {pkg.duration}
                  </span>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: TOKENS.ink, marginTop: 10, lineHeight: 1.3 }}>{pkg.title}</p>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                  {pkg.items.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: 8, fontSize: '12.5px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0, color: TOKENS.inkHint, marginTop: 1 }}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: pkg.highlight ? `1px solid ${TOKENS.accent}33` : TOKENS.cardBorder, paddingTop: 14 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '1.875rem', color: TOKENS.ink, letterSpacing: '-0.025em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {pkg.price}
                  </p>
                  <p style={{ fontSize: '10.5px', color: TOKENS.inkHint, marginTop: 4, lineHeight: 1.5 }}>{pkg.priceNote}</p>
                  <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.inkSecondary, marginTop: 8 }}>Deliverable: {pkg.deliverable}</p>
                </div>
              </div>
            ))}
          </div>

          <details style={{ borderRadius: 12, border: TOKENS.cardBorderStrong, overflow: 'hidden', background: TOKENS.surface }}>
            <summary style={{ cursor: 'pointer', padding: '1rem 1.25rem', fontSize: '13px', fontWeight: 600, color: TOKENS.inkSecondary, userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Domande frequenti sul pilot
              <span style={{ fontSize: '11px', color: TOKENS.inkHint, fontWeight: 400 }}>espandi ↓</span>
            </summary>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ padding: '1rem 1.25rem', borderTop: TOKENS.cardBorder }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 5 }}>{faq.q}</p>
                <p style={{ fontSize: '12.5px', color: TOKENS.inkSecondary, lineHeight: 1.70 }}>{faq.a}</p>
              </div>
            ))}
          </details>
        </div>
      </section>

      {/* ── OUTPUTS (white) ───────────────────────────────────────────────── */}
      <section style={{ background: TOKENS.surface, padding: '5rem 3rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Output Foundation Light
          </p>
          <h2 className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '2.5rem' }}>
            Cosa produce KORA
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 14, border: TOKENS.cardBorderStrong, overflow: 'hidden' }}>
            {OUTPUTS.map((out, i) => (
              <Link key={out.href} href={out.href} style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '1.125rem 1.5rem',
                borderBottom: i < OUTPUTS.length - 1 ? TOKENS.cardBorder : 'none',
                background: out.accent ? `${TOKENS.accent}05` : TOKENS.surface,
                borderLeft: out.accent ? `3px solid ${TOKENS.accent}` : '3px solid transparent',
                textDecoration: 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: out.accent ? TOKENS.accent : TOKENS.ink, marginBottom: 3 }}>{out.label}</p>
                  <p style={{ fontSize: '12.5px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>{out.desc}</p>
                </div>
                <span style={{ flexShrink: 0, fontSize: '13px', color: out.accent ? TOKENS.accent : TOKENS.inkHint, fontWeight: 600 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST (near-black) ────────────────────────────────────────────── */}
      <section style={{ background: HERO_BG, padding: '5rem 3rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.32)', marginBottom: '0.875rem' }}>
            Privacy & confini metodologici
          </p>
          <h2 className="font-kora-serif"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, color: '#F7F5EF', marginBottom: '2.5rem' }}>
            KORA misura organizzazioni, non individui.
          </h2>
          <div className="grid gap-3 sm:grid-cols-2" style={{ marginBottom: '2rem' }}>
            {[
              { label: 'Organization-level only',   note: 'Il KORA Index è un output aziendale aggregato. Nessun ranking o rating individuale.' },
              { label: 'Privacy soglia N ≥ 10',     note: 'Nessun segmento sotto soglia di 10 lavoratori è visibile al datore di lavoro.' },
              { label: 'Confidence Score esterno',  note: 'CS indica affidabilità delle fonti dati. Peso = 0 nel calcolo del KORA Index v3.' },
              { label: 'Pre-empirical calibration', note: 'Output direzionale — non certificazione pubblica, non attestazione regolatoria.' },
            ].map(({ label, note }) => (
              <div key={label} style={{ background: 'rgba(247,245,239,0.04)', border: '1px solid rgba(247,245,239,0.08)', borderRadius: 12, padding: '1rem 1.125rem' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#F7F5EF', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: '12px', color: 'rgba(247,245,239,0.52)', lineHeight: 1.65 }}>{note}</p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'rgba(247,245,239,0.28)', lineHeight: 1.70, maxWidth: '70ch' }}>
            KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
            Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          </p>
        </div>
      </section>

      {/* ── VISION (canvas) ───────────────────────────────────────────────── */}
      <section style={{ background: TOKENS.canvas, padding: '5rem 3rem', borderTop: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Dove stiamo andando
          </p>
          <h2 className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: '1.25rem' }}>
            La human layer dell&apos;organizzazione, finalmente leggibile.
          </h2>
          <p style={{ fontSize: '15px', color: TOKENS.inkSecondary, lineHeight: 1.75, maxWidth: '62ch' }}>
            Foundation Light è il punto di ingresso. L&apos;obiettivo è costruire un&apos;infrastruttura di intelligence
            che renda ogni euro investito in persone tracciabile, spiegabile e ottimizzabile —
            rispettando la privacy di ogni lavoratore e producendo output di cui le organizzazioni
            possono rispondere al board.
          </p>
        </div>
      </section>

      {/* ── CLOSE (canvas) ────────────────────────────────────────────────── */}
      <section style={{ background: TOKENS.canvas, padding: '6rem 3rem', borderTop: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: '1rem' }}>
            Inizia con Foundation Light.
          </h2>
          <p style={{ fontSize: '14px', color: TOKENS.inkSecondary, lineHeight: 1.70, maxWidth: '44ch', margin: '0 auto 2.5rem' }}>
            Tutti gli output mostrati usano dati demo sintetici (Meridiana Group S.r.l.)
            e metodologia pre_empirical_calibration.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            <Link href="/company"
              style={{ borderRadius: 8, background: TOKENS.ink, padding: '12px 28px', fontSize: '14px', fontWeight: 600, color: '#FFF', textDecoration: 'none' }}>
              Apri Executive Cockpit →
            </Link>
            <Link href="#foundation-light"
              style={{ borderRadius: 8, border: TOKENS.cardBorderStrong, background: TOKENS.surface, padding: '12px 28px', fontSize: '14px', fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
              Scopri Foundation Light
            </Link>
            <Link href="/demo-guide"
              style={{ fontSize: '14px', fontWeight: 500, color: TOKENS.inkHint, textDecoration: 'none' }}>
              Guida demo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER (white) ────────────────────────────────────────────────── */}
      <footer style={{ borderTop: TOKENS.cardBorder, padding: '1.375rem 3rem', background: TOKENS.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <KoraLogo variant="on-light" className="w-[64px] opacity-40" />
          </Link>
          <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint }}>
            synthetic_demo_data: true · KORA Methodology v0.1 · pre_empirical_calibration · organization-level only
          </p>
        </div>
      </footer>

    </div>
  );
}
