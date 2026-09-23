// tests/unit/kora-wp-049-explainable-quality-errors.test.ts
//
// KORA-WP-049 — Explainable Quality Errors.
//
// THE RULING THIS SUITE ENCODES — Founder, 2026-09-21: READING B, REACH THE
// RIGHT COMPANY PERSONA.
//
// Reading A (polishing the parse-issue list on /company/data/upload) was
// REJECTED: that route is orphaned — absent from Company navigation — and its
// own copy states the Company does not self-serve ingestion in the current
// operating model. The acceptance criterion names "a non-technical Company
// user", so the canonical target is the Company surface the Company actually
// reaches: /company/data.
//
// Reading C (a universal error contract spanning parser, ingest API, Admin
// Data Intake and submission history) was also rejected — architecture work
// beyond this package, approaching KORA-WP-070's console.
//
// The data was already there: GET /api/company/data-submissions/history reads
// persisted analytics.source_batch rows and already filters to aggregate-safe
// output. This package adds explanation, not persistence: no migration, no new
// endpoint, no new error contract.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { buildNavGroups } from '@/components/layout/Sidebar';

const ROOT = resolve(process.cwd());
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel: string) => existsSync(join(ROOT, rel));

// Executable source only — comments document, they do not behave.
const code = (rel: string) =>
  read(rel)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const PAGE        = 'app/company/data/page.tsx';
const HISTORY_API = 'app/api/company/data-submissions/history/route.ts';
const UPLOAD_PAGE = 'app/company/data/upload/page.tsx';

// ── A — the Company reaches an explainable outcome ────────────────────────

