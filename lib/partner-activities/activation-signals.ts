// lib/partner-activities/activation-signals.ts
// Activation Signal Pipeline — static preview model (ACTIVATION-SIGNAL-PIPELINE-01).
//
// Previews how completed/fulfilled Partner Activity engagements
// (lib/partner-activities/catalog.ts, lib/partner-activities/bookings.ts) may
// in the future become aggregate, privacy-safe activation signals feeding
// the KORA Index. This is NOT the real KORA Index integration
// (KORA-INDEX-ACTIVATION-INTEGRATION-01 — a future, separate, CTO-reviewed
// sprint), NOT persistence, and NOT analytics computation — every metric
// below is a static preview derived once from the existing mock
// catalog/booking data at module load, never recomputed live, never
// DB-backed.
//
// Signals here never resolve to an individual worker, booking, or choice —
// every field is aggregate-shaped by construction (counts, distributions,
// ratios), and `companyVisibility` is always 'aggregate_only'. Partner
// Activity signals never feed KORA Contribution directly (see
// lib/commons/types.ts and lib/kora-contribution/contribution-methodology.ts,
// both untouched) — `contributionBoundary` is always 'not_contribution_source'.
//
// Pure static data + pure functions. No DB. No Supabase. No RPC. No env
// access. No fetch. No server action. No external LLM call.
// lib/kora-engine/kora-index-engine.ts is untouched and unaffected by this
// module — see docs/ACTIVATION_SIGNAL_PIPELINE_01.md.

import type { FiscalCategory } from './catalog';
import type { PillarColorKey } from '@/lib/design/kora-design-tokens';
import { getPartnerActivityCatalogSummary } from './catalog';
import { getPartnerActivityBookings, getPartnerActivityBookingsSummary } from './bookings';

// ── Enums ──────────────────────────────────────────────────────────────────

export type ActivationSignalSource = 'partner_activity_engagement';

export type ActivationSignalType =
  | 'uptake'
  | 'completion'
  | 'continuity'
  | 'access'
  | 'value_band'
  | 'worker_choice'
  | 'partner_delivery';

export type ActivationAggregationLevel =
  | 'company'
  | 'pillar'
  | 'fiscal_category'
  | 'partner'
  | 'activity_type';

export type KoraIndexPreviewEligibility = 'yes' | 'needs_review' | 'no';

export type IndexComponentPreview =
  | 'reach'
  | 'quality'
  | 'equity'
  | 'activation'
  | 'continuity'
  | 'pillar_balance'
  | 'none';

export type PrivacyThresholdStatus = 'passed_preview' | 'needs_threshold_review' | 'suppressed_preview';

// A signal spans more than one fiscal category or pillar when it aggregates
// at company / fiscal_category / activity_type level across heterogeneous
// activities. 'multiple' is a distinct, honest value here — never a
// stand-in for a real single category or pillar.
export type SignalFiscalCategory = FiscalCategory | 'multiple';
export type SignalPillar = PillarColorKey | 'multiple';

// ── Entity ─────────────────────────────────────────────────────────────────

export interface ActivationSignalMetricPreview {
  label: string;
  value: number | string;
  unit: string;
}

export interface ActivationSignalPreview {
  signalId: string;
  source: ActivationSignalSource;
  sourceBookingIds: string[];
  activityIds: string[];
  partnerIds: string[];
  fiscalCategory: SignalFiscalCategory;
  primaryPillar: SignalPillar;
  secondaryPillars: PillarColorKey[];
  signalType: ActivationSignalType;
  aggregationLevel: ActivationAggregationLevel;
  eligibleForKoraIndexPreview: KoraIndexPreviewEligibility;
  indexComponentPreview: IndexComponentPreview;
  metricPreview: ActivationSignalMetricPreview;
  privacyThresholdStatus: PrivacyThresholdStatus;
  /** Always 'aggregate_only' — no employer-facing surface may resolve this to an individual worker or booking. */
  companyVisibility: 'aggregate_only';
  /** Always 'worker_initiated_source_events' — every source booking exists only because a worker acted voluntarily. */
  workerVisibilityBasis: 'worker_initiated_source_events';
  /** Always 'not_contribution_source' — Partner Activity signals never feed KORA Contribution directly. */
  contributionBoundary: 'not_contribution_source';
  notes: string;
  previewOnly: true;
}

// ── Display labels (Italian, UI-facing) ─────────────────────────────────────

export const SIGNAL_TYPE_LABELS: Record<ActivationSignalType, string> = {
  uptake: 'Adozione (uptake)',
  completion: 'Completamento',
  continuity: 'Continuità',
  access: 'Accesso / equità',
  value_band: 'Fascia di valore',
  worker_choice: 'Scelta worker',
  partner_delivery: 'Erogazione partner',
};

