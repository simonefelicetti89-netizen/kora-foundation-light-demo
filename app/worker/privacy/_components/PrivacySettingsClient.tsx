'use client';
// app/worker/privacy/_components/PrivacySettingsClient.tsx
// B122: Worker Privacy & Sharing Settings — client panel.
// KORA-WP-048: Profile & Privacy Interactive (requirement `MYKORA-009`).
//
// ── WHAT "INTERACTIVE" MEANS HERE — FOUNDER RULING, 2026-09-21 ───────────────
// Reading A is canonical: this surface does NOT introduce writable privacy
// preferences. The worker can interactively inspect, understand and navigate
// their canonical privacy state and the real sharing capabilities that already
// exist, while the privacy policy controls themselves remain READ-ONLY.
// The ruling resolves the conflict between Registry 219's acceptance wording
// ("interactively manage") and `46_GLOBAL_GAP_MATRIX` row `MYKORA-009`
// ("Privacy controls stay read-only"), which this package's precheck surfaced.
//
// Consequently this file introduces NO write path of any kind: no privacy
// preference table, no migration, no PATCH/POST, no RLS policy, no employer
// visibility toggle, no aggregation-threshold toggle, no consent subsystem, no
// Public Snapshot activation, no LinkedIn activation. Both reads are existing
// canonical session-scoped GETs whose contracts are unchanged.
//
// What DID become interactive, each because it improves comprehension or
// navigation rather than to satisfy the word:
//   1. a real loading state, and a real error state with a working retry —
//      previously a failed fetch silently left the page on its hardcoded
//      fallback copy, so a worker could read stale guarantees as live ones;
//   2. the live state of the worker's own CV share links, read from the
//      existing `GET /api/worker/dynamic-cv/shares` — the page used to assert
//      a sharing capability without ever showing whether anything was in fact
//      shared right now;
//   3. a refresh action over both reads;
//   4. canonical navigation into the surfaces that own each capability.
//
// DYNAMIC CV BOUNDARY: `/worker/dynamic-cv` remains the canonical owner of the
// share lifecycle. This page READS that state and NAVIGATES to it. It does not
// create, revoke or manage a share, and it never renders a share URL.
//
// FUTURE CAPABILITIES: Public Snapshot and LinkedIn sharing are stated as
// Product state, not as dead switches. CLAUDE.md §16 keeps them future/mock
// only, so a disabled control here would be theatre rather than truth.
//
// Privacy: no individual worker data reaches the employer. No public link.

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import type { PrivacySettingsResponse } from '@/app/api/worker/privacy-settings/route';
import type { SharesResponse, ShareLinkItem } from '@/app/api/worker/dynamic-cv/shares/route';
import {
  PageHead, Workspace, Col, Band, Region,
  Notice, Status, Facts, StateBlock, SkeletonRows,
} from '@/components/ui/px';
import { Button } from '@/components/ui/Button';
import { PX } from '@/lib/design/kora-design-tokens';

interface PrivacySettingsClientProps {
  userEmail: string;
}

/** The four canonical properties of a KORA CV share link. Pinned by B126
 *  against `docs/WORKER_PRIVACY_AND_SHARING.md` — privacy semantics, not UI
 *  copy: they may be re-presented, never re-worded. */
const CV_SHARE_PROPERTIES = [
  'Solo se creato da te — nessun link automatico',
  'Revocabile in qualsiasi momento',
  'Scadenza automatica 30 giorni',
  'Non visibile al datore di lavoro',
];

/** Capabilities that are defined but not available. Stated as Product state,
 *  never as a control the worker could mistake for one that is merely off. */
