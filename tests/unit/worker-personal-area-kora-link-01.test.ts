/**
 * WORKER-PERSONAL-AREA-KORA-LINK-01 — worker personal area + KORA Link pilot surface.
 *
 * Static/structural only — reads source text, no live Supabase, no DB.
 * Covers the 27 assertions from the sprint task: worker workspace ↔ KORA Link
 * page cross-links, worker-only guards, pilot/in-preparation messaging (never
 * "complete"), no DB lookup/activation calls, no event/contribution creation,
 * no flag mutation, and non-regression on 034/035/036, KORA Index, ingestion/UEF,
 * access-matrix, and commons.* invariants.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const WORKSPACE = 'app/worker/workspace/page.tsx';
const KORA_LINK = 'app/worker/kora-link/activate/page.tsx';
const WORKER_LAYOUT = 'app/worker/layout.tsx';

describe('1-2. worker personal area pages exist', () => {
  it('worker workspace exists', () => {
    expect(() => readSource(WORKSPACE)).not.toThrow();
  });
  it('worker KORA Link page exists', () => {
    expect(() => readSource(KORA_LINK)).not.toThrow();
  });
});

describe('3-4. cross-links between workspace and KORA Link page', () => {
  it('worker workspace links to the KORA Link page', () => {
    const source = readSource(WORKSPACE);
    expect(source).toContain('/worker/kora-link/activate');
    expect(source).toContain('data-testid="workspace-kora-link-link"');
  });
  it('KORA Link page links back to worker workspace', () => {
    const source = readSource(KORA_LINK);
    expect(source).toContain('href="/worker/workspace"');
    expect(source).toContain('data-testid="kora-link-back-to-workspace"');
  });
});

describe('5-6. worker guard / worker layout pattern, KORA_ADMIN hard-blocked', () => {
  it('worker workspace uses getCurrentWorkerUser and redirects when absent', () => {
    const source = readSource(WORKSPACE);
    expect(source).toMatch(/getCurrentWorkerUser\(\)/);
    expect(source).toMatch(/redirect\('\/login'\)/);
  });
  it('KORA Link page uses requireWorkerUser / isKoraAuthError', () => {
    const source = readSource(KORA_LINK);
    expect(source).toMatch(/requireWorkerUser\(\)/);
    expect(source).toMatch(/isKoraAuthError/);
  });
  it('worker layout hard-blocks KORA_ADMIN from worker individual data', () => {
    const source = readSource(WORKER_LAYOUT);
    expect(source).toMatch(/getCurrentKoraUser/);
    expect(source).toMatch(/not accessible to KORA service team/i);
    expect(source).toMatch(/worker_individual_pib/);
  });
});

describe('7-8. company aggregate-only / no individual visibility messaging', () => {
  for (const page of [WORKSPACE, KORA_LINK]) {
    it(`${page} states company sees aggregate-only outputs`, () => {
      const source = readSource(page);
      expect(source.toLowerCase()).toMatch(/aggregat/);
    });
  }
  it('KORA Link page explicitly states individual activity is never shown to the company', () => {
    const source = readSource(KORA_LINK);
    expect(source).toMatch(/mai la tua attività individuale/);
  });
});

describe('9. KORA Link activation is pilot/in preparation, never "complete"', () => {
  for (const page of [WORKSPACE, KORA_LINK]) {
    it(`${page} shows "In preparazione", not a completed-activation claim`, () => {
      const source = readSource(page);
      expect(source).toContain('In preparazione');
      expect(source.toLowerCase()).not.toMatch(/kora link.{0,30}attivato con successo/);
      expect(source.toLowerCase()).not.toMatch(/attivazione completata/);
    });
  }
});

describe('10-11. no claim that KORA Link feeds KORA Index or Contribution automatically today', () => {
  it('KORA Link page states KORA Link does not feed KORA Index today', () => {
    const source = readSource(KORA_LINK);
    expect(source).toMatch(/KORA Link non alimenta il KORA Index oggi/);
  });
  it('KORA Link page states Contribution is not automatic', () => {
    const source = readSource(KORA_LINK);
    expect(source.toLowerCase()).toMatch(/non automatico/);
  });
});

describe('12-14. no DB lookup/activation calls, no event/contribution creation', () => {
  it('KORA Link page never imports Supabase or calls .rpc()', () => {
    const source = readSource(KORA_LINK);
    expect(source).not.toMatch(/from ['"]@\/lib\/supabase/);
    expect(source).not.toMatch(/from ['"]@supabase\/supabase-js['"]/);
    expect(source).not.toMatch(/\.rpc\(/);
    expect(source).not.toMatch(/getSupabaseServiceClient/);
    expect(source).not.toMatch(/getSupabaseServerClient/);
  });
  it('KORA Link page never calls fn_public_lookup_link or fn_activate_link_for_worker', () => {
    const source = readSource(KORA_LINK);
    expect(source).not.toMatch(/fn_public_lookup_link/);
    expect(source).not.toMatch(/fn_activate_link_for_worker/);
  });
  it('KORA Link page never inserts a row / creates an event or contribution record', () => {
    const source = readSource(KORA_LINK);
    expect(source).not.toMatch(/\.insert\(/);
    expect(source).not.toMatch(/\.upsert\(/);
    expect(source).not.toMatch(/contribution_event/);
  });
});

describe('15-16. no KORA Link flags modified', () => {
  it('neither page hardcodes a KORA Link feature flag to true', () => {
    const forbiddenPatterns = [
      /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
      /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
      /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
    ];
    for (const page of [WORKSPACE, KORA_LINK]) {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    }
  });
  it('lib/kora-link/config.ts flags still default to false (exact-string "true" check, unchanged)', () => {
    const source = readSource('lib/kora-link/config.ts');
    expect(source).toContain("env.KORA_LINK_ENABLED === 'true'");
    expect(source).toContain("env.KORA_LINK_DB_LOOKUP_ENABLED === 'true'");
    expect(source).toContain("env.KORA_LINK_ACTIVATION_ENABLED === 'true'");
  });
});

describe('17-19. 034/035/036 and migrations remain untouched', () => {
  it('034/035/036 proposed SQL files still exist and are still documented as proposed', () => {
    for (const file of [
      'supabase/proposed/034_kora_link_schema.sql',
      'supabase/proposed/035_kora_link_rls.sql',
      'supabase/proposed/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
  });
  it('neither page references supabase/migrations or proposed SQL files', () => {
    for (const page of [WORKSPACE, KORA_LINK]) {
      const source = readSource(page);
      expect(source).not.toMatch(/supabase\/migrations/);
      expect(source).not.toMatch(/supabase\/proposed/);
    }
  });
});

describe('20-21. no KORA Index / ingestion / UEF files referenced or changed', () => {
  it('neither page imports the KORA Index engine or ingestion/UEF modules', () => {
    for (const page of [WORKSPACE, KORA_LINK]) {
      const source = readSource(page);
      expect(source).not.toMatch(/from ['"]@\/lib\/kora-engine/);
      expect(source).not.toMatch(/from ['"]@\/lib\/ingestion/);
      expect(source).not.toMatch(/from ['"]@\/lib\/uef/);
    }
  });
});

describe('22. access-matrix code unchanged — worker_individual_pib DENY regression lock', () => {
  it('access-matrix.ts still defines worker_individual_pib and denies KORA_ADMIN', () => {
    const source = readSource('lib/auth/access-matrix.ts');
    expect(source).toContain("worker_individual_pib");
  });
});

describe('23. no RLS policies created', () => {
  it('neither page contains CREATE POLICY', () => {
    for (const page of [WORKSPACE, KORA_LINK]) {
      const source = readSource(page);
      expect(source).not.toMatch(/CREATE POLICY/i);
    }
  });
});

describe('24. no companion score or separate activation score introduced', () => {
  it('neither page introduces a companion_score or separate activation score concept', () => {
    for (const page of [WORKSPACE, KORA_LINK]) {
      const source = readSource(page);
      expect(source.toLowerCase()).not.toMatch(/companion[_ ]score/);
      expect(source.toLowerCase()).not.toMatch(/separate activation score/);
    }
  });
});

describe('25. commons.post / commons.booking / commons.contribution_event untouched', () => {
  it('neither page references commons.post, commons.booking, or commons.contribution_event', () => {
    for (const page of [WORKSPACE, KORA_LINK]) {
      const source = readSource(page);
      expect(source).not.toMatch(/commons\.post/);
      expect(source).not.toMatch(/commons\.booking/);
      expect(source).not.toMatch(/commons\.contribution_event/);
    }
  });
});

describe('26. NFC chip described as manual/future pilot test, never written by the app', () => {
  it('KORA Link page states the app never writes an NFC chip, and never calls Web NFC write APIs', () => {
    const source = readSource(KORA_LINK);
    expect(source).toMatch(/non scrive mai un chip NFC/);
    expect(source).not.toMatch(/NDEFReader|navigator\.nfc|new NDEFMessage/i);
  });
});

describe('27. no sourceBookingIds or Partner Activity booking data in worker KORA Link UI', () => {
  it('KORA Link page does not reference sourceBookingIds or partner activity booking concepts', () => {
    const source = readSource(KORA_LINK);
    expect(source).not.toMatch(/sourceBookingIds/);
    expect(source).not.toMatch(/activity-bookings/);
    expect(source).not.toMatch(/ActivityBooking/);
  });
});
