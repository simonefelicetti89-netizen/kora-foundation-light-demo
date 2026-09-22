'use client';

// KORA-WP-064 (final pass) — the Company overview as an OPERATIONAL landing.
//
// The two earlier passes made this page navigation only: first six stacked
// links, then six tiles. Inside ONE assignment the existing per-assignment
// endpoints can honestly answer "what is happening here", so the page now
// leads with attention and what is coming, and keeps navigation underneath.
//
// FETCH DISCIPLINE (§7). Exactly four existing GETs are called, and every one
// of them backs a visible operational signal:
//   appointments → what needs confirming, and what is next
//   cases        → what is open or in progress
//   koral-review → what is waiting for confirmation
//   messages     → when the conversation last moved
// Notes and Review assessments stay navigation-only: the first has no
// actionable state, and the second cannot be summarised at all without a
// Review reference (no Review-listing endpoint exists anywhere in KORA).
// No aggregate is invented, no count is manufactured, and nothing here fans
// out across other Companies.

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquare, CalendarDays, FileText, Briefcase, ClipboardCheck, Sparkles, ChevronRight,
} from 'lucide-react';
import { PX } from '@/lib/design/kora-design-tokens';
import { Region, Status, SkeletonRows } from '@/components/ui/px';
import {
  COMPANY_SECTIONS, sectionHref, STATUS_LABEL,
  type Appointment, type OperationalCaseItem, type ContactMessage, type KoralReviewSubjects,
} from '../_lib';

