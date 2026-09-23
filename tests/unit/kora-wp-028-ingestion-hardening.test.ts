// tests/unit/kora-wp-028-ingestion-hardening.test.ts
//
// KORA-WP-028 — Ingestion Hardening: RETIRED SUBJECT, 2026-09-23.
//
// This suite originally exercised `lib/ingestion-hardening/company-ingest-service.ts`
// and `app/api/company/data-ingest/route.ts` — the synchronous Company-scoped
// ingestion write WP-028 hardened (idempotency via KORA-WP-011, rate limiting,
// PII scanning, correlation ids).
//
// KORA-WP-132 retired that entire path. The hardening was real and its
// individual guarantees are not being dropped as a matter of opinion: the
// surface they protected no longer exists, and a COMPANY_ADMIN now has no
// route to canonical ingestion state at all — which is a strictly stronger
// property than any hardening of a reachable Company write could provide.
//
// Retiring the suite rather than deleting it follows the repository's own
// precedent (`b-truth-ingestion-pipeline-retirement.test.ts`,
// `b-truth-ingestion-normalizer-retirement.test.ts`): the retirement is
// asserted, not silently dropped. Full actor-model proof lives in
// `kora-wp-132-canonical-intake-actor-model.test.ts`.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(process.cwd());
const exists = (rel: string) => existsSync(join(ROOT, rel));

describe('KORA-WP-028 — the hardened Company ingestion surface is retired (KORA-WP-132)', () => {
  it('the hardened service no longer exists', () => {
    expect(exists('lib/ingestion-hardening/company-ingest-service.ts')).toBe(false);
    expect(exists('lib/ingestion-hardening')).toBe(false);
  });

  it('the hardened route no longer exists', () => {
    expect(exists('app/api/company/data-ingest/route.ts')).toBe(false);
    expect(exists('app/api/company/data-ingest')).toBe(false);
  });

  it('the idempotency contract WP-028 consumed is untouched and still present', () => {
    // KORA-WP-011's contract outlived its first consumer and has others
    // (KORA-WP-115, KORA-WP-116) — retiring WP-028's surface must not touch it.
    expect(exists('lib/async-contract/idempotency-contract.ts')).toBe(true);
    expect(exists('lib/async-contract/postgres-idempotency-store.ts')).toBe(true);
  });

  it('the canonical operator-mediated intake that replaces it is present', () => {
    expect(exists('app/api/admin/data-intake/accept/route.ts')).toBe(true);
    expect(exists('app/api/admin/data-intake/preview/route.ts')).toBe(true);
    expect(exists('app/api/admin/data-intake/upload-preview/route.ts')).toBe(true);
  });
});
