// tests/unit/b162-pilot-plus-capability.test.ts
// B162 — Accensione branch Pilot+ di WorkerSpaceCapabilityService.
//
// Copertura:
//   1. Migrazione 021 — struttura SQL corretta (source audit)
//   2. Tipo KoraTenant — production_ready è boolean, 8 governance label restano false literal
//   3. Service Foundation Light — production_ready=false invariato (no regressione)
//   4. Service Pilot+ — production_ready=true, roster vuoto e roster attivo
//   5. Route promote-to-pilot — auth, idempotenza, audit, no service client

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function strip(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

// ── 1. Migrazione 021 — struttura SQL ─────────────────────────────────────────

describe('B162 Migrazione 021 — tenant Pilot+ columns', () => {
  const SQL = 'supabase/migrations/021_tenant_pilot_ready.sql';

  it('file esiste', () => {
    expect(() => read(SQL)).not.toThrow();
  });

  it('aggiunge production_ready boolean NOT NULL DEFAULT false', () => {
    const sql = read(SQL);
    expect(sql).toContain('production_ready');
    expect(sql).toContain('boolean');
    expect(sql).toContain('NOT NULL');
    expect(sql).toContain('DEFAULT false');
  });

  it('aggiunge production_ready_at timestamptz', () => {
    const sql = read(SQL);
    expect(sql).toContain('production_ready_at');
    expect(sql).toContain('timestamptz');
  });

  it('aggiunge production_ready_by text', () => {
    const sql = read(SQL);
    expect(sql).toContain('production_ready_by');
    expect(sql).toContain('text');
  });

  it('indice parziale WHERE production_ready = true', () => {
    const sql = read(SQL);
    expect(sql).toContain('CREATE INDEX');
    expect(sql).toContain('WHERE production_ready = true');
  });

  it('policy INSERT su audit.audit_log per KORA_ADMIN', () => {
    const sql = read(SQL);
    expect(sql).toContain('kora_admin_insert_audit');
    expect(sql).toContain('FOR INSERT');
    expect(sql).toContain("'KORA_ADMIN'");
  });

  it('DEFAULT false garantisce no tenant diventa Pilot+ automaticamente', () => {
    const sql = read(SQL);
    // Nessuna UPDATE che setta production_ready = true (sarebbe un backfill indesiderato)
    expect(sql).not.toMatch(/UPDATE[\s\S]*?SET[\s\S]*?production_ready\s*=\s*true/);
  });

  it('gate annotation: Gate 2 OPEN — written, NOT applied', () => {
    expect(read(SQL)).toContain('Gate 2 OPEN');
    expect(read(SQL)).toContain('NOT applied');
  });
});

// ── 2. Tipo KoraTenant — modifica chirurgica ──────────────────────────────────

describe('B162 Tipo KoraTenant — production_ready è boolean, altre restano literal false', () => {
  const TYPES = 'lib/types/index.ts';

  it('KoraTenant.production_ready è boolean (non false literal)', () => {
    const src = read(TYPES);
    // Cerca il blocco KoraTenant e verifica che production_ready sia boolean
    const tenantBlock = src.slice(src.indexOf('export interface KoraTenant {'));
    const closingBrace = tenantBlock.indexOf('\n}');
    const block = tenantBlock.slice(0, closingBrace);
    expect(block).toContain('production_ready:    boolean');
    expect(block).not.toContain('production_ready: false');
  });

  it('KoraTenant ha production_ready_at e production_ready_by come campi opzionali', () => {
    const src = read(TYPES);
    const tenantBlock = src.slice(src.indexOf('export interface KoraTenant {'));
    const closingBrace = tenantBlock.indexOf('\n}');
    const block = tenantBlock.slice(0, closingBrace);
    expect(block).toContain('production_ready_at');
    expect(block).toContain('production_ready_by');
  });

  it('DynamicScoringPreviewOutput.production_ready resta false literal (governance label)', () => {
    const src = read(TYPES);
    const block = src.slice(src.indexOf('DynamicScoringPreviewOutput'));
    const end   = block.indexOf('\n}');
    expect(block.slice(0, end)).toContain('production_ready: false');
  });

  it('CompanyDecisionPack.production_ready resta false literal', () => {
    const src = read(TYPES);
    const block = src.slice(src.indexOf('export interface CompanyDecisionPack {'));
    const end   = block.indexOf('\n}');
    expect(block.slice(0, end)).toContain('production_ready: false');
  });

  it('CompanyOnboardingRecord.production_ready resta false literal', () => {
    const src = read(TYPES);
    const block = src.slice(src.indexOf('export interface CompanyOnboardingRecord {'));
    const end   = block.indexOf('\n}');
    expect(block.slice(0, end)).toContain('production_ready: false');
  });

  it('CompanySetupDraft.production_ready resta false literal', () => {
    const src = read(TYPES);
    const block = src.slice(src.indexOf('export interface CompanySetupDraft {'));
    const end   = block.indexOf('\n}');
    expect(block.slice(0, end)).toContain('production_ready: false');
  });
});

// ── 3 & 4. Service — Foundation Light invariato + Pilot+ attivato ─────────────

// Mock del WorkerProvisioningService per isolare il service dai dati sintetici.
const mockGetWorkers = vi.fn();

vi.mock('@/services/worker-provisioning/WorkerProvisioningService', () => ({
  workerProvisioningService: {
    getWorkersForCompany: (companyId: string) => mockGetWorkers(companyId),
  },
}));

import { workerSpaceCapabilityService } from '@/services/worker-space/WorkerSpaceCapabilityService';
import type { KoraTenant } from '@/lib/types';

function makeTenant(overrides: Partial<KoraTenant> = {}): KoraTenant {
  return {
    tenant_id:              'tenant-test-001',
    company_id:             'company-test-001',
    company_name:           'Test Co',
    legal_name:             'Test Co S.r.l.',
    sector:                 'manifattura',
    territory:              'Lombardia',
    headquarters_location:  'Milano',
    employee_count:         100,
    size_band:              'mid_50_249',
    kora_plan:              'Foundation Light',
    analysis_period:        '2025',
    tenant_status:          'active',
    onboarding_status:      'decision_pack_ready',
    data_readiness_status:  'high',
    decision_pack_status:   'ready',
    created_at:             '2025-01-01T00:00:00Z',
    updated_at:             '2025-01-01T00:00:00Z',
    production_ready:       false,
    synthetic_demo_data:    true,
    ...overrides,
  };
}

const WORKER_ENABLED  = { my_kora_enabled: true };
const WORKER_DISABLED = { my_kora_enabled: false };

describe('B162 Service Foundation Light — production_ready=false invariato', () => {
  beforeEach(() => { mockGetWorkers.mockReset(); });

  it('production_ready=false, roster con worker abilitato → ENABLED, mode=preview, pibSupported=false', () => {
    mockGetWorkers.mockReturnValue([WORKER_ENABLED, WORKER_ENABLED]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: false }));

    expect(cap.status).toBe('ENABLED');
    expect(cap.mode).toBe('preview');
    expect(cap.enabled).toBe(true);
    expect(cap.pibSupported).toBe(false);  // mai true in Foundation Light
  });

  it('production_ready=false, roster vuoto → NOT_ENABLED, mode=preview, pibSupported=false', () => {
    mockGetWorkers.mockReturnValue([]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: false }));

    expect(cap.status).toBe('NOT_ENABLED');
    expect(cap.mode).toBe('preview');
    expect(cap.enabled).toBe(false);
    expect(cap.pibSupported).toBe(false);
  });

  it('production_ready=false con roster → note contiene "PREVIEW mode"', () => {
    mockGetWorkers.mockReturnValue([WORKER_ENABLED]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: false }));
    expect(cap.note).toContain('PREVIEW');
  });

  it('collectiveSupported e dynamicCvSupported restano true in preview', () => {
    mockGetWorkers.mockReturnValue([WORKER_ENABLED]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: false }));
    expect(cap.collectiveSupported).toBe(true);
    expect(cap.dynamicCvSupported).toBe(true);
  });
});

