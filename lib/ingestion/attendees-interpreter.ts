// lib/ingestion/attendees-interpreter.ts
// B164 — Interprete per il binario nominativo companion delle iniziative.
//
// GARANZIA PRIVACY ASSOLUTA:
//   I nomi grezzi (nome, cognome, email, matricola) NON devono mai uscire
//   da questo modulo verso DB, log, o strutture persistenti.
//   Ogni funzione che riceve nomi grezzi deve restituire solo pseudonym_id
//   e raw_hash (derivati via HMAC). Qualsiasi violazione di questa regola
//   è una violazione del confine privacy — il test b164 la verifica con grep.
//
// PSEUDONIMIZZAZIONE:
//   pseudonym_id = HMAC(secret, uef_record_id + '|' + nome.lower + '|' + cognome.lower)
//     → legato all'evento specifico: stesso worker = pseudonimi diversi per eventi diversi.
//   raw_hash = HMAC(secret, nome.lower + '|' + cognome.lower)
//     → identità canonica per dedup intra-evento, senza esporre il nome.
//
// MATCHING:
//   La risoluzione worker_identity avviene tramite worker_ref (matricola) o
//   email — NON tramite nome. Le hints di matching non vengono mai persistite.

import { createHmac } from 'crypto';

// ── Tipi pubblici ─────────────────────────────────────────────────────────────

export interface AttendeeCsvRow {
  iniziativa_id: string;  // UUID del uef_record a cui appartiene questa presenza
  nome:          string;
  cognome:       string;
  email?:        string | null;
  matricola?:    string | null;  // = worker_ref in personal.worker_identity
}

// Output del parser puro — nessun nome grezzo, solo dati pseudonymizzati + match hints
export interface ParsedAttendeeRow {
  tenant_id:            string;
  source_uef_record_id: string;
  pseudonym_id:         string;  // HMAC(secret, uefId + nome + cognome) — evento-specifico
  raw_hash:             string;  // HMAC(secret, nome + cognome) — dedup intra-evento
  // Hints per il matching: usati solo in memory durante processAttendeesFile, mai persistiti
  _match_worker_ref:    string | null;
  _match_email:         string | null;
}

// Riga pronta per INSERT in personal.uploaded_record_attendee
export interface UploadedRecordAttendeeInsert {
  tenant_id:            string;
  source_uef_record_id: string;
  pseudonym_id:         string;
  raw_hash:             string;
  worker_identity_id:   string | null;
  status:               'matched' | 'pending';
}

export interface ProcessAttendeesResult {
  rows:         UploadedRecordAttendeeInsert[];
  matchedCount: number;
  pendingCount: number;
}

// ── Rilevamento tipo file attendees ──────────────────────────────────────────

// Colonne obbligatorie per identificare un file attendees nominativo.
// Presenza di (iniziativa_id E nome E cognome) → file attendees.
// Gli header vengono normalizzati (lowercase, trim) prima del confronto.
const REQUIRED_ATTENDEE_HEADERS = new Set(['iniziativa_id', 'nome', 'cognome']);
const ATTENDEE_HEADER_ALIASES: Record<string, string[]> = {
  iniziativa_id: ['iniziativa_id', 'uef_record_id', 'initiative_id', 'id_iniziativa'],
  nome:          ['nome', 'first_name', 'firstname', 'name'],
  cognome:       ['cognome', 'last_name', 'lastname', 'surname'],
};

export function isAttendeesFile(headers: string[]): boolean {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  const detected = new Set<string>();
  for (const norm of normalized) {
    for (const [canonical, aliases] of Object.entries(ATTENDEE_HEADER_ALIASES)) {
      if (aliases.includes(norm)) detected.add(canonical);
    }
  }
  return REQUIRED_ATTENDEE_HEADERS.isSubsetOf
    ? REQUIRED_ATTENDEE_HEADERS.isSubsetOf(detected)
    : [...REQUIRED_ATTENDEE_HEADERS].every((h) => detected.has(h));
}

