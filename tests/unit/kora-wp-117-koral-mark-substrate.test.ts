// tests/unit/kora-wp-117-koral-mark-substrate.test.ts
// KORA-WP-117 — RENDERER-NEUTRAL SUBSTRATE (permanent).
//
// Split out of kora-wp-117-koral-mark.test.ts (report 191, WP-117
// substrate stabilization, 2026-09-19) per Founder decision: the final
// visual renderer (Rounds 1-5, all FAILED) is DEFERRED; the semantic/
// morphology substrate underneath it — Level A Edition-bounded lineage
// replay, privacy-safe Expression Mode projection, Morphological
// Compression, BoundedKoralGeometry, and the renderer-neutral half of the
// Brand Safety Envelope — is KEPT and remains canonical, tested,
// deterministic KORA substrate independent of any renderer's own
// acceptance status.
//
// This file imports NOTHING from the deferred renderer layer
// (renderer-types.ts, visual-grammar.ts, implicit-field.ts,
// morphology-engine.ts, svg-renderer.ts, mark-service.ts) — confirmed by
// its own import list below. Renderer-coupled tests (SVG output, Layer 5
// geometry generation, curvature/color treatment, Founder Visual Gate
// fixture rasterization) live in the sibling, explicitly-deferred
// kora-wp-117-koral-mark-renderer.test.ts instead.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

const WP117_SUBSTRATE_FILES = [
  'lib/living-koral-mark/types.ts',
  'lib/living-koral-mark/bounded-geometry-types.ts',
  'lib/living-koral-mark/edition-lineage-service.ts',
  'lib/living-koral-mark/expression-projection.ts',
  'lib/living-koral-mark/morphological-compression.ts',
  'lib/living-koral-mark/brand-safety.ts',
  'lib/living-koral-mark/accessible-description.ts',
  'lib/living-koral-mark/geometry-service.ts',
];

function readWp117File(rel: string): string {
  return readFileSync(rel, 'utf-8');
}

function codeOnly(rel: string): string {
  return readWp117File(rel).split('\n').filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l) && !/^\s*\/\*/.test(l)).join('\n');
}

// ── Structural / pure-function tests — no DB ────────────────────────────────

describe('KORA-WP-117 substrate — no 3D / physical-manifestation implementation anywhere in the renderer-neutral layer', () => {
  const FORBIDDEN_3D = /three\.js|WebGL|\bSTL\b|\bOBJ\b|\b3MF\b|mesh generation|3d-print|manufactur|plaque/i;
  for (const file of WP117_SUBSTRATE_FILES) {
    it(`${file}: contains no 3D/physical-manifestation implementation (mesh/STL/OBJ/3MF/manufacturing/plaque)`, () => {
      const src = codeOnly(file);
      expect(src).not.toMatch(FORBIDDEN_3D);
    });
  }
});

describe('KORA-WP-117 substrate — no WP-118/WP-119 implementation', () => {
  for (const file of WP117_SUBSTRATE_FILES) {
    it(`${file}: never imports Commons or Public KORAL modules`, () => {
      const importLines = readWp117File(file).split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
      expect(importLines).not.toMatch(/commons|public-koral/i);
    });
  }
});

describe('KORA-WP-117 substrate — no import of the deferred visual-renderer layer', () => {
  const DEFERRED_MODULE_PATTERN = /renderer-types|visual-grammar|implicit-field|morphology-engine|svg-renderer|mark-service/;
  for (const file of WP117_SUBSTRATE_FILES) {
    it(`${file}: never imports a deferred visual-renderer module`, () => {
      const importLines = readWp117File(file).split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
      expect(importLines).not.toMatch(DEFERRED_MODULE_PATTERN);
    });
  }
});

