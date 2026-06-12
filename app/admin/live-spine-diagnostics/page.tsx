// app/admin/live-spine-diagnostics/page.tsx
// KORA_ADMIN only — live operational spine diagnostics.
// Shows per-tenant: batch state, UEF counts, scoring readiness, last result, next action.

export const runtime = 'nodejs';
export const dynamic  = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import type { TenantSpineState, ScoringReadiness } from '@/app/api/admin/live-spine-diagnostics/route';

// ── Data fetch ────────────────────────────────────────────────────────────────

async function fetchSpineData(): Promise<{ tenants: TenantSpineState[]; meta: { total: number; readyCount: number; asOf: string } } | null> {
  const db = getSupabaseServiceClient();

  // B131: LIVE tenants only — mirrors the API route filter.
  const { data: tenants, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, is_active')
    .eq('tenant_kind', 'LIVE')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (tenantErr || !tenants) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantRows = tenants as any[];
  if (tenantRows.length === 0) return { tenants: [], meta: { total: 0, readyCount: 0, asOf: new Date().toISOString() } };

  const tenantIds = tenantRows.map((t) => t.id as string);

  const { data: batches } = await db
    .schema('analytics').from('source_batch')
    .select('id, tenant_id, reporting_period, batch_status, created_at')
    .in('tenant_id', tenantIds)
    .order('created_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batchRows = (batches ?? []) as any[];
  const lastBatchByTenant = new Map<string, typeof batchRows[0]>();
  for (const b of batchRows) {
    if (!lastBatchByTenant.has(b.tenant_id)) lastBatchByTenant.set(b.tenant_id, b);
  }

  const batchIds = batchRows.map((b) => b.id as string);

  const [uploadedResult, uefResult, scoringResult, dpResult] = await Promise.all([
    batchIds.length > 0
      ? db.schema('personal').from('uploaded_record').select('batch_id').in('batch_id', batchIds)
      : Promise.resolve({ data: [], error: null }),
    batchIds.length > 0
      ? db.schema('analytics').from('uef_record').select('batch_id, review_status, approved_for_scoring').in('batch_id', batchIds)
      : Promise.resolve({ data: [], error: null }),
    db.schema('analytics').from('kora_index_result')
      .select('tenant_id, kora_index, confidence_score, safeguard_status, created_at')
      .in('tenant_id', tenantIds).order('created_at', { ascending: false }),
    db.schema('analytics').from('decision_pack_version')
      .select('tenant_id, version_id, status, created_at')
      .in('tenant_id', tenantIds).order('created_at', { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadedRows = (uploadedResult.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uefRows      = (uefResult.data   ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoringRows  = (scoringResult.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dpRows       = (dpResult.data    ?? []) as any[];

  const uploadedCountByBatch = new Map<string, number>();
  for (const r of uploadedRows) uploadedCountByBatch.set(r.batch_id, (uploadedCountByBatch.get(r.batch_id) ?? 0) + 1);

  const uefByBatch = new Map<string, { candidate: number; approved: number; pending: number; rejected: number }>();
  for (const r of uefRows) {
    const cur = uefByBatch.get(r.batch_id) ?? { candidate: 0, approved: 0, pending: 0, rejected: 0 };
    cur.candidate++;
    if (r.review_status === 'approved' && r.approved_for_scoring === true) cur.approved++;
    if (r.review_status === 'pending_review') cur.pending++;
    if (r.review_status === 'rejected') cur.rejected++;
    uefByBatch.set(r.batch_id, cur);
  }

  const lastScoringByTenant = new Map<string, typeof scoringRows[0]>();
  for (const r of scoringRows) { if (!lastScoringByTenant.has(r.tenant_id)) lastScoringByTenant.set(r.tenant_id, r); }

  const lastDpByTenant = new Map<string, typeof dpRows[0]>();
  for (const r of dpRows) { if (!lastDpByTenant.has(r.tenant_id)) lastDpByTenant.set(r.tenant_id, r); }

  const result: TenantSpineState[] = [];

  for (const t of tenantRows) {
    const tenantId  = t.id as string;
    const tenantCode = t.tenant_code as string;
    const lastBatch = lastBatchByTenant.get(tenantId) ?? null;
    const lastBatchId = lastBatch?.id ?? null;
    const uefCounts = lastBatchId ? (uefByBatch.get(lastBatchId) ?? { candidate: 0, approved: 0, pending: 0, rejected: 0 }) : { candidate: 0, approved: 0, pending: 0, rejected: 0 };
    const uploadedCount = lastBatchId ? (uploadedCountByBatch.get(lastBatchId) ?? 0) : 0;
    const lastScoring = lastScoringByTenant.get(tenantId) ?? null;
    const lastDp = lastDpByTenant.get(tenantId) ?? null;

    let scoringReadiness: ScoringReadiness;
    const warnings: string[] = [];

    if (!lastBatch) {
      scoringReadiness = 'NO_BATCH';
      warnings.push('Nessun source_batch trovato. Carica dati via Data Intake.');
    } else if (uploadedCount === 0) {
      scoringReadiness = 'NO_DATA';
      warnings.push('Nessun uploaded_record nel batch corrente. Carica un file.');
    } else if (uefCounts.candidate === 0) {
      scoringReadiness = 'NO_DATA';
      warnings.push('Nessun UEF candidate generato. Vai a UEF Review → Genera candidati.');
    } else if (uefCounts.approved === 0) {
      scoringReadiness = 'NEEDS_REVIEW';
      warnings.push(`${uefCounts.pending} record UEF in attesa di review. Approva almeno un record per abilitare lo scoring.`);
    } else {
      scoringReadiness = 'READY';
    }

    if (tenantCode === 'OP-001') warnings.push('OP-001 è tenant sintetico demo — non usare nel path live.');
    if (lastBatch?.batch_status === 'pending') warnings.push('Batch in stato pending. Controlla se l\'ingestion è completa.');

    let nextAction: string;
    if (scoringReadiness === 'NO_BATCH') nextAction = 'Carica dati via /admin/data-intake';
    else if (uploadedCount === 0) nextAction = 'Invia file via Data Intake (upload + accept)';
    else if (uefCounts.candidate === 0) nextAction = 'Vai a /admin/uef-review → Genera UEF candidates';
    else if (uefCounts.approved === 0) nextAction = `Approva i ${uefCounts.pending} record UEF in /admin/uef-review`;
    else if (!lastScoring) nextAction = 'Pronto per scoring → /admin/uef-review → Run scoring';
    else if (!lastDp) nextAction = 'Scoring completato. Decision Pack mancante — rilanciare scoring.';
    else nextAction = `Decision Pack presente (${lastDp.version_id ?? '—'}) — tutto pronto.`;

    result.push({
      tenantId, tenantCode, companyName: t.company_name as string, isActive: t.is_active as boolean,
      lastBatchId, lastBatchStatus: lastBatch?.batch_status ?? null, lastBatchPeriod: lastBatch?.reporting_period ?? null, lastBatchAt: lastBatch?.created_at ?? null,
      uploadedRecordCount: uploadedCount, uefCandidateCount: uefCounts.candidate, uefApprovedCount: uefCounts.approved, uefPendingCount: uefCounts.pending, uefRejectedCount: uefCounts.rejected,
      scoringReadiness, lastScoringAt: lastScoring?.created_at ?? null, lastKoraIndex: lastScoring?.kora_index ?? null, lastConfidenceScore: lastScoring?.confidence_score ?? null, lastSafeguard: lastScoring?.safeguard_status ?? null,
      lastDecisionPackId: lastDp?.version_id ?? null, lastDecisionPackAt: lastDp?.created_at ?? null, lastDecisionPackStatus: lastDp?.status ?? null,
      warnings, nextAction,
    });
  }

  return {
    tenants: result,
    meta: { total: result.length, readyCount: result.filter((r) => r.scoringReadiness === 'READY').length, asOf: new Date().toISOString() },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function ReadinessBadge({ status }: { status: ScoringReadiness }) {
  const cfg: Record<ScoringReadiness, { label: string; cls: string }> = {
    READY:        { label: '✓ READY',        cls: 'bg-green-50 border-green-200 text-green-700' },
    NEEDS_REVIEW: { label: '⏳ NEEDS REVIEW', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
    NO_DATA:      { label: '— NO DATA',       cls: 'bg-gray-50 border-gray-200 text-gray-500' },
    NO_BATCH:     { label: '✗ NO BATCH',      cls: 'bg-red-50 border-red-200 text-red-700' },
    UNKNOWN:      { label: '? UNKNOWN',       cls: 'bg-gray-50 border-gray-200 text-gray-400' },
  };
  const { label, cls } = cfg[status];
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function SafeguardBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[rgba(6,3,43,0.35)]">—</span>;
  const cls =
    status === 'CLEAR'   ? 'text-green-700' :
    status === 'WARNING' ? 'text-amber-700' :
    status === 'FLAGGED' ? 'text-red-700'   : 'text-gray-500';
  return <span className={`font-semibold ${cls}`}>{status}</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LiveSpineDiagnosticsPage() {
  // Auth — must be KORA_ADMIN
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.app_metadata as Record<string, unknown> | undefined;
    if (meta?.kora_role !== 'KORA_ADMIN') redirect('/admin/login');
  } catch {
    redirect('/admin/login');
  }

  const data = await fetchSpineData();

  return (
    <div className="min-h-screen bg-[#F8F6F1] px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#06032B]">Live Spine Diagnostics</h1>
          <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">
            Stato operativo live per tenant reali — KORA_ADMIN only
          </p>
        </div>
        <div className="text-[10px] text-[rgba(6,3,43,0.40)] text-right">
          <div>Aggiornato: {data ? fmt(data.meta.asOf) : '—'}</div>
          <div>{data?.meta.total ?? 0} tenant · {data?.meta.readyCount ?? 0} READY per scoring</div>
        </div>
      </div>

      {/* Golden Path hint */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.10)] bg-white px-4 py-3 flex items-start gap-3">
        <span className="text-base shrink-0 mt-0.5">▶</span>
        <div className="space-y-0.5 min-w-0">
          <p className="text-[11px] font-semibold text-[#06032B]">Primo utilizzo? Segui il Golden Path Runbook.</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)]">
            Guida operativa passo-passo: creazione tenant → upload → UEF Review → scoring → Decision Pack.
            File sample disponibile in <span className="font-mono">data/golden-path/kora_golden_path_upload.csv</span>.
          </p>
          <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Runbook: <span className="font-mono">docs/GOLDEN_PATH_RUNBOOK.md</span></p>
        </div>
      </div>

      {/* Error */}
      {!data && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Impossibile recuperare i dati dalla spine. Controlla la connessione a Supabase.
        </div>
      )}

      {/* No tenants */}
      {data && data.tenants.length === 0 && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.10)] bg-white px-5 py-8 text-center text-sm text-[rgba(6,3,43,0.40)]">
          Nessun tenant trovato. Esegui il provisioning di almeno una company.
        </div>
      )}

      {/* Tenant cards */}
      {data && data.tenants.map((t) => (
        <div key={t.tenantId} className="rounded-xl border border-[rgba(6,3,43,0.10)] bg-white overflow-hidden">

          {/* Card header */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-3 border-b border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)]">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] font-bold text-[#06032B] bg-[rgba(6,3,43,0.06)] rounded px-1.5 py-0.5">
                {t.tenantCode}
              </span>
              <span className="text-sm font-semibold text-[#06032B]">{t.companyName}</span>
              {t.tenantCode === 'OP-001' && (
                <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  DEMO SINTETICO
                </span>
              )}
              {!t.isActive && (
                <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                  inattivo
                </span>
              )}
            </div>
            <ReadinessBadge status={t.scoringReadiness} />
          </div>

          <div className="px-5 py-4 space-y-4">

            {/* Spine data grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <div className="space-y-0.5">
                <p className="text-[10px] text-[rgba(6,3,43,0.40)] uppercase tracking-wide">Ultimo batch</p>
                <p className="text-[11px] font-mono text-[rgba(6,3,43,0.70)] truncate">{t.lastBatchId ? t.lastBatchId.slice(0, 8) + '…' : '—'}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.52)]">{t.lastBatchStatus ?? '—'} · {t.lastBatchPeriod ?? '—'}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.35)]">{fmt(t.lastBatchAt)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] text-[rgba(6,3,43,0.40)] uppercase tracking-wide">Dati caricati</p>
                <p className="text-base font-bold text-[#06032B] tabular-nums">{t.uploadedRecordCount}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.52)]">uploaded_record</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] text-[rgba(6,3,43,0.40)] uppercase tracking-wide">UEF candidati</p>
                <p className="text-base font-bold text-[#06032B] tabular-nums">{t.uefCandidateCount}</p>
                <div className="flex flex-wrap gap-1 text-[9px]">
                  <span className="text-green-700">{t.uefApprovedCount} approvati</span>
                  {t.uefPendingCount > 0 && <span className="text-amber-700">· {t.uefPendingCount} pending</span>}
                  {t.uefRejectedCount > 0 && <span className="text-[rgba(6,3,43,0.40)]">· {t.uefRejectedCount} rifiutati</span>}
                </div>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] text-[rgba(6,3,43,0.40)] uppercase tracking-wide">Ultimo scoring</p>
                {t.lastKoraIndex != null ? (
                  <>
                    <p className="text-base font-bold text-[#06032B] tabular-nums">{t.lastKoraIndex.toFixed(1)}</p>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="text-[rgba(6,3,43,0.52)]">CS {t.lastConfidenceScore != null ? `${t.lastConfidenceScore}%` : '—'}</span>
                      <SafeguardBadge status={t.lastSafeguard} />
                    </div>
                    <p className="text-[10px] text-[rgba(6,3,43,0.35)]">{fmt(t.lastScoringAt)}</p>
                  </>
                ) : (
                  <p className="text-[11px] text-[rgba(6,3,43,0.35)]">Nessun scoring ancora</p>
                )}
              </div>
            </div>

            {/* Decision Pack */}
            {t.lastDecisionPackId && (
              <div className="flex items-center gap-3 rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.02)] px-3 py-2 text-[11px]">
                <span className="text-[rgba(6,3,43,0.40)]">Decision Pack</span>
                <span className="font-mono text-[rgba(6,3,43,0.70)]">{t.lastDecisionPackId}</span>
                <span className="text-[rgba(6,3,43,0.52)]">{t.lastDecisionPackStatus ?? '—'}</span>
                <span className="text-[rgba(6,3,43,0.35)]">{fmt(t.lastDecisionPackAt)}</span>
                <div className="ml-auto flex gap-2">
                  <a
                    href={`/api/admin/decision-pack/preview?tenantCode=${t.tenantCode}`}
                    target="_blank" rel="noopener noreferrer"
                    className="rounded border border-[#C76F3D] text-[#C76F3D] px-2 py-0.5 text-[10px] font-medium hover:bg-[rgba(199,111,61,0.06)] transition-colors">
                    ↗ HTML
                  </a>
                  <a
                    href={`/api/admin/decision-pack/pdf?tenantCode=${t.tenantCode}`}
                    download
                    className="rounded bg-[#06032B] text-white px-2 py-0.5 text-[10px] font-medium hover:bg-[#1a1756] transition-colors">
                    ↓ PDF
                  </a>
                </div>
              </div>
            )}

            {/* Warnings */}
            {t.warnings.length > 0 && (
              <div className="space-y-1">
                {t.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] text-amber-800">
                    <span className="shrink-0 font-bold">!</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Next action */}
            <div className="flex items-center gap-2 rounded border border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.02)] px-3 py-2">
              <span className="text-[10px] text-[rgba(6,3,43,0.40)] shrink-0">Prossima azione</span>
              <span className="text-[11px] font-medium text-[#06032B]">{t.nextAction}</span>
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap gap-2 border-t border-[rgba(6,3,43,0.06)] pt-3">
              <a href={`/admin/data-intake?tenantCode=${t.tenantCode}`}
                className="rounded border border-[rgba(6,3,43,0.14)] px-3 py-1 text-[10px] text-[rgba(6,3,43,0.60)] hover:border-[rgba(6,3,43,0.30)] transition-colors">
                Data Intake
              </a>
              {t.lastBatchId && (
                <a href={`/admin/uef-review?batchId=${t.lastBatchId}`}
                  className="rounded border border-[rgba(6,3,43,0.14)] px-3 py-1 text-[10px] text-[rgba(6,3,43,0.60)] hover:border-[rgba(6,3,43,0.30)] transition-colors">
                  UEF Review
                </a>
              )}
              {t.lastDecisionPackId && (
                <>
                  <a href={`/api/admin/decision-pack/preview?tenantCode=${t.tenantCode}`}
                    target="_blank" rel="noopener noreferrer"
                    className="rounded border border-[rgba(6,3,43,0.14)] px-3 py-1 text-[10px] text-[rgba(6,3,43,0.60)] hover:border-[rgba(6,3,43,0.30)] transition-colors">
                    Preview Decision Pack
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Footer note */}
      <p className="text-center text-[10px] text-[rgba(6,3,43,0.30)]">
        Questa pagina è riservata a KORA_ADMIN. I dati sono in tempo reale da Supabase.
        OP-001 è il tenant sintetico demo — non usarlo nel path live.
      </p>
    </div>
  );
}
