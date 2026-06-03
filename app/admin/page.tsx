import Link from 'next/link';
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { TM } from '@/components/ui/TM';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const SAFEGUARD_PILL: Record<string, { bg: string; text: string; border: string }> = {
  CLEAR:   { bg: TOKENS.safeguard.pass.bg,   text: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  },
  WARNING: { bg: TOKENS.safeguard.watch.bg,  text: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` },
  FLAGGED: { bg: TOKENS.safeguard.cap.bg,    text: TOKENS.safeguard.cap.text,   border: `1px solid ${TOKENS.safeguard.cap.dot}40`   },
};

function IntelPanel({
  n, title, children, href, hrefLabel,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
        boxShadow:    TOKENS.cardShadow,
        padding:      '20px',
        display:      'flex',
        flexDirection: 'column',
        gap:          14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px', fontWeight: 700, color: TOKENS.accent, letterSpacing: '0.06em' }}>
          {n}
        </span>
        <p style={{
          fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:  700,
          fontSize:    '12.5px',
          color:       TOKENS.ink,
          letterSpacing: '-0.005em',
        }}>
          {title}
        </p>
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
      {href && hrefLabel && (
        <Link href={href} style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}

import type React from 'react';

// A-01: KORA Control Tower
export default function KoraControlTower() {
  const analytics  = adminPreviewService.getPlatformAnalyticsPreview();
  const portfolio  = adminPreviewService.getCompanyPortfolioPreview();
  const gates      = adminPreviewService.getGateStatusPreview();
  const billing    = adminPreviewService.getBillingRevenuePreview();
  const gtm        = adminPreviewService.getFounderValidationPreview();
  const advisors   = adminPreviewService.getAdvisorNetworkPreview();
  const partners   = adminPreviewService.getPartnerNetworkPreview();
  const benchmarks = adminPreviewService.getBenchmarkPreview();
  const onb        = adminPreviewService.getAIOnboardingPreview();

  const clearCount    = analytics.safeguard_distribution.CLEAR;
  const warningCount  = analytics.safeguard_distribution.WARNING;
  const flaggedCount  = analytics.safeguard_distribution.FLAGGED;
  const totalCompanies = clearCount + warningCount + flaggedCount;

  return (
    <div style={{ maxWidth: 960 }}>

      {/* ── 1. Control Tower Command Header ── */}
      <div
        style={{
          background:   TOKENS.ink,
          borderRadius: TOKENS.cardRadius,
          padding:      '32px 40px',
          marginBottom: 28,
        }}
      >
        <p style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    600,
          fontSize:      '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         TOKENS.accent,
          marginBottom:  10,
        }}>
          KORA Admin · Operatore interno
        </p>
        <h1 style={{
          fontFamily:  'var(--font-instrument-serif), Georgia, serif',
          fontSize:    'clamp(1.75rem, 3vw, 2.25rem)',
          fontWeight:  400,
          color:       '#FFFFFF',
          letterSpacing: '-0.02em',
          lineHeight:  1.08,
          marginBottom: 8,
        }}>
          Control Tower
        </h1>
        <p style={{
          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:   '13px',
          color:      'rgba(255,255,255,0.50)',
          maxWidth:   520,
          lineHeight: 1.5,
        }}>
          Vista operativa cross-azienda — governance metodologica, pipeline dati, rete e analisi piattaforma.
        </p>

        {/* Operational KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginTop: 28 }}>
          {[
            { label: 'Aziende attive',    value: String(analytics.companies_in_portfolio), sub: 'Pilot portfolio'           },
            { label: 'KORA Index medio',  value: String(analytics.avg_kora_index),         sub: 'Media ponderata'           },
            { label: 'CS medio',          value: `${(analytics.avg_confidence_score * 100).toFixed(0)}%`, sub: 'Confidence Score' },
            { label: 'Batch approvati',   value: `${analytics.source_batches_approved}/${analytics.source_batches_total}`, sub: 'Fonti dati' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ borderLeft: `2px solid rgba(255,255,255,0.10)`, paddingLeft: 12 }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9.5px', color: 'rgba(255,255,255,0.38)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                {label}
              </p>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontWeight: 700, fontSize: '22px', color: '#FFFFFF', letterSpacing: '-0.025em', lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10px', color: 'rgba(255,255,255,0.30)', marginTop: 3 }}>
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* Safeguard distribution bar */}
        {totalCompanies > 0 && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9.5px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Activation Safeguard™ — distribuzione portfolio
            </p>
            <div style={{ display: 'flex', gap: 3, height: 8, borderRadius: 999, overflow: 'hidden' }}>
              {clearCount > 0    && <div style={{ flex: clearCount,   background: TOKENS.safeguard.pass.dot  }} />}
              {warningCount > 0  && <div style={{ flex: warningCount, background: TOKENS.safeguard.watch.dot }} />}
              {flaggedCount > 0  && <div style={{ flex: flaggedCount, background: TOKENS.safeguard.cap.dot   }} />}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {[
                { label: 'CLEAR',   count: clearCount,   dot: TOKENS.safeguard.pass.dot  },
                { label: 'WARNING', count: warningCount, dot: TOKENS.safeguard.watch.dot },
                { label: 'FLAGGED', count: flaggedCount, dot: TOKENS.safeguard.cap.dot   },
              ].filter(x => x.count > 0).map(({ label, count, dot }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
                  {count} {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Pipeline Command Strip ── */}
      <div
        style={{
          background:   TOKENS.taupe,
          border:       `1px solid ${TOKENS.accent}20`,
          borderLeft:   `3px solid ${TOKENS.accent}`,
          borderRadius: TOKENS.cardRadius,
          padding:      '16px 20px',
          marginBottom: 20,
          display:      'flex',
          alignItems:   'center',
          gap:          24,
          flexWrap:     'wrap',
        }}
      >
        <div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10px', fontWeight: 600, color: TOKENS.accent, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            AI Onboarding Engine
          </p>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '12px', color: TOKENS.inkSecondary }}>
            {onb.source_batch_count} batch fonti · {onb.approved_batches} approvati · {onb.pending_review_batches} in attesa
          </p>
        </div>
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <span
            style={{
              borderRadius: 999,
              padding:      '4px 12px',
              fontSize:     '10px',
              fontFamily:   'Plus Jakarta Sans, var(--font-jakarta)',
              fontWeight:   700,
              ...(onb.scoring_readiness === 'ready'
                ? { background: TOKENS.safeguard.pass.bg,  color: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  }
                : onb.scoring_readiness === 'partial'
                ? { background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` }
                : { background: TOKENS.safeguard.cap.bg,   color: TOKENS.safeguard.cap.text,   border: `1px solid ${TOKENS.safeguard.cap.dot}40`   }),
            }}
          >
            {onb.scoring_readiness.toUpperCase()} per scoring
          </span>
        </div>
        <Link href="/admin/ai-onboarding" style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none', flexShrink: 0 }}>
          Apri pipeline →
        </Link>
      </div>

      {/* ── 3. Intelligence Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Company Portfolio + Index Registry */}
        <IntelPanel n="01" title="Company Portfolio" href="/admin/portfolio" hrefLabel="Vedi portfolio">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {portfolio.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '12px', color: TOKENS.inkSecondary, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.company_name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {c.kora_index_value !== null && (
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', fontWeight: 700, color: TOKENS.ink }}>
                      {c.kora_index_value}
                    </span>
                  )}
                  {c.safeguard_status && (
                    <span style={{
                      borderRadius: 999,
                      padding:      '2px 8px',
                      fontSize:     '9px',
                      fontWeight:   700,
                      ...(SAFEGUARD_PILL[c.safeguard_status] ?? { background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }),
                    }}>
                      {c.safeguard_status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </IntelPanel>

        {/* KORA Index Registry */}
        <IntelPanel n="02" title="KORA Index™ Registry" href="/admin/index-registry" hrefLabel="Vedi registro">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 48px', gap: 8, paddingBottom: 6, borderBottom: TOKENS.cardBorder, marginBottom: 6 }}>
              {['Azienda', 'S', 'Index'].map((h, i) => (
                <span key={h} style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint, textAlign: i === 2 ? 'right' : 'left' }}>
                  {h}
                </span>
              ))}
            </div>
            {adminPreviewService.getIndexRegistryPreview().slice(0, 5).map((e) => (
              <div key={`${e.company_id}-${e.scenario_id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 48px', gap: 8, paddingBottom: 6, marginBottom: 2 }}>
                <span style={{ fontSize: '11px', color: TOKENS.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.company_name.split(' ')[0]}
                </span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.inkHint }}>{e.scenario_id}</span>
                <span style={{
                  textAlign:  'right',
                  fontSize:   '12px',
                  fontWeight: 700,
                  color:      e.safeguard_status === 'FLAGGED' ? TOKENS.critical
                            : e.safeguard_status === 'WARNING' ? TOKENS.warning
                            : TOKENS.success,
                }}>
                  {e.kora_index_value}
                </span>
              </div>
            ))}
          </div>
        </IntelPanel>

        {/* Advisor Network */}
        <IntelPanel n="03" title="Advisor Network" href="/admin/network" hrefLabel="Vedi rete">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {advisors.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, flex: 1, minWidth: 0 }}>{a.name.split(' ').slice(-1)[0]}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {a.pending_reviews > 0 && (
                    <span style={{
                      borderRadius: 999,
                      padding:      '2px 8px',
                      fontSize:     '9px',
                      fontWeight:   700,
                      background:   TOKENS.safeguard.watch.bg,
                      color:        TOKENS.safeguard.watch.text,
                      border:       `1px solid ${TOKENS.safeguard.watch.dot}40`,
                    }}>
                      {a.pending_reviews} review
                    </span>
                  )}
                  <span style={{
                    borderRadius: 999,
                    padding:      '2px 8px',
                    fontSize:     '9px',
                    fontWeight:   600,
                    ...(a.status === 'active'
                      ? { background: TOKENS.safeguard.pass.bg, color: TOKENS.safeguard.pass.text, border: `1px solid ${TOKENS.safeguard.pass.dot}40` }
                      : { background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }),
                  }}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </IntelPanel>

        {/* Partner Network */}
        <IntelPanel n="04" title="Partner Network" href="/admin/network" hrefLabel="Vedi rete">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {partners.slice(0, 5).map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: '10px', color: TOKENS.inkHint, flexShrink: 0 }}>{p.pillars[0]}</span>
              </div>
            ))}
          </div>
        </IntelPanel>

        {/* Platform Analytics */}
        <IntelPanel n="05" title="Platform Analytics">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Confidence Score™ medio',  `${(analytics.avg_confidence_score * 100).toFixed(0)}%`],
              ['Completezza dati media',   `${(analytics.avg_data_completeness * 100).toFixed(0)}%`],
              ['CLEAR / WARNING / FLAGGED', `${analytics.safeguard_distribution.CLEAR} · ${analytics.safeguard_distribution.WARNING} · ${analytics.safeguard_distribution.FLAGGED}`],
            ].map(([l, v]) => (
              <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary }}>{l}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: TOKENS.ink, fontWeight: 700, flexShrink: 0 }}>{v}</span>
              </div>
            ))}
          </div>
        </IntelPanel>

        {/* GTM Pipeline */}
        <IntelPanel n="06" title="Go-to-Market Pipeline" href="/admin/gtm" hrefLabel="Pipeline GTM">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gtm.slice(0, 4).map((e) => (
              <div key={e.company_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.company_name.split(' ')[0]}
                </span>
                <span style={{
                  borderRadius: 999,
                  padding:      '2px 8px',
                  fontSize:     '9px',
                  fontWeight:   600,
                  flexShrink:   0,
                  ...(e.stage === 'pilot_active'
                    ? { background: TOKENS.safeguard.pass.bg,  color: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  }
                    : e.stage === 'pilot_proposed'
                    ? { background: 'rgba(43,92,230,0.10)', color: '#1E4A8A', border: '1px solid rgba(43,92,230,0.22)' }
                    : e.stage === 'demo_shown'
                    ? { background: TOKENS.accentSoft, color: TOKENS.accent, border: `1px solid rgba(199,111,61,0.25)` }
                    : { background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }),
                }}>
                  {e.stage.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </IntelPanel>

      </div>

      {/* ── 4. Methodology & Gate Footer ── */}
      <div
        style={{
          marginTop:    20,
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          padding:      '20px 24px',
          display:      'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:          24,
        }}
      >
        <div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.inkHint, marginBottom: 10 }}>
            Methodology & Gate Status
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gates.gates.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  borderRadius: 999,
                  padding:      '2px 8px',
                  fontSize:     '9px',
                  fontWeight:   700,
                  flexShrink:   0,
                  ...(g.status === 'CLOSED'
                    ? { background: TOKENS.safeguard.pass.bg,  color: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  }
                    : { background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` }),
                }}>
                  {g.status}
                </span>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary }}>{g.label.split(' — ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.inkHint, marginBottom: 10 }}>
            Billing & Revenue
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {billing.slice(0, 3).map((b) => (
              <div key={b.company_name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary }}>{b.company_name.split(' ')[0]}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: TOKENS.inkHint }}>
                  €{(b.setup_fee_eur + b.monthly_fee_eur * 12 + b.advisory_fee_eur).toLocaleString('it-IT')}/yr
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9px', color: TOKENS.inkHint, marginTop: 8, fontStyle: 'italic' }}>
            No Stripe · No wallet · Mock only
          </p>
        </div>
      </div>

      {/* ── Governance stamp ── */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: TOKENS.cardBorder }}>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.inkHint, letterSpacing: '0.03em' }}>
          {gates.methodology_version_id} · {gates.calibration_status} · Solo dati sintetici · synthetic_demo_data: true
        </p>
      </div>

    </div>
  );
}
