// lib/partner-activities/catalog.ts
// Partner Activity Catalog — static/in-memory model (PARTNER-ACTIVITY-CATALOG-01).
//
// A Partner Activity is NOT a KORA Space initiative. It represents a
// standard service/product/opportunity offered by an accredited partner —
// classifiable by fiscal/welfare category, mappable to KORA pillars,
// eventually selectable by companies and bookable by workers, and intended
// to feed KORA Index aggregate activation signals in the future.
//
// It never feeds KORA Contribution directly. Contribution is fed only by
// KORA Space initiatives (commons.post -> commons.booking ->
// commons.contribution_event) — see lib/commons/types.ts and
// lib/kora-contribution/contribution-methodology.ts, both untouched by this
// module. An activity may in the future be *packaged into* an initiative,
// but the two remain distinct objects with distinct output pipelines.
//
// Pure static data + pure functions. No DB. No Supabase. No RPC. No env
// access. Inspired by the classification shape of
// data/synthetic/action-taxonomy.json (fiscal perimeter + pillar +
// index/contribution eligibility) without importing or mutating it — that
// file classifies already-uploaded company event data, not partner-offered
// activities, and is left untouched.
//
// Fiscal/welfare category is proposed metadata only — never a legal or tax
// approval. See docs/PARTNER_ACTIVITY_CATALOG_01.md and
// docs/04-fiscal-policy-eligibility-layer.md.

import type { PillarColorKey } from '@/lib/design/kora-design-tokens';

// ── Enums ──────────────────────────────────────────────────────────────────

export type PartnerActivityType =
  | 'course'
  | 'coaching'
  | 'counselling'
  | 'healthcare_prevention'
  | 'sport_wellbeing'
  | 'voucher'
  | 'mobility'
  | 'family_education'
  | 'culture'
  | 'volunteering_service'
  | 'financial_guidance'
  | 'other';

export type FiscalCategory =
  | 'fringe_benefit'
  | 'welfare_aziendale'
  | 'formazione'
  | 'salute_prevenzione'
  | 'sport_benessere'
  | 'famiglia_istruzione'
  | 'mobilita_trasporti'
  | 'cultura_tempo_libero'
  | 'previdenza_assistenza'
  | 'servizi_persona'
  | 'convenzione_commerciale'
  | 'esg_volontariato'
  | 'da_classificare';

export type FiscalReviewStatus =
  | 'proposed_by_partner'
  | 'kora_review'
  | 'company_payroll_review_needed'
  | 'pilot_display_only'
  | 'not_classified';

export type IndexSignalEligibility = 'eligible_preview' | 'needs_review' | 'not_eligible';

// Never a value implying direct Contribution feed — an activity is either
// out of the Contribution pipeline entirely, or only reachable through being
// packaged into a separate KORA Space initiative (a human/editorial act,
// not automatic).
export type ContributionEligibility = 'not_contribution_source' | 'may_be_packaged_into_initiative';

export type DeliveryMode = 'online' | 'onsite' | 'hybrid' | 'voucher' | 'one_to_one' | 'group';

export type AccessMode =
  | 'company_selected'
  | 'worker_free_choice'
  | 'category_enabled'
  | 'pillar_enabled'
  | 'partner_enabled';

export type FutureWorkerAction = 'book' | 'apply' | 'request_contact' | 'redeem_voucher' | 'info_only';

export type EstimatedValueBand = 'low' | 'medium' | 'high' | 'variable';

export type PrivacyMode = 'aggregate_only_until_worker_action' | 'worker_initiated_named_relationship';

export type PartnerActivityStatus =
  | 'draft'
  | 'in_review'
  | 'catalog_ready'
  | 'visible_to_company_preview'
  | 'visible_to_worker_preview'
  | 'paused';

// ── Entity ─────────────────────────────────────────────────────────────────

export interface PartnerActivity {
  activityId: string;
  partnerId: string;
  partnerName: string;
  title: string;
  shortDescription: string;
  activityType: PartnerActivityType;
  fiscalCategory: FiscalCategory;
  fiscalReviewStatus: FiscalReviewStatus;
  primaryPillar: PillarColorKey;
  secondaryPillars: PillarColorKey[];
  indexSignalEligibility: IndexSignalEligibility;
  contributionEligibility: ContributionEligibility;
  deliveryMode: DeliveryMode;
  accessMode: AccessMode;
  futureWorkerAction: FutureWorkerAction;
  estimatedValueBand: EstimatedValueBand;
  privacyMode: PrivacyMode;
  status: PartnerActivityStatus;
}

