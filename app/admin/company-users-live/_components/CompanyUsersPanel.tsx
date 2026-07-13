'use client';

// app/admin/company-users-live/_components/CompanyUsersPanel.tsx
// ADMIN-COMPANY-NAV-COMPLETION-01 — read-only client panel.
// Fetches GET /api/admin/company-users?tenantId=... (existing route, unchanged).
// No POST/PATCH/DELETE call anywhere in this file. No mutation, no form,
// no onClick that writes data. No secrets, no service-role details rendered.

import { useEffect, useState } from 'react';

interface CompanyUserRow {
  userId: string;
  email: string;
  koraRole: string;
  tenantId: string;
  userStatus: string;
  lastSignIn: string | null;
  createdAt: string;
  invitedAt: string | null;
  emailConfirmed: boolean;
}

interface CompanyUsersResponse {
  ok: boolean;
  tenantId: string;
  companyName: string;
  users: CompanyUserRow[];
  total: number;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  disabled: 'Disabilitato',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('it-IT', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

export function CompanyUsersPanel({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<CompanyUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/company-users?tenantId=${encodeURIComponent(tenantId)}`, { credentials: 'include' })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !body.ok) {
          setError((body?.error as string) ?? 'Impossibile caricare gli utenti azienda.');
          return;
        }
        setData(body as CompanyUsersResponse);
      })
      .catch(() => setError('Errore di rete durante il caricamento.'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-8 text-xs text-[rgba(6,3,43,0.40)] text-center">
        Caricamento utenti azienda…
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
        <p className="text-sm font-bold text-[#06032B]">{data.companyName}</p>
        <p className="text-xs font-mono text-[rgba(6,3,43,0.40)]">{data.tenantId}</p>
      </div>

      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white overflow-hidden">
        <div className="px-4 py-2 border-b border-[rgba(6,3,43,0.06)] text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Utenti ({data.total})
        </div>

        {data.total === 0 ? (
          <div className="px-4 py-8 text-xs text-[rgba(6,3,43,0.40)] text-center">
            Nessun utente ancora associato a questo tenant.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Ruolo</th>
                <th className="px-4 py-2 font-semibold">Stato</th>
                <th className="px-4 py-2 font-semibold">Ultimo accesso</th>
                <th className="px-4 py-2 font-semibold">Creato</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.userId} className="border-t border-[rgba(6,3,43,0.05)]">
                  <td className="px-4 py-2 text-[#06032B]">{u.email}</td>
                  <td className="px-4 py-2 text-[rgba(6,3,43,0.65)]">{u.koraRole}</td>
                  <td className="px-4 py-2 text-[rgba(6,3,43,0.65)]">{STATUS_LABEL[u.userStatus] ?? u.userStatus}</td>
                  <td className="px-4 py-2 text-[rgba(6,3,43,0.50)]">{formatDate(u.lastSignIn)}</td>
                  <td className="px-4 py-2 text-[rgba(6,3,43,0.50)]">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[10.5px] text-[rgba(6,3,43,0.35)]">
        Vista di sola lettura. Nessuna azione di scrittura è disponibile in questa pagina.
      </p>
    </div>
  );
}
