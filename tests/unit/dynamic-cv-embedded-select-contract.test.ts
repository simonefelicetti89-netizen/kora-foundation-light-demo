/**
 * Dynamic CV — embedded worker_initiative select contract
 * (KORA-WP-129, Dynamic CV Defect A regression coverage)
 *
 * THE DEFECT THIS EXISTS FOR:
 *   app/api/worker/dynamic-cv/route.ts embeds personal.worker_initiative through
 *   personal.worker_participation. It previously named three columns that do not
 *   exist on that table — `delivery_mode` (a network.partner_profile column,
 *   migration 010), `action_family` (a UEF/ingestion column, migration 001) and
 *   `is_mandatory` (present in no migration at all). PostgREST rejects the WHOLE
 *   embedded resource when one named column is absent, so the route returned 500
 *   for every worker with at least one participation row. It stayed invisible
 *   until populated participation data existed, because the client swallows the
 *   failure and renders an empty CV — and because the nullish fallbacks in the
 *   route were written for missing VALUES, which cannot guard a missing COLUMN.
 *
 * WHAT THIS PROVES:
 *   Every column named in that embedded select is a real column of
 *   personal.worker_initiative, checked against the maintained WorkerInitiativeRow
 *   contract in lib/supabase/types.ts. That is a comparison between two maintained
 *   contracts, not a search for a string, and it catches the defect CLASS rather
 *   than only the three names that caused it.
 *
 * WHAT THIS DOES NOT PROVE:
 *   RLS behaviour for the embedded join — that is RLS-07's job
 *   (tests/integration/rls-worker-own-initiative-participation.test.ts).
 *   Session/auth handling — tests/unit/b121-dynamic-cv.test.ts.
 *   Live PostgREST acceptance — proven manually against a local database during
 *   the remediation pass; it is NOT asserted here because a DB-gated test would
 *   introduce a new `*_ALLOW_RUN` gate, and R0-A requires every such gate to be
 *   CI-enforced or explicitly excluded. Wiring that is outside this pass's
 *   authorised boundary, so the gate was deliberately not created.
 *
 * KNOWN LIMIT: WorkerInitiativeRow does not currently list `source_kind` /
 *   `source_uef_record_id` (migration 016), so a future legitimate select of
 *   those would fail this test until the type is completed. The failure message
 *   says so. Erring strict is deliberate.
 *
 * SCOPE NOTE: this covers the API route only. app/worker/dynamic-cv/print/page.tsx
 *   carries its OWN embedded select which still requests `delivery_mode` and is
 *   therefore still broken — that file was out of scope for this remediation and
 *   its correction needs its own authorisation. Extending this test to that file
 *   is the natural first step of that work.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ROUTE_PATH = join(ROOT, 'app/api/worker/dynamic-cv/route.ts');
const TYPES_PATH = join(ROOT, 'lib/supabase/types.ts');

/** Column names inside the `worker_initiative:initiative_id ( ... )` embed. */
function embeddedInitiativeColumns(source: string): string[] {
  const m = /worker_initiative:initiative_id\s*\(([^)]*)\)/.exec(source);
  if (!m) throw new Error('embedded worker_initiative select not found in the Dynamic CV route');
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

/** Keys of the maintained WorkerInitiativeRow contract. */
function workerInitiativeContractColumns(types: string): string[] {
  const m = /export interface WorkerInitiativeRow\s*\{([\s\S]*?)\n\}/.exec(types);
  if (!m) throw new Error('WorkerInitiativeRow not found in lib/supabase/types.ts');
  return [...m[1].matchAll(/^\s*([a-z_][a-z0-9_]*)\s*\??:/gim)].map((x) => x[1]);
}

describe('Dynamic CV — embedded worker_initiative select names only real columns', () => {
  it('the extractors find real structures (self-test — a broken parser must not pass silently)', () => {
    expect(embeddedInitiativeColumns(readFileSync(ROUTE_PATH, 'utf8')).length).toBeGreaterThan(0);
    const real = workerInitiativeContractColumns(readFileSync(TYPES_PATH, 'utf8'));
    expect(real).toContain('id');
    expect(real).toContain('tenant_id');
    expect(real).toContain('mode');
  });

  it('every embedded column exists on the maintained WorkerInitiativeRow contract', () => {
    const selected = embeddedInitiativeColumns(readFileSync(ROUTE_PATH, 'utf8'));
    const real     = workerInitiativeContractColumns(readFileSync(TYPES_PATH, 'utf8'));
    const phantom  = selected.filter((c) => !real.includes(c));
    expect(
      phantom,
      `app/api/worker/dynamic-cv/route.ts selects ${JSON.stringify(phantom)} from ` +
      `personal.worker_initiative, which the WorkerInitiativeRow contract does not declare. ` +
      `PostgREST rejects the whole embedded resource when a named column is absent, so this ` +
      `returns 500 for any worker with participation data. Either the select is stale, or ` +
      `WorkerInitiativeRow is missing a column that migration history really added.`,
    ).toEqual([]);
  });

  it('the three historically phantom columns are specifically absent', () => {
    const selected = embeddedInitiativeColumns(readFileSync(ROUTE_PATH, 'utf8'));
    expect(selected).not.toContain('delivery_mode');   // network.partner_profile, migration 010
    expect(selected).not.toContain('action_family');   // UEF / ingestion domain, migration 001
    expect(selected).not.toContain('is_mandatory');    // exists in no migration
  });

  it('the columns the Dynamic CV actually needs are still selected', () => {
    const selected = embeddedInitiativeColumns(readFileSync(ROUTE_PATH, 'utf8'));
    expect(selected).toContain('title');              // experience title + classifier category fallback
    expect(selected).toContain('pillar');             // pillar counters and classification
    expect(selected).toContain('mode');               // the canonical delivery-mode column
    expect(selected).toContain('eligibility_class');  // classifier hard-block input
  });

  it('the route does not reach into the UEF domain to recover action_family', () => {
    const code = readFileSync(ROUTE_PATH, 'utf8')
      .split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code).not.toMatch(/uef_record/);
  });

  it('provider stays unexposed — a bug fix must not enrich the API', () => {
    const src = readFileSync(ROUTE_PATH, 'utf8');
    // personal.worker_initiative HAS a provider column; this response deliberately
    // does not read it. Selecting it would be a new field exposure.
    expect(embeddedInitiativeColumns(src)).not.toContain('provider');
    expect(src).toMatch(/provider:\s*null,/);
  });
});
