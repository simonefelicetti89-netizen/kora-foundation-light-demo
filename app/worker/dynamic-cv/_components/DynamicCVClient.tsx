'use client';

// app/worker/dynamic-cv/_components/DynamicCVClient.tsx
// B121: Dynamic Impact CV — client component for the worker's private CV.
// B126: Export & controlled sharing added — printable view + create/revoke share links.
//
// Privacy rules (absolute, non-bypassable):
//   - Fetches from /api/worker/dynamic-cv — workerId always from server session
//   - Displays only this worker's own data
//   - No employer-visible path to this component
//   - No ranking, no score, no percentile, no comparison
//   - cancelled experiences not shown as positive
//   - Share links are worker-controlled, revocable, 30-day default expiry
//   - token_hash never returned or displayed

import { useEffect, useState, useCallback } from 'react';
import type { DynamicCVResponse, CVPillarEntry } from '@/app/api/worker/dynamic-cv/route';
import type { SharesResponse, ShareLinkItem } from '@/app/api/worker/dynamic-cv/shares/route';
import { PILLAR_COLORS, PX, SPACE, typeStyle } from '@/lib/design/kora-design-tokens';
import {
  PageHead, Workspace, Col, Region, Metric, MetricStrip, StateBlock,
  Notice, Status, Chip, Body, Secondary, Caption, Meta, Loading, ErrorState,
} from '@/components/ui/px';
import { PillarDistribution } from './PillarDistribution';




interface DynamicCVClientProps {
  userEmail: string;
}

