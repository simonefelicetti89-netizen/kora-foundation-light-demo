// tests/unit/b122-worker-privacy.test.ts
// B122: Worker Privacy & Sharing Settings -- 26 structural tests.
//
// Verifies that the privacy settings panel is:
//   - WORKER-only (requireWorkerUser);
//   - informational only (no active sharing, no real link generation);
//   - never accessible to employer routes;
//   - honest about what is private vs aggregated.
//
// All strings use ASCII-only quotes. No smart/curly quotes, no em-dashes.
// OXC transformer rejects Unicode quote characters as string delimiters.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildNavGroups } from '../../components/layout/Sidebar';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      results.push(...findTsFiles(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

const apiRoute     = readFile('app/api/worker/privacy-settings/route.ts');
const workerPage   = readFile('app/worker/privacy/page.tsx');
const clientComp   = readFile('app/worker/privacy/_components/PrivacySettingsClient.tsx');
const adminPreview = readFile('app/admin/preview/worker/privacy/page.tsx');
const workspace    = readFile('app/worker/workspace/page.tsx');
const accountPage  = readFile('app/account/page.tsx');
const sidebar      = readFile('components/layout/Sidebar.tsx');

// --- 1-5: API auth and session-only identity ----------------------------

describe('B122 -- /api/worker/privacy-settings auth', () => {
  it('/api/worker/privacy-settings route exists', () => {
    expect(fileExists('app/api/worker/privacy-settings/route.ts')).toBe(true);
  });

  it('API requires WORKER session (requireWorkerUser)', () => {
    expect(apiRoute).toContain('requireWorkerUser');
    expect(apiRoute).toContain('isKoraAuthError');
  });

  it('API uses workerId and tenantId from session only', () => {
    expect(apiRoute).toContain('const { workerId, tenantId } = auth');
    expect(apiRoute).not.toContain("searchParams.get('worker_id')");
    expect(apiRoute).not.toContain("searchParams.get('workerId')");
  });

  it('API does not accept worker_id from query params', () => {
    expect(apiRoute).not.toContain("request.nextUrl.searchParams.get('worker_id')");
    expect(apiRoute).not.toContain("params.worker_id");
  });

  it('API does not accept tenant_id from query params', () => {
    expect(apiRoute).not.toContain("searchParams.get('tenant_id')");
    expect(apiRoute).not.toContain("params.tenant_id");
  });
});

// --- 6-9: API response shape ------------------------------------------

describe('B122 -- API response shape', () => {
  it('API response type includes workspacePrivate', () => {
    expect(apiRoute).toContain('workspacePrivate');
  });

  it('API response includes privateData array', () => {
    expect(apiRoute).toContain('privateData');
  });

  it('API response includes aggregatedData array', () => {
    expect(apiRoute).toContain('aggregatedData');
  });

  it('All sharing controls default to false in Foundation Light', () => {
    expect(apiRoute).toContain('cvShareEnabled:       false');
    expect(apiRoute).toContain('cvPublicLinkEnabled:  false');
    expect(apiRoute).toContain('linkedInShareEnabled: false');
  });
});

// --- 10-13: Worker privacy page auth ---------------------------------

describe('B122 -- /worker/privacy route access', () => {
  it('/worker/privacy page exists', () => {
    expect(fileExists('app/worker/privacy/page.tsx')).toBe(true);
  });

  it('/worker/privacy page requires requireWorkerUser', () => {
    expect(workerPage).toContain('requireWorkerUser');
    expect(workerPage).toContain('isKoraAuthError');
  });

  it('/worker/privacy page redirects to /login on auth failure', () => {
    expect(workerPage).toContain("redirect('/login')");
  });

  it('/worker/privacy page renders PrivacySettingsClient', () => {
    expect(workerPage).toContain('PrivacySettingsClient');
  });
});

// --- 14-17: Client component — key UI elements -----------------------

