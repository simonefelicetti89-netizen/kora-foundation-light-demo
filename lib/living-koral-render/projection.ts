// lib/living-koral-render/projection.ts
// KORA-WP-146 — the ONE shared renderer projection.
//
//   KORA-WP-145 CanonicalMorphologyState (Expression projection: no pillar code)
//     -> RenderScene: element GROUPS (a host lobe + its branch / fused lobes),
//        each group drawn as profiles in ONE local plane
//          (a = horizontal offset in the plane, z = height)
//     -> sculpture.ts places each group's plane around the core (3D, GLB)
//     -> mark.ts places the SAME profiles on packed neutral lanes (2D, SVG)
//
// Neither renderer reads the canonical state or any event itself, so they
// cannot disagree about what exists. Nothing here adds semantics: every
// element, fusion, cavity and trace comes from the state; this file only
// chooses positions, curves and radii from neutral slots, structural phase
// and mass class.
//
// Grammar (v2): one compact fused mass first. Every lobe is rooted INSIDE the
// core and leaves it through a broad blend; lobes are full and short and bend
// rather than hook. A fusion is a merger of masses: the absorbed lobe rises
// beside its host and merges into the host's upper body; when the canonical
// state holds an open fusion-enclosed cavity, the explicit gap between the two
// masses, closed above by their merger and below by the core, IS the cavity.
//
// Topology is correct by construction: windows are explicit; every other
// contact is forbidden by a deterministic clearance resolver (in the shared
// profile plane, and between groups in 3D) — contact counts only where it is
// fused mass (inside the core, or a part's contiguous attachment run).
// No randomness, no hash seeds, no time, no count, no pillar.

import { hashCanonicalMorphologyState, projectCanonicalMorphologyForExpression } from '@/lib/living-koral-mark/canonical-morphology';
import type { CanonicalMorphologyState } from '@/lib/living-koral-mark/canonical-morphology-types';
import { getRendererConfig, RENDERER_VERSION, type SlotLayout } from './config-v2';

export type Vec3 = readonly [number, number, number];
export type P2 = readonly [number, number];
type ExpressionState = ReturnType<typeof projectCanonicalMorphologyForExpression>;
type ExpressionElement = ExpressionState['elements'][number];

export type RenderRole = 'member' | 'bud' | 'branch' | 'eye' | 'lump';

export interface RenderElement {
  readonly id: string; // canonical element id — stable render identity
  readonly role: RenderRole;
  readonly groupId: string; // the host element whose plane this element shares
  readonly canonicalKind: ExpressionElement['kind'];
  readonly assignment: ExpressionElement['assignment'];
  readonly fusedInto: string | null;
  /** Shared profile in the group's local plane: [a, z]. */
  readonly profile: readonly P2[];
  readonly radii: readonly number[];
  /** Sculpture placement of the profile. */
  readonly points: readonly Vec3[];
  /** Mark placement of the same profile (scene units, before viewBox fit). */
  readonly points2: readonly P2[];
  /** Eye only: the window it encloses with its host (profile plane, then Mark placement). */
  /** Eye only: the cavity carved through the fused body — profile-plane centre, Mark centre, 3D centre and the
   *  plane's normal (the tunnel's axis), half-width, half-height and the tunnel's half-length. */
  readonly window?: { readonly center: P2; readonly center2: P2; readonly center3: Vec3; readonly normal3: Vec3; readonly axis3: Vec3; readonly halfGap: number; readonly halfHeight: number; readonly depth: number; readonly tilt: number; readonly tilt2: number;
    /** Seen from the front, a cavity turned about its host is foreshortened by this factor (Mark only). */
    readonly fore: number };
}

export interface RenderSeam {
  readonly traceId: string;
  readonly kind: string;
  readonly hostId: string; // a rendered element id, or 'core'
  readonly t0: number;
  readonly t1: number;
  readonly sideDeg: number;
  /** S-twist of this seam around its host (deg). */
  readonly twist: number;
  readonly width: number; // bounded, from mergedCount only
}

export interface RenderScene {
  readonly rendererVersion: string;
  readonly canonicalStateHash: string;
  readonly core: { readonly center: Vec3; readonly radii: Vec3 };
  /** Mark mass: a capsule spanning the lanes at the core's height. */
  readonly core2: { readonly x0: number; readonly x1: number; readonly zc: number; readonly halfHeight: number };
  readonly elements: readonly RenderElement[];
  readonly notRendered: readonly { readonly id: string; readonly reason: 'retired' }[];
  readonly fusions: readonly { readonly fusionId: string; readonly memberIds: readonly [string, string]; readonly hostId: string; readonly kind: string; readonly cavityOpen: boolean }[];
  readonly openCavityIds: readonly string[];
  readonly seams: readonly RenderSeam[];
  /** 3D packing rung used: 1 = the compact core; >1 = widened (bounded) only because the groups could not otherwise clear. */
  readonly footprintScale: number;
  /** Fused-from-root depth used: how much of their lower body lobes share (more when crowded). */
  readonly fusedDepth: number;
  /** Self-verification rung the outputs were accepted at (0 = first projection). */
  readonly verificationRung: number;
  /** Pairs the clearance resolver could not separate (must be empty; a renderer test guards it). */
  readonly unresolvedContacts: readonly string[];
}

const C = getRendererConfig();
const rad = (d: number) => (d * Math.PI) / 180;
const r6 = (n: number) => {
  const v = Math.round(n * 1e6) / 1e6;
  return Object.is(v, -0) ? 0 : v;
};
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

type Core = { center: Vec3; radii: Vec3 };

interface Frame {
  readonly slot: SlotLayout;
  readonly azimuthDeg: number;
  /** Direction of the group's profile plane (+a axis). Radial by default; front-facing for a host carrying windows. */
  readonly planeDeg: number;
  readonly anchor: Vec3;
  readonly mirror: 1 | -1;
  readonly z0: number;
}

/** Height of the core's upper surface at (x, y). */
function coreSurfaceZ(core: Core, x: number, y: number): number {
  const q = 1 - ((x - core.center[0]) / core.radii[0]) ** 2 - ((y - core.center[1]) / core.radii[1]) ** 2;
  return core.center[2] + core.radii[2] * Math.sqrt(Math.max(q, 0));
}

/** Plane choice: a fixed direction (deg), the slot's own plane (null), or plainly radial. */
type PlaneChoice = number | null | 'radial';

function frameFor(slotIndex: number, core: Core, nudgeDeg: number, planeAbsDeg: PlaneChoice = null): Frame {
  const slot = C.slots[slotIndex] ?? C.slots[0];
  const az = slot.azimuthDeg + nudgeDeg;
  const x = core.center[0] + Math.cos(rad(az)) * slot.radius * core.radii[0];
  const y = core.center[1] + Math.sin(rad(az)) * slot.radius * core.radii[1];
  // rooted INSIDE the mass: the lobe leaves the core through the broad core blend, never as a stalk
  const z0 = Math.max(0.012, coreSurfaceZ(core, x, y) - C.lobe.rootEmbed);
  return { slot, azimuthDeg: az, planeDeg: planeAbsDeg === 'radial' ? az : planeAbsDeg ?? slot.planeDeg ?? az, anchor: [x, y, z0], mirror: slot.lane < 0 ? -1 : 1, z0 };
}

