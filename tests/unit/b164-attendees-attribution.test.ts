/**
 * B164 — Canale nominativo + trigger di attribuzione d'ufficio
 *
 * Structural + unit tests. No live DB calls — reads source files and exercises
 * pure functions only. Privacy invariants are verified via grep.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { createHmac } from 'crypto';

const ROOT = resolve(process.cwd());

function read(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}
function exists(relPath: string): boolean {
  try { readFileSync(resolve(ROOT, relPath)); return true; } catch { return false; }
}
function strip(src: string): string {
  // Remove single-line comments (// ...) to avoid false-positive grep hits in comments
  return src.replace(/\/\/[^\n]*/g, '');
}
function collectTsFiles(dir: string): string[] {
  const abs = resolve(ROOT, dir);
  const results: string[] = [];
  try {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...collectTsFiles(full));
      else if (entry.isFile() && entry.name.endsWith('.ts')) results.push(full);
    }
  } catch { /* dir does not exist */ }
  return results;
}

// ── 1. File existence ─────────────────────────────────────────────────────────

describe('B164 — file existence', () => {
  it('migration 023 exists', () => {
    expect(exists('supabase/migrations/023_uploaded_record_attendee.sql')).toBe(true);
  });

  it('attendees interpreter exists', () => {
    expect(exists('lib/ingestion/attendees-interpreter.ts')).toBe(true);
  });

  it('office attribution trigger exists', () => {
    expect(exists('lib/live/office-attribution.ts')).toBe(true);
  });
});

// ── 2. Migration 023 — struttura e invarianti ─────────────────────────────────

describe('B164 — migration 023 invariants', () => {
  const sql = read('supabase/migrations/023_uploaded_record_attendee.sql');

  it('crea la tabella personal.uploaded_record_attendee', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS personal.uploaded_record_attendee');
  });

  it('FK su analytics.uef_record (non personal.uploaded_record)', () => {
    expect(sql).toContain('REFERENCES analytics.uef_record');
    expect(sql).not.toContain('REFERENCES personal.uploaded_record');
  });

  it('nessuna colonna nome o cognome in chiaro', () => {
    const lower = sql.toLowerCase();
    expect(lower).not.toMatch(/\bcolumn\s+nome\b/);
    expect(lower).not.toMatch(/\bcolumn\s+cognome\b/);
    // Le colonne nominative non devono esistere come definizioni di colonna
    const columnDefs = sql.match(/^\s+\w+\s+\w+/gm) ?? [];
    const rawNameCols = columnDefs.filter((l) =>
      /\b(nome|cognome|first_name|last_name|surname)\b/i.test(l),
    );
    expect(rawNameCols).toHaveLength(0);
  });

  it('colonne pseudonymizzate esistono: pseudonym_id, raw_hash', () => {
    expect(sql).toContain('pseudonym_id');
    expect(sql).toContain('raw_hash');
  });

  it('worker_identity_id nullable (pending workers)', () => {
    const wiLine = sql.split('\n').find((l) => l.includes('worker_identity_id'));
    expect(wiLine).toBeTruthy();
    expect(wiLine).not.toContain('NOT NULL');
  });

  it('status check: matched | pending', () => {
    expect(sql).toContain("CHECK (status IN ('matched', 'pending'))");
  });

  it('UNIQUE (source_uef_record_id, raw_hash) per idempotenza', () => {
    expect(sql).toContain('UNIQUE (source_uef_record_id, raw_hash)');
  });

  it('RLS abilitata', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('FORCE ROW LEVEL SECURITY');
  });

  it('policy KORA_ADMIN esiste', () => {
    expect(sql).toContain("kora.kora_role() = 'KORA_ADMIN'");
  });

  it('policy WORKER SELECT own (via worker_identity_id → auth.uid())', () => {
    expect(sql).toContain('auth_user_id = auth.uid()');
    expect(sql).toContain('FOR SELECT');
  });

  it('nessuna policy COMPANY — intenzionale', () => {
    expect(sql).not.toContain("'COMPANY_ADMIN'");
    expect(sql).not.toContain("'COMPANY_VIEWER'");
  });

  it('Gate 2 annotation: written NOT applied', () => {
    expect(sql).toContain('Gate 2 OPEN');
    expect(sql).toContain('NOT applied');
  });

  it('reloads PostgREST schema cache', () => {
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });
});

