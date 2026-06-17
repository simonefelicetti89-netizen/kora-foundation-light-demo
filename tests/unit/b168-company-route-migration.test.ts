// tests/unit/b168-company-route-migration.test.ts
// B168 — Migrazione 6 route company da getSupabaseServiceClient a getSupabaseServerClient.
// Pure fs.readFileSync — no runtime, no DB, no Supabase.
//
// Sequenza: Gruppo 1 (letture) → Gruppo 2 (mig 026) → Gruppo 3 (scritture) → Gruppo 4 (helper + grep)

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function exists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// Collects all .ts files under a directory recursively
function collectTsFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const result: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectTsFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      result.push(full);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRUPPO 1 — Letture pure (3 route)
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 Gruppo 1 — decision-pack/route.ts', () => {
  const src = () => read('app/api/company/decision-pack/route.ts');

  it('non importa getSupabaseServiceClient', () => {
    expect(src()).not.toContain('getSupabaseServiceClient');
  });

  it('importa getSupabaseServerClient', () => {
    expect(src()).toContain('getSupabaseServerClient');
  });

  it('usa await getSupabaseServerClient() (non getSupabaseServiceClient())', () => {
    expect(src()).toContain('await getSupabaseServerClient()');
  });

  it('mantiene .eq tenant_id dal tenantId di sessione (isolamento cross-tenant)', () => {
    expect(src()).toContain('.eq(\'tenant_id\', tenantId)');
  });

  it('non accetta tenantId da query params o body', () => {
    expect(src()).not.toContain('searchParams.get(\'tenantId\')');
    expect(src()).not.toContain('body.tenant_id');
    expect(src()).not.toContain('body[\'tenant_id\']');
  });
});

describe('B168 Gruppo 1 — decision-pack/pdf/route.ts', () => {
  const src = () => read('app/api/company/decision-pack/pdf/route.ts');

  it('non importa getSupabaseServiceClient', () => {
    expect(src()).not.toContain('getSupabaseServiceClient');
  });

  it('importa getSupabaseServerClient', () => {
    expect(src()).toContain('getSupabaseServerClient');
  });

  it('usa await getSupabaseServerClient()', () => {
    expect(src()).toContain('await getSupabaseServerClient()');
  });

  it('tenantId sempre da sessione (authResult.tenantId)', () => {
    expect(src()).toContain('tenantId');
    expect(src()).not.toContain('searchParams.get(\'tenantId\')');
  });
});

