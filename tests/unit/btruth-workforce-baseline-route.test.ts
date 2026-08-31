// tests/unit/btruth-workforce-baseline-route.test.ts
// B-TRUTH first canonical seed group — behavioral proof for the GET handler
// added to app/api/admin/workforce-baseline/route.ts. Mocks the Supabase
// service client and actually invokes the route, matching the pattern
// established in tests/unit/synthetic-company-foundation-provisioning.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let existenceRows: Array<{ tenant_id: string }> = [];
let baselineRow: Record<string, unknown> | null = null;
let tenantRow: Record<string, unknown> | null = null;

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'personal' && table === 'workforce_baseline') {
          return {
            // GET without ?tenantId — .select('tenant_id') is awaited directly (thenable).
            // GET with ?tenantId    — .select(cols).eq().order().limit().maybeSingle().
            select: (cols: string) => {
              if (cols === 'tenant_id') {
                return Promise.resolve({ data: existenceRows, error: null });
              }
              return {
                eq: (_col: string, _val: unknown) => ({
                  order: (_col2: string, _opts: unknown) => ({
                    limit: (_n: number) => ({
                      maybeSingle: async () => ({ data: baselineRow, error: null }),
                    }),
                  }),
                }),
              };
            },
          };
        }
        if (schemaName === 'analytics' && table === 'tenant') {
          return {
            select: (_cols: string) => ({
              eq: (_col: string, _val: unknown) => ({
                maybeSingle: async () => ({ data: tenantRow, error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected schema/table in test mock: ${schemaName}.${table}`);
      },
    }),
  }),
}));

const ADMIN_USER = { email: 'kora-admin@kora.test', koraRole: 'KORA_ADMIN', id: 'kora-admin-1' };

vi.mock('@/lib/auth/kora-session', () => ({
  requireKoraAdmin: vi.fn(async () => ADMIN_USER),
  isKoraAuthError: (v: unknown) => v !== ADMIN_USER,
}));

vi.mock('@/lib/security/origin', () => ({
  assertSameOrigin: () => null,
}));

vi.mock('@/lib/live/workforce-baseline', () => ({
  persistWorkforceBaseline: vi.fn(),
}));

async function callGet(query: string) {
  const { GET } = await import('@/app/api/admin/workforce-baseline/route');
  const request = new NextRequest(`http://localhost:3000/api/admin/workforce-baseline${query}`);
  const response = await GET(request);
  const json = await response.json();
  return { status: response.status, json };
}

beforeEach(() => {
  existenceRows = [];
  baselineRow = null;
  tenantRow = null;
});

describe('GET /api/admin/workforce-baseline — behavioral proof', () => {
  it('no tenantId: returns the existence-check list, deduplicated', async () => {
    existenceRows = [{ tenant_id: 'a' }, { tenant_id: 'b' }, { tenant_id: 'a' }];
    const { status, json } = await callGet('');
    expect(status).toBe(200);
    expect(json.tenantIdsWithBaseline.sort()).toEqual(['a', 'b']);
  });

  it('tenantId with no matching row: returns { baseline: null }, not a 404 or a synthetic fallback', async () => {
    baselineRow = null;
    const { status, json } = await callGet('?tenantId=missing-tenant');
    expect(status).toBe(200);
    expect(json.baseline).toBeNull();
  });

  it('tenantId with a matching row: returns the canonical view, tenant-joined', async () => {
    baselineRow = {
      tenant_id: 'tenant-x',
      reporting_period: '2026-Q3',
      total_workers: 45,
      segment_breakdown: { department: { HR: 20 } },
      minimum_group_size: 10,
      created_at: '2026-08-01T00:00:00Z',
      created_by: 'kora-admin@kora.test',
    };
    tenantRow = { tenant_code: 'ACME', company_name: 'Acme Corp' };

    const { status, json } = await callGet('?tenantId=tenant-x');
    expect(status).toBe(200);
    expect(json.baseline.tenantId).toBe('tenant-x');
    expect(json.baseline.tenantCode).toBe('ACME');
    expect(json.baseline.companyName).toBe('Acme Corp');
    expect(json.baseline.minimumCompanyThreshold).toBe(30);
    expect(json.baseline.aggregateGroups).toHaveLength(1);
  });

  it('response never contains a demo-labeled or tenant_kind-conditional field', async () => {
    baselineRow = {
      tenant_id: 'tenant-x', reporting_period: '2026-Q3', total_workers: 45,
      segment_breakdown: {}, minimum_group_size: 10,
      created_at: '2026-08-01T00:00:00Z', created_by: 'x',
    };
    tenantRow = { tenant_code: 'ACME', company_name: 'Acme Corp' };
    const { json } = await callGet('?tenantId=tenant-x');
    const flat = JSON.stringify(json);
    expect(flat).not.toContain('synthetic_demo_data');
    expect(flat).not.toContain('tenant_kind');
  });
});
