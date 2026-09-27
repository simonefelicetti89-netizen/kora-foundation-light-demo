// app/worker/activity-discovery/page.tsx
// Worker — Activity Discovery shell (WORKER-ACTIVITY-DISCOVERY-01).
//
// Phase 2 Activation Intelligence (see docs/KORA_ACTIVATION_LAYER_01.md).
// Shows the worker standard Partner Activities available inside a
// company-enabled activation perimeter (docs/COMPANY_ACTIVITY_SELECTION_01.md).
// These are NOT KORA Space initiatives and do NOT feed KORA Contribution.
// Browsing this page never exposes the worker to the employer. Choosing an
// activity (book/apply/request contact/redeem voucher) would create a
// worker-initiated relationship with the partner — no such action is real
// in this sprint. Reuses the static Partner Activity catalog
// (lib/partner-activities/catalog.ts) — no DB, no Supabase, no RPC, no
// real booking/request/contact/voucher logic, no worker eligibility logic.
//
// Access: WORKER only. requireWorkerUser enforced server-side, same pattern
// as app/worker/kora-link/activate/page.tsx. No employer-facing path to
// this content.

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { TOKENS, PILLAR_COLORS, PX, SPACE, typeStyle, TYPE_FAMILY, type PillarColorKey } from '@/lib/design/kora-design-tokens';
import {
  PageHead, Workspace, Col, Notice, Region, Band, SplitRegion, SplitPart, Facts, RankedGroup, Chip,
} from '@/components/ui/px';
import {
  getPartnerActivities,
  FISCAL_CATEGORY_LABELS,
  ACTIVITY_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
  PARTNER_ACTIVITY_STATUS_LABELS,
  INDEX_SIGNAL_ELIGIBILITY_LABELS,
  type PartnerActivity,
  type FutureWorkerAction,
} from '@/lib/partner-activities/catalog';

export const metadata = { title: 'Attività disponibili · KORA' };

interface FlowStep {
  step: string;
  note?: string;
}