/** A part turned about its host: a rigid rotation about the vertical axis through `pivot` (profile coordinates). */
interface Turn { readonly deg: number; readonly pivot: P2 }

/** 3D placement of a part's profile point: the shared plane, or (turned part) rigidly turned about its pivot. */
function placePart(f: Frame, turn: Turn | undefined, q: P2): Vec3 {
  if (!turn) return place3(f, q);
  const c = place3(f, [turn.pivot[0], q[1]]);
  const t = rad(f.planeDeg + turn.deg);
  return [r6(c[0] + Math.cos(t) * (q[0] - turn.pivot[0])), r6(c[1] + Math.sin(t) * (q[0] - turn.pivot[0])), c[2]];
}

/**
 * The second cavity's turn: the first option (fixed order) whose two tunnel exits stay clear of the
 * first cavity's shoulder — a passage must open to the air on both sides. Local frame: x along the
 * plane, y its normal; the turned part rotates rigidly about the host axis at `pivotX`.
 */
function secondTurn(first: Part, pivotX: number, c: P2, halfH: number, depth: number): number {
  const opts = C.fusion.secondTurnOptionsDeg;
  for (const deg of opts) {
    const t = rad(deg);
    const cx = pivotX + (c[0] - pivotX) * Math.cos(t), cy = (c[0] - pivotX) * Math.sin(t);
    const nx = -Math.sin(t), ny = Math.cos(t);
    const blocked = [-1, 1].some((sgn) => [0.8, 1.2, 1.6].some((k) => {
      const px = cx + sgn * nx * depth * k, py = cy + sgn * ny * depth * k;
      // the first part may itself be turned: test it where it really stands
      const t1 = rad(first.turn?.deg ?? 0), p1 = first.turn?.pivot[0] ?? 0;
      return first.profile.some((q, i) => {
        const fx = p1 + (q[0] - p1) * Math.cos(t1), fy = (q[0] - p1) * Math.sin(t1);
        return Math.abs(q[1] - c[1]) < halfH + first.radii[i] && Math.hypot(fx - px, fy - py) < first.radii[i] + C.fusion.wall + halfH * 0.5;
      });
    }));
    if (!blocked) return deg;
  }
  return 0; // no turn clears: both cavities face the same way (still a true passage each)
}

const place3 = (f: Frame, p: P2): Vec3 => [r6(f.anchor[0] + Math.cos(rad(f.planeDeg)) * p[0]), r6(f.anchor[1] + Math.sin(rad(f.planeDeg)) * p[0]), r6(p[1])];

/**
 * A full, short lobe: rises at `leanDeg`, bends progressively by `bendDeg`
 * toward `bendSign` (no concentrated hook), ends with a small asymmetric turn.
 * Radius stays full through the root and middle (belly) and tapers late.
 */
function lobeProfile(start: P2, length: number, leanDeg: number, bendDeg: number, bendSign: 1 | -1, rootR: number, tipR: number, swayDeg = 0): { profile: P2[]; radii: number[] } {
  const L = C.lobe;
  const steps = 240;
  const ds = length / steps;
  let a = start[0], z = start[1];
  const track: P2[] = [[a, z]];
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    // an optional early counter-sway (the lobe leans out a little more, then turns in): an S, never a hook
    const sway = swayDeg ? rad(swayDeg) * Math.sin(Math.PI * Math.min(1, u / L.swaySpan)) : 0;
    const phi = rad(leanDeg) + bendSign * (rad(bendDeg) * smooth(L.bendStart, 1, u) + (bendDeg > 0 ? rad(L.tipKickDeg) * smooth(0.82, 1, u) : 0) - sway);
    a += Math.sin(phi) * ds;
    z += Math.cos(phi) * ds;
    track.push([a, z]);
  }
  const n = C.skeletonSamples;
  const profile: P2[] = [];
  const radii: number[] = [];
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    const p = track[Math.round(t * steps)];
    profile.push([r6(p[0]), r6(p[1])]);
    const base = rootR + (tipR - rootR) * Math.pow(t, L.taperPower);
    const belly = 1 + L.belly * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 1.5);
    radii.push(r6(base * belly * (k === n - 1 ? L.tipRound : 1)));
  }
  return { profile, radii };
}

function at(profile: readonly P2[], t: number): P2 {
  const f = Math.max(0, Math.min(1, t)) * (profile.length - 1);
  const i = Math.min(Math.floor(f), profile.length - 2);
  const w = f - i;
  return [profile[i][0] + (profile[i + 1][0] - profile[i][0]) * w, profile[i][1] + (profile[i + 1][1] - profile[i][1]) * w];
}

export function pointAt<T extends readonly number[]>(points: readonly T[], t: number): number[] {
  const f = Math.max(0, Math.min(1, t)) * (points.length - 1);
  const i = Math.min(Math.floor(f), points.length - 2);
  const w = f - i;
  return points[i].map((v, d) => v + (points[i + 1][d] - v) * w);
}

function dims(e: ExpressionElement): { length: number; rootRadius: number; tipRadius: number; bend: number; sway: number } {
  const mass = C.massClass[e.massClass];
  let base = C.grownMember;
  if (e.kind === 'bud' && e.assignment === 'unassigned') base = C.bud;
  else if (e.extentRank && C.memberBySeedRank[e.extentRank]) base = C.memberBySeedRank[e.extentRank];
  const extentGain = 1 + C.extentLengthGain * e.extent.normalized;
  return { length: base.length * mass.length * extentGain, rootRadius: base.rootRadius * mass.radius, tipRadius: base.tipRadius * mass.radius, bend: Math.min(110, C.bendByPhase[e.terminalPhase] * (base.bendGain ?? 1) * (mass.bend ?? 1)), sway: base.sway ?? 0 };
}

const nudgeOf = (e: ExpressionElement) => (e.heading.isFallback ? 0 : (e.heading.angle / 360 - 0.5) * C.headingNudgeDeg);

// ── groups ──────────────────────────────────────────────────────────────────
interface Part {
  id: string;
  role: RenderRole;
  e: ExpressionElement;
  profile: P2[];
  radii: number[];
  /** Where this part is MEANT to meet its host; contact near these points is attachment, anywhere else is a defect. */
  attachAt: P2[] | 'all';
  /** Host sample index each attachment end belongs to (same order as attachAt). */
  attachHostIdx: number[];
  window?: { center: P2; halfGap: number; halfHeight: number; depth: number; tilt: number; oblique: number };
  /** Sculpture only: the part turned rigidly about the host at its cavity (distances preserved); the Mark keeps the shared profile. */
  turn?: Turn;
}

interface Group {
  host: ExpressionElement;
  frame: Frame;
  coreTop: number;
  azimuthDelta: number;
  bendScale: number;
  leanDelta: number;
  lengthScale: number;
  radiusScale: number;
  branchBendScale: number;
  branchLeanDelta: number;
  branchRaise: number;
  /** The branch takes the host's other side (a placement move only). */
  branchFlip: boolean;
  branchLength: number;
  parts: Part[];
}

