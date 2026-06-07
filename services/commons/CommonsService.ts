// services/commons/CommonsService.ts
// B97-B — KORA Commons Service.
// KORA Commons is a shared activation layer — NOT a social network.
// No messaging, no likes, no comments, no worker tracking, no social mechanics.
// Admin/Company/Worker roles can discover initiatives. No IU generation from this service.

import rawInitiatives from '@/data/synthetic/commons-initiatives.json';
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

  getByPillar(pillar: string): CommonsInitiative[] {
    return ALL.filter((i) => i.pillar === pillar);
  }

  getByType(type: InitiativeType): CommonsInitiative[] {
    return ALL.filter((i) => i.initiative_type === type);
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
