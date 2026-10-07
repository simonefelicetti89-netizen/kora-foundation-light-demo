// lib/living-koral-render/config-v2.ts
// KORA-WP-146 — Living KORAL Dual Renderer: versioned renderer configuration.
//
// Presentation rules only. Nothing here decides WHAT exists — that is the
// KORA-WP-145 canonical morphology state. Everything here decides HOW a
// canonical fact is drawn. Slots are neutral ordinals (KORA-WP-145
// `angularSlot`), never a pillar (Registry 219 KORA-WP-146 P1 amendment).
// v1 (tubular stems with hooked heads on a broad base) was visually rejected
// by the Founder on 2026-10-04; v2 is a new morphological grammar — one
// compact fused mass with full, short lobes — and therefore a new version.
// A change after acceptance ships as config-v3.ts; never edited in place.
//
// Geometry model: every element owns one PROFILE in its group's local plane
// (a = horizontal offset in the plane, z = height). The sculpture places that
// plane around the core; the Mark places the SAME profile on a neutral lane.
// One profile, two placements — the two outputs cannot disagree about shape.
//
// Units: metres. Sculpture axes: x right, y depth (+ away from the viewer), z up.

export const RENDERER_VERSION = 'koral-dual-renderer-v2.3';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as object).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export interface SlotLayout {
  readonly azimuthDeg: number; // sculpture: direction of the slot around the core (0 = +x, 90 = +y away from viewer)
  readonly radius: number; // sculpture: anchor distance from the core axis, as a fraction of the core footprint
  readonly lane: number; // Mark: neutral lane order
  readonly lean: number; // outward lean of the lobe as it leaves the core, degrees
  readonly curl: 1 | -1; // +1 bends outward, -1 bends back over the core (toward the axis)
  /** Optional fixed plane direction (deg) instead of radial — presentation only, carries no meaning. */
  readonly planeDeg?: number;
}

export interface Dimensions {
  readonly length: number;
  readonly rootRadius: number;
  readonly tipRadius: number;
  readonly bendGain?: number;
  /** Early counter-sway (deg): an S-curve rather than a single bend. */
  readonly sway?: number;
}

