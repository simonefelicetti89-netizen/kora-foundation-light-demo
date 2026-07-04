// tests/unit/partner-02-initiative-participation.test.ts
// PARTNER-02 — Initiative Participation Foundation.
//
// Context: docs/FUTURE_ROLES_AND_SURFACES.md flagged "a DB model for
// 'initiative participation' linked to partner_profile (doesn't exist yet)"
// as a missing foundation for the next Partner Platform increment. This
// sprint adds the UI/service foundation only — no migration, no live data —
// so app/partner/workspace/page.tsx has a real "Iniziative" section that
// always shows an honest empty state until a future migration lands.
//
// Static/source-level tests — consistent with this codebase's convention
// (see partner-01-pilot-surface.test.ts, kora-link-privacy-invariants.test.ts).

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getPartnerInitiatives } from '@/lib/partner-initiatives/service';
import { isPartnerInitiativesLiveEnabled } from '@/lib/partner-initiatives/config';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

function stripComments(code: string): string {
  return code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

const sessionSrc          = read('lib/auth/kora-session.ts');
const workspaceSrc        = read('app/partner/workspace/page.tsx');
const adminPartnersSrc    = read('app/admin/partners/page.tsx');
const typesSrc            = read('lib/partner-initiatives/types.ts');
const serviceSrc          = read('lib/partner-initiatives/service.ts');
const configSrc           = read('lib/partner-initiatives/config.ts');
const demoPartnerPageSrc  = read('app/demo/partner/page.tsx');

const FORBIDDEN_IDENTIFIER_PATTERNS = [
  /\bworker_id\b/,
  /\bworkerId\b/,
  /\bkora_worker_id\b/,
  /\bkoraWorkerId\b/,
  /\btoken_digest\b/,
  /\btokenDigest\b/,
  /\blink_id\b(?!entifier)/,
  /\bworker_name\b/,
  /\bworkerName\b/,
  /\bworker_email\b/,
  /\bscan_history\b/,
  /\bscanHistory\b/,
];

// ── 1. Partner initiative surface is guarded by PARTNER role ─────────────────

describe('PARTNER-02 — initiative surface is guarded by PARTNER role', () => {
  it('app/partner/workspace/page.tsx (which renders the Iniziative section) requires requirePartnerUser', () => {
    expect(workspaceSrc).toContain('requirePartnerUser');
    expect(workspaceSrc).toMatch(/requirePartnerUser\(\)/);
  });

  it('the Iniziative section is rendered inside the same requirePartnerUser-gated component — no second, weaker guard', () => {
    // getPartnerInitiatives is called after the isKoraAuthError(auth) redirect
    // check, in the same server component function — never in a standalone
    // route with its own (potentially weaker) auth.
    const authCheckIdx = workspaceSrc.indexOf('isKoraAuthError(auth)');
    const initiativesCallIdx = workspaceSrc.indexOf('getPartnerInitiatives(partnerId)');
    expect(authCheckIdx).toBeGreaterThan(-1);
    expect(initiativesCallIdx).toBeGreaterThan(authCheckIdx);
  });

  it('requirePartnerUser() still rejects any role that is not PARTNER (unchanged by this sprint)', () => {
    const fn = sessionSrc.slice(
      sessionSrc.indexOf('export async function requirePartnerUser'),
      sessionSrc.indexOf('export async function getCurrentPartnerUser'),
    );
    expect(fn).toMatch(/koraRole !== 'PARTNER'/);
  });
});

// ── 2. Partner initiative UI never renders a worker identifier ───────────────

describe('PARTNER-02 — initiative UI never renders a worker identifier', () => {
  it('app/partner/workspace/page.tsx contains no forbidden worker-level identifier as code', () => {
    const code = stripComments(workspaceSrc);
    for (const pattern of FORBIDDEN_IDENTIFIER_PATTERNS) {
      expect(pattern.test(code), `workspace page must never reference ${pattern}`).toBe(false);
    }
  });

  it('app/admin/partners/page.tsx operator note contains no forbidden worker-level identifier as code', () => {
    const code = stripComments(adminPartnersSrc);
    for (const pattern of FORBIDDEN_IDENTIFIER_PATTERNS) {
      expect(pattern.test(code), `admin partners page must never reference ${pattern}`).toBe(false);
    }
  });
});

// ── 3. Partner initiative model/types exclude worker-level fields ────────────

describe('PARTNER-02 — types and service exclude worker-level fields', () => {
  const sourceFiles: Array<[string, string]> = [
    ['lib/partner-initiatives/types.ts', typesSrc],
    ['lib/partner-initiatives/service.ts', serviceSrc],
    ['lib/partner-initiatives/config.ts', configSrc],
  ];

  for (const [label, src] of sourceFiles) {
    it(`${label} defines no forbidden worker-level field as a real identifier`, () => {
      const code = stripComments(src);
      for (const pattern of FORBIDDEN_IDENTIFIER_PATTERNS) {
        expect(pattern.test(code), `${label} must never define ${pattern}`).toBe(false);
      }
    });
  }

  it('PartnerInitiativeCard has no field shaped like a per-individual identifier', () => {
    // The only "count" field is explicitly aggregate-typed (number | null),
    // never a list of individuals or a per-worker row reference.
    expect(typesSrc).toMatch(/participantCountAggregate:\s*number\s*\|\s*null/);
    expect(typesSrc).not.toMatch(/participants:\s*(string|Worker)\[\]/);
  });
});

// ── 4. Non-partner roles are not treated as partner users ────────────────────

describe('PARTNER-02 — non-partner roles are not treated as partner users', () => {
  it('getPartnerInitiatives has no role-check bypass — it is only ever called from the PARTNER-gated workspace page', () => {
    // The service itself takes a partnerId, not a role — role enforcement is
    // the caller's job (requirePartnerUser in the workspace page, asserted
    // above). Confirm no OTHER page (company/worker/admin) calls it.
    const otherRoleDirs = ['app/company', 'app/worker', 'app/my-kora', 'app/admin'];
    for (const dir of otherRoleDirs) {
      const fullDir = path.resolve(__dirname, '../..', dir);
      if (!fs.existsSync(fullDir)) continue;
      const files = walk(fullDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
      for (const file of files) {
        // Admin's own operator-note page is allowed to mention the service
        // only in prose (already asserted above it has no forbidden fields);
        // it must not import/call the service function.
        const content = fs.readFileSync(file, 'utf-8');
        expect(content, `${file} must not import getPartnerInitiatives`).not.toMatch(
          /from ['"]@\/lib\/partner-initiatives\/service['"]/,
        );
      }
    }
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// ── 5. Demo data remains under /demo, not the live /partner/workspace ────────

describe('PARTNER-02 — demo data stays under /demo, live workspace stays honest', () => {
  it('app/partner/workspace/page.tsx does not import anything from app/demo/partner', () => {
    expect(workspaceSrc).not.toMatch(/from ['"].*demo\/partner/);
  });

  it('lib/partner-initiatives/service.ts never returns a non-empty initiatives array today (no fake live data)', () => {
    // Every `initiatives:` literal in the current source is an empty array.
    const arrayLiterals = [...serviceSrc.matchAll(/initiatives:\s*(\[[^\]]*\])/g)].map((m) => m[1]);
    expect(arrayLiterals.length).toBeGreaterThan(0);
    for (const literal of arrayLiterals) {
      expect(literal.replace(/\s/g, '')).toBe('[]');
    }
  });

  it('getPartnerInitiatives() returns isLive:false and an empty array by default (no env flag set)', async () => {
    const result = await getPartnerInitiatives('00000000-0000-0000-0000-000000000000', {});
    expect(result.isLive).toBe(false);
    expect(result.initiatives).toEqual([]);
    expect(result.emptyStateMessage.length).toBeGreaterThan(0);
  });

  it('isPartnerInitiativesLiveEnabled() is false by default and only true for the exact string "true"', () => {
    expect(isPartnerInitiativesLiveEnabled({})).toBe(false);
    expect(isPartnerInitiativesLiveEnabled({ PARTNER_INITIATIVES_LIVE_ENABLED: 'yes' })).toBe(false);
    expect(isPartnerInitiativesLiveEnabled({ PARTNER_INITIATIVES_LIVE_ENABLED: 'true' })).toBe(true);
  });

  it('demo partner page is unaffected — still gated by requireDemoGate, never imports requirePartnerUser', () => {
    // demoPartnerPageSrc legitimately mentions requirePartnerUser() in a prose
    // comment (explaining where the real session lands) — only an actual
    // import would indicate the demo page started gating on it.
    expect(demoPartnerPageSrc).not.toMatch(/import\s*\{[^}]*requirePartnerUser/);
    expect(demoPartnerPageSrc).toMatch(/requireDemoGate/);
  });
});
