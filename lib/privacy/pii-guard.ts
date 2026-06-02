// lib/privacy/pii-guard.ts
// Server-side PII detection and redaction for KORA data intake payloads.
//
// PURPOSE: intercept obvious PII before it reaches personal.uploaded_record.
// This is a safety layer, NOT a legal guarantee.
// It does not replace pseudonimizzazione all'origine, DPA, or contract terms.
//
// CRITICAL INVARIANT: PII values are NEVER included in findings, audit events,
// error messages, or log output. Only field paths, risk types, and severity are
// returned. Sanitized payloads replace values with [REDACTED_PII:TYPE].
//
// Detects:
//   EMAIL                — email pattern in string values
//   PHONE                — international prefix or 9+ consecutive digit strings
//   ITALIAN_CF           — Italian codice fiscale pattern (16 chars)
//   IBAN                 — IBAN pattern
//   SUSPICIOUS_NAME_KEY  — keys: name, nome, cognome, full_name, etc.
//   DIRECT_IDENTIFIER_KEY — keys: email, phone, codice_fiscale, iban, etc.
//   ADDRESS_KEY          — keys: address, indirizzo, via, street, etc.
//
// False-positive avoidance:
//   - Numbers (not strings) skip phone detection
//   - Short digit sequences (< 9) are not flagged as phone
//   - Keys checked by EXACT match only (not substring) to avoid flagging
//     nome_iniziativa, nome_programma, etc.

export type PiiRiskType =
  | 'EMAIL'
  | 'PHONE'
  | 'ITALIAN_CF'
  | 'IBAN'
  | 'SUSPICIOUS_NAME_KEY'
  | 'DIRECT_IDENTIFIER_KEY'
  | 'ADDRESS_KEY';

export type PiiSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PiiFinding {
  fieldPath:  string;       // dot-path, e.g. "worker.email"
  riskType:   PiiRiskType;
  severity:   PiiSeverity;
  // NEVER include: value, originalValue, detectedValue, or any PII content
}

export interface PiiScanResult {
  hasPii:    boolean;
  findings:  PiiFinding[];
  // Safe to pass to audit events — no PII values
}

export interface PiiSanitizeResult {
  sanitized:     Record<string, unknown>;
  findingsCount: number;
  fieldsRedacted: string[];  // field paths only, no values
}

// ── Detection patterns ────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

// Italian CF: exactly AAAAAA99A99A999A (6 letters, 2 digits, letter, 2 digits, letter, 3 digits, letter)
// Use case-insensitive, require word boundary or string boundary.
const ITALIAN_CF_RE = /(?:^|[\s,;|])[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z](?:$|[\s,;|])/i;

// IBAN: 2 letters, 2 digits, then 4-34 alphanumeric chars.
// Compact: IT60X0542811101000000123456
// Spaced IBANs (IT60 X054 2811 ...) are handled by normalizing the value before testing.
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{0,16}\b/;

// Phone: covers compact + spaced Italian patterns.
// 1. International prefix: +XX then per-digit optional separators (catches +39 333 1234567)
// 2. 00-prefix international
// 3. 9+ consecutive digits (compact mobile/landline)
// 4. Spaced Italian: NNN NNN NNNN or NN NNNN NNNN (mobile + landline)
// Economic fields (amount, budget, importo…) are excluded at detection time — see ECONOMIC_FIELD_KEYS.
const PHONE_RE = /(\+\d{1,3}[\s\-.]?(\d[\s\-.]?){6,15}|00\d{2,3}[\s\-.]?\d{5,}|\b\d{9,}\b|\b\d{2,3}[\s\-.]\d{3,4}[\s\-.]\d{3,4}\b)/;

// Field names where PHONE detection is suppressed to avoid false positives on amounts/codes.
const ECONOMIC_FIELD_KEYS = new Set([
  'amount', 'budget_amount', 'importo', 'costo', 'budget', 'budget_code',
  'participants', 'partecipanti', 'workers', 'lavoratori',
  'initiative_id', 'id', 'code', 'codice', 'period', 'source_code',
  'count', 'total', 'totale', 'numero', 'quantity', 'quantita',
]);

// ── Key-based detection (exact match, case-insensitive) ────────────────────────

// Keys that are direct personal identifiers — flag regardless of value
const DIRECT_ID_KEYS = new Set([
  'email', 'phone', 'telefono', 'mobile', 'cel', 'cellulare',
  'codice_fiscale', 'cf', 'tax_code', 'fiscal_code', 'codice_fiscale_lavoratore',
  'iban', 'bic', 'iban_number',
  'matricola',  // employee registry number — direct identifier in Italian HR systems
]);

// Keys that suggest person names — flag with MEDIUM severity
const NAME_KEYS = new Set([
  'name', 'first_name', 'last_name', 'surname', 'nome', 'cognome',
  'full_name', 'employee_name', 'nominativo', 'worker_name',
  'nome_lavoratore', 'cognome_lavoratore',
]);

// Keys that suggest addresses — flag with LOW severity
const ADDRESS_KEYS = new Set([
  'address', 'indirizzo', 'street', 'via', 'citta', 'city', 'cap',
  'domicilio', 'residenza',
]);

// ── Value-based detection ─────────────────────────────────────────────────────

