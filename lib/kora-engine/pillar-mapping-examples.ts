// lib/kora-engine/pillar-mapping-examples.ts
// 35 reference examples for the Pillar Mapping Engine v0.1 + Care Economy Layer v0.1.
// Covers all 5 pillars, blocked/limited records, and ambiguous/review-required cases.
// Use with runPillarMappingExamples() for automated verification.
// No test framework required — usable in browser, server, or future test runner.

import type {
  RawUploadedRecord,
  EligibilityResult,
  EligibilityStatus,
  PillarMappingResult,
  CareEconomySignal,
  Pillar,
} from './types';
import { classifyEligibility } from './eligibility-gate';
import { mapPillar } from './pillar-mapping';
import { mapCareEconomySignal } from './care-economy-mapping';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PillarMappingExample {
  id: string;
  title: string;
  description: string;
  inputRecord: RawUploadedRecord;
  expectedEligibilityStatus: EligibilityStatus;
  expectedPrimaryPillar: Pillar | null;
  expectedSecondaryPillars: Pillar[];
  // Subset check: every tag listed here must appear in detectedCareTags.
  // If the signal is null (blocked, no care signal), use [].
  expectedCareTags: string[];
  expectedConfidenceBand: { min: number; max: number };
  expectedReviewRequired: boolean;
  expectedRationaleContains: string[];
  doctrineNote: string;
}

