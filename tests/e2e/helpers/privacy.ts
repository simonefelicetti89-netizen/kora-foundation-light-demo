/**
 * GOLDEN-E2E-01 — Company-facing privacy smoke assertions.
 *
 * Structural, best-effort checks that a company-facing page's rendered HTML
 * never contains an obvious worker-level identifier. This is a SMOKE check,
 * not a substitute for real enforcement — the actual privacy guarantee comes
 * from RLS (tests/integration/rls-two-tenant-negative.test.ts) and the access
 * matrix (docs/access-matrix.md, lib/auth/access-matrix.ts). This helper only
 * catches an accidental leak into markup/embedded JSON on a page a real
 * COMPANY_ADMIN session actually rendered — it proves nothing about the DB
 * layer and should never be cited as RLS coverage.
 */

import { expect, type Page } from 'playwright/test';

// Field/column names that should never appear literally in company-facing
// markup. worker_id / kora_worker_id: personal.* worker identifiers (see
// docs/access-matrix.md's worker_individual_pib/uef rows — always DENY for
// company roles). token_digest / link_id: KORA Link chip/token identifiers
// (see docs/KORA_LINK_ADR.md) — company pages should never reference these
// even once KORA Link ships, since KORA Link scan history must never become
// individual-company-visible behavior.
const FORBIDDEN_IDENTIFIER_PATTERNS: readonly RegExp[] = [
  /\bworker_id\b/i,
  /\bkora_worker_id\b/i,
  /\btoken_digest\b/i,
  /\blink_id\b/i,
];

// Heuristic, not a hard rule: a company page legitimately showing one or two
// contact/support emails is fine; a page rendering many distinct addresses
// smells like a personal email list rather than aggregate copy.
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const MAX_PLAUSIBLE_EMAILS_ON_COMPANY_PAGE = 2;

/**
 * Text-level version of the same check — used both for rendered page markup
 * and for raw JSON response bodies from `/api/company/*` (PILOT-TWO-TENANT-
 * ISOLATION-01), so the forbidden-pattern list stays in one place rather than
 * being duplicated per call site.
 */
export function assertNoWorkerLevelIdentifiersInText(text: string, context = 'response'): void {
  for (const pattern of FORBIDDEN_IDENTIFIER_PATTERNS) {
    expect(pattern.test(text), `${context} must never contain ${pattern} (worker-level identifier leak)`).toBe(false);
  }

  const emailMatches = text.match(EMAIL_PATTERN) ?? [];
  const distinctEmails = new Set(emailMatches.map((email) => email.toLowerCase()));
  expect(
    distinctEmails.size,
    `${context} contains ${distinctEmails.size} distinct email addresses — looks like a personal contact list, not aggregate company copy`,
  ).toBeLessThanOrEqual(MAX_PLAUSIBLE_EMAILS_ON_COMPANY_PAGE);
}

/**
 * Asserts the current page's rendered HTML contains no obvious worker-level
 * identifier and no implausibly large set of email addresses. Call this
 * after navigating to any company-facing page in an authenticated E2E test.
 */
export async function assertNoWorkerLevelIdentifiers(page: Page): Promise<void> {
  const html = await page.content();
  assertNoWorkerLevelIdentifiersInText(html, 'page markup');
}
