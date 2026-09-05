// A-01: KORA Control Tower™ — narrative-first admin operating console
// B82-B: Structural LIVE / DEMO separation.
// Structure (post CC-00 Admin Console canonicalization, 2026-09-19):
// LIVE PLATFORM block → Priority Queue (LIVE) → Company Readiness Matrix (LIVE)
// → Intelligence Grid (LIVE) → Methodology Governance (static, accurate)
//
// CC-00 — B-TRUTH / ONE PRODUCT, ONE TRUTH — AdminPreview Cross-Company
// Canonicalization, Phase 1 (2026-09-06): the Platform Analytics panel's
// data is now read directly from analytics.tenant + analytics.kora_index_result
// + analytics.confidence_result + analytics.source_batch (canonical) instead
// of adminPreviewService.getPlatformAnalyticsPreview()'s synthetic
// companies.json/kora-index-outputs.json/source-batches.json fixtures, via
// the shared pure view builder lib/live/admin-cross-company-view.ts.
//
// CC-00 — Index Registry canonicalization (2026-09-06, later the same day):
// the founder has since ratified DEMO_VIEWER's retirement, superseding the
// security-architecture reason getIndexRegistryPreview() was deferred above
// (see lib/architecture/registry.ts's app-surface.demo entry for the
// preserved historical record of the superseded D-C decision). The "KORA
// Index™ Registry" panel below now reads analytics.kora_index_result
// directly (reusing the same rows already fetched for Platform Analytics —
// no second query) via lib/live/admin-cross-company-view.ts's
// buildIndexRegistryView(). app/demo/index-registry/page.tsx, its only
// other real caller, is retired — this is no longer a canonical-for-admin/
// synthetic-for-demo split, it is one canonical projection with one real
// caller. getCompanyPortfolioPreview() and every other AdminPreviewService
// method remain untouched, still synthetic-backed, still their own
// separate, later CC-00 slices. The DEMO_VIEWER role itself is not removed
// in this change.
//
// CC-00 — Company Portfolio capability salvage + canonicalization
// (2026-09-12): getCompanyPortfolioPreview() is retired outright, not
// migrated — its real capability already exists, canonically, at
// app/admin/companies/page.tsx ("Company Console"). The "Company Readiness
// Matrix" panel below now reads the SAME `registry` array already fetched
// for the Intelligence Grid's KORA Index™ Registry panel (no second query)
// via buildIndexRegistryView(). Two dead/decorative columns are dropped:
// "CS™" (always rendered "—" — never actually wired to real data) and
// "Fonte" (always hardcoded "Demo"). sector/territory/is_primary_demo/
// demo_note had no canonical equivalent and are not carried forward — see
// lib/architecture/registry.ts's svc.admin-preview entry for the full
// field-by-field disposition.
//
// CC-00 — Admin Console panel-by-panel canonicalization (2026-09-19):
// "No panel survives merely because it exists today." Every remaining
// AdminPreviewService-fed panel was re-classified:
//   - Priority Queue: the "pending batches" signal now reads
//     analytics.source_batches_total - analytics.source_batches_approved
//     (already fetched above, zero new query) instead of
//     getAIOnboardingPreview()'s single-fake-company count. The "scoring
//     blocked" signal is DROPPED, not migrated — it was a per-tenant
//     readiness heuristic with no honest multi-tenant translation; forcing
//     one would invent product semantics this slice does not authorize.
//   - Intelligence Grid: "Advisor Network" and "Partner Network" panels are
//     REMOVED — both showed fully fictional operator-facing data (advisor
//     names/pending-reviews with no canonical advisor_profile model behind
//     ADVISOR the role at all; partner evidence_protocol_status/
//     active_programs with no equivalent on the real, canonical
//     network.partner_profile table). Both capabilities are deferred as
//     real, future NETWORK-track work — see lib/architecture/registry.ts.
//     "Platform Analytics" keeps its data (already canonical since Phase 1)
//     but drops its "DEMO · dati sintetici" badge — a leftover mislabeling
//     bug, not accurate. The whole section's SectionHead is now "LIVE".
//   - The old GTM founder-pipeline section is REMOVED outright — it
//     duplicated a real, already-existing, richer internal tool at
//     app/admin/founder-validation (already linked from admin nav),
//     replaced by a single link, not a redesigned panel.
//   - "Billing & Revenue (mock)" block REMOVED outright — Foundation Light
//     has zero billing/payment product authority (CLAUDE.md Red Line), it
//     had no demo caller, and its own title already called it "(mock)".
//   - "Gate & Methodology" is kept as-is: real, accurate, static project
//     governance state (matches CLAUDE.md's own gate-status footer) — not
//     synthetic, so its former "DEMO" section badge is dropped too.
// getBenchmarkPreview(), getAdvisorNetworkPreview(), getFounderValidationPreview(),
// getGateStatusPreview(), and getAIOnboardingPreview() are NOT deleted from
// AdminPreviewService.ts — each still has a legitimate /demo/** caller.
// getPartnerNetworkPreview() and getBillingRevenuePreview() (zero remaining
// callers once removed here) and getPrivacyFilterPreview() (moved inline to
// its sole caller) are deleted/relocated there. DEMO_VIEWER role untouched.

