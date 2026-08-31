// tests/unit/b97b-commons-foundation.test.ts
// B97-B — KORA Commons Foundation: service logic, data integrity, architectural constraints.
// KORA Commons is a shared activation layer — NOT a social network.

import { describe, it, expect } from 'vitest';
import { commonsService } from '../../services/commons/CommonsService';
import {
  INITIATIVE_TYPE_LABELS,
  STATUS_LABELS,
  PILLAR_COMMONS_LABELS,
  type CommonsInitiative,
  type InitiativeType,
} from '../../lib/commons/types';

// ── Data integrity ────────────────────────────────────────────────────────────

describe('CommonsService — getInitiatives()', () => {
  it('returns at least 15 initiatives', () => {
    const all = commonsService.getInitiatives();
    expect(all.length).toBeGreaterThanOrEqual(15);
  });

  it('every initiative has required fields', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(i.id).toBeTruthy();
      expect(i.title).toBeTruthy();
      expect(i.description).toBeTruthy();
      expect(i.pillar).toBeTruthy();
      expect(i.initiative_type).toBeTruthy();
      expect(i.owner_organization).toBeTruthy();
      expect(i.start_date).toBeTruthy();
      expect(i.status).toBeTruthy();
      expect(i.activation_potential).toBeTruthy();
      expect(typeof i.verification_possible).toBe('boolean');
      expect(Array.isArray(i.tags)).toBe(true);
    }
  });

  it('all pillars are canonical KORA pillars', () => {
    const valid = new Set(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']);
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(valid.has(i.pillar)).toBe(true);
    }
  });

  it('all statuses are valid', () => {
    const valid = new Set<string>(['open', 'upcoming', 'full', 'completed']);
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(valid.has(i.status)).toBe(true);
    }
  });

  it('all initiative_types are valid', () => {
    const valid = new Set<string>(Object.keys(INITIATIVE_TYPE_LABELS));
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(valid.has(i.initiative_type)).toBe(true);
    }
  });

  it('all location_types are valid', () => {
    const valid = new Set<string>(['in-person', 'remote', 'hybrid']);
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(valid.has(i.location_type)).toBe(true);
    }
  });

  it('all activation_potential values are valid', () => {
    const valid = new Set<string>(['low', 'medium', 'high']);
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(valid.has(i.activation_potential)).toBe(true);
    }
  });

  it('every initiative is marked synthetic_demo_data: true', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(i.synthetic_demo_data).toBe(true);
    }
  });

  it('participants_enrolled is non-negative', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(i.participants_enrolled).toBeGreaterThanOrEqual(0);
    }
  });

  it('capacity is null or positive integer when present', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      if (i.capacity !== null) {
        expect(i.capacity).toBeGreaterThan(0);
      }
    }
  });

  it('participants_enrolled never exceeds capacity when capacity is set', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      if (i.capacity !== null) {
        expect(i.participants_enrolled).toBeLessThanOrEqual(i.capacity);
      }
    }
  });

  it('start_date is a valid ISO date string', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(new Date(i.start_date).toString()).not.toBe('Invalid Date');
    }
  });

  it('end_date is null or a valid ISO date string', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      if (i.end_date !== null) {
        expect(new Date(i.end_date).toString()).not.toBe('Invalid Date');
      }
    }
  });

  it('all IDs are unique', () => {
    const all = commonsService.getInitiatives();
    const ids = all.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Filtering ─────────────────────────────────────────────────────────────────

describe('CommonsService — getInitiatives() filtering', () => {
  it('filters by pillar correctly', () => {
    const result = commonsService.getInitiatives({ pillar: 'IMPACT' });
    expect(result.length).toBeGreaterThan(0);
    for (const i of result) {
      expect(i.pillar).toBe('IMPACT');
    }
  });

  it('filters by initiative_type correctly', () => {
    const result = commonsService.getInitiatives({ type: 'volunteering' });
    expect(result.length).toBeGreaterThan(0);
    for (const i of result) {
      expect(i.initiative_type).toBe('volunteering');
    }
  });

  it('filters by status correctly', () => {
    const result = commonsService.getInitiatives({ status: 'open' });
    expect(result.length).toBeGreaterThan(0);
    for (const i of result) {
      expect(i.status).toBe('open');
    }
  });

  it('combined pillar + status filter works correctly', () => {
    const result = commonsService.getInitiatives({ pillar: 'GROWTH', status: 'open' });
    for (const i of result) {
      expect(i.pillar).toBe('GROWTH');
      expect(i.status).toBe('open');
    }
  });

  it('returns empty array for impossible filter combination', () => {
    // 'full' mentoring on LIFE pillar — very unlikely in test data
    const result = commonsService.getInitiatives({ pillar: 'LIFE', type: 'volunteering', status: 'full' });
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns all when no filters are passed', () => {
    const all = commonsService.getInitiatives();
    const filtered = commonsService.getInitiatives({});
    expect(filtered.length).toBe(all.length);
  });
});

// getByPillar/getByType removed (CC-052, 2026-08-31): zero runtime callers,
// dead code. Pillar/type filtering for legitimate callers is covered by
// getInitiatives({ pillar, type }) above, already tested.

// ── getFeaturedInitiatives ────────────────────────────────────────────────────

describe('CommonsService — getFeaturedInitiatives()', () => {
  it('returns at most 4 featured initiatives', () => {
    const featured = commonsService.getFeaturedInitiatives();
    expect(featured.length).toBeLessThanOrEqual(4);
  });

  it('all featured initiatives are open or upcoming', () => {
    const featured = commonsService.getFeaturedInitiatives();
    for (const i of featured) {
      expect(['open', 'upcoming']).toContain(i.status);
    }
  });

  it('all featured initiatives have high activation_potential', () => {
    const featured = commonsService.getFeaturedInitiatives();
    for (const i of featured) {
      expect(i.activation_potential).toBe('high');
    }
  });

  it('featured initiatives are sorted by start_date ascending', () => {
    const featured = commonsService.getFeaturedInitiatives();
    for (let i = 1; i < featured.length; i++) {
      expect(featured[i].start_date >= featured[i - 1].start_date).toBe(true);
    }
  });
});

// ── getNetworkStats ───────────────────────────────────────────────────────────

describe('CommonsService — getNetworkStats()', () => {
  it('returns a valid stats object', () => {
    const stats = commonsService.getNetworkStats();
    expect(stats.total_initiatives).toBeGreaterThan(0);
    expect(stats.open_initiatives).toBeGreaterThanOrEqual(0);
    expect(stats.organizations_active).toBeGreaterThan(0);
    expect(stats.total_participants).toBeGreaterThanOrEqual(0);
    expect(stats.pillars_covered).toBeGreaterThan(0);
    expect(stats.most_active_pillar).toBeTruthy();
    expect(stats.synthetic_demo_data).toBe(true);
  });

  it('open_initiatives <= total_initiatives', () => {
    const stats = commonsService.getNetworkStats();
    expect(stats.open_initiatives).toBeLessThanOrEqual(stats.total_initiatives);
  });

  it('pillars_covered <= 5', () => {
    const stats = commonsService.getNetworkStats();
    expect(stats.pillars_covered).toBeLessThanOrEqual(5);
  });

  it('most_active_pillar is a canonical pillar', () => {
    const valid = new Set(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']);
    const stats = commonsService.getNetworkStats();
    expect(valid.has(stats.most_active_pillar)).toBe(true);
  });

  it('total_participants matches sum of participants_enrolled across all initiatives', () => {
    const all = commonsService.getInitiatives();
    const sumFromData = all.reduce((s, i) => s + i.participants_enrolled, 0);
    const stats = commonsService.getNetworkStats();
    expect(stats.total_participants).toBe(sumFromData);
  });

  it('organizations_active matches count of unique owner_organization values', () => {
    const all = commonsService.getInitiatives();
    const uniqueOrgs = new Set(all.map((i) => i.owner_organization)).size;
    const stats = commonsService.getNetworkStats();
    expect(stats.organizations_active).toBe(uniqueOrgs);
  });
});

// ── Type label completeness ───────────────────────────────────────────────────

describe('INITIATIVE_TYPE_LABELS completeness', () => {
  it('has labels for all expected types', () => {
    const expected: InitiativeType[] = [
      'volunteering', 'mentoring', 'training', 'community',
      'wellbeing', 'caregiver', 'sustainability', 'culture', 'inclusion',
    ];
    for (const t of expected) {
      expect(INITIATIVE_TYPE_LABELS[t]).toBeTruthy();
    }
  });
});

describe('STATUS_LABELS completeness', () => {
  it('has labels for all statuses', () => {
    for (const s of ['open', 'upcoming', 'full', 'completed'] as const) {
      expect(STATUS_LABELS[s]).toBeTruthy();
    }
  });
});

describe('PILLAR_COMMONS_LABELS completeness', () => {
  it('has labels for all 5 pillars', () => {
    for (const p of ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']) {
      expect(PILLAR_COMMONS_LABELS[p]).toBeTruthy();
    }
  });
});

// ── Architectural constraints — no social mechanics ───────────────────────────

describe('KORA Commons architectural constraints', () => {
  it('CommonsInitiative has no "likes" field', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect((i as Record<string, unknown>)['likes']).toBeUndefined();
      expect((i as Record<string, unknown>)['like_count']).toBeUndefined();
    }
  });

  it('CommonsInitiative has no "comments" field', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect((i as Record<string, unknown>)['comments']).toBeUndefined();
      expect((i as Record<string, unknown>)['comment_count']).toBeUndefined();
    }
  });

  it('CommonsInitiative has no "followers" or "social_feed" field', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect((i as Record<string, unknown>)['followers']).toBeUndefined();
      expect((i as Record<string, unknown>)['social_feed']).toBeUndefined();
    }
  });

  it('CommonsInitiative has no worker_id or individual tracking field', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect((i as Record<string, unknown>)['worker_id']).toBeUndefined();
      expect((i as Record<string, unknown>)['enrolled_workers']).toBeUndefined();
    }
  });

  it('CommonsService has no messaging method', () => {
    // The service should not expose any messaging or social interaction methods.
    const service = commonsService as unknown as Record<string, unknown>;
    expect(service['sendMessage']).toBeUndefined();
    expect(service['like']).toBeUndefined();
    expect(service['comment']).toBeUndefined();
    expect(service['follow']).toBeUndefined();
  });

  it('all initiatives have activation_potential defined — activation focus is mandatory', () => {
    const all = commonsService.getInitiatives();
    for (const i of all) {
      expect(['low', 'medium', 'high']).toContain(i.activation_potential);
    }
  });

  it('no initiative generates IU directly — CommonsService has no IU generation method', () => {
    const service = commonsService as unknown as Record<string, unknown>;
    expect(service['generateIU']).toBeUndefined();
    expect(service['createUEF']).toBeUndefined();
  });

  it('data is diverse — at least 3 different owner organizations', () => {
    const all = commonsService.getInitiatives();
    const orgs = new Set(all.map((i) => i.owner_organization));
    expect(orgs.size).toBeGreaterThanOrEqual(3);
  });
});
