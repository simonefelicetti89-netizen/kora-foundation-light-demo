/**
 * PILOT-TRUST-01 (F-08) — health endpoint tests.
 *
 * Mocks lib/supabase/server's getSupabaseServerClient so both the healthy
 * and unreachable-DB paths are exercised deterministically, without a real
 * Postgres connection.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();
const mockSchema = vi.fn();
const mockGetSupabaseServerClient = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => mockGetSupabaseServerClient(),
}));

function buildHealthyClient() {
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockSelect.mockReturnValue({ limit: mockLimit });
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSchema.mockReturnValue({ from: mockFrom });
  return { schema: mockSchema };
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.resetModules();
    mockSelect.mockReset();
    mockLimit.mockReset();
    mockFrom.mockReset();
    mockSchema.mockReset();
    mockGetSupabaseServerClient.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 200 and status "ok" when the database is reachable', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(buildHealthyClient());
    const { GET } = await import('@/app/api/health/route');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('kora');
    expect(body.database).toBe('reachable');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('returns 503 and status "error" when the database call throws (unreachable)', async () => {
    mockGetSupabaseServerClient.mockResolvedValue({
      schema: () => ({ from: () => ({ select: () => ({ limit: () => Promise.reject(new Error('connection refused')) }) }) }),
    });
    const { GET } = await import('@/app/api/health/route');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('error');
    expect(body.database).toBe('unreachable');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns 503 when the DB check exceeds the timeout (a hung connection is treated as unreachable)', async () => {
    mockGetSupabaseServerClient.mockResolvedValue({
      schema: () => ({
        from: () => ({
          select: () => ({
            limit: () => new Promise(() => {
              /* never resolves — simulates a hung connection */
            }),
          }),
        }),
      }),
    });
    const { GET } = await import('@/app/api/health/route');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('error');
  }, 10_000);

  it('never includes a project ref, connection string, schema name, tenant, user, or secret in the response', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(buildHealthyClient());
    const { GET } = await import('@/app/api/health/route');

    const response = await GET();
    const bodyText = JSON.stringify(await response.json());

    expect(bodyText).not.toMatch(/supabase\.co/i);
    expect(bodyText).not.toMatch(/postgresql:\/\//i);
    expect(bodyText).not.toMatch(/tenant/i);
    expect(bodyText).not.toMatch(/worker/i);
    expect(bodyText).not.toMatch(/secret|password|token|key/i);
    expect(Object.keys(JSON.parse(bodyText)).sort()).toEqual(['database', 'service', 'status', 'timestamp']);
  });

  it('does not read from analytics.tenant with anything other than a minimal limit(1) select — no tenant rows returned', async () => {
    const client = buildHealthyClient();
    mockGetSupabaseServerClient.mockResolvedValue(client);
    const { GET } = await import('@/app/api/health/route');

    await GET();

    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it('the route module exports only GET (no POST/PUT/DELETE/PATCH — unsupported methods 405 by Next.js default)', async () => {
    const routeModule = await import('@/app/api/health/route');
    const exportedMethods = Object.keys(routeModule);
    expect(exportedMethods).toContain('GET');
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      expect(exportedMethods).not.toContain(method);
    }
  });
});