// ── Display labels (Italian, UI-facing) ─────────────────────────────────────

export const ACTIVITY_TYPE_LABELS: Record<PartnerActivityType, string> = {
  course: 'Corso',
  coaching: 'Coaching',
  counselling: 'Supporto psicologico',
  healthcare_prevention: 'Prevenzione sanitaria',
  sport_wellbeing: 'Sport e benessere',
  voucher: 'Voucher',
  mobility: 'Mobilità',
  family_education: 'Famiglia e istruzione',
  culture: 'Cultura',
  volunteering_service: 'Servizio di volontariato',
  financial_guidance: 'Consulenza finanziaria',
  other: 'Altro',
};

export const FISCAL_CATEGORY_LABELS: Record<FiscalCategory, string> = {
  fringe_benefit: 'Fringe benefit',
  welfare_aziendale: 'Welfare aziendale',
  formazione: 'Formazione',
  salute_prevenzione: 'Salute e prevenzione',
  sport_benessere: 'Sport e benessere',
  famiglia_istruzione: 'Famiglia e istruzione',
  mobilita_trasporti: 'Mobilità e trasporti',
  cultura_tempo_libero: 'Cultura e tempo libero',
  previdenza_assistenza: 'Previdenza e assistenza',
  servizi_persona: 'Servizi alla persona',
  convenzione_commerciale: 'Convenzione commerciale',
  esg_volontariato: 'ESG e volontariato',
  da_classificare: 'Da classificare',
};

export const FISCAL_REVIEW_STATUS_LABELS: Record<FiscalReviewStatus, string> = {
  proposed_by_partner: 'Proposta dal partner',
  kora_review: 'In revisione KORA',
  company_payroll_review_needed: 'Richiede revisione payroll aziendale',
  pilot_display_only: 'Solo visualizzazione pilota',
  not_classified: 'Non classificata',
};

export const INDEX_SIGNAL_ELIGIBILITY_LABELS: Record<IndexSignalEligibility, string> = {
  eligible_preview: 'Eleggibile (anteprima)',
  needs_review: 'Richiede revisione',
  not_eligible: 'Non eleggibile',
};

export const CONTRIBUTION_ELIGIBILITY_LABELS: Record<ContributionEligibility, string> = {
  not_contribution_source: 'Non è fonte di Contribution',
  may_be_packaged_into_initiative: 'Può essere impacchettata in un’iniziativa (atto editoriale separato)',
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  online: 'Online',
  onsite: 'In presenza',
  hybrid: 'Ibrido',
  voucher: 'Voucher',
  one_to_one: 'Individuale',
  group: 'Di gruppo',
};

export const ACCESS_MODE_LABELS: Record<AccessMode, string> = {
  company_selected: 'Selezionata dall’azienda',
  worker_free_choice: 'Scelta libera del worker',
  category_enabled: 'Abilitata per categoria fiscale',
  pillar_enabled: 'Abilitata per pilastro',
  partner_enabled: 'Abilitata per partner',
};

export const FUTURE_WORKER_ACTION_LABELS: Record<FutureWorkerAction, string> = {
  book: 'Prenotazione',
  apply: 'Candidatura',
  request_contact: 'Richiesta di contatto',
  redeem_voucher: 'Riscatto voucher',
  info_only: 'Solo informativo',
};

export const PARTNER_ACTIVITY_STATUS_LABELS: Record<PartnerActivityStatus, string> = {
  draft: 'Bozza',
  in_review: 'In revisione',
  catalog_ready: 'Pronta per il catalogo',
  visible_to_company_preview: 'Visibile in anteprima azienda',
  visible_to_worker_preview: 'Visibile in anteprima worker',
  paused: 'In pausa',
};

// ── Mock catalog — illustrative only, not persisted, not derived from any live source ──

