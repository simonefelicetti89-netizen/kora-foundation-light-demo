// A-01: KORA Control Tower™ — narrative-first admin operating console
// B82-B: Structural LIVE / DEMO separation.
// Structure: LIVE PLATFORM block → Priority Queue (DEMO) → Company Readiness Matrix (DEMO) → Intelligence Grid (DEMO) → GTM (DEMO) → Governance
//
// CC-00 — B-TRUTH / ONE PRODUCT, ONE TRUTH — AdminPreview Cross-Company
// Canonicalization, Phase 1 (2026-09-06): the Platform Analytics panel's
// data is now read directly from analytics.tenant + analytics.kora_index_result
// + analytics.confidence_result + analytics.source_batch (canonical) instead
// of adminPreviewService.getPlatformAnalyticsPreview()'s synthetic
// companies.json/kora-index-outputs.json/source-batches.json fixtures, via
// the shared pure view builder lib/live/admin-cross-company-view.ts.
//
// getIndexRegistryPreview() (the "KORA Index™ Registry" panel below) is
// explicitly NOT migrated by this PR — one of its two real callers,
// app/demo/index-registry/page.tsx, is reachable by the DEMO_VIEWER role,
// which lib/auth/kora-session.ts's own requireDemoAccess() documents as
// safe only because /demo pages are synth-only ("If Fase 3 introduces a
// live-data demo tenant, this function must be revisited to prevent live
// data leakage into the /demo surface"). Introducing a live cross-company
// query there is a security-architecture decision this PR does not make
// unilaterally. Forking a canonical-for-admin/synthetic-for-demo split for
// the SAME method was ruled out too (ONE PRODUCT, ONE TRUTH). This method,
// getCompanyPortfolioPreview(), and every other AdminPreviewService method
// remain untouched, still synthetic-backed, still their own separate,
// later CC-00 slices.

