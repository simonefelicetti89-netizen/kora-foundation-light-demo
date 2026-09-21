// app/advisor/page.tsx
// KORA-WP-030 — Advisor self-view. Read-only: own Identity/Profile and own
// Role Qualifications (doc 76 §7A "Self scope" — no organisation Assignment
// needed). Server component, no client fetch, no API route — the trusted
// authUserId comes only from requireAdvisorUser(), never a request param.
//
// No edit controls: qualification creation/status changes are a governed
// capability (doc 76 §4), service-role/KORA_ADMIN only — out of this WP's
// UI scope entirely (Step 27/18 of this WP's own authorization).
//
// SCOPE BOUNDARY, ENFORCED BY THIS WP'S OWN TEST: the Assignment concept
// belongs to KORA-WP-031/033 and its surface is /advisor/companies. This page
// therefore names the Company area and links to it, and reads no assignment
// record — a WP-125 draft that rendered assigned Companies here was reverted
// for exactly that reason.
//
// KORA-WP-125 Product Experience convergence (2026-09-20), micro-polish pass
// (2026-09-21): PRESENTATION ONLY. The Advisor workspace answers one question
// — "what am I qualified for, and what does that open?" — so the page is
// composed as that chain: a qualification band that shows each canonical role
// against the canonical qualification lifecycle (doc 76 §4's own seven-value
// vocabulary, already exported by the service), then identity, the entry to
// the Company area, and the rules that govern both. Every value below already
// came from getAdvisorIdentityByAuthUserId() and
// listRoleQualificationsForAdvisor(). No new capability, no fabricated metric.

import Link from 'next/link';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { PX } from '@/lib/design/kora-design-tokens';
import {
  PageHead, Workspace, Col, Band, SplitRegion, SplitPart, Region,
  Facts, StateBlock, Status, Notice,
} from '@/components/ui/px';
import {
  getAdvisorIdentityByAuthUserId,
  listRoleQualificationsForAdvisor,
  type QualificationStatus,
} from '@/lib/advisor-identity/advisor-identity-service';

const IDENTITY_STATUS_LABEL: Record<string, string> = {
  candidate_onboarding: 'In fase di onboarding',
  active: 'Attivo',
  unavailable: 'Non disponibile',
  globally_suspended: 'Sospeso',
  inactive_offboarded: 'Non più attivo',
};

const IDENTITY_TONE: Record<string, 'ok' | 'warn' | 'risk' | 'idle'> = {
  candidate_onboarding: 'info' as never,
  active: 'ok',
  unavailable: 'warn',
  globally_suspended: 'risk',
  inactive_offboarded: 'idle',
};

const QUALIFICATION_STATUS_LABEL: Record<QualificationStatus, string> = {
  CANDIDATE: 'Candidato',
  'QUALIFICATION IN PROGRESS': 'Qualificazione in corso',
  QUALIFIED: 'Qualificato',
  'RENEWAL DUE': 'Rinnovo in scadenza',
  EXPIRED: 'Scaduto',
  SUSPENDED: 'Sospeso',
  REVOKED: 'Revocato',
};

const QUALIFICATION_TONE: Record<QualificationStatus, 'ok' | 'warn' | 'risk' | 'info' | 'idle'> = {
  CANDIDATE: 'info',
  'QUALIFICATION IN PROGRESS': 'info',
  QUALIFIED: 'ok',
  'RENEWAL DUE': 'warn',
  EXPIRED: 'risk',
  SUSPENDED: 'risk',
  REVOKED: 'idle',
};

/** The two roles the schema itself permits (migration 057 CHECK constraint). */
const CANONICAL_ROLES = ['Company Advisor', 'Partner Advisor'] as const;

const ROLE_MEANING: Record<(typeof CANONICAL_ROLES)[number], string> = {
  'Company Advisor': 'Abilita il lavoro sul contesto di attivazione di una Company.',
  'Partner Advisor': 'Abilita il lavoro sul perimetro Partner dell\'ecosistema KORA.',
};

/** The progressive part of doc 76 §4's qualification vocabulary, in order.
 *  The remaining four values (RENEWAL DUE / EXPIRED / SUSPENDED / REVOKED) are
 *  not steps — they are states a granted qualification can move into, so they
 *  are shown as the current position rather than as a further stage. */
const LIFECYCLE: QualificationStatus[] = ['CANDIDATE', 'QUALIFICATION IN PROGRESS', 'QUALIFIED'];

