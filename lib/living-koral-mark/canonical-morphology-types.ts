// lib/living-koral-mark/canonical-morphology-types.ts
// KORA-WP-145 — Layer 3 v2: CanonicalMorphologyState.
//
// The single renderer-neutral morphology state both KORA-WP-146 renderers
// (3D sculpture and Living KORAL Mark) consume. It sits beside the frozen v1
// BoundedKoralGeometry (bounded-geometry-types.ts), which keeps serving every
// Edition created before this engine existed.
//
// No coordinates, lengths, curves, depth, material or colour. No internal
// source identifiers (initiative / Material Change UUIDs) ever appear here.
// `areaId` carries the company-private pillar code; the public projection
// (projectCanonicalMorphologyForExpression) replaces it with a neutral rank.

import type { MassClass, MorphologyAreaCode, TerminalPhase } from '@/lib/living-koral-morphology-config/types';
import type { LivingKoralMorphogenesisOperation } from '@/lib/living-koral-morphogenesis-config/types';
import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

/** One recognized ledger transformation, in canonical replay order. The only input of the fold. */
export interface CanonicalLedgerEvent {
  readonly seq: number;
  readonly operation: LivingKoralMorphogenesisOperation;
  readonly category: MaterialChangeTaxonomyEntry['category'];
  /** Internal lineage key (production: the initiative id). Never copied into the output state. */
  readonly sourceKey: string;
  /** Area snapshotted at recognition; for `reorient` it is the destination area. null = legacy row without area. */
  readonly area: MorphologyAreaCode | null;
  /** `fuse` only: the consolidated source lineages, in canonical order. */
  readonly consolidationSources?: readonly string[];
  readonly resultingStateRevision: number;
}

export type ElementKind = 'member' | 'bud' | 'branch';
export type ElementOrigin = 'seed' | 'core' | 'branch';
export type ElementAssignment = 'unassigned' | 'adopted' | 'fused' | 'retired';

export interface CanonicalHeading {
  readonly slot: number;
  readonly angle: number; // continuous [0,360), renderer-neutral
  readonly coherence: number; // 0..1, purely geometric aggregation property
  readonly isFallback: boolean;
}

export interface CanonicalElement {
  readonly id: string;
  readonly kind: ElementKind;
  readonly origin: ElementOrigin;
  readonly parentId: string; // 'core' or the host element id (branches)
  readonly depth: 1 | 2;
  readonly areaId: MorphologyAreaCode | null;
  readonly areaRank: number | null;
  readonly assignment: ElementAssignment;
  /** True while the element is part of the present form as an independent element (not fused away, not retired). */
  readonly active: boolean;
  readonly fusedInto: string | null;
  readonly terminalPhase: TerminalPhase;
  readonly massClass: MassClass;
  readonly extent: { readonly raw: number; readonly normalized: number };
  readonly heading: CanonicalHeading;
  readonly settledShare: number;
  readonly extentRank: number | null; // seed elements only — relative ordering, never a length
  readonly createdAtRevision: number; // 0 for seed elements
}

export interface CanonicalArea {
  readonly areaId: MorphologyAreaCode;
  readonly rank: number;
  readonly present: boolean;
  readonly primaryId: string;
  readonly branchId: string | null;
}

export interface CanonicalFusionJoint {
  readonly fusionId: string;
  readonly memberIds: readonly [string, string];
  readonly resultMemberId: string;
  readonly kind: 'cross-area' | 'intra-area';
  readonly sinceRevision: number;
  readonly active: boolean;
}

/** v2: fusion-enclosed only (Founder C-cav). No size — WP-146 derives it (C1). */
export interface CanonicalCavity {
  readonly cavityId: string;
  readonly kind: 'fusion-enclosed';
  readonly boundingMemberIds: readonly [string, string];
  readonly fusionId: string;
  readonly open: boolean;
  readonly sinceRevision: number;
  readonly closedAtRevision: number | null;
}

export type MemoryTraceKind = 'growth' | 'fusion' | 'consolidation' | 'opening' | 'closure' | 'scar' | 'reorientation';

export interface MorphologyMemoryTrace {
  readonly traceId: string;
  readonly kind: MemoryTraceKind;
  readonly subject: { readonly type: 'element' | 'area' | 'fusion' | 'cavity'; readonly id: string };
  readonly host: { readonly elementId: string; readonly position: 'attachment' | 'along' | 'terminal' };
  readonly recordedAtRevision: number;
  readonly mergedCount: number;
}

export interface CanonicalMorphologyState {
  readonly seedVersion: string;
  readonly morphologyEngineVersion: string;
  readonly boundaryRevision: number;
  readonly core: { readonly massShare: number };
  readonly areas: readonly CanonicalArea[];
  readonly elements: readonly CanonicalElement[];
  readonly fusions: readonly CanonicalFusionJoint[];
  readonly cavities: readonly CanonicalCavity[];
  /** Visible traces after the deterministic merge (<= maxVisibleMemoryTraces). */
  readonly memoryTraces: readonly MorphologyMemoryTrace[];
  /** Total recognized-transformation memory, including merged traces. */
  readonly memoryTraceTotal: number;
}
