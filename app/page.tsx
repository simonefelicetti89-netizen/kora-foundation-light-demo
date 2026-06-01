// KORA Landing — True Landing Page
// Static server component. No backend, no hooks, no sidebar.

import Link from 'next/link';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { TOKENS } from '@/lib/design/kora-design-tokens';

// ── Decision Pack Visual — inline mock, design element only ──────────────────

const PILLAR_BARS = [
  { label: 'LIFE',       pct: 44 },
  { label: 'GROWTH',     pct: 27 },
  { label: 'CONNECTION', pct: 12 },
  { label: 'IMPACT',     pct: 11 },
  { label: 'LEGACY',     pct:  6 },
] as const;

function DecisionPackVisual() {
  return (
    <div
      role="img"
      aria-label="Anteprima KORA Decision Pack — dati sintetici demo"
      style={{
        background:   TOKENS.ink,
        borderRadius: 16,
        padding:      '1.875rem',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Brandmark ring — decorative background */}
      <svg
        viewBox="108 100 212 220"
        width="180" height="180"
        aria-hidden="true"
        style={{ position: 'absolute', top: -24, right: -24, opacity: 0.055, pointerEvents: 'none' }}
      >
        <path
          fillRule="evenodd" clipRule="evenodd"
          d="M148.606 117.911C188.736 101.225 233.839 101.225 273.955 117.911C286.755 123.25 296.922 133.456 302.228 146.29C318.85 186.571 318.85 231.844 302.228 272.112C296.908 284.96 286.741 295.165 273.955 300.491C233.825 317.176 188.722 317.176 148.606 300.491C135.807 295.151 125.639 284.946 120.334 272.112C103.711 231.83 103.711 186.557 120.334 146.29C125.653 133.442 135.821 123.236 148.606 117.911ZM211.095 124.946C190.123 124.946 171.492 138.323 159.759 158.999C139.147 170.776 125.835 189.477 125.835 210.529C125.835 231.58 139.161 250.282 159.759 262.059C171.492 282.749 190.123 296.111 211.095 296.111C232.067 296.111 250.698 282.735 262.431 262.059C283.043 250.282 296.355 231.58 296.355 210.529C296.355 189.477 283.029 170.776 262.431 158.999C250.698 138.309 232.067 124.946 211.095 124.946Z"
          fill="#FFFFFF"
        />
      </svg>

      {/* Header */}
      <p style={{ fontFamily: 'monospace', fontSize: '9.5px', color: 'rgba(247,245,239,0.42)', letterSpacing: '0.03em', marginBottom: 2 }}>
        KORA Decision Pack · Foundation Light v0.1
      </p>
      <p style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(247,245,239,0.26)', letterSpacing: '0.02em', marginBottom: '1.125rem' }}>
        Meridiana Group S.r.l. · Q1–Q3 2025
      </p>
      <div style={{ height: 1, background: 'rgba(247,245,239,0.09)', marginBottom: '1.125rem' }} />

      {/* KORA Index + CS — primary metrics */}
      <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-end', marginBottom: '1.125rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '9px', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.38)', marginBottom: 5 }}>
            KORA Index v3
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '3.25rem', color: '#F7F5EF', lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              34
            </span>
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: '12px', color: 'rgba(247,245,239,0.38)' }}>/100</span>
          </div>
        </div>
        <div style={{ paddingBottom: 4 }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '9px', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.38)', marginBottom: 5 }}>
            Confidence Score
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '1.625rem', color: TOKENS.accent, lineHeight: 1, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
              60%
            </span>
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', color: 'rgba(247,245,239,0.28)' }}>est.</span>
          </div>
        </div>
      </div>

      {/* Activation Safeguard */}
      <div style={{ marginBottom: '1.125rem' }}>
        <span
          style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          6,
            background:   'rgba(186,117,23,0.20)',
            color:        '#D4A017',
            borderRadius: 6,
            padding:      '5px 11px',
            fontSize:     '10.5px',
            fontFamily:   'var(--font-inter)',
            fontWeight:   600,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4A017', flexShrink: 0 }} />
          Activation Safeguard · Warning
        </span>
      </div>

      <div style={{ height: 1, background: 'rgba(247,245,239,0.08)', marginBottom: '1rem' }} />

      {/* Pillar bars */}
      <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '9px', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.32)', marginBottom: '0.5rem' }}>
        Distribuzione pillar
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {PILLAR_BARS.map(({ label, pct }, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '8.5px', color: 'rgba(247,245,239,0.38)', width: 68, flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1, height: 4, borderRadius: 9999, background: 'rgba(247,245,239,0.07)', overflow: 'hidden' }}>
              <div style={{ height: 4, borderRadius: 9999, width: `${pct}%`, background: i === 0 ? TOKENS.accent : `rgba(247,245,239,${0.68 - i * 0.11})` }} />
            </div>
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: '9px', fontWeight: 600, color: 'rgba(247,245,239,0.45)', width: 28, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ height: 1, background: 'rgba(247,245,239,0.07)', margin: '1rem 0 0.75rem' }} />
      <p style={{ fontFamily: 'monospace', fontSize: '8.5px', color: 'rgba(247,245,239,0.20)', lineHeight: 1.65 }}>
        KORA-METHOD-v0.1.0 · pre_empirical_calibration
        {'\n'}synthetic_demo_data: true · organization-level only
      </p>
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
  { label: 'Executive Cockpit',    href: '/company',            desc: 'KORA Index, Safeguard, priorità operative — prima lettura C-suite.' },
  { label: 'KORA Index Detail',    href: '/company/kora-index', desc: '10 componenti, 4 macroblocchi, pipeline 14-stage, explainability.' },
  { label: 'Activation & Debt',    href: '/company/activation', desc: 'Maggioranza silenziosa, concentrazione IU, Activation Debt per sito e pillar.' },
  { label: 'Financial Governance', href: '/company/financial',  desc: 'Budget-to-Human-Impact, costo per IU, correlazione KPI aggregata.' },
  { label: 'Decision Pack',        href: '/company/reports',    desc: 'Report board-ready: KORA Index, pillar analysis, raccomandazioni, confini espliciti.' },
] as const;

