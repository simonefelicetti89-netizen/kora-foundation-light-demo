// lib/dynamic-cv/dynamic-impact-cv-policy.ts
// Dynamic Impact CV Eligibility & Shareability Policy — Rule-Based Classifier.
//
// Classifies each initiative/IU candidate for Dynamic Impact CV visibility.
// This is a PURE function — no DB, no LLM, no side effects.
//
// Core principles:
//   "KORA non trasforma la compliance in impatto."
//   "Il lavoratore decide cosa condividere."
//   shareableByWorker is ALWAYS false by default — never public without explicit worker action.
//
// Priority order:
//   1. eligibility_class === 'blocked' → not_cv_relevant (F)
//   2. Compliance/legal keywords       → not_cv_relevant
//   3. Economic relief keywords        → not_cv_relevant
//   4. Sensitive private life          → sensitive_excluded or private_only
//   5. Strong CV-eligible keywords     → cv_eligible (+ badge_eligible if evidence >= medium)
//   6. Mixed/review keywords           → requires_review with conservative defaults
//   7. Pillar-based defaults           → GROWTH/LEGACY → cv_eligible; LIFE → private_only
//
// Classification is conservative: when in doubt, prefer private_only over cv_eligible,
// and never badge_eligible without clear non-sensitive signal.

import type { DynamicCVClass, DynamicCVClassification } from './dynamic-cv-types';

// ── Input shape ───────────────────────────────────────────────────────────────

export interface CVClassificationInput {
  eligibility_class?: string | null; // 'eligible' | 'limited' | 'blocked' | 'review_required' | null
  category:           string;        // action_family or initiative title — keyword-matched
  pillar:             string;        // 'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY'
  is_mandatory?:      boolean;
  sensitivity_tags?:  string[];
  evidence_level?:    'low' | 'medium' | 'high' | null;
}

// ── Keyword sets ──────────────────────────────────────────────────────────────

// A: Compliance / legal baseline — KORA non trasforma la compliance in impatto.
const COMPLIANCE_KEYWORDS = [
  'compliance', 'legal', 'normativa', 'gdpr', '231', 'privacy', 'dpi', 'ppe',
  'duvri', 'dvr', 'sorveglianza sanitaria', 'sorveglianza_sanitaria',
  'medical surveillance', 'sicurezza obbligatoria', 'sicurezza_obbligatoria',
  'antincendio obbligatorio', 'primo soccorso obbligatorio',
  'conformità', 'conforme', 'obbligo',
];

const COMPLIANCE_MANDATORY_KEYWORDS = [
  'patentino', 'hse', 'antincendio', 'primo soccorso', 'sicurezza',
];

// B: Cash-like welfare / economic relief
const ECONOMIC_RELIEF_KEYWORDS = [
  'buono', 'buoni', 'voucher', 'gift card', 'benzina', 'spesa', 'fringe',
  'welfare economico', 'rimborso', 'cashback', 'bonus monetario', 'ticket',
  'buono pasto', 'buoni pasto',
];

// C: Sensitive private life categories
const SENSITIVE_KEYWORDS = [
  'salute mentale', 'mental health', 'psicolog', 'supporto psicologico',
  'terapia', 'therapy', 'caregiver', 'childcare', 'nido', 'asilo',
  'disabilità', 'disability', 'prevenzione medica', 'screening',
  'diagnos', 'patologia', 'benessere mentale', 'wellbeing mentale',
  'stress management', 'burnout', 'mindfulness', 'meditazione',
];

const HEALTH_REVIEW_KEYWORDS = [
  'check', 'checkup', 'medical', 'salute', 'benessere', 'prevenzione',
  'ergonomia', 'fisico', 'welfare',
];

// D: Strong CV-eligible categories
const CV_ELIGIBLE_KEYWORDS = [
  'formazione professionale', 'professional training', 'upskilling', 'reskilling',
  'mentoring', 'coaching professionale', 'tutoring', 'peer learning',
  'apprendimento tra pari', 'volontariato', 'volunteering',
  'progetto comunitario', 'community project', 'sostenibilità', 'sustainability',
  'innovazione', 'innovation challenge', 'innovation', 'knowledge sharing',
  'condivisione conoscenza', 'ambassador', 'leadership non obbligatoria',
  'sicurezza migliorativa', 'formazione', 'certificazione', 'certification',
  'digital', 'cloud', 'ai', 'machine learning', 'sviluppo professionale',
  'professional development', 'corso', 'workshop professionale',
  'hackathon', 'progetto', 'impatto', 'comunità', 'territorio',
  'trasferimento conoscenza', 'know-how', 'knowledge', 'legacy',
  'documentazione', 'succession', 'successione', 'community leadership',
  'facilitazione', 'facilitazione cross', 'leadership circle',
  'cross-team', 'cross team', 'networking professionale',
];

