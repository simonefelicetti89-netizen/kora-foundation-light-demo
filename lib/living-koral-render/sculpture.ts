// lib/living-koral-render/sculpture.ts
// KORA-WP-146 — 3D sculpture renderer: RenderScene -> watertight body mesh
// (surface nets over the fused signed-distance union), bronze memory seams,
// mineral base -> deterministic GLB (glTF 2.0 binary).
//
// One continuous fused body: every skeleton and the core are blended into a
// single field and meshed together, so a fusion reads as one material union,
// never as overlapping objects. The body is cut flat at z = 0 to rest on the
// base. No randomness; identical scene + parameters -> identical bytes.

import { createHash } from 'node:crypto';
import type { RenderScene, Vec3 } from './projection';
import { pointAt } from './projection';
import { BLEND_K, CORE_BLEND_K, ellipsoid, roundCone, sceneBounds, sceneCones, smin, type Cone } from './sdf';

const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);
import { getRendererConfig, RENDERER_VERSION } from './config-v2';

const C = getRendererConfig();

export interface SculptureParams {
  /** Grid spacing in metres. Part of the output identity. */
  readonly voxel: number;
}

export const DEFAULT_SCULPTURE_PARAMS: SculptureParams = { voxel: 0.0016 };

interface Mesh {
  positions: number[];
  normals: number[];
  indices: number[];
}

export interface SculptureTopology {
  readonly bodyVertices: number;
  readonly bodyTriangles: number;
  readonly bodyComponents: number;
  readonly bodyEulerCharacteristic: number;
  /** genus = (2·components − χ) / 2 — each fusion-enclosed cavity is one through-handle of the body. */
  readonly bodyGenus: number;
  readonly memorySeams: number;
  /** Seams whose groove was cut; a groove that would change topology is not cut (the bronze inlay remains). */
  readonly groovesCut: number;
}

export interface SculptureOutput {
  readonly glb: Uint8Array;
  readonly sha256: string;
  readonly topology: SculptureTopology;
  readonly params: SculptureParams;
}