const AREA: Record<string, { purpose: string; Icon: typeof MessageSquare }> = {
  messaggi:       { purpose: 'Il canale scritto con i referenti', Icon: MessageSquare },
  appuntamenti:   { purpose: 'Richieste, conferme, riprogrammazioni', Icon: CalendarDays },
  note:           { purpose: 'Note, riferimenti riservati e verbali', Icon: FileText },
  case:           { purpose: 'Questioni operative aperte e risolte', Icon: Briefcase },
  valutazioni:    { purpose: 'Valutazioni sulla sufficienza delle evidenze', Icon: ClipboardCheck },
  'koral-review': { purpose: 'Conferma e interpretazione delle trasformazioni', Icon: Sparkles },
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

export function OverviewClient({ assignmentId }: { assignmentId: string }) {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [cases, setCases] = useState<OperationalCaseItem[] | null>(null);
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [koral, setKoral] = useState<KoralReviewSubjects | null>(null);
  // Captured when the data arrives, never read during render: "upcoming" is a
  // property of the answer we received, not of the moment React re-renders.
  const [now, setNow] = useState(0);

  const load = useCallback(() => {
    const get = (path: string) =>
      fetch(`/api/advisor/companies/${assignmentId}/${path}`, { credentials: 'include' })
        .then((r) => r.json())
        .catch(() => ({ ok: false }));
    get('appointments').then((d) => { setNow(Date.now()); setAppointments(d.ok ? (d.appointments ?? []) : []); });
    get('cases').then((d) => setCases(d.ok ? (d.cases ?? []) : []));
    get('messages').then((d) => setMessages(d.ok ? (d.messages ?? []) : []));
    get('koral-review').then((d) => setKoral(d.ok
      ? { recognizedForInterpretation: d.subjects?.recognizedForInterpretation ?? [], eligibleForConfirmation: d.subjects?.eligibleForConfirmation ?? [] }
      : { recognizedForInterpretation: [], eligibleForConfirmation: [] }));
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  const ready = appointments !== null && cases !== null && messages !== null && koral !== null;

  const toConfirm = (appointments ?? []).filter((a) => a.status === 'requested');
  const upcoming = (appointments ?? [])
    .filter((a) => (a.status === 'confirmed' || a.status === 'requested') && new Date(a.startsAt).getTime() >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const openCases = (cases ?? []).filter((c) => c.status === 'open' || c.status === 'in-progress');
  const koralToConfirm = koral?.eligibleForConfirmation ?? [];
  const lastMessage = (messages ?? []).slice(-1)[0] ?? null;

  /** Only real, currently-true items. An empty list is an honest calm state. */
  const attention: Array<{ key: string; label: string; detail: string; href: string; tone: 'warn' | 'info' }> = [];
  if (toConfirm.length > 0) {
    attention.push({
      key: 'appt',
      label: toConfirm.length === 1 ? '1 appuntamento da confermare' : `${toConfirm.length} appuntamenti da confermare`,
      detail: toConfirm.map((a) => a.subject).slice(0, 2).join(' · '),
      href: sectionHref(assignmentId, 'appuntamenti'), tone: 'warn',
    });
  }
  if (openCases.length > 0) {
    attention.push({
      key: 'cases',
      label: openCases.length === 1 ? '1 Case da lavorare' : `${openCases.length} Case da lavorare`,
      detail: openCases.map((c) => c.subject).slice(0, 2).join(' · '),
      href: sectionHref(assignmentId, 'case'), tone: 'info',
    });
  }
  if (koralToConfirm.length > 0) {
    attention.push({
      key: 'koral',
      label: koralToConfirm.length === 1 ? '1 trasformazione da confermare' : `${koralToConfirm.length} trasformazioni da confermare`,
      detail: koralToConfirm.map((m) => m.category).slice(0, 2).join(' · '),
      href: sectionHref(assignmentId, 'koral-review'), tone: 'warn',
    });
  }

  const COUNTS: Record<string, string | undefined> = ready ? {
    appuntamenti: upcoming.length ? `${upcoming.length} in programma` : undefined,
    case: openCases.length ? `${openCases.length} da lavorare` : undefined,
    'koral-review': koralToConfirm.length ? `${koralToConfirm.length} da confermare` : undefined,
    messaggi: lastMessage ? `ultimo ${day(lastMessage.createdAt)}` : undefined,
  } : {};

  if (!ready) return <SkeletonRows rows={6} rowHeight={46} />;

  return (
    <div style={{ display: 'grid', gap: 15, minWidth: 0 }}>
      <Region label={attention.length > 0 ? 'Richiede attenzione' : 'Stato corrente'}>
        {attention.length === 0 ? (
          <p style={{ margin: 0, maxWidth: '82ch', fontSize: 12.5, lineHeight: 1.6, color: PX.ink2, fontFamily: PX.sans }}>
            Nessuna azione aperta su questa Company: nessun appuntamento da confermare, nessun Case da lavorare e
            nessuna trasformazione in attesa di conferma.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 7, minWidth: 0 }}>
            {attention.map((a) => (
              <Link
                key={a.key}
                href={a.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', minWidth: 0,
                  borderRadius: PX.rInner, border: `1px solid ${a.tone === 'warn' ? PX.warnTint : PX.line}`,
                  background: a.tone === 'warn' ? PX.warnTint : PX.l1, textDecoration: 'none', fontFamily: PX.sans,
                }}
              >
                <span style={{ display: 'grid', gap: 2, minWidth: 0, flex: '1 1 auto' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 750, color: PX.ink }}>{a.label}</span>
                  {a.detail && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: PX.ink3, minWidth: 0, overflowWrap: 'anywhere' }}>{a.detail}</span>
                  )}
                </span>
                <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" style={{ color: PX.ink3, flex: 'none' }} />
              </Link>
            ))}
          </div>
        )}
      </Region>

      <Region label="In programma">
        {upcoming.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: PX.ink3, fontFamily: PX.sans }}>
            Nessun appuntamento futuro con questa Company.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            {upcoming.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                href={sectionHref(assignmentId, 'appuntamenti')}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 10, padding: '9px 11px', minWidth: 0,
                  borderRadius: PX.rInner, border: `1px solid ${PX.line}`, background: PX.l1,
                  textDecoration: 'none', fontFamily: PX.sans,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: PX.ink2, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
                  {when(a.startsAt)}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 650, color: PX.ink, minWidth: 0, overflowWrap: 'anywhere' }}>{a.subject}</span>
                <span style={{ marginLeft: 'auto', flex: 'none' }}>
                  <Status tone={a.status === 'confirmed' ? 'ok' : 'info'}>{STATUS_LABEL[a.status]}</Status>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Region>

      <div style={{ display: 'grid', gap: 9, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3, fontFamily: PX.sans }}>
          Aree di lavoro
        </span>
        <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fit, minmax(252px, 1fr))', minWidth: 0 }}>
          {COMPANY_SECTIONS.filter((s) => s.slug).map((s) => {
            const a = AREA[s.slug];
            const count = COUNTS[s.slug];
            return (
              <Link
                key={s.slug}
                href={sectionHref(assignmentId, s.slug)}
                style={{
                  display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 12px', minWidth: 0,
                  borderRadius: PX.rInner, border: `1px solid ${PX.line}`, background: PX.l1,
                  textDecoration: 'none', fontFamily: PX.sans,
                }}
              >
                <span aria-hidden="true" style={{
                  display: 'grid', placeItems: 'center', width: 27, height: 27, flex: 'none',
                  borderRadius: PX.rInner, background: PX.violetTint, color: PX.violet700,
                }}>
                  <a.Icon size={15} strokeWidth={2.1} />
                </span>
                <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 7, alignItems: 'baseline', flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 750, letterSpacing: '-0.008em', color: PX.ink }}>{s.label}</span>
                    {count && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: PX.violet700, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                    )}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, color: PX.ink3, overflowWrap: 'anywhere' }}>{a.purpose}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
