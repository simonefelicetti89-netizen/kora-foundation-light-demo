/**
 * KORA Link — cross-cutting privacy invariant guards (KORA-LINK-S1).
 *
 * The per-module test files (kora-link-token/config/ecosystem/...) each test
 * one file in isolation. This file guards the invariants that only make
 * sense checked ACROSS the proposed SQL, the RPC layer, and the role-facing
 * pages together — the things CLAUDE.md and the KORA Link ADR both treat as
 * constitutional: no personal data on the chip, no individual scan history
 * ever surfaced to a company or partner.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. See docs/KORA_LINK_ADR.md §4.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateToken, validateTokenFormat, KORA_LINK_TOKEN_PREFIX } from '@/lib/kora-link/token';
import { KORA_LINK_PRIVACY_BOUNDARIES, getKoraLinkPrivacyBoundariesForRole } from '@/lib/kora-link/ecosystem';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

// 034/035/036 deliberately document forbidden terms in prose — inside `--`
// line comments AND inside quoted `COMMENT ON ... IS '...'` string literals
// (e.g. "PROHIBITED keys: token_value, nfc_url, ..."). A plain word-boundary
// search over the whole file would flag that safety documentation as if it
// were a violation. Instead, check for the one shape that actually matters:
// the identifier defined as a real column (`name  <type>`) at the start of a
// line — which no amount of prose can accidentally produce.
const FORBIDDEN_COLUMNS = ['token_value', 'nfc_url', 'full_token', 'worker_name', 'worker_email'];
const SQL_COLUMN_TYPES = 'text|uuid|boolean|integer|bigint|timestamptz|jsonb|numeric|citext';

describe('KORA Link privacy invariants — proposed SQL never defines forbidden personal-data columns', () => {
  const sqlFiles = [
    'supabase/proposed/034_kora_link_schema.sql',
    'supabase/proposed/035_kora_link_rls.sql',
    'supabase/proposed/036_kora_link_rpc_functions.sql',
  ];

  for (const file of sqlFiles) {
    it(`${file} never defines a forbidden column`, () => {
      const sql = readSource(file);
      for (const forbidden of FORBIDDEN_COLUMNS) {
        const columnDefRegex = new RegExp(`^\\s*${forbidden}\\s+(?:${SQL_COLUMN_TYPES})\\b`, 'im');
        expect(columnDefRegex.test(sql), `found "${forbidden}" defined as a real column in ${file}`).toBe(false);
      }
    });
  }
});

describe('KORA Link privacy invariants — company-facing RPC cannot return individual data', () => {
  it('fn_company_link_status_aggregate returns only aggregate (status, count) rows', () => {
    const sql = readSource('supabase/proposed/036_kora_link_rpc_functions.sql');
    const startMarker = 'CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate';
    const startIdx = sql.indexOf(startMarker);
    expect(startIdx, 'fn_company_link_status_aggregate not found in 036').toBeGreaterThan(-1);

    const afterStart = sql.slice(startIdx);
    // KORA-LINK-S08: widened to include a per-bucket suppression flag.
    expect(afterStart).toMatch(/RETURNS TABLE\s*\(\s*status\s+text,\s*count\s+bigint,\s*suppressed\s+boolean\s*\)/);

    // Check only the actual plpgsql body (`AS $$ ... $$;`), not the trailing
    // `COMMENT ON FUNCTION ... IS '...'` documentation string that follows it
    // and itself names these fields as prohibited (prose, not code).
    const bodyStart = afterStart.indexOf('AS $$');
    const bodyEnd = afterStart.indexOf('$$;', bodyStart);
    expect(bodyStart, 'function body start not found').toBeGreaterThan(-1);
    expect(bodyEnd, 'function body end not found').toBeGreaterThan(bodyStart);
    const bodyNoComments = afterStart
      .slice(bodyStart, bodyEnd)
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('--');
        return idx === -1 ? line : line.slice(0, idx);
      })
      .join('\n');

    for (const forbidden of ['link_id', 'worker_id', 'token_digest']) {
      const regex = new RegExp(`\\b${forbidden}\\b`);
      expect(regex.test(bodyNoComments), `${forbidden} must never appear in the aggregate RPC's executable body`).toBe(
        false,
      );
    }
  });
});

describe('KORA Link privacy invariants — company/partner pages never reference an individual worker identifier in code', () => {
  const pages = ['app/company/kora-link/page.tsx', 'app/partner/kora-link/page.tsx'];
  // Require code-shaped adjacency (assignment, prop binding, or property
  // access) so prose explaining "we never show worker_id" (parenthetical,
  // followed by `)` or `,`) doesn't false-positive — only a real reference
  // used as an identifier would match these.
  const forbiddenCodePatterns = [
    /\bworkerId\s*[:=]/,
    /\.workerId\b/,
    /\bworker_id\s*[:=]/,
    /\.worker_id\b/,
    /\bworkerName\s*[:=]/,
    /\.workerName\b/,
    /\bworker_name\s*[:=]/,
    /\.worker_name\b/,
  ];

  for (const page of pages) {
    it(`${page} source contains no individual worker identifier used as code`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenCodePatterns) {
        expect(pattern.test(source), `${page} must never reference ${pattern} as code`).toBe(false);
      }
    });
  }
});

describe('KORA Link privacy invariants — token is opaque', () => {
  it('generateToken() output matches only the opaque kl1_ + 48 base62 shape', () => {
    const token = generateToken();
    expect(token.startsWith(KORA_LINK_TOKEN_PREFIX)).toBe(true);
    expect(validateTokenFormat(token).valid).toBe(true);
    // No structure beyond the opaque payload: no separators, no embedded
    // JSON/base64 padding characters, nothing decodable without the server-side digest lookup.
    expect(token).toMatch(/^kl1_[A-Za-z0-9]{48}$/);
  });

  it('token payload contains no separator that could encode structured fields (e.g. worker/company id)', () => {
    const token = generateToken();
    const payload = token.slice(KORA_LINK_TOKEN_PREFIX.length);
    expect(payload).not.toMatch(/[._\-:|]/);
  });
});

describe('KORA Link privacy invariants — role visibility boundaries are encoded in ecosystem.ts, not just prose', () => {
  it('a company-scoped privacy boundary exists asserting no individual worker visibility', () => {
    const companyBoundaries = getKoraLinkPrivacyBoundariesForRole('company');
    expect(companyBoundaries.length).toBeGreaterThan(0);
    expect(companyBoundaries.some((b) => b.id === 'company_never_sees_worker_level')).toBe(true);
  });

  it('a partner-scoped privacy boundary exists limiting identity disclosure', () => {
    const partnerBoundaries = getKoraLinkPrivacyBoundariesForRole('partner');
    expect(partnerBoundaries.some((b) => b.id === 'partner_no_unnecessary_identity')).toBe(true);
  });

  it('a worker-scoped privacy boundary exists asserting worker controls activation/consent', () => {
    const workerBoundaries = getKoraLinkPrivacyBoundariesForRole('worker');
    expect(workerBoundaries.some((b) => b.id === 'worker_controls_activation')).toBe(true);
  });

  it('a cross-role boundary exists asserting no raw token is ever persisted', () => {
    const boundary = KORA_LINK_PRIVACY_BOUNDARIES.find((b) => b.id === 'no_raw_token_persistence');
    expect(boundary).toBeDefined();
    expect(boundary?.appliesTo).toEqual(
      expect.arrayContaining(['admin', 'worker', 'company', 'partner', 'space', 'algorithm']),
    );
  });
});
