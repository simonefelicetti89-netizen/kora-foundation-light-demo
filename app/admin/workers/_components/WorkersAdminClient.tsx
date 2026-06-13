'use client';
// WorkersAdminClient — interactive worker provisioning and list panel.
// Calls /api/admin/workers/provision (POST) and /api/admin/workers/list (GET).

import { useState } from 'react';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

interface WorkerRow {
  workerId:  string;
  workerRef: string;
  status:    string;
  createdAt: string;
}

interface Summary {
  total: number; invited: number; active: number; pending: number; disabled: number;
}

const STATUS_COLOR: Record<string, string> = {
  invited:  'bg-amber-100 text-amber-800',
  active:   'bg-green-100 text-green-800',
  pending:  'bg-blue-100 text-blue-800',
  disabled: 'bg-gray-100 text-gray-500',
};

export default function WorkersAdminClient({ adminEmail }: { adminEmail: string }) {
  const [tenantCode,  setTenantCode]  = useState('');
  const [email,       setEmail]       = useState('');
  const [workerRef,   setWorkerRef]   = useState('');
  const [workers,     setWorkers]     = useState<WorkerRow[]>([]);
  const [summary,     setSummary]     = useState<Summary | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [result,      setResult]      = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [listTenant,  setListTenant]  = useState('');

  async function handleProvision(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/admin/workers/provision', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tenantCode, email, workerRef: workerRef || undefined }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Provisioning fallito');
      } else {
        setResult(`Worker invitato. Worker ID: ${json.workerId}. Email di invito inviata a ${email}.`);
        if (json.warning) setError(`Warning: ${json.warning}`);
        // Refresh list
        if (tenantCode) loadWorkers(tenantCode);
        setEmail('');
        setWorkerRef('');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkers(tc: string) {
    if (!tc) return;
    setListLoading(true);
    try {
      const res  = await fetch(`/api/admin/workers/list?tenantCode=${encodeURIComponent(tc)}`);
      const json = await res.json();
      if (json.ok) {
        setWorkers(json.workers ?? []);
        setSummary(json.summary ?? null);
        setListTenant(tc);
      } else {
        setError(json.error ?? 'Lista non disponibile');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setListLoading(false);
    }
  }

  const LABEL_MAP: Record<string, string> = {
    total: 'Totale', invited: 'Invitati', active: 'Attivi', pending: 'In attesa', disabled: 'Disabilitati',
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em' }}>
          Provisioning Worker
        </h1>
        <BoundaryBadge mode="LIVE" variant="light" />
      </div>
      <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', marginBottom: 32 }}>
        Loggato come <strong>{adminEmail}</strong> · Solo KORA_ADMIN
      </p>

      {/* Provision form */}
      <section style={{ background: '#f9f9fb', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10, padding: '24px', marginBottom: 32 }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#06032B', marginBottom: 16 }}>
          Invita un nuovo worker
        </h2>
        <form onSubmit={handleProvision}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.55)', marginBottom: 4 }}>
                Tenant Code *
              </label>
              <input
                value={tenantCode}
                onChange={e => setTenantCode(e.target.value.toUpperCase())}
                placeholder="es. KORA-TEST-COMPANY-1"
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(6,3,43,0.15)', borderRadius: 6, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.55)', marginBottom: 4 }}>
                Email worker *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="worker@azienda.it"
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(6,3,43,0.15)', borderRadius: 6, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.55)', marginBottom: 4 }}>
                Worker Ref (opzionale — pseudonimo interno)
              </label>
              <input
                value={workerRef}
                onChange={e => setWorkerRef(e.target.value)}
                placeholder="es. WRK-001 (generato auto se vuoto)"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(6,3,43,0.15)', borderRadius: 6, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', marginTop: 4 }}>
                Worker Ref è un riferimento opaco interno — mai nome reale o email.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 20px', background: '#06032B', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, alignSelf: 'flex-start' }}
            >
              {loading ? 'Provisioning…' : '+ Invita worker'}
            </button>
          </div>
        </form>

        {result && (
          <div style={{ marginTop: 16, padding: '12px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: 12, color: '#15803d' }}>
            ✓ {result}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 16, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, color: '#b91c1c' }}>
            ✗ {error}
          </div>
        )}
      </section>

      {/* Worker list */}
      <section style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: '#f9f9fb', borderBottom: '1px solid rgba(6,3,43,0.08)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#06032B', margin: 0 }}>
            Worker per tenant
          </h2>
          <input
            value={listTenant || tenantCode}
            onChange={e => setListTenant(e.target.value.toUpperCase())}
            placeholder="Tenant Code"
            style={{ padding: '6px 10px', border: '1px solid rgba(6,3,43,0.15)', borderRadius: 5, fontSize: 12, width: 220, background: '#fff' }}
          />
          <button
            onClick={() => loadWorkers(listTenant || tenantCode)}
            disabled={listLoading}
            style={{ padding: '6px 14px', background: '#06032B', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {listLoading ? '…' : 'Carica'}
          </button>
        </div>

        {summary && (
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(6,3,43,0.07)' }}>
            {(['total', 'invited', 'active', 'pending', 'disabled'] as const).map(k => (
              <div key={k} style={{ flex: 1, padding: '10px 14px', textAlign: 'center', borderRight: k !== 'disabled' ? '1px solid rgba(6,3,43,0.06)' : 'none' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#06032B' }}>{summary[k]}</div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(6,3,43,0.45)' }}>{LABEL_MAP[k]}</div>
              </div>
            ))}
          </div>
        )}

        {workers.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(6,3,43,0.03)' }}>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.50)' }}>Worker Ref</th>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.50)' }}>Status</th>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.50)' }}>Creato</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w, i) => (
                <tr key={w.workerId} style={{ borderTop: '1px solid rgba(6,3,43,0.05)', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#06032B' }}>{w.workerRef}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className={STATUS_COLOR[w.status] ?? 'bg-gray-100 text-gray-600'} style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 7px', display: 'inline-block' }}>
                      {w.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'rgba(6,3,43,0.50)' }}>
                    {new Date(w.createdAt).toLocaleDateString('it-IT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(6,3,43,0.35)', fontSize: 12 }}>
            Nessun worker trovato — inserisci un Tenant Code e clicca Carica.
          </div>
        )}
      </section>

      <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(6,3,43,0.03)', borderRadius: 8, fontSize: 10, color: 'rgba(6,3,43,0.40)', lineHeight: 1.6 }}>
        <strong>Privacy:</strong> Worker Ref è un riferimento opaco interno. I datori di lavoro non possono vedere dati individuali dei worker — solo conteggi aggregati. · B104 · KORA Foundation Light
      </div>
    </div>
  );
}
