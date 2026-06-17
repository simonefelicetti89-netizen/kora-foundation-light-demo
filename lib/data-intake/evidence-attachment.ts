// lib/data-intake/evidence-attachment.ts
// B31: Evidence Attachment & Document Parser Light.
// Metadata-only attachment registry — no binary storage, no LLM, no OCR.
//
// Design constraints:
//   - Server-side only (Node.js runtime).
//   - Pure metadata extraction — NO raw document content, NO full text.
//   - PII guard on filenames, sheet names, headers, and CSV/XLSX cell samples.
//   - Evidence level is SUGGESTION only — never applied to scoring automatically.
//   - No public URL generation.
//   - Reuses excel-parser and csv-parser for structured formats.
//   - PDF: magic-byte check + file size only (no text extraction in B31).
//   - DOCX: unsupported in B31.

import { parseCsvContent } from './csv-parser';
import { parseExcelWorkbookMeta } from './excel-parser';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EvidenceAttachmentType =
  | 'invoice'
  | 'provider_export'
  | 'lms_report'
  | 'policy_document'
  | 'contract'
  | 'budget_report'
  | 'attendance_report'
  | 'coverage_report'
  | 'other';

export type EvidenceAttachmentScope = 'batch' | 'initiative' | 'field';

export type EvidenceParserStatus =
  | 'metadata_only'      // file accepted but only size/type extracted
  | 'parsed_metadata'    // headers/sheets extracted (CSV/XLSX)
  | 'rejected_pii'       // PII found — rejected
  | 'rejected_size'      // file too large
  | 'unsupported'        // file type not supported in B31
  | 'needs_review';      // parsed but operator review required

export type EvidenceAttachmentMetadata = {
  attachmentId: string;
  fileNameSafe: string;              // sanitized, no PII
  fileSizeBytes: number;
  fileType: 'pdf' | 'xlsx' | 'csv' | 'docx' | 'unknown';
  attachmentType: EvidenceAttachmentType;
  scope: EvidenceAttachmentScope;
  linkedInitiativeName?: string;     // safe name, no PII
  linkedField?: string;              // canonical field name
  linkedBatchId?: string;

  sourceStrength: 'strong' | 'medium' | 'weak' | 'unknown';
  evidenceLevelSuggestion: 'L0' | 'L1' | 'L2' | 'L3' | null;
  evidenceLevelCaveat: string;

  parserStatus: EvidenceParserStatus;

  extractedMetadata?: {
    pageCount?: number;              // PDF page count (if determinable)
    sheetCount?: number;             // XLSX sheet count
    sheetNames?: string[];           // XLSX sheet names (sanitized)
    headerCount?: number;            // CSV/XLSX header count
    rowCount?: number;               // CSV/XLSX row count
    detectedPeriod?: string | null;  // period hint from content (safe, no values)
    detectedProviderHint?: boolean;  // provider-like content detected
    detectedAmountHint?: boolean;    // amount-like header detected
    detectedParticipantHint?: boolean; // participant-like header detected
  };

  piiFindings?: Array<{             // no values, only field paths
    location: string;               // 'filename' | 'header:X' | 'sheetname:X'
    riskType: string;
    severity: string;
  }>;

  caveats: string[];
  createdAt: string;
};

// ── PII patterns ──────────────────────────────────────────────────────────────

const PII_FILENAME_PATTERNS = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,  // email (no \b — handles compound filenames)
  /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i,          // Italian CF
  /\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/,                      // phone (no leading \b — handles _333-xxx)
];

const PII_HEADER_PATTERNS = new Set([
  'email', 'e-mail', 'email_address', 'mail',
  'phone', 'telefono', 'mobile', 'cel', 'cellulare',
  'codice_fiscale', 'cf', 'tax_code', 'fiscal_code',
  'iban', 'bic', 'nome', 'cognome', 'full_name', 'name',
  'first_name', 'last_name', 'surname', 'nominativo',
  'matricola', 'worker_id', 'employee_id',
]);

const AMOUNT_HEADER_HINTS = new Set([
  'amount', 'importo', 'costo', 'budget', 'spesa', 'valore', 'total', 'totale',
]);
const PARTICIPANT_HEADER_HINTS = new Set([
  'participants', 'partecipanti', 'beneficiari', 'utenti', 'fruitori',
  'attendance', 'completamento', 'completion',
]);

// ── File size limits ──────────────────────────────────────────────────────────