// ── field ───────────────────────────────────────────────────────────────────
function buildField(scene: RenderScene, cones: readonly Cone[], voxel: number) {
  const { lo, hi } = sceneBounds(scene, cones, 3 * voxel + CORE_BLEND_K);
  const lo2: Vec3 = [lo[0], lo[1], Math.max(lo[2], -2 * voxel)];
  const nx = Math.ceil((hi[0] - lo2[0]) / voxel) + 1;
  const ny = Math.ceil((hi[1] - lo2[1]) / voxel) + 1;
  const nz = Math.ceil((hi[2] - lo2[2]) / voxel) + 1;
  const BIG = 1;
  const f = new Float64Array(nx * ny * nz).fill(BIG);
  const idx = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  const window = (minV: Vec3, maxV: Vec3) => [
    Math.max(0, Math.floor((minV[0] - lo2[0]) / voxel)), Math.min(nx - 1, Math.ceil((maxV[0] - lo2[0]) / voxel)),
    Math.max(0, Math.floor((minV[1] - lo2[1]) / voxel)), Math.min(ny - 1, Math.ceil((maxV[1] - lo2[1]) / voxel)),
    Math.max(0, Math.floor((minV[2] - lo2[2]) / voxel)), Math.min(nz - 1, Math.ceil((maxV[2] - lo2[2]) / voxel)),
  ];
  // lobes first (tight blend: notches between lobes stay readable), then the core fused in
  // with the broad blend (one mass: no necks, no stalks). Fixed order -> deterministic bytes.
  const pad = BLEND_K + 2 * voxel;
  for (const cone of cones) {
    const r = Math.max(cone.ra, cone.rb) + pad;
    const [i0, i1, j0, j1, k0, k1] = window(
      [Math.min(cone.a[0], cone.b[0]) - r, Math.min(cone.a[1], cone.b[1]) - r, Math.min(cone.a[2], cone.b[2]) - r],
      [Math.max(cone.a[0], cone.b[0]) + r, Math.max(cone.a[1], cone.b[1]) + r, Math.max(cone.a[2], cone.b[2]) + r],
    );
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = roundCone(lo2[0] + i * voxel, lo2[1] + j * voxel, lo2[2] + k * voxel, cone);
      const n = idx(i, j, k);
      f[n] = smin(f[n], d, BLEND_K);
    }
  }
  {
    const c = scene.core;
    const cp = CORE_BLEND_K + 2 * voxel;
    const [i0, i1, j0, j1, k0, k1] = window(
      [c.center[0] - c.radii[0] - cp, c.center[1] - c.radii[1] - cp, c.center[2] - c.radii[2] - cp],
      [c.center[0] + c.radii[0] + cp, c.center[1] + c.radii[1] + cp, c.center[2] + c.radii[2] + cp],
    );
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = ellipsoid(lo2[0] + i * voxel, lo2[1] + j * voxel, lo2[2] + k * voxel, c.center, c.radii);
      const n = idx(i, j, k);
      f[n] = smin(f[n], d, CORE_BLEND_K);
    }
  }
  // each fusion-enclosed cavity: a lens tunnel carved through the thickened fused body along the
  // group plane's normal (half-length = its depth, which always exceeds the body there)
  for (const e of scene.elements) {
    const w = e.window;
    if (!w) continue;
    const reach = w.depth + 2 * voxel + C.fusion.rimSoftness;
    const ext = Math.max(w.halfGap, w.halfHeight) + 3 * voxel + C.fusion.rimSoftness;
    const lo3: Vec3 = [w.center3[0] - Math.abs(w.normal3[0]) * reach - Math.abs(w.axis3[0]) * ext, w.center3[1] - Math.abs(w.normal3[1]) * reach - Math.abs(w.axis3[1]) * ext, w.center3[2] - ext];
    const hi3: Vec3 = [w.center3[0] + Math.abs(w.normal3[0]) * reach + Math.abs(w.axis3[0]) * ext, w.center3[1] + Math.abs(w.normal3[1]) * reach + Math.abs(w.axis3[1]) * ext, w.center3[2] + ext];
    const [i0, i1, j0, j1, k0, k1] = window(lo3, hi3);
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = lo2[0] + i * voxel - w.center3[0], py = lo2[1] + j * voxel - w.center3[1], pz = lo2[2] + k * voxel - w.center3[2];
      const u0 = px * w.axis3[0] + py * w.axis3[1], depthW = px * w.normal3[0] + py * w.normal3[1];
      const ct = Math.cos((w.tilt * Math.PI) / 180), st = Math.sin((w.tilt * Math.PI) / 180);
      const u = u0 * ct + pz * st, v = -u0 * st + pz * ct; // the lens, tilted in its plane
      const q = Math.hypot(u / w.halfGap, v / w.halfHeight);
      const dLens = (q - 1) * Math.min(w.halfGap, w.halfHeight);
      const dCut = Math.max(dLens, Math.abs(depthW) - w.depth);
      const n = idx(i, j, k);
      f[n] = smax(f[n], -dCut, C.fusion.rimSoftness); // a softly rounded rim: worn by the fusion, never drilled
    }
  }
  // flat contact with the base: intersect with z >= 0
  for (let k = 0; k < nz; k++) {
    const z = lo2[2] + k * voxel;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const n = idx(i, j, k);
      f[n] = Math.max(f[n], -z);
    }
  }
  // grid boundary is always outside -> closed surface
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) f[idx(i, j, k)] = Math.max(f[idx(i, j, k)], voxel);
  }
  return { f, nx, ny, nz, lo: lo2, idx };
}

