// lib/living-koral-edition/edition-view.ts
// KORA-WP-115 — KORAL Edition (Portrait folded into Edition).
//
// The Company-facing view model / DTO boundary over LivingKoralEditionRecord
// (domain truth). Raw DB-shaped fields (ledgerId, taxonomyConfigVersion,
// morphogenesisEngineVersion, resultingStateRevision, actorId, actorRole,
// tenantId) never reach the UI — only this shaped view, matching CLAUDE.md
// §12 principle 2 and lib/living-koral-company-view/types.ts's own
// established discipline exactly (WP-114).
//
// Reuses WP-114's own existing plain-language category/domain label
// helpers verbatim (categoryPresentation()/domainLabel(), lib/living-
// koral-company-view/company-view-service.ts) — never re-implemented,
// per this WP's own explicit "do not duplicate transformation or
// provenance logic unnecessarily" instruction. This is the ONE
// Company-facing narrative/document rendering this WP builds ("Portrait")
// — plain text assembled from already-frozen, already-real Edition
// fields, no image, no geometry, no color, no SVG.

import { categoryPresentation, domainLabel } from '@/lib/living-koral-company-view/company-view-service';
import type { LivingKoralEditionRecord } from './types';

/** The narrative/document-form "Portrait" of one Edition — text only, computed at read time, never a stored payload. */
export interface LivingKoralEditionView {
  readonly id: string;
  readonly name: string;
  readonly categoryLabel: string;
  readonly categoryDescription: string;
  readonly domainLabel: string;
  readonly occurredAt: string;
  readonly recognizedAt: string;
  readonly sourceLabel: string | null;
  readonly createdAt: string;
}

/** Exported for direct unit testing — pure mapping, no DB access. */
export function toEditionView(record: LivingKoralEditionRecord): LivingKoralEditionView {
  const presentation = categoryPresentation(record.category);
  return {
    id: record.id,
    name: record.name,
    categoryLabel: presentation.label,
    categoryDescription: presentation.description,
    domainLabel: domainLabel(record.affectedDomain),
    occurredAt: record.occurredAt,
    recognizedAt: record.recognizedAt,
    sourceLabel: record.sourceLabel,
    createdAt: record.createdAt,
  };
}