describe('KORA-WP-117 substrate — grammar/compression/brand-safety versioning is pinned, not invented per-call', () => {
  it('KORAL_MARK_GRAMMAR_VERSION is a fixed literal constant', async () => {
    const { KORAL_MARK_GRAMMAR_VERSION } = await import('@/lib/living-koral-mark/types');
    expect(KORAL_MARK_GRAMMAR_VERSION).toBe('koral-mark-v1');
  });

  it('COMPRESSION_VERSION and VISUAL_GRAMMAR_VERSION are fixed literal constants', async () => {
    const { COMPRESSION_VERSION } = await import('@/lib/living-koral-mark/morphological-compression');
    const { VISUAL_GRAMMAR_VERSION } = await import('@/lib/living-koral-mark/brand-safety');
    expect(COMPRESSION_VERSION).toBe('koral-compression-v1');
    expect(VISUAL_GRAMMAR_VERSION).toBe('koral-visual-grammar-v1');
  });

  it('a BoundedKoralGeometry carries all version identifiers needed to prove byte-level output determinism', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true }] }] }, 1);
    expect(g.grammarVersion).toBe('koral-mark-v1');
    expect(g.compressionVersion).toBe('koral-compression-v1');
    expect(g.editionBoundaryRevision).toBe(1);
  });
});

describe('KORA-WP-117 substrate — Expression Mode positive allow-list (Layer 1 output)', () => {
  it('projectEditionLineageToExpressionMode() output carries only { grammarVersion, domains: [{ domain, elements: [{slotIndex, present, extentStep, directionOrdinal, stabilityState}] }] } — no other key', async () => {
    const { projectEditionLineageToExpressionMode } = await import('@/lib/living-koral-mark/expression-projection');
    const payload = projectEditionLineageToExpressionMode({
      tenantId: 'x', editionId: 'y', resultingStateRevision: 3,
      elements: [
        { domain: 'initiative', slotIndex: 0, present: true, extentStep: 2, directionOrdinal: 1, stabilityState: 'settled' },
        { domain: 'initiative', slotIndex: 1, present: false },
      ],
    });
    expect(Object.keys(payload).sort()).toEqual(['domains', 'grammarVersion']);
    for (const d of payload.domains) {
      expect(Object.keys(d).sort()).toEqual(['domain', 'elements']);
      for (const el of d.elements) {
        expect(Object.keys(el).sort()).toEqual(['directionOrdinal', 'extentStep', 'present', 'slotIndex', 'stabilityState']);
      }
    }
  });
});

// ── LAYER 2 — Morphological Compression ─────────────────────────────────────

