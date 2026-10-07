/**
 * KORA-WP-146 — Living KORAL Dual Renderer: 3D Sculpture (GLB) + Living KORAL Mark (SVG).
 *
 * Mechanical acceptance (Registry 219 KORA-WP-146): both outputs are derived
 * from ONE accepted KORA-WP-145 CanonicalMorphologyState through ONE shared
 * projection, deterministically; they correspond to the state (elements,
 * fusions, cavities, memory) and to each other; no Pillar identity is
 * decodable (P1); the seed renders with zero memory; renderer topology never
 * invents a cavity. Founder Visual Acceptance is separate and is NOT asserted
 * here.
 *
 * Review artifacts (env-gated, not part of the default run):
 *   WP146_WRITE_REVIEW_ARTIFACTS=<dir>  writes seed + A–D GLB/SVG/state summaries.
 *   WP146_FUZZ_FULL=1                    widens the 3D topology fuzz to 400 states.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  foldCanonicalMorphology, canonicalSeedState, hashCanonicalMorphologyState, projectCanonicalMorphologyForExpression,
} from '@/lib/living-koral-mark/canonical-morphology';
import type { CanonicalLedgerEvent, CanonicalMorphologyState } from '@/lib/living-koral-mark/canonical-morphology-types';
import type { MorphologyAreaCode } from '@/lib/living-koral-morphology-config/types';
import { getCanonicalMorphologyConfig } from '@/lib/living-koral-morphology-config/v1';
import { renderLivingKoral, projectRenderScene, RENDERER_VERSION, sceneInvariants } from '@/lib/living-koral-render';
import { renderMark } from '@/lib/living-koral-render/mark';
import { renderSculpture } from '@/lib/living-koral-render/sculpture';
import { getRendererConfig } from '@/lib/living-koral-render/config-v2';

const REPO_ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), 'utf-8');
const codeOnly = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // comments carry no behaviour
const RENDER_FILES = readdirSync(join(REPO_ROOT, 'lib/living-koral-render')).filter((f) => f.endsWith('.ts')).map((f) => `lib/living-koral-render/${f}`);
const RC = getRendererConfig();
const SILHOUETTE_IOU_MAX = 0.85; // A vs C, box-normalised front silhouettes (measured 0.789 at v2.1)
const SILHOUETTE_ASPECT_GAP = 0.05; // A spreads wider than C (measured 1.443 vs 1.336)
const V = 0.0024; // the coarsest grid the renderer accepts (fast); the review artifacts use a finer one

// ── fixture history builder (same canonical replay order as the WP-145 suite) ──
function history() {
  const events: CanonicalLedgerEvent[] = [];
  let seq = 0;
  const push = (e: Omit<CanonicalLedgerEvent, 'seq' | 'resultingStateRevision'>) => { seq += 1; events.push({ ...e, seq, resultingStateRevision: seq }); };
  const h = {
    events,
    P: (i: string, area: MorphologyAreaCode) => { push({ operation: 'add_element', category: 'Emergence', sourceKey: i, area }); return h; },
    C: (i: string) => { push({ operation: 'remove_element', category: 'Disappearance', sourceKey: i, area: null }); return h; },
    X: (i: string, area: MorphologyAreaCode) => { push({ operation: 'reorient', category: 'Reorientation', sourceKey: i, area }); return h; },
    K: (sources: string[], result: string, area: MorphologyAreaCode) => {
      push({ operation: 'fuse', category: 'Consolidation', sourceKey: result, area, consolidationSources: sources });
      push({ operation: 'add_element', category: 'Emergence', sourceKey: result, area });
      for (const s of sources) push({ operation: 'remove_element', category: 'Disappearance', sourceKey: s, area: null });
      return h;
    },
    state: () => foldCanonicalMorphology(events),
  };
  return h;
}

type Hist = ReturnType<typeof history>;
const scenarioA = (): Hist => history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'GROWTH').X('2', 'LIFE').X('4', 'CONNECTION');
const scenarioB = (): Hist => history().P('1', 'LIFE').P('2', 'CONNECTION').P('3', 'IMPACT').K(['1', '3'], '4', 'CONNECTION');
const scenarioC = (): Hist => history().P('1', 'GROWTH').P('2', 'LEGACY').P('3', 'IMPACT').P('4', 'GROWTH').K(['1', '4'], '5', 'GROWTH').C('3').C('2');
const scenarioD = (): Hist => history().P('1', 'IMPACT').P('2', 'LIFE').P('3', 'LIFE').X('3', 'IMPACT').P('4', 'GROWTH').K(['1', '4'], '5', 'IMPACT').C('3').C('2');
const GOLDEN: Record<string, () => CanonicalMorphologyState> = {
  seed: () => canonicalSeedState(), A: () => scenarioA().state(), B: () => scenarioB().state(), C: () => scenarioC().state(), D: () => scenarioD().state(),
};

const AREAS: MorphologyAreaCode[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
function prng(seed: number) {
  let x = seed >>> 0;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 0x100000000; };
}
/** Fixed-seed random histories (test-only randomness; production has none). */
function fuzzState(run: number): CanonicalMorphologyState {
  const rnd = prng(7000 + run);
  const h = history();
  const live: string[] = [];
  let n = 0;
  const steps = 6 + (run % 40);
  for (let s = 0; s < steps; s++) {
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
  }
  return h.state();
}

