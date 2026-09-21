// app/worker/workspace/page.tsx
// B109: Worker Experience MVP — worker private workspace (server component).
// Only reachable by authenticated WORKER role (layout gate + middleware).
// Shows: identity, available initiatives, participation history, placeholders.
// NEVER shows PIB, rankings, employer analytics, or other workers' data.

import { getCurrentWorkerUser } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { WorkerInitiativeRow, WorkerParticipationRow } from '@/lib/supabase/types';
import { InitiativeCardsClient } from './_components/InitiativeCardsClient';
import type { InitiativeItem } from './_components/InitiativeCardsClient';
import { ActivationProfileSection } from './_components/ActivationProfileSection';
import { PX } from '@/lib/design/kora-design-tokens';
import { PageHead, Workspace, Col, Status } from '@/components/ui/px';
import type { WorkerActivationProfile, PillarDistributionEntry } from '@/app/api/worker/activation-profile/route';
import { BADGE_TOKENS, PILLAR_COLORS, TOKENS } from '@/lib/design/kora-design-tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type HistoryItem = {
  initiative_title: string;
  pillar: WorkerInitiativeRow['pillar'];
  participation_status: WorkerParticipationRow['status'];
  updated_at: string;
  private_note: string | null;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WorkerWorkspacePage() {
  const worker = await getCurrentWorkerUser();
  if (!worker) redirect('/login');

  const db = await getSupabaseServerClient();

  // Fetch worker identity — own row only (workerId from session)
  const { data: wiRow } = await db.schema('personal').from('worker_identity')
    .select('worker_ref, status, tenant_id, created_at')
    .eq('id', worker.workerId)
    .eq('auth_user_id', worker.id)
    .maybeSingle();

  // Fetch tenant name
  const { data: tenantRow } = await db.schema('analytics').from('tenant')
    .select('company_name, tenant_code')
    .eq('id', worker.tenantId)
    .maybeSingle();

  // Fetch private profile — includes onboarding gate check
  const { data: profRow } = await db.schema('personal').from('worker_profile_private')
    .select('display_name, onboarding_done, onboarding_completed_at')
    .eq('worker_id', worker.workerId)
    .maybeSingle();

  // Onboarding gate: if not completed → redirect to onboarding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(profRow as any)?.onboarding_completed_at) {
    redirect('/worker/onboarding');
  }

  // Fetch published initiatives for worker's tenant
  const { data: rawInitiatives } = await db.schema('personal').from('worker_initiative')
    .select('id, title, pillar, description, start_date, end_date, mode, location, eligibility_class')
    .eq('tenant_id', worker.tenantId)
    .eq('status', 'published')
    .order('start_date', { ascending: true, nullsFirst: false });

  // Fetch worker's own participation rows
  const initiativeIds = (rawInitiatives ?? []).map(i => i.id as string);
  const { data: participations } = initiativeIds.length > 0
    ? await db.schema('personal').from('worker_participation')
        .select('initiative_id, status')
        .eq('worker_id', worker.workerId)
        .in('initiative_id', initiativeIds)
    : { data: [] };

  const participationMap = new Map<string, WorkerParticipationRow['status']>(
    (participations ?? []).map(p => [p.initiative_id as string, p.status as WorkerParticipationRow['status']]),
  );

  const initiatives: InitiativeItem[] = (rawInitiatives ?? []).map(i => ({
    id: i.id as string,
    title: i.title as string,
    pillar: i.pillar as WorkerInitiativeRow['pillar'],
    description: i.description as string | null,
    start_date: i.start_date as string | null,
    end_date: i.end_date as string | null,
    mode: i.mode as string | null,
    location: i.location as string | null,
    eligibility_class: i.eligibility_class as string | null,
    participation_status: participationMap.get(i.id as string) ?? null,
  }));

  // Fetch participation history — own rows only, includes private_note (worker is data owner)
  const { data: historyRows } = await db.schema('personal').from('worker_participation')
    .select('initiative_id, status, updated_at, private_note, worker_initiative:initiative_id(title, pillar)')
    .eq('worker_id', worker.workerId)
    .order('updated_at', { ascending: false })
    .limit(20);

  const history: HistoryItem[] = (historyRows ?? []).map(r => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init = (r.worker_initiative as any) ?? {};
    return {
      initiative_title:     (init.title as string) ?? '—',
      pillar:               (init.pillar as WorkerInitiativeRow['pillar']) ?? 'GROWTH',
      participation_status: r.status as WorkerParticipationRow['status'],
      updated_at:           r.updated_at as string,
      private_note:         (r.private_note as string | null) ?? null,
    };
  });

  // Compute activation profile — server-side, no new table needed
  // Re-uses already-fetched participation rows but needs pillar data from initiative
  const { data: profileRows } = await db.schema('personal').from('worker_participation')
    .select('status, updated_at, worker_initiative:initiative_id(pillar)')
    .eq('worker_id', worker.workerId);

  const ALL_PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
  type ProfilePillar = typeof ALL_PILLARS[number];

  const pillarCounters: Record<ProfilePillar, { interested: number; registered: number; attended: number; cancelled: number }> = {
    LIFE:       { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    GROWTH:     { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    CONNECTION: { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    IMPACT:     { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    LEGACY:     { interested: 0, registered: 0, attended: 0, cancelled: 0 },
  };
  let profileLastActivity: string | null = null;

  for (const row of profileRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pillar = ((row.worker_initiative as any)?.pillar as ProfilePillar | undefined);
    if (!pillar || !pillarCounters[pillar]) continue;
    const s = row.status as string;
    if (s === 'interested')       pillarCounters[pillar].interested++;
    else if (s === 'registered')  pillarCounters[pillar].registered++;
    else if (s === 'attended')    pillarCounters[pillar].attended++;
    else if (s === 'cancelled')   pillarCounters[pillar].cancelled++;
    const ua = row.updated_at as string;
    if (!profileLastActivity || ua > profileLastActivity) profileLastActivity = ua;
  }

  const pillarDistribution: PillarDistributionEntry[] = ALL_PILLARS.map(pillar => {
    const c = pillarCounters[pillar];
    return { pillar, ...c, total_active: c.interested + c.registered + c.attended };
  });

  const totalActive    = pillarDistribution.reduce((s, p) => s + p.total_active, 0);
  const hasAnyActivity = totalActive > 0;
  const activePillars  = pillarDistribution.filter(p => p.total_active > 0);

  let strongestPillar: ProfilePillar | null = null;
  if (activePillars.length > 0) {
    strongestPillar = activePillars.reduce((best, p) => p.total_active > best.total_active ? p : best).pillar as ProfilePillar;
  }
  const nonStrongest = activePillars.filter(p => p.pillar !== strongestPillar);
  let emergingPillar: ProfilePillar | null = null;
  if (nonStrongest.length > 0) {
    emergingPillar = nonStrongest.reduce((c, p) => p.total_active < c.total_active ? p : c).pillar as ProfilePillar;
  }

  const activationProfile: WorkerActivationProfile = {
    profileStatus: totalActive === 0 ? 'empty' : 'active',
    pillarDistribution,
    activitySummary: {
      total_interested: pillarDistribution.reduce((s, p) => s + p.interested, 0),
      total_registered: pillarDistribution.reduce((s, p) => s + p.registered, 0),
      total_attended:   pillarDistribution.reduce((s, p) => s + p.attended, 0),
      total_cancelled:  pillarDistribution.reduce((s, p) => s + p.cancelled, 0),
      last_activity_at: profileLastActivity,
    },
    strongestPillar,
    emergingPillar,
    missingPillars: pillarDistribution.filter(p => p.total_active === 0).map(p => p.pillar) as ProfilePillar[],
    lastActivityAt: profileLastActivity,
    privacyNotice:      'Il tuo datore di lavoro non può vedere questo profilo individuale. Solo tu puoi accedere a questi dati.',
    interpretationNote: 'Questo profilo è basato sulle attività registrate in KORA. Non è una valutazione individuale, non genera ranking e non viene condiviso con la tua azienda.',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wi   = (wiRow   ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t    = (tenantRow ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof = (profRow ?? {}) as any;

  const displayName    = (prof.display_name as string | null) ?? worker.email;
  const onboardingDone = (prof.onboarding_done as boolean) ?? false;
  const status         = (wi.status as string) ?? worker.workerStatus;
  const workerRef      = (wi.worker_ref as string) ?? '—';
  const companyName    = (t.company_name as string) ?? '—';

  // Fetch partner preview — up to 3 published partners for workspace card
  const { data: rawPartnerPreview } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, name, pillar, category, delivery_mode')
    .eq('status', 'published')
    .limit(3);

  type PartnerPreviewItem = { id: string; name: string; pillar: string; category: string | null; delivery_mode: string };
  const partnerPreview: PartnerPreviewItem[] = (rawPartnerPreview ?? []).map(p => ({
    id:            p.id as string,
    name:          p.name as string,
    pillar:        p.pillar as string,
    category:      (p.category as string | null) ?? null,
    delivery_mode: p.delivery_mode as string,
  }));

  const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
    invited:  { bg: BADGE_TOKENS.limited.bg, text: BADGE_TOKENS.limited.text, label: 'Invitato' },
    active:   { bg: BADGE_TOKENS.eligible.bg, text: BADGE_TOKENS.eligible.text, label: 'Attivo' },
    pending:  { bg: BADGE_TOKENS.info.bg, text: BADGE_TOKENS.info.text, label: 'In attesa' },
    disabled: { bg: TOKENS.surface, text: TOKENS.inkSecondary, label: 'Disabilitato' },
  };
  const sc = STATUS_COLOR[status] ?? STATUS_COLOR['pending'];

  const firstName = (prof.display_name as string | null)
    ? (prof.display_name as string).split(' ')[0]
    : null;

  return (
    <>
    {/* KORA-WP-125 Product Experience convergence (2026-09-20): PRESENTATION
        ONLY. Previously a 660px column of nine stacked cards — a documentation
        feed, not a workspace. Recomposed as a personal workspace: identity,
        activity and traces in the working column; the privacy boundary and the
        personal-area entry points in the rail, where they are reachable
        without scrolling past everything else. The privacy semantics are
        unchanged and still first: nothing about what the employer can see, or
        what belongs to the worker, is altered. No progress bar, no ranking, no
        score is introduced — the Worker surface must never read as scoring
        a person. */}
    <div data-testid="workspace-page" style={{ fontFamily: PX.sans }}>

      <PageHead
        eyebrow="Il tuo spazio KORA"
        title={firstName ? `Ciao, ${firstName}` : 'Il mio spazio'}
        lead={`${displayName} · ${companyName}`}
        meta={
          <>
            <span data-testid="workspace-hero" hidden>{firstName ? `Ciao, ${firstName}` : 'Il mio spazio'}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 23, padding: '0 9px', borderRadius: PX.rChip,
              fontSize: 11.5, fontWeight: 700, background: sc.bg, color: sc.text,
            }}>
              {sc.label}
            </span>
            <span data-testid="privacy-active-badge">
              <Status tone="ok">Spazio privato attivo</Status>
            </span>
            <a
              href="/worker/onboarding?mode=review"
              style={{ fontSize: 12, fontWeight: 600, color: PX.violet700, textDecoration: 'none', alignSelf: 'center' }}
            >
              Rivedi privacy boundary
            </a>
          </>
        }
      />

      <Workspace>
      <Col span="main">

      {/* Privacy notice — always visible */}
      <div style={{
        background: 'rgba(47,125,85,0.06)', border: '1px solid rgba(47,125,85,0.20)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 28,
      }}>
        <p style={{ fontSize: 12, color: BADGE_TOKENS.eligible.text, margin: 0, lineHeight: 1.6 }}>
          <strong>Privacy:</strong> Il tuo datore di lavoro non può vedere questi dati individuali.
          Solo tu puoi accedere a questo spazio. KORA misura le organizzazioni, non le persone.
        </p>
      </div>

      {/* Identity card */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>La tua identità KORA</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <Row label="Email" value={worker.email} />
          <Row label="Azienda" value={companyName} />
          <Row label="Onboarding" value={onboardingDone ? 'Completato' : 'In attesa'} />
        </div>
      </div>

      {/* Initiatives section */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>Le tue iniziative</h2>
        <InitiativeCardsClient initiatives={initiatives} />
      </div>

      {/* History section */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>Il mio storico</h2>
        {history.length === 0 ? (
          <p data-testid="workspace-history-empty" style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', margin: 0, lineHeight: 1.6 }}>
            Non hai ancora partecipazioni registrate.<br />
            Esprimi interesse o iscriviti a un&apos;iniziativa nella sezione &ldquo;Le tue iniziative&rdquo; qui sopra.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {history.map((h, i) => (
              <HistoryRow key={i} item={h} />
            ))}
          </div>
        )}
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
          Solo tu puoi vedere questo storico. Non è condiviso con l&apos;azienda.
          Ti aiuta a capire il tuo percorso di attivazione — l&apos;azienda vede solo segnali aggregati, mai la tua attività individuale.
        </p>
      </div>

      {/* Partner preview section */}
      <div
        data-testid="workspace-partner-preview"
        style={{
          background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
          padding: '20px 24px', marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={sectionHeadingStyle}>Partner & opportunità</h2>
          {partnerPreview.length > 0 && (
            <a
              href="/worker/opportunities"
              style={{ fontSize: 11, color: BADGE_TOKENS.info.text, textDecoration: 'none', fontWeight: 600 }}
            >
              Vedi tutti →
            </a>
          )}
        </div>
        {partnerPreview.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', margin: 0, lineHeight: 1.6 }}>
            La rete partner sarà disponibile prossimamente.<br />
            <span style={{ fontSize: 11 }}>
              I partner vengono pubblicati dall&apos;amministratore KORA.
            </span>
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {partnerPreview.map(p => (
              <PartnerPreviewRow key={p.id} partner={p} />
            ))}
            <a
              href="/worker/opportunities"
              style={{
                fontSize: 11, fontWeight: 700, color: TOKENS.ink,
                background: 'rgba(6,3,43,0.04)', border: '1px solid rgba(6,3,43,0.10)',
                borderRadius: 7, padding: '8px 14px', textDecoration: 'none',
                display: 'inline-block', marginTop: 6, textAlign: 'center',
              }}
            >
              Esplora tutti i partner →
            </a>
          </div>
        )}
      </div>

      {/* KORA Space trace summary — links to private trace surfaces */}
      <div
        data-testid="workspace-trace-summary"
        style={{
          border:         '1px solid rgba(59,110,186,0.18)',
          borderRadius:   14,
          padding:        '18px 22px',
          background:     TOKENS.surface,
          marginBottom:   16,
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.info.base, margin: '0 0 6px' }}>
            Le tue tracce personali
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: TOKENS.ink, margin: '0 0 4px' }}>
            Partecipazioni e percorso privato
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Le partecipazioni confermate restano nel tuo percorso privato.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <a
              href="/worker/bookings"
              data-testid="workspace-trace-bookings-link"
              style={{ fontSize: 12, fontWeight: 600, color: TOKENS.info.base, textDecoration: 'none' }}
            >
              Prenotazioni &amp; partecipazioni →
            </a>
            <a
              href="/worker/personal-impact-balance"
              style={{ fontSize: 12, fontWeight: 600, color: PX.violet700, textDecoration: 'none' }}
            >
              Il tuo bilancio →
            </a>
            <a
              href="/worker/dynamic-cv"
              style={{ fontSize: 12, fontWeight: 600, color: TOKENS.success, textDecoration: 'none' }}
            >
              Dynamic Impact CV →
            </a>
          </div>
        </div>
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '3px 8px',
            borderRadius:  999,
            background:    'rgba(59,110,186,0.10)',
            color:         TOKENS.info.base,
          }}
        >
          Privato
        </span>
      </div>

      </Col>

      {/* KORA-WP-125 final composition pass: the working column previously ran
          far below an exhausted rail. The personal-area entry points stay in
          the rail, and the two context blocks that were padding the bottom of
          the working column (private profile, personal traces) now sit beneath
          them — so both columns finish at a comparable height (HANDOFF §18
          rule 2). Nothing was removed and no privacy statement moved out of
          the working column. */}
      <Col span="rail">

      {/* My KORA — navigation bridge to personal area */}
      <div
        data-testid="workspace-my-kora-link"
        style={{
          border:         '1px solid var(--px-line-2)',
          borderRadius:   14,
          padding:        '18px 22px',
          background:     TOKENS.surface,
          marginBottom:   16,
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: PX.violet700, margin: '0 0 6px' }}>
            My KORA · Area personale
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: TOKENS.ink, margin: '0 0 4px' }}>
            Il tuo spazio privato KORA
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Il tuo bilancio privato e le tue esperienze di attivazione. Solo tu puoi vederlo.
          </p>
          <a
            href="/worker/personal-impact-balance"
            data-testid="workspace-my-kora-pib-link"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          PX.violet700,
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         `1px solid ${PX.violetEdge}`,
              borderRadius:   8,
              background:     PX.violetTint,
            }}
          >
            Vai alla tua area personale →
          </a>
        </div>
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '3px 8px',
            borderRadius:  999,
            background:    'var(--px-violet-tint)',
            color:         PX.violet700,
          }}
        >
          Privato
        </span>
      </div>

      {/* KORA Link — worker-facing pilot surface (WORKER-PERSONAL-AREA-KORA-LINK-01) */}
      <div
        data-testid="workspace-kora-link-card"
        style={{
          border:         '1px solid rgba(97,86,245,0.18)',
          borderRadius:   14,
          padding:        '18px 22px',
          background:     TOKENS.surface,
          marginBottom:   16,
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.violet, margin: '0 0 6px' }}>
            KORA Link
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: TOKENS.ink, margin: '0 0 4px' }}>
            Il tuo collegamento fisico–digitale KORA
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px', lineHeight: 1.5 }}>
            In preparazione per il pilota. La tua azienda vede solo conteggi aggregati di adozione — mai la tua attività individuale.
          </p>
          <a
            href="/worker/kora-link/activate"
            data-testid="workspace-kora-link-link"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          TOKENS.violet,
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         '1px solid rgba(97,86,245,0.28)',
              borderRadius:   8,
              background:     'rgba(97,86,245,0.06)',
            }}
          >
            Vai al tuo KORA Link →
          </a>
        </div>
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '3px 8px',
            borderRadius:  999,
            background:    'rgba(97,86,245,0.10)',
            color:         TOKENS.violet,
          }}
        >
          In preparazione
        </span>
      </div>

      {/* Dynamic Impact CV — B121 */}
      <div
        data-testid="workspace-dynamic-cv-card"
        style={{
          border:       '1px solid rgba(6,3,43,0.10)',
          borderRadius: 14,
          padding:      '20px 22px',
          background:   TOKENS.surface,
          display:      'flex',
          alignItems:   'flex-start',
          justifyContent: 'space-between',
          gap:          16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.info.base, margin: '0 0 6px' }}>
            Dynamic Impact CV
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: TOKENS.ink, margin: '0 0 4px' }}>
            {hasAnyActivity ? 'Il tuo percorso KORA è in costruzione' : 'Inizia a costruire il tuo profilo'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px', lineHeight: 1.5 }}>
            {hasAnyActivity
              ? 'CV privato disponibile. Il tuo datore di lavoro non vede questi dati.'
              : 'Partecipa alle prime iniziative per generare il tuo CV KORA.'}
          </p>
          <a
            href="/worker/dynamic-cv"
            data-testid="workspace-dynamic-cv-link"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          TOKENS.info.base,
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         '1px solid rgba(59,110,186,0.28)',
              borderRadius:   8,
              background:     'rgba(59,110,186,0.06)',
            }}
          >
            {hasAnyActivity ? 'Vedi il tuo CV →' : 'Esplora il tuo CV →'}
          </a>
        </div>
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '3px 8px',
            borderRadius:  999,
            background:    hasAnyActivity ? 'rgba(47,125,85,0.10)' : 'rgba(6,3,43,0.06)',
            color:         hasAnyActivity ? TOKENS.success : 'rgba(6,3,43,0.40)',
          }}
        >
          {hasAnyActivity ? 'Pronto' : 'In costruzione'}
        </span>
      </div>

      {/* Privacy & Condivisione — B122 */}
      <div
        data-testid="workspace-privacy-card"
        style={{
          border:         '1px solid rgba(6,3,43,0.10)',
          borderRadius:   14,
          padding:        '18px 22px',
          background:     TOKENS.surface,
          marginTop:      16,
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.success, margin: '0 0 6px' }}>
            Privacy & Condivisione
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: TOKENS.ink, margin: '0 0 4px' }}>
            I tuoi dati restano privati
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Il datore di lavoro vede solo medie aggregate anonime. Mai dati individuali.
          </p>
          <a
            href="/worker/privacy"
            data-testid="workspace-privacy-link"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          TOKENS.success,
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         '1px solid rgba(47,125,85,0.28)',
              borderRadius:   8,
              background:     'rgba(47,125,85,0.06)',
            }}
          >
            Scopri i tuoi diritti &#8594;
          </a>
        </div>
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '3px 8px',
            borderRadius:  999,
            background:    'rgba(47,125,85,0.10)',
            color:         TOKENS.success,
          }}
        >
          Attivo
        </span>
      </div>

      {/* Private activation profile */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>Il mio profilo privato</h2>
        <ActivationProfileSection profile={activationProfile} />
      </div>

      {/* "KORA Foundation Light" removed as implementation-era scaffolding
          (KORA-WP-125 §10). The privacy statement it carried is Product truth
          and is preserved verbatim. */}
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: PX.ink3 }}>
        Spazio lavoratore · I dati aziendali rimangono aggregati e non mostrano dati individuali.
      </p>

      </Col>
      </Workspace>
    </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'rgba(6,3,43,0.45)', marginBottom: 14, marginTop: 0,
};


