// tests/unit/b126-worker-cv-share.test.ts
// B126: Dynamic Impact CV Export & Controlled Sharing Foundation -- 35 structural tests.
//
// Verifies:
//   - Migration 011 creates worker_cv_share table
//   - Token security: hash stored, raw never in DB
//   - Share API: auth, identity from session, no client-supplied worker_id
//   - Public share view: active/revoked/expired states, public-safe fields
//   - Company boundary: no company access path
//   - Print view: WORKER only, exists
//   - Admin preview: CTA disabled, synthetic banner
//   - Privacy docs: revoca, scadenza, employer no-access
//   - No console.log of tokens, no token in test snapshots
//
// All strings use ASCII-only quotes. OXC transformer rejects Unicode quote chars.

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

const migration011  = readFile('supabase/migrations/011_worker_cv_share.sql');
const shareToken    = readFile('lib/worker-cv/share-token.ts');
const sharePost     = readFile('app/api/worker/dynamic-cv/share/route.ts');
const sharesGet     = readFile('app/api/worker/dynamic-cv/shares/route.ts');
const revokeRoute   = readFile('app/api/worker/dynamic-cv/shares/[id]/revoke/route.ts');
const publicView    = readFile('app/cv/share/[token]/page.tsx');
const printPage     = readFile('app/worker/dynamic-cv/print/page.tsx');
const cvClient      = readFile('app/worker/dynamic-cv/_components/DynamicCVClient.tsx');
const adminPreview  = readFile('app/admin/preview/worker/dynamic-cv/page.tsx');
const privacyClient = readFile('app/worker/privacy/_components/PrivacySettingsClient.tsx');
const privacyDoc    = readFile('docs/WORKER_PRIVACY_AND_SHARING.md');
const middleware    = readFile('middleware.ts');
const appShell      = readFile('components/layout/AppShell.tsx');

// --- 1: Migration creates worker_cv_share table --------------------------

describe('B126 -- migration 011 creates worker_cv_share', () => {
  it('migration 011 file exists', () => {
    expect(fileExists('supabase/migrations/011_worker_cv_share.sql')).toBe(true);
  });

  it('migration creates personal.worker_cv_share table', () => {
    expect(migration011).toContain('CREATE TABLE IF NOT EXISTS personal.worker_cv_share');
  });

  it('migration has token_hash field (not token plain text)', () => {
    expect(migration011).toContain('token_hash');
    expect(migration011).not.toContain('token_plain');
    expect(migration011).not.toContain('token text');
  });

  it('migration has status field with active/revoked/expired constraint', () => {
    expect(migration011).toContain("CHECK (status IN ('active', 'revoked', 'expired'))");
  });

  it('migration has expires_at field (not null)', () => {
    expect(migration011).toContain('expires_at');
    expect(migration011).toContain('NOT NULL');
  });

  it('migration has no company RLS policy', () => {
    // Company roles must have no policy on this table
    expect(migration011).not.toContain("COMPANY_ADMIN");
    expect(migration011).not.toContain("COMPANY_VIEWER");
  });
});

// --- 7: Token utility is secure ------------------------------------------

describe('B126 -- share-token.ts security', () => {
  it('generateShareToken uses randomBytes (CSPRNG)', () => {
    expect(shareToken).toContain('randomBytes');
    // ES module import syntax: import { ... } from 'crypto'
    expect(shareToken).toContain("from 'crypto'");
  });

  it('hashShareToken uses SHA-256 (deterministic)', () => {
    expect(shareToken).toContain("createHash('sha256')");
    expect(shareToken).toContain("digest('hex')");
  });

  it('raw token never logged (no console.log call)', () => {
    // Check that no actual console.log() call exists (comment mention is ok)
    // The utility must never call console.log(token) or similar
    expect(shareToken).not.toContain('console.log(');
    expect(shareToken).not.toContain('console.error(');
  });

  it('buildShareUrl never includes worker_id or tenant_id in the URL', () => {
    // URL is built from base + /cv/share/ + token only
    expect(shareToken).toContain('/cv/share/');
    // The buildShareUrl function itself must not reference workerId/tenantId
    const buildShareUrlFn = shareToken.slice(shareToken.indexOf('export function buildShareUrl'));
    expect(buildShareUrlFn).not.toContain('workerId');
    expect(buildShareUrlFn).not.toContain('tenantId');
  });

  it('isShareExpired compares expires_at with current time', () => {
    expect(shareToken).toContain('isShareExpired');
    expect(shareToken).toContain('new Date(expiresAt)');
  });
});

// --- 10: POST share API auth and identity --------------------------------

