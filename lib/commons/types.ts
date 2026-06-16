// lib/commons/types.ts
// B97-B — KORA Commons type definitions.
// B165 — esteso con InitiativeOpeningGrade e CommonsPost (tipo DB live).
// KORA Commons is a shared activation layer — NOT a social network.
// Every initiative answers: "What human activation opportunity exists?"

// ── B165: Grado di apertura iniziativa ───────────────────────────────────────
// NULL (assenza del campo) = post generico non-iniziativa — retrocompatibile.

export type InitiativeOpeningGrade =
  | 'company_internal'   // solo lavoratori dell'azienda promotrice
  | 'company_extended'   // lavoratori + familiari/comunità (self-reported)
  | 'cross_company';     // aperta a lavoratori di altre aziende KORA

export const OPENING_GRADE_LABELS: Record<InitiativeOpeningGrade, string> = {
  company_internal: 'Solo azienda',
  company_extended: 'Azienda + famiglie',
  cross_company:    'Aperto',
};

export const OPENING_GRADE_COLORS: Record<InitiativeOpeningGrade, { text: string; bg: string; border: string }> = {
  company_internal: { text: '#3B6EBA', bg: 'rgba(59,110,186,0.08)',  border: 'rgba(59,110,186,0.25)'  },
  company_extended: { text: '#7C3D8F', bg: 'rgba(124,61,143,0.08)', border: 'rgba(124,61,143,0.25)' },
  cross_company:    { text: '#2F7D55', bg: 'rgba(47,125,85,0.08)',   border: 'rgba(47,125,85,0.25)'   },
};

// ── B165: Tipo DB live per commons.post ──────────────────────────────────────
// Rappresenta una riga di commons.post con i campi B165 inclusi.
// I campi B165 sono tutti nullable — retrocompatibile con post generici.

export interface CommonsPost {
  id:                           string;
  tenant_id:                    string;
  author_role:                  'KORA_ADMIN' | 'COMPANY_ADMIN';
  title:                        string;
  body:                         string;
  category:                     string;
  status:                       'draft' | 'pending_review' | 'published' | 'archived' | 'rejected';
  pillar:                       string | null;
  published_at:                 string | null;
  reviewed_at:                  string | null;
  created_at:                   string;
  updated_at:                   string;

  // B165 — campi iniziativa (tutti nullable — retrocompatibili)
  opening_grade:                InitiativeOpeningGrade | null;
  location_address:             string | null;
  location_lat:                 number | null;
  location_lng:                 number | null;
  event_start_at:               string | null;
  event_end_at:                 string | null;
  capacity_internal:            number | null;
  capacity_cross:               number | null;
  external_participants_count:  number | null;
  external_participants_evidence: 'self_declared' | 'verified' | null;
  value_chain_supplier_count:   number | null;
  contribution_impact_weight:   number | null;
}

// Subset minimo per la visualizzazione worker (esclude campi admin-only)
export interface CommonsPostWorkerView {
  id:               string;
  title:            string;
  body:             string;
  category:         string;
  pillar:           string | null;
  published_at:     string | null;
  created_at:       string;
  opening_grade:    InitiativeOpeningGrade | null;
  location_address: string | null;
  location_lat:     number | null;
  location_lng:     number | null;
  event_start_at:   string | null;
  event_end_at:     string | null;
  capacity_internal: number | null;
  capacity_cross:   number | null;
}

export type InitiativeType =
  | 'volunteering'
  | 'mentoring'
  | 'training'
  | 'community'
  | 'wellbeing'
  | 'caregiver'
  | 'sustainability'
  | 'culture'
  | 'inclusion';

export type InitiativeStatus = 'open' | 'upcoming' | 'full' | 'completed';

export type InitiativeVisibility = 'network' | 'public';

export type CommonsInitiative = {
  id:                    string;
  title:                 string;
  description:           string;
  pillar:                'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';
  initiative_type:       InitiativeType;
  owner_organization:    string;
  owner_sector:          string;
  location:              string;
  location_type:         'in-person' | 'remote' | 'hybrid';
  visibility:            InitiativeVisibility;
  start_date:            string;
  end_date:              string | null;
  capacity:              number | null;
  participants_enrolled: number;
  status:                InitiativeStatus;
  activation_potential:  'low' | 'medium' | 'high';
  verification_possible: boolean;
  tags:                  string[];
  synthetic_demo_data:   true;
};

export type CommonsNetworkStats = {
  total_initiatives:     number;
  open_initiatives:      number;
  organizations_active:  number;
  total_participants:    number;
  pillars_covered:       number;
  most_active_pillar:    string;
  synthetic_demo_data:   true;
};

// ── Display metadata ──────────────────────────────────────────────────────────

export const INITIATIVE_TYPE_LABELS: Record<InitiativeType, string> = {
  volunteering:   'Volontariato',
  mentoring:      'Mentoring',
  training:       'Formazione',
  community:      'Comunità',
  wellbeing:      'Benessere',
  caregiver:      'Caregiver',
  sustainability: 'Sostenibilità',
  culture:        'Cultura',
  inclusion:      'Inclusione',
};

export const STATUS_LABELS: Record<InitiativeStatus, string> = {
  open:      'Aperta',
  upcoming:  'In arrivo',
  full:      'Completa',
  completed: 'Conclusa',
};

export const PILLAR_COMMONS_LABELS: Record<string, string> = {
  LIFE:       'LIFE — Benessere',
  GROWTH:     'GROWTH — Crescita',
  CONNECTION: 'CONNECTION — Connessione',
  IMPACT:     'IMPACT — Impatto',
  LEGACY:     'LEGACY — Legacy',
};
