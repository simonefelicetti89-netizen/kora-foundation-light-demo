/**
 * Dynamic CV — embedded worker_initiative select contract
 * (KORA-WP-129, Dynamic CV Defect A regression coverage — BOTH consumers)
 *
 * THE DEFECT THIS EXISTS FOR:
 *   Two independent files embed personal.worker_initiative through
 *   personal.worker_participation, each with its own hand-written select:
 *     1. app/api/worker/dynamic-cv/route.ts
 *     2. app/worker/dynamic-cv/print/page.tsx
 *   Between them they named four columns that do not exist on that table —
 *   `delivery_mode` (a network.partner_profile column, migration 010),
 *   `action_family` (a UEF/ingestion column, migration 001) and `is_mandatory`
 *   (present in no migration at all). PostgREST rejects the WHOLE embedded
 *   resource when one named column is absent, so each consumer failed for every
 *   worker with at least one participation row — the API route with a 500, the
 *   print page by silently rendering zero experiences. It stayed invisible until
 *   populated participation data existed, and because the nullish fallbacks in
 *   the code were written for missing VALUES, which cannot guard a missing COLUMN.
 *
 *   Correcting only one consumer left the other broken. That is exactly why this
 *   test is written over a LIST of consumers rather than over one file: a third
 *   consumer added later is one line of registration away from being covered,
 *   and a duplicated stale select cannot hide in a file nobody thought to check.
 *
 * WHAT THIS PROVES:
 *   Every column named in every registered embedded select is a real column of
 *   personal.worker_initiative, checked against the maintained WorkerInitiativeRow
 *   contract in lib/supabase/types.ts. That is a comparison between two maintained
 *   contracts, not a search for a string, so it catches the defect CLASS rather
 *   than only the names that caused it.
 *
 * WHAT THIS DOES NOT PROVE:
 *   RLS behaviour for the embedded join — that is RLS-07's job
 *   (tests/integration/rls-worker-own-initiative-participation.test.ts).
 *   Session/auth handling — tests/unit/b121-dynamic-cv.test.ts.
 *   Live PostgREST acceptance — proven manually against a local database during
 *   the remediation passes; it is NOT asserted here because a DB-gated test would
 *   introduce a new `*_ALLOW_RUN` gate, and R0-A requires every such gate to be
 *   CI-enforced or explicitly excluded. Wiring that is outside these passes'
 *   authorised boundary, so the gate was deliberately not created.
 *
 * KNOWN LIMIT: WorkerInitiativeRow does not currently list `source_kind` /
 *   `source_uef_record_id` (migration 016), so a future legitimate select of
 *   those would fail this test until the type is completed. The failure message
 *   says so. Erring strict is deliberate.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/**
 * Every file that embeds personal.worker_initiative for the Dynamic CV.
 * A new consumer belongs here; that is the whole point of the list.
 */
const CONSUMERS = [
  {
    file: 'app/api/worker/dynamic-cv/route.ts',
    // Columns this consumer genuinely reads. Asserted present so a future
    // "cleanup" cannot quietly drop an input the classifier depends on.
    needs: [
      'title',              // experience title + classifier category
      'pillar',             // pillar counters and classification
      'mode',               // the canonical delivery-mode column
      'eligibility_class',  // classifier hard-block input
    ],
  },
  {
    file: 'app/worker/dynamic-cv/print/page.tsx',
    // The print page reads only these two. It selected `delivery_mode` and never
    // consumed it, so the correction was removal, not substitution — selecting an
    // unread column would invent a schema dependency this page does not have.
    needs: [
      'title',
      'pillar',
    ],
  },
] as const;

/** Column names inside a `worker_initiative:initiative_id ( ... )` embed. */
function embeddedInitiativeColumns(source: string, label: string): string[] {
  const m = /worker_initiative:initiative_id\s*\(([^)]*)\)/.exec(source);
  if (!m) throw new Error(`embedded worker_initiative select not found in ${label}`);
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