import Link from 'next/link';
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { buildAdminPlatformAnalyticsView, buildIndexRegistryView, type CurrentKoraIndexResultRow, type SourceBatchStatusRowForAnalytics, type TenantIdentityRow } from '@/lib/live/admin-cross-company-view';
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
    .select('id, company_name');
  if (tenantErr) throw new Error(`[KORA] tenant lookup failed: ${tenantErr.message}`);

  const { data: currentResultRows, error: resultErr } = await db
    .schema('analytics').from('kora_index_result')
    .select('tenant_id, kora_index_value, safeguard_status, confidence_result:confidence_result_id(confidence_score, data_completeness)')
    .eq('is_current', true);
  if (resultErr) throw new Error(`[KORA] kora_index_result lookup failed: ${resultErr.message}`);

  const { data: batchRows, error: batchErr } = await db
    .schema('analytics').from('source_batch')
    .select('batch_status');
  if (batchErr) throw new Error(`[KORA] source_batch lookup failed: ${batchErr.message}`);

  const typedTenantRows = (tenantRows ?? []) as TenantIdentityRow[];
  const typedCurrentResultRows = (currentResultRows ?? []) as unknown as CurrentKoraIndexResultRow[];

  const analytics = buildAdminPlatformAnalyticsView(
    typedTenantRows.length,
    typedCurrentResultRows,
    (batchRows ?? []) as SourceBatchStatusRowForAnalytics[],
  );
  const registry = buildIndexRegistryView(typedTenantRows, typedCurrentResultRows);

  const gates      = adminPreviewService.getGateStatusPreview();

  const clearCount   = analytics.safeguard_distribution.CLEAR;
  const warningCount = analytics.safeguard_distribution.WARNING;
  const flaggedCount = analytics.safeguard_distribution.FLAGGED;
  const totalC       = clearCount + warningCount + flaggedCount;
  const pendingBatches = analytics.source_batches_total - analytics.source_batches_approved;

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

  if (pendingBatches > 0) {
    priorityItems.push({
      id: 'pending-batches',
      urgency: 'media',
      type: 'Data Pipeline',
      title: `${pendingBatches} batch fonti in attesa di revisione`,
      detail: 'Batch caricati da company non ancora processati. Avviare data intake review.',
      href: '/admin/data-intake',
      action: 'Rivedi',
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
              <span style={{ borderRadius: 4, padding: '2px 7px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: FONT, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                LIVE
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: '11px', color: TOKENS.accent, fontWeight: 600, marginTop: 4 }}>
              Derivata da dati canonici — azioni operative reali
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

      <SectionHead label="Company Readiness Matrix" badgeMode="LIVE" />

      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, padding: '10px 20px', borderBottom: TOKENS.cardBorder, background: TOKENS.taupe }}>
          {['Azienda', 'Safeguard™', 'Score'].map((h, i) => (
            <p key={h} style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint, textAlign: i > 0 ? 'center' : 'left' }}>
              {h}
            </p>
          ))}
        </div>

        {registry.length === 0 && (
          <p style={{ fontFamily: FONT, fontSize: '11px', color: TOKENS.inkHint, padding: '14px 20px' }}>
            Nessun risultato KORA Index™ corrente.
          </p>
        )}

        {registry.map((e, i) => (
          <div
            key={e.tenantId}
            style={{
              display:     'grid',
              gridTemplateColumns: '1fr 80px 80px',
              gap:          8,
              padding:      '12px 20px',
              borderBottom: i < registry.length - 1 ? TOKENS.cardBorder : 'none',
              alignItems:   'center',
            }}
          >
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '12px', fontWeight: 500, color: TOKENS.inkSecondary }}>{e.companyName}</p>
            <div style={{ textAlign: 'center' }}>
              {e.safeguardStatus ? (
                <span style={{
                  borderRadius: 999, padding: '3px 8px', fontSize: '9px', fontWeight: 700,
                  ...(SAFEGUARD_PILL[e.safeguardStatus] ?? { background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }),
                }}>
                  {e.safeguardStatus}
                </span>
              ) : <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>—</span>}
            </div>
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: TOKENS.ink }}>
              {e.koraIndexValue ?? '—'}
            </p>
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

      <SectionHead label="Intelligence operativa" badgeMode="LIVE" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* KORA Index Registry — canonical (CC-00 Index Registry canonicalization) */}
        <Panel n="01" title="KORA Index™ Registry">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 8, paddingBottom: 6, borderBottom: TOKENS.cardBorder, marginBottom: 6 }}>
              {['Azienda', 'Index'].map((h, i) => (
                <span key={h} style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: TOKENS.inkHint, textAlign: i === 1 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {registry.length === 0 && (
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, padding: '4px 0' }}>Nessun risultato KORA Index™ corrente.</p>
            )}
            {registry.slice(0, 5).map((e) => (
              <div key={e.tenantId} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 8, paddingBottom: 5, marginBottom: 2 }}>
                <span style={{ fontSize: '11px', color: TOKENS.inkSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.companyName.split(' ')[0]}</span>
                <span style={{ textAlign: 'right', fontSize: '12px', fontWeight: 700, color: e.safeguardStatus === 'FLAGGED' ? TOKENS.critical : e.safeguardStatus === 'WARNING' ? TOKENS.warning : TOKENS.success }}>
                  {e.koraIndexValue}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Platform Analytics — canonical (CC-00 Phase 1). No badge: this
            data is real (analytics.kora_index_result/confidence_result),
            not synthetic — the "DEMO · dati sintetici" label here before
            this slice was a leftover mislabeling bug, not accurate. */}
        <Panel n="02" title="Platform Analytics">
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

      </div>

      {/* Founder Validation Cockpit — real internal tool (app/admin/founder-validation),
          not represented inline here. CC-00 Admin Console canonicalization
          (2026-09-19) removed the fake GTM founder-pipeline panel that used
          to duplicate this with fictional pipeline data — see this slice's
          own regression test. */}
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <Link href="/admin/founder-validation" style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
          Founder Validation Cockpit →
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 6: METHODOLOGY GOVERNANCE                        */}
      {/* ════════════════════════════════════════════════════════ */}

      <SectionHead label="Methodology governance" />

      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: '20px 24px' }}>
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
      </div>

    </div>
  );
}
