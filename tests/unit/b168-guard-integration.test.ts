// tests/unit/b168-guard-integration.test.ts
// B168 Sprint — Privacy Guard Granularization: test di integrazione strutturale.
//
// Verifica che i tre livelli di defense in depth (middleware, layout, RLS) siano
// tutti presenti e coerenti con la matrice di accesso docs/access-matrix.md.
//
// Nessuna chiamata live — legge sorgenti e migrazioni come stringhe.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

const middleware        = read('middleware.ts');
const companyLayout    = read('app/company/layout.tsx');
const workspaceLayout  = read('app/company/workspace/layout.tsx');
const workerLayout     = read('app/worker/layout.tsx');
const accessMatrix     = read('lib/auth/access-matrix.ts');
const auditHelper      = read('lib/audit/log-access.ts');
const banner           = read('components/auth/PrivilegedAccessBanner.tsx');
const mig027           = read('supabase/migrations/027_worker_individual_rls_refactor.sql');
const mig028           = read('supabase/migrations/028_audit_log_enrichment.sql');

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1: Middleware
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — Layer 1: middleware worker-individual block', () => {
  it('importa canAccess da lib/auth/access-matrix', () => {
    expect(middleware).toContain("from '@/lib/auth/access-matrix'");
    expect(middleware).toContain('canAccess');
  });

  it('usa sessionKoraRole === KORA_ADMIN per identificare il ruolo', () => {
    expect(middleware).toContain("sessionKoraRole === 'KORA_ADMIN'");
  });

  it('blocca /worker/* paths per KORA_ADMIN', () => {
    expect(middleware).toContain("'/worker/'");
    // Il blocco usa canAccess, non un check inline arbitrario
    expect(middleware).toContain("canAccess('KORA_ADMIN', 'worker_individual_pib'");
  });

  it('redirect KORA_ADMIN→/admin con blocked param (non silenzioso)', () => {
    expect(middleware).toContain("'/admin'");
    expect(middleware).toContain("blocked");
    expect(middleware).toContain('worker_individual_access_denied');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2A: Company layout — ammette KORA_ADMIN con audit + banner
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — Layer 2A: company layout service access', () => {
  it('importa canAccess', () => {
    expect(companyLayout).toContain("canAccess");
    expect(companyLayout).toContain("from '@/lib/auth/access-matrix'");
  });

  it('importa logServiceAccess', () => {
    expect(companyLayout).toContain("logServiceAccess");
    expect(companyLayout).toContain("from '@/lib/audit/log-access'");
  });

  it('importa PrivilegedAccessBanner', () => {
    expect(companyLayout).toContain("PrivilegedAccessBanner");
    expect(companyLayout).toContain("from '@/components/auth/PrivilegedAccessBanner'");
  });

  it('non usa più redirect(\'/admin\') per KORA_ADMIN come comportamento principale', () => {
    // redirect('/admin') è ancora presente come fallback se canAccess nega — ok.
    // Ma non deve essere il primo branch per KORA_ADMIN.
    // Verifica che KORA_ADMIN venga gestito con cookie-based tenant resolution.
    expect(companyLayout).toContain('kora-service-tenant-id');
    expect(companyLayout).toContain('koraRole="KORA_ADMIN"');
  });

  it('audit log è fire-and-forget (void)', () => {
    expect(companyLayout).toContain('void logServiceAccess');
  });

  it('risolve environment da env var (non hardcoded)', () => {
    expect(companyLayout).toContain('resolveEnvironment');
    expect(companyLayout).toContain('NEXT_PUBLIC_KORA_ENV');
  });

  it('CompanySessionProvider passa adminServiceAccess=true per KORA_ADMIN', () => {
    expect(companyLayout).toContain('adminServiceAccess={true}');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2B: Workspace sub-layout — passthrough per KORA_ADMIN
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — Layer 2B: workspace layout KORA_ADMIN passthrough', () => {
  it('non mostra più blocco UI "Questo workspace richiede una sessione azienda" per KORA_ADMIN', () => {
    expect(workspaceLayout).not.toContain('Questo workspace richiede una sessione azienda');
  });

  it('passa children per KORA_ADMIN (root layout ha già fatto auth)', () => {
    expect(workspaceLayout).toContain('KORA_ADMIN');
    // Passthrough pattern: return <>{children}</>
    expect(workspaceLayout).toContain('{children}');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2C: Worker layout — hard block KORA_ADMIN
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — Layer 2C: worker layout hard block', () => {
  it('hard-blocca KORA_ADMIN con messaggio esplicito "by design"', () => {
    expect(workerLayout).toContain('Worker individual data is not accessible to KORA service team by design');
  });

  it('non fa redirect a /my-kora per KORA_ADMIN', () => {
    expect(workerLayout).not.toContain("redirect('/my-kora')");
  });

  it('worker gate getCurrentWorkerUser rimane invariato', () => {
    expect(workerLayout).toContain('getCurrentWorkerUser');
    expect(workerLayout).toContain("redirect('/login')");
  });

  it('accesso_matrix citato nel blocco come riferimento esplicito', () => {
    expect(workerLayout).toContain('access_matrix');
    expect(workerLayout).toContain('DENY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Access Matrix — funzione pura, nessun side effect
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — canAccess() pura e data-driven', () => {
  it('nessun import di Supabase o moduli Node nella matrice', () => {
    expect(accessMatrix).not.toContain("from '@supabase");
    expect(accessMatrix).not.toContain("from 'node:");
    expect(accessMatrix).not.toContain("require(");
  });

  it('usa MATRIX constant, non if-else chains', () => {
    expect(accessMatrix).toContain('const MATRIX');
    // Assenza di pattern if-else per ogni role
    expect(accessMatrix).not.toMatch(/if\s*\(\s*role\s*===\s*'KORA_ADMIN'\s*\)/);
  });

  it('ADMIN_COMPANY_BANNER copre tutti e 3 gli environment', () => {
    expect(accessMatrix).toContain("demo:   'amber'");
    expect(accessMatrix).toContain("live:   'navy'");
    expect(accessMatrix).toContain("future: 'blueprint'");
  });

  it('worker_individual_pib → KORA_ADMIN: denyReason contiene "by design"', () => {
    expect(accessMatrix).toContain('KORA service team by design');
  });

  it('personal_pseudonym_map → denyReason per tutti i ruoli: "system procedures only"', () => {
    expect(accessMatrix).toContain('system procedures only');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit helper — fail open
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — audit log helper fail open', () => {
  it('usa getSupabaseServerClient (non service client)', () => {
    expect(auditHelper).toContain('getSupabaseServerClient');
    expect(auditHelper).not.toContain('getSupabaseServiceClient');
  });

  it('ha try/catch che non rilancia (fail open)', () => {
    expect(auditHelper).toContain('} catch');
    // Il catch non contiene throw o re-throw
    const catchBlock = auditHelper.slice(auditHelper.indexOf('} catch'));
    expect(catchBlock.slice(0, 200)).not.toContain('throw');
  });

  it('scrive campo environment nell\'insert', () => {
    expect(auditHelper).toContain('environment:');
  });

  it('scrive ip_hash e user_agent_hash (non ip_address raw)', () => {
    expect(auditHelper).toContain('ip_hash');
    expect(auditHelper).toContain('user_agent_hash');
    // NON scrive ip_address raw (privacy by design)
    expect(auditHelper).not.toContain("'ip_address'");
    expect(auditHelper).not.toContain('"ip_address"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PrivilegedAccessBanner — tre varianti, sticky, non dismissibile
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — PrivilegedAccessBanner', () => {
  it('è un client component', () => {
    expect(banner).toContain("'use client'");
  });

  it('ha sticky top z-50 (non dismissibile, sempre visibile)', () => {
    expect(banner).toContain('sticky');
    expect(banner).toContain('top-0');
    expect(banner).toContain('z-50');
  });

  it('usa font Hanken Grotesk via CSS variable', () => {
    expect(banner).toContain('--font-hanken');
  });

  it('copre tutte e tre le varianti amber/navy/blueprint', () => {
    expect(banner).toContain('amber');
    expect(banner).toContain('navy');
    expect(banner).toContain('blueprint');
  });

  it('non ha bottone dismiss o close', () => {
    // Non deve avere onClick (nessun handler interattivo) né un elemento button dismiss.
    expect(banner).not.toContain('onClick');
    expect(banner).not.toContain('<button');
    // 'dismiss' può apparire in commenti IT ("non dismissibile") — controlla la logica, non il testo.
    expect(banner).not.toContain("aria-label=\"Close\"");
    expect(banner).not.toContain("aria-label=\"Dismiss\"");
  });

  it('ha role="alert" per accessibilità', () => {
    expect(banner).toContain('role="alert"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Migration 027 — personal.* kora_admin_all rimossa
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — migration 027: rimozione kora_admin_all da personal.*', () => {
  const sql027 = mig027.split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n');

  it('contiene DROP worker_identity_kora_admin_all', () => {
    expect(sql027).toContain('DROP POLICY IF EXISTS worker_identity_kora_admin_all');
  });

  it('contiene DROP worker_pib_kora_admin_all', () => {
    expect(sql027).toContain('DROP POLICY IF EXISTS worker_pib_kora_admin_all');
  });

  it('contiene DROP worker_pseudonym_map_kora_admin_all', () => {
    expect(sql027).toContain('DROP POLICY IF EXISTS worker_pseudonym_map_kora_admin_all');
  });

  it('contiene DROP worker_profile_kora_admin_all', () => {
    expect(sql027).toContain('DROP POLICY IF EXISTS worker_profile_kora_admin_all');
  });

  it('è wrapped in BEGIN/COMMIT', () => {
    expect(sql027).toContain('BEGIN');
    expect(sql027).toContain('COMMIT');
  });

  it('NON contiene CREATE POLICY (solo rimozioni, nessuna nuova policy admin)', () => {
    expect(sql027).not.toContain('CREATE POLICY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Migration 028 — audit_log enrichment
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — migration 028: audit_log enrichment', () => {
  it('aggiunge colonna environment con CHECK', () => {
    expect(mig028).toContain('ADD COLUMN IF NOT EXISTS environment');
    expect(mig028).toContain("CHECK (environment IN ('demo', 'live', 'future'))");
  });

  it('aggiunge colonna ip_hash', () => {
    expect(mig028).toContain('ADD COLUMN IF NOT EXISTS ip_hash');
  });

  it('aggiunge colonna user_agent_hash', () => {
    expect(mig028).toContain('ADD COLUMN IF NOT EXISTS user_agent_hash');
  });

  it('crea ruolo audit_reader', () => {
    expect(mig028).toContain('audit_reader');
    expect(mig028).toContain('CREATE ROLE');
  });

  it('crea policy audit_reader_select', () => {
    expect(mig028).toContain('audit_reader_select');
  });

  it('è wrapped in BEGIN/COMMIT', () => {
    expect(mig028).toContain('BEGIN');
    expect(mig028).toContain('COMMIT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Invariante di coerenza: i tre layer nominano la stessa dottrina
// ─────────────────────────────────────────────────────────────────────────────

describe('B168 — invariante defense in depth: tutti i layer nominano il principio', () => {
  it('middleware cita "defense in depth"', () => {
    expect(middleware).toContain('defense in depth');
  });

  it('worker layout cita "by design" (non un redirect generico)', () => {
    expect(workerLayout).toContain('by design');
  });

  it('company layout cita "defense in depth"', () => {
    expect(companyLayout).toContain('defense in depth');
  });
});