const rendered = new Map<string, ReturnType<typeof renderLivingKoral>>();
const golden = (k: string) => {
  if (!rendered.has(k)) rendered.set(k, renderLivingKoral(GOLDEN[k](), { voxel: V }));
  return rendered.get(k)!;
};

function glbJson(glb: Uint8Array): { materials: { name: string }[]; meshes: { primitives: { material: number }[] }[]; extras: Record<string, unknown> } {
  const b = Buffer.from(glb);
  const len = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
}

// ── 1. determinism and identity ─────────────────────────────────────────────
describe('KORA-WP-146 — deterministic, versioned output identity', () => {
  it('same state → byte-identical GLB, byte-identical SVG, identical output id (every golden state)', () => {
    for (const k of Object.keys(GOLDEN)) {
      const a = golden(k);
      const b = renderLivingKoral(GOLDEN[k](), { voxel: V });
      expect(Buffer.from(b.sculpture.glb).equals(Buffer.from(a.sculpture.glb))).toBe(true);
      expect(b.mark.svg).toBe(a.mark.svg);
      expect(b.identity).toEqual(a.identity);
    }
  }, 300_000);

  it('identity = canonical state hash + renderer version + parameters → output hashes', () => {
    const r = golden('B');
    expect(r.identity.canonicalStateHash).toBe(hashCanonicalMorphologyState(scenarioB().state()));
    expect(r.identity.rendererVersion).toBe(RENDERER_VERSION);
    expect(r.identity.sculptureSha256).toBe(createHash('sha256').update(r.sculpture.glb).digest('hex'));
    expect(r.identity.markSha256).toBe(createHash('sha256').update(r.mark.svg).digest('hex'));
    const finer = renderLivingKoral(scenarioB().state(), { voxel: 0.002 });
    expect(finer.identity.outputId).not.toBe(r.identity.outputId); // parameters are part of the identity
    expect(finer.mark.svg).toBe(r.mark.svg); // the Mark does not depend on the sculpture grid
    // P1: the public file carries the pillar-free scene hash, never the canonical state hash
    const ex = glbJson(r.sculpture.glb).extras;
    expect(ex).toEqual({ rendererVersion: RENDERER_VERSION, sceneHash: r.identity.sceneHash, voxel: V });
    expect(Buffer.from(r.sculpture.glb).toString('latin1')).not.toContain(r.identity.canonicalStateHash);
    expect(r.mark.svg).not.toContain(r.identity.canonicalStateHash);
  }, 120_000);

  it('the renderer has no clock, no randomness, no I/O, no network', () => {
    for (const f of RENDER_FILES) {
      const code = codeOnly(f);
      expect(code, f).not.toMatch(/Math\.random|Date\.now|new Date|performance\.now|process\.env/);
      expect(code, f).not.toMatch(/readFileSync|writeFileSync|fetch\(|supabase|from 'pg'/);
    }
  });

  it('rejects a sculpture grid too coarse to resolve the clearance band', () => {
    expect(() => renderSculpture(projectRenderScene(canonicalSeedState()), { voxel: RC.maxVoxel * 1.5 })).toThrow(/voxel/);
    expect(() => renderSculpture(projectRenderScene(canonicalSeedState()), { voxel: 0 })).toThrow(/voxel/);
  });
});

// ── 2. the seed ─────────────────────────────────────────────────────────────
describe('KORA-WP-146 — the common seed', () => {
  it('renders the frozen seed: seed:0 and seed:1 as members, seed:bud as a bud, one body, no cavity', () => {
    const r = golden('seed');
    expect(r.scene.elements.map((e) => [e.id, e.role])).toEqual([['seed:0', 'member'], ['seed:1', 'member'], ['seed:bud', 'bud']]);
    expect(r.sculpture.topology.bodyComponents).toBe(1);
    expect(r.sculpture.topology.bodyGenus).toBe(0);
    expect(r.mark.topology).toEqual({ exteriorLoops: 1, holes: 0, memoryLines: 0 });
  });

  it('zero bronze: no memory seam, no memory primitive in the GLB, no memory line in the Mark', () => {
    const r = golden('seed');
    expect(r.scene.seams).toHaveLength(0);
    expect(r.sculpture.topology.memorySeams).toBe(0);
    const json = glbJson(r.sculpture.glb);
    const memoryIdx = json.materials.findIndex((m) => m.name === 'memory');
    expect(json.meshes[0].primitives.some((p) => p.material === memoryIdx)).toBe(false);
    expect((r.mark.svg.match(/M/g) ?? []).length).toBe(1); // exterior only: no hole, no knock-out line
  });
});

// ── 3. A–D exact semantics ──────────────────────────────────────────────────
describe('KORA-WP-146 — golden scenarios A–D rendered from the real engine', () => {
  const expected: Record<string, { cavities: number; joints: number; traces: number; branches: string[]; eyes: string[] }> = {
    seed: { cavities: 0, joints: 0, traces: 0, branches: [], eyes: [] },
    A: { cavities: 0, joints: 0, traces: 8, branches: ['branch:seed:0', 'branch:seed:bud'], eyes: [] },
    B: { cavities: 2, joints: 2, traces: 7, branches: [], eyes: ['seed:0', 'seed:bud'] },
    C: { cavities: 0, joints: 0, traces: 6, branches: [], eyes: [] },
    D: { cavities: 1, joints: 1, traces: 8, branches: [], eyes: ['seed:bud'] },
  };

  for (const [k, ex] of Object.entries(expected)) {
    it(`${k}: tunnels = Mark holes = open canonical cavities = ${ex.cavities}; seams = visible traces = ${ex.traces}`, () => {
      const r = golden(k);
      const s = GOLDEN[k]();
      expect(s.cavities.filter((c) => c.open)).toHaveLength(ex.cavities);
      expect(r.sculpture.topology.bodyGenus).toBe(ex.cavities);
      expect(r.sculpture.topology.bodyComponents).toBe(1);
      expect(r.mark.topology.holes).toBe(ex.cavities);
      expect(r.mark.topology.exteriorLoops).toBe(1);
      expect(r.invariants.activeFusionJoints).toBe(ex.joints);
      expect(s.memoryTraces).toHaveLength(ex.traces);
      expect(r.sculpture.topology.memorySeams).toBe(ex.traces);
      expect(r.mark.topology.memoryLines).toBe(ex.traces);
      expect(r.invariants.branchIds).toEqual(ex.branches);
      expect(r.scene.elements.filter((e) => e.role === 'eye').map((e) => e.id).sort()).toEqual(ex.eyes);
      expect(r.scene.unresolvedContacts).toEqual([]);
    });
  }

  it('D draws exactly the 8 VISIBLE traces even though 9 are canonical (merged memory is not re-expanded)', () => {
    const s = scenarioD().state();
    expect(s.memoryTraceTotal).toBe(9);
    expect(golden('D').scene.seams).toHaveLength(8);
    expect(golden('D').scene.seams.map((x) => x.traceId)).toEqual(s.memoryTraces.map((t) => t.traceId));
  });

  it('the four Companies diverge from one seed: four different outputs, and none equals the seed', () => {
    const ids = ['seed', 'A', 'B', 'C', 'D'].map((k) => golden(k).identity.outputId);
    expect(new Set(ids).size).toBe(5);
    const marks = ['seed', 'A', 'B', 'C', 'D'].map((k) => golden(k).mark.sha256);
    expect(new Set(marks).size).toBe(5);
  });

  it('every Mark is fitted to the same frame: no Company is drawn bigger than another', () => {
    for (const k of Object.keys(GOLDEN)) expect(golden(k).mark.svg).toContain(`viewBox="0 0 ${RC.mark.viewSize} ${RC.mark.viewSize}"`);
  });
});

// ── 4. state correspondence rules ───────────────────────────────────────────
describe('KORA-WP-146 — the renderer draws exactly what the canonical state says', () => {
  it('raw initiative count independence: ten initiatives in one area render exactly like one', () => {
    const one = history().P('1', 'LIFE').state();
    const ten = history().P('1', 'LIFE').P('2', 'LIFE').P('3', 'LIFE').P('4', 'LIFE').P('5', 'LIFE').P('6', 'LIFE').P('7', 'LIFE').P('8', 'LIFE').P('9', 'LIFE').P('10', 'LIFE').state();
    const a = renderLivingKoral(one, { voxel: V });
    const b = renderLivingKoral(ten, { voxel: V });
    expect(b.mark.svg).toBe(a.mark.svg);
    expect(Buffer.from(b.sculpture.glb).equals(Buffer.from(a.sculpture.glb))).toBe(true);
  });

  it('unassigned seed elements persist as neutral structure; retired elements are not drawn', () => {
    const a = golden('A');
    expect(a.invariants.unassignedSeedIds).toEqual(['seed:1']);
    expect(a.scene.elements.find((e) => e.id === 'seed:1')?.role).toBe('member');
    const c = golden('C');
    expect(c.invariants.unassignedSeedIds).toEqual(['seed:1', 'seed:bud']);
    expect(c.scene.elements.find((e) => e.id === 'seed:bud')?.role).toBe('bud');
    const d = golden('D');
    expect(d.invariants.notRenderedElementIds).toEqual(['branch:seed:0']);
    expect(d.scene.elements.some((e) => e.id === 'branch:seed:0')).toBe(false);
  });

  it('at most one rendered branch per host, and only where the canonical state owns one', () => {
    for (let run = 0; run < 120; run++) {
      const s = fuzzState(run);
      const scene = projectRenderScene(s);
      const owned = s.elements.filter((e) => e.kind === 'branch' && e.assignment === 'adopted').map((e) => e.id).sort();
      const drawn = scene.elements.filter((e) => e.role === 'branch');
      expect(drawn.map((e) => e.id).sort()).toEqual(owned.filter((id) => scene.elements.some((e) => e.id === s.elements.find((x) => x.id === id)!.parentId)));
      const perHost = new Map<string, number>();
      for (const e of drawn) perHost.set(e.groupId, (perHost.get(e.groupId) ?? 0) + 1);
      for (const n of perHost.values()) expect(n).toBeLessThanOrEqual(1);
    }
  }, 300_000);

  it('cavities are fusion-only: an intra-area consolidation fuses (no window); a window exists only for an open fusion-enclosed cavity', () => {
    const intra = history().P('1', 'LIFE').P('2', 'LIFE').K(['1', '2'], 'k', 'LIFE').state();
    expect(intra.cavities).toHaveLength(0);
    const r = renderLivingKoral(intra, { voxel: V });
    expect(r.sculpture.topology.bodyGenus).toBe(0);
    expect(r.mark.topology.holes).toBe(0);
    expect(r.scene.elements.some((e) => e.role === 'eye')).toBe(false);
    for (let run = 0; run < 120; run++) {
      const s = fuzzState(run);
      const scene = projectRenderScene(s);
      expect(scene.elements.filter((e) => e.role === 'eye')).toHaveLength(s.cavities.filter((c) => c.open).length);
    }
  }, 300_000);

  it('a geometry-less (null-primary) area adds no phantom geometry; its arrival is core memory only', () => {
    const atCap = () => history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'IMPACT').P('5', 'IMPACT').X('5', 'LIFE').P('6', 'IMPACT').X('6', 'GROWTH');
    const before = projectRenderScene(atCap().state());
    const s = atCap().P('7', 'LEGACY').state();
    expect(s.areas.find((a) => a.areaId === 'LEGACY')?.primaryId).toBeNull();
    const after = projectRenderScene(s);
    expect(after.elements.map((e) => [e.id, e.role, e.profile])).toEqual(before.elements.map((e) => [e.id, e.role, e.profile]));
    expect(after.seams.length).toBe(Math.min(s.memoryTraces.length, getCanonicalMorphologyConfig().bounds.maxVisibleMemoryTraces));
    expect(after.seams.at(-1)?.hostId).toBe('core');
  });

  it('a null-primary area that withdraws leaves memory on the core and no element appears or disappears', () => {
    const atCap = () => history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'IMPACT').P('5', 'IMPACT').X('5', 'LIFE').P('6', 'IMPACT').X('6', 'GROWTH').P('7', 'LEGACY');
    const before = projectRenderScene(atCap().state());
    const after = projectRenderScene(atCap().C('7').state());
    // a withdrawal canonically raises the core's mass share, so the core (and the roots on it) may move;
    // what must not happen is any element appearing, vanishing or changing role
    expect(after.elements.map((e) => [e.id, e.role])).toEqual(before.elements.map((e) => [e.id, e.role]));
    expect(after.seams.at(-1)?.hostId).toBe('core');
    expect(after.seams.at(-1)?.kind).toBe('scar');
  });

  it('generational ids (erratum E1) coexist as distinct, spatially separated geometry', () => {
    const s = history().P('1', 'LIFE').P('2', 'GROWTH').P('3', 'CONNECTION').P('4', 'IMPACT').K(['1', '4'], 'k', 'LIFE').P('5', 'IMPACT').state();
    const r = renderLivingKoral(s, { voxel: V });
    const g1 = r.scene.elements.find((e) => e.id === 'grown:3')!;
    const g2 = r.scene.elements.find((e) => e.id === 'grown:3:g2')!;
    expect(g1.role).toBe('eye'); // absorbed into seed:0, enclosing the open cavity
    expect(g2.role).toBe('member');
    expect(g2.groupId).toBe('grown:3:g2');
    expect(g1.groupId).toBe('seed:0');
    const d = Math.hypot(g1.points[0][0] - g2.points[0][0], g1.points[0][1] - g2.points[0][1]);
    expect(d).toBeGreaterThan(0.01);
    expect(r.sculpture.topology.bodyGenus).toBe(1);
    expect(r.mark.topology.holes).toBe(1);
    expect(r.scene.unresolvedContacts).toEqual([]);
  });
});

