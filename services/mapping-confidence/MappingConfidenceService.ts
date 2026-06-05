import type { PillarCode } from '@/lib/types';
import type { SourceType } from '@/services/ingestion-simulator/IngestionSimulatorService';
import { suggestColumnMapping } from '@/lib/data-intake/column-mapping';

export interface MappingResult {
  pillar_code: PillarCode;
  event_type_code: string;
  confidence_score: number; // 0–1; < 0.60 requires human review
  requires_human_review: boolean;
  reason_code: string;
}

export interface IMappingConfidenceService {
  classify(columnHeader: string, sampleValues: string[], sourceType: SourceType): MappingResult;
}

// ── BCM taxonomy keyword groups ─────────────────────────────────────────────────
// Mirrors interpreter keyword tables — deterministic, no LLM.

const KW_GROWTH = [
  'formazione', 'training', 'upskilling', 'lms', 'academy', 'e-learning',
  'apprendimento', 'aggiornamento', 'reskilling', 'digital skills', 'corso',
  'sviluppo professionale', 'certificazione', 'bootcamp', 'workshop', 'hackathon',
  'learning', 'skill', 'career', 'leadership', 'manager', 'succession',
];

const KW_LIFE = [
  'salute', 'benessere', 'wellness', 'wellbeing', 'prevenzione', 'nutrizione',
  'attivita fisica', 'palestra', 'gym', 'fitness', 'psicolog', 'mental health',
  'counselling', 'assicurazione sanitaria', 'health', 'sanitaria', 'nido',
  'childcare', 'caregiver', 'congedo', 'parental', 'maternita', 'paternita',
];

const KW_CONNECTION = [
  'mentoring', 'mentoraggio', 'coaching', 'affiancamento', 'buddy',
  'community', 'peer', 'team', 'collaborazione', 'inter-funzional',
  'diversit', 'inclusion', 'inclusione', 'dei', 'gender',
];

const KW_IMPACT = [
  'volontariato', 'volunteering', 'sociale', 'social', 'comunita', 'community',
  'territoriale', 'pro bono', 'impatto', 'ambiente', 'esg', 'csr',
];

const KW_LEGACY = [
  'trasferimento', 'knowledge transfer', 'legacy', 'memoria organizzativa',
  'senior-junior', 'prassi', 'successione', 'passaggio generazionale',
  'cultura organizzativa', 'previdenza', 'pensione', 'fondo pensione',
];

const KW_LIMITED = [
  'buoni pasto', 'meal voucher', 'gift card', 'voucher', 'fringe benefit',
  'benefit monetar', 'welfare cash', 'rimborso generico', 'cashback',
  'welfare wallet', 'conto welfare', 'credito welfare',
];

const KW_BLOCKED = [
  'compliance', 'sicurezza obbligator', 'hse', 'dpi', 'dvr', 'gdpr obbligator',
  'modello 231', 'antincendio', 'primo soccorso obbligator', '81/08', 'dlgs 81',
];

function hasAny(text: string, kws: string[]): boolean {
  return kws.some(kw => text.includes(kw));
}

type BCMMatch = {
  pillar: PillarCode;
  eventType: string;
  eligibility: 'eligible' | 'limited' | 'blocked';
};

function matchBCMTaxonomy(combined: string): BCMMatch | null {
  if (hasAny(combined, KW_BLOCKED))   return { pillar: 'LIFE', eventType: 'compliance_baseline', eligibility: 'blocked' };
  if (hasAny(combined, KW_LIMITED))   return { pillar: 'LIFE', eventType: 'economic_relief',     eligibility: 'limited' };
  if (hasAny(combined, KW_LEGACY))    return { pillar: 'LEGACY',     eventType: 'knowledge_transfer',        eligibility: 'eligible' };
  if (hasAny(combined, KW_IMPACT))    return { pillar: 'IMPACT',     eventType: 'volunteering',              eligibility: 'eligible' };
  if (hasAny(combined, KW_CONNECTION))return { pillar: 'CONNECTION', eventType: 'mentoring_program',         eligibility: 'eligible' };
  if (hasAny(combined, KW_GROWTH))    return { pillar: 'GROWTH',     eventType: 'professional_training',     eligibility: 'eligible' };
  if (hasAny(combined, KW_LIFE))      return { pillar: 'LIFE',       eventType: 'health_wellness_program',   eligibility: 'eligible' };
  return null;
}

