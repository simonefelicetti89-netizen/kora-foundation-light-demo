/**
 * KORA-WP-145 — Living KORAL Canonical Morphology Engine v2.
 *
 * Mechanical acceptance (Registry 219 KORA-WP-145): common seed, R2-alpha
 * area presence, transformation-driven bounded branching, fusion /
 * consolidation, fusion-enclosed cavities only, memory traces (one scar per
 * withdrawal, none for seed release), pure deterministic replay, Edition
 * engine version + state hash, v1 compatibility, bounds, and the four final
 * A–D golden scenarios (spec §0.6.4). No renderer, no visual output.
 *
 * Sections: (1) pure fold — no database; (2) structural guards over the new
 * files and migrations; (3) real-DB proof against a LOCAL Supabase only,
 * skipped unless WP145_* env vars are set (same convention as WP-112/113).
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import {
  foldCanonicalMorphology, canonicalSeedState, hashCanonicalMorphologyState, projectCanonicalMorphologyForExpression,
  assertCanonicalMorphologyInvariants,
} from '@/lib/living-koral-mark/canonical-morphology';
import { foldLineage } from '@/lib/living-koral-mark/lineage-fold';
import { getCanonicalMorphologyConfig, getMorphologyEngineVersion } from '@/lib/living-koral-morphology-config/v1';
import type { CanonicalLedgerEvent, CanonicalMorphologyState } from '@/lib/living-koral-mark/canonical-morphology-types';
import type { MorphologyAreaCode } from '@/lib/living-koral-morphology-config/types';

const { Client } = pg;
const REPO_ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), 'utf-8');
const codeOnly = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ── fixture history builder (canonical replay order = call order) ──────────
function history() {
  const events: CanonicalLedgerEvent[] = [];
  let seq = 0;
  const push = (e: Omit<CanonicalLedgerEvent, 'seq' | 'resultingStateRevision'>) => {
    seq += 1;
    events.push({ ...e, seq, resultingStateRevision: seq });
  };
  const h = {
    events,
    /** Emergence: initiative published in an area. */
    P: (i: string, area: MorphologyAreaCode) => { push({ operation: 'add_element', category: 'Emergence', sourceKey: i, area }); return h; },
    /** Disappearance: initiative closed. */
    C: (i: string) => { push({ operation: 'remove_element', category: 'Disappearance', sourceKey: i, area: null }); return h; },
    /** Advisor-confirmed Reorientation (pillar change) into `area`. */
    X: (i: string, area: MorphologyAreaCode) => { push({ operation: 'reorient', category: 'Reorientation', sourceKey: i, area }); return h; },
    /** One consolidation action, in the adapter's ledger order: fuse first, then the Emergence/Disappearances it implies. */
    K: (sources: string[], result: string, area: MorphologyAreaCode) => {
      push({ operation: 'fuse', category: 'Consolidation', sourceKey: result, area, consolidationSources: sources });
      push({ operation: 'add_element', category: 'Emergence', sourceKey: result, area });
      for (const s of sources) push({ operation: 'remove_element', category: 'Disappearance', sourceKey: s, area: null });
      return h;
    },
    S: (i: string) => { push({ operation: 'increase_extent', category: 'Strengthening', sourceKey: i, area: null }); return h; },
    W: (i: string) => { push({ operation: 'decrease_extent', category: 'Weakening', sourceKey: i, area: null }); return h; },
    T: (i: string) => { push({ operation: 'stabilize', category: 'Stabilization', sourceKey: i, area: null }); return h; },
    state: () => foldCanonicalMorphology(events),
  };
  return h;
}

const el = (s: CanonicalMorphologyState, id: string) => {
  const e = s.elements.find((x) => x.id === id);
  if (!e) throw new Error(`no element ${id}`);
  return e;
};
const active = (s: CanonicalMorphologyState) => s.elements.filter((e) => e.active).map((e) => e.id);
const openCavities = (s: CanonicalMorphologyState) => s.cavities.filter((c) => c.open);
const activeJoints = (s: CanonicalMorphologyState) => s.fusions.filter((f) => f.active);
const kinds = (s: CanonicalMorphologyState) => s.memoryTraces.map((t) => t.kind);

// The four final golden scenarios (spec §0.6.4), all from the same seed.
const scenarioA = () => history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'GROWTH').X('2', 'LIFE').X('4', 'CONNECTION');
const scenarioB = () => history().P('1', 'LIFE').P('2', 'CONNECTION').P('3', 'IMPACT').K(['1', '3'], '4', 'CONNECTION');
const scenarioC = () => history().P('1', 'GROWTH').P('2', 'LEGACY').P('3', 'IMPACT').P('4', 'GROWTH').K(['1', '4'], '5', 'GROWTH').C('3').C('2');
const scenarioD = () => history().P('1', 'IMPACT').P('2', 'LIFE').P('3', 'LIFE').X('3', 'IMPACT').P('4', 'GROWTH').K(['1', '4'], '5', 'IMPACT').C('3').C('2');

// ═══════════════════════════════════════════════════════════════════════════
describe('KORA-WP-145 — common seed (S1, frozen)', () => {
  const seed = canonicalSeedState();

  it('one fused core with exactly three initial elements, all rooted in the core', () => {
    expect(seed.elements.map((e) => e.id)).toEqual(['seed:0', 'seed:1', 'seed:bud']);
    for (const e of seed.elements) {
      expect(e.parentId).toBe('core');
      expect(e.origin).toBe('seed');
      expect(e.depth).toBe(1);
      expect(e.assignment).toBe('unassigned');
      expect(e.areaId).toBeNull();
    }
    expect(el(seed, 'seed:0').kind).toBe('member');
    expect(el(seed, 'seed:1').kind).toBe('member');
    expect(el(seed, 'seed:bud').kind).toBe('bud');
  });

  it('terminal phases: seed:0 EMERGENT, seed:1 EMERGENT, seed:bud BUD', () => {
    expect(el(seed, 'seed:0').terminalPhase).toBe('emergent');
    expect(el(seed, 'seed:1').terminalPhase).toBe('emergent');
    expect(el(seed, 'seed:bud').terminalPhase).toBe('bud');
  });

  it('zero memory traces, zero canonical cavities, zero fusion joints, no area', () => {
    expect(seed.memoryTraces).toEqual([]);
    expect(seed.memoryTraceTotal).toBe(0);
    expect(seed.cavities).toEqual([]);
    expect(seed.fusions).toEqual([]);
    expect(seed.areas).toEqual([]);
    expect(seed.core.massShare).toBe(0.34);
  });

  it('extent ranks follow the reference (seed:0 tallest) and carry no lengths', () => {
    expect(el(seed, 'seed:0').extentRank).toBe(1);
    expect(el(seed, 'seed:1').extentRank).toBe(2);
    expect(el(seed, 'seed:bud').extentRank).toBe(3);
  });

  it('identical for every organisation: the empty history folds to the seed, byte-identically', () => {
    expect(hashCanonicalMorphologyState(foldCanonicalMorphology([]))).toBe(hashCanonicalMorphologyState(seed));
    expect(hashCanonicalMorphologyState(canonicalSeedState())).toBe(hashCanonicalMorphologyState(seed));
  });

  it('the config records the Founder seed reference hash, and it matches the committed PNG', () => {
    const png = readFileSync(join(REPO_ROOT, 'design/program/reference-surfaces/living-koral/KORA_LIVING_KORAL_FOUNDER_SEED_REFERENCE_v1.png'));
    const sha = createHash('sha256').update(png).digest('hex');
    expect(sha).toBe('b9e2f1f0acf9bb13694ac8187dc9e11cc5a6e0f3cca438ec958c0f3f7fee728e');
    expect(getCanonicalMorphologyConfig().seed.referenceSha256).toBe(sha);
  });
});

