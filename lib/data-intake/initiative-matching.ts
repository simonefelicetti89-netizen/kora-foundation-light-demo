// lib/data-intake/initiative-matching.ts
// B28/B30.1: Rule-based initiative matching for multi-file batch intake.
// B30.1: adds field-level merged provenance and conflict provenance to each match.
// Matches rows across files referring to the same initiative.
// No LLM, no external calls, deterministic, pure function.
//
// Matching priority:
//   1. Exact normalized initiative_name match + same period  → matched (1.0)
//   2. Strong name similarity + same period                  → matched (0.9)
//   3. Name contains/prefix + same provider                  → possible_match (0.75)
//   4. Same provider + same period + same category           → possible_match (0.65)
//   5. Weak name overlap only                                → needs_review (0.45)
//   6. No signal                                             → unmatched (0)
//
// Merge rules:
//   - Primary file (role='initiatives' or first file) provides base rows.
//   - Secondary files fill missing fields only (never overwrite primary values).
//   - Conflicting values → warning + needs_review, no auto-overwrite.
//   - All merged fields tagged with source file index.

import type { IntakeFileRole } from './file-role-detection';

// ── Types ─────────────────────────────────────────────────────────────────────

export type InitiativeMatchStatus = 'matched' | 'possible_match' | 'unmatched' | 'needs_review';

export interface ParsedIntakeFile {
  fileIndex: number;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  selectedSheetName?: string;
  role: IntakeFileRole;
  headers: string[];
  rows: Array<Record<string, string>>;
  warnings: string[];
}

// B30.1: per-field provenance for fields merged from secondary files
export type MergedFieldProvenance = {
  field: string;
  sourceFileIndex: number;
  sourceFileRole: IntakeFileRole;
  sourceFileType?: 'csv' | 'xlsx';
  sourceSheetName?: string;         // sanitized — no PII
  sourceRowIndex: number;
  sourceCanonicalField: string;     // canonical field name (no raw value)
  matchId: string;
  matchConfidence: number;
  matchStatus: InitiativeMatchStatus;
  mergeReason: 'filled_empty_primary_field';
};

// B30.1: per-field provenance for fields that had a conflict (primary retained)
export type ConflictFieldProvenance = {
  field: string;
  primaryKept: true;
  conflictingSourceFileIndex: number;
  conflictingSourceFileRole: IntakeFileRole;
  conflictingSourceRowIndex: number;
  conflictReason: string;
};

export interface InitiativeMatch {
  matchId: string;
  status: InitiativeMatchStatus;
  confidence: number;
  primaryRow: { fileIndex: number; rowIndex: number; initiativeName: string };
  linkedRows: Array<{
    fileIndex: number;
    rowIndex: number;
    role: IntakeFileRole;
    matchedFields: string[];
  }>;
  mergedFields: Record<string, string>;
  mergedFromFiles: number[];
  conflictWarnings: string[];
  reasonCodes: string[];
  // B30.1: field-level provenance (no raw values)
  mergedFieldProvenance: Record<string, MergedFieldProvenance>;
  conflictFieldProvenance: Record<string, ConflictFieldProvenance>;
}

export interface MultiFileMergeResult {
  matches: InitiativeMatch[];
  finalRows: Array<Record<string, string>>;
  matchSummary: {
    matched: number;
    possibleMatch: number;
    unmatched: number;
    needsReview: number;
    totalFromPrimary: number;
    totalFromSecondary: number;
  };
  warnings: string[];
}

// ── Fields that secondary files can contribute (fill-only, no overwrite) ──────

const FILLABLE_BY_ROLE: Partial<Record<IntakeFileRole, string[]>> = {
  budget:        ['amount', 'budget_class', 'cost_center', 'source', 'provider'],
  participation: ['participants', 'coverage', 'uptake', 'hours', 'evidence_level', 'source'],
  lms:           ['hours', 'participants', 'coverage', 'evidence_level', 'source', 'provider'],
  provider:      ['participants', 'coverage', 'uptake', 'source', 'provider'],
  policy:        ['policy_evidence', 'coverage', 'uptake', 'source', 'evidence_level'],
  evidence:      ['evidence_level', 'source', 'policy_evidence'],
  initiatives:   [],
  unknown:       [],
};

