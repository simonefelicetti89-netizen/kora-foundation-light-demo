// app/partner/workspace/page.tsx
// B127: Partner Workspace Foundation — area riservata per partner autenticati.
//
// Access: PARTNER only (requirePartnerUser enforced server-side).
// Identity: partnerId always from app_metadata.kora_partner_id — never from URL or body.
//
// Privacy boundaries (non-negotiable):
//   - PARTNER non vede dati individuali worker (no PIB, no Dynamic CV, no worker_id)
//   - PARTNER non vede KORA Index aziendale
//   - PARTNER non vede Trial Control Center o admin
//   - Solo profilo proprio partner e opportunità/servizi collegati al proprio partner_id
//   - Nessun marketplace, nessuna prenotazione, nessun pagamento, nessuna chat

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { requirePartnerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PX, PILLAR_SURFACE } from '@/lib/design/kora-design-tokens';
import {
  PageHead, Workspace, Col, Band, SplitRegion, SplitPart, Region,
  Facts, Status, StateBlock,
} from '@/components/ui/px';

export const metadata = { title: 'Partner Workspace · KORA' };



const PILLAR_META: Record<string, { color: string; bg: string; border: string }> = {
  LIFE:       { color: PILLAR_SURFACE.LIFE.color, bg: PILLAR_SURFACE.LIFE.bg, border: PILLAR_SURFACE.LIFE.border },
  GROWTH:     { color: PILLAR_SURFACE.GROWTH.color, bg: PILLAR_SURFACE.GROWTH.bg, border: PILLAR_SURFACE.GROWTH.border },
  CONNECTION: { color: PILLAR_SURFACE.CONNECTION.color, bg: PILLAR_SURFACE.CONNECTION.bg, border: PILLAR_SURFACE.CONNECTION.border },
  IMPACT:     { color: PILLAR_SURFACE.IMPACT.color, bg: PILLAR_SURFACE.IMPACT.bg, border: PILLAR_SURFACE.IMPACT.border },
  LEGACY:     { color: PILLAR_SURFACE.LEGACY.color, bg: PILLAR_SURFACE.LEGACY.bg, border: PILLAR_SURFACE.LEGACY.border },
};

const STATUS_META: Record<string, { label: string; tone: 'ok' | 'warn' | 'idle' }> = {
  published: { label: 'Pubblicato',   tone: 'ok'   },
  draft:     { label: 'In revisione', tone: 'warn' },
  archived:  { label: 'Archiviato',   tone: 'idle' },
};

/** The publication chain, derived ONLY from network.partner_profile.status.
 *  Three real stages exist in the Product: the profile is provisioned by KORA
 *  Admin, KORA reviews it, and only then is it visible in the worker
 *  opportunity catalogue. Nothing here is a projected or future step. */
type StageState = 'done' | 'current' | 'pending' | 'stopped';

function publicationStages(status: string | null): Array<{ label: string; note: string; state: StageState }> {
  const registered = { label: 'Profilo registrato', note: 'Provisioning eseguito da KORA Admin.', state: 'done' as StageState };
  if (status === 'published') {
    return [
      registered,
      { label: 'Review KORA', note: 'Completata.', state: 'done' },
      { label: 'Visibile nel catalogo worker', note: 'Stato corrente.', state: 'current' },
    ];
  }
  if (status === 'archived') {
    return [
      registered,
      { label: 'Review KORA', note: 'Completata in passato.', state: 'done' },
      { label: 'Visibile nel catalogo worker', note: 'Interrotta: profilo archiviato.', state: 'stopped' },
    ];
  }
  if (status === 'draft') {
    return [
      registered,
      { label: 'Review KORA', note: 'In corso. Nessuna azione richiesta da parte tua.', state: 'current' },
      { label: 'Visibile nel catalogo worker', note: 'Non ancora raggiunta.', state: 'pending' },
    ];
  }
  return [
    { ...registered, state: 'pending', note: 'Nessun profilo collegato a questo account.' },
    { label: 'Review KORA', note: 'Non avviata.', state: 'pending' },
    { label: 'Visibile nel catalogo worker', note: 'Non raggiungibile.', state: 'pending' },
  ];
}

const STAGE_DOT: Record<StageState, { fill: string; ring: string }> = {
  done:    { fill: PX.ok,      ring: PX.okTint },
  current: { fill: PX.violet,  ring: PX.violetTint },
  pending: { fill: PX.inkMute, ring: PX.inkWash },
  stopped: { fill: PX.risk,    ring: PX.riskTint },
};

