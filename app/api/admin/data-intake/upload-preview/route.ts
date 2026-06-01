// app/api/admin/data-intake/upload-preview/route.ts
// CSV dry-run preview — KORA_ADMIN only.
//
// DRY-RUN: parses the file, runs PII strict-reject, returns eligibility preview.
// NOTHING is written to Supabase — no source_batch, no uploaded_record, no scoring.
//
// Auth:   KORA_ADMIN session required.
// Input:  multipart/form-data · file (CSV) · tenantCode · reportingPeriod
// Limits: max 2 MB · max 500 data rows · CSV only

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { detectPiiInPayload, summarizePiiFindings } from '@/lib/privacy/pii-guard';
import { classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// ── Limits ───────────────────────────────────────────────────────────────────

const MAX_BYTES    = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS     = 500;

// ── Header blocklist — reject immediately if any CSV column matches ───────────
// PII values (email, CF, IBAN, phone) and person-name / address keys.

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
]);

// ── CSV parser ────────────────────────────────────────────────────────────────
// Handles: BOM, CRLF, comma/semicolon separator.
// No quoted-field support in B4.1 — complex quoting → per-row warning.

function parseCsv(content: string): {
  headers: string[];
  rows: Record<string, string>[];
  warnings: string[];
} {
  const warnings: string[] = [];

  // Strip UTF-8 BOM
  const text = content.replace(/^﻿/, '');

  // Split into lines, skip blank lines
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) throw new Error('Empty file: no content found.');
  if (lines.length < 2) throw new Error('File must contain at least one header row and one data row.');

  // Detect separator: prefer semicolon if more semis than commas in header
  const headerLine = lines[0];
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semiCount  = (headerLine.match(/;/g) ?? []).length;
  const sep = semiCount > commaCount ? ';' : ',';

  // Parse and normalize headers: lowercase, spaces→underscore
  const rawHeaders = headerLine.split(sep);
  if (rawHeaders.length === 0) throw new Error('No headers detected in first row.');

  const headers = rawHeaders.map(h => h.trim().toLowerCase().replace(/[\s-]/g, '_').replace(/[^a-z0-9_]/g, ''));
  if (headers.every(h => h === '')) throw new Error('Header row is empty or contains only special characters.');

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep);
    if (vals.length !== headers.length) {
      warnings.push(`Row ${i}: column count mismatch (expected ${headers.length}, found ${vals.length}) — row included but may be malformed.`);
    }
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = (vals[j] ?? '').trim(); });
    rows.push(row);
  }

  return { headers, rows, warnings };
}

// ── Safe sample row — only known-safe fields for response ─────────────────────