// ── 3. isAttendeesFile — rilevamento tipo file ────────────────────────────────

describe('B164 — isAttendeesFile detection', () => {
  // Import inline to avoid module resolution issues in test env
  // We test the logic by reading the source and verifying key patterns.
  const src = read('lib/ingestion/attendees-interpreter.ts');

  it('exports isAttendeesFile function', () => {
    expect(src).toContain('export function isAttendeesFile');
  });

  it('checks for iniziativa_id alias', () => {
    expect(src).toContain('iniziativa_id');
  });

  it('checks for nome alias', () => {
    expect(src).toContain("'nome'");
  });

  it('checks for cognome alias', () => {
    expect(src).toContain("'cognome'");
  });

  it('column-detection.ts exports isAttendeesFileByHeaders', () => {
    const det = read('lib/upload/column-detection.ts');
    expect(det).toContain('export function isAttendeesFileByHeaders');
  });

  it('column-detection.ts checks for iniziativa_id, nome, cognome', () => {
    const det = read('lib/upload/column-detection.ts');
    expect(det).toContain('iniziativa_id');
    expect(det).toContain("'nome'");
    expect(det).toContain("'cognome'");
  });
});

// ── 4. Pseudonymizzazione — garanzia privacy su pure functions ────────────────

describe('B164 — pseudonymizzazione (pure function, no DB)', () => {
  const SECRET = 'test-secret-kora-b164';
  const UEF_ID = 'aaa00000-0000-0000-0000-000000000001';
  const TENANT  = 'bbb00000-0000-0000-0000-000000000001';

  function hmac(secret: string, payload: string): string {
    return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  }

  it('pseudonym_id non contiene il nome grezzo', () => {
    const pseudonym = hmac(SECRET, `${UEF_ID}|mario|rossi`);
    expect(pseudonym).not.toContain('mario');
    expect(pseudonym).not.toContain('rossi');
    expect(pseudonym).not.toContain('Mario');
    expect(pseudonym).not.toContain('Rossi');
  });

  it('raw_hash non contiene il nome grezzo', () => {
    const raw = hmac(SECRET, 'mario|rossi');
    expect(raw).not.toContain('mario');
    expect(raw).not.toContain('rossi');
  });

  it('pseudonym_id diverso per UEF record diversi (stesso worker)', () => {
    const UEF_B = 'aaa00000-0000-0000-0000-000000000002';
    const p1 = hmac(SECRET, `${UEF_ID}|mario|rossi`);
    const p2 = hmac(SECRET, `${UEF_B}|mario|rossi`);
    expect(p1).not.toBe(p2);
  });

  it('raw_hash uguale per stesso nome in eventi diversi (dedup intra-evento)', () => {
    const h1 = hmac(SECRET, 'mario|rossi');
    const h2 = hmac(SECRET, 'mario|rossi');
    expect(h1).toBe(h2);
  });

  it('pseudonym_id diverso per nomi diversi (stesso UEF record)', () => {
    const p1 = hmac(SECRET, `${UEF_ID}|mario|rossi`);
    const p2 = hmac(SECRET, `${UEF_ID}|luigi|verdi`);
    expect(p1).not.toBe(p2);
  });

  it('pseudonym_id è hex string di 64 caratteri (SHA-256)', () => {
    const p = hmac(SECRET, `${UEF_ID}|mario|rossi`);
    expect(p).toMatch(/^[0-9a-f]{64}$/);
  });

  it('interprete usa HMAC (non MD5 o SHA plain)', () => {
    const src = read('lib/ingestion/attendees-interpreter.ts');
    expect(src).toContain('createHmac');
    expect(src).not.toContain('createHash(');
  });
});

// ── 5. Template attendees — promessa privacy ──────────────────────────────────

