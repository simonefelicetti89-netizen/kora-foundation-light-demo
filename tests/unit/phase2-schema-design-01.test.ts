/**
 * Phase 2 Schema Design 01 — docs-only data model design artifact guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: this
 * is a docs-only design artifact translating PHASE2-SCHEMA-RO into a
 * concrete document for CTO/DPO reviewers. No SQL, no migration, no DB/RLS
 * implementation, no KORA Index integration, no companion score, no
 * AccessResource/access-matrix code change, no DPO/CTO decision marked
 * resolved. See docs/PHASE2_SCHEMA_DESIGN_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const DESIGN_DOC = 'docs/PHASE2_SCHEMA_DESIGN_01.md';
const ACCESS_MATRIX_CODE = 'lib/auth/access-matrix.ts';
const ACCESS_MATRIX_DOC = 'docs/access-matrix.md';

// ── 1: doc exists ────────────────────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — design doc exists', () => {
  it(`${DESIGN_DOC} exists`, () => {
    expect(() => readSource(DESIGN_DOC)).not.toThrow();
  });
});

// ── 2-6: status and scope ────────────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — states docs-only/design-only status and scope', () => {
  const source = readSource(DESIGN_DOC);

  it('states this is a draft/design-only document', () => {
    expect(source).toMatch(/bozza di design — solo documentazione, nessuna implementazione/);
  });

  it('states no SQL, no migration, no DB implementation', () => {
    expect(source).toMatch(/non contiene SQL/);
    expect(source).toMatch(/non è una migration/);
    expect(source).toMatch(/non è un'implementazione DB/);
  });

  it('states no KORA Index integration', () => {
    expect(source).toMatch(/non integra il Phase 2 con il calcolo live del KORA Index/);
  });

  it('states no companion score', () => {
    expect(source).toMatch(/non crea un punteggio companion/);
  });

  it('states one KORA Index remains the product principle', () => {
    expect(source).toMatch(/Principio di prodotto invariato: ci sarà un solo KORA Index/);
  });
});

// ── 7-11: design principles ──────────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — design principles', () => {
  const source = readSource(DESIGN_DOC);

  it('uses Activity/Attività, never Initiative/Iniziativa, for Phase 2 schema naming', () => {
    expect(source).toMatch(/Il Phase 2 usa sempre "Activity"\/"Attività", mai "Initiative"\/"Iniziativa"/);
  });

  it('states company sees aggregate-only', () => {
    expect(source).toMatch(/L'azienda vede solo aggregati\./);
  });

  it('states worker controls voluntary action and sharing', () => {
    expect(source).toMatch(/Il lavoratore controlla l'azione volontaria e la condivisione\./);
  });

  it('states partner named visibility is worker-initiated only', () => {
    expect(source).toMatch(/Il partner vede dati nominativi del lavoratore solo dopo un'azione\/consenso avviato dal lavoratore\./);
  });

  it('states KORA Space / Contribution Initiatives remain separate', () => {
    expect(source).toMatch(/KORA Space \/ Iniziative Contribution restano separate/);
  });
});

// ── 12: all 16 future entities ───────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — includes all 16 future entities', () => {
  const source = readSource(DESIGN_DOC);
  const entities = [
    'partner_activity',
    'partner_activity_version',
    'company_activity_selection',
    'company_activity_budget_policy',
    'worker_activity_eligibility_view',
    'worker_activity_action',
    'partner_activity_booking',
    'partner_worker_relationship',
    'activation_signal_source_event',
    'activation_signal_aggregate',
    'privacy_threshold_rule',
    'privacy_threshold_decision',
    'kora_index_phase2_adapter',
    'partner_delivery_evidence',
    'worker_consent_event',
    'phase2_audit_event',
  ];

  it('lists all 16 entities', () => {
    for (const entity of entities) {
      expect(source, `missing entity "${entity}"`).toContain(`\`${entity}\``);
    }
  });
});

// ── 13-15: relationship model, role/access matrix, RLS naming plan ──────────

describe('Phase 2 Schema Design 01 — includes a relationship model', () => {
  it('has a relationship model section with an ASCII map', () => {
    const source = readSource(DESIGN_DOC);
    expect(source).toMatch(/## 5\. Modello di relazioni/);
    expect(source).toMatch(/tenant\/company/);
    expect(source).toMatch(/activation_signal_aggregate/);
  });
});

describe('Phase 2 Schema Design 01 — includes a draft role/access matrix', () => {
  const source = readSource(DESIGN_DOC);

  it('has a role/access matrix section covering all 5 roles', () => {
    expect(source).toMatch(/## 6\. Bozza di matrice ruolo\/accesso/);
    for (const role of ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']) {
      expect(source, `missing role "${role}"`).toContain(role);
    }
  });
});

describe('Phase 2 Schema Design 01 — includes an RLS policy naming plan', () => {
  it('has an RLS naming plan section with draft policy names', () => {
    const source = readSource(DESIGN_DOC);
    expect(source).toMatch(/## 7\. Bozza di piano di naming per policy RLS/);
    expect(source).toMatch(/phase2_partner_activity_booking_worker_own_select/);
  });
});

// ── 16-17: RLS status statements ─────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — states no RLS policies exist yet and final policies require CTO/DPO review', () => {
  const source = readSource(DESIGN_DOC);

  it('states no RLS policy exists yet', () => {
    expect(source).toMatch(/Nessuna policy RLS esiste ancora\./);
  });

  it('states final policies require CTO and DPO review', () => {
    expect(source).toMatch(/Le policy finali richiedono revisione CTO e, per ogni oggetto con dato individuale[\s\S]{0,100}revisione DPO/);
  });
});

// ── 18-19: AccessResource gap ─────────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — states the AccessResource design gap', () => {
  const source = readSource(DESIGN_DOC);

  it('states no AccessResource entries currently exist for Phase 2', () => {
    expect(source).toMatch(/non esiste alcuna voce `AccessResource`/);
  });

  it('states docs/access-matrix.md and lib/auth/access-matrix.ts must be extended before implementation', () => {
    expect(source).toMatch(/dovrà estendere sia `docs\/access-matrix\.md`[\s\S]{0,60}sia `lib\/auth\/access-matrix\.ts`/);
    expect(source).toMatch(/\*\*prima\*\* che venga scritta qualunque riga di SQL/);
  });
});

// ── 20-21: privacy threshold gap ─────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — states the privacy threshold design gap', () => {
  const source = readSource(DESIGN_DOC);

  it('states privacyThresholdStatus is not a real decision', () => {
    expect(source).toMatch(/`privacyThresholdStatus`[\s\S]{0,80}\*\*non è una decisione reale\*\*/);
  });

  it('states the DPO must approve whether N≥10 is sufficient for Phase 2', () => {
    expect(source).toMatch(/Il DPO deve approvare esplicitamente se N≥10 è sufficiente/);
  });
});