// ── 4b. v2 grammar (Founder visual correction 2026-10-04) ──────────────────
describe('KORA-WP-146 — v2 grammar: one compact fused mass, carved cavities', () => {
  it('every lobe is rooted INSIDE the core (no stalk planted into a base)', () => {
    for (const k of Object.keys(GOLDEN)) {
      const sc = golden(k).scene;
      const { center, radii } = sc.core;
      for (const e of sc.elements.filter((x) => x.role === 'member' || x.role === 'bud')) {
        const [x, y, z] = e.points[0];
        const q = ((x - center[0]) / radii[0]) ** 2 + ((y - center[1]) / radii[1]) ** 2 + ((z - center[2]) / radii[2]) ** 2;
        expect(q, `${k} ${e.id}`).toBeLessThan(1);
      }
    }
  });

  it('the golden states stand on the compact core: no widening, no platform', () => {
    for (const k of Object.keys(GOLDEN)) expect(golden(k).scene.footprintScale, k).toBe(1);
    for (let run = 0; run < 120; run++) expect(projectRenderScene(fuzzState(run)).footprintScale).toBeLessThanOrEqual(Math.max(...RC.clearance.footprintLadder));
  }, 300_000);

  it('a fusion-enclosed cavity is carved through the fused body: floor above the core blend, walls all round', () => {
    for (let run = 0; run < 120; run++) {
      const sc = projectRenderScene(fuzzState(run));
      const coreTop = sc.core.center[2] + sc.core.radii[2];
      for (const e of sc.elements.filter((x) => x.window)) {
        const w = e.window!;
        expect(w.center3[2] - w.halfHeight, `run ${run} ${e.id}`).toBeGreaterThan(coreTop + RC.coreBlendK * 0.5);
        expect(w.depth, `run ${run} ${e.id}`).toBeGreaterThan(Math.max(w.halfGap, w.halfHeight));
      }
    }
  }, 300_000);

  it('no cavity is drawn where the state has none, and every open cavity is drawn exactly once', () => {
    for (const k of Object.keys(GOLDEN)) {
      const sc = golden(k).scene;
      expect(sc.elements.filter((e) => e.window).map((e) => e.id).sort()).toEqual(sc.elements.filter((e) => e.role === 'eye').map((e) => e.id).sort());
      expect(sc.elements.filter((e) => e.window)).toHaveLength(sc.openCavityIds.length);
    }
  });
});