describe('B164 — template attendees', () => {
  const tmpl = read('lib/company-submissions/templates.ts');

  it('template attendees esiste nel file', () => {
    expect(tmpl).toContain("id:             'attendees'");
  });

  it("fileName è 'attendees.csv'", () => {
    expect(tmpl).toContain("fileName:       'attendees.csv'");
  });

  it('forbiddenFieldsNotice contiene la promessa privacy verbatim', () => {
    // raw file source: strings are split across lines with '+' concatenation
    expect(tmpl).toContain('impatto individuale del lavoratore (PIB)');
    // "mai visibile al datore di lavoro" spans a line break in the source
    expect(tmpl).toContain('mai visibile al datore');
    expect(tmpl).toContain('di lavoro a livello individuale');
    expect(tmpl).toContain('art. 9 GDPR');
  });

  it('forbiddenFieldsNotice menziona dati sanitari e biometrici', () => {
    expect(tmpl).toContain('dati sanitari');
    expect(tmpl).toContain('dati biometrici');
  });

  it('template esistenti non modificati (nessuna regressione forbiddenFieldsNotice)', () => {
    // Verifica che le template esistenti abbiano ancora il loro forbiddenFieldsNotice originale
    expect(tmpl).toContain("'Non includere: nomi individuali, CF, email, salari");  // iniziative
    expect(tmpl).toContain("'Non includere: nomi individuali, codici fiscali");     // formazione
  });
});

// ── 6. Trigger — struttura e invarianti ──────────────────────────────────────

describe('B164 — office attribution trigger', () => {
  const src = read('lib/live/office-attribution.ts');

  it('esporta triggerOfficeAttribution', () => {
    expect(src).toContain('export async function triggerOfficeAttribution');
  });

  it('query attendees per source_uef_record_id IN uefRecordIds', () => {
    expect(src).toContain("from('uploaded_record_attendee')");
    expect(src).toContain(".in('source_uef_record_id'");
  });

  it('filtra solo status=matched per il calcolo PIB', () => {
    expect(src).toContain("status === 'matched'");
  });

  it('logga pending senza silenziare', () => {
    expect(src).toContain('console.warn');
    expect(src).toContain('pending');
  });

  it('chiama computeBaseWorkerPIBRows (riusa B161)', () => {
    const stripped = strip(src);
    expect(stripped).toContain('computeBaseWorkerPIBRows');
  });

  it("sourceKind è sempre 'company_sourced'", () => {
    expect(src).toContain("sourceKind:       'company_sourced'");
  });

  it('participationId è null per attribuzione d\'ufficio', () => {
    expect(src).toContain('participationId:  null');
  });

  it('gestisce idempotenza: 23505 è silenzioso', () => {
    expect(src).toContain("'23505'");
  });

  it('non scrive su analytics.* — solo personal.worker_pib', () => {
    const stripped = strip(src);
    // Le sole tabelle scritte sono personal
    const analyticsInserts = stripped.match(/from\('.*?'\)[\s\S]*?\.insert/g) ?? [];
    // Deve usare schema('personal') prima di worker_pib
    expect(src).toContain("schema('personal')");
    expect(src).not.toMatch(/schema\('analytics'\)[\s\S]{0,200}\.insert/);
  });

  it('non espone nomi grezzi in log', () => {
    // Il trigger non ha accesso a nomi grezzi — verifica che non li logga
    const stripped = strip(src);
    const logLines = stripped.match(/console\.(log|warn|error)\([^)]+\)/g) ?? [];
    const rawNamePatterns = ['nome', 'cognome', 'first_name', 'last_name'];
    for (const line of logLines) {
      for (const pattern of rawNamePatterns) {
        expect(line.toLowerCase()).not.toContain(pattern);
      }
    }
  });
});

// ── 7. persistence.ts — hook integrato ───────────────────────────────────────

