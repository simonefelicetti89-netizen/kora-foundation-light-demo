// lib/living-koral-mark/geometry-service.ts
// KORA-WP-117 — Renderer-neutral orchestration: Edition -> BoundedKoralGeometry.
//
// Extracted out of mark-service.ts (report 191, WP-117 substrate
// stabilization, 2026-09-19). mark-service.ts's own single entry point,
// generateKoralMark(), chains this exact same sequence and then continues
// into the (deferred) renderer (generateMarkGeometry/renderMarkSvg) —
// that continuation is what makes mark-service.ts itself renderer-
// coupled and therefore deferred. This file stops exactly at
// BoundedKoralGeometry (Layer 3), the stabilized handoff boundary (report
// 190 §3): Edition-bounded Level A lineage replay (edition-lineage-
// service.ts) -> Expression Mode allow-list projection (expression-
// projection.ts) -> Morphological Compression (morphological-
// compression.ts). No SVG, no pixels, no rendering import of any kind —
// confirmed by this file's own import list.
//
// This gives any future caller (including a future visual-renderer
// package) one stable, renderer-independent entry point for "the bounded
// geometry of this Company's Edition" without needing to know the
// internal three-step chain or import anything from the deferred
// renderer layer.

import { getLivingKoralEditionById } from '@/lib/living-koral-edition/edition-service';
import { reconstructEditionLineage } from './edition-lineage-service';
import { projectEditionLineageToExpressionMode } from './expression-projection';
import { compressToBoundedGeometry } from './morphological-compression';
import type { BoundedKoralGeometry } from './bounded-geometry-types';
import type { ExpressionModeMarkPayload } from './types';

export interface ResolveBoundedGeometryParams {
  readonly tenantId: string;
  readonly editionId: string;
}

export interface ResolvedEditionGeometry {
  /** The privacy-safe, allow-listed Layer 1 projection — exposed alongside boundedGeometry so a caller needing both (e.g. accessible-description.ts) never has to re-run the replay/projection steps a second time. */
  readonly expressionPayload: ExpressionModeMarkPayload;
  readonly boundedGeometry: BoundedKoralGeometry;
}

/** Returns null when no such Edition exists for this tenant (foreign or nonexistent — never distinguished, matching the established §31 discipline). */
export async function resolveBoundedGeometryForEdition(params: ResolveBoundedGeometryParams): Promise<ResolvedEditionGeometry | null> {
  const edition = await getLivingKoralEditionById(params.tenantId, params.editionId);
  if (!edition) return null;

  const lineage = await reconstructEditionLineage(params.tenantId, params.editionId, edition.resultingStateRevision);
  const expressionPayload = projectEditionLineageToExpressionMode(lineage);
  const boundedGeometry = compressToBoundedGeometry(expressionPayload, edition.resultingStateRevision);
  return { expressionPayload, boundedGeometry };
}