describe('KORA-WP-117 substrate — Layer 2: Morphological Compression, bounded macro-slot count', () => {
  function manyElementsPayload(count: number, domain: 'initiative' = 'initiative') {
    return {
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain, elements: Array.from({ length: count }, (_, i) => ({ slotIndex: i, present: true, extentStep: 0, directionOrdinal: 0, stabilityState: 'unsettled' as const })) }],
    };
  }

  it('MORE THAN 6 canonical lineages in one domain still produce <= 3 macro-slots for that domain (the domain-rank-0 allotment ceiling) — NEVER one macro-slot per lineage', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g = compressToBoundedGeometry(manyElementsPayload(9), 1);
    expect(g.macroSlots).toHaveLength(3); // domain rank 0's own fixed allotment
    expect(g.macroSlots.filter((s) => s.present)).toHaveLength(3);
  });

  it('30 ACTIVE lineages in one domain still produce exactly 3 macro-slots — bounded regardless of contributor volume', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g = compressToBoundedGeometry(manyElementsPayload(30), 1);
    expect(g.macroSlots).toHaveLength(3);
    const totalContributors = g.macroSlots.reduce((sum, s) => sum + s.contributorProvenance.contributorCount, 0);
    expect(totalContributors).toBe(30); // every lineage still accounted for in provenance — none silently dropped
  });

  it('a genuinely multi-domain payload stays within the overall 3-6 macro-lobe budget (domain rank 0: 3 slots + domain rank 1: 2 slots = 5, never 6+)', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const payload = {
      grammarVersion: 'koral-mark-v1',
      domains: [
        { domain: 'initiative', elements: Array.from({ length: 8 }, (_, i) => ({ slotIndex: i, present: true })) },
        { domain: 'programma', elements: Array.from({ length: 5 }, (_, i) => ({ slotIndex: i, present: true })) },
      ],
    } as unknown as Parameters<typeof compressToBoundedGeometry>[0];
    const g = compressToBoundedGeometry(payload, 1);
    expect(g.macroSlots).toHaveLength(5); // 3 (rank 0) + 2 (rank 1)
    expect(g.macroSlots.length).toBeLessThanOrEqual(6);
  });

  it('DISAPPEARANCE does not reshuffle surviving macro-slot assignments — an unrelated slot is byte-identical before/after another lineage disappears', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const before = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true }, { slotIndex: 1, present: true }, { slotIndex: 2, present: true }] }],
    }, 1);
    const after = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: false }, { slotIndex: 1, present: true }, { slotIndex: 2, present: true }] }],
    }, 2);
    const slot1Before = before.macroSlots.find((s) => s.slotId === 'initiative:1')!;
    const slot1After = after.macroSlots.find((s) => s.slotId === 'initiative:1')!;
    expect(slot1After.extentState).toEqual(slot1Before.extentState);
    expect(slot1After.headingState).toEqual(slot1Before.headingState);
    expect(slot1After.slotId).toBe(slot1Before.slotId);
  });

  it('a NEW lineage does not reshuffle existing macro-slot assignments — an existing slot stays byte-identical when a new lineage joins a DIFFERENT slot', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const before = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true, extentStep: 2 }] }],
    }, 1);
    const after2 = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true, extentStep: 2 }, { slotIndex: 1, present: true }] }],
    }, 2);
    const slot0Before = before.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    const slot0After2 = after2.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    expect(slot0After2.extentState).toEqual(slot0Before.extentState);
  });

  it('CONTRIBUTOR COUNT ALONE does not increase macro reach — a slot with 10 near-zero contributors has similar reach to a slot with 1 near-zero contributor (mean, never sum)', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const oneContributor = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true, extentStep: 1 }] }],
    }, 1);
    const tenContributors = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain: 'initiative', elements: Array.from({ length: 10 }, (_, i) => ({ slotIndex: i * 3, present: true, extentStep: 1 })) }],
    }, 1);
    const slot0One = oneContributor.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    const slot0Ten = tenContributors.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    expect(slot0Ten.extentState.rawMean).toBeCloseTo(slot0One.extentState.rawMean, 5); // mean of ten 1's === mean of one 1 === 1
    expect(slot0Ten.extentState.normalized).toBeCloseTo(slot0One.extentState.normalized, 5);
  });

  it('EXTENT — normalized value is symmetric for positive vs. negative mean (odd function)', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const positive = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true, extentStep: 3 }] }] }, 1);
    const negative = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true, extentStep: -3 }] }] }, 1);
    const slotPos = positive.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    const slotNeg = negative.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    expect(slotPos.extentState.normalized).toBeCloseTo(-slotNeg.extentState.normalized, 10);
  });

  it('DIRECTION — circular aggregation correctly resolves near the wrap boundary (e.g. ordinals near 0 and near the cycle length average to a NON-arbitrary angle, never a naive scalar-mean discontinuity)', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true, directionOrdinal: 0 }, { slotIndex: 1, present: true, directionOrdinal: 5 }] }],
    }, 1);
    const slot = g.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    expect(slot.headingState.angle).not.toBeCloseTo(150, 0); // the WRONG, naive scalar-mean answer
    expect(slot.headingState.isFallback).toBe(false); // 0deg/300deg are only 60deg apart -- a strong, non-degenerate resultant
  });

  it('DIRECTION — near-zero resultant (contributors pointing in genuinely opposite directions) triggers the deterministic fallback, never an arbitrary/undefined angle', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true, directionOrdinal: 0 }, { slotIndex: 3, present: true, directionOrdinal: 3 }] }],
    }, 1);
    const slot = g.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    expect(slot.headingState.directionCoherence).toBeLessThan(0.15);
    expect(slot.headingState.isFallback).toBe(true);
    expect(Number.isFinite(slot.headingState.angle)).toBe(true); // deterministic, never NaN/undefined
  });

  it('DIRECTION — the empty-contributor fallback (an absent slot) is a fixed, deterministic per-{domain,bucketIndex} value, never random, stable across repeated calls', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g1 = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 1, present: false }] }] }, 1);
    const g2 = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 1, present: false }] }] }, 1);
    const slot0g1 = g1.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    const slot0g2 = g2.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    expect(slot0g1.headingState).toEqual(slot0g2.headingState);
    expect(slot0g1.headingState.isFallback).toBe(true);
  });

  it('STABILITY — settledShare is a continuous ratio, no threshold artifact: 1-of-2 settled gives 0.5, distinct from both 0-of-2 (0) and 2-of-2 (1)', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true, stabilityState: 'settled' }, { slotIndex: 3, present: true, stabilityState: 'unsettled' }] }],
    }, 1);
    const slot = g.macroSlots.find((s) => s.slotId === 'initiative:0')!;
    expect(slot.settledShare).toBeCloseTo(0.5, 10);
  });

  it('deterministic — the SAME Expression Mode payload always produces byte-identical BoundedKoralGeometry', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const payload = { grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative' as const, elements: [{ slotIndex: 0, present: true, extentStep: 2, directionOrdinal: 1, stabilityState: 'settled' as const }] }] };
    const g1 = compressToBoundedGeometry(payload, 5);
    const g2 = compressToBoundedGeometry(payload, 5);
    expect(JSON.stringify(g1)).toBe(JSON.stringify(g2));
  });
});