/** The four states a granted qualification can be moved into — the rest of
 *  doc 76 §4's vocabulary. Named here so the governance region states them
 *  from the canonical list rather than from prose. */
const POST_GRANT_STATES: QualificationStatus[] = ['RENEWAL DUE', 'EXPIRED', 'SUSPENDED', 'REVOKED'];

type StageState = 'done' | 'current' | 'pending' | 'alert';

/** Where this role currently sits in the lifecycle. Derived only from the
 *  stored status — nothing is projected and no date is extrapolated. */
function lifecycleStages(status: QualificationStatus | null): Array<{ label: string; state: StageState }> {
  if (status === null) {
    return LIFECYCLE.map((s) => ({ label: QUALIFICATION_STATUS_LABEL[s], state: 'pending' as StageState }));
  }
  const reached = LIFECYCLE.indexOf(status);
  if (reached >= 0) {
    return LIFECYCLE.map((s, i) => ({
      label: QUALIFICATION_STATUS_LABEL[s],
      state: i < reached ? 'done' : i === reached ? 'current' : 'pending',
    }));
  }
  // A post-grant state: the progressive path was completed, and the current
  // position is the state the qualification has moved into.
  return [
    ...LIFECYCLE.map((s) => ({ label: QUALIFICATION_STATUS_LABEL[s], state: 'done' as StageState })),
    { label: QUALIFICATION_STATUS_LABEL[status], state: 'alert' as StageState },
  ];
}

const STAGE_DOT: Record<StageState, { fill: string; ring: string }> = {
  done:    { fill: PX.ok,      ring: PX.okTint },
  current: { fill: PX.violet,  ring: PX.violetTint },
  pending: { fill: PX.inkMute, ring: PX.inkWash },
  alert:   { fill: PX.warn,    ring: PX.warnTint },
};

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