/** Number of fusion-enclosed cavity windows a host carries (bounded by the canonical cavity cap). */
function windowCount(e: ExpressionElement, expr: ExpressionState, cavityByFusion: Set<string>): number {
  return Math.min(C.fusion.windowRadius.length, expr.elements.filter((f) => f.assignment === 'fused' && f.fusedInto === e.id && expr.fusions.some((j) => j.active && j.kind === 'cross-area' && j.memberIds.includes(f.id) && j.resultMemberId === e.id && cavityByFusion.has(j.fusionId))).length);
}

function buildGroup(g: Omit<Group, 'parts'>, expr: ExpressionState, cavityByFusion: Set<string>): Part[] {
  const e = g.host;
  const d = dims(e);
  const sign = g.frame.slot.curl;
  const R0 = d.rootRadius * g.radiusScale, Rt = d.tipRadius * g.radiusScale;
  // A host that carries a fusion-enclosed window stands more upright (bend and lean capped):
  // the window needs the masses either side of it, never an overhang.
  const windows = windowCount(e, expr, cavityByFusion);
  // a host that carries a branch (and no window) leans out and bends further under it: branched growth spreads low and wide
  const branched = !windows && expr.elements.some((b) => b.kind === 'branch' && b.assignment === 'adopted' && b.parentId === e.id);
  const baseLean = g.frame.slot.lean + nudgeOf(e) * 0.5 + g.leanDelta + (branched ? C.branch.hostLeanOut : 0);
  // two cavities keep their host nearly upright and compact (never a figure); one cavity allows more lean (room in a crowd)
  const leanCap = C.fusion.hostLeanCap[Math.min(windows, C.fusion.hostLeanCap.length - 1)];
  const hostLean = windows ? Math.max(-leanCap, Math.min(leanCap, baseLean)) : baseLean;
  const hostBend = (windows ? Math.min(C.fusion.hostBendCap[Math.min(windows, C.fusion.hostBendCap.length - 1)], d.bend) : d.bend * (branched ? C.branch.hostBendGain : 1)) * g.bendScale;
  // a host carrying cavities keeps the height to carry them: its cavities' floor plus their stack
  let length = d.length * g.lengthScale;
  if (windows) {
    const r0 = C.fusion.windowRadius[0] * g.radiusScale * C.fusion.lensRatio;
    const rise0 = C.fusion.pairRiseOptions[Math.min(SAFETY, C.fusion.pairRiseOptions.length - 1)];
    const stack = windows === 2 ? 2 * r0 + r0 * (rise0 === 0 ? C.fusion.firstLift : rise0) + C.fusion.wall : 2 * r0 + C.fusion.wall;
    // ... and, when it also owns a branch, the room for that branch above its cavities
    const ownsBranch = expr.elements.some((b) => b.kind === 'branch' && b.assignment === 'adopted' && b.parentId === e.id);
    const branchRoom = ownsBranch ? 2 * (C.branch.rootRadius + C.fusion.wall) : 0;
    const need = g.coreTop + C.coreBlendK * 0.5 + C.fusion.wall + stack + branchRoom + Rt * 2 - g.frame.z0;
    length = Math.max(length, need / Math.max(0.35, Math.cos(rad(hostLean))) / 0.92);
  }
  const hostP = lobeProfile([0, g.frame.z0], length, hostLean, hostBend, sign, R0, Rt, windows ? 0 : d.sway);
  const parts: Part[] = [{ id: e.id, role: e.kind === 'bud' && e.assignment === 'unassigned' ? 'bud' : 'member', e, ...hostP, attachAt: [], attachHostIdx: [] }];
  const hostLen = hostP.profile.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - hostP.profile[i - 1][0], p[1] - hostP.profile[i - 1][1]) : 0), 0);
  const outward = (-sign) as 1 | -1; // the host's open side (away from its bend)
  const n = hostP.profile.length;

  let eye = 0;
  let aboveWindowsT = 0;
  for (const f of expr.elements) {
    if (f.assignment !== 'fused' || f.fusedInto !== e.id) continue;
    const joint = expr.fusions.find((j) => j.active && j.memberIds.includes(f.id) && j.resultMemberId === e.id);
    const Rf = C.fusion.radius * C.massClass[f.massClass].radius * g.radiusScale;
    if (joint && joint.kind === 'cross-area' && cavityByFusion.has(joint.fusionId) && eye < C.fusion.windowRadius.length) {
      // Fusion-enclosed cavity, carved by the fusion: the absorbed member becomes MASS added to
      // the host's body (a local thickening), and the cavity is a lens-shaped tunnel pierced
      // through that thickened body, perpendicular to the group's plane, with solid walls all
      // round. Explicit size, explicit walls — never left to the blend.
      const rh = C.fusion.windowRadius[eye] * g.radiusScale;
      const lens = C.fusion.lensRatio;
      const floor = g.coreTop + C.coreBlendK * 0.5 + rh * lens + C.fusion.wall;
      // two cavities sit side by side in the thickened body (the second a little higher, never a
      // symmetric pair) — stacking them would force a tall host
      const prev = parts.find((p) => p.role === 'eye')?.window;
      const place = (rise: number) => {
        // rise 0: the larger first passage is lifted and the smaller second sits low near the base — never
        // two openings at one height, never a small one above a large one
        const minZ = prev
          ? (rise === 0 ? floor : Math.max(floor, prev.center[1] + prev.halfHeight * rise))
          : (windows === 2 && rise === 0 ? floor + rh * lens * C.fusion.firstLift : floor);
        const hi = Math.max(2, hostP.profile.findIndex((q) => q[1] >= minZ));
        const ti = hi < 2 || hi > n - 4 ? Math.min(n - 4, Math.max(2, hi)) : hi;
        // The absorbed member is a SHOULDER: a shorter mass rising from the core beside its host and
        // fused with it along its whole height (it never parts from it); the cavity is a passage carved
        // through their fusion seam — never an eye in a head. Two cavities take opposite flanks.
        const side = (eye === 0 ? 1 : -1) as 1 | -1;
        const hostLenNow = hostP.profile.reduce((sum, q, i) => (i ? sum + Math.hypot(q[0] - hostP.profile[i - 1][0], q[1] - hostP.profile[i - 1][1]) : 0), 0);
        const zc = hostP.profile[ti][1];
        const Rs = Rf * C.fusion.shoulderRadius;
        const shoulderLen = Math.max(hostLenNow * C.fusion.shoulderLength[eye], zc + rh * lens + C.fusion.wall + Rs - g.frame.z0);
        const sh = lobeProfile([side * R0 * C.fusion.shoulderOffset, g.frame.z0], shoulderLen, side * C.fusion.shoulderLean, C.fusion.shoulderBend, (-side) as 1 | -1, Rs, Rs * 0.62);
        const hostA = (z: number) => {
          for (let i = 1; i < n; i++) if (hostP.profile[i][1] >= z) { const q0 = hostP.profile[i - 1], q1 = hostP.profile[i]; const w = (z - q0[1]) / Math.max(1e-9, q1[1] - q0[1]); return { a: q0[0] + (q1[0] - q0[0]) * w, r: hostP.radii[i - 1] + (hostP.radii[i] - hostP.radii[i - 1]) * w }; }
          return { a: hostP.profile[n - 1][0], r: hostP.radii[n - 1] };
        };
        // fused along its whole height: the shoulder's axis never strays from the host's beyond an overlap
        const pts: P2[] = sh.profile.map((q, i) => {
          const h = hostA(q[1]);
          // ... and over its last stretch it converges onto the host: its tip merges into the crown, never a knob
          const u = i / Math.max(1, sh.profile.length - 1);
          const maxSep = C.fusion.shoulderOverlap * (1 - C.fusion.shoulderMerge * smooth(0.8, 1, u)) * (h.r + sh.radii[i]);
          const sep = Math.max(-maxSep, Math.min(maxSep, q[0] - h.a));
          return [r6(h.a + sep), q[1]] as P2;
        });
        // a shoulder never rises above its host's crown (it would read as a knob, a head): it ends
        // below the crown, but always far enough above its own cavity to keep the wall
        const crown = Math.max(...hostP.profile.map((q) => q[1])) - Rt * C.fusion.shoulderCrownGap;
        const capZ = Math.max(crown, zc + rh * lens + C.fusion.wall + Rs * 0.5);
        const keep = sh.profile.map((q, i) => i < 4 || q[1] <= capZ);
        const cut = keep.indexOf(false);
        if (cut > 0) { pts.splice(cut); sh.radii.splice(cut); }
        const radii = sh.radii.map((r) => r6(r));
        const hc = hostA(zc);
        const sc = (() => { let best = pts[0], bd = Infinity; for (const q of pts) { const d = Math.abs(q[1] - zc); if (d < bd) { bd = d; best = q; } } return best; })();
        const sep = Math.abs(sc[0] - hc.a);
        const avail = (sep + Rs + hc.r) / 2 - C.fusion.wall;
        const rhEff = Math.max(C.fusion.windowRadius[1] * C.fusion.minWindowShare, Math.min(rh, avail / Math.max(1, lens * 0.75))); // never too small to carve open
        const center: P2 = [r6((hc.a + sc[0]) / 2), r6(zc)];
        return { ti, part: {
          id: f.id, role: 'eye' as const, e: f, profile: pts, radii, attachAt: 'all' as const, attachHostIdx: [],
          // with two cavities each passage is carved obliquely through the mass (opposite senses): from the front
          // it reads as a recess inside the body, never a pair of openings facing the viewer
          window: (() => { const ob = windows === 2 ? C.fusion.obliqueDeg[eye] : 0; return { center, halfGap: r6(rhEff), halfHeight: r6(rhEff * lens), depth: r6((Math.max(hc.r, Rs) * 1.05) / Math.cos(rad(ob)) + C.fusion.carveReach), tilt: C.fusion.windowTilt[eye], oblique: ob }; })(),
          // a second cavity opens to the side, not the front: never a facing pair
          ...(eye === 1 ? { turn: { deg: secondTurn(parts.find((q) => q.role === 'eye')!, hc.a, center, rhEff * lens, Math.max(hc.r, Rs) * 1.05), pivot: [r6(hc.a), r6(zc)] as P2 } } : {}),
        } as Part };
      };
      // the second cavity rises only as far as it must: each stricter verification rung raises it one step
      const opts = C.fusion.pairRiseOptions;
      const placed = place(opts[Math.min(SAFETY, opts.length - 1)]);
      const { ti } = placed;
      parts.push(placed.part);
      aboveWindowsT = Math.max(aboveWindowsT, (ti + 2) / (n - 1));
      eye++;
    } else {
      // fusion without a window: the absorbed mass merges into the host early — the host grows fuller
      const sideL = (-outward) as 1 | -1;
      const pts: P2[] = [];
      const radii: number[] = [];
      const mj = at(hostP.profile, C.fusion.mergeT);
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        pts.push([r6(sideL * R0 * 0.55 * (1 - t) + mj[0] * t), r6(g.frame.z0 + (mj[1] - g.frame.z0) * t)]);
        radii.push(r6(Rf * (1 - 0.15 * t)));
      }
      parts.push({ id: f.id, role: 'lump', e: f, profile: pts, radii, attachAt: 'all', attachHostIdx: [] });
    }
  }

  // The branch the canonical state owns: a smaller lobe from the host's upper flank, broad at
  // its root, opening outward and turning upward. With one window it takes the other side.
  const br = expr.elements.find((b) => b.kind === 'branch' && b.assignment === 'adopted' && b.parentId === e.id);
  if (br) {
    const mass = C.massClass[br.massClass];
    const bSide = ((eye === 1 ? -1 : outward) * (g.branchFlip ? -1 : 1)) as 1 | -1;
    const startT = Math.min(C.branch.maxStartT, Math.max(C.branch.hostT, eye > 0 ? aboveWindowsT + C.branch.aboveWindowT : 0) + g.branchRaise); // above every cavity
    const start = at(hostP.profile, startT);
    const lean = bSide * Math.max(C.branch.minLean, Math.min(C.branch.maxLean, C.branch.lean + g.branchLeanDelta)) + nudgeOf(br) * 0.25;
    const bp = lobeProfile(start, hostLen * C.branch.lengthOfHost * mass.length * g.branchLength, lean, C.bendByPhase[br.terminalPhase] * C.branch.bendShare * g.branchBendScale, (-bSide) as 1 | -1, C.branch.rootRadius * mass.radius * g.radiusScale, C.branch.tipRadius * mass.radius * g.radiusScale);
    parts.push({ id: br.id, role: 'branch', e: br, ...bp, attachAt: [start], attachHostIdx: [Math.round(startT * (n - 1))] });
  }
  return parts;
}

