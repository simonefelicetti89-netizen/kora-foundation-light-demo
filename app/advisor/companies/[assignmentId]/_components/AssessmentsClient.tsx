'use client';

// KORA-WP-064 — Review assessments, moved out of the monolith. The issuance
// semantics belong to KORA-WP-037: an Assessment is a narrative, never a
// second verdict, and there is still no canonical Review-listing UI anywhere,
// so the Advisor enters the Review ID directly exactly as before. No new
// assessment methodology, no Partner Advisor assessment surface.

import { useState, useCallback } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';
import { Search } from 'lucide-react';
import { Region, StateBlock, SkeletonRows, Notice } from '@/components/ui/px';
import { formatStamp, type ReviewAdvisorAssessmentItem } from '../_lib';

export function AssessmentsClient({ assignmentId }: { assignmentId: string }) {
  const [reviewId, setReviewId] = useState('');
  const [assessments, setAssessments] = useState<ReviewAdvisorAssessmentItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(
        `/api/advisor/companies/${assignmentId}/review-assessments?reviewId=${encodeURIComponent(id.trim())}`,
        { credentials: 'include' },
      );
      const d = await r.json();
      if (d.ok) setAssessments(d.assessments ?? []);
      else { setAssessments([]); setError(d.error ?? 'Impossibile recuperare le valutazioni.'); }
    } catch {
      setAssessments([]);
      setError('Errore di rete.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  async function save() {
    if (!reviewId.trim() || !narrative.trim()) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/review-assessments`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: reviewId.trim(), assessmentNarrative: narrative }),
      });
      const d = await r.json();
      if (d.ok) { setNarrative(''); await load(reviewId); }
      else setError(d.error ?? 'Registrazione non riuscita.');
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

  const found = assessments;

  return (
    <Region label="Valutazioni Review">
      <div style={{ display: 'grid', gap: 13, minWidth: 0 }}>
        {/* The constraint, stated once and compactly: no Review browser exists
            anywhere in the Product yet, so the Advisor works from the Review
            reference they already hold. This WP does not invent discovery. */}
        <p style={{ margin: 0, maxWidth: '82ch', fontSize: 12.5, lineHeight: 1.6, color: PX.ink2, fontFamily: PX.sans }}>
          Una valutazione è la tua relazione sulla sufficienza delle evidenze di una Review — non è il verdetto della
          Review, che resta altrove. Parti dal riferimento della Review che stai valutando.
        </p>

        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', minWidth: 0,
          padding: '11px 12px', borderRadius: PX.rInner, border: `1px solid ${PX.line}`, background: PX.l2,
        }}>
          <label style={{ display: 'grid', gap: 5, flex: '1 1 300px', minWidth: 0, fontSize: 12.5, fontWeight: 700, color: PX.ink2, fontFamily: PX.sans }}>
            Riferimento della Review
            <input
              aria-label="ID della Review"
              value={reviewId}
              onChange={(e) => setReviewId(e.target.value)}
              placeholder="ID della Review…"
              style={field}
            />
          </label>
          <button
            type="button"
            onClick={() => load(reviewId)}
            disabled={loading || !reviewId.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '0 13px',
              borderRadius: PX.rCtl, border: `1px solid ${reviewId.trim() ? PX.violetEdge : PX.line2}`,
              background: reviewId.trim() ? PX.violetTint : PX.l1,
              color: reviewId.trim() ? PX.violet700 : PX.inkMute,
              fontFamily: PX.sans, fontSize: 12.5, fontWeight: 700,
              cursor: loading || !reviewId.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            <Search size={14} strokeWidth={2.2} aria-hidden="true" />
            {loading ? 'Ricerca…' : 'Apri Review'}
          </button>
        </div>

        {error && <Notice tone="risk">{error}</Notice>}

        {loading ? (
          <SkeletonRows rows={2} rowHeight={44} />
        ) : found === null ? (
          <StateBlock
            title="Nessuna Review aperta"
            body="Indica il riferimento della Review su cui stai lavorando: vedrai le valutazioni già emesse e potrai registrarne una nuova. KORA non espone ancora un elenco delle Review all’Advisor, quindi il riferimento arriva dal contesto della Review stessa."
          />
        ) : (
          <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3, fontFamily: PX.sans }}>
                {found.length === 0 ? 'Nessuna valutazione emessa' : `${found.length} ${found.length === 1 ? 'valutazione emessa' : 'valutazioni emesse'}`}
              </span>
              {found.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: PX.ink3, fontFamily: PX.sans }}>
                  Per questa Review non risulta ancora alcuna valutazione. La prima può essere la tua.
                </p>
              ) : (
                <ol style={{ display: 'grid', gap: 0, margin: 0, padding: 0, listStyle: 'none', minWidth: 0 }}>
                  {found.map((a, i) => (
                    <li key={a.id} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: 11, minWidth: 0 }}>
                      <span aria-hidden="true" style={{ display: 'grid', justifyItems: 'center' }}>
                        <span style={{ width: 8, height: 8, marginTop: 6, borderRadius: PX.rPill, background: PX.violet }} />
                        {i < found.length - 1 && <span style={{ width: 1, flex: 1, background: PX.line, minHeight: 18 }} />}
                      </span>
                      <div style={{ display: 'grid', gap: 4, minWidth: 0, paddingBottom: i < found.length - 1 ? 16 : 0, fontFamily: PX.sans }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: PX.ink2 }}>
                            Qualifica all’emissione: {a.qualificationStatusAtIssuance}
                          </span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 650, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
                            {formatStamp(a.issuedAt)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: PX.ink, overflowWrap: 'anywhere' }}>{a.assessmentNarrative}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div style={{ display: 'grid', gap: 8, minWidth: 0, paddingTop: 12, borderTop: `1px solid ${PX.line}` }}>
              <label htmlFor="assessment-narrative" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3, fontFamily: PX.sans }}>
                Registra la tua valutazione
              </label>
              <textarea
                id="assessment-narrative"
                aria-label="Narrativa della valutazione"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="Osservazioni sulla sufficienza delle evidenze, eventuali lacune, raccomandazione…"
                rows={4}
                style={{ ...field, lineHeight: 1.55, resize: 'vertical' }}
              />
              <button
                type="button"
                onClick={save}
                disabled={saving || !reviewId.trim() || !narrative.trim()}
                style={{
                  justifySelf: 'start', minHeight: 34, padding: '0 14px', borderRadius: PX.rCtl,
                  border: `1px solid ${PX.violetEdge}`,
                  background: reviewId.trim() && narrative.trim() ? PX.violetTint : PX.l2,
                  color: reviewId.trim() && narrative.trim() ? PX.violet700 : PX.inkMute,
                  fontFamily: PX.sans, fontSize: 12.5, fontWeight: 700,
                  cursor: saving || !narrative.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Registrazione…' : 'Registra valutazione'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Region>
  );
}