describe('B162 Service Pilot+ — production_ready=true', () => {
  beforeEach(() => { mockGetWorkers.mockReset(); });

  it('production_ready=true, roster vuoto → status=PILOT_READY, pibSupported=false', () => {
    mockGetWorkers.mockReturnValue([]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: true }));

    expect(cap.status).toBe('PILOT_READY');
    expect(cap.mode).toBe('pilot_ready');
    expect(cap.enabled).toBe(true);
    expect(cap.pibSupported).toBe(false);  // nessun worker → PIB non utile
  });

  it('production_ready=true, roster con worker abilitato → pibSupported=true', () => {
    mockGetWorkers.mockReturnValue([WORKER_ENABLED, WORKER_DISABLED]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: true }));

    expect(cap.status).toBe('PILOT_READY');
    expect(cap.pibSupported).toBe(true);
  });

  it('production_ready=true, roster solo worker non abilitati → pibSupported=false', () => {
    mockGetWorkers.mockReturnValue([WORKER_DISABLED, WORKER_DISABLED]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: true }));

    expect(cap.status).toBe('PILOT_READY');
    expect(cap.pibSupported).toBe(false);
  });

  it('production_ready=true → collectiveSupported e dynamicCvSupported true', () => {
    mockGetWorkers.mockReturnValue([WORKER_ENABLED]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: true }));
    expect(cap.collectiveSupported).toBe(true);
    expect(cap.dynamicCvSupported).toBe(true);
    expect(cap.workerCountSupported).toBe(true);
  });

  it('note Pilot+ contiene "Pilot+ attivo" e "PIB individuale disponibile" quando pibSupported=true', () => {
    mockGetWorkers.mockReturnValue([WORKER_ENABLED]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: true }));
    expect(cap.note).toContain('Pilot+ attivo');
    expect(cap.note).toContain('PIB individuale disponibile');
  });

  it('note Pilot+ contiene avviso "non disponibile" quando roster vuoto', () => {
    mockGetWorkers.mockReturnValue([]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: true }));
    expect(cap.note).toContain('non disponibile');
  });

  it('pibSupported conta myKoraEnabled, non il totale del roster', () => {
    // 3 worker in totale, 0 abilitati → pibSupported=false
    mockGetWorkers.mockReturnValue([WORKER_DISABLED, WORKER_DISABLED, WORKER_DISABLED]);
    const cap = workerSpaceCapabilityService.getCapability(makeTenant({ production_ready: true }));
    expect(cap.pibSupported).toBe(false);
  });
});