// ── clearance ───────────────────────────────────────────────────────────────
// verification rung (see index.ts): each rung widens every clearance margin and fuses more solidly
let SAFETY = 0;
const REQUIRED = () => C.blendK / 2 + C.clearance.margin * (1 + SAFETY * C.clearance.safetyGain);

/**
 * Attachment zone of a part: the CONTIGUOUS run of samples, starting at an
 * attachment end, that is still in contact with the host's local neighbourhood.
 * Once the part has left the host it must stay clear — coming back would close a window.
 */
function attachmentMask(part: Part, host: Part): boolean[] {
  const n = part.profile.length;
  if (part.attachAt === 'all') return new Array<boolean>(n).fill(true);
  const touching = (i: number, hj: number) => {
    let c = Infinity;
    const w = C.clearance.attachHostWindow;
    for (let j = Math.max(0, hj - w); j <= Math.min(host.profile.length - 1, hj + w); j++) c = Math.min(c, Math.hypot(part.profile[i][0] - host.profile[j][0], part.profile[i][1] - host.profile[j][1]) - part.radii[i] - host.radii[j]);
    return c < REQUIRED();
  };
  const mask = new Array<boolean>(n).fill(false);
  part.attachHostIdx.forEach((hj, k) => {
    const end = k === 0 ? 0 : n - 1;
    const step = end === 0 ? 1 : -1;
    for (let i = end; i >= 0 && i < n && touching(i, hj); i += step) mask[i] = true;
  });
  return mask;
}

