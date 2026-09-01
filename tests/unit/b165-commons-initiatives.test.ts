/**
 * B165 — KORA Space: iniziative partecipabili con luogo e gradi di apertura
 *
 * Structural + unit tests. No live DB, no browser, no Leaflet.
 * Leaflet UI test sono fuori scope (browser-side).
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

describe('B165 — file existence', () => {
  it('migration 024 esiste', () => {
    expect(exists('supabase/migrations/024_commons_initiative_fields.sql')).toBe(true);
  });

  it('geocoding helper esiste', () => {
    expect(exists('lib/commons/geocoding.ts')).toBe(true);
  });

  it('initiatives API route esiste', () => {
    expect(exists('app/api/commons/initiatives/route.ts')).toBe(true);
  });

  it('InitiativesMap component esiste', () => {
    expect(exists('components/commons/InitiativesMap.tsx')).toBe(true);
  });
});

// ── 2. Migration 024 — struttura e invarianti ─────────────────────────────────

describe('B165 — migration 024 structure', () => {
  const sql = read('supabase/migrations/024_commons_initiative_fields.sql');

  it('estende commons.post (ALTER TABLE, non CREATE TABLE)', () => {
    expect(sql).toContain('ALTER TABLE commons.post');
    expect(sql).not.toContain('CREATE TABLE IF NOT EXISTS commons.post');
  });

  it('aggiunge opening_grade con CHECK constraint', () => {
    expect(sql).toContain('opening_grade');
    expect(sql).toContain("'company_internal'");
    expect(sql).toContain("'company_extended'");
    expect(sql).toContain("'cross_company'");
  });

  it('aggiunge location_address, location_lat, location_lng', () => {
    expect(sql).toContain('location_address');
    expect(sql).toContain('location_lat');
    expect(sql).toContain('location_lng');
  });

  it('location_lat è numeric(9,6)', () => {
    expect(sql).toContain('numeric(9,6)');
  });

  it('aggiunge event_start_at e event_end_at (timestamptz)', () => {
    expect(sql).toContain('event_start_at');
    expect(sql).toContain('event_end_at');
    expect(sql).toContain('timestamptz');
  });

  it('aggiunge capacity_internal e capacity_cross', () => {
    expect(sql).toContain('capacity_internal');
    expect(sql).toContain('capacity_cross');
  });

  it('aggiunge external_participants_count con DEFAULT 0', () => {
    expect(sql).toContain('external_participants_count');
    expect(sql).toContain('DEFAULT 0');
  });

  it('external_participants_evidence CHECK self_declared | verified', () => {
    expect(sql).toContain('external_participants_evidence');
    expect(sql).toContain("'self_declared'");
    expect(sql).toContain("'verified'");
  });

  it('predisposizione value_chain_supplier_count (zero logica attiva)', () => {
    expect(sql).toContain('value_chain_supplier_count');
    // verifica che sia documentata come predisposizione senza logica attiva
    expect(sql.toLowerCase()).toContain('value chain');
  });

  it('CHECK constraint cross_company richiede capacity_cross NOT NULL', () => {
    expect(sql).toContain('post_cross_company_capacity_required');
    expect(sql).toContain("opening_grade != 'cross_company'");
    expect(sql).toContain('capacity_cross IS NOT NULL');
  });

  it('tutti i nuovi campi sono NULL (retrocompatibilità)', () => {
    // Ogni ADD COLUMN non deve avere NOT NULL senza default per i campi nuovi
    // apertura_grade è nullable → i post esistenti restano invariati
    const addCols = sql.split('\n').filter((l) => l.includes('ADD COLUMN') && l.includes('opening_grade'));
    expect(addCols.some((l) => l.includes('NOT NULL'))).toBe(false);
  });

  it('RLS cross-company: policy worker per cross_company di qualsiasi tenant', () => {
    expect(sql).toContain('commons_post_worker_cross_company_select');
    expect(sql).toContain("opening_grade = 'cross_company'");
    // NON deve filtrare per tenant_id = kora.tenant_id() — è cross-tenant
    const policyBlock = sql.split('commons_post_worker_cross_company_select')[1]?.split(';')[0] ?? '';
    expect(policyBlock).not.toContain('kora.tenant_id()');
  });

  it('indice geografico su (location_lat, location_lng)', () => {
    expect(sql).toContain('idx_commons_post_geo');
    expect(sql).toContain('location_lat');
    expect(sql).toContain('location_lng');
  });

  it('Gate 2 annotation: written, not applied to any remote/production DB (corrected 2026-09-02 — the bare "NOT applied" wording was stale: this migration IS applied to local/CI ephemeral Postgres via the tracked migration ledger, verified by the mandatory DB-backed CI gate)', () => {
    expect(sql).toContain('Gate 2 OPEN');
    expect(sql).toContain('NOT applied to any remote/production DB');
  });

  it('NOTIFY pgrst reload schema', () => {
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });
});

// ── 3. Tipi TypeScript — InitiativeOpeningGrade ───────────────────────────────

describe('B165 — tipi TypeScript', () => {
  const types = read('lib/commons/types.ts');

  it('esporta InitiativeOpeningGrade', () => {
    expect(types).toContain('export type InitiativeOpeningGrade');
  });

  it('InitiativeOpeningGrade include tutti e tre i gradi', () => {
    expect(types).toContain("'company_internal'");
    expect(types).toContain("'company_extended'");
    expect(types).toContain("'cross_company'");
  });

  it('esporta OPENING_GRADE_LABELS', () => {
    expect(types).toContain('export const OPENING_GRADE_LABELS');
  });

  it('esporta CommonsPost con tutti i campi B165', () => {
    expect(types).toContain('export interface CommonsPost');
    expect(types).toContain('opening_grade');
    expect(types).toContain('location_lat');
    expect(types).toContain('event_start_at');
    expect(types).toContain('capacity_cross');
    expect(types).toContain('external_participants_count');
    expect(types).toContain('value_chain_supplier_count');
  });

  it('esporta CommonsPostWorkerView (subset worker-safe)', () => {
    expect(types).toContain('export interface CommonsPostWorkerView');
  });

  it('CommonsPost ha campi B165 nullable (retrocompatibilità)', () => {
    const postInterface = types.match(/interface CommonsPost \{[\s\S]*?\}/)?.[0] ?? '';
    // I campi B165 devono essere nullable
    expect(postInterface).toContain('opening_grade:');
    expect(postInterface).toContain('null');
  });
});

// ── 4. Geocoding — helper server-side ────────────────────────────────────────

describe('B165 — geocoding helper', () => {
  const geo = read('lib/commons/geocoding.ts');

  it('esporta geocodeAddress', () => {
    expect(geo).toContain('export async function geocodeAddress');
  });

  it('esporta haversineDistanceKm', () => {
    expect(geo).toContain('export function haversineDistanceKm');
  });

  it('usa User-Agent identificabile (fair-use Nominatim)', () => {
    expect(geo).toContain('KORA-Foundation-Light');
    expect(geo).toContain('User-Agent');
  });

  it('geocoding è server-side (no export default per uso client)', () => {
    // Il file non ha "use client" — è server-only
    expect(geo).not.toContain("'use client'");
    expect(geo).not.toContain('"use client"');
  });

  it('gestisce risposta vuota Nominatim → GeocodingFailure', () => {
    expect(geo).toContain('ok: false');
    expect(geo).toContain('Indirizzo non trovato');
  });

  it('gestisce timeout via AbortSignal', () => {
    expect(geo).toContain('AbortSignal');
  });
});

// ── 5. Haversine — calcolo distanza ──────────────────────────────────────────

describe('B165 — haversine distance', () => {
  // Test la funzione pura direttamente
  it('Milano-Roma ≈ 477 km (±20)', async () => {
    const { haversineDistanceKm } = await import('@/lib/commons/geocoding');
    const dist = haversineDistanceKm(45.4642, 9.1900, 41.9028, 12.4964);
    expect(dist).toBeGreaterThan(455);
    expect(dist).toBeLessThan(500);
  });

  it('stesso punto → 0 km', async () => {
    const { haversineDistanceKm } = await import('@/lib/commons/geocoding');
    const dist = haversineDistanceKm(45.0, 9.0, 45.0, 9.0);
    expect(dist).toBeCloseTo(0, 1);
  });

  it('punti vicini < 1 km', async () => {
    const { haversineDistanceKm } = await import('@/lib/commons/geocoding');
    // 0.01° ≈ 1 km in latitudine
    const dist = haversineDistanceKm(45.0, 9.0, 45.005, 9.005);
    expect(dist).toBeLessThan(1);
  });
});

// ── 6. getPublishedInitiatives — filtro geo ───────────────────────────────────

describe('B165 — getPublishedInitiatives geo filter', () => {
  it('CommonsService esporta getPublishedInitiatives', () => {
    const src = read('services/commons/CommonsService.ts');
    expect(src).toContain('export async function getPublishedInitiatives');
  });

  it('getPublishedInitiatives include near opts', () => {
    const src = read('services/commons/CommonsService.ts');
    expect(src).toContain('near?:');
    expect(src).toContain('radius_km');
  });

  it('filtro geo usa haversineDistanceKm (senza PostGIS)', () => {
    const src = read('services/commons/CommonsService.ts');
    expect(src).toContain('haversineDistanceKm');
  });

  it('filtra solo published e opening_grade NOT NULL', () => {
    const src = read('services/commons/CommonsService.ts');
    expect(src).toContain("'published'");
    expect(src).toContain('opening_grade');
  });

  it('row senza lat/lng incluse anche con filtro geo (no geo → include)', () => {
    const src = read('services/commons/CommonsService.ts');
    // Se location_lat è null → include (le iniziative senza coordinate sono sempre visibili)
    expect(src).toContain('location_lat == null');
    expect(src).toContain('return true');
  });
});

// ── 7. API /api/commons/initiatives ──────────────────────────────────────────

describe('B165 — initiatives API route', () => {
  const src = read('app/api/commons/initiatives/route.ts');

  it('usa getSupabaseServerClient (B163 pattern — no service-role)', () => {
    const stripped = strip(src);
    expect(stripped).toContain('getSupabaseServerClient');
    expect(stripped).not.toContain('getSupabaseServiceClient');
  });

  it('accetta near=lat,lng,radius_km come query param', () => {
    expect(src).toContain('near');
    expect(src).toContain('radius_km');
    expect(src).toContain('parseNear');
  });

  it('valida i parametri near (range controllo)', () => {
    expect(src).toContain('lat < -90');
    expect(src).toContain('radius_km <= 0');
  });

  it('chiama getPublishedInitiatives dal CommonsService', () => {
    const stripped = strip(src);
    expect(stripped).toContain('getPublishedInitiatives');
  });

  it('non richiede service-role (RLS garantisce visibilità cross-tenant)', () => {
    expect(src).not.toContain('getSupabaseServiceClient');
  });
});

// ── 8. API posts route — include campi B165 ───────────────────────────────────

describe('B165 — posts API estesa', () => {
  const src = read('app/api/commons/posts/route.ts');

  it('GET include opening_grade nei campi selezionati', () => {
    expect(src).toContain('opening_grade');
  });

  it('GET include location_lat, location_lng', () => {
    expect(src).toContain('location_lat');
    expect(src).toContain('location_lng');
  });

  it('POST valida opening_grade', () => {
    expect(src).toContain('VALID_OPENING_GRADES');
    expect(src).toContain("'company_internal'");
    expect(src).toContain("'cross_company'");
  });

  it('POST valida: cross_company richiede capacity_cross', () => {
    expect(src).toContain("openingGrade === 'cross_company'");
    expect(src).toContain('capacity_cross');
  });
});

// ── 9. API posts [id] — geocoding al publish ──────────────────────────────────

describe('B165 — PATCH [id] geocoding on publish', () => {
  const src = read('app/api/commons/posts/[id]/route.ts');

  it('importa geocodeAddress', () => {
    const stripped = strip(src);
    expect(stripped).toContain('geocodeAddress');
  });

  it('geocodifica al publish (status → published)', () => {
    expect(src).toContain("'published'");
    expect(src).toContain('geocodeAddress');
  });

  it('geocoding fallito → 422 (post NON pubblicato)', () => {
    expect(src).toContain('422');
    expect(src).toContain('Pubblicazione bloccata');
  });

  it('geocoding successo → location_lat/lng scritti', () => {
    expect(src).toContain("'location_lat'");
    expect(src).toContain("'location_lng'");
    expect(src).toContain('geo.result.lat');
  });

  it('COMPANY_ADMIN: aggiornamento location_address resetta lat/lng', () => {
    expect(src).toContain("updates['location_lat'] = null");
    expect(src).toContain("updates['location_lng'] = null");
  });
});

// ── 10. Boundary: worker NON vede company_internal di altro tenant ────────────

describe('B165 — boundary RLS cross-tenant', () => {
  const sql = read('supabase/migrations/024_commons_initiative_fields.sql');

  it('policy worker_published_select originale (mig 013) limita per tenant', () => {
    // La policy mig 013 filtra per tenant → company_internal/extended non cross-tenant.
    // Verifica che mig 013 usi il canonical helper kora.tenant_id() (aggiornato da
    // (auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id')::uuid — stesso semantics).
    const src013 = read('supabase/migrations/013_kora_commons.sql');
    expect(src013).toContain('commons_post_worker_published_select');
    expect(src013).toContain('kora.tenant_id()');
  });

  it('policy cross_company NON filtra per tenant (cross-tenant intenzionale)', () => {
    // [2] = tutto dopo la seconda occorrenza del nome (CREATE POLICY "..."), prima del primo ';'
    const policySection = sql.split('commons_post_worker_cross_company_select')[2]?.split(';')[0] ?? '';
    // La policy cross_company non deve contenere kora.tenant_id() — è cross-tenant
    expect(policySection).not.toContain('kora.tenant_id()');
    expect(policySection).not.toContain('kora_tenant_id');
  });

  it('policy cross_company filtra solo status=published E opening_grade=cross_company', () => {
    const policySection = sql.split('commons_post_worker_cross_company_select')[2]?.split(';')[0] ?? '';
    expect(policySection).toContain("status = 'published'");
    expect(policySection).toContain("opening_grade = 'cross_company'");
  });

  it('le due policy worker sono PERMISSIVE (default Postgres) — OR implicito', () => {
    // Entrambe le policy sono CREATE POLICY senza RESTRICTIVE → PERMISSIVE by default
    expect(sql).not.toContain('AS RESTRICTIVE');
  });
});

// ── 11. Value Chain — predisposizione ZERO logica attiva ─────────────────────

describe('B165 — value chain predisposizione', () => {
  it('migration 024: value_chain_supplier_count solo colonna, nessuna logica', () => {
    const sql = read('supabase/migrations/024_commons_initiative_fields.sql');
    expect(sql).toContain('value_chain_supplier_count');
    // Nessuna function, trigger, o policy specifica per value_chain
    expect(sql).not.toContain('CREATE FUNCTION');
    expect(sql).not.toContain('CREATE TRIGGER');
    const vcLines = sql.split('\n').filter((l) => l.includes('value_chain') && !l.trim().startsWith('--'));
    // Solo ADD COLUMN e COMMENT
    expect(vcLines.every((l) => l.includes('ADD COLUMN') || l.includes('COMMENT'))).toBe(true);
  });

  it('CommonsService NON ha logica value_chain attiva', () => {
    const src = read('services/commons/CommonsService.ts');
    expect(src).not.toContain('value_chain_supplier_count');
  });
});

// ── 12. Geocoding: mai client-side ───────────────────────────────────────────

describe('B165 — geocoding server-only invariant', () => {
  it('InitiativesMap NON chiama Nominatim (commenti esclusi)', () => {
    const src     = read('components/commons/InitiativesMap.tsx');
    const stripped = strip(src);
    // Le menzioni di Nominatim nei commenti sono OK — il codice non deve chiamarlo
    expect(stripped).not.toContain('nominatim');
    expect(stripped).not.toContain('Nominatim');
    expect(stripped).not.toContain('openstreetmap.org/search');
  });

  it('worker commons page NON chiama geocodeAddress', () => {
    const src = read('app/worker/commons/page.tsx');
    expect(src).not.toContain('geocodeAddress');
  });

  it('geocodeAddress è solo in route handler PATCH (server-side)', () => {
    const patchRoute = read('app/api/commons/posts/[id]/route.ts');
    expect(patchRoute).toContain('geocodeAddress');
    // Il component client non deve importarlo
    const mapSrc = read('components/commons/InitiativesMap.tsx');
    const stripped = strip(mapSrc);
    expect(stripped).not.toContain('geocodeAddress');
  });
});

// ── 13. Leaflet — pattern dynamic import ─────────────────────────────────────

describe('B165 — Leaflet dynamic import (no SSR)', () => {
  it('InitiativesMapClient wrapper contiene dynamic() con ssr: false (Turbopack fix)', () => {
    // ssr: false non può stare in Server Components (Turbopack error).
    // Risiede in InitiativesMapClient.tsx (Client Component) — non in page.tsx.
    const wrapper = read('components/commons/InitiativesMapClient.tsx');
    expect(wrapper).toContain("ssr:     false");
    expect(wrapper.trim().startsWith("'use client'")).toBe(true);
  });

  it('worker commons page usa InitiativesMapClient (wrapper) anziché dynamic diretto', () => {
    const src = read('app/worker/commons/page.tsx');
    expect(src).toContain('InitiativesMapClient');
    expect(src).not.toContain("ssr:     false");
    expect(src).not.toContain("import dynamicImport");
  });

  it('InitiativesMap ha use client', () => {
    const src = read('components/commons/InitiativesMap.tsx');
    expect(src.trim().startsWith("'use client'")).toBe(true);
  });

  it('InitiativesMap importa da react-leaflet', () => {
    const src = read('components/commons/InitiativesMap.tsx');
    expect(src).toContain("from 'react-leaflet'");
  });

  it('react-leaflet è in node_modules', () => {
    expect(exists('node_modules/react-leaflet/package.json')).toBe(true);
  });
});

// ── 14. Admin panel — visualizzazione campi B165 ─────────────────────────────

describe('B165 — admin moderation panel B165 fields', () => {
  const src = read('components/commons/AdminCommonsModerationPanel.tsx');

  it('Post interface include opening_grade', () => {
    expect(src).toContain('opening_grade?:');
  });

  it('Post interface include location_address e location_lat', () => {
    expect(src).toContain('location_address?:');
    expect(src).toContain('location_lat?:');
  });

  it('Post interface include external_participants_count', () => {
    expect(src).toContain('external_participants_count?:');
  });

  it('Post interface include value_chain_supplier_count (predisposizione)', () => {
    expect(src).toContain('value_chain_supplier_count?:');
  });

  it('rendering del badge opening_grade', () => {
    expect(src).toContain('admin-opening-grade-');
    expect(src).toContain('OPENING_GRADE_LABELS');
  });

  it('rendering dei dettagli iniziativa (luogo, date, capienze)', () => {
    expect(src).toContain('admin-initiative-details');
    expect(src).toContain('location_address');
    expect(src).toContain('event_start_at');
    expect(src).toContain('capacity_internal');
  });

  it('indica geocodificato / non geocodificato nel luogo', () => {
    expect(src).toContain('geocodificato');
  });
});

// ── 15. Retrocompatibilità — post senza opening_grade restano funzionali ──────

describe('B165 — retrocompatibilità post generici', () => {
  it('worker commons page mostra sezione post generici indipendentemente dalle iniziative', () => {
    const src = read('app/worker/commons/page.tsx');
    expect(src).toContain("is('opening_grade', null)");
    expect(src).toContain('worker-commons-post-card');
  });

  it('sezione iniziative mostrata solo se hasInitiatives', () => {
    const src = read('app/worker/commons/page.tsx');
    expect(src).toContain('hasInitiatives');
    expect(src).toContain('worker-commons-initiatives');
  });
});
