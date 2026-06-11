// tests/unit/b121-dynamic-cv.test.ts
// B121: Dynamic Impact CV Light -- 28 structural tests.
//
// Verifica che il Dynamic Impact CV sia:
//   - privato (solo WORKER);
//   - non valutativo (no score, no ranking, no percentile);
//   - non employer-visible;
//   - basato su partecipazioni reali.
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

const apiRoute      = readFile('app/api/worker/dynamic-cv/route.ts');
const workerPage    = readFile('app/worker/dynamic-cv/page.tsx');
const clientComp    = readFile('app/worker/dynamic-cv/_components/DynamicCVClient.tsx');
const adminPreview  = readFile('app/admin/preview/worker/dynamic-cv/page.tsx');
const workspacePage = readFile('app/worker/workspace/page.tsx');

// --- 1-5: API auth and session-only identity ----------------------------

describe('B121 -- /api/worker/dynamic-cv auth', () => {
  it('/api/worker/dynamic-cv requires WORKER session (requireWorkerUser)', () => {
    expect(apiRoute).toContain('requireWorkerUser');
    expect(apiRoute).toContain('isKoraAuthError');
  });

  it('API uses workerId from session (destructured from requireWorkerUser result)', () => {
    // workerId is destructured from the auth result — never read from request params
    expect(apiRoute).toContain('const { workerId');
    expect(apiRoute).not.toContain("request.nextUrl.searchParams.get('workerId')");
    expect(apiRoute).not.toContain("params.workerId");
  });

  it('API uses tenantId from session (destructured from requireWorkerUser result)', () => {
    expect(apiRoute).toContain('const { workerId, tenantId }');
    expect(apiRoute).not.toContain("request.nextUrl.searchParams.get('tenantId')");
  });

  it('API does not accept worker_id from query params', () => {
    expect(apiRoute).not.toContain("request.nextUrl.searchParams.get('worker_id')");
    expect(apiRoute).not.toContain("searchParams.get('worker_id')");
    expect(apiRoute).not.toContain("params.worker_id");
  });

  it('API does not accept tenant_id from query params', () => {
    expect(apiRoute).not.toContain("searchParams.get('tenant_id')");
    expect(apiRoute).not.toContain("searchParams.get('tenantId')");
    expect(apiRoute).not.toContain("params.tenant_id");
  });
});

// --- 6-8: Route access control -----------------------------------------

describe('B121 -- /worker/dynamic-cv route access', () => {
  it('/worker/dynamic-cv page exists', () => {
    expect(fileExists('app/worker/dynamic-cv/page.tsx')).toBe(true);
  });

  it('/worker/dynamic-cv page requires requireWorkerUser', () => {
    expect(workerPage).toContain('requireWorkerUser');
    expect(workerPage).toContain('isKoraAuthError');
  });

  it('/worker/dynamic-cv page redirects to /login on auth failure', () => {
    expect(workerPage).toContain("redirect('/login')");
  });
});

// --- 9-12: Privacy banner and non-evaluative copy ----------------------

describe('B121 -- Privacy and non-evaluative copy', () => {
  it('DynamicCVClient has data-testid="dynamic-cv-privacy-banner"', () => {
    expect(clientComp).toContain('data-testid="dynamic-cv-privacy-banner"');
  });

  it('privacy banner states employer does not see this CV', () => {
    expect(clientComp).toContain('Il tuo datore di lavoro non vede questo CV');
  });

  it('privacy copy states this is not an individual evaluation', () => {
    expect(clientComp).toContain('non');
    expect(clientComp).toContain('valutazione individuale');
  });

  it('DynamicCVClient does not show ranking or comparison text', () => {
    // Must not render raw ranking/confronto/percentile claims as data outputs
    // Check for absence in template expressions, not comments
    expect(/\{.*ranking.*\}/i.test(clientComp)).toBe(false);
    expect(/\{.*percentile.*\}/i.test(clientComp)).toBe(false);
  });
});

// --- 13-15: Experience status logic ------------------------------------

describe('B121 -- Experience status logic', () => {
  it('cancelled is excluded from experiences in API route', () => {
    // cancelled status causes a continue/skip in the experiences loop
    expect(apiRoute).toContain("if (status === 'cancelled') continue");
  });

  it('attended appears as Partecipazione registrata', () => {
    expect(apiRoute).toContain("attended:   'Partecipazione registrata'");
  });

  it('interested appears as Interesse espresso (not as completion)', () => {
    expect(apiRoute).toContain("interested: 'Interesse espresso'");
    // interested must NOT be labeled the same as attended
    expect(apiRoute).not.toContain("interested: 'Partecipazione registrata'");
  });
});

// --- 16-18: No individual data exposed to employer ---------------------