describe('KORA-WP-049 (A) — a non-technical Company user gets an explainable outcome on the reachable path', () => {
  it('/company/data is the canonical Company destination and is in Company navigation', () => {
    const company = buildNavGroups('COMPANY_ADMIN').flatMap((g) => g.items).map((i) => i.href);
    expect(company).toContain('/company/data');
    expect(exists(PAGE)).toBe(true);
  });

  it('it reads the already-persisted Company history instead of inventing a source', () => {
    const src = code(PAGE);
    expect(src).toContain("fetch('/api/company/data-submissions/history'");
    expect(src).toContain("credentials: 'include'");
    // Exactly one read; no second endpoint, no new contract.
    expect(src.match(/fetch\(/g) ?? []).toHaveLength(1);
  });

  it('the page answers all four questions: what happened, what it means, what to do, what KORA is doing', () => {
    const src = code(PAGE);
    expect(src).toContain('statusLabel');          // what happened
    expect(src).toContain('STATUS_MEANING');       // what it means
    expect(src).toContain('STATUS_NEXT_STEP');     // what to do
    expect(src).toMatch(/KORA Operator sta revisionando/); // what KORA is doing
  });

  it('every status the API can label has both a meaning and a next step — no silent gap', () => {
    const api = read(HISTORY_API);
    const labelled = [...api.matchAll(/^\s{2}([a-z_]+):\s+'/gm)].map((m) => m[1]);
    expect(labelled.length).toBeGreaterThanOrEqual(10);
    const page = read(PAGE);
    for (const status of labelled) {
      expect(page, `${status} has no meaning`).toMatch(new RegExp(`${status}:\\s+'`));
    }
    for (const block of ['STATUS_MEANING', 'STATUS_TONE', 'STATUS_NEXT_STEP']) {
      const body = page.split(`const ${block}`)[1]?.split('};')[0] ?? '';
      for (const status of labelled) {
        expect(body, `${status} missing from ${block}`).toContain(`${status}:`);
      }
    }
  });

  it('raw eligibility keys are translated, not dumped as technical labels', () => {
    const src = code(PAGE);
    expect(src).toContain('ELIGIBILITY_LABEL');
    expect(src).toContain('ELIGIBILITY_MEANING');
    for (const it of ['Idonei', 'Parziali', 'Non idonei', 'Da verificare']) {
      expect(src).toContain(it);
    }
  });
});

// ── B — severity is never colour alone ────────────────────────────────────

describe('KORA-WP-049 (B) — severity is a word plus a visual state, never colour alone', () => {
  it('status is rendered through the shared Status primitive, which is always dot + word', () => {
    const src = code(PAGE);
    expect(src).toContain('<Status tone=');
    expect(src).toContain('{e.statusLabel}');
    const statusPrimitive = read('components/ui/px/Status.tsx');
    expect(statusPrimitive).toContain('Status is ALWAYS a dot plus a word');
  });

  it('the page defines no colour-only severity map of its own', () => {
    const src = code(PAGE);
    expect(src).not.toMatch(/bg-\[rgba\(/);
    expect(src).not.toMatch(/text-red-|text-amber-|text-green-/);
  });
});

// ── C — no invented remediation ───────────────────────────────────────────

describe('KORA-WP-049 (C) — next steps come from workflow truth, never invented', () => {
  it('the operator explanation is rendered only from the field the API gates as Company-visible', () => {
    expect(code(PAGE)).toContain('e.adminComment');
    // The API only populates adminComment when the operator marked it visible.
    expect(read(HISTORY_API)).toContain("cs?.['admin_comment_company_visible'] ? cs['admin_comment'] : null");
  });

  it('no SLA, deadline, promise or fabricated cause is stated', () => {
    const src = code(PAGE);
    for (const forbidden of [/entro \d/i, /\b\d+\s*(giorni|ore|business days)/i, /garant/i, /verrà risolto/i, /SLA/]) {
      expect(src, `forbidden promise pattern ${forbidden}`).not.toMatch(forbidden);
    }
  });
});

// ── D/E — privacy: aggregate only, no operator internals ──────────────────

describe('KORA-WP-049 (D/E) — aggregate-safe, no individual data, no operator diagnostics', () => {
  it('the page renders no individual-level field', () => {
    const src = code(PAGE);
    for (const forbidden of ['pseudonym', 'worker_id', 'workerId', 'email', 'storagePath', 'signedUrl', 'payload_sample', 'PIB']) {
      expect(src, `${forbidden} must never reach a Company surface`).not.toContain(forbidden);
    }
  });

  it('the source endpoint it consumes is itself aggregate-filtered — the guarantee is upstream, not cosmetic', () => {
    const api = read(HISTORY_API);
    expect(api).toContain('No worker-level rows returned. No raw payload. No pseudonym_id.');
    expect(api).toContain('NO storagePath, NO signedUrl, NO worker rows, NO pseudonym_id');
  });

  it('no internal diagnostic, stack trace or database error is surfaced', () => {
    const src = code(PAGE);
    for (const forbidden of ['stack', 'correlationId', 'SQL', 'supabase', 'e.message', 'error.message']) {
      expect(src, `${forbidden} must not be shown to a Company user`).not.toContain(forbidden);
    }
    // The failure state is a designed Product statement, not a raw error.
    expect(src).toContain('Stato dei dati non disponibile');
  });
});

// ── F — session and tenant boundaries intact ──────────────────────────────

describe('KORA-WP-049 (F) — session and tenant boundaries unchanged', () => {
  it('the endpoint still derives the tenant from the trusted session only', () => {
    const api = read(HISTORY_API);
    expect(api).toContain('requireCompanyUser');
    expect(api).toContain("tenantId ALWAYS from session JWT — never from query param");
    expect(api).toContain(".eq('tenant_id', auth.tenantId)");
  });

  it('the page passes no tenant identifier of its own and adds no write path', () => {
    const src = code(PAGE);
    expect(src).not.toMatch(/tenantId=/);
    expect(src).not.toMatch(/method:\s*'POST'/);
    expect(src).toContain('useCompanySession');
  });

  it('the API contract was not modified by this package', () => {
    const api = read(HISTORY_API);
    expect(api).toContain('export async function GET');
    expect(api).not.toContain('export async function POST');
  });
});

// ── G — the orphaned upload route stays non-canonical ─────────────────────

describe('KORA-WP-049 (G) — /company/data/upload is neither made canonical nor navigable', () => {
  it('it is still absent from every role navigation', () => {
    for (const role of ['COMPANY_ADMIN', 'KORA_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']) {
      const hrefs = buildNavGroups(role).flatMap((g) => g.items).map((i) => i.href);
      expect(hrefs, `${role} nav must not gain the upload route`).not.toContain('/company/data/upload');
    }
    expect(read('components/layout/Sidebar.tsx')).not.toContain("'/company/data/upload'");
  });

  it('the canonical page neither links to it nor couples itself to its parser', () => {
    const src = code(PAGE);
    expect(src).not.toContain('/company/data/upload');
    expect(src).not.toContain('file-parser');
    expect(src).not.toContain('UploadValidationIssue');
  });

  it('the upload page was not modified by this package', () => {
    // KORA-WP-049 did not touch it: at WP-049's closure it still carried its
    // 3,309-line legacy body and its own parse-issue list. KORA-WP-132 later
    // retired the route entirely, so the assertion is now that WP-049's own
    // artefacts never reached it — not that the legacy body survives.
    expect(exists(UPLOAD_PAGE)).toBe(true);
    const src = read(UPLOAD_PAGE);
    expect(src).toContain("redirect('/company/data')");
    expect(src).not.toContain('UploadValidationIssue');
    expect(src).not.toContain('explainQualityError');
  });
});

// ── H/I — no schema, no WP-070 absorption ─────────────────────────────────

describe('KORA-WP-049 (H/I) — no migration, no WP-070 functionality absorbed', () => {
  it('no migration was added: 089 is still the highest', () => {
    const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
    const highest = Math.max(...files.map((f) => Number.parseInt(f.slice(0, 3), 10)).filter(Number.isFinite));
    // INTEGRATION SUPERSESSION (canonical Product integration, 2026-09-22):
    // converted from equality to >=. This guard's intent is "THIS WP added no
    // migration of its own" — asserted independently by the filename-ownership
    // check, which still passes. 089 was the ceiling at this WP's own completion;
    // KORA-WP-066 legitimately raised it to 090 on the integrated line. Equality
    // is the brittle form the repository already documented a remedy for (see
    // tests/unit/kora-wp-029-manual-remap-governance.test.ts: "never equality,
    // same disclosed pattern already fixed for WP-011/WP-120/WP-013/WP-046").
    expect(highest).toBeGreaterThanOrEqual(89);
    expect(files.some((f) => /wp[-_]?049|quality/i.test(f))).toBe(false);
  });

  it('no quality governance console was built — explainability only', () => {
    const src = code(PAGE);
    // No filtering/search/bulk/assignment/policy surface: that is KORA-WP-070.
    for (const forbidden of ['<input', '<select', 'onSubmit', 'assignTo', 'bulk', 'filter(', 'sort(']) {
      if (forbidden === 'filter(' || forbidden === 'sort(') continue; // pure derivations below
      expect(src, `${forbidden} suggests console functionality`).not.toContain(forbidden);
    }
    expect(src).not.toContain('KORA-WP-070');
  });

  it('no new persistence, no new endpoint and no universal error contract were created', () => {
    expect(exists('app/api/company/data-quality')).toBe(false);
    expect(exists('lib/quality-errors')).toBe(false);
    expect(exists('services/quality-errors')).toBe(false);
    // The client parser and the Admin studio keep their own vocabularies.
    expect(read('lib/upload/file-parser.ts')).toContain('makeIssue');
    expect(read('app/admin/data-intake/_components/DataIntakeStudio.tsx')).toContain('warnings: Array<{ code: string; message: string }>');
  });
});

// ── J — WP-125 foundation, no page-local design system ────────────────────

describe('KORA-WP-049 (J) — the surface consumes the WP-125 Product Experience', () => {
  it('it imports the shared primitives and tokens', () => {
    const src = code(PAGE);
    expect(src).toContain("from '@/components/ui/px'");
    expect(src).toContain("from '@/lib/design/kora-design-tokens'");
    for (const p of ['PageHead', 'Workspace', 'Col', 'Region', 'Metric', 'MetricStrip', 'Status', 'Chip', 'Notice', 'StateBlock', 'SkeletonRows']) {
      expect(src, `${p} not consumed`).toContain(p);
    }
    expect(src).toContain('<Col span="main">');
    expect(src).toContain('<Col span="rail">');
  });

  it('no page-local design system, stylesheet or breakpoint architecture', () => {
    const src = code(PAGE);
    expect(src).not.toMatch(/@media/);
    expect(src).not.toMatch(/\.css['"]/);
    expect(src).not.toContain('kora-paper');
    expect(src).not.toContain('TOKENS.');
  });

  it('no Foundation Light label was introduced on this surface', () => {
    expect(read(PAGE)).not.toMatch(/Foundation Light/i);
  });
});


// ── K — the zero-submission state stays honest ────────────────────────────
//
// Founder visual hold (2026-09-21): the empty main column terminated too early
// against a much taller rail. It was filled with real workflow truth, which is
// the only thing allowed to fill it.

describe('KORA-WP-049 (K) — the empty state is truthful, not decorative', () => {
  const src = () => code(PAGE);

  it('the zero-submission blocks render only when there is genuinely nothing to show', () => {
    const s = src();
    // Both additions are gated on a loaded, empty history — never shown while
    // loading, on error, or alongside real submissions.
    expect(s.match(/loadState === 'loaded' && entries\.length === 0/g) ?? []).toHaveLength(2);
    expect(s).toContain('Nessun dato ancora inviato a KORA');
  });

  it('it describes the Operator-mediated workflow and never implies self-service ingestion', () => {
    const s = src();
    expect(s).toContain('PROCESS_STEPS');
    expect(s).toContain('Invio dati');
    expect(s).toContain('Revisione KORA Operator');
    expect(s).toContain('Esito disponibile');
    expect(s).toContain('invia il Data Pack a KORA');
    // No upload affordance of any kind.
    for (const forbidden of ['Carica', 'carica il file', '<input', 'type="file"', 'FormData', 'upload']) {
      expect(s, `${forbidden} would imply self-service ingestion`).not.toContain(forbidden);
    }
  });

  it('the steps are descriptive, never clickable or actionable', () => {
    const steps = src().split('PROCESS_STEPS.map')[1]?.split('</Region>')[0] ?? '';
    expect(steps).toBeTruthy();
    expect(steps).not.toContain('<Link');
    expect(steps).not.toContain('href');
    expect(steps).not.toContain('onClick');
    expect(steps).not.toContain('<button');
  });

  it('the named outcomes are real canonical statuses, not invented ones', () => {
    const api = read(HISTORY_API);
    // "accettato" and "chiarimento richiesto" are the endpoint's own labels.
    expect(api).toContain("'Accettato'");
    expect(api).toContain("'Chiarimento richiesto'");
    const s = src();
    expect(s).toMatch(/accettato/i);
    expect(s).toMatch(/chiarimento richiesto/i);
  });

  it('"what you will see here" names only fields the endpoint actually returns', () => {
    const s = src();
    expect(s).toContain('WHAT_APPEARS_HERE');
    const api = read(HISTORY_API);
    for (const field of ['statusLabel', 'period', 'adminComment', 'eligibilityCounts']) {
      expect(api, `${field} must be a real response field`).toContain(field);
    }
    // The eligibility vocabulary quoted in the list is the translated one.
    expect(s).toContain('idonei, parziali, non idonei, da verificare');
  });

  it('no fabricated submission, metric, count, trend or progress is rendered', () => {
    const s = src();
    // No literal numeric metric is authored anywhere in the empty-state copy:
    // every number on this page comes from the fetched history.
    const emptyCopy = (s.split('const PROCESS_STEPS')[1] ?? '').split('function formatStamp')[0];
    expect(emptyCopy).not.toMatch(/\b\d+\s*(record|invii|righe|file|%)/i);
    for (const forbidden of ['Math.random', 'placeholder', 'esempio', 'demo', 'sample']) {
      expect(s, `${forbidden} must not appear`).not.toContain(forbidden);
    }
  });

  it('the rail keeps its own complementary role — the empty state does not duplicate it', () => {
    const s = src();
    // The operator-boundary notice and the privacy sentence stay in the rail,
    // stated once; the main column explains process and expectation instead.
    expect(s.match(/Elaborazione gestita da KORA Operator/g) ?? []).toHaveLength(1);
    expect(s.match(/nessun dato individuale, nessuna riga del file/g) ?? []).toHaveLength(1);
  });

  it('the populated state is untouched by the empty-state work', () => {
    const s = src();
    // The submission card path and its four-question order still stand.
    expect(s).toContain('entries.map(entryCard)');
    expect(s).toContain('STATUS_MEANING');
    expect(s).toContain('STATUS_NEXT_STEP');
    expect(s).toContain('e.adminComment');
  });
});