// ── Normalisation ─────────────────────────────────────────────────────────────

function normName(s: string): string {
  if (!s || s.trim() === '') return '';
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normField(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '_');
}

// ── Name similarity helpers ───────────────────────────────────────────────────

function nameWords(s: string): string[] {
  return normName(s).split(' ').filter(w => w.length >= 3);
}

function computeNameSimilarity(a: string, b: string): number {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return 0;

  // Exact match
  if (na === nb) return 1.0;

  // One contains the other
  if (na.includes(nb) || nb.includes(na)) {
    const longer = Math.max(na.length, nb.length);
    const shorter = Math.min(na.length, nb.length);
    return Math.min(0.9, shorter / longer + 0.3);
  }

  // Word overlap
  const wordsA = nameWords(a);
  const wordsB = nameWords(b);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.some(wb => wb === w || (w.length >= 5 && (wb.includes(w) || w.includes(wb))))) {
      overlap++;
    }
  }
  const ratio = overlap / Math.max(wordsA.length, wordsB.length);
  return ratio >= 0.5 ? ratio * 0.7 : ratio * 0.4;
}

// ── Match status from confidence ──────────────────────────────────────────────

function statusFromConfidence(confidence: number): InitiativeMatchStatus {
  if (confidence >= 0.85) return 'matched';
  if (confidence >= 0.60) return 'possible_match';
  if (confidence >= 0.40) return 'needs_review';
  return 'unmatched';
}

// ── Match a secondary row to a primary row ────────────────────────────────────

function matchSecondaryRow(
  primaryRow: Record<string, string>,
  secondaryRow: Record<string, string>,
  primaryFileIndex: number,
  primaryRowIndex: number,
  secondaryFileIndex: number,
  secondaryRowIndex: number,
  secondaryRole: IntakeFileRole,
): { confidence: number; matchedFields: string[]; reasons: string[] } | null {
  const reasons: string[] = [];
  const matchedFields: string[] = [];
  let confidence = 0;

  // Signal 1: initiative name similarity
  const primaryName   = primaryRow['initiative_name'] ?? primaryRow['nome_iniziativa'] ?? '';
  const secondaryName = secondaryRow['initiative_name'] ?? secondaryRow['nome_iniziativa'] ?? '';
  const nameSim = computeNameSimilarity(primaryName, secondaryName);

  if (nameSim >= 0.95) {
    confidence = Math.max(confidence, 0.95);
    reasons.push('name:exact');
    matchedFields.push('initiative_name');
  } else if (nameSim >= 0.70) {
    confidence = Math.max(confidence, nameSim);
    reasons.push(`name:similar_${Math.round(nameSim * 100)}`);
    matchedFields.push('initiative_name');
  } else if (nameSim >= 0.40) {
    confidence = Math.max(confidence, nameSim * 0.6);
    reasons.push(`name:weak_${Math.round(nameSim * 100)}`);
  }

  // Signal 2: reporting period match
  const primaryPeriod   = normField(primaryRow['reporting_period'] ?? primaryRow['period'] ?? '');
  const secondaryPeriod = normField(secondaryRow['reporting_period'] ?? secondaryRow['period'] ?? '');
  if (primaryPeriod && secondaryPeriod && primaryPeriod === secondaryPeriod) {
    confidence = Math.min(1, confidence + 0.1);
    reasons.push('period:match');
    matchedFields.push('reporting_period');
  }

  // Signal 3: provider match
  const primaryProvider   = normField(primaryRow['provider'] ?? '');
  const secondaryProvider = normField(secondaryRow['provider'] ?? '');
  if (primaryProvider && secondaryProvider && primaryProvider === secondaryProvider) {
    confidence = Math.min(1, confidence + 0.1);
    reasons.push('provider:match');
    matchedFields.push('provider');
  }

  // Signal 4: category coherence
  const primaryCat   = normField(primaryRow['category'] ?? primaryRow['categoria'] ?? '');
  const secondaryCat = normField(secondaryRow['category'] ?? secondaryRow['categoria'] ?? '');
  if (primaryCat && secondaryCat && primaryCat === secondaryCat) {
    confidence = Math.min(1, confidence + 0.05);
    reasons.push('category:match');
  }

  // Signal 5: cost_center match (strong signal for budget files)
  if (secondaryRole === 'budget') {
    const primaryCdc   = normField(primaryRow['cost_center'] ?? primaryRow['cdc'] ?? '');
    const secondaryCdc = normField(secondaryRow['cost_center'] ?? secondaryRow['cdc'] ?? '');
    if (primaryCdc && secondaryCdc && primaryCdc === secondaryCdc) {
      confidence = Math.min(1, confidence + 0.15);
      reasons.push('cost_center:match');
      matchedFields.push('cost_center');
    }
  }

  if (confidence < 0.30) return null;  // below minimum threshold — skip

  return { confidence, matchedFields, reasons };
}

