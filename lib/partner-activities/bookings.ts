// lib/partner-activities/bookings.ts
// Partner Activity Bookings/Requests — static/in-memory preview model
// (PARTNER-ACTIVITY-BOOKINGS-01).
//
// Models what a partner would see AFTER a worker voluntarily initiates a
// relationship (booking, application, contact request, voucher redemption,
// or info request) tied to a standard Partner Activity
// (lib/partner-activities/catalog.ts). This is NOT a KORA Space
// initiative, and it never feeds KORA Contribution.
//
// Names appear here ONLY because each record models a worker-initiated
// relationship — the same design already established in
// app/partner/relationships/page.tsx (PARTNER-SURFACE-01). Every mock name
// below is fictitious, distinct from the /partner/relationships mock set,
// and not derived from any real person, seed file, or live source.
//
// Pure static data + pure functions. No DB. No Supabase. No RPC. No env
// access. No fetch, no mutation, no server action — this module has no
// side effects of any kind.

import type { DeliveryMode, FiscalCategory } from './catalog';
import type { PillarColorKey } from '@/lib/design/kora-design-tokens';
import { getPartnerActivityById } from './catalog';

// ── Enums ──────────────────────────────────────────────────────────────────

export type WorkerActionType = 'booking' | 'application' | 'contact_request' | 'voucher_redemption' | 'info_request';

export type BookingStatus = 'new' | 'confirmed' | 'completed' | 'cancelled' | 'withdrawn' | 'follow_up_needed';

// ── Entity ─────────────────────────────────────────────────────────────────

export interface WorkerSharedFields {
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  preferredContact: string | null;
  notes: string | null;
}

export interface PartnerActivityBookingPreview {
  bookingId: string;
  activityId: string;
  activityTitle: string;
  partnerId: string;
  partnerName: string;
  workerDisplayName: string;
  workerInitials: string;
  workerSharedFields: WorkerSharedFields;
  workerActionType: WorkerActionType;
  status: BookingStatus;
  requestedAt: string;
  preferredSlotOrTiming: string;
  deliveryMode: DeliveryMode;
  fiscalCategory: FiscalCategory;
  primaryPillar: PillarColorKey;
  /** Always 'aggregate_only' — the company never receives this record's individual fields. */
  companyVisibility: 'aggregate_only';
  /** Always 'worker_initiated' — this is the sole basis for the partner seeing a name at all. */
  consentBasis: 'worker_initiated';
  partnerAllowedUse: string;
  employerHiddenFields: string[];
  previewOnly: true;
}

// ── Display labels (Italian, UI-facing) ─────────────────────────────────────

export const WORKER_ACTION_TYPE_LABELS: Record<WorkerActionType, string> = {
  booking: 'Prenotazione',
  application: 'Candidatura',
  contact_request: 'Richiesta di contatto',
  voucher_redemption: 'Riscatto voucher',
  info_request: 'Richiesta informazioni',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new: 'Nuova',
  confirmed: 'Confermata',
  completed: 'Completata',
  cancelled: 'Annullata',
  withdrawn: 'Ritirata',
  follow_up_needed: 'Richiede follow-up',
};

export const BOOKING_STATUS_COLOR: Record<BookingStatus, { bg: string; text: string }> = {
  new: { bg: 'rgba(97,86,245,0.10)', text: '#6156F5' },
  confirmed: { bg: 'rgba(47,125,85,0.10)', text: '#2F7D55' },
  completed: { bg: 'rgba(47,125,85,0.18)', text: '#2F7D55' },
  cancelled: { bg: 'rgba(6,3,43,0.06)', text: 'rgba(6,3,43,0.42)' },
  withdrawn: { bg: 'rgba(6,3,43,0.06)', text: 'rgba(6,3,43,0.42)' },
  follow_up_needed: { bg: 'rgba(217,154,43,0.12)', text: '#8A5A00' },
};

export const EMPLOYER_HIDDEN_FIELDS_STANDARD: string[] = [
  'workerDisplayName', 'workerInitials', 'workerSharedFields', 'status', 'requestedAt', 'preferredSlotOrTiming',
];