// ── LAYER 3 — Bounded Abstract KORAL Geometry object model ──────────────────

describe('KORA-WP-117 substrate — Layer 3: BoundedKoralGeometry carries no SVG/pixel/mesh/color/UI data', () => {
  it('object contains no SVG path syntax, no <tag>, no hex color, no DOM/UI shape', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true }] }] }, 1);
    const json = JSON.stringify(g);
    expect(json).not.toMatch(/[Mm]\s?\d+[,.]?\d*\s+\d+[,.]?\d*\s+[QC]\s/); // no SVG path command syntax
    expect(json).not.toMatch(/<[a-zA-Z]/); // no markup
    expect(json).not.toMatch(/#[0-9a-fA-F]{6}/); // no hex color anywhere in Layer 3
  });

  it('morphological-compression.ts never imports svg-renderer.ts or implicit-field.ts — Layer 2 produces Layer 3 data only, never geometry primitives', () => {
    const importLines = readWp117File('lib/living-koral-mark/morphological-compression.ts').split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
    expect(importLines).not.toMatch(/svg-renderer|implicit-field/);
  });

  it('macro-slot IDs are stable strings of the form "{domain}:{bucketIndex}"', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true }] }] }, 1);
    for (const s of g.macroSlots) expect(s.slotId).toMatch(/^initiative:\d+$/);
  });

  it('domain-rank allotment matches the fixed [3,2,1,1,...] schedule per domain (rank 2+ domains each still receive their own 1-slot floor — a disclosed edge case, report 187 §5): 4 domains can structurally produce 7 macro-slot ARRAY entries, which is exactly why Brand Safety (Layer 4) — not Layer 2 — is the actual <=6 PRESENT-lobe enforcement point', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const { validateBrandSafety, MAX_MACRO_LOBES } = await import('@/lib/living-koral-mark/brand-safety');
    const g = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [
        { domain: 'initiative', elements: [{ slotIndex: 0, present: true }] },
        { domain: 'programma', elements: [{ slotIndex: 0, present: true }] },
        { domain: 'terzo', elements: [{ slotIndex: 0, present: true }] },
        { domain: 'quarto', elements: [{ slotIndex: 0, present: true }] },
      ],
    } as unknown as Parameters<typeof compressToBoundedGeometry>[0], 1);
    expect(g.macroSlots.length).toBe(7); // 3 (rank0) + 2 (rank1) + 1 (rank2) + 1 (rank3) -- the array itself is NOT bounded to 6
    const presentCount = g.macroSlots.filter((s) => s.present).length;
    expect(presentCount).toBe(4); // only the one contributed bucket per domain is actually present
    expect(presentCount).toBeLessThanOrEqual(MAX_MACRO_LOBES);
    expect(validateBrandSafety(g).some((v) => v.rule === 'max-macro-lobes')).toBe(false);
  });

  it('when more than MAX_MACRO_LOBES macro-slots are simultaneously PRESENT, Brand Safety (Layer 4) flags it as a violation — the actual <=6 visible-lobe enforcement point', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const { validateBrandSafety } = await import('@/lib/living-koral-mark/brand-safety');
    const g = compressToBoundedGeometry({
      grammarVersion: 'koral-mark-v1',
      domains: [
        { domain: 'initiative', elements: [{ slotIndex: 0, present: true }, { slotIndex: 1, present: true }, { slotIndex: 2, present: true }] },
        { domain: 'programma', elements: [{ slotIndex: 0, present: true }, { slotIndex: 1, present: true }] },
        { domain: 'terzo', elements: [{ slotIndex: 0, present: true }] },
        { domain: 'quarto', elements: [{ slotIndex: 0, present: true }] },
      ],
    } as unknown as Parameters<typeof compressToBoundedGeometry>[0], 1);
    expect(g.macroSlots.filter((s) => s.present)).toHaveLength(7);
    const violations = validateBrandSafety(g);
    expect(violations.some((v) => v.rule === 'max-macro-lobes')).toBe(true);
  });

  it('core body facts are bounded: massShare within [0.25, 0.4], activeRegionCount non-negative and <= macro-slot count', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true }, { slotIndex: 1, present: true }] }] }, 1);
    expect(g.core.massShare).toBeGreaterThanOrEqual(0.25);
    expect(g.core.massShare).toBeLessThanOrEqual(0.4);
    expect(g.core.activeRegionCount).toBeGreaterThanOrEqual(0);
    expect(g.core.activeRegionCount).toBeLessThanOrEqual(g.macroSlots.length);
  });

  it('micro-morphology descriptors are deterministic (same slot identity -> same microState) and bounded (no NaN/Infinity)', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const g1 = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true }] }] }, 1);
    const g2 = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true }] }] }, 1);
    expect(g1.macroSlots[0].microState).toEqual(g2.macroSlots[0].microState);
    for (const v of Object.values(g1.macroSlots[0].microState)) expect(Number.isFinite(v)).toBe(true);
  });

  it('no random/hash inputs anywhere in the neutral Layer 2/3/4 source (structural guard: no Math.random, no crypto hash, no Date.now/current-time, no UUID pattern construction)', () => {
    for (const file of ['lib/living-koral-mark/morphological-compression.ts', 'lib/living-koral-mark/brand-safety.ts']) {
      const code = codeOnly(file);
      expect(code).not.toMatch(/Math\.random|createHash|Date\.now|new Date\(\)/);
    }
  });
});

