/**
 * Governance UI 01 — platform-wide governance/privacy register guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: this
 * page is a read-only register that records governance state — it must
 * never approve a pending decision, close a gate, activate KORA Link, or
 * change any data-visibility rule. See docs/GOVERNANCE_UI_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const GOVERNANCE_PAGE = 'app/admin/governance/page.tsx';

describe('Governance UI 01 — route exists and is readable', () => {
  it(`${GOVERNANCE_PAGE} exists`, () => {
    expect(() => readSource(GOVERNANCE_PAGE)).not.toThrow();
  });
});

describe('Governance UI 01 — no Supabase, DB helper, RPC, or env secret access', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  it(`${GOVERNANCE_PAGE} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
    const source = readSource(GOVERNANCE_PAGE);
    for (const pattern of forbiddenPatterns) {
      expect(pattern.test(source), `must not match ${pattern}`).toBe(false);
    }
  });
});

describe('Governance UI 01 — all ten pending decisions remain open, none resolved or approved', () => {
  const source = readSource(GOVERNANCE_PAGE);

  it('covers all ten named pending decisions', () => {
    for (const topic of [
      'aggregate-threshold',
      'audit-log-retention',
      'request-fingerprint-hashing',
      'consent-version-privacy-notice',
      'delivered-to-label-semantics',
      'break-glass-procedure',
      'worker-self-select',
      'public-lookup-path',
      'activation-concurrency',
      'audit-log-grant-vs-security-definer',
    ]) {
      expect(source).toContain(`id: '${topic}'`);
    }
  });

  it('every decision renders as open/pending via the shared status badge, never resolved/closed/approved', () => {
    expect(source).toContain('Aperta / pending');
    const decisionIdCount = (source.match(/id: '[a-z-]+',/g) ?? []).length;
    expect(decisionIdCount).toBe(10);
    expect(source).not.toMatch(/status:\s*['"]resolved['"]/i);
    expect(source).not.toMatch(/status:\s*['"]closed['"]/i);
    expect(source).not.toMatch(/status:\s*['"]approved['"]/i);
    expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
    expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
  });

  it('the page banner explicitly states it approves no pending item and closes no gate', () => {
    expect(source).toMatch(/non approva alcuna decisione legale o tecnica pendente/);
    expect(source).toMatch(/non chiude alcun gate/);
    expect(source).toMatch(/non\s*\n?\s*attiva KORA Link/);
    expect(source).toMatch(/non modifica la visibilità dei dati/);
  });
});

describe('Governance UI 01 — states the core privacy invariants', () => {
  const source = readSource(GOVERNANCE_PAGE);

  it('states company remains aggregate-only', () => {
    expect(source).toMatch(/Azienda solo aggregata/);
    expect(source).toMatch(/sempre a livello aggregato, mai individuale/);
  });

  it('states partner named visibility is worker-initiated only', () => {
    expect(source).toMatch(/Partner: visibilità worker-initiated/);
    expect(source).toMatch(/Il partner vede nominativi solo quando il worker avvia volontariamente/);
  });

  it('states KORA Link remains proposed, not applied', () => {
    expect(source).toMatch(/KORA Link: proposed, non applicato/);
    expect(source).toMatch(/restano in\s*\n?\s*<code>supabase\/proposed\/<\/code>/);
  });

  it('states DPO/legal reviews decisions and receives no hidden bypass', () => {
    expect(source).toMatch(/Rivede le decisioni pendenti/);
    expect(source).toMatch(/Non riceve un bypass nascosto ai controlli di accesso/);
  });
});

describe('Governance UI 01 — references core governance docs without claiming fresh validation', () => {
  const source = readSource(GOVERNANCE_PAGE);
  const expectedDocs = [
    'docs/QA_STATUS.md',
    'docs/E2E_GOLDEN_PATH.md',
    'docs/E2E_TWO_TENANT_ISOLATION.md',
    'docs/KORA_LINK_GATE_REPORT.md',
    'docs/PARTNER_SURFACE_01.md',
    'docs/PILOT_PRIVACY_GOVERNANCE.md',
  ];

  it('references all six evidence docs', () => {
    for (const doc of expectedDocs) {
      expect(source).toContain(doc);
    }
  });

  it('does not claim a fresher validation than the referenced docs themselves state', () => {
    expect(source).toMatch(/non ne rivendica\s*\n?\s*una verifica più recente di quella dichiarata al loro interno/);
  });

  it('does not expose raw secrets or env values', () => {
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(source).not.toMatch(/KORA_LINK_TOKEN_SECRET\s*[:=]\s*['"]/);
  });
});

describe('Governance UI 01 — no "mock" labels, no raw ticket IDs, no "prossimamente"', () => {
  const source = readSource(GOVERNANCE_PAGE);

  it('does not use "mock" as visible label chrome', () => {
    const buttonBlocks = source.match(/<button[\s\S]*?<\/button>/g) ?? [];
    for (const block of buttonBlocks) {
      expect(block.toLowerCase()).not.toContain('(mock');
    }
    expect(source).not.toMatch(/Anteprima design — dati mock/);
  });

  it('does not use "prossimamente"', () => {
    expect(source.toLowerCase()).not.toMatch(/prossimamente/);
  });

  it('does not reference internal ticket/ADR-style IDs (e.g. B123, KL-99) in visible copy', () => {
    expect(source).not.toMatch(/\bB\d{2,4}\b/);
  });
});

describe('Governance UI 01 — no feature flag hardcoded, no KORA Link feature toggled', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  it(`${GOVERNANCE_PAGE} does not hardcode any KORA Link feature flag to true`, () => {
    const source = readSource(GOVERNANCE_PAGE);
    for (const pattern of forbiddenPatterns) {
      expect(pattern.test(source)).toBe(false);
    }
  });
});

describe('Governance UI 01 — KORA Link governance integration is bidirectional', () => {
  it('/admin/governance links to /admin/kora-link/governance', () => {
    const source = readSource(GOVERNANCE_PAGE);
    expect(source).toContain("href=\"/admin/kora-link/governance\"");
  });

  it('/admin/kora-link/governance links back to /admin/governance', () => {
    const source = readSource('app/admin/kora-link/governance/page.tsx');
    expect(source).toContain("href=\"/admin/governance\"");
  });
});

describe('Governance UI 01 — admin navigation surfaces Governance as its own top-level group', () => {
  const source = readSource('lib/navigation/admin-nav-groups.ts');

  it('registers a dedicated governance nav group pointing at /admin/governance', () => {
    expect(source).toMatch(/id:\s*'governance',/);
    expect(source).toMatch(/label:\s*'Privacy & Governance',/);
    expect(source).toContain("href: '/admin/governance'");
  });

  it('the group label does not collide with COMPANY_ADMIN\'s pre-existing "Governance" heading', () => {
    // COMPANY_ADMIN already has its own unrelated 'Governance' heading
    // (/company/profile) — reusing the bare word for the admin platform-wide
    // register would create exactly the kind of cross-role naming ambiguity
    // tests/unit/bfix-company-admin-nav-guard.test.ts guards against.
    expect(source).not.toMatch(/label:\s*'Governance',/);
  });

  it('the governance group is not nested inside Operations/KORA Link items', () => {
    const groupMatch = source.match(/\{\s*id:\s*'governance',[\s\S]*?\n {2}\},/);
    expect(groupMatch, 'governance group block not found').toBeTruthy();
    expect(groupMatch![0]).not.toMatch(/KORA Link/);
  });
});

describe('Governance UI 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
  it('034/035/036 are still readable under supabase/proposed/', () => {
    for (const file of [
      'supabase/migrations/034_kora_link_schema.sql',
      'supabase/migrations/035_kora_link_rls.sql',
      'supabase/migrations/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
  });

  it('worker self-select on link_assignments remains commented out (inactive)', () => {
    const rls = readSource('supabase/migrations/035_kora_link_rls.sql');
    expect(rls).toMatch(/Worker SELECT self-only — BLOCKED until activation function is ready/);
    expect(rls).toMatch(/-- CREATE POLICY "kl_assignments_worker_self_select"/);
  });

  it('no direct company-facing table SELECT policy exists or is planned', () => {
    const rls = readSource('supabase/migrations/035_kora_link_rls.sql');
    expect(rls).toMatch(/No\s*\n?-- direct company table SELECT policy exists here or is planned/);
  });
});