export interface RendererConfigV2 {
  readonly version: string;
  readonly core: { readonly center: readonly [number, number, number]; readonly radii: readonly [number, number, number]; readonly referenceMassShare: number; readonly massShareGain: number };
  readonly plinth: { readonly size: readonly [number, number, number] };
  readonly slots: Readonly<Record<number, SlotLayout>>;
  readonly memberBySeedRank: Readonly<Record<number, Dimensions>>;
  readonly grownMember: Dimensions;
  readonly bud: Dimensions;
  readonly lobe: { readonly rootEmbed: number; readonly taperPower: number; readonly belly: number; readonly bendStart: number; readonly tipKickDeg: number; readonly tipRound: number; readonly swaySpan: number };
  readonly branch: { readonly hostT: number; readonly aboveWindowT: number; readonly maxStartT: number; readonly lengthOfHost: number; readonly rootRadius: number; readonly tipRadius: number; readonly lean: number; readonly minLean: number; readonly maxLean: number; readonly bendShare: number; readonly hostLeanOut: number; readonly hostBendGain: number };
  readonly bendByPhase: Readonly<Record<'bud' | 'emergent' | 'formed' | 'settled', number>>;
  readonly massClass: Readonly<Record<'slender' | 'regular' | 'dense', { readonly radius: number; readonly length: number; readonly bend?: number }>>;
  readonly extentLengthGain: number;
  readonly headingNudgeDeg: number;
  readonly fusion: {
    readonly radius: number; // thickness of an absorbed mass merged without a cavity (before mass class)
    readonly windowRadius: readonly number[]; // half-width of each carved cavity (never a symmetric pair)
    readonly lensRatio: number; // carved cavity height / width: a lens, never a porthole
    readonly wall: number; // minimum solid wall around a carved cavity
    readonly thicken: number; // the absorbed member's added mass: host radius multiplier around its cavity
    readonly sideOffset: number; // a single piercing sits off-axis
    readonly pairRiseOptions: readonly number[]; // a second cavity sits beside the first, this much (× its height) higher — one step per verification rung
    readonly firstLift: number; // rise 0: the first passage is lifted this much (× its height) above the floor
    readonly pairLateral: number; // ... and this much further out to the side
    readonly shoulderRadius: number; readonly shoulderLength: readonly number[]; readonly shoulderOffset: number; readonly shoulderLean: number; readonly shoulderBend: number; readonly shoulderOverlap: number; readonly obliqueDeg: readonly number[]; readonly secondTurnOptionsDeg: readonly number[]; readonly shoulderCrownGap: number; readonly shoulderMerge: number; readonly minWindowShare: number;
    readonly windowTilt: readonly number[]; // each cavity's lens is tilted differently (deg): never an aligned pair
    readonly carveReach: number; // the tunnel reaches this far beyond the thickened surface (always pierces)
    readonly rimSoftness: number; // rounding of a carved cavity's rim
    readonly seamClear: number; // memory keeps this clearance around a cavity
    readonly tunnelExit: number; // free passage a cavity keeps beyond the body on both sides
    readonly hostBendCap: readonly number[]; // a host that carries cavities bends at most this much, by its number of cavities (index 1, 2)
    readonly hostLeanCap: readonly number[]; // ... and leans at most this much, by its number of cavities (index 1, 2)
    readonly planeOptionsDeg: readonly number[]; // cavity planes face the review three-quarter view first
    readonly mergeT: number; // a fusion without a cavity merges this early into its host
  };
  readonly clearance: {
    readonly margin: number; readonly maxIterations: number; readonly bendStep: number; readonly leanStep: number;
    readonly shortenStep: number; readonly minLengthScale: number; readonly thinStep: number; readonly minRadiusScale: number;
    readonly azimuthStepDeg: number; readonly azimuthSearchSteps: number; readonly sharedSlotStepDeg: number;
    readonly footprintLadder: readonly number[]; readonly branchRaiseStep: number; readonly attachHostWindow: number;
    readonly coreExemptK: number; readonly fuseDepth: number; readonly partingSamples: number; readonly fuseMaxT: readonly number[]; readonly markFuseMaxT: number; readonly crowdReference: number; readonly minCrowdScale: number; readonly crowdSplayDeg: number; readonly settleSteps: number; readonly settleStep: number; readonly safetyGain: number; readonly verificationRungs: number;
  };
  /** Blend between lobes (tight: keeps notches) and between lobes and the core (broad: no necks). */
  readonly blendK: number;
  readonly coreBlendK: number;
  /** Coarsest sculpture grid (m) at which the clearance band is still resolved. */
  readonly maxVoxel: number;
  readonly skeletonSamples: number;
  readonly seam: {
    readonly window: Readonly<Record<'attachment' | 'along' | 'terminal', readonly [number, number]>>; readonly tubeRadius: number; readonly endTaper: number;
    readonly twistDeg: number; readonly twistStep: number; readonly crossClear: number; readonly surfaceReach: number; readonly jumpFactor: number; readonly groovePad: number; readonly inlayRecess: number;
    readonly groundRun: number; readonly mergedWidthGain: number; readonly maxWidth: number; readonly sideStepDeg: number; readonly samples: number; readonly ring: number;
  };
  readonly materials: Readonly<Record<'body' | 'memory' | 'base', { readonly baseColor: readonly [number, number, number]; readonly metallic: number; readonly roughness: number }>>;
  readonly mark: {
    readonly viewSize: number; readonly margin: number; readonly gridStep: number; readonly ink: string;
    readonly smoothPasses: number; readonly simplifyEpsilon: number; readonly minHoleArea: number;
    /** Mark lanes of the shared projection (scene `points2`): clearance, start, step, gain; groups below the mass line are drawn inside it. */
    readonly radiusGain: number; readonly lanePad: number; readonly laneStep: number; readonly laneGain: number; readonly lowLobe: number; readonly massFuse: number;
    /** The sign (v2.3): an optical interpretation designed on the 20 px grid first (1 px = 12 units). */
    readonly sign: {
      readonly widthGain: number; readonly baseHalfWidth: readonly [number, number]; readonly baseHalfHeight: number; readonly baseDrop: number; readonly baseExponent: number;
      readonly crestRoot: number; readonly topY: number; readonly minHeight: number; readonly crestRadius: readonly [number, number]; readonly radiusRef: number; readonly tipShare: number;
      readonly leanGain: number; readonly turnGain: number; readonly maxLean: number; readonly maxTurn: number; readonly baseCavityGain: number; readonly shoulderMin: number; readonly shoulderOffset: number; readonly shoulderLength: number; readonly shoulderLean: number; readonly singleOffset: number; readonly pairOffset: number; readonly notch: number; readonly crestBlend: number; readonly baseBlend: number;
      readonly archSizes: readonly (readonly [number, number])[]; readonly archScales: readonly number[]; readonly archTowardCentre: number; readonly floorWall: number; readonly archWall: number; readonly sideWall: number;
      readonly bandFrom: number; readonly bandTo: number; readonly archClear: number; readonly tallTurn: number; readonly lensAlong: number; readonly secondAlong: number; readonly secondSide: number; readonly bandSide: number; readonly smallOpenGain: readonly number[]; readonly maxShift: number; readonly heightContrast: number; readonly densityGain: number; readonly barWidth: number; readonly dashShare: number;
    };
    /** Small-size rendering (≤ `maxPx` px): the same sign, openings drawn larger where the count holds, no memory band. */
    readonly small: { readonly maxPx: number; readonly smoothPasses: number };
  };
}

