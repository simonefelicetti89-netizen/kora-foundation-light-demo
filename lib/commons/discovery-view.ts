// lib/commons/discovery-view.ts
// CC-052 — canonical live discovery view for the two remaining Commons
// preview surfaces (app/commons, app/my-kora's Commons widget).
//
// Computed entirely from commons.post (via CommonsService.getPublishedInitiativesAdmin),
// analytics.tenant (company_name/industry_code), and the existing
// commons.booking_aggregate_for_promoter() SECURITY DEFINER aggregate
// (via BookingService.getAggregateForPromoter) — no runtime synthetic import.
//
// Field disposition (ratified, CC-052 final implementation):
//   KEEP/RENAME description<-body, end_date<-event_end_at, capacity<-capacity_internal/cross
//   DERIVE      owner_organization<-tenant.company_name, owner_sector<-tenant.industry_code,
//               participants_enrolled<-booking aggregate, status<-derived from dates/capacity
//   DROP        visibility, tags (zero prior UI usage)
//   DEFER       activation_potential, location_type, stored verification_possible
//               (no live column, no confirmed product owner — not invented here)

import type { InitiativeOpeningGrade } from './types';

export type CommonsDiscoveryStatus = 'open' | 'upcoming' | 'full' | 'completed';

export interface CommonsDiscoveryRow {
  id:                string;
  tenant_id:         string;
  title:             string;
  body:              string;
  category:          string;
  pillar:            string | null;
  opening_grade:     InitiativeOpeningGrade | null;
  location_address:  string | null;
  location_lat:      number | null;
  location_lng:      number | null;
  event_start_at:    string | null;
  event_end_at:      string | null;
  capacity_internal: number | null;
  capacity_cross:    number | null;
}

export interface CommonsDiscoveryInitiative {
  id:                    string;
  title:                 string;
  description:           string;
  category:              string;
  pillar:                string | null;
  opening_grade:         InitiativeOpeningGrade | null;
  location_address:      string | null;
  location_lat:          number | null;
  location_lng:          number | null;
  event_start_at:        string | null;
  event_end_at:          string | null;
  capacity:              number | null;
  participants_enrolled: number;
  status:                CommonsDiscoveryStatus;
  owner_organization:    string;
  owner_sector:          string | null;
}

/**
 * Derives an open/upcoming/full/completed status from live, already-canonical
 * fields — no stored lifecycle column. Matches the synthetic preview's
 * original semantics closely enough for display purposes without inventing
 * a new commons.post column.
 */
export function deriveDiscoveryStatus(
  eventStartAt:         string | null,
  eventEndAt:           string | null,
  capacity:             number | null,
  participantsEnrolled: number,
  now:                  Date = new Date(),
): CommonsDiscoveryStatus {
  if (eventEndAt && new Date(eventEndAt) < now) return 'completed';
  if (capacity !== null && participantsEnrolled >= capacity) return 'full';
  if (eventStartAt && new Date(eventStartAt) > now) return 'upcoming';
  return 'open';
}

export interface TenantSummary {
  company_name:  string;
  industry_code: string | null;
}

export function buildDiscoveryView(
  rows:                 CommonsDiscoveryRow[],
  tenantById:            Map<string, TenantSummary>,
  participantsByPostId:  Map<string, number>,
  now:                   Date = new Date(),
): CommonsDiscoveryInitiative[] {
  return rows.map((r) => {
    const capacity = r.capacity_internal ?? r.capacity_cross ?? null;
    const participants_enrolled = participantsByPostId.get(r.id) ?? 0;
    const tenant = tenantById.get(r.tenant_id);

    return {
      id:                    r.id,
      title:                 r.title,
      description:           r.body,
      category:              r.category,
      pillar:                r.pillar,
      opening_grade:         r.opening_grade,
      location_address:      r.location_address,
      location_lat:          r.location_lat,
      location_lng:          r.location_lng,
      event_start_at:        r.event_start_at,
      event_end_at:          r.event_end_at,
      capacity,
      participants_enrolled,
      status:                deriveDiscoveryStatus(r.event_start_at, r.event_end_at, capacity, participants_enrolled, now),
      owner_organization:    tenant?.company_name ?? 'Organizzazione KORA',
      owner_sector:          tenant?.industry_code ?? null,
    };
  });
}
