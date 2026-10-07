// lib/living-koral-render/mark.ts
// KORA-WP-146 — Living KORAL Mark: an autonomous 2D sign built from the SAME
// RenderScene the sculpture draws — an optical interpretation, never a
// projection. From the scene it reads only what the sign needs: the form's
// proportion, its two tallest groups (height, lean, fullness), its open
// cavities and its memory count. It draws a broad base with at most two
// crests, the cavities as low arches carved into the base (each one a true
// hole of the field), and memory as one restrained band of bars. Designed on
// the 20 px grid first. One monochrome path, `fill-rule="evenodd"`, no script,
// no defs, no external resource, no colour per area. Deterministic.

import { createHash } from 'node:crypto';
import type { RenderScene, P2 } from './projection';
import { getRendererConfig, RENDERER_VERSION } from './config-v2';

const C = getRendererConfig();
const M = C.mark;
const S = M.sign;

export interface MarkTopology {
  readonly exteriorLoops: number;
  /** Interior loops of the sign itself (before memory knock-outs) — each is one canonical fusion-enclosed cavity. */
  readonly holes: number;
  readonly memoryLines: number;
}

export interface MarkVariant {
  readonly svg: string;
  readonly sha256: string;
  readonly topology: MarkTopology;
}

export interface MarkOutput extends MarkVariant {
  /** The same sign drawn for ≤ `C.mark.small.maxPx` px: same outline family, same holes, no memory band. */
  readonly small: MarkVariant;
}

function segDist(px: number, py: number, a: P2, b: P2, ra: number, rb: number): number {
  const bx = b[0] - a[0], by = b[1] - a[1];
  const l2 = bx * bx + by * by;
  const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * bx + (py - a[1]) * by) / l2));
  const qx = a[0] + bx * t - px, qy = a[1] + by * t - py;
  return Math.hypot(qx, qy) - (ra + (rb - ra) * t);
}

function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Laplacian smoothing of a closed loop: removes grid raggedness without moving the form. */
function relax(loop: readonly P2[], passes: number): P2[] {
  let pts = [...loop];
  for (let k = 0; k < passes; k++) {
    pts = pts.map((p, i) => {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
      return [p[0] * 0.5 + (a[0] + b[0]) * 0.25, p[1] * 0.5 + (a[1] + b[1]) * 0.25] as P2;
    });
  }
  return pts;
}

// ── contour (marching squares -> loops -> simplify -> smooth) ───────────────
function contours(f: Float64Array, n: number): P2[][] {
  const step = M.gridStep;
  const segs: [P2, P2][] = [];
  const lerp = (x0: number, y0: number, v0: number, x1: number, y1: number, v1: number): P2 => {
    const t = Math.abs(v1 - v0) < 1e-12 ? 0.5 : v0 / (v0 - v1);
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  };
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const tl = f[j * n + i], tr = f[j * n + i + 1], br = f[(j + 1) * n + i + 1], bl = f[(j + 1) * n + i];
    const code = (tl < 0 ? 8 : 0) | (tr < 0 ? 4 : 0) | (br < 0 ? 2 : 0) | (bl < 0 ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const x0 = i * step, x1 = (i + 1) * step, y0 = j * step, y1 = (j + 1) * step;
    const T = () => lerp(x0, y0, tl, x1, y0, tr), R = () => lerp(x1, y0, tr, x1, y1, br);
    const B = () => lerp(x0, y1, bl, x1, y1, br), L = () => lerp(x0, y0, tl, x0, y1, bl);
    switch (code) {
      case 1: case 14: segs.push([L(), B()]); break;
      case 2: case 13: segs.push([B(), R()]); break;
      case 3: case 12: segs.push([L(), R()]); break;
      case 4: case 11: segs.push([T(), R()]); break;
      case 6: case 9: segs.push([T(), B()]); break;
      case 7: case 8: segs.push([L(), T()]); break;
      case 5: segs.push([L(), T()]); segs.push([B(), R()]); break;
      case 10: segs.push([T(), R()]); segs.push([L(), B()]); break;
    }
  }
  const key = (p: P2) => `${Math.round(p[0] * 1000)}:${Math.round(p[1] * 1000)}`;
  const adj = new Map<string, { p: P2; nb: string[] }>();
  for (const [a, b] of segs) {
    const ka = key(a), kb = key(b);
    if (ka === kb) continue;
    if (!adj.has(ka)) adj.set(ka, { p: a, nb: [] });
    if (!adj.has(kb)) adj.set(kb, { p: b, nb: [] });
    adj.get(ka)!.nb.push(kb);
    adj.get(kb)!.nb.push(ka);
  }
  const seen = new Set<string>();
  const ek = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const loops: P2[][] = [];
  for (const start of [...adj.keys()].sort()) {
    for (const first of [...adj.get(start)!.nb].sort()) {
      if (seen.has(ek(start, first))) continue;
      seen.add(ek(start, first));
      const loop: P2[] = [adj.get(start)!.p];
      let cur = first;
      let closed = false;
      for (let guard = 0; guard < 200000; guard++) {
        const node = adj.get(cur)!;
        loop.push(node.p);
        if (cur === start) { closed = true; break; }
        const next = [...node.nb].sort().find((x) => !seen.has(ek(cur, x)));
        if (next === undefined) break;
        seen.add(ek(cur, next));
        cur = next;
      }
      if (closed && loop.length >= 4) loops.push(loop.slice(0, -1));
    }
  }
  return loops;
}