// ── Parser puro — nessun DB, nessun nome in output ───────────────────────────

function deriveSecret(): string {
  const s = process.env['KORA_PSEUDONYM_SECRET'];
  if (!s) throw new Error('[attendees-interpreter] KORA_PSEUDONYM_SECRET non impostato.');
  return s;
}

function hmac(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

function normalizeNamePart(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function parseAttendeeCsvRow(
  row:        AttendeeCsvRow,
  tenantId:   string,
  secret:     string,
): ParsedAttendeeRow {
  const nome    = normalizeNamePart(row.nome);
  const cognome = normalizeNamePart(row.cognome);

  // pseudonym_id: evento-specifico — stesso worker ha pseudonimo diverso per ogni UEF record.
  const pseudonym_id = hmac(secret, `${row.iniziativa_id}|${nome}|${cognome}`);

  // raw_hash: identità canonica per dedup intra-evento.
  const raw_hash = hmac(secret, `${nome}|${cognome}`);

  return {
    tenant_id:            tenantId,
    source_uef_record_id: row.iniziativa_id,
    pseudonym_id,
    raw_hash,
    _match_worker_ref: row.matricola?.trim() || null,
    _match_email:      row.email?.toLowerCase().trim() || null,
  };
}

// ── Matching worker_identity ──────────────────────────────────────────────────
// Risolve il worker_identity_id da worker_ref (matricola) o email.
// Usato solo in memory — il nome grezzo non è presente in questo path.
// Restituisce null se il worker non è ancora provisionato in KORA.

export async function resolveWorkerIdentityId(
  db:          { schema: (s: string) => { from: (t: string) => unknown } },
  tenantId:    string,
  workerRef:   string | null,
  email:       string | null,
): Promise<string | null> {
  // Tenta prima per worker_ref (matricola aziendale)
  if (workerRef) {
    const { data } = await (db as any)
      .schema('personal')
      .from('worker_identity')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('worker_ref', workerRef)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  // Fallback per email: worker_identity non ha colonna email diretta.
  // Il match email richiede join con auth.users — non disponibile via RLS normale.
  // In Foundation Light demo: email matching non implementato (worker_ref sufficiente).
  // Il percorso email è previsto per pilot con tabella email_index dedicata.
  if (email) {
    const { data } = await (db as any)
      .schema('personal')
      .from('worker_identity')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email_hint', email)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  return null;
}

// ── Processamento completo — parse + match + build insert rows ────────────────
// Funzione principale chiamata dalla pipeline di ingestion.
// I nomi grezzi entrano solo come AttendeeCsvRow e non escono mai da questa funzione.

export async function processAttendeesFile(params: {
  rows:     AttendeeCsvRow[];
  tenantId: string;
  db:       { schema: (s: string) => { from: (t: string) => unknown } };
}): Promise<ProcessAttendeesResult> {
  const { rows, tenantId, db } = params;
  const secret = deriveSecret();

  const insertRows: UploadedRecordAttendeeInsert[] = [];
  let matchedCount = 0;
  let pendingCount = 0;

  for (const row of rows) {
    const parsed = parseAttendeeCsvRow(row, tenantId, secret);

    const workerId = await resolveWorkerIdentityId(
      db,
      tenantId,
      parsed._match_worker_ref,
      parsed._match_email,
    );

    const insertRow: UploadedRecordAttendeeInsert = {
      tenant_id:            parsed.tenant_id,
      source_uef_record_id: parsed.source_uef_record_id,
      pseudonym_id:         parsed.pseudonym_id,
      raw_hash:             parsed.raw_hash,
      worker_identity_id:   workerId,
      status:               workerId ? 'matched' : 'pending',
    };

    if (workerId) matchedCount++;
    else pendingCount++;

    insertRows.push(insertRow);
  }

  return { rows: insertRows, matchedCount, pendingCount };
}
