// lib/px-acceptance/viewport-matrix.ts
// KORA-WP-126 — the canonical viewport matrix.
//
// Registry 219's WP126 Tests field requires "a guard that the declared
// viewport matrix matches `PX_BREAKPOINTS`". The matrix is therefore DERIVED
// from KORA-WP-140's own breakpoints rather than restated beside them: a
// second hand-written copy of 1200/900/767 is exactly the duplicated-current-
// truth failure mode report 257 named as a root cause of registry drift.
//
// Every capture width here resolves to a distinct PxShellState. A run at any
// other width is not canonical acceptance evidence (see assertCanonicalViewport).

import { PX_BREAKPOINTS, resolvePxShellState, type PxShellState } from '@/lib/design/kora-design-tokens';

export interface CanonicalViewport {
  /** Stable identifier used in evidence filenames — never a free-form label. */
  readonly id: 'desktop' | 'rail' | 'mobile';
  readonly width: number;
  readonly height: number;
  /** The shell state this width must resolve to, per KORA-WP-140. */
  readonly shellState: PxShellState;
}

/**
 * Widths are chosen relative to PX_BREAKPOINTS, not independently of them:
 *   desktop — above `rail`, the full shell
 *   rail    — at `rail`, the collapsed-rail shell
 *   mobile  — at `mobile`, the phone shell
 * Heights are the capture viewport only. Page length is measured from the real
 * document (see benchmark-checks), never from these numbers.
 */
export const CANONICAL_VIEWPORTS: readonly CanonicalViewport[] = [
  { id: 'desktop', width: 1440, height: 900, shellState: 'full' },
  { id: 'rail', width: PX_BREAKPOINTS.rail, height: 900, shellState: 'rail' },
  { id: 'mobile', width: PX_BREAKPOINTS.mobile, height: 812, shellState: 'mobile' },
] as const;

export type ViewportId = CanonicalViewport['id'];

/** The desktop/mobile pair the AN.1 mobile-ratio detector is measured across. */
export const RATIO_PAIR = { desktop: 'desktop', mobile: 'mobile' } as const;

export function canonicalViewport(id: ViewportId): CanonicalViewport {
  const v = CANONICAL_VIEWPORTS.find((c) => c.id === id);
  if (!v) throw new Error(`[KORA-WP-126] "${id}" is not a canonical viewport id.`);
  return v;
}

export function isCanonicalWidth(width: number): boolean {
  return CANONICAL_VIEWPORTS.some((v) => v.width === width);
}

export interface ViewportGuardResult {
  readonly valid: boolean;
  readonly viewport: CanonicalViewport | null;
  readonly reason?: string;
}

/**
 * The viewport guard. A capture taken at a non-canonical width must never be
 * presentable as canonical acceptance evidence, so this FAILS CLOSED and names
 * the allowed widths rather than silently rounding to the nearest one.
 */
export function guardViewport(width: number, height: number): ViewportGuardResult {
  const allowed = CANONICAL_VIEWPORTS.map((v) => `${v.id}=${v.width}x${v.height}`).join(', ');
  const byWidth = CANONICAL_VIEWPORTS.find((v) => v.width === width);
  if (!byWidth) {
    return { valid: false, viewport: null, reason: `width ${width} is not canonical — allowed: ${allowed}` };
  }
  if (byWidth.height !== height) {
    return { valid: false, viewport: null, reason: `${byWidth.id} must be captured at height ${byWidth.height}, got ${height}` };
  }
  const resolved = resolvePxShellState(width);
  if (resolved !== byWidth.shellState) {
    // Drift between this matrix and KORA-WP-140's own resolver.
    return { valid: false, viewport: null, reason: `${byWidth.id} resolves to shell state "${resolved}", matrix declares "${byWidth.shellState}"` };
  }
  return { valid: true, viewport: byWidth };
}

export function assertCanonicalViewport(width: number, height: number): CanonicalViewport {
  const r = guardViewport(width, height);
  if (!r.valid || !r.viewport) {
    throw new Error(`[KORA-WP-126] non-canonical viewport rejected: ${r.reason}`);
  }
  return r.viewport;
}
