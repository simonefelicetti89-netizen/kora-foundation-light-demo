import type React from 'react';
import Link from 'next/link';
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { TM } from '@/components/ui/TM';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const SAFEGUARD_PILL: Record<string, { bg: string; text: string; border: string }> = {
  CLEAR:   { bg: TOKENS.safeguard.pass.bg,   text: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  },
  WARNING: { bg: TOKENS.safeguard.watch.bg,  text: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` },
  FLAGGED: { bg: TOKENS.safeguard.cap.bg,    text: TOKENS.safeguard.cap.text,   border: `1px solid ${TOKENS.safeguard.cap.dot}40`   },
};

function CardLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-xs font-semibold hover:underline"
      style={{ color: TOKENS.accent }}
    >
      {label} →
    </Link>
  );
}

// A-01: KORA Operating Console
export default function KoraOperatingConsole() {
  const analytics  = adminPreviewService.getPlatformAnalyticsPreview();
  const portfolio  = adminPreviewService.getCompanyPortfolioPreview();
  const gates      = adminPreviewService.getGateStatusPreview();
  const billing    = adminPreviewService.getBillingRevenuePreview();
  const gtm        = adminPreviewService.getFounderValidationPreview();
  const advisors   = adminPreviewService.getAdvisorNetworkPreview();
  const partners   = adminPreviewService.getPartnerNetworkPreview();
  const benchmarks = adminPreviewService.getBenchmarkPreview();

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Masthead */}
      <PageMasthead
        eyebrow="KORA Admin · Operatore interno"
        title="Operating Console"
        subline="Vista operativa cross-azienda — governance metodologica, pipeline, rete e analisi piattaforma."
        meta="Solo dati sintetici · Foundation Light v0.1 · pre_empirical_calibration"
      />

      {/* Platform KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Aziende attive', value: String(analytics.companies_in_portfolio), period: 'Pilot portfolio' },
          { label: 'Scenari attivi',  value: String(analytics.active_scenarios),        period: 'Configurazioni demo' },
          { label: 'Batch approvati', value: `${analytics.source_batches_approved}/${analytics.source_batches_total}`, period: 'Fonti dati' },
          { label: <TM>KORA Index</TM> as React.ReactNode, value: String(analytics.avg_kora_index), period: 'Media portfolio' },
        ].map(({ label, value, period }, i) => (
          <div
            key={i}
            style={{
              background:   TOKENS.surface,
              border:       TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              boxShadow:    TOKENS.cardShadow,
              padding:      '16px 20px',
            }}
          >
            <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.inkHint, marginBottom: 6 }}>
              {label}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {value}
            </p>
            <p style={{ fontSize: '10px', color: TOKENS.inkTertiary, marginTop: 4 }}>{period}</p>
          </div>
        ))}
      </div>

      {/* Main pipeline cards */}
      <div className="space-y-4">

        {/* AI Onboarding Engine — dark featured card */}
        {(() => {
          const onb = adminPreviewService.getAIOnboardingPreview();
          return (
            <div
              className="rounded-[20px] p-6"
              style={{ background: '#06032B' }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#C76F3D', marginBottom: 6 }}>
                    00 — Pipeline principale
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>AI Onboarding Engine</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.62)', marginTop: 6, maxWidth: 520, lineHeight: 1.5 }}>
                    Acquisizione fonti · Mapping tassonomia BCM · Filtro privacy · Coda bozze <TM>UEF</TM> · Revisione umana · Idoneità al calcolo
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-1">
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.50)' }}>{onb.source_batch_count} batch fonti</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.50)' }}>{onb.approved_batches} approvati · {onb.pending_review_batches} in attesa</p>
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    style={
                      onb.scoring_readiness === 'ready'   ? { background: TOKENS.safeguard.pass.bg,  color: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  } :
                      onb.scoring_readiness === 'partial' ? { background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` } :
                                                             { background: TOKENS.safeguard.cap.bg,   color: TOKENS.safeguard.cap.text,   border: `1px solid ${TOKENS.safeguard.cap.dot}40`   }
                    }
                  >
                    {onb.scoring_readiness.toUpperCase()} per scoring
                  </span>
                </div>
              </div>
              <div
                className="mt-4 pt-3 flex flex-wrap gap-4 items-center text-[10px]"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
              >
                <span>Tassonomia BCM rule-based — nessun LLM esterno su dati HR.</span>
                <span>·</span>
                <span>Solo i record <TM>UEF</TM> approvati entrano nel calcolo.</span>
                <Link href="/admin/ai-onboarding" style={{ color: TOKENS.accent, fontWeight: 600 }}>Apri →</Link>
              </div>
            </div>
          );
        })()}

        {/* Module grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* Company Portfolio */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px' }} className="flex flex-col gap-4">
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>01</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 2 }}>Company Portfolio</p>
            </div>
            <div className="flex-1 space-y-2">
              {portfolio.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate" style={{ color: TOKENS.inkSecondary, fontWeight: 500 }}>{c.company_name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.kora_index_value !== null && (
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: TOKENS.ink, fontWeight: 700 }}>{c.kora_index_value}</span>
                    )}
                    {c.safeguard_status && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                        style={SAFEGUARD_PILL[c.safeguard_status] ?? { background: TOKENS.inkBorder, color: TOKENS.inkSecondary, border: TOKENS.cardBorder }}
                      >
                        {c.safeguard_status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <CardLink href="/admin/portfolio" label="Portfolio" />
          </div>

          {/* KORA Index Registry */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px' }} className="flex flex-col gap-4">
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>02</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 2 }}><TM>KORA Index</TM> Registry</p>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="grid grid-cols-3 gap-1 pb-1.5" style={{ borderBottom: TOKENS.cardBorder }}>
                {['Azienda', 'S', 'Index'].map((h, i) => (
                  <span key={h} className={i === 2 ? 'text-right' : ''} style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint }}>
                    {h}
                  </span>
                ))}
              </div>
              {adminPreviewService.getIndexRegistryPreview().slice(0, 5).map((e) => (
                <div key={`${e.company_id}-${e.scenario_id}`} className="grid grid-cols-3 gap-1 items-center">
                  <span className="truncate" style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{e.company_name.split(' ')[0]}</span>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint }}>
                    {e.scenario_id}{e.is_synthetic && <span style={{ fontSize: '8px', color: TOKENS.inkHint, marginLeft: 2 }}>~</span>}
                  </span>
                  <span className="text-right" style={{
                    fontSize: '12px', fontWeight: 700,
                    color: e.safeguard_status === 'FLAGGED' ? TOKENS.critical : e.safeguard_status === 'WARNING' ? TOKENS.warning : TOKENS.success,
                  }}>
                    {e.kora_index_value}
                  </span>
                </div>
              ))}
            </div>
            <CardLink href="/admin/index-registry" label="Registro" />
          </div>

          {/* Benchmarks */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px' }} className="flex flex-col gap-4">
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>03</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 2 }}>Benchmark</p>
            </div>
            <div className="flex-1 space-y-2">
              {benchmarks.map((b) => (
                <div key={b.dimension}>
                  <p style={{ fontSize: '10px', color: TOKENS.inkTertiary, marginBottom: 2 }}>{b.dimension}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: TOKENS.inkBorder }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${b.meridiana_index}%`, background: TOKENS.accent }} />
                    </div>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkSecondary, whiteSpace: 'nowrap' }}>
                      {b.meridiana_index} vs {b.cluster_avg}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '10px', color: TOKENS.inkHint, fontStyle: 'italic' }}>Dati benchmark sintetici</p>
            <CardLink href="/admin/benchmarks" label="Benchmark" />
          </div>

          {/* Advisor Network */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px' }} className="flex flex-col gap-4">
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>04</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 2 }}>Advisor Network</p>
            </div>
            <div className="flex-1 space-y-2">
              {advisors.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <span className="truncate" style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{a.name.split(' ').slice(-1)[0]}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint }}>{a.pending_reviews} in attesa</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                      style={a.status === 'active'
                        ? { background: TOKENS.safeguard.pass.bg, color: TOKENS.safeguard.pass.text, border: `1px solid ${TOKENS.safeguard.pass.dot}40` }
                        : { background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }}
                    >
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <CardLink href="/admin/network" label="Rete advisor" />
          </div>

          {/* Partner Network */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px' }} className="flex flex-col gap-4">
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>05</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 2 }}>Partner Network</p>
            </div>
            <div className="flex-1 space-y-2">
              {partners.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate" style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{p.name}</span>
                  <span style={{ fontSize: '10px', color: TOKENS.inkHint }}>{p.pillars[0]}</span>
                </div>
              ))}
              {partners.length > 4 && (
                <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>+{partners.length - 4} altri</p>
              )}
            </div>
            <CardLink href="/admin/network" label="Rete partner" />
          </div>

          {/* Platform Analytics */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px' }} className="flex flex-col gap-4">
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>06</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 2 }}>Platform Analytics</p>
            </div>
            <div className="flex-1 space-y-2.5">
              {[
                ['Confidence Score™ medio',  `${(analytics.avg_confidence_score * 100).toFixed(0)}%`],
                ['Completezza dati media',   `${(analytics.avg_data_completeness * 100).toFixed(0)}%`],
                ['CLEAR / WARNING / FLAGGED', `${analytics.safeguard_distribution.CLEAR} / ${analytics.safeguard_distribution.WARNING} / ${analytics.safeguard_distribution.FLAGGED}`],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between">
                  <span style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{l}</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: TOKENS.ink, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Billing — mock */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px' }} className="flex flex-col gap-4">
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>07</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 2 }}>Billing & Revenue</p>
              <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 2 }}>Anteprima mock — nessuna esecuzione</p>
            </div>
            <div className="flex-1 space-y-2">
              {billing.slice(0, 3).map((b) => (
                <div key={b.company_name} className="flex justify-between gap-2">
                  <span className="truncate" style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{b.company_name.split(' ')[0]}</span>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint }}>
                    €{(b.setup_fee_eur + b.monthly_fee_eur * 12 + b.advisory_fee_eur).toLocaleString('it-IT')}/yr
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '9px', color: TOKENS.inkHint, fontStyle: 'italic' }}>No Stripe · No wallet · No custodia fondi · Solo demo</p>
          </div>

          {/* GTM Pipeline */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px' }} className="flex flex-col gap-4">
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>08</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 2 }}>Go-to-Market Pipeline</p>
            </div>
            <div className="flex-1 space-y-2">
              {gtm.slice(0, 4).map((e) => (
                <div key={e.company_name} className="flex items-center justify-between gap-2">
                  <span className="truncate" style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{e.company_name.split(' ')[0]}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                    style={
                      e.stage === 'pilot_active'    ? { background: TOKENS.safeguard.pass.bg,  color: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  } :
                      e.stage === 'pilot_proposed'  ? { background: 'rgba(43,92,230,0.10)',    color: '#1E4A8A',                   border: '1px solid rgba(43,92,230,0.22)'             } :
                      e.stage === 'demo_shown'      ? { background: TOKENS.accentSoft,          color: TOKENS.accent,               border: `1px solid rgba(199,111,61,0.25)`            } :
                                                      { background: TOKENS.inkBorder,           color: TOKENS.inkHint,              border: TOKENS.cardBorder                            }
                    }
                  >
                    {e.stage.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
            <CardLink href="/admin/gtm" label="Pipeline GTM" />
          </div>

          {/* Gate & Methodology */}
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px' }} className="flex flex-col gap-4">
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>09</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginTop: 2 }}>Methodology & Gate</p>
            </div>
            <div className="flex-1 space-y-2">
              {gates.gates.map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                    style={
                      g.status === 'CLOSED'
                        ? { background: TOKENS.safeguard.pass.bg,  color: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  }
                        : { background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` }
                    }
                  >
                    {g.status}
                  </span>
                  <span className="truncate" style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{g.label.split(' — ')[0]}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '10px', color: TOKENS.inkHint }}>
              {gates.methodology_version_id} · {gates.calibration_status}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
