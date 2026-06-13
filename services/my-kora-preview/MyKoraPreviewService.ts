import type { KoraRole, ScenarioId } from '@/lib/types';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';

// ── B70-B: IU values are pre-computed using the canonical formula:
//   IU = NM × BC × CQ × EV × CF × AGF  (KORA Index v1.0)
// BC reference: LIFE=1.20 (health_and_wellbeing), GROWTH=1.10 (professional_growth),
//   CONNECTION=1.00 (inclusion_and_connection), IMPACT=1.00 (territorial_impact),
//   LEGACY=1.10 (future_and_legacy)
// EV reference: verified=0.90 (L3), partial=0.75 (L2), self_declared=0.60 (L1)
// All factor values and derivation basis are documented in pib_derivation_note.
// pib_derivation_basis: 'synthetic_iu_pre_computed' means values were derived via
//   the formula at design time, not randomised. Scale: pillar_score = round(pillar_iu × SCALE).

// ── Type definitions ──────────────────────────────────────────────────────────

export interface PillarPreview {
  pillar: string;
  label: string;
  score: number;         // 0–100, personal normalized scale
  iu_total: number;      // raw IU total for this pillar (pre-computed)
  trend: 'up' | 'stable' | 'down';
  event_count: number;
}

export interface TimelineItem {
  id: string;
  date: string;
  category: string;      // category-level only — no health details
  pillar: string;
  source_type: string;
  verification_status: 'verified' | 'partial' | 'self_declared';
  iu_contribution: 'high' | 'medium' | 'low';  // qualitative bucket
  iu_value: number;      // IU = NM × BC × CQ × EV × CF × AGF (pre-computed)
  // CV eligibility — computed from verification_status + source_type + pillar
  cv_eligible: boolean;
  cv_eligible_reason: string;
}

// Internal raw type for data arrays — cv_eligible fields are computed at access time
type RawTimelineItem = Omit<TimelineItem, 'cv_eligible' | 'cv_eligible_reason'>;

function computeCVEligibility(item: RawTimelineItem): { cv_eligible: boolean; cv_eligible_reason: string } {
  if (item.verification_status === 'self_declared') {
    return { cv_eligible: false, cv_eligible_reason: 'Verifica insufficiente — autodichiarato' };
  }
  if (item.source_type === 'manual_upload') {
    return { cv_eligible: false, cv_eligible_reason: 'Controllo lavoratore — verifica esterna richiesta' };
  }
  const pending = item.verification_status === 'partial';
  if (item.source_type === 'lms_training') {
    return { cv_eligible: true, cv_eligible_reason: pending ? 'Attività formativa — verifica in attesa' : 'Attività formativa verificata' };
  }
  if (item.source_type === 'esg_initiatives') {
    return { cv_eligible: true, cv_eligible_reason: pending ? 'Contributo comunitario — verifica in attesa' : 'Contributo comunitario verificato' };
  }
  if (item.source_type === 'welfare_provider') {
    return { cv_eligible: true, cv_eligible_reason: pending ? 'Attività benessere — verifica in attesa' : 'Attività benessere verificata' };
  }
  if (item.source_type === 'partner_events') {
    if (item.pillar === 'LEGACY') {
      return { cv_eligible: true, cv_eligible_reason: pending ? 'Mentoring — verifica in attesa' : 'Attività mentoring verificata' };
    }
    if (item.pillar === 'CONNECTION') {
      return { cv_eligible: true, cv_eligible_reason: pending ? 'Attività community — verifica in attesa' : 'Attività community verificata' };
    }
    if (item.pillar === 'IMPACT') {
      return { cv_eligible: true, cv_eligible_reason: pending ? 'Contributo partner — verifica in attesa' : 'Contributo partner verificato' };
    }
    return { cv_eligible: true, cv_eligible_reason: pending ? 'Attività partner — verifica in attesa' : 'Attività partner verificata' };
  }
  return { cv_eligible: true, cv_eligible_reason: 'Idoneo per Dynamic Impact CV™' };
}

function enrichTimeline(items: RawTimelineItem[]): TimelineItem[] {
  return items.map((item) => ({ ...item, ...computeCVEligibility(item) }));
}

export interface PibLightPreview {
  period: string;
  overall_index: number;       // 0–100 internal scale — kept for computation only; not rendered as headline UI
  active_pillars: number;
  total_events: number;
  pillar_breakdown: PillarPreview[];
  pib_derivation_note: string; // documents synthetic IU derivation basis
  pib_derivation_basis: 'synthetic_iu_pre_computed';
  disclaimer: string;
  not_employer_visible: true;
  not_performance_score: true;
  activation_level: 'initial' | 'developing' | 'established' | 'advanced';
  activation_level_label: string;
  activation_level_description: string;
  period_iu_total: number;               // somma iu_total di tutti i pillar, arrotondata a 1 decimale
  activation_profile: string;            // es. "Growth Builder" — proprietary name, non gerarchia
  activation_profile_description: string; // descrizione italiana non valutativa del mix
}

export interface ConsentToggle {
  id: string;
  label: string;
  description: string;
  current_state: 'on' | 'off';
  scope: 'aggregate_only' | 'none' | 'worker_controlled';
  editable_in_preview: false;
}

export interface PrivacySummary {
  persona_label: string;
  company_can_see: string[];
  company_cannot_see: string[];
  consent_toggles: ConsentToggle[];
  privacy_guarantee: string;
}

export interface DynamicCVItem {
  id: string;
  title: string;
  pillar: string;
  pillar_label: string;
  date: string;
  source_category: string;
  verification_status: 'verified' | 'partial' | 'self_declared';
  shareable: boolean;
  export_label: string;
}

export interface DynamicCVPreview {
  persona_label: string;
  items: DynamicCVItem[];
  total_items: number;
  verified_count: number;
  disclaimer: string;
  export_available: false;
}

export interface OpportunityItem {
  id: string;
  title: string;
  subtitle: string;
  pillar: string;
  pillar_label: string;
  provider: string;
  format: string;
  iu_potential: string;
  match_reason: string;
  type: 'partner' | 'internal' | 'community';
  status: 'coming_soon' | 'preview';
}

export interface MyKoraHomePreview {
  persona_label: string;
  persona_id: string;
  scenario_id: ScenarioId;
  pib_light: PibLightPreview;
  timeline: TimelineItem[];
  opportunities: OpportunityItem[];
  synthetic_demo_data: true;
}

// ── Qualitative activation level — B140-B ────────────────────────────────────
// Maps overall_index to qualitative phase labels. Not a performance label.
// Labels describe activation journey phase, not quality, rank, or output.
function deriveActivationLevel(idx: number): Pick<PibLightPreview, 'activation_level' | 'activation_level_label' | 'activation_level_description'> {
  if (idx <= 34) return { activation_level: 'initial',     activation_level_label: 'Percorso iniziale',    activation_level_description: 'Stai costruendo il tuo percorso di attivazione.' };
  if (idx <= 54) return { activation_level: 'developing',  activation_level_label: 'Percorso in sviluppo', activation_level_description: 'Il tuo percorso si sta arricchendo di nuove esperienze.' };
  if (idx <= 74) return { activation_level: 'established', activation_level_label: 'Percorso consolidato', activation_level_description: 'Hai costruito un percorso di attivazione articolato e verificato.' };
  return              { activation_level: 'advanced',     activation_level_label: 'Percorso avanzato',    activation_level_description: 'Il tuo percorso di attivazione è ampio e diversificato tra più pillar.' };
}