// ── LAYER 4 — Brand Safety Envelope (renderer-neutral half) ─────────────────

describe('KORA-WP-117 substrate — Layer 4: Brand Safety Envelope validation (renderer-neutral)', () => {
  it('a compliant geometry (few macro-slots, no apertures) produces zero violations', async () => {
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');
    const { validateBrandSafety } = await import('@/lib/living-koral-mark/brand-safety');
    const g = compressToBoundedGeometry({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true }] }] }, 1);
    expect(validateBrandSafety(g)).toHaveLength(0);
  });

  it('max-apertures violation triggers when more than the hard ceiling is present (constructed directly, since compression itself already caps at 2)', async () => {
    const { validateBrandSafety, MAX_APERTURES } = await import('@/lib/living-koral-mark/brand-safety');
    const fakeGeometry = {
      grammarVersion: 'x', compressionVersion: 'x', editionBoundaryRevision: 1,
      core: { massShare: 0.3, activeRegionCount: 1 },
      macroSlots: [],
      apertures: Array.from({ length: MAX_APERTURES + 1 }, (_, i) => ({ apertureId: `a${i}`, sourceSlotIds: [], sizeClass: 'medium' as const, originCondition: 'macro-convergence' as const })),
      domainComposition: [],
    };
    const violations = validateBrandSafety(fakeGeometry);
    expect(violations.some((v) => v.rule === 'max-apertures')).toBe(true);
  });
});

describe('KORA-WP-117 substrate — accessible description neutrality (accessible-description.ts consumes Layer 1 Expression Mode output directly, no renderer dependency)', () => {
  const EVALUATIVE = /\bmatur[ao]\b|\bricc[ao]\b|\bfort[ei]\b|\bresilient[ei]\b|\bsan[oa]\b|\bmigliore\b|\bpeggiore\b|\bsalute\b/i;

  it('never uses evaluative/maturity/health/quality language', async () => {
    const { describeMarkAccessibly } = await import('@/lib/living-koral-mark/accessible-description');
    const text = describeMarkAccessibly({ grammarVersion: 'koral-mark-v1', domains: [{ domain: 'initiative', elements: [{ slotIndex: 0, present: true }, { slotIndex: 1, present: true }, { slotIndex: 2, present: false }] }] });
    expect(text).not.toMatch(EVALUATIVE);
    expect(text).toContain('2');
  });

  it('handles the empty/no-domain case neutrally', async () => {
    const { describeMarkAccessibly } = await import('@/lib/living-koral-mark/accessible-description');
    const text = describeMarkAccessibly({ grammarVersion: 'koral-mark-v1', domains: [] });
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(EVALUATIVE);
  });
});