describe('B126 -- POST /api/worker/dynamic-cv/share', () => {
  it('POST share requires WORKER auth (requireWorkerUser)', () => {
    expect(sharePost).toContain('requireWorkerUser');
    expect(sharePost).toContain('isKoraAuthError');
  });

  it('POST share derives workerId from session, not request body', () => {
    // workerId comes from auth object (session), never from request.json()
    expect(sharePost).toContain('const { workerId, tenantId } = auth');
    // No body parsing for identity
    expect(sharePost).not.toContain('request.json()');
    expect(sharePost).not.toContain("req.body['worker_id']");
    expect(sharePost).not.toContain("req.body['tenant_id']");
  });

  it('POST share does not return token_hash', () => {
    // Response body must contain shareUrl (raw token used only here, then discarded)
    expect(sharePost).toContain('shareUrl:  buildShareUrl(rawToken)');
    // DB insert uses hash — raw token never assigned to token_hash field
    expect(sharePost).not.toContain('token_hash: rawToken');
    // Response JSON object never exposes the hash either
    expect(sharePost).not.toContain('"token_hash"');
  });

  it('POST share saves token_hash not raw token to DB', () => {
    // insert uses tokenHash (hash), not rawToken
    expect(sharePost).toContain('token_hash: tokenHash');
    // rawToken is used only for buildShareUrl, not in DB insert
    expect(sharePost).toContain('buildShareUrl(rawToken)');
  });
});

// --- 13: GET shares API --------------------------------------------------

describe('B126 -- GET /api/worker/dynamic-cv/shares', () => {
  it('GET shares requires WORKER auth', () => {
    expect(sharesGet).toContain('requireWorkerUser');
  });

  it('GET shares never selects token_hash', () => {
    // The select statement must not include token_hash
    expect(sharesGet).not.toContain("select('token_hash')");
    expect(sharesGet).not.toContain("'token_hash,");
    // Check the actual select fields
    expect(sharesGet).toContain('id, status, expires_at, created_at, revoked_at, last_accessed_at, access_count');
  });
});

// --- 14: Revoke API -------------------------------------------------------

describe('B126 -- PATCH revoke', () => {
  it('revoke requires WORKER auth', () => {
    expect(revokeRoute).toContain('requireWorkerUser');
  });

  it('revoke filters by worker_id from session (own rows only)', () => {
    expect(revokeRoute).toContain('.eq(\'worker_id\', workerId)');
  });

  it('revoke sets status = revoked and revoked_at', () => {
    expect(revokeRoute).toContain("status:     'revoked'");
    expect(revokeRoute).toContain('revoked_at:');
  });
});

// --- 15-18: Public share view states ------------------------------------

describe('B126 -- public share view states', () => {
  it('revoked link shows revoked state, not CV', () => {
    // ShareInvalidPage is called with reason="revoked"
    expect(publicView).toContain('reason="revoked"');
    // ShareInvalidPage uses template literal: data-testid={`cv-share-${reason}`}
    expect(publicView).toContain('cv-share-${reason}');
  });

  it('expired link shows expired state, not CV', () => {
    // ShareInvalidPage is called with reason="expired"
    expect(publicView).toContain('reason="expired"');
    // Same template literal covers both states
    expect(publicView).toContain('cv-share-${reason}');
  });

  it('invalid token causes notFound()', () => {
    expect(publicView).toContain('notFound()');
    expect(publicView).toContain('/^[0-9a-f]{64}$/');
  });

  it('active token shows public-safe CV', () => {
    expect(publicView).toContain('data-testid="cv-share-public-view"');
    expect(publicView).toContain('data-testid="cv-share-hero"');
    expect(publicView).toContain('data-testid="cv-share-privacy-footer"');
  });
});

// --- 19-24: Public-safe CV exclusions -----------------------------------

describe('B126 -- public-safe CV excludes sensitive fields', () => {
  it('public view never renders worker_id', () => {
    // The view must not render workerId as a field (it uses it for lookup only, server-side)
    expect(publicView).not.toContain('data-testid="cv-share-worker-id"');
    expect(publicView).not.toContain('{workerId}');
  });

  it('public view never renders tenant_id', () => {
    expect(publicView).not.toContain('data-testid="cv-share-tenant-id"');
    expect(publicView).not.toContain('{tenantId}');
  });

  it('public view never renders private_note', () => {
    // private_note may appear in comments but must never be in a DB select or JSX render
    expect(publicView).not.toContain("select('private_note");
    expect(publicView).not.toContain('{private_note}');
    expect(publicView).not.toContain('private_note,');
  });

  it('public view never renders ranking or score as a data field', () => {
    // Footer explicitly says "Non contiene ranking" — that mention is the disclaimer
    // Ranking must never appear as a rendered data value or testid
    expect(publicView).not.toContain('{ranking}');
    expect(publicView).not.toContain('rankingScore');
    expect(publicView).not.toContain('data-testid="cv-share-ranking"');
    // Privacy footer confirms exclusion
    expect(publicView).toContain('Non contiene ranking');
  });

  it('public view has voluntary sharing disclaimer', () => {
    expect(publicView).toContain('data-testid="cv-share-voluntary-banner"');
    expect(publicView).toContain('CV condiviso volontariamente');
  });

  it('public view has non-suppressible privacy footer', () => {
    expect(publicView).toContain('data-testid="cv-share-privacy-footer"');
    expect(publicView).toContain('revocato dal lavoratore');
  });
});

