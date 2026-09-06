// tests/unit/b142a-kora-space-foundation-light.test.ts
// B142-A — KORA Space Foundation Light MVP.
//
// Pure structural/static tests — no DB, no Supabase, no runtime rendering.
// Verifies:
//   - Worker view at /my-kora/kora-space
//   - Sidebar navigation entries
//   - Permissions: /my-kora/kora-space in worker routes
//   - Privacy invariants: no individual worker data in company view
//
// B147 update: /company/shared (vetrina sintetica) rimosso. La funzione KORA Space
// sopravvive in /company/commons (dati reali, migration 013). I test 1-7 e 15 che
// verificavano la vetrina eliminata sono stati rimossi perché proteggevano lo stato
// sbagliato (una pagina sintetica da smantellare). I test sulla copertura sana
// (worker view, sidebar link, permissions worker) sopravvivono tutti.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

const workerSrc   = read('app/my-kora/kora-space/page.tsx');
const sidebarSrc  = read('components/layout/Sidebar.tsx');
const permsSrc    = read('lib/permissions/index.ts');

// ── 8–11: Worker view structure ───────────────────────────────────────────────
//
// PRIOR HISTORY (accurate as of B142-A, preserved verbatim): tests 8-11
// checked app/my-kora/kora-space/page.tsx for its own worker-view testid,
// 4-part privacy notice, dynamic space-card testids (ks-001..004), and
// myKoraPreviewService.canAccess-gated access-denied block.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): the
// page is now a one-line, unconditional redirect() to /worker/commons — none
// of this worker-view content exists on it anymore. The canonical
// /worker/commons page (its own privacy notice: worker-commons-privacy-notice)
// is the real worker-facing KORA Space surface now.
describe('B-WORKER preview retirement — /my-kora/kora-space is a pure canonical redirect', () => {
  it('redirects unconditionally to /worker/commons, for every visitor', () => {
    expect(workerSrc).toContain("redirect('/worker/commons')");
  });

  it('no worker-view content, privacy notice, space cards, or synthetic access gate remains', () => {
    expect(workerSrc).not.toContain('data-testid="kora-space-worker"');
    expect(workerSrc).not.toContain('myKoraPreviewService');
    expect(workerSrc).not.toContain('KORA_SPACE_ITEMS');
  });
});

// ── 12: Worker view privacy — no company KPIs ─────────────────────────────────

describe('B142-A — Worker view privacy invariants', () => {
  it('12. worker view has no company KPI or KORA Index references', () => {
    expect(workerSrc).not.toContain('kora_index_value');
    expect(workerSrc).not.toContain('activation_rate');
    expect(workerSrc).not.toContain('ScoringSimulator');
    expect(workerSrc).not.toContain('KoraIndexEngine');
  });
});

// ── 13: Sidebar navigation ────────────────────────────────────────────────────

describe('B142-A — Sidebar navigation', () => {
  it('13. sidebar includes KORA Space link for worker nav', () => {
    expect(sidebarSrc).toContain('/my-kora/kora-space');
    expect(sidebarSrc).toContain('KORA Space');
  });

  it('13b. company admin sidebar has KORA Space pointing to /company/commons (real function)', () => {
    // B147: /company/shared (vetrina sintetica) rimossa. La funzione reale è /company/commons.
    // La sidebar company admin ora ha un'unica voce Network: KORA Space → /company/commons.
    expect(sidebarSrc).toContain("'/company/commons'");
    expect(sidebarSrc).not.toContain("'/company/shared'");
  });
});

// ── 14: Permissions ───────────────────────────────────────────────────────────

describe('B142-A — Permissions', () => {
  it('14. /my-kora/kora-space is in worker routes in both permission functions', () => {
    expect(permsSrc).toContain("'/my-kora/kora-space'");
    const occurrences = (permsSrc.match(/\/my-kora\/kora-space/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('14b. /company/shared is NOT in COMPANY_DEMO_ROUTES (vetrina sintetica rimossa)', () => {
    // B147: /company/shared smantellato — non deve più apparire nelle route permesse.
    const demoRoutesStart = permsSrc.indexOf('const COMPANY_DEMO_ROUTES');
    const demoRoutesEnd   = permsSrc.indexOf('] as const;', demoRoutesStart);
    const demoRoutesBlock = permsSrc.substring(demoRoutesStart, demoRoutesEnd);
    expect(demoRoutesBlock).not.toContain("'/company/shared'");
  });
});