// ── 22: consent/revocation gap ────────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — states the consent/revocation design gap', () => {
  const source = readSource(DESIGN_DOC);

  it('states worker_consent_event is a prerequisite and revocation must be designed', () => {
    expect(source).toMatch(/`worker_consent_event` è un prerequisito/);
    expect(source).toMatch(/La \*\*revoca\*\* del consenso deve essere progettata esplicitamente/);
  });

  it('states partner_worker_relationship must be gated by consent/action and company must never see it', () => {
    expect(source).toMatch(/`partner_worker_relationship` deve essere \*\*vincolato\*\*/);
    expect(source).toMatch(/L'azienda non deve mai vedere la relazione partner-lavoratore/);
  });
});

// ── 23-24: reuse recommendations ─────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — lists reuse and must-not-reuse recommendations', () => {
  const source = readSource(DESIGN_DOC);

  it('lists reuse recommendations', () => {
    expect(source).toMatch(/\*\*Da riusare:\*\*/);
    expect(source).toContain('network.partner_profile');
    expect(source).toContain('audit.audit_log');
  });

  it('lists must-not-reuse tables', () => {
    expect(source).toMatch(/\*\*Da non riusare direttamente:\*\*/);
    expect(source).toContain('commons.post');
    expect(source).toContain('commons.booking');
    expect(source).toContain('commons.contribution_event');
    expect(source).toContain('personal.worker_pib');
    expect(source).toContain('personal.worker_identity');
    expect(source).toContain('personal.worker_pseudonym_map');
    expect(source).toContain('personal.worker_profile_private');
  });
});

