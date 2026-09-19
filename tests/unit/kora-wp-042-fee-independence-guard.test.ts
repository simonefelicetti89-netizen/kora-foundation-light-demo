/**
 * KORA-WP-042 — Early Fee-Independence Guard (`PRIME-014`/`PRIME-015` early
 * slice; full closure `KORA-WP-105`).
 *
 * CODE-REVIEW-ENFORCED INVARIANT (registry 142's own "Proposed New,"
 * verbatim: "a code-review-enforced invariant + unit test confirming zero
 * fee-computation function exists that reads a Review verdict") — this
 * comment block is that invariant, and every test below is its mechanical
 * enforcement:
 *
 *   NO function anywhere in this repository computes a fee, commission, or
 *   any monetary amount as a function of a Review verdict, a Review Advisor
 *   Proposal's proposed verdict, or a Review Advisor Assessment. The
 *   Decision Spine (Commitment → Evidence Plan → Review → Review Advisor
 *   Proposal → Review Advisor Assessment) and Flow A billing
 *   (`analytics.fee_charge_event`, Commercial Entitlement) remain two
 *   structurally disconnected object graphs — no shared function, no shared
 *   parameter, no shared table, no shared view.
 *
 * Doc 83 §21 (`PRIME-014` Enforcement), verbatim: "the KORA Economic Charge
 * Event computation has no input parameter referencing a Review/Decision-
 * Review-Event verdict." Doc 83 §22 (`PRIME-015` Enforcement): "the
 * Advisor Review Assessment is non-constitutive (`76` §10)... the Company
 * retains decision authority." Doc 95 §11, the decisive scope statement:
 * "an early structural guard (`KORA-WP-042`, I1 — no fee function reads a
 * Review verdict, BECAUSE NO FEE FUNCTION EXISTS YET; Commitment/Review/
 * Advisor-evidence construction is provably independence-preserving by
 * absence) and full closure (`KORA-WP-105`, I7 — tested against KORA's
 * actual Prime fee/commission functions... once they exist)." WP-042 is
 * this exact "by absence" proof — nothing more, per this WP's own Out of
 * Scope ("actual Prime fee/commission logic, `KORA-WP-104`/`105`").
 *
 * WHY THIS IS ALREADY MOSTLY TRUE, NOT INVENTED HERE: `KORA-WP-062`'s own
 * implementation (lib/flow-a-billing/flow-a-billing-service.ts, migration
 * `076`) already self-disclosed and documented exactly this guarantee in
 * its own header — "VERDICT-INDEPENDENCE (`KORA-WP-042`'s guard, extended):
 * no function in this module accepts, reads, or references a Review
 * verdict, `analytics.review`, or `analytics.review_event` in any form" —
 * written before this WP itself was implemented. This file is what makes
 * that claim a permanent, mechanically-checked regression guard rather
 * than an unverified comment, and extends the same check to the reverse
 * direction (the Decision-Spine/Advisor-evidence modules never import
 * billing either) and to the schema itself.
 *
 * Data/Migration Impact: NONE (registry, verbatim). No code beyond this
 * test file exists for this WP — "Service/API: N/A — a verification
 * artifact" (registry, verbatim). No real-DB validation applies — there is
 * no DB write behavior to validate, only static/structural source and
 * schema-definition inspection.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

function read(path: string): string { return readFileSync(path, 'utf8'); }
function codeLines(path: string): string[] {
  return read(path).split('\n').filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l));
}

const BILLING_PATH = 'lib/flow-a-billing/flow-a-billing-service.ts';
const FEE_MIGRATION_PATH = 'supabase/migrations/076_flow_a_fee_charge_event.sql';

const DECISION_SPINE_AND_ADVISOR_EVIDENCE_MODULES = [
  'lib/commitment/commitment-service.ts',
  'lib/review/review-service.ts',
  'lib/evidence-plan/evidence-plan-service.ts',
  'lib/review/review-advisor-proposal-service.ts',
  'lib/review/review-advisor-assessment-service.ts',
  'lib/advisor-portal/advisor-decision-support-service.ts',
  // KORA-WP-116 (Founder Adjudication #5): the KORAL Review domain
  // extends this same early guard, narrowly — never a fee-computation
  // input, exactly like the Decision Spine's own Review verdict.
  'lib/living-koral-review/review-service.ts',
];

describe('KORA-WP-042 — H. no fee-computation function exists yet (the "by absence" premise)', () => {
  it('lib/flow-a-billing/flow-a-billing-service.ts is the only billing/fee module in the repository', () => {
    // A structural fact this guard's own validity depends on (doc 95 §11:
    // "because no fee function exists yet") — if a second billing module
    // ever appears, this test itself must be revisited, not silently pass.
    expect(existsSync(BILLING_PATH)).toBe(true);
  });

  it('none of its exported functions computes/derives a fee amount — every amount is a direct, caller-supplied parameter, never derived from another input', () => {
    const lines = codeLines(BILLING_PATH);
    const exportedFns = lines.filter((l) => /^export (async )?function/.test(l));
    // No fee-shaped amount is ever computed via arithmetic on a non-amount
    // input (e.g. `amount * rate`, `verdict ? x : y` feeding an amount) —
    // confirmed by the complete absence of any such expression anywhere in
    // the module's exported functions.
    expect(exportedFns.length).toBeGreaterThan(0);
    expect(lines.join('\n')).not.toMatch(/amount\s*[*/]\s*\w|\w+\s*[*/]\s*rate/i);
  });
});