import Link from 'next/link';
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { buildAdminPlatformAnalyticsView, type CurrentKoraIndexResultRow, type SourceBatchStatusRowForAnalytics } from '@/lib/live/admin-cross-company-view';
import { PriorityQueue } from '@/components/admin/PriorityQueue';
import type { PriorityItem } from '@/components/admin/PriorityQueue';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { ADMIN_QUICKSTART_STEPS } from '@/lib/feature-discovery';
import type React from 'react';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const SAFEGUARD_PILL: Record<string, { bg: string; text: string; border: string }> = {
  CLEAR:   { bg: TOKENS.safeguard.pass.bg,   text: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  },
  WARNING: { bg: TOKENS.safeguard.watch.bg,  text: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` },
  FLAGGED: { bg: TOKENS.safeguard.cap.bg,    text: TOKENS.safeguard.cap.text,   border: `1px solid ${TOKENS.safeguard.cap.dot}40`   },
};

function Panel({ title, n, children, href, hrefLabel, badgeLabel }: {
  title: string; n: string; children: React.ReactNode; href?: string; hrefLabel?: string; badgeLabel?: string;
}) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px', fontWeight: 700, color: TOKENS.accent, letterSpacing: '0.06em' }}>{n}</span>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '12.5px', color: TOKENS.ink }}>{title}</p>
        {badgeLabel && (
          <span style={{ marginLeft: 'auto', borderRadius: 4, padding: '1px 6px', fontSize: '8px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: FONT, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', whiteSpace: 'nowrap' }}>
            {badgeLabel}
          </span>
        )}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      {href && hrefLabel && (
        <Link href={href} style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>{hrefLabel} →</Link>
      )}
    </div>
  );
}

function SectionHead({ label, badgeMode }: { label: string; badgeMode?: 'LIVE' | 'DEMO' }) {
  return (
    <div style={{ paddingTop: 28, marginTop: 28, borderTop: `1px solid ${TOKENS.inkBorder}`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
      <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '9.5px', letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint }}>
        {label}
      </p>
      {badgeMode === 'DEMO' && (
        <span style={{ borderRadius: 4, padding: '1px 6px', fontSize: '8px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: FONT, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', whiteSpace: 'nowrap' }}>
          DEMO · sintetico
        </span>
      )}
      {badgeMode === 'LIVE' && (
        <span style={{ borderRadius: 4, padding: '1px 6px', fontSize: '8px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: FONT, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>
          LIVE
        </span>
      )}
    </div>
  );
}

export default async function KoraControlTower() {
  const db = getSupabaseServiceClient();

  const { data: tenantRows, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .select('id', { count: 'exact' });
  if (tenantErr) throw new Error(`[KORA] tenant count lookup failed: ${tenantErr.message}`);

  const { data: currentResultRows, error: resultErr } = await db
    .schema('analytics').from('kora_index_result')
    .select('tenant_id, kora_index_value, safeguard_status, confidence_result:confidence_result_id(confidence_score, data_completeness)')
    .eq('is_current', true);
  if (resultErr) throw new Error(`[KORA] kora_index_result lookup failed: ${resultErr.message}`);

  const { data: batchRows, error: batchErr } = await db
    .schema('analytics').from('source_batch')
    .select('batch_status');
  if (batchErr) throw new Error(`[KORA] source_batch lookup failed: ${batchErr.message}`);

  const analytics = buildAdminPlatformAnalyticsView(
    (tenantRows ?? []).length,
    (currentResultRows ?? []) as unknown as CurrentKoraIndexResultRow[],
    (batchRows ?? []) as SourceBatchStatusRowForAnalytics[],
  );

  const portfolio  = adminPreviewService.getCompanyPortfolioPreview();
  const gates      = adminPreviewService.getGateStatusPreview();
  const billing    = adminPreviewService.getBillingRevenuePreview();
  const gtm        = adminPreviewService.getFounderValidationPreview();
  const advisors   = adminPreviewService.getAdvisorNetworkPreview();
  const partners   = adminPreviewService.getPartnerNetworkPreview();
  const onb        = adminPreviewService.getAIOnboardingPreview();
  const registry   = adminPreviewService.getIndexRegistryPreview();

  const clearCount   = analytics.safeguard_distribution.CLEAR;
  const warningCount = analytics.safeguard_distribution.WARNING;
  const flaggedCount = analytics.safeguard_distribution.FLAGGED;
  const totalC       = clearCount + warningCount + flaggedCount;

  // ── Derive priority queue from live data ──────────────────────────────────
  const priorityItems: PriorityItem[] = [];

  if (flaggedCount > 0) {
    priorityItems.push({
      id: 'flagged',
      urgency: 'alta',
      type: 'Activation Safeguard™',
      title: `${flaggedCount} aziend${flaggedCount === 1 ? 'a' : 'e'} in stato FLAGGED`,
      detail: 'Activation Rate e MAR sotto le soglie critiche. Revisione pipeline dati e ingestion necessaria.',
      href: '/admin/companies',
      action: 'Visualizza',
    });
  }

  if (warningCount > 0) {
    priorityItems.push({
      id: 'warning',
      urgency: 'media',
      type: 'Activation Safeguard™',
      title: `${warningCount} aziend${warningCount === 1 ? 'a' : 'e'} in stato WARNING`,
      detail: 'Sotto le soglie di qualità — revisione Activation Debt e copertura pillar raccomandata.',
      href: '/admin/companies',
      action: 'Visualizza',
    });
  }

  if (onb.pending_review_batches > 0) {
    priorityItems.push({
      id: 'pending-batches',
      urgency: 'media',
      type: 'Data Pipeline',
      title: `${onb.pending_review_batches} batch fonti in attesa di revisione`,
      detail: 'Batch caricati da company non ancora processati. Avviare data intake review.',
      href: '/admin/data-intake',
      action: 'Rivedi',
    });
  }

  if (onb.scoring_readiness === 'blocked') {
    priorityItems.push({
      id: 'scoring',
      urgency: 'media',
      type: 'Scoring Readiness',
      title: 'Pipeline non pronta per scoring',
      detail: 'Le fonti dati non sono ancora sufficienti per avviare il calcolo del KORA Index™.',
      href: '/admin/uef-review',
      action: 'Verifica UEF',
    });
  }

  const pendingAdvisorReviews = advisors.reduce((s, a) => s + (a.pending_reviews ?? 0), 0);
  if (pendingAdvisorReviews > 0) {
    priorityItems.push({
      id: 'advisor-queue',
      urgency: 'bassa',
      type: 'Advisor Network',
      title: `${pendingAdvisorReviews} revisioni advisor in attesa`,
      detail: 'Review protocollo evidenze e audit processo non ancora completati.',
      href: '/demo/network',
      action: 'Verifica',
    });
  }

  return (
    <div style={{ maxWidth: 960 }}>

      {/* ════════════════════════════════════════════════════════ */}
      {/* QUICK START — Live workflow numbered steps — Task 6      */}
      {/* ════════════════════════════════════════════════════════ */}

      <div
        data-testid="admin-quickstart-panel"
        style={{ background: TOKENS.surface, border: `2px solid ${TOKENS.accent}`, borderRadius: TOKENS.cardRadius, padding: '22px 28px', marginBottom: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '11px', color: TOKENS.accent, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Live Workflow — Quick Start
          </p>
          <BoundaryBadge mode="LIVE" variant="light" />
        </div>
        <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary, marginBottom: 16, lineHeight: 1.5 }}>
          Segui questi passaggi in sequenza per onboardare un&apos;azienda e produrre il primo KORA Index live.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ADMIN_QUICKSTART_STEPS.map((s) => (
            <Link
              key={`qs-${s.step}`}
              href={s.href}
              data-testid={`quickstart-step-${s.step}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, border: `1px solid rgba(199,111,61,0.22)`, background: 'rgba(199,111,61,0.06)', padding: '7px 14px', textDecoration: 'none', fontFamily: FONT, fontSize: '11.5px', color: TOKENS.ink, fontWeight: 500 }}
            >
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.accent, fontWeight: 700, flexShrink: 0 }}>
                {String(s.step).padStart(2, '0')}
              </span>
              {s.label} →
            </Link>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 0: LIVE PLATFORM — real operational tools        */}
      {/* ════════════════════════════════════════════════════════ */}

      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: TOKENS.cardRadius, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <BoundaryBadge mode="LIVE" variant="light" />
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '12px', color: '#166534', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Piattaforma Live
          </p>
        </div>
        <p style={{ fontFamily: FONT, fontSize: '11.5px', color: '#166534', marginBottom: 14, lineHeight: 1.5 }}>
          Strumenti operativi reali — accesso diretto al tenant autenticato. Nessun dato sintetico.
        </p>

        {/* Trial Control Center — featured card */}
        <Link
          href="/admin/trial-control-center"
          data-testid="admin-home-trial-control-center-card"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            gap:            12,
            borderRadius:   10,
            padding:        '12px 16px',
            background:     'rgba(22,101,52,0.12)',
            border:         '1.5px solid rgba(22,101,52,0.35)',
            textDecoration: 'none',
            marginBottom:   12,
          }}
        >
          <div>
            <p style={{ fontFamily: FONT, fontSize: '12.5px', fontWeight: 700, color: '#166534', margin: '0 0 2px' }}>
              Trial Control Center
            </p>
            <p style={{ fontFamily: FONT, fontSize: '11px', color: 'rgba(22,101,52,0.75)', margin: 0 }}>
              Guida il ciclo demo completo: data intake, scoring, company workspace, worker, wallboard, partner.
            </p>
          </div>
          <span style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: '#166534', whiteSpace: 'nowrap' }}>
            Apri Control Center &#8594;
          </span>
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          {([
            { href: '/admin/companies',               label: 'Company Console · LIVE' },
            { href: '/admin/company-live-preview',    label: 'Anteprima Live Cockpit · LIVE' },
            { href: '/admin/data-intake',             label: 'Data Intake · LIVE' },
            { href: '/admin/uef-review',              label: 'UEF™ Review · LIVE' },
            { href: '/admin/company-submissions',     label: 'Submission Queue · LIVE' },
            { href: '/admin/live-spine-diagnostics',  label: 'Live Spine Diagnostics · LIVE' },
            { href: '/admin/workers',                 label: 'Worker Provisioning · LIVE' },
            { href: '/admin/worker-diagnostics',      label: 'Worker Diagnostics · LIVE' },
          ] as const).map(({ href, label }) => (
            <Link key={href} href={href} style={{ display: 'block', borderRadius: 8, padding: '8px 12px', background: 'rgba(22,101,52,0.08)', border: '1px solid rgba(22,101,52,0.20)', fontSize: '11px', fontWeight: 600, color: '#166534', textDecoration: 'none', fontFamily: FONT }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* DEMO · SINTETICO SEPARATOR                               */}
      {/* ════════════════════════════════════════════════════════ */}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: TOKENS.inkBorder }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6, border: '1px solid #fed7aa', background: '#fff7ed', padding: '5px 12px' }}>
          <BoundaryBadge mode="DEMO" variant="light" suffix="· dati sintetici" />
          <p style={{ fontFamily: FONT, fontSize: '10.5px', color: '#9a3412', fontWeight: 600 }}>
            Contenuto dimostrativo — nessun dato aziendale reale
          </p>
        </div>
        <div style={{ flex: 1, height: 1, background: TOKENS.inkBorder }} />
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 1: COMMAND HERO — operational state at a glance  */}
      {/* ════════════════════════════════════════════════════════ */}

      <div style={{ background: TOKENS.ink, borderRadius: TOKENS.cardRadius, padding: '32px 40px', marginBottom: 24 }}>
        {/* Eyebrow */}
        <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 10 }}>
          KORA Admin · Control Tower™
        </p>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 400, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: 8 }}>
          Vista operativa cross-azienda
        </h1>
        <BoundaryBadge mode="DEMO" variant="dark" suffix="· dati sintetici" style={{ marginBottom: 16 }} />
        <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.50)', maxWidth: 520, lineHeight: 1.5, marginBottom: 28 }}>
          Governance metodologica, pipeline dati, network e analisi piattaforma. Tutto ciò che richiede attenzione dell&apos;operatore KORA.
        </p>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Aziende attive', value: String(analytics.companies_in_portfolio), sub: 'Pilot portfolio' },
            { label: 'KORA Index medio', value: analytics.avg_kora_index != null ? String(analytics.avg_kora_index) : '—', sub: 'Media portfolio' },
            { label: 'CS™ medio', value: analytics.avg_confidence_score != null ? `${(analytics.avg_confidence_score * 100).toFixed(0)}%` : '—', sub: 'Confidence Score™' },
            { label: 'Batch approvati', value: `${analytics.source_batches_approved}/${analytics.source_batches_total}`, sub: 'Fonti dati' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ borderLeft: `2px solid rgba(255,255,255,0.10)`, paddingLeft: 12 }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9.5px', color: 'rgba(255,255,255,0.38)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontWeight: 700, fontSize: '22px', color: '#FFFFFF', letterSpacing: '-0.025em', lineHeight: 1 }}>{value}</p>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10px', color: 'rgba(255,255,255,0.30)', marginTop: 3 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Safeguard distribution */}
        {totalC > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9.5px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Activation Safeguard™ — distribuzione portfolio
            </p>
            <div style={{ display: 'flex', gap: 3, height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
              {clearCount > 0    && <div style={{ flex: clearCount,   background: TOKENS.safeguard.pass.dot  }} />}
              {warningCount > 0  && <div style={{ flex: warningCount, background: TOKENS.safeguard.watch.dot }} />}
              {flaggedCount > 0  && <div style={{ flex: flaggedCount, background: TOKENS.safeguard.cap.dot   }} />}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
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

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 2: PRIORITY QUEUE — what needs attention NOW    */}
      {/* ════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontFamily: FONT, fontSize: '1.25rem', color: TOKENS.ink, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Coda priorità
              </p>
              <span style={{ borderRadius: 4, padding: '2px 7px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: FONT, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}>
                DEMO · sintetico
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: '11px', color: TOKENS.accent, fontWeight: 600, marginTop: 4 }}>
              Anteprima sintetica — non operativa
            </p>
            <p style={{ fontFamily: FONT, fontSize: '11px', color: TOKENS.inkHint, marginTop: 2 }}>
              {priorityItems.length > 0
                ? `${priorityItems.length} azioni richiedono attenzione`
                : 'Nessuna azione urgente'}
            </p>
          </div>
          {priorityItems.filter(x => x.urgency === 'alta').length > 0 && (
            <span style={{ borderRadius: 999, padding: '4px 12px', background: TOKENS.safeguard.cap.bg, color: TOKENS.safeguard.cap.text, border: `1px solid ${TOKENS.safeguard.cap.dot}40`, fontSize: '10px', fontWeight: 700 }}>
              {priorityItems.filter(x => x.urgency === 'alta').length} urgenti
            </span>
          )}
        </div>
        <PriorityQueue items={priorityItems} />
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 3: COMPANY READINESS MATRIX                     */}
      {/* ════════════════════════════════════════════════════════ */}

      <SectionHead label="Company Readiness Matrix" badgeMode="DEMO" />

      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px', gap: 8, padding: '10px 20px', borderBottom: TOKENS.cardBorder, background: TOKENS.taupe }}>
          {['Azienda', 'Safeguard™', 'Score', 'CS™', 'Fonte'].map((h, i) => (
            <p key={h} style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint, textAlign: i > 0 ? 'center' : 'left' }}>
              {h}
            </p>
          ))}
        </div>

        {portfolio.map((c, i) => (
          <div
            key={c.id}
            style={{
              display:     'grid',
              gridTemplateColumns: '1fr 80px 80px 80px 80px',
              gap:          8,
              padding:      '12px 20px',
              borderBottom: i < portfolio.length - 1 ? TOKENS.cardBorder : 'none',
              alignItems:   'center',
            }}
          >
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '12px', fontWeight: 500, color: TOKENS.inkSecondary }}>{c.company_name}</p>
            <div style={{ textAlign: 'center' }}>
              {c.safeguard_status ? (
                <span style={{
                  borderRadius: 999, padding: '3px 8px', fontSize: '9px', fontWeight: 700,
                  ...(SAFEGUARD_PILL[c.safeguard_status] ?? { background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }),
                }}>
                  {c.safeguard_status}
                </span>
              ) : <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>—</span>}
            </div>
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: TOKENS.ink }}>
              {c.kora_index_value ?? '—'}
            </p>
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '11px', textAlign: 'center', color: TOKENS.inkSecondary }}>—</p>
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '11px', textAlign: 'center', color: TOKENS.inkHint }}>Demo</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <Link href="/admin/companies" style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
          Company Console →
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 4: INTELLIGENCE GRID                            */}
      {/* ════════════════════════════════════════════════════════ */}

      <SectionHead label="Intelligence operativa" badgeMode="DEMO" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* KORA Index Registry */}
        <Panel n="01" title="KORA Index™ Registry" href="/demo/index-registry" hrefLabel="Registro" badgeLabel="DEMO · dati sintetici">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 48px', gap: 8, paddingBottom: 6, borderBottom: TOKENS.cardBorder, marginBottom: 6 }}>
              {['Azienda', 'S', 'Index'].map((h, i) => (
                <span key={h} style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint, textAlign: i === 2 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {registry.slice(0, 5).map((e) => (
              <div key={`${e.company_id}-${e.scenario_id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 48px', gap: 8, paddingBottom: 5, marginBottom: 2 }}>
                <span style={{ fontSize: '11px', color: TOKENS.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.company_name.split(' ')[0]}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.inkHint }}>{e.scenario_id}</span>
                <span style={{ textAlign: 'right', fontSize: '12px', fontWeight: 700, color: e.safeguard_status === 'FLAGGED' ? TOKENS.critical : e.safeguard_status === 'WARNING' ? TOKENS.warning : TOKENS.success }}>
                  {e.kora_index_value}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Advisor Network */}
        <Panel n="02" title="Advisor Network" href="/demo/network" hrefLabel="Rete advisor" badgeLabel="DEMO · dati sintetici">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {advisors.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, flex: 1, minWidth: 0 }}>{a.name.split(' ').slice(-1)[0]}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {a.pending_reviews > 0 && (
                    <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: '9px', fontWeight: 700, background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` }}>
                      {a.pending_reviews} review
                    </span>
                  )}
                  <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: '9px', fontWeight: 600, ...(a.status === 'active' ? { background: TOKENS.safeguard.pass.bg, color: TOKENS.safeguard.pass.text, border: `1px solid ${TOKENS.safeguard.pass.dot}40` } : { background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }) }}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Platform Analytics */}
        <Panel n="03" title="Platform Analytics" badgeLabel="DEMO · dati sintetici">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Confidence Score™ medio',  analytics.avg_confidence_score != null ? `${(analytics.avg_confidence_score * 100).toFixed(0)}%` : '—'],
              ['Completezza dati media',   analytics.avg_data_completeness != null ? `${(analytics.avg_data_completeness * 100).toFixed(0)}%` : '—'],
              ['CLEAR / WARNING / FLAGGED', `${analytics.safeguard_distribution.CLEAR} · ${analytics.safeguard_distribution.WARNING} · ${analytics.safeguard_distribution.FLAGGED}`],
            ].map(([l, v]) => (
              <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary }}>{l}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: TOKENS.ink, fontWeight: 700, flexShrink: 0 }}>{v}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Partner Network */}
        <Panel n="04" title="Partner Network" href="/demo/network" hrefLabel="Rete partner" badgeLabel="DEMO · dati sintetici">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {partners.slice(0, 4).map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontSize: '10px', color: TOKENS.inkHint, flexShrink: 0 }}>{p.pillars[0]}</span>
              </div>
            ))}
          </div>
        </Panel>

      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 5: GTM COCKPIT                                   */}
      {/* ════════════════════════════════════════════════════════ */}

      <SectionHead label="GTM Founder Cockpit" badgeMode="DEMO" />

      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, overflow: 'hidden' }}>
        {gtm.slice(0, 5).map((e, i) => (
          <div key={e.company_name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < gtm.length - 1 ? TOKENS.cardBorder : 'none' }}>
            <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.company_name}</span>
            <span style={{
              borderRadius: 999, padding: '2px 8px', fontSize: '9px', fontWeight: 600, flexShrink: 0,
              ...(e.stage === 'pilot_active'   ? { background: TOKENS.safeguard.pass.bg,  color: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40`  }
                : e.stage === 'pilot_proposed' ? { background: 'rgba(43,92,230,0.10)', color: '#1E4A8A', border: '1px solid rgba(43,92,230,0.22)' }
                : e.stage === 'demo_shown'     ? { background: TOKENS.accentSoft, color: TOKENS.accent, border: `1px solid rgba(199,111,61,0.25)` }
                                               : { background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }),
            }}>
              {e.stage.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <Link href="/demo/gtm" style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>Pipeline GTM →</Link>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 6: METHODOLOGY GOVERNANCE                        */}
      {/* ════════════════════════════════════════════════════════ */}

      <SectionHead label="Methodology governance" badgeMode="DEMO" />

      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        <div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.inkHint, marginBottom: 10 }}>
            Gate & Methodology
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gates.gates.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: '9px', fontWeight: 700, flexShrink: 0, ...(g.status === 'CLOSED' ? { background: TOKENS.safeguard.pass.bg, color: TOKENS.safeguard.pass.text, border: `1px solid ${TOKENS.safeguard.pass.dot}40` } : { background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` }) }}>
                  {g.status}
                </span>
                <span style={{ fontSize: '11.5px', color: TOKENS.inkSecondary }}>{g.label.split(' — ')[0]}</span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.inkHint, marginTop: 10 }}>
            {gates.methodology_version_id} · {gates.calibration_status}
          </p>
        </div>
        <div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: TOKENS.inkHint, marginBottom: 10 }}>
            Billing & Revenue (mock)
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
          <p style={{ fontSize: '9px', color: TOKENS.inkHint, fontStyle: 'italic', marginTop: 8 }}>No Stripe · No wallet · Mock only</p>
        </div>
      </div>

    </div>
  );
}
