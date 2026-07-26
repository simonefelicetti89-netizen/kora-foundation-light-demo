/**
 * Activation Signal Pipeline 01 — Phase 2 aggregate signal preview guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: the
 * pipeline page previews how completed/fulfilled Partner Activity
 * engagements (catalog + bookings) may in the future become aggregate,
 * privacy-safe activation signals feeding the KORA Index. It implements no
 * real persistence, no real aggregation computation, no KORA Index score,
 * and resolves no DPO/CTO/fiscal/legal decision. Live KORA Index
 * computation and ingestion/UEF computation are unchanged. See
 * docs/ACTIVATION_SIGNAL_PIPELINE_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getActivationSignalPreviews,
  getActivationSignalSummary,
  groupActivationSignalsByPillar,
  groupActivationSignalsByFiscalCategory,
  groupActivationSignalsByIndexComponentPreview,
} from '@/lib/partner-activities/activation-signals';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const ADMIN_PAGE = 'app/admin/activation-signal-pipeline/page.tsx';
const COMPANY_PAGE = 'app/company/activity-signals/page.tsx';
const MODEL_FILE = 'lib/partner-activities/activation-signals.ts';

// ── 1-2: routes exist ───────────────────────────────────────────────────────

describe('Activation Signal Pipeline 01 — routes and model file exist', () => {
  it(`${ADMIN_PAGE} exists`, () => {
    expect(() => readSource(ADMIN_PAGE)).not.toThrow();
  });

  it(`${COMPANY_PAGE} exists (optional company preview was added)`, () => {
    expect(() => readSource(COMPANY_PAGE)).not.toThrow();
  });

  it(`${MODEL_FILE} exists`, () => {
    expect(() => readSource(MODEL_FILE)).not.toThrow();
  });
});

// ── 3: frames itself as Phase 2 ─────────────────────────────────────────────

describe('Activation Signal Pipeline 01 — frames itself as Phase 2 Activation Intelligence', () => {
  it(`${ADMIN_PAGE} frames the page as Phase 2`, () => {
    const source = readSource(ADMIN_PAGE);
    expect(source).toMatch(/Fase 2 Activation Intelligence/);
  });

  it(`${COMPANY_PAGE} frames the page as Phase 2`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toMatch(/Fase 2 Activation Intelligence/);
  });
});

// ── 4: full pipeline shown ───────────────────────────────────────────────────

describe('Activation Signal Pipeline 01 — shows the full Phase 2 pipeline', () => {
  const source = readSource(ADMIN_PAGE);

  it('names Partner Activity Catalog', () => {
    expect(source).toMatch(/Catalogo Attività Partner/);
  });
  it('names Company Activity Selection', () => {
    expect(source).toMatch(/Selezione Attività Azienda/);
  });
  it('names Worker Discovery / Choice', () => {
    expect(source).toMatch(/Discovery \/ scelta worker/);
  });
  it('names Partner Bookings', () => {
    expect(source).toMatch(/Prenotazioni \/ richieste Partner/);
  });
  it('names Aggregate Activation Signals', () => {
    expect(source).toMatch(/Segnali di Attivazione Aggregati/);
  });
  it('names future KORA Index feed', () => {
    expect(source).toMatch(/Futuro segnale KORA Index/);
  });
});

// ── 5-6: static model exists and reuses catalog/bookings ────────────────────

describe('Activation Signal Pipeline 01 — static ActivationSignalPreview model', () => {
  const model = readSource(MODEL_FILE);

  it('exports the ActivationSignalPreview interface', () => {
    expect(model).toMatch(/export interface ActivationSignalPreview/);
  });

  it('imports from ./catalog and ./bookings — no data duplication', () => {
    expect(model).toMatch(/from '\.\/catalog'/);
    expect(model).toMatch(/from '\.\/bookings'/);
    expect(model).toMatch(/getPartnerActivityBookings/);
    expect(model).toMatch(/getPartnerActivityCatalogSummary/);
  });

  it('returns a non-empty array of previews, each previewOnly: true', () => {
    const signals = getActivationSignalPreviews();
    expect(signals.length).toBeGreaterThan(0);
    for (const s of signals) {
      expect(s.previewOnly).toBe(true);
    }
  });
});

// ── 7: signal types ──────────────────────────────────────────────────────────

describe('Activation Signal Pipeline 01 — includes all seven signal types', () => {
  it('uptake, completion, continuity, access, value_band, worker_choice, partner_delivery', () => {
    const model = readSource(MODEL_FILE);
    expect(model).toMatch(
      /'uptake'\s*\|\s*'completion'\s*\|\s*'continuity'\s*\|\s*'access'\s*\|\s*'value_band'\s*\|\s*'worker_choice'\s*\|\s*'partner_delivery'/,
    );
  });

  it('all seven signal types are represented in the mock data', () => {
    const types = new Set(getActivationSignalPreviews().map((s) => s.signalType));
    expect(types.size).toBe(7);
  });
});

// ── 8: aggregation levels ────────────────────────────────────────────────────

describe('Activation Signal Pipeline 01 — includes all five aggregation levels', () => {
  it('company, pillar, fiscal_category, partner, activity_type', () => {
    const model = readSource(MODEL_FILE);
    expect(model).toMatch(
      /'company'\s*\|\s*'pillar'\s*\|\s*'fiscal_category'\s*\|\s*'partner'\s*\|\s*'activity_type'/,
    );
  });

  it('all five aggregation levels are represented in the mock data', () => {
    const levels = new Set(getActivationSignalPreviews().map((s) => s.aggregationLevel));
    expect(levels.size).toBe(5);
  });
});

// ── 9: KORA Index component preview ─────────────────────────────────────────

describe('Activation Signal Pipeline 01 — includes the KORA Index component preview set', () => {
  it('reach, quality, equity, activation, continuity, pillar_balance', () => {
    const model = readSource(MODEL_FILE);
    for (const component of ['reach', 'quality', 'equity', 'activation', 'continuity', 'pillar_balance']) {
      expect(model).toContain(`'${component}'`);
    }
  });

  it('every required component is represented in the mock data', () => {
    const components = new Set<string>(getActivationSignalPreviews().map((s) => s.indexComponentPreview));
    for (const component of ['reach', 'quality', 'equity', 'activation', 'continuity', 'pillar_balance']) {
      expect(components.has(component)).toBe(true);
    }
  });
});

// ── 10-13: KORA Index / future-preview-only statements ──────────────────────

describe('Activation Signal Pipeline 01 — states live KORA Index computation is unchanged', () => {
  const source = readSource(ADMIN_PAGE);

  it('states the live KORA Index calculation is not modified', () => {
    expect(source).toMatch(/Il calcolo live del KORA Index non è modificato/);
  });

  it('states no KORA Index score is recomputed here', () => {
    expect(source).toMatch(/Nessun punteggio KORA Index viene ricalcolato qui/);
  });

  it('states this previews future input only', () => {
    expect(source).toMatch(/anteprima di possibili futuri input di segnale per il KORA Index/);
  });

  it('names KORA-INDEX-ACTIVATION-INTEGRATION-01 as a future separate CTO-reviewed sprint', () => {
    expect(source).toMatch(/KORA-INDEX-ACTIVATION-INTEGRATION-01/);
    expect(source).toMatch(/solo dopo revisione CTO/);
  });
});

describe('Activation Signal Pipeline 01 — does not compute a KORA Index score', () => {
  it(`${MODEL_FILE} does not import the KORA Index engine`, () => {
    const model = readSource(MODEL_FILE);
    expect(model).not.toMatch(/from ['"]@\/lib\/kora-engine/);
  });

  it(`${ADMIN_PAGE} does not import the KORA Index engine`, () => {
    const source = readSource(ADMIN_PAGE);
    expect(source).not.toMatch(/from ['"]@\/lib\/kora-engine/);
  });
});

// ── 13-14: privacy threshold statements ──────────────────────────────────────

describe('Activation Signal Pipeline 01 — states privacy thresholds are not finalized', () => {
  const source = readSource(ADMIN_PAGE);

  it('states thresholds are not decided in this sprint', () => {
    expect(source).toMatch(/Le soglie di privacy non sono decise in questo sprint/);
  });

  it('states low-count groups may require suppression', () => {
    expect(source).toMatch(/I gruppi con conteggio basso potrebbero richiedere soppressione/);
  });

  it('states no final DPO/legal rule is resolved', () => {
    expect(source).toMatch(/Nessuna regola finale DPO\/legale è risolta qui/);
  });
});

// ── 15-16: company aggregate-only / partner worker-initiated boundary ──────

describe('Activation Signal Pipeline 01 — states company output remains aggregate-only', () => {
  it(`${ADMIN_PAGE} states aggregate-only company output`, () => {
    const source = readSource(ADMIN_PAGE);
    expect(source).toMatch(/Output futuro per l&apos;azienda \(solo aggregato\)/);
  });

  it(`${COMPANY_PAGE} states the company remains aggregate-only`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toMatch(/L&apos;azienda resta sempre aggregate-only/);
  });
});

describe('Activation Signal Pipeline 01 — states partner named visibility remains worker-initiated only', () => {
  it(`${MODEL_FILE} sets workerVisibilityBasis to worker_initiated_source_events on every signal`, () => {
    const signals = getActivationSignalPreviews();
    for (const s of signals) {
      expect(s.workerVisibilityBasis).toBe('worker_initiated_source_events');
    }
  });
});

// ── 17: no worker-level data in company/admin aggregate views ───────────────

describe('Activation Signal Pipeline 01 — no worker-level data anywhere on the aggregate pages', () => {
  const forbiddenPatterns = [
    /\bworkerId\s*[:=]/,
    /\.workerId\b/,
    /\bworker_id\s*[:=]/,
    /\.worker_id\b/,
    /\bworkerName\s*[:=]/,
    /\.workerName\b/,
    /\btagUid\s*[:=]/,
    /\btag_uid\s*[:=]/,
    /[\w.+-]+@[\w-]+\.[a-z]{2,}/i, // email-shaped strings
  ];

  for (const page of [ADMIN_PAGE, COMPANY_PAGE]) {
    it(`${page} contains no worker name, email, worker ID, or tag UID`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${page} must not match ${pattern}`).toBe(false);
      }
    });
  }

  it(`${MODEL_FILE} exposes only aggregate-shaped fields — no individual worker record`, () => {
    const model = readSource(MODEL_FILE);
    expect(model).not.toMatch(/workerDisplayName/);
    expect(model).not.toMatch(/workerSharedFields/);
  });
});

// ── 18-19: Contribution boundary ─────────────────────────────────────────────

describe('Activation Signal Pipeline 01 — states the Contribution boundary', () => {
  const source = readSource(ADMIN_PAGE);

  it('states Partner Activity signals never directly feed KORA Contribution', () => {
    expect(source).toMatch(/I segnali di Attività Partner non alimentano mai direttamente KORA Contribution/);
  });

  it('states Partner Activities and KORA Space Initiatives remain distinct', () => {
    expect(source).toMatch(/KORA Space \/ Iniziative Contribution restano separate/);
  });

  it(`${MODEL_FILE} sets contributionBoundary to not_contribution_source on every signal`, () => {
    const signals = getActivationSignalPreviews();
    for (const s of signals) {
      expect(s.contributionBoundary).toBe('not_contribution_source');
    }
  });
});

// ── 20: no Supabase/DB/RPC/env import ────────────────────────────────────────

describe('Activation Signal Pipeline 01 — no Supabase, DB helper, RPC, or env secret access', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  for (const file of [MODEL_FILE, ADMIN_PAGE, COMPANY_PAGE]) {
    it(`${file} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
      const source = readSource(file);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${file} must not match ${pattern}`).toBe(false);
      }
    });
  }
});

// ── 21: no fetch/server action/mutation/onClick ─────────────────────────────

describe('Activation Signal Pipeline 01 — no fetch, server action, mutation, or onClick handler', () => {
  for (const page of [ADMIN_PAGE, COMPANY_PAGE]) {
    it(`${page} has no onClick, fetch, or 'use server' directive`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/onClick=/);
      expect(source).not.toMatch(/fetch\(/);
      expect(source).not.toMatch(/'use server'/);
    });
  }

  it(`${MODEL_FILE} has no exported mutation function`, () => {
    const source = readSource(MODEL_FILE);
    expect(source).not.toMatch(/export function (update|set|save|create|delete|mutate)\w*/i);
  });
});