// ── surface nets ────────────────────────────────────────────────────────────
function surfaceNets(field: ReturnType<typeof buildField>, voxel: number): Mesh {
  const { f, nx, ny, nz, lo, idx } = field;
  const cellVertex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (i: number, j: number, k: number) => (k * (ny - 1) + j) * (nx - 1) + i;
  const positions: number[] = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      v[c] = f[idx(i + corners[c][0], j + corners[c][1], k + corners[c][2])];
      if (v[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
      sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
      sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
      n++;
    }
    cellVertex[cidx(i, j, k)] = positions.length / 3;
    positions.push(lo[0] + (i + sx / n) * voxel, lo[1] + (j + sy / n) * voxel, lo[2] + (k + sz / n) * voxel);
  }
  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, d, c, a, c, b); else indices.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const inside = f[idx(i, j, k)] < 0;
    if (i < nx - 1 && inside !== (f[idx(i + 1, j, k)] < 0)) {
      quad(cellVertex[cidx(i, j - 1, k - 1)], cellVertex[cidx(i, j, k - 1)], cellVertex[cidx(i, j, k)], cellVertex[cidx(i, j - 1, k)], !inside);
    }
    if (j < ny - 1 && inside !== (f[idx(i, j + 1, k)] < 0)) {
      quad(cellVertex[cidx(i - 1, j, k - 1)], cellVertex[cidx(i - 1, j, k)], cellVertex[cidx(i, j, k)], cellVertex[cidx(i, j, k - 1)], !inside);
    }
    if (k < nz - 1 && inside !== (f[idx(i, j, k + 1)] < 0)) {
      quad(cellVertex[cidx(i - 1, j - 1, k)], cellVertex[cidx(i, j - 1, k)], cellVertex[cidx(i, j, k)], cellVertex[cidx(i - 1, j, k)], !inside);
    }
  }
  // normals: field gradient (central differences on the grid, trilinear lookup)
  // (winding is made consistent with these normals below)
  const sample = (x: number, y: number, z: number) => {
    const gx = Math.max(0, Math.min(nx - 1.0001, (x - lo[0]) / voxel));
    const gy = Math.max(0, Math.min(ny - 1.0001, (y - lo[1]) / voxel));
    const gz = Math.max(0, Math.min(nz - 1.0001, (z - lo[2]) / voxel));
    const i = Math.floor(gx), j = Math.floor(gy), k = Math.floor(gz);
    const u = gx - i, w = gy - j, s = gz - k;
    const at = (a: number, b: number, c: number) => f[idx(i + a, j + b, k + c)];
    const x00 = at(0, 0, 0) * (1 - u) + at(1, 0, 0) * u, x10 = at(0, 1, 0) * (1 - u) + at(1, 1, 0) * u;
    const x01 = at(0, 0, 1) * (1 - u) + at(1, 0, 1) * u, x11 = at(0, 1, 1) * (1 - u) + at(1, 1, 1) * u;
    return (x00 * (1 - w) + x10 * w) * (1 - s) + (x01 * (1 - w) + x11 * w) * s;
  };
  const normals: number[] = [];
  for (let p = 0; p < positions.length; p += 3) {
    const [x, y, z] = [positions[p], positions[p + 1], positions[p + 2]];
    const h = voxel;
    let gx = sample(x + h, y, z) - sample(x - h, y, z);
    let gy = sample(x, y + h, z) - sample(x, y - h, z);
    let gz = sample(x, y, z + h) - sample(x, y, z - h);
    const l = Math.hypot(gx, gy, gz) || 1;
    gx /= l; gy /= l; gz /= l;
    normals.push(gx, gy, gz);
  }
  // consistent outward winding: a triangle whose face normal opposes the field gradient is flipped
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    const ux = positions[3 * b] - positions[3 * a], uy = positions[3 * b + 1] - positions[3 * a + 1], uz = positions[3 * b + 2] - positions[3 * a + 2];
    const vx = positions[3 * c] - positions[3 * a], vy = positions[3 * c + 1] - positions[3 * a + 1], vz = positions[3 * c + 2] - positions[3 * a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const gx = normals[3 * a] + normals[3 * b] + normals[3 * c];
    const gy = normals[3 * a + 1] + normals[3 * b + 1] + normals[3 * c + 1];
    const gz = normals[3 * a + 2] + normals[3 * b + 2] + normals[3 * c + 2];
    if (fx * gx + fy * gy + fz * gz < 0) { indices[t + 1] = c; indices[t + 2] = b; }
  }
  return { positions, normals, indices };
}

