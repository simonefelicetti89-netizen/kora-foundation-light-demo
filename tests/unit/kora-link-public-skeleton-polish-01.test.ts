/**
 * KORA-LINK-PUBLIC-SKELETON-POLISH-01 — public /link/[token] skeleton page polish.
 *
 * Static/structural only — reads source text, no live Supabase, no DB, no
 * browser render. Covers the 35 assertions from the sprint task: page
 * existence, unchanged feature-gate evaluator usage, no DB lookup/activation/
 * event/Contribution/KORA Index code, no worker PII, no token internals
 * exposed, all required skeleton copy present, and non-regression on
 * migrations, 034/035/036, KORA Index, ingestion/UEF, access-matrix, commons.*,
 * NFC-writing code, the existing worker KORA Link page, and the admin
 * readiness checklist.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const PUBLIC_PAGE = 'app/link/[token]/page.tsx';
const WORKER_KORA_LINK = 'app/worker/kora-link/activate/page.tsx';
const ADMIN_CHECKLIST = 'app/admin/kora-link/pilot-readiness/page.tsx';

describe('1. public /link/[token] page exists', () => {
  it('app/link/[token]/page.tsx exists', () => {
    expect(() => readSource(PUBLIC_PAGE)).not.toThrow();
  });
});

describe('2-3. feature gate behavior unchanged, uses existing route state evaluator', () => {
  it('still imports and calls evaluateKoraLinkPublicRouteState from lib/kora-link/public-route', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).toContain("from '@/lib/kora-link/public-route'");
    expect(source).toMatch(/evaluateKoraLinkPublicRouteState\(/);
  });
  it('still branches on hidden/token_invalid/unavailable/rate_limited/ready/skeleton states, unchanged', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).toMatch(/result\.state === 'hidden'/);
    expect(source).toMatch(/result\.state === 'token_invalid'/);
    expect(source).toMatch(/result\.state === 'unavailable'/);
    expect(source).toMatch(/result\.state === 'rate_limited'/);
    expect(source).toMatch(/result\.state === 'ready'/);
    expect(source).toMatch(/notFound\(\)/);
  });
  it('lib/kora-link/public-route.ts route evaluator itself is untouched (gate order intact)', () => {
    const source = readSource('lib/kora-link/public-route.ts');
    expect(source).toMatch(/if \(!isKoraLinkEnabled\(env\)\) {\s*return { state: 'hidden' };/);
    expect(source).toMatch(/if \(!isKoraLinkDbLookupEnabled\(env\)\) {\s*return { state: 'skeleton' };/);
  });
});

describe('4-9. no DB/activation/event/Contribution/KORA Index code added to the skeleton page', () => {
  it('page does not import a Supabase client', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).not.toMatch(/from ['"]@\/lib\/supabase/);
    expect(source).not.toMatch(/from ['"]@supabase\/supabase-js['"]/);
    expect(source).not.toMatch(/getSupabaseServiceClient/);
    expect(source).not.toMatch(/getSupabaseServerClient/);
  });
  it('page does not call DB lookup or activation functions from the skeleton branch', () => {
    // Isolate the skeleton component body only — the 'ready' page legitimately
    // renders an activation form elsewhere in this same file (pre-existing, KL-22).
    const source = readSource(PUBLIC_PAGE);
    const skeletonFnMatch = source.match(/function KoraLinkSkeletonPage\(\)[\s\S]*?\n}\n/);
    expect(skeletonFnMatch).not.toBeNull();
    const skeletonBody = skeletonFnMatch![0];
    expect(skeletonBody).not.toMatch(/lookupKoraLinkPublicState/);
    expect(skeletonBody).not.toMatch(/buildKoraLinkActivationState/);
    expect(skeletonBody).not.toMatch(/\.rpc\(/);
    expect(skeletonBody).not.toMatch(/fetch\(/);
    expect(skeletonBody).not.toMatch(/<form/i);
    expect(skeletonBody).not.toMatch(/<button/i);
  });
  it('page does not create events or Contribution records', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).not.toMatch(/\.insert\(/);
    expect(source).not.toMatch(/\.upsert\(/);
    expect(source).not.toMatch(/contribution_event/);
  });
  it('page does not modify the KORA Index', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).not.toMatch(/from ['"]@\/lib\/kora-engine/);
  });
});

describe('10-11. no worker PII, no token internals exposed in the skeleton', () => {
  it('skeleton page never references worker name/email fields', () => {
    const source = readSource(PUBLIC_PAGE);
    const skeletonBody = source.match(/function KoraLinkSkeletonPage\(\)[\s\S]*?\n}\n/)![0];
    expect(skeletonBody).not.toMatch(/workerName|worker\.email|displayName/);
  });
  it('skeleton component takes no token prop and never interpolates a raw token value', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).toMatch(/return <KoraLinkSkeletonPage \/>;/);
    expect(source).toMatch(/function KoraLinkSkeletonPage\(\)\s*{/);
    const skeletonBody = source.match(/function KoraLinkSkeletonPage\(\)[\s\S]*?\n}\n/)![0];
    expect(skeletonBody).not.toMatch(/\{token\}/);
    expect(skeletonBody).not.toMatch(/params\.token/);
  });
});

describe('12-20. required skeleton copy is present', () => {
  const source = readSource(PUBLIC_PAGE);

  it('states "KORA Link"', () => {
    expect(source).toContain('KORA Link');
  });
  it('states "Accesso sicuro KORA Link"', () => {
    expect(source).toContain('Accesso sicuro KORA Link');
  });
  it('states "Pilot in preparazione"', () => {
    expect(source).toContain('Pilot in preparazione');
  });
  it('states the link contains no name/email/personal data', () => {
    expect(source).toContain('Il link non contiene nome, email o dati personali del lavoratore.');
  });
  it('states no individual activity is shown to the company', () => {
    expect(source).toMatch(/azienda non vede attività individuali del lavoratore/);
  });
  it('states no activations/events/individual data are registered in this phase', () => {
    expect(source).toContain('In questa fase non vengono registrate attivazioni, eventi o dati individuali.');
  });
  it('states opening the link does not modify the KORA Index', () => {
    expect(source).toContain('Questa apertura non modifica il KORA Index.');
  });
  it('states opening the link does not automatically generate a Contribution', () => {
    expect(source).toContain('Questa apertura non genera automaticamente una Contribution.');
  });
  it('states full functionality requires technical/privacy/governance approval', () => {
    expect(source).toContain('La funzionalità completa sarà attivata solo dopo approvazione tecnica, privacy e governance.');
  });
});

describe('21-22. DB lookup / activation status chips present', () => {
  const source = readSource(PUBLIC_PAGE);
  it('states DB lookup is off', () => {
    expect(source).toMatch(/DB lookup['"]?,?\s*value:\s*['"]spento['"]/);
  });
  it('states activation is off', () => {
    expect(source).toMatch(/Attivazione['"]?,?\s*value:\s*['"]spenta['"]/);
  });
});

describe('23-24. no KORA Link flags or gates 034/035/036 touched', () => {
  it('page does not hardcode a KORA Link feature flag to true', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).not.toMatch(/KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/);
    expect(source).not.toMatch(/KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/);
    expect(source).not.toMatch(/KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/);
  });
  // Promoted by KORA-LINK-MIGRATION-FORMALIZATION-12 (2026-07-26): 034/035/036
  // now live under supabase/migrations/, not supabase/proposed/ — see
  // docs/KORA_LINK_GATE_4_FINAL_REPORT.md. Untouched in scope still holds.
  it('034/035/036 canonical SQL files still exist, untouched in scope', () => {
    for (const file of [
      'supabase/migrations/034_kora_link_schema.sql',
      'supabase/migrations/035_kora_link_rls.sql',
      'supabase/migrations/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
  });
});

describe('25-26. no Supabase migrations or proposed SQL touched', () => {
  it('page never references supabase/migrations or writes to supabase/proposed', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).not.toMatch(/supabase\/migrations/);
    expect(source).not.toMatch(/writeFileSync/);
  });
});

describe('27-28. no KORA Index / ingestion / UEF files referenced', () => {
  it('page does not import ingestion/UEF modules', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).not.toMatch(/from ['"]@\/lib\/ingestion/);
    expect(source).not.toMatch(/from ['"]@\/lib\/uef/);
  });
});

describe('29. access-matrix code unchanged', () => {
  it('access-matrix.ts still defines worker_individual_pib (regression lock)', () => {
    const source = readSource('lib/auth/access-matrix.ts');
    expect(source).toContain('worker_individual_pib');
  });
});

describe('30. no RLS policies created', () => {
  it('page contains no CREATE POLICY', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).not.toMatch(/CREATE POLICY/i);
  });
});

describe('31. no companion score or separate activation score introduced', () => {
  it('page does not introduce a companion_score or separate activation score concept', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source.toLowerCase()).not.toMatch(/companion[_ ]score/);
    expect(source.toLowerCase()).not.toMatch(/separate activation score/);
  });
});

describe('32. commons.post / commons.booking / commons.contribution_event untouched', () => {
  it('page does not reference commons.post, commons.booking, or commons.contribution_event', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).not.toMatch(/commons\.post/);
    expect(source).not.toMatch(/commons\.booking/);
    expect(source).not.toMatch(/commons\.contribution_event/);
  });
});

describe('33. no NFC chip writing code added', () => {
  it('page never calls Web NFC write APIs and never writes a chip', () => {
    const source = readSource(PUBLIC_PAGE);
    expect(source).not.toMatch(/NDEFReader|navigator\.nfc|new NDEFMessage/i);
  });
});

describe('34. existing worker KORA Link page remains intact', () => {
  it('app/worker/kora-link/activate/page.tsx still requires a real worker session and keeps its disabled activation button', () => {
    const source = readSource(WORKER_KORA_LINK);
    expect(source).toMatch(/requireWorkerUser\(\)/);
    expect(source).toMatch(/disabled\s*\n\s*title="Non attivo in questa anteprima/);
  });
});

describe('35. existing admin readiness checklist remains intact', () => {
  it('app/admin/kora-link/pilot-readiness/page.tsx still exists and is still read-only', () => {
    const source = readSource(ADMIN_CHECKLIST);
    expect(source).not.toMatch(/<form/i);
    expect(source).not.toMatch(/<button/i);
    expect(source).toContain('KORA Link non alimenta il KORA Index oggi');
  });
});