describe('KORA-WP-145 — R2-alpha area presence (no initiative-count morphology)', () => {
  it('ONE initiative and TEN initiatives in the same area produce the identical canonical state', () => {
    const one = history().P('a1', 'LIFE');
    const ten = history();
    for (let i = 0; i < 10; i++) ten.P(`b${i}`, 'LIFE');
    const s1 = one.state();
    const s10 = ten.state();
    expect(active(s10)).toEqual(active(s1));
    expect(s10.memoryTraces.map((t) => t.kind)).toEqual(s1.memoryTraces.map((t) => t.kind));
    expect(s10.elements.map((e) => [e.id, e.assignment, e.massClass, e.terminalPhase])).toEqual(s1.elements.map((e) => [e.id, e.assignment, e.massClass, e.terminalPhase]));
    expect(s10.areas.map((a) => [a.areaId, a.present, a.primaryId, a.branchId])).toEqual(s1.areas.map((a) => [a.areaId, a.present, a.primaryId, a.branchId]));
  });

  it('closing nine of ten initiatives changes nothing structurally; closing the tenth withdraws the area', () => {
    const h = history();
    for (let i = 0; i < 10; i++) h.P(`i${i}`, 'GROWTH');
    for (let i = 0; i < 9; i++) h.C(`i${i}`);
    const nine = h.state();
    expect(nine.areas[0].present).toBe(true);
    expect(nine.memoryTraceTotal).toBe(1); // only the growth of the area
    h.C('i9');
    const all = h.state();
    expect(all.areas[0].present).toBe(false);
    expect(kinds(all)).toEqual(['growth', 'scar']);
  });

  it('three initiatives create no branch and no cavity — branching is never volume-driven', () => {
    const s = history().P('1', 'LIFE').P('2', 'LIFE').P('3', 'LIFE').state();
    expect(s.elements.some((e) => e.kind === 'branch')).toBe(false);
    expect(s.cavities).toEqual([]);
  });
});

describe('KORA-WP-145 — neutral adoption order (S1-c)', () => {
  it('1st area adopts seed:0, 2nd seed:1, 3rd seed:bud, 4th+ grow new primaries from the core', () => {
    const s = history().P('1', 'IMPACT').P('2', 'LEGACY').P('3', 'LIFE').P('4', 'GROWTH').P('5', 'CONNECTION').state();
    const primary = (code: MorphologyAreaCode) => s.areas.find((a) => a.areaId === code)?.primaryId;
    expect(primary('IMPACT')).toBe('seed:0');
    expect(primary('LEGACY')).toBe('seed:1');
    expect(primary('LIFE')).toBe('seed:bud');
    expect(primary('GROWTH')).toBe('grown:3');
    expect(primary('CONNECTION')).toBe('grown:4');
    expect(el(s, 'grown:3').parentId).toBe('core');
    expect(el(s, 'grown:3').origin).toBe('core');
    expect(el(s, 'seed:bud').terminalPhase).toBe('emergent'); // an adopted bud has grown into a primary
  });

  it('withdrawal releases the seed element to UNASSIGNED — never deleted — and re-emergence re-adopts it', () => {
    const h = history().P('1', 'LIFE').P('2', 'GROWTH').C('2');
    const released = h.state();
    expect(el(released, 'seed:1').assignment).toBe('unassigned');
    expect(released.elements.map((e) => e.id)).toContain('seed:1');
    const back = h.P('3', 'GROWTH').state();
    expect(back.areas.find((a) => a.areaId === 'GROWTH')?.primaryId).toBe('seed:1');
    expect(el(back, 'seed:1').assignment).toBe('adopted');
  });

  it('positions come from appearance order, never from the pillar code (P1)', () => {
    const lifeFirst = history().P('1', 'LIFE').P('2', 'IMPACT').state();
    const impactFirst = history().P('1', 'IMPACT').P('2', 'LIFE').state();
    expect(lifeFirst.areas.find((a) => a.areaId === 'LIFE')?.primaryId).toBe('seed:0');
    expect(impactFirst.areas.find((a) => a.areaId === 'LIFE')?.primaryId).toBe('seed:1');
    // Same structural history with different pillars -> identical public projection.
    expect(JSON.stringify(projectCanonicalMorphologyForExpression(lifeFirst))).toBe(JSON.stringify(projectCanonicalMorphologyForExpression(impactFirst)));
  });
});

describe('KORA-WP-145 — reorientation: transformation-driven, bounded branching', () => {
  it('a recognized reorientation into an already-present area creates exactly one secondary branch, depth 2, parented to the primary', () => {
    const s = history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'GROWTH').X('2', 'LIFE').state();
    const branch = el(s, 'branch:seed:0');
    expect(branch.kind).toBe('branch');
    expect(branch.depth).toBe(2);
    expect(branch.parentId).toBe('seed:0');
    expect(branch.terminalPhase).toBe('bud');
    expect(s.areas.find((a) => a.areaId === 'LIFE')?.branchId).toBe('branch:seed:0');
    expect(kinds(s).slice(-2)).toEqual(['growth', 'reorientation']);
  });

  it('a reorientation into an ABSENT area makes it present with a primary — no branch', () => {
    const s = history().P('1', 'LIFE').P('2', 'LIFE').X('2', 'IMPACT').state();
    expect(s.areas.find((a) => a.areaId === 'IMPACT')?.primaryId).toBe('seed:1');
    expect(s.elements.some((e) => e.kind === 'branch')).toBe(false);
  });

  it('branch cap: a further reorientation into the same area adds NO geometry, changes the heading and leaves one memory trace', () => {
    const base = history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'GROWTH').P('4', 'GROWTH').X('2', 'LIFE');
    const before = base.state();
    const after = base.X('3', 'LIFE').state();
    expect(after.elements.filter((e) => e.kind === 'branch')).toHaveLength(1);
    expect(after.memoryTraceTotal).toBe(before.memoryTraceTotal + 1);
    expect(kinds(after).at(-1)).toBe('reorientation');
    expect(el(after, 'branch:seed:0').terminalPhase).toBe('emergent'); // confirmed by a later recognized change
    const again = base.X('3', 'LIFE').state();
    expect(again.elements.filter((e) => e.kind === 'branch')).toHaveLength(1);
  });

  it('heading is canonical and moves with recognized reorientation (direction ordinal)', () => {
    const h = history().P('1', 'LIFE').P('2', 'GROWTH');
    const s0 = h.state();
    const s1 = h.X('2', 'GROWTH').state(); // same area: heading-only reorientation
    expect(el(s1, 'seed:1').heading.angle).not.toBe(el(s0, 'seed:1').heading.angle);
    expect(kinds(s1).at(-1)).toBe('reorientation');
  });

  it('withdrawal through reorientation leaves ONE scar; the released seed element adds no second trace', () => {
    const before = history().P('1', 'LIFE').P('2', 'GROWTH').state();
    const after = history().P('1', 'LIFE').P('2', 'GROWTH').X('2', 'LIFE').state();
    const newTraces = after.memoryTraces.slice(before.memoryTraces.length).map((t) => t.kind);
    expect(newTraces.filter((k) => k === 'scar')).toHaveLength(1);
    expect(el(after, 'seed:1').assignment).toBe('unassigned');
  });
});