// ── 22: no feature flag hardcoded ────────────────────────────────────────────

describe('Activation Signal Pipeline 01 — no feature flag hardcoded', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  for (const page of [ADMIN_PAGE, COMPANY_PAGE]) {
    it(`${page} does not hardcode any KORA Link feature flag to true`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});

// ── 23-26: supabase/proposed 034/035/036 untouched, invariants intact ────────

describe('Activation Signal Pipeline 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
  it('034/035/036 are still readable under supabase/proposed/', () => {
    for (const file of [
      'supabase/migrations/034_kora_link_schema.sql',
      'supabase/migrations/035_kora_link_rls.sql',
      'supabase/migrations/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
  });

  it('worker self-select on link_assignments remains commented out (inactive)', () => {
    const rls = readSource('supabase/migrations/035_kora_link_rls.sql');
    expect(rls).toMatch(/Worker SELECT self-only — BLOCKED until activation function is ready/);
    expect(rls).toMatch(/-- CREATE POLICY "kl_assignments_worker_self_select"/);
  });

  it('no direct company-facing table SELECT policy exists or is planned', () => {
    const rls = readSource('supabase/migrations/035_kora_link_rls.sql');
    expect(rls).toMatch(/No\s*\n?-- direct company table SELECT policy exists here or is planned/);
  });
});

// ── 27: no DPO/CTO/fiscal/legal decision marked resolved ────────────────────

describe('Activation Signal Pipeline 01 — no DPO/CTO/fiscal/legal decision is marked resolved', () => {
  for (const page of [ADMIN_PAGE, COMPANY_PAGE]) {
    it(`${page} does not claim any pending decision has been made`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
      expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
    });
  }

  it('docs/ACTIVATION_SIGNAL_PIPELINE_01.md does not mark any decision resolved', () => {
    const doc = readSource('docs/ACTIVATION_SIGNAL_PIPELINE_01.md');
    expect(doc).not.toMatch(/[Dd]ecisione presa/);
  });
});

// ── 28-30: navigation and cross-links ────────────────────────────────────────

describe('Activation Signal Pipeline 01 — admin navigation includes the new page', () => {
  it('registers Activation Signal Pipeline under Network & Content', () => {
    const source = readSource('lib/navigation/admin-nav-groups.ts');
    expect(source).toContain("href: '/admin/activation-signal-pipeline'");
    expect(source).toMatch(/label:\s*'Activation Signal Pipeline',/);
  });
});

describe('Activation Signal Pipeline 01 — company navigation includes the optional new page', () => {
  it('registers Segnali Attivazione in the Sidebar company items', () => {
    const source = readSource('components/layout/Sidebar.tsx');
    expect(source).toContain("href: '/company/activity-signals'");
    expect(source).toMatch(/label: 'Segnali Attivazione'/);
  });
});

describe('Activation Signal Pipeline 01 — cross-links are present', () => {
  it(`${ADMIN_PAGE} links to kora-activation-layer, catalog, selection, discovery, bookings, kora-index`, () => {
    const source = readSource(ADMIN_PAGE);
    expect(source).toContain('href="/admin/kora-activation-layer"');
    expect(source).toContain('href="/partner/activity-catalog"');
    expect(source).toContain('href="/company/activity-selection"');
    expect(source).toContain('href="/worker/activity-discovery"');
    expect(source).toContain('href="/partner/activity-bookings"');
    expect(source).toContain('href="/company/kora-index"');
  });

  it('/admin/kora-activation-layer links back to the pipeline page', () => {
    const source = readSource('app/admin/kora-activation-layer/page.tsx');
    expect(source).toContain('href="/admin/activation-signal-pipeline"');
  });

  it('/partner/activity-bookings links to the pipeline page', () => {
    const source = readSource('app/partner/activity-bookings/page.tsx');
    expect(source).toContain('href="/admin/activation-signal-pipeline"');
  });

  it(`${COMPANY_PAGE} links back to the admin model and to KORA Index`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toContain('href="/admin/activation-signal-pipeline"');
    expect(source).toContain('href="/company/kora-index"');
  });
});