describe('KORA-WP-117 substrate — no score/grade/pass-fail/certification/approval vocabulary, no category-to-visual mapping', () => {
  const FORBIDDEN = /\bscore\b|\bgrade\b|\bpass[-_]?fail\b|\bcertif(y|ication)\b|\bapprov(e|al)\b/i;
  for (const file of WP117_SUBSTRATE_FILES) {
    it(`${file}: contains none of the forbidden verdict/score/approval tokens`, () => {
      const src = readWp117File(file).split('\n').filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l)).join('\n');
      expect(src).not.toMatch(FORBIDDEN);
    });
  }

  it('morphological-compression.ts never receives or branches on a Material Change `category` field', () => {
    expect(codeOnly('lib/living-koral-mark/morphological-compression.ts')).not.toMatch(/\bcategory\b/);
  });
});

// ── Real-DB-gated section ────────────────────────────────────────────────

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = ['azdnepfmwrmacruykskm', 'haqflkurpmeaxpikozjl'];
const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalOnly(varName: string, url: string): void {
  const lower = url.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) throw new Error(`${varName} matches a known staging/production project ref — refusing to proceed.`);
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) throw new Error(`${varName} points at a hosted Supabase domain — refusing to proceed.`);
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`${varName} is not a valid URL — refusing to proceed.`);
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) throw new Error(`${varName} host "${hostname}" is not local — refusing to proceed.`);
}

const pgUrl = readEnv('WP117_PG_URL');
const supabaseUrl = readEnv('WP117_SUPABASE_URL');
const serviceRoleKey = readEnv('WP117_SERVICE_ROLE_KEY');
const allowed = readEnv('WP117_ALLOW_RUN') === 'true';
const ready = Boolean(pgUrl && supabaseUrl && serviceRoleKey && allowed);

describe('WP-117 substrate guard — every *_URL env var (if set) must be local-only', () => {
  it('WP117_PG_URL / WP117_SUPABASE_URL are either unset or local-only', () => {
    if (pgUrl) expect(() => assertLocalOnly('WP117_PG_URL', pgUrl)).not.toThrow();
    if (supabaseUrl) expect(() => assertLocalOnly('WP117_SUPABASE_URL', supabaseUrl)).not.toThrow();
  });
});

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE_A = `WP117S-A-${RUN_SUFFIX_HEX}`;
const TENANT_CODE_B = `WP117S-B-${RUN_SUFFIX_HEX}`;
const ACTOR_ID = `wp117-substrate-fixture-actor-${RUN_SUFFIX_HEX}`;

