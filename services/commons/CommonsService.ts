// services/commons/CommonsService.ts
// B97-B — KORA Commons Service (synthetic data layer).
// B165 — esteso con getPublishedInitiatives (live DB via server client).
// KORA Commons is a shared activation layer — NOT a social network.
// No messaging, no likes, no comments, no worker tracking, no social mechanics.
// Admin/Company/Worker roles can discover initiatives. No IU generation from this service.

import rawInitiatives from '@/data/synthetic/commons-initiatives.json';
import type { CommonsPostWorkerView } from '@/lib/commons/types';
import { haversineDistanceKm } from '@/lib/commons/geocoding';
import {
  type CommonsInitiative,
  type CommonsNetworkStats,
  type InitiativeType,
  type InitiativeStatus,
} from '@/lib/commons/types';

const ALL: CommonsInitiative[] = rawInitiatives as CommonsInitiative[];

class CommonsService {

  getInitiatives(filters?: {
    pillar?:   string;
    type?:     InitiativeType;
    status?:   InitiativeStatus;
  }): CommonsInitiative[] {
    let result = ALL;
    if (filters?.pillar) result = result.filter((i) => i.pillar === filters.pillar);
    if (filters?.type)   result = result.filter((i) => i.initiative_type === filters.type);
    if (filters?.status) result = result.filter((i) => i.status === filters.status);
    return result;
  }

  getFeaturedInitiatives(): CommonsInitiative[] {
    // Featured: open or upcoming, high activation_potential, sorted by start_date asc.
    return ALL
      .filter((i) => (i.status === 'open' || i.status === 'upcoming') && i.activation_potential === 'high')
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 4);
  }

  getNetworkStats(): CommonsNetworkStats {
    const open = ALL.filter((i) => i.status === 'open' || i.status === 'upcoming').length;
    const orgs = new Set(ALL.map((i) => i.owner_organization)).size;
    const totalParticipants = ALL.reduce((s, i) => s + i.participants_enrolled, 0);
    const pillars = new Set(ALL.map((i) => i.pillar));

    const pillarCounts: Record<string, number> = {};
    for (const i of ALL) {
      pillarCounts[i.pillar] = (pillarCounts[i.pillar] ?? 0) + 1;
    }
    const mostActivePillar = Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'IMPACT';

    return {
      total_initiatives:    ALL.length,
      open_initiatives:     open,
      organizations_active: orgs,
      total_participants:   totalParticipants,
      pillars_covered:      pillars.size,
      most_active_pillar:   mostActivePillar,
      synthetic_demo_data:  true,
    };
  }
}

export const commonsService = new CommonsService();

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

// Select fields inviati alla UI — nessun campo admin-only o PIB
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
