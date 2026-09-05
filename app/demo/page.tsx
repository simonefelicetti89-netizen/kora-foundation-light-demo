// app/demo/page.tsx — B132-A: Demo area home — struttura narrativa a 4 sezioni.
// B129: Demo area home originale.
// Synthetic data only — no getSupabaseServiceClient, no getSupabaseServerClient,
// no live DB queries. Numbers are canonical demo values from Foundation Light v2.0.
//   S1 (Meridiana): letti da data/synthetic/kora-index-outputs.json[0]
//   S2 (Ferretti):  nessuna voce seed — STOP-AND-REPORT: seed S2 Ferretti non ancora creato.
//                   Valore conservato temporaneamente; creare voce seed prima del merge.

export const dynamic = 'force-static';

import Link from 'next/link';
import { DemoAccessBanner } from '@/components/demo/DemoAccessBanner';
import koraOutputsRaw from '@/data/synthetic/kora-index-outputs.json';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const _outputs = (koraOutputsRaw as { data: Array<Record<string, unknown>> }).data;
const _s1 = _outputs[0]!;

function _safeguardStyle(status: string) {
  if (status === 'CLEAR')   return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
  if (status === 'WARNING') return { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' };
  return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
}

const DEMO_SCENARIOS = [
  {
    id:         'S1',
    company:    'Meridiana Group S.r.l.',
    sector:     'Manifattura · 250 lavoratori',
    koraIndex:  _s1['kora_index_value'] as number,
    safeguard:  _s1['safeguard_status'] as string,
    cs:         `${Math.round((_s1['confidence_score'] as number) * 100)}%`,
    description: 'Attivazione concentrata in pochi reparti. Maggioranza silenziosa evidente. Activation Debt significativo.',
    safeguardStyle: _safeguardStyle(_s1['safeguard_status'] as string),
  },
  {
    // TODO(sprint3-seed): S2 Ferretti non ha ancora voce in kora-index-outputs.json.
    // Creare seed S2 prima di rimuovere questi valori temporanei.
    id:         'S2',
    company:    'Ferretti Holding S.p.A.',
    sector:     'Logistica · 180 lavoratori',
    koraIndex:  54,
    safeguard:  'CLEAR',
    cs:         '74%',
    description: 'Distribuzione bilanciata. Continuità cross-pillar. Budget-to-Human-Impact positivo.',
    safeguardStyle: _safeguardStyle('CLEAR'),
  },
] as unknown as Array<{ id: string; company: string; sector: string; koraIndex: number; safeguard: string; cs: string; description: string; safeguardStyle: Record<string, string> }>;

interface DemoSurface {
  label: string;
  href:  string;
  desc:  string;
}

const SECTION_INTELLIGENCE: DemoSurface[] = [
  { label: 'KORA Index™ Detail',      href: '/company/kora-index', desc: 'Scomposizione analitica: 10 componenti, 4 macroblocks, explainability, pipeline 14-stage.' },
  { label: 'Activation Intelligence', href: '/company/activation', desc: 'Activation Debt™, Maggioranza Silenziosa, distribuzione pillar e sede.' },
  { label: 'Pillar Intelligence',     href: '/company/pillars',    desc: 'Portfolio programmi, iniziative collettive, distribuzione IU sui 5 pillar KORA.' },
  { label: 'Decision Pack',           href: '/company/reports',    desc: 'Report direzionali, version history, period comparison, KORA Contribution.' },
  { label: 'Financial Governance',    href: '/company/financial',  desc: 'BTI™ Engine, Activation Debt, budget per pillar, correlazioni KPI, scenari direzionali.' },
  { label: 'Status Center',           href: '/company/status',     desc: 'Stato operativo aziendale: pipeline, checklist onboarding, submission, Worker Space.' },
];

const SECTION_ECOSYSTEM: DemoSurface[] = [
  { label: 'Advisor Workspace',     href: '/demo/advisor',        desc: 'Revisione evidenze, raccomandazioni governance, queue priorità.' },
  { label: 'Activation Network',    href: '/demo/network',        desc: 'Copertura territoriale partner & advisor, protocolli attivi.' },
  { label: 'Benchmark',             href: '/demo/benchmarks',     desc: 'Posizionamento KORA Index vs cluster sintetici di riferimento.' },
];

const SECTION_PIPELINE: DemoSurface[] = [
  { label: 'KORA Classification Engine™', href: '/demo/ai-onboarding', desc: 'Pipeline di ingestione: tassonomia BCM rule-based, nessun LLM esterno su dati HR.' },
  { label: 'Demo Guide',                  href: '/demo/guide',          desc: 'Percorso guidato per presentare KORA a un nuovo interlocutore.' },
];

const SECTION_ROADMAP: DemoSurface[] = [
  { label: 'Future Vision', href: '/demo/future-vision', desc: 'Roadmap architetturale — non attiva in Foundation Light.' },
];

const INTERNAL_TOOLS: DemoSurface[] = [
  { label: 'GTM Console', href: '/demo/gtm', desc: 'Demo script, pilot package, pipeline commerciale — uso interno KORA.' },
];

function SurfaceLink({ surface }: { surface: DemoSurface }) {
  return (
    <Link
      href={surface.href}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 18px', background: '#FFFFFF',
        border: '1px solid rgba(6,3,43,0.09)', borderRadius: 12,
        textDecoration: 'none', gap: 16,
      }}
    >
      <div>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#211F1A', marginBottom: 3 }}>{surface.label}</p>
        <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', lineHeight: 1.5 }}>{surface.desc}</p>
      </div>
      <span style={{ fontSize: 16, color: 'rgba(6,3,43,0.25)', flexShrink: 0 }}>→</span>
    </Link>
  );
}

