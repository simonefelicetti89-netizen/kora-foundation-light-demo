'use client';

// app/admin/advisor-governance/page.tsx
// KORA-WP-032 — Advisor Governance: Qualification Grant, Manual First-Pilot.
// KORA-WP-039 — Advisor Academy Interface: prerequisite-eligibility surface.
//
// Admin-only governance surface (file 102: "UI: Admin grant UI (minimal)").
// Lists Advisors and their role qualifications; offers a single "Concedi"
// action per qualification currently eligible for grant, and — added by
// WP-039 — lets a KORA_ADMIN read and record the prerequisite eligibility
// each qualification depends on. No revoke, no suspension, no mass action, no
// automated/policy-based grant — every click is one explicit, single
// governance decision (doc 81 §11). No Assignment, no Company linkage, no
// case/task/calendar UI of any kind.
//
// WP-039 changes nothing about WP-032's grant semantics: the grant-eligible
// status set, the single-decision model and the endpoint it calls are
// unchanged. Prerequisite eligibility is a SEPARATE governed record — it does
// not gate the grant button, because createAdvisorAssignment() is explicit
// that an Assignment persists before it is valid and validity is evaluated
// dynamically (KORA-WP-031). Recording a prerequisite here therefore informs
// the operator; it never silently authorises or blocks anything.
//
// ── PRODUCT EXPERIENCE, AFTER KORA-WP-125 ────────────────────────────────────
// WP-039 first shipped its own route-local visual system (signal.module.css +
// signal-tokens.module.css) for one reason only: PX-B did not exist yet, and
// Founder decision D2 forbade a global design system at that time. PX-B now
// exists, is implemented and is Founder-accepted as KORA-WP-125
// (commit 0bc14f6e, acceptance 2026-09-21), so those adapters are deleted and
// this route consumes the canonical shared foundation instead: PageHead,
// Workspace/Col, Region, PxDataTable, Status, Notice, Metric, StateBlock,
// SkeletonRows, DateField, Button and Field. No second design system, no
// copy of the WP-125 tokens, no page-local colour value.
//
// This route is also the FIRST REAL CONSUMER of two WP-125 primitives whose
// visual validation that package deliberately deferred for want of one:
//   · PxDataTable — the governance queue, which is exactly the container the
//     primitive exists for (WP-039's own D1/D2 defect class);
//   · DateField   — the two verification dates, which is exactly the
//     browser-locale defect class D5.
//
// Protected by app/admin/layout.tsx's requireKoraAdmin() guard.

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import {
  PageHead, Workspace, Col, Region, Metric, MetricStrip,
  Status, Notice, SkeletonRows, StateBlock, InlineSpinner,
  PxDataTable, DateField, Facts, type PxColumn,
} from '@/components/ui/px';
import { Button } from '@/components/ui/Button';
import { FieldInput, FieldSelect } from '@/components/ui/Field';
import { PX } from '@/lib/design/kora-design-tokens';
import {
  daysUntilExpiry,
  derivePrerequisiteDisplayState,
  formatDate,
  formatDateTime,
  PREREQUISITE_STATE_LABEL,
  PREREQUISITE_STATE_TONE,
  type PrerequisiteDisplayState,
  type PrerequisiteEligibilityView,
  type PrerequisiteStatus,
} from './prerequisite-state';

interface Qualification {
  id: string;
  role: 'Company Advisor' | 'Partner Advisor';
  status: string;
}

interface Advisor {
  id: string;
  fullName: string;
  status: string;
  qualifications: Qualification[];
}

interface Row {
  advisor: Advisor;
  qualification: Qualification;
}

const GRANT_ELIGIBLE = new Set(['CANDIDATE', 'QUALIFICATION IN PROGRESS', 'RENEWAL DUE', 'EXPIRED']);

/** A prerequisite inside this window is still valid but needs attention. */
const EXPIRY_WARNING_DAYS = 30;

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'risk' | 'info' | 'idle'> = {
  QUALIFIED: 'ok',
  'RENEWAL DUE': 'warn',
  EXPIRED: 'risk',
  SUSPENDED: 'risk',
  REVOKED: 'idle',
  CANDIDATE: 'info',
  'QUALIFICATION IN PROGRESS': 'info',
};

type Feedback = { tone: 'ok' | 'warn' | 'risk' | 'info'; text: string } | null;

