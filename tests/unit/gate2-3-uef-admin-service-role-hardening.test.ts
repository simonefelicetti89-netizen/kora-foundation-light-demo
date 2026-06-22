/**
 * Gate 2.3 Pre-Migration App Service-Role Path Hardening.
 *
 * Verifies that:
 * - generate-candidates route uses getSupabaseServiceClient() (not inline createClient)
 * - review route uses getSupabaseServiceClient() in both GET and POST handlers
 * - enrich route already uses getSupabaseServiceClient() (baseline confirmed)
 * - uef-service-key.ts exists with correct constraints
 * - KORA_ADMIN authorization check precedes service-role client creation
 * - raw payload is not returned by generate-candidates response
 * - service-role key is not exposed in client-visible code
 * - migration 030 readiness is documented
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 * These tests verify code structure — not live behavior.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── 1. generate-candidates — no inline service-role createClient ──────────────

describe('gate2-3-service-role — generate-candidates client pattern', () => {
  it('generate-candidates does NOT import createClient from supabase-js', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).not.toMatch(/import.*createClient.*from ['"]@supabase\/supabase-js['"]/);
  });

  it('generate-candidates does NOT inline createClient with service role key', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).not.toMatch(/createClient<Database>\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('generate-candidates imports getSupabaseServiceClient from @/lib/supabase/server', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).toMatch(/import.*getSupabaseServiceClient.*from ['"]@\/lib\/supabase\/server['"]/);
  });

  it('generate-candidates uses getSupabaseServiceClient()', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).toMatch(/getSupabaseServiceClient\(\)/);
  });
});

// ── 2. generate-candidates — auth before service-role ────────────────────────

describe('gate2-3-service-role — generate-candidates auth-before-service-role', () => {
  it('generate-candidates calls requireKoraAdmin before getSupabaseServiceClient', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    const adminIdx = content.indexOf('requireKoraAdmin');
    const clientIdx = content.indexOf('getSupabaseServiceClient()');
    expect(adminIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeGreaterThan(-1);
    expect(adminIdx).toBeLessThan(clientIdx);
  });

  it('generate-candidates returns early on auth failure (isKoraAuthError guard)', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).toMatch(/isKoraAuthError.*authResult.*return authResult|isKoraAuthError\(authResult\).*return/);
  });
});

// ── 3. generate-candidates — response does not expose raw payload ─────────────

describe('gate2-3-service-role — generate-candidates response shape', () => {
  it('generate-candidates response does not return uef_rows or candidates array', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    // Response should be aggregate stats only
    expect(content).toMatch(/generatedCount|generated_count/);
    expect(content).not.toMatch(/candidates:.*uefRows|uefRows.*candidates/);
  });

  it('generate-candidates response contains only aggregate stats', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).toMatch(/generatedCount|highConfidenceCount|avgConfidence/);
  });

  it('generate-candidates JSON response does not spread raw payload field', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    // The NextResponse.json() call should not include 'payload:' as a top-level key
    const responseBlock = content.substring(content.lastIndexOf('return NextResponse.json'));
    expect(responseBlock).not.toMatch(/^\s*payload:/m);
  });

  it('generate-candidates scoringLocked is true in response (scoring blocked until B6)', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).toMatch(/scoringLocked.*true/);
  });
});

// ── 4. review route — no inline service-role createClient ─────────────────────

describe('gate2-3-service-role — review route client pattern', () => {
  it('review route does NOT import createClient from supabase-js', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).not.toMatch(/import.*createClient.*from ['"]@supabase\/supabase-js['"]/);
  });

  it('review route imports getSupabaseServiceClient', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).toMatch(/import.*getSupabaseServiceClient.*from ['"]@\/lib\/supabase\/server['"]/);
  });

  it('review route GET handler uses getSupabaseServiceClient()', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).toMatch(/getSupabaseServiceClient\(\)/);
  });

  it('review route has no inline service-role key reference', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

// ── 5. review route — auth before service-role in both handlers ───────────────

describe('gate2-3-service-role — review route auth-before-service-role', () => {
  it('review GET: requireKoraAdmin before getSupabaseServiceClient', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    const getBlock = content.substring(content.indexOf('async function GET'));
    const adminIdx = getBlock.indexOf('requireKoraAdmin');
    const clientIdx = getBlock.indexOf('getSupabaseServiceClient()');
    expect(adminIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeGreaterThan(-1);
    expect(adminIdx).toBeLessThan(clientIdx);
  });

  it('review POST: requireKoraAdmin before getSupabaseServiceClient', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    const postBlock = content.substring(content.indexOf('async function POST'));
    const adminIdx = postBlock.indexOf('requireKoraAdmin');
    const clientIdx = postBlock.indexOf('getSupabaseServiceClient()');
    expect(adminIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeGreaterThan(-1);
    expect(adminIdx).toBeLessThan(clientIdx);
  });
});

// ── 6. enrich route — already correct (baseline confirmation) ─────────────────

describe('gate2-3-service-role — enrich route baseline', () => {
  it('enrich route imports getSupabaseServiceClient from server (already correct)', () => {
    const content = src('app/api/admin/uef/enrich/route.ts');
    expect(content).toMatch(/import.*getSupabaseServiceClient.*from ['"]@\/lib\/supabase\/server['"]/);
  });

  it('enrich route does NOT import createClient from supabase-js', () => {
    const content = src('app/api/admin/uef/enrich/route.ts');
    expect(content).not.toMatch(/import.*createClient.*from ['"]@supabase\/supabase-js['"]/);
  });

  it('enrich route calls requireKoraAdmin', () => {
    const content = src('app/api/admin/uef/enrich/route.ts');
    expect(content).toMatch(/requireKoraAdmin/);
  });
});

// ── 7. uef-service-key.ts — exists with correct constraints ──────────────────

describe('gate2-3-service-role — uef-service-key.ts', () => {
  it('lib/supabase/uef-service-key.ts exists', () => {
    expect(() => src('lib/supabase/uef-service-key.ts')).not.toThrow();
  });

  it('uef-service-key imports getSupabaseServiceClient', () => {
    const content = src('lib/supabase/uef-service-key.ts');
    expect(content).toMatch(/import.*getSupabaseServiceClient.*from ['"]@\/lib\/supabase\/server['"]/);
  });

  it('uef-service-key defines ALLOWED_UEF_REVIEW_COLUMNS whitelist', () => {
    const content = src('lib/supabase/uef-service-key.ts');
    expect(content).toMatch(/ALLOWED_UEF_REVIEW_COLUMNS/);
  });

  it('uef-service-key whitelist explicitly excludes payload field', () => {
    const content = src('lib/supabase/uef-service-key.ts');
    expect(content).toMatch(/ESCLUSO.*payload|payload.*escluso|payload.*PII|payload.*intentionally.*absent/i);
  });

  it('uef-service-key documents Gate 2.3 / migration 030 context', () => {
    const content = src('lib/supabase/uef-service-key.ts');
    expect(content).toMatch(/Gate 2\.3|migration 030|kora_admin_all_uef/i);
  });

  it('uef-service-key enforces column whitelist via assertUEFReviewColumns', () => {
    const content = src('lib/supabase/uef-service-key.ts');
    expect(content).toMatch(/assertUEFReviewColumns/);
  });

  it('uef-service-key provides queryUEFBatchMeta function', () => {
    const content = src('lib/supabase/uef-service-key.ts');
    expect(content).toMatch(/queryUEFBatchMeta/);
  });

  it('uef-service-key does not export raw service-role key', () => {
    const content = src('lib/supabase/uef-service-key.ts');
    expect(content).not.toMatch(/export.*SUPABASE_SERVICE_ROLE_KEY|export.*serviceKey|export.*serviceRoleKey/i);
  });
});

// ── 8. No service-role key in client-visible paths ───────────────────────────

describe('gate2-3-service-role — service-role key confinement', () => {
  it('generate-candidates does not reference SUPABASE_SERVICE_ROLE_KEY directly', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('review route does not reference SUPABASE_SERVICE_ROLE_KEY directly', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('uef-service-key does not reference SUPABASE_SERVICE_ROLE_KEY directly', () => {
    const content = src('lib/supabase/uef-service-key.ts');
    expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

// ── 9. Migration 030 readiness documented in review route ─────────────────────

describe('gate2-3-service-role — migration 030 readiness annotations', () => {
  it('review route GET comment notes post-030 switch to v_admin_uef_review', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).toMatch(/v_admin_uef_review|post.030.*view|030.*payload.*excluded/i);
  });

  it('review route POST comment notes post-030 switch to fn_admin_uef_update_review', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).toMatch(/fn_admin_uef_update_review|post.030.*function/i);
  });

  it('generate-candidates comment notes migration 030 context', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).toMatch(/migration 030|kora_admin_all_uef/i);
  });
});

// ── 10. No formula or methodology changes ────────────────────────────────────

describe('gate2-3-service-role — no formula changes', () => {
  it('generate-candidates still imports interpretUploadedRecord', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).toMatch(/interpretUploadedRecord/);
  });

  it('generate-candidates approved_for_scoring is still false for all candidates', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).toMatch(/approved_for_scoring.*false.*B5|B5.*approved_for_scoring.*false/);
  });

  it('generate-candidates scoring_locked remains true until B6', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    expect(content).toMatch(/scoring_locked.*true/);
  });
});

// ── 11. No DB changes ─────────────────────────────────────────────────────────

describe('gate2-3-service-role — no migration applied', () => {
  it('this test file imports no Supabase client directly', () => {
    const self = src('tests/unit/gate2-3-uef-admin-service-role-hardening.test.ts');
    expect(self).not.toMatch(/from ['"]@supabase\/supabase-js['"]/);
  });

  it('this test file makes no network calls', () => {
    const self = src('tests/unit/gate2-3-uef-admin-service-role-hardening.test.ts');
    expect(self).not.toMatch(/fetch\(|axios\.|pg\.query\(/);
  });
});

// ── 12. Secrets hygiene ───────────────────────────────────────────────────────

describe('gate2-3-service-role — secrets hygiene', () => {
  it('generate-candidates contains no JWT literals', () => {
    expect(src('app/api/admin/uef/generate-candidates/route.ts'))
      .not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('review route contains no JWT literals', () => {
    expect(src('app/api/admin/uef/review/route.ts'))
      .not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('uef-service-key contains no JWT literals', () => {
    expect(src('lib/supabase/uef-service-key.ts'))
      .not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });
});