const FUTURE_CAPABILITIES = [
  {
    title: 'Snapshot pubblico anonimo',
    body: 'Non ancora disponibile in KORA. Employer access: non consentito.',
  },
  {
    title: 'Condivisione LinkedIn',
    body: 'Non ancora disponibile in KORA. Aggiungi KORA Impact al tuo profilo professionale quando la capability sarà attiva.',
  },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function PrivacySettingsClient({ userEmail: _userEmail }: PrivacySettingsClientProps) {
  const [settings, setSettings] = useState<PrivacySettingsResponse | null>(null);
  const [shares, setShares] = useState<ShareLinkItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShareNotice(null);
    try {
      const r = await fetch('/api/worker/privacy-settings');
      const data: PrivacySettingsResponse = await r.json();
      if (!data?.ok) {
        setError('Impostazioni privacy non disponibili in questo momento.');
        setLoading(false);
        return;
      }
      setSettings(data);
    } catch {
      setError('Errore di rete: le tue impostazioni privacy non sono state caricate.');
      setLoading(false);
      return;
    }

    // A share read that fails must never blank the privacy statements: the
    // boundary guarantees are authoritative on their own.
    try {
      const sr = await fetch('/api/worker/dynamic-cv/shares');
      const sd: SharesResponse | { ok: false } = await sr.json();
      if ('ok' in sd && sd.ok) setShares(sd.shares);
      else setShareNotice('Stato dei link di condivisione non disponibile in questo momento.');
    } catch {
      setShareNotice('Stato dei link di condivisione non disponibile in questo momento.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const activeShares = (shares ?? []).filter((s) => s.status === 'active' && !s.isExpired);
  const status = settings?.privacyStatus ?? null;

  return (
    <div data-testid="worker-privacy-page">
      <PageHead
        eyebrow="My KORA · Privacy"
        title="Privacy & Condivisione"
        lead="Cosa resta privato, cosa la tua azienda vede in forma aggregata, e quali condivisioni sono attive in questo momento. Le regole di privacy di KORA non sono impostazioni modificabili: sono garanzie."
        meta={
          !loading && !error ? (
            <>
              {status?.workspacePrivate && <Status tone="ok">Spazio personale privato</Status>}
              {status?.onlyAggregatedVisible && <Status tone="ok">All&apos;azienda solo dati aggregati</Status>}
              <Status tone={activeShares.length > 0 ? 'info' : 'idle'}>
                {activeShares.length === 0
                  ? 'Nessuna condivisione attiva'
                  : activeShares.length === 1 ? '1 condivisione attiva' : `${activeShares.length} condivisioni attive`}
              </Status>
            </>
          ) : undefined
        }
        actions={
          <Button variant="ghost" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw size={14} strokeWidth={2.2} aria-hidden="true" />
            Aggiorna
          </Button>
        }
      />

      {error && (
        <div style={{ marginBottom: 'var(--px-gap)' }}>
          <Notice tone="risk">
            {error}{' '}
            <button
              type="button"
              onClick={() => load()}
              style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: PX.violet700, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Riprova
            </button>
          </Notice>
        </div>
      )}

      <Workspace>
        {/* PRIMARY — the constitutional boundary. `MYKORA-011` is preserved
            absolutely; both statements below are canonical Product semantics
            and are reproduced verbatim. */}
        <Band>
          <div data-testid="privacy-employer-not-visible" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3 }}>
                Il confine con il tuo datore di lavoro
              </span>
              <Status tone="ok">Garanzia attiva</Status>
            </div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 750, letterSpacing: '-0.018em', color: PX.ink }}>
              Il tuo datore di lavoro non vede questi dati.
            </p>
            <p style={{ margin: '8px 0 0', maxWidth: '72ch', fontSize: 13, lineHeight: 1.65, color: PX.ink2 }}>
              KORA misura le organizzazioni, non valuta i singoli lavoratori.
              Il tuo spazio personale, il tuo CV e la tua storia di partecipazione sono visibili solo a te.
            </p>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${PX.line}` }}>
              {loading ? (
                <SkeletonRows rows={2} rowHeight={20} label="Caricamento dello stato privacy in corso." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px 26px' }}>
                  {[
                    ['Spazio personale', status?.workspacePrivate],
                    ['Dynamic Impact CV', status?.dynamicCvPrivate],
                    ['Storia di partecipazione', status?.participationPrivate],
                    ['Visibilità aziendale', status?.onlyAggregatedVisible],
                  ].map(([label, ok]) => (
                    <span key={String(label)} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                      <Status tone={ok ? 'ok' : 'idle'}>
                        {label === 'Visibilità aziendale'
                          ? (ok ? 'Solo aggregati' : 'Non determinata')
                          : (ok ? 'Privato' : 'Non determinato')}
                      </Status>
                      <span style={{ minWidth: 0, fontSize: 12.5, fontWeight: 600, color: PX.ink2, overflowWrap: 'anywhere' }}>{label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Band>

        {/* WORKING AREA — the two halves of the same question ("what is
            mine, what does my employer see") read side by side across the
            full measure. Stacked in one 8-column column they left the
            lower working canvas empty beneath a much taller rail. */}
        <Col span={6}>
          <Region label="Dati sempre privati — solo tu li vedi">
            <div data-testid="privacy-private-data">
              {loading ? (
                <SkeletonRows rows={5} rowHeight={22} label="Caricamento dei dati privati in corso." />
              ) : settings ? (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
                  {settings.privateData.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.55, color: PX.ink2 }}>
                      <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: PX.rPill, background: PX.ok, flex: 'none', marginTop: 7 }} />
                      <span style={{ minWidth: 0 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <StateBlock
                  title="Elenco non disponibile"
                  body="Le tue impostazioni privacy non sono state caricate. La garanzia sopra resta valida: è applicata lato server, non da questa schermata."
                />
              )}
            </div>
          </Region>
        </Col>

        <Col span={6}>
          <Region label="Dati aggregati visibili all'azienda — anonimi, senza identificarti">
            <div data-testid="privacy-aggregated-data">
              {loading ? (
                <SkeletonRows rows={3} rowHeight={22} label="Caricamento dei dati aggregati in corso." />
              ) : settings ? (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
                  {settings.aggregatedData.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.55, color: PX.ink2 }}>
                      <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: PX.rPill, background: PX.info, flex: 'none', marginTop: 7 }} />
                      <span style={{ minWidth: 0 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <StateBlock
                  title="Elenco non disponibile"
                  body="I dati aggregati visibili alla tua azienda non sono stati caricati. La soglia di privacy resta applicata lato server."
                />
              )}
              <p style={{ margin: '14px 0 0', paddingTop: 12, borderTop: `1px solid ${PX.line}`, fontSize: 12, lineHeight: 1.6, color: PX.ink3 }}>
                I dati aggregati sono calcolati su gruppi con almeno 10 lavoratori attivi.
                Sotto questa soglia, i dati vengono soppressi per tutelare la tua privacy.
              </p>
            </div>
          </Region>
        </Col>

        {/* SUPPORTING AREA — sharing state on one side, the contexts that
            explain it on the other. */}
        <Col span={6}>
          {/* Read-only by ruling: this region states what is shared and sends
              the worker to the surface that owns the lifecycle. It creates
              nothing, revokes nothing and renders no share URL. */}
          <Region
            label="Condivisione"
            actions={
              <Status tone={activeShares.length > 0 ? 'info' : 'idle'}>
                {activeShares.length > 0 ? 'Attiva' : 'Nessuna'}
              </Status>
            }
          >
            <div data-testid="privacy-sharing-controls">
              <p style={{ margin: '0 0 13px', fontSize: 12.5, lineHeight: 1.6, color: PX.ink2 }}>
                La condivisione è sempre sotto il tuo controllo.
                Solo tu puoi creare e revocare i link. Il datore di lavoro non vede mai questo CV.
              </p>

              {loading ? (
                <SkeletonRows rows={2} rowHeight={22} label="Caricamento dello stato di condivisione in corso." />
              ) : shareNotice ? (
                <Notice tone="warn">{shareNotice}</Notice>
              ) : activeShares.length === 0 ? (
                <StateBlock
                  title="Nessun link di condivisione attivo"
                  body="Nessuno sta consultando il tuo Dynamic Impact CV tramite un link. Ne esiste uno solo se lo crei tu."
                />
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {activeShares.map((s) => (
                    <div key={s.id} style={{ padding: '12px 13px', borderRadius: PX.rInner, background: PX.l2, border: `1px solid ${PX.l2Edge}` }}>
                      <Status tone="ok">Link attivo</Status>
                      <div style={{ marginTop: 10 }}>
                        <Facts
                          rows={[
                            ['Creato il', formatDate(s.created_at)],
                            ['Scade il', formatDate(s.expires_at)],
                            ['Accessi', String(s.access_count)],
                          ]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
                {CV_SHARE_PROPERTIES.map((item) => (
                  <li key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11.5, lineHeight: 1.5, color: PX.ink3 }}>
                    <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: PX.rPill, background: PX.ok, flex: 'none', marginTop: 6 }} />
                    <span style={{ minWidth: 0 }}>{item}</span>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 14 }}>
                <a
                  href="/worker/dynamic-cv"
                  data-testid="privacy-sharing-cv-toggle"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 13px',
                    borderRadius: PX.rCtl, fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
                    background: `linear-gradient(180deg, ${PX.btnFrom}, ${PX.btnTo})`,
                    color: PX.onViolet, boxShadow: PX.btnShadow,
                  }}
                >
                  Gestisci i tuoi link
                  <ArrowUpRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </a>
              </div>
              <p style={{ margin: '11px 0 0', fontSize: 11, lineHeight: 1.55, color: PX.ink3 }}>
                Creazione e revoca avvengono nel tuo Dynamic Impact CV, che ne resta l&apos;unico proprietario.
              </p>
            </div>
          </Region>

        </Col>

        <Col span={6}>
          <Region label="Capability non ancora disponibili">
            <div data-testid="privacy-future-capabilities" style={{ display: 'grid', gap: 12 }}>
              {FUTURE_CAPABILITIES.map((c) => (
                <div key={c.title} style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: PX.ink2 }}>{c.title}</span>
                    <Status tone="idle">Non disponibile</Status>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 11.5, lineHeight: 1.55, color: PX.ink3 }}>{c.body}</p>
                </div>
              ))}
            </div>
          </Region>

          <Region label="Collegamenti">
            <div data-testid="privacy-links-section" style={{ display: 'grid', gap: 9 }}>
              {[
                ['/worker/onboarding?mode=review', 'Rivedi le impostazioni di onboarding'],
                ['/worker/dynamic-cv', 'Vedi il tuo Dynamic Impact CV'],
                ['/worker/workspace', 'Torna al tuo spazio'],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: PX.violet700, textDecoration: 'none' }}
                >
                  {label}
                  <ArrowUpRight size={13} strokeWidth={2.4} aria-hidden="true" />
                </a>
              ))}
            </div>
          </Region>

          <Region label="Come leggere questa pagina">
            <div data-testid="privacy-interpretation-note">
              <Notice tone="info">
                {settings?.interpretationNote ??
                  'KORA misura le organizzazioni, non valuta i singoli lavoratori. ' +
                  'Il tuo datore di lavoro non vede mai dati individuali. ' +
                  'Solo medie aggregate anonime sono visibili a livello aziendale.'}
              </Notice>
              {/* KORA-WP-048 §5 — legacy copy classification. The retired
                  footer read "KORA Foundation Light · Metodologia v0.1
                  pre-empirical". "KORA Foundation Light" is the name of the
                  commercial offer, not a property of a worker's privacy
                  state, and it is the same implementation-era term report
                  `233` removed from a Company value field; it is dropped
                  here. The methodology version and calibration status are
                  genuinely current governance facts and are preserved. */}
              <p style={{ margin: '12px 0 0', fontSize: 11, lineHeight: 1.6, color: PX.ink3 }}>
                Metodologia KORA v0.1 · calibrazione pre-empirica. Le regole di privacy sono applicate dal
                server a ogni richiesta e non dipendono da questa schermata.
              </p>
            </div>
          </Region>
        </Col>
      </Workspace>
    </div>
  );
}
