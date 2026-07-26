/**
 * KORA Link — multi-stakeholder no-DB shell guards (KORA-LINK-SHELL-01).
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the hard rules from the
 * KORA-LINK-SHELL-01 task: these shells must stay pure UI/UX preview
 * (no DB, no RLS, no RPC, no feature-flag enabling, no individual worker
 * visibility) and must not silently drift toward "coming soon" wording
 * outside the established `preview` nav convention.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const SHELL_PAGES = [
  'app/company/kora-link/campaigns/page.tsx',
  'app/worker/kora-link/activate/page.tsx',
  'app/partner/kora-link/initiatives/page.tsx',
  'app/admin/kora-link/governance/page.tsx',
];

describe('KORA Link shell 01 — all stakeholder shell pages exist and are readable', () => {
  for (const page of SHELL_PAGES) {
    it(`${page} exists`, () => {
      expect(() => readSource(page)).not.toThrow();
    });
  }
});

describe('KORA Link shell 01 — every shell carries an explicit "demo shell / no DB / not active" banner', () => {
  for (const page of SHELL_PAGES) {
    it(`${page} declares itself a non-active design preview`, () => {
      const source = readSource(page);
      expect(source).toMatch(/Anteprima design/);
      expect(source).toMatch(/no DB/);
      expect(source).toMatch(/Non attivo\./);
    });
  }
});

describe('KORA Link shell 01 — no shell page touches Supabase, RLS, or RPC', () => {
  const forbiddenImportPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
  ];

  for (const page of SHELL_PAGES) {
    it(`${page} never imports a Supabase client or calls .rpc()`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenImportPatterns) {
        expect(pattern.test(source), `${page} must not match ${pattern}`).toBe(false);
      }
    });
  }
});

describe('KORA Link shell 01 — no shell page enables a feature flag or uncomments a policy', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  for (const page of SHELL_PAGES) {
    it(`${page} does not hardcode any KORA Link feature flag to true`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});

describe('KORA Link shell 01 — company/worker/partner shells never reference an individual worker identifier as code', () => {
  const stakeholderPages = [
    'app/company/kora-link/campaigns/page.tsx',
    'app/worker/kora-link/activate/page.tsx',
    'app/partner/kora-link/initiatives/page.tsx',
  ];
  const forbiddenCodePatterns = [
    /\bworkerId\s*[:=]/,
    /\.workerId\b/,
    /\bworker_id\s*[:=]/,
    /\.worker_id\b/,
    /\bworkerName\s*[:=]/,
    /\.workerName\b/,
    /\btagUid\s*[:=]/,
    /\btag_uid\s*[:=]/,
  ];

  for (const page of stakeholderPages) {
    it(`${page} source contains no individual worker/tag identifier used as code`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenCodePatterns) {
        expect(pattern.test(source), `${page} must never reference ${pattern} as code`).toBe(false);
      }
    });
  }
});

describe('KORA Link shell 01 — company and partner shells state "no individual visibility" explicitly', () => {
  it('company campaigns shell has an explicit no-individual-visibility panel', () => {
    const source = readSource('app/company/kora-link/campaigns/page.tsx');
    expect(source).toMatch(/Nessuna visibilità individuale/);
  });

  it('partner initiatives shell states privacy-safe interaction with no worker identity exposure', () => {
    const source = readSource('app/partner/kora-link/initiatives/page.tsx');
    expect(source).toMatch(/Interazione privacy-safe/);
    expect(source).toMatch(/nessun profilo worker/);
  });
});

describe('KORA Link shell 01 — worker activation shell is auth-gated and does not perform a real activation', () => {
  it('requires a real worker session via requireWorkerUser()', () => {
    const source = readSource('app/worker/kora-link/activate/page.tsx');
    expect(source).toMatch(/requireWorkerUser\(\)/);
    expect(source).toMatch(/isKoraAuthError/);
  });

  it('the activation control is disabled — no real activation call exists', () => {
    const source = readSource('app/worker/kora-link/activate/page.tsx');
    expect(source).toMatch(/disabled\s*\n\s*title="Non attivo in questa anteprima/);
    expect(source).not.toMatch(/fetch\(/);
    expect(source).not.toMatch(/onClick=/);
  });

  it('consent text is explicitly flagged as pending DPO review, not final', () => {
    const source = readSource('app/worker/kora-link/activate/page.tsx');
    expect(source).toMatch(/attesa di revisione DPO/);
  });
});

describe('KORA Link shell 01 — governance register keeps every listed decision open, resolves none', () => {
  const source = readSource('app/admin/kora-link/governance/page.tsx');

  it('covers the six named open governance questions', () => {
    for (const topic of [
      'consent-text',
      'retention',
      'request-fingerprint-hashing',
      'aggregate-threshold',
      'delivered-to-label-semantics',
      'break-glass-procedure',
    ]) {
      expect(source).toContain(`id: '${topic}'`);
    }
  });

  it('every decision renders as open/pending via a single shared status badge, never resolved/closed', () => {
    // All six decisions share one "Aperta / pending" render path (mapped, not
    // per-item hardcoded) — so it appears once in source but applies to all.
    expect(source).toContain('Aperta / pending');
    const decisionIdCount = (source.match(/id: '[a-z-]+',/g) ?? []).length;
    expect(decisionIdCount).toBe(6);
    expect(source).not.toMatch(/status:\s*['"]resolved['"]/i);
    expect(source).not.toMatch(/status:\s*['"]closed['"]/i);
    expect(source).not.toMatch(/status:\s*['"]decided['"]/i);
  });

  it('states explicitly that no CTO/DPO decision is made or implied by the page', () => {
    expect(source).toMatch(/Nessuna decisione CTO o DPO viene presa o implicata/);
  });
});

describe('KORA Link shell 01 — navigation uses the established preview convention, not ad-hoc "coming soon" wording', () => {
  it('Sidebar.tsx marks all three new stakeholder routes as preview', () => {
    const source = readSource('components/layout/Sidebar.tsx');
    expect(source).toMatch(/'\/company\/kora-link\/campaigns',[^}]*preview: true/);
    expect(source).toMatch(/'\/worker\/kora-link\/activate',[^}]*preview: true/);
    expect(source).toMatch(/'\/partner\/kora-link\/initiatives',[^}]*preview: true/);
  });

  it('no new KORA Link nav entry uses "prossimamente" wording', () => {
    const sidebar = readSource('components/layout/Sidebar.tsx');
    const adminNav = readSource('lib/navigation/admin-nav-groups.ts');
    for (const [file, source] of [['Sidebar.tsx', sidebar], ['admin-nav-groups.ts', adminNav]] as const) {
      const koraLinkLines = source.split('\n').filter((line) => /kora-link/i.test(line));
      for (const line of koraLinkLines) {
        expect(line.toLowerCase(), `${file}: "${line.trim()}" must not use "prossimamente"`).not.toMatch(/prossimamente/);
      }
    }
  });

  it('admin-nav-groups.ts registers the governance register with a clear preview label', () => {
    const source = readSource('lib/navigation/admin-nav-groups.ts');
    expect(source).toMatch(/KORA Link — Governance \(Anteprima\)/);
    expect(source).toContain("href: '/admin/kora-link/governance'");
  });
});

describe('KORA Link shell polish 01 — no visible CTA label contains the debug-flavored "(mock)" suffix', () => {
  for (const page of SHELL_PAGES) {
    it(`${page} has no <button> block containing "(mock"`, () => {
      const source = readSource(page);
      const buttonBlocks = source.match(/<button[\s\S]*?<\/button>/g) ?? [];
      for (const block of buttonBlocks) {
        expect(block.toLowerCase(), `${page}: a <button> block must not contain "(mock"`).not.toContain('(mock');
      }
    });
  }
});

describe('KORA Link shell polish 01 — worker copy never exposes raw /link/<token> route syntax', () => {
  it('app/worker/kora-link/activate/page.tsx describes activation in plain language, not URL syntax', () => {
    const source = readSource('app/worker/kora-link/activate/page.tsx');
    expect(source).not.toMatch(/\/link\/&lt;token&gt;/);
    expect(source).not.toMatch(/\/link\/<token>/);
  });
});

describe('KORA Link shell polish 01 — partner shell has workflow explanation and CTA parity with company', () => {
  const source = readSource('app/partner/kora-link/initiatives/page.tsx');

  it('has a "Come funziona per il partner" explanatory panel', () => {
    expect(source).toContain('Come funziona per il partner');
  });

  it('has at least one disabled CTA, matching the company/worker interaction pattern', () => {
    const buttonBlocks = source.match(/<button[\s\S]*?<\/button>/g) ?? [];
    expect(buttonBlocks.length).toBeGreaterThan(0);
    expect(buttonBlocks.some((b) => /disabled/.test(b))).toBe(true);
  });

  it('reinforces no worker identity, no individual scan/activation event, aggregate-only insight', () => {
    expect(source).toMatch(/nessun profilo worker/);
    expect(source).toMatch(/nessun evento di scansione o attivazione individuale/);
    expect(source).toMatch(/segnali aggregati/);
  });
});

describe('KORA Link shell polish 01 — governance decisions are grouped, not a flat undifferentiated list', () => {
  const source = readSource('app/admin/kora-link/governance/page.tsx');

  it('groups OPEN_DECISIONS by owner via a derived OWNER_GROUPS list', () => {
    expect(source).toMatch(/OWNER_GROUPS/);
    expect(source).toMatch(/OPEN_DECISIONS\.filter\(\(d\) => d\.owner === owner\)/);
  });

  it('still renders all six decisions as open/pending after grouping (no data lost, none resolved)', () => {
    const decisionIdCount = (source.match(/id: '[a-z-]+',/g) ?? []).length;
    expect(decisionIdCount).toBe(6);
    expect(source).toContain('Aperta / pending');
    expect(source).not.toMatch(/status:\s*['"]resolved['"]/i);
    expect(source).not.toMatch(/status:\s*['"]closed['"]/i);
  });

  it('still states explicitly that no CTO/DPO decision is made or implied', () => {
    expect(source).toMatch(/Nessuna decisione CTO o DPO viene presa o implicata/);
  });
});

describe('KORA Link shell polish 01 — worker DPO-pending consent placeholder survives the copy cleanup', () => {
  it('consent text is still explicitly flagged as pending DPO review, not final, not binding', () => {
    const source = readSource('app/worker/kora-link/activate/page.tsx');
    expect(source).toMatch(/attesa di revisione DPO/);
    expect(source).toMatch(/non è\s*\n?\s*ancora stato approvato/);
    expect(source).toMatch(/provvisoria e non vincolante/);
  });
});

// Promoted by KORA-LINK-MIGRATION-FORMALIZATION-12 (2026-07-26): 034/035/036
// now live under supabase/migrations/, not supabase/proposed/ — see
// docs/KORA_LINK_GATE_4_FINAL_REPORT.md. The admin control tower page below
// was not touched by the promotion and still displays its prior copy.
describe('KORA Link shell 01 — canonical SQL remains untouched', () => {
  it('034/035/036 are canonical files, present under supabase/migrations/', () => {
    for (const file of [
      'supabase/migrations/034_kora_link_schema.sql',
      'supabase/migrations/035_kora_link_rls.sql',
      'supabase/migrations/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
    const controlTower = readSource('app/admin/kora-link/page.tsx');
    expect(controlTower).toMatch(/Schema 034[\s\S]{0,40}proposed, non applicato/);
    expect(controlTower).toMatch(/RLS 035[\s\S]{0,40}proposed, non applicato/);
    expect(controlTower).toMatch(/RPC 036[\s\S]{0,40}proposed, non applicato/);
  });
});