function buildSampleRow(row: Record<string, string>, rowIndex: number, eligibility: string) {
  // Fields safe to surface in preview (no PII, no financial details in B4.1)
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

// ── CSV rows → RawUploadedRecord[] for eligibility gate ──────────────────────

function csvToUploadedRecords(rows: Record<string, string>[]): RawUploadedRecord[] {
  return rows.map((row, i) => ({
    recordId:           `dry-run-row-${i}`,
    batchId:            'dry-run-preview',
    rowIndex:           i,
    detectedRecordType: 'welfare_program',
    raw:                { ...row } as Record<string, unknown>,
  }));
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth — always first, before touching the file
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart/form-data request.' }, { status: 400 });
  }

  const fileEntry = formData.get('file');
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'Missing required field: file (CSV).' }, { status: 400 });
  }

  const file = fileEntry;

  // ── Validate file type — accept .csv or text/csv ──────────────────────────
  const filename  = file.name.toLowerCase();
  const mimeType  = file.type.toLowerCase();
  const isCsvExt  = filename.endsWith('.csv');
  const isCsvMime = mimeType === 'text/csv' || mimeType === 'application/csv' || mimeType === '';
  if (!isCsvExt && !isCsvMime) {
    return NextResponse.json({
      error: 'File must be a CSV (.csv). Excel and other formats are not supported in B4.1.',
    }, { status: 400 });
  }
  if (!isCsvExt) {
    return NextResponse.json({
      error: 'File extension must be .csv.',
    }, { status: 400 });
  }

  // ── Validate file size ───────────────────────────────────────────────────
  if (file.size > MAX_BYTES) {
    return NextResponse.json({
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum allowed: 2 MB.`,
    }, { status: 413 });
  }

  // ── Read content ─────────────────────────────────────────────────────────
  const content = Buffer.from(await file.arrayBuffer()).toString('utf-8');

  // ── Parse CSV ────────────────────────────────────────────────────────────
  let headers: string[];
  let rows: Record<string, string>[];
  let parseWarnings: string[];

  try {
    ({ headers, rows, warnings: parseWarnings } = parseCsv(content));
  } catch (e) {
    return NextResponse.json({
      error: `CSV parse error: ${(e as Error).message}`,
    }, { status: 400 });
  }

  // ── Row count limit ───────────────────────────────────────────────────────
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({
      error: `Too many rows: ${rows.length}. Maximum allowed: ${MAX_ROWS} data rows.`,
    }, { status: 400 });
  }

  // ── Header blocklist check ────────────────────────────────────────────────
  const forbiddenFound = headers.filter(h => FORBIDDEN_HEADERS.has(h));
  if (forbiddenFound.length > 0) {
    return NextResponse.json({
      ok:          false,
      error:       `Batch rejected: forbidden column headers detected.`,
      piiStatus:   'rejected',
      rejectedAt:  new Date().toISOString(),
      forbiddenHeaders: forbiddenFound,
      note:        'Remove columns containing direct personal identifiers (name, email, phone, CF, IBAN, address, health data) and re-submit.',
      dryRunNote:  'No data has been stored.',
    }, { status: 422 });
  }

  // ── PII value scan — per row strict-reject ────────────────────────────────
  const piiFindings: Array<{
    rowIndex: number; fieldPath: string; riskType: string; severity: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const result = detectPiiInPayload(rows[i] as Record<string, unknown>);
    if (result.hasPii) {
      for (const f of result.findings) {
        piiFindings.push({
          rowIndex:  i + 1, // 1-indexed for operator readability
          fieldPath: f.fieldPath,
          riskType:  f.riskType,
          severity:  f.severity,
          // NEVER include: value, rawValue, detectedValue — the PII itself
        });
      }
    }
  }

  if (piiFindings.length > 0) {
    // Summarise for audit — field paths only, no values
    const allRawFindings = rows.flatMap(row => detectPiiInPayload(row as Record<string, unknown>).findings);
    const summary = summarizePiiFindings(allRawFindings);

    return NextResponse.json({
      ok:          false,
      error:       'Batch rejected: direct personal data detected in file values.',
      piiStatus:   'rejected',
      rejectedAt:  new Date().toISOString(),
      findings:    piiFindings,       // rowIndex + fieldPath + riskType + severity — NO values
      auditSummary: {
        totalFindings:     summary.total,
        highSeverityCount: summary.highSeverityCount,
        byRiskType:        summary.byRiskType,
        fieldPaths:        summary.fieldPaths,  // paths only, no values
      },
      note:        'No data has been stored. Remove all direct personal identifiers from the file and re-submit.',
      dryRunNote:  'Dry-run only. No data has been written to Supabase.',
    }, { status: 422 });
  }

  // ── Eligibility preview — runs on parsed records ──────────────────────────
  const records: RawUploadedRecord[] = csvToUploadedRecords(rows);
  const eligResults = classifyEligibilityBatch(records);

  const eligCounts = {
    eligible:       eligResults.filter(e => e.status === 'eligible').length,
    limited:        eligResults.filter(e => e.status === 'limited').length,
    blocked:        eligResults.filter(e => e.status === 'blocked').length,
    reviewRequired: eligResults.filter(e => e.status === 'review_required').length,
    total:          eligResults.length,
  };

  // ── Sample rows — max 5, safe fields only ────────────────────────────────
  const sampleRows = rows
    .slice(0, 5)
    .map((row, i) => buildSampleRow(row, i + 1, eligResults[i]?.status ?? 'unknown'));

  // ── 200 — passed ─────────────────────────────────────────────────────────
  return NextResponse.json({
    ok:               true,
    mode:             'dry_run',
    dryRunNote:       'File compatible with KORA intake preview. No data has been stored.',
    rowCount:         rows.length,
    headerCount:      headers.length,
    piiStatus:        'passed',
    eligibilityPreview: eligCounts,
    sampleRows,
    warnings:         parseWarnings,
    synthetic_test:   false,
    lockedFeatures: [
      'source_batch creation — locked until B4.2',
      'uploaded_record persistence — locked until B4.2',
      'scoring run — locked until B5',
    ],
  });
}
