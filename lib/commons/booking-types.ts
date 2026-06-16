// lib/commons/booking-types.ts
// B166 — Tipi per commons.booking e commons.contribution_event

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'attended';
export type ContributionRole = 'promoter' | 'origin_employer';
export type ContributionKind = 'cross_company_participation' | 'external_participants_event';
export type ContributionEvidenceStatus = 'verified' | 'self_declared';

export interface CommonsBooking {
  id:                  string;
  post_id:             string;
  worker_identity_id:  string;
  worker_tenant_id:    string;
  post_tenant_id:      string;
  status:              BookingStatus;
  moderation_notes:    string | null;
  moderated_by:        string | null;
  moderated_at:        string | null;
  attended_at:         string | null;
  created_at:          string;
  updated_at:          string;
}

/** Vista worker-safe: nasconde worker_identity_id per contesti dove non richiesto */
export interface CommonsBookingWorkerView {
  id:               string;
  post_id:          string;
  status:           BookingStatus;
  moderation_notes: string | null;
  created_at:       string;
  post_title?:      string;  // join opzionale per UX
}

/** Aggregato per la promotrice (COMPANY_ADMIN di Beta) — mai righe individuali */
export interface BookingAggregateForPromoter {
  post_id:        string;
  count_pending:  number;
  count_approved: number;
  count_rejected: number;
  count_attended: number;
  count_cancelled: number;
  total:          number;
}

export interface ContributionEvent {
  id:               string;
  tenant_id:        string;
  source_booking_id: string | null;
  source_post_id:   string;
  role:             ContributionRole;
  contribution_kind: ContributionKind;
  impact_weight:    number;
  evidence_status:  ContributionEvidenceStatus;
  reporting_period: string;
  created_at:       string;
}

/** Output di getContributionLive — dati reali da DB per tenant production_ready */
export interface LiveContributionSummary {
  tenant_id:                     string;
  reporting_period:              string;
  /** always false — companion indicator, mai KORA Index component */
  is_kora_index_component:       false;
  /** Numero di eventi Contribution nel periodo */
  total_events:                  number;
  cross_company_participations:  number;
  external_participant_events:   number;
  promoter_events:               number;
  origin_employer_events:        number;
  /** Peso totale aggregato (somma impact_weight) */
  total_impact_weight:           number;
  verified_weight:               number;
  self_declared_weight:          number;
  /** Peso per kind */
  weight_cross_company:          number;
  weight_external_participants:  number;
  data_source:                   'live_db';
  methodology_version_id:        string;
  calibration_status:            'pre_empirical_calibration';
}