function fieldsFromActivity(activityId: string) {
  const activity = getPartnerActivityById(activityId);
  return {
    activityTitle: activity?.title ?? '',
    partnerId: activity?.partnerId ?? '',
    partnerName: activity?.partnerName ?? '',
    deliveryMode: activity?.deliveryMode ?? ('onsite' as DeliveryMode),
    fiscalCategory: activity?.fiscalCategory ?? ('da_classificare' as FiscalCategory),
    primaryPillar: activity?.primaryPillar ?? ('LIFE' as PillarColorKey),
  };
}

// ── Mock bookings — illustrative only, not persisted, not derived from any live source.
// Fictitious names, distinct from app/partner/relationships/page.tsx's mock set.
// No health details, no union/political data, no overly personal notes.

export const MOCK_PARTNER_ACTIVITY_BOOKINGS: PartnerActivityBookingPreview[] = [
  {
    bookingId: 'booking-001',
    ...fieldsFromActivity('activity-001'),
    activityId: 'activity-001',
    workerDisplayName: 'Federica Moretti',
    workerInitials: 'FM',
    workerSharedFields: {
      name: 'Federica',
      surname: 'Moretti',
      email: 'f.moretti@example-worker.test',
      phone: null,
      role: 'Impiegata',
      preferredContact: 'Email',
      notes: 'Preferenza per sedute la mattina.',
    },
    workerActionType: 'booking',
    status: 'confirmed',
    requestedAt: '2026-07-08 10:12',
    preferredSlotOrTiming: 'Mattina, entro fine mese',
    companyVisibility: 'aggregate_only',
    consentBasis: 'worker_initiated',
    partnerAllowedUse: 'Organizzare la sessione di valutazione posturale prenotata.',
    employerHiddenFields: EMPLOYER_HIDDEN_FIELDS_STANDARD,
    previewOnly: true,
  },
  {
    bookingId: 'booking-002',
    ...fieldsFromActivity('activity-002'),
    activityId: 'activity-002',
    workerDisplayName: 'Luca Santoro',
    workerInitials: 'LS',
    workerSharedFields: {
      name: 'Luca',
      surname: 'Santoro',
      email: 'l.santoro@example-worker.test',
      phone: null,
      role: null,
      preferredContact: 'Email',
      notes: null,
    },
    workerActionType: 'application',
    status: 'new',
    requestedAt: '2026-07-11 09:40',
    preferredSlotOrTiming: 'Percorso online — nessuno slot fisso',
    companyVisibility: 'aggregate_only',
    consentBasis: 'worker_initiated',
    partnerAllowedUse: 'Valutare la candidatura al corso e confermare l\'iscrizione.',
    employerHiddenFields: EMPLOYER_HIDDEN_FIELDS_STANDARD,
    previewOnly: true,
  },
  {
    bookingId: 'booking-003',
    ...fieldsFromActivity('activity-003'),
    activityId: 'activity-003',
    workerDisplayName: 'Chiara Ricci',
    workerInitials: 'CR',
    workerSharedFields: {
      name: 'Chiara',
      surname: 'Ricci',
      email: null,
      phone: '+39 3xx xxx xxxx',
      role: null,
      preferredContact: 'Telefono',
      notes: 'Richiesta di ricontatto nel pomeriggio.',
    },
    workerActionType: 'contact_request',
    status: 'follow_up_needed',
    requestedAt: '2026-07-10 15:05',
    preferredSlotOrTiming: 'Pomeriggio',
    companyVisibility: 'aggregate_only',
    consentBasis: 'worker_initiated',
    partnerAllowedUse: 'Ricontattare per fornire informazioni sulla consulenza nutrizionale.',
    employerHiddenFields: EMPLOYER_HIDDEN_FIELDS_STANDARD,
    previewOnly: true,
  },
  {
    bookingId: 'booking-004',
    ...fieldsFromActivity('activity-004'),
    activityId: 'activity-004',
    workerDisplayName: 'Alessandro Bruno',
    workerInitials: 'AB',
    workerSharedFields: {
      name: 'Alessandro',
      surname: 'Bruno',
      email: 'a.bruno@example-worker.test',
      phone: null,
      role: null,
      preferredContact: 'Email',
      notes: null,
    },
    workerActionType: 'voucher_redemption',
    status: 'completed',
    requestedAt: '2026-06-30 08:20',
    preferredSlotOrTiming: 'Mese di luglio',
    companyVisibility: 'aggregate_only',
    consentBasis: 'worker_initiated',
    partnerAllowedUse: 'Emettere ed erogare il voucher mobilità richiesto.',
    employerHiddenFields: EMPLOYER_HIDDEN_FIELDS_STANDARD,
    previewOnly: true,
  },
  {
    bookingId: 'booking-005',
    ...fieldsFromActivity('activity-005'),
    activityId: 'activity-005',
    workerDisplayName: 'Valentina Colombo',
    workerInitials: 'VC',
    workerSharedFields: {
      name: 'Valentina',
      surname: 'Colombo',
      email: 'v.colombo@example-worker.test',
      phone: null,
      role: null,
      preferredContact: 'Email',
      notes: 'Disponibile solo nei weekend.',
    },
    workerActionType: 'application',
    status: 'cancelled',
    requestedAt: '2026-06-20 11:00',
    preferredSlotOrTiming: 'Weekend',
    companyVisibility: 'aggregate_only',
    consentBasis: 'worker_initiated',
    partnerAllowedUse: 'Gestire la candidatura al programma di volontariato — candidatura annullata dal worker.',
    employerHiddenFields: EMPLOYER_HIDDEN_FIELDS_STANDARD,
    previewOnly: true,
  },
  {
    bookingId: 'booking-006',
    ...fieldsFromActivity('activity-006'),
    activityId: 'activity-006',
    workerDisplayName: 'Matteo Gallo',
    workerInitials: 'MG',
    workerSharedFields: {
      name: 'Matteo',
      surname: 'Gallo',
      email: 'm.gallo@example-worker.test',
      phone: null,
      role: null,
      preferredContact: 'Email',
      notes: null,
    },
    workerActionType: 'info_request',
    status: 'withdrawn',
    requestedAt: '2026-07-05 17:30',
    preferredSlotOrTiming: 'N/A',
    companyVisibility: 'aggregate_only',
    consentBasis: 'worker_initiated',
    partnerAllowedUse: 'Rispondere alla richiesta informativa — richiesta ritirata dal worker prima della risposta.',
    employerHiddenFields: EMPLOYER_HIDDEN_FIELDS_STANDARD,
    previewOnly: true,
  },
];