// ── Activation profile — B140-B2+C ───────────────────────────────────────────
// Maps pillar mix to a non-hierarchical archetype label.
// Profiles describe WHAT was done in the period, not WHO the worker is.
// All 7 profiles are equally valid — no hierarchy, no ranking between them.
// LIFE profile: "Life Anchor" — describes mix, avoids health/wellbeing tracking perception.

type ActivationProfileFields = Pick<PibLightPreview, 'activation_profile' | 'activation_profile_description'>;

const PILLAR_PROFILES: Record<string, ActivationProfileFields> = {
  GROWTH:     { activation_profile: 'Growth Builder',   activation_profile_description: 'Le tue esperienze del periodo sono prevalentemente nel pillar Crescita e Formazione.' },
  IMPACT:     { activation_profile: 'Impact Catalyst',  activation_profile_description: 'Le tue esperienze del periodo sono prevalentemente nel pillar Impatto Sociale e Territoriale.' },
  CONNECTION: { activation_profile: 'Community Anchor', activation_profile_description: 'Le tue esperienze del periodo sono prevalentemente nel pillar Connessione e Collaborazione.' },
  LIFE:       { activation_profile: 'Life Anchor',      activation_profile_description: 'Il tuo percorso include esperienze collegate a equilibrio, cura e qualità della vita.' },
  LEGACY:     { activation_profile: 'Legacy Keeper',    activation_profile_description: 'Le tue esperienze del periodo sono prevalentemente nel pillar Continuità e Trasferimento.' },
};

function derivePeriodIuTotal(pillars: PillarPreview[]): number {
  return Math.round(pillars.reduce((sum, p) => sum + p.iu_total, 0) * 10) / 10;
}

function deriveActivationProfile(pillars: PillarPreview[]): ActivationProfileFields {
  const total = pillars.reduce((sum, p) => sum + p.iu_total, 0);
  if (total === 0) {
    return { activation_profile: 'Emerging Profile', activation_profile_description: 'Stai muovendo i primi passi nel percorso di attivazione.' };
  }
  const dominant    = pillars.reduce((a, b) => (a.iu_total > b.iu_total ? a : b));
  const dominantPct = (dominant.iu_total / total) * 100;
  const activeCount = pillars.filter((p) => p.iu_total > 0).length;

  if (dominantPct >= 35) {
    return PILLAR_PROFILES[dominant.pillar] ?? { activation_profile: 'Emerging Profile', activation_profile_description: 'Stai muovendo i primi passi nel percorso di attivazione.' };
  }
  if (activeCount >= 4) {
    return { activation_profile: 'Balanced Activator', activation_profile_description: 'Il tuo percorso copre più dimensioni KORA — un profilo diversificato.' };
  }
  return PILLAR_PROFILES[dominant.pillar] ?? { activation_profile: 'Emerging Profile', activation_profile_description: 'Stai muovendo i primi passi nel percorso di attivazione.' };
}

// ── Shared derivation note ────────────────────────────────────────────────────

const DERIVATION_NOTE =
  'IU sintetici pre-computati · formula IU = NM × BC × CQ × EV × CF × AGF · ' +
  'KORA Index v1.0 pre-calibrazione empirica · ' +
  'scala personale: pillar_score = round(pillar_iu_total × fattore_scala) · ' +
  'Il PIB reale richiede identità worker-owned e consenso (Pilot+).';

// ── Persona A — Elena M. (Operations / Plant Bergamo) ────────────────────────
// Profile: LIFE-dominant (field worker, health benefits primary), growing GROWTH,
// baseline CONNECTION. Factory/operations context.

const PERSONA_A_TIMELINE_S1: RawTimelineItem[] = [
  {
    id: 'ea-tl-001', date: '2025-03-12',
    category: 'Check prevenzione e benessere',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 1.14, // NM=1.30, BC=1.20, CQ=0.90, EV=0.90, CF=1.00, AGF=0.90
  },
  {
    id: 'ea-tl-002', date: '2025-02-20',
    category: 'Formazione competenze digitali',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.61, // NM=0.80, BC=1.10, CQ=0.88, EV=0.90, CF=1.00, AGF=0.88
  },
  {
    id: 'ea-tl-003', date: '2025-02-05',
    category: 'Programma attività fisica',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'partial', iu_contribution: 'medium',
    iu_value: 0.64, // NM=1.00, BC=1.20, CQ=0.85, EV=0.75, CF=1.00, AGF=0.84
  },
  {
    id: 'ea-tl-004', date: '2025-01-18',
    category: 'Sessione peer collaboration',
    pillar: 'CONNECTION', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'low',
    iu_value: 0.28, // NM=0.60, BC=1.00, CQ=0.78, EV=0.75, CF=0.92, AGF=0.86
  },
  {
    id: 'ea-tl-005', date: '2025-01-07',
    category: 'Modulo sviluppo leadership',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.72, // NM=0.90, BC=1.10, CQ=0.90, EV=0.90, CF=1.00, AGF=0.90
  },
];

const PERSONA_A_TIMELINE_S2: RawTimelineItem[] = [
  ...PERSONA_A_TIMELINE_S1,
  {
    id: 'ea-tl-006', date: '2025-06-10',
    category: 'Volontariato territoriale',
    pillar: 'IMPACT', source_type: 'esg_initiatives',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 0.97, // NM=1.30, BC=1.00, CQ=0.92, EV=0.90, CF=1.00, AGF=0.90
  },
  {
    id: 'ea-tl-007', date: '2025-05-22',
    category: 'Sessione trasferimento conoscenza',
    pillar: 'LEGACY', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'medium',
    iu_value: 0.54, // NM=0.90, BC=1.10, CQ=0.85, EV=0.75, CF=1.00, AGF=0.86
  },
  {
    id: 'ea-tl-008', date: '2025-04-30',
    category: 'Mentoring — collega junior',
    pillar: 'CONNECTION', source_type: 'manual_upload',
    verification_status: 'self_declared', iu_contribution: 'low',
    iu_value: 0.31, // NM=0.80, BC=1.00, CQ=0.80, EV=0.60, CF=1.00, AGF=0.82
  },
];

