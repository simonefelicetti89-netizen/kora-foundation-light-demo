// app/api/admin/data-intake/upload-preview/route.ts
// CSV + XLSX dry-run preview — KORA_ADMIN only.
//
// DRY-RUN: parses the file(s), runs PII strict-reject, returns eligibility preview.
// NOTHING is written to Supabase — no source_batch, no uploaded_record, no scoring.
//
// Auth:   KORA_ADMIN session required.
// Input:  multipart/form-data
//         · file (CSV or XLSX) — single or multiple (use same field name "file" multiple times)
//         · selectedSheetNames JSON array (optional XLSX — one entry per file by index)
//         · columnMappings JSON array (optional — one mapping object per file by index)
//         · fileRoles JSON array (optional — one IntakeFileRole per file by index)
//         · manualCompletion JSON (optional — B27 batch-level defaults, applied post-merge)
// Limits: max 5 MB per file · max 500 data rows per file · CSV or XLSX only
//
// B26: XLSX multi-sheet support.
// B27: Column Mapping Assistant + batch-level manual completion defaults.
// B28: Multi-file batch intake + initiative matching light.
//   CRITICAL: PII scan runs on ORIGINAL rows of EACH file before mapping or merge.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { detectPiiInPayload, summarizePiiFindings } from '@/lib/privacy/pii-guard';
import { classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';
import { parseCsvContent, flattenCsvWarnings } from '@/lib/data-intake/csv-parser';
import { parseExcelWorkbookMeta, parseExcelSheet } from '@/lib/data-intake/excel-parser';
import {
  suggestColumnMapping, applyColumnMapping, applyManualCompletionDefaults,
  validateMapping, type CanonicalIntakeField,
} from '@/lib/data-intake/column-mapping';
import { analyzeMissingFields } from '@/lib/data-intake/missing-field-analysis';
import { detectFileRole, type IntakeFileRole } from '@/lib/data-intake/file-role-detection';
import { runInitiativeMatching, type ParsedIntakeFile } from '@/lib/data-intake/initiative-matching';
import { buildRowProvenance, summarizeProvenance } from '@/lib/data-intake/evidence-provenance';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// ── Limits ───────────────────────────────────────────────────────────────────

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (xlsx can be denser than csv)
const MAX_ROWS  = 500;

// ── Header blocklist — reject immediately if any column header matches ────────

const FORBIDDEN_HEADERS = new Set([
  'email', 'e-mail', 'email_address', 'mail',
  'phone', 'telefono', 'mobile', 'cel', 'cellulare', 'phone_number', 'tel',
  'codice_fiscale', 'cf', 'tax_code', 'fiscal_code', 'codice_fiscale_lavoratore',
  'iban', 'bic', 'iban_number',
  'name', 'first_name', 'last_name', 'surname',
  'nome', 'cognome', 'full_name', 'employee_name',
  'nominativo', 'worker_name', 'nome_lavoratore', 'cognome_lavoratore',
  'address', 'indirizzo', 'street', 'via', 'citta', 'city', 'cap',
  'domicilio', 'residenza',
  'birth_date', 'data_nascita', 'date_of_birth', 'age', 'eta',
  'health', 'salute', 'diagnosi', 'diagnosis', 'referto', 'medical_data',
  'matricola',
]);

// ── Safe sample row — only known-safe fields for response ─────────────────────

function buildSampleRow(row: Record<string, string>, rowIndex: number, eligibility: string) {
  const SAFE_KEYS = [
    'initiative_name', 'initiative_id', 'nome_iniziativa',
    'category', 'categoria',
    'type', 'tipo',
    'participants', 'partecipanti',
    'pillar',
    'department_group', 'site', 'cluster',
  ];
  const safe: Record<string, string> = {};
  for (const k of SAFE_KEYS) {
    if (row[k] !== undefined && row[k] !== '') safe[k] = row[k];
  }
  return { rowIndex, eligibility, ...safe };
}

// ── rows → RawUploadedRecord[] for eligibility gate ──────────────────────────

function toUploadedRecords(rows: Record<string, string>[]): RawUploadedRecord[] {
  return rows.map((row, i) => ({
    recordId:           `dry-run-row-${i}`,
    batchId:            'dry-run-preview',
    rowIndex:           i,
    detectedRecordType: 'welfare_program',
    raw:                { ...row } as Record<string, unknown>,
  }));
}

// ── PII check helper ─────────────────────────────────────────────────────────

function runPiiCheck(
  headers: string[],
  rows: Record<string, string>[],
  sheetName?: string,
) {
  // Header blocklist
  const forbiddenFound = headers.filter(h => FORBIDDEN_HEADERS.has(h));
  if (forbiddenFound.length > 0) {
    return {
      rejected: true as const,
      reason: 'forbidden_headers',
      forbiddenHeaders: forbiddenFound,
      sheetName,
    };
  }

  // Value PII scan
  const piiFindings: Array<{
    rowIndex: number; fieldPath: string; riskType: string; severity: string; sheetName?: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const result = detectPiiInPayload(rows[i] as Record<string, unknown>);
    if (result.hasPii) {
      for (const f of result.findings) {
        piiFindings.push({
          rowIndex:  i + 1,
          fieldPath: f.fieldPath,
          riskType:  f.riskType,
          severity:  f.severity,
          ...(sheetName ? { sheetName } : {}),
          // NEVER include the PII value itself
        });
      }
    }
  }

  if (piiFindings.length > 0) {
    const allRawFindings = rows.flatMap(row => detectPiiInPayload(row as Record<string, unknown>).findings);
    const summary = summarizePiiFindings(allRawFindings);
    return {
      rejected: true as const,
      reason: 'pii_in_values',
      findings: piiFindings,
      auditSummary: {
        totalFindings:     summary.total,
        highSeverityCount: summary.highSeverityCount,
        byRiskType:        summary.byRiskType,
        fieldPaths:        summary.fieldPaths,
      },
      sheetName,
    };
  }

  return { rejected: false as const };
}

// ── B28: parse + PII-check + map a single file ───────────────────────────────
// Returns either an error response payload or a ParsedIntakeFile.
// PII scan always runs on ORIGINAL rows before mapping.

async function processOneFile(params: {
  file: File;
  fileIndex: number;
  selectedSheetName: string | null;
  columnMapping: Record<string, CanonicalIntakeField | 'ignore' | 'keep_original'> | null;
  fileRole: IntakeFileRole | null;
  maxRows: number;
  maxBytes: number;
}): Promise<
  | { ok: false; httpStatus: number; body: Record<string, unknown> }
  | { ok: true; parsed: ParsedIntakeFile; mappingSuggestions: ReturnType<typeof suggestColumnMapping>; parseWarnings: string[] }
> {
  const { file, fileIndex, selectedSheetName, columnMapping, fileRole, maxRows, maxBytes } = params;
  const filename = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  const isCsv  = filename.endsWith('.csv') || mimeType === 'text/csv' || mimeType === 'application/csv';
  const isXlsx = filename.endsWith('.xlsx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/octet-stream';

  if (!isCsv && !isXlsx) {
    return { ok: false, httpStatus: 400, body: { error: `File ${file.name}: must be CSV or XLSX.`, fileIndex } };
  }
  if (filename.endsWith('.xls') && !filename.endsWith('.xlsx')) {
    return { ok: false, httpStatus: 400, body: { error: `File ${file.name}: .xls legacy not supported.`, fileIndex } };
  }
  if (file.size > maxBytes) {
    return { ok: false, httpStatus: 413, body: { error: `File ${file.name}: too large (${(file.size / 1024 / 1024).toFixed(1)} MB, max 5 MB).`, fileIndex } };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let headers: string[];
  let originalRows: Record<string, string>[];
  let parseWarnings: string[];

  if (isCsv) {
    const parsed = parseCsvContent(buf.toString('utf-8'));
    if (parsed.errors.length > 0) {
      return { ok: false, httpStatus: 400, body: { error: `File ${file.name}: ${parsed.errors[0].message}`, fileIndex } };
    }
    headers = parsed.headers;
    originalRows = parsed.rows;
    parseWarnings = flattenCsvWarnings(parsed);
  } else {
    // XLSX: if no sheet selected, need sheet list — caller handles this
    if (!selectedSheetName) {
      const meta = parseExcelWorkbookMeta(buf);
      return {
        ok: false, httpStatus: 200,
        body: {
          requiresSheetSelection: true, fileIndex, fileName: file.name,
          sheetCount: meta.sheetNames.length,
          sheets: meta.sheets.map(s => ({
            sheetName: s.sheetName, rowCount: s.rowCount, headers: s.headers, errors: s.errors,
          })),
        },
      };
    }
    const parsed = parseExcelSheet(buf, selectedSheetName, maxRows);
    if (parsed.errors.length > 0) {
      return { ok: false, httpStatus: 400, body: { error: `File ${file.name} sheet "${selectedSheetName}": ${parsed.errors[0].message}`, fileIndex } };
    }
    headers = parsed.headers;
    originalRows = parsed.rows;
    parseWarnings = parsed.warnings.map(w => w.message);
  }

  if (originalRows.length > maxRows) {
    return { ok: false, httpStatus: 400, body: { error: `File ${file.name}: too many rows (${originalRows.length}, max ${maxRows}).`, fileIndex } };
  }

  // PII scan on original rows (before mapping — ignored columns NOT exempt)
  const forbiddenFound = headers.filter(h => FORBIDDEN_HEADERS.has(h));
  if (forbiddenFound.length > 0) {
    return {
      ok: false, httpStatus: 422,
      body: {
        ok: false, error: `File ${file.name}: forbidden column headers detected.`,
        piiStatus: 'rejected', fileIndex, fileName: file.name,
        forbiddenHeaders: forbiddenFound, dryRunNote: 'No data stored.',
      },
    };
  }
  for (let i = 0; i < originalRows.length; i++) {
    const result = detectPiiInPayload(originalRows[i] as Record<string, unknown>);
    if (result.hasPii) {
      return {
        ok: false, httpStatus: 422,
        body: {
          ok: false, error: `File ${file.name}: PII detected in values.`,
          piiStatus: 'rejected', fileIndex, fileName: file.name,
          findings: result.findings.map(f => ({
            rowIndex: i + 1, fieldPath: f.fieldPath, riskType: f.riskType, severity: f.severity, fileIndex, fileName: file.name,
          })),
          dryRunNote: 'No data stored.',
        },
      };
    }
  }

  // Column mapping
  const mappingSuggestions = suggestColumnMapping(headers);
  const effectiveMapping = columnMapping ?? Object.fromEntries(
    mappingSuggestions.filter(s => s.suggestedField !== null).map(s => [s.sourceHeader, s.suggestedField!])
  );
  const mappedRows = applyColumnMapping(originalRows, effectiveMapping);

  // Role detection
  const detectedRole = fileRole ?? detectFileRole(file.name, headers).role;

  return {
    ok: true,
    parseWarnings,
    mappingSuggestions,
    parsed: {
      fileIndex,
      fileName: file.name,
      fileType: isXlsx ? 'xlsx' : 'csv',
      selectedSheetName: selectedSheetName ?? undefined,
      role: detectedRole,
      headers,
      rows: mappedRows,
      warnings: parseWarnings,
    },
  };
}

// ── B27: shared preview logic (post-parse, pre-persist) ──────────────────────
// CRITICAL: PII scan runs on ORIGINAL rows BEFORE mapping.
// Ignored/unmapped columns are never exempt from PII scan.

function buildPreviewPayload(params: {
  fileType: 'csv' | 'xlsx';
  headers: string[];
  originalRows: Array<Record<string, string>>;
  columnMapping: Record<string, CanonicalIntakeField | 'ignore' | 'keep_original'> | null;
  manualDefaults: Partial<Record<CanonicalIntakeField, string>> | null;
  selectedSheetName?: string;
  parseWarnings: string[];
}) {
  const { fileType, headers, originalRows, columnMapping, manualDefaults, selectedSheetName, parseWarnings } = params;

  // Step 1: PII scan on ORIGINAL rows — before any mapping, drop, or ignore
  const piiResult = runPiiCheck(headers, originalRows, selectedSheetName);
  if (piiResult.rejected) return { piiResult };

  // Step 2: suggest mapping from original headers
  const mappingSuggestions = suggestColumnMapping(headers);

  // Step 3: build effective mapping (user mapping or fall back to suggestions)
  const effectiveMapping = columnMapping ?? Object.fromEntries(
    mappingSuggestions
      .filter(s => s.suggestedField !== null)
      .map(s => [s.sourceHeader, s.suggestedField!])
  );

  // Step 4: apply column mapping
  const mappedRows = applyColumnMapping(originalRows, effectiveMapping);

  // Step 5: apply manual completion defaults (batch-level)
  let finalRows = mappedRows;
  let manualApplied: CanonicalIntakeField[] = [];
  if (manualDefaults) {
    const result = applyManualCompletionDefaults(mappedRows, manualDefaults);
    finalRows = result.rows;
    manualApplied = result.appliedFields;
  }

  // Step 6: missing field analysis on mapped rows
  const missingFieldSummary = analyzeMissingFields(finalRows);

  // Step 7: eligibility classification on final rows
  const records = toUploadedRecords(finalRows);
  const eligResults = classifyEligibilityBatch(records);
  const eligCounts = {
    eligible:       eligResults.filter(e => e.status === 'eligible').length,
    limited:        eligResults.filter(e => e.status === 'limited').length,
    blocked:        eligResults.filter(e => e.status === 'blocked').length,
    reviewRequired: eligResults.filter(e => e.status === 'review_required').length,
    total:          eligResults.length,
  };

  // Step 8: sample rows (safe fields from mapped rows)
  const sampleRows = finalRows
    .slice(0, 5)
    .map((row, i) => buildSampleRow(row, i + 1, eligResults[i]?.status ?? 'unknown'));

  // B30: provenance summary for preview (no per-row provenance in dry-run)
  const previewProvenances = finalRows.slice(0, 10).map(row =>
    buildRowProvenance({
      finalRow: row,
      effectiveMapping: effectiveMapping as Record<string, string>,
      manualAppliedFields: manualApplied,
      fileType,
      sheetName: selectedSheetName ?? undefined,
    })
  );
  const previewProvenanceSummary = summarizeProvenance(previewProvenances);

  return {
    piiResult: null,
    fileType,
    mode: 'dry_run',
    selectedSheetName,
    rowCount: finalRows.length,
    headerCount: headers.length,
    piiStatus: 'passed',
    originalHeaders: headers,
    mappingSuggestions,
    appliedMapping: effectiveMapping,
    manualCompletionApplied: manualApplied,
    provenanceSummary: previewProvenanceSummary,
    provenanceCaveat: 'Field provenance is metadata only. It does not expose raw file contents.',
    missingFieldSummary: {
      totalRows:            missingFieldSummary.totalRows,
      missingByField:       missingFieldSummary.missingByField,
      blockingCount:        missingFieldSummary.blockingCount,
      warningCount:         missingFieldSummary.warningCount,
      overallSeverity:      missingFieldSummary.overallSeverity,
      fillableWithDefaults: missingFieldSummary.fillableWithDefaults,
    },
    eligibilityPreview: eligCounts,
    sampleRows,
    warnings: parseWarnings,
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart/form-data request.' }, { status: 400 });
  }

  // B28: support multiple files via getAll('file')
  const allFileEntries = formData.getAll('file').filter(e => e instanceof File) as File[];
  if (allFileEntries.length === 0) {
    return NextResponse.json({ error: 'Missing required field: file.' }, { status: 400 });
  }

  const isMultiFile = allFileEntries.length > 1;

  // ── B28 MULTI-FILE PATH ───────────────────────────────────────────────────
  if (isMultiFile) {
    // Per-file metadata: JSON arrays indexed by file position
    let selectedSheetNames: (string | null)[] = [];
    let columnMappings: (Record<string, CanonicalIntakeField | 'ignore' | 'keep_original'> | null)[] = [];
    let fileRoles: (IntakeFileRole | null)[] = [];

    const ssRaw = formData.get('selectedSheetNames');
    if (ssRaw) try { selectedSheetNames = JSON.parse(String(ssRaw)); } catch { /**/ }
    const cmRaw = formData.get('columnMappings');
    if (cmRaw) try { columnMappings = JSON.parse(String(cmRaw)); } catch { /**/ }
    const frRaw = formData.get('fileRoles');
    if (frRaw) try { fileRoles = JSON.parse(String(frRaw)); } catch { /**/ }

    let manualDefaults: Partial<Record<CanonicalIntakeField, string>> | null = null;
    const manualRaw = formData.get('manualCompletion');
    if (manualRaw) try { manualDefaults = JSON.parse(String(manualRaw)); } catch { /**/ }

    // Process each file
    const parsedFiles: ParsedIntakeFile[] = [];
    const allMappingSuggestions: ReturnType<typeof suggestColumnMapping> = [];
    const requiresSheetSelection: Array<{ fileIndex: number; fileName: string; sheets: unknown[] }> = [];

    for (let idx = 0; idx < allFileEntries.length; idx++) {
      const result = await processOneFile({
        file:             allFileEntries[idx],
        fileIndex:        idx,
        selectedSheetName: selectedSheetNames[idx] ?? null,
        columnMapping:    columnMappings[idx] ?? null,
        fileRole:         fileRoles[idx] ?? null,
        maxRows:          MAX_ROWS,
        maxBytes:         MAX_BYTES,
      });

      if (!result.ok) {
        // Sheet selection needed — collect all, don't fail yet
        if (result.body['requiresSheetSelection']) {
          requiresSheetSelection.push({
            fileIndex: idx, fileName: allFileEntries[idx].name,
            sheets: (result.body['sheets'] as unknown[]) ?? [],
          });
          continue;
        }
        // Real error or PII → return immediately
        return NextResponse.json(result.body, { status: result.httpStatus });
      }

      parsedFiles.push(result.parsed);
      allMappingSuggestions.push(...result.mappingSuggestions);  // flat array of suggestions
    }

    // If any XLSX files need sheet selection, return that info
    if (requiresSheetSelection.length > 0) {
      return NextResponse.json({
        ok: true,
        fileMode: 'multi',
        requiresSheetSelection: true,
        pendingSheetSelection: requiresSheetSelection,
        processedCount: parsedFiles.length,
        dryRunNote: 'Some XLSX files require sheet selection before proceeding.',
      });
    }

    if (parsedFiles.length === 0) {
      return NextResponse.json({ error: 'No files could be processed.' }, { status: 400 });
    }

    // Run initiative matching
    const matchResult = runInitiativeMatching(parsedFiles);
    let finalRows = matchResult.finalRows;

    // Apply manual completion defaults post-merge
    let manualApplied: CanonicalIntakeField[] = [];
    if (manualDefaults) {
      const r = applyManualCompletionDefaults(finalRows, manualDefaults);
      finalRows = r.rows;
      manualApplied = r.appliedFields;
    }

    const missingFieldSummary = analyzeMissingFields(finalRows);
    const records = toUploadedRecords(finalRows);
    const eligResults = classifyEligibilityBatch(records);
    const eligCounts = {
      eligible:       eligResults.filter(e => e.status === 'eligible').length,
      limited:        eligResults.filter(e => e.status === 'limited').length,
      blocked:        eligResults.filter(e => e.status === 'blocked').length,
      reviewRequired: eligResults.filter(e => e.status === 'review_required').length,
      total:          eligResults.length,
    };
    const sampleRows = finalRows.slice(0, 5).map((row, i) => buildSampleRow(row, i + 1, eligResults[i]?.status ?? 'unknown'));

    return NextResponse.json({
      ok: true, fileMode: 'multi', mode: 'dry_run',
      dryRunNote: `${parsedFiles.length} file processati. Initiative matching completato. Nessun dato salvato.`,
      fileCount: parsedFiles.length,
      files: parsedFiles.map(f => ({
        fileIndex:  f.fileIndex,
        fileName:   f.fileName,
        fileType:   f.fileType,
        role:       f.role,
        rowCount:   f.rows.length,
        headers:    f.headers,
        selectedSheetName: f.selectedSheetName,
        warnings:   f.warnings,
      })),
      matchSummary: matchResult.matchSummary,
      matches: matchResult.matches.slice(0, 20).map(m => ({
        matchId:    m.matchId,
        status:     m.status,
        confidence: m.confidence,
        initiativeName: m.primaryRow.initiativeName,
        linkedFileCount: m.linkedRows.length,
        mergedFromFiles: m.mergedFromFiles,
        conflictCount:   m.conflictWarnings.length,
        reasonCodes:     m.reasonCodes,
      })),
      mergedPreviewRows: sampleRows,
      rowCount:          finalRows.length,
      piiStatus:         'passed',
      eligibilityPreview: eligCounts,
      manualCompletionApplied: manualApplied,
      missingFieldSummary: {
        totalRows:            missingFieldSummary.totalRows,
        blockingCount:        missingFieldSummary.blockingCount,
        warningCount:         missingFieldSummary.warningCount,
        overallSeverity:      missingFieldSummary.overallSeverity,
        fillableWithDefaults: missingFieldSummary.fillableWithDefaults,
        missingByField:       missingFieldSummary.missingByField,
      },
      warnings: [...matchResult.warnings],
      synthetic_test: false,
    });
  }

  // ── SINGLE-FILE PATH (B26/B27 unchanged) ─────────────────────────────────
  const file             = allFileEntries[0];
  const filename         = file.name.toLowerCase();
  const mimeType         = file.type.toLowerCase();
  const selectedSheet    = formData.get('selectedSheetName');
  const selectedSheetName = selectedSheet ? String(selectedSheet).trim() : null;

  // B27: optional column mapping + manual completion defaults
  let columnMapping: Record<string, CanonicalIntakeField | 'ignore' | 'keep_original'> | null = null;
  const columnMappingRaw = formData.get('columnMapping');
  if (columnMappingRaw && String(columnMappingRaw).trim()) {
    try {
      const parsed = JSON.parse(String(columnMappingRaw));
      const validation = validateMapping(parsed as Record<string, string>);
      if (!validation.valid) {
        return NextResponse.json({
          error: `Invalid columnMapping: ${validation.invalidEntries.join(', ')}`,
        }, { status: 400 });
      }
      columnMapping = parsed as Record<string, CanonicalIntakeField | 'ignore' | 'keep_original'>;
    } catch {
      return NextResponse.json({ error: 'columnMapping must be valid JSON.' }, { status: 400 });
    }
  }

  let manualDefaults: Partial<Record<CanonicalIntakeField, string>> | null = null;
  const manualCompletionRaw = formData.get('manualCompletion');
  if (manualCompletionRaw && String(manualCompletionRaw).trim()) {
    try {
      manualDefaults = JSON.parse(String(manualCompletionRaw)) as Partial<Record<CanonicalIntakeField, string>>;
    } catch {
      return NextResponse.json({ error: 'manualCompletion must be valid JSON.' }, { status: 400 });
    }
  }

  // ── Detect file type ─────────────────────────────────────────────────────
  const isCsv  = filename.endsWith('.csv') ||
                 mimeType === 'text/csv' || mimeType === 'application/csv';
  const isXlsx = filename.endsWith('.xlsx') ||
                 mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                 mimeType === 'application/octet-stream';

  if (!isCsv && !isXlsx) {
    return NextResponse.json({
      error: 'File must be a CSV (.csv) or Excel (.xlsx). Legacy .xls format is not supported.',
    }, { status: 400 });
  }
  if (filename.endsWith('.xls') && !filename.endsWith('.xlsx')) {
    return NextResponse.json({
      error: 'Legacy .xls format is not supported. Please save as .xlsx (Excel 2007+).',
    }, { status: 400 });
  }

  // ── File size ─────────────────────────────────────────────────────────────
  if (file.size > MAX_BYTES) {
    return NextResponse.json({
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum allowed: 5 MB.`,
    }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // ══════════════════════════════════════════════════════════════════════════
  // CSV path — existing behaviour unchanged
  // ══════════════════════════════════════════════════════════════════════════

  if (isCsv) {
    const content     = buf.toString('utf-8');
    const parsed      = parseCsvContent(content);
    if (parsed.errors.length > 0) {
      return NextResponse.json({ error: `CSV parse error: ${parsed.errors[0].message}` }, { status: 400 });
    }
    const { headers, rows } = parsed;
    const parseWarnings     = flattenCsvWarnings(parsed);

    if (rows.length > MAX_ROWS) {
      return NextResponse.json({
        error: `Too many rows: ${rows.length}. Maximum allowed: ${MAX_ROWS} data rows.`,
      }, { status: 400 });
    }

    const preview = buildPreviewPayload({
      fileType: 'csv', headers, originalRows: rows,
      columnMapping, manualDefaults, parseWarnings,
    });

    if (preview.piiResult?.rejected) {
      const pii = preview.piiResult;
      if (pii.reason === 'forbidden_headers') {
        return NextResponse.json({
          ok: false, error: 'Batch rejected: forbidden column headers detected.',
          piiStatus: 'rejected', rejectedAt: new Date().toISOString(),
          forbiddenHeaders: pii.forbiddenHeaders,
          note: 'Remove columns containing direct personal identifiers and re-submit.',
          dryRunNote: 'No data has been stored.',
        }, { status: 422 });
      }
      return NextResponse.json({
        ok: false, error: 'Batch rejected: direct personal data detected in file values.',
        piiStatus: 'rejected', rejectedAt: new Date().toISOString(),
        findings: pii.findings, auditSummary: pii.auditSummary,
        note: 'No data has been stored. Remove all direct personal identifiers and re-submit.',
        dryRunNote: 'Dry-run only. No data has been written to Supabase.',
      }, { status: 422 });
    }

    return NextResponse.json({
      ok: true, ...preview,
      dryRunNote: 'File compatible with KORA intake preview. No data has been stored.',
      synthetic_test: false,
      lockedFeatures: [
        'source_batch creation — locked until B4.2',
        'uploaded_record persistence — locked until B4.2',
        'scoring run — locked until B5',
      ],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // XLSX path — B26
  // ══════════════════════════════════════════════════════════════════════════

  // Phase A: No sheet selected → return workbook sheet list + sample
  if (!selectedSheetName) {
    const meta = parseExcelWorkbookMeta(buf);

    // PII scan on all sheet headers for early rejection
    for (const sheet of meta.sheets) {
      const forbiddenFound = sheet.headers.filter(h => FORBIDDEN_HEADERS.has(h));
      if (forbiddenFound.length > 0) {
        return NextResponse.json({
          ok: false,
          error: 'Workbook rejected: forbidden column headers detected.',
          piiStatus: 'rejected', rejectedAt: new Date().toISOString(),
          forbiddenHeaders: forbiddenFound,
          affectedSheet: sheet.sheetName,
          note: 'Remove columns containing direct personal identifiers from all sheets and re-submit.',
          dryRunNote: 'No data has been stored.',
        }, { status: 422 });
      }
    }

    return NextResponse.json({
      ok: true,
      fileType: 'xlsx',
      requiresSheetSelection: true,
      dryRunNote: 'XLSX workbook read. Select a sheet to proceed with intake preview. No data has been stored.',
      sheetCount: meta.sheetNames.length,
      sheets: meta.sheets.map(s => ({
        sheetName:  s.sheetName,
        rowCount:   s.rowCount,
        headers:    s.headers,
        warnings:   s.warnings,
        errors:     s.errors,
        sampleRows: s.sampleRows,
      })),
      lockedFeatures: [
        'intake preview — select a sheet first',
        'source_batch creation — locked until sheet selected and preview passed',
        'scoring run — locked until B5',
      ],
    });
  }

  // Phase B: Sheet selected → parse, mapping, PII check, eligibility preview
  const parsed = parseExcelSheet(buf, selectedSheetName, MAX_ROWS);

  if (parsed.errors.length > 0) {
    return NextResponse.json({
      error: `XLSX sheet error: ${parsed.errors[0].message}`,
      sheetName: selectedSheetName,
    }, { status: 400 });
  }

  const { headers, rows } = parsed;

  if (rows.length > MAX_ROWS) {
    return NextResponse.json({
      error: `Too many rows in sheet "${selectedSheetName}": ${rows.length}. Maximum allowed: ${MAX_ROWS}.`,
    }, { status: 400 });
  }

  const xlsxPreview = buildPreviewPayload({
    fileType: 'xlsx', headers, originalRows: rows,
    columnMapping, manualDefaults, selectedSheetName,
    parseWarnings: parsed.warnings.map(w => w.message),
  });

  if (xlsxPreview.piiResult?.rejected) {
    const pii = xlsxPreview.piiResult;
    if (pii.reason === 'forbidden_headers') {
      return NextResponse.json({
        ok: false, error: 'Sheet rejected: forbidden column headers detected.',
        piiStatus: 'rejected', rejectedAt: new Date().toISOString(),
        forbiddenHeaders: pii.forbiddenHeaders,
        sheetName: selectedSheetName,
        note: 'Remove columns containing direct personal identifiers from this sheet and re-submit.',
        dryRunNote: 'No data has been stored.',
      }, { status: 422 });
    }
    return NextResponse.json({
      ok: false, error: 'Sheet rejected: direct personal data detected in cell values.',
      piiStatus: 'rejected', rejectedAt: new Date().toISOString(),
      findings: pii.findings, auditSummary: pii.auditSummary,
      sheetName: selectedSheetName,
      note: 'No data has been stored. Remove all direct personal identifiers and re-submit.',
      dryRunNote: 'Dry-run only. No data has been written to Supabase.',
    }, { status: 422 });
  }

  return NextResponse.json({
    ok: true, ...xlsxPreview,
    dryRunNote: `Sheet "${selectedSheetName}" compatible with KORA intake preview. No data has been stored.`,
    synthetic_test: false,
    lockedFeatures: [
      'source_batch creation — locked until B4.2',
      'uploaded_record persistence — locked until B4.2',
      'scoring run — locked until B5',
    ],
  });
}