function topologyOf(mesh: Mesh): { components: number; euler: number } {
  const vCount = mesh.positions.length / 3;
  const parent = new Int32Array(vCount).map((_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const edges = new Set<string>();
  const used = new Uint8Array(vCount);
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const tri = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
    for (let e = 0; e < 3; e++) {
      const a = tri[e], b = tri[(e + 1) % 3];
      used[a] = 1; used[b] = 1;
      edges.add(a < b ? `${a}_${b}` : `${b}_${a}`);
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
    }
  }
  let usedCount = 0;
  const roots = new Set<number>();
  for (let i = 0; i < vCount; i++) if (used[i]) { usedCount++; roots.add(find(i)); }
  return { components: roots.size, euler: usedCount - edges.size + mesh.indices.length / 3 };
}

// ── memory seams (bronze) ───────────────────────────────────────────────────
function frame(tangent: Vec3, sideDeg: number): Vec3 {
  // perpendicular to the tangent, starting from the viewer direction (-y), rotated by sideDeg + 90
  const [tx, ty, tz] = tangent;
  let ux = 0, uy = -1, uz = 0;
  const d = ux * tx + uy * ty + uz * tz;
  ux -= d * tx; uy -= d * ty; uz -= d * tz;
  let l = Math.hypot(ux, uy, uz);
  if (l < 1e-6) { ux = 1; uy = 0; uz = 0; l = 1; }
  ux /= l; uy /= l; uz /= l;
  const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
  const a = ((sideDeg + 90) * Math.PI) / 180;
  return [ux * Math.cos(a) + vx * Math.sin(a), uy * Math.cos(a) + vy * Math.sin(a), uz * Math.cos(a) + vz * Math.sin(a)];
}

type Sampler = (x: number, y: number, z: number) => number;

function samplerOf(field: ReturnType<typeof buildField>, voxel: number): Sampler {
  const { f, nx, ny, nz, lo, idx } = field;
  return (x, y, z) => {
    const gx = Math.max(0, Math.min(nx - 1.0001, (x - lo[0]) / voxel));
    const gy = Math.max(0, Math.min(ny - 1.0001, (y - lo[1]) / voxel));
    const gz = Math.max(0, Math.min(nz - 1.0001, (z - lo[2]) / voxel));
    const i = Math.floor(gx), j = Math.floor(gy), k = Math.floor(gz);
    const u = gx - i, w = gy - j, s = gz - k;
    const at = (a: number, b: number, c: number) => f[idx(i + a, j + b, k + c)];
    const x00 = at(0, 0, 0) * (1 - u) + at(1, 0, 0) * u, x10 = at(0, 1, 0) * (1 - u) + at(1, 1, 0) * u;
    const x01 = at(0, 0, 1) * (1 - u) + at(1, 0, 1) * u, x11 = at(0, 1, 1) * (1 - u) + at(1, 1, 1) * u;
    return (x00 * (1 - w) + x10 * w) * (1 - s) + (x01 * (1 - w) + x11 * w) * s;
  };
}

/** The real fused surface between an inside point and an outside point (bisection on the field). */
function surfaceBetween(sample: Sampler, inside: Vec3, outside: Vec3): Vec3 | null {
  if (sample(...inside) >= 0 || sample(...outside) <= 0) return null;
  let a = inside, b = outside;
  for (let it = 0; it < 30; it++) {
    const m: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    if (sample(...m) < 0) a = m; else b = m;
  }
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

/**
 * A memory seam ON the real fused surface: it follows its host with a gentle
 * twist (a long S-line, never a straight stripe); an attachment seam continues
 * down over the core to the base. Same placement rules as the Mark.
 */
function seamPath(scene: RenderScene, seam: RenderScene['seams'][number], sample: Sampler): Vec3[] {
  const n = C.seam.samples;
  const path: Vec3[] = [];
  const { center, radii } = scene.core;
  if (seam.hostId === 'core') {
    const az = (seam.sideDeg * Math.PI) / 180;
    for (let s = 0; s < n; s++) {
      const el = (0.62 - 0.6 * (s / (n - 1))) * (Math.PI / 2);
      const dir: Vec3 = [Math.cos(el) * Math.cos(az + 0.25 * Math.sin(Math.PI * (s / (n - 1)))), Math.cos(el) * Math.sin(az + 0.25 * Math.sin(Math.PI * (s / (n - 1)))), Math.sin(el)];
      const inside: Vec3 = [center[0], center[1], Math.max(center[2] * 0.5, 0.002)];
      const far: Vec3 = [center[0] + dir[0] * radii[0] * 2.5, center[1] + dir[1] * radii[1] * 2.5, Math.max(0.002, center[2] + dir[2] * radii[2] * 2.5)];
      const p = surfaceBetween(sample, inside, far);
      if (p) path.push(p);
    }
    return path;
  }
  const host = scene.elements.find((e) => e.id === seam.hostId);
  if (!host) return path;
  for (let s = 0; s < n; s++) {
    const u = s / (n - 1);
    const t = seam.t0 + (seam.t1 - seam.t0) * u;
    const c = pointAt(host.points, t) as unknown as Vec3;
    const c2 = pointAt(host.points, Math.min(1, t + 0.01)) as unknown as Vec3;
    const c1 = pointAt(host.points, Math.max(0, t - 0.01)) as unknown as Vec3;
    const tl = Math.hypot(c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]) || 1;
    const tan: Vec3 = [(c2[0] - c1[0]) / tl, (c2[1] - c1[1]) / tl, (c2[2] - c1[2]) / tl];
    // twist phased by position along the host (not along the seam): seams on one host stay parallel
    const side = frame(tan, seam.sideDeg + seam.twist * Math.sin(Math.PI * t));
    const fi = t * (host.radii.length - 1);
    const ri = Math.min(Math.floor(fi), host.radii.length - 2);
    const r = host.radii[ri] + (host.radii[ri + 1] - host.radii[ri]) * (fi - ri);
    // the host's OWN local surface only: never project across a window onto another member
    const reach = r * C.seam.surfaceReach;
    const far: Vec3 = [c[0] + side[0] * reach, c[1] + side[1] * reach, c[2] + side[2] * reach];
    const p = surfaceBetween(sample, c, far);
    if (p) path.push(p); else if (path.length) break;
  }
  if (seam.t0 === 0 && path.length) {
    // attachment memory runs on down over the core to the base
    const root = path[0];
    const hx = root[0] - center[0], hy = root[1] - center[1];
    const hl = Math.hypot(hx, hy) || 1;
    const run: Vec3[] = [];
    const m = Math.max(3, Math.round(n * C.seam.groundRun));
    for (let k = 1; k <= m; k++) {
      const z = root[2] + (0.0025 - root[2]) * (k / m);
      const inside: Vec3 = [center[0] + (hx / hl) * 0.004, center[1] + (hy / hl) * 0.004, z];
      const far: Vec3 = [center[0] + (hx / hl) * 0.25, center[1] + (hy / hl) * 0.25, z];
      const p = surfaceBetween(sample, inside, far);
      if (p) run.push(p);
    }
    return [...run.reverse(), ...path];
  }
  return path;
}

/** Memory flows around a cavity, never through it: a path is cut where it would cross a tunnel. */
function outsideCavities(scene: RenderScene, path: Vec3[]): Vec3[][] {
  const tunnels = scene.elements.flatMap((e) => (e.window ? [e.window] : []));
  if (!tunnels.length) return [path];
  const inside = (p: Vec3) => tunnels.some((w) => {
    const px = p[0] - w.center3[0], py = p[1] - w.center3[1], pz = p[2] - w.center3[2];
    const u0 = px * w.axis3[0] + py * w.axis3[1];
    const ct = Math.cos((w.tilt * Math.PI) / 180), st = Math.sin((w.tilt * Math.PI) / 180);
    return Math.hypot((u0 * ct + pz * st) / (w.halfGap + C.fusion.seamClear), (-u0 * st + pz * ct) / (w.halfHeight + C.fusion.seamClear)) < 1;
  });
  const runs: Vec3[][] = [[]];
  for (const p of path) { if (inside(p)) { if (runs[runs.length - 1].length) runs.push([]); } else runs[runs.length - 1].push(p); }
  return runs.filter((r) => r.length >= 2);
}

/** Splits a path wherever it would come within `C.seam.crossClear` of an already placed seam (memory never crosses memory). */
function clearOf(placed: readonly Vec3[][], path: Vec3[]): Vec3[][] {
  if (!placed.length) return [path];
  const segD = (p: Vec3, a: Vec3, b: Vec3) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    const t = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / l2));
    return Math.hypot(p[0] - a[0] - d[0] * t, p[1] - a[1] - d[1] * t, p[2] - a[2] - d[2] * t);
  };
  const near = (p: Vec3) => placed.some((q) => q.some((r, i) => i > 0 && segD(p, q[i - 1], r) < C.seam.crossClear));
  const runs: Vec3[][] = [[]];
  for (const p of path) { if (near(p)) { if (runs[runs.length - 1].length) runs.push([]); } else runs[runs.length - 1].push(p); }
  return runs.filter((r) => r.length >= 2);
}