function FlowMap({ steps }: { steps: FlowStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: SPACE.sm }}>
          <span style={{ ...typeStyle('caption'), color: TOKENS.inkHint, width: SPACE.md, flexShrink: 0 }}>{i + 1}</span>
          <div>
            <p style={{ margin: 0, ...typeStyle('label', { weight: 700 }), color: TOKENS.ink }}>{s.step}</p>
            {s.note && <p style={{ margin: '2px 0 0' /* optical: baseline nudge under the step label */, ...typeStyle('caption'), color: TOKENS.inkSecondary }}>{s.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Worker-facing CTA verb labels — presentational only, local to this page.
// Distinct from FUTURE_WORKER_ACTION_LABELS (noun form, used elsewhere as a
// descriptive tag) — this is the button text a worker would see.
const FUTURE_ACTION_CTA: Record<FutureWorkerAction, string> = {
  book: 'Prenota',
  apply: 'Candidati',
  request_contact: 'Richiedi contatto',
  redeem_voucher: 'Riscatta voucher',
  info_only: 'Scopri di più',
};

// One catalogue ROW per activity, not a card. KORA-WP-129 W1 remediation:
// the previous card carried up to eight chips (type, fiscal, primary pillar,
// every secondary pillar, delivery mode, status) at equal weight. Here the
// pillar keeps its colour — it is the field the catalogue groups by — and every
// other qualifier collapses into one quiet caption line. Status stays a Chip
// because it is a truth signal, not a qualifier.
function ActivityRow({ activity, last }: { activity: PartnerActivity; last: boolean }) {
  const pillarColor = PILLAR_COLORS[activity.primaryPillar];
  const qualifiers = [
    ACTIVITY_TYPE_LABELS[activity.activityType],
    FISCAL_CATEGORY_LABELS[activity.fiscalCategory],
    DELIVERY_MODE_LABELS[activity.deliveryMode],
    ...(activity.secondaryPillars.length > 0 ? [`anche ${activity.secondaryPillars.join(' · ')}`] : []),
  ].join(' · ');
  return (
    <div
      style={{
        display: 'grid', gap: SPACE.xs, padding: `${SPACE.md}px 0`,
        borderBottom: last ? undefined : `1px solid ${PX.line}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.sm, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, ...typeStyle('label', { weight: 700 }), color: TOKENS.ink }}>
          {activity.title}
          <span style={{ ...typeStyle('caption'), color: TOKENS.inkHint }}>{' · '}{activity.partnerName}</span>
        </p>
        <Chip>{PARTNER_ACTIVITY_STATUS_LABELS[activity.status]}</Chip>
      </div>

      <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkSecondary }}>{activity.shortDescription}</p>

      <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
        <span style={{ ...typeStyle('caption', { weight: 700 }), color: pillarColor }}>{activity.primaryPillar}</span>
        {' · '}{qualifiers}
        {' · '}Segnale KORA Index: {INDEX_SIGNAL_ELIGIBILITY_LABELS[activity.indexSignalEligibility]}
      </p>

      <button
        type="button"
        disabled
        title="Non attivo in questa anteprima — nessuna azione reale"
        style={{
          ...typeStyle('caption', { weight: 700 }), padding: `${SPACE.xs}px ${SPACE.md}px`, borderRadius: 8, justifySelf: 'start',
          border: `1px solid ${TOKENS.inkBorder}`, background: 'rgba(6,3,43,0.04)', color: TOKENS.inkHint, cursor: 'not-allowed',
        }}
      >
        {FUTURE_ACTION_CTA[activity.futureWorkerAction]}
      </button>
    </div>
  );
}

const LANES: { pillar: PillarColorKey; label: string }[] = [
  { pillar: 'LIFE', label: 'Per il tuo benessere' },
  { pillar: 'GROWTH', label: 'Per crescere' },
  { pillar: 'CONNECTION', label: 'Per connetterti' },
  { pillar: 'IMPACT', label: 'Per contribuire' },
  { pillar: 'LEGACY', label: 'Per lasciare traccia' },
];

export default async function WorkerActivityDiscoveryPage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/login');

  const activities = getPartnerActivities();
  const fiscalCategoryCount = new Set(activities.map((a) => a.fiscalCategory)).size;
  const partnerCount = new Set(activities.map((a) => a.partnerName)).size;
  const activityTypeCount = new Set(activities.map((a) => a.activityType)).size;
  const actionCount = new Set(activities.map((a) => a.futureWorkerAction)).size;

  return (
    <div
      data-testid="activity-discovery-page"
      style={{ maxWidth: 1180, margin: '0 auto', padding: `${SPACE.xl}px ${SPACE.md}px ${SPACE['2xl']}px`, fontFamily: TYPE_FAMILY }}
    >

      <PageHead
        eyebrow="Worker · Fase 2 Activation Intelligence"
        title="Attività disponibili"
        lead={<>
          Queste sono Attività Partner standard — non iniziative KORA Space, non iniziative Contribution.
          La scelta è sempre tua e volontaria: sfogliare questa pagina non ti espone in alcun modo alla tua
          azienda. L&apos;azienda riceve solo esiti aggregati; il partner vede informazioni nominative solo
          dopo un&apos;azione che scegli tu di avviare.
        </>}
      />

      {/* Preview banner — KORA-WP-125 Notice, copy unchanged. Deliberately NOT a
          KORA-WP-140 state: the seven states answer "why is this DATA absent",
          while this answers "this CAPABILITY is not live". See report. */}
      <Notice tone="info">
        <strong>Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.</strong>
        {' '}
        Nessuna prenotazione, candidatura, richiesta di contatto o riscatto voucher è reale in questa build.
      </Notice>

      {/* PRIVACY / CONTROL — first thing after the lead, at full measure, on both
          desktop and mobile. This is the worker's guarantee about browsing; it
          outranks the catalogue it governs. */}
      <Workspace style={{ marginTop: SPACE.lg }}>
        <Band tone="inset">
          <div style={{ padding: `${SPACE.md}px ${SPACE.md}px` }}>
            <p style={{ margin: `0 0 ${SPACE.sm}px`, ...typeStyle('meta'), color: TOKENS.inkHint }}>Il tuo controllo</p>
            <ul style={{ margin: 0, paddingLeft: SPACE.md, display: 'grid', gap: SPACE.sm }}>
              <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>Sfogliare queste attività non ti espone in alcun modo alla tua azienda.</li>
              <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>Scegliere di prenotare, candidarti, richiedere contatto o riscattare un voucher creerebbe una relazione avviata da te con il partner.</li>
              <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>Solo i dati necessari a quella relazione verrebbero condivisi con il partner — mai di più.</li>
              <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>La tua azienda continuerebbe a ricevere solo report aggregati, mai la tua scelta individuale.</li>
              <li style={{ ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>Nessuna prenotazione o condivisione reale avviene in questo sprint.</li>
            </ul>
          </div>
        </Band>
      </Workspace>

      <Workspace style={{ marginTop: SPACE.lg }}>

        {/* PRIMARY — the catalogue. Each of the real activities renders EXACTLY
            ONCE, in its PRIMARY pillar group; secondary pillars read as row
            metadata rather than as a second render. Founder adjudication
            2026-09-27: the catalogue represents real activities, not
            activity × taxonomy-membership combinations. */}
        <Col span="main">
          <Region label="Catalogo attività">
            <p style={{ margin: `0 0 ${SPACE.md}px`, ...typeStyle('caption'), color: TOKENS.inkHint }}>
              Sono suggerimenti, non classifiche. Nessuna profilazione individuale, nessun tracciamento delle tue
              preferenze visibile all&apos;azienda.
            </p>
            {LANES.map((lane) => {
              const laneActivities = activities.filter((a) => a.primaryPillar === lane.pillar);
              if (laneActivities.length === 0) return null;
              return (
                <RankedGroup key={lane.pillar} title={lane.label} tier="subsection">
                  {laneActivities.map((a, i) => (
                    <ActivityRow key={a.activityId} activity={a} last={i === laneActivities.length - 1} />
                  ))}
                </RankedGroup>
              );
            })}
          </Region>
        </Col>

        {/* Rail — orientation only. The control statement is deliberately NOT
            here: Founder mobile priority for this surface is
            privacy/control -> catalogue -> counts -> explanation, and a rail
            renders AFTER main when the grid collapses. It is a full-measure band
            above the grid instead. */}
        <Col span="rail">
          <Region label="Sfoglia per">
            <Facts
              rows={[
                ['Pilastro KORA', '5'],
                ['Categoria fiscale/welfare', String(fiscalCategoryCount)],
                ['Partner', String(partnerCount)],
                ['Tipo attività', String(activityTypeCount)],
                ['Azione futura', String(actionCount)],
              ]}
            />
            <p style={{ margin: `${SPACE.sm}px 0 0`, ...typeStyle('caption'), color: TOKENS.inkHint }}>
              Anteprima — nessun filtro interattivo reale in questa build.
            </p>
          </Region>
        </Col>

        {/* DEMOTED — model explanation. One inset band with three labelled
            regions separated by a rule, rather than three panels competing with
            the catalogue for primary weight. No information is removed. */}
        <Band tone="inset">
          <SplitRegion columns={3}>
            <SplitPart label="Flusso Fase 2">
              <FlowMap
                steps={[
                  { step: 'L\'azienda abilita un perimetro', note: 'Categoria fiscale, pilastro, partner, o scelta libera — vedi /company/activity-selection.' },
                  { step: 'Tu scegli volontariamente' },
                  { step: 'Il partner gestisce la relazione' },
                  { step: 'KORA aggrega i segnali' },
                  { step: 'Futuro segnale KORA Index' },
                ]}
              />
            </SplitPart>
            <SplitPart label="Nota KORA Index">
              <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkSecondary }}>
                L&apos;attivazione di queste attività potrà in futuro diventare un segnale aggregato per il KORA
                Index. Nessun calcolo live del KORA Index è modificato in questo sprint. Le tue scelte individuali
                non vengono mai riportate all&apos;azienda.
              </p>
            </SplitPart>
            <SplitPart label="Nota Contribution">
              <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkSecondary }}>
                Le Attività Partner non alimentano mai direttamente KORA Contribution. Le iniziative KORA Space
                restano separate. Alcune attività potranno essere impacchettate in un&apos;iniziativa solo tramite
                un percorso separato di proposta, revisione e adozione.
              </p>
            </SplitPart>
          </SplitRegion>
        </Band>
      </Workspace>

      {/* Cross-links */}
      <div style={{ display: 'flex', gap: SPACE.sm, flexWrap: 'wrap', marginTop: SPACE.lg }}>
        <Link href="/worker/activity-discovery/detail" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          Anteprima dettaglio attività →
        </Link>
        <Link href="/worker/commons" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Space — iniziative reali (diverso dalle attività) →
        </Link>
        <Link href="/partner/activity-catalog" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          Catalogo Attività Partner (vista partner) →
        </Link>
        <Link href="/company/activity-selection" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          Come l&apos;azienda configura il perimetro →
        </Link>
        <Link href="/admin/kora-activation-layer" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Activation Layer — riferimento di modello →
        </Link>
      </div>

    </div>
  );
}