describe('KORA-WP-145 — member cap (Founder, final): cap hit = no new geometry, no eviction, memory only', () => {
  // seed:0 LIFE, seed:1 GROWTH, bud CONNECTION, grown:3 IMPACT + two redirected-growth branches = 6 active members
  const atCap = () => history()
    .P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'IMPACT')
    .P('5', 'IMPACT').X('5', 'LIFE')
    .P('6', 'IMPACT').X('6', 'GROWTH');

  it('setup reaches the cap: exactly 6 active members, two branches', () => {
    const s = atCap().state();
    expect(active(s)).toEqual(['seed:0', 'seed:1', 'seed:bud', 'grown:3', 'branch:seed:0', 'branch:seed:1']);
  });

  it('A — a new area at the cap: existing branches unchanged, no seventh member, memory recorded', () => {
    const before = atCap().state();
    const after = atCap().P('7', 'LEGACY').state();
    expect(active(after)).toEqual(active(before));
    expect(after.elements.filter((e) => e.active)).toHaveLength(6);
    expect(after.elements.find((e) => e.id === 'grown:4')).toBeUndefined();
    for (const id of ['branch:seed:0', 'branch:seed:1']) {
      expect(el(after, id)).toEqual(el(before, id));
    }
    const legacy = after.areas.find((a) => a.areaId === 'LEGACY');
    expect(legacy?.present).toBe(true);
    expect(legacy?.primaryId).toBeNull();
    // exactly one new memory trace (visible traces may be merged at the cap of 8; totals are exact)
    expect(after.memoryTraceTotal).toBe(before.memoryTraceTotal + 1);
    const newest = after.memoryTraces.at(-1)!;
    expect([newest.kind, newest.host.elementId, newest.subject.type]).toEqual(['growth', 'core', 'area']);
  });

  it('C — the cap event creates no withdrawal scar for any otherwise valid branch', () => {
    const before = atCap().state();
    const after = atCap().P('7', 'LEGACY').state();
    // the single added trace is the growth memory — so no scar was written
    expect(after.memoryTraceTotal).toBe(before.memoryTraceTotal + 1);
    expect(after.memoryTraces.at(-1)!.kind).toBe('growth');
    expect(after.areas.filter((a) => a.branchId).map((a) => a.branchId)).toEqual(before.areas.filter((a) => a.branchId).map((a) => a.branchId));
  });

  it('at the cap a further reorientation into a geometry-less area is memory only (no branch, no member)', () => {
    const s = atCap().P('7', 'LEGACY').P('8', 'IMPACT').X('8', 'LEGACY').state();
    expect(s.elements.filter((e) => e.active)).toHaveLength(6);
    expect(s.elements.some((e) => e.id.startsWith('branch:') && e.parentId === 'core')).toBe(false);
    expect(kinds(s).at(-1)).toBe('reorientation');
  });

  it('B — a branch with no remaining redirected initiative retires, with exactly one retirement scar', () => {
    const before = atCap().state();
    const after = atCap().C('5').state();
    expect(el(after, 'branch:seed:0').assignment).toBe('retired');
    expect(after.areas.find((a) => a.areaId === 'LIFE')?.branchId).toBeNull();
    expect(after.memoryTraceTotal).toBe(before.memoryTraceTotal + 1);
    expect(after.memoryTraces.at(-1)!.kind).toBe('scar');
    expect(el(after, 'branch:seed:1').assignment).toBe('adopted'); // the other branch is untouched
  });

  it('room freed by a legitimate retirement is not back-filled retroactively; a later arrival uses it normally', () => {
    const s = atCap().P('7', 'LEGACY').C('5').state();
    expect(s.areas.find((a) => a.areaId === 'LEGACY')?.primaryId).toBeNull(); // no retroactive geometry
    const t = atCap().C('5').P('7', 'LEGACY').state();
    expect(t.areas.find((a) => a.areaId === 'LEGACY')?.primaryId).toBe('grown:4');
  });

  it('a geometry-less area that later loses its last initiative withdraws with one scar and no geometry change', () => {
    const before = atCap().P('7', 'LEGACY').state();
    const after = atCap().P('7', 'LEGACY').C('7').state();
    expect(active(after)).toEqual(active(before));
    expect(after.memoryTraceTotal).toBe(before.memoryTraceTotal + 1);
    expect(after.memoryTraces.at(-1)!.kind).toBe('scar');
  });
});

describe('KORA-WP-145 — fusion and consolidation', () => {
  it('same-area consolidation densifies the result member, leaves one consolidation trace, no joint and no cavity', () => {
    const s = history().P('1', 'GROWTH').P('2', 'GROWTH').K(['1', '2'], '3', 'GROWTH').state();
    expect(el(s, 'seed:0').massClass).toBe('dense');
    expect(kinds(s)).toEqual(['growth', 'consolidation']);
    expect(activeJoints(s)).toHaveLength(0);
    expect(s.cavities).toHaveLength(0);
    expect(s.areas[0].present).toBe(true);
  });

  it('cross-area consolidation fuses the source area into the result (joint + fusion-enclosed cavity), never a branch', () => {
    const t = history().P('1', 'LIFE').P('2', 'LIFE').P('3', 'IMPACT').K(['1', '2'], '4', 'IMPACT').state();
    expect(el(t, 'seed:0').assignment).toBe('fused');
    expect(el(t, 'seed:0').fusedInto).toBe('seed:1');
    expect(activeJoints(t)).toHaveLength(1);
    expect(activeJoints(t)[0].kind).toBe('cross-area');
    expect(openCavities(t)).toHaveLength(1);
    expect(t.elements.some((e) => e.kind === 'branch')).toBe(false);
    expect(el(t, 'seed:1').massClass).toBe('dense');
  });

  it('joint and cavity ids are stable across identical replays', () => {
    const a = scenarioB().state();
    const b = scenarioB().state();
    expect(a.fusions.map((f) => f.fusionId)).toEqual(b.fusions.map((f) => f.fusionId));
    expect(a.cavities.map((c) => c.cavityId)).toEqual(b.cavities.map((c) => c.cavityId));
  });

  it('the Emergence/Disappearance rows that follow a fuse are idempotent no-ops (no double structural change)', () => {
    const withTail = scenarioB().state();
    const onlyFuse = history().P('1', 'LIFE').P('2', 'CONNECTION').P('3', 'IMPACT');
    onlyFuse.events.push({ seq: 99, operation: 'fuse', category: 'Consolidation', sourceKey: '4', area: 'CONNECTION', consolidationSources: ['1', '3'], resultingStateRevision: 99 });
    const fuseOnly = onlyFuse.state();
    expect(active(withTail)).toEqual(active(fuseOnly));
    expect(withTail.memoryTraceTotal).toBe(fuseOnly.memoryTraceTotal);
  });
});

describe('KORA-WP-145 — cavities: fusion-enclosed only (C-cav)', () => {
  it('every v2 cavity is fusion-enclosed; reorientation branching never opens a cavity', () => {
    const a = scenarioA().state();
    expect(a.elements.filter((e) => e.kind === 'branch' && e.active)).toHaveLength(2);
    expect(a.cavities).toHaveLength(0);
    for (const s of [scenarioB().state(), scenarioD().state()]) {
      for (const c of s.cavities) expect(c.kind).toBe('fusion-enclosed');
    }
  });

  it('open notches in the seed are not cavities', () => {
    expect(canonicalSeedState().cavities).toHaveLength(0);
  });

  it('a cavity closes when a bounding member withdraws, with a closure trace', () => {
    const s = history().P('1', 'LIFE').P('2', 'LIFE').P('3', 'IMPACT').K(['1', '2'], '4', 'IMPACT').C('3').C('4').state();
    expect(openCavities(s)).toHaveLength(0);
    expect(s.cavities).toHaveLength(1);
    expect(s.cavities[0].closedAtRevision).not.toBeNull();
    expect(kinds(s)).toContain('closure');
  });

  it('cavity cap: at most two open cavities and two active joints, whatever the history', () => {
    const s = history()
      .P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'IMPACT').P('5', 'LEGACY')
      .K(['1', '2', '3', '4'], '6', 'LEGACY').state();
    expect(openCavities(s).length).toBeLessThanOrEqual(2);
    expect(activeJoints(s).length).toBeLessThanOrEqual(2);
  });
});

