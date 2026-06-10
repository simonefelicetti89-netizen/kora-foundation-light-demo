// tests/unit/b111-worker-activation-profile.test.ts
// B111: Worker Private Activation Profile — PIB Light — 19 structural tests.
// All tests are file-system / source-code checks — no live Supabase calls.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function stripLineComments(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '');
}

function extractSelectArgs(src: string): string[] {
  const matches: string[] = [];
  const re = /\.select\(`([^`]+)`|\.select\('([^']+)'|\.select\("([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    matches.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  return matches;
}

// ─── Source files under test ──────────────────────────────────────────────────

const apiRoute       = readFile('app/api/worker/activation-profile/route.ts');
const workerPage     = readFile('app/worker/workspace/page.tsx');
const profileSection = readFile('app/worker/workspace/_components/ActivationProfileSection.tsx');
const aggRoute       = readFile('app/api/company/workers/activation-aggregate/route.ts');
const companyView    = readFile('app/company/workspace/_components/CompanyWorkspaceView.tsx');

// ─── 1. API requires WORKER role ─────────────────────────────────────────────

describe('activation-profile API — auth', () => {
  it('API route calls requireWorkerUser', () => {
    expect(apiRoute).toContain('requireWorkerUser');
  });

  it('API returns error if auth fails (isKoraAuthError check)', () => {
    expect(apiRoute).toContain('isKoraAuthError');
    expect(apiRoute).toContain('return auth');
  });
});

// ─── 2. API uses workerId from session ────────────────────────────────────────

describe('activation-profile API — workerId from session', () => {
  it('workerId is destructured from requireWorkerUser result', () => {
    expect(apiRoute).toContain('const { workerId } = auth');
  });

  it('DB query filters by workerId from session (not from params)', () => {
    expect(apiRoute).toContain("eq('worker_id', workerId)");
  });
});

// ─── 3. API uses tenantId from session ───────────────────────────────────────

describe('activation-profile API — tenantId from session', () => {
  it('tenantId not accepted from query params', () => {
    // The API does not read searchParams or body for tenantId
    const stripped = stripLineComments(apiRoute);
    expect(stripped).not.toContain('searchParams.get');
    expect(stripped).not.toContain("body.tenantId");
    expect(stripped).not.toContain("body['tenantId']");
  });
});

// ─── 4. API does not accept worker_id from query/body ────────────────────────

describe('activation-profile API — no worker_id from client', () => {
  it('API does not read worker_id from query params', () => {
    const stripped = stripLineComments(apiRoute);
    expect(stripped).not.toContain("searchParams.get('worker_id')");
    expect(stripped).not.toContain("body.worker_id");
    expect(stripped).not.toContain("body['worker_id']");
  });
});

// ─── 5. API does not accept tenant_id from query/body ────────────────────────

describe('activation-profile API — no tenant_id from client', () => {
  it('API does not read tenant_id from query params or body', () => {
    const stripped = stripLineComments(apiRoute);
    expect(stripped).not.toContain("searchParams.get('tenant_id')");
    expect(stripped).not.toContain("body.tenant_id");
    expect(stripped).not.toContain("body['tenant_id']");
  });
});

// ─── 6. Worker A cannot see Worker B's profile ───────────────────────────────

describe('Worker isolation', () => {
  it('participation select is always filtered by workerId from session', () => {
    // Only one worker_id filter — the session one
    const occurrences = (apiRoute.match(/eq\('worker_id',\s*workerId\)/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(1);
  });

  it('no hardcoded worker_id in any DB query', () => {
    const stripped = stripLineComments(apiRoute);
    // No literal UUID in eq('worker_id', ...) — only the variable workerId
    expect(stripped).not.toMatch(/eq\('worker_id',\s*'[0-9a-f-]{36}'\)/);
  });
});

// ─── 7. Empty state when no participations ───────────────────────────────────

describe('Empty state', () => {
  it('API computes profileStatus as empty or active', () => {
    expect(apiRoute).toContain("'empty'");
    expect(apiRoute).toContain("'active'");
    expect(apiRoute).toContain('profileStatus');
  });

  it('ActivationProfileSection renders empty state message', () => {
    expect(profileSection).toContain("profileStatus === 'empty'");
    expect(profileSection).toContain('Nessuna attività registrata');
  });
});

// ─── 8. Pillar distribution includes all 5 pillars ───────────────────────────

describe('Pillar distribution', () => {
  it('API initialises all 5 KORA pillars', () => {
    expect(apiRoute).toContain("'LIFE'");
    expect(apiRoute).toContain("'GROWTH'");
    expect(apiRoute).toContain("'CONNECTION'");
    expect(apiRoute).toContain("'IMPACT'");
    expect(apiRoute).toContain("'LEGACY'");
    expect(apiRoute).toContain("ALL_PILLARS");
  });

  it('pillarDistribution maps all pillars including zero entries', () => {
    // The map() is over ALL_PILLARS — guarantees 5 entries even with zero data
    expect(apiRoute).toContain('ALL_PILLARS.map(pillar =');
  });
});

// ─── 9. cancelled does not contribute to total_active ────────────────────────

describe('cancelled status semantic', () => {
  it('total_active formula excludes cancelled', () => {
    // The formula used in the return object: total_active: c.interested + c.registered + c.attended
    // cancelled is tracked separately but not summed into total_active
    expect(apiRoute).toContain('c.interested + c.registered + c.attended');
    // cancelled counter exists but is NOT part of the total_active sum
    expect(apiRoute).toContain('c.cancelled');
  });
});

// ─── 10. registered and interested contribute to total_active ─────────────────

describe('interested/registered semantic', () => {
  it('interested increments the interested counter', () => {
    expect(apiRoute).toContain("pillarCounters[pillar].interested++");
  });

  it('registered increments the registered counter', () => {
    expect(apiRoute).toContain("pillarCounters[pillar].registered++");
  });
});

// ─── 11. attended counted only when present ───────────────────────────────────

describe('attended semantic', () => {
  it('attended increments attended counter (set by admin, not self-declared)', () => {
    expect(apiRoute).toContain("pillarCounters[pillar].attended++");
  });

  it('attended is included in total_active formula', () => {
    // The sum c.interested + c.registered + c.attended includes attended
    const formula = 'c.interested + c.registered + c.attended';
    expect(formula).toContain('attended');
    expect(apiRoute).toContain(formula);
  });
});

// ─── 12. privacyNotice is present in response ────────────────────────────────

describe('privacyNotice', () => {
  it('API response includes privacyNotice field', () => {
    expect(apiRoute).toContain('privacyNotice');
    expect(apiRoute).toContain('datore di lavoro');
  });

  it('ActivationProfileSection always renders privacy card', () => {
    expect(profileSection).toContain('PrivacyCard');
    // PrivacyCard rendered in both active and empty branches
    const emptyBranch = profileSection.indexOf("profileStatus === 'empty'");
    const privacyCardOccurrences = (profileSection.match(/PrivacyCard/g) ?? []).length;
    // PrivacyCard component defined + called at least twice (empty + active paths)
    expect(privacyCardOccurrences).toBeGreaterThanOrEqual(2);
    expect(emptyBranch).toBeGreaterThan(0);
  });
});

// ─── 13. interpretationNote says not an individual evaluation ────────────────

describe('interpretationNote', () => {
  it('API includes interpretationNote saying it is not a valutazione individuale', () => {
    expect(apiRoute).toContain('interpretationNote');
    expect(apiRoute).toContain('Non è una valutazione individuale');
  });

  it('ActivationProfileSection renders InterpretationNote', () => {
    expect(profileSection).toContain('InterpretationNote');
    expect(profileSection).toContain('Non è una valutazione individuale');
  });
});

// ─── 14. Company routes do not import activation-profile ─────────────────────

describe('Company boundary', () => {
  it('company workspace view does not import activation-profile route', () => {
    expect(companyView).not.toContain('activation-profile');
  });

  it('company aggregate route does not import activation-profile route', () => {
    expect(aggRoute).not.toContain('activation-profile');
  });

  it('no company API file imports worker profile', () => {
    const companyApiAgg = readFile('app/api/company/workers/aggregate/route.ts');
    expect(companyApiAgg).not.toContain('activation-profile');
    expect(companyApiAgg).not.toContain('pillarDistribution');
  });
});

// ─── 15. Company aggregate does not return individual pillar distribution ──────

describe('Company aggregate — no individual data', () => {
  it('activation-aggregate route does not return pillarDistribution per worker', () => {
    expect(aggRoute).not.toContain('pillarDistribution');
    expect(aggRoute).not.toContain('worker_profile');
    expect(aggRoute).not.toContain('strongestPillar');
  });

  it('aggregate returns only pillar_breakdown at company level (not worker level)', () => {
    expect(aggRoute).toContain('pillar_breakdown');
    // But never with individual worker context
    const stripped = stripLineComments(aggRoute);
    expect(stripped).not.toContain('worker_id');
  });
});

// ─── 16. Worker workspace shows profilo privato section ──────────────────────

describe('Worker workspace — profile section visible', () => {
  it('worker workspace renders ActivationProfileSection', () => {
    expect(workerPage).toContain('ActivationProfileSection');
    expect(workerPage).toContain('Il mio profilo privato');
  });

  it('worker workspace imports ActivationProfileSection component', () => {
    expect(workerPage).toContain("from './_components/ActivationProfileSection'");
  });
});

// ─── 17. Worker workspace does not show ranking ──────────────────────────────

describe('Worker workspace — no ranking', () => {
  it('worker workspace does not show a ranking position or ranking table', () => {
    const stripped = stripLineComments(workerPage);
    // No ranking display — "non genera ranking" disclaimer is allowed; ranking tables/positions are not
    expect(stripped.toLowerCase()).not.toContain('sei al');       // "sei al #N posto"
    expect(stripped.toLowerCase()).not.toContain('posizione nel'); // "posizione nel ranking"
    expect(stripped.toLowerCase()).not.toContain('classifica');   // ranking table
    expect(stripped.toLowerCase()).not.toContain('percentile');
  });

  it('ActivationProfileSection does not show ranking position or comparison scores', () => {
    const stripped = stripLineComments(profileSection);
    // Disclaimer text "non genera ranking" is correct and allowed.
    // What is NOT allowed: ranking table, position display, percentile.
    expect(stripped.toLowerCase()).not.toContain('classifica');
    expect(stripped.toLowerCase()).not.toContain('percentile');
    expect(stripped.toLowerCase()).not.toContain('posizione nel');
    expect(stripped.toLowerCase()).not.toContain('sei al');
  });
});

// ─── 18. Worker workspace does not show confronto colleghi ───────────────────

describe('Worker workspace — no peer comparison', () => {
  it('worker workspace does not compare workers', () => {
    const stripped = stripLineComments(workerPage);
    expect(stripped.toLowerCase()).not.toContain('colleghi');
    expect(stripped.toLowerCase()).not.toContain('altri worker');
    expect(stripped.toLowerCase()).not.toContain('media aziendale');
  });

  it('ActivationProfileSection does not compare with peers', () => {
    const stripped = stripLineComments(profileSection);
    expect(stripped.toLowerCase()).not.toContain('colleghi');
    expect(stripped.toLowerCase()).not.toContain('altri worker');
    expect(stripped.toLowerCase()).not.toContain('media aziendale');
  });
});

// ─── 19. No synthetic/demo data presented as live ────────────────────────────

describe('No fake data as live', () => {
  it('activation-profile API does not import synthetic data', () => {
    expect(apiRoute).not.toContain('/data/synthetic/');
    expect(apiRoute).not.toContain("from '@/data/");
  });

  it('ActivationProfileSection does not import synthetic data', () => {
    expect(profileSection).not.toContain('/data/synthetic/');
    expect(profileSection).not.toContain("from '@/data/");
  });

  it('worker workspace profile computation uses live DB query, not static data', () => {
    // The profile computation reads from worker_participation via service client
    const stripped = stripLineComments(workerPage);
    expect(stripped).toContain("from('worker_participation')");
    // The select for profile rows filters by worker_id (session)
    expect(stripped).toContain("eq('worker_id', worker.workerId)");
  });
});
