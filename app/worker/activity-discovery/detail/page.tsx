// app/worker/activity-discovery/detail/page.tsx
// Worker — Activity Discovery detail preview (WORKER-ACTIVITY-DISCOVERY-01).
//
// Static preview of what a single Partner Activity detail view would show
// to a worker — one representative example, not a dynamic per-id route
// (kept static/low-risk, per this sprint's own fallback option). Explains
// what happens if the worker chooses the activity, what the partner would
// see after a voluntary worker action, and what the company would never
// see. No DB. No Supabase. No RPC. No real booking/request/contact/voucher
// logic. Access: WORKER only, same requireWorkerUser() pattern as
// app/worker/activity-discovery/page.tsx.

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { TOKENS, PILLAR_COLORS, SPACE, typeStyle, TYPE_FAMILY } from '@/lib/design/kora-design-tokens';
import { PageHead, Workspace, Col, Notice, Region, Band, SplitRegion, SplitPart, Facts } from '@/components/ui/px';
import {
  getPartnerActivityById,
  FISCAL_CATEGORY_LABELS,
  ACTIVITY_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
} from '@/lib/partner-activities/catalog';

export const metadata = { title: 'Dettaglio attività · KORA' };

// Static example — one representative activity from the shared catalog,
// chosen for illustration only. Not a dynamic [activityId] route.
const EXAMPLE_ACTIVITY_ID = 'activity-001';

export default async function WorkerActivityDiscoveryDetailPage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/login');

  const activity = getPartnerActivityById(EXAMPLE_ACTIVITY_ID);
  if (!activity) redirect('/worker/activity-discovery');

  const pillarColor = PILLAR_COLORS[activity.primaryPillar];

  return (
    <div
      data-testid="activity-detail-page"
      style={{ maxWidth: 820, margin: '0 auto', padding: `${SPACE.xl}px ${SPACE.md}px ${SPACE['2xl']}px`, fontFamily: TYPE_FAMILY }}
    >

      <PageHead
        eyebrow="Worker · Attività disponibili · Dettaglio (esempio)"
        title={activity.title}
        lead={activity.shortDescription}
      />

      {/* Preview banner — KORA-WP-125 Notice, copy unchanged. */}
      <Notice tone="info">
        Anteprima design — esempio statico, non un&apos;attività selezionabile dinamicamente. Non attivo.
      </Notice>

      <Workspace style={{ marginTop: SPACE.lg }}>

        {/* IDENTITY — the factual record, in the governed drawer grammar. The four
            Field blocks and the pillar chips were four equal panels; the pillars
            are subordinate to identity, so they read as a fact row, not a band of
            chips. */}
        <Col span="main">
          <Region label="Dettagli">
            <Facts
              rows={[
                ['Partner', activity.partnerName],
                ['Tipo attività', ACTIVITY_TYPE_LABELS[activity.activityType]],
                ['Categoria fiscale/welfare', FISCAL_CATEGORY_LABELS[activity.fiscalCategory]],
                ['Modalità di erogazione', DELIVERY_MODE_LABELS[activity.deliveryMode]],
                ['Pilastri', <>
                  <span style={{ ...typeStyle('caption', { weight: 700 }), color: pillarColor }}>{activity.primaryPillar}</span>
                  {' — primario'}
                  {activity.secondaryPillars.map((p) => (
                    <span key={p} style={{ color: TOKENS.inkHint }}>{`, ${p} — secondario`}</span>
                  ))}
                </>],
              ]}
            />
          </Region>
        </Col>

        {/* CONSEQUENCE — what choosing it would mean, and what each party would
            see. Two adjacent signals of the same kind belong in ONE surface with
            two labelled regions, not two panels. */}
        <Col span="rail">
          <Region label="Cosa succede se scegli questa attività" tone="inset">
            <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
              Sceglieresti volontariamente di avviare una relazione con <strong style={{ color: TOKENS.ink }}>{activity.partnerName}</strong>.
              Nessuna azione reale avviene in questa anteprima — in futuro, scegliere significherebbe
              prenotare, candidarti, richiedere contatto, o riscattare un voucher, a seconda dell&apos;attività.
            </p>
          </Region>
        </Col>

        {/* PRIVACY — kept at full measure and visually distinct. This is the
            worker's guarantee; it does not share a region with anything else. */}
        <Band tone="inset">
          <SplitRegion columns={2}>
            <SplitPart label="Cosa vedrebbe il partner dopo la tua azione volontaria">
              <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
                Solo i dati necessari a gestire la relazione che hai avviato tu — ad esempio il tuo nominativo e i
                contatti che scegli di condividere. Mai più di quanto serve, e mai senza la tua azione volontaria.
              </p>
            </SplitPart>
            <SplitPart label="Cosa non vedrebbe mai la tua azienda">
              <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
                La tua azienda non vedrebbe mai se hai scelto questa specifica attività, né alcun dettaglio della
                tua relazione con il partner. Riceve solo esiti aggregati, mai la tua scelta individuale.
              </p>
            </SplitPart>
          </SplitRegion>
        </Band>
      </Workspace>

      {/* ACTION — deliberately outside every informational surface, so the one
          affordance on the page does not read as another panel. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, flexWrap: 'wrap', marginTop: SPACE.lg }}>
        <button
          type="button"
          disabled
          title="Non attivo in questa anteprima — nessuna azione reale"
          style={{
            ...typeStyle('label', { weight: 700 }), padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: 10,
            border: `1px solid ${TOKENS.inkBorder}`, background: 'rgba(6,3,43,0.04)', color: TOKENS.inkHint, cursor: 'not-allowed',
          }}
        >
          Continua
        </button>
        <Link href="/worker/activity-discovery" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          ← Torna ad Attività disponibili
        </Link>
      </div>

    </div>
  );
}
