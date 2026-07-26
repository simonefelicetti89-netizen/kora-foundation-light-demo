/**
 * Partner Ecosystem Model 01 — initiatives-vs-activities alignment guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: the
 * alignment page and doc describe the existing mature KORA Space /
 * Contribution system and the future Partner Activity Catalog concept —
 * they build no catalog, persist no booking, and resolve no DPO/CTO/
 * fiscal/legal decision. See docs/PARTNER_ECOSYSTEM_MODEL_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const MODEL_PAGE = 'app/admin/partner-ecosystem-model/page.tsx';

describe('Partner Ecosystem Model 01 — route exists and is readable', () => {
  it(`${MODEL_PAGE} exists`, () => {
    expect(() => readSource(MODEL_PAGE)).not.toThrow();
  });
});

describe('Partner Ecosystem Model 01 — distinguishes the two lanes', () => {
  const source = readSource(MODEL_PAGE);

  it('names KORA Space / Contribution Initiatives as one lane', () => {
    expect(source).toMatch(/KORA Space \/ Contribution Initiatives/);
  });

  it('names Partner Activity Catalog / KORA Index Activities as the other lane', () => {
    expect(source).toMatch(/Partner Activity Catalog \/ KORA Index Activities/);
  });
});

describe('Partner Ecosystem Model 01 — states which output each lane feeds', () => {
  const source = readSource(MODEL_PAGE);

  it('states initiatives feed KORA Contribution', () => {
    expect(source).toMatch(/Alimenta KORA Contribution/);
  });

  it('states activities feed KORA Index aggregate signals, not Contribution', () => {
    expect(source).toMatch(/Alimenta segnali aggregati KORA Index/);
    expect(source).toMatch(/mai KORA Contribution/);
  });
});

describe('Partner Ecosystem Model 01 — states the privacy invariants', () => {
  const source = readSource(MODEL_PAGE);

  it('states company remains aggregate-only', () => {
    expect(source).toMatch(/L&apos;azienda vede solo aggregati/);
  });

  it('states partner named visibility is worker-initiated only', () => {
    expect(source).toMatch(/Il partner vede nominativi solo dopo un&apos;azione volontaria del worker/);
  });
});

describe('Partner Ecosystem Model 01 — Partner Activity Catalog is explicitly future, not implemented', () => {
  const source = readSource(MODEL_PAGE);

  it('labels the activity lane as future / not implemented', () => {
    expect(source).toMatch(/Futuro — non implementato/);
  });

  it('states the Partner Activity entity does not exist yet', () => {
    expect(source).toMatch(/partner_activity \(nome di lavoro, non esiste\)/);
  });
});

describe('Partner Ecosystem Model 01 — references the existing mature commons.post/booking/contribution pipeline', () => {
  const source = readSource(MODEL_PAGE);

  it('references commons.post, commons.booking, and commons.contribution_event', () => {
    expect(source).toMatch(/commons\.post \(CommonsPost\)/);
    expect(source).toMatch(/commons\.booking/);
    expect(source).toMatch(/commons\.contribution_event/);
  });

  it('labels the initiative lane as existing/mature', () => {
    expect(source).toMatch(/Esistente, maturo/);
  });
});

describe('Partner Ecosystem Model 01 — no Supabase, DB helper, RPC, or env secret access', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  it(`${MODEL_PAGE} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
    const source = readSource(MODEL_PAGE);
    for (const pattern of forbiddenPatterns) {
      expect(pattern.test(source), `must not match ${pattern}`).toBe(false);
    }
  });
});

describe('Partner Ecosystem Model 01 — no feature flag hardcoded', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  it(`${MODEL_PAGE} does not hardcode any KORA Link feature flag to true`, () => {
    const source = readSource(MODEL_PAGE);
    for (const pattern of forbiddenPatterns) {
      expect(pattern.test(source)).toBe(false);
    }
  });
});

describe('Partner Ecosystem Model 01 — no DPO/CTO/fiscal/legal decision is marked resolved', () => {
  it(`${MODEL_PAGE} does not claim any pending decision has been made`, () => {
    const source = readSource(MODEL_PAGE);
    expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
    expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
    expect(source).not.toMatch(/categoria fiscale approvata/i);
    expect(source).toMatch(/non prende\s*\n?\s*alcuna decisione CTO, DPO, fiscale o legale/);
  });

  it('docs/PARTNER_ECOSYSTEM_MODEL_01.md lists pending human decisions, none marked resolved', () => {
    const doc = readSource('docs/PARTNER_ECOSYSTEM_MODEL_01.md');
    expect(doc).toMatch(/Decisioni umane ancora pendenti/);
    expect(doc).not.toMatch(/[Dd]ecisione presa/);
    expect(doc).not.toMatch(/[Rr]isolt[oa]/);
  });
});

describe('Partner Ecosystem Model 01 — /partner/initiatives no longer presents itself as live KORA Space or the future catalog', () => {
  const source = readSource('app/partner/initiatives/page.tsx');

  it('describes itself as Partner proposals, not live KORA Space initiatives', () => {
    expect(source).toMatch(/Proposte Partner/);
    expect(source).toMatch(/non iniziative KORA Space già\s*\n?\s*pubblicate/);
  });

  it('explicitly distinguishes itself from the future Partner Activity Catalog', () => {
    expect(source).toMatch(/non il futuro catalogo di attività partner/);
  });

  it('does not claim to be commons.post or a live database-backed initiative', () => {
    expect(source).not.toMatch(/commons\.post/);
  });
});

describe('Partner Ecosystem Model 01 — admin navigation surfaces the model page', () => {
  it('registers the alignment page under Network & Content', () => {
    const source = readSource('lib/navigation/admin-nav-groups.ts');
    expect(source).toContain("href: '/admin/partner-ecosystem-model'");
    expect(source).toMatch(/label:\s*'Partner Ecosystem Model',/);
  });
});

describe('Partner Ecosystem Model 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
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