describe('B122 -- PrivacySettingsClient structure', () => {
  it('client has data-testid="worker-privacy-page"', () => {
    expect(clientComp).toContain('data-testid="worker-privacy-page"');
  });

  it('client has employer-not-visible banner with data-testid', () => {
    expect(clientComp).toContain('data-testid="privacy-employer-not-visible"');
    expect(clientComp).toContain('Il tuo datore di lavoro non vede questi dati');
  });

  it('client has private data section', () => {
    expect(clientComp).toContain('data-testid="privacy-private-data"');
  });

  it('client has aggregated data section', () => {
    expect(clientComp).toContain('data-testid="privacy-aggregated-data"');
  });
});

// --- 18-20: Sharing controls — all disabled ---------------------------

describe('B122 -- Sharing controls are disabled', () => {
  it('client has sharing controls section with data-testid', () => {
    expect(clientComp).toContain('data-testid="privacy-sharing-controls"');
  });

  it('all sharing toggle buttons are disabled in Foundation Light', () => {
    const sharingSection = clientComp.slice(
      clientComp.indexOf('privacy-sharing-controls'),
      clientComp.indexOf('privacy-links-section'),
    );
    const disabledCount = (sharingSection.match(/\bdisabled\b/g) ?? []).length;
    expect(disabledCount).toBeGreaterThanOrEqual(3);
  });

  it('client does not generate a real public link', () => {
    expect(clientComp).not.toContain("window.open(");
    expect(clientComp).not.toContain("href={publicLink}");
    expect(clientComp).not.toContain("href={shareUrl}");
  });
});

// --- 21: Interpretation note ------------------------------------------

describe('B122 -- Interpretation note', () => {
  it('client has interpretation note footer with data-testid', () => {
    expect(clientComp).toContain('data-testid="privacy-interpretation-note"');
  });
});

// --- 22-24: Admin preview -------------------------------------------

describe('B122 -- Admin preview', () => {
  it('/admin/preview/worker/privacy exists', () => {
    expect(fileExists('app/admin/preview/worker/privacy/page.tsx')).toBe(true);
  });

  it('admin preview requires KORA_ADMIN (not requireWorkerUser)', () => {
    expect(adminPreview).toContain('requireKoraAdmin');
    expect(adminPreview).not.toContain('requireWorkerUser');
  });

  it('admin preview has synthetic banner', () => {
    expect(adminPreview).toContain('data-testid="admin-preview-privacy-banner"');
    expect(adminPreview).toContain('esempio sintetico');
    expect(adminPreview).toContain('non impostazioni reali');
  });
});

// --- 25: Sidebar navigation ------------------------------------------

describe('B122 -- Sidebar navigation', () => {
  it('WORKER sidebar links to /worker/privacy (not /my-kora/privacy)', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap(g => g.items);
    const privacyItem = allItems.find(i => i.label === 'Privacy & Condivisione');
    expect(privacyItem).toBeDefined();
    expect(privacyItem?.href).toContain('/worker/privacy');
    expect(privacyItem?.href).not.toContain('/my-kora/privacy');
  });
});

// --- 26: Company boundary --- no individual data leaks ---------------

describe('B122 -- Company boundary', () => {
  it('no company route imports worker privacy route or component', () => {
    const companyDirs = [
      path.join(ROOT, 'app/company'),
      path.join(ROOT, 'app/api/company'),
    ];
    const violations: string[] = [];
    for (const dir of companyDirs) {
      for (const file of findTsFiles(dir)) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('/worker/privacy') || content.includes('PrivacySettingsClient')) {
          violations.push(path.relative(ROOT, file));
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('workspace privacy card links to /worker/privacy', () => {
    expect(workspace).toContain('data-testid="workspace-privacy-card"');
    expect(workspace).toContain('data-testid="workspace-privacy-link"');
    expect(workspace).toContain('href="/worker/privacy"');
  });

  it('account page has worker-privacy link for WORKER role only (conditional)', () => {
    expect(accountPage).toContain('data-testid="account-worker-privacy-link"');
    expect(accountPage).toContain("koraRole === 'WORKER'");
    expect(accountPage).toContain('href="/worker/privacy"');
  });
});