/** Keys of the maintained WorkerInitiativeRow contract. */
function workerInitiativeContractColumns(types: string): string[] {
  const m = /export interface WorkerInitiativeRow\s*\{([\s\S]*?)\n\}/.exec(types);
  if (!m) throw new Error('WorkerInitiativeRow not found in lib/supabase/types.ts');
  return [...m[1].matchAll(/^\s*([a-z_][a-z0-9_]*)\s*\??:/gim)].map((x) => x[1]);
}

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Dynamic CV — embedded worker_initiative selects name only real columns', () => {
  it('the extractors find real structures (self-test — a broken parser must not pass silently)', () => {
    // Both consumers must be parseable, and the two selects are formatted
    // differently (one multi-line, one single-line) on purpose here: the parser
    // has to generalise, not match one file's whitespace.
    for (const { file } of CONSUMERS) {
      expect(embeddedInitiativeColumns(read(file), file).length, file).toBeGreaterThan(0);
    }
    const real = workerInitiativeContractColumns(read('lib/supabase/types.ts'));
    expect(real).toContain('id');
    expect(real).toContain('tenant_id');
    expect(real).toContain('mode');
  });

  it('both Dynamic CV consumers are registered — a third must not escape coverage', () => {
    const files = CONSUMERS.map((c) => c.file);
    expect(files).toContain('app/api/worker/dynamic-cv/route.ts');
    expect(files).toContain('app/worker/dynamic-cv/print/page.tsx');
  });

  for (const { file, needs } of CONSUMERS) {
    describe(file, () => {
      it('every embedded column exists on the maintained WorkerInitiativeRow contract', () => {
        const selected = embeddedInitiativeColumns(read(file), file);
        const real     = workerInitiativeContractColumns(read('lib/supabase/types.ts'));
        const phantom  = selected.filter((c) => !real.includes(c));
        expect(
          phantom,
          `${file} selects ${JSON.stringify(phantom)} from personal.worker_initiative, ` +
          `which the WorkerInitiativeRow contract does not declare. PostgREST rejects the ` +
          `whole embedded resource when a named column is absent, so this breaks the Dynamic ` +
          `CV for any worker with participation data. Either the select is stale, or ` +
          `WorkerInitiativeRow is missing a column that migration history really added.`,
        ).toEqual([]);
      });

      it('the historically phantom columns are specifically absent', () => {
        const selected = embeddedInitiativeColumns(read(file), file);
        expect(selected, file).not.toContain('delivery_mode');  // network.partner_profile, migration 010
        expect(selected, file).not.toContain('action_family');  // UEF / ingestion domain, migration 001
        expect(selected, file).not.toContain('is_mandatory');   // exists in no migration
      });

      it('the columns this consumer actually reads are still selected', () => {
        const selected = embeddedInitiativeColumns(read(file), file);
        for (const col of needs) expect(selected, `${file} must still select ${col}`).toContain(col);
      });

      it('provider stays unexposed — a bug fix must not enrich a Worker surface', () => {
        // personal.worker_initiative HAS a provider column; neither consumer reads
        // it. Selecting it would be a new field exposure, not a defect correction.
        expect(embeddedInitiativeColumns(read(file), file), file).not.toContain('provider');
      });

      it('selects nothing beyond what this consumer reads', () => {
        // Defect A had two halves: wrong names AND unnecessary columns. This closes
        // the second half, and is what makes removal (not substitution) enforceable.
        const selected = embeddedInitiativeColumns(read(file), file);
        expect(
          selected.filter((c) => !(needs as readonly string[]).includes(c)),
          `${file} selects columns it does not read. An unread column is a schema ` +
          `dependency invented for nothing — the failure mode that produced Defect A.`,
        ).toEqual([]);
      });
    });
  }

  it('neither consumer reaches into the UEF domain to recover action_family', () => {
    for (const { file } of CONSUMERS) {
      const code = read(file).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      expect(code, file).not.toMatch(/uef_record/);
    }
  });

  it('the API route still refuses to expose provider in its response shape', () => {
    expect(read('app/api/worker/dynamic-cv/route.ts')).toMatch(/provider:\s*null,/);
  });
});