/** Splits a path wherever consecutive points jump (the line would chord through air). */
function continuousRuns(path: Vec3[]): Vec3[][] {
  if (path.length < 2) return [];
  const steps = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2]));
  const typical = [...steps].sort((a, b) => a - b)[Math.floor(steps.length / 2)];
  const runs: Vec3[][] = [[path[0]]];
  steps.forEach((d, i) => { if (d > typical * C.seam.jumpFactor) runs.push([]); runs[runs.length - 1].push(path[i + 1]); });
  return runs.filter((r) => r.length >= 2);
}

/** Unprojected seam placement: on the host's tube at its own radius (or on the core ellipsoid). */
function offsetSeamPath(scene: RenderScene, seam: RenderScene['seams'][number]): Vec3[] {
  const n = C.seam.samples;
  const path: Vec3[] = [];
  const { center, radii } = scene.core;
  const host = scene.elements.find((e) => e.id === seam.hostId);
  if (!host) {
    const az = (seam.sideDeg * Math.PI) / 180;
    for (let s = 0; s < n; s++) {
      const el = (0.62 - 0.6 * (s / (n - 1))) * (Math.PI / 2);
      path.push([center[0] + radii[0] * Math.cos(el) * Math.cos(az), center[1] + radii[1] * Math.cos(el) * Math.sin(az), Math.max(0.002, center[2] + radii[2] * Math.sin(el))]);
    }
    return path;
  }
  for (let s = 0; s < n; s++) {
    const t = seam.t0 + (seam.t1 - seam.t0) * (s / (n - 1));
    const c = pointAt(host.points, t) as unknown as Vec3;
    const c2 = pointAt(host.points, Math.min(1, t + 0.01)) as unknown as Vec3;
    const c1 = pointAt(host.points, Math.max(0, t - 0.01)) as unknown as Vec3;
    const tl = Math.hypot(c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]) || 1;
    const side = frame([(c2[0] - c1[0]) / tl, (c2[1] - c1[1]) / tl, (c2[2] - c1[2]) / tl], seam.sideDeg + seam.twist * Math.sin(Math.PI * t));
    const fi = t * (host.radii.length - 1);
    const ri = Math.min(Math.floor(fi), host.radii.length - 2);
    const r = host.radii[ri] + (host.radii[ri + 1] - host.radii[ri]) * (fi - ri);
    path.push([c[0] + side[0] * r * 0.985, c[1] + side[1] * r * 0.985, c[2] + side[2] * r * 0.985]);
  }
  return path;
}

