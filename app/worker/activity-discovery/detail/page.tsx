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
import { PageHead, Workspace, Col, Notice } from '@/components/ui/px';
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

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: SPACE.md }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...typeStyle('meta'), color: TOKENS.inkHint, margin: `0 0 ${SPACE.sm}px` }}>
      {children}
    </p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: '0 0 3px' /* optical: label-to-value nudge */, ...typeStyle('meta'), color: TOKENS.inkHint }}>{label}</p>
      <p style={{ margin: 0, ...typeStyle('label', { weight: 600 }), color: TOKENS.ink }}>{value}</p>
    </div>
  );
}

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

      <Workspace>
        <Col span="full">

      {/* Preview banner — KORA-WP-125 Notice, copy unchanged. */}
      <Notice tone="info">
        Anteprima design — esempio statico, non un&apos;attività selezionabile dinamicamente. Non attivo.
      </Notice>

      {/* Details */}
      <Panel>
        <SectionLabel>Dettagli</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: SPACE.md }}>
          <Field label="Partner" value={activity.partnerName} />
          <Field label="Tipo attività" value={ACTIVITY_TYPE_LABELS[activity.activityType]} />
          <Field label="Categoria fiscale/welfare" value={FISCAL_CATEGORY_LABELS[activity.fiscalCategory]} />
          <Field label="Modalità di erogazione" value={DELIVERY_MODE_LABELS[activity.deliveryMode]} />
        </div>
      </Panel>

      {/* Pillar mapping */}
      <Panel>
        <SectionLabel>Pilastri</SectionLabel>
        <div style={{ display: 'flex', gap: SPACE.sm, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-block', ...typeStyle('caption', { weight: 700 }), padding: `${SPACE.xs}px 12px` /* optical: chip-internal, KORA-WP-141 documented exception */, borderRadius: 999, background: `${pillarColor}1A`, color: pillarColor, border: `1px solid ${pillarColor}45` }}>
            {activity.primaryPillar} — primario
          </span>
          {activity.secondaryPillars.map((p) => (
            <span key={p} style={{ display: 'inline-block', ...typeStyle('caption', { weight: 600 }), padding: `${SPACE.xs}px 12px` /* optical: chip-internal, KORA-WP-141 documented exception */, borderRadius: 999, background: 'rgba(6,3,43,0.04)', color: TOKENS.inkHint, border: `1px solid ${TOKENS.inkBorder}` }}>
              {p} — secondario
            </span>
          ))}
        </div>
      </Panel>

      {/* What happens if you choose it */}
      <Panel>
        <SectionLabel>Cosa succede se scegli questa attività</SectionLabel>
        <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
          Sceglieresti volontariamente di avviare una relazione con <strong style={{ color: TOKENS.ink }}>{activity.partnerName}</strong>.
          Nessuna azione reale avviene in questa anteprima — in futuro, scegliere significherebbe
          prenotare, candidarti, richiedere contatto, o riscattare un voucher, a seconda dell&apos;attività.
        </p>
      </Panel>

      {/* What the partner would see */}
      <Panel>
        <SectionLabel>Cosa vedrebbe il partner dopo la tua azione volontaria</SectionLabel>
        <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
          Solo i dati necessari a gestire la relazione che hai avviato tu — ad esempio il tuo nominativo e i
          contatti che scegli di condividere. Mai più di quanto serve, e mai senza la tua azione volontaria.
        </p>
      </Panel>

      {/* What the company would never see */}
      <div style={{ background: TOKENS.insetPanel, border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: `${SPACE.md}px ${SPACE.md}px` }}>
        <SectionLabel>Cosa non vedrebbe mai la tua azienda</SectionLabel>
        <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
          La tua azienda non vedrebbe mai se hai scelto questa specifica attività, né alcun dettaglio della
          tua relazione con il partner. Riceve solo esiti aggregati, mai la tua scelta individuale.
        </p>
      </div>

      {/* Preview-only CTA */}
      <button
        type="button"
        disabled
        title="Non attivo in questa anteprima — nessuna azione reale"
        style={{
          ...typeStyle('label', { weight: 700 }), padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: 10, alignSelf: 'flex-start',
          border: `1px solid ${TOKENS.inkBorder}`, background: 'rgba(6,3,43,0.04)', color: TOKENS.inkHint, cursor: 'not-allowed',
        }}
      >
        Continua
      </button>

      <p style={{ ...typeStyle('caption'), color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/worker/activity-discovery" style={{ ...typeStyle('label', { weight: 700 }), color: TOKENS.accent, textDecoration: 'none' }}>
          ← Torna ad Attività disponibili
        </Link>
      </p>

        </Col>
      </Workspace>

    </div>
  );
}
