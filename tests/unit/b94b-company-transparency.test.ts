// tests/unit/b94b-company-transparency.test.ts
// B94-B — Company Submission Transparency
// Tests: eligibility engine, review breakdown, data quality, service, taxonomy, privacy invariants.

import { describe, it, expect } from 'vitest';
import {
  deriveEligibilityCategories,
  deriveReviewBreakdown,
  deriveDataQualitySummary,
  ELIGIBILITY_TAXONOMY,
  KORA_EDUCATION_STEPS,
  type EligibilityCategory,
  type ReviewBreakdown,
  type DataQualitySummary,
} from '../../lib/company-transparency/transparency-engine';
import {
  submissionFeedbackService,
  type SubmissionFeedbackData,
} from '../../services/submission-feedback/SubmissionFeedbackService';

// ── ELIGIBILITY TAXONOMY (static) ────────────────────────────────────────────

describe('ELIGIBILITY_TAXONOMY — static definition', () => {
  it('has exactly 3 entries', () => {
    expect(ELIGIBILITY_TAXONOMY).toHaveLength(3);
  });

  it('contains eligible, limited, and blocked categories', () => {
    const keys = ELIGIBILITY_TAXONOMY.map((e) => e.category);
    expect(keys).toContain('eligible');
    expect(keys).toContain('limited');
    expect(keys).toContain('blocked');
  });

  it('each entry has a non-empty Italian label', () => {
    ELIGIBILITY_TAXONOMY.forEach((entry) => {
      expect(entry.label.length).toBeGreaterThan(0);
    });
  });

  it('each entry has a non-empty Italian explanation', () => {
    ELIGIBILITY_TAXONOMY.forEach((entry) => {
      expect(entry.italianExplanation.length).toBeGreaterThan(20);
    });
  });

  it('each entry has at least 3 examples', () => {
    ELIGIBILITY_TAXONOMY.forEach((entry) => {
      expect(entry.examples.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('eligible entry label is Idoneo', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'eligible');
    expect(e?.label).toBe('Idoneo');
  });

  it('limited entry label is Limitato', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'limited');
    expect(e?.label).toBe('Limitato');
  });

  it('blocked entry label is Escluso', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'blocked');
    expect(e?.label).toBe('Escluso');
  });

  it('eligible examples include formazione volontaria', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'eligible');
    const joined = e!.examples.join(' ').toLowerCase();
    expect(joined).toContain('formazione');
  });

  it('eligible examples include mentoring', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'eligible');
    const joined = e!.examples.join(' ').toLowerCase();
    expect(joined).toContain('mentoring');
  });

  it('eligible examples include volontariato', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'eligible');
    const joined = e!.examples.join(' ').toLowerCase();
    expect(joined).toContain('volontariato');
  });

  it('limited examples include buoni pasto', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'limited');
    const joined = e!.examples.join(' ').toLowerCase();
    expect(joined).toContain('buoni pasto');
  });

  it('limited examples include fringe benefit', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'limited');
    const joined = e!.examples.join(' ').toLowerCase();
    expect(joined).toContain('fringe benefit');
  });

  it('blocked examples include compliance obbligatoria', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'blocked');
    const joined = e!.examples.join(' ').toLowerCase();
    expect(joined).toContain('compliance');
  });

  it('blocked examples include DPI', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'blocked');
    const joined = e!.examples.join(' ').toLowerCase();
    expect(joined).toContain('dpi');
  });

  it('blocked examples include sorveglianza sanitaria', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'blocked');
    const joined = e!.examples.join(' ').toLowerCase();
    expect(joined).toContain('sorveglianza sanitaria');
  });

  it('blocked explanation mentions AGF = 0', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'blocked');
    expect(e!.italianExplanation).toContain('AGF = 0');
  });

  it('blocked explanation does not claim activities are negative', () => {
    const e = ELIGIBILITY_TAXONOMY.find((x) => x.category === 'blocked');
    // Must contain a positive framing note
    expect(e!.italianExplanation.toLowerCase()).toContain('fuori scope');
  });
});

// ── deriveEligibilityCategories ───────────────────────────────────────────────

