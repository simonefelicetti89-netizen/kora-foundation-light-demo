// app/api/admin/data-intake/upload-preview/route.ts
// CSV + XLSX dry-run preview — KORA_ADMIN only.
//
// DRY-RUN: parses the file, runs PII strict-reject, returns eligibility preview.
// NOTHING is written to Supabase — no source_batch, no uploaded_record, no scoring.
//
// Auth:   KORA_ADMIN session required.
// Input:  multipart/form-data · file (CSV or XLSX) · tenantCode · reportingPeriod
//         · selectedSheetName (XLSX only, optional — omit for workbook sheet list)
// Limits: max 5 MB · max 500 data rows · CSV or XLSX only
//
// B26: XLSX multi-sheet support.
//   - XLSX without selectedSheetName → returns sheet list + sample (no persistence)
//   - XLSX with selectedSheetName → parses sheet, runs PII, returns eligibility preview

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { detectPiiInPayload, summarizePiiFindings } from '@/lib/privacy/pii-guard';
import { classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';
import { parseCsvContent, flattenCsvWarnings } from '@/lib/data-intake/csv-parser';
import { parseExcelWorkbookMeta, parseExcelSheet } from '@/lib/data-intake/excel-parser';
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

  const fileEntry = formData.get('file');
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'Missing required field: file.' }, { status: 400 });
  }

  const file             = fileEntry;
  const filename         = file.name.toLowerCase();
  const mimeType         = file.type.toLowerCase();
  const selectedSheet    = formData.get('selectedSheetName');
  const selectedSheetName = selectedSheet ? String(selectedSheet).trim() : null;

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

    const pii = runPiiCheck(headers, rows);
    if (pii.rejected) {
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

    const records    = toUploadedRecords(rows);
    const eligResults = classifyEligibilityBatch(records);
    const eligCounts = {
      eligible:       eligResults.filter(e => e.status === 'eligible').length,
      limited:        eligResults.filter(e => e.status === 'limited').length,
      blocked:        eligResults.filter(e => e.status === 'blocked').length,
      reviewRequired: eligResults.filter(e => e.status === 'review_required').length,
      total:          eligResults.length,
    };
    const sampleRows = rows
      .slice(0, 5)
      .map((row, i) => buildSampleRow(row, i + 1, eligResults[i]?.status ?? 'unknown'));

    return NextResponse.json({
      ok: true, fileType: 'csv', mode: 'dry_run',
      dryRunNote: 'File compatible with KORA intake preview. No data has been stored.',
      rowCount: rows.length, headerCount: headers.length,
      piiStatus: 'passed', eligibilityPreview: eligCounts,
      sampleRows, warnings: parseWarnings, synthetic_test: false,
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

  // Phase B: Sheet selected → parse, PII check, eligibility preview
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

  const pii = runPiiCheck(headers, rows, selectedSheetName);
  if (pii.rejected) {
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

  const records    = toUploadedRecords(rows);
  const eligResults = classifyEligibilityBatch(records);
  const eligCounts = {
    eligible:       eligResults.filter(e => e.status === 'eligible').length,
    limited:        eligResults.filter(e => e.status === 'limited').length,
    blocked:        eligResults.filter(e => e.status === 'blocked').length,
    reviewRequired: eligResults.filter(e => e.status === 'review_required').length,
    total:          eligResults.length,
  };
  const sampleRows = rows
    .slice(0, 5)
    .map((row, i) => buildSampleRow(row, i + 1, eligResults[i]?.status ?? 'unknown'));

  return NextResponse.json({
    ok: true, fileType: 'xlsx', mode: 'dry_run',
    selectedSheetName,
    dryRunNote: `Sheet "${selectedSheetName}" compatible with KORA intake preview. No data has been stored.`,
    rowCount: rows.length, headerCount: headers.length,
    piiStatus: 'passed', eligibilityPreview: eligCounts,
    sampleRows, warnings: parsed.warnings.map(w => w.message),
    synthetic_test: false,
    lockedFeatures: [
      'source_batch creation — locked until B4.2',
      'uploaded_record persistence — locked until B4.2',
      'scoring run — locked until B5',
    ],
  });
}
