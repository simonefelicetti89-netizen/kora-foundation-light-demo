/**
 * KORA-LINK-PILOT-READINESS-CHECKLIST-01 — read-only admin/founder checklist
 * before the final manual NFC chip test.
 *
 * Static/structural only — reads source text, no live Supabase, no DB.
 * Covers the 32 assertions from the sprint task: page existence, KORA_ADMIN-only
 * guard (via app/admin/layout.tsx), read-only-ness (no forms, no mutation, no
 * flag writes), required checklist content (runtime status, governance
 * blockers, worker privacy, NFC test scope/non-scope), and non-regression on
 * migrations, 034/035/036, KORA Index, ingestion/UEF, access-matrix, commons.*,
 * NFC-writing code, the existing worker KORA Link page, and bulk provisioning.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const CHECKLIST = 'app/admin/kora-link/pilot-readiness/page.tsx';
const ADMIN_LAYOUT = 'app/admin/layout.tsx';
const WORKER_KORA_LINK = 'app/worker/kora-link/activate/page.tsx';
const BULK_PROVISION_ROUTE = 'app/api/admin/workers/bulk-provision/route.ts';
const BULK_PROVISION_UI = 'app/admin/workers/bulk/page.tsx';

describe('1. checklist page exists', () => {
  it('app/admin/kora-link/pilot-readiness/page.tsx exists', () => {
    expect(() => readSource(CHECKLIST)).not.toThrow();
  });
});

describe('2. checklist page is KORA_ADMIN-only', () => {
  it('lives under /admin, protected by app/admin/layout.tsx requireKoraAdmin', () => {
    const layout = readSource(ADMIN_LAYOUT);
    expect(layout).toMatch(/requireKoraAdmin\(\)/);
    expect(layout).toMatch(/isKoraAuthError/);
  });
});

describe('3-5. checklist page is read-only: no forms, no mutation methods', () => {
  it('contains no <form> element', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/<form/i);
  });
  it('contains no POST/PATCH/DELETE/PUT fetch or method reference', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/method:\s*['"]POST['"]/i);
    expect(source).not.toMatch(/method:\s*['"]PATCH['"]/i);
    expect(source).not.toMatch(/method:\s*['"]DELETE['"]/i);
    expect(source).not.toMatch(/method:\s*['"]PUT['"]/i);
    expect(source).not.toMatch(/fetch\(/);
  });
  it('contains no onClick handler, no <button> submit, no input/textarea', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/onClick=/);
    expect(source).not.toMatch(/<button/i);
    expect(source).not.toMatch(/<input/i);
    expect(source).not.toMatch(/<textarea/i);
  });
});

describe('6-9. checklist page does not modify or enable KORA Link flags', () => {
  it('never sets or modifies an env flag', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/process\.env\.\w+\s*=/);
  });
  it('never hardcodes KORA_LINK_ENABLED to true', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/);
  });
  it('never hardcodes KORA_LINK_DB_LOOKUP_ENABLED to true', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/);
  });
  it('never hardcodes KORA_LINK_ACTIVATION_ENABLED to true', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/);
  });
});

describe('10-13. checklist states public route gated, DB lookup/activation off, 034/035/036 blockers', () => {
  const source = readSource(CHECKLIST);
  it('states the public link route is feature-gated', () => {
    expect(source).toMatch(/feature-gated/);
  });
  it('states DB lookup remains off', () => {
    expect(source).toContain('KORA_LINK_DB_LOOKUP_ENABLED deve restare off');
  });
  it('states activation remains off', () => {
    expect(source).toContain('KORA_LINK_ACTIVATION_ENABLED deve restare off');
  });
  it('states 034/035/036 remain blockers', () => {
    expect(source).toMatch(/Schema 034[\s\S]{0,20}proposed, non applicato/);
    expect(source).toMatch(/RLS 035[\s\S]{0,20}proposed, non applicato/);
    expect(source).toMatch(/RPC 036[\s\S]{0,20}proposed, non applicato/);
  });
});

describe('14-16. worker privacy statements', () => {
  const source = readSource(CHECKLIST);
  it('states the company sees aggregate-only outputs', () => {
    expect(source).toMatch(/azienda vede solo output aggregati/);
  });
  it('states individual worker actions are not shown to the company', () => {
    expect(source).toMatch(/azioni individuali del worker non sono mostrate all.?azienda/);
  });
  it('states the NFC URL must not contain sensitive data', () => {
    expect(source).toMatch(/URL NFC non deve includere nome\/email\/dati sensibili/);
  });
});

describe('17-18. final NFC test scope and non-scope', () => {
  const source = readSource(CHECKLIST);
  it('states the test proves only chip → URL → skeleton route (no DB lookup, no activation, no event, no KORA Index effect)', () => {
    expect(source).toMatch(/Il chip apre un URL a marchio KORA/);
    expect(source).toMatch(/risolve alla pagina skeleton/);
    expect(source).toMatch(/Nessun DB lookup viene eseguito/);
    expect(source).toMatch(/Nessuna attivazione viene eseguita/);
    expect(source).toMatch(/Nessun evento viene creato/);
    expect(source).toMatch(/Nessun effetto sul KORA Index/);
  });
  it('states the test does not prove worker claim / Contribution / KORA Index integration', () => {
    expect(source).toMatch(/Nessun claim di identità worker/);
    expect(source).toMatch(/Nessuna attribuzione di evento Contribution/);
    expect(source).toMatch(/Nessuna integrazione con il KORA Index/);
  });
});

describe('19-20. no claim KORA Link feeds KORA Index or Contribution is automatic today', () => {
  const source = readSource(CHECKLIST);
  it('explicitly states KORA Link does not feed the KORA Index today', () => {
    expect(source).toMatch(/KORA Link non alimenta il KORA Index oggi/);
  });
  it('explicitly states Contribution is not automatic today', () => {
    expect(source).toMatch(/Contribution non è automatico oggi/);
  });
});

describe('21-23. migrations, proposed SQL, and 034/035/036 untouched', () => {
  // Promoted by KORA-LINK-MIGRATION-FORMALIZATION-12 (2026-07-26): 034/035/036
  // now live under supabase/migrations/, not supabase/proposed/ — see
  // docs/KORA_LINK_GATE_4_FINAL_REPORT.md. Unmodified in scope still holds:
  // no schema/logic content changed by the promotion.
  it('034/035/036 canonical SQL files still exist, unmodified in scope', () => {
    for (const file of [
      'supabase/migrations/034_kora_link_schema.sql',
      'supabase/migrations/035_kora_link_rls.sql',
      'supabase/migrations/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
  });
  it('checklist page never references supabase/migrations or writes to supabase/proposed', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/supabase\/migrations/);
    expect(source).not.toMatch(/writeFileSync/);
  });
});

describe('24-25. no KORA Index / ingestion / UEF files referenced', () => {
  it('checklist page does not import the KORA Index engine or ingestion/UEF modules', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/from ['"]@\/lib\/kora-engine/);
    expect(source).not.toMatch(/from ['"]@\/lib\/ingestion/);
    expect(source).not.toMatch(/from ['"]@\/lib\/uef/);
  });
});

describe('26. access-matrix code unchanged', () => {
  it('access-matrix.ts still defines worker_individual_pib (regression lock)', () => {
    const source = readSource('lib/auth/access-matrix.ts');
    expect(source).toContain('worker_individual_pib');
  });
});

describe('27. no RLS policies created', () => {
  it('checklist page contains no CREATE POLICY', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/CREATE POLICY/i);
  });
});

describe('28. no companion score or separate activation score introduced', () => {
  it('checklist page does not introduce a companion_score or separate activation score concept', () => {
    const source = readSource(CHECKLIST);
    expect(source.toLowerCase()).not.toMatch(/companion[_ ]score/);
    expect(source.toLowerCase()).not.toMatch(/separate activation score/);
  });
});

describe('29. commons.post / commons.booking / commons.contribution_event untouched', () => {
  it('checklist page does not reference commons.post, commons.booking, or commons.contribution_event', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/commons\.post/);
    expect(source).not.toMatch(/commons\.booking/);
    expect(source).not.toMatch(/commons\.contribution_event/);
  });
});

describe('30. no NFC chip writing code added', () => {
  it('checklist page never calls Web NFC write APIs and never writes a chip', () => {
    const source = readSource(CHECKLIST);
    expect(source).not.toMatch(/NDEFReader|navigator\.nfc|new NDEFMessage/i);
    expect(source).not.toMatch(/\.write\(/);
  });
});

describe('31. existing worker KORA Link page remains intact', () => {
  it('app/worker/kora-link/activate/page.tsx still requires a real worker session and keeps its disabled activation button', () => {
    const source = readSource(WORKER_KORA_LINK);
    expect(source).toMatch(/requireWorkerUser\(\)/);
    expect(source).toMatch(/disabled\s*\n\s*title="Non attivo in questa anteprima/);
    expect(source).not.toMatch(/fetch\(/);
  });
});

describe('32. existing bulk worker provisioning remains intact', () => {
  it('bulk-provision API route and admin UI still exist', () => {
    expect(() => readSource(BULK_PROVISION_ROUTE)).not.toThrow();
    expect(() => readSource(BULK_PROVISION_UI)).not.toThrow();
  });
  it('bulk-provision route is still KORA_ADMIN-gated', () => {
    const source = readSource(BULK_PROVISION_ROUTE);
    expect(source).toMatch(/requireKoraAdmin/);
  });
});

describe('checklist navigation — safe cross-links only, no worker-links-in-admin-page violation', () => {
  const source = readSource(CHECKLIST);
  it('links to KORA Link lab, governance register, companies/new, and workers/bulk', () => {
    expect(source).toContain("href=\"/admin/kora-link-lab\"");
    expect(source).toContain("href=\"/admin/kora-link/governance\"");
    expect(source).toContain("href=\"/admin/companies/new\"");
    expect(source).toContain("href=\"/admin/workers/bulk\"");
  });
  it('references /worker/kora-link/activate only as a route reference (in <code>), not an admin-impersonation link', () => {
    expect(source).toContain('<code>/worker/kora-link/activate</code>');
    expect(source).not.toContain('href="/worker/kora-link/activate"');
  });
});
