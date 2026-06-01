// KORA Landing — 100%
// Server component. No hooks, no backend, no sidebar.

import Image from 'next/image';
import Link from 'next/link';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { TOKENS } from '@/lib/design/kora-design-tokens';

// ── KORA Instrument — brand visual, hero right column ────────────────────────
// Ring gauge mostra il KORA Index — stesso linguaggio visivo dell'app ma
// sintetico, non il componente IndexRingCard (che richiede client+servizi).

function KoraInstrument() {
  const R    = 72;
  const CIRC = 2 * Math.PI * R;
  const dash = (34 / 100) * CIRC;

  return (
    <div
      style={{
        background:    'rgba(247,245,239,0.035)',
        border:        '1px solid rgba(247,245,239,0.09)',
        borderRadius:  20,
        padding:       '2.25rem 2rem',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           '1.5rem',
      }}
    >
      {/* Label */}
      <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.35)', alignSelf: 'flex-start' }}>
        KORA Index v3 · Foundation Light
      </p>

      {/* Ring gauge */}
      <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
        <svg viewBox="0 0 180 180" width="180" height="180" style={{ display: 'block' }}>
          <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(247,245,239,0.07)" strokeWidth="11" />
          <circle
            cx="90" cy="90" r={R}
            fill="none"
            stroke={TOKENS.accent}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            transform="rotate(-90 90 90)"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '3rem', color: '#F7F5EF', lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
            34
          </span>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '11px', color: 'rgba(247,245,239,0.38)', letterSpacing: '0.02em' }}>/100</span>
        </div>
      </div>

      {/* CS + Safeguard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', width: '100%' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '9.5px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.32)', marginBottom: 6 }}>
            Confidence Score
          </p>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '1.75rem', color: TOKENS.accent, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            60%
          </p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', color: 'rgba(247,245,239,0.25)', marginTop: 3 }}>esterno · peso = 0</p>
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '9.5px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.32)', marginBottom: 6 }}>
            Activation Safeguard
          </p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(186,117,23,0.22)', color: '#D4A017', borderRadius: 5, padding: '5px 11px', fontSize: '11px', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4A017', flexShrink: 0 }} />
            Warning
          </span>
        </div>
      </div>

      {/* Footer mono */}
      <div style={{ width: '100%', borderTop: '1px solid rgba(247,245,239,0.07)', paddingTop: '0.875rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(247,245,239,0.22)', lineHeight: 1.65 }}>
          Meridiana Group S.r.l. · Q1–Q3 2025
          {'\n'}pre_empirical_calibration · synthetic_demo_data: true
        </p>
      </div>
    </div>
  );
}