describe('deriveEligibilityCategories', () => {
  const ELIGIBLE = 624;
  const LIMITED  = 148;
  const BLOCKED  = 60;
  const TOTAL    = ELIGIBLE + LIMITED + BLOCKED; // 832

  let categories: EligibilityCategory[];

  it('returns exactly 3 categories', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    expect(categories).toHaveLength(3);
  });

  it('category keys are eligible, limited, blocked', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    expect(categories.map((c) => c.key)).toEqual(['eligible', 'limited', 'blocked']);
  });

  it('eligible count matches input', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    const c = categories.find((x) => x.key === 'eligible')!;
    expect(c.count).toBe(ELIGIBLE);
  });

  it('limited count matches input', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    const c = categories.find((x) => x.key === 'limited')!;
    expect(c.count).toBe(LIMITED);
  });

  it('blocked count matches input', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    const c = categories.find((x) => x.key === 'blocked')!;
    expect(c.count).toBe(BLOCKED);
  });

  it('sum of percentages is approximately 100', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    const sum = categories.reduce((acc, c) => acc + c.percentage, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('eligible percentage is the largest', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    const eligible = categories.find((c) => c.key === 'eligible')!;
    const limited  = categories.find((c) => c.key === 'limited')!;
    const blocked  = categories.find((c) => c.key === 'blocked')!;
    expect(eligible.percentage).toBeGreaterThan(limited.percentage);
    expect(eligible.percentage).toBeGreaterThan(blocked.percentage);
  });

  it('eligible percentage matches expected value', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    const c = categories.find((x) => x.key === 'eligible')!;
    const expected = Math.round((ELIGIBLE / TOTAL) * 1000) / 10;
    expect(c.percentage).toBe(expected);
  });

  it('all percentages are non-negative', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    categories.forEach((c) => expect(c.percentage).toBeGreaterThanOrEqual(0));
  });

  it('handles zero total gracefully', () => {
    const zero = deriveEligibilityCategories(0, 0, 0);
    zero.forEach((c) => {
      expect(c.count).toBe(0);
      expect(c.percentage).toBe(0);
    });
  });

  it('handles all records eligible', () => {
    const all = deriveEligibilityCategories(500, 0, 0);
    const eligible = all.find((c) => c.key === 'eligible')!;
    expect(eligible.count).toBe(500);
    expect(eligible.percentage).toBe(100);
    const limited = all.find((c) => c.key === 'limited')!;
    expect(limited.percentage).toBe(0);
  });

  it('handles all records blocked', () => {
    const all = deriveEligibilityCategories(0, 0, 100);
    const blocked = all.find((c) => c.key === 'blocked')!;
    expect(blocked.percentage).toBe(100);
  });

  it('each category inherits examples from taxonomy', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    categories.forEach((c) => {
      expect(c.examples.length).toBeGreaterThan(0);
    });
  });

  it('each category inherits italianExplanation from taxonomy', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    categories.forEach((c) => {
      expect(c.italianExplanation.length).toBeGreaterThan(20);
    });
  });

  it('categories do NOT contain individual worker IDs', () => {
    categories = deriveEligibilityCategories(ELIGIBLE, LIMITED, BLOCKED);
    categories.forEach((c) => {
      // Aggregate only — no 'workerId', 'name', 'email' fields
      expect(Object.keys(c)).not.toContain('workerId');
      expect(Object.keys(c)).not.toContain('name');
      expect(Object.keys(c)).not.toContain('email');
    });
  });
});

// ── deriveReviewBreakdown ─────────────────────────────────────────────────────

describe('deriveReviewBreakdown', () => {
  it('counts accepted submissions', () => {
    const result = deriveReviewBreakdown([
      { status: 'submission_accepted' },
      { status: 'submission_accepted' },
    ]);
    expect(result.accepted).toBe(2);
  });

  it('counts archived as accepted', () => {
    const result = deriveReviewBreakdown([
      { status: 'submission_archived' },
    ]);
    expect(result.accepted).toBe(1);
  });

  it('counts pending submissions', () => {
    const result = deriveReviewBreakdown([
      { status: 'submission_pending' },
    ]);
    expect(result.pending).toBe(1);
  });

  it('counts needs_clarification submissions', () => {
    const result = deriveReviewBreakdown([
      { status: 'submission_needs_clarification' },
    ]);
    expect(result.needsClarification).toBe(1);
  });

  it('counts rejected submissions', () => {
    const result = deriveReviewBreakdown([
      { status: 'submission_rejected' },
    ]);
    expect(result.rejected).toBe(1);
  });

  it('ignores draft status in counts', () => {
    const result = deriveReviewBreakdown([
      { status: 'submission_draft' },
    ]);
    expect(result.pending).toBe(0);
    expect(result.accepted).toBe(0);
    expect(result.rejected).toBe(0);
    expect(result.needsClarification).toBe(0);
    expect(result.total).toBe(1);
  });

  it('total equals input length', () => {
    const result = deriveReviewBreakdown([
      { status: 'submission_accepted' },
      { status: 'submission_pending' },
      { status: 'submission_rejected' },
    ]);
    expect(result.total).toBe(3);
  });

  it('handles empty submissions array', () => {
    const result = deriveReviewBreakdown([]);
    expect(result.total).toBe(0);
    expect(result.accepted).toBe(0);
    expect(result.pending).toBe(0);
    expect(result.needsClarification).toBe(0);
    expect(result.rejected).toBe(0);
  });

  it('handles mixed statuses', () => {
    const result = deriveReviewBreakdown([
      { status: 'submission_accepted' },
      { status: 'submission_pending' },
      { status: 'submission_needs_clarification' },
      { status: 'submission_rejected' },
    ]);
    expect(result.accepted).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.needsClarification).toBe(1);
    expect(result.rejected).toBe(1);
    expect(result.total).toBe(4);
  });
});