export function DynamicCVClient({ userEmail: _userEmail }: DynamicCVClientProps) {
  const [data,    setData]    = useState<DynamicCVResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Share state
  const [shares,          setShares]          = useState<ShareLinkItem[]>([]);
  const [sharesLoading,   setSharesLoading]   = useState(false);
  const [creating,        setCreating]        = useState(false);
  const [newShareUrl,     setNewShareUrl]      = useState<string | null>(null);
  const [newShareExpires, setNewShareExpires]  = useState<string | null>(null);
  const [revoking,        setRevoking]        = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/worker/dynamic-cv', { credentials: 'include' })
      .then(r => r.json())
      .then((d: DynamicCVResponse) => {
        if (d.ok) setData(d);
        else setError('Impossibile caricare il CV.');
      })
      .catch(() => setError('Errore di rete.'))
      .finally(() => setLoading(false));
  }, []);

  const loadShares = useCallback(() => {
    setSharesLoading(true);
    fetch('/api/worker/dynamic-cv/shares', { credentials: 'include' })
      .then(r => r.json())
      .then((d: SharesResponse) => { if (d.ok) setShares(d.shares); })
      .catch(() => {/* silent — shares not critical */})
      .finally(() => setSharesLoading(false));
  }, []);

  useEffect(() => { loadShares(); }, [loadShares]);

  const handleCreateShare = useCallback(async () => {
    setCreating(true);
    setNewShareUrl(null);
    try {
      const r = await fetch('/api/worker/dynamic-cv/share', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const d = await r.json();
      if (d.ok && d.shareUrl) {
        setNewShareUrl(d.shareUrl as string);
        setNewShareExpires(d.expiresAt as string);
        loadShares();
      }
    } catch {/* silent */} finally {
      setCreating(false);
    }
  }, [loadShares]);

  const handleRevoke = useCallback(async (shareId: string) => {
    setRevoking(shareId);
    try {
      await fetch(`/api/worker/dynamic-cv/shares/${shareId}/revoke`, {
        method: 'PATCH', credentials: 'include',
      });
      loadShares();
    } catch {/* silent */} finally {
      setRevoking(null);
    }
  }, [loadShares]);

  if (loading) {
    return (
      <Workspace>
        <Col span="full"><Region><Loading label="Caricamento del Dynamic Impact CV." /></Region></Col>
      </Workspace>
    );
  }

  if (error || !data) {
    return (
      <Workspace>
        <Col span="full">
          <Region><ErrorState what={error ?? 'Errore nel caricamento del CV.'} /></Region>
        </Col>
      </Workspace>
    );
  }

  const { profile, summary, pillars, experiences, badgeItems, privateItems, excludedCount, narrative } = data;
  const missingPillarList = pillars.filter((p: CVPillarEntry) => p.total_active === 0);
  const hasExperiences    = experiences.length > 0;
  const hasBadgeItems     = (badgeItems ?? []).length > 0;
  const hasPrivateItems   = (privateItems ?? []).length > 0;
  const excluded          = excludedCount ?? 0;

  const activeShares   = shares.filter(s => s.status === 'active' && !s.isExpired);
  const inactiveShares = shares.filter(s => s.status !== 'active' || s.isExpired);

  // W3B: badge eligibility is a PROPERTY OF AN EXPERIENCE, so it is read on the
  // experience. The legacy surface repeated the same titles in a second list,
  // which made one record look like two and doubled the page for no new fact.
  const badgeIds = new Set((badgeItems ?? []).map(b => b.initiative_id));

  return (
    <Workspace data-testid="dynamic-cv-container">
      <Col span="full">
        <PageHead
          eyebrow="My KORA · Dynamic Impact CV"
          title={profile.displayName ?? 'Il tuo profilo'}
          lead={narrative.headline}
          meta={<Status tone="idle">{profile.roleLabel} · {profile.tenantName}</Status>}
        />
      </Col>

      {/* ── Privacy and selectivity — both non-suppressible, read as one ──── */}
      <Col span="full">
        <Region label="Cosa contiene questo CV, e chi lo vede">
          <div style={{ display: 'grid', gap: SPACE.md }}>
            <div data-testid="dynamic-cv-privacy-banner">
              <Body style={{ margin: 0, color: PX.ink }}>
                <strong>Il tuo datore di lavoro non vede questo CV.</strong>
              </Body>
              <Secondary style={{ margin: `${SPACE.xs}px 0 0`, color: PX.ink2 }}>
                Questo CV non è una valutazione individuale. Non contiene ranking o confronto con colleghi.
                Le esperienze derivano dalla tua partecipazione volontaria alle iniziative KORA Space —{' '}
                <a href="/worker/commons" style={{ color: PX.violet, fontWeight: 600 }}>esplora KORA Space</a>{' '}
                per aggiungerne altre.
              </Secondary>
            </div>

            <div data-testid="dynamic-cv-selectivity-notice">
              <Secondary style={{ margin: 0, color: PX.ink2 }}>
                <strong style={{ color: PX.ink }}>Il Dynamic Impact CV non contiene tutte le Impact Units.</strong>{' '}
                Mostra solo esperienze selezionabili, verificabili e controllate dal lavoratore.
                Il lavoratore decide cosa condividere. Alcune esperienze restano private e non sono suggerite per la condivisione.
              </Secondary>
              {excluded > 0 && (
                <Caption style={{ margin: `${SPACE.xs}px 0 0`, color: PX.ink3 }}>
                  {excluded} {excluded === 1 ? 'esperienza non inclusa' : 'esperienze non incluse'}: compliance, sollievo economico, o categoria sensibile.
                </Caption>
              )}
            </div>
          </div>
        </Region>
      </Col>

      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <Col span="full">
        <div data-testid="dynamic-cv-summary">
          <MetricStrip>
            <Metric label="Attività tracciate" value={summary.totalActivities} />
            <Metric label="Pillar attivi" value={`${summary.activePillars} / 5`} />
            <Metric label="Partecipazioni registrate" value={summary.totalAttended} />
          </MetricStrip>
        </div>
      </Col>

      {/* ── Pillar reading ────────────────────────────────────────────────── */}
      <Col span="main">
        <div style={{ display: 'grid', gap: SPACE.lg }}>
          <Region label="Profilo pillar">
            <div data-testid="dynamic-cv-pillar-profile">
              <PillarDistribution
                rows={pillars.map(p => ({
                  pillar: p.pillar, active: p.total_active,
                  attended: p.attended, registered: p.registered, interested: p.interested,
                }))}
              />
            </div>
          </Region>

          {/* ── Experiences ───────────────────────────────────────────────── */}
          <Region label="Esperienze">
            {!hasExperiences && (
              <div data-testid="dynamic-cv-empty-state">
                <StateBlock
                  title="Nessuna esperienza ancora"
                  body="Partecipa alle iniziative disponibili per costruire il tuo profilo KORA."
                  action={
                    <a href="/worker/opportunities" style={{ fontSize: 14, fontWeight: 600, color: PX.violet, textDecoration: 'none' }}>
                      Esplora iniziative →
                    </a>
                  }
                />
              </div>
            )}

            {hasExperiences && (
              <ul data-testid="dynamic-cv-experiences" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {experiences.map((exp, i) => (
                  <li
                    key={exp.initiative_id}
                    style={{
                      display: 'grid', gap: SPACE.xs, padding: `${SPACE.md}px 0`,
                      borderTop: i === 0 ? 'none' : `1px solid ${PX.line}`, minWidth: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE.sm, flexWrap: 'wrap' }}>
                      <Body as="span" style={{ margin: 0, color: PX.ink, fontWeight: 600, minWidth: 0 }}>{exp.title}</Body>
                      {badgeIds.has(exp.initiative_id) && <Chip>Idonea al badge</Chip>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, flexWrap: 'wrap' }}>
                      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: PX.rPill, flex: 'none', background: PILLAR_COLORS[exp.pillar as keyof typeof PILLAR_COLORS] ?? PX.inkMute }} />
                      <Caption as="span" style={{ margin: 0, color: PX.ink3 }}>{exp.pillar}</Caption>
                      <Caption as="span" style={{ margin: 0, color: PX.ink3 }}>·</Caption>
                      <Caption as="span" style={{ margin: 0, color: PX.ink3 }}>{exp.statusLabel}</Caption>
                      <Caption as="span" style={{ margin: 0, color: PX.ink3 }}>·</Caption>
                      <Caption as="span" style={{ margin: 0, color: PX.ink3 }}>{exp.date}</Caption>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Region>
        </div>
      </Col>

      <Col span="rail">
        <div style={{ display: 'grid', gap: SPACE.lg }}>
          {/* ── Reading of the profile ──────────────────────────────────── */}
          {(narrative.strengths.length > 0 || narrative.emergingAreas.length > 0 || missingPillarList.length > 0) && (
            <Region label="Il tuo profilo">
              <div data-testid="dynamic-cv-narrative" style={{ display: 'grid', gap: SPACE.sm }}>
                {narrative.strengths.map((s, i) => (
                  <Secondary key={`s${i}`} style={{ margin: 0, color: PX.ink2 }}>{s}</Secondary>
                ))}
                {narrative.emergingAreas.map((e, i) => (
                  <Secondary key={`e${i}`} style={{ margin: 0, color: PX.ink2 }}>{e}</Secondary>
                ))}
                {missingPillarList.length > 0 && (
                  <Caption style={{ margin: 0, color: PX.ink3 }}>
                    Aree non ancora esplorate: {missingPillarList.map(p => p.pillar).join(', ')}.
                  </Caption>
                )}
              </div>
            </Region>
          )}

          {/* ── Badge eligibility — stated once, read on each experience ──── */}
          {hasBadgeItems && (
            <Region label="Badge e credenziali">
              <div data-testid="dynamic-cv-badge-section" style={{ display: 'grid', gap: SPACE.sm }}>
                <Secondary style={{ margin: 0, color: PX.ink2 }}>
                  {(badgeItems ?? []).length} idonee al badge
                </Secondary>
                <Secondary style={{ margin: 0, color: PX.ink3 }}>
                  Queste esperienze soddisfano i requisiti di categoria e livello di evidenza per un badge o credenziale.
                  Il badge non viene emesso automaticamente — richiedilo su tua iniziativa.
                </Secondary>
                <Caption style={{ margin: 0, color: PX.ink3 }}>
                  Badge e credenziali: In arrivo · Pianificato — non attivo in Foundation Light.
                </Caption>
              </div>
            </Region>
          )}

          {/* ── Private-only experiences ──────────────────────────────────── */}
          {hasPrivateItems && (
            <Region label="Esperienze private">
              <div data-testid="dynamic-cv-private-section" style={{ display: 'grid', gap: SPACE.sm }}>
                <Secondary style={{ margin: 0, color: PX.ink3 }}>
                  Queste esperienze sono incluse nel tuo PIB personale ma non sono suggerite per la condivisione.
                  Restano visibili solo a te.
                </Secondary>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: SPACE.sm }}>
                  {(privateItems ?? []).map(exp => (
                    <li key={exp.initiative_id} style={{ minWidth: 0 }}>
                      <Secondary as="span" style={{ color: PX.ink, fontWeight: 600 }}>{exp.title}</Secondary>
                      <Caption style={{ margin: '2px 0 0', color: PX.ink3 }}>{exp.pillar} · {exp.date} · Privata</Caption>
                    </li>
                  ))}
                </ul>
              </div>
            </Region>
          )}

          {/* ── Export & condivisione — B126 ──────────────────────────────── */}
          <Region label="Esporta e condividi">
            <div data-testid="dynamic-cv-export-section" style={{ display: 'grid', gap: SPACE.md }}>
              <Secondary style={{ margin: 0, color: PX.ink2 }}>
                La condivisione è volontaria, revocabile e non viene inviata al tuo datore di lavoro.
                KORA non crea CV employer-facing.
              </Secondary>

              <div style={{ display: 'flex', gap: SPACE.sm, flexWrap: 'wrap' }}>
                <a
                  data-testid="dynamic-cv-print-link"
                  href="/worker/dynamic-cv/print"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...typeStyle('secondary', { weight: 700 }), background: PX.ink, color: '#fff',
                    borderRadius: PX.rCtl, padding: '11px 20px', minHeight: 44, display: 'inline-flex',
                    alignItems: 'center', textDecoration: 'none',
                  }}
                >
                  Stampa / Salva PDF
                </a>
                <button
                  data-testid="dynamic-cv-share-link-btn"
                  onClick={handleCreateShare}
                  disabled={creating}
                  style={{
                    ...typeStyle('secondary', { weight: 600 }), background: PX.l1, color: PX.ink2,
                    border: `1px solid ${PX.line2}`, borderRadius: PX.rCtl, padding: '11px 20px',
                    minHeight: 44, cursor: creating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? 'Creazione…' : 'Crea link condivisibile'}
                </button>
              </div>

              {newShareUrl && (
                <div data-testid="dynamic-cv-new-share-url">
                  <Notice tone="ok">Link creato — copialo ora, non verrà mostrato di nuovo.</Notice>
                  <code style={{ display: 'block', marginTop: SPACE.sm, ...typeStyle('caption'), fontFamily: 'ui-monospace, monospace', color: PX.ink2, overflowWrap: 'anywhere' }}>
                    {newShareUrl}
                  </code>
                  {newShareExpires && (
                    <Caption style={{ margin: `${SPACE.xs}px 0 0`, color: PX.ink3 }}>
                      Scade: {new Date(newShareExpires).toLocaleDateString('it-IT')}
                    </Caption>
                  )}
                </div>
              )}

              {sharesLoading && <Caption style={{ margin: 0, color: PX.ink3 }}>Caricamento link…</Caption>}

              {!sharesLoading && activeShares.length > 0 && (
                <div data-testid="dynamic-cv-active-shares" style={{ display: 'grid', gap: SPACE.sm }}>
                  <Meta style={{ color: PX.ink3 }}>Link attivi</Meta>
                  {activeShares.map(s => (
                    <div key={s.id} data-testid="dynamic-cv-share-item" style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <Secondary style={{ margin: 0, color: PX.ink }}>
                          Creato {new Date(s.created_at).toLocaleDateString('it-IT')}
                        </Secondary>
                        <Caption style={{ margin: 0, color: PX.ink3 }}>
                          Scade {new Date(s.expires_at).toLocaleDateString('it-IT')} &middot; {s.access_count} accessi
                        </Caption>
                      </div>
                      <button
                        data-testid="dynamic-cv-revoke-btn"
                        onClick={() => handleRevoke(s.id)}
                        disabled={revoking === s.id}
                        style={{
                          ...typeStyle('caption', { weight: 600 }), background: 'transparent', color: PX.risk,
                          border: `1px solid ${PX.line2}`, borderRadius: PX.rCtl, padding: '9px 14px',
                          minHeight: 44, cursor: revoking === s.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {revoking === s.id ? 'Revoca…' : 'Revoca'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!sharesLoading && inactiveShares.length > 0 && (
                <div data-testid="dynamic-cv-inactive-shares" style={{ display: 'grid', gap: SPACE.xs }}>
                  <Meta style={{ color: PX.ink3 }}>Link non più attivi</Meta>
                  {inactiveShares.map(s => (
                    <Caption key={s.id} data-testid="dynamic-cv-inactive-share-item" style={{ margin: 0, color: PX.ink3 }}>
                      {s.status === 'revoked' ? 'Revocato' : 'Scaduto'} &middot; creato {new Date(s.created_at).toLocaleDateString('it-IT')}
                    </Caption>
                  ))}
                </div>
              )}
            </div>
          </Region>

          {/* ── Future sharing options — planned, not active ──────────────── */}
          <Region label="Opzioni di condivisione future">
            <div data-testid="dynamic-cv-future-sharing" style={{ display: 'grid', gap: SPACE.sm }}>
              <Secondary style={{ margin: 0, color: PX.ink3 }}>
                Nessuna condivisione attiva in Foundation Light. Il lavoratore deciderà cosa condividere in Pilot+.
              </Secondary>
              {/* W3B: four rows each carrying the identical badge "In arrivo ·
                  Pianificato" said one thing four times. The status is stated
                  once and the capabilities are named once. */}
              <Caption style={{ margin: 0, color: PX.ink3 }}>
                In arrivo · Pianificato: Badge KORA verificato · Link di verifica pubblica · Esporta PDF · LinkedIn badge / credenziale verificabile.
              </Caption>
            </div>
          </Region>
        </div>
      </Col>

      {/* ── Privacy footer — non-suppressible ─────────────────────────────── */}
      <Col span="full">
        <div data-testid="dynamic-cv-privacy-footer" style={{ paddingTop: SPACE.md, borderTop: `1px solid ${PX.line}` }}>
          <Secondary style={{ margin: 0, color: PX.ink3 }}>
            Il Dynamic Impact CV è privato. L&apos;azienda non vede questo CV.
          </Secondary>
          <Caption style={{ margin: `${SPACE.xs}px 0 0`, color: PX.ink3 }}>
            KORA misura l&apos;organizzazione, non valuta il singolo lavoratore. Questo CV non è un ranking
            e non contiene confronti con colleghi.
          </Caption>
        </div>
      </Col>
    </Workspace>
  );
}