// ── Sheet name sanitizer (no PII) ────────────────────────────────────────────

const MERGE_PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
];

function safeMergeSheetName(s: string | undefined): string | undefined {
  if (!s || !s.trim()) return undefined;
  const t = s.trim().slice(0, 50);
  if (MERGE_PII_PATTERNS.some(p => p.test(t))) return '[sheet]';
  return t;
}

// ── Merge rows conservatively — B30.1: field-level provenance ────────────────

function mergeRows(
  primaryRow: Record<string, string>,
  linkedRows: Array<{
    row: Record<string, string>;
    role: IntakeFileRole;
    fileIndex: number;
    rowIndex: number;
    fileType?: 'csv' | 'xlsx';
    sheetName?: string;
  }>,
  matchId: string,
  matchConfidence: number,
  matchStatus: InitiativeMatchStatus,
): {
  merged: Record<string, string>;
  mergedFromFiles: number[];
  conflicts: string[];
  mergedFieldProvenance: Record<string, MergedFieldProvenance>;
  conflictFieldProvenance: Record<string, ConflictFieldProvenance>;
} {
  const merged = { ...primaryRow };
  const mergedFromFiles: number[] = [];
  const conflicts: string[] = [];
  const mergedFieldProvenance: Record<string, MergedFieldProvenance> = {};
  const conflictFieldProvenance: Record<string, ConflictFieldProvenance> = {};

  for (const { row, role, fileIndex, rowIndex, fileType, sheetName } of linkedRows) {
    const fillableFields = FILLABLE_BY_ROLE[role] ?? [];
    let anyFilled = false;

    for (const field of fillableFields) {
      const secondaryVal = row[field]?.trim() ?? '';
      if (!secondaryVal) continue;

      const primaryVal = merged[field]?.trim() ?? '';
      if (!primaryVal) {
        // Fill empty field from secondary — record provenance
        merged[field] = secondaryVal;
        anyFilled = true;
        mergedFieldProvenance[field] = {
          field,
          sourceFileIndex:    fileIndex,
          sourceFileRole:     role,
          ...(fileType    ? { sourceFileType: fileType }                        : {}),
          ...(sheetName   ? { sourceSheetName: safeMergeSheetName(sheetName) } : {}),
          sourceRowIndex:     rowIndex,
          sourceCanonicalField: field,  // canonical name (no raw value)
          matchId,
          matchConfidence,
          matchStatus,
          mergeReason: 'filled_empty_primary_field',
        };
      } else if (primaryVal !== secondaryVal) {
        // Conflict: keep primary, record conflict provenance
        conflicts.push(
          `Campo "${field}" in conflitto: file_${fileIndex} row ${rowIndex} — mantenuto valore primary.`,
        );
        // Only record first conflict per field
        if (!conflictFieldProvenance[field]) {
          conflictFieldProvenance[field] = {
            field,
            primaryKept: true,
            conflictingSourceFileIndex: fileIndex,
            conflictingSourceFileRole:  role,
            conflictingSourceRowIndex:  rowIndex,
            conflictReason: `Secondary value differs from primary; primary retained per conservative merge rule.`,
          };
        }
      }
    }

    if (anyFilled) mergedFromFiles.push(fileIndex);
  }

  return { merged, mergedFromFiles, conflicts, mergedFieldProvenance, conflictFieldProvenance };
}