const config: RendererConfigV2 = deepFreeze({
  version: RENDERER_VERSION,
  // a compact, rounded mass that bulges above its contact with the plinth — never a platform
  core: { center: [0.002, 0.004, 0.02], radii: [0.077, 0.053, 0.048], referenceMassShare: 0.34, massShareGain: 0.35 },
  plinth: { size: [0.24, 0.18, 0.028] },
  slots: {
    0: { azimuthDeg: 186, radius: 0.72, lane: -0.06, lean: 22, curl: -1, planeDeg: 180 }, // seed:1 — the broad wave: rises leaning left, turns right
    1: { azimuthDeg: 6, radius: 0.66, lane: 0.034, lean: 17, curl: -1, planeDeg: 0 }, // seed:0 — taller, on the right, bends left above the valley
    2: { azimuthDeg: -28, radius: 0.86, lane: 0.112, lean: 34, curl: 1 }, // seed:bud — small, low on the right, in front of the tall lobe's root
    3: { azimuthDeg: 268, radius: 0.58, lane: -0.142, lean: 20, curl: 1 }, // core-grown primary (rank 3)
    4: { azimuthDeg: 122, radius: 0.58, lane: 0.19, lean: 20, curl: 1 }, // core-grown primary (rank 4)
  },
  memberBySeedRank: {
    1: { length: 0.18, rootRadius: 0.04, tipRadius: 0.021, bendGain: 0.85, sway: 11 },
    2: { length: 0.15, rootRadius: 0.056, tipRadius: 0.026, bendGain: 1.75, sway: 6 },
  },
  grownMember: { length: 0.115, rootRadius: 0.038, tipRadius: 0.022 },
  bud: { length: 0.026, rootRadius: 0.027, tipRadius: 0.025 },
  lobe: { rootEmbed: 0.03, taperPower: 1.45, belly: 0.1, bendStart: 0.22, tipKickDeg: 14, tipRound: 0.96, swaySpan: 0.6 },
  branch: { hostT: 0.42, aboveWindowT: 0.12, maxStartT: 0.78, lengthOfHost: 0.26, rootRadius: 0.035, tipRadius: 0.028, lean: 48, minLean: 10, maxLean: 78, bendShare: 0.5, hostLeanOut: 18, hostBendGain: 1.2 },
  bendByPhase: { bud: 0, emergent: 62, formed: 72, settled: 40 },
  massClass: { slender: { radius: 0.86, length: 1 }, regular: { radius: 1, length: 1 }, dense: { radius: 1.22, length: 0.84, bend: 1.15 } }, // consolidated mass: fuller, shorter, and curls further inward
  extentLengthGain: 0.12,
  headingNudgeDeg: 30,
  fusion: { radius: 0.036, windowRadius: [0.017, 0.0085], lensRatio: 1.3, wall: 0.011, thicken: 1.18, sideOffset: 0.18, pairRiseOptions: [0, 1.2, 1.7, 2.6], firstLift: 0, pairLateral: 1.9, shoulderRadius: 1.25, shoulderLength: [0.3, 0.3], shoulderOffset: 1.25, shoulderLean: 24, shoulderBend: 34, shoulderOverlap: 0.62, obliqueDeg: [-30, 50], secondTurnOptionsDeg: [55, -55, 40, -40, 25, -25], shoulderCrownGap: 1.6, shoulderMerge: 0.75, minWindowShare: 1, windowTilt: [14, -34], carveReach: 0.006, rimSoftness: 0.012, seamClear: 0.008, tunnelExit: 0.014, hostBendCap: [0, 105, 60], hostLeanCap: [0, 26, 4], planeOptionsDeg: [-30, 0, -60, 30, 60, 90, -90, 120, -120, 150, -150, 180], mergeT: 0.4 },
  clearance: {
    margin: 0.008, maxIterations: 16, bendStep: 0.88, leanStep: 2, shortenStep: 0.94, minLengthScale: 0.72, thinStep: 0.96, minRadiusScale: 0.84,
    azimuthStepDeg: 7, azimuthSearchSteps: 50, sharedSlotStepDeg: 34, footprintLadder: [1.06, 1.12, 1.18, 1.24], branchRaiseStep: 0.04, attachHostWindow: 4,
    coreExemptK: 0.6, fuseDepth: 0.006, partingSamples: 3, fuseMaxT: [0.45, 0.6, 0.75, 0.9, 1], markFuseMaxT: 0.9, crowdReference: 3, minCrowdScale: 0.72, crowdSplayDeg: 80, settleSteps: 5, settleStep: 0.82, safetyGain: 0.75, verificationRungs: 3,
  },
  blendK: 0.011,
  coreBlendK: 0.026,
  maxVoxel: 0.0024,
  skeletonSamples: 18,
  seam: {
    window: { attachment: [0.0, 0.72], along: [0.14, 0.86], terminal: [0.3, 0.97] }, tubeRadius: 0.0019, endTaper: 0.14,
    twistDeg: 22, twistStep: 26, crossClear: 0.007, surfaceReach: 1.7, jumpFactor: 3, groovePad: 0.00035, inlayRecess: 0.25,
    groundRun: 0.6, mergedWidthGain: 0.35, maxWidth: 2, sideStepDeg: 72, samples: 14, ring: 8,
  },
  materials: {
    body: { baseColor: [0.86, 0.8, 0.7], metallic: 0, roughness: 0.62 }, // warm ivory / alabaster, matte
    memory: { baseColor: [0.56, 0.39, 0.2], metallic: 1, roughness: 0.38 }, // restrained satin bronze
    base: { baseColor: [0.6, 0.57, 0.52], metallic: 0, roughness: 0.88 }, // mineral stone
  },
  mark: {
    viewSize: 240, margin: 20, gridStep: 1, ink: '#06032B',
    smoothPasses: 5, simplifyEpsilon: 1.1, minHoleArea: 10,
    radiusGain: 0.98, lanePad: 0.0, laneStep: 0.003, laneGain: 1.6, lowLobe: 0.03, massFuse: 0.7,
    sign: {
      widthGain: 66, baseHalfWidth: [78, 102], baseHalfHeight: 44, baseDrop: 0.5, baseExponent: 2.4,
      crestRoot: 0.1, topY: 60, minHeight: 0.5, crestRadius: [30, 48], radiusRef: 0.045, tipShare: 0.84,
      leanGain: 1.15, turnGain: 1.0, maxLean: 0.9, maxTurn: 2.2, baseCavityGain: 14, shoulderMin: 0.3, shoulderOffset: 0.78, shoulderLength: 0.7, shoulderLean: 0.5,
      singleOffset: 0.2, pairOffset: 0.42, notch: 26, crestBlend: 6, baseBlend: 34,
      archSizes: [[28, 64], [20, 34], [18, 30]], archScales: [1, 0.88, 0.76, 0.64], archTowardCentre: 0.3, floorWall: 34, archWall: 24, sideWall: 24,
      bandFrom: 0.3, bandTo: 0.86, archClear: 12, tallTurn: 0.65, lensAlong: 0.8, secondAlong: 0.55, secondSide: 0.42, bandSide: 0.5, smallOpenGain: [1.35, 1.2, 1.1], maxShift: 40, heightContrast: 2.5, densityGain: 0.8, barWidth: 5, dashShare: 0.55,
    },
    small: { maxPx: 24, smoothPasses: 6 },
  },
});

export function getRendererConfig(): RendererConfigV2 {
  return config;
}