export default async function PartnerWorkspacePage() {
  const auth = await requirePartnerUser();

  if (isKoraAuthError(auth)) {
    redirect('/login?role_hint=partner');
  }

  const { partnerId, email, partnerStatus } = auth;

  const db = getSupabaseServiceClient();

  // Fetch partner profile — service role bypasses RLS for server-side lookup
  const { data: profileRow } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, name, description, pillar, category, website_url, city, country, delivery_mode, status')
    .eq('id', partnerId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileRow ?? null) as any;

  const pillarMeta  = profile ? (PILLAR_META[profile.pillar as string] ?? null) : null;
  const statusMeta  = profile ? (STATUS_META[profile.status as string] ?? null) : null;

  const visibilityNote =
    profile?.status === 'published'
      ? 'Visibile nel catalogo opportunità worker.'
      : profile?.status === 'draft'
        ? 'In revisione da parte di KORA. Non ancora visibile ai worker.'
        : profile?.status === 'archived'
          ? 'Non visibile nel catalogo. Contatta KORA per riattivare.'
          : 'Profilo non trovato — contatta KORA Admin.';

  const stages = publicationStages(profile?.status ?? null);

  return (
    <div data-testid="partner-workspace" style={{ fontFamily: PX.sans }}>
      {/* KORA-WP-125 micro-polish (2026-09-21): the Partner surface was a
          correct profile page, which is not the same thing as a workspace.
          The operating question a Partner opens this page with is "is my
          offer live to workers, and what may my organisation see?" — so the
          page now leads with that chain (registrazione -> review KORA ->
          catalogo worker, derived only from partner_profile.status) with the
          profile record beside it as its supporting evidence, and closes on a
          single provenance strip instead of a third floating card. No
          marketplace, no leads, no analytics, no fabricated activity: every
          privacy statement is still verbatim and no new data is read. */}
      <PageHead
        eyebrow="Area Partner KORA"
        title={profile?.name ?? 'Partner'}
        lead="Il tuo profilo partner, la sua visibilità nel catalogo delle opportunità e il perimetro esatto dei dati a cui la tua organizzazione ha accesso."
        meta={
          <>
            {statusMeta && <Status tone={statusMeta.tone}>{statusMeta.label}</Status>}
            {profile?.pillar && pillarMeta && (
              <span
                data-testid="partner-workspace-pillar"
                style={{
                  display: 'inline-flex', alignItems: 'center', height: 23, padding: '0 9px',
                  borderRadius: PX.rChip, fontSize: 11.5, fontWeight: 700,
                  background: pillarMeta.bg, color: pillarMeta.color, border: `1px solid ${pillarMeta.border}`,
                }}
              >
                {profile.pillar}
              </span>
            )}
            <Status tone={partnerStatus === 'active' ? 'ok' : 'warn'}>Account {partnerStatus}</Status>
          </>
        }
      />

      <div data-testid="partner-workspace-hero" hidden />

      <Workspace>
        {!profile ? (
          <Band>
            <div data-testid="partner-workspace-no-profile">
              <StateBlock
                tone="pending"
                title="Profilo partner non trovato"
                body="Il tuo account è autenticato ma nessun profilo partner risulta collegato. Il provisioning di un profilo partner è una decisione di KORA Admin. Contatta l'amministrazione KORA per completarlo."
              />
            </div>
          </Band>
        ) : (
          <Band>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 18px', borderBottom: `1px solid ${PX.line}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3 }}>
                Pubblicazione e visibilità
              </span>
              <span style={{ marginLeft: 'auto' }}>
                {statusMeta && (
                  <span data-testid="partner-workspace-status-badge">
                    <Status tone={statusMeta.tone}>{statusMeta.label}</Status>
                  </span>
                )}
              </span>
            </div>

            <SplitRegion columns={2}>
              <SplitPart label="Percorso di pubblicazione">
                <div data-testid="partner-workspace-opportunity-status">
                  <ol style={{ margin: '0 0 14px', padding: 0, listStyle: 'none', display: 'grid', gap: 0 }}>
                    {stages.map((stage, i) => {
                      const dot = STAGE_DOT[stage.state];
                      const last = i === stages.length - 1;
                      return (
                        <li key={stage.label} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', columnGap: 11 }}>
                          <span aria-hidden="true" style={{ display: 'grid', justifyItems: 'center', rowGap: 0 }}>
                            <span style={{
                              width: 14, height: 14, borderRadius: PX.rPill, display: 'grid', placeItems: 'center',
                              background: dot.ring, border: `1px solid ${dot.fill}`,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: PX.rPill, background: dot.fill }} />
                            </span>
                            {!last && <span style={{ width: 1, minHeight: 26, flex: 1, background: PX.line2 }} />}
                          </span>
                          <span style={{ display: 'block', paddingBottom: last ? 0 : 12 }}>
                            <span style={{
                              display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '-0.008em',
                              color: stage.state === 'pending' ? PX.inkMute : PX.ink,
                            }}>
                              {stage.label}
                            </span>
                            <span style={{ display: 'block', marginTop: 1, fontSize: 11.5, lineHeight: 1.5, color: PX.ink3 }}>
                              {stage.note}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  <p data-testid="partner-workspace-visibility-note" style={{ margin: '0 0 8px', paddingTop: 12, borderTop: `1px solid ${PX.line}`, fontSize: 13.5, lineHeight: 1.6, color: PX.ink, fontWeight: 650 }}>
                    {visibilityNote}
                  </p>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: PX.ink3 }}>
                    La pubblicazione nel catalogo è una decisione di KORA: il tuo profilo diventa visibile ai
                    worker solo dopo la review. Nessuna prenotazione, nessun pagamento e nessun contatto
                    individuale transita da questa area.
                  </p>
                </div>
              </SplitPart>

              <SplitPart label="Profilo pubblicato">
                <div data-testid="partner-workspace-profile">
                  {profile.description && (
                    <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.65, color: PX.ink2 }}>
                      {profile.description}
                    </p>
                  )}
                  <Facts
                    rows={[
                      ['Categoria', profile.category ?? '—'],
                      ['Pilastro', profile.pillar ?? '—'],
                      ['Modalità', <span key="dm" data-testid="partner-workspace-delivery-mode" style={{ textTransform: 'capitalize' }}>{profile.delivery_mode}</span>],
                      ['Territorio', [profile.city, profile.country].filter(Boolean).join(' · ') || '—'],
                      ['Sito web', profile.website_url
                        ? <a key="w" href={profile.website_url} rel="noreferrer noopener" target="_blank" style={{ color: PX.violet700, fontWeight: 700 }}>{profile.website_url}</a>
                        : '—'],
                      ['Account', email],
                    ]}
                  />
                  <p style={{ margin: '12px 0 0', paddingTop: 12, borderTop: `1px solid ${PX.line}`, fontSize: 11.5, lineHeight: 1.6, color: PX.ink3 }}>
                    Questi campi sono ciò che un worker vede quando il profilo è pubblicato. Le modifiche
                    sono gestite da KORA Admin.
                  </p>
                </div>
              </SplitPart>
            </SplitRegion>
          </Band>
        )}

        <Col span={7}>
          <Region label="Perimetro dati — accesso partner">
            {/* The six boundary statements are reproduced VERBATIM from the
                B127 original. They are privacy semantics, not UI copy: the
                B127 guard pins their exact wording, and WP-125's authorization
                is presentational only. Only their presentation changed. */}
            <div data-testid="partner-workspace-boundary">
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '9px 24px' }}>
                {[
                  'Non hai accesso a dati individuali dei lavoratori.',
                  'Non hai accesso al KORA Index delle aziende.',
                  'Non hai accesso a Dynamic Impact CV o PIB individuali.',
                  'Non hai accesso a nominativi, email o ID worker.',
                  'Le opportunità sono visibili ai worker solo se il tuo profilo è pubblicato da KORA.',
                  'Nessun marketplace, nessuna prenotazione, nessun pagamento in questa area.',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.55, color: PX.ink2 }}>
                    <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: PX.rPill, background: PX.ok, flex: 'none', marginTop: 6 }} />
                    <span style={{ minWidth: 0 }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p style={{ margin: '14px 0 0', paddingTop: 12, borderTop: `1px solid ${PX.line}`, fontSize: 11.5, lineHeight: 1.6, color: PX.ink3 }}>
                Il perimetro è applicato lato server a ogni richiesta: non dipende da questa schermata e
                non è modificabile da questa area.
              </p>
            </div>
          </Region>
        </Col>

        <Col span={5}>
          <Region label="Funzionalità future — capability definite, non ancora attive">
            <div data-testid="partner-workspace-future">
              <p style={{ margin: '0 0 11px', fontSize: 12.5, lineHeight: 1.6, color: PX.ink3 }}>
                Queste capability sono definite ma non ancora attive. Sono elencate per trasparenza:
                quando si attiveranno, compariranno qui con lo stesso perimetro dati.
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                {[
                  'Richieste di contatto da aziende — nessuna chat, nessun lead individuale',
                  'Performance aggregate di attivazione — nessun dato individuale worker',
                  'Protocollo evidenze e stato di audit',
                  'Coordinamento KORA per iniziative collettive',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.5, color: PX.ink2 }}>
                    <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: PX.rPill, background: PX.inkMute, flex: 'none', marginTop: 6 }} />
                    <span style={{ minWidth: 0 }}>
                      {item} <span style={{ color: PX.inkMute, fontWeight: 600 }}>— prossimamente</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Region>
        </Col>

        {/* Provenance closes the page as one strip rather than a third card
            floating beside two taller ones. */}
        <Band tone="inset">
          <div data-testid="partner-workspace-footer" style={{ display: 'flex', alignItems: 'center', gap: '14px 30px', flexWrap: 'wrap', padding: '14px 18px' }}>
            {[
              ['Metodologia', 'KORA v0.1'],
              ['Calibrazione', 'pre-empirica'],
              ['Provisioning', 'KORA Admin'],
              ['Dati individuali', 'Nessuno esposto in quest\'area'],
            ].map(([label, value]) => (
              <span key={label} style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3 }}>{label}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 12.5, fontWeight: 700, color: PX.ink }}>{value}</span>
              </span>
            ))}
          </div>
        </Band>
      </Workspace>
    </div>
  );
}