// ── 5. privacy (P1) ─────────────────────────────────────────────────────────
/** Front orthographic silhouette of the sculpture's scene (lobes + core), normalised to its own box. */
function frontSilhouette(scene: ReturnType<typeof golden>['scene'], n = 64): { mask: Uint8Array; aspect: number; width: number; height: number } {
  const caps: { x: number; z: number; r: number }[] = [];
  for (const e of scene.elements) e.points.forEach((p, i) => caps.push({ x: p[0], z: p[2], r: e.radii[i] }));
  const c = scene.core;
  const z0 = 0;
  let x0 = c.center[0] - c.radii[0], x1 = c.center[0] + c.radii[0], z1 = c.center[2] + c.radii[2];
  for (const q of caps) { x0 = Math.min(x0, q.x - q.r); x1 = Math.max(x1, q.x + q.r); z1 = Math.max(z1, q.z + q.r); }
  const mask = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5) / n) * (x1 - x0), z = z0 + ((j + 0.5) / n) * (z1 - z0);
    const inCore = ((x - c.center[0]) / c.radii[0]) ** 2 + ((z - c.center[2]) / c.radii[2]) ** 2 <= 1;
    mask[j * n + i] = inCore || caps.some((q) => (x - q.x) ** 2 + (z - q.z) ** 2 <= q.r * q.r) ? 1 : 0;
  }
  return { mask, aspect: (x1 - x0) / (z1 - z0), width: x1 - x0, height: z1 - z0 };
}

