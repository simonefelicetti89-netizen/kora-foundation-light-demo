// tests/unit/b128-kora-commons.test.ts
// B128: KORA Commons Foundation — 40 structural tests.
// Pure fs.readFileSync analysis — no runtime environment required.
// Verifies: migration schema, RLS policies, API boundaries, page guards, privacy copy, components.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

const migration013    = readFile('supabase/migrations/013_kora_commons.sql');
const postsRoute      = readFile('app/api/commons/posts/route.ts');
const patchRoute      = readFile('app/api/commons/posts/[id]/route.ts');
const companyPage     = readFile('app/company/commons/page.tsx');
const workerPage      = readFile('app/worker/commons/page.tsx');
const adminPage       = readFile('app/admin/commons/page.tsx');
const createForm      = readFile('components/commons/CommonsCreateForm.tsx');
const moderationPanel = readFile('components/commons/AdminCommonsModerationPanel.tsx');
const commonsDoc      = readFile('docs/KORA_COMMONS_FOUNDATION.md');

// ── Group 1: Migration 013 — Schema and Table (8 tests) ──────────────────────

describe('B128 — migration 013: commons schema and table', () => {
  it('creates the commons schema', () => {
    expect(migration013).toContain('CREATE SCHEMA IF NOT EXISTS commons');
  });

  it('creates commons.post table', () => {
    expect(migration013).toContain('CREATE TABLE IF NOT EXISTS commons.post');
  });

  it('tenant_id references analytics.tenant with CASCADE', () => {
    expect(migration013).toContain('REFERENCES analytics.tenant(id) ON DELETE CASCADE');
  });

  it('author_role constraint allows only KORA_ADMIN and COMPANY_ADMIN', () => {
    expect(migration013).toContain("CHECK (author_role IN ('KORA_ADMIN', 'COMPANY_ADMIN'))");
  });

  it('status constraint includes all 5 valid states', () => {
    expect(migration013).toContain("CHECK (status IN ('draft', 'pending_review', 'published', 'archived', 'rejected'))");
  });

  it('category constraint includes all 6 valid categories', () => {
    expect(migration013).toContain(
      "CHECK (category IN ('announcement', 'initiative_update', 'opportunity', 'event', 'request', 'resource'))"
    );
  });

  it('pillar constraint includes all 5 KORA pillars', () => {
    expect(migration013).toContain("CHECK (pillar IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'))");
  });

  it('FORCE ROW LEVEL SECURITY applied to commons.post', () => {
    expect(migration013).toContain('FORCE ROW LEVEL SECURITY');
  });
});

// ── Group 2: Migration 013 — RLS Policies (4 tests) ─────────────────────────

describe('B128 — migration 013: RLS policies', () => {
  it('KORA_ADMIN policy uses canonical kora.kora_role() function', () => {
    expect(migration013).toContain("kora.kora_role() = 'KORA_ADMIN'");
  });

  it('WORKER policy restricts to status = published only', () => {
    const workerCreatePolicyIdx = migration013.lastIndexOf(
      "commons_post_worker_published_select"
    );
    const workerPolicyBlock = migration013.slice(workerCreatePolicyIdx, workerCreatePolicyIdx + 500);
    expect(workerPolicyBlock).toContain("status = 'published'");
  });

  it('PARTNER has no CREATE POLICY in migration 013', () => {
    const policyLines = migration013
      .split('\n')
      .filter((l) => l.trim().startsWith('CREATE POLICY'))
      .join('\n');
    expect(policyLines).not.toContain('PARTNER');
  });

  it('issues NOTIFY pgrst reload schema', () => {
    expect(migration013).toContain("NOTIFY pgrst, 'reload schema'");
  });
});

// ── Group 3: API GET route — /api/commons/posts (4 tests) ────────────────────

describe('B128 — GET /api/commons/posts: role-aware data access', () => {
  it('imports requireWorkerUser from kora-session', () => {
    expect(postsRoute).toContain('requireWorkerUser');
  });

  it('worker branch forces status=published — worker cannot see draft or pending', () => {
    const workerBlock = postsRoute.slice(
      postsRoute.indexOf('requireWorkerUser(request)'),
    );
    expect(workerBlock).toContain(".eq('status', 'published')");
  });

  it('company branch reads tenantId from session, not request body', () => {
    const companyBlock = postsRoute.slice(
      postsRoute.indexOf('requireCompanyUser(request)'),
      postsRoute.indexOf('requireWorkerUser(request)'),
    );
    expect(companyBlock).toContain('tenantId } = companyAuth');
    expect(companyBlock).not.toContain('body.tenant_id');
  });

  it('returns 401 Unauthorized when no role matches', () => {
    expect(postsRoute).toContain("'Unauthorized'");
  });
});

// ── Group 4: API POST route — /api/commons/posts (6 tests) ──────────────────

