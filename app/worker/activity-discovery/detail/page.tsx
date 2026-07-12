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
import { TOKENS, PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import {
  getPartnerActivityById,
  FISCAL_CATEGORY_LABELS,
  ACTIVITY_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
} from '@/lib/partner-activities/catalog';

export const metadata = { title: 'Dettaglio attività · KORA' };

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

// Static example — one representative activity from the shared catalog,
// chosen for illustration only. Not a dynamic [activityId] route.
const EXAMPLE_ACTIVITY_ID = 'activity-001';

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: 20 }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 10px' }}>
      {children}
    </p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: '0 0 3px', fontSize: 10.5, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.ink, fontWeight: 600 }}>{value}</p>
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
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Worker · Attività disponibili · Dettaglio (esempio)
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {activity.title}
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          {activity.shortDescription}
        </p>
      </div>

      {/* Preview banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — esempio statico, non un&apos;attività selezionabile dinamicamente. Non attivo.
        </p>
      </div>

      {/* Details */}
      <Panel>
        <SectionLabel>Dettagli</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="Partner" value={activity.partnerName} />
          <Field label="Tipo attività" value={ACTIVITY_TYPE_LABELS[activity.activityType]} />
          <Field label="Categoria fiscale/welfare" value={FISCAL_CATEGORY_LABELS[activity.fiscalCategory]} />
          <Field label="Modalità di erogazione" value={DELIVERY_MODE_LABELS[activity.deliveryMode]} />
        </div>
      </Panel>

      {/* Pillar mapping */}
      <Panel>
        <SectionLabel>Pilastri</SectionLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: `${pillarColor}1A`, color: pillarColor, border: `1px solid ${pillarColor}45` }}>
            {activity.primaryPillar} — primario
          </span>
          {activity.secondaryPillars.map((p) => (
            <span key={p} style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: 'rgba(6,3,43,0.04)', color: TOKENS.inkHint, border: `1px solid ${TOKENS.inkBorder}` }}>
              {p} — secondario
            </span>
          ))}
        </div>
      </Panel>

      {/* What happens if you choose it */}
      <Panel>
        <SectionLabel>Cosa succede se scegli questa attività</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Sceglieresti volontariamente di avviare una relazione con <strong style={{ color: TOKENS.ink }}>{activity.partnerName}</strong>.
          Nessuna azione reale avviene in questa anteprima — in futuro, scegliere significherebbe
          prenotare, candidarti, richiedere contatto, o riscattare un voucher, a seconda dell&apos;attività.
        </p>
      </Panel>

      {/* What the partner would see */}
      <Panel>
        <SectionLabel>Cosa vedrebbe il partner dopo la tua azione volontaria</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Solo i dati necessari a gestire la relazione che hai avviato tu — ad esempio il tuo nominativo e i
          contatti che scegli di condividere. Mai più di quanto serve, e mai senza la tua azione volontaria.
        </p>
      </Panel>

      {/* What the company would never see */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Cosa non vedrebbe mai la tua azienda</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
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
          fontSize: 12.5, fontWeight: 700, padding: '10px 18px', borderRadius: 10, alignSelf: 'flex-start',
          border: `1px solid ${TOKENS.inkBorder}`, background: 'rgba(6,3,43,0.04)', color: TOKENS.inkHint, cursor: 'not-allowed',
        }}
      >
        Continua
      </button>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/worker/activity-discovery" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna ad Attività disponibili
        </Link>
      </p>

    </div>
  );
}
