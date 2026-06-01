// KORA Landing — Foundation Light
// Static server component. No backend, no hooks, no sidebar.

import Link from 'next/link';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { TOKENS } from '@/lib/design/kora-design-tokens';

// ── Data ─────────────────────────────────────────────────────────────────────

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

const KORA_IS_NOT = [
  'Welfare platform o benefits marketplace',
  'HR dashboard o strumento di valutazione lavoratori',
  'Sistema di sorveglianza, ranking o gamification individuale',
  'Certificazione ESG automatica o compliance normativa garantita',
  'ROI garantito o previsione causale di outcome organizzativi',
] as const;

const KORA_IS = [
  'Human Impact Intelligence Platform',
  'Misura organizzazioni — mai individui',
  'Collega budget, attivazione verificata, evidenza e decisione',
  'KORA Index · Confidence Score · Activation Safeguard',
  'Metodologia versionata, spiegabile, privacy-first',
] as const;

const OUTPUTS = [
  { label: 'Executive Cockpit',      href: '/company',          desc: 'KORA Index, Safeguard, priorità operative — vista C-suite.' },
  { label: 'KORA Index Detail',      href: '/company/kora-index', desc: '10 componenti, 4 macroblocchi, pipeline 14-stage, explainability.' },
  { label: 'Activation & Debt',      href: '/company/activation', desc: 'Maggioranza silenziosa, concentrazione IU, Activation Debt per sito e pillar.' },
  { label: 'Financial Governance',   href: '/company/financial',  desc: 'Budget-to-Human-Impact, costo per IU, correlazione KPI aggregata.' },
  { label: 'Decision Pack',          href: '/company/reports',    desc: 'Report board-ready: KORA Index, pillar analysis, raccomandazioni, limiti metodologici.' },
] as const;

const FAQS = [
  { q: 'È una piattaforma welfare o un marketplace?',    a: 'No. KORA non eroga benefit. Misura l\'attivazione organizzativa prodotta dalla spesa welfare e people — non la spesa stessa.' },
  { q: 'Avete bisogno di dati individuali dei lavoratori?', a: 'No. Il pilot lavora su dati aggregati per tipologia di iniziativa, dipartimento e sede. Nessun nominativo richiesto o accettato.' },
  { q: 'È una certificazione ESG o compliance normativa?', a: 'No. Foundation Light è pre_empirical_calibration — output direzionale. Supporta rendicontazione CSR/ESG ma non garantisce conformità normativa e non sostituisce consulenza ESG, legale o assurance.' },
  { q: 'Si può partire da file Excel o CSV?',            a: 'Sì. Foundation Light è progettato per export standard: welfare provider, LMS, gestionale HR, file budget. Nessuna integrazione API richiesta in Foundation Light.' },
] as const;