// ── v2.1 surgical visual pass ───────────────────────────────────────────────
describe('KORA-WP-146 — v2.1 visual pass: small Mark, anti-face cavities, silhouette distinction', () => {
  it('the small-size Mark keeps exactly the canonical holes and one silhouette, without memory strokes', () => {
    for (const k of Object.keys(GOLDEN)) {
      const r = golden(k);
      expect(r.mark.small.topology.holes, k).toBe(r.mark.topology.holes);
      expect(r.mark.small.topology.exteriorLoops, k).toBe(1);
      expect(r.mark.small.topology.memoryLines, k).toBe(0);
      expect(r.identity.markSmallSha256).toBe(createHash('sha256').update(r.mark.small.svg).digest('hex'));
      expect(r.mark.small.svg).not.toContain(r.identity.canonicalStateHash);
      expect(r.mark.small.svg).toContain(`fill="${RC.mark.ink}"`);
    }
  });

  it('two cavities on one host never form a facing pair: different tilt, and the second turns away', () => {
    const w = golden('B').scene.elements.flatMap((e) => (e.window ? [e.window] : []));
    expect(w).toHaveLength(2);
    expect(w[0].tilt).not.toBe(w[1].tilt);
    const dot = w[0].normal3[0] * w[1].normal3[0] + w[0].normal3[1] * w[1].normal3[1];
    expect(Math.acos(Math.min(1, Math.abs(dot))) * (180 / Math.PI)).toBeGreaterThanOrEqual(25);
  });

  it('A and C are distinguishable as plain front silhouettes (box-normalised IoU and aspect)', () => {
    const a = frontSilhouette(golden('A').scene), c = frontSilhouette(golden('C').scene);
    let inter = 0, uni = 0;
    for (let i = 0; i < a.mask.length; i++) { inter += a.mask[i] & c.mask[i]; uni += a.mask[i] | c.mask[i]; }
    const iou = inter / uni;
    expect(iou).toBeLessThan(SILHOUETTE_IOU_MAX);
    expect(a.aspect - c.aspect).toBeGreaterThan(SILHOUETTE_ASPECT_GAP); // A spreads wider; C is more contained
  });
});