// E: Mixed/review required
const REVIEW_KEYWORDS = [
  'wellbeing', 'inclusione', 'leadership', 'esg', 'community',
  'ritiro', 'retreat',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchesAny(text: string, keywords: string[]): boolean {
  const norm = normalize(text);
  return keywords.some((kw) => norm.includes(normalize(kw)));
}

function badgeEligibleFromEvidence(evidenceLevel?: string | null): boolean {
  return evidenceLevel === 'medium' || evidenceLevel === 'high';
}

// ── Classification result builders ────────────────────────────────────────────

function notCvRelevant(reason: string): DynamicCVClassification {
  return {
    cvClass:          'not_cv_relevant',
    cvEligible:       false,
    badgeEligible:    false,
    shareableByWorker: false,
    privateOnly:      false,
    sensitiveExcluded: false,
    requiresReview:   false,
    reason,
  };
}

function sensitiveExcluded(reason: string): DynamicCVClassification {
  return {
    cvClass:          'sensitive_excluded',
    cvEligible:       false,
    badgeEligible:    false,
    shareableByWorker: false,
    privateOnly:      false,
    sensitiveExcluded: true,
    requiresReview:   false,
    reason,
  };
}

function privateOnly(cvEligible: boolean, reason: string): DynamicCVClassification {
  return {
    cvClass:          'private_only',
    cvEligible,
    badgeEligible:    false,
    shareableByWorker: false,
    privateOnly:      true,
    sensitiveExcluded: false,
    requiresReview:   false,
    reason,
  };
}

function cvEligible(badgeEligible: boolean, reason: string): DynamicCVClassification {
  const cls: DynamicCVClass = badgeEligible ? 'badge_eligible' : 'cv_eligible';
  return {
    cvClass:          cls,
    cvEligible:       true,
    badgeEligible,
    shareableByWorker: false, // always false by default — requires explicit worker action
    privateOnly:      false,
    sensitiveExcluded: false,
    requiresReview:   false,
    reason,
  };
}

function requiresReview(cvEligibleDefault: boolean, reason: string): DynamicCVClassification {
  return {
    cvClass:          cvEligibleDefault ? 'cv_eligible' : 'private_only',
    cvEligible:       cvEligibleDefault,
    badgeEligible:    false,
    shareableByWorker: false,
    privateOnly:      !cvEligibleDefault,
    sensitiveExcluded: false,
    requiresReview:   true,
    reason,
  };
}

// ── Main classifier ───────────────────────────────────────────────────────────

export function classifyForDynamicCV(input: CVClassificationInput): DynamicCVClassification {
  const { eligibility_class, category, pillar, is_mandatory, sensitivity_tags, evidence_level } = input;
  const cat = category + (sensitivity_tags?.join(' ') ?? '');

  // ── 1. Hard-blocked (eligibility_class === 'blocked') ─────────────────────
  if (eligibility_class === 'blocked') {
    return notCvRelevant('Iniziativa bloccata — esclusa per design dalla pipeline KORA. KORA non trasforma la compliance in impatto.');
  }

  // ── 2. Compliance / legal / mandatory safety ──────────────────────────────
  if (matchesAny(cat, COMPLIANCE_KEYWORDS)) {
    return notCvRelevant('KORA non trasforma la compliance in impatto. Baseline legale esclusa dal Dynamic Impact CV per design.');
  }
  if (is_mandatory && matchesAny(cat, COMPLIANCE_MANDATORY_KEYWORDS)) {
    return notCvRelevant('Attività obbligatoria per legge. KORA non trasforma la compliance in impatto.');
  }

  // ── 3. Cash-like welfare / economic relief ────────────────────────────────
  if (matchesAny(cat, ECONOMIC_RELIEF_KEYWORDS)) {
    return notCvRelevant('È sollievo economico, non capitale esperienziale condivisibile. Non incluso nel Dynamic Impact CV.');
  }

  // ── 4. Sensitive private life ─────────────────────────────────────────────
  if (matchesAny(cat, SENSITIVE_KEYWORDS)) {
    // Deep sensitive (health details) → sensitive_excluded
    const deepSensitive = ['psicolog', 'terapia', 'therapy', 'diagnos', 'patologia',
      'salute mentale', 'mental health', 'supporto psicologico', 'disabilità', 'disability',
      'burnout', 'benessere mentale', 'wellbeing mentale'];
    if (matchesAny(cat, deepSensitive)) {
      return sensitiveExcluded('Questa esperienza resta privata e non viene suggerita per la condivisione. Categorie sensibili sono escluse dal Dynamic Impact CV.');
    }
    // Caregiver/childcare/screening → private_only (may appear in private PIB context only)
    return privateOnly(true, 'Questa esperienza resta privata e non viene suggerita per la condivisione.');
  }

  // ── 5. LIFE pillar — extra sensitivity check ──────────────────────────────
  if (pillar === 'LIFE') {
    // Health-adjacent keywords on LIFE pillar default to private_only
    if (matchesAny(cat, HEALTH_REVIEW_KEYWORDS)) {
      return privateOnly(true, 'Attività LIFE con componente salute — privata per default. Non suggerita per la condivisione pubblica.');
    }
  }

  // ── 6. Strong CV-eligible ─────────────────────────────────────────────────
  if (matchesAny(cat, CV_ELIGIBLE_KEYWORDS)) {
    const badge = badgeEligibleFromEvidence(evidence_level);
    return cvEligible(badge, badge
      ? 'Esperienza professionale o di impatto verificabile e condivisibile. Potenzialmente idonea per badge.'
      : 'Esperienza professionale verificabile. Idonea per il Dynamic Impact CV.');
  }

  // ── 7. Pillar-based strong signals (when no keyword matched above) ─────────
  if (pillar === 'GROWTH') {
    const badge = badgeEligibleFromEvidence(evidence_level);
    return cvEligible(badge, 'Attività pillar GROWTH — idonea per il Dynamic Impact CV.');
  }
  if (pillar === 'LEGACY') {
    const badge = badgeEligibleFromEvidence(evidence_level);
    return cvEligible(badge, 'Attività pillar LEGACY — trasferimento conoscenza e continuità. Idonea per il Dynamic Impact CV.');
  }
  if (pillar === 'IMPACT') {
    if (eligibility_class === 'eligible') {
      return cvEligible(true, 'Contributo di impatto sociale/territoriale verificato. Idoneo per badge.');
    }
    return cvEligible(badgeEligibleFromEvidence(evidence_level), 'Attività pillar IMPACT — idonea per il Dynamic Impact CV.');
  }
  if (pillar === 'CONNECTION') {
    return cvEligible(false, 'Attività pillar CONNECTION — idonea per il Dynamic Impact CV.');
  }

  // ── 8. Mixed/review required ──────────────────────────────────────────────
  if (matchesAny(cat, REVIEW_KEYWORDS)) {
    return requiresReview(true, 'Categoria mista: richiede revisione contestuale prima della condivisione.');
  }

  // ── 9. Conservative default for LIFE without keyword match ───────────────
  if (pillar === 'LIFE') {
    return privateOnly(true, 'Attività LIFE — privata per default. Verifica se idonea per la condivisione.');
  }

  // ── 10. Unknown / review required fallback ────────────────────────────────
  return requiresReview(false, 'Categoria non classificata — richiede revisione prima dell\'inclusione nel Dynamic Impact CV.');
}

// ── Convenience helpers ───────────────────────────────────────────────────────

export function getWorkerCVControls(classification: DynamicCVClassification): import('./dynamic-cv-types').WorkerCVControls {
  return {
    canAddToCV:          classification.cvEligible,
    canHideFromCV:       true, // worker can always hide
    canRequestBadge:     classification.badgeEligible,
    canCreatePublicLink: false, // not live in Foundation Light
    canRevokePublicLink: false, // not live in Foundation Light
    canExportPDF:        false, // not live in Foundation Light
    canShareToLinkedIn:  false, // not live in Foundation Light
  };
}
