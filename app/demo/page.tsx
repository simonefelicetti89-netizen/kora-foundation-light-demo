// app/demo/page.tsx — B132-A: Demo area home — struttura narrativa a 4 sezioni.
// B129: Demo area home originale.
// Synthetic data only — no getSupabaseServiceClient, no getSupabaseServerClient,
// no live DB queries.
//
// CC-00 — Residual /demo/** controlled retirement (2026-09-26): the
// "Ecosistema & Advisor" (advisor, network, benchmark), "Pipeline &
// Classificazione" (ai-onboarding, guide), and "Uso interno KORA" (gtm)
// sections are removed — every route they linked to is retired this same
// slice (see lib/architecture/registry.ts's app-surface.demo entry for the
// full route-by-route disposition). "Intelligence Aziendale" (real
// canonical company surfaces) and "Roadmap" (Future Vision — a
// constitutionally-designated category per CLAUDE.md §10/§16/Red Line #10,
// not an ordinary demo preview) are untouched.
//
// CC-00 Bucket C cleanup (2026-09-05): the former "Scenari dimostrativi"
// section named two companies — one real (S1, read from
// data/synthetic/kora-index-outputs.json[0]) and one entirely fabricated,
// never even seed-backed (S2 "Ferretti Holding", hardcoded koraIndex: 54 /
// safeguard: 'CLEAR' / cs: '74%', per this file's own now-removed TODO
// admitting the seed was never created) — each with a specific claimed
// KORA Index value, Confidence Score, and Safeguard status. This is exactly
// the "fake company + claimed score = customer proof" pattern CC-00 removed
// from the public landing page (see app/page.tsx's own Index Anatomy card
// and CC-00 Public Landing canonicalization, 2026-09-26). Replaced with the
// same real, static, canonical schematic pattern app/page.tsx already
// established: the real 0–100 scale, the 3 real Activation Safeguard
// states, the real "Confidence Score external, weight 0" fact, and the
// real macroblock weights from lib/methodology-config/v0.1.ts — no company
// name, no claimed result, no invented replacement number.

export const dynamic = 'force-static';

import Link from 'next/link';
import { DemoAccessBanner } from '@/components/demo/DemoAccessBanner';
import { getMacroblockWeights } from '@/lib/methodology-config/v0.1';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const MB_WEIGHTS = getMacroblockWeights();
const pct = (w: number) => Math.round(w * 100);

const MACROBLOCKS = [
  { label: 'Activation Reach',       weight: pct(MB_WEIGHTS.REACH)   },
  { label: 'Activation Quality',     weight: pct(MB_WEIGHTS.QUALITY) },
  { label: 'Distribution & Equity',  weight: pct(MB_WEIGHTS.EQUITY)  },
  { label: 'Budget-to-Human-Impact', weight: pct(MB_WEIGHTS.BTI)     },
];

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

const SECTION_ROADMAP: DemoSurface[] = [
  { label: 'Future Vision', href: '/demo/future-vision', desc: 'Roadmap architetturale — non attiva in Foundation Light.' },
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

      {/* ── Anatomia del KORA Index — schematico, nessuna azienda, nessun
             risultato attribuito: solo la scala reale (0–100), i 3 stati
             reali dell'Activation Safeguard, e i pesi reali dei macroblocchi
             (lib/methodology-config/v0.1.ts). ─────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.40)', marginBottom: 16 }}>
          Anatomia del KORA Index
        </h2>
        <div
          data-testid="demo-index-schematic"
          style={{ background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)', borderRadius: 14, padding: '24px 22px', maxWidth: 480 }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B5512E', marginBottom: 10 }}>
            KORA Index v1.0 · Esempio schematico
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#211F1A', lineHeight: 1, marginBottom: 14 }}>
            0–100
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 700, background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
              CLEAR · WARNING · FLAGGED
            </span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 700, background: 'rgba(6,3,43,0.05)', color: 'rgba(6,3,43,0.55)' }}>
              CS esterno · peso 0
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', marginBottom: 16 }}>pre_empirical_calibration</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {MACROBLOCKS.map((mb) => (
              <div key={mb.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'rgba(6,3,43,0.60)' }}>{mb.label}</span>
                <span style={{ fontWeight: 700, color: '#211F1A' }}>{mb.weight}%</span>
              </div>
            ))}
          </div>
          <Link
            href="/company/kora-index"
            style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#B5512E', textDecoration: 'none' }}
          >
            Esplora KORA Index™ →
          </Link>
        </div>
      </section>

      {/* ── Sezione 1: Intelligence Aziendale ─────────────────────────────── */}
      <section data-testid="demo-section-intelligence" style={{ marginBottom: 40 }}>
        <SectionHeading
          label="Intelligence Aziendale"
          subtitle="Cosa vede un'azienda pilota KORA."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTION_INTELLIGENCE.map((s) => <SurfaceLink key={s.href} surface={s} />)}
        </div>
      </section>

      {/* ── Sezione 2: Roadmap ────────────────────────────────────────────── */}
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

    </div>
  );
}