const area = (l: readonly P2[]) => Math.abs(l.reduce((s, p, i) => { const q = l[(i + 1) % l.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);

function inside(p: P2, poly: readonly P2[]): boolean {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}

function simplify(pts: readonly P2[], eps: number): P2[] {
  if (pts.length < 8) return [...pts];
  const rdp = (a: P2[]): P2[] => {
    if (a.length < 3) return a;
    const [s, e] = [a[0], a[a.length - 1]];
    let best = -1, bi = 0;
    for (let i = 1; i < a.length - 1; i++) {
      const dx = e[0] - s[0], dy = e[1] - s[1];
      const len = Math.hypot(dx, dy) || 1;
      const d = Math.abs(dy * a[i][0] - dx * a[i][1] + e[0] * s[1] - e[1] * s[0]) / len;
      if (d > best) { best = d; bi = i; }
    }
    return best > eps ? [...rdp(a.slice(0, bi + 1)).slice(0, -1), ...rdp(a.slice(bi))] : [s, e];
  };
  const mid = Math.floor(pts.length / 2);
  const out = [...rdp([...pts.slice(0, mid + 1)]).slice(0, -1), ...rdp([...pts.slice(mid), pts[0]]).slice(0, -1)];
  return out.length >= 6 ? out : [...pts];
}

const fmt = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

function smoothPath(pts: readonly P2[]): string {
  const n = pts.length;
  const p = (i: number) => pts[((i % n) + n) % n];
  const parts = [`M${fmt(p(0)[0])} ${fmt(p(0)[1])}`];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    parts.push(`C${fmt(p1[0] + (p2[0] - p0[0]) / 6)} ${fmt(p1[1] + (p2[1] - p0[1]) / 6)} ${fmt(p2[0] - (p3[0] - p1[0]) / 6)} ${fmt(p2[1] - (p3[1] - p1[1]) / 6)} ${fmt(p2[0])} ${fmt(p2[1])}`);
  }
  return parts.join('') + 'Z';
}

/** A clean memory stroke: Catmull–Rom resampled centre line, constant width, round ends. */
function ribbon(line: readonly P2[], width: number): P2[] {
  if (line.length < 2) return [];
  const smoothLine: P2[] = [];
  const m = 6;
  for (let i = 0; i + 1 < line.length; i++) {
    const p0 = line[Math.max(0, i - 1)], p1 = line[i], p2 = line[i + 1], p3 = line[Math.min(line.length - 1, i + 2)];
    for (let s = 0; s < m; s++) {
      const t = s / m, t2 = t * t, t3 = t2 * t;
      smoothLine.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  smoothLine.push(line[line.length - 1]);
  const w = width / 2;
  const left: P2[] = [], right: P2[] = [];
  const dir = (s: number): P2 => {
    const a = smoothLine[Math.max(0, s - 1)], b = smoothLine[Math.min(smoothLine.length - 1, s + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  };
  for (let s = 0; s < smoothLine.length; s++) {
    const [dx, dy] = dir(s);
    left.push([smoothLine[s][0] - dy * w, smoothLine[s][1] + dx * w]);
    right.push([smoothLine[s][0] + dy * w, smoothLine[s][1] - dx * w]);
  }
  // round ends: a semicircle from one side, through the travel direction, to the other side
  const cap = (c: P2, d: P2, nrm: P2): P2[] => Array.from({ length: 7 }, (_, k) => {
    const a = (Math.PI * (k + 1)) / 8;
    return [c[0] + w * (Math.cos(a) * nrm[0] + Math.sin(a) * d[0]), c[1] + w * (Math.cos(a) * nrm[1] + Math.sin(a) * d[1])] as P2;
  });
  const end = smoothLine.length - 1;
  const dE = dir(end), d0 = dir(0);
  return [...left, ...cap(smoothLine[end], dE, [-dE[1], dE[0]]), ...right.reverse(), ...cap(smoothLine[0], [-d0[0], -d0[1]], [d0[1], -d0[0]])];
}

function polyPath(pts: readonly P2[]): string {
  return `M${pts.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join('L')}Z`;
}


// ── the sign: read from the scene ─────────────────────────────────────────
interface Crest { readonly root: P2; readonly axis: readonly P2[]; readonly r0: number; readonly r1: number; readonly group: string }
interface Arch { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly tilt: number; readonly inCrest: boolean }
interface Sign { readonly cx: number; readonly cy: number; readonly hw: number; readonly hh: number; readonly crests: readonly Crest[]; readonly arches: readonly Arch[]; readonly bandCrest: number }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function signOf(scene: RenderScene, archScale: number): Sign {
  const els = scene.elements;
  let x0 = Infinity, x1 = -Infinity, z1 = 0;
  for (const e of els) e.points2.forEach((p, i) => { x0 = Math.min(x0, p[0] - e.radii[i]); x1 = Math.max(x1, p[0] + e.radii[i]); z1 = Math.max(z1, p[1] + e.radii[i]); });
  const ratio = (x1 - x0) / Math.max(1e-6, z1);
  const floorY = M.viewSize - M.margin;
  const hw = clamp(S.widthGain * ratio, S.baseHalfWidth[0], S.baseHalfWidth[1]);
  const hh = S.baseHalfHeight + S.baseCavityGain * Math.min(2, scene.openCavityIds.length); // a pierced base is deeper: every arch keeps a roof
  const cx = M.viewSize / 2, cy = floorY - hh * S.baseDrop;

  // the two tallest groups become the crests (never more: 2–4 contour decisions); the rest is base mass
  const groups = [...new Set(els.map((e) => e.groupId))].map((g) => {
    const mine = els.filter((e) => e.groupId === g);
    const host = mine.find((e) => e.id === g) ?? mine[0];
    const top = Math.max(...mine.flatMap((e) => e.points2.map((p, i) => p[1] + e.radii[i])));
    const P = host.points2, n = P.length;
    // the lobe's gesture: its lean at the root and how far it turns toward the tip (radians, Mark x right)
    const ang = (a: P2, b: P2) => Math.atan2(b[0] - a[0], b[1] - a[1]);
    const lean = ang(P[0], P[Math.min(n - 1, 3)]);
    const turn = ang(P[Math.max(0, n - 4)], P[n - 1]) - lean;
    return { g, top, rootX: P[0][0], lean, turn, radius: host.radii[0] };
  });
  const byHeight = [...groups].sort((a, b) => b.top - a.top || (a.g < b.g ? -1 : 1));
  const hmax = byHeight[0].top;
  // a third group shows only as a low rounded shoulder of the base (mass distribution, never an appendage)
  const shoulder = byHeight[2] && byHeight[2].top > hmax * S.shoulderMin ? byHeight[2] : undefined;
  const tallest = byHeight.slice(0, 2).sort((a, b) => a.rootX - b.rootX || (a.g < b.g ? -1 : 1));
  const rootY = cy - hh * S.crestRoot;
  const crests: Crest[] = tallest.map((t, i) => {
    const x = tallest.length === 1 ? cx - Math.sign(t.lean || 1) * hw * S.singleOffset : cx + (i === 0 ? -1 : 1) * hw * S.pairOffset;
    const rel = t.top / hmax;
    // the shorter lobe is drawn fuller, the taller one slender: asymmetry and tension, never two equal prongs
    // ... and a denser lobe (consolidated mass) is drawn visibly fuller: mass balance, never a feature
    const r0 = clamp(S.crestRadius[1] - (S.crestRadius[1] - S.crestRadius[0]) * ((rel - S.minHeight) / (1 - S.minHeight)) * (t.radius / S.radiusRef), S.crestRadius[0], S.crestRadius[1]) * Math.pow(Math.max(1, t.radius / S.radiusRef), S.densityGain);
    const length = (rootY - S.topY) * (S.minHeight + (1 - S.minHeight) * Math.pow(rel, S.heightContrast)); // the taller lobe clearly dominates
    // only the lower lobe curls; the tallest keeps its lean but barely turns at the tip (never a neck and head)
    const turn = t.top === hmax && tallest.length > 1 ? clamp(t.turn * S.turnGain, -S.tallTurn, S.tallTurn) : t.turn * S.turnGain;
    return { root: [x, rootY], axis: gesture([x, rootY], length, t.lean * S.leanGain, turn), r0, r1: r0 * S.tipShare, group: t.g };
  });
  if (shoulder) {
    const side = shoulder.rootX < (tallest[0]?.rootX ?? 0) ? -1 : 1;
    const x = cx + side * hw * S.shoulderOffset, r0 = S.crestRadius[0];
    crests.push({ root: [x, cy], axis: gesture([x, cy], hh * S.shoulderLength, side * S.shoulderLean, 0), r0, r1: r0, group: shoulder.g });
  }
  // a clear notch between two crests: never fused into one blob
  const shift = (c: Crest, dx: number, k: number): Crest => ({ ...c, root: [c.root[0] + dx, c.root[1]], axis: c.axis.map((p) => [p[0] + dx, p[1]] as P2), r0: c.r0 * k, r1: c.r1 * k });
  for (let it = 0; it < 14 && tallest.length === 2 && notchOf(crests[0], crests[1]) < S.notch; it++) { crests[0] = shift(crests[0], -3, 0.97); crests[1] = shift(crests[1], 3, 0.97); }

  // the sign always fits its frame: a crest that would leave it is first moved inward, then scaled about its root
  const top = M.margin, left = M.margin, right = M.viewSize - M.margin;
  for (let k = 0; k < crests.length; k++) {
    let c = crests[k];
    const over = Math.max(0, ...c.axis.map((p) => p[0] + c.r0 - right)), under = Math.max(0, ...c.axis.map((p) => left - (p[0] - c.r0)));
    const dx = clamp(under - over, -S.maxShift, S.maxShift);
    if (dx) c = { ...c, root: [c.root[0] + dx, c.root[1]], axis: c.axis.map((p) => [p[0] + dx, p[1]] as P2) };
    let f = 1;
    for (const p of c.axis) {
      const r = c.r0;
      if (p[1] - r < top) f = Math.min(f, (c.root[1] - top - r) / Math.max(1e-6, c.root[1] - p[1]));
      if (p[0] - r < left) f = Math.min(f, (c.root[0] - left - r) / Math.max(1e-6, c.root[0] - p[0]));
      if (p[0] + r > right) f = Math.min(f, (right - r - c.root[0]) / Math.max(1e-6, p[0] - c.root[0]));
    }
    crests[k] = f < 1 ? { ...c, axis: c.axis.map((p) => [c.root[0] + (p[0] - c.root[0]) * f, c.root[1] + (p[1] - c.root[1]) * f] as P2) } : c;
  }

  // the cavities: large low arches carved into the base, side by side (never stacked like features),
  // each under its own group, largest first; walls all round
  const cav = els.filter((e) => e.window).sort((a, b) => b.window!.halfGap - a.window!.halfGap || (a.id < b.id ? -1 : 1));
  const crestOf = (g: string) => { const k = crests.findIndex((c) => c.group === g); return k >= 0 ? k : 0; };
  const used = new Map<number, number>();
  const arches: Arch[] = cav.map((e, i) => {
    const [w, h] = S.archSizes[Math.min(i, S.archSizes.length - 1)].map((v) => v * archScale);
    const ki = crestOf(e.groupId), k = crests[ki];
    const nth = used.get(ki) ?? 0;
    used.set(ki, nth + 1);
    if (nth === 0) {
      // the first opening of a crest: a slot low in the base under it, along its flow
      const tilt = Math.atan2(k.axis[6][0] - k.axis[0][0], k.root[1] - k.axis[6][1]) * S.lensAlong;
      return { x: k.root[0] + (cx - k.root[0]) * S.archTowardCentre, y: floorY - S.floorWall - h / 2, w, h, tilt, inCrest: false };
    }
    // a further opening of the same crest is strung along its flow, up inside the crest: never beside the
    // first (a pair of eyes), never straight above it (eye and nostril)
    // ... and off to the side the crest curls toward: a diagonal, never a vertical stack
    const t = S.secondAlong, p = axisAt(k, t), q = axisAt(k, t + 0.04);
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
    const side = Math.sign(k.axis[k.axis.length - 1][0] - k.root[0]) || 1, off = radiusAt(k, t) * S.secondSide * side;
    return { x: p[0] + (-dy / l) * off, y: p[1] + (dx / l) * off, w, h, tilt: Math.atan2(dx, -dy), inCrest: true };
  });
  // spread so that walls stay between them and around them
  arches.sort((a, b) => Number(a.inCrest) - Number(b.inCrest) || a.x - b.x);
  const nb = arches.filter((a) => !a.inCrest).length;
  for (let it = 0; it < 40; it++) {
    let moved = false;
    for (let i = 0; i + 1 < nb; i++) {
      const gap = arches[i + 1].x - arches[i].x - (arches[i].w + arches[i + 1].w) / 2;
      if (gap < S.archWall) { const d = (S.archWall - gap) / 2 + 0.5; arches[i] = { ...arches[i], x: arches[i].x - d }; arches[i + 1] = { ...arches[i + 1], x: arches[i + 1].x + d }; moved = true; }
    }
    for (let i = 0; i < nb; i++) {
      const lim = hw - arches[i].w / 2 - S.sideWall;
      const x = clamp(arches[i].x, cx - lim, cx + lim);
      if (x !== arches[i].x) { arches[i] = { ...arches[i], x }; moved = true; }
    }
    if (!moved) break;
  }

  // memory: one band, on the crest that carries most traces
  const count = crests.map(() => 0);
  for (const s of scene.seams) {
    const g = els.find((e) => e.id === s.hostId)?.groupId;
    count[g ? crestOf(g) : 0]++;
  }
  const bandCrest = count.reduce((b, v, i) => (v > count[b] ? i : b), 0);
  return { cx, cy, hw, hh, crests, arches, bandCrest };
}

/** A crest's axis: it rises from its root at `lean` (rad from vertical) and turns progressively by `turn` toward its tip. */
function gesture(root: P2, length: number, lean: number, turn: number): P2[] {
  const n = 24, pts: P2[] = [root];
  let x = root[0], y = root[1];
  for (let i = 1; i <= n; i++) {
    const u = i / n, a = clamp(lean, -S.maxLean, S.maxLean) + clamp(turn, -S.maxTurn, S.maxTurn) * u * u;
    x += Math.sin(a) * (length / n); y -= Math.cos(a) * (length / n);
    pts.push([x, y]);
  }
  return pts;
}

const axisAt = (c: Crest, t: number): P2 => {
  const f = clamp(t, 0, 1) * (c.axis.length - 1), i = Math.min(Math.floor(f), c.axis.length - 2), w = f - i;
  return [c.axis[i][0] + (c.axis[i + 1][0] - c.axis[i][0]) * w, c.axis[i][1] + (c.axis[i + 1][1] - c.axis[i][1]) * w];
};
const radiusAt = (c: Crest, t: number) => c.r0 + (c.r1 - c.r0) * t;

function notchOf(a: Crest, b: Crest): number {
  let min = Infinity;
  for (let i = 3; i <= 12; i++) for (let j = 3; j <= 12; j++) {
    const pa = axisAt(a, i / 12), pb = axisAt(b, j / 12);
    min = Math.min(min, Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) - radiusAt(a, i / 12) - radiusAt(b, j / 12));
  }
  return min;
}

function crestDist(c: Crest, x: number, y: number): number {
  let d = Infinity;
  const n = 10;
  for (let i = 0; i < n; i++) d = Math.min(d, segDist(x, y, axisAt(c, i / n), axisAt(c, (i + 1) / n), radiusAt(c, i / n), radiusAt(c, (i + 1) / n)));
  return d;
}

/** Signed distance of the sign on the Mark grid: pebble base ∪ crests (broad blend), minus the arches, flat floor. */
function signField(sign: Sign) {
  const n = Math.round(M.viewSize / M.gridStep) + 1;
  const f = new Float64Array(n * n);
  const floorY = M.viewSize - M.margin;
  const e = S.baseExponent;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * M.gridStep, y = j * M.gridStep;
    const qx = Math.abs(x - sign.cx) / sign.hw, qy = Math.abs(y - sign.cy) / sign.hh;
    const base = (Math.pow(Math.pow(qx, e) + Math.pow(qy, e), 1 / e) - 1) * Math.min(sign.hw, sign.hh);
    let crest = Infinity;
    for (const c of sign.crests) crest = smin(crest, crestDist(c, x, y), S.crestBlend);
    let d = smin(base, crest, S.baseBlend);
    for (const a of sign.arches) {
      // a carved slot along the mass flow: rounded ends, no sill, never a round eye
      const cy0 = a.y, half = Math.max(0, a.h / 2 - a.w / 2);
      const dx = Math.sin(a.tilt) * half, dy = -Math.cos(a.tilt) * half;
      d = Math.max(d, -segDist(x, y, [a.x - dx, cy0 - dy], [a.x + dx, cy0 + dy], a.w / 2, a.w / 2));
    }
    f[j * n + i] = Math.max(d, y - floorY);
  }
  return { f, n };
}

/** The memory accent: one spine of dashes along the band crest's axis — one dash per visible trace, round ends,
 *  spread over the stretch of the crest that is clear of every opening. */
function band(scene: RenderScene, sign: Sign): P2[][] {
  const c = sign.crests[sign.bandCrest];
  const N = scene.seams.length;
  if (!c || !N) return [];
  // where the crest also carries an opening, the band runs beside its axis, on the side away from it
  const carries = sign.arches.some((a) => a.inCrest);
  const side = -(Math.sign(c.axis[c.axis.length - 1][0] - c.root[0]) || 1);
  const at = (t: number): P2 => {
    const p = axisAt(c, t);
    if (!carries) return p;
    const q = axisAt(c, Math.min(1, t + 0.02)), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, o = radiusAt(c, t) * S.bandSide * side;
    return [p[0] + (-dy / l) * o, p[1] + (dx / l) * o];
  };
  const clearOf = (t: number) => {
    const p = at(t);
    return sign.arches.every((a) => {
      const half = Math.max(0, a.h / 2 - a.w / 2), ex = Math.sin(a.tilt) * half, ey = -Math.cos(a.tilt) * half;
      return segDist(p[0], p[1], [a.x - ex, a.y - ey], [a.x + ex, a.y + ey], a.w / 2, a.w / 2) > S.archClear;
    });
  };
  const free: number[] = [];
  for (let i = 0; i <= 120; i++) { const t = S.bandFrom + ((S.bandTo - S.bandFrom) * i) / 120; if (clearOf(t)) free.push(t); }
  if (!free.length) free.push(S.bandTo);
  const step = (S.bandTo - S.bandFrom) / Math.max(N, 1);
  const half = Math.min(step * S.dashShare, (free.length / 121) * (S.bandTo - S.bandFrom) / N * S.dashShare) / 2;
  return scene.seams.map((s, k) => {
    const tc = free[Math.min(free.length - 1, Math.round(((k + 0.5) / N) * (free.length - 1)))];
    const w = S.barWidth * (1 + (Math.min(2, s.width) - 1) * 0.5);
    return ribbon([at(tc - half), at(tc), at(tc + half)], w);
  }).filter((r) => r.length > 0);
}

function drawMark(scene: RenderScene, archScale: number, memory: boolean, smoothPasses: number): MarkVariant {
  const sign = signOf(scene, archScale);
  const { f, n } = signField(sign);
  const loops = contours(f, n).map((l) => ({ l, a: area(l) })).sort((x, y) => (y.a - x.a) || (x.l[0][0] - y.l[0][0]) || (x.l[0][1] - y.l[0][1]));
  const exterior = loops[0];
  const holes = exterior ? loops.slice(1).filter((x) => x.a >= M.minHoleArea && inside(x.l[0], exterior.l)) : [];
  const islands = exterior ? loops.slice(1).filter((x) => x.a >= M.minHoleArea && !inside(x.l[0], exterior.l)).length : 0;
  const lines = memory ? band(scene, sign) : [];
  const d = exterior
    ? [smoothPath(simplify(relax(exterior.l, smoothPasses), M.simplifyEpsilon)), ...holes.map((h) => smoothPath(simplify(relax(h.l, smoothPasses), M.simplifyEpsilon))), ...lines.map(polyPath)].join(' ')
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${M.viewSize} ${M.viewSize}" role="img" aria-hidden="true" data-renderer="${RENDERER_VERSION}"><path fill="${M.ink}" fill-rule="evenodd" d="${d}"/></svg>`;
  return {
    svg,
    sha256: createHash('sha256').update(svg).digest('hex'),
    topology: { exteriorLoops: exterior ? 1 + islands : 0, holes: holes.length, memoryLines: lines.length },
  };
}

/**
 * The Living KORAL Mark and its small-size rendering. The arches are drawn at full size where the
 * sign allows, and narrowed step by step only if needed: the first scale whose holes equal the open
 * canonical cavities (one outline) is used — an optical choice never adds or loses a hole.
 */
export function renderMark(scene: RenderScene): MarkOutput {
  const want = scene.openCavityIds.length;
  let scale = S.archScales[S.archScales.length - 1];
  for (const k of S.archScales) {
    const v = drawMark(scene, k, false, M.smoothPasses);
    if (v.topology.holes === want && v.topology.exteriorLoops === 1) { scale = k; break; }
  }
  const master = drawMark(scene, scale, true, M.smoothPasses);
  // at ≤ 24 px the openings are drawn larger (readable at 20 px) wherever the count still holds
  let small = drawMark(scene, scale, false, M.small.smoothPasses);
  for (const g of S.smallOpenGain) {
    const v = drawMark(scene, scale * g, false, M.small.smoothPasses);
    if (v.topology.holes === master.topology.holes && v.topology.exteriorLoops === 1) { small = v; break; }
  }
  return { ...master, small };
}
