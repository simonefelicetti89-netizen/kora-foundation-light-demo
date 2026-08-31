// services/commons/CommonsService.ts
// B97-B — KORA Commons live discovery (B165: getPublishedInitiatives).
// CC-052 (2026-08-31): retired the synthetic discovery path (data/synthetic/
// commons-initiatives.json, the `commonsService` class and its
// getInitiatives/getFeaturedInitiatives/getByPillar/getByType/getNetworkStats
// methods). Every remaining caller reads live commons.post, RLS-scoped.
// KORA Commons is a shared activation layer — NOT a social network.
// No messaging, no likes, no comments, no worker tracking, no social mechanics.
// Admin/Company/Worker roles can discover initiatives. No IU generation from this service.

import type { CommonsPostWorkerView } from '@/lib/commons/types';
import { haversineDistanceKm } from '@/lib/commons/geocoding';
import type { CommonsDiscoveryRow } from '@/lib/commons/discovery-view';

// ── B165: Live DB — getPublishedInitiatives ───────────────────────────────────
// Restituisce i post pubblicati con opening_grade valorizzato (iniziative).
// La visibilità cross-tenant è garantita dalla RLS in mig 024:
//   - company_internal/extended: solo tenant del worker (policy mig 013)
//   - cross_company: tutti i tenant (policy mig 024)
// La funzione NON applica filtri di tenant: la RLS lo fa a livello DB.
//
// Filtro geo opzionale: esclude le iniziative oltre il raggio specificato.
// Implementato via haversine in-memory (Foundation Light senza PostGIS).

export interface GetPublishedInitiativesOpts {
  near?: {
    lat:       number;
    lng:       number;
    radius_km: number;
  };
}

// Select fields inviati alla UI worker — nessun campo admin-only o PIB
const INITIATIVE_SELECT_FIELDS = [
  'id', 'tenant_id', 'author_role', 'title', 'body', 'category', 'pillar',
  'published_at', 'created_at',
  'opening_grade', 'location_address', 'location_lat', 'location_lng',
  'event_start_at', 'event_end_at', 'capacity_internal', 'capacity_cross',
].join(', ');

export async function getPublishedInitiatives(
  db:   { schema: (s: string) => { from: (t: string) => unknown } },
  opts: GetPublishedInitiativesOpts = {},
): Promise<CommonsPostWorkerView[]> {
  // Fetch published initiatives (opening_grade IS NOT NULL)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .schema('commons')
    .from('post')
    .select(INITIATIVE_SELECT_FIELDS)
    .eq('status', 'published')
    .not('opening_grade', 'is', null)
    .order('event_start_at', { ascending: true, nullsFirst: false })
    .limit(200);

  if (error) throw new Error(`[CommonsService] getPublishedInitiatives: ${error.message}`);

  let rows: CommonsPostWorkerView[] = (data ?? []) as CommonsPostWorkerView[];

  // Geo filter: haversine in-memory (Foundation Light senza PostGIS)
  if (opts.near) {
    const { lat, lng, radius_km } = opts.near;
    rows = rows.filter((r) => {
      if (r.location_lat == null || r.location_lng == null) return true; // no geo → include
      return haversineDistanceKm(lat, lng, r.location_lat, r.location_lng) <= radius_km;
    });
  }

  return rows;
}

// ── CC-052: Live DB — getPublishedInitiativesAdmin ────────────────────────────
// Same query as getPublishedInitiatives, plus tenant_id (needed for the
// cross-company owner-organization join in lib/commons/discovery-view.ts).
// Reachable in practice only by KORA_ADMIN (app/commons/layout.tsx guard) —
// commons_post_kora_admin_all (mig 013) grants full RLS access; a
// COMPANY_ADMIN/WORKER session reaching this by mistake gets only what its
// own RLS policies allow, same as getPublishedInitiatives above. No caller
// or role check is duplicated here — RLS is the single source of truth,
// per this file's own long-standing convention.

const ADMIN_INITIATIVE_SELECT_FIELDS = [
  'id', 'tenant_id', 'title', 'body', 'category', 'pillar',
  'opening_grade', 'location_address', 'location_lat', 'location_lng',
  'event_start_at', 'event_end_at', 'capacity_internal', 'capacity_cross',
].join(', ');

export async function getPublishedInitiativesAdmin(
  db: { schema: (s: string) => { from: (t: string) => unknown } },
): Promise<CommonsDiscoveryRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .schema('commons')
    .from('post')
    .select(ADMIN_INITIATIVE_SELECT_FIELDS)
    .eq('status', 'published')
    .not('opening_grade', 'is', null)
    .order('event_start_at', { ascending: true, nullsFirst: false })
    .limit(200);

  if (error) throw new Error(`[CommonsService] getPublishedInitiativesAdmin: ${error.message}`);

  return (data ?? []) as CommonsDiscoveryRow[];
}
