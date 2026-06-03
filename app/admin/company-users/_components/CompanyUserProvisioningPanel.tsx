'use client';

// app/admin/company-users/_components/CompanyUserProvisioningPanel.tsx
// B36 PART 3 — KORA Admin UI for company user provisioning.
// Reads tenants from /api/admin/tenants, assigns users via /api/admin/company-users.

import { useEffect, useState, useCallback } from 'react';

interface TenantOption {
  id: string;
  tenantCode: string;
  companyName: string;
}

interface CompanyUser {
  userId: string;
  email: string;
  koraRole: string;
  tenantId: string;
  userStatus: string;
  lastSignIn: string | null;
  createdAt: string;
  emailConfirmed: boolean;
}

const ROLE_OPTIONS = [
  { value: 'COMPANY_ADMIN',  label: 'Company Admin — gestione workspace, lettura completa' },
  { value: 'COMPANY_VIEWER', label: 'Company Viewer — lettura soltanto, nessun controllo' },
];

const STATUS_BADGE: Record<string, string> = {
  active:    'border-green-200 bg-green-50 text-green-700',
  suspended: 'border-amber-200 bg-amber-50 text-amber-700',
  disabled:  'border-red-200 bg-red-50 text-red-600',
};

function ts(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

interface Props { userEmail: string; userRole: string; }

export function CompanyUserProvisioningPanel({ userEmail, userRole }: Props) {
  const [tenants, setTenants]     = useState<TenantOption[]>([]);
  const [tenantId, setTenantId]   = useState('');
  const [users, setUsers]         = useState<CompanyUser[]>([]);
  const [loading, setLoading]     = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // New user form
  const [newEmail, setNewEmail]   = useState('');
  const [newRole, setNewRole]     = useState('COMPANY_ADMIN');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState<{ ok: boolean; message: string } | null>(null);

  // Load tenants
  useEffect(() => {
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok?: boolean; tenants?: TenantOption[] }) => {
        if (d.ok) setTenants(d.tenants ?? []);
      })
      .catch(() => {});
  }, []);

  const loadUsers = useCallback(() => {
    if (!tenantId) { setUsers([]); return; }
    setLoadingUsers(true);
    fetch(`/api/admin/company-users?tenantId=${encodeURIComponent(tenantId)}`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok?: boolean; users?: CompanyUser[] }) => {
        if (d.ok) setUsers(d.users ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [tenantId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleInvite = async () => {
    if (!newEmail || !newRole || !tenantId) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/company-users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, role: newRole, tenantId }),
      });
      const d = await res.json() as { ok?: boolean; error?: string; note?: string; email?: string; role?: string };
      if (d.ok) {
        setResult({ ok: true, message: d.note ?? `Utente ${d.email} assegnato come ${d.role}.` });
        setNewEmail('');
        loadUsers();
      } else {
        setResult({ ok: false, message: d.error ?? 'Errore provisioning.' });
      }
    } catch {
      setResult({ ok: false, message: 'Errore di rete.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (userId: string, status: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/company-users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status, tenantId }),
      });
      const d = await res.json() as { ok?: boolean; error?: string };
      if (d.ok) loadUsers();
      else alert(d.error ?? 'Errore aggiornamento stato.');
    } catch {
      alert('Errore di rete.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 space-y-5">

      {/* Header */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">KORA · Admin</p>
          <h1 className="text-xl font-bold text-white tracking-tight">Utenti aziendali</h1>
          <p className="text-sm text-white/45 mt-0.5">
            Assegna accesso al workspace aziendale KORA. Ruoli: Company Admin e Company Viewer.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#9d97ff]">{userRole}</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
        </div>
      </div>

      {/* Privacy / security note */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[10.5px] text-slate-500 leading-relaxed">
        <span className="font-semibold text-slate-700">Isolamento tenant garantito per design. </span>
        Gli utenti aziendali accedono esclusivamente al proprio workspace. Nessun dato individuale o di altri tenant è accessibile. Il ruolo e il tenant sono memorizzati lato server (app_metadata Supabase) — l&apos;utente non può modificarli.
      </div>

      {/* Tenant selector */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 space-y-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Seleziona azienda</p>
        <select
          value={tenantId} onChange={e => { setTenantId(e.target.value); setResult(null); }}
          className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C76F3D] w-full">
          <option value="">— Seleziona tenant —</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.tenantCode} — {t.companyName}</option>
          ))}
        </select>
      </div>

      {/* Invite form */}
      {tenantId && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 space-y-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Assegna nuovo utente</p>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <p className="text-[10px] font-medium text-slate-500 mb-1">Email</p>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="nome@azienda.it"
                className="rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-[#C76F3D]"
              />
            </div>
            <div className="min-w-[240px]">
              <p className="text-[10px] font-medium text-slate-500 mb-1">Ruolo</p>
              <select
                value={newRole} onChange={e => setNewRole(e.target.value)}
                className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                {ROLE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.value}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleInvite}
              disabled={submitting || !newEmail || !newRole}
              className="rounded-lg bg-[#C76F3D] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#4a41d4] disabled:opacity-40 transition-colors flex-shrink-0">
              {submitting ? '…' : 'Assegna →'}
            </button>
          </div>

          {/* Role descriptions */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {ROLE_OPTIONS.map(o => (
              <div key={o.value} className={`rounded border px-3 py-2 text-[10px] leading-relaxed transition-colors ${newRole === o.value ? 'border-[#C76F3D]/40 bg-[#f5f4ff] text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                <span className="font-semibold block mb-0.5">{o.value}</span>
                {o.label.split('—')[1]?.trim()}
              </div>
            ))}
          </div>

          {result && (
            <div className={`rounded px-3 py-2 text-[10.5px] ${result.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
              {result.ok ? '✓ ' : '⚠ '}{result.message}
            </div>
          )}
        </div>
      )}

      {/* Users list */}
      {tenantId && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Utenti assegnati {loadingUsers ? '…' : `(${users.length})`}
            </p>
            <button onClick={loadUsers} className="text-[10px] text-[#C76F3D] hover:underline">↻ Aggiorna</button>
          </div>

          {users.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400">
              {loadingUsers ? 'Caricamento…' : 'Nessun utente assegnato a questo tenant.'}
            </div>
          ) : (
            <table className="w-full text-[10.5px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Email', 'Ruolo', 'Stato', 'Ultimo accesso', 'Creato', 'Azioni'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.userId} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-mono text-slate-700">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded border border-[#C76F3D]/30 bg-[#f5f4ff] px-1.5 py-0.5 text-[9px] font-semibold text-[#C76F3D]">{u.koraRole}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_BADGE[u.userStatus] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                        {u.userStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{ts(u.lastSignIn)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{ts(u.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2">
                        {u.userStatus !== 'active' && (
                          <button
                            onClick={() => handleStatusChange(u.userId, 'active')}
                            disabled={loading}
                            className="text-[9px] text-green-600 hover:underline disabled:opacity-40">
                            Attiva
                          </button>
                        )}
                        {u.userStatus === 'active' && (
                          <button
                            onClick={() => handleStatusChange(u.userId, 'suspended')}
                            disabled={loading}
                            className="text-[9px] text-amber-600 hover:underline disabled:opacity-40">
                            Sospendi
                          </button>
                        )}
                        {u.userStatus !== 'disabled' && (
                          <button
                            onClick={() => handleStatusChange(u.userId, 'disabled')}
                            disabled={loading}
                            className="text-[9px] text-red-500 hover:underline disabled:opacity-40">
                            Disabilita
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-[10px] text-slate-400 text-center pt-2">
        KORA Foundation Light · Provisioning pilot · Ruoli e tenant gestiti via Supabase app_metadata
      </div>

    </div>
  );
}