// ── 5. Route promote-to-pilot — audit strutturale (source audit) ───────────────

describe('B162 Route promote-to-pilot — invarianti strutturali', () => {
  const ROUTE = "app/api/admin/tenants/[id]/promote-to-pilot/route.ts";

  it('file esiste', () => {
    expect(() => read(ROUTE)).not.toThrow();
  });

  it('usa requireKoraAdmin (non requireCompanyUser o simili)', () => {
    expect(read(ROUTE)).toContain('requireKoraAdmin');
    expect(read(ROUTE)).not.toContain('requireCompanyUser');
  });

  it('usa getSupabaseServerClient (non getSupabaseServiceClient)', () => {
    const stripped = strip(read(ROUTE));
    expect(stripped).toContain('getSupabaseServerClient');
    expect(stripped).not.toContain('getSupabaseServiceClient');
  });

  it('implementa solo POST (non GET/PUT/DELETE)', () => {
    const src = read(ROUTE);
    expect(src).toContain('export async function POST');
    expect(src).not.toContain('export async function GET');
    expect(src).not.toContain('export async function PUT');
    expect(src).not.toContain('export async function DELETE');
  });

  it('idempotenza: controlla production_ready prima di aggiornare', () => {
    const src = read(ROUTE);
    expect(src).toContain('tenant.production_ready');
    expect(src).toContain('already_pilot');
  });

  it('risposta idempotente preserva timestamp originale (non usa promotedAt per already_pilot)', () => {
    const src = read(ROUTE);
    // Quando already_pilot=true, usa tenant.production_ready_at (non una nuova data)
    expect(src).toContain('tenant.production_ready_at');
    expect(src).toContain('already_pilot: true');
    expect(src).toContain('already_pilot: false');
  });

  it('scrive in audit.audit_log con action=tenant_promoted_to_pilot', () => {
    const src = read(ROUTE);
    expect(src).toContain('audit_log');
    expect(src).toContain('tenant_promoted_to_pilot');
    expect(src).toContain('before_state');
    expect(src).toContain('after_state');
  });

  it('audit failure non blocca la risposta (promozione già avvenuta)', () => {
    const src = read(ROUTE);
    // L'errore audit è gestito con console.error, non con return 500
    expect(src).toContain('auditErr');
    expect(src).toContain('console.error');
  });

  it('risponde 404 se il tenant non esiste o è eliminato', () => {
    const src = read(ROUTE);
    expect(src).toContain('404');
    expect(src).toContain('deleted_at');
  });

  it('risposta include promoted_at e promoted_by', () => {
    const src = read(ROUTE);
    expect(src).toContain('promoted_at');
    expect(src).toContain('promoted_by');
  });

  it('persiste production_ready_at e production_ready_by nel DB (non solo in risposta)', () => {
    const src = read(ROUTE);
    expect(src).toContain('production_ready_at: promotedAt');
    expect(src).toContain('production_ready_by: promotedBy');
  });
});

// ── 6. Invariante — nessun tenant Foundation Light diventa Pilot+ per default ──

describe('B162 Invariante — default safe per tenant Foundation Light', () => {
  it('seed sintetico ha production_ready: false per tutti i tenant', () => {
    const seed = JSON.parse(read('data/synthetic/tenants.json'));
    const tenants: Array<Record<string, unknown>> = seed.data ?? seed;
    for (const t of tenants) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((t as any).production_ready).toBe(false);
    }
  });

  it('TenantService.createTenantDraft hardcoda production_ready: false', () => {
    const src = read('services/tenant/TenantService.ts');
    // Nel corpo di createTenantDraft
    const draftFn = src.slice(src.indexOf('createTenantDraft'));
    const end     = draftFn.indexOf('\n  }');
    expect(draftFn.slice(0, end)).toContain('production_ready: false');
  });

  it('migrazione 021 DEFAULT false (nessun backfill a true)', () => {
    const sql = read('supabase/migrations/021_tenant_pilot_ready.sql');
    expect(sql).toContain('DEFAULT false');
    // Rimuove commenti SQL (-- linea e /* blocco */) prima di cercare UPDATE attivi
    const sqlNoComments = sql
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(sqlNoComments).not.toMatch(/UPDATE\s+analytics\.tenant\s+SET[\s\S]*?production_ready\s*=\s*true/i);
  });
});