export const AGGREGATION_LEVEL_LABELS: Record<ActivationAggregationLevel, string> = {
  company: 'Azienda',
  pillar: 'Pilastro',
  fiscal_category: 'Categoria fiscale',
  partner: 'Partner',
  activity_type: 'Tipo di attività',
};

export const ELIGIBILITY_LABELS: Record<KoraIndexPreviewEligibility, string> = {
  yes: 'Eleggibile (anteprima)',
  needs_review: 'Richiede revisione',
  no: 'Non eleggibile',
};

export const INDEX_COMPONENT_PREVIEW_LABELS: Record<IndexComponentPreview, string> = {
  reach: 'Reach',
  quality: 'Quality',
  equity: 'Equity',
  activation: 'Activation',
  continuity: 'Continuity',
  pillar_balance: 'Pillar Balance',
  none: 'Nessuna componente (anteprima)',
};

export const PRIVACY_THRESHOLD_STATUS_LABELS: Record<PrivacyThresholdStatus, string> = {
  passed_preview: 'Soglia superata (anteprima)',
  needs_threshold_review: 'Richiede revisione soglia',
  suppressed_preview: 'Soppresso in anteprima (gruppo troppo piccolo)',
};

// ── Derived counts from existing static data — reused, never duplicated ────

const BOOKINGS = getPartnerActivityBookings();
const BOOKINGS_SUMMARY = getPartnerActivityBookingsSummary();
const CATALOG_SUMMARY = getPartnerActivityCatalogSummary();

const ALL_BOOKING_IDS = BOOKINGS.map((b) => b.bookingId);
const ALL_ACTIVITY_IDS = Array.from(new Set(BOOKINGS.map((b) => b.activityId)));
const ALL_PARTNER_IDS = Array.from(new Set(BOOKINGS.map((b) => b.partnerId)));
const ENGAGED_ACTIVITY_SHARE = `${ALL_ACTIVITY_IDS.length}/${CATALOG_SUMMARY.totalActivities}`;

// ── Mock activation signal previews — illustrative only, derived from the
// static catalog/booking mock data above. Not persisted, not computed live,
// not a claim about real KORA Index eligibility or final privacy thresholds. ──

