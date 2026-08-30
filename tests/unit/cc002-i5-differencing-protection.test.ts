/**
 * CC-002 / B-INV — Constitutional Invariant I5: differencing protection on
 * combinable company-facing filters/totals.
 *
 * SCOPE:
 *   CC-002 does not redesign the privacy engine. It (1) identifies the
 *   principal company-facing vulnerable path, (2) proves the risk with a
 *   deterministic test, and (3) either ships a minimal canonical protection
 *   OR stops with an explicit, documented remediation requirement if fixing
 *   it for real would mean changing the data model, UX, or a public API
 *   contract (not allowed inside CC-002 per the task's own STOP rule).
 *
 * FINDING (principal vulnerable path):
 *   lib/live/persistence.ts persists BOTH:
 *     - department_activation: deptSuppressionResult.safe   (N≥10-suppressed)
 *     - active_worker_count / total_workers                 (TRUE, unsuppressed)
 *   in the SAME analytics.activation_result row.
 *   app/company/activation/page.tsx then renders BOTH
 *   `aggregate.active_worker_count` (line ~150) and
 *   `aggregate.department_activation` (line ~250) on the same page, to the
 *   same COMPANY_ADMIN viewer, against a FIXED, publicly-known 5-department
 *   list (DEPT_LABELS: Operations, Sales, HR & People, Product & Engineering,
 *   Admin & Finance).
 *
 *   When suppressSmallGroups() drops a department whose count is < 10 AND the
 *   combined _suppressed bucket total is *also* < 10 (so the bucket itself is
 *   omitted, per that function's own documented design), the department
 *   simply disappears from `department_activation` with no visible trace.
 *   But `active_worker_count` still reflects the TRUE total. A COMPANY_ADMIN
 *   can therefore compute:
 *       active_worker_count − Σ(visible department_activation values)
 *   to reconstruct the EXACT headcount of the missing department — and, since
 *   the department list is fixed and known, identify WHICH department it is
 *   by elimination. This is a live differencing vulnerability, not a
 *   hypothetical one.
 *
 * PROTECTION SHIPPED (minimal, canonical, additive — no existing behavior
 * changed): `detectGroupTotalReconciliationRisk()` in
 * lib/privacy/group-threshold.ts — a pure detector that proves exactly when
 * this reconstruction is possible. It does not modify persistence.ts or the
 * activation page (that would require a data-model / public-contract change,
 * out of CC-002 scope per the task's STOP rule — see I5 section of the CC-002
 * report: INVARIANT BLOCKED — REMEDIATION REQUIRED).
 */

import { describe, it, expect } from 'vitest';
import {
  suppressSmallGroups,
  detectGroupTotalReconciliationRisk,
} from '@/lib/privacy/group-threshold';

