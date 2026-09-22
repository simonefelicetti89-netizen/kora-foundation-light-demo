'use client';

// KORA-WP-064 — Messages, moved out of the monolith. Behaviour is ported
// verbatim: same endpoint, same POST body, same refresh-after-send, same
// empty state. KORA-WP-033 owns the capability; this package owns only where
// it lives and how it reads.

import { useEffect, useState, useCallback } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';
import { SendHorizontal } from 'lucide-react';
import { Region, StateBlock, SkeletonRows, Notice } from '@/components/ui/px';
import type { ContactMessage } from '../_lib';

export function MessagesClient({ assignmentId }: { assignmentId: string }) {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch(`/api/advisor/companies/${assignmentId}/messages`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setMessages(d.ok ? (d.messages ?? []) : []))
      .catch(() => setMessages([]));
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    setError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      });
      const d = await r.json();
      if (d.ok) { setDraft(''); load(); } else { setError(d.error ?? 'Invio non riuscito.'); }
    } catch {
      setError('Errore di rete durante l’invio.');
    } finally {
      setSending(false);
    }
  }

  const thread = messages ?? [];
  const dayOf = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  const timeOf = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Region label="Conversazione con la Company">
      {messages === null ? (
        <SkeletonRows rows={4} rowHeight={40} />
      ) : (
        /* A conversation workspace: the thread owns the vertical space and
           scrolls locally, the composer stays anchored beneath it. The minimum
           height supports that interaction model — it is not cosmetic padding
           (§22): without it the composer would float mid-canvas on a short
           thread and jump as messages arrive. */
        <div style={{ display: 'grid', gridTemplateRows: 'minmax(0, 1fr) auto', gap: 12, minHeight: 'min(56vh, 460px)', minWidth: 0 }}>
          {error && <Notice tone="risk">{error}</Notice>}

          {thread.length === 0 ? (
            <StateBlock
              title="Nessun messaggio ancora"
              body="Questo è il canale scritto fra te e la Company: quello che scrivi qui è visibile ai suoi referenti nella loro area Advisor. Apri tu la conversazione."
            />
          ) : (
            <div style={{ display: 'grid', gap: 3, minWidth: 0, alignContent: 'end', overflowY: 'auto' }}>
              {thread.map((m, i) => {
                const mine = m.senderRole === 'ADVISOR';
                const prev = thread[i - 1];
                const newDay = !prev || dayOf(prev.createdAt) !== dayOf(m.createdAt);
                const sameAuthor = prev && prev.senderRole === m.senderRole && !newDay;
                return (
                  <div key={m.id} style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                    {newDay && (
                      <span style={{
                        justifySelf: 'center', margin: '10px 0 6px', padding: '2px 9px', borderRadius: PX.rPill,
                        background: PX.inkWash, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
                        textTransform: 'uppercase', color: PX.ink3, fontFamily: PX.sans,
                      }}>
                        {dayOf(m.createdAt)}
                      </span>
                    )}
                    <div style={{
                      display: 'grid', gap: 2, minWidth: 0, maxWidth: '74ch',
                      justifySelf: mine ? 'end' : 'start',
                      padding: '8px 11px',
                      borderRadius: PX.rInner,
                      borderTopRightRadius: mine && sameAuthor ? 4 : PX.rInner,
                      borderTopLeftRadius: !mine && sameAuthor ? 4 : PX.rInner,
                      border: `1px solid ${mine ? PX.violetEdge : PX.line}`,
                      background: mine ? PX.violetTint : PX.l1,
                      fontFamily: PX.sans,
                    }}>
                      {!sameAuthor && (
                        <span style={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '0.05em', textTransform: 'uppercase', color: mine ? PX.violet700 : PX.ink3 }}>
                          {mine ? 'Tu · Advisor' : 'Company'}
                        </span>
                      )}
                      <span style={{ fontSize: 12.5, lineHeight: 1.55, color: PX.ink, overflowWrap: 'anywhere' }}>{m.body}</span>
                      <span style={{ justifySelf: 'end', fontSize: 10.5, fontWeight: 650, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
                        {timeOf(m.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'grid', gap: 8, minWidth: 0, paddingTop: 12, borderTop: `1px solid ${PX.line}` }}>
            <label htmlFor="advisor-message" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3 }}>
              Nuovo messaggio
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', minWidth: 0 }}>
              <textarea
                id="advisor-message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Scrivi un messaggio…"
                rows={2}
                style={{
                  flex: '1 1 320px', minWidth: 0, padding: '9px 11px', borderRadius: PX.rCtl,
                  border: `1px solid ${PX.line2}`, background: PX.l1, color: PX.ink,
                  fontFamily: PX.sans, fontSize: 12.5, lineHeight: 1.55, resize: 'vertical',
                }}
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !draft.trim()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '0 14px',
                  borderRadius: PX.rCtl, border: `1px solid ${PX.violetEdge}`,
                  background: draft.trim() ? PX.violetTint : PX.l2,
                  color: draft.trim() ? PX.violet700 : PX.inkMute,
                  fontFamily: PX.sans, fontSize: 12.5, fontWeight: 700,
                  cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                <SendHorizontal size={14} strokeWidth={2.2} aria-hidden="true" />
                {sending ? 'Invio…' : 'Invia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Region>
  );
}