export default function AdvisorGovernancePage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [eligibility, setEligibility] = useState<Record<string, PrerequisiteEligibilityView | null>>({});
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/advisor-governance', { credentials: 'include' });
      const d = await r.json();
      if (!d.ok) {
        setErrorMsg(d.error ?? 'Errore nel caricamento.');
        setState('error');
        return;
      }
      setAdvisors(d.advisors);
      setState('loaded');

      const ids: string[] = (d.advisors as Advisor[]).flatMap((a) => a.qualifications.map((q) => q.id));
      if (ids.length === 0) {
        setEligibility({});
        return;
      }
      const pr = await fetch(
        `/api/admin/advisor-prerequisites?qualificationIds=${encodeURIComponent(ids.join(','))}`,
        { credentials: 'include' },
      );
      const pd = await pr.json();
      // A prerequisite read that fails must not blank the governance list:
      // the qualifications are still authoritative and still actionable.
      if (pd.ok) setEligibility(pd.eligibility);
      else setFeedback({ tone: 'warn', text: pd.error ?? 'Requisiti non disponibili in questo momento.' });
    } catch {
      setErrorMsg('Errore di rete.');
      setState('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  async function grant(qualificationId: string) {
    setGrantingId(qualificationId);
    setFeedback(null);
    try {
      const r = await fetch('/api/admin/advisor-governance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qualificationId }),
      });
      const d = await r.json();
      if (d.ok) setFeedback({ tone: 'ok', text: 'Qualifica concessa. La decisione è registrata nel log di governance.' });
      else setFeedback({ tone: 'risk', text: d.error ?? 'Concessione non riuscita.' });
      await load();
    } catch {
      setFeedback({ tone: 'risk', text: 'Errore di rete durante la concessione. Riprova.' });
    } finally {
      setGrantingId(null);
    }
  }

  const rows: Row[] = useMemo(
    () => advisors.flatMap((advisor) => advisor.qualifications.map((qualification) => ({ advisor, qualification }))),
    [advisors],
  );

  const selected = useMemo(
    () => rows.find((r) => r.qualification.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const summary = useMemo(() => {
    let expired = 0;
    let absent = 0;
    let met = 0;
    for (const row of rows) {
      switch (derivePrerequisiteDisplayState(eligibility[row.qualification.id])) {
        case 'EXPIRED': expired += 1; break;
        case 'ABSENT': absent += 1; break;
        case 'MET': met += 1; break;
        default: break;
      }
    }
    const pending = rows.filter((r) => GRANT_ELIGIBLE.has(r.qualification.status)).length;
    const attention = rows.filter((r) => r.qualification.status === 'RENEWAL DUE' || r.qualification.status === 'EXPIRED').length;
    return { advisors: advisors.length, qualifications: rows.length, pending, attention, expired, absent, met };
  }, [advisors.length, rows, eligibility]);

  // Declared here rather than inline so the column contract — what each column
  // needs before the table stops being worth rendering — is readable as one
  // object. Below the sum of these widths the shared primitive becomes a
  // record list; it never squeezes a governance status until it is unreadable.
  const columns: PxColumn<Row>[] = [
    {
      // hideInRecords: below the table width the advisor name IS the record
      // title, so repeating it as a field would state the same value twice.
      // The title carries the same real button, so selection stays reachable
      // by keyboard in both renderings.
      key: 'advisor', header: 'Advisor', minWidth: 125, grow: 2, truncate: true, hideInRecords: true,
      render: (row) => <SelectRowButton row={row} onSelect={setSelectedId} truncate />,
    },
    {
      key: 'role', header: 'Ruolo', minWidth: 100, grow: 1,
      render: ({ qualification }) => <span style={{ color: PX.ink3 }}>{qualification.role}</span>,
    },
    {
      // 150 is what the longest canonical status — QUALIFICATION IN PROGRESS —
      // needs to wrap at a word boundary instead of inside the word. The
      // shared Status primitive deliberately wraps rather than truncating, so
      // the column has to be wide enough for that to read well.
      key: 'qualification', header: 'Stato qualifica', minWidth: 150, grow: 1,
      render: ({ qualification }) => (
        <Status tone={STATUS_TONE[qualification.status] ?? 'idle'}>{qualification.status}</Status>
      ),
    },
    {
      key: 'prerequisite', header: 'Requisito', minWidth: 150, grow: 1,
      render: ({ qualification }) => {
        const el = eligibility[qualification.id] ?? null;
        const display = derivePrerequisiteDisplayState(el);
        return (
          <span style={{ display: 'grid', gap: 3, justifyItems: 'start' }}>
            <PrerequisiteState display={display} />
            <span style={{ fontSize: 11, fontWeight: 600, color: PX.ink3 }}>
              Scadenza {formatDate(el?.expiryDate)}
            </span>
          </span>
        );
      },
    },
    {
      // 115, not 95: the column must be able to pay for the control it
      // contains, or the button wraps mid-word — the exact D1 defect this
      // route reported. The five widths sum to 640, which the 768 tablet
      // workspace (~655 usable) can still pay for, so the tablet keeps a real
      // table and only the phone falls back to records. The shared primitive
      // honours these widths or stops rendering as a table at all.
      key: 'action', header: 'Azione', minWidth: 115, align: 'right',
      render: ({ qualification }) =>
        GRANT_ELIGIBLE.has(qualification.status) ? (
          <Button
            variant="primary"
            size="sm"
            style={{ whiteSpace: 'nowrap' }}
            onClick={(e) => { e.stopPropagation(); grant(qualification.id); }}
            disabled={grantingId === qualification.id}
          >
            {grantingId === qualification.id ? <><InlineSpinner size={14} />Concessione…</> : 'Concedi'}
          </Button>
        ) : (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: PX.inkMute }}>—</span>
        ),
    },
  ];

  return (
    <>
      <PageHead
        eyebrow="Advisor Governance"
        title="Qualifiche e requisiti Advisor"
        lead="Ogni concessione è una decisione di governance singola ed esplicita. Non esiste alcuna concessione automatica: il completamento dell'Academy non concede la qualifica, e un Advisor non può auto-concedersi o auto-approvarsi."
        meta={
          state === 'loaded' ? (
            <>
              <Status tone={summary.pending > 0 ? 'info' : 'idle'}>
                {summary.pending === 1 ? '1 decisione in attesa' : `${summary.pending} decisioni in attesa`}
              </Status>
              <Status tone={summary.expired > 0 ? 'risk' : 'idle'}>
                {summary.expired === 1 ? '1 requisito scaduto' : `${summary.expired} requisiti scaduti`}
              </Status>
              <Status tone="idle">{summary.advisors === 1 ? '1 Advisor' : `${summary.advisors} Advisor`}</Status>
            </>
          ) : undefined
        }
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setState('loading'); setFeedback(null); load(); }}
            disabled={state === 'loading'}
          >
            <RefreshCw size={14} strokeWidth={2.2} aria-hidden="true" />
            Aggiorna
          </Button>
        }
      />

      {feedback && (
        <div style={{ marginBottom: 'var(--px-gap)' }}>
          <Notice tone={feedback.tone}>{feedback.text}</Notice>
        </div>
      )}

      {/* KORA-WP-039 D4 — the dead area was a composition fault, not a data
          shortage: an 8-row queue in a 788px column beside a ~1150px rail
          leaves the lower half of the working column empty by construction.
          The queue is the primary governance object, so it takes the full
          measure; the decision detail and the queue state then sit side by
          side beneath it, each roughly the height of the other. */}
      <Workspace>
        <Col span="full">
          <Region
            label="Coda di qualificazione"
            padded={false}
            actions={state === 'loaded' ? (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
                {summary.qualifications} qualifiche · {summary.advisors} Advisor
              </span>
            ) : undefined}
          >
            {state === 'loading' && <SkeletonRows rows={6} rowHeight={42} label="Caricamento delle qualifiche in corso." />}

            {state === 'error' && (
              <div style={{ padding: '16px 18px' }}><Notice tone="risk">{errorMsg}</Notice></div>
            )}

            {state === 'loaded' && rows.length === 0 && (
              <StateBlock
                title="Nessuna qualifica da governare"
                body="Non risulta alcun Advisor con una qualifica di ruolo registrata. Le qualifiche compaiono qui quando un Advisor viene censito nel registro KORA."
              />
            )}

            {state === 'loaded' && rows.length > 0 && (
              <PxDataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.qualification.id}
                recordTitle={(r) => <SelectRowButton row={r} onSelect={setSelectedId} />}
                selectedKey={selectedId}
                onSelect={(r) => setSelectedId(r.qualification.id)}
                caption="Seleziona una riga per leggere e registrare il requisito di eleggibilità."
              />
            )}
          </Region>
        </Col>

        <Col span={7}>
          <PrerequisitePanel
            key={selectedId ?? 'none'}
            selected={selected}
            eligibility={selected ? eligibility[selected.qualification.id] ?? null : null}
            onSaved={(saved) => {
              setEligibility((prev) => ({ ...prev, [saved.roleQualificationId]: saved }));
              setFeedback({ tone: 'ok', text: 'Requisito registrato. La decisione è tracciata nel log di governance.' });
            }}
            onError={(text) => setFeedback({ tone: 'risk', text })}
          />
        </Col>

        <Col span={5}>
          <Region label="Stato della coda">
            <MetricStrip>
              <Metric label="In attesa" value={state === 'loaded' ? summary.pending : '—'} hint="decisioni concedibili" />
              <Metric label="Requisiti OK" value={state === 'loaded' ? summary.met : '—'} hint="verifica valida" />
              <Metric label="Scaduti" value={state === 'loaded' ? summary.expired : '—'} hint="da riverificare" tone={summary.expired === 0 ? 'mute' : 'ink'} />
              <Metric label="Mai registrati" value={state === 'loaded' ? summary.absent : '—'} hint="nessuna verifica" tone={summary.absent === 0 ? 'mute' : 'ink'} />
            </MetricStrip>
            {state === 'loaded' && summary.expired > 0 && (
              <div style={{ marginTop: 12 }}>
                <Notice tone="risk">
                  {summary.expired === 1 ? 'Un requisito risulta scaduto' : `${summary.expired} requisiti risultano scaduti`}.
                  Un requisito scaduto resta registrato ma non è più soddisfatto: la validità di
                  un&apos;assegnazione che vi dipende decade fino a nuova verifica.
                </Notice>
              </div>
            )}
            {state === 'loaded' && summary.expired === 0 && summary.attention > 0 && (
              <div style={{ marginTop: 12 }}>
                <Notice tone="warn">
                  {summary.attention === 1 ? 'Una qualifica è in rinnovo o scaduta' : `${summary.attention} qualifiche sono in rinnovo o scadute`}.
                  Una qualifica scaduta resta agli atti ma non è più valida finché non viene concessa di nuovo.
                </Notice>
              </div>
            )}
          </Region>

          <Region label="Regola di governance">
            <Notice tone="info">
              Una concessione è una decisione esplicita e singola: nessun percorso automatico o basato su
              policy esiste in questa superficie. Il requisito di eleggibilità è un record separato dalla
              qualifica: registrarlo non concede e non toglie alcuna qualifica, perché la validità di
              un&apos;assegnazione è sempre valutata in modo dinamico al momento della lettura.
            </Notice>
          </Region>
        </Col>
      </Workspace>
    </>
  );
}

