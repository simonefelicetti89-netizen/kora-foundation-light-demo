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

describe('B142-A — KORA Space worker view structure', () => {
  it('8. worker view renders kora-space-worker testid', () => {
    expect(workerSrc).toContain('data-testid="kora-space-worker"');
  });

  it('9. worker view has privacy notice with all 4 required strings', () => {
    expect(workerSrc).toContain('data-testid="kora-space-worker-privacy"');
    expect(workerSrc).toContain('KORA Space mostra contenuti e opportunità condivise. Non espone dati individuali dei lavoratori.');
    expect(workerSrc).toContain('Le richieste dei lavoratori sono gestite solo in forma aggregata o supervisionata.');
    expect(workerSrc).toContain('La partecipazione individuale non è visibile all');
    expect(workerSrc).toContain('KORA misura l');
  });

  it('10. worker view renders space cards with dynamic worker testid pattern', () => {
    expect(workerSrc).toContain('`kora-space-worker-card-${item.id}`');
    expect(workerSrc).toContain("'ks-001'");
    expect(workerSrc).toContain("'ks-002'");
    expect(workerSrc).toContain("'ks-003'");
    expect(workerSrc).toContain("'ks-004'");
  });

  it('11. worker view guards access via myKoraPreviewService.canAccess', () => {
    expect(workerSrc).toContain('myKoraPreviewService');
    expect(workerSrc).toContain('canAccess');
    expect(workerSrc).toContain('data-testid="access-denied"');
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