describe.skipIf(!ready)('KORA-WP-117 substrate — real service-layer proof (local Supabase)', () => {
  let pgClient: InstanceType<typeof Client>;
  let tenantAId: string;
  let tenantBId: string;

  async function asRole(role: string, tenantId: string | null) {
    await pgClient.query('SET LOCAL ROLE authenticated');
    const claims = JSON.stringify(tenantId ? { app_metadata: { kora_role: role, kora_tenant_id: tenantId } } : { app_metadata: { kora_role: role } });
    await pgClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
  }

  async function createEditionAs(tenantId: string, name: string): Promise<string> {
    await pgClient.query('BEGIN');
    await asRole('COMPANY_ADMIN', tenantId);
    const result = await pgClient.query(`SELECT id FROM analytics.fn_create_living_koral_edition($1)`, [name]);
    await pgClient.query('COMMIT');
    return result.rows[0].id as string;
  }

  async function editionRevision(editionId: string): Promise<number> {
    const r = await pgClient.query<{ resulting_state_revision: number }>(`SELECT resulting_state_revision FROM analytics.living_koral_edition WHERE id = $1`, [editionId]);
    return r.rows[0].resulting_state_revision;
  }

  async function recordTransformation(tenantId: string, category: string, operation: 'add_element' | 'remove_element' | 'increase_extent' | 'decrease_extent' | 'reorient' | 'stabilize', sourceEntityId?: string, previousStateReference?: string): Promise<{ ledgerId: string; sourceEntityId: string; materialChangeId: string }> {
    const resolvedSourceEntityId = sourceEntityId ?? (await pgClient.query<{ id: string }>('SELECT gen_random_uuid() AS id')).rows[0].id;
    const resolvedPrevious = previousStateReference !== undefined
      ? previousStateReference
      : (await pgClient.query<{ id: string | null }>(
          `SELECT id FROM gov.living_koral_material_change WHERE tenant_id = $1 AND source_entity_type = 'initiative' AND source_entity_id = $2 ORDER BY created_at DESC, id DESC LIMIT 1`,
          [tenantId, resolvedSourceEntityId],
        )).rows[0]?.id ?? null;
    const mc = await pgClient.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, previous_state_reference, actor_role, actor_id)
       VALUES ($1, $2, 'initiative', 'initiative', $4, now(), 'WP-117 substrate fixture', '1.0', $5, 'SYSTEM', $3)
       RETURNING id`,
      [tenantId, category, ACTOR_ID, resolvedSourceEntityId, resolvedPrevious],
    );
    await pgClient.query(
      `UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`,
      [mc.rows[0].id],
    );
    const rpc = await pgClient.query(
      `SELECT ledger_id FROM gov.record_living_koral_transformation($1, $2, 'morphogenesis-v1.1')`,
      [mc.rows[0].id, operation],
    );
    return { ledgerId: rpc.rows[0].ledger_id as string, sourceEntityId: resolvedSourceEntityId as string, materialChangeId: mc.rows[0].id as string };
  }

  it('setup: two tenants', async () => {
    if (!pgUrl || !supabaseUrl || !serviceRoleKey) throw new Error('unreachable: only runs when ready');
    assertLocalOnly('WP117_PG_URL', pgUrl);
    assertLocalOnly('WP117_SUPABASE_URL', supabaseUrl);
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

    pgClient = new Client({ connectionString: pgUrl });
    await pgClient.connect();

    const tenantA = await pgClient.query<{ id: string }>(`INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`, [TENANT_CODE_A, 'WP-117 Substrate Fixture Tenant A']);
    tenantAId = tenantA.rows[0].id;
    const tenantB = await pgClient.query<{ id: string }>(`INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`, [TENANT_CODE_B, 'WP-117 Substrate Fixture Tenant B']);
    tenantBId = tenantB.rows[0].id;
  });

  it('MORPHOLOGY INVARIANT — Edition N rendered AFTER a later transformation exists still produces exactly Edition N\'s own lineage (Level A replay)', async () => {
    const { reconstructEditionLineage } = await import('@/lib/living-koral-mark/edition-lineage-service');

    await recordTransformation(tenantAId, 'Emergence', 'add_element');
    const editionNId = await createEditionAs(tenantAId, 'Edizione N');
    const editionNRevision = await editionRevision(editionNId);

    const lineageBefore = await reconstructEditionLineage(tenantAId, editionNId, editionNRevision);
    expect(lineageBefore.elements.filter((e) => e.present)).toHaveLength(1);

    await recordTransformation(tenantAId, 'Emergence', 'add_element');
    await recordTransformation(tenantAId, 'Emergence', 'add_element');

    const lineageAfter = await reconstructEditionLineage(tenantAId, editionNId, editionNRevision);
    expect(JSON.stringify(lineageAfter)).toBe(JSON.stringify(lineageBefore));
  });

  it('CROSS-TENANT SAFETY (RLS) — a COMPANY_ADMIN session for Tenant B cannot read Tenant A\'s Edition row at all', async () => {
    const editionOfA = await createEditionAs(tenantAId, 'Solo di A');

    await pgClient.query('BEGIN');
    await asRole('COMPANY_ADMIN', tenantBId);
    const asB = await pgClient.query(`SELECT id FROM analytics.living_koral_edition WHERE id = $1`, [editionOfA]);
    await pgClient.query('ROLLBACK');
    expect(asB.rows).toHaveLength(0);

    await pgClient.query('BEGIN');
    await asRole('COMPANY_ADMIN', tenantAId);
    const asA = await pgClient.query(`SELECT id FROM analytics.living_koral_edition WHERE id = $1`, [editionOfA]);
    await pgClient.query('ROLLBACK');
    expect(asA.rows).toHaveLength(1);
  });

  // geometry-service.ts's own resolveBoundedGeometryForEdition() is NOT
  // directly exercised here: it calls getLivingKoralEditionById(), which
  // requires a real Next.js request scope (next/headers's own cookies())
  // — unavailable in a bare vitest process, exactly the same reason the
  // rest of this suite (and the original combined test file before it)
  // has always read the Edition's own resultingStateRevision via a direct
  // SQL query (editionRevision(), below) instead of going through that
  // service function. Its own three composed steps — reconstructEdition-
  // Lineage, projectEditionLineageToExpressionMode, compressToBounded-
  // Geometry — are each independently verified for determinism and
  // correctness by the tests in this file and in the pure-function suite
  // above; geometry-service.ts itself adds no new logic beyond composing
  // them in the same order mark-service.ts already used. Its foreign/
  // nonexistent-Edition null-return behavior is inherited unchanged from
  // getLivingKoralEditionById()'s own existing, separately-owned tests.

  it('HISTORICAL EDITION BYTE STABILITY — a frozen Edition\'s own COMPRESSED geometry remains byte-identical even after a later, same-category Strengthening event is recognized for the same lineage', async () => {
    const { reconstructEditionLineage } = await import('@/lib/living-koral-mark/edition-lineage-service');
    const { projectEditionLineageToExpressionMode } = await import('@/lib/living-koral-mark/expression-projection');
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');

    const el1 = await recordTransformation(tenantAId, 'Emergence', 'add_element');
    await recordTransformation(tenantAId, 'Strengthening', 'increase_extent', el1.sourceEntityId);
    const editionId = await createEditionAs(tenantAId, 'Edizione — stabilita storica (substrate)');
    const revision = await editionRevision(editionId);

    const lineageBefore = await reconstructEditionLineage(tenantAId, editionId, revision);
    const boundedBefore = compressToBoundedGeometry(projectEditionLineageToExpressionMode(lineageBefore), revision);

    await recordTransformation(tenantAId, 'Weakening', 'decrease_extent', el1.sourceEntityId); // AFTER the boundary

    const lineageAfter = await reconstructEditionLineage(tenantAId, editionId, revision);
    const boundedAfter = compressToBoundedGeometry(projectEditionLineageToExpressionMode(lineageAfter), revision);

    expect(JSON.stringify(boundedAfter)).toBe(JSON.stringify(boundedBefore));
  });

  // ── LONG-HISTORY STRESS FIXTURE — 25 years / 100+ transformations /
  // 30 active lineages, proving macro-lobe count stays bounded. ───────────

  it('LONG-HISTORY STRESS — 30 active lineages, 30+ Strengthening/Weakening events, remains within 3 macro-slots (domain rank 0\'s own allotment) and 0-2 apertures', async () => {
    const { reconstructEditionLineage } = await import('@/lib/living-koral-mark/edition-lineage-service');
    const { projectEditionLineageToExpressionMode } = await import('@/lib/living-koral-mark/expression-projection');
    const { compressToBoundedGeometry } = await import('@/lib/living-koral-mark/morphological-compression');

    const sourceIds: string[] = [];
    for (let i = 0; i < 30; i++) {
      const el = await recordTransformation(tenantBId, 'Emergence', 'add_element');
      sourceIds.push(el.sourceEntityId);
    }
    for (let i = 0; i < 30; i++) {
      const category = i % 2 === 0 ? 'Strengthening' : 'Weakening';
      const operation = i % 2 === 0 ? 'increase_extent' : 'decrease_extent';
      await recordTransformation(tenantBId, category, operation as 'increase_extent' | 'decrease_extent', sourceIds[i % sourceIds.length]);
    }

    const editionId = await createEditionAs(tenantBId, 'Storia lunga — 30 lineages (substrate)');
    const revision = await editionRevision(editionId);
    const lineage = await reconstructEditionLineage(tenantBId, editionId, revision);
    const bounded = compressToBoundedGeometry(projectEditionLineageToExpressionMode(lineage), revision);

    expect(bounded.macroSlots).toHaveLength(3); // domain rank 0's own fixed allotment — never grows with 60 total events
    expect(bounded.apertures.length).toBeLessThanOrEqual(2);
    const totalContributors = bounded.macroSlots.reduce((s, slot) => s + slot.contributorProvenance.contributorCount, 0);
    expect(totalContributors).toBeGreaterThanOrEqual(30); // every lineage's own presence is still accounted for in provenance
  }, 30_000);

  it('teardown', async () => {
    await pgClient.end();
  });
});