export const MOCK_ACTIVATION_SIGNAL_PREVIEWS: ActivationSignalPreview[] = [
  {
    signalId: 'signal-uptake-company-01',
    source: 'partner_activity_engagement',
    sourceBookingIds: ALL_BOOKING_IDS,
    activityIds: ALL_ACTIVITY_IDS,
    partnerIds: ALL_PARTNER_IDS,
    fiscalCategory: 'multiple',
    primaryPillar: 'multiple',
    secondaryPillars: [],
    signalType: 'uptake',
    aggregationLevel: 'company',
    eligibleForKoraIndexPreview: 'needs_review',
    indexComponentPreview: 'reach',
    metricPreview: {
      label: 'Richieste attività avviate dai worker (tutte le tipologie)',
      value: BOOKINGS_SUMMARY.totalBookings,
      unit: 'richieste',
    },
    privacyThresholdStatus: 'needs_threshold_review',
    companyVisibility: 'aggregate_only',
    workerVisibilityBasis: 'worker_initiated_source_events',
    contributionBoundary: 'not_contribution_source',
    notes: `Anteprima aggregata di tutte le richieste worker registrate sulle Attività Partner nel periodo demo (${ENGAGED_ACTIVITY_SHARE} attività a catalogo coinvolte). Non implica una soglia di privacy finale né un calcolo KORA Index reale.`,
    previewOnly: true,
  },
  {
    signalId: 'signal-completion-pillar-impact-01',
    source: 'partner_activity_engagement',
    sourceBookingIds: ['booking-004'],
    activityIds: ['activity-004'],
    partnerIds: ['partner-demo-03'],
    fiscalCategory: 'mobilita_trasporti',
    primaryPillar: 'IMPACT',
    secondaryPillars: ['LIFE'],
    signalType: 'completion',
    aggregationLevel: 'pillar',
    eligibleForKoraIndexPreview: 'needs_review',
    indexComponentPreview: 'quality',
    metricPreview: {
      label: 'Riscatti/erogazioni completate — pilastro IMPACT',
      value: 1,
      unit: 'completamenti',
    },
    privacyThresholdStatus: 'suppressed_preview',
    companyVisibility: 'aggregate_only',
    workerVisibilityBasis: 'worker_initiated_source_events',
    contributionBoundary: 'not_contribution_source',
    notes: 'Gruppo troppo piccolo (N=1) per un\'aggregazione privacy-safe reale — mostrato solo come anteprima di forma del segnale.',
    previewOnly: true,
  },
  {
    signalId: 'signal-continuity-partner-01',
    source: 'partner_activity_engagement',
    sourceBookingIds: ['booking-001', 'booking-003'],
    activityIds: ['activity-001', 'activity-003'],
    partnerIds: ['partner-demo-01'],
    fiscalCategory: 'multiple',
    primaryPillar: 'LIFE',
    secondaryPillars: ['CONNECTION'],
    signalType: 'continuity',
    aggregationLevel: 'partner',
    eligibleForKoraIndexPreview: 'needs_review',
    indexComponentPreview: 'continuity',
    metricPreview: {
      label: 'Richieste ripetute registrate presso lo stesso partner nel periodo',
      value: 2,
      unit: 'richieste',
    },
    privacyThresholdStatus: 'suppressed_preview',
    companyVisibility: 'aggregate_only',
    workerVisibilityBasis: 'worker_initiated_source_events',
    contributionBoundary: 'not_contribution_source',
    notes: 'Anteprima di segnale di continuità a livello partner — non implica che si tratti dello stesso worker né una soglia di continuità finale.',
    previewOnly: true,
  },
  {
    signalId: 'signal-access-fiscalcategory-01',
    source: 'partner_activity_engagement',
    sourceBookingIds: ALL_BOOKING_IDS,
    activityIds: ALL_ACTIVITY_IDS,
    partnerIds: ALL_PARTNER_IDS,
    fiscalCategory: 'multiple',
    primaryPillar: 'multiple',
    secondaryPillars: [],
    signalType: 'access',
    aggregationLevel: 'fiscal_category',
    eligibleForKoraIndexPreview: 'needs_review',
    indexComponentPreview: 'equity',
    metricPreview: {
      label: 'Categorie fiscali distinte raggiunte da almeno una richiesta',
      value: Object.keys(BOOKINGS_SUMMARY.byFiscalCategory).length,
      unit: 'categorie',
    },
    privacyThresholdStatus: 'needs_threshold_review',
    companyVisibility: 'aggregate_only',
    workerVisibilityBasis: 'worker_initiated_source_events',
    contributionBoundary: 'not_contribution_source',
    notes: 'Anteprima di distribuzione dell\'accesso tra categorie fiscali — non un indicatore di equità finale, nessuna soglia N≥10 verificata su questi dati demo.',
    previewOnly: true,
  },
  {
    signalId: 'signal-valueband-activitytype-01',
    source: 'partner_activity_engagement',
    sourceBookingIds: ALL_BOOKING_IDS,
    activityIds: ALL_ACTIVITY_IDS,
    partnerIds: ALL_PARTNER_IDS,
    fiscalCategory: 'multiple',
    primaryPillar: 'multiple',
    secondaryPillars: [],
    signalType: 'value_band',
    aggregationLevel: 'activity_type',
    eligibleForKoraIndexPreview: 'needs_review',
    indexComponentPreview: 'activation',
    metricPreview: {
      label: 'Richieste su attività a fascia di valore stimata bassa (anteprima)',
      value: 3,
      unit: 'richieste',
    },
    privacyThresholdStatus: 'needs_threshold_review',
    companyVisibility: 'aggregate_only',
    workerVisibilityBasis: 'worker_initiated_source_events',
    contributionBoundary: 'not_contribution_source',
    notes: 'La fascia di valore stimata (estimatedValueBand) proviene dal Catalogo Attività Partner — è una stima indicativa, mai un valore fiscale o economico certificato.',
    previewOnly: true,
  },
  {
    signalId: 'signal-workerchoice-pillar-growth-01',
    source: 'partner_activity_engagement',
    sourceBookingIds: ['booking-002'],
    activityIds: ['activity-002'],
    partnerIds: ['partner-demo-02'],
    fiscalCategory: 'formazione',
    primaryPillar: 'GROWTH',
    secondaryPillars: [],
    signalType: 'worker_choice',
    aggregationLevel: 'pillar',
    eligibleForKoraIndexPreview: 'needs_review',
    indexComponentPreview: 'pillar_balance',
    metricPreview: {
      label: 'Richieste generate da scelta libera del worker — pilastro GROWTH',
      value: 1,
      unit: 'richieste',
    },
    privacyThresholdStatus: 'suppressed_preview',
    companyVisibility: 'aggregate_only',
    workerVisibilityBasis: 'worker_initiated_source_events',
    contributionBoundary: 'not_contribution_source',
    notes: 'Anteprima di segnale di scelta libera (accessMode: worker_free_choice) — gruppo troppo piccolo (N=1) per aggregazione privacy-safe reale.',
    previewOnly: true,
  },
  {
    signalId: 'signal-partnerdelivery-partner-01',
    source: 'partner_activity_engagement',
    sourceBookingIds: ['booking-004'],
    activityIds: ['activity-004'],
    partnerIds: ['partner-demo-03'],
    fiscalCategory: 'mobilita_trasporti',
    primaryPillar: 'IMPACT',
    secondaryPillars: ['LIFE'],
    signalType: 'partner_delivery',
    aggregationLevel: 'partner',
    eligibleForKoraIndexPreview: 'needs_review',
    indexComponentPreview: 'quality',
    metricPreview: {
      label: 'Tasso di erogazione completata sulle richieste ricevute (anteprima partner)',
      value: 100,
      unit: '%',
    },
    privacyThresholdStatus: 'suppressed_preview',
    companyVisibility: 'aggregate_only',
    workerVisibilityBasis: 'worker_initiated_source_events',
    contributionBoundary: 'not_contribution_source',
    notes: 'Segnale interno di Partner Activation Quality in anteprima — nessun ranking pubblico, nessuna leaderboard, nessuno star rating (doc canonico §12.N).',
    previewOnly: true,
  },
  {
    signalId: 'signal-uptake-activitytype-nonqualifying-01',
    source: 'partner_activity_engagement',
    sourceBookingIds: ['booking-005', 'booking-006'],
    activityIds: ['activity-005', 'activity-006'],
    partnerIds: ['partner-demo-04', 'partner-demo-05'],
    fiscalCategory: 'multiple',
    primaryPillar: 'multiple',
    secondaryPillars: [],
    signalType: 'uptake',
    aggregationLevel: 'activity_type',
    eligibleForKoraIndexPreview: 'no',
    indexComponentPreview: 'none',
    metricPreview: {
      label: 'Richieste annullate o ritirate prima del completamento',
      value: 2,
      unit: 'richieste',
    },
    privacyThresholdStatus: 'suppressed_preview',
    companyVisibility: 'aggregate_only',
    workerVisibilityBasis: 'worker_initiated_source_events',
    contributionBoundary: 'not_contribution_source',
    notes: 'Richieste annullate/ritirate prima del completamento non generano un segnale di attivazione utile in questa anteprima — mostrate solo per completezza del modello.',
    previewOnly: true,
  },
];