const ease = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
// a fine line of constant width, tapering only at its two ends (never a swelling gash)
const seamHalfWidth = (width: number, u: number) => C.seam.tubeRadius * width * (0.25 + 0.75 * ease(u / C.seam.endTaper) * ease((1 - u) / C.seam.endTaper));

/** Carves each seam's groove into the body field (a dent of ~one half-width; never through the body). */
function carveGrooves(field: ReturnType<typeof buildField>, voxel: number, paths: { path: Vec3[]; width: number }[]): void {
  const { f, nx, ny, nz, lo, idx } = field;
  for (const { path, width } of paths) {
    for (let s = 0; s + 1 < path.length; s++) {
      const a = path[s], b = path[s + 1];
      const ha = seamHalfWidth(width, s / (path.length - 1)) + C.seam.groovePad, hb = seamHalfWidth(width, (s + 1) / (path.length - 1)) + C.seam.groovePad;
      const r = Math.max(ha, hb) + 2 * voxel;
      const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r - lo[0]) / voxel)), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + r - lo[0]) / voxel));
      const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r - lo[1]) / voxel)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + r - lo[1]) / voxel));
      const k0 = Math.max(0, Math.floor((Math.min(a[2], b[2]) - r - lo[2]) / voxel)), k1 = Math.min(nz - 1, Math.ceil((Math.max(a[2], b[2]) + r - lo[2]) / voxel));
      const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const l2 = Math.max(ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2, 1e-12);
      for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = lo[0] + i * voxel, y = lo[1] + j * voxel, z = lo[2] + k * voxel;
        const h = Math.max(0, Math.min(1, ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / l2));
        const d = Math.hypot(x - a[0] - h * ab[0], y - a[1] - h * ab[1], z - a[2] - h * ab[2]) - (ha + (hb - ha) * h);
        const n = idx(i, j, k);
        if (-d > f[n]) f[n] = -d;
      }
    }
  }
}

function tubeMesh(paths: { path: Vec3[]; width: number }[], into: Mesh, sample: Sampler): void {
  const g = 0.0004;
  for (const { path, width } of paths) {
    if (path.length < 2) continue;
    const base = into.positions.length / 3;
    const ring = C.seam.ring;
    for (let s = 0; s < path.length; s++) {
      const a = path[Math.max(0, s - 1)], b = path[Math.min(path.length - 1, s + 1)];
      const tl = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
      const tan: Vec3 = [(b[0] - a[0]) / tl, (b[1] - a[1]) / tl, (b[2] - a[2]) / tl];
      const p = path[s];
      let nx = sample(p[0] + g, p[1], p[2]) - sample(p[0] - g, p[1], p[2]);
      let ny = sample(p[0], p[1] + g, p[2]) - sample(p[0], p[1] - g, p[2]);
      let nz = sample(p[0], p[1], p[2] + g) - sample(p[0], p[1], p[2] - g);
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      const R = seamHalfWidth(width, s / (path.length - 1));
      const c: Vec3 = [p[0] - nx * R * C.seam.inlayRecess, p[1] - ny * R * C.seam.inlayRecess, p[2] - nz * R * C.seam.inlayRecess]; // inlaid, a hair below the rim
      for (let q = 0; q < ring; q++) {
        const d = frame(tan, (360 * q) / ring);
        into.positions.push(c[0] + d[0] * R, c[1] + d[1] * R, c[2] + d[2] * R);
        into.normals.push(d[0], d[1], d[2]);
      }
    }
    for (let s = 0; s + 1 < path.length; s++) {
      for (let q = 0; q < ring; q++) {
        const a = base + s * ring + q, b = base + s * ring + ((q + 1) % ring);
        const c = base + (s + 1) * ring + ((q + 1) % ring), d = base + (s + 1) * ring + q;
        into.indices.push(a, b, c, a, c, d);
      }
    }
  }
}