// ── Main function ─────────────────────────────────────────────────────────────

export function runInitiativeMatching(files: ParsedIntakeFile[]): MultiFileMergeResult {
  const warnings: string[] = [];

  if (files.length === 0) {
    return {
      matches: [], finalRows: [],
      matchSummary: { matched: 0, possibleMatch: 0, unmatched: 0, needsReview: 0, totalFromPrimary: 0, totalFromSecondary: 0 },
      warnings: ['No files provided.'],
    };
  }

  // Identify primary file (initiatives role, or first file if none)
  const primaryFile = files.find(f => f.role === 'initiatives') ?? files[0];
  const secondaryFiles = files.filter(f => f.fileIndex !== primaryFile.fileIndex);

  if (secondaryFiles.length === 0) {
    // Single-file mode: return rows as-is, no matching needed
    const finalRows = primaryFile.rows.map(r => ({ ...r }));
    return {
      matches: finalRows.map((row, i) => ({
        matchId: `m_${primaryFile.fileIndex}_${i}`,
        status: 'matched' as const,
        confidence: 1.0,
        primaryRow: { fileIndex: primaryFile.fileIndex, rowIndex: i, initiativeName: row['initiative_name'] ?? '' },
        linkedRows: [],
        mergedFields: row,
        mergedFromFiles: [primaryFile.fileIndex],
        conflictWarnings: [],
        reasonCodes: ['single_file'],
        mergedFieldProvenance:  {},   // B30.1: no merged fields in single-file mode
        conflictFieldProvenance: {},  // B30.1: no conflicts in single-file mode
      })),
      finalRows,
      matchSummary: {
        matched: finalRows.length, possibleMatch: 0, unmatched: 0, needsReview: 0,
        totalFromPrimary: finalRows.length, totalFromSecondary: 0,
      },
      warnings: ['Single-file mode: no cross-file matching needed.'],
    };
  }

  // Multi-file matching
  const matches: InitiativeMatch[] = [];
  const usedSecondaryRows = new Map<string, boolean>(); // `${fileIndex}_${rowIndex}` → used

  let totalSecondary = 0;
  for (const sf of secondaryFiles) totalSecondary += sf.rows.length;

  for (let primaryRowIdx = 0; primaryRowIdx < primaryFile.rows.length; primaryRowIdx++) {
    const primaryRow = primaryFile.rows[primaryRowIdx];
    const linkedRows: Array<{ row: Record<string, string>; role: IntakeFileRole; fileIndex: number; rowIndex: number; matchedFields: string[] }> = [];
    const allReasons: string[] = [];
    let maxConfidence = 0;

    for (const secFile of secondaryFiles) {
      let bestSecondaryIdx = -1;
      let bestConf = 0;
      let bestMatchedFields: string[] = [];
      let bestReasons: string[] = [];

      for (let secRowIdx = 0; secRowIdx < secFile.rows.length; secRowIdx++) {
        const secKey = `${secFile.fileIndex}_${secRowIdx}`;
        if (usedSecondaryRows.get(secKey)) continue;

        const result = matchSecondaryRow(
          primaryRow, secFile.rows[secRowIdx],
          primaryFile.fileIndex, primaryRowIdx,
          secFile.fileIndex, secRowIdx,
          secFile.role,
        );
        if (result && result.confidence > bestConf) {
          bestConf = result.confidence;
          bestSecondaryIdx = secRowIdx;
          bestMatchedFields = result.matchedFields;
          bestReasons = result.reasons;
        }
      }

      if (bestSecondaryIdx >= 0 && bestConf >= 0.30) {
        const secKey = `${secFile.fileIndex}_${bestSecondaryIdx}`;
        usedSecondaryRows.set(secKey, true);
        linkedRows.push({
          row: secFile.rows[bestSecondaryIdx],
          role: secFile.role,
          fileIndex: secFile.fileIndex,
          rowIndex: bestSecondaryIdx,
          matchedFields: bestMatchedFields,
        });
        maxConfidence = Math.max(maxConfidence, bestConf);
        allReasons.push(...bestReasons);
      }
    }

    // Compute match status (needed before mergeRows for conflict confidence)
    const preAdjStatus = linkedRows.length === 0 ? 'unmatched' : statusFromConfidence(maxConfidence);

    // Merge — B30.1: pass linkedRows with rowIndex + file metadata for field provenance
    const matchId = `m_${primaryFile.fileIndex}_${primaryRowIdx}`;
    const { merged, mergedFromFiles, conflicts, mergedFieldProvenance, conflictFieldProvenance } = mergeRows(
      primaryRow,
      linkedRows.map(lr => {
        const secFile = secondaryFiles.find(sf => sf.fileIndex === lr.fileIndex);
        return {
          row:       lr.row,
          role:      lr.role,
          fileIndex: lr.fileIndex,
          rowIndex:  lr.rowIndex,
          fileType:  secFile?.fileType,
          sheetName: secFile?.selectedSheetName,
        };
      }),
      matchId,
      maxConfidence,
      preAdjStatus,
    );

    // Reduce confidence for conflicts
    const adjConfidence = conflicts.length > 0
      ? Math.max(0.40, maxConfidence - 0.15)
      : maxConfidence;

    const status = linkedRows.length === 0
      ? 'unmatched'
      : statusFromConfidence(adjConfidence);

    matches.push({
      matchId,
      status,
      confidence: Math.round(adjConfidence * 100) / 100,
      primaryRow: {
        fileIndex: primaryFile.fileIndex,
        rowIndex: primaryRowIdx,
        initiativeName: primaryRow['initiative_name'] ?? '',
      },
      linkedRows: linkedRows.map(lr => ({
        fileIndex: lr.fileIndex,
        rowIndex: lr.rowIndex,
        role: lr.role,
        matchedFields: lr.matchedFields,
      })),
      mergedFields: merged,
      mergedFromFiles: [primaryFile.fileIndex, ...mergedFromFiles],
      conflictWarnings: conflicts,
      reasonCodes: [...new Set(allReasons)].slice(0, 8),
      mergedFieldProvenance,     // B30.1: field-level source metadata
      conflictFieldProvenance,   // B30.1: field-level conflict metadata
    });
  }

  // Warn about unmatched secondary rows
  for (const sf of secondaryFiles) {
    let unmatchedCount = 0;
    for (let i = 0; i < sf.rows.length; i++) {
      if (!usedSecondaryRows.get(`${sf.fileIndex}_${i}`)) unmatchedCount++;
    }
    if (unmatchedCount > 0) {
      warnings.push(
        `${unmatchedCount} righe non abbinate in file "${sf.fileName}" (role=${sf.role}). ` +
        'Verificare se mancano righe nel file iniziative.',
      );
    }
  }

  const finalRows = matches.map(m => m.mergedFields);

  const summary = {
    matched:            matches.filter(m => m.status === 'matched').length,
    possibleMatch:      matches.filter(m => m.status === 'possible_match').length,
    unmatched:          matches.filter(m => m.status === 'unmatched').length,
    needsReview:        matches.filter(m => m.status === 'needs_review').length,
    totalFromPrimary:   primaryFile.rows.length,
    totalFromSecondary: totalSecondary,
  };

  return { matches, finalRows, matchSummary: summary, warnings };
}
