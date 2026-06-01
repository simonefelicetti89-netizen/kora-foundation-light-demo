// Root bridge page — static, no backend, no client hooks
import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const ROUTE_CARDS = [
  {
    href:  '/pilot',
    title: 'Foundation Light Pilot',
    desc:  'Offerta pilot, deliverable, confini e percorso di validazione.',
  },
  {
    href:  '/demo-guide',
    title: 'Demo Guide',
    desc:  'Percorso guidato per leggere la demo KORA.',
  },
  {
    href:  '/company',
    title: 'Company Experience',
    desc:  'Cockpit, KORA Index, attivazione, pilastri, governance finanziaria e Decision Pack.',
  },
] as const;

export default function RootPage() {
  return (
    <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* 1. Eyebrow + Titolo + Subline */}
      <div>
        <p
          style={{
            fontFamily:    'var(--font-inter)',
            fontWeight:    500,
            fontSize:      '11px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color:         TOKENS.inkHint,
            marginBottom:  '0.75rem',
          }}
        >
          Human Impact Intelligence Platform
        </p>
        <h1
          className="font-kora-serif text-kora-ink"
          style={{ fontSize: '2.5rem', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: '0.875rem' }}
        >
          KORA Foundation Light
        </h1>
        <p
          style={{
            fontSize:   '14px',
            color:      TOKENS.inkSecondary,
            lineHeight: 1.65,
            maxWidth:   '64ch',
          }}
        >
          KORA trasforma dati aggregati su welfare, formazione e iniziative aziendali
          in intelligence di attivazione organizzativa.
        </p>
      </div>

      {/* 2. Claim boundary */}
      <div
        style={{
          background:   TOKENS.inkBorder,
          borderRadius: TOKENS.cardRadius,
          padding:      '0.875rem 1.125rem',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>
          KORA misura organizzazioni, non individui.
        </p>
        <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Foundation Light usa dati sintetici/demo e output pre_empirical_calibration.
          Nessun dato individuale esposto. Nessuna certificazione ESG. Nessun ROI garantito.
        </p>
      </div>

      {/* 3. CTA block */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/pilot"
          style={{
            borderRadius:   6,
            background:     TOKENS.ink,
            padding:        '9px 18px',
            fontSize:       '13px',
            fontWeight:     600,
            color:          '#FFFFFF',
            textDecoration: 'none',
          }}
        >
          Scopri Foundation Light Pilot →
        </Link>
        <Link
          href="/demo-guide"
          style={{
            borderRadius:   6,
            border:         TOKENS.cardBorder,
            background:     TOKENS.surface,
            padding:        '9px 18px',
            fontSize:       '13px',
            fontWeight:     600,
            color:          TOKENS.inkSecondary,
            textDecoration: 'none',
          }}
        >
          Guida demo
        </Link>
        <Link
          href="/company"
          style={{
            fontSize:       '12px',
            fontWeight:     500,
            color:          TOKENS.inkSecondary,
            textDecoration: 'none',
          }}
        >
          Apri Executive Cockpit →
        </Link>
        <Link
          href="/company/reports"
          style={{
            fontSize:       '12px',
            color:          TOKENS.inkHint,
            textDecoration: 'none',
          }}
        >
          Decision Pack
        </Link>
      </div>

      {/* 4. Three route cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {ROUTE_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              display:        'flex',
              flexDirection:  'column',
              gap:            8,
              background:     TOKENS.surface,
              border:         TOKENS.cardBorder,
              borderRadius:   TOKENS.cardRadius,
              padding:        '1rem',
              textDecoration: 'none',
            }}
          >
            <p style={{ fontSize: '12.5px', fontWeight: 600, color: TOKENS.ink }}>{card.title}</p>
            <p style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.6, flex: 1 }}>{card.desc}</p>
            <span style={{ fontSize: '11px', color: TOKENS.accent, fontWeight: 600 }}>Vai →</span>
          </Link>
        ))}
      </div>

      {/* 5. Footer boundary */}
      <p style={{ fontFamily: 'monospace', fontSize: '10px', color: TOKENS.inkHint, paddingTop: 8 }}>
        synthetic_demo_data: true · KORA Methodology v0.1 · pre_empirical_calibration · organization-level only
      </p>

    </div>
  );
}
