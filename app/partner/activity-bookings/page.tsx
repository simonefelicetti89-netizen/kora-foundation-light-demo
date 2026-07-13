// app/partner/activity-bookings/page.tsx
// Partner — Activity Bookings/Requests shell (PARTNER-ACTIVITY-BOOKINGS-01).
//
// Phase 2 Activation Intelligence (see docs/KORA_ACTIVATION_LAYER_01.md).
// Shows how a partner would see worker-initiated actions (booking,
// application, contact request, voucher redemption, info request) tied to
// standard Partner Activities (lib/partner-activities/catalog.ts). These
// are NOT KORA Space initiatives and do NOT feed KORA Contribution.
//
// Named worker data appears on this page ONLY because each record models a
// relationship the worker voluntarily initiated — same principle already
// implemented in /partner/relationships (PARTNER-SURFACE-01). Browsing
// alone (Worker Activity Discovery) is never visible to the partner.
//
// Pure UI/UX preview. No DB. No Supabase. No RPC. No real booking/request/
// contact/voucher persistence. No status mutation, no server action, no
// fetch — every status shown is static preview data.
// Protected by app/partner/layout.tsx (requirePartnerUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS, PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import {
  getPartnerActivityBookings,
  getPartnerActivityBookingsSummary,
  WORKER_ACTION_TYPE_LABELS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLOR,
  type PartnerActivityBookingPreview,
  type BookingStatus,
} from '@/lib/partner-activities/bookings';
import { FISCAL_CATEGORY_LABELS } from '@/lib/partner-activities/catalog';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

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

function MetricCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: TOKENS.ink }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{note}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
        background: 'rgba(6,3,43,0.05)', color: TOKENS.inkSecondary, border: `1px solid ${TOKENS.inkBorder}`,
      }}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const color = BOOKING_STATUS_COLOR[status];
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: color.bg, color: color.text, whiteSpace: 'nowrap' }}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

interface FlowStep {
  step: string;
  note?: string;
}