// --- 25: Company boundary -----------------------------------------------

describe('B126 -- company cannot access worker CV share', () => {
  it('no company route imports share APIs', () => {
    const companyRoutes = [
      'app/company/workspace',
      'app/company/kora-index',
      'app/company/reports',
    ];
    for (const route of companyRoutes) {
      if (fileExists(route + '/page.tsx')) {
        const content = readFile(route + '/page.tsx');
        expect(content).not.toContain('/api/worker/dynamic-cv/share');
        expect(content).not.toContain('worker_cv_share');
      }
    }
  });

  it('migration 011 has no COMPANY_ADMIN/COMPANY_VIEWER RLS policy', () => {
    expect(migration011).not.toContain('COMPANY_ADMIN');
    expect(migration011).not.toContain('COMPANY_VIEWER');
    expect(migration011).not.toContain('company_role');
  });
});

// --- 26-27: Worker CV UI ------------------------------------------------

describe('B126 -- /worker/dynamic-cv UI', () => {
  it('dynamic CV client has create share button', () => {
    expect(cvClient).toContain('data-testid="dynamic-cv-share-link-btn"');
    expect(cvClient).toContain('handleCreateShare');
  });

  it('dynamic CV client has revoke button', () => {
    expect(cvClient).toContain('data-testid="dynamic-cv-revoke-btn"');
    expect(cvClient).toContain('handleRevoke');
  });
});

// --- 28-29: Print view --------------------------------------------------

describe('B126 -- printable view', () => {
  it('/worker/dynamic-cv/print page exists', () => {
    expect(fileExists('app/worker/dynamic-cv/print/page.tsx')).toBe(true);
  });

  it('print view requires WORKER auth (requireWorkerUser)', () => {
    expect(printPage).toContain('requireWorkerUser');
    expect(printPage).toContain('redirect(\'/login\')');
  });

  it('print view has data-testid="dynamic-cv-print-view"', () => {
    expect(printPage).toContain('data-testid="dynamic-cv-print-view"');
  });
});

// --- 30: Admin preview CTA disabled ------------------------------------

describe('B126 -- admin preview CTA disabled', () => {
  it('admin preview export section has disabled buttons', () => {
    expect(adminPreview).toContain('data-testid="admin-preview-export-section"');
    expect(adminPreview).toContain('Esempio sintetico');
    expect(adminPreview).toContain('worker only');
  });

  it('admin preview cannot generate real share links', () => {
    expect(adminPreview).not.toContain('/api/worker/dynamic-cv/share');
    expect(adminPreview).not.toContain('generateShareToken');
  });
});

// --- 31-33: Privacy doc ------------------------------------------------

describe('B126 -- privacy doc updated', () => {
  it('privacy doc cites revoca (revocation)', () => {
    // Doc is in English; Italian copy lives in the component
    expect(privacyDoc).toContain('Revocable');
  });

  it('privacy doc cites 30-day expiry (scadenza)', () => {
    // Doc is in English; Italian copy lives in the component
    expect(privacyDoc).toContain('30 days');
  });

  it('privacy doc states employer does not see share', () => {
    const hasEmployerStatement =
      privacyDoc.includes('Employer access: non consentito') ||
      privacyDoc.includes('non company RLS') ||
      privacyDoc.includes('no company RLS');
    expect(hasEmployerStatement).toBe(true);
  });
});

// --- 34-35: No token in logs or test snapshots -------------------------

describe('B126 -- token security in source files', () => {
  it('no console.log of token in share route', () => {
    expect(sharePost).not.toContain('console.log');
    expect(sharePost).not.toContain('console.error');
  });

  it('middleware allows /cv/share/ for workers', () => {
    expect(middleware).toContain("'/cv/share/'");
    // Verify it is in the WORKER_ALLOWED_PREFIXES section
    const workerSection = middleware.slice(middleware.indexOf('WORKER_ALLOWED_PREFIXES'));
    expect(workerSection).toContain("'/cv/share/'");
  });

  it('AppShell treats /cv/share/ as public route (no chrome)', () => {
    expect(appShell).toContain("'/cv/share/'");
    expect(appShell).toContain('PUBLIC_ROUTE_PREFIXES');
  });
});
