// lib/data-intake/evidence-provenance.ts
// B30: Evidence Provenance & Attachment Layer.
// Pure functions — no DB, no LLM, no side effects.
//
// Tracks field-level provenance for key intake fields.
// NEVER stores raw values, cell contents, PII, or free-text notes.
// Only metadata: kind, confidence, source file role/type, flags.

import type { MergedFieldProvenance, ConflictFieldProvenance } from './initiative-matching';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProvenanceKind =
  | 'original_file'      // field present directly in original file with canonical header
  | 'column_mapping'     // field came from non-canonical header via mapping assistant
  | 'manual_completion'  // field filled by operator batch-level defaults
  | 'multi_file_merge'   // field merged from secondary file via initiative matching
  | 'derived'            // field derived from rule/system logic
  | 'system_default';    // system-assigned default (no operator or file source)

export type SourceStrength = 'strong' | 'medium' | 'weak' | 'unknown';

// Safe field provenance — no raw values, no PII
export type FieldProvenanceSafe = {
  field: string;
  provenanceKind: ProvenanceKind;
  sourceStrength: SourceStrength;
  confidence: number;          // 0–1
  isManual: boolean;
  isMerged: boolean;
  isDerived: boolean;
  fileRole?: string;
  fileType?: 'csv' | 'xlsx';
  safeSheetName?: string;      // sanitized, max 50 chars, no PII
  // B30.1: precise multi-file merge metadata
  sourceFileIndex?: number;
  sourceRowIndex?: number;
  matchId?: string;
  conflictRetained?: boolean;  // true if primary was kept despite conflict
  caveat?: string;
};

export type RowProvenance = Record<string, FieldProvenanceSafe>;

export type ProvenanceSummary = {
  originalFileFields: number;
  columnMappedFields: number;
  manualCompletionFields: number;
  mergedFields: number;
  derivedFields: number;
  systemDefaultFields: number;
  strongSourceFields: number;
  weakSourceFields: number;
};

// ── Key fields to track ───────────────────────────────────────────────────────

export const TRACKED_FIELDS = new Set([
  'initiative_name', 'amount', 'participants', 'source', 'evidence_level',
  'budget_class', 'provider', 'hours', 'coverage', 'uptake', 'policy_evidence',
  'category', 'type', 'reporting_period',
]);

// ── Safe sanitization ─────────────────────────────────────────────────────────

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/i,  // Italian CF
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
];

function sanitizeSheetName(sheetName: string | null | undefined): string | undefined {
  if (!sheetName || sheetName.trim() === '') return undefined;
  const s = sheetName.trim().slice(0, 50);
  if (PII_PATTERNS.some(p => p.test(s))) return '[sheet]';  // redact if PII-like
  return s;
}

// ── Per-field provenance builder ──────────────────────────────────────────────

function buildFieldEntry(params: {
  field: string;
  kind: ProvenanceKind;
  confidence: number;
  strength?: SourceStrength;
  isManual?: boolean;
  isMerged?: boolean;
  isDerived?: boolean;
  fileRole?: string;
  fileType?: 'csv' | 'xlsx';
  safeSheetName?: string;
  conflictRetained?: boolean;
  caveat?: string;
}): FieldProvenanceSafe {
  const { field, kind, confidence } = params;
  return {
    field,
    provenanceKind: kind,
    sourceStrength:   params.strength ?? 'medium',
    confidence:       Math.round(confidence * 100) / 100,
    isManual:         params.isManual  ?? false,
    isMerged:         params.isMerged  ?? false,
    isDerived:        params.isDerived ?? false,
    ...(params.fileRole         ? { fileRole: params.fileRole }           : {}),
    ...(params.fileType         ? { fileType: params.fileType }           : {}),
    ...(params.safeSheetName    ? { safeSheetName: params.safeSheetName } : {}),
    ...(params.conflictRetained ? { conflictRetained: true }              : {}),
    ...(params.caveat           ? { caveat: params.caveat }               : {}),
  };
}

// ── Main row provenance builder ───────────────────────────────────────────────