// ── 31-33: KORA Index engine, ingestion/UEF, and commons tables untouched ──

describe('Activation Signal Pipeline 01 — KORA Index engine and ingestion remain untouched', () => {
  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });

  it('lib/ingestion/raw-to-uef-interpreter.ts still bears its original header (not rewritten)', () => {
    const interpreter = readSource('lib/ingestion/raw-to-uef-interpreter.ts');
    expect(interpreter).toMatch(/Raw-to-UEF Rule-Based Interpreter v0\.1/);
  });
});

describe('Activation Signal Pipeline 01 — commons.post, commons.booking, commons.contribution_event remain untouched', () => {
  it('migration 013 still creates commons.post unmodified', () => {
    const migration = readSource('supabase/migrations/013_kora_commons.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.post');
  });

  it('migration 025 still creates commons.booking and commons.contribution_event unmodified', () => {
    const migration = readSource('supabase/migrations/025_commons_booking_contribution.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.booking');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.contribution_event');
  });

  it(`${MODEL_FILE} does not import commons types`, () => {
    const model = readSource(MODEL_FILE);
    expect(model).not.toMatch(/from ['"]@\/lib\/commons/);
  });
});

// ── Summary/grouping helper sanity ──────────────────────────────────────────

describe('Activation Signal Pipeline 01 — summary and grouping helpers', () => {
  it('getActivationSignalSummary totals match the preview array length', () => {
    const summary = getActivationSignalSummary();
    const signals = getActivationSignalPreviews();
    expect(summary.totalSignals).toBe(signals.length);
  });

  it('groupActivationSignalsByPillar / ByFiscalCategory / ByIndexComponentPreview partition all signals', () => {
    const signals = getActivationSignalPreviews();
    const byPillar = groupActivationSignalsByPillar();
    const byFiscalCategory = groupActivationSignalsByFiscalCategory();
    const byIndexComponent = groupActivationSignalsByIndexComponentPreview();

    const countGroups = (groups: Record<string, unknown[]>) =>
      Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);

    expect(countGroups(byPillar)).toBe(signals.length);
    expect(countGroups(byFiscalCategory)).toBe(signals.length);
    expect(countGroups(byIndexComponent)).toBe(signals.length);
  });
});