describe('KORA-WP-145 — memory traces', () => {
  it('never created by extent / stability changes (dormant N1 operations), by repeated initiatives, or by time', () => {
    const s = history().P('1', 'LIFE').S('1').S('1').W('1').T('1').P('2', 'LIFE').state();
    expect(kinds(s)).toEqual(['growth']);
  });

  it('dormant operations stay canonical: extent and stability move, with no memory', () => {
    const s = history().P('1', 'LIFE').S('1').S('1').T('1').state();
    expect(el(s, 'seed:0').extent.raw).toBe(2);
    expect(el(s, 'seed:0').settledShare).toBe(1);
    expect(el(s, 'seed:0').terminalPhase).toBe('settled');
  });

  it('memory persists through simplification (C: less form, the traces of what was there remain)', () => {
    const c = scenarioC().state();
    expect(kinds(c)).toEqual(['growth', 'growth', 'growth', 'consolidation', 'scar', 'scar']);
  });

  it('visible memory is capped at 8 by a deterministic merge (never pruned) — total memory is preserved', () => {
    const d = scenarioD().state();
    expect(d.memoryTraceTotal).toBe(9);
    expect(d.memoryTraces).toHaveLength(8);
    expect(d.memoryTraces.reduce((n, t) => n + t.mergedCount, 0)).toBe(9);
    expect(JSON.stringify(scenarioD().state().memoryTraces)).toBe(JSON.stringify(d.memoryTraces));
  });

  it('trace ids are stable and unique', () => {
    const d = scenarioD().state();
    const ids = d.memoryTraces.map((t) => t.traceId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('KORA-WP-145 — final golden scenarios A–D (spec §0.6.4), same seed', () => {
  it('A — growth / reorientation: 5 elements, branching, 0 joints, 0 cavities, 8 traces', () => {
    const s = scenarioA().state();
    expect(active(s)).toEqual(['seed:0', 'seed:1', 'seed:bud', 'branch:seed:0', 'branch:seed:bud']);
    expect(el(s, 'seed:1').assignment).toBe('unassigned');
    expect(activeJoints(s)).toHaveLength(0);
    expect(openCavities(s)).toHaveLength(0);
    expect(s.memoryTraceTotal).toBe(8);
    expect(s.memoryTraces).toHaveLength(8);
  });

  it('B — integration / fusion: 1 independent dense primary + 2 fused, 2 joints, 2 fusion-enclosed cavities, 7 traces', () => {
    const s = scenarioB().state();
    expect(active(s)).toEqual(['seed:1']);
    expect(el(s, 'seed:1').massClass).toBe('dense');
    expect(el(s, 'seed:0').fusedInto).toBe('seed:1');
    expect(el(s, 'seed:bud').fusedInto).toBe('seed:1');
    expect(activeJoints(s)).toHaveLength(2);
    expect(openCavities(s)).toHaveLength(2);
    expect(s.memoryTraceTotal).toBe(7);
    expect(kinds(s)).toEqual(['growth', 'growth', 'growth', 'fusion', 'opening', 'fusion', 'opening']);
  });

  it('C — consolidation / simplification: 1 dense primary + 2 unassigned seed elements, 0 joints, 0 cavities, 6 traces', () => {
    const s = scenarioC().state();
    expect(el(s, 'seed:0').massClass).toBe('dense');
    expect(el(s, 'seed:1').assignment).toBe('unassigned');
    expect(el(s, 'seed:bud').assignment).toBe('unassigned');
    expect(activeJoints(s)).toHaveLength(0);
    expect(s.cavities).toHaveLength(0);
    expect(s.memoryTraceTotal).toBe(6);
  });

  it('D — mixed / memory: dense primary + 1 fused + 1 unassigned, 1 joint, 1 fusion-enclosed cavity, 9 traces (8 visible)', () => {
    const s = scenarioD().state();
    expect(el(s, 'seed:0').massClass).toBe('dense');
    expect(el(s, 'seed:bud').fusedInto).toBe('seed:0');
    expect(el(s, 'seed:1').assignment).toBe('unassigned');
    expect(el(s, 'branch:seed:0').assignment).toBe('retired');
    expect(activeJoints(s)).toHaveLength(1);
    expect(openCavities(s)).toHaveLength(1);
    expect(s.memoryTraceTotal).toBe(9);
    expect(s.memoryTraces).toHaveLength(8);
  });

  it('same seed, different histories, different canonical states — with 4–5 initiatives each', () => {
    const hashes = [scenarioA(), scenarioB(), scenarioC(), scenarioD()].map((h) => hashCanonicalMorphologyState(h.state()));
    expect(new Set(hashes).size).toBe(4);
    for (const h of [scenarioA(), scenarioB(), scenarioC(), scenarioD()]) {
      expect(h.state().seedVersion).toBe('koral-seed-v1');
    }
  });

  it('no scenario reads time, years or counts: replaying A twice is byte-identical', () => {
    expect(hashCanonicalMorphologyState(scenarioA().state())).toBe(hashCanonicalMorphologyState(scenarioA().state()));
  });
});

describe('KORA-WP-145 — determinism, replay, Editions', () => {
  it('rejects out-of-order events instead of silently sorting them', () => {
    const h = scenarioA();
    const shuffled = [h.events[1], h.events[0], ...h.events.slice(2)];
    expect(() => foldCanonicalMorphology(shuffled)).toThrow(/strictly ascending seq/);
  });

  it('prefix replay = Edition: the state at revision k never changes when later events are appended', () => {
    const h = scenarioD();
    const n = h.events.length;
    const before = Array.from({ length: n + 1 }, (_, k) => hashCanonicalMorphologyState(foldCanonicalMorphology(h.events.slice(0, k))));
    h.P('late-1', 'LEGACY').X('late-1', 'IMPACT').C('5');
    for (let k = 0; k <= n; k++) {
      const atRevisionK = h.events.filter((e) => e.resultingStateRevision <= k);
      expect(hashCanonicalMorphologyState(foldCanonicalMorphology(atRevisionK))).toBe(before[k]);
    }
    expect(foldCanonicalMorphology(h.events.slice(0, n)).boundaryRevision).toBe(n);
  });

  it('the Edition hash is a SHA-256 hex digest under the recorded engine version', () => {
    const hash = hashCanonicalMorphologyState(scenarioB().state());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(getMorphologyEngineVersion()).toBe('koral-morphology-v2');
    expect(scenarioB().state().morphologyEngineVersion).toBe('koral-morphology-v2');
  });

  it('legacy v1: the extracted Level A lineage fold is unchanged and ignores the v2 `fuse` operation', () => {
    const rows = [
      { domain: 'initiative', sourceEntityId: 'a', operation: 'add_element' },
      { domain: 'initiative', sourceEntityId: 'b', operation: 'add_element' },
      { domain: 'initiative', sourceEntityId: 'a', operation: 'increase_extent' },
      { domain: 'initiative', sourceEntityId: 'b', operation: 'reorient' },
      { domain: 'initiative', sourceEntityId: 'c', operation: 'fuse' },
      { domain: 'initiative', sourceEntityId: 'a', operation: 'remove_element' },
      { domain: 'initiative', sourceEntityId: 'b', operation: 'stabilize' },
    ];
    expect(foldLineage(rows)).toEqual([
      { domain: 'initiative', slotIndex: 0, present: false, extentStep: 1, directionOrdinal: 0, stabilityState: 'unsettled' },
      { domain: 'initiative', slotIndex: 1, present: true, extentStep: 0, directionOrdinal: 1, stabilityState: 'settled' },
    ]);
    expect(foldLineage(rows.filter((r) => r.operation !== 'fuse'))).toEqual(foldLineage(rows));
  });
});

describe('KORA-WP-145 — bounds hold under fixed-seed fuzzed histories', () => {
  // Deterministic PRNG, seeded inside the test only — production has no randomness.
  function prng(seed: number) {
    let x = seed >>> 0;
    return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 0x100000000; };
  }
  const AREAS: MorphologyAreaCode[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
  const B = getCanonicalMorphologyConfig().bounds;

  it('member cap, branch depth, branches per area, cavity cap, joint cap, visible memory cap and core mass bounds — for every prefix', () => {
    for (let run = 0; run < 40; run++) {
      const rnd = prng(1000 + run);
      const h = history();
      const live: string[] = [];
      let n = 0;
      for (let step = 0; step < 60; step++) {
        const r = rnd();
        const area = AREAS[Math.floor(rnd() * AREAS.length)];
        if (r < 0.4 || live.length < 2) { const id = `i${n++}`; h.P(id, area); live.push(id); }
        else if (r < 0.6) { const id = live.splice(Math.floor(rnd() * live.length), 1)[0]; h.C(id); }
        else if (r < 0.85) { h.X(live[Math.floor(rnd() * live.length)], area); }
        else if (live.length >= 3) {
          const a = live.splice(Math.floor(rnd() * live.length), 1)[0];
          const b = live.splice(Math.floor(rnd() * live.length), 1)[0];
          const id = `i${n++}`; h.K([a, b], id, area); live.push(id);
        }
        const s = h.state();
        expect(s.elements.filter((e) => e.active).length).toBeLessThanOrEqual(B.maxActiveMembers);
        expect(Math.max(...s.elements.map((e) => e.depth))).toBeLessThanOrEqual(B.maxBranchDepth);
        for (const a of s.areas) expect(s.elements.filter((e) => e.kind === 'branch' && e.active && e.parentId === a.primaryId).length).toBeLessThanOrEqual(B.maxBranchesPerArea);
        expect(openCavities(s).length).toBeLessThanOrEqual(B.maxOpenCavities);
        expect(activeJoints(s).length).toBeLessThanOrEqual(B.maxActiveFusionJoints);
        expect(s.memoryTraces.length).toBeLessThanOrEqual(B.maxVisibleMemoryTraces);
        expect(s.core.massShare).toBeGreaterThanOrEqual(B.coreMassShareMin);
        expect(s.core.massShare).toBeLessThanOrEqual(B.coreMassShareMax);
        for (const c of s.cavities) expect(c.kind).toBe('fusion-enclosed');
      }
      expect(hashCanonicalMorphologyState(h.state())).toBe(hashCanonicalMorphologyState(foldCanonicalMorphology([...h.events])));
    }
  });
});

describe('KORA-WP-145 erratum E1 — an absorbed element is never reused as independent geometry', () => {
  // §10 regression: IMPACT's grown primary is absorbed into seed:0 (active joint, open cavity), then IMPACT returns.
  const absorbed = () => history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'IMPACT').K(['1', '4'], 'k', 'LIFE');
  const returned = () => absorbed().P('5', 'IMPACT');
  const JOINT = 'fusion:5:grown:3+seed:0';
  const CAVITY = 'fusion-enclosed:grown:3+seed:0';

  it('setup: grown:3 absorbed into seed:0 through an active cross-area joint enclosing an open cavity', () => {
    const s = absorbed().state();
    expect([el(s, 'grown:3').assignment, el(s, 'grown:3').fusedInto]).toEqual(['fused', 'seed:0']);
    expect(activeJoints(s).map((j) => j.fusionId)).toEqual([JOINT]);
    expect(openCavities(s).map((c) => c.cavityId)).toEqual([CAVITY]);
  });

  it('A — the absorbed primary is not re-adopted when its area returns', () => {
    const g = el(returned().state(), 'grown:3');
    expect([g.assignment, g.fusedInto, g.active, g.areaId]).toEqual(['fused', 'seed:0', false, null]);
  });

  it('B — the returning area receives a NEW deterministic generation primary', () => {
    const s = returned().state();
    expect(s.areas.find((a) => a.areaId === 'IMPACT')).toMatchObject({ present: true, primaryId: 'grown:3:g2' });
    expect(el(s, 'grown:3:g2')).toMatchObject({ assignment: 'adopted', active: true, origin: 'core', parentId: 'core', fusedInto: null });
    expect(hashCanonicalMorphologyState(returned().state())).toBe(hashCanonicalMorphologyState(s));
    // a second absorb-and-return cycle allocates the third generation
    const t = returned().K(['k', '5'], 'k2', 'LIFE').P('6', 'IMPACT').state();
    expect(el(t, 'grown:3:g2').assignment).toBe('fused');
    expect(t.areas.find((a) => a.areaId === 'IMPACT')?.primaryId).toBe('grown:3:g3');
  });

  it('C/D — the original joint and its fusion-enclosed cavity are unchanged', () => {
    const before = absorbed().state();
    const after = returned().state();
    expect(after.fusions.find((j) => j.fusionId === JOINT)).toEqual(before.fusions.find((j) => j.fusionId === JOINT));
    expect(after.cavities.find((c) => c.cavityId === CAVITY)).toEqual(before.cavities.find((c) => c.cavityId === CAVITY));
    expect(after.cavities.find((c) => c.cavityId === CAVITY)).toMatchObject({ open: true, closedAtRevision: null });
  });

  it('memory: the return records exactly the ordinary single growth trace, on the new generation', () => {
    const before = absorbed().state();
    const after = returned().state();
    expect(after.memoryTraceTotal).toBe(before.memoryTraceTotal + 1);
    const t = after.memoryTraces.at(-1)!;
    expect([t.kind, t.subject.type, t.subject.id, t.host.elementId]).toEqual(['growth', 'element', 'grown:3:g2', 'grown:3:g2']);
  });

  // cap variant: the same absorption, then the member cap is filled before IMPACT returns
  const absorbedAtCap = () => absorbed().P('6', 'LEGACY').P('7', 'GROWTH').X('7', 'LIFE').P('8', 'LIFE').X('8', 'GROWTH');

  it('E/F — at the member cap the returning area is present with no geometry: no seventh member, no phantom, fusion intact', () => {
    const before = absorbedAtCap().state();
    expect(active(before)).toHaveLength(getCanonicalMorphologyConfig().bounds.maxActiveMembers);
    const after = absorbedAtCap().P('9', 'IMPACT').state();
    expect(after.areas.find((a) => a.areaId === 'IMPACT')).toMatchObject({ present: true, primaryId: null });
    expect(active(after)).toEqual(active(before));
    expect(after.elements.map((e) => e.id)).toEqual(before.elements.map((e) => e.id)); // no element created, none resurrected
    expect([el(after, 'grown:3').assignment, el(after, 'grown:3').fusedInto]).toEqual(['fused', 'seed:0']);
    expect(after.fusions).toEqual(before.fusions);
    expect(after.cavities).toEqual(before.cavities);
    expect(after.memoryTraceTotal).toBe(before.memoryTraceTotal + 1);
    const t = after.memoryTraces.at(-1)!;
    expect([t.kind, t.subject.type, t.host.elementId]).toEqual(['growth', 'area', 'core']);
  });

  it('G — an UNASSIGNED, non-fused seed element is still re-adopted; a RETIRED grown id is still reused', () => {
    const seed = history().P('1', 'LIFE').C('1').P('2', 'LIFE').state();
    expect(seed.areas.find((a) => a.areaId === 'LIFE')?.primaryId).toBe('seed:0');
    expect(seed.elements.some((e) => e.id.includes(':g'))).toBe(false);
    const retired = history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'IMPACT').C('4').P('5', 'IMPACT').state();
    expect(retired.areas.find((a) => a.areaId === 'IMPACT')?.primaryId).toBe('grown:3');
    expect(retired.elements.some((e) => e.id.includes(':g'))).toBe(false);
  });

  it('H — the A–D golden states are byte-identical to the accepted WP145 closure (aa94f8b)', () => {
    expect(hashCanonicalMorphologyState(scenarioA().state())).toBe('0909b971badb9fdaad59b9bf9684f66896867118fb60ee35f33892316e23367c');
    expect(hashCanonicalMorphologyState(scenarioB().state())).toBe('e01c8c02db768e64072c044e92a01385362d9cab0a6821d04c554714428b3d1b');
    expect(hashCanonicalMorphologyState(scenarioC().state())).toBe('7b2d11e028a5f5f5f8af3fc8ddb4e81f4105f817d35ad9cab77b0e7f167b7c76');
    expect(hashCanonicalMorphologyState(scenarioD().state())).toBe('ed88caabcab2bd11644b693c0b001e5be47c5ca691745ab34caae2a6f60f0cc7');
  });

  it('I — the fold fails closed on an invalid fusion/cavity state', () => {
    const s = absorbed().state();
    const resurrected = { ...s, elements: s.elements.map((e) => (e.id === 'grown:3' ? { ...e, assignment: 'adopted' as const, active: true, fusedInto: null } : e)) };
    expect(() => assertCanonicalMorphologyInvariants(resurrected)).toThrow(/erratum E1/);
    const orphanCavity = { ...s, fusions: s.fusions.map((j) => ({ ...j, active: false })) };
    expect(() => assertCanonicalMorphologyInvariants(orphanCavity)).toThrow(/open cavity/);
    const fusedActive = { ...s, elements: s.elements.map((e) => (e.id === 'grown:3' ? { ...e, active: true } : e)) };
    expect(() => assertCanonicalMorphologyInvariants(fusedActive)).toThrow(/fused and active/);
    expect(() => assertCanonicalMorphologyInvariants(s)).not.toThrow();
  });

  it('J — branch instance: an absorbed branch is not overwritten; a new redirected growth gets the next branch generation', () => {
    const fusedBranch = () => history().P('1', 'LIFE').P('2', 'GROWTH').X('2', 'LIFE').K(['1', '2'], 'k', 'LIFE');
    const before = fusedBranch().state();
    expect([el(before, 'branch:seed:0').assignment, el(before, 'branch:seed:0').fusedInto]).toEqual(['fused', 'seed:0']);
    const intra = activeJoints(before).find((j) => j.kind === 'intra-area')!;
    const after = fusedBranch().P('3', 'GROWTH').X('3', 'LIFE').state();
    expect(el(after, 'branch:seed:0')).toEqual(el(before, 'branch:seed:0'));
    expect(after.fusions.find((j) => j.fusionId === intra.fusionId)).toEqual(intra);
    expect(el(after, 'branch:seed:0:g2')).toMatchObject({ kind: 'branch', assignment: 'adopted', active: true, parentId: 'seed:0' });
    expect(after.areas.find((a) => a.areaId === 'LIFE')?.branchId).toBe('branch:seed:0:g2');
    // memory exactly as the pre-E1 engine recorded it (GROWTH withdrawal scar + branch growth + reorientation); only the host id is new
    expect(after.memoryTraceTotal).toBe(fusedBranch().P('3', 'GROWTH').state().memoryTraceTotal + 3);
    expect(after.memoryTraces.slice(-3).map((t) => [t.kind, t.subject.id, t.host.elementId])).toEqual([
      ['scar', 'rank:1', 'core'], ['growth', 'branch:seed:0:g2', 'branch:seed:0:g2'], ['reorientation', 'branch:seed:0:g2', 'branch:seed:0:g2'],
    ]);
  });

  it('K — a member absorbed WITHOUT a joint (joint cap saturated) is still absorbed and its id is never reused', () => {
    // three cross-area absorptions into seed:0; maxActiveFusionJoints = 2, so the third (grown:4) has no joint
    const h = () => history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'IMPACT').P('5', 'LEGACY')
      .K(['1', '3'], 'k1', 'LIFE').K(['k1', '4'], 'k2', 'LIFE').K(['k2', '5'], 'k3', 'LIFE');
    const s = h().state();
    expect([el(s, 'grown:4').assignment, el(s, 'grown:4').fusedInto]).toEqual(['fused', 'seed:0']);
    expect(s.fusions.some((j) => j.memberIds.includes('grown:4'))).toBe(false);
    const t = h().P('6', 'LEGACY').state();
    expect([el(t, 'grown:4').assignment, el(t, 'grown:4').active]).toEqual(['fused', false]);
    expect(t.areas.find((a) => a.areaId === 'LEGACY')?.primaryId).toBe('grown:4:g2');
  });

  it('L — two generations of one neutral rank share the canonical slot reference and remain distinct elements', () => {
    const s = returned().state();
    const [g1, g2] = [el(s, 'grown:3'), el(s, 'grown:3:g2')];
    expect(g1.id).not.toBe(g2.id);
    expect(g1.heading.slot).toBe(g2.heading.slot);
    expect([g1.assignment, g2.assignment]).toEqual(['fused', 'adopted']);
    expect(JSON.stringify(projectCanonicalMorphologyForExpression(s))).not.toMatch(/LIFE|GROWTH|CONNECTION|IMPACT|LEGACY/);
  });

  it('M + fuzz — no element is ever fused+active, fused+adopted or fused+unassigned; every open cavity has active fusion topology', () => {
    function prng(seed: number) {
      let x = seed >>> 0;
      return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 0x100000000; };
    }
    const AREAS: MorphologyAreaCode[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
    let generations = 0;
    for (let run = 0; run < 120; run++) {
      const rnd = prng(5000 + run);
      const h = history();
      const live: string[] = [];
      let n = 0;
      for (let step = 0; step < 50; step++) {
        const r = rnd();
        const area = AREAS[Math.floor(rnd() * AREAS.length)];
        if (r < 0.4 || live.length < 2) { const id = `i${n++}`; h.P(id, area); live.push(id); }
        else if (r < 0.6) h.C(live.splice(Math.floor(rnd() * live.length), 1)[0]);
        else if (r < 0.85) h.X(live[Math.floor(rnd() * live.length)], area);
        else if (live.length >= 3) {
          const a = live.splice(Math.floor(rnd() * live.length), 1)[0];
          const b = live.splice(Math.floor(rnd() * live.length), 1)[0];
          const id = `i${n++}`; h.K([a, b], id, area); live.push(id);
        }
        const s = h.state(); // the fold itself also asserts the invariant and would throw
        for (const e of s.elements) {
          if (e.assignment === 'fused') expect([e.active, e.fusedInto === null]).toEqual([false, false]);
          else expect(e.fusedInto).toBeNull();
        }
        for (const c of openCavities(s)) {
          const j = s.fusions.find((f) => f.fusionId === c.fusionId);
          expect(j?.active).toBe(true);
          for (const id of j!.memberIds) if (id !== j!.resultMemberId) expect(el(s, id).fusedInto).toBe(j!.resultMemberId);
        }
      }
      generations += h.state().elements.filter((e) => /:g\d+$/.test(e.id)).length;
    }
    expect(generations).toBeGreaterThan(0); // the fuzz really exercises E1
  });
});

describe('KORA-WP-145 — privacy (P1) and the WP-146 boundary', () => {
  it('canonical state never carries an internal UUID; the public projection carries no pillar code', () => {
    const uuid = '6f1d2c1e-0b7a-4a54-9a1e-2f0d6c1b9a10';
    const s = history().P(uuid, 'LIFE').P('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'IMPACT').state();
    const json = JSON.stringify(s);
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const projected = JSON.stringify(projectCanonicalMorphologyForExpression(s));
    for (const code of ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']) expect(projected).not.toContain(code);
  });

  it('the fold and its types contain no renderer data: no coordinates, mesh, SVG, colour or material', () => {
    for (const f of ['lib/living-koral-mark/canonical-morphology.ts', 'lib/living-koral-mark/canonical-morphology-types.ts', 'lib/living-koral-morphology-config/v1.ts', 'lib/living-koral-morphology-config/types.ts']) {
      expect(codeOnly(f)).not.toMatch(/\bsvg\b|\bmesh\b|\bgltf\b|\bcolou?r\b|\bmaterial\b|\bbronze\b|\bpx\b|\bmm\b/i);
    }
  });

  it('the pure fold has no clock, no randomness and no I/O', () => {
    const code = codeOnly('lib/living-koral-mark/canonical-morphology.ts');
    expect(code).not.toMatch(/Math\.random|Date\.now|new Date|performance\.now/);
    expect(code).not.toMatch(/supabase|fetch\(|readFileSync/);
  });

  it('no WP-146 renderer or WP-117 wiring is introduced: the deferred renderer files are untouched and import nothing from v2', () => {
    for (const f of ['lib/living-koral-mark/morphology-engine.ts', 'lib/living-koral-mark/svg-renderer.ts', 'lib/living-koral-mark/mark-service.ts']) {
      let src = '';
      try { src = read(f); } catch { continue; }
      expect(src).not.toMatch(/canonical-morphology/);
    }
  });
});

describe('KORA-WP-145 — migrations 091–094 (structural)', () => {
  const m091 = read('supabase/migrations/091_living_koral_morphology_area.sql');
  const m092 = read('supabase/migrations/092_living_koral_consolidation_source.sql');
  const m093 = read('supabase/migrations/093_living_koral_edition_morphology.sql');
  const m094 = read('supabase/migrations/094_living_koral_morphology_area_backfill.sql');

  it('091: nullable pillar-coded area on Material Change and ledger; area immutable; `fuse` widened into the operation CHECK', () => {
    expect(m091).toMatch(/ALTER TABLE gov\.living_koral_material_change\s+ADD COLUMN IF NOT EXISTS affected_area text NULL/);
    expect(m091).toMatch(/ALTER TABLE gov\.living_koral_transformation_ledger\s+ADD COLUMN IF NOT EXISTS affected_area text NULL/);
    expect(m091).toMatch(/OR NEW\.affected_area IS DISTINCT FROM OLD\.affected_area/);
    expect(m091).toMatch(/CHECK \(operation IN \('add_element', 'remove_element', 'increase_extent', 'decrease_extent', 'reorient', 'stabilize', 'fuse'\)\)/);
  });

  it('092: append-only, tenant-matched, Consolidation-only source table; fuse requires >= 2 sources; area copied onto the ledger', () => {
    expect(m092).toMatch(/CREATE TABLE IF NOT EXISTS gov\.living_koral_consolidation_source/);
    expect(m092).toMatch(/UNIQUE \(material_change_id, source_entity_id\)/);
    expect(m092).toMatch(/kora\/tenant-mismatch/);
    expect(m092).toMatch(/kora\/sources-after-recognition/);
    expect(m092).toMatch(/BEFORE UPDATE OR DELETE ON gov\.living_koral_consolidation_source/);
    expect(m092).toMatch(/FORCE ROW LEVEL SECURITY/);
    expect(m092).toMatch(/kora\/insufficient-sources/);
    expect(m092).toMatch(/v_mc\.affected_domain, v_mc\.affected_area/);
  });

  it('093: set-once Edition crystallisation, service-role-only, Company sessions cannot forge it', () => {
    expect(m093).toMatch(/ADD COLUMN IF NOT EXISTS morphology_engine_version text NULL/);
    expect(m093).toMatch(/morphology_state_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
    expect(m093).toMatch(/SECURITY DEFINER/);
    expect(m093).toMatch(/FROM authenticated;/);
    expect(m093).toMatch(/TO service_role;/);
    expect(m093).not.toMatch(/TO authenticated;/);
    expect(m093).toMatch(/kora\/boundary-mismatch/);
  });

  it('094: Founder M1 staging backfill in its own append-only table, refuses to run once a v2 Edition exists, never rewrites the ledger', () => {
    expect(m094).toMatch(/kora\/m1-precondition-failed/);
    expect(m094).toMatch(/CREATE TABLE IF NOT EXISTS gov\.living_koral_morphology_area_backfill/);
    expect(m094).not.toMatch(/UPDATE gov\.living_koral_transformation_ledger|UPDATE gov\.living_koral_material_change/);
    expect(m094).toMatch(/FROM gov\.living_koral_material_change mc\s+JOIN personal\.worker_initiative wi/);
  });

  it('the Consolidation config is live as `fuse`, and Advisor confirmation still excludes Consolidation (discrete)', async () => {
    const { getMorphogenesisOperationForCategory } = await import('@/lib/living-koral-morphogenesis-config/v1');
    expect(getMorphogenesisOperationForCategory('Consolidation')).toBe('fuse');
    const { isEligibleForAdvisorConfirmation } = await import('@/lib/living-koral-review/types');
    expect(isEligibleForAdvisorConfirmation('Consolidation')).toBe(false);
    expect(isEligibleForAdvisorConfirmation('Reorientation')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Real-DB section — local Supabase only (same guard as WP-112/113).
function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}
const KNOWN_NON_THROWAWAY_PROJECT_REFS = ['azdnepfmwrmacruykskm', 'haqflkurpmeaxpikozjl'];
function assertLocalOnly(varName: string, url: string): void {
  const lower = url.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) if (lower.includes(ref)) throw new Error(`${varName} matches a known staging/production project ref — refusing to proceed.`);
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) throw new Error(`${varName} points at a hosted Supabase domain — refusing to proceed.`);
  const host = new URL(url).hostname.toLowerCase();
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error(`${varName} host "${host}" is not local — refusing to proceed.`);
}

const pgUrl = readEnv('WP145_PG_URL');
const supabaseUrl = readEnv('WP145_SUPABASE_URL');
const serviceRoleKey = readEnv('WP145_SERVICE_ROLE_KEY');
const ready = Boolean(pgUrl && supabaseUrl && serviceRoleKey && readEnv('WP145_ALLOW_RUN') === 'true');

describe('WP-145 guard — every *_URL env var (if set) must be local-only', () => {
  it('WP145_PG_URL / WP145_SUPABASE_URL are either unset or local-only', () => {
    if (pgUrl) expect(() => assertLocalOnly('WP145_PG_URL', pgUrl)).not.toThrow();
    if (supabaseUrl) expect(() => assertLocalOnly('WP145_SUPABASE_URL', supabaseUrl)).not.toThrow();
  });
});

const RUN = `${Date.now().toString(16)}`.slice(-10);

describe.skipIf(!ready)('KORA-WP-145 — real service-layer proof (local Supabase)', () => {
  it('area snapshot, Reorientation candidate, consolidation fuse ordering, DB guards, set-once Edition crystallisation and rebuild', async () => {
    if (!pgUrl || !supabaseUrl || !serviceRoleKey) throw new Error('unreachable');
    assertLocalOnly('WP145_PG_URL', pgUrl);
    assertLocalOnly('WP145_SUPABASE_URL', supabaseUrl);
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
    const db = new Client({ connectionString: pgUrl });
    await db.connect();
    try {
      const tenant = (await db.query<{ id: string }>(`INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`, [`WP145-FIXTURE-${RUN}`, 'WP-145 Real-DB Fixture Tenant'])).rows[0].id;
      const other = (await db.query<{ id: string }>(`INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`, [`WP145-OTHER-${RUN}`, 'WP-145 Other Tenant'])).rows[0].id;
      const initiative = async (pillar: string, status = 'draft') => (await db.query<{ id: string }>(
        `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, eligibility_class, status) VALUES ($1, $2, $3, 'eligible', $4) RETURNING id`,
        [tenant, `WP-145 fixture ${pillar}`, pillar, status])).rows[0].id;

      const { observeInitiativeTransition, observeInitiativePillarChange, observeInitiativeConsolidation } = await import('@/lib/living-koral-material-change/initiative-adapter');
      const { recordLivingKoralTransformation } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');
      const { fetchCanonicalLedgerEvents, computeCanonicalMorphologyAtRevision, recordEditionMorphology, verifyEditionMorphology } = await import('@/lib/living-koral-mark/canonical-morphology-service');
      const actor = { actorRole: 'KORA_ADMIN', actorId: 'wp145-fixture' };
      const publish = async (id: string) => {
        await db.query(`UPDATE personal.worker_initiative SET status = 'published' WHERE id = $1`, [id]);
        await observeInitiativeTransition({ tenantId: tenant, initiativeId: id, previousStatus: 'draft', newStatus: 'published', ...actor });
      };

      // 1. Emergence snapshots the area onto the Material Change and the ledger.
      const life = await initiative('LIFE');
      await publish(life);
      const mcArea = await db.query(`SELECT affected_area FROM gov.living_koral_material_change WHERE source_entity_id = $1 AND category = 'Emergence'`, [life]);
      expect(mcArea.rows[0].affected_area).toBe('LIFE');
      const ledgerArea = await db.query(`SELECT l.affected_area FROM gov.living_koral_transformation_ledger l JOIN gov.living_koral_material_change m ON m.id = l.material_change_id WHERE m.source_entity_id = $1`, [life]);
      expect(ledgerArea.rows[0].affected_area).toBe('LIFE');
      // the area is immutable once written
      await expect(db.query(`UPDATE gov.living_koral_material_change SET affected_area = 'IMPACT' WHERE source_entity_id = $1`, [life])).rejects.toThrow(/kora\/immutable/);

      // 2. Pillar change of a published initiative -> Reorientation CANDIDATE only (Advisor-confirmed later).
      const growth = await initiative('GROWTH');
      await publish(growth);
      await db.query(`UPDATE personal.worker_initiative SET pillar = 'LIFE' WHERE id = $1`, [growth]);
      const candidate = await observeInitiativePillarChange({ tenantId: tenant, initiativeId: growth, previousPillar: 'GROWTH', newPillar: 'LIFE', ...actor });
      expect(candidate?.status).toBe('CANDIDATE');
      expect(candidate?.category).toBe('Reorientation');
      expect(candidate?.affectedArea).toBe('LIFE');
      // simulate the Advisor confirmation outcome (KORA-WP-116 Mode B is covered by its own suite)
      await db.query(`UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'advisor-confirmed' WHERE id = $1`, [candidate!.id]);
      await recordLivingKoralTransformation({ materialChangeId: candidate!.id, tenantId: tenant });

      // 3. Consolidation: result published + sources closed as one action; fuse recorded BEFORE the per-initiative rows.
      const impact = await initiative('IMPACT');
      await publish(impact);
      const legacy = await initiative('LEGACY');
      await publish(legacy);
      const result = await initiative('IMPACT');
      await db.query(`UPDATE personal.worker_initiative SET status = 'published' WHERE id = $1`, [result]);
      await db.query(`UPDATE personal.worker_initiative SET status = 'closed' WHERE id = ANY($1::uuid[])`, [[impact, legacy]]);
      const consolidation = await observeInitiativeConsolidation({
        tenantId: tenant, resultInitiativeId: result, resultPreviousStatus: 'draft', sourceInitiativeIds: [impact, legacy],
        sourcePreviousStatus: { [impact]: 'published', [legacy]: 'published' }, ...actor,
      });
      expect(consolidation?.status).toBe('RECOGNIZED');
      const srcRows = await db.query(`SELECT count(*)::int AS n FROM gov.living_koral_consolidation_source WHERE material_change_id = $1`, [consolidation!.id]);
      expect(srcRows.rows[0].n).toBe(2);
      const ops = await db.query<{ operation: string }>(`SELECT operation FROM gov.living_koral_transformation_ledger WHERE tenant_id = $1 ORDER BY recognized_at, created_at, id`, [tenant]);
      const opList = ops.rows.map((r) => r.operation);
      expect(opList.indexOf('fuse')).toBeGreaterThan(-1);
      expect(opList.slice(opList.indexOf('fuse') + 1)).toEqual(['add_element', 'remove_element', 'remove_element']);

      // 4. DB guards: a fuse with fewer than two sources is refused; sources cannot be attached after recognition or across tenants; no mutation.
      await expect(db.query(`INSERT INTO gov.living_koral_consolidation_source (tenant_id, material_change_id, source_entity_type, source_entity_id) VALUES ($1, $2, 'initiative', gen_random_uuid())`, [tenant, consolidation!.id])).rejects.toThrow(/kora\/sources-after-recognition/);
      const lonely = (await db.query<{ id: string }>(`INSERT INTO gov.living_koral_material_change (tenant_id, status, category, affected_domain, affected_area, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id) VALUES ($1, 'CANDIDATE', 'Consolidation', 'initiative', 'LIFE', 'initiative', gen_random_uuid(), now(), 'WP-145 fixture', '1.0', 'SYSTEM', 'wp145') RETURNING id`, [tenant])).rows[0].id;
      await expect(db.query(`INSERT INTO gov.living_koral_consolidation_source (tenant_id, material_change_id, source_entity_type, source_entity_id) VALUES ($1, $2, 'initiative', gen_random_uuid())`, [other, lonely])).rejects.toThrow(/kora\/tenant-mismatch/);
      await db.query(`INSERT INTO gov.living_koral_consolidation_source (tenant_id, material_change_id, source_entity_type, source_entity_id) VALUES ($1, $2, 'initiative', gen_random_uuid())`, [tenant, lonely]);
      await db.query(`UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`, [lonely]);
      await expect(db.query(`SELECT * FROM gov.record_living_koral_transformation($1, 'fuse', 'morphogenesis-v1.2')`, [lonely])).rejects.toThrow(/kora\/insufficient-sources/);
      await expect(db.query(`DELETE FROM gov.living_koral_consolidation_source WHERE material_change_id = $1`, [consolidation!.id])).rejects.toThrow(/kora\/immutable/);

      // 5. The DB-backed replay folds to the expected morphology with the same pure engine.
      const revision = (await db.query<{ r: number }>(`SELECT max(resulting_state_revision)::int AS r FROM gov.living_koral_transformation_ledger WHERE tenant_id = $1`, [tenant])).rows[0].r;
      const events = await fetchCanonicalLedgerEvents(tenant, revision);
      expect(events.every((e) => e.area !== null)).toBe(true);
      const state = await computeCanonicalMorphologyAtRevision(tenant, revision);
      expect(state.areas.find((a) => a.areaId === 'LIFE')?.branchId).toBe('branch:seed:0'); // GROWTH initiative redirected into LIFE
      expect(state.fusions.some((f) => f.kind === 'cross-area' && f.active)).toBe(true); // LEGACY fused into IMPACT
      expect(JSON.stringify(state)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

      // 6. Edition crystallisation: set once, service-role only, rebuilds identically; other columns stay immutable.
      const ledgerRow = (await db.query<{ id: string; category: string; recognized_at: string; occurred_at: string }>(`SELECT id, category, recognized_at, occurred_at FROM gov.living_koral_transformation_ledger WHERE tenant_id = $1 AND resulting_state_revision = $2`, [tenant, revision])).rows[0];
      const edition = (await db.query<{ id: string }>(
        `INSERT INTO analytics.living_koral_edition (tenant_id, name, ledger_id, category, affected_domain, taxonomy_config_version, morphogenesis_engine_version, resulting_state_revision, occurred_at, recognized_at, actor_id)
         VALUES ($1, 'WP-145 fixture Edition', $2, $3, 'initiative', '1.0', 'morphogenesis-v1.2', $4, $5, $6, 'wp145') RETURNING id`,
        [tenant, ledgerRow.id, ledgerRow.category, revision, ledgerRow.occurred_at, ledgerRow.recognized_at])).rows[0].id;
      const first = await recordEditionMorphology({ tenantId: tenant, editionId: edition, boundaryRevision: revision });
      expect(first.recorded).toBe(true);
      expect(first.morphologyEngineVersion).toBe('koral-morphology-v2');
      const second = await recordEditionMorphology({ tenantId: tenant, editionId: edition, boundaryRevision: revision });
      expect(second.recorded).toBe(false);
      expect(second.morphologyStateHash).toBe(first.morphologyStateHash);
      await expect(db.query(`UPDATE analytics.living_koral_edition SET name = 'renamed' WHERE id = $1`, [edition])).rejects.toThrow(/kora\/immutable/);
      await expect(db.query(`UPDATE analytics.living_koral_edition SET morphology_state_hash = $2 WHERE id = $1`, [edition, 'f'.repeat(64)])).rejects.toThrow(/kora\/immutable/);
      await expect(db.query(`SELECT * FROM analytics.fn_record_living_koral_edition_morphology($1, $2, $3, 'koral-morphology-v2', $4)`, [tenant, edition, revision - 1, 'a'.repeat(64)])).rejects.toThrow(/kora\/boundary-mismatch/);
      const priv = await db.query(`SELECT has_function_privilege('authenticated', 'analytics.fn_record_living_koral_edition_morphology(uuid, uuid, integer, text, text)', 'EXECUTE') AS auth, has_function_privilege('service_role', 'analytics.fn_record_living_koral_edition_morphology(uuid, uuid, integer, text, text)', 'EXECUTE') AS svc`);
      expect(priv.rows[0].auth).toBe(false);
      expect(priv.rows[0].svc).toBe(true);

      // later ledger events never alter the Edition's rebuilt state
      const late = await initiative('CONNECTION');
      await publish(late);
      const verification = await verifyEditionMorphology({ tenantId: tenant, boundaryRevision: revision, morphologyEngineVersion: first.morphologyEngineVersion, morphologyStateHash: first.morphologyStateHash });
      expect(verification.status).toBe('match');
      const legacyEdition = await verifyEditionMorphology({ tenantId: tenant, boundaryRevision: revision, morphologyEngineVersion: null, morphologyStateHash: null });
      expect(legacyEdition.status).toBe('v1-legacy');

      // 7. The M1 backfill table exists, is append-only and KORA_ADMIN-only.
      const bf = await db.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'gov.living_koral_morphology_area_backfill'::regclass`);
      expect(bf.rows[0].relforcerowsecurity).toBe(true);
    } finally {
      await db.end();
    }
  }, 60_000);
});