const PARTICIPATION_LABELS: Record<string, string> = {
  interested: 'Interessato',
  registered: 'Registrato',
  attended:   'Partecipato',
  cancelled:  'Cancellato',
};

function HistoryRow({ item }: { item: HistoryItem }) {
  const pillarColor = PILLAR_COLORS[item.pillar] ?? '#555';
  const partLabel   = PARTICIPATION_LABELS[item.participation_status] ?? item.participation_status;
  const date        = item.updated_at ? item.updated_at.slice(0, 10) : '—';

  return (
    <div style={{
      paddingBottom: 10, borderBottom: '1px solid rgba(6,3,43,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: pillarColor, marginRight: 6 }}>
            {item.pillar}
          </span>
          <span style={{ fontSize: 12, color: TOKENS.ink }}>{item.initiative_title}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.45)' }}>{partLabel}</span>
          <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', fontFamily: 'monospace' }}>{date}</span>
        </div>
      </div>
      {item.private_note && (
        <div style={{
          marginTop: 5, fontSize: 11, color: 'rgba(6,3,43,0.50)',
          background: 'rgba(6,3,43,0.03)', borderRadius: 5, padding: '5px 8px',
          fontStyle: 'italic', lineHeight: 1.4,
        }}>
          {item.private_note}
        </div>
      )}
    </div>
  );
}

const PILLAR_COLORS_MAP: Record<string, string> = {
  LIFE: PILLAR_COLORS.LIFE, GROWTH: PILLAR_COLORS.GROWTH, CONNECTION: PILLAR_COLORS.CONNECTION,
  IMPACT: PILLAR_COLORS.IMPACT, LEGACY: PILLAR_COLORS.LEGACY,
};
const DELIVERY_SHORT: Record<string, string> = {
  online: 'Online', onsite: 'In presenza', hybrid: 'Ibrido',
};

function PartnerPreviewRow({ partner }: { partner: { id: string; name: string; pillar: string; category: string | null; delivery_mode: string } }) {
  const pc = PILLAR_COLORS_MAP[partner.pillar] ?? '#555';
  return (
    <div style={{
      paddingBottom: 10, borderBottom: '1px solid rgba(6,3,43,0.05)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: pc, marginRight: 6 }}>
          {partner.pillar}
        </span>
        <span style={{ fontSize: 12, color: TOKENS.ink, fontWeight: 600 }}>{partner.name}</span>
        {partner.category && (
          <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', marginLeft: 6 }}>{partner.category}</span>
        )}
      </div>
      <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)', flexShrink: 0 }}>
        {DELIVERY_SHORT[partner.delivery_mode] ?? partner.delivery_mode}
      </span>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(6,3,43,0.05)' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(6,3,43,0.50)' }}>{label}</span>
      <span style={{ fontSize: 13, color: TOKENS.ink, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

function PlaceholderSection({ title, description }: { title: string; description: string }) {
  return (
    <div style={{
      background: TOKENS.surface, border: '1px dashed rgba(6,3,43,0.15)', borderRadius: 10, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: TOKENS.ink, margin: 0 }}>{title}</h3>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
          background: 'rgba(6,3,43,0.07)', color: 'rgba(6,3,43,0.45)', borderRadius: 3, padding: '1px 5px',
        }}>
          Prossimamente
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.45)', margin: 0, lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}