/**
 * Build field provenance for tracked fields in a finalRow.
 *
 * Logic (priority order):
 *   1. If field in mergedFieldProvenance → multi_file_merge with specific per-field source metadata (B30.1)
 *   2. If field in conflictFieldProvenance → primary provenance + conflict_retained caveat (B30.1)
 *   3. If field in manualAppliedFields → manual_completion
 *   4. If field's canonical name === original source header → original_file
 *   5. If field came via mapping (non-canonical header) → column_mapping
 *   6. Otherwise → system_default
 */
export function buildRowProvenance(params: {
  finalRow: Record<string, string>;
  preMergeRow?: Record<string, string>;
  preMappingRow?: Record<string, string>;
  effectiveMapping?: Record<string, string>;
  manualAppliedFields?: string[];
  isMultiFileMerged?: boolean;
  matchConfidence?: number;
  fileRole?: string;
  fileType?: 'csv' | 'xlsx';
  sheetName?: string;
  // B30.1: field-level merge provenance from initiative-matching
  mergedFieldProvenance?: Record<string, MergedFieldProvenance>;
  conflictFieldProvenance?: Record<string, ConflictFieldProvenance>;
}): RowProvenance {
  const {
    finalRow, preMergeRow, effectiveMapping, manualAppliedFields,
    isMultiFileMerged, matchConfidence, fileRole, fileType, sheetName,
    mergedFieldProvenance, conflictFieldProvenance,
  } = params;

  const safeSheetName = sanitizeSheetName(sheetName);
  const provenance: RowProvenance = {};

  // Build reverse mapping: canonical_field → source_header
  const reverseMapping = new Map<string, string>();
  if (effectiveMapping) {
    for (const [src, canon] of Object.entries(effectiveMapping)) {
      if (canon !== 'ignore' && canon !== 'keep_original') {
        reverseMapping.set(canon, src);
      }
    }
  }

  for (const field of TRACKED_FIELDS) {
    const finalVal = finalRow[field]?.trim() ?? '';
    if (!finalVal) continue;

    // B30.1 — 1. Precise multi-file merge: field-level source metadata known
    const mfp = mergedFieldProvenance?.[field];
    if (mfp) {
      provenance[field] = {
        field,
        provenanceKind:   'multi_file_merge',
        sourceStrength:   'medium',
        confidence:       Math.round(mfp.matchConfidence * 100) / 100,
        isManual:         false,
        isMerged:         true,
        isDerived:        false,
        fileRole:         mfp.sourceFileRole,
        ...(mfp.sourceFileType    ? { fileType: mfp.sourceFileType }                          : {}),
        ...(mfp.sourceSheetName   ? { safeSheetName: sanitizeSheetName(mfp.sourceSheetName) } : {}),
        sourceFileIndex:  mfp.sourceFileIndex,
        sourceRowIndex:   mfp.sourceRowIndex,
        matchId:          mfp.matchId.slice(0, 12),  // abbreviated
        caveat: `Merged from matched secondary file (role: ${mfp.sourceFileRole}, file_${mfp.sourceFileIndex}, row ${mfp.sourceRowIndex}). Primary field was empty.`,
      };
      continue;
    }

    // B30.1 — 2. Conflict: field exists in primary, secondary had different value → primary retained
    const cfp = conflictFieldProvenance?.[field];
    if (cfp) {
      // Field comes from primary — mark with conflict_retained caveat
      provenance[field] = buildFieldEntry({
        field, kind: 'original_file',
        confidence: 0.90, strength: 'strong',
        fileRole, fileType, safeSheetName,
        conflictRetained: true,
        caveat: `Conflicting value from secondary file (role: ${cfp.conflictingSourceFileRole}, file_${cfp.conflictingSourceFileIndex}) was detected and discarded. Primary value retained.`,
      });
      continue;
    }

    // 3. Manual completion
    if (manualAppliedFields?.includes(field)) {
      const preMergeVal = preMergeRow?.[field]?.trim() ?? '';
      if (!preMergeVal || preMergeVal === '') {
        provenance[field] = buildFieldEntry({
          field, kind: 'manual_completion',
          confidence: 0.50, strength: 'weak',
          isManual: true,
          fileRole, fileType, safeSheetName,
          caveat: 'Manually completed by KORA operator. Requires review in UEF Review.',
        });
        continue;
      }
    }

    // 4. Generic multi-file merge fallback (flag only, no specific source)
    if (isMultiFileMerged && preMergeRow !== undefined) {
      const preMergeVal = preMergeRow[field]?.trim() ?? '';
      if (!preMergeVal && finalVal) {
        provenance[field] = buildFieldEntry({
          field, kind: 'multi_file_merge',
          confidence: matchConfidence ?? 0.60, strength: 'medium',
          isMerged: true,
          fileRole, fileType, safeSheetName,
          caveat: 'Merged from matched secondary file. Source file details unavailable.',
        });
        continue;
      }
    }

    // 5. Column mapping: non-canonical source header
    const sourceHeader = reverseMapping.get(field);
    if (sourceHeader && sourceHeader !== field) {
      provenance[field] = buildFieldEntry({
        field, kind: 'column_mapping',
        confidence: 0.75, strength: 'medium',
        fileRole, fileType, safeSheetName,
        caveat: `Column mapped from source header "${sourceHeader}".`,
      });
      continue;
    }

    // 6. Original file (canonical header directly matched)
    if (sourceHeader === field || (!effectiveMapping && finalVal)) {
      provenance[field] = buildFieldEntry({
        field, kind: 'original_file',
        confidence: 1.0, strength: 'strong',
        fileRole, fileType, safeSheetName,
      });
      continue;
    }

    // 5. System default fallback
    provenance[field] = buildFieldEntry({
      field, kind: 'system_default',
      confidence: 0.30, strength: 'unknown',
      isDerived: true,
      caveat: 'Provenance could not be determined. Verify during UEF Review.',
    });
  }

  return provenance;
}

