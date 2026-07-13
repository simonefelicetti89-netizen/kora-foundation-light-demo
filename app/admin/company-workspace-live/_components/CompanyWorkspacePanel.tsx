'use client';

// app/admin/company-workspace-live/_components/CompanyWorkspacePanel.tsx
// ADMIN-COMPANY-NAV-COMPLETION-01 — read-only client panel.
// Fetches GET /api/admin/company-workspace?tenantCode=... (existing route,
// unchanged). No POST/PATCH/DELETE call anywhere in this file. No mutation,
// no form. The "recommended next action" is rendered as a plain navigation
// link to another admin page — this page itself performs no write.

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WorkspaceResponse {
  ok: boolean;
  tenant: { id: string; tenantCode: string; companyName: string };
  reportingPeriod: string;
  workforce: { exists: boolean; totalWorkers: number | null };
  latestBatch: {
    id: string;
    sourceName: string | null;
    status: string;
    rowCount: number;
    createdAt: string;
  } | null;
  uef: {
    total: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    needsInfo: number;
    needsEnrichment: number;
  } | null;
  scoring: {
    hasResult: boolean;
    koraIndex: number;
    confidenceScore: number;
    safeguard: string;
    activationRate: number | null;
    meaningfulActivationRate: number | null;
  } | null;
  decisionPack: {
    versionId: string;
    status: string;
    createdAt: string;
    previewUrl: string;
    pdfUrl: string;
  } | null;
  pilotStatus: string;
  recommendedNextAction: { label: string; href: string };
}

const PILOT_STATUS_LABEL: Record<string, string> = {
  not_started: 'Non iniziato',
  batch_pending: 'Batch in attesa',
  review_ready: 'Pronto per la review',
  needs_enrichment: 'Richiede arricchimento budget',
  ready_for_scoring: 'Pronto per lo scoring',
  scored: 'Scoring completato',
  decision_pack_draft: 'Decision Pack in bozza',
  decision_pack_exported: 'Decision Pack esportato',
  archived: 'Archiviato',
};

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-1">{label}</p>
      {children}
    </div>
  );
}

export function CompanyWorkspacePanel({
  tenantCode,
  companyName,
}: {
  tenantCode: string;
  companyName: string;
}) {
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/company-workspace?tenantCode=${encodeURIComponent(tenantCode)}`, { credentials: 'include' })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !body.ok) {
          setError((body?.error as string) ?? 'Impossibile caricare lo stato pilot.');
          return;
        }
        setData(body as WorkspaceResponse);
      })
      .catch(() => setError('Errore di rete durante il caricamento.'))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-8 text-xs text-[rgba(6,3,43,0.40)] text-center">
        Caricamento stato pilot…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 text-xs text-[#9E3B2F]">
        ⚠ {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">Tenant</p>
        <p className="text-sm font-bold text-[#06032B]">{companyName}</p>
        <p className="text-xs font-mono text-[rgba(6,3,43,0.40)]">{tenantCode} · periodo {data.reportingPeriod}</p>
      </div>

      <div className="rounded-lg border border-[rgba(199,111,61,0.25)] bg-[rgba(199,111,61,0.06)] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">Stato pilot</p>
          <p className="text-sm font-bold text-[#06032B]">{PILOT_STATUS_LABEL[data.pilotStatus] ?? data.pilotStatus}</p>
        </div>
        <Link
          href={data.recommendedNextAction.href}
          className="rounded-lg bg-[#C76F3D] text-white px-4 py-2 text-xs font-semibold hover:bg-[#4f44e0] transition-colors whitespace-nowrap"
        >
          {data.recommendedNextAction.label} →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card label="Forza lavoro">
          {data.workforce.exists ? (
            <p className="text-sm text-[#06032B]">{data.workforce.totalWorkers ?? '—'} lavoratori (baseline)</p>
          ) : (
            <p className="text-xs text-[rgba(6,3,43,0.40)]">Nessuna baseline caricata.</p>
          )}
        </Card>

        <Card label="Ultimo batch">
          {data.latestBatch ? (
            <>
              <p className="text-sm text-[#06032B]">{data.latestBatch.sourceName ?? 'senza nome'}</p>
              <p className="text-xs text-[rgba(6,3,43,0.50)]">
                {data.latestBatch.status} · {data.latestBatch.rowCount} righe
              </p>
            </>
          ) : (
            <p className="text-xs text-[rgba(6,3,43,0.40)]">Nessun batch caricato.</p>
          )}
        </Card>

        <Card label="UEF">
          {data.uef ? (
            <p className="text-xs text-[rgba(6,3,43,0.65)]">
              {data.uef.total} totali · {data.uef.pendingReview} in review · {data.uef.approved} approvati
            </p>
          ) : (
            <p className="text-xs text-[rgba(6,3,43,0.40)]">Nessun dato UEF.</p>
          )}
        </Card>

        <Card label="KORA Index">
          {data.scoring?.hasResult ? (
            <>
              <p className="text-sm text-[#06032B]">{data.scoring.koraIndex.toFixed(1)}</p>
              <p className="text-xs text-[rgba(6,3,43,0.50)]">
                Confidence {data.scoring.confidenceScore.toFixed(1)} · Safeguard {data.scoring.safeguard}
              </p>
            </>
          ) : (
            <p className="text-xs text-[rgba(6,3,43,0.40)]">Nessuno scoring calcolato.</p>
          )}
        </Card>

        <Card label="Decision Pack">
          {data.decisionPack ? (
            <p className="text-xs text-[rgba(6,3,43,0.65)]">
              {data.decisionPack.status} · v{data.decisionPack.versionId}
            </p>
          ) : (
            <p className="text-xs text-[rgba(6,3,43,0.40)]">Nessun Decision Pack generato.</p>
          )}
        </Card>
      </div>

      <p className="text-[10.5px] text-[rgba(6,3,43,0.35)]">
        Vista di sola lettura. Nessuna azione di scrittura è disponibile in questa pagina — il link &quot;prossima
        azione&quot; naviga verso gli strumenti admin esistenti.
      </p>
    </div>
  );
}