// ── deriveDataQualitySummary ──────────────────────────────────────────────────

describe('deriveDataQualitySummary', () => {
  it('passes through file and record counts unchanged', () => {
    const q = deriveDataQualitySummary(6, 847, 832, 23, 2);
    expect(q.filesUploaded).toBe(6);
    expect(q.recordsParsed).toBe(847);
    expect(q.recordsReviewed).toBe(832);
    expect(q.parseWarnings).toBe(23);
    expect(q.clarificationRequests).toBe(2);
  });

  it('parseSuccessRate = (parsed - warnings) / parsed × 100', () => {
    const q = deriveDataQualitySummary(6, 847, 832, 23, 2);
    const expected = Math.round(((847 - 23) / 847) * 1000) / 10;
    expect(q.parseSuccessRate).toBe(expected);
  });

  it('reviewRate = reviewed / parsed × 100', () => {
    const q = deriveDataQualitySummary(6, 847, 832, 23, 2);
    const expected = Math.round((832 / 847) * 1000) / 10;
    expect(q.reviewRate).toBe(expected);
  });

  it('parseSuccessRate is 100 when no warnings', () => {
    const q = deriveDataQualitySummary(3, 500, 500, 0, 0);
    expect(q.parseSuccessRate).toBe(100);
  });

  it('parseSuccessRate is 0 when parsed is 0', () => {
    const q = deriveDataQualitySummary(0, 0, 0, 0, 0);
    expect(q.parseSuccessRate).toBe(0);
  });

  it('reviewRate is 0 when parsed is 0', () => {
    const q = deriveDataQualitySummary(0, 0, 0, 0, 0);
    expect(q.reviewRate).toBe(0);
  });

  it('parseSuccessRate does not go below 0 if warnings exceed parsed', () => {
    const q = deriveDataQualitySummary(1, 10, 0, 50, 0);
    expect(q.parseSuccessRate).toBe(0);
  });

  it('parseSuccessRate is between 0 and 100 for valid inputs', () => {
    const q = deriveDataQualitySummary(5, 1000, 900, 100, 3);
    expect(q.parseSuccessRate).toBeGreaterThanOrEqual(0);
    expect(q.parseSuccessRate).toBeLessThanOrEqual(100);
  });

  it('reviewRate is between 0 and 100 for valid inputs', () => {
    const q = deriveDataQualitySummary(5, 1000, 900, 100, 3);
    expect(q.reviewRate).toBeGreaterThanOrEqual(0);
    expect(q.reviewRate).toBeLessThanOrEqual(100);
  });
});

// ── KORA Education Steps ──────────────────────────────────────────────────────

describe('KORA_EDUCATION_STEPS', () => {
  it('has exactly 5 steps', () => {
    expect(KORA_EDUCATION_STEPS).toHaveLength(5);
  });

  it('step keys are submission, review, eligibility, impact_units, kora_index', () => {
    const keys = KORA_EDUCATION_STEPS.map((s) => s.key);
    expect(keys).toContain('submission');
    expect(keys).toContain('review');
    expect(keys).toContain('eligibility');
    expect(keys).toContain('impact_units');
    expect(keys).toContain('kora_index');
  });

  it('each step has a non-empty label', () => {
    KORA_EDUCATION_STEPS.forEach((step) => {
      expect(step.label.length).toBeGreaterThan(0);
    });
  });

  it('each step has a non-empty description', () => {
    KORA_EDUCATION_STEPS.forEach((step) => {
      expect(step.description.length).toBeGreaterThan(20);
    });
  });

  it('eligibility step mentions AGF or Impact Units', () => {
    const step = KORA_EDUCATION_STEPS.find((s) => s.key === 'eligibility')!;
    const combined = (step.label + ' ' + step.description).toLowerCase();
    expect(combined).toMatch(/idoneo|agf|escluso|eligib/i);
  });

  it('kora_index step mentions 10 componenti or company level', () => {
    const step = KORA_EDUCATION_STEPS.find((s) => s.key === 'kora_index')!;
    const combined = (step.label + ' ' + step.description).toLowerCase();
    expect(combined).toMatch(/10|company|aziendale/i);
  });

  it('education steps do not contain formulas or math notation', () => {
    KORA_EDUCATION_STEPS.forEach((step) => {
      expect(step.description).not.toMatch(/IU_\{e,p\}|NM × BC/);
    });
  });
});