describe('KORA-WP-146 — no Pillar is visually decodable (P1)', () => {
  const permute: Record<MorphologyAreaCode, MorphologyAreaCode> = { LIFE: 'LEGACY', GROWTH: 'IMPACT', CONNECTION: 'LIFE', IMPACT: 'GROWTH', LEGACY: 'CONNECTION' };
  const relabel = (h: Hist): CanonicalLedgerEvent[] => h.events.map((e) => ({ ...e, area: e.area ? permute[e.area as MorphologyAreaCode] : e.area }));

  it('renaming every Pillar in a history changes nothing in either output (A–D)', () => {
    for (const make of [scenarioA, scenarioB, scenarioC, scenarioD]) {
      const original = make();
      const a = renderLivingKoral(original.state(), { voxel: V });
      const b = renderLivingKoral(foldCanonicalMorphology(relabel(original)), { voxel: V });
      expect(b.mark.svg).toBe(a.mark.svg);
      expect(Buffer.from(b.sculpture.glb).equals(Buffer.from(a.sculpture.glb))).toBe(true);
      expect(b.identity.sculptureSha256).toBe(a.identity.sculptureSha256);
      expect(b.identity.sceneHash).toBe(a.identity.sceneHash);
    }
  }, 120_000);

  it('the renderer consumes only the Expression projection (pillar codes structurally absent)', () => {
    const proj = codeOnly('lib/living-koral-render/projection.ts');
    expect(proj).toMatch(/projectCanonicalMorphologyForExpression\(state\)/);
    for (const f of RENDER_FILES) {
      const code = codeOnly(f);
      expect(code, f).not.toMatch(/\b(LIFE|GROWTH|CONNECTION|IMPACT|LEGACY)\b/);
      expect(code, f).not.toMatch(/\bareaId\b|\bpillar\b/i);
    }
  });

  it('one body material, one memory material, one base material — no colour or material per area', () => {
    for (const k of Object.keys(GOLDEN)) {
      const json = glbJson(golden(k).sculpture.glb);
      expect(json.materials.map((m) => m.name)).toEqual(['body', 'memory', 'base']);
      const svg = golden(k).mark.svg;
      expect((svg.match(/<path/g) ?? []).length).toBe(1);
      expect((svg.match(/fill="/g) ?? []).length).toBe(1);
      expect(svg).toContain(`fill="${RC.mark.ink}"`);
      expect(svg).not.toMatch(/<script|<defs|<image|href=|url\(|<text|<title/);
    }
  });

  it('no output carries an area code, element id from a source, or a UUID', () => {
    const uuid = '6f1d2c1e-0b7a-4a54-9a1e-2f0d6c1b9a10';
    const s = history().P(uuid, 'LIFE').P('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'IMPACT').state();
    const r = renderLivingKoral(s, { voxel: V });
    const glbText = Buffer.from(r.sculpture.glb).toString('latin1');
    for (const out of [r.mark.svg, glbText]) {
      expect(out).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      expect(out).not.toMatch(/LIFE|GROWTH|CONNECTION|IMPACT|LEGACY/);
    }
  });

  it('the shared projection itself is pillar-free: projecting the expression state twice gives the same scene', () => {
    const s = scenarioC().state();
    const expr = projectCanonicalMorphologyForExpression(s);
    expect(JSON.stringify(expr)).not.toMatch(/LIFE|GROWTH|CONNECTION|IMPACT|LEGACY/);
    const strip = (x: ReturnType<typeof projectRenderScene>) => JSON.stringify({ ...x, canonicalStateHash: null });
    expect(strip(projectRenderScene(foldCanonicalMorphology(relabel(scenarioC()))))).toBe(strip(projectRenderScene(s)));
  });
});

// ── 6. 3D ↔ Mark consistency ────────────────────────────────────────────────
describe('KORA-WP-146 — the sculpture and the Mark are one identity', () => {
  it('both outputs come from the same per-element profile: 3D = profile placed around the core, Mark = the same profile on a lane', () => {
    for (const k of Object.keys(GOLDEN)) {
      const scene = golden(k).scene;
      for (const e of scene.elements) {
        expect(e.points).toHaveLength(e.profile.length);
        expect(e.points2).toHaveLength(e.profile.length);
        for (let i = 0; i < e.profile.length; i++) {
          expect(e.points[i][2]).toBeCloseTo(e.profile[i][1], 5); // same height in both
          expect(e.points2[i][1]).toBeCloseTo(e.profile[i][1], 5);
        }
        // in-plane distances are preserved in both placements
        for (let i = 1; i < e.profile.length; i++) {
          const dp = Math.hypot(e.profile[i][0] - e.profile[i - 1][0], e.profile[i][1] - e.profile[i - 1][1]);
          expect(Math.hypot(e.points[i][0] - e.points[i - 1][0], e.points[i][1] - e.points[i - 1][1], e.points[i][2] - e.points[i - 1][2])).toBeCloseTo(dp, 5);
          expect(Math.hypot(e.points2[i][0] - e.points2[i - 1][0], e.points2[i][1] - e.points2[i - 1][1])).toBeCloseTo(dp, 5);
        }
      }
    }
  });

  it('cavity existence, element set and memory count agree between the two outputs', () => {
    for (const k of Object.keys(GOLDEN)) {
      const r = golden(k);
      expect(r.mark.topology.holes).toBe(r.sculpture.topology.bodyGenus);
      expect(r.mark.topology.memoryLines).toBe(r.sculpture.topology.memorySeams);
      expect(sceneInvariants(r.scene)).toEqual(r.invariants);
    }
  });

  it('the Mark is renderable independently from the same scene and gives the same bytes', () => {
    const r = golden('D');
    expect(renderMark(r.scene).svg).toBe(r.mark.svg);
  });
});

// ── 7. topology under broad random histories ────────────────────────────────
describe('KORA-WP-146 — no renderer-created topology (fixed-seed fuzz)', () => {
  it('projection + Mark, 240 histories: a topologically exact rung always exists (Mark holes = open cavities, one silhouette), rarely above rung 0', () => {
    let above0 = 0;
    for (let run = 0; run < 240; run++) {
      const s = fuzzState(run);
      const want = s.cavities.filter((c) => c.open).length;
      let clean = -1;
      for (let rung = 0; rung <= RC.clearance.verificationRungs && clean < 0; rung++) {
        const scene = projectRenderScene(s, rung);
        const m = renderMark(scene);
        if (m.topology.holes === want && m.topology.exteriorLoops === 1 && m.topology.memoryLines === s.memoryTraces.length) clean = rung;
      }
      expect(clean, `run ${run}`).toBeGreaterThanOrEqual(0);
      if (clean > 0) above0++;
    }
    expect(above0).toBeLessThanOrEqual(12); // the first projection is clean in >= 95% of histories
  }, 600_000);

  const N3 = process.env.WP146_FUZZ_FULL === '1' ? 400 : 24;
  it(`3D sculpture, ${N3} histories: verified outputs — one body, tunnels = Mark holes = open cavities, never more; never fails closed`, () => {
    for (let run = 0; run < N3; run++) {
      const run3 = (run * 17) % 400; // spread across the history-length range
      const s = fuzzState(run3);
      const r = renderLivingKoral(s, { voxel: V }); // throws (fails closed) if no rung verifies
      const want = s.cavities.filter((c) => c.open).length;
      expect(r.sculpture.topology.bodyComponents, `run ${run3}`).toBe(1);
      expect(r.sculpture.topology.bodyGenus, `run ${run3}`).toBe(want);
      expect(r.mark.topology.holes, `run ${run3}`).toBe(want);
      expect(r.sculpture.topology.memorySeams, `run ${run3}`).toBe(s.memoryTraces.length);
      expect(r.mark.topology.memoryLines, `run ${run3}`).toBe(s.memoryTraces.length);
    }
  }, 3_600_000);

  it('the golden states verify at the first projection (rung 0)', () => {
    for (const k of Object.keys(GOLDEN)) expect(golden(k).scene.verificationRung, k).toBe(0);
  });
});

// ── 8. boundedness ──────────────────────────────────────────────────────────
describe('KORA-WP-146 — bounded output', () => {
  it('footprint, element count, Mark size and GLB size stay within declared bounds for every history', () => {
    const B = getCanonicalMorphologyConfig().bounds;
    const maxScale = Math.max(1, ...RC.clearance.footprintLadder);
    for (let run = 0; run < 120; run++) {
      const s = fuzzState(run);
      const scene = projectRenderScene(s);
      expect(scene.footprintScale).toBeLessThanOrEqual(maxScale);
      expect(scene.seams.length).toBeLessThanOrEqual(B.maxVisibleMemoryTraces);
      expect(scene.elements.filter((e) => e.role === 'eye').length).toBeLessThanOrEqual(B.maxOpenCavities);
      expect(scene.elements.length).toBeLessThanOrEqual(s.elements.length);
      const m = renderMark(scene);
      expect(m.svg.length).toBeLessThan(40_000);
    }
    for (const k of Object.keys(GOLDEN)) expect(golden(k).sculpture.glb.byteLength).toBeLessThan(8_000_000);
  }, 300_000);
});

// ── 9. legacy isolation ─────────────────────────────────────────────────────
describe('KORA-WP-146 — legacy and deferred paths are untouched and not imported', () => {
  it('the renderer imports only the WP-145 canonical surface and its own modules', () => {
    for (const f of RENDER_FILES) {
      const imports = [...read(f).matchAll(/from '([^']+)'/g)].map((m) => m[1]);
      for (const i of imports) expect(i, `${f} imports ${i}`).toMatch(/^(node:crypto|\.\/[a-z0-9-]+|@\/lib\/living-koral-mark\/canonical-morphology(-types)?)$/);
    }
  });

  it('neither the v1 Mark path nor the deferred WP-117 renderer files import the WP-146 renderer', () => {
    for (const f of ['lib/living-koral-mark/geometry-service.ts', 'lib/living-koral-mark/bounded-geometry-types.ts', 'lib/living-koral-mark/morphology-engine.ts', 'lib/living-koral-mark/svg-renderer.ts', 'lib/living-koral-mark/mark-service.ts']) {
      let src = '';
      try { src = read(f); } catch { continue; }
      expect(src, f).not.toMatch(/living-koral-render/);
    }
  });

  it('no Product route, component or page imports the WP-146 renderer (no UI in this package)', () => {
    const scan = (dir: string): string[] => {
      let out: string[] = [];
      for (const e of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) out = out.concat(scan(p));
        else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
      }
      return out;
    };
    for (const f of [...scan('app'), ...scan('components')]) expect(read(f), f).not.toMatch(/living-koral-render/);
  });
});

// ── review artifacts (env-gated) ────────────────────────────────────────────
describe('KORA-WP-146 — Founder review artifacts (env-gated)', () => {
  const dir = process.env.WP146_WRITE_REVIEW_ARTIFACTS;
  it.skipIf(!dir)('writes seed + A–D: GLB, SVG and a state summary per state, plus a manifest', () => {
    mkdirSync(dir!, { recursive: true });
    const voxel = Number(process.env.WP146_REVIEW_VOXEL ?? 0.0012);
    const manifest: Record<string, unknown>[] = [];
    for (const k of Object.keys(GOLDEN)) {
      const s = GOLDEN[k]();
      const r = renderLivingKoral(s, { voxel });
      writeFileSync(join(dir!, `${k}.glb`), r.sculpture.glb);
      writeFileSync(join(dir!, `${k}.svg`), r.mark.svg);
      writeFileSync(join(dir!, `${k}.small.svg`), r.mark.small.svg);
      const summary = {
        state: k,
        identity: r.identity,
        canonical: {
          activeElements: s.elements.filter((e) => e.active).map((e) => e.id),
          unassignedSeed: s.elements.filter((e) => e.assignment === 'unassigned').map((e) => e.id),
          fusedElements: s.elements.filter((e) => e.assignment === 'fused').map((e) => `${e.id}→${e.fusedInto}`),
          activeFusionJoints: s.fusions.filter((f) => f.active).map((f) => `${f.fusionId} (${f.kind})`),
          openCavities: s.cavities.filter((c) => c.open).map((c) => c.cavityId),
          memoryTraceTotal: s.memoryTraceTotal,
          visibleMemoryTraces: s.memoryTraces.map((t) => `${t.kind}@${t.host.elementId}/${t.host.position}×${t.mergedCount}`),
          presentAreaCount: s.areas.filter((a) => a.present).length,
        },
        rendered: {
          elements: r.scene.elements.map((e) => `${e.id}:${e.role}`),
          footprintScale: r.scene.footprintScale,
          fusedDepth: r.scene.fusedDepth,
          verificationRung: r.scene.verificationRung,
          sculpture: r.sculpture.topology,
          mark: r.mark.topology,
          markSmall: r.mark.small.topology,
        },
      };
      writeFileSync(join(dir!, `${k}.state.json`), JSON.stringify(summary, null, 2));
      manifest.push({ state: k, outputId: r.identity.outputId, canonicalStateHash: r.identity.canonicalStateHash, sculptureSha256: r.identity.sculptureSha256, markSha256: r.identity.markSha256, markSmallSha256: r.identity.markSmallSha256, voxel });
    }
    writeFileSync(join(dir!, 'manifest.json'), JSON.stringify({ rendererVersion: RENDERER_VERSION, outputs: manifest }, null, 2));
  }, 600_000);
});
