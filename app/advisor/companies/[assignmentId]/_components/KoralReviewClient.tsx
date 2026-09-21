'use client';

// KORA-WP-064 — KORAL Review, moved out of the monolith. The capability
// belongs to KORA-WP-116: the Advisor interprets a RECOGNIZED transformation
// and confirms an ambiguous CANDIDATE one. `category` stays canon-derived and
// read-only — this UI never lets the Advisor pick or override it — and Living
// KORAL scope is not reopened here (KORA-WP-117 remains Founder-deferred).

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';
import { Check } from 'lucide-react';
import { Region, SkeletonRows, Notice } from '@/components/ui/px';
import { formatDay, type KoralReviewSubjects } from '../_lib';

export function KoralReviewClient({ assignmentId }: { assignmentId: string }) {
  const [subjects, setSubjects] = useState<KoralReviewSubjects | null>(null);
  const [targetId, setTargetId] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch(`/api/advisor/companies/${assignmentId}/koral-review`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setSubjects({
            recognizedForInterpretation: d.subjects?.recognizedForInterpretation ?? [],
            eligibleForConfirmation: d.subjects?.eligibleForConfirmation ?? [],
          });
        } else {
          setSubjects({ recognizedForInterpretation: [], eligibleForConfirmation: [] });
          setError(d.error ?? 'Impossibile recuperare le trasformazioni.');
        }
      })
      .catch(() => {
        setSubjects({ recognizedForInterpretation: [], eligibleForConfirmation: [] });
        setError('Errore di rete.');
      });
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  async function saveInterpretation() {
    if (!targetId || !interpretation.trim()) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/koral-review`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialChangeId: targetId, interpretation }),
      });
      const d = await r.json();
      if (d.ok) { setInterpretation(''); load(); } else setError(d.error ?? 'Salvataggio non riuscito.');
    } catch {
      setError('Errore di rete.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmCandidate(materialChangeId: string) {
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/koral-review/confirm`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialChangeId }),
      });
      const d = await r.json();
      if (d.ok) load(); else setError(d.error ?? 'Conferma non riuscita.');
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

  const recognized = subjects?.recognizedForInterpretation ?? [];
  const candidates = subjects?.eligibleForConfirmation ?? [];

  const changeRow = (
    m: { id: string; category: string; occurredAt: string },
    opts: { selectable?: boolean; action?: ReactNode },
  ) => {
    const sel = opts.selectable && targetId === m.id;
    return (
      <div
        key={m.id}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0,
          padding: '9px 11px', borderRadius: PX.rInner,
          border: `1px solid ${sel ? PX.violetEdge : PX.line}`,
          background: sel ? PX.violetTint : PX.l1, fontFamily: PX.sans,
        }}
      >
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: PX.rPill, background: PX.violet, flex: 'none' }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: PX.ink, minWidth: 0, overflowWrap: 'anywhere' }}>{m.category}</span>
        <span style={{ fontSize: 11, fontWeight: 650, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>{formatDay(m.occurredAt)}</span>
        {opts.action && <span style={{ marginLeft: 'auto' }}>{opts.action}</span>}
      </div>
    );
  };

  const ctl: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 27, padding: '0 10px',
    borderRadius: PX.rCtl, border: `1px solid ${PX.violetEdge}`, background: PX.violetTint, color: PX.violet700,
    fontFamily: PX.sans, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  };

  if (subjects === null) return <Region label="KORAL Review"><SkeletonRows rows={4} rowHeight={42} /></Region>;

  return (
    <Region label="KORAL Review">
      <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
        {error && <Notice tone="risk">{error}</Notice>}

        {/* Both stages stay visible: they are the real KORAL Review workflow
            for this Company, and they tell the Advisor where a transformation
            will appear. Nothing is invented — only counts of real state. */}
        {([
          { key: 'candidate', label: 'Da confermare', items: candidates,
            empty: 'Nessuna trasformazione ambigua in attesa. Quando una trasformazione materiale resta ambigua arriva qui per la tua conferma.' },
          { key: 'recognized', label: 'Riconosciute', items: recognized,
            empty: 'Nessuna trasformazione riconosciuta. Una volta confermata, una trasformazione compare qui e puoi aggiungere la tua interpretazione.' },
        ] as const).map((g) => (
          <div key={g.key} style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                color: g.items.length ? PX.ink2 : PX.ink3, fontFamily: PX.sans,
              }}>
                {g.label}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 19, height: 19, padding: '0 6px', borderRadius: PX.rPill,
                background: g.items.length ? PX.inkWash : 'transparent', border: `1px solid ${PX.line}`,
                fontSize: 11, fontWeight: 750, color: g.items.length ? PX.ink2 : PX.ink3,
                fontFamily: PX.sans, fontVariantNumeric: 'tabular-nums',
              }}>
                {g.items.length}
              </span>
              <span style={{ flex: 1, height: 1, background: PX.line, minWidth: 12 }} />
            </div>
            {g.items.length === 0 ? (
              <p style={{ margin: 0, maxWidth: '82ch', fontSize: 11.5, fontWeight: 600, lineHeight: 1.55, color: PX.ink3, fontFamily: PX.sans }}>
                {g.empty}
              </p>
            ) : (
              g.items.map((m) => changeRow(m, g.key === 'candidate'
                ? {
                    action: (
                      <button type="button" style={ctl} disabled={saving} onClick={() => confirmCandidate(m.id)}>
                        <Check size={13} strokeWidth={2.4} aria-hidden="true" /> Conferma
                      </button>
                    ),
                  }
                : {
                    selectable: true,
                    action: (
                      <button
                        type="button"
                        onClick={() => setTargetId(targetId === m.id ? '' : m.id)}
                        aria-pressed={targetId === m.id}
                        style={{
                          ...ctl,
                          borderColor: targetId === m.id ? PX.violetEdge : PX.line2,
                          background: PX.l1,
                          color: targetId === m.id ? PX.violet700 : PX.ink2,
                        }}
                      >
                        {targetId === m.id ? 'In interpretazione' : 'Interpreta'}
                      </button>
                    ),
                  }))
            )}
          </div>
        ))}

            {targetId && (
              <div style={{
                display: 'grid', gap: 8, padding: '11px 12px', minWidth: 0,
                borderRadius: PX.rInner, border: `1px solid ${PX.violetEdge}`, background: PX.violetTint,
              }}>
                <label htmlFor="koral-interpretation" style={{ fontSize: 12.5, fontWeight: 700, color: PX.ink2, fontFamily: PX.sans }}>
                  Interpretazione della trasformazione selezionata
                </label>
                <textarea
                  id="koral-interpretation"
                  aria-label="Interpretazione"
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  placeholder="Interpretazione, contesto, cosa osservare…"
                  rows={4}
                  style={{ ...field, lineHeight: 1.55, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <button type="button" disabled={saving || !interpretation.trim()} onClick={saveInterpretation}
                    style={{ ...ctl, minHeight: 32, background: PX.l1, cursor: saving || !interpretation.trim() ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Salvataggio…' : 'Aggiungi interpretazione'}
                  </button>
                  <button type="button" onClick={() => setTargetId('')}
                    style={{ ...ctl, minHeight: 32, borderColor: PX.line2, background: PX.l1, color: PX.ink2 }}>
                    Annulla
                  </button>
                </div>
              </div>
            )}
      </div>
    </Region>
  );
}