// ── Page data ─────────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    id:          'diagnostic',
    title:       'Foundation Light Diagnostic',
    duration:    '4–6 settimane',
    price:       '€7.500–12.000',
    priceNote:   'indicativo · dipende da perimetro e qualità dati',
    highlight:   false,
    deliverable: 'Board Pack Preview',
    items: [
      'Inventario e classificazione dati esistenti',
      'Eligibility Gate (Eligible / Limited / Blocked)',
      'KORA Index preliminare — 10 componenti',
      'Confidence Score e Activation Safeguard',
      'Activation Debt per pillar',
    ],
  },
  {
    id:          'pilot',
    title:       'Foundation Light Pilot',
    duration:    '6–8 settimane',
    price:       '€12.000–18.000',
    priceNote:   'include sessione advisor KORA e workshop esecutivo',
    highlight:   true,
    deliverable: 'Decision Pack + Workshop',
    items: [
      'Tutto il pacchetto Diagnostic',
      'Budget-to-Human-Impact — lettura direzionale',
      'HR KPI preview (correlazione aggregata)',
      'Decision Pack completo — board-ready',
      'Workshop esecutivo (2 ore)',
    ],
  },
  {
    id:          'strategic',
    title:       'Strategic Pilot',
    duration:    '8–10 settimane',
    price:       '€18.000–25.000',
    priceNote:   'multi-sito o multi-reparto · advisor incluso',
    highlight:   false,
    deliverable: 'Decision Pack + Board Workshop + Roadmap',
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

      {/* ── NAV (canvas, sticky) ─────────────────────────────────────────── */}
      <nav
        style={{
          position:       'sticky',
          top:            0,
          zIndex:         50,
          background:     TOKENS.canvas,
          borderBottom:   TOKENS.cardBorder,
          padding:        '0 2.5rem',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          height:         56,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <KoraLogo variant="on-light" className="w-[84px]" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          <Link href="/demo-guide" style={{ fontSize: '12px', fontWeight: 500, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
            Guida demo
          </Link>
          <Link href="/company" style={{ fontSize: '12px', fontWeight: 600, color: '#FFF', background: TOKENS.ink, borderRadius: 6, padding: '7px 16px', textDecoration: 'none' }}>
            Executive Cockpit →
          </Link>
        </div>
      </nav>

      {/* ── HERO (ink) ───────────────────────────────────────────────────── */}
      <section
        style={{
          background:    TOKENS.ink,
          minHeight:     'calc(100vh - 56px)',
          display:       'flex',
          alignItems:    'center',
          padding:       '4rem 2.5rem',
        }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto', width: '100%' }}>
          <div className="grid gap-14 lg:grid-cols-2 items-center">

            {/* Left — brand statement + CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Logo — brand anchor */}
              <div>
                <Image
                  src="/kora/logo-white.png"
                  alt="KORA"
                  width={188}
                  height={85}
                  priority
                  style={{ display: 'block', opacity: 0.90 }}
                />
              </div>

              {/* Eyebrow */}
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.40)' }}>
                Human Impact Intelligence Platform
              </p>

              {/* Headline */}
              <h1
                className="font-kora-serif"
                style={{
                  fontSize:      'clamp(3.25rem, 6.5vw, 5.25rem)',
                  letterSpacing: '-0.040em',
                  lineHeight:    1.04,
                  color:         '#F7F5EF',
                  margin:        0,
                }}
              >
                Misura ciò che accade dopo la spesa.
              </h1>

              {/* Subline */}
              <p style={{ fontSize: '15px', color: 'rgba(247,245,239,0.60)', lineHeight: 1.70, maxWidth: '50ch' }}>
                KORA trasforma dati aggregati su welfare, formazione e iniziative aziendali
                in intelligence di attivazione organizzativa, evidenze e Decision Pack board-ready.
              </p>

              {/* CTAs — subito visibili */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.875rem' }}>
                <Link
                  href="#foundation-light"
                  style={{
                    borderRadius: 8, background: TOKENS.accent,
                    padding: '11px 26px', fontSize: '14px', fontWeight: 600,
                    color: '#FFF', textDecoration: 'none',
                  }}
                >
                  Scopri Foundation Light →
                </Link>
                <Link
                  href="/demo-guide"
                  style={{
                    borderRadius: 8, border: '1.5px solid rgba(247,245,239,0.25)',
                    padding: '11px 26px', fontSize: '14px', fontWeight: 600,
                    color: 'rgba(247,245,239,0.75)', textDecoration: 'none',
                  }}
                >
                  Guida demo
                </Link>
                <Link href="/company/reports" style={{ fontSize: '13px', color: 'rgba(247,245,239,0.38)', textDecoration: 'none' }}>
                  Decision Pack
                </Link>
              </div>

              {/* Boundary */}
              <p style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(247,245,239,0.28)', lineHeight: 1.65 }}>
                KORA misura organizzazioni, non individui. · pre_empirical_calibration
              </p>
            </div>

            {/* Right — KORA Instrument (brand visual) */}
            <div className="hidden lg:block">
              <KoraInstrument />
            </div>

          </div>
        </div>
      </section>

      {/* ── IL VUOTO — canvas, narrativo ─────────────────────────────────── */}
      <section style={{ background: TOKENS.canvas, padding: '6rem 2.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          {/* Statement */}
          <p
            className="font-kora-serif text-kora-ink"
            style={{
              fontSize:      'clamp(2.25rem, 4.5vw, 3.5rem)',
              letterSpacing: '-0.030em',
              lineHeight:    1.12,
              marginBottom:  '1.5rem',
              maxWidth:      '18ch',
            }}
          >
            Le organizzazioni spendono. Ma non sanno cosa accade dopo.
          </p>

          <p style={{ fontSize: '15px', color: TOKENS.inkSecondary, lineHeight: 1.72, maxWidth: '60ch', marginBottom: '3.5rem' }}>
            Welfare, formazione, iniziative people: miliardi investiti ogni anno.
            Ma la distanza tra la spesa e ciò che viene davvero attivato è invisibile,
            non misurata, non leggibile. KORA nasce per colmare quel vuoto.
          </p>

          {/* Comparison */}
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

      {/* ── CATEGORY (white, crisp) ───────────────────────────────────────── */}
      <section style={{ background: TOKENS.surface, padding: '5rem 2.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Una nuova categoria
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '3rem' }}
          >
            Non welfare. Non HR. Non sorveglianza.
          </h2>
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '1rem' }}>
                KORA non è — mai
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  'Welfare platform o benefits marketplace',
                  'HR dashboard o strumento di valutazione lavoratori',
                  'Sistema di sorveglianza, ranking o gamification',
                  'Certificazione ESG automatica o compliance garantita',
                  'ROI garantito o previsione causale di outcome',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '14px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: 'rgba(20,18,46,0.25)', marginTop: 2 }}>✕</span>
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
                {[
                  'Human Impact Intelligence Platform',
                  'Misura organizzazioni — mai individui',
                  'Collega budget, attivazione verificata, evidenza, decisione',
                  'KORA Index · Confidence Score · Activation Safeguard',
                  'Metodologia versionata, spiegabile, privacy-first',
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

      {/* ── FOUNDATION LIGHT (canvas) ─────────────────────────────────────── */}
      <section id="foundation-light" style={{ background: TOKENS.canvas, padding: '6rem 2.5rem', borderTop: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Offerta pilot
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '0.875rem' }}
          >
            Foundation Light
          </h2>
          <p style={{ fontSize: '15px', color: TOKENS.inkSecondary, lineHeight: 1.70, maxWidth: '60ch', marginBottom: '0.75rem' }}>
            Un percorso guidato da 4 a 10 settimane, supportato dal team KORA.
            Non un SaaS self-service — un prodotto diagnostico con deliverable verificati
            e confini metodologici espliciti.
          </p>
          <p style={{ fontSize: '12px', color: TOKENS.inkHint, marginBottom: '3rem', lineHeight: 1.6 }}>
            Il costo dipende da perimetro, qualità dei dati e siti coinvolti.
            Ogni pilot inizia con una valutazione preliminare — senza impegno automatico.
          </p>

          {/* Packages */}
          <div className="grid gap-5 sm:grid-cols-3" style={{ marginBottom: '3rem' }}>
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  background:    pkg.highlight ? TOKENS.surface : TOKENS.surface,
                  border:        pkg.highlight ? `2px solid ${TOKENS.accent}` : TOKENS.cardBorder,
                  borderRadius:  14,
                  padding:       '1.625rem',
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           16,
                  position:      'relative',
                  boxShadow:     pkg.highlight ? `0 0 0 4px ${TOKENS.accent}10` : 'none',
                }}
              >
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

          {/* FAQ collapsible */}
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
      <section style={{ background: TOKENS.surface, padding: '5rem 2.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Output Foundation Light
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '2.5rem' }}
          >
            Cosa produce KORA
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 14, border: TOKENS.cardBorderStrong, overflow: 'hidden' }}>
            {OUTPUTS.map((out, i) => (
              <Link
                key={out.href}
                href={out.href}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            20,
                  padding:        '1.125rem 1.5rem',
                  borderBottom:   i < OUTPUTS.length - 1 ? TOKENS.cardBorder : 'none',
                  background:     out.accent ? `${TOKENS.accent}05` : TOKENS.surface,
                  borderLeft:     out.accent ? `3px solid ${TOKENS.accent}` : '3px solid transparent',
                  textDecoration: 'none',
                }}
              >
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

      {/* ── TRUST (ink) ───────────────────────────────────────────────────── */}
      <section style={{ background: TOKENS.ink, padding: '5rem 2.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.35)', marginBottom: '0.875rem' }}>
            Privacy & confini metodologici
          </p>
          <h2
            className="font-kora-serif"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, color: '#F7F5EF', marginBottom: '2.5rem' }}
          >
            KORA misura organizzazioni, non individui.
          </h2>

          <div className="grid gap-3 sm:grid-cols-2" style={{ marginBottom: '2rem' }}>
            {[
              { label: 'Organization-level only',   note: 'Il KORA Index è un output aziendale aggregato. Nessun ranking o rating individuale.' },
              { label: 'Privacy soglia N ≥ 10',     note: 'Nessun segmento sotto soglia di 10 lavoratori è visibile al datore di lavoro.' },
              { label: 'Confidence Score esterno',  note: 'CS indica affidabilità delle fonti dati. Peso = 0 nel calcolo del KORA Index v3.' },
              { label: 'Pre-empirical calibration', note: 'Output direzionale — non certificazione pubblica, non attestazione regolatoria.' },
            ].map(({ label, note }) => (
              <div key={label} style={{ background: 'rgba(247,245,239,0.04)', border: '1px solid rgba(247,245,239,0.09)', borderRadius: 12, padding: '1rem 1.125rem' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#F7F5EF', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: '12px', color: 'rgba(247,245,239,0.55)', lineHeight: 1.65 }}>{note}</p>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'rgba(247,245,239,0.30)', lineHeight: 1.70, maxWidth: '70ch' }}>
            KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
            Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          </p>
        </div>
      </section>

      {/* ── VISION (canvas) ───────────────────────────────────────────────── */}
      <section style={{ background: TOKENS.canvas, padding: '5rem 2.5rem', borderTop: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Dove stiamo andando
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: '1.25rem' }}
          >
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
      <section style={{ background: TOKENS.canvas, padding: '6rem 2.5rem', borderTop: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: '1rem' }}
          >
            Inizia con Foundation Light.
          </h2>
          <p style={{ fontSize: '14px', color: TOKENS.inkSecondary, lineHeight: 1.70, maxWidth: '44ch', margin: '0 auto 2.5rem' }}>
            Tutti gli output mostrati usano dati demo sintetici (Meridiana Group S.r.l.)
            e metodologia pre_empirical_calibration.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            <Link href="/company" style={{ borderRadius: 8, background: TOKENS.ink, padding: '11px 26px', fontSize: '14px', fontWeight: 600, color: '#FFF', textDecoration: 'none' }}>
              Apri Executive Cockpit →
            </Link>
            <Link href="#foundation-light" style={{ borderRadius: 8, border: TOKENS.cardBorderStrong, background: TOKENS.surface, padding: '11px 26px', fontSize: '14px', fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
              Scopri Foundation Light
            </Link>
            <Link href="/demo-guide" style={{ fontSize: '14px', fontWeight: 500, color: TOKENS.inkHint, textDecoration: 'none' }}>
              Guida demo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER (white) ────────────────────────────────────────────────── */}
      <footer style={{ borderTop: TOKENS.cardBorder, padding: '1.375rem 2.5rem', background: TOKENS.surface }}>
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
