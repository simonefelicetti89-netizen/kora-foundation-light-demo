// app/partner/activity-bookings/detail/page.tsx
// Partner — Activity Booking detail preview (PARTNER-ACTIVITY-BOOKINGS-01).
//
// Static preview of a single worker-initiated request — one representative
// example, not a dynamic per-id route (kept static/low-risk, mirroring
// app/worker/activity-discovery/detail/page.tsx's own fallback choice).
// Shows worker shared fields, the activity, action type, status, what the
// partner can do, what the company cannot see, the privacy/consent basis,
// and a preview-only status timeline. No DB. No Supabase. No RPC. No real
// status update, no fetch, no server action.
// Protected by app/partner/layout.tsx (requirePartnerUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TOKENS, PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import {
  getPartnerActivityBookingById,
  WORKER_ACTION_TYPE_LABELS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLOR,
  type BookingStatus,
} from '@/lib/partner-activities/bookings';
import { FISCAL_CATEGORY_LABELS } from '@/lib/partner-activities/catalog';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

// Static example — one representative booking from the shared mock set.
const EXAMPLE_BOOKING_ID = 'booking-001';

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

const TIMELINE: { status: BookingStatus; reached: boolean }[] = [
  { status: 'new', reached: true },
  { status: 'confirmed', reached: true },
  { status: 'completed', reached: false },
];

export default function PartnerActivityBookingDetailPage() {
  const booking = getPartnerActivityBookingById(EXAMPLE_BOOKING_ID);
  if (!booking) redirect('/partner/activity-bookings');

  const pillarColor = PILLAR_COLORS[booking.primaryPillar];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · Richieste attività · Dettaglio (esempio)
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {booking.workerDisplayName}
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          {WORKER_ACTION_TYPE_LABELS[booking.workerActionType]} per {booking.activityTitle}. Nominativo visibile
          solo perché il lavoratore ha avviato questa richiesta volontariamente.
        </p>
      </div>

      {/* Preview banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — esempio statico, lavoratore fittizio. Non attivo.
        </p>
      </div>

      {/* Worker shared fields */}
      <Panel>
        <SectionLabel>Campi condivisi dal lavoratore</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          <Field label="Nome" value={booking.workerSharedFields.name} />
          <Field label="Cognome" value={booking.workerSharedFields.surname} />
          <Field label="Email" value={booking.workerSharedFields.email ?? 'Non condivisa'} />
          <Field label="Telefono" value={booking.workerSharedFields.phone ?? 'Non condiviso'} />
          <Field label="Contatto preferito" value={booking.workerSharedFields.preferredContact ?? '—'} />
        </div>
        {booking.workerSharedFields.notes && (
          <p style={{ margin: '12px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
            Note del lavoratore: {booking.workerSharedFields.notes}
          </p>
        )}
      </Panel>

      {/* Activity + classification */}
      <Panel>
        <SectionLabel>Attività</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          <Field label="Attività" value={booking.activityTitle} />
          <Field label="Partner" value={booking.partnerName} />
          <Field label="Categoria fiscale" value={FISCAL_CATEGORY_LABELS[booking.fiscalCategory]} />
          <Field label="Tipo di azione" value={WORKER_ACTION_TYPE_LABELS[booking.workerActionType]} />
        </div>
        <div style={{ marginTop: 12 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: `${pillarColor}1A`, color: pillarColor, border: `1px solid ${pillarColor}45` }}>
            {booking.primaryPillar}
          </span>
        </div>
      </Panel>

      {/* What the partner can do */}
      <Panel>
        <SectionLabel>Cosa può fare il partner</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          {booking.partnerAllowedUse}
        </p>
      </Panel>

      {/* What the company cannot see */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Cosa non vede l&apos;azienda</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          L&apos;azienda non vede il nominativo, i campi condivisi, lo stato individuale, o il tipo di azione
          di questa richiesta. Riceve solo esiti aggregati.
        </p>
      </div>

      {/* Privacy/consent basis */}
      <Panel>
        <SectionLabel>Base di consenso e visibilità</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="Base del consenso" value="Iniziativa del lavoratore" />
          <Field label="Visibilità azienda" value="Solo aggregato" />
        </div>
      </Panel>

      {/* Preview-only status timeline */}
      <Panel>
        <SectionLabel>Anteprima cronologia stato (non funzionale)</SectionLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIMELINE.map((t) => {
            const color = BOOKING_STATUS_COLOR[t.status];
            return (
              <span
                key={t.status}
                style={{
                  fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                  background: t.reached ? color.bg : 'rgba(6,3,43,0.04)',
                  color: t.reached ? color.text : TOKENS.inkHint,
                  border: t.reached ? 'none' : `1px dashed ${TOKENS.inkBorder}`,
                }}
              >
                {BOOKING_STATUS_LABELS[t.status]}
              </span>
            );
          })}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: TOKENS.inkHint }}>
          Solo anteprima — nessun aggiornamento di stato reale è possibile in questa build.
        </p>
      </Panel>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/activity-bookings" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna a Richieste e prenotazioni attività
        </Link>
      </p>

    </div>
  );
}
