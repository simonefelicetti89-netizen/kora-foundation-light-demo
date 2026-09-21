'use client';

// app/admin/advisor-governance/page.tsx
// KORA-WP-032 — Advisor Governance: Qualification Grant, Manual First-Pilot.
//
// Admin-only grant surface (file 102: "UI: Admin grant UI (minimal)"). Lists
// Advisors and their role qualifications; offers a single "Concedi" action per
// qualification currently eligible for grant. No revoke, no suspend, no bulk
// action, no automated/policy-based grant — every click is one explicit,
// single governance decision (doc 81 §11). No Assignment, no Company linkage,
// no case/task/calendar UI of any kind.
//
// KORA-WP-125 Product Experience convergence (2026-09-20): PRESENTATION ONLY.
// The governance SEMANTICS are byte-for-byte the ones WP-032 shipped — the
// same GRANT_ELIGIBLE set, the same single-decision POST, the same endpoint,
// the same reload, the same absence of revoke/suspend/bulk. What changed is
// that a governance queue is no longer rendered as a column of oversized card
// slabs: it is a dense, scannable operational table with a summary of the
// real queue state, because an operator scans this surface, they do not read
// it. Qualification/Evidence is the semantically correct grammar here
// (HANDOFF §8B) — status is the record, so status is what the row leads with.
//
// Protected by app/admin/layout.tsx's requireKoraAdmin() guard.

import { useEffect, useState } from 'react';
import {
  PageHead, Workspace, Col, Region, Metric, MetricStrip,
  Status, Notice, SkeletonRows, StateBlock, InlineSpinner,
} from '@/components/ui/px';
import { PX } from '@/lib/design/kora-design-tokens';

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

const GRANT_ELIGIBLE = new Set(['CANDIDATE', 'QUALIFICATION IN PROGRESS', 'RENEWAL DUE', 'EXPIRED']);

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'risk' | 'info' | 'idle'> = {
  QUALIFIED: 'ok',
  'RENEWAL DUE': 'warn',
  EXPIRED: 'risk',
  SUSPENDED: 'risk',
  REVOKED: 'idle',
  CANDIDATE: 'info',
  'QUALIFICATION IN PROGRESS': 'info',
};