// ── 25: what not to implement yet ────────────────────────────────────────────

describe('Phase 2 Schema Design 01 — lists what not to implement yet', () => {
  it('has a dedicated section listing deferred items', () => {
    const source = readSource(DESIGN_DOC);
    expect(source).toMatch(/## 13\. Cosa non implementare ancora/);
    expect(source).toMatch(/Nessuna integrazione reale con il KORA Index/);
    expect(source).toMatch(/Nessun punteggio companion/);
    expect(source).toMatch(/Nessuna migration\./);
  });
});

// ── 26: recommends exactly one next step ─────────────────────────────────────

describe('Phase 2 Schema Design 01 — recommends exactly one next step', () => {
  it('recommends PHASE2-RLS-DESIGN-RO as the single next step', () => {
    const source = readSource(DESIGN_DOC);
    expect(source).toMatch(/## 15\. Prossimo passo raccomandato/);
    expect(source).toMatch(/\*\*`PHASE2-RLS-DESIGN-RO`\*\*/);
    // Only one of the two allowed options should be recommended as bold-backtick choice.
    expect(source).not.toMatch(/\*\*`PHASE2-PRIVACY-THRESHOLD-DESIGN-01`\*\*/);
  });
});

// ── 27: no SQL code containing forbidden DDL keywords ───────────────────────

describe('Phase 2 Schema Design 01 — contains no SQL DDL', () => {
  it(`${DESIGN_DOC} does not contain CREATE TABLE, CREATE POLICY, ALTER TABLE, GRANT, REVOKE, or ENABLE ROW LEVEL SECURITY`, () => {
    const source = readSource(DESIGN_DOC);
    const forbidden = [
      /CREATE TABLE/i,
      /CREATE POLICY/i,
      /ALTER TABLE/i,
      /\bGRANT\b/i,
      /\bREVOKE\b/i,
      /ENABLE ROW LEVEL SECURITY/i,
    ];
    for (const pattern of forbidden) {
      expect(pattern.test(source), `must not match ${pattern}`).toBe(false);
    }
  });
});

// ── 28-31: no overclaiming, no resolved decisions, no companion/public score, no immediate integration ──

describe('Phase 2 Schema Design 01 — does not overclaim implementation or resolve decisions', () => {
  const source = readSource(DESIGN_DOC);

  it('does not claim implementation is complete', () => {
    expect(source).not.toMatch(/implementazione completat[ao]/i);
    expect(source).not.toMatch(/schema implementato/i);
  });

  it('does not mark any DPO/CTO decision as resolved', () => {
    expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
    expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
  });

  it('does not introduce a separate activation score', () => {
    expect(source).not.toMatch(/creiamo un punteggio di attivazione/i);
    expect(source).toMatch(/Non esiste un punteggio di attivazione pubblico separato/);
  });

  it('does not recommend immediate KORA Index integration', () => {
    expect(source).not.toMatch(/si raccomanda l'integrazione immediata (?:nel|con il) KORA Index/i);
  });
});

// ── 32: docs/access-matrix.md not modified as authoritative truth ──────────

describe('Phase 2 Schema Design 01 — does not modify docs/access-matrix.md as authoritative truth', () => {
  it('docs/access-matrix.md still bears its authoritative header, unchanged', () => {
    const doc = readSource(ACCESS_MATRIX_DOC);
    expect(doc).toMatch(/# KORA Access Matrix — Documento Autoritativo/);
    expect(doc).toMatch(/\*\*Autorità:\*\* Supera qualsiasi check hardcoded nel codice/);
  });

  it(`${DESIGN_DOC} explicitly defers to docs/access-matrix.md as the sole authority`, () => {
    const source = readSource(DESIGN_DOC);
    expect(source).toMatch(/Questa non è ancora la matrice di accesso autoritativa/);
    expect(source).toMatch(/La matrice autoritativa resta `docs\/access-matrix\.md`/);
  });
});

// ── 33-34: 034/035/036 and supabase/migrations untouched ───────────────────

describe('Phase 2 Schema Design 01 — proposed SQL and migrations remain untouched', () => {
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

  it('supabase/migrations/001_live_v1_foundation.sql is unmodified (spot check)', () => {
    const migration = readSource('supabase/migrations/001_live_v1_foundation.sql');
    expect(migration).toMatch(/CREATE SCHEMA IF NOT EXISTS audit/);
  });

  it('supabase/migrations/027_worker_individual_rls_refactor.sql still marked written-not-applied', () => {
    const migration = readSource('supabase/migrations/027_worker_individual_rls_refactor.sql');
    expect(migration).toMatch(/Gate 2 OPEN — SCRITTO, NON APPLICATO/);
  });
});

// ── 35: lib/auth/access-matrix.ts untouched ──────────────────────────────────

describe('Phase 2 Schema Design 01 — lib/auth/access-matrix.ts remains untouched', () => {
  it('still bears its B168 authoritative header', () => {
    const source = readSource(ACCESS_MATRIX_CODE);
    expect(source).toMatch(/B168 — Matrice di accesso autoritativa per KORA/);
  });

  it('AccessResource union still contains exactly the 8 known resources, no Phase 2 additions', () => {
    const source = readSource(ACCESS_MATRIX_CODE);
    const knownResources = [
      'company_kpi_kora_index',
      'company_config_source_batch',
      'company_submissions_approval',
      'aggregates_n_ge_10',
      'worker_individual_pib',
      'worker_individual_uef',
      'personal_pseudonym_map',
      'hq_operator_console',
    ];
    for (const resource of knownResources) {
      expect(source).toContain(`'${resource}'`);
    }
    for (const phase2Resource of ['partner_activity', 'activation_signal', 'company_activity_selection']) {
      expect(source).not.toContain(`'${phase2Resource}'`);
    }
  });
});

// ── 36-37: KORA Index engine and ingestion/UEF untouched ────────────────────

describe('Phase 2 Schema Design 01 — KORA Index engine and ingestion remain untouched', () => {
  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });

  it('lib/ingestion/raw-to-uef-interpreter.ts still bears its original header (not rewritten)', () => {
    const interpreter = readSource('lib/ingestion/raw-to-uef-interpreter.ts');
    expect(interpreter).toMatch(/Raw-to-UEF Rule-Based Interpreter v0\.1/);
  });
});

// ── 38: commons.post/booking/contribution_event untouched ──────────────────

describe('Phase 2 Schema Design 01 — commons.post, commons.booking, commons.contribution_event remain untouched', () => {
  it('migration 013 still creates commons.post unmodified', () => {
    const migration = readSource('supabase/migrations/013_kora_commons.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.post');
  });

  it('migration 025 still creates commons.booking and commons.contribution_event unmodified', () => {
    const migration = readSource('supabase/migrations/025_commons_booking_contribution.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.booking');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.contribution_event');
  });

  it(`${DESIGN_DOC} references commons tables only as "must not reuse", never modifies them`, () => {
    const source = readSource(DESIGN_DOC);
    expect(source).toMatch(/mai fusi con il Phase 2|restano dottrinalmente separate come pipeline Contribution/);
  });
});