// ── Prerequisite panel: the selected record plus its decision control ──────

interface PrerequisitePanelProps {
  selected: Row | null;
  eligibility: PrerequisiteEligibilityView | null;
  onSaved: (saved: PrerequisiteEligibilityView) => void;
  onError: (text: string) => void;
}

// Mounted with key={selectedId} by the parent, so selecting another
// qualification remounts the form with that record's values. That is the
// React-idiomatic reset — no effect writes state back into itself.
function PrerequisitePanel({ selected, eligibility, onSaved, onError }: PrerequisitePanelProps) {
  const [status, setStatus] = useState<PrerequisiteStatus>(eligibility?.status ?? 'MET');
  const [sourceReference, setSourceReference] = useState(eligibility?.sourceReference ?? '');
  const [effectiveDate, setEffectiveDate] = useState(() => toDateInput(eligibility?.effectiveDate));
  const [expiryDate, setExpiryDate] = useState(() => toDateInput(eligibility?.expiryDate));
  const [saving, setSaving] = useState(false);

  const qualificationId = selected?.qualification.id ?? null;

  if (!selected) {
    return (
      <Region label="Requisito di eleggibilità" padded={false}>
        <StateBlock
          title="Nessuna qualifica selezionata"
          body="Seleziona una qualifica nell'elenco per leggerne il requisito di eleggibilità e registrarne la verifica."
        />
      </Region>
    );
  }

  const display = derivePrerequisiteDisplayState(eligibility);
  const remaining = daysUntilExpiry(eligibility);
  const rangeInvalid = Boolean(effectiveDate && expiryDate && expiryDate < effectiveDate);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (rangeInvalid || !qualificationId) return;
    setSaving(true);
    try {
      const r = await fetch('/api/admin/advisor-prerequisites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleQualificationId: qualificationId,
          status,
          sourceReference: sourceReference.trim() || null,
          effectiveDate: effectiveDate || null,
          expiryDate: expiryDate || null,
        }),
      });
      const d = await r.json();
      if (d.ok) onSaved(d.eligibility as PrerequisiteEligibilityView);
      else onError(d.error ?? 'Registrazione del requisito non riuscita.');
    } catch {
      onError('Errore di rete durante la registrazione del requisito. Riprova.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Region
      label="Requisito di eleggibilità"
      actions={<PrerequisiteState display={display} />}
    >
      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 750, letterSpacing: '-0.012em', color: PX.ink, overflowWrap: 'anywhere' }}>
        {selected.advisor.fullName}
      </p>
      <p style={{ margin: '2px 0 13px', fontSize: 11.5, fontWeight: 600, color: PX.ink3 }}>
        {selected.qualification.role} · {selected.qualification.status}
      </p>

      <Facts
        rows={[
          ['Stato registrato', eligibility ? eligibility.status : '—'],
          ['Evidenza', eligibility?.sourceReference || '—'],
          ['Efficacia', formatDate(eligibility?.effectiveDate)],
          ['Scadenza', formatDate(eligibility?.expiryDate)],
          ['Ultima verifica', formatDateTime(eligibility?.lastVerifiedAt)],
          ['Verificato da', eligibility?.verifiedBy || '—'],
        ]}
      />

      {display === 'EXPIRED' && remaining !== null && (
        <div style={{ marginTop: 13 }}>
          <Notice tone="risk">
            Requisito scaduto da {Math.abs(remaining)} giorni. Il record resta agli atti: il requisito
            non è più soddisfatto finché non viene registrata una nuova verifica.
          </Notice>
        </div>
      )}
      {display === 'MET' && remaining !== null && remaining <= EXPIRY_WARNING_DAYS && (
        <div style={{ marginTop: 13 }}>
          <Notice tone="warn">
            Il requisito scade tra {remaining} giorni. Registra una nuova verifica prima della scadenza
            per evitare la decadenza.
          </Notice>
        </div>
      )}

      <form onSubmit={submit} style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${PX.line}`, display: 'grid', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3 }}>
          Registra verifica
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <FieldSelect
            id="prereq-status"
            label="Esito della verifica"
            value={status}
            onChange={(e) => setStatus(e.target.value as PrerequisiteStatus)}
          >
            <option value="MET">MET — requisito soddisfatto</option>
            <option value="NOT_MET">NOT_MET — requisito non soddisfatto</option>
          </FieldSelect>

          <FieldInput
            id="prereq-source"
            label="Riferimento evidenza"
            value={sourceReference}
            onChange={(e) => setSourceReference(e.target.value)}
            placeholder="Es. protocollo, albo, attestato"
          />
        </div>

        {/* DateField, not a bare <input type="date">: the native control is
            kept for keyboard and screen-reader behaviour, but what the
            operator READS is Italian at every browser locale — the D5 defect
            this route measured, now solved by the shared primitive. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <DateField
            id="prereq-effective"
            label="Efficace dal"
            value={effectiveDate}
            onChange={setEffectiveDate}
          />
          <DateField
            id="prereq-expiry"
            label="Scade il"
            value={expiryDate}
            onChange={setExpiryDate}
            hint="Lascia vuoto se il requisito non scade."
            error={rangeInvalid ? 'La data di scadenza non può precedere la data di efficacia.' : undefined}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button type="submit" variant="primary" size="sm" disabled={saving || rangeInvalid}>
            {saving ? (
              <><InlineSpinner size={14} />Registrazione…</>
            ) : (
              <><ShieldCheck size={14} strokeWidth={2.2} aria-hidden="true" />Registra verifica</>
            )}
          </Button>
          <span style={{ fontSize: 11, lineHeight: 1.5, color: PX.ink3, flex: '1 1 160px' }}>
            La registrazione è tracciata con attore, oggetto, esito e data.
          </span>
        </div>
      </form>
    </Region>
  );
}

// ── Presentation atoms ────────────────────────────────────────────────────

// One selection control, used by the table cell AND by the record title, so a
// row is reachable by keyboard in both renderings and the accessible name is
// the same in both. The surrounding row/record also accepts a mouse click —
// that is a convenience, never the only path.
function SelectRowButton({
  row, onSelect, truncate = false,
}: { row: Row; onSelect: (id: string) => void; truncate?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onSelect(row.qualification.id); }}
      title={row.advisor.fullName}
      style={{
        background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer',
        color: PX.ink, fontWeight: 700, textAlign: 'left', maxWidth: '100%',
        ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : null),
      }}
    >
      {row.advisor.fullName}
    </button>
  );
}


// The four display states render through the shared Status primitive, which
// is dot + word by construction (KORA-WP-125 guards that invariant centrally),
// so colour is never the only signal here either.
function PrerequisiteState({ display }: { display: PrerequisiteDisplayState }) {
  return (
    <Status tone={PREREQUISITE_STATE_TONE[display]}>
      {PREREQUISITE_STATE_LABEL[display]}
    </Status>
  );
}

/** ISO timestamp → yyyy-mm-dd for the date control. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
