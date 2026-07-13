// lib/admin/bulk-worker-parser.ts
// WORKER-BULK-PROVISIONING-01 — pilot-friendly paste/CSV parser for bulk
// worker provisioning.
//
// Pure functions only. No DB, no Supabase, no fetch, no side effects — safe
// to import from both the client (live preview as the admin types/pastes)
// and the server (defense-in-depth re-validation in the bulk-provision API
// route, even though the client already validated).
//
// Accepted input, one worker per line:
//   - CSV with header:      firstName,lastName,email
//   - CSV without header:   Mario,Rossi,mario.rossi@example.com
//   - Name + angle email:   Mario Rossi <mario.rossi@example.com>
//   - Bare email:           mario.rossi@example.com
//
// firstName/lastName are for admin-facing preview legibility only — the
// caller (the bulk-provision route) must never persist them to
// personal.worker_identity or anywhere else. Only email (required by
// Supabase Auth) and an opaque workerRef are ever provisioned, matching the
// single-worker route's existing privacy invariant.

export interface ParsedWorkerInput {
  firstName?: string;
  lastName?: string;
  email: string;
  workerRef?: string;
}

export interface ParsedWorkerRow {
  lineNumber: number;
  raw: string;
  worker: ParsedWorkerInput | null;
  error: string | null;
}

export interface ParseBulkWorkerInputResult {
  rows: ParsedWorkerRow[];
  validWorkers: ParsedWorkerInput[];
  errorCount: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function looksLikeEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

// "Mario Rossi <mario.rossi@example.com>"
const NAME_ANGLE_EMAIL_REGEX = /^(.*)<([^>]+)>\s*$/;

function parseLine(raw: string): { worker: ParsedWorkerInput | null; error: string | null } {
  const line = raw.trim();

  const angle = line.match(NAME_ANGLE_EMAIL_REGEX);
  if (angle) {
    const namePart = angle[1].trim();
    const email = angle[2].trim();
    if (!looksLikeEmail(email)) return { worker: null, error: `Email non valida: "${email}"` };
    const nameTokens = namePart.split(/\s+/).filter(Boolean);
    const firstName = nameTokens[0];
    const lastName = nameTokens.slice(1).join(' ') || undefined;
    return { worker: { firstName: firstName || undefined, lastName, email: email.toLowerCase() }, error: null };
  }

  const parts = line.split(',').map((p) => p.trim()).filter((p) => p.length > 0);

  if (parts.length === 1) {
    if (!looksLikeEmail(parts[0])) return { worker: null, error: `Riga non riconosciuta: "${raw}"` };
    return { worker: { email: parts[0].toLowerCase() }, error: null };
  }

  if (parts.length === 2) {
    const [first, second] = parts;
    if (looksLikeEmail(second)) {
      return { worker: { firstName: first || undefined, email: second.toLowerCase() }, error: null };
    }
    if (looksLikeEmail(first)) {
      return { worker: { firstName: second || undefined, email: first.toLowerCase() }, error: null };
    }
    return { worker: null, error: `Nessuna email valida trovata nella riga: "${raw}"` };
  }

  if (parts.length === 3) {
    const [firstName, lastName, email] = parts;
    if (looksLikeEmail(email)) {
      return { worker: { firstName: firstName || undefined, lastName: lastName || undefined, email: email.toLowerCase() }, error: null };
    }
    // Email might be in a different column position — find it, keep the rest as names in order.
    const emailIdx = parts.findIndex(looksLikeEmail);
    if (emailIdx === -1) return { worker: null, error: `Nessuna email valida trovata nella riga: "${raw}"` };
    const others = parts.filter((_, i) => i !== emailIdx);
    return { worker: { firstName: others[0] || undefined, lastName: others[1] || undefined, email: parts[emailIdx].toLowerCase() }, error: null };
  }

  return { worker: null, error: `Troppi campi (${parts.length}) nella riga: "${raw}"` };
}

const HEADER_HINT_WORDS = ['firstname', 'first_name', 'nome', 'lastname', 'last_name', 'cognome'];

function looksLikeHeaderRow(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes('email') && HEADER_HINT_WORDS.some((w) => lower.includes(w));
}

export function parseBulkWorkerInput(input: string): ParseBulkWorkerInputResult {
  const lines = input.split(/\r?\n/);
  const rows: ParsedWorkerRow[] = [];

  let startIndex = 0;
  if (lines.length > 0 && looksLikeHeaderRow(lines[0])) {
    startIndex = 1; // header row is skipped entirely, not counted as data
  }

  for (let i = startIndex; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue; // blank lines are skipped silently, not an error

    const { worker, error } = parseLine(raw);
    rows.push({ lineNumber: i + 1, raw, worker, error });
  }

  const validWorkers = rows
    .filter((r): r is ParsedWorkerRow & { worker: ParsedWorkerInput } => r.worker !== null && r.error === null)
    .map((r) => r.worker);
  const errorCount = rows.filter((r) => r.error !== null).length;

  return { rows, validWorkers, errorCount };
}

// ── Batch-level validation ──────────────────────────────────────────────────
// Pilot-scale safety cap — conservative on purpose. Not a DB or Supabase
// limit, just a deliberate ceiling to keep bulk batches reviewable and to
// avoid bursting the Supabase Admin API invite rate.

export const MAX_BULK_BATCH_SIZE = 50;

export interface BatchValidationResult {
  valid: boolean;
  errors: string[];
  duplicateEmails: string[];
}

export function validateWorkerBatch(workers: ParsedWorkerInput[]): BatchValidationResult {
  const errors: string[] = [];

  if (workers.length === 0) {
    errors.push('Nessun worker da provisionare.');
  }

  if (workers.length > MAX_BULK_BATCH_SIZE) {
    errors.push(`Troppi worker in un solo batch (${workers.length}). Limite massimo: ${MAX_BULK_BATCH_SIZE}.`);
  }

  const counts = new Map<string, number>();
  for (const w of workers) {
    const key = w.email.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const duplicateEmails = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([email]) => email);
  if (duplicateEmails.length > 0) {
    errors.push(`Email duplicate nel batch: ${duplicateEmails.join(', ')}.`);
  }

  for (const w of workers) {
    if (!looksLikeEmail(w.email)) {
      errors.push(`Email non valida: "${w.email}".`);
    }
  }

  return { valid: errors.length === 0, errors, duplicateEmails };
}
