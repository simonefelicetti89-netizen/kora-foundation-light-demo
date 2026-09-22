'use client';

// KORA-WP-064 — Operational Cases, moved out of the monolith. The Case model
// and its lifecycle belong to KORA-WP-034: only the two canonical transitions
// the original surface exposed — "Avvia" (open → in-progress) and "Risolvi"
// (in-progress → resolved, with an optional resolution note) — are ported.
// No new case model, no new lifecycle state, no escalation UI invented here.

import { useEffect, useState, useCallback } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';
import { Play, CheckCircle2, Plus } from 'lucide-react';
import { Region, Status, SkeletonRows, Notice } from '@/components/ui/px';
import { formatStamp, CASE_STATUS_LABEL, type CaseStatus, type OperationalCaseItem } from '../_lib';

const TONE: Record<CaseStatus, 'ok' | 'warn' | 'risk' | 'info' | 'idle'> = {
  open: 'info', 'in-progress': 'warn', blocked: 'risk', resolved: 'ok', escalated: 'risk',
};

export function CasesClient({ assignmentId }: { assignmentId: string }) {
  const [cases, setCases] = useState<OperationalCaseItem[] | null>(null);
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [composing, setComposing] = useState(false);
  // Resolution note is captured inline, never through window.prompt.
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const load = useCallback(() => {
    fetch(`/api/advisor/companies/${assignmentId}/cases`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setCases(d.ok ? (d.cases ?? []) : []))
      .catch(() => setCases([]));
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!subject.trim()) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/cases`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject }),
      });
      const d = await r.json();
      if (d.ok) { setSubject(''); setComposing(false); load(); } else setError(d.error ?? 'Creazione non riuscita.');
    } catch {
      setError('Errore di rete.');
    } finally {
      setSaving(false);
    }
  }

  async function transition(caseId: string, newStatus: CaseStatus, note?: string) {
    const body: Record<string, string> = { status: newStatus };
    if (newStatus === 'resolved' && note?.trim()) body.resolutionNote = note.trim();
    setError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/cases/${caseId}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) { setResolving(null); setResolutionNote(''); load(); }
      else setError(d.error ?? 'Operazione non riuscita.');
    } catch {
      setError('Errore di rete.');
    }
  }

  const ctl: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 27, padding: '0 10px',
    borderRadius: PX.rCtl, border: `1px solid ${PX.line2}`, background: PX.l1, color: PX.ink2,
    fontFamily: PX.sans, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  };
  const field: React.CSSProperties = {
    width: '100%', minWidth: 0, padding: '8px 10px', borderRadius: PX.rCtl,
    border: `1px solid ${PX.line2}`, background: PX.l1, color: PX.ink, fontFamily: PX.sans, fontSize: 12.5,
  };

  const all = cases ?? [];
  // Groups follow the EXISTING lifecycle values only — nothing new is invented.
  const GROUPS: Array<{ key: string; label: string; empty: string; match: (c: OperationalCaseItem) => boolean }> = [
    { key: 'attivi',   label: 'Da lavorare',         empty: 'Nessun Case aperto o in corso.',        match: (c) => c.status === 'open' || c.status === 'in-progress' },
    { key: 'bloccati', label: 'Bloccati o escalati', empty: 'Nessun Case bloccato o escalato.',      match: (c) => c.status === 'blocked' || c.status === 'escalated' },
    { key: 'chiusi',   label: 'Risolti',             empty: 'Nessun Case risolto finora.',           match: (c) => c.status === 'resolved' },
  ];

  const caseRow = (c: OperationalCaseItem) => (
    <div key={c.id} style={{ display: 'grid', gap: 0, minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', minWidth: 0,
        padding: '9px 11px', borderRadius: PX.rInner, border: `1px solid ${PX.line}`, background: PX.l1, fontFamily: PX.sans,
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: PX.ink, minWidth: 0, overflowWrap: 'anywhere' }}>{c.subject}</span>
        <span style={{ fontSize: 11, fontWeight: 650, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
          {formatStamp(c.createdAt)}{c.priority ? ` · ${c.priority}` : ''}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <Status tone={TONE[c.status]}>{CASE_STATUS_LABEL[c.status]}</Status>
          {c.status === 'open' && (
            <button type="button" style={ctl} onClick={() => transition(c.id, 'in-progress')}>
              <Play size={13} strokeWidth={2.4} aria-hidden="true" /> Avvia
            </button>
          )}
          {c.status === 'in-progress' && resolving !== c.id && (
            <button type="button" style={ctl} onClick={() => { setResolutionNote(''); setResolving(c.id); }}>
              <CheckCircle2 size={13} strokeWidth={2.2} aria-hidden="true" /> Risolvi
            </button>
          )}
        </span>
      </div>

      {c.resolutionNote && (
        <p style={{ margin: '5px 0 0 11px', fontSize: 11.5, lineHeight: 1.55, color: PX.ink3, fontFamily: PX.sans, overflowWrap: 'anywhere' }}>
          Risoluzione: {c.resolutionNote}
        </p>
      )}

      {resolving === c.id && (
        <div style={{
          display: 'grid', gap: 8, marginTop: 6, padding: '10px 12px', minWidth: 0,
          borderRadius: PX.rInner, border: `1px solid ${PX.violetEdge}`, background: PX.violetTint,
        }}>
          <label style={{ display: 'grid', gap: 5, fontSize: 12.5, fontWeight: 700, color: PX.ink2, fontFamily: PX.sans }}>
            Nota di risoluzione (facoltativa)
            <input value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Come è stato risolto" style={field} />
          </label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button type="button" style={{ ...ctl, borderColor: PX.violetEdge, background: PX.l1, color: PX.violet700 }}
              onClick={() => transition(c.id, 'resolved', resolutionNote)}>
              Conferma risoluzione
            </button>
            <button type="button" style={ctl} onClick={() => setResolving(null)}>Indietro</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Region
      label="Case operativi"
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
          {composing ? 'Chiudi' : 'Apri Case'}
        </button>
      }
    >
      <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
        {error && <Notice tone="risk">{error}</Notice>}

        {composing && (
          <div style={{
            display: 'grid', gap: 8, padding: '11px 12px', minWidth: 0,
            borderRadius: PX.rInner, border: `1px solid ${PX.violetEdge}`, background: PX.violetTint,
          }}>
            <input aria-label="Oggetto del nuovo Case" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="Oggetto del nuovo Case…" style={field} />
            <button type="button" onClick={create} disabled={saving || !subject.trim()}
              style={{ ...ctl, minHeight: 31, borderColor: PX.violetEdge, background: PX.l1,
                color: subject.trim() ? PX.violet700 : PX.inkMute,
                cursor: saving || !subject.trim() ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Creazione…' : 'Apri Case'}
            </button>
          </div>
        )}

        {cases === null ? (
          <SkeletonRows rows={4} rowHeight={42} />
        ) : (
          /* The lifecycle structure stays visible even when a stage is empty:
             it is real workflow truth (open → in corso → risolto), not filler,
             and it tells the Advisor where a Case will appear next. */
          <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
            {all.length === 0 && (
              <p style={{ margin: 0, maxWidth: '82ch', fontSize: 12.5, lineHeight: 1.6, color: PX.ink2, fontFamily: PX.sans }}>
                Un Case tiene traccia di una questione operativa con questa Company: si apre, passa in corso quando la
                prendi in carico e si chiude con una nota di risoluzione. Non ce n’è ancora nessuno.
              </p>
            )}
            {GROUPS.map((g) => {
              const items = all.filter(g.match);
              return (
                <div key={g.key} style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                      color: items.length ? PX.ink2 : PX.ink3, fontFamily: PX.sans,
                    }}>
                      {g.label}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 19, height: 19, padding: '0 6px', borderRadius: PX.rPill,
                      background: items.length ? PX.inkWash : 'transparent',
                      border: `1px solid ${items.length ? PX.line : PX.line}`,
                      fontSize: 11, fontWeight: 750, color: items.length ? PX.ink2 : PX.ink3,
                      fontFamily: PX.sans, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {items.length}
                    </span>
                    <span style={{ flex: 1, height: 1, background: PX.line, minWidth: 12 }} />
                  </div>
                  {items.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: PX.ink3, fontFamily: PX.sans }}>
                      {g.empty}
                    </p>
                  ) : (
                    items.map(caseRow)
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Region>
  );
}