function plinthMesh(scene: RenderScene): Mesh {
  const [sx, sy, sz] = C.plinth.size;
  const cx = scene.core.center[0], cy = scene.core.center[1];
  const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = -sz, z1 = 0;
  const faces: [Vec3, Vec3, Vec3, Vec3, Vec3][] = [
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]],
    [[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [0, 0, -1]],
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]],
    [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [0, 1, 0]],
    [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [-1, 0, 0]],
    [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]],
  ];
  const m: Mesh = { positions: [], normals: [], indices: [] };
  for (const [a, b, c, d, n] of faces) {
    const base = m.positions.length / 3;
    for (const p of [a, b, c, d]) { m.positions.push(...p); m.normals.push(...n); }
    m.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return m;
}

// ── GLB ─────────────────────────────────────────────────────────────────────
const toGltf = (x: number, y: number, z: number): [number, number, number] => [x, z, -y]; // z-up/depth-y -> glTF y-up, viewer on +z

function writeGlb(prims: { mesh: Mesh; material: 'body' | 'memory' | 'base' }[], extras: Record<string, unknown>): Uint8Array {
  const bufs: Buffer[] = [];
  let offset = 0;
  const bufferViews: Record<string, unknown>[] = [];
  const accessors: Record<string, unknown>[] = [];
  const materialNames: ('body' | 'memory' | 'base')[] = ['body', 'memory', 'base'];
  const primitives: Record<string, unknown>[] = [];
  const pushView = (b: Buffer, target: number) => {
    const pad = (4 - (b.length % 4)) % 4;
    const padded = pad ? Buffer.concat([b, Buffer.alloc(pad)]) : b;
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: b.length, target });
    bufs.push(padded);
    offset += padded.length;
    return bufferViews.length - 1;
  };
  for (const { mesh, material } of prims) {
    if (mesh.indices.length === 0) continue;
    const vCount = mesh.positions.length / 3;
    const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let v = 0; v < vCount; v++) {
      const p = toGltf(mesh.positions[3 * v], mesh.positions[3 * v + 1], mesh.positions[3 * v + 2]);
      const n = toGltf(mesh.normals[3 * v], mesh.normals[3 * v + 1], mesh.normals[3 * v + 2]);
      for (let d = 0; d < 3; d++) {
        pos[3 * v + d] = p[d];
        nor[3 * v + d] = n[d];
        min[d] = Math.min(min[d], Math.fround(p[d]));
        max[d] = Math.max(max[d], Math.fround(p[d]));
      }
    }
    const idx = new Uint32Array(mesh.indices);
    const pv = pushView(Buffer.from(pos.buffer), 34962);
    const nv = pushView(Buffer.from(nor.buffer), 34962);
    const iv = pushView(Buffer.from(idx.buffer), 34963);
    accessors.push({ bufferView: pv, componentType: 5126, count: vCount, type: 'VEC3', min, max });
    accessors.push({ bufferView: nv, componentType: 5126, count: vCount, type: 'VEC3' });
    accessors.push({ bufferView: iv, componentType: 5125, count: idx.length, type: 'SCALAR' });
    const a = accessors.length;
    primitives.push({ attributes: { POSITION: a - 3, NORMAL: a - 2 }, indices: a - 1, material: materialNames.indexOf(material), mode: 4 });
  }
  const json = {
    asset: { version: '2.0', generator: RENDERER_VERSION },
    extras,
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'living-koral' }],
    meshes: [{ name: 'living-koral', primitives }],
    materials: materialNames.map((name) => ({
      name,
      pbrMetallicRoughness: { baseColorFactor: [...C.materials[name].baseColor, 1], metallicFactor: C.materials[name].metallic, roughnessFactor: C.materials[name].roughness },
    })),
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };
  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jpad = (4 - (jsonBuf.length % 4)) % 4;
  if (jpad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jpad, 0x20)]);
  const bin = Buffer.concat(bufs);
  const header = Buffer.alloc(12);
  const total = 12 + 8 + jsonBuf.length + 8 + bin.length;
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return new Uint8Array(Buffer.concat([header, jh, jsonBuf, bh, bin]));
}

