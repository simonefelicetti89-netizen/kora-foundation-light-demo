'use client';
// app/admin/worker-initiatives/_components/WorkerInitiativesClient.tsx
// B109: Client component for KORA_ADMIN worker initiatives management.
// Handles tenant selection, initiative list, and create/update forms.

import { useState, useEffect, useCallback } from 'react';
import type { WorkerInitiativeRow } from '@/lib/supabase/types';

type Tenant = { id: string; company_name: string; tenant_code: string };
type Initiative = WorkerInitiativeRow;

const PILLARS: WorkerInitiativeRow['pillar'][] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
const PILLAR_COLORS: Record<string, string> = {
  LIFE: '#16a34a', GROWTH: '#2563eb', CONNECTION: '#9333ea',
  IMPACT: '#dc2626', LEGACY: '#ca8a04',
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: '#f3f4f6', text: '#6b7280' },
  published: { bg: '#dcfce7', text: '#15803d' },
  closed:    { bg: '#fef9c3', text: '#854d0e' },
};
const STATUS_LABELS_IT: Record<WorkerInitiativeRow['status'], string> = {
  draft:     'Bozza',
  published: 'Pubblicata',
  closed:    'Chiusa',
};
const ELIGIBILITY_LABELS_IT: Record<string, string> = {
  eligible: 'Tutti i worker',
  limited:  'Accesso limitato',
};

