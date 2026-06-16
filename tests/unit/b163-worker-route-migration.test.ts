// tests/unit/b163-worker-route-migration.test.ts
// B163 — Migrazione route worker al session-client, hardening RLS.
//
// Pattern: source-level audit (readFileSync + invarianti strutturali).
// Nessun DB, nessun mock runtime.
//
// Gruppi coperti:
//   Migrazione 022  — policy SQL aggiunte (Gap A + Gap C)
//   Gruppo 1        — letture pure: 6 route → getSupabaseServerClient
//   Gruppo 2        — scritture con RLS coperta: 3 route → getSupabaseServerClient
//   Gruppo 3        — cross-schema partner-catalog → getSupabaseServerClient
//   Gruppo 4        — dynamic-cv + onboarding POST (sblocco via mig 022)
//   Gruppo 5        — helper isolato + profile PATCH ristrutturato
//   Boundary        — worker X non vede/scrive come worker Y (invariante cross-worker)
//   Grep invariant  — getSupabaseServiceClient ZERO occorrenze in app/api/worker/

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function strip(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

// Ricorsivo: raccoglie tutti i file .ts sotto una dir
function collectTsFiles(dir: string): string[] {
  const abs = resolve(ROOT, dir);
  const results: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const full = join(abs, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

// ── Migrazione 022 — struttura SQL ───────────────────────────────────────────

describe('B163 Migrazione 022 — worker RLS gaps', () => {
  const SQL = 'supabase/migrations/022_worker_rls_gaps.sql';

  it('file esiste', () => {
    expect(() => read(SQL)).not.toThrow();
  });

  it('aggiunge policy worker_identity_worker_own_update (Gap A)', () => {
    const sql = read(SQL);
    expect(sql).toContain('worker_identity_worker_own_update');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain("auth_user_id = auth.uid()");
  });

  it('Gap A — WITH CHECK uguale al USING (impedisce riassegnazione riga)', () => {
    const sql = read(SQL);
    expect(sql).toContain('WITH CHECK');
    // Entrambe le clausole verificano auth_user_id = auth.uid()
    const matches = sql.match(/auth_user_id = auth\.uid\(\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('aggiunge policy analytics_tenant_worker_own_read (Gap C)', () => {
    const sql = read(SQL);
    expect(sql).toContain('analytics_tenant_worker_own_read');
    expect(sql).toContain('FOR SELECT');
    expect(sql).toContain('kora.tenant_id()');
  });

  it('Gap C — visibilità limitata al proprio tenant (id = kora.tenant_id())', () => {
    const sql = read(SQL);
    expect(sql).toContain("id = kora.tenant_id()");
  });

  it('annotazione Gate 2 OPEN — written, NOT applied', () => {
    const sql = read(SQL);
    expect(sql).toContain('Gate 2 OPEN');
    expect(sql).toContain('NOT applied');
  });

  it('annotazione applicabile insieme a 020/021 al pilot', () => {
    const sql = read(SQL);
    expect(sql).toContain('020/021');
  });

  it('nessun backfill dati in questa migrazione (no INSERT INTO tabelle, no UPDATE tabelle)', () => {
    const sqlNoComments = read(SQL)
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(sqlNoComments).not.toMatch(/INSERT\s+INTO\s+(analytics|personal|public|audit)\./i);
    // Controlla che non esistano UPDATE su tabelle-dati (backfill indesiderato).
    // FOR UPDATE (policy) è permesso; UPDATE analytics.tenant (backfill) non lo è.
    expect(sqlNoComments).not.toMatch(/UPDATE\s+(analytics|personal|public|audit)\./i);
  });
});

// ── Gruppo 1 — letture pure (6 route) ────────────────────────────────────────

const GRUPPO1_ROUTES = [
  'app/api/worker/activation-profile/route.ts',
  'app/api/worker/history/route.ts',
  'app/api/worker/initiatives/route.ts',
  'app/api/worker/dynamic-cv/shares/route.ts',
  'app/api/worker/profile/route.ts',
  'app/api/worker/onboarding/route.ts',
] as const;

describe('B163 Gruppo 1 — letture pure: server client, nessun service client', () => {
  for (const path of GRUPPO1_ROUTES) {
    it(`${path}: usa getSupabaseServerClient (non service)`, () => {
      const stripped = strip(read(path));
      expect(stripped).toContain('getSupabaseServerClient');
      // Profile e onboarding non devono avere service client nel corpo delle funzioni GET
      // (il profile route importa SOLO getSupabaseServerClient e l'helper per PATCH)
    });
  }

  it('activation-profile GET: nessun .eq(worker_id) esplicito (RLS mig 008)', () => {
    const src = strip(read('app/api/worker/activation-profile/route.ts'));
    // Nessun filtro worker_id: isolamento via RLS worker_participation_worker_own_all
    expect(src).not.toMatch(/\.eq\(['"]worker_id['"]/);
  });

  it('history GET: nessun .eq(worker_id) esplicito (RLS mig 008)', () => {
    const src = strip(read('app/api/worker/history/route.ts'));
    expect(src).not.toMatch(/\.eq\(['"]worker_id['"]/);
  });

  it('dynamic-cv/shares GET: nessun .eq(worker_id) esplicito (RLS mig 011)', () => {
    const src = strip(read('app/api/worker/dynamic-cv/shares/route.ts'));
    expect(src).not.toMatch(/\.eq\(['"]worker_id['"]/);
  });

  it('profile GET: nessun .eq(auth_user_id) esplicito (RLS mig 007 lo fa)', () => {
    // Il GET rimuove il filtro ridondante; rimane solo .eq('id', workerId) come PK lookup
    const src = strip(read('app/api/worker/profile/route.ts'));
    expect(src).not.toMatch(/\.eq\(['"]auth_user_id['"]/);
  });

  it('onboarding GET: nessun .eq(worker_id) esplicito (RLS mig 007)', () => {
    const getBlock = read('app/api/worker/onboarding/route.ts')
      .split('// ── POST')[0]; // solo il GET handler
    expect(strip(getBlock)).not.toMatch(/\.eq\(['"]worker_id['"]/);
  });
});

// ── Gruppo 2 — scritture con RLS coperta (3 route) ───────────────────────────

const GRUPPO2_ROUTES = [
  'app/api/worker/initiatives/[id]/interest/route.ts',
  'app/api/worker/dynamic-cv/share/route.ts',
  'app/api/worker/dynamic-cv/shares/[id]/revoke/route.ts',
] as const;

describe('B163 Gruppo 2 — scritture coperte: server client, difesa in profondità', () => {
  for (const path of GRUPPO2_ROUTES) {
    it(`${path}: usa getSupabaseServerClient`, () => {
      const stripped = strip(read(path));
      expect(stripped).toContain('getSupabaseServerClient');
      expect(stripped).not.toContain('getSupabaseServiceClient');
    });
  }

  it('interest POST: workerId e tenantId solo da sessione (auth.workerId / auth.tenantId)', () => {
    const src = read('app/api/worker/initiatives/[id]/interest/route.ts');
    expect(src).toContain('const { tenantId, workerId } = auth');
    expect(src).not.toContain('body.worker_id');
    expect(src).not.toContain('body.tenant_id');
  });

  it('interest POST: upsert worker_participation mantiene worker_id: workerId (difesa scrittura)', () => {
    const src = read('app/api/worker/initiatives/[id]/interest/route.ts');
    expect(src).toContain('worker_id: workerId');
    expect(src).toContain('tenant_id: tenantId');
  });

  it('cv share POST: insert mantiene worker_id e tenant_id nel payload (difesa scrittura)', () => {
    const src = read('app/api/worker/dynamic-cv/share/route.ts');
    expect(src).toContain('worker_id:  workerId');
    expect(src).toContain('tenant_id:  tenantId');
  });

  it('cv revoke PATCH: .eq(worker_id) mantenuto come filtro di scrittura (difesa)', () => {
    const src = read('app/api/worker/dynamic-cv/shares/[id]/revoke/route.ts');
    expect(src).toContain(".eq('worker_id', workerId)");
    // Non accetta shareId da body — solo da path params
    expect(src).not.toContain('body.id');
    expect(src).not.toContain('body.shareId');
  });
});

// ── Gruppo 3 — cross-schema partner-catalog ───────────────────────────────────

describe('B163 Gruppo 3 — partner-catalog: server client cross-schema', () => {
  const src = read('app/api/worker/partner-catalog/route.ts');

  it('usa getSupabaseServerClient', () => {
    const stripped = strip(src);
    expect(stripped).toContain('getSupabaseServerClient');
    expect(stripped).not.toContain('getSupabaseServiceClient');
  });

  it('schema network — accede a partner_profile', () => {
    expect(src).toContain("schema('network')");
    expect(src).toContain("from('partner_profile')");
  });

  it('filtro status=published mantenuto (difesa esplicita)', () => {
    expect(src).toContain(".eq('status', 'published')");
  });

  it('nessun campo worker_id nel query (catalog pubblico del tenant)', () => {
    expect(src).not.toContain("eq('worker_id'");
  });
});

// ── Gruppo 4 — dynamic-cv (GET) + onboarding (POST) ──────────────────────────

describe('B163 Gruppo 4 — sblocco via mig 022', () => {
  it('dynamic-cv GET: usa getSupabaseServerClient', () => {
    const stripped = strip(read('app/api/worker/dynamic-cv/route.ts'));
    expect(stripped).toContain('getSupabaseServerClient');
    expect(stripped).not.toContain('getSupabaseServiceClient');
  });

  it('dynamic-cv GET: analytics.tenant letto via server client (policy mig 022)', () => {
    const src = read('app/api/worker/dynamic-cv/route.ts');
    expect(src).toContain("schema('analytics')");
    expect(src).toContain("from('tenant')");
  });

  it('dynamic-cv GET: nessun .eq(auth_user_id) su worker_identity (RLS mig 007)', () => {
    const src = strip(read('app/api/worker/dynamic-cv/route.ts'));
    expect(src).not.toMatch(/\.eq\(['"]auth_user_id['"]/);
  });

  it('dynamic-cv GET: nessun .eq(worker_id) su worker_participation (RLS mig 008)', () => {
    const src = strip(read('app/api/worker/dynamic-cv/route.ts'));
    // PK lookup .eq('id', workerId) su worker_identity rimane — è su 'id' non 'worker_id'
    expect(src).not.toMatch(/\.eq\(['"]worker_id['"],\s*workerId\)/);
  });

  it('onboarding POST: usa getSupabaseServerClient', () => {
    const stripped = strip(read('app/api/worker/onboarding/route.ts'));
    expect(stripped).toContain('getSupabaseServerClient');
    expect(stripped).not.toContain('getSupabaseServiceClient');
  });

  it('onboarding: nessun import getSupabaseServiceClient nel file', () => {
    const src = strip(read('app/api/worker/onboarding/route.ts'));
    expect(src).not.toContain('getSupabaseServiceClient');
  });

  it('onboarding POST: filtri difesa in profondità mantenuti su worker_identity UPDATE', () => {
    const src = read('app/api/worker/onboarding/route.ts');
    expect(src).toContain(".eq('id', workerId)");
    expect(src).toContain(".eq('tenant_id', tenantId)");
    expect(src).toContain(".eq('status', 'invited')");
  });
});

// ── Gruppo 5 — helper isolato + profile PATCH ────────────────────────────────

describe('B163 Gruppo 5 — helper service-role isolato', () => {
  it('helper lib/supabase/auth-admin-update-user.ts esiste', () => {
    expect(() => read('lib/supabase/auth-admin-update-user.ts')).not.toThrow();
  });

  it('helper importa getSupabaseServiceClient (service-role isolato)', () => {
    const stripped = strip(read('lib/supabase/auth-admin-update-user.ts'));
    expect(stripped).toContain('getSupabaseServiceClient');
  });

  it('helper esporta updateWorkerAuthMetadata', () => {
    const src = read('lib/supabase/auth-admin-update-user.ts');
    expect(src).toContain('export async function updateWorkerAuthMetadata');
  });

  it('helper: firma restituisce { ok: true } | { ok: false; error: string } — non void', () => {
    const src = read('lib/supabase/auth-admin-update-user.ts');
    expect(src).toContain('{ ok: true }');
    expect(src).toContain('{ ok: false; error: string }');
  });

  it('helper: commento esplicita che NON inghiotte l\'errore (DB↔JWT desync)', () => {
    const src = read('lib/supabase/auth-admin-update-user.ts');
    expect(src).toContain('NON inghiottire');
    expect(src).toContain('desincronizzazione');
  });

  it('helper: commento chiarisce stesso modulo, funzione diversa rispetto a getSupabaseServerClient', () => {
    const src = read('lib/supabase/auth-admin-update-user.ts');
    expect(src).toContain('Stesso modulo');
    expect(src).toContain('funzione diversa');
  });

  it('profile route PATCH: NON importa getSupabaseServiceClient', () => {
    const stripped = strip(read('app/api/worker/profile/route.ts'));
    expect(stripped).not.toContain('getSupabaseServiceClient');
  });

  it('profile route PATCH: usa updateWorkerAuthMetadata (helper)', () => {
    const src = read('app/api/worker/profile/route.ts');
    expect(src).toContain('updateWorkerAuthMetadata');
    expect(src).toContain("from '@/lib/supabase/auth-admin-update-user'");
  });

  it('profile route PATCH: risponde con warning se auth_metadata_sync_failed', () => {
    const src = read('app/api/worker/profile/route.ts');
    expect(src).toContain('auth_metadata_sync_failed');
    expect(src).toContain('warning');
  });

  it('profile route PATCH: usa getSupabaseServerClient per le operazioni DB', () => {
    const stripped = strip(read('app/api/worker/profile/route.ts'));
    expect(stripped).toContain('getSupabaseServerClient');
  });
});

// ── Grep invariant — ZERO service client in app/api/worker/ ──────────────────

describe('B163 Grep invariant — getSupabaseServiceClient ZERO in app/api/worker/', () => {
  it('nessun file in app/api/worker/ importa o usa getSupabaseServiceClient', () => {
    const workerApiFiles = collectTsFiles('app/api/worker');
    const violators: string[] = [];

    for (const relPath of workerApiFiles) {
      const src = strip(read(relPath));
      if (src.includes('getSupabaseServiceClient')) {
        violators.push(relPath);
      }
    }

    expect(violators, `File con getSupabaseServiceClient trovati: ${violators.join(', ')}`).toHaveLength(0);
  });
});

// ── Boundary — worker X non vede né scrive come worker Y ─────────────────────

describe('B163 Boundary — isolamento cross-worker', () => {
  it('nessuna route worker accetta worker_id da query params', () => {
    const allWorkerRoutes = collectTsFiles('app/api/worker');
    const violators: string[] = [];
    for (const relPath of allWorkerRoutes) {
      const stripped = strip(read(relPath));
      if (
        stripped.includes("searchParams.get('worker_id')") ||
        stripped.includes('searchParams.get("worker_id")')
      ) {
        violators.push(relPath);
      }
    }
    expect(violators, `Route con worker_id da params: ${violators.join(', ')}`).toHaveLength(0);
  });

  it('RLS mig 007 garantisce isolamento worker_identity e worker_profile_private', () => {
    const mig007 = read('supabase/migrations/007_worker_provisioning.sql');
    expect(mig007).toContain('worker_identity_worker_own_select');
    expect(mig007).toContain('worker_profile_worker_own_all');
    expect(mig007).toContain('auth.uid()');
  });

  it('RLS mig 008 garantisce isolamento worker_participation', () => {
    const mig008 = read('supabase/migrations/008_worker_initiatives.sql');
    expect(mig008).toContain('worker_participation_worker_own_all');
    expect(mig008).toContain('auth.uid()');
  });

  it('RLS mig 011 garantisce isolamento worker_cv_share via kora_worker_id JWT claim', () => {
    const mig011 = read('supabase/migrations/011_worker_cv_share.sql');
    expect(mig011).toContain('worker_cv_share_worker_own_all');
    expect(mig011).toContain('kora_worker_id');
  });

  it('RLS mig 022 Gap A: worker_identity UPDATE solo sulla propria riga', () => {
    const mig022 = read('supabase/migrations/022_worker_rls_gaps.sql');
    expect(mig022).toContain('worker_identity_worker_own_update');
    // WITH CHECK uguale al USING: impedisce riassegnazione a altro auth_user_id
    expect(mig022).toContain('WITH CHECK');
  });

  it('RLS mig 022 Gap C: analytics.tenant SELECT solo per proprio tenant', () => {
    const mig022 = read('supabase/migrations/022_worker_rls_gaps.sql');
    expect(mig022).toContain('analytics_tenant_worker_own_read');
    expect(mig022).toContain('id = kora.tenant_id()');
  });

  it('scritture worker_cv_share mantengono worker_id dal session (difesa profondità)', () => {
    // share POST: worker_id nel payload viene da auth.workerId (session)
    const shareSrc = read('app/api/worker/dynamic-cv/share/route.ts');
    expect(shareSrc).toContain('const { workerId, tenantId } = auth');
    expect(shareSrc).toContain('worker_id:  workerId');
    // revoke PATCH: filtro .eq(worker_id, workerId) mantenuto
    const revokeSrc = read('app/api/worker/dynamic-cv/shares/[id]/revoke/route.ts');
    expect(revokeSrc).toContain('const { workerId } = auth');
    expect(revokeSrc).toContain(".eq('worker_id', workerId)");
  });
});