// ── Source-type confidence adjustments ─────────────────────────────────────────

function sourceBonus(sourceType: SourceType): number {
  switch (sourceType) {
    case 'welfare_provider': return 0.08;
    case 'lms':             return 0.06;
    case 'manual':          return -0.05;
    default:                return 0;
  }
}

// ── Public class ───────────────────────────────────────────────────────────────

export class MappingConfidenceService implements IMappingConfidenceService {
  classify(columnHeader: string, sampleValues: string[], sourceType: SourceType): MappingResult {
    const headerNorm = columnHeader.toLowerCase().trim();

    // Step 1: determine if this column maps to a content field (category/name/type)
    // vs a measurement field (amount, participants, etc.)
    const suggestions = suggestColumnMapping([columnHeader]);
    const best = suggestions[0];
    const canonicalField = best?.suggestedField ?? null;
    const fieldConfidence = best?.confidence ?? 0;

    // Measurement/metadata fields → not pillar-classifiable → low confidence, review required
    const measurementFields = new Set(['amount', 'participants', 'reporting_period', 'evidence_level',
      'cost_center', 'hours', 'coverage', 'uptake', 'policy_evidence', 'budget_class']);
    if (canonicalField && measurementFields.has(canonicalField)) {
      return {
        pillar_code: 'LIFE',
        event_type_code: 'measurement_field',
        confidence_score: 0.35,
        requires_human_review: true,
        reason_code: `field:${canonicalField}:not_pillar_classifiable`,
      };
    }

    // Step 2: combine header + sample values for BCM keyword matching
    const sampleText = sampleValues.slice(0, 20).join(' ').toLowerCase();
    const combined = `${headerNorm} ${sampleText}`;

    const bcmMatch = matchBCMTaxonomy(combined);

    if (!bcmMatch) {
      // No keyword match — use field confidence as weak signal
      const score = Math.max(0.30, Math.min(0.50, fieldConfidence * 0.5 + sourceBonus(sourceType)));
      return {
        pillar_code: 'LIFE',
        event_type_code: 'unclassified',
        confidence_score: score,
        requires_human_review: true,
        reason_code: 'bcm:no_keyword_match',
      };
    }

    // Step 3: compute confidence from match quality
    // Base: 0.55 for BCM match. Boost by field confidence and source type.
    let confidence = 0.55;
    confidence += fieldConfidence * 0.15;           // field synonyms strengthen context
    confidence += sourceBonus(sourceType);
    // If sample values confirmed the pillar keyword heavily, add boost
    const sampleMatchCount = (bcmMatch.pillar === 'GROWTH' ? KW_GROWTH :
      bcmMatch.pillar === 'LIFE' ? KW_LIFE :
      bcmMatch.pillar === 'CONNECTION' ? KW_CONNECTION :
      bcmMatch.pillar === 'IMPACT' ? KW_IMPACT : KW_LEGACY
    ).filter(kw => sampleText.includes(kw)).length;
    confidence += Math.min(0.15, sampleMatchCount * 0.03);
    confidence = Math.max(0.30, Math.min(0.95, Math.round(confidence * 100) / 100));

    return {
      pillar_code: bcmMatch.pillar,
      event_type_code: bcmMatch.eventType,
      confidence_score: confidence,
      requires_human_review: confidence < 0.70,
      reason_code: `bcm:keyword_match:${bcmMatch.pillar}`,
    };
  }
}

export const mappingConfidenceService = new MappingConfidenceService();
