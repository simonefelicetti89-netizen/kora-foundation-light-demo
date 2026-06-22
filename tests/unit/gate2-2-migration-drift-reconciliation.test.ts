/**
 * Gate 2.2 — Migration Drift Reconciliation Audit assertions.
 *
 * Verifies that docs/GATE2_2_PRIVACY_HARDENING_027_STAGING.md §12 correctly
 * documents the migration drift audit: history vs actual DB state, drift
 * classification, reconciliation options, recommended strategy, implications,
 * and hygiene constraints.
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 * This test verifies documentation completeness — not live DB state.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DOC_PATH = 'docs/GATE2_2_PRIVACY_HARDENING_027_STAGING.md';

function doc(): string {
  return readFileSync(resolve(process.cwd(), DOC_PATH), 'utf-8');
}

// ── 1. Drift reconciliation section present ───────────────────────────────────

describe('gate2-2-drift-reconciliation — section present', () => {
  it('doc contains Migration History / Drift Reconciliation section', () => {
    expect(doc()).toMatch(/Migration History.*Drift Reconciliation|Drift Reconciliation/i);
  });

  it('doc references direct SQL apply via supabase db query', () => {
    expect(doc()).toMatch(/supabase db query.*--linked.*--file|db query.*--file/i);
  });

  it('doc explains db query does not write to migration tracking table', () => {
    expect(doc()).toMatch(/not.*write.*tracking|tracking table.*absent|does not write/i);
  });
});

// ── 2. Migration 027 history state ───────────────────────────────────────────

describe('gate2-2-drift-reconciliation — 027 history', () => {
  it('doc records 027 as ABSENT from migration history table', () => {
    expect(doc()).toMatch(/027.*ABSENT|ABSENT.*027|027.*not recorded/i);
  });

  it('doc confirms 027 SQL effects ARE present in DB', () => {
    expect(doc()).toMatch(/027.*SQL effects.*PRESENT|SQL effects.*present|0.*kora_admin.*polic/i);
  });

  it('doc records drift status for migration 027', () => {
    expect(doc()).toMatch(/DRIFT.*027|027.*DRIFT|status.*DRIFT/i);
  });
});

// ── 3. Migration 029 state ────────────────────────────────────────────────────

describe('gate2-2-drift-reconciliation — 029 state', () => {
  it('doc records 029 as NOT recorded in migration history', () => {
    expect(doc()).toMatch(/029.*ABSENT|029.*not recorded|029.*NOT applied/i);
  });

  it('doc confirms 029 SQL effects are absent (no rollback happened)', () => {
    expect(doc()).toMatch(/029.*effects.*absent|029.*not.*applied|rollback.*not.*applied/i);
  });

  it('doc marks 029 as Aligned — not applied', () => {
    expect(doc()).toMatch(/029.*[Aa]ligned|[Aa]ligned.*not applied/);
  });
});

// ── 4. Actual DB state checks ─────────────────────────────────────────────────

describe('gate2-2-drift-reconciliation — actual DB state', () => {
  it('doc records all 6 dropped policies as Applied in DB state', () => {
    // at minimum 3 distinct policy names must appear
    expect(doc()).toMatch(/worker_identity_kora_admin_all/);
    expect(doc()).toMatch(/worker_pib_kora_admin_all/);
    expect(doc()).toMatch(/worker_pseudonym_map_kora_admin_all/);
  });

  it('doc records kora_admin_impact_unit_read as absent', () => {
    expect(doc()).toMatch(/kora_admin_impact_unit_read/);
  });

  it('doc confirms C-11 PASS in matrix', () => {
    expect(doc()).toMatch(/C-11.*Pass|C-11.*PASS/);
  });

  it('doc confirms C-12 PASS in matrix', () => {
    expect(doc()).toMatch(/C-12.*Pass|C-12.*PASS/);
  });

  it('doc confirms W-04 PASS in matrix', () => {
    expect(doc()).toMatch(/W-04.*Pass|W-04.*PASS/);
  });

  it('doc notes kora_admin_all_uef is PRESENT and Expected', () => {
    expect(doc()).toMatch(/kora_admin_all_uef.*PRESENT|kora_admin_all_uef.*Expected|kora_admin_all_uef.*expected/i);
  });

  it('doc records service-role provisioning as Pass', () => {
    expect(doc()).toMatch(/[Ss]ervice-role.*Pass|service-role.*PASS/);
  });
});

// ── 5. Drift classification ───────────────────────────────────────────────────

describe('gate2-2-drift-reconciliation — classification', () => {
  it('doc classifies drift as BENIGN MANUAL-APPLY DRIFT', () => {
    expect(doc()).toMatch(/BENIGN MANUAL-APPLY DRIFT/i);
  });

  it('doc explains drift is benign because SQL effects are correct', () => {
    expect(doc()).toMatch(/SQL effects.*027.*fully present|6 policies.*correctly removed|drift.*benign/i);
  });

  it('doc explains that DROP IF EXISTS makes 027 idempotent', () => {
    expect(doc()).toMatch(/idempotent|DROP.*IF EXISTS/i);
  });
});

// ── 6. Implications ───────────────────────────────────────────────────────────

describe('gate2-2-drift-reconciliation — implications', () => {
  it('doc explains future migration up risk (029 would be applied)', () => {
    expect(doc()).toMatch(/migration up.*029|migration up.*undoing|029.*undoing.*027/i);
  });

  it('doc explains production migration planning is unaffected', () => {
    expect(doc()).toMatch(/[Pp]roduction.*unaffected|[Pp]roduction.*migration.*sequence|[Pp]roduction.*provisioned/i);
  });

  it('doc states 029 must not be applied', () => {
    expect(doc()).toMatch(/029.*MUST NOT|MUST NOT.*029|do not.*apply.*029/i);
  });

  it('doc links Gate 2.3 to reconciliation requirement', () => {
    expect(doc()).toMatch(/Gate 2\.3.*reconcil|reconcil.*Gate 2\.3/i);
  });

  it('doc identifies auditability gap', () => {
    expect(doc()).toMatch(/auditabilit|audit.*gap|audit.*trail/i);
  });
});

// ── 7. Reconciliation recommendation ─────────────────────────────────────────

describe('gate2-2-drift-reconciliation — recommendation', () => {
  it('doc recommends Option B (migration repair)', () => {
    expect(doc()).toMatch(/Option B|migration repair|Recommended.*Option B/i);
  });

  it('doc includes the exact repair command', () => {
    expect(doc()).toMatch(/supabase migration repair.*--status applied.*027.*--linked/i);
  });

  it('doc explains repair command only modifies tracking table (no SQL run)', () => {
    expect(doc()).toMatch(/NOT re-run|does not.*SQL|only.*tracking|not.*re-run/i);
  });

  it('doc confirms repair command is safe and non-destructive', () => {
    expect(doc()).toMatch(/[Ss]afe.*non-destructive|non-destructive.*safe|only.*modif.*tracking/i);
  });

  it('doc notes repair is reversible', () => {
    expect(doc()).toMatch(/[Rr]eversible|--status reverted/);
  });

  it('doc notes 029 remains pending after repair and governance requirement', () => {
    expect(doc()).toMatch(/029.*pending.*repair|029.*remains.*pending|ROLLBACK ONLY.*manual/i);
  });
});

// ── 8. Repair executed and post-repair state ──────────────────────────────────

describe('gate2-2-drift-reconciliation — repair executed', () => {
  it('doc records repair command was executed', () => {
    expect(doc()).toMatch(/[Rr]epair.*executed|Option B.*executed|executed.*repair/i);
  });

  it('doc records repair result: [027] => applied', () => {
    expect(doc()).toMatch(/\[027\].*applied|Repaired migration history.*027/i);
  });

  it('doc confirms post-repair 027 Local = Remote (ALIGNED)', () => {
    expect(doc()).toMatch(/027.*ALIGNED|ALIGNED.*027|Local.*Remote.*aligned/i);
  });

  it('doc confirms 029 remains Local only (pending by design)', () => {
    expect(doc()).toMatch(/029.*[Pp]ending|029.*Local only|029.*safety net/i);
  });

  it('doc confirms no SQL was re-executed during repair', () => {
    expect(doc()).toMatch(/no SQL re-executed|repair only updates tracking|not.*re-run/i);
  });

  it('doc confirms no rollback applied', () => {
    expect(doc()).toMatch(/no rollback applied|rollback.*not.*applied/i);
  });

  it('doc confirms no supabase db push', () => {
    expect(doc()).toMatch(/supabase db push/i);
  });

  it('doc confirms production not touched', () => {
    expect(doc()).toMatch(/[Pp]roduction.*not touched|NOT touched.*[Pp]roduction/i);
  });

  it('doc confirms no secrets printed', () => {
    expect(doc()).toMatch(/no secrets|no.*secret.*printed/i);
  });
});

// ── 9. Gate 2.3 implication ───────────────────────────────────────────────────

describe('gate2-2-drift-reconciliation — gate 2.3', () => {
  it('doc states reconcile 027 history before Gate 2.3', () => {
    expect(doc()).toMatch(/reconcil.*027.*Gate 2\.3|Gate 2\.3.*reconcil/i);
  });

  it('doc notes Gate 2.3 scope is kora_admin_all_uef / SECURITY DEFINER views', () => {
    expect(doc()).toMatch(/kora_admin_all_uef.*Gate 2\.3|Gate 2\.3.*kora_admin_all_uef|SECURITY DEFINER.*views/i);
  });
});

// ── 10. Secrets hygiene ───────────────────────────────────────────────────────

describe('gate2-2-drift-reconciliation — secrets hygiene', () => {
  it('doc contains no JWT/access token literals', () => {
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('doc contains no service role key patterns', () => {
    expect(doc()).not.toMatch(/service_role[^:]*:[^:]*[A-Za-z0-9]{40,}/i);
  });

  it('doc contains no connection string literals', () => {
    expect(doc()).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('doc contains no password-like assignments', () => {
    expect(doc()).not.toMatch(/password\s*=\s*[^\s]{8,}/i);
  });
});