/** A part must never touch itself away from its own neighbourhood along the curve. */
function selfClear(part: Part): boolean {
  const arc = [0];
  for (let i = 1; i < part.profile.length; i++) arc.push(arc[i - 1] + Math.hypot(part.profile[i][0] - part.profile[i - 1][0], part.profile[i][1] - part.profile[i - 1][1]));
  for (let i = 0; i < part.profile.length; i++) for (let j = i + 2; j < part.profile.length; j++) {
    const need = part.radii[i] + part.radii[j] + REQUIRED();
    if (arc[j] - arc[i] <= need * 2.2) continue; // a corner or a tight fold is solid; only a real return can close a window
    if (Math.hypot(part.profile[i][0] - part.profile[j][0], part.profile[i][1] - part.profile[j][1]) < need) return false;
  }
  return true;
}

function minClearance(
  aPts: readonly (readonly number[])[], aR: readonly number[], bPts: readonly (readonly number[])[], bR: readonly number[],
  skip: (i: number, j: number) => boolean,
): number {
  let worst = Infinity;
  for (let i = 0; i < aPts.length; i++) {
    for (let j = 0; j < bPts.length; j++) {
      if (skip(i, j)) continue;
      let d2 = 0;
      for (let k = 0; k < aPts[i].length; k++) d2 += (aPts[i][k] - bPts[j][k]) ** 2;
      worst = Math.min(worst, Math.sqrt(d2) - aR[i] - bR[j]);
    }
  }
  return worst;
}

/**
 * Two lobes may be FUSED along a contiguous run from their roots (one mass, a crease
 * between them — the reference's lower body) and then part; once parted they must stay
 * clear. Overlap contiguous from the base is solid; a closed window would need a second
 * contact above a gap, which this forbids. `exempt*` samples (inside the core) are neutral.
 */
function fusedFromRoot(aPts: readonly (readonly number[])[], aR: readonly number[], bPts: readonly (readonly number[])[], bR: readonly number[], exemptA: readonly boolean[], exemptB: readonly boolean[], capA = true, capB = true, need = REQUIRED(), fuseMaxT: number = C.clearance.fuseMaxT[0]): boolean {
  const state = (pts: readonly (readonly number[])[], r: readonly number[], qs: readonly (readonly number[])[], qr: readonly number[], ex: readonly boolean[], exQ: readonly boolean[]) => pts.map((p, i) => {
    if (ex[i]) return -1; // inside the core: contact there is harmless mass — neutral
    let c = Infinity;
    for (let j = 0; j < qs.length; j++) {
      if (exQ[j]) continue; // the other lobe's mass inside the core: contact with it is harmless too
      let d2 = 0;
      for (let k = 0; k < p.length; k++) d2 += (p[k] - qs[j][k]) ** 2;
      c = Math.min(c, Math.sqrt(d2) - r[i] - qr[j]);
    }
    return c < -C.clearance.fuseDepth * (1 + SAFETY * C.clearance.safetyGain) ? 0 : c < need ? 1 : 2; // 0 fused, 1 near, 2 clear
  });
  const valid = (all: number[], cap: boolean) => {
    const st = all.filter((v) => v !== -1);
    if (st.length === 0) return true; // wholly inside the core: all of it is the mass itself
    let i = 0;
    while (i < st.length && st[i] === 0) i++;
    if (cap && i > Math.ceil(fuseMaxT * st.length)) return false; // fused only through the lower body, then parted (a bud may sit wholly in it)
    let near = 0;
    for (; i < st.length; i++) {
      if (st[i] === 2) continue;
      if (st[i] === 1 && near < Math.max(1, C.clearance.partingSamples - SAFETY) && !st.slice(0, i).includes(2)) { near++; continue; }
      return false; // touching again after parting, or a long near-miss: would close a window
    }
    return true;
  };
  return valid(state(aPts, aR, bPts, bR, exemptA, exemptB), capA) && valid(state(bPts, bR, aPts, aR, exemptB, exemptA), capB);
}

function coreAt(scale: number, massFactor: number): Core {
  return {
    center: C.core.center as Vec3,
    radii: [r6(C.core.radii[0] * massFactor * scale), r6(C.core.radii[1] * massFactor * scale), r6(C.core.radii[2] * massFactor)] as Vec3,
  };
}

/** Signed-distance estimate to the core ellipsoid (negative inside). */
function coreSdf(core: Core, p: readonly number[]): number {
  const q = [0, 1, 2].map((d) => (p[d] - core.center[d]) / core.radii[d]);
  const k0 = Math.hypot(q[0], q[1], q[2]);
  const k1 = Math.hypot(q[0] / core.radii[0], q[1] / core.radii[1], q[2] / core.radii[2]);
  return k1 === 0 ? -Math.min(...core.radii) : (k0 * (k0 - 1)) / k1;
}

interface IntraConflict { readonly part: Part; readonly against: Part }

function intraConflict(g: Group, core: Core): IntraConflict | null {
  for (const p of g.parts) if (p.role !== 'lump' && !selfClear(p)) return { part: p, against: p };
  // a lobe that has left the core must never come back to it: a tip returning to the core's
  // surface (within its blend reach) would close a handle between the lobe and the mass
  const reach = C.coreBlendK * 0.5 + C.clearance.margin;
  for (const p of g.parts) {
    if (p.role === 'lump' || p.role === 'eye') continue;
    let left = false;
    for (let i = 0; i < p.profile.length; i++) {
      const d = coreSdf(core, placePart(g.frame, p.turn, p.profile[i])) - p.radii[i];
      if (d > reach * 1.5) left = true;
      else if (left && d < reach) return { part: p, against: p };
    }
  }
  const host = g.parts[0];
  // a carved cavity cuts through the host's own body only: a branch of the same group (which leaves
  // the host) must keep clear of the cavity's lens plus a wall, or the carve would sever it into a loop
  for (const eyeP of g.parts) {
    if (!eyeP.window) continue;
    const w = eyeP.window;
    for (const p of g.parts) {
      if (p.role !== 'branch') continue; // a lump is merged along its length: carving it is carving the host
      const R = Math.max(w.halfGap, w.halfHeight); // tilt-agnostic
      const hit = p.profile.some((q, i) => Math.hypot(q[0] - w.center[0], q[1] - w.center[1]) < R + p.radii[i] + C.fusion.wall);
      if (hit) return { part: p, against: eyeP };
    }
  }
  // inside the core, any contact is fused mass (the broad core blend), never a window
  const inCoreOf = (p: Part) => (q: P2) => coreSdf(core, placePart(g.frame, p.turn, q)) < C.coreBlendK * C.clearance.coreExemptK;
  const inCore = inCoreOf(host);
  const hin = host.profile.map(inCore);
  for (const p of g.parts.slice(1)) {
    const mask = attachmentMask(p, host);
    const pin = p.profile.map(inCoreOf(p));
    if (minClearance(p.profile, p.radii, host.profile, host.radii, (i, j) => mask[i] || (pin[i] && hin[j])) < REQUIRED()) return { part: p, against: host };
  }
  // a sample inside the host's own tube is host mass: contact with it IS contact with the host
  const insideHost = (q: P2) => host.profile.some((h, j) => Math.hypot(q[0] - h[0], q[1] - h[1]) < host.radii[j]);
  for (let x = 1; x < g.parts.length; x++) for (let y = x + 1; y < g.parts.length; y++) {
    const a = g.parts[x], b = g.parts[y];
    if (a.role === 'lump' || b.role === 'lump') continue;
    const aIn = a.profile.map((q) => insideHost(q) || inCoreOf(a)(q)), bIn = b.profile.map((q) => insideHost(q) || inCoreOf(b)(q));
    if (minClearance(a.profile, a.radii, b.profile, b.radii, (i, j) => aIn[i] || bIn[j]) < REQUIRED()) return b.role === 'branch' ? { part: b, against: a } : a.role === 'branch' ? { part: a, against: b } : { part: b, against: a };
  }
  return null;
}

