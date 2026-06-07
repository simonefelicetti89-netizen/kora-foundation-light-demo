// lib/founder-validation/types.ts
// B96-B — Founder Validation Data Model
// Pure types and config. No React, no services, no side effects.
// Founder tool only — not part of KORA Index, IU formula, or product methodology.

export type ValidationStage =
  | 'contacted'
  | 'meeting_scheduled'
  | 'meeting_done'
  | 'pilot_interested'
  | 'loi_discussed'
  | 'loi_signed'
  | 'not_now'
  | 'lost';

export type InterestLevel = 'low' | 'medium' | 'high' | 'strategic';

export type PilotPotential = 'none' | 'small' | 'medium' | 'large';

export type InvestmentSignal = 'none' | 'curious' | 'soft_commitment' | 'formal_interest';

export type ObjectionType =
  | 'budget'
  | 'data_privacy'
  | 'methodology_credibility'
  | 'integration_effort'
  | 'unclear_roi'
  | 'timing'
  | 'other';

export type FeedbackTheme =
  | 'worker_layer_interest'
  | 'board_reporting_interest'
  | 'welfare_efficiency_interest'
  | 'esg_csr_interest'
  | 'pilot_pricing_concern'
  | 'competitive_concern'
  | 'data_quality_concern'
  | 'other';

// ── Core lead record ──────────────────────────────────────────────────────────

export interface ValidationLead {
  id:                    string;
  company_name:          string;
  sector:                string;
  employee_count_band:   string;        // e.g. "50-200", "200-1000", "1000+"
  contact_role:          string;        // e.g. "HR Director", "CFO"
  stage:                 ValidationStage;
  interest_level:        InterestLevel;
  pilot_potential:       PilotPotential;
  estimated_pilot_value: number | null; // EUR, null if not estimated
  investment_signal:     InvestmentSignal;
  key_objection:         ObjectionType | null;
  feedback_themes:       FeedbackTheme[];
  next_action:           string;
  next_action_date:      string;        // ISO date YYYY-MM-DD
  last_contact_date:     string;        // ISO date YYYY-MM-DD
  notes:                 string;
}

// ── Computed summaries ────────────────────────────────────────────────────────

export interface FunnelStage {
  stage:        ValidationStage;
  label:        string;
  count:        number;
  is_funnel:    boolean; // whether this stage is part of the active funnel
}

export interface FunnelSummary {
  stages:                   FunnelStage[];
  contacted_total:          number;
  meetings_done:            number;
  pilot_interested:         number;
  loi_potential:            number;
  contact_to_meeting_rate:  number; // 0–100
  meeting_to_pilot_rate:    number; // 0–100
  pilot_to_loi_rate:        number; // 0–100
  loi_to_signed_rate:       number; // 0–100
}

export interface ObjectionCount {
  objection: ObjectionType;
  label:     string;
  count:     number;
}

export interface FeedbackThemeCount {
  theme: FeedbackTheme;
  label: string;
  count: number;
}

export interface PilotPipelineValue {
  total_eur:             number;
  loi_signed_eur:        number;
  loi_discussed_eur:     number;
  pilot_interested_eur:  number;
  lead_count:            number;
}

export interface NextActionItem {
  lead:    ValidationLead;
  urgency: 'urgent' | 'normal' | 'low';
}

export interface InvestorSignalSummary {
  formal_interest_count:    number;
  soft_commitment_count:    number;
  curious_count:            number;
  strategic_interest_leads: string[];
  loi_signed_count:         number;
  loi_discussed_count:      number;
  total_pilot_value_eur:    number;
  strongest_signal:         string;
  weakest_gap:              string;
}

// ── Display metadata ──────────────────────────────────────────────────────────

export const STAGE_META: Record<ValidationStage, { label: string; funnel: boolean; order: number }> = {
  contacted:         { label: 'Contattato',         funnel: true,  order: 1 },
  meeting_scheduled: { label: 'Meeting fissato',     funnel: true,  order: 2 },
  meeting_done:      { label: 'Meeting completato',  funnel: true,  order: 3 },
  pilot_interested:  { label: 'Pilot interessato',   funnel: true,  order: 4 },
  loi_discussed:     { label: 'LOI in discussione',  funnel: true,  order: 5 },
  loi_signed:        { label: 'LOI firmata',         funnel: true,  order: 6 },
  not_now:           { label: 'Non ora',             funnel: false, order: 7 },
  lost:              { label: 'Perso',               funnel: false, order: 8 },
};

export const INTEREST_META: Record<InterestLevel, { label: string; color: string }> = {
  low:       { label: 'Basso',      color: 'rgba(6,3,43,0.38)' },
  medium:    { label: 'Medio',      color: '#8A5A00' },
  high:      { label: 'Alto',       color: '#1E4DA0' },
  strategic: { label: 'Strategico', color: '#2F7D55' },
};

export const PILOT_META: Record<PilotPotential, { label: string }> = {
  none:   { label: 'Nessuno' },
  small:  { label: 'Piccolo' },
  medium: { label: 'Medio'   },
  large:  { label: 'Grande'  },
};

export const INVESTMENT_META: Record<InvestmentSignal, { label: string; color: string }> = {
  none:              { label: 'Nessuno',           color: 'rgba(6,3,43,0.38)' },
  curious:           { label: 'Curioso',           color: '#8A5A00' },
  soft_commitment:   { label: 'Interesse soft',    color: '#1E4DA0' },
  formal_interest:   { label: 'Interesse formale', color: '#2F7D55' },
};

export const OBJECTION_LABELS: Record<ObjectionType, string> = {
  budget:                   'Budget',
  data_privacy:             'Privacy dati',
  methodology_credibility:  'Credibilità metodologia',
  integration_effort:       'Effort integrazione',
  unclear_roi:              'ROI non chiaro',
  timing:                   'Timing',
  other:                    'Altro',
};

export const FEEDBACK_LABELS: Record<FeedbackTheme, string> = {
  worker_layer_interest:      'Interesse layer lavoratori',
  board_reporting_interest:   'Interesse board reporting',
  welfare_efficiency_interest: 'Efficienza welfare',
  esg_csr_interest:            'Interesse ESG/CSR',
  pilot_pricing_concern:       'Prezzo pilot',
  competitive_concern:         'Concorrenza',
  data_quality_concern:        'Qualità dati',
  other:                       'Altro',
};
