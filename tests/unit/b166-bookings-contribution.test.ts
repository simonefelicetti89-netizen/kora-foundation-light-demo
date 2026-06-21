/**
 * B166 — Prenotazioni cross-azienda + alimentazione KORA Contribution
 *
 * Test strutturali, unit test su logica pura (haversine, moltiplicatori, pesi),
 * e invarianti di privacy/anonimato derivabili dal codice senza DB live.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}
function exists(rel: string): boolean {
  try { readFileSync(resolve(ROOT, rel)); return true; } catch { return false; }
}
function strip(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '');
}

// ── 1. File existence ─────────────────────────────────────────────────────────

describe('B166 — file existence', () => {
  it('migration 025 esiste', () => {
    expect(exists('supabase/migrations/025_commons_booking_contribution.sql')).toBe(true);
  });

  it('lib/commons/booking-types.ts esiste', () => {
    expect(exists('lib/commons/booking-types.ts')).toBe(true);
  });

  it('lib/commons/cross-company-attribution.ts esiste', () => {
    expect(exists('lib/commons/cross-company-attribution.ts')).toBe(true);
  });

  it('services/commons/BookingService.ts esiste', () => {
    expect(exists('services/commons/BookingService.ts')).toBe(true);
  });

  it('components/commons/AdminBookingModerationSection.tsx esiste', () => {
    expect(exists('components/commons/AdminBookingModerationSection.tsx')).toBe(true);
  });

  it('API worker bookings route esiste', () => {
    expect(exists('app/api/worker/commons/bookings/route.ts')).toBe(true);
  });

  it('API admin bookings route esiste', () => {
    expect(exists('app/api/admin/commons/bookings/route.ts')).toBe(true);
  });

  it('API company contribution live route esiste', () => {
    expect(exists('app/api/company/contribution/live/route.ts')).toBe(true);
  });
});

// ── 2. Migration 025 — struttura tabelle ─────────────────────────────────────

describe('B166 — migration 025 struttura', () => {
  const sql = read('supabase/migrations/025_commons_booking_contribution.sql');

  it('crea commons.booking', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS commons.booking');
  });

  it('booking: UNIQUE (post_id, worker_identity_id)', () => {
    expect(sql).toContain('uq_booking_post_worker');
    expect(sql).toContain('post_id, worker_identity_id');
  });

  it('booking: status CHECK include tutti gli stati del workflow', () => {
    expect(sql).toContain("'pending'");
    expect(sql).toContain("'approved'");
    expect(sql).toContain("'rejected'");
    expect(sql).toContain("'cancelled'");
    expect(sql).toContain("'attended'");
  });

  it('booking: worker_tenant_id e post_tenant_id denormalizzati', () => {
    expect(sql).toContain('worker_tenant_id');
    expect(sql).toContain('post_tenant_id');
  });

  it('booking: moderated_by FK → auth.users', () => {
    expect(sql).toContain('moderated_by');
    expect(sql).toContain('auth.users');
  });

  it('booking: attended_at presente', () => {
    expect(sql).toContain('attended_at');
  });

  it('crea commons.contribution_event', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS commons.contribution_event');
  });

  it('contribution_event: role CHECK promoter | origin_employer', () => {
    expect(sql).toContain("'promoter'");
    expect(sql).toContain("'origin_employer'");
  });

  it('contribution_event: contribution_kind CHECK cross_company_participation | external_participants_event', () => {
    expect(sql).toContain("'cross_company_participation'");
    expect(sql).toContain("'external_participants_event'");
  });

  it('contribution_event: idempotenza UNIQUE per booking', () => {
    expect(sql).toContain('uq_contribution_booking');
    expect(sql).toContain('source_booking_id');
  });

  it('contribution_event: idempotenza UNIQUE per external participants', () => {
    expect(sql).toContain('uq_contribution_external');
    expect(sql).toContain('source_post_id');
  });

  it('worker_pib: aggiunge source_booking_id con indice unico', () => {
    expect(sql).toContain('source_booking_id');
    expect(sql).toContain('uq_worker_pib_booking_pillar');
  });

  it('funzione SECURITY DEFINER booking_aggregate_for_promoter', () => {
    expect(sql).toContain('booking_aggregate_for_promoter');
    expect(sql).toContain('SECURITY DEFINER');
  });

  it('Gate 2 OPEN annotation', () => {
    expect(sql).toContain('Gate 2 OPEN');
    expect(sql).toContain('NOT applied');
  });

  it('NOTIFY pgrst reload schema', () => {
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });
});

// ── 3. RLS commons.booking — privacy invarianti ──────────────────────────────

describe('B166 — RLS booking anonimato', () => {
  const sql = read('supabase/migrations/025_commons_booking_contribution.sql');

  it('booking: KORA_ADMIN ha policy ALL', () => {
    expect(sql).toContain('booking_kora_admin_all');
    expect(sql).toContain("kora.kora_role() = 'KORA_ADMIN'");
  });

  it('booking: WORKER vede solo le proprie (subquery worker_identity)', () => {
    expect(sql).toContain('booking_worker_own_all');
    expect(sql).toContain("kora.kora_role() = 'WORKER'");
    expect(sql).toContain('worker_identity_id IN');
    expect(sql).toContain('auth_user_id = auth.uid()');
  });

  it('booking: NESSUNA policy per COMPANY_ADMIN (anonimato garantito da schema)', () => {
    // Regex che cattura solo CREATE POLICY effettive su commons.booking (esclude commenti)
    const createPolicies = [...sql.matchAll(/CREATE POLICY[^;]+ON commons\.booking[^;]+;/g)].map((m) => m[0]);
    const companyPolicies = createPolicies.filter((p) => p.toUpperCase().includes('COMPANY'));
    expect(companyPolicies.length).toBe(0);
  });

  it('contribution_event: COMPANY_ADMIN vede SOLO il proprio tenant', () => {
    expect(sql).toContain('contribution_event_company_own_select');
    expect(sql).toContain("kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')");
    // Canonical helper (auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id')::uuid
    // replaced with kora.tenant_id() — same semantics, canonical pattern.
    expect(sql).toContain('kora.tenant_id()');
  });

  it('funzione aggregate valida ruolo prima di restituire dati', () => {
    expect(sql).toContain('v_caller_role');
    expect(sql).toContain("RAISE EXCEPTION 'booking_aggregate_for_promoter: accesso negato");
  });

  it('funzione aggregate verifica che COMPANY_ADMIN sia del tenant della post', () => {
    expect(sql).toContain("v_caller_role = 'COMPANY_ADMIN'");
    expect(sql).toContain('v_post_tenant_id');
  });
});

// ── 4. Moltiplicatore cross_company — valore e commento metodologico ──────────

describe('B166 — moltiplicatore cross_company', () => {
  const src = read('lib/commons/cross-company-attribution.ts');

  it('CROSS_COMPANY_MULTIPLIER esportato come costante', () => {
    expect(src).toContain('export const CROSS_COMPANY_MULTIPLIER');
  });

  it('CROSS_COMPANY_MULTIPLIER = 1.30 (valore default)', () => {
    expect(src).toContain('CROSS_COMPANY_MULTIPLIER = 1.30');
  });

  it('commento metodologico con range e riferimento Delphi Study', () => {
    expect(src).toContain('Delphi');
    expect(src).toContain('[1.10, 1.50]');
    expect(src).toContain('pre-empirical');
  });

  it('moltiplicatore applicato prima della scrittura su worker_pib', () => {
    const stripped = strip(src);
    // Cerca iu_value * CROSS_COMPANY_MULTIPLIER nel codice
    expect(stripped).toContain('iu_value * CROSS_COMPANY_MULTIPLIER');
    expect(stripped).toContain('source_booking_id');
  });

  it('source_uef_record_id resettato a null (non è un evento UEF)', () => {
    const stripped = strip(src);
    expect(stripped).toContain('source_uef_record_id: null');
  });
});

// ── 5. IU maggiorato — valore superiore rispetto a company-sourced normale ───

describe('B166 — IU maggiorato cross_company', () => {
  it('con moltiplicatore 1.30, IU cross_company > IU normale', async () => {
    const { CROSS_COMPANY_MULTIPLIER } = await import('@/lib/commons/cross-company-attribution');
    const baseIU = 0.720; // valore base
    const boostedIU = baseIU * CROSS_COMPANY_MULTIPLIER;
    expect(boostedIU).toBeGreaterThan(baseIU);
    expect(boostedIU).toBeCloseTo(0.936, 2);
  });

  it('CROSS_COMPANY_MULTIPLIER è nel range metodologico [1.10, 1.50]', async () => {
    const { CROSS_COMPANY_MULTIPLIER } = await import('@/lib/commons/cross-company-attribution');
    expect(CROSS_COMPANY_MULTIPLIER).toBeGreaterThanOrEqual(1.10);
    expect(CROSS_COMPANY_MULTIPLIER).toBeLessThanOrEqual(1.50);
  });
});

// ── 6. External participants — peso ridotto (Nodo A self_declared) ────────────

describe('B166 — external participants peso ridotto', () => {
  const src = read('lib/commons/cross-company-attribution.ts');

  it('peso self_declared definito come costante', () => {
    const stripped = strip(src);
    expect(stripped).toContain('EXTERNAL_PARTICIPANT_SELF_DECLARED_WEIGHT');
  });

  it('peso self_declared < peso verified', () => {
    // Verifica che la costante self_declared sia numericamente < verified
    const selfMatch    = src.match(/EXTERNAL_PARTICIPANT_SELF_DECLARED_WEIGHT\s*=\s*([0-9.]+)/);
    const verifiedMatch = src.match(/EXTERNAL_PARTICIPANT_VERIFIED_WEIGHT\s*=\s*([0-9.]+)/);
    expect(selfMatch).toBeTruthy();
    expect(verifiedMatch).toBeTruthy();
    const selfDeclared = parseFloat(selfMatch![1]);
    const verified     = parseFloat(verifiedMatch![1]);
    expect(selfDeclared).toBeLessThan(verified);
  });

  it('peso per partecipante esterno moltiplicato per externalCount', () => {
    const stripped = strip(src);
    expect(stripped).toContain('externalCount * weightPerPerson');
  });
});

// ── 7. Due righe Contribution per booking attended ────────────────────────────

describe('B166 — due righe Contribution per booking attended', () => {
  const src = read('lib/commons/cross-company-attribution.ts');

  it('attributeContributionForBooking crea riga promoter', () => {
    expect(src).toContain("role:               'promoter'");
  });

  it('attributeContributionForBooking crea riga origin_employer', () => {
    expect(src).toContain("role:               'origin_employer'");
  });

  it('promoter usa postTenantId, origin_employer usa workerTenantId', () => {
    const stripped = strip(src);
    // Entrambi i tenant devono apparire nei row objects
    expect(stripped).toContain('tenant_id:          postTenantId');
    expect(stripped).toContain('tenant_id:          workerTenantId');
  });

  it('idempotenza via error code 23505', () => {
    expect(src).toContain("error.code === '23505'");
    expect(src).toContain('idempotente');
  });
});

// ── 8. BookingService — contract e privacy ────────────────────────────────────

describe('B166 — BookingService contract', () => {
  const src = read('services/commons/BookingService.ts');

  it('esporta createBooking', () => {
    expect(src).toContain('export async function createBooking');
  });

  it('esporta listMyBookings', () => {
    expect(src).toContain('export async function listMyBookings');
  });

  it('esporta cancelBooking', () => {
    expect(src).toContain('export async function cancelBooking');
  });

  it('esporta listPendingForModeration', () => {
    expect(src).toContain('export async function listPendingForModeration');
  });

  it('esporta moderate', () => {
    expect(src).toContain('export async function moderate');
  });

  it('esporta markAttended', () => {
    expect(src).toContain('export async function markAttended');
  });

  it('esporta getAggregateForPromoter', () => {
    expect(src).toContain('export async function getAggregateForPromoter');
  });

  it('createBooking valida opening_grade=cross_company', () => {
    expect(src).toContain("post.opening_grade !== 'cross_company'");
  });

  it('createBooking valida capacità cross_company', () => {
    expect(src).toContain('capacity_cross');
    expect(src).toContain('Capienza cross-azienda esaurita');
  });

  it('createBooking: idempotenza su UNIQUE (post_id, worker_identity_id)', () => {
    expect(src).toContain("error.code === '23505'");
    expect(src).toContain('Prenotazione già esistente');
  });

  it('cancelBooking: solo pending | approved cancellabili', () => {
    expect(src).toContain("['pending', 'approved'].includes");
  });

  it('moderate: solo pending moderabile', () => {
    const stripped = strip(src);
    expect(stripped).toContain("b.status !== 'pending'");
  });

  it('markAttended: usa serviceDb per attribution hook', () => {
    expect(src).toContain('serviceDb:');
    expect(src).toContain('ServiceDb');
    expect(src).toContain('attributePIBForBooking');
    expect(src).toContain('attributeContributionForBooking');
  });

  it('getAggregateForPromoter: chiama funzione RPC SECURITY DEFINER', () => {
    expect(src).toContain('booking_aggregate_for_promoter');
    expect(src).toContain('rpc(');
  });
});

// ── 9. API routes — getSupabaseServerClient (contratto B163) ─────────────────

describe('B166 — API routes usano getSupabaseServerClient', () => {
  const routes = [
    'app/api/worker/commons/bookings/route.ts',
    'app/api/worker/commons/bookings/[id]/route.ts',
    'app/api/admin/commons/bookings/route.ts',
    'app/api/admin/commons/bookings/[id]/route.ts',
    'app/api/company/commons/bookings/aggregate/route.ts',
    'app/api/company/contribution/live/route.ts',
  ];

  for (const route of routes) {
    it(`${route} — NON usa getSupabaseServiceClient direttamente nelle route worker/company`, () => {
      const src     = read(route);
      const stripped = strip(src);
      // Worker e company routes non devono usare service client
      if (route.includes('/worker/') || route.includes('/company/')) {
        expect(stripped).not.toContain('getSupabaseServiceClient');
      }
      // Tutte le route devono avere getSupabaseServerClient
      expect(stripped).toContain('getSupabaseServerClient');
    });
  }

  it('admin [id] route usa serviceDb per attribution (pattern B164)', () => {
    const src = read('app/api/admin/commons/bookings/[id]/route.ts');
    expect(src).toContain('getSupabaseServiceClient');
    expect(src).toContain('serviceDb');
  });
});

// ── 10. Anonimato — worker_identity_id MAI esposto a company ────────────────

describe('B166 — anonimato worker_identity_id', () => {
  it('worker GET route rimuove worker_identity_id dalla risposta', () => {
    const src = read('app/api/worker/commons/bookings/route.ts');
    expect(src).toContain('worker_identity_id: _wid');
  });

  it('worker POST route rimuove worker_identity_id dalla risposta', () => {
    const src = read('app/api/worker/commons/bookings/route.ts');
    expect(src).toContain('worker_identity_id: _wid');
  });

  it('admin GET non seleziona worker_identity_id (listPendingForModeration SELECT)', () => {
    const src = read('services/commons/BookingService.ts');
    // listPendingForModeration SELECT non include worker_identity_id
    const listFn = src.split('export async function listPendingForModeration')[1]?.split('export async function')[0] ?? '';
    expect(listFn).not.toContain('worker_identity_id');
  });

  it('AdminBookingModerationSection NON mostra worker_identity_id', () => {
    const src = read('components/commons/AdminBookingModerationSection.tsx');
    const stripped = strip(src);
    expect(stripped).not.toContain('worker_identity_id');
  });
});

// ── 11. Value Chain — zero logica attiva ──────────────────────────────────────

describe('B166 — value_chain zero logica attiva', () => {
  it('BookingService NON ha logica value_chain', () => {
    const src = read('services/commons/BookingService.ts');
    expect(src).not.toContain('value_chain');
  });

  it('cross-company-attribution NON ha logica value_chain', () => {
    const src = read('lib/commons/cross-company-attribution.ts');
    expect(src).not.toContain('value_chain');
  });

  it('migration 025 NON crea logica value_chain', () => {
    const sql = read('supabase/migrations/025_commons_booking_contribution.sql');
    expect(sql).not.toContain('CREATE FUNCTION');
    expect(sql).not.toContain('value_chain');
  });
});

// ── 12. KORA Contribution — NON è componente KORA Index ──────────────────────

describe('B166 — KORA Contribution companion indicator', () => {
  it('LiveContributionSummary: is_kora_index_component: false (tipo hardcoded)', () => {
    const src = read('lib/commons/booking-types.ts');
    expect(src).toContain('is_kora_index_component:       false');
  });

  it('getContributionLive ritorna is_kora_index_component: false', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    const liveSection = src.split('export async function getContributionLive')[1] ?? '';
    expect(liveSection).toContain('is_kora_index_component:      false');
  });

  it('company contribution page mostra "Non componente KORA Index"', () => {
    const src = read('app/company/contribution/page.tsx');
    expect(src).toContain('Non componente KORA Index');
  });

  it('company contribution page ha disclaimer metodologico non sopprimibile', () => {
    const src = read('app/company/contribution/page.tsx');
    expect(src).toContain('contribution-methodology-notice');
    expect(src).toContain('non calibrata empiricamente');
  });

  it('KoraContributionService ha commento CLAUDE.md §12.7', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    expect(src).toContain('CLAUDE.md §12.7');
  });
});

// ── 13. Feature gating getContributionLive — production_ready ─────────────────

describe('B166 — feature gate getContributionLive', () => {
  it('getContributionLive controlla production_ready prima di leggere il DB', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    const liveSection = src.split('export async function getContributionLive')[1] ?? '';
    expect(liveSection).toContain('production_ready');
    expect(liveSection).toContain('return null');
  });

  it('API live route: tenant non Pilot+ → 404 esplicito', () => {
    const src = read('app/api/company/contribution/live/route.ts');
    expect(src).toContain('404');
    expect(src).toContain('production_ready');
  });

  it('company contribution page: tenant non Pilot+ mostra FL preview (non shell vuota)', () => {
    const src = read('app/company/contribution/page.tsx');
    expect(src).toContain('contribution-foundation-light-preview');
    expect(src).toContain('contribution-live-data');
  });
});

// ── 14. Worker commons page — pulsante Prenota ────────────────────────────────

describe('B166 — worker commons page prenota', () => {
  const src = read('app/worker/commons/page.tsx');

  it('ha pulsante Prenota partecipazione', () => {
    expect(src).toContain('Prenota partecipazione');
  });

  it('il form punta a /api/worker/commons/bookings', () => {
    expect(src).toContain('/api/worker/commons/bookings');
  });

  it('il pulsante è visibile solo per grade=cross_company', () => {
    expect(src).toContain("grade === 'cross_company'");
  });

  it('avviso privacy: nome non visibile all\'organizzatore', () => {
    expect(src).toContain('nome non è visibile all');
  });

  it('data-testid worker-booking-form presente', () => {
    expect(src).toContain('worker-booking-form-');
  });
});

// ── 15. Admin booking panel — privacy e UI ───────────────────────────────────

describe('B166 — admin booking moderation panel', () => {
  const src = read('components/commons/AdminBookingModerationSection.tsx');

  it('ha privacy notice anonimato', () => {
    expect(src).toContain('admin-booking-privacy-notice');
    expect(src).toContain('Anonimato worker garantito');
  });

  it('mostra promotore e azienda di provenienza (tenant label, non worker)', () => {
    expect(src).toContain('Promotore:');
    expect(src).toContain('Provenienza:');
  });

  it('ha bottoni approve, reject, attended', () => {
    expect(src).toContain('admin-booking-approve-');
    expect(src).toContain('admin-booking-reject-');
    expect(src).toContain('admin-booking-attended-');
  });

  it('ha data-testid admin-booking-moderation-section', () => {
    expect(src).toContain('admin-booking-moderation-section');
  });

  it('chiama API PATCH con action approve/reject/attended', () => {
    expect(src).toContain("action, notes:");
    expect(src).toContain('/api/admin/commons/bookings/');
  });
});

// ── 16. Grep invariant B163 — no service-client nelle route worker/company ────

describe('B166 — B163 service-client invariant', () => {
  const workerRoutes = [
    'app/api/worker/commons/bookings/route.ts',
    'app/api/worker/commons/bookings/[id]/route.ts',
  ];

  const companyRoutes = [
    'app/api/company/commons/bookings/aggregate/route.ts',
    'app/api/company/contribution/live/route.ts',
  ];

  for (const route of [...workerRoutes, ...companyRoutes]) {
    it(`${route} non importa getSupabaseServiceClient`, () => {
      const stripped = strip(read(route));
      expect(stripped).not.toContain('getSupabaseServiceClient');
    });
  }
});