/**
 * Places every group around the compact core and resolves contacts, group by
 * group in priority order: a group is accepted only when its own parts clear
 * each other (shared profile plane) AND it clears every earlier group in 3D.
 * Moves, in order: bend relaxation; plane x azimuth search; then shortening,
 * thinning and opening outward. Only if nothing clears does the caller widen
 * the core, by a bounded step.
 */
function layoutGroups(hosts: readonly ExpressionElement[], expr: ExpressionState, cavityByFusion: Set<string>, core: Core, scale: number, fuseMaxT: number) {
  const slotUse = new Map<number, number>();
  // the organism's mass is shared: with more lobes each is proportionally leaner (bounded)
  const crowd = Math.max(C.clearance.minCrowdScale, Math.min(1, Math.sqrt(C.clearance.crowdReference / Math.max(1, hosts.length))));
  const groups: Group[] = [];
  const unresolved: string[] = [];
  const exempt = C.coreBlendK * C.clearance.coreExemptK;
  for (const h of hosts) {
    const k = slotUse.get(h.heading.slot) ?? 0; // coexisting generations on one neutral slot: the later one steps aside
    slotUse.set(h.heading.slot, k + 1);
    // a cavity's tunnel points where no other member stands: plane options ranked by the angular
    // distance of the tunnel axis from every other host's neutral slot (stable order on ties)
    const mine = frameFor(h.heading.slot, core, nudgeOf(h)).anchor;
    const others = hosts.filter((x) => x !== h).map((x) => { const o = frameFor(x.heading.slot, core, nudgeOf(x)).anchor; return (Math.atan2(o[1] - mine[1], o[0] - mine[0]) * 180) / Math.PI; });
    const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
    const freeness = (p: number) => Math.min(180, ...others.flatMap((az) => [angDiff(p + 90, az), angDiff(p - 90, az)]));
    const planeOptions: readonly PlaneChoice[] = windowCount(h, expr, cavityByFusion) > 0
      ? [...C.fusion.planeOptionsDeg].sort((a, b) => freeness(b) - freeness(a) || C.fusion.planeOptionsDeg.indexOf(a) - C.fusion.planeOptionsDeg.indexOf(b))
      : C.slots[h.heading.slot]?.planeDeg !== undefined ? [null, 'radial'] : [null];
    let planeTurn = planeOptions[0];
    const g: Group = {
      host: h, frame: frameFor(h.heading.slot, core, nudgeOf(h) + k * C.clearance.sharedSlotStepDeg, planeTurn), coreTop: core.center[2] + core.radii[2],
      azimuthDelta: k * C.clearance.sharedSlotStepDeg, bendScale: 1, leanDelta: (1 - crowd) * C.clearance.crowdSplayDeg, lengthScale: 0.85 + 0.15 * crowd, radiusScale: crowd, branchBendScale: 1, branchLeanDelta: 0, branchRaise: 0, branchFlip: false, branchLength: 1, parts: [],
    };
    g.parts = buildGroup(g, expr, cavityByFusion);
    const partPts = (gg: Group, p: Part) => p.profile.map((q) => placePart(gg.frame, p.turn, q));
    // between groups, a cavity's thickening and a merged lump ARE the host's mass: fold them into
    // the host lobe as a locally fuller radius, so the host is checked as the one lobe it is
    const lobesOf = (gg: Group): Part[] => {
      const host = gg.parts[0];
      const radii = host.radii.map((r, i) => {
        let best = r;
        for (const p of gg.parts) if (p.role === 'eye' || p.role === 'lump') p.profile.forEach((q, k) => {
          const d = Math.hypot(q[0] - host.profile[i][0], q[1] - host.profile[i][1]);
          if (d <= host.radii[i] * 1.2) best = Math.max(best, d + p.radii[k]); // the sphere that encloses that mass
        });
        return best;
      });
      return [{ ...host, radii }, ...gg.parts.filter((p) => p.role === 'branch')];
    };
    // a branch rooted in mass its host already SHARES with the other lobe grows out of one body:
    // it may be fused with that lobe from its root, then must part. Rooted anywhere else, it must clear.
    const rootShared = (gg: Group, br: Part, B: readonly Vec3[], bR: readonly number[], eb: readonly boolean[]) => {
      const host = lobesOf(gg)[0];
      const hj = br.attachHostIdx[0] ?? 0;
      const hp = place3(gg.frame, host.profile[hj]);
      if (coreSdf(core, hp) < exempt) return true;
      return B.some((q, k) => !eb[k] && Math.hypot(hp[0] - q[0], hp[1] - q[1], hp[2] - q[2]) - host.radii[hj] - bR[k] < -C.clearance.fuseDepth);
    };
    // a carved cavity must stay a THROUGH-passage: its tunnel, beyond the host's surface on both sides,
    // is an obstacle every other group must clear (a neighbour pressed against it would cap the exit)
    const tunnelsOf = (gg: Group): { pts: Vec3[]; r: number[] } => {
      const pts: Vec3[] = [], r: number[] = [];
      for (const p of gg.parts) if (p.window) {
        const pd = gg.frame.planeDeg + (p.turn?.deg ?? 0) + p.window.oblique;
        const n: Vec3 = [-Math.sin(rad(pd)), Math.cos(rad(pd)), 0];
        const c = placePart(gg.frame, p.turn, p.window.center);
        const rt = Math.max(p.window.halfGap, p.window.halfHeight);
        for (const side of [-1, 1]) for (let s = 0; s <= 4; s++) {
          const d = side * (p.window.depth * 0.7 + (C.fusion.tunnelExit * s) / 4);
          pts.push([c[0] + n[0] * d, c[1] + n[1] * d, c[2]]); r.push(rt);
        }
      }
      return { pts, r };
    };
    const allPts = (gg: Group) => gg.parts.flatMap((p) => partPts(gg, p));
    const allR = (gg: Group) => gg.parts.flatMap((p) => p.radii);
    const tunnelsClear = () => groups.every((o) => {
      const mine = tunnelsOf(g), theirs = tunnelsOf(o);
      return (mine.pts.length === 0 || minClearance(mine.pts, mine.r, allPts(o), allR(o), () => false) >= REQUIRED())
        && (theirs.pts.length === 0 || minClearance(theirs.pts, theirs.r, allPts(g), allR(g), () => false) >= REQUIRED());
    });
    const clearOfEarlier = () => tunnelsClear() && groups.every((o) => lobesOf(g).every((pa) => lobesOf(o).every((pb) => {
      const A = partPts(g, pa), B = partPts(o, pb);
      const ea = A.map((p) => coreSdf(core, p) < exempt), eb = B.map((p) => coreSdf(core, p) < exempt);
      // lobes that both rise from the core may fuse from the root up; anything else must clear
      const rooted = (p: Part) => p.role === 'member' || p.role === 'bud' || p.role === 'lump';
      if (rooted(pa) && rooted(pb)) return fusedFromRoot(A, pa.radii, B, pb.radii, ea, eb, pa.role !== 'bud', pb.role !== 'bud', REQUIRED(), fuseMaxT);
      if (pa.role === 'branch' && rooted(pb) && rootShared(g, pa, B, pb.radii, eb)) return fusedFromRoot(A, pa.radii, B, pb.radii, ea, eb, false, false, REQUIRED(), 1);
      if (pb.role === 'branch' && rooted(pa) && rootShared(o, pb, A, pa.radii, ea)) return fusedFromRoot(B, pb.radii, A, pa.radii, eb, ea, false, false, REQUIRED(), 1);
      return minClearance(A, pa.radii, B, pb.radii, (i, j) => ea[i] && eb[j]) >= REQUIRED();
    })));
    const baseDelta = g.azimuthDelta;
    let ok = false;
    for (let it = 0; it < C.clearance.maxIterations && !ok; it++) {
      const intra = intraConflict(g, core);
      if (intra) {
        if (intra.part.role === 'branch') {
          g.branchBendScale *= C.clearance.bendStep;
          if (intra.against.role === 'eye') { g.branchLeanDelta -= C.clearance.leanStep * 3; g.branchRaise += C.clearance.branchRaiseStep; } else g.branchLeanDelta += C.clearance.leanStep;
        } else g.bendScale *= C.clearance.bendStep;
        g.parts = buildGroup(g, expr, cavityByFusion);
        continue;
      }
      for (const plane of planeOptions) for (let s = 0; s <= C.clearance.azimuthSearchSteps && !ok; s++) {
        planeTurn = plane;
        const off = s === 0 ? 0 : (s % 2 ? 1 : -1) * Math.ceil(s / 2) * C.clearance.azimuthStepDeg;
        g.azimuthDelta = baseDelta + off;
        g.frame = frameFor(h.heading.slot, core, nudgeOf(h) + g.azimuthDelta, planeTurn);
        g.parts = buildGroup(g, expr, cavityByFusion);
        ok = clearOfEarlier();
      }
      if (ok) break;
      // nothing clears: a little shorter, a little leaner, a little more open — never a platform
      g.azimuthDelta = baseDelta;
      planeTurn = planeOptions[0];
      g.frame = frameFor(h.heading.slot, core, nudgeOf(h) + g.azimuthDelta, planeTurn);
      g.bendScale *= C.clearance.bendStep;
      g.branchLeanDelta += C.clearance.leanStep * 2; // a branch opens out and rises away from its neighbours
      g.branchRaise = Math.min(0.3, g.branchRaise + C.clearance.branchRaiseStep * 0.5);
      g.lengthScale = Math.max(C.clearance.minLengthScale * (0.85 + 0.15 * crowd), g.lengthScale * C.clearance.shortenStep);
      g.radiusScale = Math.max(C.clearance.minRadiusScale * crowd, g.radiusScale * C.clearance.thinStep);
      g.leanDelta += C.clearance.leanStep;
      g.parts = buildGroup(g, expr, cavityByFusion);
    }
    // last resort, still never a platform: the lobe settles into the mass as a rounded swelling
    for (let it = 0; !ok && it < C.clearance.settleSteps * 2; it++) {
      g.branchFlip = !g.branchFlip; // first the branch's other side, then a little shorter
      if (it % 2 === 1) { g.lengthScale *= C.clearance.settleStep; g.bendScale *= C.clearance.bendStep; g.branchLength *= C.clearance.settleStep * C.clearance.settleStep; }
      for (const plane of planeOptions) for (let s = 0; s <= C.clearance.azimuthSearchSteps && !ok; s++) {
        planeTurn = plane;
        const off = s === 0 ? 0 : (s % 2 ? 1 : -1) * Math.ceil(s / 2) * C.clearance.azimuthStepDeg;
        g.azimuthDelta = baseDelta + off;
        g.frame = frameFor(h.heading.slot, core, nudgeOf(h) + g.azimuthDelta, planeTurn);
        g.parts = buildGroup(g, expr, cavityByFusion);
        ok = !intraConflict(g, core) && clearOfEarlier();
      }
    }
    if (!ok) unresolved.push(h.id);
    groups.push(g);
  }
  return { groups, unresolved, core, scale, fuseMaxT };
}