// ── Pure accessors ────────────────────────────────────────────────────────

export function getActivationSignalPreviews(): ActivationSignalPreview[] {
  return MOCK_ACTIVATION_SIGNAL_PREVIEWS;
}

// ── Aggregate summary — derived, not hardcoded ──────────────────────────────

export interface ActivationSignalSummary {
  totalSignals: number;
  bySignalType: Record<string, number>;
  byAggregationLevel: Record<string, number>;
  byEligibility: Record<string, number>;
  byPrivacyThresholdStatus: Record<string, number>;
}

export function getActivationSignalSummary(): ActivationSignalSummary {
  const signals = getActivationSignalPreviews();

  const bySignalType: Record<string, number> = {};
  const byAggregationLevel: Record<string, number> = {};
  const byEligibility: Record<string, number> = {};
  const byPrivacyThresholdStatus: Record<string, number> = {};

  for (const s of signals) {
    bySignalType[s.signalType] = (bySignalType[s.signalType] ?? 0) + 1;
    byAggregationLevel[s.aggregationLevel] = (byAggregationLevel[s.aggregationLevel] ?? 0) + 1;
    byEligibility[s.eligibleForKoraIndexPreview] = (byEligibility[s.eligibleForKoraIndexPreview] ?? 0) + 1;
    byPrivacyThresholdStatus[s.privacyThresholdStatus] = (byPrivacyThresholdStatus[s.privacyThresholdStatus] ?? 0) + 1;
  }

  return { totalSignals: signals.length, bySignalType, byAggregationLevel, byEligibility, byPrivacyThresholdStatus };
}

export function groupActivationSignalsByPillar(): Record<string, ActivationSignalPreview[]> {
  const groups: Record<string, ActivationSignalPreview[]> = {};
  for (const s of getActivationSignalPreviews()) {
    (groups[s.primaryPillar] ??= []).push(s);
  }
  return groups;
}

export function groupActivationSignalsByFiscalCategory(): Record<string, ActivationSignalPreview[]> {
  const groups: Record<string, ActivationSignalPreview[]> = {};
  for (const s of getActivationSignalPreviews()) {
    (groups[s.fiscalCategory] ??= []).push(s);
  }
  return groups;
}

export function groupActivationSignalsByIndexComponentPreview(): Record<string, ActivationSignalPreview[]> {
  const groups: Record<string, ActivationSignalPreview[]> = {};
  for (const s of getActivationSignalPreviews()) {
    (groups[s.indexComponentPreview] ??= []).push(s);
  }
  return groups;
}