const MAX_SIZE_PDF  = 20 * 1024 * 1024;   // 20 MB
const MAX_SIZE_XLSX = 10 * 1024 * 1024;   // 10 MB
const MAX_SIZE_CSV  =  5 * 1024 * 1024;   // 5 MB
const MAX_SIZE_OTHER =  5 * 1024 * 1024;  // 5 MB

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  const base = name.trim().slice(0, 100);
  if (PII_FILENAME_PATTERNS.some(p => p.test(base))) {
    const ext = base.split('.').pop() ?? '';
    return `[document].${ext}`;
  }
  // Remove path separators, keep only basename
  return base.replace(/[/\\]/g, '_').replace(/[^\w.\-\s]/g, '_');
}

function detectFileType(fileName: string, mimeType: string): EvidenceAttachmentMetadata['fileType'] {
  const fn = fileName.toLowerCase();
  if (fn.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
  if (fn.endsWith('.xlsx') || mimeType.includes('spreadsheetml')) return 'xlsx';
  if (fn.endsWith('.csv') || mimeType.includes('csv') || mimeType === 'text/plain') return 'csv';
  if (fn.endsWith('.docx') || mimeType.includes('wordprocessingml')) return 'docx';
  return 'unknown';
}

function getMaxSize(ft: EvidenceAttachmentMetadata['fileType']): number {
  if (ft === 'pdf')  return MAX_SIZE_PDF;
  if (ft === 'xlsx') return MAX_SIZE_XLSX;
  if (ft === 'csv')  return MAX_SIZE_CSV;
  return MAX_SIZE_OTHER;
}

function suggestEvidenceLevel(
  attachmentType: EvidenceAttachmentType,
  parserStatus: EvidenceParserStatus,
): { level: 'L0' | 'L1' | 'L2' | 'L3' | null; strength: 'strong' | 'medium' | 'weak' | 'unknown'; caveat: string } {
  if (parserStatus === 'unsupported' || parserStatus === 'rejected_pii') {
    return { level: null, strength: 'unknown', caveat: 'File not parsed — evidence level cannot be suggested.' };
  }
  switch (attachmentType) {
    case 'invoice':
    case 'provider_export':
    case 'lms_report':
    case 'attendance_report':
      return { level: 'L3', strength: 'strong', caveat: 'Suggestion L3 requires UEF Review / operator approval. KORA does not auto-apply evidence levels to scoring.' };
    case 'contract':
    case 'budget_report':
    case 'coverage_report':
      return { level: 'L2', strength: 'medium', caveat: 'Suggestion L2. Document review required before scoring.' };
    case 'policy_document':
      return { level: 'L2', strength: 'medium', caveat: 'Policy documents suggest L2 for structural policy presence, not usage proof. Uptake/usage data still required for meaningful activation.' };
    case 'other':
      return { level: 'L1', strength: 'weak', caveat: 'Generic document suggests L1. Operator must verify before applying to scoring.' };
    default:
      return { level: 'L1', strength: 'unknown', caveat: 'Evidence level requires manual review.' };
  }
}

function isPdfBuffer(buf: Buffer): boolean {
  // PDF magic bytes: %PDF
  return buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
}

function estimatePdfPageCount(buf: Buffer): number | undefined {
  // Simple heuristic: count '/Page ' occurrences in the PDF structure
  // Not accurate but gives an order-of-magnitude estimate without a full parser
  try {
    const text = buf.toString('latin1');
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    return matches?.length;
  } catch {
    return undefined;
  }
}

function sanitizeSheetName(s: string): string {
  const t = s.trim().slice(0, 50);
  if (PII_FILENAME_PATTERNS.some(p => p.test(t))) return '[sheet]';
  return t;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export async function parseAttachmentMetadata(params: {
  file: File;
  attachmentType: EvidenceAttachmentType;
  scope: EvidenceAttachmentScope;
  linkedInitiativeName?: string;
  linkedField?: string;
  linkedBatchId?: string;
}): Promise<EvidenceAttachmentMetadata> {
  const { file, attachmentType, scope, linkedInitiativeName, linkedField, linkedBatchId } = params;

  const attachmentId = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const fileNameSafe = sanitizeFileName(file.name);
  const fileType     = detectFileType(file.name, file.type.toLowerCase());
  const fileSizeBytes = file.size;
  const createdAt    = new Date().toISOString();
  const caveats: string[] = [
    'B31 metadata-only attachment — document contents are never stored or exposed.',
    'Evidence level is a suggestion; it requires UEF Review / operator approval before affecting scoring.',
  ];
  const piiFindings: EvidenceAttachmentMetadata['piiFindings'] = [];

  // Size check
  if (fileSizeBytes > getMaxSize(fileType)) {
    return {
      attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
      linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
      linkedField, linkedBatchId,
      sourceStrength: 'unknown', evidenceLevelSuggestion: null,
      evidenceLevelCaveat: 'File too large — evidence level cannot be suggested.',
      parserStatus: 'rejected_size',
      caveats: [...caveats, `File exceeds size limit for ${fileType.toUpperCase()} attachments.`],
      createdAt,
    };
  }

  // PII check on filename
  if (PII_FILENAME_PATTERNS.some(p => p.test(file.name))) {
    piiFindings.push({ location: 'filename', riskType: 'personal_identifier', severity: 'high' });
  }

  // Unsupported types
  if (fileType === 'docx' || fileType === 'unknown') {
    const { level, strength, caveat } = suggestEvidenceLevel(attachmentType, 'unsupported');
    return {
      attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
      linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
      linkedField, linkedBatchId,
      sourceStrength: strength, evidenceLevelSuggestion: level,
      evidenceLevelCaveat: caveat,
      parserStatus: 'unsupported',
      caveats: [...caveats, `${fileType.toUpperCase()} parsing not supported in B31. Metadata only.`],
      createdAt,
    };
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // ── PDF ────────────────────────────────────────────────────────────────────
  if (fileType === 'pdf') {
    if (!isPdfBuffer(buf)) {
      return {
        attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
        linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
        linkedField, linkedBatchId,
        sourceStrength: 'unknown', evidenceLevelSuggestion: null,
        evidenceLevelCaveat: 'File does not appear to be a valid PDF.',
        parserStatus: 'needs_review',
        caveats: [...caveats, 'PDF magic bytes not detected.'],
        createdAt,
      };
    }

    const pageCount = estimatePdfPageCount(buf);
    const { level, strength, caveat } = suggestEvidenceLevel(attachmentType, 'metadata_only');
    if (piiFindings.length > 0) {
      return {
        attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
        linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
        linkedField, linkedBatchId,
        sourceStrength: 'unknown', evidenceLevelSuggestion: null,
        evidenceLevelCaveat: 'PII detected in filename.',
        parserStatus: 'rejected_pii', piiFindings,
        caveats: [...caveats, 'Filename contains personal identifier patterns.'],
        createdAt,
      };
    }

    return {
      attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
      linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
      linkedField, linkedBatchId,
      sourceStrength: strength, evidenceLevelSuggestion: level, evidenceLevelCaveat: caveat,
      parserStatus: 'metadata_only',
      extractedMetadata: { pageCount },
      caveats,
      createdAt,
    };
  }

  // ── XLSX ───────────────────────────────────────────────────────────────────
  if (fileType === 'xlsx') {
    const meta = await parseExcelWorkbookMeta(buf);
    const allHeaders: string[] = meta.sheets.flatMap(s => s.headers);
    const safeSheetNames = meta.sheets.map(s => sanitizeSheetName(s.sheetName));

    // PII check on sheet names
    for (const orig of meta.sheets.map(s => s.sheetName)) {
      if (PII_FILENAME_PATTERNS.some(p => p.test(orig))) {
        piiFindings.push({ location: `sheetname:${orig.slice(0, 20)}`, riskType: 'personal_identifier', severity: 'medium' });
      }
    }

    // PII check on headers
    for (const h of allHeaders) {
      const norm = h.toLowerCase().trim().replace(/\s+/g, '_');
      if (PII_HEADER_PATTERNS.has(norm)) {
        piiFindings.push({ location: `header:${h.slice(0, 30)}`, riskType: 'personal_identifier', severity: 'high' });
      }
    }

    if (piiFindings.length > 0) {
      return {
        attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
        linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
        linkedField, linkedBatchId,
        sourceStrength: 'unknown', evidenceLevelSuggestion: null,
        evidenceLevelCaveat: 'PII detected — attachment rejected.',
        parserStatus: 'rejected_pii', piiFindings,
        caveats: [...caveats, 'Sheet names or headers contain personal identifier patterns.'],
        createdAt,
      };
    }

    const totalRows = meta.sheets.reduce((s, sh) => s + sh.rowCount, 0);
    const detectedAmountHint = allHeaders.some(h => AMOUNT_HEADER_HINTS.has(h.toLowerCase().trim()));
    const detectedParticipantHint = allHeaders.some(h => PARTICIPANT_HEADER_HINTS.has(h.toLowerCase().trim()));
    const { level, strength, caveat } = suggestEvidenceLevel(attachmentType, 'parsed_metadata');

    return {
      attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
      linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
      linkedField, linkedBatchId,
      sourceStrength: strength, evidenceLevelSuggestion: level, evidenceLevelCaveat: caveat,
      parserStatus: 'parsed_metadata',
      extractedMetadata: {
        sheetCount: meta.sheetNames.length,
        sheetNames: safeSheetNames,
        headerCount: allHeaders.length,
        rowCount: totalRows,
        detectedAmountHint,
        detectedParticipantHint,
      },
      caveats,
      createdAt,
    };
  }

  // ── CSV ────────────────────────────────────────────────────────────────────
  if (fileType === 'csv') {
    const content = buf.toString('utf-8');
    const parsed  = parseCsvContent(content);

    if (parsed.errors.length > 0) {
      return {
        attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
        linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
        linkedField, linkedBatchId,
        sourceStrength: 'unknown', evidenceLevelSuggestion: null,
        evidenceLevelCaveat: 'CSV parse error.',
        parserStatus: 'needs_review',
        caveats: [...caveats, `Parse error: ${parsed.errors[0].message}`],
        createdAt,
      };
    }

    // PII check on headers
    for (const h of parsed.headers) {
      const norm = h.toLowerCase().trim().replace(/\s+/g, '_');
      if (PII_HEADER_PATTERNS.has(norm)) {
        piiFindings.push({ location: `header:${h.slice(0, 30)}`, riskType: 'personal_identifier', severity: 'high' });
      }
    }

    if (piiFindings.length > 0) {
      return {
        attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
        linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
        linkedField, linkedBatchId,
        sourceStrength: 'unknown', evidenceLevelSuggestion: null,
        evidenceLevelCaveat: 'PII in headers — attachment rejected.',
        parserStatus: 'rejected_pii', piiFindings,
        caveats: [...caveats, 'CSV headers contain personal identifier patterns.'],
        createdAt,
      };
    }

    const detectedAmountHint = parsed.headers.some(h => AMOUNT_HEADER_HINTS.has(h.toLowerCase().trim()));
    const detectedParticipantHint = parsed.headers.some(h => PARTICIPANT_HEADER_HINTS.has(h.toLowerCase().trim()));
    const { level, strength, caveat } = suggestEvidenceLevel(attachmentType, 'parsed_metadata');

    return {
      attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
      linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
      linkedField, linkedBatchId,
      sourceStrength: strength, evidenceLevelSuggestion: level, evidenceLevelCaveat: caveat,
      parserStatus: 'parsed_metadata',
      extractedMetadata: {
        headerCount: parsed.headers.length,
        rowCount: parsed.rows.length,
        detectedAmountHint,
        detectedParticipantHint,
      },
      caveats,
      createdAt,
    };
  }

  // Fallback
  const { level, strength, caveat } = suggestEvidenceLevel(attachmentType, 'metadata_only');
  return {
    attachmentId, fileNameSafe, fileSizeBytes, fileType, attachmentType, scope,
    linkedInitiativeName: linkedInitiativeName?.slice(0, 80),
    linkedField, linkedBatchId,
    sourceStrength: strength, evidenceLevelSuggestion: level, evidenceLevelCaveat: caveat,
    parserStatus: 'metadata_only',
    caveats,
    createdAt,
  };
}

// ── Safe metadata summary (for payload_sample / Evidence Archive) ─────────────

export function buildAttachmentSummary(attachments: EvidenceAttachmentMetadata[]): Record<string, unknown> {
  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  let strongCount = 0;

  for (const att of attachments) {
    typeCounts[att.attachmentType] = (typeCounts[att.attachmentType] ?? 0) + 1;
    statusCounts[att.parserStatus] = (statusCounts[att.parserStatus] ?? 0) + 1;
    if (att.sourceStrength === 'strong') strongCount++;
  }

  return {
    count: attachments.length,
    typeCounts,
    statusCounts,
    strongCount,
    suggestedL3Count: attachments.filter(a => a.evidenceLevelSuggestion === 'L3').length,
    suggestedL2Count: attachments.filter(a => a.evidenceLevelSuggestion === 'L2').length,
    // no raw values, no file paths, no document content
  };
}