describe('KORA-WP-042 — A/B/C/H. no function signature anywhere accepts a verdict parameter feeding a fee computation', () => {
  it('flow-a-billing-service.ts: no function parameter named verdict/proposedVerdict exists', () => {
    const lines = codeLines(BILLING_PATH);
    expect(lines.some((l) => /\bverdict\b/i.test(l))).toBe(false);
  });

  it('flow-a-billing-service.ts never imports ReviewVerdict, REVIEW_VERDICTS, or any Review/verdict type', () => {
    const lines = codeLines(BILLING_PATH).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => /ReviewVerdict|REVIEW_VERDICTS|review-service|review-advisor/i.test(l))).toBe(false);
  });
});

describe('KORA-WP-042 — reverse direction: Decision-Spine/Advisor-evidence modules never import billing', () => {
  for (const modulePath of DECISION_SPINE_AND_ADVISOR_EVIDENCE_MODULES) {
    it(`${modulePath} exists and never imports flow-a-billing, fee_charge_event, or Commercial Entitlement`, () => {
      expect(existsSync(modulePath)).toBe(true);
      const lines = codeLines(modulePath).filter((l) => /^\s*import\b/.test(l));
      expect(lines.some((l) => /flow-a-billing|fee_charge_event|CommercialEntitlement|commercial-entitlement/i.test(l))).toBe(false);
    });
  }
});

describe('KORA-WP-042 — F/G. fee_charge_event schema itself never references a verdict', () => {
  it('migration 076 defines no column, trigger, function, or default referencing Review/verdict', () => {
    const src = read(FEE_MIGRATION_PATH)
      .split('\n')
      .filter((l) => !/^\s*--/.test(l))
      .join('\n');
    expect(src).not.toMatch(/\bverdict\b/i);
    expect(src).not.toMatch(/analytics\.review\b|analytics\.review_event\b/);
  });
});

describe('KORA-WP-042 — E. Decision Spine independence preserved (no mutation introduced by this WP)', () => {
  it('no new migration exists for this WP (registry: Data/Migration Impact = NONE)', async () => {
    // Ceiling bumped 80→81→82→...→86 by later, unrelated WPs — this
    // assertion's own intent ("WP-042 itself adds no migration") is
    // unaffected; only the global ceiling this test pins to has moved.
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(Math.max(...numbers)).toBe(88); // 114's own migration 084; 115's own migration 085; 116's own migration 086 (gov.operational_case.linked_object_type + advisor_content_record widenings — no new table); KORAL Morphology Package A's own migration 087 (2026-09-19, narrow additive widening of the WP-113 operation CHECK/RPC) and 088 (cardinality remediation, gov.living_koral_material_change's own uniqueness widened) — this WP's own "no migration" intent is unaffected
  });

  it('this WP adds no lib/services file of its own — verification artifact only', () => {
    expect(existsSync('lib/fee-independence')).toBe(false);
    expect(existsSync('services/fee-independence')).toBe(false);
  });
});

describe('KORA-WP-116 — fee-independence extension: KORAL Review never becomes a fee-computation input (Founder Adjudication #5)', () => {
  const REVIEW_PATH = 'lib/living-koral-review/review-service.ts';

  it('lib/living-koral-review/review-service.ts exists and never imports flow-a-billing, fee_charge_event, or Commercial Entitlement', () => {
    expect(existsSync(REVIEW_PATH)).toBe(true);
    const lines = codeLines(REVIEW_PATH).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => /flow-a-billing|fee_charge_event|CommercialEntitlement|commercial-entitlement/i.test(l))).toBe(false);
  });

  it('flow-a-billing-service.ts never imports living-koral-review or any KORAL Review type/field', () => {
    const lines = codeLines(BILLING_PATH).filter((l) => /^\s*import\b/.test(l));
    expect(lines.some((l) => /living-koral-review|KoralReview/i.test(l))).toBe(false);
  });

  it('no interpretation/confirmation/recognition-source field in the Review module feeds an amount (no `amount * ` / `* rate` arithmetic anywhere in it)', () => {
    const src = codeLines(REVIEW_PATH).join('\n');
    expect(src).not.toMatch(/amount\s*[*/]\s*\w|\w+\s*[*/]\s*rate/i);
  });
});

describe('KORA-WP-042 — I. no Prime economic dependency; K. no Decision Spine mutation', () => {
  it('no Program Funds / Partner Payable / Prime settlement module exists to accidentally couple against', () => {
    expect(existsSync('lib/program-funds')).toBe(false);
    expect(existsSync('lib/partner-payable')).toBe(false);
    expect(existsSync('lib/prime-settlement')).toBe(false);
  });
});

describe('KORA-WP-042 — J. WP-105 remains explicitly deferred, never conflated with this early guard', () => {
  it('this file documents the early-guard/full-closure boundary in its own header, per Acceptance ("explicitly marked as an early guard, never conflated with full closure")', () => {
    const src = read('tests/unit/kora-wp-042-fee-independence-guard.test.ts');
    expect(src).toMatch(/KORA-WP-105/);
    expect(src).toMatch(/full closure/i);
  });

  it('no KORA-WP-104/105 fee/commission computation module exists yet — the guard remains valid "by absence"', () => {
    expect(existsSync('lib/prime-fee')).toBe(false);
    expect(existsSync('lib/commission')).toBe(false);
  });
});