// ── Batch summary builder ─────────────────────────────────────────────────────

export function summarizeProvenance(
  allRowProvenances: RowProvenance[],
): ProvenanceSummary {
  const counts: ProvenanceSummary = {
    originalFileFields: 0, columnMappedFields: 0, manualCompletionFields: 0,
    mergedFields: 0, derivedFields: 0, systemDefaultFields: 0,
    strongSourceFields: 0, weakSourceFields: 0,
  };

  const seen = new Set<string>();  // field+kind dedup across rows

  for (const prov of allRowProvenances) {
    for (const [, fp] of Object.entries(prov)) {
      const key = `${fp.field}:${fp.provenanceKind}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (fp.provenanceKind === 'original_file')     counts.originalFileFields++;
      else if (fp.provenanceKind === 'column_mapping')   counts.columnMappedFields++;
      else if (fp.provenanceKind === 'manual_completion') counts.manualCompletionFields++;
      else if (fp.provenanceKind === 'multi_file_merge') counts.mergedFields++;
      else if (fp.provenanceKind === 'derived')          counts.derivedFields++;
      else                                               counts.systemDefaultFields++;

      if (fp.sourceStrength === 'strong')  counts.strongSourceFields++;
      else if (fp.sourceStrength === 'weak') counts.weakSourceFields++;
    }
  }

  return counts;
}

/**
 * Safe provenance object for payload storage.
 * Strips any inadvertent raw value fields.
 * Only keeps: field, provenanceKind, sourceStrength, confidence, flags, safe metadata.
 */
export function sanitizeProvenanceForStorage(prov: RowProvenance): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [field, fp] of Object.entries(prov)) {
    safe[field] = {
      k:    fp.provenanceKind[0],           // abbreviated: o/c/m/f/d/s
      conf: fp.confidence,
      str:  fp.sourceStrength[0],           // s/m/w/u
      fl:   (fp.isManual ? 1 : 0) | (fp.isMerged ? 2 : 0) | (fp.isDerived ? 4 : 0) | (fp.conflictRetained ? 8 : 0),
      ...(fp.fileRole         ? { role: fp.fileRole }                      : {}),
      ...(fp.fileType         ? { ft:   fp.fileType }                      : {}),
      ...(fp.safeSheetName    ? { sh:   fp.safeSheetName }                 : {}),
      // B30.1: precise multi-file merge metadata
      ...(fp.sourceFileIndex  !== undefined ? { fi: fp.sourceFileIndex }   : {}),
      ...(fp.sourceRowIndex   !== undefined ? { ri: fp.sourceRowIndex }    : {}),
      ...(fp.matchId          ? { mid: fp.matchId }                        : {}),
      // caveat: stored only if present and short (no raw cell content)
      ...(fp.caveat && fp.caveat.length <= 140 ? { cav: fp.caveat } : {}),
    };
  }
  return safe;
}
