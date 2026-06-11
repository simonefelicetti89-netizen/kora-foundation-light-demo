// app/admin/trial-control-center/page.tsx
// B123: Trial Control Center — KORA_ADMIN only.
//
// Single orchestration hub for running a full KORA end-to-end demo or trial.
// Shows per-tenant pipeline status, worker state, initiatives, partner catalog,
// demo checklist, and quick links. Read-only.
//
// Design rationale: KORA_ADMIN should be able to open this page, see the
// readiness of every tenant in 30 seconds, and navigate to any pipeline step
// without guessing URLs or checking multiple diagnostic pages.

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';

import { redirect }     from 'next/navigation';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient }          from '@/lib/supabase/server';

export const metadata = { title: 'Trial Control Center · KORA Admin' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

// ── Readiness helpers ─────────────────────────────────────────────────────────

function readinessColor(level: string) {
  if (level === 'READY')       return '#2F7D55';
  if (level === 'PARTIAL')     return '#C07D2A';
  return 'rgba(6,3,43,0.35)';
}
function readinessBg(level: string) {
  if (level === 'READY')       return 'rgba(47,125,85,0.08)';
  if (level === 'PARTIAL')     return 'rgba(192,125,42,0.08)';
  return 'rgba(6,3,43,0.04)';
}
function readinessBadge(level: string) {
  if (level === 'READY')       return 'PRONTO';
  if (level === 'PARTIAL')     return 'PARZIALE';
  return 'NON AVVIATO';
}

function statusDot(ok: boolean) {
  return (
    <span
      style={{
        display:      'inline-block',
        width:        8,
        height:       8,
        borderRadius: '50%',
        background:   ok ? '#2F7D55' : 'rgba(6,3,43,0.20)',
        marginRight:  6,
        flexShrink:   0,
      }}
    />
  );
}

// ── Data fetch (service role — admin-only) ────────────────────────────────────

async function fetchTrialData() {
  const db = getSupabaseServiceClient();

  const [
    tenantRes, batchRes, uefRes, kiRes, dpRes,
    workerRes, profileRes, initRes, partnerRes,
  ] = await Promise.all([
    db.schema('analytics').from('tenant')
      .select('id, tenant_code, company_name, is_active')
      .order('tenant_code'),

    db.schema('analytics').from('source_batch')
      .select('tenant_id, id, status, created_at')
      .order('created_at', { ascending: false }),

    db.schema('analytics').from('uef_record')
      .select('tenant_id, review_status'),

    db.schema('analytics').from('kora_index_result')
      .select('tenant_id, kora_index_value, confidence_score, safeguard_status, created_at')
      .order('created_at', { ascending: false }),

    db.schema('analytics').from('decision_pack_version')
      .select('tenant_id, version_id, status, created_at')
      .order('created_at', { ascending: false }),

    db.schema('personal').from('worker_identity')
      .select('tenant_id, status'),

    db.schema('personal').from('worker_profile_private')
      .select('tenant_id, onboarding_completed_at'),

    db.schema('personal').from('worker_initiative')
      .select('tenant_id, status'),

    db.schema('network').from('partner_profile')
      .select('status'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenants  = (tenantRes.data  ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batches  = (batchRes.data   ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uefs     = (uefRes.data     ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kir      = (kiRes.data      ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dps      = (dpRes.data      ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workers  = (workerRes.data  ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = (profileRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inits    = (initRes.data    ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partners = (partnerRes.data ?? []) as any[];

  return { tenants, batches, uefs, kir, dps, workers, profiles, inits, partners };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function TrialControlCenterPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/login?role_hint=admin');

  const { tenants, batches, uefs, kir, dps, workers, profiles, inits, partners } =
    await fetchTrialData();

  // ── Per-tenant aggregations ──────────────────────────────────────────────────
  type TenantSummary = {
    id: string; code: string; name: string; active: boolean;
    lastBatchAt: string | null;
    uefCandidates: number; uefApproved: number;
    scoringReady: boolean; hasIndex: boolean;
    koraIndex: number | null; cs: number | null; safeguard: string | null;
    hasDecisionPack: boolean; dpStatus: string | null;
    wallboardReady: boolean;
    workerTotal: number; workerActive: number; workerInvited: number;
    onboardingDone: number;
    initTotal: number; initPublished: number;
    readiness: string; warnings: string[];
  };

  const tenantSummaries: TenantSummary[] = tenants.map(t => {
    const tid = t.id as string;
    const lastBatch = batches.find((b: { tenant_id: string }) => b.tenant_id === tid) ?? null;
    const tenantUef = uefs.filter((u: { tenant_id: string }) => u.tenant_id === tid);
    const uefCandidates = tenantUef.length;
    const uefApproved   = tenantUef.filter((u: { review_status: string }) => u.review_status === 'approved').length;
    const lastKi  = kir.find((k: { tenant_id: string }) => k.tenant_id === tid) ?? null;
    const lastDp  = dps.find((d: { tenant_id: string }) => d.tenant_id === tid) ?? null;
    const wallboardReady = lastKi !== null && ['CLEAR','WARNING'].includes(lastKi.safeguard_status ?? '');

    const tw = workers.filter((w: { tenant_id: string }) => w.tenant_id === tid);
    const tp = profiles.filter((p: { tenant_id: string }) => p.tenant_id === tid);
    const ti = inits.filter((i: { tenant_id: string }) => i.tenant_id === tid);

    const workerTotal   = tw.length;
    const workerActive  = tw.filter((w: { status: string }) => w.status === 'active').length;
    const workerInvited = tw.filter((w: { status: string }) => w.status === 'invited').length;
    const onboardingDone = tp.filter((p: { onboarding_completed_at: string|null }) => p.onboarding_completed_at !== null).length;
    const initTotal      = ti.length;
    const initPublished  = ti.filter((i: { status: string }) => i.status === 'published').length;

    const warnings: string[] = [];
    if (!lastBatch)                        warnings.push('Nessun upload');
    if (uefCandidates > 0 && uefApproved === 0) warnings.push(`${uefCandidates} UEF in attesa`);
    if (workerTotal === 0)                 warnings.push('Nessun worker');
    if (workerTotal > 0 && workerActive === 0) warnings.push('Nessun worker attivo');
    if (initPublished === 0)               warnings.push('Nessuna iniziativa pubblicata');
    if (!lastKi)                           warnings.push('Scoring non eseguito');
    if (lastKi && !lastDp)                 warnings.push('Decision Pack mancante');

    let readiness = 'NOT_STARTED';
    if (lastKi && lastDp && workerActive > 0) readiness = 'READY';
    else if (lastBatch || workerTotal > 0 || initTotal > 0) readiness = 'PARTIAL';

    return {
      id: tid, code: t.tenant_code as string, name: t.company_name as string,
      active: t.is_active as boolean, lastBatchAt: lastBatch?.created_at ?? null,
      uefCandidates, uefApproved,
      scoringReady: uefApproved > 0,
      hasIndex: lastKi !== null,
      koraIndex: lastKi?.kora_index_value ?? null,
      cs: lastKi?.confidence_score ?? null,
      safeguard: lastKi?.safeguard_status ?? null,
      hasDecisionPack: lastDp !== null,
      dpStatus: lastDp?.status ?? null,
      wallboardReady,
      workerTotal, workerActive, workerInvited, onboardingDone,
      initTotal, initPublished,
      readiness, warnings,
    };
  });

  // ── Partner summary ──────────────────────────────────────────────────────────
  const partnerPublished = (partners as Array<{ status: string }>).filter(p => p.status === 'published').length;
  const partnerDraft     = (partners as Array<{ status: string }>).filter(p => p.status === 'draft').length;
  const partnerArchived  = (partners as Array<{ status: string }>).filter(p => p.status === 'archived').length;

  // ── Demo checklist items ─────────────────────────────────────────────────────
  const checklistItems = [
    { label: 'Admin — tenant e provisioning',       href: '/admin/companies',            ok: tenants.length > 0 },
    { label: 'Admin — upload dati (Data Intake)',   href: '/admin/data-intake',          ok: tenantSummaries.some(t => t.lastBatchAt !== null) },
    { label: 'Admin — UEF Review approvato',        href: '/admin/uef-review',           ok: tenantSummaries.some(t => t.uefApproved > 0) },
    { label: 'Admin — scoring eseguito',            href: '/admin/uef-review',           ok: tenantSummaries.some(t => t.hasIndex) },
    { label: 'Company — KORA Index visibile',       href: '/company/kora-index',         ok: tenantSummaries.some(t => t.hasIndex) },
    { label: 'Company — Decision Pack',             href: '/company/reports',            ok: tenantSummaries.some(t => t.hasDecisionPack) },
    { label: 'Company — Wallboard',                 href: '/company/wallboard',          ok: tenantSummaries.some(t => t.wallboardReady) },
    { label: 'Worker — almeno un worker attivo',    href: '/admin/workers',              ok: tenantSummaries.some(t => t.workerActive > 0) },
    { label: 'Worker — iniziativa pubblicata',      href: '/admin/worker-initiatives',   ok: tenantSummaries.some(t => t.initPublished > 0) },
    { label: 'Worker — Dynamic CV accessibile',     href: '/admin/preview/worker/dynamic-cv', ok: tenantSummaries.some(t => t.onboardingDone > 0) },
    { label: 'Worker — privacy panel',              href: '/admin/preview/worker/privacy', ok: true },
    { label: 'Partner — catalog pubblicato',        href: '/admin/partners',             ok: partnerPublished > 0 },
    { label: 'Privacy boundary — company vs worker', href: '/admin/worker-diagnostics',  ok: true },
  ];

  const completedCount = checklistItems.filter(c => c.ok).length;

  // ── Quick links ───────────────────────────────────────────────────────────────
  const quickLinks: Array<{ label: string; href: string; group: string }> = [
    { group: 'Pipeline',    label: 'Data Intake',              href: '/admin/data-intake' },
    { group: 'Pipeline',    label: 'UEF Review & Scoring',     href: '/admin/uef-review' },
    { group: 'Pipeline',    label: 'Decision Pack (Company)',   href: '/company/reports' },
    { group: 'Company',     label: 'Company Workspace',         href: '/company' },
    { group: 'Company',     label: 'KORA Wallboard',            href: '/company/wallboard' },
    { group: 'Worker',      label: 'Workers (Admin)',           href: '/admin/workers' },
    { group: 'Worker',      label: 'Iniziative Worker',        href: '/admin/worker-initiatives' },
    { group: 'Worker',      label: 'Preview CV (Admin)',        href: '/admin/preview/worker/dynamic-cv' },
    { group: 'Worker',      label: 'Preview Privacy (Admin)',   href: '/admin/preview/worker/privacy' },
    { group: 'Partner',     label: 'Partner Catalog',           href: '/admin/partners' },
    { group: 'Diagnostics', label: 'Live Spine Diagnostics',   href: '/admin/live-spine-diagnostics' },
    { group: 'Diagnostics', label: 'Worker Diagnostics',       href: '/admin/worker-diagnostics' },
    { group: 'Diagnostics', label: 'Provisioning Diagnostics', href: '/admin/provisioning-diagnostics' },
  ];

  const linkGroups = ['Pipeline', 'Company', 'Worker', 'Partner', 'Diagnostics'] as const;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      data-testid="trial-control-center"
      style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <a href="/admin" style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 10 }}>
          &#8592; Admin Dashboard
        </a>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
              Trial Control Center
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: 0, lineHeight: 1.6 }}>
              Stato orchestrazione trial end-to-end &mdash; lettura in tempo reale.
            </p>
          </div>
          <span
            style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
              color: '#C76F3D', background: 'rgba(199,111,61,0.10)',
              border: '1px solid rgba(199,111,61,0.30)', borderRadius: 999, padding: '4px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            KORA Admin &middot; Read Only
          </span>
        </div>
      </div>

      {/* ── SECTION 1: Tenant list ─────────────────────────────────────────────── */}
      <SectionHeading label="1. Tenant trial" />

      {tenantSummaries.length === 0 ? (
        <EmptyCard
          title="Nessun tenant attivo"
          body="Crea un tenant via /admin/companies prima di avviare il trial."
          cta="Crea tenant" href="/admin/companies/new"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {tenantSummaries.map(t => (
            <div
              key={t.id}
              data-testid={`trial-tenant-${t.code}`}
              style={{
                border: '1px solid rgba(6,3,43,0.09)', borderRadius: 12, padding: '14px 18px',
                background: readinessBg(t.readiness),
                display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: '0 0 2px' }}>
                  {t.name}
                </p>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.40)', margin: 0 }}>
                  {t.code}
                </p>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: readinessColor(t.readiness), background: readinessBg(t.readiness),
                border: `1px solid ${readinessColor(t.readiness)}40`,
                borderRadius: 999, padding: '3px 8px', whiteSpace: 'nowrap',
              }}>
                {readinessBadge(t.readiness)}
              </span>
              {t.warnings.length > 0 && (
                <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {t.warnings.map((w, i) => (
                    <span key={i} style={{
                      fontSize: 9, fontWeight: 600, color: '#C07D2A',
                      background: 'rgba(192,125,42,0.08)', border: '1px solid rgba(192,125,42,0.22)',
                      borderRadius: 5, padding: '2px 7px',
                    }}>
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 2: Data pipeline status ────────────────────────────────────── */}
      <SectionHeading label="2. Data pipeline status" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 24 }}>
        {tenantSummaries.map(t => (
          <div
            key={t.id}
            data-testid={`pipeline-status-${t.code}`}
            style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 12, padding: '14px 16px', background: '#fff' }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.35)', margin: '0 0 10px' }}>
              {t.code}
            </p>
            <PipelineRow label="Ultimo upload"      value={t.lastBatchAt ? new Date(t.lastBatchAt).toLocaleDateString('it-IT') : '—'} ok={t.lastBatchAt !== null} />
            <PipelineRow label="UEF candidati"      value={String(t.uefCandidates)} ok={t.uefCandidates > 0} />
            <PipelineRow label="UEF approvati"      value={String(t.uefApproved)}   ok={t.uefApproved > 0} />
            <PipelineRow label="Scoring readiness"  value={t.scoringReady ? 'PRONTO' : 'DA COMPLETARE'} ok={t.scoringReady} />
            <PipelineRow label="KORA Index"         value={t.koraIndex !== null ? t.koraIndex.toFixed(3) : '—'} ok={t.hasIndex} />
            <PipelineRow label="Confidence Score"   value={t.cs !== null ? t.cs.toFixed(2) : '—'} ok={t.hasIndex} />
            <PipelineRow label="Activation Safeguard" value={t.safeguard ?? '—'}    ok={t.safeguard !== null} />
            <PipelineRow label="Decision Pack"      value={t.hasDecisionPack ? (t.dpStatus ?? 'sì') : '—'} ok={t.hasDecisionPack} />
            <PipelineRow label="Wallboard"          value={t.wallboardReady ? 'Disponibile' : '—'} ok={t.wallboardReady} />
          </div>
        ))}
        {tenantSummaries.length === 0 && (
          <div style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 12, padding: '14px 16px', background: '#fff', color: 'rgba(6,3,43,0.35)', fontSize: 12 }}>
            Nessun tenant da mostrare.
          </div>
        )}
      </div>

      {/* ── SECTION 3: Worker trial status ──────────────────────────────────────── */}
      <SectionHeading label="3. Worker trial status" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 24 }}>
        {tenantSummaries.map(t => (
          <div
            key={t.id}
            data-testid={`worker-status-${t.code}`}
            style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 12, padding: '14px 16px', background: '#fff' }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.35)', margin: '0 0 10px' }}>
              {t.code}
            </p>
            <PipelineRow label="Worker totali"         value={String(t.workerTotal)}   ok={t.workerTotal > 0} />
            <PipelineRow label="Worker attivi"         value={String(t.workerActive)}  ok={t.workerActive > 0} />
            <PipelineRow label="Worker invited"        value={String(t.workerInvited)} ok={false} />
            <PipelineRow label="Onboarding completati" value={String(t.onboardingDone)} ok={t.onboardingDone > 0} />
            <PipelineRow label="Iniziative pubblicate" value={String(t.initPublished)} ok={t.initPublished > 0} />
            <PipelineRow label="Dynamic CV readiness"  value={t.onboardingDone > 0 ? 'Pronto' : 'In attesa'} ok={t.onboardingDone > 0} />
          </div>
        ))}
        {tenantSummaries.length === 0 && (
          <div style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 12, padding: '14px 16px', background: '#fff', color: 'rgba(6,3,43,0.35)', fontSize: 12 }}>
            Nessun worker da mostrare.
          </div>
        )}
      </div>

      {/* ── SECTION 4: Partner catalog status ───────────────────────────────────── */}
      <SectionHeading label="4. Partner catalog status" />

      <div
        data-testid="partner-catalog-status"
        style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 12, padding: '16px 20px', background: '#fff', marginBottom: 24 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Totali',     value: partners.length },
            { label: 'Pubblicati', value: partnerPublished },
            { label: 'Bozza',      value: partnerDraft },
            { label: 'Archiviati', value: partnerArchived },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#06032B', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{value}</p>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.40)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
        {partnerPublished === 0 && (
          <p style={{ fontSize: 11, color: '#C07D2A', margin: '12px 0 0', fontWeight: 600 }}>
            &#9888; Nessun partner pubblicato &mdash; il catalogo opportunit&agrave; appare vuoto ai worker.
            <a href="/admin/partners" style={{ marginLeft: 8, color: '#3B6EBA', textDecoration: 'none' }}>Gestisci partner &#8594;</a>
          </p>
        )}
      </div>

      {/* ── SECTION 5: Demo path checklist ──────────────────────────────────────── */}
      <SectionHeading label="5. Demo path checklist" />

      <div
        data-testid="demo-checklist"
        style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}
      >
        <div style={{ padding: '12px 18px', background: '#FAFAFA', borderBottom: '1px solid rgba(6,3,43,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#06032B', margin: 0 }}>
            {completedCount} / {checklistItems.length} completati
          </p>
          <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.40)', fontWeight: 600 }}>KORA End-to-End Demo</span>
        </div>
        {checklistItems.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 18px',
              borderBottom: i < checklistItems.length - 1 ? '1px solid rgba(6,3,43,0.05)' : 'none',
              background: item.ok ? 'rgba(47,125,85,0.03)' : '#fff',
            }}
          >
            <span style={{ fontSize: 13, flexShrink: 0 }}>{item.ok ? '✓' : '○'}</span>
            <p style={{ fontSize: 12, color: item.ok ? '#1a4731' : 'rgba(6,3,43,0.60)', margin: 0, flex: 1 }}>
              {item.label}
            </p>
            <a href={item.href} style={{ fontSize: 10, color: '#3B6EBA', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Vai &#8594;
            </a>
          </div>
        ))}
      </div>

      {/* ── SECTION 6: Quick links ───────────────────────────────────────────────── */}
      <SectionHeading label="6. Quick links" />

      <div
        data-testid="quick-links"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 32 }}
      >
        {linkGroups.map(group => {
          const groupLinks = quickLinks.filter(l => l.group === group);
          return (
            <div key={group} style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#FAFAFA', borderBottom: '1px solid rgba(6,3,43,0.06)' }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.40)', margin: 0 }}>
                  {group}
                </p>
              </div>
              <div style={{ padding: '6px 0' }}>
                {groupLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#06032B', textDecoration: 'none', padding: '6px 14px', lineHeight: 1.4 }}
                    onMouseOver={/* @ts-ignore */ undefined}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 14 }}>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.28)', margin: 0, lineHeight: 1.5 }}>
          KORA Foundation Light &middot; Trial Control Center &middot; B123 &middot;
          Dati letti in tempo reale. Nessun dato individuale worker esposto.
          <a href="/docs/LIVE_TRIAL_DEMO_PACK.md" style={{ marginLeft: 8, color: '#3B6EBA', textDecoration: 'none' }}>Demo Pack &#8594;</a>
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeading({ label }: { label: string }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
      color: 'rgba(6,3,43,0.35)', margin: '0 0 10px', paddingTop: 4,
    }}>
      {label}
    </p>
  );
}

function PipelineRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', display: 'flex', alignItems: 'center' }}>
        {statusDot(ok)}{label}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: ok ? '#06032B' : 'rgba(6,3,43,0.30)' }}>
        {value}
      </span>
    </div>
  );
}

function EmptyCard({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <div style={{
      border: '1px dashed rgba(6,3,43,0.15)', borderRadius: 12, padding: '20px 24px',
      marginBottom: 24, textAlign: 'center',
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.45)', margin: '0 0 14px' }}>{body}</p>
      <a href={href} style={{
        display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#3B6EBA',
        border: '1px solid rgba(59,110,186,0.28)', borderRadius: 8, padding: '7px 14px',
        textDecoration: 'none', background: 'rgba(59,110,186,0.06)',
      }}>
        {cta} &#8594;
      </a>
    </div>
  );
}
