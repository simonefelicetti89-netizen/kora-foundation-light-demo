'use client';
// app/admin/partners/_components/PartnersAdminClient.tsx
// B116: Interactive partner management — KORA_ADMIN only client component.
// Create partners, toggle status draft/published/archived.
// No marketplace, no booking, no partner ranking, no per-worker interaction data.

import { useState } from 'react';

const PILLARS   = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
const MODES     = ['online', 'onsite', 'hybrid'] as const;
const STATUSES  = ['draft', 'published', 'archived'] as const;

type Pillar   = typeof PILLARS[number];
type Mode     = typeof MODES[number];
type Status   = typeof STATUSES[number];

const PILLAR_COLORS: Record<Pillar, string> = {
  LIFE: '#16a34a', GROWTH: '#2563eb', CONNECTION: '#9333ea',
  IMPACT: '#dc2626', LEGACY: '#ca8a04',
};

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  draft:     { bg: '#fef9c3', text: '#854d0e', label: 'Bozza' },
  published: { bg: '#dcfce7', text: '#15803d', label: 'Pubblicato' },
  archived:  { bg: '#f3f4f6', text: '#6b7280', label: 'Archiviato' },
};

const DELIVERY_LABELS: Record<Mode, string> = {
  online: 'Online', onsite: 'In presenza', hybrid: 'Ibrido',
};

type Partner = {
  id:            string;
  name:          string;
  description:   string | null;
  pillar:        string;
  category:      string | null;
  website_url:   string | null;
  city:          string | null;
  delivery_mode: string;
  status:        string;
  created_at:    string;
};

type CreateForm = {
  name:          string;
  pillar:        Pillar;
  description:   string;
  category:      string;
  website_url:   string;
  city:          string;
  delivery_mode: Mode;
};

const EMPTY_FORM: CreateForm = {
  name: '', pillar: 'LIFE', description: '', category: '',
  website_url: '', city: '', delivery_mode: 'online',
};

