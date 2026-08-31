// tests/unit/cc052-commons-discovery-view.test.ts
// CC-052 — canonical live Commons discovery view. Pure-function coverage for
// lib/commons/discovery-view.ts: status derivation and the row->view mapping
// that replaced the synthetic CommonsInitiative model. No DB, no fixtures
// beyond in-memory rows constructed here.

import { describe, it, expect } from 'vitest';
import {
  deriveDiscoveryStatus,
  buildDiscoveryView,
  type CommonsDiscoveryRow,
} from '../../lib/commons/discovery-view';

const NOW = new Date('2026-09-01T12:00:00Z');

describe('deriveDiscoveryStatus', () => {
  it('returns "completed" when event_end_at is in the past', () => {
    expect(deriveDiscoveryStatus('2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', null, 0, NOW)).toBe('completed');
  });

  it('returns "full" when participants_enrolled >= capacity and event has not ended', () => {
    expect(deriveDiscoveryStatus('2026-08-01T00:00:00Z', '2026-12-01T00:00:00Z', 10, 10, NOW)).toBe('full');
  });

  it('returns "upcoming" when event_start_at is in the future', () => {
    expect(deriveDiscoveryStatus('2026-10-01T00:00:00Z', null, null, 0, NOW)).toBe('upcoming');
  });

  it('returns "open" when the event has started, has not ended, and is not full', () => {
    expect(deriveDiscoveryStatus('2026-08-01T00:00:00Z', '2026-12-01T00:00:00Z', 10, 3, NOW)).toBe('open');
  });

  it('returns "open" when no dates or capacity are set at all', () => {
    expect(deriveDiscoveryStatus(null, null, null, 0, NOW)).toBe('open');
  });

  it('"completed" takes priority over "full" when both conditions technically hold', () => {
    expect(deriveDiscoveryStatus('2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', 5, 5, NOW)).toBe('completed');
  });

  it('capacity=0 with 0 participants is not "full" (no capacity configured is not the same as zero capacity)', () => {
    expect(deriveDiscoveryStatus('2026-08-01T00:00:00Z', '2026-12-01T00:00:00Z', null, 0, NOW)).toBe('open');
  });
});

describe('buildDiscoveryView', () => {
  const row: CommonsDiscoveryRow = {
    id:                'post-1',
    tenant_id:         'tenant-a',
    title:             'Volontariato ambientale',
    body:              'Ripuliamo il parco cittadino.',
    category:          'event',
    pillar:            'IMPACT',
    opening_grade:     'cross_company',
    location_address:  'Parco Sempione, Milano',
    location_lat:      45.4719,
    location_lng:      9.1731,
    event_start_at:    '2026-08-01T00:00:00Z',
    event_end_at:      '2026-12-01T00:00:00Z',
    capacity_internal: 20,
    capacity_cross:    10,
  };

  it('maps body -> description and keeps live fields as-is', () => {
    const [view] = buildDiscoveryView([row], new Map(), new Map(), NOW);
    expect(view.description).toBe(row.body);
    expect(view.title).toBe(row.title);
    expect(view.pillar).toBe('IMPACT');
    expect(view.opening_grade).toBe('cross_company');
    expect(view.location_address).toBe(row.location_address);
  });

  it('prefers capacity_internal over capacity_cross when both are set', () => {
    const [view] = buildDiscoveryView([row], new Map(), new Map(), NOW);
    expect(view.capacity).toBe(20);
  });

  it('falls back to capacity_cross when capacity_internal is null', () => {
    const [view] = buildDiscoveryView(
      [{ ...row, capacity_internal: null }],
      new Map(),
      new Map(),
      NOW,
    );
    expect(view.capacity).toBe(10);
  });

  it('capacity is null when neither field is set', () => {
    const [view] = buildDiscoveryView(
      [{ ...row, capacity_internal: null, capacity_cross: null }],
      new Map(),
      new Map(),
      NOW,
    );
    expect(view.capacity).toBeNull();
  });

  it('derives owner_organization/owner_sector from the tenant map, keyed by tenant_id', () => {
    const tenantById = new Map([['tenant-a', { company_name: 'Meridiana Group', industry_code: 'manifattura' }]]);
    const [view] = buildDiscoveryView([row], tenantById, new Map(), NOW);
    expect(view.owner_organization).toBe('Meridiana Group');
    expect(view.owner_sector).toBe('manifattura');
  });

  it('falls back to a generic label when the tenant is not found in the map — never fabricates a name', () => {
    const [view] = buildDiscoveryView([row], new Map(), new Map(), NOW);
    expect(view.owner_organization).toBe('Organizzazione KORA');
    expect(view.owner_sector).toBeNull();
  });

  it('participants_enrolled comes from the aggregate map, keyed by post id, defaulting to 0', () => {
    const [withCount] = buildDiscoveryView([row], new Map(), new Map([['post-1', 7]]), NOW);
    expect(withCount.participants_enrolled).toBe(7);

    const [withoutCount] = buildDiscoveryView([row], new Map(), new Map(), NOW);
    expect(withoutCount.participants_enrolled).toBe(0);
  });

  it('status is derived, not read from any stored field', () => {
    const [view] = buildDiscoveryView([row], new Map(), new Map([['post-1', 3]]), NOW);
    expect(view.status).toBe('open');
  });

  it('never emits the retired synthetic-only fields (visibility, tags, activation_potential, verification_possible, location_type, initiative_type)', () => {
    const [view] = buildDiscoveryView([row], new Map(), new Map(), NOW);
    const keys = Object.keys(view);
    for (const dropped of ['visibility', 'tags', 'activation_potential', 'verification_possible', 'location_type', 'initiative_type', 'synthetic_demo_data']) {
      expect(keys).not.toContain(dropped);
    }
  });
});