/** Mark lanes: groups side by side in neutral lane order, as close as the 2D clearance allows above the mass. */
function packLanes(groups: readonly Group[], core: Core, fuseMaxT: number): Map<Group, number> {
  const laneOrder = [...groups].sort((x, y) => x.frame.slot.lane - y.frame.slot.lane || (x.host.id < y.host.id ? -1 : 1));
  const laneX = new Map<Group, number>();
  const massBase = core.center[2] + core.radii[2] * C.mark.massFuse; // below this line, everything is the mass itself
  type LanePart = { pts: P2[]; r: number[]; rooted: boolean; bud: boolean };
  const placed: { parts: LanePart[]; xmin: number }[] = [];
  const lanePts = (g: Group, x: number) => {
    const parts: LanePart[] = g.parts.map((p) => ({ pts: p.profile.map((q) => [x + g.frame.mirror * q[0], q[1]] as P2), r: p.radii.map((v) => v * C.mark.radiusGain), rooted: p.role === 'member' || p.role === 'bud' || p.role === 'lump', bud: p.role === 'bud' }));
    return { parts, xmin: Math.min(...parts.flatMap((p) => p.pts.map((q) => q[0]))) };
  };
  for (const g of laneOrder) {
    let x = 0;
    // a group that never rises above the mass is drawn inside it, sharing the previous lane: part of
    // the mass, never a limb trailing off the sign
    const low = g.parts.every((p) => p.profile.every((q) => q[1] <= massBase + C.mark.lowLobe));
    if (placed.length && low) x = laneX.get(laneOrder[laneOrder.indexOf(g) - 1])!;
    else if (placed.length) {
      x = placed[placed.length - 1].xmin + C.mark.lanePad;
      // slide right until every sample above the mass clears every placed lane (below it, the mass fuses them)
      for (let it = 0; it < 800; it++) {
        const mine = lanePts(g, x);
        const clear = placed.every((o) => mine.parts.every((pa) => o.parts.every((pb) => {
          const ea = pa.pts.map((p) => p[1] < massBase), eb = pb.pts.map((p) => p[1] < massBase);
          return pa.rooted && pb.rooted ? fusedFromRoot(pa.pts, pa.r, pb.pts, pb.r, ea, eb, !pa.bud, !pb.bud, REQUIRED() * C.mark.laneGain, Math.max(fuseMaxT, C.clearance.markFuseMaxT)) : minClearance(pa.pts, pa.r, pb.pts, pb.r, (i, j) => ea[i] && eb[j]) >= REQUIRED() * C.mark.laneGain;
        })));
        if (clear) break;
        x += C.mark.laneStep;
      }
    }
    laneX.set(g, x);
    placed.push(lanePts(g, x));
  }
  return laneX;
}