export default function AdvisorGovernancePage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'risk'; text: string } | null>(null);

  async function load() {
    try {
      const r = await fetch('/api/admin/advisor-governance', { credentials: 'include' });
      const d = await r.json();
      if (d.ok) {
        setAdvisors(d.advisors);
        setState('loaded');
      } else {
        setErrorMsg(d.error ?? 'Errore nel caricamento.');
        setState('error');
      }
    } catch {
      setErrorMsg('Errore di rete.');
      setState('error');
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

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

  const rows = advisors.flatMap((a) => a.qualifications.map((q) => ({ advisor: a, q })));
  const pending = rows.filter((r) => GRANT_ELIGIBLE.has(r.q.status));
  const qualified = rows.filter((r) => r.q.status === 'QUALIFIED');
  const attention = rows.filter((r) => r.q.status === 'RENEWAL DUE' || r.q.status === 'EXPIRED');

  return (
    <>
      <PageHead
        eyebrow="Advisor Governance"
        title="Concessione qualifiche Advisor"
        lead="Ogni concessione è una decisione di governance singola ed esplicita. Non esiste alcuna concessione automatica: il completamento dell'Academy non concede la qualifica, e un Advisor non può auto-concedersi o auto-approvarsi."
        meta={
          state === 'loaded' ? (
            <>
              <Status tone={pending.length > 0 ? 'info' : 'idle'}>
                {pending.length === 1 ? '1 decisione in attesa' : `${pending.length} decisioni in attesa`}
              </Status>
              <Status tone="idle">{advisors.length === 1 ? '1 Advisor' : `${advisors.length} Advisor`}</Status>
            </>
          ) : undefined
        }
      />

      {feedback && (
        <div style={{ marginBottom: 'var(--px-gap)' }}>
          <Notice tone={feedback.tone}>{feedback.text}</Notice>
        </div>
      )}

      <Workspace>
        <Col span="main">
          <Region
            label="Coda di qualificazione"
            padded={false}
            actions={state === 'loaded' ? (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
                {rows.length} qualifiche
              </span>
            ) : undefined}
          >
            {state === 'loading' && <SkeletonRows rows={6} rowHeight={40} label="Caricamento delle qualifiche in corso." />}

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
              <div style={{ overflowX: 'auto', minWidth: 0 }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, fontFamily: PX.sans }}>
                  <colgroup>
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {['Advisor', 'Ruolo', 'Stato qualifica', ''].map((h, i) => (
                        <th
                          key={h || 'act'}
                          scope="col"
                          style={{
                            position: 'sticky', top: 0, zIndex: 2, background: PX.l2,
                            textAlign: i === 3 ? 'right' : 'left', padding: '9px 14px', whiteSpace: 'nowrap',
                            fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
                            color: PX.ink3, borderBottom: `1px solid ${PX.line2}`,
                          }}
                        >
                          {h || 'Azione'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ advisor, q }) => {
                      const eligible = GRANT_ELIGIBLE.has(q.status);
                      return (
                        <tr key={q.id}>
                          <td style={{ height: 44, padding: '0 14px', borderBottom: `1px solid ${PX.line}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }} title={advisor.fullName}>
                            {advisor.fullName}
                          </td>
                          <td style={{ height: 44, padding: '0 14px', borderBottom: `1px solid ${PX.line}`, color: PX.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.role}
                          </td>
                          <td style={{ height: 44, padding: '0 14px', borderBottom: `1px solid ${PX.line}` }}>
                            <Status tone={STATUS_TONE[q.status] ?? 'idle'}>{q.status}</Status>
                          </td>
                          <td style={{ height: 44, padding: '0 14px', borderBottom: `1px solid ${PX.line}`, textAlign: 'right' }}>
                            {eligible ? (
                              <button
                                type="button"
                                onClick={() => grant(q.id)}
                                disabled={grantingId === q.id}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 7, height: 30, padding: '0 13px',
                                  borderRadius: PX.rCtl, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                                  background: `linear-gradient(180deg, ${PX.btnFrom}, ${PX.btnTo})`,
                                  color: PX.onViolet, border: 0, boxShadow: PX.btnShadow,
                                  cursor: grantingId === q.id ? 'not-allowed' : 'pointer',
                                  opacity: grantingId === q.id ? 0.6 : 1,
                                }}
                              >
                                {grantingId === q.id ? <><InlineSpinner size={14} />Concessione…</> : 'Concedi'}
                              </button>
                            ) : (
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: PX.inkMute }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Region>
        </Col>

        <Col span="rail">
          <Region label="Stato della coda">
            <MetricStrip>
              <Metric label="In attesa" value={state === 'loaded' ? pending.length : '—'} hint="decisioni concedibili" />
              <Metric label="Qualificati" value={state === 'loaded' ? qualified.length : '—'} hint="ruoli attivi" />
              <Metric label="Da rivedere" value={state === 'loaded' ? attention.length : '—'} hint="rinnovo o scadenza" tone={attention.length === 0 ? 'mute' : 'ink'} />
            </MetricStrip>
            {state === 'loaded' && attention.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Notice tone="warn">
                  {attention.length === 1 ? 'Una qualifica è in rinnovo o scaduta' : `${attention.length} qualifiche sono in rinnovo o scadute`}.
                  Una qualifica scaduta resta agli atti ma non è più valida finché non viene concessa di nuovo.
                </Notice>
              </div>
            )}
          </Region>

          <Region label="Regola di governance">
            <Notice tone="info">
              Una concessione è una decisione esplicita e singola: nessun percorso automatico o basato su
              policy esiste in questa superficie. Non sono disponibili revoca, sospensione o azioni massive.
            </Notice>
          </Region>
        </Col>
      </Workspace>
    </>
  );
}
