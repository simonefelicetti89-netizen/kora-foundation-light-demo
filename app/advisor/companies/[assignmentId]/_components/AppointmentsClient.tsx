'use client';

// KORA-WP-064 (second pass) — Appointments as a real scheduling workspace.
//
// FIRST-PASS DEFECT: a flat list of boxes, and reschedule driven by three
// stacked window.prompt() calls — acceptable as a port, not as Product.
//
// NOW: month calendar + agenda over the SAME canonical appointment set, a
// selected-appointment context panel, and an inline WP-125-native reschedule
// form. Every field it edits is one the existing API already accepts
// (reason, newStartsAt, newEndsAt, optional newSubject) — nothing invented,
// no scheduling engine, no calendar integration, no new endpoint. Below the
// rail breakpoint the calendar yields to an agenda, because a miniature month
// grid is not a usable phone control.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { CalendarDays, List, ChevronLeft, ChevronRight, Check, X, CalendarClock } from 'lucide-react';
import { PX } from '@/lib/design/kora-design-tokens';
import { Workspace, Col, Region, Status, StateBlock, SkeletonRows, Notice, DateField } from '@/components/ui/px';
import { STATUS_LABEL, type Appointment } from '../_lib';

const TONE: Record<Appointment['status'], 'ok' | 'warn' | 'risk' | 'info' | 'idle'> = {
  requested: 'info', confirmed: 'ok', completed: 'idle',
  rescheduled: 'warn', cancelled: 'risk', 'no-show': 'risk',
};

const DOT: Record<Appointment['status'], string> = {
  requested: PX.info, confirmed: PX.ok, completed: PX.inkMute,
  rescheduled: PX.warn, cancelled: PX.risk, 'no-show': PX.risk,
};

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false });
};
const longDay = (key: string) => {
  const d = new Date(`${key}T12:00:00`);
  return Number.isNaN(d.getTime()) ? key : d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
};
const MONTH_LABEL = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

/** Visible Product time is 24h everywhere. The native <input type="time">
 *  renders AM/PM from the BROWSER locale, which produced "09:57 PM" next to a
 *  "21:57" thread — so the two time fields are semantic text inputs pinned to
 *  HH:MM. Stored instants are untouched: the form still composes an ISO string
 *  from the local date + 24h time exactly as before. */
const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/** Split an ISO instant into the two values the form edits. */
const splitIso = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