/** The one shared projection both renderers consume. */
export function projectRenderScene(state: CanonicalMorphologyState, safety = 0): RenderScene {
  SAFETY = safety;
  try {
    return projectAt(state, safety);
  } finally {
    SAFETY = 0;
  }
}

function projectAt(state: CanonicalMorphologyState, safety: number): RenderScene {
  const expr = projectCanonicalMorphologyForExpression(state); // pillar codes structurally absent below this line
  const f = 1 + (expr.core.massShare / C.core.referenceMassShare - 1) * C.core.massShareGain;
  const openCavities = expr.cavities.filter((c) => c.open);
  const cavityByFusion = new Set(openCavities.map((c) => c.fusionId));
  const notRendered = expr.elements.filter((e) => e.assignment === 'retired').map((e) => ({ id: e.id, reason: 'retired' as const }));

  const hosts = expr.elements.filter((e) => e.kind !== 'branch' && e.assignment !== 'fused' && e.assignment !== 'retired');
  // placement priority: hosts carrying windows first (the widest groups), then the tall seed
  // member, then neutral slot order. Never by area.
  const priority = (e: ExpressionElement) => (e.heading.slot === 1 ? -1 : e.heading.slot);
  const windows = new Map(hosts.map((h) => [h.id, windowCount(h, expr, cavityByFusion)]));
  hosts.sort((x, y) => windows.get(y.id)! - windows.get(x.id)! || priority(x) - priority(y) || (x.id < y.id ? -1 : 1));
  // a crowded organism first merges more of its lower body (mass redistribution), and only then
  // widens its core by a bounded step — never into a platform. Same state -> same rung.
  let layout = layoutGroups(hosts, expr, cavityByFusion, coreAt(1, f), 1, C.clearance.fuseMaxT[0]);
  search: for (const scale of [1, ...C.clearance.footprintLadder]) {
    for (const cap of C.clearance.fuseMaxT) {
      if (layout.unresolved.length === 0) break search;
      if (scale === 1 && cap === C.clearance.fuseMaxT[0]) continue;
      layout = layoutGroups(hosts, expr, cavityByFusion, coreAt(scale, f), scale, cap);
    }
  }
  const { groups, unresolved, core } = layout;
  const laneX = packLanes(groups, core, layout.fuseMaxT);

  const byId = new Map<string, { g: Group; p: Part }>();
  for (const g of groups) for (const p of g.parts) byId.set(p.id, { g, p });
  const elements: RenderElement[] = [];
  for (const e of expr.elements) {
    const hit = byId.get(e.id);
    if (!hit) continue;
    const { g, p } = hit;
    const lx = laneX.get(g) ?? 0;
    const to2 = (q: P2): P2 => [r6(lx + g.frame.mirror * q[0]), r6(q[1])];
    elements.push({
      id: e.id, role: p.role, groupId: g.host.id, canonicalKind: e.kind, assignment: e.assignment, fusedInto: e.fusedInto,
      profile: p.profile, radii: p.radii,
      points: p.profile.map((q) => placePart(g.frame, p.turn, q)),
      points2: p.profile.map(to2),
      ...(p.window ? { window: { center: p.window.center, center2: to2(p.window.center), center3: placePart(g.frame, p.turn, p.window.center), normal3: [r6(-Math.sin(rad(g.frame.planeDeg + (p.turn?.deg ?? 0) + p.window.oblique))), r6(Math.cos(rad(g.frame.planeDeg + (p.turn?.deg ?? 0) + p.window.oblique))), 0] as Vec3, axis3: [r6(Math.cos(rad(g.frame.planeDeg + (p.turn?.deg ?? 0) + p.window.oblique))), r6(Math.sin(rad(g.frame.planeDeg + (p.turn?.deg ?? 0) + p.window.oblique))), 0] as Vec3, halfGap: p.window.halfGap, halfHeight: p.window.halfHeight, depth: p.window.depth, tilt: p.window.tilt, tilt2: -g.frame.mirror * p.window.tilt, fore: r6(Math.abs(Math.cos(rad(p.turn?.deg ?? 0)))) } } : {}),
    });
  }
  const roots2 = elements.map((e) => e.points2[0][0]);
  const core2 = { x0: r6(Math.min(...roots2)), x1: r6(Math.max(...roots2)), zc: core.center[2], halfHeight: r6(core.radii[2]) };

  // memory: one seam per VISIBLE canonical trace, placed on its host by position class
  const rendered = new Set(elements.filter((e) => e.role !== 'lump').map((e) => e.id));
  const counter = new Map<string, number>();
  // seams sharing a host are spaced evenly around it, so they run parallel and never cross
  const perHost = new Map<string, number>();
  for (const t of expr.memoryTraces) { const h = rendered.has(t.host.elementId) ? t.host.elementId : 'core'; perHost.set(h, (perHost.get(h) ?? 0) + 1); }
  const hostIndex = new Map<string, number>();
  const seams: RenderSeam[] = expr.memoryTraces.map((t) => {
    const hostId = rendered.has(t.host.elementId) ? t.host.elementId : 'core';
    const key = `${hostId}|${hostId === 'core' ? 'core' : t.host.position}`;
    const k = counter.get(key) ?? 0;
    counter.set(key, k + 1);
    const hk = hostIndex.get(hostId) ?? 0;
    hostIndex.set(hostId, hk + 1);
    const step = 360 / Math.max(1, perHost.get(hostId) ?? 1);
    const [w0, w1] = C.seam.window[t.host.position];
    const span = w1 - w0;
    const t0 = hostId === 'core' ? 0 : Math.max(0.04, Math.min(0.96 - span, w0 + Math.min(0.24, 0.07 * k)));
    return {
      traceId: t.traceId, kind: t.kind, hostId, t0: r6(t0), t1: r6(hostId === 'core' ? 0 : t0 + span),
      sideDeg: r6(hostId === 'core' ? -90 + k * 47 : -90 + hk * Math.min(C.seam.sideStepDeg, step)),
      twist: r6(C.seam.twistDeg + C.seam.twistStep * (hk % 2)), // neighbours take different diagonals, never crossing
      width: r6(Math.min(C.seam.maxWidth, 1 + (t.mergedCount - 1) * C.seam.mergedWidthGain)),
    };
  });

  return {
    rendererVersion: RENDERER_VERSION,
    canonicalStateHash: hashCanonicalMorphologyState(state),
    core, core2, elements, notRendered,
    fusions: expr.fusions.filter((j) => j.active).map((j) => ({ fusionId: j.fusionId, memberIds: j.memberIds, hostId: j.resultMemberId, kind: j.kind, cavityOpen: cavityByFusion.has(j.fusionId) })),
    openCavityIds: openCavities.map((c) => c.cavityId),
    seams,
    footprintScale: layout.scale,
    fusedDepth: layout.fuseMaxT,
    verificationRung: safety,
    unresolvedContacts: unresolved,
  };
}
