// lib/living-koral-render/sdf.ts
// KORA-WP-146 — signed distance primitives shared by the 3D sculpture and the
// 2D Mark, so both silhouettes come from the same body definition.

import type { RenderScene, Vec3 } from './projection';
import { getRendererConfig } from './config-v2';

const C = getRendererConfig();

export interface Cone {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly ra: number;
  readonly rb: number;
}

/** Every body primitive of a scene: round cones along each skeleton + the fused core ellipsoid. */
export function sceneCones(scene: RenderScene): Cone[] {
  const cones: Cone[] = [];
  for (const e of scene.elements) {
    for (let i = 0; i + 1 < e.points.length; i++) {
      cones.push({ a: e.points[i], b: e.points[i + 1], ra: e.radii[i], rb: e.radii[i + 1] });
    }
  }
  return cones;
}

/** Exact round-cone SDF (Inigo Quilez). */
export function roundCone(px: number, py: number, pz: number, c: Cone): number {
  const bax = c.b[0] - c.a[0], bay = c.b[1] - c.a[1], baz = c.b[2] - c.a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  if (l2 < 1e-14) return Math.hypot(px - c.a[0], py - c.a[1], pz - c.a[2]) - Math.max(c.ra, c.rb);
  const rr = c.ra - c.rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = px - c.a[0], pay = py - c.a[1], paz = pz - c.a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - c.rb;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - c.ra;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - c.ra;
}

/** Ellipsoid SDF approximation (bounded, smooth, deterministic). */
export function ellipsoid(px: number, py: number, pz: number, center: Vec3, r: Vec3): number {
  const x = (px - center[0]) / r[0], y = (py - center[1]) / r[1], z = (pz - center[2]) / r[2];
  const k0 = Math.hypot(x, y, z);
  const k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  return k1 < 1e-12 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

export function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export const BLEND_K = C.blendK;
/** Broad blend between the lobes and the core: transitions read as one mass, never as necks. */
export const CORE_BLEND_K = C.coreBlendK;

/** Axis-aligned bounds of the whole body (cones + core), padded. */
export function sceneBounds(scene: RenderScene, cones: readonly Cone[], pad: number): { lo: Vec3; hi: Vec3 } {
  const lo = [scene.core.center[0] - scene.core.radii[0], scene.core.center[1] - scene.core.radii[1], scene.core.center[2] - scene.core.radii[2]];
  const hi = [scene.core.center[0] + scene.core.radii[0], scene.core.center[1] + scene.core.radii[1], scene.core.center[2] + scene.core.radii[2]];
  for (const c of cones) {
    const r = Math.max(c.ra, c.rb);
    for (let d = 0; d < 3; d++) {
      lo[d] = Math.min(lo[d], c.a[d] - r, c.b[d] - r);
      hi[d] = Math.max(hi[d], c.a[d] + r, c.b[d] + r);
    }
  }
  return { lo: [lo[0] - pad, lo[1] - pad, lo[2] - pad], hi: [hi[0] + pad, hi[1] + pad, hi[2] + pad] };
}