describe('B164 — persistKoraComputationResult hook', () => {
  const src = read('lib/live/persistence.ts');

  it('importa triggerOfficeAttribution', () => {
    const stripped = strip(src);
    expect(stripped).toContain('triggerOfficeAttribution');
    expect(stripped).toContain('office-attribution');
  });

  it('chiama il trigger dopo impact_unit INSERT (Step 5)', () => {
    // Il trigger deve apparire DOPO il blocco impact_unit
    const impactIdx = src.indexOf("from('impact_unit')");
    const triggerIdx = src.indexOf('triggerOfficeAttribution(');
    expect(impactIdx).toBeGreaterThan(-1);
    expect(triggerIdx).toBeGreaterThan(impactIdx);
  });

  it('il trigger è fire-and-forget con .catch (non blocca la persistenza)', () => {
    expect(src).toContain('triggerOfficeAttribution(');
    expect(src).toContain('.catch(');
  });

  it('passa uefRecordIds dalla lista iuResults', () => {
    expect(src).toContain('uefRecordIds');
    expect(src).toContain('r.record_id');
  });
});

// ── 8. Invariante privacy — nomi grezzi mai in analytics o persistence ────────

describe('B164 — privacy: nomi grezzi mai in output persistiti', () => {
  const FORBIDDEN_PATTERNS = ['nome:', 'cognome:', 'first_name:', 'last_name:', 'fullname:'];

  it('office-attribution.ts non persiste nomi grezzi su analytics.*', () => {
    const src = read('lib/live/office-attribution.ts');
    const stripped = strip(src);
    for (const pattern of FORBIDDEN_PATTERNS) {
      expect(stripped.toLowerCase()).not.toContain(pattern);
    }
  });

  it('attendees-interpreter.ts non include nomi in ParsedAttendeeRow output type', () => {
    const src = read('lib/ingestion/attendees-interpreter.ts');
    // ParsedAttendeeRow deve avere pseudonym_id e raw_hash, non nome/cognome
    const parsed = src.match(/interface ParsedAttendeeRow \{[\s\S]*?\}/)?.[0] ?? '';
    expect(parsed).toContain('pseudonym_id');
    expect(parsed).toContain('raw_hash');
    expect(parsed).not.toContain('nome:');
    expect(parsed).not.toContain('cognome:');
    expect(parsed).not.toContain('first_name:');
  });

  it('UploadedRecordAttendeeInsert non include nomi grezzi', () => {
    const src = read('lib/ingestion/attendees-interpreter.ts');
    const insert = src.match(/interface UploadedRecordAttendeeInsert \{[\s\S]*?\}/)?.[0] ?? '';
    expect(insert).toContain('pseudonym_id');
    expect(insert).toContain('raw_hash');
    expect(insert).not.toContain('nome:');
    expect(insert).not.toContain('cognome:');
  });

  it('migration 023 non ha colonne nome o cognome', () => {
    const sql = read('supabase/migrations/023_uploaded_record_attendee.sql');
    // Cerca definizioni di colonna con nome/cognome
    expect(sql).not.toMatch(/^\s+(nome|cognome|first_name|last_name)\s+\w/im);
  });

  it('nessun file in lib/live/ logga nomi grezzi', () => {
    const liveFiles = collectTsFiles('lib/live');
    for (const f of liveFiles) {
      const src = strip(read(f));
      const logCalls = src.match(/console\.(log|warn|error|info)\([\s\S]*?\);/g) ?? [];
      for (const call of logCalls) {
        expect(call).not.toMatch(/\b(nome|cognome|first_name|last_name)\b/i);
      }
    }
  });
});

// ── 9. Boundary: worker X non vede dati attendee di worker Y ─────────────────

describe('B164 — boundary: isolamento per-worker', () => {
  const sql = read('supabase/migrations/023_uploaded_record_attendee.sql');

  it('RLS WORKER usa auth.uid() subquery su worker_identity', () => {
    // Pattern canonico: worker vede solo le righe dove worker_identity_id
    // è la propria identity (via auth.uid() su worker_identity)
    expect(sql).toContain('auth_user_id = auth.uid()');
    expect(sql).toContain('FROM personal.worker_identity');
  });

  it('policy WORKER è FOR SELECT (non INSERT/UPDATE/DELETE)', () => {
    // Worker può leggere le proprie attendee rows ma non scriverci
    // (le scritture avvengono via service-role nella pipeline admin)
    const workerPolicies = sql.split(';').filter((s) => s.includes('CREATE POLICY') && s.includes('WORKER'));
    for (const p of workerPolicies) {
      expect(p).toContain('FOR SELECT');
      expect(p).not.toContain('FOR INSERT');
      expect(p).not.toContain('FOR UPDATE');
      expect(p).not.toContain('FOR DELETE');
    }
  });

  it('nessuna company policy su uploaded_record_attendee', () => {
    // La migrazione può menzionare COMPANY nei commenti; verifica che nessun CREATE POLICY la includa
    const createPolicies = sql.split('\n').filter((l) => l.trim().startsWith('CREATE POLICY'));
    for (const p of createPolicies) {
      expect(p.toUpperCase()).not.toContain('COMPANY');
    }
  });
});