const FAQS = [
  { q: 'È una piattaforma welfare o un marketplace?',       a: 'No. KORA non eroga benefit. Misura l\'attivazione organizzativa prodotta dalla spesa welfare e people — non la spesa stessa.' },
  { q: 'Avete bisogno di dati individuali dei lavoratori?', a: 'No. Il pilot lavora su dati aggregati per tipologia di iniziativa, dipartimento e sede. Nessun nominativo richiesto o accettato.' },
  { q: 'È una certificazione ESG o compliance normativa?',  a: 'No. Foundation Light è pre_empirical_calibration — output direzionale. Supporta rendicontazione CSR/ESG ma non garantisce conformità normativa e non sostituisce consulenza ESG, legale o assurance.' },
  { q: 'Si può partire da file Excel o CSV?',               a: 'Sì. Foundation Light è progettato per export standard: welfare provider, LMS, gestionale HR, file budget. Nessuna integrazione API richiesta.' },
] as const;

const BOUNDARY_ITEMS = [
  { label: 'Organization-level only',   note: 'Il KORA Index è un output aziendale aggregato. Nessun ranking o rating individuale.' },
  { label: 'Privacy soglia N ≥ 10',     note: 'Nessun segmento sotto soglia di 10 lavoratori è visibile al datore di lavoro.' },
  { label: 'Confidence Score esterno',  note: 'CS indica affidabilità delle fonti dati. Peso = 0 nel calcolo del KORA Index v3.' },
  { label: 'Pre-empirical calibration', note: 'Output direzionale — non certificazione pubblica, non attestazione regolatoria.' },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-inter)', color: TOKENS.ink }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position:       'sticky',
          top:            0,
          zIndex:         50,
          background:     'var(--kora-canvas)',
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
          <Link
            href="/company"
            style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF', background: TOKENS.ink, borderRadius: 6, padding: '6px 16px', textDecoration: 'none' }}
          >
            Executive Cockpit →
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: 'calc(100vh - 56px)',
          display:   'flex',
          alignItems:'center',
          padding:   '4rem 2.5rem',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div className="grid gap-16 lg:grid-cols-2 items-center">

            {/* Left — text */}
            <div>
              <p
                style={{
                  fontFamily:    'var(--font-inter)',
                  fontWeight:    500,
                  fontSize:      '11px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         TOKENS.inkHint,
                  marginBottom:  '1.375rem',
                }}
              >
                Human Impact Intelligence Platform
              </p>

              <h1
                className="font-kora-serif text-kora-ink"
                style={{
                  fontSize:      'clamp(3rem, 6vw, 4.75rem)',
                  letterSpacing: '-0.035em',
                  lineHeight:    1.06,
                  marginBottom:  '1.625rem',
                }}
              >
                Misura ciò che accade dopo la spesa.
              </h1>

              <p
                style={{
                  fontSize:     '15px',
                  color:        TOKENS.inkSecondary,
                  lineHeight:   1.72,
                  maxWidth:     '52ch',
                  marginBottom: '2.25rem',
                }}
              >
                KORA trasforma dati aggregati su welfare, formazione e iniziative aziendali
                in intelligence di attivazione organizzativa, evidenze verificate
                e Decision Pack board-ready.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.875rem', marginBottom: '2rem' }}>
                <Link
                  href="#pilot"
                  style={{
                    borderRadius: 8, background: TOKENS.ink,
                    padding: '11px 26px', fontSize: '14px', fontWeight: 600,
                    color: '#FFFFFF', textDecoration: 'none',
                  }}
                >
                  Scopri Foundation Light →
                </Link>
                <Link
                  href="/demo-guide"
                  style={{
                    borderRadius: 8, border: `1.5px solid ${TOKENS.ink}22`,
                    padding: '11px 26px', fontSize: '14px', fontWeight: 600,
                    color: TOKENS.inkSecondary, textDecoration: 'none',
                    background: 'transparent',
                  }}
                >
                  Guida demo
                </Link>
                <Link href="/company/reports" style={{ fontSize: '13px', color: TOKENS.inkHint, textDecoration: 'none' }}>
                  Decision Pack
                </Link>
              </div>

              <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint, lineHeight: 1.65 }}>
                KORA misura organizzazioni, non individui. · pre_empirical_calibration
              </p>
            </div>

            {/* Right — Decision Pack visual */}
            <div>
              <DecisionPackVisual />
            </div>

          </div>
        </div>
      </section>

      {/* ── CATEGORY — ink, strong visual statement ───────────────────────── */}
      <section style={{ background: TOKENS.ink, padding: '5rem 2.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Big serif statement */}
          <p
            className="font-kora-serif"
            style={{
              fontSize:     'clamp(1.75rem, 4vw, 2.875rem)',
              letterSpacing:'-0.025em',
              lineHeight:   1.18,
              color:        '#F7F5EF',
              marginBottom: '3rem',
              maxWidth:     '22ch',
            }}
          >
            Non welfare. Non HR. Non sorveglianza.
          </p>

          <div className="grid gap-12 sm:grid-cols-2">
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.35)', marginBottom: '1.125rem' }}>
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
                  <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '14px', color: 'rgba(247,245,239,0.55)', lineHeight: 1.5 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: 'rgba(247,245,239,0.22)', marginTop: 2 }}>✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.35)', marginBottom: '1.125rem' }}>
                KORA è
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  'Human Impact Intelligence Platform',
                  'Misura organizzazioni — mai individui',
                  'Collega budget, attivazione verificata, evidenza e decisione',
                  'KORA Index · Confidence Score · Activation Safeguard',
                  'Metodologia versionata, spiegabile, privacy-first',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '0.75rem', fontSize: '14px', color: '#F7F5EF', lineHeight: 1.5 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: TOKENS.accent, marginTop: 2 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUNDATION LIGHT PILOT ───────────────────────────────────────── */}
      <section id="pilot" style={{ padding: '5rem 2.5rem', borderBottom: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Offerta pilot
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '0.875rem' }}
          >
            Foundation Light
          </h2>
          <p style={{ fontSize: '14px', color: TOKENS.inkSecondary, lineHeight: 1.7, maxWidth: '60ch', marginBottom: '0.75rem' }}>
            Un percorso guidato da 4 a 10 settimane, supportato dal team KORA.
            Non un SaaS self-service — un prodotto diagnostico con deliverable verificati
            e confini metodologici espliciti.
          </p>
          <p style={{ fontSize: '12px', color: TOKENS.inkHint, marginBottom: '2.75rem', lineHeight: 1.6 }}>
            Il costo dipende da perimetro, qualità dei dati e siti coinvolti.
            Ogni pilot inizia con una valutazione preliminare senza impegno automatico.
          </p>

          {/* Packages */}
          <div className="grid gap-5 sm:grid-cols-3" style={{ marginBottom: '2.75rem' }}>
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  background:    pkg.highlight ? `${TOKENS.accent}06` : TOKENS.surface,
                  border:        pkg.highlight ? `2px solid ${TOKENS.accent}` : TOKENS.cardBorder,
                  borderRadius:  14,
                  padding:       '1.5rem',
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           14,
                  position:      'relative',
                }}
              >
                {pkg.highlight && (
                  <span style={{ position: 'absolute', top: -12, left: 16, fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: TOKENS.accent, color: '#FFF', borderRadius: 4, padding: '2px 9px' }}>
                    Raccomandato
                  </span>
                )}
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 600, background: pkg.highlight ? `${TOKENS.accent}14` : TOKENS.inkBorder, color: pkg.highlight ? TOKENS.accent : TOKENS.inkHint, borderRadius: 4, padding: '2px 7px' }}>
                    {pkg.duration}
                  </span>
                  <p style={{ fontSize: '13.5px', fontWeight: 700, color: TOKENS.ink, marginTop: 9, lineHeight: 1.3 }}>{pkg.title}</p>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  {pkg.items.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: 7, fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0, color: TOKENS.inkHint, marginTop: 1 }}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: pkg.highlight ? `1px solid ${TOKENS.accent}33` : TOKENS.cardBorder, paddingTop: 14 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '1.875rem', color: TOKENS.ink, letterSpacing: '-0.025em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {pkg.price}
                  </p>
                  <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 4, lineHeight: 1.5 }}>{pkg.priceNote}</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary, marginTop: 7 }}>Deliverable: {pkg.deliverable}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <details style={{ borderRadius: 12, border: TOKENS.cardBorder, overflow: 'hidden' }}>
            <summary style={{ cursor: 'pointer', padding: '1rem 1.125rem', fontSize: '13px', fontWeight: 600, color: TOKENS.inkSecondary, userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: TOKENS.surface }}>
              Domande frequenti
              <span style={{ fontSize: '11px', color: TOKENS.inkHint, fontWeight: 400 }}>espandi ↓</span>
            </summary>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ padding: '1rem 1.125rem', borderTop: TOKENS.cardBorder, background: TOKENS.surface }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 5 }}>{faq.q}</p>
                <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.7 }}>{faq.a}</p>
              </div>
            ))}
          </details>
        </div>
      </section>

      {/* ── OUTPUT KORA ──────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2.5rem', borderBottom: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Output Foundation Light
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '2.25rem' }}
          >
            Cosa produce KORA
          </h2>
          <div style={{ borderRadius: 14, border: TOKENS.cardBorder, overflow: 'hidden' }}>
            {OUTPUTS.map((out, i) => (
              <Link
                key={out.href}
                href={out.href}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 18,
                  padding: '1.125rem 1.375rem',
                  borderBottom: i < OUTPUTS.length - 1 ? TOKENS.cardBorder : 'none',
                  background: TOKENS.surface,
                  textDecoration: 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: TOKENS.ink, marginBottom: 3 }}>{out.label}</p>
                  <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>{out.desc}</p>
                </div>
                <span style={{ flexShrink: 0, fontSize: '12px', color: TOKENS.accent, fontWeight: 600, marginTop: 3 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY & BOUNDARY ───────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2.5rem', borderBottom: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Privacy & confini metodologici
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.875rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '2rem' }}
          >
            KORA misura organizzazioni, non individui.
          </h2>
          <div className="grid gap-3 sm:grid-cols-2" style={{ marginBottom: '1.5rem' }}>
            {BOUNDARY_ITEMS.map(({ label, note }) => (
              <div key={label} style={{ background: TOKENS.inkBorder, borderRadius: 12, padding: '1rem 1.125rem' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>{note}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: TOKENS.inkHint, lineHeight: 1.7, maxWidth: '72ch' }}>
            KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
            Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          </p>
        </div>
      </section>

      {/* ── DEMO ENTRY ───────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 2.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '1rem' }}>
            Demo Foundation Light
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(1.875rem, 4vw, 2.625rem)', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: '1.125rem' }}
          >
            Esplora Foundation Light su dati sintetici.
          </h2>
          <p style={{ fontSize: '14px', color: TOKENS.inkSecondary, lineHeight: 1.7, maxWidth: '48ch', margin: '0 auto 2.75rem' }}>
            Tutti gli output mostrati usano dati demo sintetici (Meridiana Group S.r.l.)
            e metodologia pre_empirical_calibration.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            <Link
              href="/company"
              style={{ borderRadius: 8, background: TOKENS.ink, padding: '11px 26px', fontSize: '14px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none' }}
            >
              Apri Executive Cockpit →
            </Link>
            <Link
              href="/company/reports"
              style={{ borderRadius: 8, border: `1.5px solid ${TOKENS.ink}22`, background: TOKENS.surface, padding: '11px 26px', fontSize: '14px', fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}
            >
              Vedi Decision Pack
            </Link>
            <Link
              href="/demo-guide"
              style={{ fontSize: '14px', fontWeight: 500, color: TOKENS.inkHint, textDecoration: 'none' }}
            >
              Leggi la guida demo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
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