export function AppointmentsClient({ assignmentId }: { assignmentId: string }) {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState('');
  // Agenda-first on a phone: below WP-125's OWN rail breakpoint (1200px, the
  // same number app/globals.css uses to collapse main+rail) a month grid stops
  // being a usable control, so the agenda is the landing view. No new
  // breakpoint is introduced, and both views stay available at every width.
  const [view, setView] = useState<'calendar' | 'agenda'>(
    () => (typeof window !== 'undefined' && window.matchMedia('(max-width: 1200px)').matches ? 'agenda' : 'calendar'),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });

  // reschedule form (inline, progressive disclosure — no modal system invented)
  const [editing, setEditing] = useState<string | null>(null);
  const [fDate, setFDate] = useState(''); const [fStart, setFStart] = useState(''); const [fEnd, setFEnd] = useState('');
  const [fSubject, setFSubject] = useState(''); const [fReason, setFReason] = useState('');
  const [busy, setBusy] = useState(false);
  // cancel also needs a reason — same inline treatment, never a prompt
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cReason, setCReason] = useState('');

  const load = useCallback(() => {
    fetch(`/api/advisor/companies/${assignmentId}/appointments`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAppointments(d.ok ? (d.appointments ?? []) : []))
      .catch(() => setAppointments([]));
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  const list = useMemo(
    () => [...(appointments ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [appointments],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of list) {
      const k = dayKey(a.startsAt);
      if (!k) continue;
      map.set(k, [...(map.get(k) ?? []), a]);
    }
    return map;
  }, [list]);

  const selected = list.find((a) => a.id === selectedId) ?? null;

  async function post(appointmentId: string, body: Record<string, string>) {
    setBusy(true); setError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/appointments/${appointmentId}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) { setEditing(null); setCancelling(null); setCReason(''); load(); }
      else setError(d.error ?? 'Operazione non riuscita.');
    } catch {
      setError('Errore di rete.');
    } finally {
      setBusy(false);
    }
  }

  function openReschedule(a: Appointment) {
    const s = splitIso(a.startsAt); const e = splitIso(a.endsAt);
    setFDate(s.date); setFStart(s.time); setFEnd(e.time);
    setFSubject(a.subject); setFReason('');
    setCancelling(null); setEditing(a.id);
  }

  function submitReschedule(a: Appointment) {
    if (!fDate || !HHMM.test(fStart) || !HHMM.test(fEnd) || !fReason.trim()) return;
    const startsAt = new Date(`${fDate}T${fStart}`).toISOString();
    const endsAt = new Date(`${fDate}T${fEnd}`).toISOString();
    const body: Record<string, string> = { action: 'reschedule', reason: fReason, startsAt, endsAt };
    if (fSubject.trim() && fSubject.trim() !== a.subject) body.subject = fSubject.trim();
    post(a.id, body);
  }

  // ── month grid ──────────────────────────────────────────────────────────
  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7;           // Monday-first
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: Array<{ key: string; day: number } | null> = Array(offset).fill(null);
    for (let d = 1; d <= days; d += 1) {
      cells.push({ key: `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const todayKey = dayKey(new Date().toISOString());

  const ctl: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 28, padding: '0 10px',
    borderRadius: PX.rCtl, border: `1px solid ${PX.line2}`, background: PX.l1, color: PX.ink2,
    fontFamily: PX.sans, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  };
  const field: React.CSSProperties = {
    width: '100%', minWidth: 0, padding: '8px 10px', borderRadius: PX.rCtl,
    border: `1px solid ${PX.line2}`, background: PX.l1, color: PX.ink, fontFamily: PX.sans, fontSize: 12.5,
  };

  const appointmentRow = (a: Appointment, withDate: boolean) => {
    const isSel = selectedId === a.id;
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => setSelectedId(a.id)}
        aria-pressed={isSel}
        style={{
          display: 'flex', alignItems: 'baseline', gap: 10, width: '100%', textAlign: 'left',
          padding: '9px 11px', minWidth: 0, cursor: 'pointer',
          borderRadius: PX.rInner,
          border: `1px solid ${isSel ? PX.violetEdge : PX.line}`,
          background: isSel ? PX.violetTint : PX.l1,
          fontFamily: PX.sans,
        }}
      >
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: PX.rPill, background: DOT[a.status], flex: 'none' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: PX.ink2, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
          {withDate ? `${longDay(dayKey(a.startsAt))} · ` : ''}{timeOf(a.startsAt)}–{timeOf(a.endsAt)}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 650, color: PX.ink, minWidth: 0, overflowWrap: 'anywhere' }}>{a.subject}</span>
        <span style={{ marginLeft: 'auto', flex: 'none' }}>
          <Status tone={TONE[a.status]}>{STATUS_LABEL[a.status]}</Status>
        </span>
      </button>
    );
  };

  /** The contextual panel §17 asks for: what is selected, and what can I do
   *  about it. Actions live here instead of expanding every row inline. */
  const detailPanel = () => {
    if (!selected) {
      return (
        <Region label="Appuntamento selezionato">
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: PX.ink3, fontFamily: PX.sans }}>
            Seleziona un appuntamento dal calendario o dall’agenda per vederne il dettaglio e agire:
            conferma, riprogrammazione o annullamento.
          </p>
        </Region>
      );
    }
    const a = selected;
    return (
      <Region label="Appuntamento selezionato">
        <div style={{ display: 'grid', gap: 11, minWidth: 0, fontFamily: PX.sans }}>
          <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 750, letterSpacing: '-0.01em', color: PX.ink, overflowWrap: 'anywhere' }}>{a.subject}</span>
            <span style={{ fontSize: 12, fontWeight: 650, color: PX.ink2, fontVariantNumeric: 'tabular-nums' }}>
              {longDay(dayKey(a.startsAt))}
            </span>
            <span style={{ fontSize: 12, fontWeight: 650, color: PX.ink2, fontVariantNumeric: 'tabular-nums' }}>
              {timeOf(a.startsAt)} – {timeOf(a.endsAt)}
            </span>
            <span style={{ marginTop: 2 }}><Status tone={TONE[a.status]}>{STATUS_LABEL[a.status]}</Status></span>
          </div>

          {a.rescheduledFromId && (
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, lineHeight: 1.5, color: PX.ink3 }}>
              Riprogrammato da un appuntamento precedente — la lineage è conservata.
            </p>
          )}

          {(a.status === 'requested' || a.status === 'confirmed') && editing !== a.id && cancelling !== a.id && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {a.status === 'requested' && (
                <button type="button" style={{ ...ctl, borderColor: PX.violetEdge, background: PX.violetTint, color: PX.violet700 }}
                  onClick={() => post(a.id, { action: 'confirm' })} disabled={busy}>
                  <Check size={14} strokeWidth={2.4} aria-hidden="true" /> Conferma
                </button>
              )}
              <button type="button" style={ctl} onClick={() => openReschedule(a)} disabled={busy}>
                <CalendarClock size={14} strokeWidth={2.2} aria-hidden="true" /> Riprogramma
              </button>
              <button type="button" style={ctl} onClick={() => { setEditing(null); setCReason(''); setCancelling(a.id); }} disabled={busy}>
                <X size={14} strokeWidth={2.2} aria-hidden="true" /> Annulla
              </button>
            </div>
          )}

          {editing === a.id && (
            <div style={{ display: 'grid', gap: 9, minWidth: 0, paddingTop: 9, borderTop: `1px solid ${PX.line}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3 }}>
                Riprogramma appuntamento
              </span>
              <DateField label="Nuova data" value={fDate} onChange={setFDate} required />
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', minWidth: 0 }}>
                <label style={{ display: 'grid', gap: 5, flex: '1 1 110px', fontSize: 12.5, fontWeight: 700, color: PX.ink2 }}>
                  Inizio * <span style={{ fontWeight: 600, color: PX.ink3 }}>(24h)</span>
                  <input
                    value={fStart}
                    onChange={(e) => setFStart(e.target.value)}
                    inputMode="numeric"
                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                    placeholder="HH:MM"
                    maxLength={5}
                    aria-invalid={fStart !== '' && !HHMM.test(fStart)}
                    style={{ ...field, fontVariantNumeric: 'tabular-nums' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 5, flex: '1 1 110px', fontSize: 12.5, fontWeight: 700, color: PX.ink2 }}>
                  Fine * <span style={{ fontWeight: 600, color: PX.ink3 }}>(24h)</span>
                  <input
                    value={fEnd}
                    onChange={(e) => setFEnd(e.target.value)}
                    inputMode="numeric"
                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                    placeholder="HH:MM"
                    maxLength={5}
                    aria-invalid={fEnd !== '' && !HHMM.test(fEnd)}
                    style={{ ...field, fontVariantNumeric: 'tabular-nums' }}
                  />
                </label>
              </div>
              <label style={{ display: 'grid', gap: 5, fontSize: 12.5, fontWeight: 700, color: PX.ink2 }}>
                Oggetto
                <input value={fSubject} onChange={(e) => setFSubject(e.target.value)} style={field} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12.5, fontWeight: 700, color: PX.ink2 }}>
                Motivo *
                <input value={fReason} onChange={(e) => setFReason(e.target.value)} placeholder="Perché viene spostato" style={field} />
              </label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <button type="button" disabled={busy || !fDate || !HHMM.test(fStart) || !HHMM.test(fEnd) || !fReason.trim()}
                  onClick={() => submitReschedule(a)}
                  style={{ ...ctl, minHeight: 32, borderColor: PX.violetEdge, background: PX.violetTint, color: PX.violet700,
                    cursor: busy || !fReason.trim() ? 'not-allowed' : 'pointer' }}>
                  {busy ? 'Salvataggio…' : 'Salva nuova data'}
                </button>
                <button type="button" style={{ ...ctl, minHeight: 32 }} onClick={() => setEditing(null)} disabled={busy}>Annulla modifica</button>
              </div>
            </div>
          )}

          {cancelling === a.id && (
            <div style={{ display: 'grid', gap: 9, minWidth: 0, paddingTop: 9, borderTop: `1px solid ${PX.line}` }}>
              <label style={{ display: 'grid', gap: 5, fontSize: 12.5, fontWeight: 700, color: PX.ink2 }}>
                Motivo dell’annullamento *
                <input value={cReason} onChange={(e) => setCReason(e.target.value)} placeholder="Perché viene annullato" style={field} />
              </label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <button type="button" disabled={busy || !cReason.trim()}
                  onClick={() => post(a.id, { action: 'cancel', reason: cReason })}
                  style={{ ...ctl, minHeight: 32, borderColor: PX.violetEdge, background: PX.violetTint, color: PX.violet700,
                    cursor: busy || !cReason.trim() ? 'not-allowed' : 'pointer' }}>
                  Conferma annullamento
                </button>
                <button type="button" style={{ ...ctl, minHeight: 32 }} onClick={() => setCancelling(null)} disabled={busy}>Indietro</button>
              </div>
            </div>
          )}
        </div>
      </Region>
    );
  };

  if (appointments === null) return <Region label="Appuntamenti"><SkeletonRows rows={4} rowHeight={46} /></Region>;

  const monthDays = grid.filter(Boolean).length;
  const monthCount = grid.reduce((n, c) => n + (c ? (byDay.get(c.key)?.length ?? 0) : 0), 0);

  return (
    <Workspace>
      <Col span="main">
      {error && <Notice tone="risk">{error}</Notice>}

      <Region
        label={view === 'calendar' ? `Calendario — ${MONTH_LABEL(cursor.y, cursor.m)}` : 'Agenda appuntamenti'}
        actions={
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
            {view === 'calendar' && (
              <span style={{ display: 'flex', gap: 3 }}>
                <button type="button" aria-label="Mese precedente" style={{ ...ctl, padding: '0 7px' }}
                  onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>
                  <ChevronLeft size={14} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <button type="button" aria-label="Mese successivo" style={{ ...ctl, padding: '0 7px' }}
                  onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>
                  <ChevronRight size={14} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </span>
            )}
            <span style={{ display: 'flex', gap: 2, padding: 2, borderRadius: PX.rCtl, background: PX.l2, border: `1px solid ${PX.line}` }}>
              {([['calendar', 'Calendario', CalendarDays], ['agenda', 'Agenda', List]] as const).map(([v, label, Icon]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 9px', borderRadius: 5,
                    border: 0, cursor: 'pointer', fontFamily: PX.sans, fontSize: 11.5, fontWeight: view === v ? 750 : 650,
                    background: view === v ? PX.l1 : 'transparent', color: view === v ? PX.ink : PX.ink3,
                    boxShadow: view === v ? PX.sh1 : 'none',
                  }}
                >
                  <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </span>
          </div>
        }
      >
        {list.length === 0 ? (
          <StateBlock
            title="Nessun appuntamento ancora"
            body="Gli appuntamenti richiesti da questa Company compaiono qui. Puoi confermarli, riprogrammarli o annullarli: ogni passaggio resta tracciato, e una riprogrammazione conserva il legame con l’appuntamento originale."
          />
        ) : view === 'calendar' ? (
          <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
            {/* month grid — hidden below the rail breakpoint by the shared rule */}
            <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4 }}>
                {['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'].map((d) => (
                  <span key={d} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: PX.ink3, padding: '0 2px' }}>{d}</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4 }}>
                {grid.map((cell, i) => {
                  if (!cell) return <span key={`x${i}`} style={{ minHeight: 62 }} />;
                  const items = byDay.get(cell.key) ?? [];
                  const isToday = cell.key === todayKey;
                  const hasSel = items.some((a) => a.id === selectedId);
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => items[0] && setSelectedId(items[0].id === selectedId ? null : items[0].id)}
                      disabled={items.length === 0}
                      style={{
                        display: 'grid', gap: 4, alignContent: 'start', minHeight: 62, padding: '5px 6px', minWidth: 0,
                        borderRadius: PX.rInner, textAlign: 'left', fontFamily: PX.sans,
                        border: `1px solid ${hasSel ? PX.violetEdge : isToday ? PX.line2 : PX.line}`,
                        background: hasSel ? PX.violetTint : items.length ? PX.l1 : PX.l2,
                        cursor: items.length ? 'pointer' : 'default',
                      }}
                    >
                      <span style={{
                        fontSize: 11.5, fontWeight: isToday ? 800 : 650,
                        color: items.length ? PX.ink : PX.ink3, fontVariantNumeric: 'tabular-nums',
                      }}>
                        {cell.day}
                      </span>
                      <span style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {items.slice(0, 4).map((a) => (
                          <span key={a.id} aria-hidden="true" style={{ width: 6, height: 6, borderRadius: PX.rPill, background: DOT[a.status] }} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: PX.ink3, fontFamily: PX.sans }}>
                {monthCount === 0
                  ? `Nessun appuntamento in ${MONTH_LABEL(cursor.y, cursor.m)} — usa le frecce o l’agenda per vedere gli altri mesi.`
                  : `${monthCount} ${monthCount === 1 ? 'appuntamento' : 'appuntamenti'} in questo mese su ${monthDays} giorni.`}
              </p>
            </div>

            {/* the same canonical set, always reachable — and the only view on a phone */}
            <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              {list.map((a) => appointmentRow(a, true))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
            {[...byDay.keys()].sort().map((k) => (
              <div key={k} style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: k === todayKey ? PX.violet700 : PX.ink3, fontFamily: PX.sans,
                }}>
                  {longDay(k)}{k === todayKey ? ' · oggi' : ''}
                </span>
                {(byDay.get(k) ?? []).map((a) => appointmentRow(a, false))}
              </div>
            ))}
          </div>
        )}
      </Region>

      </Col>
      <Col span="rail">{detailPanel()}</Col>
    </Workspace>
  );
}