// ── Pure accessors ────────────────────────────────────────────────────────

export function getPartnerActivityBookings(): PartnerActivityBookingPreview[] {
  return MOCK_PARTNER_ACTIVITY_BOOKINGS;
}

export function getPartnerActivityBookingById(bookingId: string): PartnerActivityBookingPreview | undefined {
  return MOCK_PARTNER_ACTIVITY_BOOKINGS.find((b) => b.bookingId === bookingId);
}

// ── Aggregate summary — derived, not hardcoded. This shape is what a future
// company-facing report could show; the individual records above never are. ──

export interface PartnerActivityBookingsSummary {
  totalBookings: number;
  byStatus: Record<string, number>;
  byActionType: Record<string, number>;
  byPillar: Record<string, number>;
  byFiscalCategory: Record<string, number>;
}

export function getPartnerActivityBookingsSummary(): PartnerActivityBookingsSummary {
  const bookings = getPartnerActivityBookings();

  const byStatus: Record<string, number> = {};
  const byActionType: Record<string, number> = {};
  const byPillar: Record<string, number> = {};
  const byFiscalCategory: Record<string, number> = {};

  for (const b of bookings) {
    byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
    byActionType[b.workerActionType] = (byActionType[b.workerActionType] ?? 0) + 1;
    byPillar[b.primaryPillar] = (byPillar[b.primaryPillar] ?? 0) + 1;
    byFiscalCategory[b.fiscalCategory] = (byFiscalCategory[b.fiscalCategory] ?? 0) + 1;
  }

  return { totalBookings: bookings.length, byStatus, byActionType, byPillar, byFiscalCategory };
}
