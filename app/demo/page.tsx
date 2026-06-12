// app/demo/page.tsx — B129: Demo area home.
// Synthetic data only — no getSupabaseServiceClient, no getSupabaseServerClient,
// no live DB queries. Numbers are canonical demo values from Foundation Light spec:
//   S1 (Meridiana): KORA Index 34, Safeguard WARNING
//   S2 (Ferretti):  KORA Index 54, Safeguard CLEAR

export const dynamic = 'force-static';

import Link from 'next/link';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const DEMO_SCENARIOS = [
  {
    id:         'S1',
    company:    'Meridiana Group S.r.l.',
    sector:     'Manifattura · 250 lavoratori',
    koraIndex:  34,
    safeguard:  'WARNING',
    cs:         '62%',
    description: 'Attivazione concentrata in pochi reparti. Maggioranza silenziosa evidente. Activation Debt significativo.',
    safeguardStyle: { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' },
  },
  {
    id:         'S2',
    company:    'Ferretti Holding S.p.A.',
    sector:     'Logistica · 180 lavoratori',
    koraIndex:  54,
    safeguard:  'CLEAR',
    cs:         '74%',
    description: 'Distribuzione bilanciata. Continuità cross-pillar. Budget-to-Human-Impact positivo.',
    safeguardStyle: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
  },
] as const;

const DEMO_SURFACES = [
  { label: 'Executive Cockpit',      href: '/company',            desc: 'KORA Index™, Confidence Score™, Activation Safeguard™ — vista C-suite.' },
  { label: 'KORA Index · Dettaglio', href: '/company/kora-index', desc: '10 componenti, 4 macroblocks, pipeline 14-stage, explainability.' },
  { label: 'Activation Debt',        href: '/company/activation', desc: 'Maggioranza silenziosa, concentrazione IU, distribuzione per sito.' },
  { label: 'Advisor Workspace',      href: '/advisor',            desc: 'Revisione evidenze, raccomandazioni governance, queue priorità.' },
  { label: 'Future Vision',          href: '/future-vision',      desc: 'Roadmap architetturale — non attiva in Foundation Light.' },
  { label: 'Demo Guide',             href: '/demo-guide',         desc: 'Percorso guidato per presentare KORA a un nuovo interlocutore.' },
] as const;

export default function DemoHomePage() {
  return (
    <div data-testid="demo-home" style={{ fontFamily: FONT }}>
      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5512E', marginBottom: 10 }}>
          KORA Foundation Light · Demo
        </p>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: '#211F1A', marginBottom: 12 }}>
          Area Dimostrativa
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(6,3,43,0.55)', lineHeight: 1.65, maxWidth: '60ch' }}>
          Dati sintetici · KORA Methodology v0.1 · Pre-empirical calibration.
          Nessun dato aziendale reale. Nessuna calibrazione empirica certificata.
        </p>
      </div>

      {/* Scenarios */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.40)', marginBottom: 16 }}>
          Scenari dimostrativi
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {DEMO_SCENARIOS.map((s) => (
            <div
              key={s.id}
              data-testid={`demo-scenario-${s.id}`}
              style={{ background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)', borderRadius: 14, padding: '24px 22px' }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B5512E', padding: '2px 6px', background: 'rgba(181,81,46,0.08)', borderRadius: 4 }}>
                  {s.id}
                </span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 700, ...s.safeguardStyle }}>
                  {s.safeguard}
                </span>
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#211F1A', marginBottom: 3, lineHeight: 1.3 }}>
                {s.company}
              </h3>
              <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', marginBottom: 14 }}>{s.sector}</p>
              <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', marginBottom: 3 }}>KORA Index™</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#211F1A', lineHeight: 1 }}>{s.koraIndex}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', marginBottom: 3 }}>Confidence Score™</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#211F1A', lineHeight: 1 }}>{s.cs}</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)', lineHeight: 1.55 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo surfaces */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.40)', marginBottom: 16 }}>
          Superfici dimostrative disponibili
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DEMO_SURFACES.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)', borderRadius: 12, textDecoration: 'none', gap: 16 }}
            >
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#211F1A', marginBottom: 3 }}>{surface.label}</p>
                <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', lineHeight: 1.5 }}>{surface.desc}</p>
              </div>
              <span style={{ fontSize: 16, color: 'rgba(6,3,43,0.25)', flexShrink: 0 }}>→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <div
        data-testid="demo-disclaimer"
        style={{ borderTop: '1px solid rgba(6,3,43,0.08)', paddingTop: 18 }}
      >
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', lineHeight: 1.65 }}>
          KORA Foundation Light v0.1 · Area Dimostrativa · Dati sintetici ·
          Methodology v0.1 pre-empirical calibration · Non certificato, non regulatory-grade ·
          KORA misura organizzazioni, mai individui · Nessun dato aziendale reale caricato.
        </p>
      </div>
    </div>
  );
}
