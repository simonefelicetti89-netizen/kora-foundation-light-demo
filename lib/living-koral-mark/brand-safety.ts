// lib/living-koral-mark/brand-safety.ts
// KORA-WP-117 — Renderer-neutral Brand Safety Envelope.
//
// Extracted out of visual-grammar.ts (report 191, WP-117 substrate
// stabilization, 2026-09-19) — this half of the original Layer 4 file is
// KEPT as canonical substrate: every check here operates purely on
// BoundedKoralGeometry (Layer 3) facts, no coordinates, no SVG, no pixel
// data, no dependency on any specific renderer. It answers "does this
// bounded geometry respect the Visual Complexity Budget" independent of
// whether — or how — it is ever turned into pixels. A future visual-
// renderer package (any strategy: procedural, AI-assisted, hybrid)
// consumes this validation as-is; nothing here is renderer-specific.
//
// The DEFERRED half of the original Layer 4 file — deriveCurvatureAmplitude,
// deriveColorTreatment, and the PROVISIONAL color infrastructure — remains
// in visual-grammar.ts, now marked deferred (aesthetic/treatment mapping
// consumed only by the deferred renderer).

import type { BoundedKoralGeometry } from './bounded-geometry-types';

export const VISUAL_GRAMMAR_VERSION = 'koral-visual-grammar-v1';

// ── Visual Complexity Budget (report 186 §6, Founder-approved V1 ranges, report 187 §2) ──
export const MAX_MACRO_LOBES = 6;
export const MIN_MACRO_LOBES_TARGET = 3; // soft target for a "developed" Company — never enforced for a genuinely new one (report 187 §13)
export const MAX_APERTURES = 2;
export const MIN_CORE_MASS_SHARE_TARGET = 0.25;
export const MAX_DIRECTIONAL_CROWDING_PER_SECTOR = 2;
export const DIRECTIONAL_SECTOR_DEG = 30;

export interface BrandSafetyViolation {
  readonly rule: string;
  readonly detail: string;
}

/** Pre-render validation — every check here operates on BoundedKoralGeometry alone, no coordinates involved. */
export function validateBrandSafety(geometry: BoundedKoralGeometry): readonly BrandSafetyViolation[] {
  const violations: BrandSafetyViolation[] = [];
  const present = geometry.macroSlots.filter((s) => s.present);

  if (present.length > MAX_MACRO_LOBES) {
    violations.push({ rule: 'max-macro-lobes', detail: `${present.length} present macro-slots exceeds the hard ceiling of ${MAX_MACRO_LOBES}` });
  }

  if (geometry.apertures.length > MAX_APERTURES) {
    violations.push({ rule: 'max-apertures', detail: `${geometry.apertures.length} apertures exceeds the hard ceiling of ${MAX_APERTURES}` });
  }

  for (const slot of present) {
    if (slot.contributorProvenance.contributorCount === 0) {
      violations.push({ rule: 'no-degenerate-slots', detail: `slot ${slot.slotId} is present but has zero active contributors` });
    }
  }

  // Directional crowding — no more than MAX_DIRECTIONAL_CROWDING_PER_SECTOR present slots within any DIRECTIONAL_SECTOR_DEG-wide sector.
  const headings = present.map((s) => s.headingState.angle).sort((a, b) => a - b);
  for (const base of headings) {
    const count = headings.filter((h) => angularDistance(h, base) <= DIRECTIONAL_SECTOR_DEG / 2).length;
    if (count > MAX_DIRECTIONAL_CROWDING_PER_SECTOR) {
      violations.push({ rule: 'directional-crowding', detail: `more than ${MAX_DIRECTIONAL_CROWDING_PER_SECTOR} present macro-slots within a ${DIRECTIONAL_SECTOR_DEG}deg sector around ${base}deg` });
      break;
    }
  }

  return violations;
}

function angularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}