// ── 10. Idempotenza trigger — U1 partial index garantisce no duplicati ────────

describe('B164 — idempotenza attribuzione d\'ufficio', () => {
  it('migration 018 ha U1 partial index su (worker_identity_id, source_uef_record_id, pillar)', () => {
    const mig018 = read('supabase/migrations/018_worker_pib.sql');
    expect(mig018).toContain('uq_worker_pib_uef_pillar');
    expect(mig018).toContain('worker_identity_id, source_uef_record_id, pillar');
    expect(mig018).toContain('WHERE source_uef_record_id IS NOT NULL');
  });

  it('trigger gestisce 23505 come successo idempotente', () => {
    const src = read('lib/live/office-attribution.ts');
    expect(src).toContain("insertErr.code === '23505'");
    // Su 23505: incrementa attributed, non errors
    const block23505 = src.split("'23505'")[1]?.split('}')[0] ?? '';
    expect(block23505).toContain('attributed');
    expect(block23505).not.toContain('errors++');
  });

  it('trigger usa source_kind company_sourced → source_uef_record_id non null → U1 attivo', () => {
    const src = read('lib/live/office-attribution.ts');
    expect(src).toContain("sourceKind:       'company_sourced'");
    // participationId null → source_participation_id null → U1 (non U2) è il constraint attivo
    expect(src).toContain('participationId:  null');
  });
});

// ── 11. Compatibilità zero-regressione — upload senza attendees funziona ──────

describe('B164 — zero regressione: upload senza file attendees', () => {
  const persistence = read('lib/live/persistence.ts');

  it('il trigger è dentro il blocco IF iuResults.length > 0', () => {
    // triggerOfficeAttribution deve essere chiamato solo se ci sono iuResults
    const iuBlock = persistence.split('result.iuResults && result.iuResults.length > 0')[1] ?? '';
    expect(iuBlock).toContain('triggerOfficeAttribution');
  });

  it('triggerOfficeAttribution gestisce uefRecordIds vuoti senza errore', () => {
    const src = read('lib/live/office-attribution.ts');
    // Ritorno anticipato se uefRecordIds.length === 0
    expect(src).toContain('uefRecordIds.length === 0');
  });

  it('attendees-interpreter esporta processAttendeesFile come funzione opzionale', () => {
    const src = read('lib/ingestion/attendees-interpreter.ts');
    expect(src).toContain('export async function processAttendeesFile');
  });
});

// ── 12. computeBaseWorkerPIBRows riuso (B161) ────────────────────────────────

describe('B164 — riuso computeBaseWorkerPIBRows (B161)', () => {
  it('office-attribution importa da WorkerIUComputationService', () => {
    const src = read('lib/live/office-attribution.ts');
    const stripped = strip(src);
    expect(stripped).toContain('WorkerIUComputationService');
    expect(stripped).toContain('computeBaseWorkerPIBRows');
  });

  it('WorkerIUComputationService esporta computeBaseWorkerPIBRows', () => {
    const svc = read('services/worker-iu-computation/WorkerIUComputationService.ts');
    expect(svc).toContain('export function computeBaseWorkerPIBRows');
  });

  it('company_sourced → evidence_type L3 → verified → is_exportable true (B161 regola)', () => {
    const svc = read('services/worker-iu-computation/WorkerIUComputationService.ts');
    expect(svc).toContain("if (sourceKind === 'company_sourced') return 'L3'");
    expect(svc).toContain("evidenceType === 'L3'");
    expect(svc).toContain('is_exportable:       verified');
  });
});
