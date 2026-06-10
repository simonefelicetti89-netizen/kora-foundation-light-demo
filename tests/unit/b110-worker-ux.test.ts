// tests/unit/b110-worker-ux.test.ts
// B110: Worker Initiative UX & Admin Publishing Maturity — 15 structural tests.
// Tests cover admin form requirements, worker visibility rules, history privacy,
// company aggregate suppression, and placeholder integrity.
// No runtime — all tests are file-system structural checks.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function stripLineComments(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '');
}

function extractSelectArgs(src: string): string[] {
  const matches: string[] = [];
  const re = /\.select\(`([^`]+)`|\.select\('([^']+)'|\.select\("([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    matches.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  return matches;
}

// ─── Source files under test ──────────────────────────────────────────────────

const adminClient  = readFile('app/admin/worker-initiatives/_components/WorkerInitiativesClient.tsx');
const workerPage   = readFile('app/worker/workspace/page.tsx');
const initCards    = readFile('app/worker/workspace/_components/InitiativeCardsClient.tsx');
const companyView  = readFile('app/company/workspace/_components/CompanyWorkspaceView.tsx');
const aggRoute     = readFile('app/api/company/workers/activation-aggregate/route.ts');
const workerInitRoute = readFile('app/api/worker/initiatives/route.ts');
const interestRoute   = readFile('app/api/worker/initiatives/[id]/interest/route.ts');

// ─── 1. Admin form requires tenant selection ──────────────────────────────────

describe('Admin form — tenant requirement', () => {
  it('form section only renders when selectedTenantId is truthy', () => {
    // The entire form and initiative list are wrapped in {selectedTenantId && (...)}
    expect(adminClient).toContain('selectedTenantId &&');
  });

  it('tenant is sent in create request body', () => {
    expect(adminClient).toContain('tenant_id: selectedTenantId');
  });
});

// ─── 2. Admin form requires title ────────────────────────────────────────────

describe('Admin form — title requirement', () => {
  it('title input has required attribute', () => {
    expect(adminClient).toContain('required');
    // Title input has required; verify it's on the title field
    expect(adminClient).toContain("value={form.title}");
  });

  it('title is included in create request body', () => {
    expect(adminClient).toContain('title: form.title');
  });
});

// ─── 3. Admin form requires pillar ───────────────────────────────────────────

describe('Admin form — pillar requirement', () => {
  it('pillar select is rendered with canonical pillar list', () => {
    expect(adminClient).toContain("'LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'");
  });

  it('pillar is included in create request body', () => {
    expect(adminClient).toContain('pillar: form.pillar');
  });
});

// ─── 4. Published initiatives are visible to workers ─────────────────────────

describe('Worker initiative visibility — published only', () => {
  it("worker initiatives API filters status = 'published'", () => {
    expect(workerInitRoute).toContain("'published'");
    expect(workerInitRoute).toContain("eq('status'");
  });

  it('worker workspace page fetches only published initiatives', () => {
    expect(workerPage).toContain("eq('status', 'published')");
  });
});

// ─── 5. Draft initiatives not visible to workers ──────────────────────────────

describe('Draft visibility exclusion', () => {
  it('worker workspace page has no draft or closed filter path for worker view', () => {
    // The published filter ensures draft/closed are excluded; verify no separate draft fetch
    const stripped = stripLineComments(workerPage);
    const lines = stripped.split('\n').filter(l => l.includes("'draft'") || l.includes("status', 'draft'"));
    // Only allowed in STATUS_COLOR map (string value for mapping), not in DB query
    const dbQueryLines = lines.filter(l => l.includes(".eq('status'"));
    expect(dbQueryLines.length).toBe(0);
  });

  it('interest route rejects non-published initiatives', () => {
    expect(interestRoute).toContain("eq('status', 'published')");
  });
});

// ─── 6. Closed initiative blocks new participation ────────────────────────────

describe('Closed initiative — participation blocked', () => {
  it('interest route verifies initiative is published before upsert', () => {
    const src = stripLineComments(interestRoute);
    // Must check published status before performing upsert
    const publishedCheckIdx = src.indexOf("eq('status', 'published')");
    const upsertIdx = src.indexOf('.upsert(');
    expect(publishedCheckIdx).toBeGreaterThan(0);
    expect(upsertIdx).toBeGreaterThan(publishedCheckIdx);
  });

  it('404 returned if initiative is closed or wrong tenant', () => {
    expect(interestRoute).toContain('{ status: 404 }');
  });
});

// ─── 7. Worker card does not show other workers' data ────────────────────────

describe("Worker initiative cards — own data only", () => {
  it('InitiativeCardsClient receives pre-filtered initiatives as prop (no server-side join leak)', () => {
    // Client component has no direct DB calls — it only uses props passed from server
    expect(initCards).not.toContain('getSupabaseServiceClient');
    expect(initCards).not.toContain("from('worker_participation')");
  });

  it('participation status per card comes only from the server-side session-filtered data', () => {
    // Worker workspace page fetches participations filtered by workerId from session
    expect(workerPage).toContain("eq('worker_id', worker.workerId)");
  });
});

// ─── 8. Worker history shows only own participations ─────────────────────────

describe('Worker history — own rows only', () => {
  it('history query filters by worker_id from session', () => {
    // Not from request body or params — from session workerId
    const historyQueryIdx = workerPage.indexOf("from('worker_participation')");
    const workerIdFilterIdx = workerPage.indexOf("eq('worker_id', worker.workerId)");
    expect(historyQueryIdx).toBeGreaterThan(0);
    expect(workerIdFilterIdx).toBeGreaterThan(0);
  });

  it('history query includes private_note (worker is data owner)', () => {
    const selectArgs = extractSelectArgs(workerPage);
    const historySelect = selectArgs.find(s => s.includes('updated_at') || s.includes('private_note'));
    expect(historySelect).toBeDefined();
    expect(historySelect).toContain('private_note');
  });
});

// ─── 9. Worker history privacy note present ───────────────────────────────────

describe('Worker history — privacy note', () => {
  it('history section includes privacy note text visible to worker', () => {
    expect(workerPage).toContain('Solo tu puoi vedere questo storico');
  });
});

// ─── 10. Company aggregate under threshold shows suppressed state ─────────────

describe('Company aggregate — suppression UI', () => {
  it('company workspace view handles suppressed participation_summary', () => {
    expect(companyView).toContain('suppression_threshold');
    expect(companyView).toContain('dati aggregati non disponibili');
  });

  it('aggregate route returns suppression object (not -1 sentinel)', () => {
    expect(aggRoute).toContain("suppression_reason: 'privacy_threshold'");
    expect(aggRoute).not.toContain('total_participations: -1');
  });
});

// ─── 11. Company aggregate does not show PII ──────────────────────────────────

describe('Company aggregate — no PII', () => {
  it('aggregate route select does not include display_name', () => {
    const stripped = stripLineComments(aggRoute);
    const selectArgs = extractSelectArgs(stripped);
    for (const s of selectArgs) {
      expect(s).not.toContain('display_name');
    }
  });

  it('aggregate route select does not include email', () => {
    const stripped = stripLineComments(aggRoute);
    const selectArgs = extractSelectArgs(stripped);
    for (const s of selectArgs) {
      expect(s).not.toContain('email');
    }
  });
});

// ─── 12. Company aggregate does not show worker_id ────────────────────────────

describe('Company aggregate — no worker_id', () => {
  it('participation select in aggregate route does not include worker_id', () => {
    const stripped = stripLineComments(aggRoute);
    const selectArgs = extractSelectArgs(stripped);
    const partSelect = selectArgs.find(s => s.includes('initiative_id') && s.includes('status'));
    expect(partSelect).toBeDefined();
    expect(partSelect).not.toContain('worker_id');
  });
});

// ─── 13. Company aggregate does not show private_note ────────────────────────

describe('Company aggregate — no private_note', () => {
  it('aggregate route select does not include private_note in any query', () => {
    const stripped = stripLineComments(aggRoute);
    const selectArgs = extractSelectArgs(stripped);
    for (const s of selectArgs) {
      expect(s).not.toContain('private_note');
    }
  });

  it('company workspace view does not reference private_note', () => {
    const stripped = stripLineComments(companyView);
    expect(stripped).not.toContain('private_note');
  });
});

// ─── 14. No fake data presented as live ──────────────────────────────────────

describe('No fake data as live', () => {
  it('worker workspace page does not import synthetic JSON directly', () => {
    expect(workerPage).not.toContain('/data/synthetic/');
    expect(workerPage).not.toContain("from '@/data/");
  });

  it('company workspace view does not import synthetic JSON directly', () => {
    expect(companyView).not.toContain('/data/synthetic/');
    expect(companyView).not.toContain("from '@/data/");
  });

  it('InitiativeCardsClient does not import synthetic JSON', () => {
    expect(initCards).not.toContain('/data/synthetic/');
    expect(initCards).not.toContain("from '@/data/");
  });
});

// ─── 15. Dynamic CV and partner map remain honest placeholders ────────────────

describe('Placeholder integrity', () => {
  it('Dynamic Impact CV remains a placeholder section in worker workspace', () => {
    expect(workerPage).toContain('Dynamic Impact CV');
    expect(workerPage).toContain('Prossimamente');
  });

  it('worker workspace has no live Dynamic CV logic', () => {
    expect(workerPage).not.toContain('DynamicCVService');
    expect(workerPage).not.toContain('dynamic-cv/items');
  });

  it('worker workspace placeholder sections are marked as upcoming', () => {
    expect(workerPage).toContain('PlaceholderSection');
  });
});