function SectionHeading({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.40)', marginBottom: 4 }}>
        {label}
      </h2>
      <p style={{ fontSize: '12px', color: 'rgba(6,3,43,0.45)', lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

export default function DemoHomePage() {
  return (
    <div data-testid="demo-home" style={{ fontFamily: FONT }}>
      <DemoAccessBanner />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5512E', marginBottom: 10 }}>
          KORA Foundation Light · Demo
        </p>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: '#211F1A', marginBottom: 12 }}>
          Scopri KORA
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(6,3,43,0.55)', lineHeight: 1.65, maxWidth: '60ch' }}>
          Area Dimostrativa · Dati sintetici · KORA Methodology v0.1 · Pre-empirical calibration.
          Nessun dato aziendale reale. Nessuna calibrazione empirica certificata.
        </p>
      </div>

      {/* ── Scenari dimostrativi ──────────────────────────────────────────── */}
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
              <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)', lineHeight: 1.55, marginBottom: 16 }}>{s.description}</p>
              <Link
                href="/company/kora-index"
                style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#B5512E', textDecoration: 'none' }}
              >
                Esplora KORA Index™ →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sezione 1: Intelligence Aziendale ─────────────────────────────── */}
      <section data-testid="demo-section-intelligence" style={{ marginBottom: 40 }}>
        <SectionHeading
          label="Intelligence Aziendale"
          subtitle="Cosa vede un'azienda pilota KORA — dati sintetici S1/S2."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTION_INTELLIGENCE.map((s) => <SurfaceLink key={s.href} surface={s} />)}
        </div>
      </section>

      {/* ── Sezione 2: Ecosistema & Advisor ───────────────────────────────── */}
      <section data-testid="demo-section-ecosystem" style={{ marginBottom: 40 }}>
        <SectionHeading
          label="Ecosistema & Advisor"
          subtitle="Network, benchmark e governance delle evidenze."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTION_ECOSYSTEM.map((s) => <SurfaceLink key={s.href} surface={s} />)}
        </div>
      </section>

      {/* ── Sezione 3: Pipeline & Classificazione ─────────────────────────── */}
      <section data-testid="demo-section-pipeline" style={{ marginBottom: 40 }}>
        <SectionHeading
          label="Pipeline & Classificazione"
          subtitle="Come funziona la pipeline KORA — dal dato grezzo al KORA Index™."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTION_PIPELINE.map((s) => <SurfaceLink key={s.href} surface={s} />)}
        </div>
      </section>

      {/* ── Sezione 4: Roadmap ────────────────────────────────────────────── */}
      <section data-testid="demo-section-roadmap" style={{ marginBottom: 48 }}>
        <SectionHeading
          label="Roadmap"
          subtitle="Funzionalità future — non attive in Foundation Light."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTION_ROADMAP.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 18px', background: 'rgba(6,3,43,0.02)',
                border: '1px solid rgba(6,3,43,0.07)', borderRadius: 12,
                textDecoration: 'none', gap: 16, opacity: 0.7,
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#211F1A' }}>{s.label}</p>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.40)', padding: '1px 6px', border: '1px solid rgba(6,3,43,0.15)', borderRadius: 4 }}>
                    INATTIVO
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.45)', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
              <span style={{ fontSize: 16, color: 'rgba(6,3,43,0.20)', flexShrink: 0 }}>→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Disclaimer ────────────────────────────────────────────────────── */}
      <div
        data-testid="demo-disclaimer"
        style={{ borderTop: '1px solid rgba(6,3,43,0.08)', paddingTop: 18, marginBottom: 24 }}
      >
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', lineHeight: 1.65 }}>
          KORA Foundation Light · Area Dimostrativa · Dati sintetici ·
          Methodology v0.1 pre-empirical calibration · Non certificato, non regulatory-grade ·
          KORA misura organizzazioni, mai individui · Nessun dato aziendale reale caricato.
        </p>
      </div>

      {/* ── Uso interno KORA ──────────────────────────────────────────────── */}
      <div data-testid="demo-internal-tools" style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.30)', marginBottom: 10 }}>
          Uso interno KORA
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {INTERNAL_TOOLS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: 'transparent',
                border: '1px solid rgba(6,3,43,0.07)', borderRadius: 10,
                textDecoration: 'none', gap: 16,
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, color: 'rgba(6,3,43,0.55)', marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.38)', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
              <span style={{ fontSize: 14, color: 'rgba(6,3,43,0.20)', flexShrink: 0 }}>→</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