const BOUNDARY_ITEMS = [
  { label: 'Organization-level only', note: 'Il KORA Index è un output aziendale aggregato. Nessun ranking o rating individuale.' },
  { label: 'Privacy N ≥ 10',          note: 'Nessun segmento sotto soglia di 10 lavoratori è visibile al datore di lavoro.' },
  { label: 'Confidence Score esterno', note: 'CS indica affidabilità delle fonti dati. Peso = 0 nel KORA Index v3.' },
  { label: 'Pre-empirical calibration', note: 'Output direzionale — non certificazione pubblica, non attestazione regolatoria.' },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────

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
          padding:        '0 2rem',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          height:         56,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <KoraLogo variant="on-light" className="w-[80px]" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/demo-guide" style={{ fontSize: '12px', fontWeight: 500, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
            Guida demo
          </Link>
          <Link
            href="/company"
            style={{
              fontSize: '12px', fontWeight: 600, color: '#FFFFFF',
              background: TOKENS.ink, borderRadius: 6,
              padding: '6px 14px', textDecoration: 'none',
            }}
          >
            Executive Cockpit →
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem 4.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '1.25rem' }}>
            Human Impact Intelligence Platform
          </p>

          <h1
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', letterSpacing: '-0.030em', lineHeight: 1.08, marginBottom: '1.5rem', maxWidth: '16ch' }}
          >
            Misura ciò che accade dopo la spesa.
          </h1>

          <p style={{ fontSize: '15px', color: TOKENS.inkSecondary, lineHeight: 1.7, maxWidth: '58ch', marginBottom: '2rem' }}>
            KORA trasforma dati aggregati su welfare, formazione e iniziative aziendali
            in intelligence di attivazione organizzativa, evidenze verificate
            e Decision Pack board-ready.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.875rem', marginBottom: '1.75rem' }}>
            <Link
              href="#pilot"
              style={{ borderRadius: 6, background: TOKENS.ink, padding: '10px 22px', fontSize: '13px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none' }}
            >
              Scopri Foundation Light →
            </Link>
            <Link
              href="/demo-guide"
              style={{ borderRadius: 6, border: TOKENS.cardBorderStrong, background: 'transparent', padding: '10px 22px', fontSize: '13px', fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}
            >
              Guida demo
            </Link>
            <Link href="/company/reports" style={{ fontSize: '12px', color: TOKENS.inkHint, textDecoration: 'none' }}>
              Decision Pack
            </Link>
          </div>

          <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint, lineHeight: 1.6 }}>
            KORA misura organizzazioni, non individui. · synthetic_demo_data: true · pre_empirical_calibration
          </p>
        </div>
      </section>

      {/* ── CATEGORY — cosa è / non è ─────────────────────────────────── */}
      <section style={{ background: TOKENS.ink, padding: '4rem 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.38)', marginBottom: '1.75rem' }}>
            Una nuova categoria
          </p>
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.38)', marginBottom: '1rem' }}>
                KORA non è — mai
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {KORA_IS_NOT.map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '0.625rem', fontSize: '13px', color: 'rgba(247,245,239,0.60)', lineHeight: 1.55 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: 'rgba(247,245,239,0.28)', marginTop: 1 }}>✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(247,245,239,0.38)', marginBottom: '1rem' }}>
                KORA è
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {KORA_IS.map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '0.625rem', fontSize: '13px', color: '#F7F5EF', lineHeight: 1.55 }}>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: TOKENS.accent, marginTop: 1 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUNDATION LIGHT PILOT ───────────────────────────────────────── */}
      <section id="pilot" style={{ padding: '4.5rem 2rem', borderBottom: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.75rem' }}>
            Offerta pilot
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: '2rem', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '0.75rem' }}
          >
            Foundation Light
          </h2>
          <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.65, maxWidth: '60ch', marginBottom: '2.5rem' }}>
            Un percorso guidato da 4 a 10 settimane, supportato dal team KORA.
            Non un SaaS self-service — un prodotto diagnostico con deliverable verificati
            e confini metodologici espliciti.
          </p>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: '2rem', lineHeight: 1.6 }}>
            Il costo finale dipende da perimetro aziendale, qualità dei dati e numero di siti.
            Ogni pilot inizia con una valutazione preliminare di fattibilità — senza impegno automatico.
          </p>

          {/* Packages */}
          <div className="grid gap-5 sm:grid-cols-3" style={{ marginBottom: '2.5rem' }}>
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  background:    pkg.highlight ? `${TOKENS.accent}06` : TOKENS.surface,
                  border:        pkg.highlight ? `2px solid ${TOKENS.accent}` : TOKENS.cardBorder,
                  borderRadius:  12,
                  padding:       '1.375rem',
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           14,
                  position:      'relative',
                }}
              >
                {pkg.highlight && (
                  <span style={{ position: 'absolute', top: -12, left: 14, fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: TOKENS.accent, color: '#FFF', borderRadius: 4, padding: '2px 8px' }}>
                    Raccomandato
                  </span>
                )}
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 600, background: pkg.highlight ? `${TOKENS.accent}14` : TOKENS.inkBorder, color: pkg.highlight ? TOKENS.accent : TOKENS.inkHint, borderRadius: 4, padding: '2px 7px' }}>
                    {pkg.duration}
                  </span>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 8, lineHeight: 1.3 }}>{pkg.title}</p>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                  {pkg.items.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: 7, fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0, color: TOKENS.inkHint, marginTop: 1 }}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: pkg.highlight ? `1px solid ${TOKENS.accent}33` : TOKENS.cardBorder, paddingTop: 12 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: '1.75rem', color: TOKENS.ink, letterSpacing: '-0.025em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {pkg.price}
                  </p>
                  <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 3, lineHeight: 1.5 }}>{pkg.priceNote}</p>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.inkSecondary, marginTop: 6 }}>Deliverable: {pkg.deliverable}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ collapsible */}
          <details style={{ borderRadius: 10, border: TOKENS.cardBorder, overflow: 'hidden' }}>
            <summary
              style={{ cursor: 'pointer', padding: '0.875rem 1rem', fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary, userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: TOKENS.surface }}
            >
              Domande frequenti
              <span style={{ fontSize: '10px', color: TOKENS.inkHint, fontWeight: 400 }}>espandi ↓</span>
            </summary>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ padding: '12px 16px', borderTop: TOKENS.cardBorder, background: TOKENS.surface }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>{faq.q}</p>
                <p style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.65 }}>{faq.a}</p>
              </div>
            ))}
          </details>
        </div>
      </section>

      {/* ── OUTPUT KORA ──────────────────────────────────────────────────── */}
      <section style={{ padding: '4.5rem 2rem', borderBottom: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.75rem' }}>
            Output Foundation Light
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: '2rem', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '2rem' }}
          >
            Cosa produce KORA
          </h2>
          <div style={{ borderRadius: 12, border: TOKENS.cardBorder, overflow: 'hidden' }}>
            {OUTPUTS.map((out, i) => (
              <Link
                key={out.href}
                href={out.href}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  padding: '1rem 1.25rem',
                  borderBottom: i < OUTPUTS.length - 1 ? TOKENS.cardBorder : 'none',
                  background: TOKENS.surface,
                  textDecoration: 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 2 }}>{out.label}</p>
                  <p style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>{out.desc}</p>
                </div>
                <span style={{ flexShrink: 0, fontSize: '11px', color: TOKENS.accent, fontWeight: 600, marginTop: 2 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY & BOUNDARY ───────────────────────────────────────────── */}
      <section style={{ padding: '4.5rem 2rem', borderBottom: TOKENS.cardBorder }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.75rem' }}>
            Privacy & confini metodologici
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: '2rem', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '1.75rem' }}
          >
            KORA misura organizzazioni, non individui.
          </h2>
          <div className="grid gap-3 sm:grid-cols-2" style={{ marginBottom: '1.25rem' }}>
            {BOUNDARY_ITEMS.map(({ label, note }) => (
              <div key={label} style={{ background: TOKENS.inkBorder, borderRadius: 10, padding: '0.875rem 1rem' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginBottom: 3 }}>{label}</p>
                <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>{note}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint, lineHeight: 1.65, maxWidth: '72ch' }}>
            KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
            Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          </p>
        </div>
      </section>

      {/* ── DEMO ENTRY ───────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: '0.875rem' }}>
            Demo Foundation Light
          </p>
          <h2
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: '2rem', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem' }}
          >
            Esplora Foundation Light su dati sintetici.
          </h2>
          <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.65, maxWidth: '48ch', margin: '0 auto 2.5rem' }}>
            Tutti gli output mostrati usano dati demo sintetici (Meridiana Group S.r.l.)
            e metodologia pre_empirical_calibration.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.875rem' }}>
            <Link
              href="/company"
              style={{ borderRadius: 6, background: TOKENS.ink, padding: '10px 22px', fontSize: '13px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'none' }}
            >
              Apri Executive Cockpit →
            </Link>
            <Link
              href="/company/reports"
              style={{ borderRadius: 6, border: TOKENS.cardBorderStrong, background: TOKENS.surface, padding: '10px 22px', fontSize: '13px', fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}
            >
              Vedi Decision Pack
            </Link>
            <Link
              href="/demo-guide"
              style={{ fontSize: '13px', fontWeight: 500, color: TOKENS.inkHint, textDecoration: 'none' }}
            >
              Leggi la guida demo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: TOKENS.cardBorder, padding: '1.25rem 2rem', background: TOKENS.surface }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
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