export const MOCK_PARTNER_ACTIVITIES: PartnerActivity[] = [
  {
    activityId: 'activity-001',
    partnerId: 'partner-demo-01',
    partnerName: 'Centro Benessere Aurora',
    title: 'Percorso di prevenzione posturale',
    shortDescription: 'Valutazione posturale e ciclo di sedute individuali presso centro convenzionato.',
    activityType: 'healthcare_prevention',
    fiscalCategory: 'salute_prevenzione',
    fiscalReviewStatus: 'kora_review',
    primaryPillar: 'LIFE',
    secondaryPillars: [],
    indexSignalEligibility: 'eligible_preview',
    contributionEligibility: 'not_contribution_source',
    deliveryMode: 'onsite',
    accessMode: 'category_enabled',
    futureWorkerAction: 'book',
    estimatedValueBand: 'medium',
    privacyMode: 'worker_initiated_named_relationship',
    status: 'visible_to_company_preview',
  },
  {
    activityId: 'activity-002',
    partnerId: 'partner-demo-02',
    partnerName: 'Fluenta Digital Academy',
    title: 'Corso di alfabetizzazione digitale avanzata',
    shortDescription: 'Percorso online autogestito su strumenti digitali per il lavoro ibrido.',
    activityType: 'course',
    fiscalCategory: 'formazione',
    fiscalReviewStatus: 'proposed_by_partner',
    primaryPillar: 'GROWTH',
    secondaryPillars: [],
    indexSignalEligibility: 'needs_review',
    contributionEligibility: 'not_contribution_source',
    deliveryMode: 'online',
    accessMode: 'worker_free_choice',
    futureWorkerAction: 'apply',
    estimatedValueBand: 'low',
    privacyMode: 'worker_initiated_named_relationship',
    status: 'in_review',
  },
  {
    activityId: 'activity-003',
    partnerId: 'partner-demo-01',
    partnerName: 'Centro Benessere Aurora',
    title: 'Consulenza nutrizionale individuale',
    shortDescription: 'Sessione di consulenza nutrizionale one-to-one presso il centro convenzionato.',
    activityType: 'counselling',
    fiscalCategory: 'welfare_aziendale',
    fiscalReviewStatus: 'company_payroll_review_needed',
    primaryPillar: 'LIFE',
    secondaryPillars: ['CONNECTION'],
    indexSignalEligibility: 'needs_review',
    contributionEligibility: 'not_contribution_source',
    deliveryMode: 'one_to_one',
    accessMode: 'company_selected',
    futureWorkerAction: 'book',
    estimatedValueBand: 'medium',
    privacyMode: 'worker_initiated_named_relationship',
    status: 'draft',
  },
  {
    activityId: 'activity-004',
    partnerId: 'partner-demo-03',
    partnerName: 'MobilitaSmart',
    title: 'Voucher mobilità sostenibile',
    shortDescription: 'Voucher mensile per abbonamento trasporto pubblico o bike sharing.',
    activityType: 'voucher',
    fiscalCategory: 'mobilita_trasporti',
    fiscalReviewStatus: 'kora_review',
    primaryPillar: 'IMPACT',
    secondaryPillars: ['LIFE'],
    indexSignalEligibility: 'eligible_preview',
    contributionEligibility: 'not_contribution_source',
    deliveryMode: 'voucher',
    accessMode: 'pillar_enabled',
    futureWorkerAction: 'redeem_voucher',
    estimatedValueBand: 'low',
    privacyMode: 'aggregate_only_until_worker_action',
    status: 'visible_to_worker_preview',
  },
  {
    activityId: 'activity-005',
    partnerId: 'partner-demo-04',
    partnerName: 'Fondazione Radici',
    title: 'Programma di volontariato territoriale',
    shortDescription: 'Giornate di volontariato organizzate con associazioni locali accreditate.',
    activityType: 'volunteering_service',
    fiscalCategory: 'esg_volontariato',
    fiscalReviewStatus: 'pilot_display_only',
    primaryPillar: 'IMPACT',
    secondaryPillars: ['CONNECTION', 'LEGACY'],
    indexSignalEligibility: 'not_eligible',
    contributionEligibility: 'may_be_packaged_into_initiative',
    deliveryMode: 'group',
    accessMode: 'partner_enabled',
    futureWorkerAction: 'apply',
    estimatedValueBand: 'variable',
    privacyMode: 'worker_initiated_named_relationship',
    status: 'catalog_ready',
  },
  {
    activityId: 'activity-006',
    partnerId: 'partner-demo-05',
    partnerName: 'Studio Legale e Finanziario Meridiana',
    title: 'Sportello di orientamento finanziario personale',
    shortDescription: 'Consulenza informativa su pianificazione finanziaria e previdenza complementare.',
    activityType: 'financial_guidance',
    fiscalCategory: 'previdenza_assistenza',
    fiscalReviewStatus: 'not_classified',
    primaryPillar: 'LIFE',
    secondaryPillars: ['GROWTH'],
    indexSignalEligibility: 'needs_review',
    contributionEligibility: 'not_contribution_source',
    deliveryMode: 'hybrid',
    accessMode: 'company_selected',
    futureWorkerAction: 'request_contact',
    estimatedValueBand: 'low',
    privacyMode: 'worker_initiated_named_relationship',
    status: 'draft',
  },
  {
    activityId: 'activity-007',
    partnerId: 'partner-demo-06',
    partnerName: 'Nido Girasole',
    title: 'Convenzione asilo nido aziendale',
    shortDescription: 'Tariffa convenzionata per iscrizione asilo nido per figli dei dipendenti.',
    activityType: 'family_education',
    fiscalCategory: 'famiglia_istruzione',
    fiscalReviewStatus: 'kora_review',
    primaryPillar: 'LIFE',
    secondaryPillars: ['GROWTH'],
    indexSignalEligibility: 'eligible_preview',
    contributionEligibility: 'not_contribution_source',
    deliveryMode: 'onsite',
    accessMode: 'category_enabled',
    futureWorkerAction: 'apply',
    estimatedValueBand: 'high',
    privacyMode: 'worker_initiated_named_relationship',
    status: 'visible_to_company_preview',
  },
  {
    activityId: 'activity-008',
    partnerId: 'partner-demo-07',
    partnerName: 'Atelier Cultura Viva',
    title: 'Abbonamento eventi culturali convenzionati',
    shortDescription: 'Ingresso scontato a musei, teatri e rassegne culturali della rete convenzionata.',
    activityType: 'culture',
    fiscalCategory: 'cultura_tempo_libero',
    fiscalReviewStatus: 'proposed_by_partner',
    primaryPillar: 'CONNECTION',
    secondaryPillars: ['LEGACY'],
    indexSignalEligibility: 'needs_review',
    contributionEligibility: 'not_contribution_source',
    deliveryMode: 'voucher',
    accessMode: 'worker_free_choice',
    futureWorkerAction: 'redeem_voucher',
    estimatedValueBand: 'low',
    privacyMode: 'aggregate_only_until_worker_action',
    status: 'in_review',
  },
];