describe('I5 — differencing protection (B-INV / CC-002)', () => {
  describe('REAL SCENARIO — app/company/activation/page.tsx department breakdown vs active_worker_count', () => {
    it('reproduces the exact live vulnerability: one department < 10 with no visible _suppressed bucket lets active_worker_count reconstruct it exactly', () => {
      // Realistic department_activation counts, one of five departments below N=10.
      const departmentCounts = {
        'dept-operations':          34,
        'dept-sales':               28,
        'dept-hr-people':           4,   // ← below N=10, the vulnerable department
        'dept-product-engineering': 19,
        'dept-admin-finance':       15,
      };
      const trueActiveWorkerCount = Object.values(departmentCounts).reduce((s, v) => s + v, 0); // 100

      const suppression = suppressSmallGroups(departmentCounts, 10);

      // Confirms the dangerous shape: suppression happened, but the bucket
      // itself (4) is < 10, so it's omitted entirely — exactly as
      // group-threshold.ts's own documented design intends in isolation.
      expect(suppression.allSafe).toBe(false);
      expect(suppression.hasSuppressedBucket).toBe(false);
      expect(suppression.safe['dept-hr-people']).toBeUndefined();
      expect(Object.keys(suppression.safe)).toHaveLength(4);

      // This is the attack: exactly what app/company/activation/page.tsx's
      // viewer could compute by hand from the two numbers on their screen.
      const visibleSum = Object.values(suppression.safe).reduce((s, v) => s + v, 0); // 96
      const reconstructedHrHeadcount = trueActiveWorkerCount - visibleSum;
      expect(reconstructedHrHeadcount).toBe(4); // exact reconstruction of the suppressed department

      const risk = detectGroupTotalReconciliationRisk(trueActiveWorkerCount, suppression);
      expect(risk.atRisk).toBe(true);
      expect(risk.reconstructedCount).toBe(4);
    });

    it('task-spec-style example, correctly modeled: a full 2-department partition summing to 10 is actually SAFE (bucket becomes visible), showing the module already self-protects when the suppressed total itself is >= 10', () => {
      // This documents why the task's illustrative "total=10, filter B=9 →
      // infer 1" pattern does NOT apply verbatim to suppressSmallGroups: when
      // the groups dict is a complete partition of the true total (as it is
      // for department_activation — every worker belongs to exactly one
      // department), a combined suppressed total >= minGroupSize produces a
      // VISIBLE `_suppressed` bucket, which discloses "10 people are spread
      // across suppressed groups" without revealing the 9/1 split — safe by
      // design. The real vulnerability (see previous test) requires the
      // suppressed total to itself be < minGroupSize, which the previous
      // test demonstrates with real department numbers.
      const groups = { 'segment-B': 9, 'everyone-else': 1 };
      const suppression = suppressSmallGroups(groups, 10);
      expect(suppression.hasSuppressedBucket).toBe(true);
      expect(suppression.safe['_suppressed']).toBe(10);

      const risk = detectGroupTotalReconciliationRisk(10, suppression);
      expect(risk.atRisk).toBe(false); // correctly not flagged — the 9/1 split is never exposed
    });
  });

  describe('SAFE CASES — detector correctly reports no risk', () => {
    it('no suppression occurred → not at risk', () => {
      const groups = { a: 12, b: 15, c: 20 };
      const suppression = suppressSmallGroups(groups, 10);
      const risk = detectGroupTotalReconciliationRisk(47, suppression);
      expect(suppression.allSafe).toBe(true);
      expect(risk.atRisk).toBe(false);
    });

    it('suppression occurred but the _suppressed bucket itself is visible (>= minGroupSize) → not at risk', () => {
      // Two small groups (4 + 8 = 12 >= 10) → bucket IS shown, no additional
      // leak from the total: total - (visible + bucket) = 0.
      const groups = { a: 30, b: 4, c: 8 };
      const suppression = suppressSmallGroups(groups, 10);
      expect(suppression.hasSuppressedBucket).toBe(true);

      const trueTotal = 42;
      const risk = detectGroupTotalReconciliationRisk(trueTotal, suppression);
      expect(risk.atRisk).toBe(false);
      expect(risk.reason).toMatch(/_suppressed bucket is already visible/);
    });

    it('mismatched population (trueTotal from a different universe) is not falsely flagged', () => {
      const groups = { a: 12, b: 3 }; // b suppressed, bucket(3) < 10 → omitted
      const suppression = suppressSmallGroups(groups, 10);
      // Unrelated total from a different dataset — should not reconcile.
      const risk = detectGroupTotalReconciliationRisk(999, suppression);
      expect(risk.atRisk).toBe(false);
    });
  });

  // ── Adversarial check (I5 acceptance criteria) ──────────────────────────────
  it('ADVERSARIAL — detector must flag reconstruction below N=10 for a fresh combination of counts', () => {
    const groups = { west: 45, east: 6 }; // east suppressed, bucket(6) < 10 → omitted
    const suppression = suppressSmallGroups(groups, 10);
    const trueTotal = 51;
    const risk = detectGroupTotalReconciliationRisk(trueTotal, suppression);
    expect(risk.atRisk).toBe(true);
    expect(risk.reconstructedCount).toBe(6);
    expect(risk.reconstructedCount).toBeLessThan(10); // sub-N=10 reconstruction — the exact harm I5 exists to prevent
  });
});