describe('B121 -- No individual data exposed to employer', () => {
  it('DynamicCVClient does not expose worker email in JSX template expressions', () => {
    expect(clientComp).not.toContain('{workerEmail}');
    expect(clientComp).not.toContain('{worker.email}');
    expect(clientComp).not.toContain('{_userEmail}');
  });

  it('DynamicCVClient does not expose worker_id in JSX template expressions', () => {
    expect(clientComp).not.toContain('{worker_id}');
    expect(clientComp).not.toContain('{workerId}');
    expect(clientComp).not.toContain('.worker_id}');
  });

  it('API route does not include private_note in CV experiences output', () => {
    // private_note must not be in the CVExperience type or allExperiences array
    const cvExperienceBlock = apiRoute.slice(
      apiRoute.indexOf('export type CVExperience'),
      apiRoute.indexOf('export type CVPillarEntry'),
    );
    expect(cvExperienceBlock).not.toContain('private_note');
  });
});

// --- 19-20: Sidebar and workspace navigation ---------------------------

describe('B121 -- Navigation', () => {
  it('WORKER sidebar links to /worker/dynamic-cv (not my-kora, not comingSoon)', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap(g => g.items);
    const cvItem = allItems.find(i => i.label === 'Dynamic Impact CV');
    expect(cvItem).toBeDefined();
    expect(cvItem?.href).toContain('/worker/dynamic-cv');
    expect(cvItem?.comingSoon).not.toBe(true);
  });

  it('workspace page has data-testid="workspace-dynamic-cv-card"', () => {
    expect(workspacePage).toContain('data-testid="workspace-dynamic-cv-card"');
  });

  it('workspace page has link to /worker/dynamic-cv', () => {
    expect(workspacePage).toContain('data-testid="workspace-dynamic-cv-link"');
    expect(workspacePage).toContain('href="/worker/dynamic-cv"');
  });
});

// --- 21-22: Admin preview ---------------------------------------------

describe('B121 -- Admin preview', () => {
  it('/admin/preview/worker/dynamic-cv exists', () => {
    expect(fileExists('app/admin/preview/worker/dynamic-cv/page.tsx')).toBe(true);
  });

  it('admin preview requires KORA_ADMIN (not requireWorkerUser)', () => {
    expect(adminPreview).toContain('requireKoraAdmin');
    expect(adminPreview).not.toContain('requireWorkerUser');
  });

  it('admin preview has synthetic banner', () => {
    expect(adminPreview).toContain('data-testid="admin-preview-dynamic-cv-banner"');
    expect(adminPreview).toContain('esempio sintetico');
    expect(adminPreview).toContain('non CV reale');
  });

  it('admin preview does not query real worker_participation rows', () => {
    // Must not run Supabase queries on personal.worker_participation
    expect(adminPreview).not.toContain(".from('worker_participation')");
    expect(adminPreview).not.toContain('getSupabaseBrowserClient');
  });
});

// --- 23: Company boundary ---------------------------------------------

describe('B121 -- Company boundary', () => {
  it('no company route imports dynamic-cv route or component', () => {
    const companyDirs = [
      path.join(ROOT, 'app/company'),
      path.join(ROOT, 'app/api/company'),
    ];

    const violations: string[] = [];

    for (const dir of companyDirs) {
      for (const file of findTsFiles(dir)) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('/worker/dynamic-cv') || content.includes('DynamicCVClient')) {
          violations.push(path.relative(ROOT, file));
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// --- 24-26: No individual score, ranking, or percentile ---------------

describe('B121 -- No score, ranking, or percentile', () => {
  it('API route does not include a kora_index score for the individual', () => {
    expect(apiRoute).not.toContain('koraIndexValue');
    expect(apiRoute).not.toContain('kora_index_value');
  });

  it('API route does not include ranking or percentile data fields in response type', () => {
    // Check the DynamicCVResponse type definition — must not have ranking/percentile fields
    const responseTypeBlock = apiRoute.slice(
      apiRoute.indexOf('export type DynamicCVResponse'),
      apiRoute.indexOf('const ALL_PILLARS'),
    );
    expect(responseTypeBlock).not.toContain('ranking');
    expect(responseTypeBlock).not.toContain('percentile');
  });

  it('DynamicCVClient does not render kora_index or score data output expressions', () => {
    // Check JSX template expressions for scoring data — comments/copy are fine
    expect(/\{.*koraIndexValue.*\}/.test(clientComp)).toBe(false);
    expect(/\{.*kora_index_value.*\}/.test(clientComp)).toBe(false);
    // percentile in template expressions
    expect(/\{.*percentile.*\}/.test(clientComp)).toBe(false);
  });
});

// --- 27-28: Export/share (B126 — active, not coming soon) ------------
// NOTE: B126 activated the export section. Print link is active; share button creates real links.

describe('B121 -- Export/share section (updated B126)', () => {
  it('DynamicCVClient has export section with print link and share button', () => {
    // B126: print link is now an active <a> tag, not a disabled button
    expect(clientComp).toContain('data-testid="dynamic-cv-print-link"');
    expect(clientComp).toContain('data-testid="dynamic-cv-share-link-btn"');
    expect(clientComp).toContain('data-testid="dynamic-cv-export-section"');
  });

  it('DynamicCVClient export section has condivisione volontaria copy', () => {
    // B126: copy updated from "coming soon" to active voluntary sharing description
    expect(clientComp).toContain('La condivisione');
    expect(clientComp).toContain('volontaria');
  });
});