function detectInString(value: string, path: string, fieldKey: string): PiiFinding[] {
  const findings: PiiFinding[] = [];

  if (EMAIL_RE.test(value)) {
    findings.push({ fieldPath: path, riskType: 'EMAIL', severity: 'HIGH' });
  }
  if (ITALIAN_CF_RE.test(` ${value} `)) {
    findings.push({ fieldPath: path, riskType: 'ITALIAN_CF', severity: 'HIGH' });
  }

  // IBAN: normalize (strip spaces/dashes, uppercase) before testing.
  // Catches both compact (IT60X054...) and spaced (IT60 X054 2811 ...) IBANs.
  const normalizedForIban = value.toUpperCase().replace(/[\s\-]/g, '');
  if (IBAN_RE.test(normalizedForIban)) {
    findings.push({ fieldPath: path, riskType: 'IBAN', severity: 'HIGH' });
  }

  // PHONE: suppress for economic fields to avoid flagging large amounts or participant counts.
  if (!ECONOMIC_FIELD_KEYS.has(fieldKey) && PHONE_RE.test(value)) {
    findings.push({ fieldPath: path, riskType: 'PHONE', severity: 'MEDIUM' });
  }

  return findings;
}

// ── Recursive payload scanner ─────────────────────────────────────────────────

function scanRecursive(
  obj: unknown,
  path: string,
  findings: PiiFinding[],
): void {
  if (obj === null || obj === undefined) return;

  if (typeof obj === 'string') {
    // Extract leaf field name for context-aware detection (e.g. skip PHONE on amount fields).
    const fieldKey = path.split('.').pop()?.replace(/\[\d+\]$/, '') ?? path;
    findings.push(...detectInString(obj, path, fieldKey));
    return;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    // Numbers and booleans: skip pattern detection (avoids flagging counts/amounts)
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => scanRecursive(item, `${path}[${i}]`, findings));
    return;
  }

  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const childPath = path ? `${path}.${key}` : key;
      const keyLower = key.toLowerCase();

      // Key-based detection (exact match)
      if (DIRECT_ID_KEYS.has(keyLower)) {
        findings.push({ fieldPath: childPath, riskType: 'DIRECT_IDENTIFIER_KEY', severity: 'HIGH' });
      } else if (NAME_KEYS.has(keyLower)) {
        findings.push({ fieldPath: childPath, riskType: 'SUSPICIOUS_NAME_KEY', severity: 'MEDIUM' });
      } else if (ADDRESS_KEYS.has(keyLower)) {
        findings.push({ fieldPath: childPath, riskType: 'ADDRESS_KEY', severity: 'LOW' });
      }

      // Recurse into value
      scanRecursive(value, childPath, findings);
    }
  }
}

// ── Recursive payload sanitizer ───────────────────────────────────────────────

function sanitizeRecursive(
  obj: unknown,
  path: string,
  findingPaths: ReadonlySet<string>,
): unknown {
  if (obj === null || obj === undefined || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (typeof obj === 'string') {
    if (findingPaths.has(path)) {
      // Determine which type was found and redact
      // We don't have the type here, use generic redaction
      return '[REDACTED_PII]';
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, i) => sanitizeRecursive(item, `${path}[${i}]`, findingPaths));
  }

  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      const childPath = path ? `${path}.${key}` : key;
      const keyLower = key.toLowerCase();

      // If this key is a direct identifier, redact the value
      if (
        DIRECT_ID_KEYS.has(keyLower) ||
        NAME_KEYS.has(keyLower) ||
        ADDRESS_KEYS.has(keyLower) ||
        findingPaths.has(childPath)
      ) {
        result[key] = `[REDACTED_PII:${keyLower.toUpperCase()}]`;
      } else {
        result[key] = sanitizeRecursive(value, childPath, findingPaths);
      }
    }
    return result;
  }

  return obj;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Scan a payload for PII. Returns findings (no values).
 * Safe to use in audit events and logs.
 */
export function detectPiiInPayload(
  payload: Record<string, unknown>,
): PiiScanResult {
  const findings: PiiFinding[] = [];
  scanRecursive(payload, '', findings);
  // Deduplicate by fieldPath+riskType
  const seen = new Set<string>();
  const deduped = findings.filter(f => {
    const key = `${f.fieldPath}:${f.riskType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { hasPii: deduped.length > 0, findings: deduped };
}

/**
 * Sanitize a payload, replacing PII values with [REDACTED_PII:TYPE].
 * Returns the sanitized payload and metadata — NEVER the original PII values.
 */
export function sanitizePayload(
  payload: Record<string, unknown>,
): PiiSanitizeResult {
  const { findings } = detectPiiInPayload(payload);
  if (findings.length === 0) {
    return { sanitized: payload, findingsCount: 0, fieldsRedacted: [] };
  }

  const findingPaths = new Set(findings.map(f => f.fieldPath));
  const sanitized = sanitizeRecursive(payload, '', findingPaths) as Record<string, unknown>;

  return {
    sanitized,
    findingsCount: findings.length,
    fieldsRedacted: findings.map(f => f.fieldPath), // paths only, no values
  };
}

/**
 * Returns true if the payload is PII-free.
 */
export function validateNoPii(payload: Record<string, unknown>): boolean {
  return !detectPiiInPayload(payload).hasPii;
}

/**
 * Safe summary of findings for audit events.
 * NEVER includes PII values — only field paths, types, and counts.
 */
export function summarizePiiFindings(findings: PiiFinding[]): {
  total: number;
  byRiskType: Partial<Record<PiiRiskType, number>>;
  highSeverityCount: number;
  fieldPaths: string[];  // paths only
} {
  const byRiskType: Partial<Record<PiiRiskType, number>> = {};
  for (const f of findings) {
    byRiskType[f.riskType] = (byRiskType[f.riskType] ?? 0) + 1;
  }
  return {
    total: findings.length,
    byRiskType,
    highSeverityCount: findings.filter(f => f.severity === 'HIGH').length,
    fieldPaths: findings.map(f => f.fieldPath),
  };
}