export interface PillarMappingExampleResult {
  id: string;
  title: string;
  passed: boolean;
  eligibilityStatusMatch: boolean;
  primaryPillarMatch: boolean;
  secondaryPillarsMatch: boolean;
  careTagsMatch: boolean;
  confidenceInBand: boolean;
  reviewRequiredMatch: boolean;
  rationaleMatch: boolean;
  expectedEligibilityStatus: EligibilityStatus;
  actualEligibilityStatus: EligibilityStatus;
  expectedPrimaryPillar: Pillar | null;
  actualPrimaryPillar: Pillar | null;
  expectedCareTags: string[];
  actualCareTags: string[];
  actualConfidence: number;
  expectedConfidenceBand: { min: number; max: number };
  failureReason: string | null;
  fullEligibilityResult: EligibilityResult;
  fullPillarMapping: PillarMappingResult;
  fullCareSignal: CareEconomySignal | null;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function makeRaw(
  id: string,
  rowIndex: number,
  raw: Record<string, unknown>,
  detectedRecordType: RawUploadedRecord['detectedRecordType'] = 'welfare_program',
): RawUploadedRecord {
  return { recordId: id, batchId: 'pm_examples_batch_v01', raw, rowIndex, detectedRecordType };
}

// ── LIFE examples (1–7) ───────────────────────────────────────────────────────

const EXAMPLE_01: PillarMappingExample = {
  id: 'life_01_asilo_nido',
  title: 'Asilo Nido Aziendale',
  description: 'Servizio childcare aziendale con contributo nido. Care tag: childcare + asilo_nido.',
  inputRecord: makeRaw('pm-life-01', 0, {
    'Nome Iniziativa': 'Nido Aziendale TechCorp',
    'Categoria': 'childcare',
    'Descrizione': 'Asilo nido aziendale con contributo mensile per bambini 0-3 anni',
    'Fornitore': 'Kindercare Partner',
    'Tipo Evidenza': 'welfare_provider_export',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  expectedCareTags: ['childcare', 'asilo_nido'],
  expectedConfidenceBand: { min: 0.60, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LIFE'],
  doctrineNote: 'Asilo nido = LIFE pillar. Volontario/addizionale. Care tags: childcare + asilo_nido. Record di infrastruttura organizzativa aggregata — nessun dato individuale.',
};

const EXAMPLE_02: PillarMappingExample = {
  id: 'life_02_caregiver_support',
  title: 'Programma Supporto Caregiver',
  description: 'Supporto caregiver per dipendenti con carichi di cura familiari.',
  inputRecord: makeRaw('pm-life-02', 1, {
    'Nome Iniziativa': 'Programma Supporto Caregiver',
    'Categoria': 'caregiver',
    'Descrizione': 'Supporto caregiver per dipendenti con carichi di cura — programma welfare volontario aggiuntivo',
    'Tipo Evidenza': 'welfare_provider_export',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  expectedCareTags: ['caregiver_support'],
  expectedConfidenceBand: { min: 0.60, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LIFE'],
  doctrineNote: 'Caregiver support = LIFE pillar. Segnali: caregiver, supporto caregiver. Care tag: caregiver_support. Non profila individui — segnale di servizio aggregato.',
};

const EXAMPLE_03: PillarMappingExample = {
  id: 'life_03_eldercare',
  title: 'Eldercare Aziendale',
  description: 'Servizi di cura anziani per dipendenti con familiari non autosufficienti.',
  inputRecord: makeRaw('pm-life-03', 2, {
    'Nome Iniziativa': 'Eldercare Aziendale',
    'Categoria': 'cura anziani',
    'Descrizione': 'Servizio eldercare e assistenza anziani — supporto per lavoratori con familiari anziani',
    'Tipo Evidenza': 'welfare_provider_export',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  expectedCareTags: ['eldercare'],
  expectedConfidenceBand: { min: 0.60, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LIFE'],
  doctrineNote: 'Eldercare = LIFE pillar. Segnali: eldercare, cura anziani, assistenza anziani. Care tag: eldercare. Misura infrastruttura organizzativa.',
};

const EXAMPLE_04: PillarMappingExample = {
  id: 'life_04_mental_health_infra',
  title: 'Mental Health Platform Aziendale',
  description: 'Piattaforma mental health come infrastruttura organizzativa — aggregata, mai individuale.',
  inputRecord: makeRaw('pm-life-04', 3, {
    'Nome Iniziativa': 'Mental Health Platform Aziendale',
    'Categoria': 'benessere psicologico',
    'Descrizione': 'Piattaforma mental health service — psicologia aziendale e salute mentale per tutta la forza lavoro',
    'Tipo Evidenza': 'welfare_provider_export',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  // Mental health infra does not trigger Care Economy care tags — signal is null.
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.60, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LIFE'],
  doctrineNote: 'Mental health platform = LIFE pillar (livello infrastruttura di servizio). Care Economy: null — nessun care tag specifico. KORA non misura salute mentale individuale.',
};

const EXAMPLE_05: PillarMappingExample = {
  id: 'life_05_right_to_disconnect',
  title: 'Diritto alla Disconnessione Policy Formale',
  description: 'Policy formale su diritto alla disconnessione, oltre il minimo contrattuale.',
  inputRecord: makeRaw('pm-life-05', 4, {
    'Nome Iniziativa': 'Diritto alla Disconnessione Policy Formale',
    'Categoria': 'policy formale',
    'Descrizione': 'Policy aziendale formale sul diritto alla disconnessione — work-life balance oltre il minimo contrattuale',
  }, 'structural_policy'),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  expectedCareTags: ['work_life_balance'],
  expectedConfidenceBand: { min: 0.58, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LIFE'],
  doctrineNote: 'Diritto alla disconnessione come policy formale = LIFE pillar. Care tag work_life_balance rilevato da segnale "work-life balance" nel testo.',
};

const EXAMPLE_06: PillarMappingExample = {
  id: 'life_06_no_meeting_friday',
  title: 'No Meeting Friday',
  description: 'Policy no riunioni venerdì — benessere volontario e focalizzazione.',
  inputRecord: makeRaw('pm-life-06', 5, {
    'Nome Iniziativa': 'No Meeting Friday',
    'Categoria': 'policy benessere',
    'Descrizione': 'Politica aziendale no riunioni venerdi — benessere volontario e concentrazione per tutta la forza lavoro',
  }, 'structural_policy'),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.58, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LIFE'],
  doctrineNote: 'No Meeting Friday = LIFE pillar. Segnali: no meeting friday, no riunioni venerdi, benessere volontario. Nessun care tag — benessere non specifico a cura.',
};

const EXAMPLE_07: PillarMappingExample = {
  id: 'life_07_smart_working_cura',
  title: 'Smart Working Cura Familiare',
  description: 'Smart working con contesto esplicito di cura — smart working care boost applicato.',
  inputRecord: makeRaw('pm-life-07', 6, {
    'Nome Iniziativa': 'Smart Working Cura Familiare',
    'Categoria': 'lavoro flessibile',
    'Descrizione': 'Smart working flessibile per dipendenti con esigenze di cura — caregiver e childcare support',
  }, 'structural_policy'),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  expectedCareTags: ['childcare', 'caregiver_support', 'flexible_work_for_care'],
  expectedConfidenceBand: { min: 0.52, max: 0.90 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LIFE'],
  doctrineNote: 'Smart working con contesto cura = LIFE (care boost). Care tags: childcare, caregiver_support, flexible_work_for_care (segnale "smart working cura" nel nome).',
};

// ── GROWTH examples (8–12) ────────────────────────────────────────────────────

const EXAMPLE_08: PillarMappingExample = {
  id: 'growth_08_ai_upskilling',
  title: 'AI Skills Program — Upskilling',
  description: 'Programma upskilling AI e digital skills, volontario, con LMS export.',
  inputRecord: makeRaw('pm-growth-08', 7, {
    'Nome Iniziativa': 'AI Skills Program — Upskilling Intelligenza Artificiale',
    'Categoria': 'digital skills',
    'Descrizione': 'Programma upskilling AI skills per sviluppatori — competenze digitali e future skills',
    'Tipo Evidenza': 'lms_export',
  }, 'training'),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'GROWTH',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro GROWTH'],
  doctrineNote: 'AI Skills + upskilling = GROWTH pillar. Segnali: upskilling, ai skills, digital skills, competenze digitali, future skills. Nessun care tag.',
};

const EXAMPLE_09: PillarMappingExample = {
  id: 'growth_09_reskilling_academy',
  title: 'Reskilling Academy Digitale',
  description: 'Corporate academy di reskilling con percorso di transizione e competenze future.',
  inputRecord: makeRaw('pm-growth-09', 8, {
    'Nome Iniziativa': 'Reskilling Academy Digitale',
    'Categoria': 'academy aziendale',
    'Descrizione': 'Corporate academy di reskilling — percorso di transizione e competenze future per nuovi ruoli',
    'Tipo Evidenza': 'lms_export',
  }, 'training'),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'GROWTH',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro GROWTH'],
  doctrineNote: 'Reskilling academy = GROWTH pillar. Segnali: reskilling, academy aziendale, corporate academy, percorso di transizione, competenze future.',
};

const EXAMPLE_10: PillarMappingExample = {
  id: 'growth_10_digital_certification',
  title: 'Certificazione Competenze Digitali',
  description: 'Percorso di certificazione volontaria digital skills — non obbligatorio.',
  inputRecord: makeRaw('pm-growth-10', 9, {
    'Nome Iniziativa': 'Certificazione Competenze Digitali',
    'Categoria': 'certificazione professionale',
    'Descrizione': 'Percorso di certificazione volontaria digital skills — certificazioni non obbligatorie per competenze digitali',
    'Tipo Evidenza': 'lms_export',
  }, 'training'),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'GROWTH',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro GROWTH'],
  doctrineNote: 'Certificazione digital skills = GROWTH pillar. Segnali: digital skills, competenze digitali, certificazione professionale, certificazioni non obbligatorie, certificazione volontaria.',
};

const EXAMPLE_11: PillarMappingExample = {
  id: 'growth_11_professional_coaching',
  title: 'Business Coaching Professionale',
  description: 'Coaching professionale disambiguato via tie-breaking: isProfessional → GROWTH + CONNECTION.',
  inputRecord: makeRaw('pm-growth-11', 10, {
    'Nome Iniziativa': 'Business Coaching Professionale',
    'Categoria': 'coaching professionale',
    'Descrizione': 'Coaching professionale e formazione professionalizzante per sviluppo career e leadership aziendale',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'GROWTH',
  expectedSecondaryPillars: ['CONNECTION'],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro GROWTH'],
  doctrineNote: 'Business coaching = GROWTH (via mentoring/coaching tie-break: isProfessional=true, isPeer=false). Secondary: CONNECTION. Formazione professionalizzante garantisce eligibility.',
};

const EXAMPLE_12: PillarMappingExample = {
  id: 'growth_12_transition_pathway',
  title: 'Percorso di Transizione di Carriera',
  description: 'Transition pathway strutturato per reskilling e career transition.',
  inputRecord: makeRaw('pm-growth-12', 11, {
    'Nome Iniziativa': 'Percorso di Transizione di Carriera',
    'Categoria': 'career transition',
    'Descrizione': 'Transition pathway strutturato per reskilling e career transition verso nuovi ruoli digitali',
    'Tipo Evidenza': 'internal_budget_report',
  }, 'training'),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'GROWTH',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.60, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro GROWTH'],
  doctrineNote: 'Transition pathway = GROWTH pillar. Segnali: reskilling, transition pathway, percorso di transizione, career transition, transizione di carriera.',
};

// ── CONNECTION examples (13–16) ───────────────────────────────────────────────

const EXAMPLE_13: PillarMappingExample = {
  id: 'connection_13_peer_mentoring',
  title: 'Peer Mentoring Program',
  description: 'Peer mentoring disambiguato: isPeer → CONNECTION.',
  inputRecord: makeRaw('pm-connection-13', 12, {
    'Nome Iniziativa': 'Peer Mentoring Program',
    'Categoria': 'peer support',
    'Descrizione': 'Programma peer mentoring — supporto reciproco e buddy per onboarding nuovi assunti',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'CONNECTION',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.60, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro CONNECTION'],
  doctrineNote: 'Peer mentoring = CONNECTION (via tie-break: isPeer=true, isProfessional=false). Segnali: peer mentoring, peer support, buddy, supporto reciproco.',
};

const EXAMPLE_14: PillarMappingExample = {
  id: 'connection_14_inclusion_community',
  title: 'Programma Inclusione e Diversità',
  description: 'Employee resource group e community interna per diversità e inclusione.',
  inputRecord: makeRaw('pm-connection-14', 13, {
    'Nome Iniziativa': 'Programma Inclusione e Diversita',
    'Categoria': 'inclusion program',
    'Descrizione': 'Employee resource group aziendale per diversita e inclusione — community interna e networking interno',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'CONNECTION',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro CONNECTION'],
  doctrineNote: 'Inclusion program = CONNECTION pillar. Segnali: inclusion program, programma inclusione, diversita e inclusione, community interna, employee resource group, networking interno.',
};

const EXAMPLE_15: PillarMappingExample = {
  id: 'connection_15_buddy_onboarding',
  title: 'Buddy Program Onboarding',
  description: 'Programma buddy di inserimento per nuovi assunti.',
  inputRecord: makeRaw('pm-connection-15', 14, {
    'Nome Iniziativa': 'Buddy Program Onboarding',
    'Categoria': 'onboarding buddy',
    'Descrizione': 'Programma buddy di onboarding — supporto peer per nuovi assunti durante il percorso di inserimento',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'CONNECTION',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.60, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro CONNECTION'],
  doctrineNote: 'Buddy program onboarding = CONNECTION pillar. Segnali: buddy program, buddy, onboarding buddy.',
};

const EXAMPLE_16: PillarMappingExample = {
  id: 'connection_16_team_cohesion',
  title: 'Iniziativa Coesione Team',
  description: 'Programma team cohesion e social cohesion con collaborazione interfunzionale.',
  inputRecord: makeRaw('pm-connection-16', 15, {
    'Nome Iniziativa': 'Iniziativa Coesione Team',
    'Categoria': 'team cohesion',
    'Descrizione': 'Programma di team cohesion e social cohesion — collaborazione interfunzionale e cross-functional team',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'CONNECTION',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.60, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro CONNECTION'],
  doctrineNote: 'Team cohesion = CONNECTION pillar. Segnali: team cohesion, coesione team, social cohesion, collaborazione interfunzionale, cross-functional.',
};

// ── IMPACT examples (17–21) ───────────────────────────────────────────────────

const EXAMPLE_17: PillarMappingExample = {
  id: 'impact_17_volunteering_day',
  title: 'Giornata di Volontariato Aziendale',
  description: 'Volontariato aziendale con ore dono e progetto sociale territoriale.',
  inputRecord: makeRaw('pm-impact-17', 16, {
    'Nome Iniziativa': 'Giornata di Volontariato Aziendale',
    'Categoria': 'volontariato aziendale',
    'Descrizione': 'Volontariato aziendale — ore dono per progetto sociale e impatto sociale territoriale',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'IMPACT',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro IMPACT'],
  doctrineNote: 'Volontariato aziendale = IMPACT pillar. Segnali: volontariato, volontariato aziendale, ore dono, progetto sociale, impatto sociale.',
};

const EXAMPLE_18: PillarMappingExample = {
  id: 'impact_18_school_partnership',
  title: 'Alternanza Scuola-Lavoro',
  description: 'Programma scuola-lavoro con partnership sociale e progetto territoriale.',
  inputRecord: makeRaw('pm-impact-18', 17, {
    'Nome Iniziativa': 'Alternanza Scuola-Lavoro',
    'Categoria': 'partnership sociale',
    'Descrizione': 'Programma scuola-lavoro — alternanza scuola per studenti con progetto territoriale aziendale',
  }, 'training'),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'IMPACT',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro IMPACT'],
  doctrineNote: 'Alternanza scuola-lavoro = IMPACT pillar. Segnali: scuola-lavoro, alternanza scuola, partnership sociale, progetto territoriale.',
};

const EXAMPLE_19: PillarMappingExample = {
  id: 'impact_19_community_project',
  title: 'Progetto Sociale Comunitario',
  description: 'Community project per supporto alla comunità locale.',
  inputRecord: makeRaw('pm-impact-19', 18, {
    'Nome Iniziativa': 'Progetto Sociale Comunitario',
    'Categoria': 'community project',
    'Descrizione': 'Community project per supporto alla comunita locale — impatto sociale e progetto territoriale',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'IMPACT',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro IMPACT'],
  doctrineNote: 'Community project = IMPACT pillar. Segnali: community project, progetto sociale, comunita locale, impatto sociale, progetto territoriale.',
};

const EXAMPLE_20: PillarMappingExample = {
  id: 'impact_20_environmental_volunteering',
  title: 'Volontariato Ambientale Aziendale',
  description: 'Environmental volunteering per progetto green territoriale.',
  inputRecord: makeRaw('pm-impact-20', 19, {
    'Nome Iniziativa': 'Volontariato Ambientale Aziendale',
    'Categoria': 'environmental volunteering',
    'Descrizione': 'Environmental volunteering — volontariato ambientale per progetto green territoriale',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'IMPACT',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro IMPACT'],
  doctrineNote: 'Environmental volunteering = IMPACT pillar. Segnali: environmental volunteering, volontariato ambientale, volontariato, progetto territoriale.',
};

const EXAMPLE_21: PillarMappingExample = {
  id: 'impact_21_cross_company_territorial',
  title: 'Iniziativa Cross-Aziendale Territoriale',
  description: 'Cross-company initiative per impatto territoriale e comunità locale.',
  inputRecord: makeRaw('pm-impact-21', 20, {
    'Nome Iniziativa': 'Iniziativa Cross-Aziendale Territoriale',
    'Categoria': 'iniziativa territoriale',
    'Descrizione': 'Cross-company initiative — iniziativa cross-aziendale per impatto territoriale e comunita locale',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'IMPACT',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.60, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro IMPACT'],
  doctrineNote: 'Cross-company territorial = IMPACT pillar. Segnali: iniziativa territoriale, cross-company initiative, iniziativa cross-aziendale, comunita locale.',
};

// ── LEGACY examples (22–25) ───────────────────────────────────────────────────

const EXAMPLE_22: PillarMappingExample = {
  id: 'legacy_22_pension_education',
  title: 'Pensione Integrativa e Previdenza Complementare',
  description: 'Educazione finanziaria e pianificazione per pensione integrativa.',
  inputRecord: makeRaw('pm-legacy-22', 21, {
    'Nome Iniziativa': 'Pensione Integrativa e Previdenza Complementare',
    'Categoria': 'fondo pensione',
    'Descrizione': 'Educazione finanziaria e pianificazione finanziaria — pensione integrativa e previdenza complementare per dipendenti',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LEGACY',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LEGACY'],
  doctrineNote: 'Pensione integrativa = LEGACY pillar. Segnali: pensione integrativa, previdenza complementare, fondo pensione, educazione finanziaria, pianificazione finanziaria.',
};

const EXAMPLE_23: PillarMappingExample = {
  id: 'legacy_23_knowledge_transfer',
  title: 'Programma Knowledge Transfer',
  description: 'Knowledge transfer strutturato con trasferimento know-how e continuità futura.',
  inputRecord: makeRaw('pm-legacy-23', 22, {
    'Nome Iniziativa': 'Programma Knowledge Transfer',
    'Categoria': 'trasferimento competenze',
    'Descrizione': 'Knowledge transfer strutturato — trasferimento know-how e trasferimento competenze per continuita futura',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LEGACY',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LEGACY'],
  doctrineNote: 'Knowledge transfer = LEGACY pillar. Segnali: knowledge transfer, trasferimento competenze, trasferimento know-how, continuita futura.',
};

const EXAMPLE_24: PillarMappingExample = {
  id: 'legacy_24_senior_junior_mentoring',
  title: 'Senior Junior Mentoring Generazionale',
  description: 'Mentoring generazionale disambiguato: isGenerational → LEGACY + CONNECTION.',
  inputRecord: makeRaw('pm-legacy-24', 23, {
    'Nome Iniziativa': 'Senior Junior Mentoring Generazionale',
    'Categoria': 'mentoring generazionale',
    'Descrizione': 'Passaggio generazionale — senior junior mentoring per trasferimento know-how e legacy program',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LEGACY',
  expectedSecondaryPillars: ['CONNECTION'],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LEGACY'],
  doctrineNote: 'Senior-junior mentoring = LEGACY (via tie-break: isGenerational=true). Secondary: CONNECTION. Segnali generazionali: senior, junior, generazionale, passaggio, know-how, trasferimento.',
};

const EXAMPLE_25: PillarMappingExample = {
  id: 'legacy_25_long_term_resilience',
  title: 'Programma Resilienza a Lungo Termine',
  description: 'Long-term resilience e transizione generazionale per continuità futura.',
  inputRecord: makeRaw('pm-legacy-25', 24, {
    'Nome Iniziativa': 'Programma Resilienza a Lungo Termine',
    'Categoria': 'long-term resilience',
    'Descrizione': 'Long-term resilience e resilienza a lungo termine — legacy program per continuita futura e transizione generazionale',
  }),
  expectedEligibilityStatus: 'eligible',
  expectedPrimaryPillar: 'LEGACY',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.62, max: 0.92 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['pilastro LEGACY'],
  doctrineNote: 'Long-term resilience = LEGACY pillar. Segnali: resilienza a lungo termine, long-term resilience, legacy program, continuita futura, transizione generazionale.',
};

// ── Blocked / Limited examples (26–30) ───────────────────────────────────────

const EXAMPLE_26: PillarMappingExample = {
  id: 'blocked_26_dpi_plant_bergamo',
  title: 'DPI Plant Bergamo',
  description: 'Dispositivi di Protezione Individuale — blocked: mandatory + categoria sicurezza.',
  inputRecord: makeRaw('pm-blocked-26', 25, {
    'Nome Iniziativa': 'DPI Plant Bergamo',
    'Categoria': 'sicurezza',
    'Obbligatorio': 'si',
    'Sede': 'Plant Bergamo',
  }),
  expectedEligibilityStatus: 'blocked',
  expectedPrimaryPillar: null,
  expectedSecondaryPillars: [],
  // mapCareEconomySignal returns null for blocked — no care tags.
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.52, max: 0.85 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['compliance legale obbligatoria'],
  doctrineNote: 'DPI = compliance legale obbligatoria (D.Lgs 81). Blocked via mandatory=true + categoria sicurezza. No IU, no PIB, no KORA Index contribution. Care Economy: null.',
};

const EXAMPLE_27: PillarMappingExample = {
  id: 'blocked_27_mandatory_safety_training',
  title: 'Corso Sicurezza Obbligatorio D.Lgs 81',
  description: 'Formazione sicurezza obbligatoria per legge — keyword esplicita D.Lgs 81.',
  inputRecord: makeRaw('pm-blocked-27', 26, {
    'Nome Iniziativa': 'Corso Sicurezza Obbligatorio D.Lgs 81',
    'Categoria': 'sicurezza obbligatoria',
    'Obbligatorio': 'si',
    'Tipo Evidenza': 'internal_budget_report',
  }, 'training'),
  expectedEligibilityStatus: 'blocked',
  expectedPrimaryPillar: null,
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.70, max: 0.97 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['compliance legale obbligatoria'],
  doctrineNote: 'D.Lgs 81 = compliance legale esplicita. Alta confidence perché keyword diretta nel nome. Non confondere con sicurezza volontaria aggiuntiva (che può essere eligible).',
};

const EXAMPLE_28: PillarMappingExample = {
  id: 'limited_28_meal_vouchers',
  title: 'Buoni Pasto Mensili',
  description: 'Buoni pasto ticket restaurant — limited: sollievo economico, no IU.',
  inputRecord: makeRaw('pm-limited-28', 27, {
    'Nome Iniziativa': 'Buoni Pasto Mensili',
    'Categoria': 'benefit monetario',
    'Descrizione': 'Buoni pasto ticket restaurant per tutti i dipendenti — erogazione mensile',
  }),
  expectedEligibilityStatus: 'limited',
  // Limited with no pillar keyword match → contextPillar defaults to LIFE.
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.35, max: 0.62 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['economic relief'],
  doctrineNote: 'Buoni pasto = limited (sollievo economico). No IU generati. Pillar LIFE per default (nessun segnale keyword specifico). Tracciato in BTI come economic_relief_spend.',
};

const EXAMPLE_29: PillarMappingExample = {
  id: 'limited_29_gift_card',
  title: 'Gift Card Natale Dipendenti',
  description: 'Gift card natale — limited: benefit cash-like, no contributo attivazione.',
  inputRecord: makeRaw('pm-limited-29', 28, {
    'Nome Iniziativa': 'Gift Card Natale Dipendenti',
    'Categoria': 'welfare benefit',
    'Descrizione': 'Gift card natale per tutti i dipendenti — carta regalo 50 euro erogazione annuale',
  }),
  expectedEligibilityStatus: 'limited',
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.35, max: 0.62 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['economic relief'],
  doctrineNote: 'Gift card / carta regalo = limited. Benefit cash-like senza profondità di attivazione. Tracked come economic_relief_spend nel BTI.',
};

const EXAMPLE_30: PillarMappingExample = {
  id: 'limited_30_generic_voucher',
  title: 'Voucher Generalista Welfare',
  description: 'Voucher generico acquisti — limited: flexible benefit monetario.',
  inputRecord: makeRaw('pm-limited-30', 29, {
    'Nome Iniziativa': 'Voucher Generalista Welfare',
    'Categoria': 'flexible benefit',
    'Descrizione': 'Voucher generico acquisti — flexible benefit monetario per tutti i dipendenti',
  }),
  expectedEligibilityStatus: 'limited',
  expectedPrimaryPillar: 'LIFE',
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.35, max: 0.62 },
  expectedReviewRequired: false,
  expectedRationaleContains: ['economic relief'],
  doctrineNote: 'Voucher generalista / flexible benefit monetario = limited. Rimosso da IU e contribution. Tracciato in BTI come economic_relief_spend.',
};

// ── Ambiguous examples (31–35) ────────────────────────────────────────────────

const EXAMPLE_31: PillarMappingExample = {
  id: 'ambiguous_31_welfare_famiglia_generico',
  title: 'Welfare Famiglia Generico',
  description: 'Voce welfare famiglia senza dettaglio — review_required. Care tag rilevato ma pillar non classificabile.',
  inputRecord: makeRaw('pm-ambiguous-31', 30, {
    'Nome Iniziativa': 'Welfare Famiglia Generico',
    'Categoria': 'welfare',
    'Descrizione': 'Benefit welfare famiglia — supporto generico senza dettaglio di categoria o tipologia di servizio',
  }),
  expectedEligibilityStatus: 'review_required',
  // No pillar keyword match → null primary.
  expectedPrimaryPillar: null,
  expectedSecondaryPillars: [],
  // "welfare famiglia" triggers family_support care tag even without a clear primary pillar.
  expectedCareTags: ['family_support'],
  expectedConfidenceBand: { min: 0.20, max: 0.52 },
  expectedReviewRequired: true,
  expectedRationaleContains: ['insufficienti'],
  doctrineNote: '"Welfare famiglia" troppo generico per classificazione automatica. Care tag family_support rilevato ma pillar null. Revisione umana necessaria per distinguere da limited.',
};

const EXAMPLE_32: PillarMappingExample = {
  id: 'ambiguous_32_formazione_generica',
  title: 'Formazione Aziendale Generica',
  description: 'Voce formazione senza dettaglio tipologia — review_required, nessun pillar assegnabile.',
  inputRecord: makeRaw('pm-ambiguous-32', 31, {
    'Nome Iniziativa': 'Formazione Aziendale',
    'Categoria': 'formazione',
    'Descrizione': 'Attivita formativa annuale — nessun dettaglio su tipologia obbligatorio o volontario',
  }, 'training'),
  expectedEligibilityStatus: 'review_required',
  expectedPrimaryPillar: null,
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.20, max: 0.52 },
  expectedReviewRequired: true,
  expectedRationaleContains: ['insufficienti'],
  doctrineNote: '"Formazione" generico non classifica né GROWTH né blocked. Potrebbe essere D.Lgs 81 (blocked) o upskilling volontario (GROWTH). Revisione umana necessaria.',
};

const EXAMPLE_33: PillarMappingExample = {
  id: 'ambiguous_33_psicologico_note_individuali',
  title: 'Supporto Psicologico con Note Individuali',
  description: 'Record con segnale individuale sensibile "sessione individuale" — pillar sospeso, privacy override.',
  inputRecord: makeRaw('pm-ambiguous-33', 32, {
    'Nome Iniziativa': 'Supporto Psicologico',
    'Categoria': 'benessere',
    'Obbligatorio': 'no',
    'Note': 'Accesso a sessione individuale per dipendente con disagio lavorativo',
  }),
  expectedEligibilityStatus: 'review_required',
  // Individual sensitive signal detected → primaryPillar null regardless of eligibility keywords.
  expectedPrimaryPillar: null,
  expectedSecondaryPillars: [],
  // Psychological support does not trigger a Care Economy care tag.
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.20, max: 0.45 },
  expectedReviewRequired: true,
  expectedRationaleContains: ['individuali sensibili', 'revisione privacy'],
  doctrineNote: '"Sessione individuale" = segnale sensibile. Privacy override (Priority 1): pillar mapping sospeso. KORA misura organizzazioni, non individui. Anonimizzare prima di riclassificare.',
};

const EXAMPLE_34: PillarMappingExample = {
  id: 'ambiguous_34_smart_working_no_policy',
  title: 'Smart Working Senza Policy Formale',
  description: 'Smart working generico senza policy formale né contesto cura — review_required.',
  inputRecord: makeRaw('pm-ambiguous-34', 33, {
    'Nome Iniziativa': 'Smart Working Aziendale',
    'Categoria': 'benefit hr',
    'Descrizione': 'Accordo smart working disponibile per alcuni dipendenti — senza policy formale dettagliata',
  }, 'structural_policy'),
  expectedEligibilityStatus: 'review_required',
  // "smart working" alone without "policy", "formale", or care context → no pillar signal.
  expectedPrimaryPillar: null,
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.20, max: 0.52 },
  expectedReviewRequired: true,
  expectedRationaleContains: ['insufficienti'],
  doctrineNote: '"Smart working" senza "policy" o "formale" non è eligible. Senza contesto cura, il care boost non scatta. Nessun pillar assegnabile. Distinguere da "Smart Working Policy Formale" (eligible LIFE).',
};

const EXAMPLE_35: PillarMappingExample = {
  id: 'ambiguous_35_rimborso_sanitario_generico',
  title: 'Rimborso Sanitario Generico',
  description: 'Rimborso sanitario senza dettaglio servizio — ambiguo tra eligible (check-up) e limited (rimborso generico).',
  inputRecord: makeRaw('pm-ambiguous-35', 34, {
    'Nome Iniziativa': 'Rimborso Sanitario Generico',
    'Categoria': 'benefit sanitario',
    'Descrizione': 'Rimborso spese sanitarie generiche — nessun dettaglio sul tipo di servizio o livello di prevenzione',
  }),
  expectedEligibilityStatus: 'review_required',
  expectedPrimaryPillar: null,
  expectedSecondaryPillars: [],
  expectedCareTags: [],
  expectedConfidenceBand: { min: 0.20, max: 0.52 },
  expectedReviewRequired: true,
  expectedRationaleContains: ['insufficienti'],
  doctrineNote: '"Rimborso sanitario generico" ambiguo: check-up extra volontario (eligible LIFE) vs rimborso generico (limited). Senza dettaglio tipo servizio → review_required.',
};

// ── All examples ──────────────────────────────────────────────────────────────

export const PILLAR_MAPPING_EXAMPLES: PillarMappingExample[] = [
  EXAMPLE_01, EXAMPLE_02, EXAMPLE_03, EXAMPLE_04, EXAMPLE_05,
  EXAMPLE_06, EXAMPLE_07,
  EXAMPLE_08, EXAMPLE_09, EXAMPLE_10, EXAMPLE_11, EXAMPLE_12,
  EXAMPLE_13, EXAMPLE_14, EXAMPLE_15, EXAMPLE_16,
  EXAMPLE_17, EXAMPLE_18, EXAMPLE_19, EXAMPLE_20, EXAMPLE_21,
  EXAMPLE_22, EXAMPLE_23, EXAMPLE_24, EXAMPLE_25,
  EXAMPLE_26, EXAMPLE_27,
  EXAMPLE_28, EXAMPLE_29, EXAMPLE_30,
  EXAMPLE_31, EXAMPLE_32, EXAMPLE_33, EXAMPLE_34, EXAMPLE_35,
];

// ── Self-check runner ─────────────────────────────────────────────────────────
//
// Runs all 35 examples through the full pipeline:
//   classifyEligibility → mapPillar → mapCareEconomySignal
// Returns pass/fail per example with failure reason.
// No test framework required — usable in browser, server, or jest/vitest.

export function runPillarMappingExamples(): PillarMappingExampleResult[] {
  return PILLAR_MAPPING_EXAMPLES.map((example) => {
    const eligibilityResult = classifyEligibility(example.inputRecord);
    const pillarMapping = mapPillar(example.inputRecord, eligibilityResult);
    const careSignal = mapCareEconomySignal(
      example.inputRecord,
      eligibilityResult,
      pillarMapping,
    );

    const actualCareTags = careSignal?.detectedCareTags ?? [];

    const eligibilityStatusMatch =
      eligibilityResult.status === example.expectedEligibilityStatus;

    const primaryPillarMatch =
      pillarMapping.primaryPillar === example.expectedPrimaryPillar;

    const secondaryPillarsMatch = example.expectedSecondaryPillars.every((p) =>
      pillarMapping.secondaryPillars.includes(p),
    );

    const careTagsMatch = example.expectedCareTags.every((tag) =>
      actualCareTags.includes(tag),
    );

    const confidenceInBand =
      pillarMapping.confidence >= example.expectedConfidenceBand.min &&
      pillarMapping.confidence <= example.expectedConfidenceBand.max;

    const reviewRequiredMatch =
      pillarMapping.reviewRequired === example.expectedReviewRequired;

    const rationaleMatch = example.expectedRationaleContains.every((substring) =>
      pillarMapping.rationale.toLowerCase().includes(substring.toLowerCase()),
    );

    const passed =
      eligibilityStatusMatch &&
      primaryPillarMatch &&
      secondaryPillarsMatch &&
      careTagsMatch &&
      confidenceInBand &&
      reviewRequiredMatch &&
      rationaleMatch;

    const failureReasons: string[] = [];
    if (!eligibilityStatusMatch)
      failureReasons.push(
        `eligibility: expected "${example.expectedEligibilityStatus}", got "${eligibilityResult.status}"`,
      );
    if (!primaryPillarMatch)
      failureReasons.push(
        `primaryPillar: expected "${String(example.expectedPrimaryPillar)}", got "${String(pillarMapping.primaryPillar)}"`,
      );
    if (!secondaryPillarsMatch)
      failureReasons.push(
        `secondaryPillars: expected to contain [${example.expectedSecondaryPillars.join(',')}], got [${pillarMapping.secondaryPillars.join(',')}]`,
      );
    if (!careTagsMatch)
      failureReasons.push(
        `careTags: expected to contain [${example.expectedCareTags.join(',')}], got [${actualCareTags.join(',')}]`,
      );
    if (!confidenceInBand)
      failureReasons.push(
        `confidence: ${pillarMapping.confidence.toFixed(3)} not in [${example.expectedConfidenceBand.min}, ${example.expectedConfidenceBand.max}]`,
      );
    if (!reviewRequiredMatch)
      failureReasons.push(
        `reviewRequired: expected ${String(example.expectedReviewRequired)}, got ${String(pillarMapping.reviewRequired)}`,
      );
    if (!rationaleMatch)
      failureReasons.push(
        `rationale: missing substring(s) [${example.expectedRationaleContains.join(', ')}] in "${pillarMapping.rationale}"`,
      );

    return {
      id: example.id,
      title: example.title,
      passed,
      eligibilityStatusMatch,
      primaryPillarMatch,
      secondaryPillarsMatch,
      careTagsMatch,
      confidenceInBand,
      reviewRequiredMatch,
      rationaleMatch,
      expectedEligibilityStatus: example.expectedEligibilityStatus,
      actualEligibilityStatus: eligibilityResult.status,
      expectedPrimaryPillar: example.expectedPrimaryPillar,
      actualPrimaryPillar: pillarMapping.primaryPillar,
      expectedCareTags: example.expectedCareTags,
      actualCareTags,
      actualConfidence: pillarMapping.confidence,
      expectedConfidenceBand: example.expectedConfidenceBand,
      failureReason: failureReasons.length > 0 ? failureReasons.join(' | ') : null,
      fullEligibilityResult: eligibilityResult,
      fullPillarMapping: pillarMapping,
      fullCareSignal: careSignal,
    };
  });
}

// ── Summary helper ────────────────────────────────────────────────────────────

export interface PillarMappingExampleSummary {
  total: number;
  passed: number;
  failed: number;
  failedIds: string[];
  byPillar: Record<string, { total: number; passed: number }>;
}

export function summarizePillarMappingExamples(
  results: PillarMappingExampleResult[],
): PillarMappingExampleSummary {
  const failed = results.filter((r) => !r.passed);

  const byPillar: Record<string, { total: number; passed: number }> = {};
  for (const r of results) {
    const key = r.expectedPrimaryPillar ?? 'null';
    if (!byPillar[key]) byPillar[key] = { total: 0, passed: 0 };
    byPillar[key].total += 1;
    if (r.passed) byPillar[key].passed += 1;
  }

  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: failed.length,
    failedIds: failed.map((r) => r.id),
    byPillar,
  };
}