// ── SubmissionFeedbackService ─────────────────────────────────────────────────

describe('submissionFeedbackService.getDemoFeedback', () => {
  let fb: SubmissionFeedbackData;

  it('returns data for meridiana-group', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb).toBeDefined();
    expect(fb.companyId).toBe('meridiana-group');
  });

  it('isDemo is true for demo feedback', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.isDemo).toBe(true);
  });

  it('dataMode is demo', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.dataMode).toBe('demo');
  });

  it('recordsReceived is greater than 0', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.recordsReceived).toBeGreaterThan(0);
  });

  it('recordsReviewed is less than or equal to recordsReceived', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.recordsReviewed).toBeLessThanOrEqual(fb.recordsReceived);
  });

  it('recordsPending equals recordsReceived minus recordsReviewed', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.recordsPending).toBe(fb.recordsReceived - fb.recordsReviewed);
  });

  it('reviewed = accepted + limited + blocked', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.recordsAccepted + fb.recordsLimited + fb.recordsBlocked).toBe(fb.recordsReviewed);
  });

  it('all record counts are non-negative', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.recordsReceived).toBeGreaterThanOrEqual(0);
    expect(fb.recordsReviewed).toBeGreaterThanOrEqual(0);
    expect(fb.recordsPending).toBeGreaterThanOrEqual(0);
    expect(fb.recordsAccepted).toBeGreaterThanOrEqual(0);
    expect(fb.recordsLimited).toBeGreaterThanOrEqual(0);
    expect(fb.recordsBlocked).toBeGreaterThanOrEqual(0);
  });

  it('filesUploaded is positive', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.filesUploaded).toBeGreaterThan(0);
  });

  it('recordsParsed equals recordsReceived for complete parse', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.recordsParsed).toBe(fb.recordsReceived);
  });

  it('parseWarnings is less than recordsParsed', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(fb.parseWarnings).toBeLessThan(fb.recordsParsed);
  });

  it('has a period string', () => {
    fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(typeof fb.period).toBe('string');
    expect(fb.period.length).toBeGreaterThan(0);
  });

  it('returns data for unknown companyId (fallback)', () => {
    const fallback = submissionFeedbackService.getDemoFeedback('unknown-company');
    expect(fallback.isDemo).toBe(true);
    expect(fallback.companyId).toBe('unknown-company');
  });
});

// ── Privacy invariants ────────────────────────────────────────────────────────

describe('privacy invariants — no individual worker data', () => {
  it('SubmissionFeedbackData has no workerId field', () => {
    const fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    expect(Object.keys(fb)).not.toContain('workerId');
    expect(Object.keys(fb)).not.toContain('worker_id');
    expect(Object.keys(fb)).not.toContain('name');
    expect(Object.keys(fb)).not.toContain('email');
  });

  it('EligibilityCategory has no workerId field', () => {
    const cats = deriveEligibilityCategories(100, 20, 5);
    cats.forEach((c) => {
      expect(Object.keys(c)).not.toContain('workerId');
      expect(Object.keys(c)).not.toContain('pib');
    });
  });

  it('ReviewBreakdown has no workerId field', () => {
    const rb = deriveReviewBreakdown([{ status: 'submission_accepted' }]);
    expect(Object.keys(rb)).not.toContain('workerId');
    expect(Object.keys(rb)).not.toContain('worker_name');
  });

  it('DataQualitySummary has no workerId field', () => {
    const q = deriveDataQualitySummary(3, 100, 90, 5, 1);
    expect(Object.keys(q)).not.toContain('workerId');
    expect(Object.keys(q)).not.toContain('pib');
  });

  it('feedback recordsAccepted is employer_can_view_individual_pib: false invariant', () => {
    const fb = submissionFeedbackService.getDemoFeedback('meridiana-group');
    // Count is aggregate — no individual PIB in the feedback shape
    expect(fb.recordsAccepted).toBeDefined();
    expect(typeof fb.recordsAccepted).toBe('number');
  });

  it('eligible count is an aggregate number, not an array of worker objects', () => {
    const cats = deriveEligibilityCategories(624, 148, 60);
    const eligible = cats.find((c) => c.key === 'eligible')!;
    expect(typeof eligible.count).toBe('number');
    // Must NOT be an array (would imply individual records)
    expect(Array.isArray(eligible.count)).toBe(false);
  });
});