// ── Pure accessors ────────────────────────────────────────────────────────

export function getPartnerActivities(): PartnerActivity[] {
  return MOCK_PARTNER_ACTIVITIES;
}

export function getPartnerActivityById(activityId: string): PartnerActivity | undefined {
  return MOCK_PARTNER_ACTIVITIES.find((a) => a.activityId === activityId);
}

export function getActivitiesByFiscalCategory(category: FiscalCategory): PartnerActivity[] {
  return MOCK_PARTNER_ACTIVITIES.filter((a) => a.fiscalCategory === category);
}

export function getActivitiesByPillar(pillar: PillarColorKey): PartnerActivity[] {
  return MOCK_PARTNER_ACTIVITIES.filter(
    (a) => a.primaryPillar === pillar || a.secondaryPillars.includes(pillar),
  );
}

export function getActivitiesByFutureWorkerAction(action: FutureWorkerAction): PartnerActivity[] {
  return MOCK_PARTNER_ACTIVITIES.filter((a) => a.futureWorkerAction === action);
}

export function getActivitiesByFiscalReviewStatus(status: FiscalReviewStatus): PartnerActivity[] {
  return MOCK_PARTNER_ACTIVITIES.filter((a) => a.fiscalReviewStatus === status);
}

// ── Aggregate summary — derived, not hardcoded ──────────────────────────────

export interface PartnerActivityCatalogSummary {
  totalActivities: number;
  byFiscalCategory: Record<string, number>;
  byPillar: Record<string, number>;
  readyForCompanyPreview: number;
  needingFiscalReview: number;
  indexEligiblePreview: number;
}

export function getPartnerActivityCatalogSummary(): PartnerActivityCatalogSummary {
  const activities = getPartnerActivities();

  const byFiscalCategory: Record<string, number> = {};
  const byPillar: Record<string, number> = {};

  for (const a of activities) {
    byFiscalCategory[a.fiscalCategory] = (byFiscalCategory[a.fiscalCategory] ?? 0) + 1;
    byPillar[a.primaryPillar] = (byPillar[a.primaryPillar] ?? 0) + 1;
    for (const p of a.secondaryPillars) {
      byPillar[p] = (byPillar[p] ?? 0) + 1;
    }
  }

  return {
    totalActivities: activities.length,
    byFiscalCategory,
    byPillar,
    readyForCompanyPreview: activities.filter((a) => a.status === 'visible_to_company_preview').length,
    needingFiscalReview: activities.filter(
      (a) => a.fiscalReviewStatus === 'company_payroll_review_needed' || a.fiscalReviewStatus === 'not_classified',
    ).length,
    indexEligiblePreview: activities.filter((a) => a.indexSignalEligibility === 'eligible_preview').length,
  };
}
