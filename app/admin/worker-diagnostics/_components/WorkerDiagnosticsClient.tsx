'use client';
// WorkerDiagnosticsClient — per-tenant worker provisioning status overview.
// Calls /api/admin/worker-diagnostics on mount. KORA_ADMIN only.

import { useEffect, useState } from 'react';

interface WorkerAggregate {
  total: number; invited: number; active: number; pending: number; disabled: number; coveragePct: number;
}

interface TenantRow {
  tenantId:           string;
  tenantCode:         string;
  companyName:        string;
  workers:            WorkerAggregate;
  provisioningStatus: 'none' | 'partial' | 'active' | 'fully_disabled';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  none:           { label: 'Nessun worker',       color: '#6b7280', bg: '#f3f4f6' },
  partial:        { label: 'Parziale',             color: '#854d0e', bg: '#fef9c3' },
  active:         { label: 'Attivo',               color: '#15803d', bg: '#dcfce7' },
  fully_disabled: { label: 'Tutti disabilitati',   color: '#b91c1c', bg: '#fee2e2' },
};

export default function WorkerDiagnosticsClient() {
  const [tenants,    setTenants]    = useState<TenantRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [fetchedAt,  setFetchedAt]  = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/worker-diagnostics')
      .then(r => r.json())
      .then(json => {
        if (json.ok) {
          setTenants(json.tenants ?? []);
          setFetchedAt(json.fetchedAt ?? null);
        } else {
          setError(json.error ?? 'Errore caricamento');
        }
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em' }}>
          Worker Diagnostics
        </h1>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: '#06032B', color: '#fff', borderRadius: 4, padding: '2px 7px' }}>
          LIVE
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', marginBottom: 28 }}>
        Stato provisioning worker per tenant — aggregati solo.
        {fetchedAt && ` · Aggiornato: ${new Date(fetchedAt).toLocaleTimeString('it-IT')}`}
      </p>

      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'rgba(6,3,43,0.40)', fontSize: 13 }}>
          Caricamento…
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#b91c1c', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!loading && !error && tenants.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'rgba(6,3,43,0.35)', fontSize: 13 }}>
          Nessun tenant attivo trovato.
        </div>
      )}

      {tenants.length > 0 && (
        <div style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(6,3,43,0.03)' }}>
                {['Azienda', 'Tenant Code', 'Totale', 'Invitati', 'Attivi', 'In attesa', 'Disabilitati', 'Copertura', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.50)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, i) => {
                const sc = STATUS_CONFIG[t.provisioningStatus] ?? STATUS_CONFIG['none'];
                return (
                  <tr key={t.tenantId} style={{ borderTop: '1px solid rgba(6,3,43,0.05)', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#06032B', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.companyName}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'rgba(6,3,43,0.70)' }}>{t.tenantCode}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{t.workers.total}</td>
                    <td style={{ padding: '10px 14px', color: '#854d0e' }}>{t.workers.invited}</td>
                    <td style={{ padding: '10px 14px', color: '#15803d', fontWeight: t.workers.active > 0 ? 700 : 400 }}>{t.workers.active}</td>
                    <td style={{ padding: '10px 14px', color: '#1d4ed8' }}>{t.workers.pending}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{t.workers.disabled}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t.workers.coveragePct}%</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href="/admin/workers" style={{ fontSize: 12, color: '#06032B', textDecoration: 'underline' }}>
          → Provisioning Worker
        </a>
        <a href="/admin/live-spine-diagnostics" style={{ fontSize: 12, color: '#06032B', textDecoration: 'underline' }}>
          → Live Spine Diagnostics
        </a>
      </div>

      <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(6,3,43,0.03)', borderRadius: 8, fontSize: 10, color: 'rgba(6,3,43,0.40)', lineHeight: 1.6 }}>
        <strong>Privacy:</strong> Questa pagina mostra solo conteggi aggregati. I datori di lavoro non possono vedere dati individuali dei worker. · B104 · KORA Foundation Light
      </div>
    </div>
  );
}