const PERSONA_A_PILLARS_S1: PillarPreview[] = [
  { pillar: 'LIFE',       label: 'Life',       score: 52, iu_total: 1.78, trend: 'stable', event_count: 3 },
  { pillar: 'GROWTH',     label: 'Growth',     score: 37, iu_total: 1.33, trend: 'up',     event_count: 3 },
  { pillar: 'CONNECTION', label: 'Connection', score: 10, iu_total: 0.28, trend: 'stable', event_count: 2 },
  { pillar: 'IMPACT',     label: 'Impact',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
  { pillar: 'LEGACY',     label: 'Legacy',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
];

const PERSONA_A_PIB_S1: PibLightPreview = {
  period: 'Q1–Q2 2025',
  overall_index: 33,
  ...deriveActivationLevel(33),
  active_pillars: 3,
  total_events: 8,
  pillar_breakdown:          PERSONA_A_PILLARS_S1,
  period_iu_total:           derivePeriodIuTotal(PERSONA_A_PILLARS_S1),
  ...deriveActivationProfile(PERSONA_A_PILLARS_S1),
  pib_derivation_note: DERIVATION_NOTE,
  pib_derivation_basis: 'synthetic_iu_pre_computed',
  disclaimer: 'Il tuo Personal Impact Balance è informativo e privato. Non valuta le tue performance e non è mai visibile al datore di lavoro.',
  not_employer_visible: true,
  not_performance_score: true,
};

const PERSONA_A_PILLARS_S2: PillarPreview[] = [
  { pillar: 'LIFE',       label: 'Life',       score: 68, iu_total: 2.90, trend: 'up',     event_count: 5 },
  { pillar: 'GROWTH',     label: 'Growth',     score: 62, iu_total: 2.65, trend: 'up',     event_count: 4 },
  { pillar: 'CONNECTION', label: 'Connection', score: 40, iu_total: 0.59, trend: 'up',     event_count: 4 },
  { pillar: 'IMPACT',     label: 'Impact',     score: 55, iu_total: 0.97, trend: 'up',     event_count: 2 },
  { pillar: 'LEGACY',     label: 'Legacy',     score: 30, iu_total: 0.54, trend: 'up',     event_count: 2 },
];

const PERSONA_A_PIB_S2: PibLightPreview = {
  period: 'Q1–Q4 2025',
  overall_index: 58,
  ...deriveActivationLevel(58),
  active_pillars: 5,
  total_events: 17,
  pillar_breakdown:          PERSONA_A_PILLARS_S2,
  period_iu_total:           derivePeriodIuTotal(PERSONA_A_PILLARS_S2),
  ...deriveActivationProfile(PERSONA_A_PILLARS_S2),
  pib_derivation_note: DERIVATION_NOTE,
  pib_derivation_basis: 'synthetic_iu_pre_computed',
  disclaimer: 'Il tuo Personal Impact Balance è informativo e privato. Non valuta le tue performance e non è mai visibile al datore di lavoro.',
  not_employer_visible: true,
  not_performance_score: true,
};

const PERSONA_A_CV_ITEMS: DynamicCVItem[] = [
  {
    id: 'ea-cv-001', title: 'Certificazione Competenze Digitali — Livello 2',
    pillar: 'GROWTH', pillar_label: 'Growth',
    date: '2025-02-20', source_category: 'LMS training',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da LMS Platform',
  },
  {
    id: 'ea-cv-002', title: 'Modulo Sviluppo Leadership',
    pillar: 'GROWTH', pillar_label: 'Growth',
    date: '2025-01-07', source_category: 'LMS training',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da LMS Platform',
  },
  {
    id: 'ea-cv-003', title: 'Volontariato Comunitario — Iniziativa Territoriale',
    pillar: 'IMPACT', pillar_label: 'Impact',
    date: '2025-06-10', source_category: 'ESG / community',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da Advisor',
  },
  {
    id: 'ea-cv-004', title: 'Trasferimento Conoscenza — Mentoring Junior',
    pillar: 'LEGACY', pillar_label: 'Legacy',
    date: '2025-05-22', source_category: 'Partner event',
    verification_status: 'partial', shareable: false,
    export_label: 'Verifica parziale — non ancora condivisibile',
  },
  {
    id: 'ea-cv-005', title: 'Programma Peer Collaboration',
    pillar: 'CONNECTION', pillar_label: 'Connection',
    date: '2025-01-18', source_category: 'Partner event',
    verification_status: 'partial', shareable: false,
    export_label: 'Verifica parziale — non ancora condivisibile',
  },
  {
    id: 'ea-cv-006', title: 'Programma Benessere Fisico — In corso',
    pillar: 'LIFE', pillar_label: 'Life',
    date: '2025-03-12', source_category: 'Welfare provider',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da Welfare Provider',
  },
];

const PERSONA_A_OPPORTUNITIES: OpportunityItem[] = [
  {
    id: 'ea-opp-01', title: 'Workshop Community Leadership',
    subtitle: 'Leadership collaborativa e facilitazione di comunità',
    pillar: 'CONNECTION', pillar_label: 'CONNECTION',
    provider: 'Città Aperta APS', format: '2 sessioni · 4h totali',
    iu_potential: '+12–18 IU stimati', type: 'partner', status: 'preview',
    match_reason: 'Il tuo pillar CONNECTION ha spazio di crescita. Questa attività potenzia mentoring e coesione.',
  },
  {
    id: 'ea-opp-02', title: 'Percorso Mentoring Legacy',
    subtitle: 'Trasferimento di conoscenza e memoria organizzativa',
    pillar: 'LEGACY', pillar_label: 'LEGACY',
    provider: 'GrowthLab Academy', format: '6 sessioni · 12h totali',
    iu_potential: '+20–30 IU stimati', type: 'partner', status: 'coming_soon',
    match_reason: 'Il pillar LEGACY è compatibile con il tuo profilo. Un percorso mentoring rafforza la continuità organizzativa.',
  },
  {
    id: 'ea-opp-03', title: 'Check Prevenzione LIFE',
    subtitle: 'Screening di prevenzione e check salute di base',
    pillar: 'LIFE', pillar_label: 'LIFE',
    provider: 'VitaLab Network', format: '1 sessione · 2h',
    iu_potential: '+8–12 IU stimati', type: 'partner', status: 'preview',
    match_reason: 'Il pillar LIFE ha alta continuità. Un check prevenzione consolida il benessere sostenuto.',
  },
  {
    id: 'ea-opp-04', title: 'Volontariato Territoriale',
    subtitle: 'Progetto di impatto comunitario e ambientale',
    pillar: 'IMPACT', pillar_label: 'IMPACT',
    provider: 'Città Aperta APS', format: '1 giornata · 6h',
    iu_potential: '+15–22 IU stimati', type: 'community', status: 'preview',
    match_reason: 'Attività IMPACT con evidenza esterna verificata. Massimo potenziale per il pillar.',
  },
  {
    id: 'ea-opp-05', title: 'Emerging Leaders',
    subtitle: 'Sviluppo competenze leadership e digital skills',
    pillar: 'GROWTH', pillar_label: 'GROWTH',
    provider: 'LMS Aziendale', format: '4 moduli · 8h totali',
    iu_potential: '+18–26 IU stimati', type: 'internal', status: 'coming_soon',
    match_reason: 'Il pillar GROWTH può crescere. Certificazione interna con evidenza LMS verificata.',
  },
  {
    id: 'ea-opp-06', title: 'Ciclo Mentoring Cross-Generazionale',
    subtitle: 'Collaborazione senior-junior e scambio intergenerazionale',
    pillar: 'CONNECTION', pillar_label: 'CONNECTION',
    provider: 'Iniziativa interna', format: '8 sessioni · 16h totali',
    iu_potential: '+25–35 IU stimati', type: 'internal', status: 'coming_soon',
    match_reason: 'Copre CONNECTION e LEGACY contemporaneamente. Alta coerenza con il tuo profilo operativo.',
  },
];

// ── Persona B — Marco T. (Sales / HQ Milano) ─────────────────────────────────
// Profile: CONNECTION-dominant (sales requires networking), growing GROWTH,
// moderate LIFE, emerging IMPACT in S2.

const PERSONA_B_TIMELINE_S1: RawTimelineItem[] = [
  {
    id: 'mt-tl-001', date: '2025-03-08',
    category: 'Workshop networking e relazioni professionali',
    pillar: 'CONNECTION', source_type: 'partner_events',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 1.08, // NM=1.20, BC=1.00, CQ=0.90, EV=0.90, CF=1.00, AGF=1.00
  },
  {
    id: 'mt-tl-002', date: '2025-02-25',
    category: 'Formazione metodologia di vendita consultiva',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.78, // NM=0.80, BC=1.10, CQ=0.88, EV=0.90, CF=1.00, AGF=1.00
  },
  {
    id: 'mt-tl-003', date: '2025-02-10',
    category: 'Cerchio leadership di team',
    pillar: 'CONNECTION', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'medium',
    iu_value: 0.52, // NM=0.70, BC=1.00, CQ=0.82, EV=0.75, CF=1.00, AGF=0.90
  },
  {
    id: 'mt-tl-004', date: '2025-01-22',
    category: 'Programma benessere aziendale',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'partial', iu_contribution: 'low',
    iu_value: 0.38, // NM=0.60, BC=1.20, CQ=0.80, EV=0.75, CF=1.00, AGF=0.88
  },
  {
    id: 'mt-tl-005', date: '2025-01-12',
    category: 'Preparazione certificazione professionale',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.85, // NM=0.90, BC=1.10, CQ=0.90, EV=0.90, CF=1.00, AGF=0.95
  },
  {
    id: 'mt-tl-006', date: '2025-01-05',
    category: 'Collaborazione cross-team progetto',
    pillar: 'CONNECTION', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'low',
    iu_value: 0.42, // NM=0.60, BC=1.00, CQ=0.80, EV=0.75, CF=1.00, AGF=0.88
  },
];

const PERSONA_B_TIMELINE_S2: RawTimelineItem[] = [
  ...PERSONA_B_TIMELINE_S1,
  {
    id: 'mt-tl-007', date: '2025-07-15',
    category: 'Iniziativa impatto comunitario',
    pillar: 'IMPACT', source_type: 'esg_initiatives',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 0.88, // NM=1.10, BC=1.00, CQ=0.90, EV=0.90, CF=1.00, AGF=0.98
  },
  {
    id: 'mt-tl-008', date: '2025-06-20',
    category: 'Screening salute e prevenzione',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.72, // NM=0.80, BC=1.20, CQ=0.88, EV=0.90, CF=1.00, AGF=0.90
  },
];

const PERSONA_B_PILLARS_S1: PillarPreview[] = [
  { pillar: 'LIFE',       label: 'Life',       score: 18, iu_total: 0.38, trend: 'stable', event_count: 1 },
  { pillar: 'GROWTH',     label: 'Growth',     score: 35, iu_total: 1.63, trend: 'up',     event_count: 2 },
  { pillar: 'CONNECTION', label: 'Connection', score: 50, iu_total: 2.02, trend: 'up',     event_count: 3 },
  { pillar: 'IMPACT',     label: 'Impact',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
  { pillar: 'LEGACY',     label: 'Legacy',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
];

const PERSONA_B_PIB_S1: PibLightPreview = {
  period: 'Q1–Q2 2025',
  overall_index: 28,
  ...deriveActivationLevel(28),
  active_pillars: 3,
  total_events: 8,
  pillar_breakdown:          PERSONA_B_PILLARS_S1,
  period_iu_total:           derivePeriodIuTotal(PERSONA_B_PILLARS_S1),
  ...deriveActivationProfile(PERSONA_B_PILLARS_S1),
  pib_derivation_note: DERIVATION_NOTE,
  pib_derivation_basis: 'synthetic_iu_pre_computed',
  disclaimer: 'Il tuo Personal Impact Balance è informativo e privato. Non valuta le tue performance e non è mai visibile al datore di lavoro.',
  not_employer_visible: true,
  not_performance_score: true,
};

const PERSONA_B_PILLARS_S2: PillarPreview[] = [
  { pillar: 'LIFE',       label: 'Life',       score: 35, iu_total: 1.10, trend: 'up',     event_count: 3 },
  { pillar: 'GROWTH',     label: 'Growth',     score: 50, iu_total: 2.45, trend: 'up',     event_count: 4 },
  { pillar: 'CONNECTION', label: 'Connection', score: 62, iu_total: 2.88, trend: 'up',     event_count: 5 },
  { pillar: 'IMPACT',     label: 'Impact',     score: 28, iu_total: 0.88, trend: 'up',     event_count: 2 },
  { pillar: 'LEGACY',     label: 'Legacy',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
];

const PERSONA_B_PIB_S2: PibLightPreview = {
  period: 'Q1–Q4 2025',
  overall_index: 52,
  ...deriveActivationLevel(52),
  active_pillars: 4,
  total_events: 14,
  pillar_breakdown:          PERSONA_B_PILLARS_S2,
  period_iu_total:           derivePeriodIuTotal(PERSONA_B_PILLARS_S2),
  ...deriveActivationProfile(PERSONA_B_PILLARS_S2),
  pib_derivation_note: DERIVATION_NOTE,
  pib_derivation_basis: 'synthetic_iu_pre_computed',
  disclaimer: 'Il tuo Personal Impact Balance è informativo e privato. Non valuta le tue performance e non è mai visibile al datore di lavoro.',
  not_employer_visible: true,
  not_performance_score: true,
};

const PERSONA_B_CV_ITEMS: DynamicCVItem[] = [
  {
    id: 'mt-cv-001', title: 'Certificazione Metodologia di Vendita Consultiva',
    pillar: 'GROWTH', pillar_label: 'Growth',
    date: '2025-02-25', source_category: 'LMS training',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da LMS Platform',
  },
  {
    id: 'mt-cv-002', title: 'Leadership Circle — Facilitatore di Team',
    pillar: 'CONNECTION', pillar_label: 'Connection',
    date: '2025-03-08', source_category: 'Partner event',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da Partner KORA',
  },
  {
    id: 'mt-cv-003', title: 'Progetto Impatto Comunitario',
    pillar: 'IMPACT', pillar_label: 'Impact',
    date: '2025-07-15', source_category: 'ESG / community',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da Advisor',
  },
  {
    id: 'mt-cv-004', title: 'Cross-Team Project Collaboration',
    pillar: 'CONNECTION', pillar_label: 'Connection',
    date: '2025-01-05', source_category: 'Partner event',
    verification_status: 'partial', shareable: false,
    export_label: 'Verifica parziale — non ancora condivisibile',
  },
];

const PERSONA_B_OPPORTUNITIES: OpportunityItem[] = [
  {
    id: 'mt-opp-01', title: 'Rete Mentoring Professionale',
    subtitle: 'Percorso di mentoring bidirezionale senior-junior',
    pillar: 'CONNECTION', pillar_label: 'CONNECTION',
    provider: 'GrowthLab Academy', format: '6 sessioni · 10h totali',
    iu_potential: '+22–32 IU stimati', type: 'partner', status: 'preview',
    match_reason: 'Il tuo pillar CONNECTION è il più forte. Un percorso mentoring strutturato consolida la continuità.',
  },
  {
    id: 'mt-opp-02', title: 'Certificazione Account Management',
    subtitle: 'Sviluppo competenze commerciali e gestione clienti',
    pillar: 'GROWTH', pillar_label: 'GROWTH',
    provider: 'LMS Aziendale', format: '5 moduli · 10h totali',
    iu_potential: '+20–28 IU stimati', type: 'internal', status: 'coming_soon',
    match_reason: 'Il pillar GROWTH ha spazio di accelerazione. Certificazione con evidenza LMS verificata.',
  },
  {
    id: 'mt-opp-03', title: 'Check Benessere & Prevenzione',
    subtitle: 'Programma screening salute e gestione stress',
    pillar: 'LIFE', pillar_label: 'LIFE',
    provider: 'VitaLab Network', format: '2 sessioni · 3h',
    iu_potential: '+10–15 IU stimati', type: 'partner', status: 'preview',
    match_reason: 'Il pillar LIFE ha continuità bassa. Un check prevenzione supporta il benessere sostenuto.',
  },
  {
    id: 'mt-opp-04', title: 'Progetto Territorio & Comunità',
    subtitle: 'Iniziativa ESG con impatto comunitario misurabile',
    pillar: 'IMPACT', pillar_label: 'IMPACT',
    provider: 'Città Aperta APS', format: '1 giornata · 6h',
    iu_potential: '+14–20 IU stimati', type: 'community', status: 'coming_soon',
    match_reason: 'Il pillar IMPACT è emergente nel tuo profilo. Una iniziativa verificata crea evidenza esterna solida.',
  },
];

// ── Persona C — Sofia R. (Engineering / HQ Milano, remote/hybrid) ─────────────
// Profile: GROWTH-dominant (digital/tech specialist), strong LIFE (remote wellness),
// emerging IMPACT (tech for good), low CONNECTION (individual contributor).

const PERSONA_C_TIMELINE_S1: RawTimelineItem[] = [
  {
    id: 'sr-tl-001', date: '2025-03-15',
    category: 'Certificazione architettura cloud',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 1.28, // NM=1.30, BC=1.10, CQ=0.92, EV=0.90, CF=1.00, AGF=0.97
  },
  {
    id: 'sr-tl-002', date: '2025-02-28',
    category: 'Fondamenti AI/ML applicata',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 1.12, // NM=1.20, BC=1.10, CQ=0.90, EV=0.90, CF=1.00, AGF=0.94
  },
  {
    id: 'sr-tl-003', date: '2025-02-12',
    category: 'Check benessere mentale — remote',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'partial', iu_contribution: 'low',
    iu_value: 0.49, // NM=0.70, BC=1.20, CQ=0.85, EV=0.75, CF=1.00, AGF=0.86
  },
  {
    id: 'sr-tl-004', date: '2025-01-25',
    category: 'Sessione tech community',
    pillar: 'CONNECTION', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'low',
    iu_value: 0.38, // NM=0.60, BC=1.00, CQ=0.82, EV=0.75, CF=1.00, AGF=0.82
  },
  {
    id: 'sr-tl-005', date: '2025-01-10',
    category: 'Leadership e comunicazione tecnica',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.88, // NM=0.90, BC=1.10, CQ=0.90, EV=0.90, CF=1.00, AGF=0.98
  },
];

const PERSONA_C_TIMELINE_S2: RawTimelineItem[] = [
  ...PERSONA_C_TIMELINE_S1,
  {
    id: 'sr-tl-006', date: '2025-07-20',
    category: 'Volontariato inclusione digitale',
    pillar: 'IMPACT', source_type: 'esg_initiatives',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 1.10, // NM=1.30, BC=1.00, CQ=0.92, EV=0.90, CF=1.00, AGF=0.96
  },
  {
    id: 'sr-tl-007', date: '2025-06-18',
    category: 'Ergonomia e benessere remote',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.82, // NM=0.90, BC=1.20, CQ=0.88, EV=0.90, CF=1.00, AGF=0.86
  },
  {
    id: 'sr-tl-008', date: '2025-05-30',
    category: 'Trasferimento know-how tecnico',
    pillar: 'LEGACY', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'low',
    iu_value: 0.48, // NM=0.70, BC=1.10, CQ=0.85, EV=0.75, CF=1.00, AGF=0.86
  },
];

const PERSONA_C_PILLARS_S1: PillarPreview[] = [
  { pillar: 'LIFE',       label: 'Life',       score: 28, iu_total: 0.49, trend: 'stable', event_count: 1 },
  { pillar: 'GROWTH',     label: 'Growth',     score: 72, iu_total: 3.28, trend: 'up',     event_count: 4 },
  { pillar: 'CONNECTION', label: 'Connection', score: 18, iu_total: 0.38, trend: 'stable', event_count: 1 },
  { pillar: 'IMPACT',     label: 'Impact',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
  { pillar: 'LEGACY',     label: 'Legacy',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
];

const PERSONA_C_PIB_S1: PibLightPreview = {
  period: 'Q1–Q2 2025',
  overall_index: 42,
  ...deriveActivationLevel(42),
  active_pillars: 3,
  total_events: 7,
  pillar_breakdown:          PERSONA_C_PILLARS_S1,
  period_iu_total:           derivePeriodIuTotal(PERSONA_C_PILLARS_S1),
  ...deriveActivationProfile(PERSONA_C_PILLARS_S1),
  pib_derivation_note: DERIVATION_NOTE,
  pib_derivation_basis: 'synthetic_iu_pre_computed',
  disclaimer: 'Il tuo Personal Impact Balance è informativo e privato. Non valuta le tue performance e non è mai visibile al datore di lavoro.',
  not_employer_visible: true,
  not_performance_score: true,
};

const PERSONA_C_PILLARS_S2: PillarPreview[] = [
  { pillar: 'LIFE',       label: 'Life',       score: 45, iu_total: 1.70, trend: 'up',     event_count: 3 },
  { pillar: 'GROWTH',     label: 'Growth',     score: 80, iu_total: 4.80, trend: 'up',     event_count: 6 },
  { pillar: 'CONNECTION', label: 'Connection', score: 32, iu_total: 0.78, trend: 'up',     event_count: 2 },
  { pillar: 'IMPACT',     label: 'Impact',     score: 42, iu_total: 1.10, trend: 'up',     event_count: 2 },
  { pillar: 'LEGACY',     label: 'Legacy',     score: 16, iu_total: 0.48, trend: 'up',     event_count: 1 },
];

const PERSONA_C_PIB_S2: PibLightPreview = {
  period: 'Q1–Q4 2025',
  overall_index: 65,
  ...deriveActivationLevel(65),
  active_pillars: 5,
  total_events: 14,
  pillar_breakdown:          PERSONA_C_PILLARS_S2,
  period_iu_total:           derivePeriodIuTotal(PERSONA_C_PILLARS_S2),
  ...deriveActivationProfile(PERSONA_C_PILLARS_S2),
  pib_derivation_note: DERIVATION_NOTE,
  pib_derivation_basis: 'synthetic_iu_pre_computed',
  disclaimer: 'Il tuo Personal Impact Balance è informativo e privato. Non valuta le tue performance e non è mai visibile al datore di lavoro.',
  not_employer_visible: true,
  not_performance_score: true,
};

const PERSONA_C_CV_ITEMS: DynamicCVItem[] = [
  {
    id: 'sr-cv-001', title: 'Certificazione Cloud Architecture — AWS/Azure',
    pillar: 'GROWTH', pillar_label: 'Growth',
    date: '2025-03-15', source_category: 'LMS training',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da LMS Platform',
  },
  {
    id: 'sr-cv-002', title: 'AI/ML Applicata — Fondamenti e Progetto',
    pillar: 'GROWTH', pillar_label: 'Growth',
    date: '2025-02-28', source_category: 'LMS training',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da LMS Platform',
  },
  {
    id: 'sr-cv-003', title: 'Volontariato Inclusione Digitale',
    pillar: 'IMPACT', pillar_label: 'Impact',
    date: '2025-07-20', source_category: 'ESG / community',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da Advisor',
  },
  {
    id: 'sr-cv-004', title: 'Trasferimento Know-How Tecnico — Junior Engineer',
    pillar: 'LEGACY', pillar_label: 'Legacy',
    date: '2025-05-30', source_category: 'Partner event',
    verification_status: 'partial', shareable: false,
    export_label: 'Verifica parziale — non ancora condivisibile',
  },
];

const PERSONA_C_OPPORTUNITIES: OpportunityItem[] = [
  {
    id: 'sr-opp-01', title: 'Advanced Cloud Security Certification',
    subtitle: 'Certificazione sicurezza cloud e architettura scalabile',
    pillar: 'GROWTH', pillar_label: 'GROWTH',
    provider: 'LMS Aziendale', format: '6 moduli · 12h totali',
    iu_potential: '+28–38 IU stimati', type: 'internal', status: 'coming_soon',
    match_reason: 'Il tuo pillar GROWTH è il più forte. Una certificazione avanzata consolida ulteriormente il profilo tecnico.',
  },
  {
    id: 'sr-opp-02', title: 'Hackathon per il Territorio',
    subtitle: 'Progetto tech a impatto sociale e ambientale',
    pillar: 'IMPACT', pillar_label: 'IMPACT',
    provider: 'Città Aperta APS', format: '1 weekend · 16h',
    iu_potential: '+20–30 IU stimati', type: 'community', status: 'preview',
    match_reason: 'Il pillar IMPACT è emergente. Un hackathon territoriale genera evidenza esterna verificabile.',
  },
  {
    id: 'sr-opp-03', title: 'Programma Benessere Remote Worker',
    subtitle: 'Ergonomia, mindfulness e prevenzione burnout',
    pillar: 'LIFE', pillar_label: 'LIFE',
    provider: 'VitaLab Network', format: '3 sessioni · 4h totali',
    iu_potential: '+12–18 IU stimati', type: 'partner', status: 'preview',
    match_reason: 'Il pillar LIFE ha continuità media. Un programma dedicato al remote work rafforza la sostenibilità.',
  },
  {
    id: 'sr-opp-04', title: 'Mentoring Tecnico Cross-Team',
    subtitle: 'Trasferimento competenze tech a colleghi non-tech',
    pillar: 'CONNECTION', pillar_label: 'CONNECTION',
    provider: 'Iniziativa interna', format: '4 sessioni · 6h totali',
    iu_potential: '+14–20 IU stimati', type: 'internal', status: 'coming_soon',
    match_reason: 'Il pillar CONNECTION è basso. Un percorso mentoring cross-team allarga la tua rete di impatto.',
  },
];

// ── Persona D — Giovanni B. (HR / HQ Milano, senior leader) ──────────────────
// Profile: LEGACY-dominant (knowledge transfer, succession planning), strong
// CONNECTION (facilitator, coaching), stable GROWTH, healthy LIFE.

const PERSONA_D_TIMELINE_S1: RawTimelineItem[] = [
  {
    id: 'gb-tl-001', date: '2025-03-20',
    category: 'Programma mentoring senior',
    pillar: 'LEGACY', source_type: 'partner_events',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 1.38, // NM=1.30, BC=1.10, CQ=0.92, EV=0.90, CF=1.00, AGF=1.00
  },
  {
    id: 'gb-tl-002', date: '2025-03-05',
    category: 'Facilitazione cross-dipartimentale',
    pillar: 'CONNECTION', source_type: 'partner_events',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 1.05, // NM=1.10, BC=1.00, CQ=0.92, EV=0.90, CF=1.00, AGF=1.00
  },
  {
    id: 'gb-tl-003', date: '2025-02-18',
    category: 'Documentazione knowledge base organizzativo',
    pillar: 'LEGACY', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 1.08, // NM=1.10, BC=1.10, CQ=0.90, EV=0.90, CF=1.00, AGF=0.98
  },
  {
    id: 'gb-tl-004', date: '2025-02-08',
    category: 'Formazione HR technology',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.88, // NM=0.90, BC=1.10, CQ=0.90, EV=0.90, CF=1.00, AGF=0.98
  },
  {
    id: 'gb-tl-005', date: '2025-01-28',
    category: 'Workshop team building e coesione',
    pillar: 'CONNECTION', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'medium',
    iu_value: 0.56, // NM=0.80, BC=1.00, CQ=0.82, EV=0.75, CF=1.00, AGF=0.86
  },
  {
    id: 'gb-tl-006', date: '2025-01-20',
    category: 'Programma salute e resilienza',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'partial', iu_contribution: 'low',
    iu_value: 0.48, // NM=0.70, BC=1.20, CQ=0.82, EV=0.75, CF=1.00, AGF=0.84
  },
  {
    id: 'gb-tl-007', date: '2025-01-12',
    category: 'Coaching leadership — percorso individuale',
    pillar: 'GROWTH', source_type: 'partner_events',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.92, // NM=0.95, BC=1.10, CQ=0.90, EV=0.90, CF=1.00, AGF=0.98
  },
  {
    id: 'gb-tl-008', date: '2025-01-06',
    category: 'Workshop cultura organizzativa',
    pillar: 'LEGACY', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'medium',
    iu_value: 0.68, // NM=0.90, BC=1.10, CQ=0.85, EV=0.75, CF=1.00, AGF=0.96
  },
];

const PERSONA_D_TIMELINE_S2: RawTimelineItem[] = [
  ...PERSONA_D_TIMELINE_S1,
  {
    id: 'gb-tl-009', date: '2025-08-05',
    category: 'Coordinamento progetto sociale territoriale',
    pillar: 'IMPACT', source_type: 'esg_initiatives',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 0.95, // NM=1.10, BC=1.00, CQ=0.92, EV=0.90, CF=1.00, AGF=1.00
  },
  {
    id: 'gb-tl-010', date: '2025-07-22',
    category: 'Rete coaching executive',
    pillar: 'CONNECTION', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'medium',
    iu_value: 0.66, // NM=0.90, BC=1.00, CQ=0.82, EV=0.75, CF=1.00, AGF=0.90
  },
  {
    id: 'gb-tl-011', date: '2025-07-08',
    category: 'Ritiro benessere leadership',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'verified', iu_contribution: 'medium',
    iu_value: 0.92, // NM=1.00, BC=1.20, CQ=0.88, EV=0.90, CF=1.00, AGF=0.88
  },
  {
    id: 'gb-tl-012', date: '2025-06-25',
    category: 'Documentazione piano di successione',
    pillar: 'LEGACY', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'high',
    iu_value: 1.20, // NM=1.20, BC=1.10, CQ=0.90, EV=0.90, CF=1.00, AGF=1.00
  },
];

const PERSONA_D_PILLARS_S1: PillarPreview[] = [
  { pillar: 'LIFE',       label: 'Life',       score: 35, iu_total: 0.48, trend: 'stable', event_count: 1 },
  { pillar: 'GROWTH',     label: 'Growth',     score: 50, iu_total: 1.80, trend: 'up',     event_count: 2 },
  { pillar: 'CONNECTION', label: 'Connection', score: 62, iu_total: 1.61, trend: 'up',     event_count: 2 },
  { pillar: 'IMPACT',     label: 'Impact',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
  { pillar: 'LEGACY',     label: 'Legacy',     score: 75, iu_total: 3.14, trend: 'up',     event_count: 3 },
];

const PERSONA_D_PIB_S1: PibLightPreview = {
  period: 'Q1–Q2 2025',
  overall_index: 55,
  ...deriveActivationLevel(55),
  active_pillars: 4,
  total_events: 10,
  pillar_breakdown:          PERSONA_D_PILLARS_S1,
  period_iu_total:           derivePeriodIuTotal(PERSONA_D_PILLARS_S1),
  ...deriveActivationProfile(PERSONA_D_PILLARS_S1),
  pib_derivation_note: DERIVATION_NOTE,
  pib_derivation_basis: 'synthetic_iu_pre_computed',
  disclaimer: 'Il tuo Personal Impact Balance è informativo e privato. Non valuta le tue performance e non è mai visibile al datore di lavoro.',
  not_employer_visible: true,
  not_performance_score: true,
};

const PERSONA_D_PILLARS_S2: PillarPreview[] = [
  { pillar: 'LIFE',       label: 'Life',       score: 52, iu_total: 1.40, trend: 'up',     event_count: 3 },
  { pillar: 'GROWTH',     label: 'Growth',     score: 65, iu_total: 2.80, trend: 'up',     event_count: 4 },
  { pillar: 'CONNECTION', label: 'Connection', score: 70, iu_total: 2.27, trend: 'up',     event_count: 4 },
  { pillar: 'IMPACT',     label: 'Impact',     score: 38, iu_total: 0.95, trend: 'up',     event_count: 2 },
  { pillar: 'LEGACY',     label: 'Legacy',     score: 82, iu_total: 4.34, trend: 'up',     event_count: 5 },
];

const PERSONA_D_PIB_S2: PibLightPreview = {
  period: 'Q1–Q4 2025',
  overall_index: 72,
  ...deriveActivationLevel(72),
  active_pillars: 5,
  total_events: 18,
  pillar_breakdown:          PERSONA_D_PILLARS_S2,
  period_iu_total:           derivePeriodIuTotal(PERSONA_D_PILLARS_S2),
  ...deriveActivationProfile(PERSONA_D_PILLARS_S2),
  pib_derivation_note: DERIVATION_NOTE,
  pib_derivation_basis: 'synthetic_iu_pre_computed',
  disclaimer: 'Il tuo Personal Impact Balance è informativo e privato. Non valuta le tue performance e non è mai visibile al datore di lavoro.',
  not_employer_visible: true,
  not_performance_score: true,
};

const PERSONA_D_CV_ITEMS: DynamicCVItem[] = [
  {
    id: 'gb-cv-001', title: 'Programma Mentoring Senior — Facilitatore',
    pillar: 'LEGACY', pillar_label: 'Legacy',
    date: '2025-03-20', source_category: 'Partner event',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da Partner KORA',
  },
  {
    id: 'gb-cv-002', title: 'Documentazione Knowledge Base Organizzativo',
    pillar: 'LEGACY', pillar_label: 'Legacy',
    date: '2025-02-18', source_category: 'LMS training',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da LMS Platform',
  },
  {
    id: 'gb-cv-003', title: 'Piano di Successione — Documentazione',
    pillar: 'LEGACY', pillar_label: 'Legacy',
    date: '2025-06-25', source_category: 'LMS training',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da LMS Platform',
  },
  {
    id: 'gb-cv-004', title: 'Progetto Sociale Territoriale — Coordinamento',
    pillar: 'IMPACT', pillar_label: 'Impact',
    date: '2025-08-05', source_category: 'ESG / community',
    verification_status: 'verified', shareable: true,
    export_label: 'Verificato da Advisor',
  },
  {
    id: 'gb-cv-005', title: 'Coaching Leadership Individuale',
    pillar: 'GROWTH', pillar_label: 'Growth',
    date: '2025-01-12', source_category: 'Partner event',
    verification_status: 'partial', shareable: false,
    export_label: 'Verifica parziale — non ancora condivisibile',
  },
];

const PERSONA_D_OPPORTUNITIES: OpportunityItem[] = [
  {
    id: 'gb-opp-01', title: 'Programma Successione Organizzativa',
    subtitle: 'Framework per la continuità della leadership e cultura',
    pillar: 'LEGACY', pillar_label: 'LEGACY',
    provider: 'GrowthLab Academy', format: '4 sessioni · 8h totali',
    iu_potential: '+30–42 IU stimati', type: 'partner', status: 'preview',
    match_reason: 'Il tuo pillar LEGACY è eccellente. Un percorso strutturato sulla successione amplifica la continuità organizzativa.',
  },
  {
    id: 'gb-opp-02', title: 'Executive Coaching Network',
    subtitle: 'Rete di peer coaching per leader senior',
    pillar: 'CONNECTION', pillar_label: 'CONNECTION',
    provider: 'GrowthLab Academy', format: '6 sessioni · 12h totali',
    iu_potential: '+25–35 IU stimati', type: 'partner', status: 'coming_soon',
    match_reason: 'Il tuo pillar CONNECTION è alto. Un network di peer coaching consolida l\'influenza organizzativa.',
  },
  {
    id: 'gb-opp-03', title: 'Progetto Impatto Sociale Senior',
    subtitle: 'Coordinamento iniziativa ESG con responsabilità di progetto',
    pillar: 'IMPACT', pillar_label: 'IMPACT',
    provider: 'Città Aperta APS', format: '3 giornate · 18h',
    iu_potential: '+22–30 IU stimati', type: 'community', status: 'preview',
    match_reason: 'Il pillar IMPACT è emergente nel tuo profilo senior. Una iniziativa guidata da te genera evidenza verificata e contributo collettivo.',
  },
  {
    id: 'gb-opp-04', title: 'Ritiro Benessere & Leadership',
    subtitle: 'Programma integrato salute fisica e mentale per leader',
    pillar: 'LIFE', pillar_label: 'LIFE',
    provider: 'VitaLab Network', format: '2 sessioni · 4h',
    iu_potential: '+12–18 IU stimati', type: 'partner', status: 'coming_soon',
    match_reason: 'Il pillar LIFE è stabile. Un programma benessere leader supporta sostenibilità a lungo termine.',
  },
];

// ── Persona dispatch maps ─────────────────────────────────────────────────────

type PersonaKey = 'a' | 'b' | 'c' | 'd';

function resolvePersonaKey(personaId: string): PersonaKey {
  const id = personaId.toLowerCase();
  if (id === 'persona-marco-t' || id === 'persona-b' || id === 'b') return 'b';
  if (id === 'persona-sofia-r' || id === 'persona-c' || id === 'c') return 'c';
  if (id === 'persona-giovanni-b' || id === 'persona-d' || id === 'd') return 'd';
  // Default: Elena M. / Persona A
  return 'a';
}

const PIB_BY_PERSONA_SCENARIO: Record<PersonaKey, Record<'S1' | 'S2' | 'S3' | 'S4', PibLightPreview>> = {
  a: { S1: PERSONA_A_PIB_S1, S2: PERSONA_A_PIB_S2, S3: PERSONA_A_PIB_S2, S4: PERSONA_A_PIB_S2 },
  b: { S1: PERSONA_B_PIB_S1, S2: PERSONA_B_PIB_S2, S3: PERSONA_B_PIB_S2, S4: PERSONA_B_PIB_S2 },
  c: { S1: PERSONA_C_PIB_S1, S2: PERSONA_C_PIB_S2, S3: PERSONA_C_PIB_S2, S4: PERSONA_C_PIB_S2 },
  d: { S1: PERSONA_D_PIB_S1, S2: PERSONA_D_PIB_S2, S3: PERSONA_D_PIB_S2, S4: PERSONA_D_PIB_S2 },
};

const TIMELINE_BY_PERSONA_SCENARIO: Record<PersonaKey, Record<'S1' | 'S2' | 'S3' | 'S4', RawTimelineItem[]>> = {
  a: { S1: PERSONA_A_TIMELINE_S1, S2: PERSONA_A_TIMELINE_S2, S3: PERSONA_A_TIMELINE_S2, S4: PERSONA_A_TIMELINE_S2 },
  b: { S1: PERSONA_B_TIMELINE_S1, S2: PERSONA_B_TIMELINE_S2, S3: PERSONA_B_TIMELINE_S2, S4: PERSONA_B_TIMELINE_S2 },
  c: { S1: PERSONA_C_TIMELINE_S1, S2: PERSONA_C_TIMELINE_S2, S3: PERSONA_C_TIMELINE_S2, S4: PERSONA_C_TIMELINE_S2 },
  d: { S1: PERSONA_D_TIMELINE_S1, S2: PERSONA_D_TIMELINE_S2, S3: PERSONA_D_TIMELINE_S2, S4: PERSONA_D_TIMELINE_S2 },
};

const CV_BY_PERSONA: Record<PersonaKey, DynamicCVItem[]> = {
  a: PERSONA_A_CV_ITEMS,
  b: PERSONA_B_CV_ITEMS,
  c: PERSONA_C_CV_ITEMS,
  d: PERSONA_D_CV_ITEMS,
};

const OPPORTUNITIES_BY_PERSONA: Record<PersonaKey, OpportunityItem[]> = {
  a: PERSONA_A_OPPORTUNITIES,
  b: PERSONA_B_OPPORTUNITIES,
  c: PERSONA_C_OPPORTUNITIES,
  d: PERSONA_D_OPPORTUNITIES,
};

const PERSONA_LABELS: Record<PersonaKey, string> = {
  a: 'Elena M. — Operations / Plant Bergamo',
  b: 'Marco T. — Sales / HQ Milano',
  c: 'Sofia R. — Engineering / HQ Milano (remote)',
  d: 'Giovanni B. — HR & People / HQ Milano (senior)',
};

// ── Privacy summary (shared structure, persona-label varies) ──────────────────

const PRIVACY_SUMMARY_TEMPLATE: Omit<PrivacySummary, 'persona_label'> = {
  company_can_see: [
    'KORA Index aziendale aggregato (10 componenti)',
    'Distribuzione pillar per tutta la workforce (aggregato)',
    'Tasso di attivazione per dipartimento (solo gruppi ≥ 10 lavoratori)',
    'Conteggi partecipazione per programma (aggregato, anonimizzato)',
    'Verification rate a livello aziendale',
  ],
  company_cannot_see: [
    'Il tuo PIB individuale (Personal Impact Balance)',
    'La tua timeline personale o storico eventi',
    'Il tuo Dynamic Impact CV',
    'A quali programmi specifici hai aderito',
    'I tuoi dati sanitari, dettagli benessere o note cliniche',
    'Le tue prenotazioni o scelte di consenso',
    'Dati di qualsiasi gruppo con meno di 10 lavoratori',
  ],
  consent_toggles: [
    {
      id: 'ct-aggregate-participation',
      label: 'Contribuisci ai dati aggregati aziendali',
      description: 'I tuoi eventi contano per il KORA Index aziendale (anonimizzato — mai individuale).',
      current_state: 'on', scope: 'aggregate_only', editable_in_preview: false,
    },
    {
      id: 'ct-advisor-review',
      label: 'Consenti review advisor dei tuoi record UEF',
      description: 'Gli advisor esterni possono revisionare i metadati di categoria degli eventi per validare l\'eleggibilità (nessuna identificazione personale).',
      current_state: 'on', scope: 'aggregate_only', editable_in_preview: false,
    },
    {
      id: 'ct-dynamic-cv-export',
      label: 'Esporta Dynamic Impact CV a parti esterne',
      description: 'Condividi i tuoi elementi di impatto verificati con potenziali datori di lavoro o partner (solo su tua iniziativa).',
      current_state: 'off', scope: 'worker_controlled', editable_in_preview: false,
    },
    {
      id: 'ct-collective-initiatives',
      label: 'Partecipa a iniziative collettive cross-company',
      description: 'Il tuo conteggio contributo aggregato può apparire nei report di iniziative collettive (nessun nome o ID).',
      current_state: 'on', scope: 'aggregate_only', editable_in_preview: false,
    },
  ],
  privacy_guarantee:
    'Il datore di lavoro vede solo insight aggregati sopra soglia privacy. ' +
    'Il PIB individuale, la timeline personale e il Dynamic Impact CV restano nel layer personale del lavoratore. ' +
    'KORA misura l\'organizzazione, non sorveglia il lavoratore.',
};

// ── Service class ─────────────────────────────────────────────────────────────

class MyKoraPreviewService {
  // Role guard: WORKER = full access (personal space).
  // KORA_ADMIN = allowed to review demo content (synthetic only, no real worker data).
  // All other roles (COMPANY_ADMIN, COMPANY_VIEWER, PARTNER, ADVISOR): blocked.
  canAccess(role: KoraRole): boolean {
    return isWorkerRole(role) || isAdminRole(role);
  }

  getMyKoraHomePreview(
    workerPersonaId: string,
    scenarioId: ScenarioId,
  ): MyKoraHomePreview | null {
    const key = resolvePersonaKey(workerPersonaId);
    const scenario = (scenarioId === 'S2' || scenarioId === 'S3' || scenarioId === 'S4') ? scenarioId : 'S1';

    const pib = PIB_BY_PERSONA_SCENARIO[key][scenario];
    const rawTimeline = TIMELINE_BY_PERSONA_SCENARIO[key][scenario];
    const opportunities = OPPORTUNITIES_BY_PERSONA[key];

    return {
      persona_label: PERSONA_LABELS[key],
      persona_id: workerPersonaId,
      scenario_id: scenarioId,
      pib_light: pib,
      timeline: enrichTimeline(rawTimeline),
      opportunities,
      synthetic_demo_data: true,
    };
  }

  getPrivacySummary(workerPersonaId: string): PrivacySummary {
    const key = resolvePersonaKey(workerPersonaId);
    return {
      persona_label: PERSONA_LABELS[key],
      ...PRIVACY_SUMMARY_TEMPLATE,
    };
  }

  getDynamicCvPreview(workerPersonaId: string): DynamicCVPreview {
    const key = resolvePersonaKey(workerPersonaId);
    const items = CV_BY_PERSONA[key];
    const verified = items.filter((i) => i.verification_status === 'verified').length;
    return {
      persona_label: PERSONA_LABELS[key],
      items,
      total_items: items.length,
      verified_count: verified,
      disclaimer:
        'Il Dynamic Impact CV non è certificato automaticamente. Lo stato di verifica è per singolo elemento. ' +
        'Solo tu decidi cosa esportare o condividere. ' +
        'Dati sintetici — nessun export reale avviene in Foundation Light.',
      export_available: false,
    };
  }

  getOpportunitiesForPersona(workerPersonaId: string): OpportunityItem[] {
    const key = resolvePersonaKey(workerPersonaId);
    return OPPORTUNITIES_BY_PERSONA[key];
  }
}

export const myKoraPreviewService = new MyKoraPreviewService();