export function PartnersAdminClient({ initialPartners }: { initialPartners: Partner[] }) {
  const [partners, setPartners]   = useState<Partner[]>(initialPartners);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [pillarFilter, setPillarFilter] = useState<string>('all');

  const displayed = pillarFilter === 'all'
    ? partners
    : partners.filter(p => p.pillar === pillarFilter);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({})) as { ok?: boolean; partner?: Partner; error?: string };
      if (json.ok && json.partner) {
        setPartners(prev => [{ ...json.partner!, delivery_mode: form.delivery_mode, city: form.city || null } as Partner, ...prev]);
        setForm(EMPTY_FORM);
        setShowForm(false);
      } else {
        setCreateError(json.error ?? 'Errore nella creazione.');
      }
    } catch {
      setCreateError('Errore di rete. Riprova.');
    }
    setCreating(false);
  }

  async function handleStatusChange(partner: Partner, newStatus: Status) {
    setStatusBusy(partner.id);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({})) as { ok?: boolean; partner?: Partner };
      if (json.ok && json.partner) {
        setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status: newStatus } : p));
      }
    } catch {
      // silent failure — table will show stale status
    }
    setStatusBusy(null);
  }

  const publishedCount = partners.filter(p => p.status === 'published').length;

  return (
    <div>
      {/* Summary bar */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <Stat label="Totale partner" value={partners.length} />
          <Stat label="Pubblicati (visibili ai worker)" value={publishedCount} highlight />
          <Stat label="Bozze" value={partners.filter(p => p.status === 'draft').length} />
          <Stat label="Archiviati" value={partners.filter(p => p.status === 'archived').length} muted />
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setCreateError(null); }}
          style={{
            background: '#06032B', color: '#fff', border: 'none', borderRadius: 7,
            padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {showForm ? 'Annulla' : '+ Aggiungi partner'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1px solid rgba(6,3,43,0.10)', borderRadius: 10,
          padding: '24px', marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#06032B', marginTop: 0, marginBottom: 20 }}>
            Nuovo partner
          </h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <FormField label="Nome *">
                <input
                  required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="es. Città Aperta APS"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Pillar *">
                <select
                  value={form.pillar}
                  onChange={e => setForm(f => ({ ...f, pillar: e.target.value as Pillar }))}
                  style={inputStyle}
                >
                  {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label="Categoria">
                <input
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="es. Welfare, Formazione, APS"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Modalità erogazione">
                <select
                  value={form.delivery_mode}
                  onChange={e => setForm(f => ({ ...f, delivery_mode: e.target.value as Mode }))}
                  style={inputStyle}
                >
                  {MODES.map(m => <option key={m} value={m}>{DELIVERY_LABELS[m]}</option>)}
                </select>
              </FormField>
              <FormField label="Città">
                <input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="es. Milano"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Website URL">
                <input
                  value={form.website_url} type="url"
                  onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </FormField>
            </div>
            <FormField label="Descrizione">
              <textarea
                value={form.description} rows={3}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Breve descrizione del partner e delle attività offerte..."
                style={{ ...inputStyle, resize: 'vertical', height: 80 }}
              />
            </FormField>
            {createError && (
              <p style={{ fontSize: 11, color: '#dc2626', marginTop: 8 }}>{createError}</p>
            )}
            <div style={{ marginTop: 16 }}>
              <button
                type="submit" disabled={creating}
                style={{
                  background: '#06032B', color: '#fff', border: 'none', borderRadius: 7,
                  padding: '9px 24px', fontSize: 12, fontWeight: 700,
                  cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? 'Creazione…' : 'Crea partner (bozza)'}
              </button>
              <span style={{ marginLeft: 12, fontSize: 11, color: 'rgba(6,3,43,0.40)' }}>
                Il partner sarà creato in stato &ldquo;bozza&rdquo; — pubblica per renderlo visibile ai worker.
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', ...PILLARS].map(p => (
          <button
            key={p}
            onClick={() => setPillarFilter(p)}
            style={{
              padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: '1px solid',
              background: pillarFilter === p ? '#06032B' : 'transparent',
              color: pillarFilter === p ? '#fff' : 'rgba(6,3,43,0.55)',
              borderColor: pillarFilter === p ? '#06032B' : 'rgba(6,3,43,0.15)',
            }}
          >
            {p === 'all' ? 'Tutti' : p}
          </button>
        ))}
      </div>

      {/* Partner list */}
      {displayed.length === 0 ? (
        <div style={{
          background: 'rgba(6,3,43,0.03)', border: '1px dashed rgba(6,3,43,0.15)',
          borderRadius: 10, padding: '32px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.45)', margin: 0 }}>
            Nessun partner ancora. Clicca &ldquo;+ Aggiungi partner&rdquo; per creare il primo.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {displayed.map(partner => {
            const sc  = STATUS_STYLES[partner.status as Status] ?? STATUS_STYLES.draft;
            const pc  = PILLAR_COLORS[partner.pillar as Pillar] ?? '#555';
            const isBusy = statusBusy === partner.id;
            return (
              <div
                key={partner.id}
                data-testid={`admin-partner-row-${partner.id}`}
                style={{
                  background: '#fff', border: '1px solid rgba(6,3,43,0.08)',
                  borderRadius: 10, padding: '16px 20px',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: pc,
                    }}>
                      {partner.pillar}
                    </span>
                    {partner.category && (
                      <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.40)' }}>· {partner.category}</span>
                    )}
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                      background: sc.bg, color: sc.text, borderRadius: 4, padding: '1px 6px',
                    }}>
                      {sc.label}
                    </span>
                    <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)' }}>
                      {DELIVERY_LABELS[partner.delivery_mode as Mode] ?? partner.delivery_mode}
                      {partner.city && ` · ${partner.city}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#06032B' }}>{partner.name}</div>
                  {partner.description && (
                    <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', marginTop: 3, lineHeight: 1.4 }}>
                      {partner.description.length > 120 ? `${partner.description.slice(0, 120)}…` : partner.description}
                    </div>
                  )}
                  {partner.website_url && (
                    <a
                      href={partner.website_url} target="_blank" rel="noreferrer noopener"
                      style={{ fontSize: 10, color: '#2563eb', marginTop: 4, display: 'inline-block' }}
                    >
                      {partner.website_url}
                    </a>
                  )}
                </div>

                {/* Status actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {STATUSES.filter(s => s !== partner.status).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(partner, s)}
                      disabled={isBusy}
                      style={{
                        padding: '5px 11px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                        cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.5 : 1,
                        border: '1px solid rgba(6,3,43,0.15)',
                        background: s === 'published' ? '#dcfce7' : s === 'archived' ? '#f3f4f6' : '#fef9c3',
                        color: s === 'published' ? '#15803d' : s === 'archived' ? '#6b7280' : '#854d0e',
                      }}
                    >
                      → {STATUS_STYLES[s].label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Policy note */}
      <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', marginTop: 20, lineHeight: 1.5 }}>
        I partner published sono visibili ai worker nella sezione &ldquo;Opportunità&rdquo;.
        Nessun dato di interazione worker-partner viene registrato o esposto alla company.
        Nessun marketplace, nessuna prenotazione, nessun ranking.
      </p>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Stat({ label, value, highlight, muted }: { label: string; value: number; highlight?: boolean; muted?: boolean }) {
  return (
    <div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: highlight ? '#15803d' : muted ? 'rgba(6,3,43,0.30)' : '#06032B',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(6,3,43,0.55)', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid rgba(6,3,43,0.15)', borderRadius: 7, padding: '8px 12px',
  fontSize: 12, color: '#06032B', background: '#fff',
  fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
  outline: 'none',
};
