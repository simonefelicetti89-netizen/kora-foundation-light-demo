// tests/unit/b115-worker-ux-polish.test.ts
// B115: Worker UX Polish & MVP Readiness Pass — 18 structural tests.
// Verifies that the worker platform is presentable to a pilot worker:
// comprehensible, private, actionable, and free of internal sprint references.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

const workspacePage    = readFile('app/worker/workspace/page.tsx');
const initiativeCards  = readFile('app/worker/workspace/_components/InitiativeCardsClient.tsx');
const activationSec    = readFile('app/worker/workspace/_components/ActivationProfileSection.tsx');
const sidebar          = readFile('components/layout/Sidebar.tsx');
const runbook          = readFile('docs/WORKER_TRIAL_RUNBOOK.md');

// ─── 1. Workspace page — structure ────────────────────────────────────────────

describe('Workspace page — structure and identity', () => {
  it('workspace page has data-testid="workspace-page"', () => {
    expect(workspacePage).toContain('data-testid="workspace-page"');
  });

  it('workspace page has data-testid="privacy-active-badge"', () => {
    expect(workspacePage).toContain('data-testid="privacy-active-badge"');
  });

  it('workspace page has data-testid="workspace-hero"', () => {
    expect(workspacePage).toContain('data-testid="workspace-hero"');
  });

  it('workspace footer does not expose sprint reference "B109" in the visible UI', () => {
    // The file comment may reference B109, but the visible footer string must not
    expect(workspacePage).not.toContain("· B109 ·");
    expect(workspacePage).not.toContain("'B109'");
    expect(workspacePage).not.toContain('"B109"');
    expect(workspacePage).not.toContain('· B109');
  });

  it('workspace footer mentions "KORA Foundation Light"', () => {
    expect(workspacePage).toContain('KORA Foundation Light');
  });

  it('workspace identity card does not expose worker_ref to the worker', () => {
    // Worker Ref is a technical internal code — removed from the worker-facing UI
    expect(workspacePage).not.toContain('label="Worker Ref"');
  });
});

// ─── 2. Workspace page — empty states ─────────────────────────────────────────

describe('Workspace page — empty states', () => {
  it('history empty state has data-testid="workspace-history-empty"', () => {
    expect(workspacePage).toContain('data-testid="workspace-history-empty"');
  });

  it('history empty state references the initiatives section', () => {
    expect(workspacePage).toContain("iniziativa");
    expect(workspacePage).toContain("ancora");
  });
});

// ─── 3. Initiative Cards — UX polish ─────────────────────────────────────────

describe('Initiative Cards — UX polish', () => {
  it('formatDateIT function exists', () => {
    expect(initiativeCards).toContain('function formatDateIT(');
  });

  it('formatDateIT uses Italian month abbreviations', () => {
    expect(initiativeCards).toContain("'gen'");
    expect(initiativeCards).toContain("'lug'");
    expect(initiativeCards).toContain("'dic'");
  });

  it('description truncation uses "…" ellipsis (not hard cut)', () => {
    expect(initiativeCards).toContain('`${init.description.slice(0, 160)}…`');
  });

  it('saved feedback state exists in InitiativeCard', () => {
    expect(initiativeCards).toContain('saved, setSaved');
  });

  it('saved feedback shows "Aggiornamento salvato" to the worker', () => {
    expect(initiativeCards).toContain('Aggiornamento salvato');
    expect(initiativeCards).toContain('data-testid="initiative-saved-feedback"');
  });

  it('initiative cards empty state has data-testid="initiative-cards-empty"', () => {
    expect(initiativeCards).toContain('data-testid="initiative-cards-empty"');
  });
});

// ─── 4. Activation Profile Section — UX polish ───────────────────────────────

describe('Activation Profile Section — UX polish', () => {
  it('empty state has data-testid="activation-profile-empty"', () => {
    expect(activationSec).toContain('data-testid="activation-profile-empty"');
  });

  it('empty state copy mentions "non è una valutazione individuale"', () => {
    expect(activationSec).toContain('non è una valutazione individuale');
  });

  it('PrivacyCard copy mentions "non genera ranking"', () => {
    expect(activationSec).toContain('non genera ranking');
  });
});

// ─── 5. Sidebar — worker navigation ──────────────────────────────────────────

describe('Sidebar — worker navigation', () => {
  it('Dynamic Impact CV is marked comingSoon', () => {
    expect(sidebar).toContain("label: 'Dynamic Impact CV', comingSoon: true");
  });

  it('Opportunità references /worker/opportunities in sidebar (B117-G: ternary for admin preview)', () => {
    // B117-G: sidebar uses isAdminPreview ternary — WORKER default is /worker/opportunities,
    // admin preview is /admin/preview/worker/opportunities. Both paths reference the string.
    expect(sidebar).toContain("'/worker/opportunities'");
    // No comingSoon on the Opportunità item (it is a live route for workers)
    const opportunitaLine = sidebar
      .split('\n')
      .find(l => l.includes('/worker/opportunities'));
    expect(opportunitaLine).not.toContain('comingSoon');
  });

  it('worker nav does not contain /company/login', () => {
    // Extract the worker nav section and verify no /company/login links
    const workerSection = sidebar.slice(
      sidebar.indexOf('isWorkerRole'),
      sidebar.indexOf('isWorkerRole') + 1200,
    );
    expect(workerSection).not.toContain('/company/login');
  });
});

// ─── 6. Runbook — MVP Limitations + UX Checklist ─────────────────────────────

describe('Runbook — MVP Limitations and UX Checklist', () => {
  it('runbook has MVP Limitations section', () => {
    expect(runbook).toContain('## MVP Limitations');
  });

  it('runbook has UX checklist section', () => {
    expect(runbook).toContain('Checklist UX');
    expect(runbook).toContain('- [ ]');
  });

  it('runbook MVP Limitations mentions Dynamic Impact CV as unavailable', () => {
    expect(runbook).toContain('Dynamic Impact CV');
    expect(runbook).toContain('Non disponibile');
  });
});