/** SHA-256 of the RenderScene without its internal canonical provenance — what the outputs are drawn from. */
export function renderSceneHash(scene: RenderScene): string {
  const geometric = Object.fromEntries(Object.entries(scene).filter(([key]) => key !== 'canonicalStateHash'));
  return createHash('sha256').update(JSON.stringify(geometric)).digest('hex');
}

export function renderSculpture(scene: RenderScene, params: SculptureParams = DEFAULT_SCULPTURE_PARAMS): SculptureOutput {
  if (!(params.voxel > 0) || params.voxel > C.maxVoxel) {
    // coarser grids cannot resolve the renderer's clearance band: topology would no longer be guaranteed
    throw new Error(`[KORA] renderSculpture rejected: voxel ${params.voxel} outside (0, ${C.maxVoxel}] m`);
  }
  const cones = sceneCones(scene);
  const field = buildField(scene, cones, params.voxel);
  const sample = samplerOf(field, params.voxel);
  // a seam that would jump keeps only its longest continuous run (one seam per trace, never two pieces)
  // a visible canonical trace ALWAYS renders: if the surface projection cannot hold a run, the
  // seam falls back to the host-offset path (same placement rule, not projected)
  // a seam crossing a cavity would leave a stub: it takes the host side with the longest clear run
  // (the same rule as the Mark); a visible trace always renders
  // ... and two seams never cross: a later seam keeps only what stays clear of the seams already placed
  const placed: Vec3[][] = [];
  const seamPaths = scene.seams.map((s) => {
    let best: Vec3[] = [];
    for (const turn of [0, 180, 90, -90]) {
      const runs = continuousRuns(seamPath(scene, { ...s, sideDeg: s.sideDeg + turn }, sample)).flatMap((r) => outsideCavities(scene, r)).flatMap((r) => clearOf(placed, r));
      const run = runs.reduce<Vec3[]>((b, r) => (r.length > b.length ? r : b), []);
      if (run.length > best.length) best = run;
      if (best.length >= C.seam.samples * 0.8) break;
    }
    const path = best.length >= 3 ? best : offsetSeamPath(scene, s);
    placed.push(path);
    return { path, width: s.width };
  });
  const memory: Mesh = { positions: [], normals: [], indices: [] };
  tubeMesh(seamPaths, memory, sample); // placed against the uncarved surface, then the groove is cut around it
  // Grooves are decoration and may NEVER change topology: the uncarved body is the reference
  // (its genus is fixed by the projection); a groove that would alter it is not cut.
  const uncarved = field.f.slice();
  const reference = topologyOf(surfaceNets(field, params.voxel));
  const same = (t: { components: number; euler: number }) => t.components === reference.components && t.euler === reference.euler;
  carveGrooves(field, params.voxel, seamPaths);
  let body = surfaceNets(field, params.voxel);
  let topo = topologyOf(body);
  const grooved = seamPaths.map(() => true);
  if (!same(topo)) {
    field.f.set(uncarved);
    seamPaths.forEach((sp, i) => {
      const before = field.f.slice();
      carveGrooves(field, params.voxel, [sp]);
      if (!same(topologyOf(surfaceNets(field, params.voxel)))) { field.f.set(before); grooved[i] = false; }
    });
    body = surfaceNets(field, params.voxel);
    topo = topologyOf(body);
  }
  const glb = writeGlb(
    [{ mesh: body, material: 'body' }, { mesh: memory, material: 'memory' }, { mesh: plinthMesh(scene), material: 'base' }],
    // P1: the public file never carries the canonical state hash (that state holds area codes and
    // its revision: a 120-way Pillar permutation search could match it). It carries the hash of
    // its own pillar-free geometric input instead.
    { rendererVersion: RENDERER_VERSION, sceneHash: renderSceneHash(scene), voxel: params.voxel },
  );
  return {
    glb,
    sha256: createHash('sha256').update(glb).digest('hex'),
    params,
    topology: {
      bodyVertices: body.positions.length / 3,
      bodyTriangles: body.indices.length / 3,
      bodyComponents: topo.components,
      bodyEulerCharacteristic: topo.euler,
      bodyGenus: (2 * topo.components - topo.euler) / 2,
      memorySeams: seamPaths.filter((p) => p.path.length >= 2).length,
      groovesCut: grooved.filter(Boolean).length,
    },
  };
}