export function WorkerInitiativesClient({
  tenants, adminEmail,
}: { tenants: Tenant[]; adminEmail: string }) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [initiatives, setInitiatives]           = useState<Initiative[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [showForm, setShowForm]                 = useState(false);
  const [statusError, setStatusError]           = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', pillar: 'GROWTH' as WorkerInitiativeRow['pillar'],
    eligibility_class: 'eligible' as 'eligible' | 'limited',
    status: 'draft' as WorkerInitiativeRow['status'],
    start_date: '', end_date: '', mode: '', location: '', provider: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadInitiatives = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/worker-initiatives?tenantId=${encodeURIComponent(tenantId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore caricamento');
      setInitiatives(data.initiatives ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selectedTenantId) {
        if (!cancelled) setInitiatives([]);
        return;
      }
      if (!cancelled) await loadInitiatives(selectedTenantId);
    }
    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await fetch('/api/admin/worker-initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          title: form.title,
          description: form.description || null,
          pillar: form.pillar,
          eligibility_class: form.eligibility_class,
          status: form.status,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          mode: form.mode || null,
          location: form.location || null,
          provider: form.provider || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore creazione');
      setFormSuccess('Iniziativa creata.');
      setForm({ title: '', description: '', pillar: 'GROWTH', eligibility_class: 'eligible', status: 'draft', start_date: '', end_date: '', mode: '', location: '', provider: '' });
      setShowForm(false);
      loadInitiatives(selectedTenantId);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: WorkerInitiativeRow['status']) {
    setStatusError(null);
    const res = await fetch(`/api/admin/worker-initiatives/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await loadInitiatives(selectedTenantId);
    } else {
      const data = await res.json().catch(() => ({}));
      setStatusError((data as { error?: string }).error ?? `Errore aggiornamento stato a "${STATUS_LABELS_IT[status]}".`);
    }
  }

  return (
    <div>
      {/* Tenant selector */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(6,3,43,0.50)', marginBottom: 6 }}>
          Seleziona azienda
        </label>
        <select
          value={selectedTenantId}
          onChange={e => { setSelectedTenantId(e.target.value); setShowForm(false); setFormSuccess(null); }}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(6,3,43,0.15)', fontSize: 13, minWidth: 280 }}
        >
          <option value="">— Scegli un tenant —</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.company_name} ({t.tenant_code})</option>
          ))}
        </select>
      </div>

      {selectedTenantId && (
        <>
          {/* Header + Add button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#06032B' }}>
              {loading ? 'Caricamento…' : `${initiatives.length} iniziative`}
            </span>
            <button
              onClick={() => { setShowForm(!showForm); setFormError(null); setFormSuccess(null); }}
              style={{
                padding: '8px 16px', borderRadius: 7, border: 'none',
                background: '#06032B', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {showForm ? 'Annulla' : '+ Nuova iniziativa'}
            </button>
          </div>

          {formSuccess && (
            <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 7, padding: '10px 14px', fontSize: 12, marginBottom: 16 }}>
              {formSuccess}
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <form onSubmit={handleCreate} style={{
              background: '#f9f9fb', border: '1px solid rgba(6,3,43,0.10)', borderRadius: 10,
              padding: '24px', marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#06032B', marginBottom: 18, marginTop: 0 }}>Nuova iniziativa</h3>
              <div style={{ display: 'grid', gap: 14 }}>
                <Field label="Titolo *">
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required style={inputStyle} />
                </Field>
                <Field label="Descrizione">
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Pillar *">
                    <select value={form.pillar} onChange={e => setForm(f => ({ ...f, pillar: e.target.value as WorkerInitiativeRow['pillar'] }))} style={inputStyle}>
                      {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Eligibilità">
                    <select value={form.eligibility_class} onChange={e => setForm(f => ({ ...f, eligibility_class: e.target.value as 'eligible' | 'limited' }))} style={inputStyle}>
                      <option value="eligible">Tutti i worker</option>
                      <option value="limited">Accesso limitato</option>
                    </select>
                  </Field>
                  <Field label="Stato iniziale">
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as WorkerInitiativeRow['status'] }))} style={inputStyle}>
                      <option value="draft">Bozza (non visibile ai worker)</option>
                      <option value="published">Pubblica subito (visibile ai worker del tenant)</option>
                    </select>
                  </Field>
                  <Field label="Modo">
                    <input value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} placeholder="es. Online / Presenza" style={inputStyle} />
                  </Field>
                  <Field label="Data inizio">
                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inputStyle} />
                  </Field>
                  <Field label="Data fine">
                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inputStyle} />
                  </Field>
                  <Field label="Luogo">
                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} />
                  </Field>
                  <Field label="Provider">
                    <input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} style={inputStyle} />
                  </Field>
                </div>
              </div>
              {formError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 12 }}>{formError}</div>}
              <button type="submit" disabled={formLoading} style={{
                marginTop: 18, padding: '10px 24px', borderRadius: 7, border: 'none',
                background: '#06032B', color: '#fff', fontSize: 12, fontWeight: 700, cursor: formLoading ? 'not-allowed' : 'pointer',
                opacity: formLoading ? 0.6 : 1,
              }}>
                {formLoading ? 'Creazione…' : 'Crea iniziativa'}
              </button>
            </form>
          )}

          {/* Initiative list */}
          {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 12 }}>{error}</div>}
          {statusError && (
            <div style={{ background: '#fee2e2', color: '#9b1c1c', borderRadius: 7, padding: '8px 12px', fontSize: 11, marginBottom: 12 }}>
              {statusError}
            </div>
          )}

          {!loading && initiatives.length === 0 && (
            <div style={{ color: 'rgba(6,3,43,0.40)', fontSize: 12, padding: '20px 0' }}>
              Nessuna iniziativa per questo tenant. Crea la prima con il pulsante sopra.
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {initiatives.map(init => {
              const sc = STATUS_COLORS[init.status] ?? STATUS_COLORS['draft'];
              return (
                <div key={init.id} style={{
                  background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10, padding: '16px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PILLAR_COLORS[init.pillar] ?? '#555' }}>
                        {init.pillar}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: sc.bg, color: sc.text, borderRadius: 4, padding: '1px 5px' }}>
                        {STATUS_LABELS_IT[init.status] ?? init.status}
                      </span>
                      {init.eligibility_class === 'limited' && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: '#fef9c3', color: '#854d0e', borderRadius: 4, padding: '1px 5px' }}>
                          {ELIGIBILITY_LABELS_IT['limited']}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#06032B', marginBottom: 2 }}>{init.title}</div>
                    {init.description && <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)' }}>{init.description.slice(0, 120)}</div>}
                    <div style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', marginTop: 4 }}>
                      {init.start_date && `Dal ${init.start_date}`}
                      {init.end_date && ` al ${init.end_date}`}
                      {init.mode && ` · ${init.mode}`}
                      {init.location && ` · ${init.location}`}
                      {init.provider && ` · ${init.provider}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' }}>
                    {init.status === 'draft' && (
                      <>
                        <StatusBtn label="Pubblica" onClick={() => handleStatusChange(init.id, 'published')} color="#15803d" />
                        <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)', textAlign: 'right' }}>
                          Visibile ai worker del tenant
                        </span>
                      </>
                    )}
                    {init.status === 'published' && (
                      <StatusBtn label="Chiudi" onClick={() => handleStatusChange(init.id, 'closed')} color="#854d0e" />
                    )}
                    {init.status === 'closed' && (
                      <StatusBtn label="Riapri" onClick={() => handleStatusChange(init.id, 'published')} color="#15803d" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, fontSize: 10, color: 'rgba(6,3,43,0.30)' }}>
            Admin: {adminEmail} · B109 · I dati di partecipazione individuale non sono mai mostrati in questa pagina.
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6,
  border: '1px solid rgba(6,3,43,0.15)', fontSize: 12,
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(6,3,43,0.45)', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 6, border: `1px solid ${color}`,
      background: 'transparent', color, fontSize: 10, fontWeight: 700, cursor: 'pointer',
    }}>
      {label}
    </button>
  );
}