// Local, server-safe date formatting: every px primitive is a client module,
// so its formatter cannot be executed during this server render.
function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export default async function AdvisorProfilePage() {
  const auth = await requireAdvisorUser();
  if (isKoraAuthError(auth)) {
    return (
      <Region>
        <StateBlock
          title="Accesso non autorizzato"
          body="Questa area è riservata agli Advisor KORA. Accedi con un account Advisor per continuare."
        />
      </Region>
    );
  }

  const identity = await getAdvisorIdentityByAuthUserId(auth.id);

  if (!identity) {
    return (
      <>
        <PageHead
          eyebrow="Advisor"
          title="Profilo non ancora attivato"
          lead="Il tuo profilo Advisor esiste come account ma non è ancora stato attivato da KORA."
        />
        <Workspace>
          <Col span="main">
            <Region label="Stato attivazione">
              <StateBlock
                tone="pending"
                title="Attivazione in attesa di KORA"
                body="L'attivazione di un profilo Advisor è una decisione di governance esplicita: non avviene automaticamente al primo accesso. Contatta l'amministrazione KORA per completarla."
              />
            </Region>
          </Col>
          <Col span="rail">
            <Region label="Perché questa area è vuota">
              <Notice tone="info">
                Nessuna qualifica o azione è disponibile finché l&apos;identità Advisor non è
                registrata da KORA. Nessun dato è stato perso.
              </Notice>
            </Region>
          </Col>
        </Workspace>
      </>
    );
  }

  const qualifications = await listRoleQualificationsForAdvisor(identity.id);
  const qualified = qualifications.filter((q) => q.status === 'QUALIFIED');
  const attention = qualifications.filter((q) => q.status === 'RENEWAL DUE' || q.status === 'EXPIRED' || q.status === 'SUSPENDED');
  const identityTone = IDENTITY_TONE[identity.status] ?? 'idle';

  return (
    <>
      <PageHead
        eyebrow="Advisor"
        title={identity.fullName}
        lead="Qualifica di ruolo, stato corrente e conseguenza operativa: questa è l'abilitazione che KORA ha registrato per te."
        meta={
          <>
            <Status tone={identityTone as 'ok'}>{IDENTITY_STATUS_LABEL[identity.status] ?? identity.status}</Status>
            {qualified.length > 0 && (
              <Status tone="ok">{qualified.length === 1 ? '1 ruolo qualificato' : `${qualified.length} ruoli qualificati`}</Status>
            )}
            {attention.length > 0 && (
              <Status tone="warn">{attention.length === 1 ? '1 qualifica da rivedere' : `${attention.length} qualifiche da rivedere`}</Status>
            )}
          </>
        }
      />

      {/* KORA-WP-125 final acceptance pass (2026-09-21): ONE Product object,
          not four. The Advisor workspace is a single system —
          identità → qualifica → stato → conseguenza → chi decide — and it is
          now composed as one surface with four labelled regions instead of a
          band plus three detached cards floating in the canvas.
          Nothing was added to fill space: the regions carry exactly the same
          facts as before (identity record, both canonical role
          qualifications with their lifecycle and dates, the entry to the
          Company area, the governance rules). The only change is that they
          are related to each other instead of sitting apart. */}
      <Workspace>
        <Band>
          {/* .px-col is a grid with a 20px gap, so a Band with several
              children renders them as separate stacked blocks. This surface
              is ONE object with four regions divided by rules, not four
              blocks, so everything below lives in a single child. The shared
              primitive is untouched — Partner's accepted bands keep their
              current rendering. */}
          <div>
          {/* ── Provenance strip: who KORA says you are ──────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '13px 18px', borderBottom: `1px solid ${PX.line}` }}>
            <span
              aria-hidden="true"
              style={{
                width: 38, height: 38, borderRadius: PX.rInner, flex: 'none',
                display: 'grid', placeItems: 'center',
                background: `linear-gradient(135deg, ${PX.violet}, ${PX.violet700})`,
                color: PX.onViolet, fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em',
              }}
            >
              {initials(identity.fullName)}
            </span>
            <span style={{ minWidth: 0, flex: '1 1 220px' }}>
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3 }}>
                Identità registrata da KORA
              </span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 13, fontWeight: 700, color: PX.ink, overflowWrap: 'anywhere' }}>
                {auth.email}
              </span>
            </span>
            {([
              ['Stato identità', IDENTITY_STATUS_LABEL[identity.status] ?? identity.status],
              ['Registrata il', shortDate(identity.createdAt)],
              ['Ultimo aggiornamento', shortDate(identity.updatedAt)],
            ] as Array<[string, string]>).map(([label, value]) => (
              <span key={label} style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3 }}>{label}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 12.5, fontWeight: 700, color: PX.ink }}>{value}</span>
              </span>
            ))}
          </div>

          {/* ── The dominant region: the two canonical role qualifications ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 18px', borderBottom: `1px solid ${PX.line}`, background: PX.l2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3 }}>
              Qualifiche di ruolo
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: PX.ink3 }}>
              {qualified.length} di {CANONICAL_ROLES.length} ruoli qualificati
            </span>
          </div>

          {/* The two canonical Advisor roles are a schema-level CHECK constraint
              (migration 057: role IN ('Company Advisor','Partner Advisor')).
              Showing BOTH, each with its real state, is more truthful than
              listing only the rows that happen to exist: an absent
              qualification is a governance fact, not a missing record. */}
          <SplitRegion columns={2}>
            {CANONICAL_ROLES.map((role) => {
              const q = qualifications.find((x) => x.role === role) ?? null;
              const stages = lifecycleStages(q?.status ?? null);
              return (
                <SplitPart key={role}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ minWidth: 0, flex: '1 1 150px', fontSize: 15, fontWeight: 750, letterSpacing: '-0.012em', color: q ? PX.ink : PX.ink2 }}>
                      {role}
                    </span>
                    {q ? (
                      <Status tone={QUALIFICATION_TONE[q.status] ?? 'idle'}>
                        {QUALIFICATION_STATUS_LABEL[q.status] ?? q.status}
                      </Status>
                    ) : (
                      <Status tone="idle">Non registrata</Status>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 14px', fontSize: 12, fontWeight: 500, lineHeight: 1.55, color: PX.ink3 }}>
                    {ROLE_MEANING[role]}
                  </p>

                  <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {stages.map((stage, i) => {
                      const dot = STAGE_DOT[stage.state];
                      const last = i === stages.length - 1;
                      return (
                        <li key={stage.label} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', columnGap: 11 }}>
                          <span aria-hidden="true" style={{ display: 'grid', justifyItems: 'center' }}>
                            <span style={{
                              width: 14, height: 14, borderRadius: PX.rPill, display: 'grid', placeItems: 'center',
                              background: dot.ring, border: `1px solid ${dot.fill}`,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: PX.rPill, background: dot.fill }} />
                            </span>
                            {!last && <span style={{ width: 1, minHeight: 18, flex: 1, background: PX.line2 }} />}
                          </span>
                          <span style={{
                            display: 'block', paddingBottom: last ? 0 : 9,
                            fontSize: 12.5, lineHeight: 1.35,
                            fontWeight: stage.state === 'current' || stage.state === 'alert' ? 750 : 600,
                            color: stage.state === 'pending' ? PX.inkMute : PX.ink,
                          }}>
                            {stage.label}
                            {(stage.state === 'current' || stage.state === 'alert') && (
                              <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 700, color: stage.state === 'alert' ? PX.warnText : PX.violet700 }}>
                                stato corrente
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PX.line}` }}>
                    {q ? (
                      <Facts
                        rows={[
                          ['Registrata il', shortDate(q.createdAt)],
                          ['Ultimo aggiornamento', shortDate(q.updatedAt)],
                          ['Effetto operativo', q.status === 'QUALIFIED'
                            ? 'Attivo'
                            : 'Nessuno finché lo stato non è Qualificato'],
                        ]}
                      />
                    ) : (
                      <Facts
                        rows={[
                          ['Registrata il', '—'],
                          ['Ultimo aggiornamento', '—'],
                          ['Effetto operativo', 'Nessuno'],
                        ]}
                      />
                    )}
                  </div>
                </SplitPart>
              );
            })}
          </SplitRegion>

          {/* ── The consequence layer: what the qualification opens, and who
                 controls it. These are not two more cards — they are the two
                 halves of the same governance statement, attached to the
                 qualifications they depend on. ─────────────────────────── */}
          <div style={{ borderTop: `1px solid ${PX.line}`, background: PX.l2 }}>
            <SplitRegion columns={2}>
              <SplitPart label="Conseguenza operativa">
                <p style={{ margin: '0 0 13px', fontSize: 12.5, lineHeight: 1.6, color: PX.ink2 }}>
                  {qualified.some((q) => q.role === 'Company Advisor')
                    ? 'La tua qualifica Company Advisor è attiva: puoi lavorare sulle Company che KORA ti affida, nella loro area dedicata.'
                    : 'Senza una qualifica Company Advisor attiva, l’area Company resta raggiungibile ma non ti affida alcun contesto di lavoro.'}
                </p>
                <Link
                  href="/advisor/companies"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px',
                    borderRadius: PX.rCtl, fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
                    background: `linear-gradient(180deg, ${PX.btnFrom}, ${PX.btnTo})`,
                    color: PX.onViolet, boxShadow: PX.btnShadow,
                  }}
                >
                  Apri l&apos;area Company
                </Link>
                <p style={{ margin: '13px 0 0', paddingTop: 11, borderTop: `1px solid ${PX.line}`, fontSize: 11.5, lineHeight: 1.6, color: PX.ink3 }}>
                  L&apos;abbinamento a una Company è creato da KORA, mai richiesto dall&apos;Advisor, ed
                  è ricalcolato a ogni lettura a partire da identità, qualifica e prerequisiti registrati.
                </p>
              </SplitPart>

              <SplitPart label="Chi decide, e come può cambiare">
                {/* Each statement is what the services actually enforce:
                    grantAdvisorRoleQualification() is KORA_ADMIN-only,
                    updateAdvisorRoleQualificationStatus() records a governance
                    event for every transition, and this surface has no write
                    path of any kind. */}
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
                  {[
                    'La concessione di una qualifica è una decisione esplicita di KORA: il completamento dell’Academy non la concede e non è possibile auto-concedersela.',
                    'Ogni passaggio di stato è registrato come evento di governance, con il suo autore e il suo momento.',
                    'Questa è una vista di sola lettura: nessuna azione su identità o qualifiche è disponibile qui.',
                  ].map((rule) => (
                    <li key={rule} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.55, color: PX.ink2 }}>
                      <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: PX.rPill, background: PX.violet, flex: 'none', marginTop: 6 }} />
                      <span style={{ minWidth: 0 }}>{rule}</span>
                    </li>
                  ))}
                </ul>
                <p style={{ margin: '13px 0 0', paddingTop: 11, borderTop: `1px solid ${PX.line}`, fontSize: 11.5, lineHeight: 1.6, color: PX.ink3 }}>
                  Una qualifica concessa può essere portata da KORA a{' '}
                  {POST_GRANT_STATES.map((s) => QUALIFICATION_STATUS_LABEL[s].toLowerCase()).join(', ')}.
                  Ogni stato resta agli atti.
                </p>
              </SplitPart>
            </SplitRegion>
          </div>
          </div>
        </Band>
      </Workspace>
    </>
  );
}
