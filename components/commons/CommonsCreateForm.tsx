'use client';
// components/commons/CommonsCreateForm.tsx
// B128: Form client-side per creare post KORA Commons (COMPANY_ADMIN).
//
// Privacy: tenant_id non è mai accettato dall'utente — viene dalla sessione server.
// tenantId viene passato dal server component come prop (già validato).
// Nessun tracking individuale. Nessun commento. Nessuna reaction.

import { useState } from 'react';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const CATEGORIES = [
  { value: 'announcement',      label: 'Annuncio' },
  { value: 'initiative_update', label: 'Aggiornamento iniziativa' },
  { value: 'opportunity',       label: 'Opportunità' },
  { value: 'event',             label: 'Evento' },
  { value: 'request',           label: 'Richiesta' },
  { value: 'resource',          label: 'Risorsa' },
] as const;

const PILLARS = [
  { value: '',           label: 'Nessun pillar specifico' },
  { value: 'LIFE',       label: 'LIFE — Salute e benessere' },
  { value: 'GROWTH',     label: 'GROWTH — Formazione e sviluppo' },
  { value: 'CONNECTION', label: 'CONNECTION — Collaborazione' },
  { value: 'IMPACT',     label: 'IMPACT — Impatto sociale' },
  { value: 'LEGACY',     label: 'LEGACY — Trasferimento conoscenza' },
] as const;

interface Props {
  tenantId: string;
}

interface FormState {
  title:    string;
  body:     string;
  category: string;
  pillar:   string;
  status:   'draft' | 'pending_review';
}

const EMPTY: FormState = {
  title:    '',
  body:     '',
  category: 'announcement',
  pillar:   '',
  status:   'draft',
};

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export function CommonsCreateForm({ tenantId }: Props) {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg]       = useState('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;

    setSubmitState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/commons/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:     form.title.trim(),
          body:      form.body.trim(),
          category:  form.category,
          pillar:    form.pillar || null,
          status:    form.status,
          tenant_id: tenantId,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSubmitState('error');
        setErrorMsg(data.error ?? 'Errore sconosciuto.');
        return;
      }
      setSubmitState('success');
      setForm(EMPTY);
      setTimeout(() => {
        setSubmitState('idle');
        setOpen(false);
        window.location.reload();
      }, 1800);
    } catch {
      setSubmitState('error');
      setErrorMsg('Errore di rete. Riprova.');
    }
  }

  const inputStyle: React.CSSProperties = {
    width:        '100%',
    padding:      '9px 12px',
    borderRadius: 8,
    border:       '1px solid rgba(6,3,43,0.14)',
    background:   '#FAFAFA',
    fontSize:     13,
    color:        '#06032B',
    fontFamily:   FONT,
    boxSizing:    'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display:      'block',
    fontWeight:   600,
    fontSize:     12,
    color:        'rgba(6,3,43,0.60)',
    marginBottom: 5,
    fontFamily:   FONT,
  };

  return (
    <div
      data-testid="commons-create-form"
      style={{
        border:       '1px solid rgba(6,3,43,0.10)',
        borderRadius: 14,
        overflow:     'hidden',
        marginBottom: 8,
      }}
    >
      {/* Trigger */}
      <button
        data-testid="commons-create-toggle"
        onClick={() => setOpen((o) => !o)}
        style={{
          width:          '100%',
          padding:        '16px 20px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          background:     '#FAFAFA',
          border:         'none',
          cursor:         'pointer',
          fontFamily:     FONT,
          borderBottom:   open ? '1px solid rgba(6,3,43,0.08)' : 'none',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#06032B' }}>
          + Crea nuovo contenuto
        </span>
        <span style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)' }}>
          {open ? '↑ Chiudi' : '↓ Apri'}
        </span>
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label style={labelStyle}>Titolo *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Titolo del contenuto (massimo 200 caratteri)"
              style={inputStyle}
              maxLength={200}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Corpo del messaggio *</label>
            <textarea
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="Descrivi l'iniziativa, la richiesta o l'aggiornamento in modo chiaro e completo..."
              rows={5}
              style={{ ...inputStyle, resize: 'vertical' }}
              maxLength={4000}
              required
            />
            <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', marginTop: 4, fontFamily: FONT }}>
              {form.body.length}/4000 caratteri · nessun HTML · testo plain
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Categoria *</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                style={inputStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Pillar KORA (opzionale)</label>
              <select
                value={form.pillar}
                onChange={(e) => set('pillar', e.target.value)}
                style={inputStyle}
              >
                {PILLARS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Azione</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                data-testid="commons-save-draft"
                disabled={submitState === 'loading'}
                onClick={() => set('status', 'draft')}
                style={{
                  padding:      '9px 18px',
                  borderRadius: 8,
                  border:       '1px solid rgba(6,3,43,0.18)',
                  background:   'transparent',
                  color:        '#06032B',
                  fontSize:     13,
                  fontWeight:   600,
                  fontFamily:   FONT,
                  cursor:       submitState === 'loading' ? 'not-allowed' : 'pointer',
                  opacity:      submitState === 'loading' ? 0.6 : 1,
                }}
              >
                Salva bozza
              </button>
              <button
                type="submit"
                data-testid="commons-submit-review"
                disabled={submitState === 'loading'}
                onClick={() => set('status', 'pending_review')}
                style={{
                  padding:      '9px 18px',
                  borderRadius: 8,
                  border:       'none',
                  background:   '#06032B',
                  color:        '#FFFFFF',
                  fontSize:     13,
                  fontWeight:   700,
                  fontFamily:   FONT,
                  cursor:       submitState === 'loading' ? 'not-allowed' : 'pointer',
                  opacity:      submitState === 'loading' ? 0.6 : 1,
                }}
              >
                Invia a revisione KORA →
              </button>
            </div>
          </div>

          {submitState === 'success' && (
            <p style={{ fontSize: 13, color: '#2F7D55', fontFamily: FONT, fontWeight: 600 }}>
              ✓ Contenuto salvato con successo. Aggiornamento in corso...
            </p>
          )}
          {submitState === 'error' && (
            <p style={{ fontSize: 12, color: '#9E3B2F', fontFamily: FONT }}>
              Errore: {errorMsg}
            </p>
          )}

          <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, fontFamily: FONT, lineHeight: 1.6 }}>
            I contenuti inviati a revisione saranno visibili ai worker solo dopo approvazione KORA.
            Nessun commento, nessuna reaction, nessun read receipt.
          </p>
        </form>
      )}
    </div>
  );
}
