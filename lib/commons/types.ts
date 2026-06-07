// lib/commons/types.ts
// B97-B — KORA Commons type definitions.
// KORA Commons is a shared activation layer — NOT a social network.
// Every initiative answers: "What human activation opportunity exists?"

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