describe('B128 — POST /api/commons/posts: creation guards', () => {
  it('sanitizeText strips HTML tags from title and body', () => {
    expect(postsRoute).toContain("replace(/<[^>]*>/g, '')");
  });

  it('rejects titles shorter than 3 or longer than 200 characters', () => {
    expect(postsRoute).toContain('Titolo obbligatorio (3');
    expect(postsRoute).toContain('200 caratteri');
  });

  it('rejects body shorter than 10 or longer than 4000 characters', () => {
    expect(postsRoute).toContain('Corpo obbligatorio (10');
    expect(postsRoute).toContain('4000 caratteri');
  });

  it('COMPANY_ADMIN can only create draft or pending_review — not published', () => {
    const companyPostBlock = postsRoute.slice(
      postsRoute.lastIndexOf('requireCompanyUser(request)'),
    );
    expect(companyPostBlock).toContain("!['draft', 'pending_review'].includes(initialStatus)");
  });

  it('WORKER POST returns 403 forbidden with Italian message', () => {
    expect(postsRoute).toContain('i worker non possono creare contenuti in KORA Commons');
  });

  it('KORA_ADMIN POST requires explicit tenant_id in request body', () => {
    expect(postsRoute).toContain('tenant_id obbligatorio per KORA_ADMIN');
  });
});

// ── Group 5: API PATCH route — /api/commons/posts/[id] (4 tests) ─────────────

describe('B128 — PATCH /api/commons/posts/[id]: moderation boundaries', () => {
  it('KORA_ADMIN PATCH sets reviewed_by and reviewed_at on moderation action', () => {
    expect(patchRoute).toContain('updates.reviewed_by = adminAuth.id');
    expect(patchRoute).toContain('updates.reviewed_at');
  });

  it('KORA_ADMIN PATCH sets published_at when status becomes published', () => {
    const publishBlock = patchRoute.slice(
      patchRoute.indexOf("newStatus === 'published'"),
    ).slice(0, 200);
    expect(publishBlock).toContain('updates.published_at');
  });

  it('COMPANY_ADMIN cannot change status to published, archived, or rejected', () => {
    expect(patchRoute).toContain(
      'COMPANY_ADMIN non può cambiare status a published, archived o rejected'
    );
  });

  it('WORKER PATCH returns 403 forbidden', () => {
    expect(patchRoute).toContain('i worker non possono modificare contenuti in KORA Commons');
  });
});

// ── Group 6: Company page /company/commons (4 tests) ─────────────────────────

describe('B128 — /company/commons: COMPANY_ADMIN view', () => {
  it('imports requireCompanyUser from kora-session', () => {
    expect(companyPage).toContain('requireCompanyUser');
  });

  it('renders company-commons root testid', () => {
    expect(companyPage).toContain('data-testid="company-commons"');
  });

  it('renders company-commons-moderation-notice testid', () => {
    expect(companyPage).toContain('data-testid="company-commons-moderation-notice"');
  });

  it('moderation notice states that content requires KORA approval before worker visibility', () => {
    expect(companyPage).toContain(
      'I contenuti diventano visibili ai worker solo dopo approvazione KORA'
    );
  });
});

// ── Group 7: Worker page /worker/commons (4 tests) ───────────────────────────

describe('B128 — /worker/commons: WORKER view — read-only, privacy-safe', () => {
  it('imports requireWorkerUser from kora-session', () => {
    expect(workerPage).toContain('requireWorkerUser');
  });

  it('renders worker-commons root testid', () => {
    expect(workerPage).toContain('data-testid="worker-commons"');
  });

  it('renders worker-commons-privacy-notice testid', () => {
    expect(workerPage).toContain('data-testid="worker-commons-privacy-notice"');
  });

  it('privacy notice states reading is not shown to employer as individual data', () => {
    expect(workerPage).toContain(
      'La tua lettura non viene mostrata al datore di lavoro come dato individuale'
    );
  });
});

// ── Group 8: Admin page /admin/commons (3 tests) ─────────────────────────────

describe('B128 — /admin/commons: KORA_ADMIN moderation console', () => {
  it('imports requireKoraAdmin from kora-session', () => {
    expect(adminPage).toContain('requireKoraAdmin');
  });

  it('renders admin-commons root testid', () => {
    expect(adminPage).toContain('data-testid="admin-commons"');
  });

  it('renders admin-commons-pending-queue stats row testid', () => {
    expect(adminPage).toContain('data-testid="admin-commons-pending-queue"');
  });
});

// ── Group 9: Components (3 tests) ────────────────────────────────────────────

describe('B128 — components: CommonsCreateForm and AdminCommonsModerationPanel', () => {
  it('CommonsCreateForm has all required testids: toggle, save-draft, submit-review', () => {
    expect(createForm).toContain('data-testid="commons-create-toggle"');
    expect(createForm).toContain('data-testid="commons-save-draft"');
    expect(createForm).toContain('data-testid="commons-submit-review"');
  });

  it('CommonsCreateForm POSTs to /api/commons/posts', () => {
    expect(createForm).toContain("'/api/commons/posts'");
  });

  it('AdminCommonsModerationPanel has dynamic filter testids and PATCH action', () => {
    expect(moderationPanel).toContain('data-testid={`filter-${value}`}');
    expect(moderationPanel).toContain("'PATCH'");
    expect(moderationPanel).toContain('/api/commons/posts/');
  });
});

// ── Group 10: Docs (2 tests) ──────────────────────────────────────────────────

describe('B128 — docs/KORA_COMMONS_FOUNDATION.md', () => {
  it('doc file exists in docs directory', () => {
    expect(fileExists('docs/KORA_COMMONS_FOUNDATION.md')).toBe(true);
  });

  it('doc explicitly excludes comments, reactions, and read receipts', () => {
    expect(commonsDoc).toContain('No comments, no reactions, no read receipts');
  });
});
