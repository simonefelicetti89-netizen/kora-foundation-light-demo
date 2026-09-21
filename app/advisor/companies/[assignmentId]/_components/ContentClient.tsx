'use client';

// KORA-WP-064 — Advisor notes/documents, moved out of the monolith. The
// five-class taxonomy and its visibility rules belong to KORA-WP-036: the
// class list, the Company-shareable flag on a communication record and the
// mandatory purpose on a confidential reference are ported unchanged. This
// package does not generalize the capability into document management.

import { useEffect, useState, useCallback } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';
import { Eye, EyeOff, Lock, Plus } from 'lucide-react';
import { Region, StateBlock, SkeletonRows, Notice } from '@/components/ui/px';
import { formatStamp, CLASS_LABEL, type ContentClass, type ContentRecord } from '../_lib';

export function ContentClient({ assignmentId }: { assignmentId: string }) {
  const [content, setContent] = useState<ContentRecord[] | null>(null);
  const [newClass, setNewClass] = useState<ContentClass>('ORGANISATION_SHAREABLE_NOTE');
  const [newBody, setNewBody] = useState('');
  const [newShared, setNewShared] = useState(false);
  const [newPurpose, setNewPurpose] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [composing, setComposing] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/advisor/companies/${assignmentId}/content`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setContent(d.ok ? (d.content ?? []) : []))
      .catch(() => setContent([]));
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!newBody.trim()) return;
    if (newClass === 'CONFIDENTIAL_REFERENCE' && !newPurpose.trim()) {
      setError('Lo scopo è obbligatorio per un riferimento riservato.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { class: newClass, body: newBody };
      if (newClass === 'COMMUNICATION_FOLLOWUP') body.shared = newShared;
      if (newClass === 'CONFIDENTIAL_REFERENCE') body.purpose = newPurpose;
      const r = await fetch(`/api/advisor/companies/${assignmentId}/content`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) { setNewBody(''); setNewPurpose(''); setNewShared(false); setComposing(false); load(); }
      else setError(d.error ?? 'Salvataggio non riuscito.');
    } catch {
      setError('Errore di rete.');
    } finally {
      setSaving(false);
    }
  }

  const field: React.CSSProperties = {
    width: '100%', minWidth: 0, padding: '9px 11px', borderRadius: PX.rCtl,
    border: `1px solid ${PX.line2}`, background: PX.l1, color: PX.ink,
    fontFamily: PX.sans, fontSize: 12.5,
  };

  /** What the Company can see. Derived from the existing class + shared flag
   *  only — the taxonomy itself is KORA-WP-036's and is not touched here. */
  function visibility(c: ContentRecord): { label: string; Icon: typeof Eye; tone: string } {
    if (c.class === 'ORGANISATION_SHAREABLE_NOTE') return { label: 'Visibile alla Company', Icon: Eye, tone: PX.ok };
    if (c.class === 'COMMUNICATION_FOLLOWUP') {
      return c.shared
        ? { label: 'Condiviso con la Company', Icon: Eye, tone: PX.ok }
        : { label: 'Non condiviso', Icon: EyeOff, tone: PX.ink3 };
    }
    if (c.class === 'CONFIDENTIAL_REFERENCE') return { label: 'Riservato', Icon: Lock, tone: PX.warn };
    if (c.class === 'AUDIT_PROVENANCE_RECORD') return { label: 'Registro di provenienza', Icon: Lock, tone: PX.ink3 };
    return { label: 'Interno all’Advisor', Icon: EyeOff, tone: PX.ink3 };
  }

  return (
    <Region
      label="Note e riferimenti"
      actions={
        <button
          type="button"
          onClick={() => setComposing((v) => !v)}
          aria-expanded={composing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 28, padding: '0 10px',
            borderRadius: PX.rCtl, border: `1px solid ${composing ? PX.line2 : PX.violetEdge}`,
            background: composing ? PX.l1 : PX.violetTint, color: composing ? PX.ink2 : PX.violet700,
            fontFamily: PX.sans, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Plus size={14} strokeWidth={2.4} aria-hidden="true" />
          {composing ? 'Chiudi' : 'Registra nota'}
        </button>
      }
    >
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        {error && <Notice tone="risk">{error}</Notice>}

        {composing && (
          <div style={{
            display: 'grid', gap: 9, padding: '12px 13px', minWidth: 0,
            borderRadius: PX.rInner, border: `1px solid ${PX.violetEdge}`, background: PX.violetTint,
          }}>
            <label htmlFor="content-class" style={{ fontSize: 12.5, fontWeight: 700, color: PX.ink2 }}>Classe</label>
            <select id="content-class" value={newClass} onChange={(e) => setNewClass(e.target.value as ContentClass)} style={field}>
              {(Object.keys(CLASS_LABEL) as ContentClass[]).map((k) => (
                <option key={k} value={k}>{CLASS_LABEL[k]}</option>
              ))}
            </select>

            <label htmlFor="content-body" style={{ fontSize: 12.5, fontWeight: 700, color: PX.ink2 }}>Testo</label>
            <textarea id="content-body" value={newBody} onChange={(e) => setNewBody(e.target.value)}
              placeholder="Testo…" rows={3} style={{ ...field, lineHeight: 1.55, resize: 'vertical' }} />

            {newClass === 'CONFIDENTIAL_REFERENCE' && (
              <input aria-label="Scopo del riferimento riservato" value={newPurpose}
                onChange={(e) => setNewPurpose(e.target.value)} placeholder="Scopo (obbligatorio)" style={field} />
            )}

            {newClass === 'COMMUNICATION_FOLLOWUP' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 650, color: PX.ink2 }}>
                <input type="checkbox" checked={newShared} onChange={(e) => setNewShared(e.target.checked)} />
                Condividi il verbale con la Company
              </label>
            )}

            <button type="button" onClick={save} disabled={saving || !newBody.trim()}
              style={{
                justifySelf: 'start', minHeight: 32, padding: '0 13px', borderRadius: PX.rCtl,
                border: `1px solid ${PX.violetEdge}`, background: newBody.trim() ? PX.l1 : PX.l2,
                color: newBody.trim() ? PX.violet700 : PX.inkMute,
                fontFamily: PX.sans, fontSize: 12.5, fontWeight: 700,
                cursor: saving || !newBody.trim() ? 'not-allowed' : 'pointer',
              }}>
              {saving ? 'Salvataggio…' : 'Registra nota'}
            </button>
          </div>
        )}

        {content === null ? (
          <SkeletonRows rows={4} rowHeight={40} />
        ) : content.length === 0 ? (
          <StateBlock
            title="Nessuna nota ancora"
            body="Qui resta traccia di ciò che scrivi per questa Company: note condivisibili, riferimenti riservati con il loro scopo e verbali di comunicazione. La classe scelta determina se la Company può leggerle."
          />
        ) : (
          /* Timeline: one continuous record, not one card per note. */
          <ol style={{ display: 'grid', gap: 0, margin: 0, padding: 0, listStyle: 'none', minWidth: 0 }}>
            {content.map((c, i) => {
              const v = visibility(c);
              return (
                <li key={c.id} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: 11, minWidth: 0 }}>
                  <span aria-hidden="true" style={{ display: 'grid', justifyItems: 'center', gap: 0 }}>
                    <span style={{ width: 8, height: 8, marginTop: 6, borderRadius: PX.rPill, background: v.tone, flex: 'none' }} />
                    {i < content.length - 1 && <span style={{ width: 1, flex: 1, background: PX.line, minHeight: 18 }} />}
                  </span>
                  <div style={{ display: 'grid', gap: 4, minWidth: 0, paddingBottom: i < content.length - 1 ? 16 : 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 750, color: PX.ink }}>
                        {c.class === 'AUDIT_PROVENANCE_RECORD' ? 'Registro di provenienza' : CLASS_LABEL[c.class]}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: v.tone }}>
                        <v.Icon size={12} strokeWidth={2.2} aria-hidden="true" />
                        {v.label}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 650, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
                        {formatStamp(c.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: PX.ink2, overflowWrap: 'anywhere' }}>{c.body}</p>
                    {c.purpose && (
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: PX.ink3 }}>Scopo: {c.purpose}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Region>
  );
}