function FlowMap({ steps }: { steps: FlowStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 10.5, color: TOKENS.inkHint, width: 16, flexShrink: 0 }}>{i + 1}</span>
          <div>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>{s.step}</p>
            {s.note && <p style={{ margin: '2px 0 0', fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{s.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingCard({ b }: { b: PartnerActivityBookingPreview }) {
  const pillarColor = PILLAR_COLORS[b.primaryPillar];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TOKENS.ink }}>{b.workerDisplayName}</p>
        <StatusBadge status={b.status} />
      </div>

      <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkSecondary }}>
        {WORKER_ACTION_TYPE_LABELS[b.workerActionType]} — {b.activityTitle}
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Tag>{FISCAL_CATEGORY_LABELS[b.fiscalCategory]}</Tag>
        <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${pillarColor}1A`, color: pillarColor, border: `1px solid ${pillarColor}45` }}>
          {b.primaryPillar}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11.5, color: TOKENS.inkSecondary }}>
        <span>Richiesta: {b.requestedAt}</span>
        <span>Preferenza: {b.preferredSlotOrTiming}</span>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11.5, color: TOKENS.inkSecondary }}>
        <span>Email condivisa: <strong style={{ color: TOKENS.ink }}>{b.workerSharedFields.email ? 'sì' : 'no'}</strong></span>
        <span>Telefono condiviso: <strong style={{ color: TOKENS.ink }}>{b.workerSharedFields.phone ? 'sì' : 'no'}</strong></span>
      </div>

      <p style={{ margin: 0, fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
        Uso consentito: {b.partnerAllowedUse}
      </p>

      <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: TOKENS.inkHint }}>
        Visibilità azienda: solo aggregato — base del consenso: iniziativa del lavoratore
      </p>
    </div>
  );
}

export default function PartnerActivityBookingsPage() {
  const bookings = getPartnerActivityBookings();
  const summary = getPartnerActivityBookingsSummary();

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 1. Intro panel */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · Fase 2 Activation Intelligence
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Richieste e prenotazioni attività
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 740 }}>
          Queste sono azioni avviate volontariamente dai lavoratori su Attività Partner standard — non
          iniziative KORA Space, non iniziative Contribution. I nominativi compaiono qui solo perché il
          lavoratore ha scelto di avviare la relazione. L&apos;azienda riceve solo output aggregati. Nessuna
          prenotazione, candidatura, richiesta di contatto o riscatto voucher è reale in questo sprint.
        </p>
      </div>

      {/* Preview banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          I nominativi mostrati sono lavoratori fittizi di esempio. Nessuna condivisione reale, nessuna
          notifica reale, nessun aggiornamento di stato reale avviene in questa build.
        </p>
      </div>

      {/* 2. Summary cards */}
      <Panel>
        <SectionLabel>Riepilogo</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <MetricCard label="Nuove" value={summary.byStatus['new'] ?? 0} note="Richieste appena arrivate." />
          <MetricCard label="Confermate" value={summary.byStatus['confirmed'] ?? 0} note="Prenotazioni confermate dal partner." />
          <MetricCard label="Completate" value={summary.byStatus['completed'] ?? 0} note="Attività erogate con successo." />
          <MetricCard label="Richiedono follow-up" value={summary.byStatus['follow_up_needed'] ?? 0} note="Richiedono un'azione del partner." />
          <MetricCard label="Tipi di azione" value={Object.keys(summary.byActionType).length} note="Prenotazione, candidatura, contatto, voucher, informazioni." />
          <MetricCard label="Pilastri coinvolti" value={Object.keys(summary.byPillar).length} note="Pilastri KORA rappresentati nelle richieste." />
          <MetricCard label="Categorie fiscali" value={Object.keys(summary.byFiscalCategory).length} note="Categorie fiscali/welfare rappresentate." />
          <MetricCard label="Totale richieste" value={summary.totalBookings} note="Numero totale di record mock." />
        </div>
      </Panel>

      {/* 3. Booking cards */}
      <Panel>
        <SectionLabel>Richieste (dati mock, lavoratori fittizi)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.map((b) => <BookingCard key={b.bookingId} b={b} />)}
        </div>
      </Panel>

      {/* 4. Worker data boundary panel */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Confine dati worker</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il partner vede il nominativo del lavoratore solo perché il lavoratore ha avviato una prenotazione, candidatura, richiesta di contatto, riscatto voucher, o richiesta informazioni.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il partner può usare i campi condivisi solo per evadere quella specifica richiesta.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>La sola navigazione (Worker Activity Discovery) non è mai visibile al partner.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>L&apos;azienda non riceve mai i dettagli nominativi di queste richieste.</li>
        </ul>
      </div>

      {/* 5. Company aggregate-only panel */}
      <Panel>
        <SectionLabel>Cosa potrebbe vedere l&apos;azienda (futuro, solo aggregato)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: TOKENS.safeguard.pass.text }}>Potrebbe includere</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Numero di prenotazioni</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Completamenti</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Distribuzione per pilastro</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Distribuzione per categoria fiscale/welfare</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Fasce di valore</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Soddisfazione aggregata, se raccolta</li>
            </ul>
          </div>
          <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: TOKENS.safeguard.cap.text }}>Non includerebbe mai</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Nominativi dei lavoratori</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Email</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Stato individuale della singola prenotazione</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Scelte individuali di attività</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Riscatti voucher individuali</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Dettagli della relazione partner-lavoratore</li>
            </ul>
          </div>
        </div>
      </Panel>

      {/* 6. Status workflow preview */}
      <Panel>
        <SectionLabel>Anteprima flusso di stato (non funzionale)</SectionLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['new', 'confirmed', 'completed', 'cancelled', 'withdrawn', 'follow_up_needed'] as BookingStatus[]).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: TOKENS.inkHint }}>
          Solo anteprima — nessun aggiornamento di stato è possibile in questa build.
        </p>
      </Panel>

      {/* 7. Phase 2 flow note */}
      <Panel>
        <SectionLabel>Flusso Fase 2</SectionLabel>
        <FlowMap
          steps={[
            { step: 'Il lavoratore sceglie volontariamente', note: 'Vedi /worker/activity-discovery.' },
            { step: 'Il partner gestisce la richiesta', note: 'Questa pagina.' },
            { step: 'KORA aggrega i segnali di attivazione' },
            { step: 'Futuro segnale KORA Index' },
          ]}
        />
      </Panel>

      {/* 8. KORA Index note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nota KORA Index</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Un&apos;attività completata o evasa potrà in futuro diventare un segnale aggregato per il KORA
          Index. Questo sprint non modifica il calcolo live del KORA Index.
        </p>
      </div>

      {/* 9. Contribution note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nota Contribution</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Le prenotazioni di Attività Partner non alimentano mai direttamente KORA Contribution. Le
          iniziative KORA Space restano separate.
        </p>
      </div>

      {/* Cross-links */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/partner/activity-bookings/detail" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Anteprima dettaglio richiesta →
        </Link>
        <Link href="/partner/activity-catalog" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Catalogo Attività →
        </Link>
        <Link href="/worker/activity-discovery" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Vista worker — Attività disponibili →
        </Link>
        <Link href="/partner/privacy-boundary" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Confine privacy partner →
        </Link>
        <Link href="/admin/kora-activation-layer" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Activation Layer →
        </Link>
        <Link href="/admin/activation-signal-pipeline" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Activation Signal Pipeline →
        </Link>
      </div>

    </div>
  );
}