describe('B168 Gruppo 1 — data-submissions/[id]/route.ts', () => {
  const src = () => read('app/api/company/data-submissions/[id]/route.ts');

  it('non importa getSupabaseServiceClient', () => {
    expect(src()).not.toContain('getSupabaseServiceClient');
  });

  it('importa getSupabaseServerClient', () => {
    expect(src()).toContain('getSupabaseServerClient');
  });

  it('usa await getSupabaseServerClient()', () => {
    expect(src()).toContain('await getSupabaseServerClient()');
  });

  it('mantiene .eq tenant_id da auth.tenantId (doppio guard cross-tenant)', () => {
    expect(src()).toContain('.eq(\'tenant_id\', auth.tenantId)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPPO 2 — Migrazione 026
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 Gruppo 2 — migrazione 026 esiste', () => {
  it('file 026_company_route_rls_gaps.sql esiste', () => {
    expect(exists('supabase/migrations/026_company_route_rls_gaps.sql')).toBe(true);
  });
});

describe('B168 Gruppo 2 — GAP-1: analytics.source_batch INSERT', () => {
  const sql = () => read('supabase/migrations/026_company_route_rls_gaps.sql');

  it('contiene GRANT INSERT ON analytics.source_batch', () => {
    expect(sql()).toContain('GRANT INSERT ON analytics.source_batch');
  });

  it('contiene policy analytics_source_batch_company_insert', () => {
    expect(sql()).toContain('analytics_source_batch_company_insert');
  });

  it('GAP-1 policy ha WITH CHECK su kora.tenant_id()', () => {
    const policy = sql().match(/CREATE POLICY analytics_source_batch_company_insert[\s\S]*?;/)?.[0] ?? '';
    expect(policy).toContain('kora.tenant_id()');
  });

  it('GAP-1 policy ha WITH CHECK su source_type = \'company_submission\'', () => {
    const policy = sql().match(/CREATE POLICY analytics_source_batch_company_insert[\s\S]*?;/)?.[0] ?? '';
    expect(policy).toContain("source_type = 'company_submission'");
  });

  it('GAP-1 policy limita a COMPANY_ADMIN (non COMPANY_VIEWER)', () => {
    const policy = sql().match(/CREATE POLICY analytics_source_batch_company_insert[\s\S]*?;/)?.[0] ?? '';
    expect(policy).toContain('COMPANY_ADMIN');
    expect(policy).not.toContain('COMPANY_VIEWER');
  });
});

describe('B168 Gruppo 2 — GAP-2: analytics.source_batch UPDATE', () => {
  const sql = () => read('supabase/migrations/026_company_route_rls_gaps.sql');

  it('contiene GRANT UPDATE su analytics.source_batch con colonne specifiche', () => {
    expect(sql()).toContain('GRANT UPDATE');
    expect(sql()).toContain('analytics.source_batch');
  });

  it('GRANT UPDATE limitato a colonne (batch_status, payload_sample, row_count, updated_at)', () => {
    const grantLine = sql().match(/GRANT UPDATE\s*\([^)]+\)\s*ON analytics\.source_batch[^;]+;/)?.[0] ?? '';
    expect(grantLine).toContain('batch_status');
    expect(grantLine).toContain('payload_sample');
    expect(grantLine).toContain('row_count');
    expect(grantLine).toContain('updated_at');
  });

  it('contiene policy analytics_source_batch_company_update', () => {
    expect(sql()).toContain('analytics_source_batch_company_update');
  });

  it('GAP-2 USING blocca stati downstream (batch_status IN submission_draft/submission_pending)', () => {
    const policy = sql().match(/CREATE POLICY analytics_source_batch_company_update[\s\S]*?;/)?.[0] ?? '';
    expect(policy).toContain("batch_status IN ('submission_draft', 'submission_pending')");
  });

  it('GAP-2 USING non include stati downstream (approved, processing, reviewed, rejected)', () => {
    const usingClause = sql().match(/USING\s*\([\s\S]*?batch_status IN[\s\S]*?\)/)?.[0] ?? '';
    expect(usingClause).not.toContain('approved');
    expect(usingClause).not.toContain('processing');
    expect(usingClause).not.toContain('reviewed');
    expect(usingClause).not.toContain('rejected');
  });

  it('GAP-2 WITH CHECK ha batch_status IN — blocca escalation a stati downstream', () => {
    const policy = sql().match(/CREATE POLICY analytics_source_batch_company_update[\s\S]*?;/)?.[0] ?? '';
    // Count occurrences of batch_status IN — must appear in both USING and WITH CHECK
    const occurrences = (policy.match(/batch_status IN/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('GAP-2 WITH CHECK ha tenant_id = kora.tenant_id()', () => {
    const policy = sql().match(/CREATE POLICY analytics_source_batch_company_update[\s\S]*?;/)?.[0] ?? '';
    expect(policy).toContain('kora.tenant_id()');
  });

  it('GAP-2 WITH CHECK ha source_type = \'company_submission\'', () => {
    const policy = sql().match(/CREATE POLICY analytics_source_batch_company_update[\s\S]*?;/)?.[0] ?? '';
    expect(policy).toContain("source_type = 'company_submission'");
  });
});

describe('B168 Gruppo 2 — GAP-3: audit.audit_log INSERT (append-only)', () => {
  const sql = () => read('supabase/migrations/026_company_route_rls_gaps.sql');

  it('contiene GRANT INSERT ON audit.audit_log', () => {
    expect(sql()).toContain('GRANT INSERT ON audit.audit_log');
  });

  it('NO GRANT UPDATE su audit_log per authenticated (append-only)', () => {
    // Strip comment lines before checking — regex su testo grezzo cattura commenti SQL (-- ...).
    const sqlNoComments = sql().split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n');
    const updateGrants = sqlNoComments.match(/GRANT UPDATE[^;]*audit\.audit_log[^;]*;/g) ?? [];
    expect(updateGrants, 'Trovato GRANT UPDATE su audit.audit_log — viola append-only').toHaveLength(0);
  });

  it('NO GRANT DELETE su audit_log per authenticated (append-only)', () => {
    const sqlNoComments = sql().split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n');
    const deleteGrants = sqlNoComments.match(/GRANT DELETE[^;]*audit\.audit_log[^;]*;/g) ?? [];
    expect(deleteGrants, 'Trovato GRANT DELETE su audit.audit_log — viola append-only').toHaveLength(0);
  });

  it('contiene policy audit_log_company_insert', () => {
    expect(sql()).toContain('audit_log_company_insert');
  });

  it('GAP-3 WITH CHECK ha actor_id = auth.uid() (no audit a nome terzi)', () => {
    const policy = sql().match(/CREATE POLICY audit_log_company_insert[\s\S]*?;/)?.[0] ?? '';
    expect(policy).toContain('actor_id = auth.uid()');
  });

  it('GAP-3 WITH CHECK ha tenant_id = kora.tenant_id()', () => {
    const policy = sql().match(/CREATE POLICY audit_log_company_insert[\s\S]*?;/)?.[0] ?? '';
    expect(policy).toContain('tenant_id = kora.tenant_id()');
  });

  it('GAP-3 blocca actor giusto + tenant sbagliato: WITH CHECK ha ENTRAMBI tenant e actor (AND, non OR)', () => {
    const policy = sql().match(/CREATE POLICY audit_log_company_insert[\s\S]*?;/)?.[0] ?? '';
    // Both conditions must be present AND connected (not via OR)
    // We check they appear in WITH CHECK block
    const withCheck = policy.match(/WITH CHECK\s*\([\s\S]*?\)\s*;/)?.[0] ?? '';
    expect(withCheck).toContain('tenant_id = kora.tenant_id()');
    expect(withCheck).toContain('actor_id = auth.uid()');
    // Must not use OR between them (AND is the default when separate lines)
    expect(withCheck).not.toMatch(/tenant_id\s*=\s*kora\.tenant_id\(\)\s*OR\s*actor_id/);
  });

  it('GAP-3 policy è per INSERT, no UPDATE/DELETE policy per COMPANY_ADMIN su audit_log', () => {
    const src = sql();
    const companyAuditPolicies = [...src.matchAll(/CREATE POLICY[^;]+ON audit\.audit_log[^;]+;/g)]
      .map(m => m[0]);
    // Tutte le policy company su audit_log devono essere FOR INSERT
    const companyPolicies = companyAuditPolicies.filter(p => p.includes('COMPANY_ADMIN'));
    expect(companyPolicies.length).toBeGreaterThan(0);
    companyPolicies.forEach(p => {
      expect(p).toContain('FOR INSERT');
      expect(p).not.toContain('FOR UPDATE');
      expect(p).not.toContain('FOR DELETE');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPPO 3 — Scritture (3 route)
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 Gruppo 3 — data-submissions/route.ts', () => {
  const src = () => read('app/api/company/data-submissions/route.ts');

  it('non importa getSupabaseServiceClient', () => {
    expect(src()).not.toContain('getSupabaseServiceClient');
  });

  it('importa getSupabaseServerClient', () => {
    expect(src()).toContain('getSupabaseServerClient');
  });

  it('usa await getSupabaseServerClient()', () => {
    expect(src()).toContain('await getSupabaseServerClient()');
  });

  it('POST: INSERT include tenant_id da auth.tenantId (non da body)', () => {
    expect(src()).toContain('tenant_id:           auth.tenantId');
    expect(src()).not.toContain('body.tenant_id');
    expect(src()).not.toContain("body['tenant_id']");
  });

  it('logAudit ha actor_id: auth.id (corrisponde ad auth.uid())', () => {
    expect(src()).toContain('actor_id:      auth.id');
  });

  it('tenant_id in logAudit da auth.tenantId', () => {
    expect(src()).toContain('tenant_id:     auth.tenantId');
  });
});

describe('B168 Gruppo 3 — data-submissions/[id]/submit/route.ts', () => {
  const src = () => read('app/api/company/data-submissions/[id]/submit/route.ts');

  it('non importa getSupabaseServiceClient', () => {
    expect(src()).not.toContain('getSupabaseServiceClient');
  });

  it('importa getSupabaseServerClient', () => {
    expect(src()).toContain('getSupabaseServerClient');
  });

  it('usa await getSupabaseServerClient()', () => {
    expect(src()).toContain('await getSupabaseServerClient()');
  });

  it('SELECT ha .eq tenant_id da auth.tenantId (doppio guard cross-tenant)', () => {
    expect(src()).toContain(".eq('tenant_id', auth.tenantId)");
  });

  it('UPDATE ha .eq tenant_id da auth.tenantId (defense in depth)', () => {
    // Multiple .eq calls — at least one on tenant_id in UPDATE
    const occurrences = (src().match(/\.eq\('tenant_id', auth\.tenantId\)/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('logAudit ha actor_id: auth.id', () => {
    expect(src()).toContain('actor_id:      auth.id');
  });
});

describe('B168 Gruppo 3 — data-submissions/[id]/files/route.ts', () => {
  const src = () => read('app/api/company/data-submissions/[id]/files/route.ts');

  it('non importa getSupabaseServiceClient', () => {
    expect(src()).not.toContain('getSupabaseServiceClient');
  });

  it('importa getSupabaseServerClient', () => {
    expect(src()).toContain('getSupabaseServerClient');
  });

  it('usa await getSupabaseServerClient()', () => {
    expect(src()).toContain('await getSupabaseServerClient()');
  });

  it('importa uploadToAttachmentBucket da storage-service-key (non usa db.storage direttamente)', () => {
    expect(src()).toContain('uploadToAttachmentBucket');
    expect(src()).toContain('storage-service-key');
  });

  it('non usa db.storage direttamente per l\'upload', () => {
    expect(src()).not.toContain('db.storage.from(ATTACHMENT_BUCKET).upload');
    expect(src()).not.toContain(".storage\n");
  });

  it('UPDATE payload_sample ha .eq tenant_id da auth.tenantId', () => {
    expect(src()).toContain(".eq('tenant_id', auth.tenantId)");
  });

  it('logAudit ha actor_id: auth.id', () => {
    expect(src()).toContain('actor_id:      auth.id');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPPO 4 — Helper Storage isolato
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 Gruppo 4 — lib/supabase/storage-service-key.ts', () => {
  const src = () => read('lib/supabase/storage-service-key.ts');

  it('file esiste', () => {
    expect(exists('lib/supabase/storage-service-key.ts')).toBe(true);
  });

  it('importa getSupabaseServiceClient (service-role isolato)', () => {
    expect(src()).toContain('getSupabaseServiceClient');
  });

  it('esporta uploadToAttachmentBucket', () => {
    expect(src()).toContain('export async function uploadToAttachmentBucket');
  });

  it('importa ATTACHMENT_BUCKET da evidence-attachment-storage (no stringa hardcoded)', () => {
    expect(src()).toContain('ATTACHMENT_BUCKET');
    expect(src()).toContain('evidence-attachment-storage');
    expect(src()).not.toContain("'kora-evidence-attachments'");
  });

  it('ritorna { ok: true } o { ok: false } — non inghiotte errori', () => {
    expect(src()).toContain('ok: true');
    expect(src()).toContain('ok: false');
  });

  it('gestisce statusCode 404 (Correzione 3: check robusto prima del check stringa)', () => {
    expect(src()).toContain('statusCode');
    expect(src()).toContain('404');
  });

  it('contiene commento che dichiara UNICO punto getSupabaseServiceClient in api/company/', () => {
    expect(src()).toContain('getSupabaseServiceClient');
    expect(src()).toContain('app/api/company');
  });

  it('signature: accetta path, buffer, contentType — ritorna Promise<{ok,path}|{ok,error}>', () => {
    expect(src()).toContain('path: string');
    expect(src()).toContain('buffer: Buffer');
    expect(src()).toContain('contentType: string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GREP INVARIANT — ZERO getSupabaseServiceClient in app/api/company/
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 Grep invariant — getSupabaseServiceClient ZERO in app/api/company/', () => {
  it('nessun file in app/api/company/ importa o usa getSupabaseServiceClient', () => {
    const files = collectTsFiles('app/api/company');
    const violators: string[] = [];

    for (const filePath of files) {
      const src = fs.readFileSync(filePath, 'utf-8');
      if (src.includes('getSupabaseServiceClient')) {
        violators.push(filePath.replace(ROOT + '/', ''));
      }
    }

    expect(
      violators,
      `File con getSupabaseServiceClient trovati:\n${violators.join('\n')}`,
    ).toHaveLength(0);
  });
});
