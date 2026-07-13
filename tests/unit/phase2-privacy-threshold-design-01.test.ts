/**
 * Phase 2 Privacy Threshold Design 01 — draft suppression model guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: this
 * is a docs-only, non-DPO-approved draft defining privacy thresholds and
 * suppression rules for future Phase 2 aggregate reporting. No SQL, no RLS,
 * no DB, no aggregation job, no KORA Index integration, no companion score,
 * no DPO/CTO decision marked resolved. See
 * docs/PHASE2_PRIVACY_THRESHOLD_DESIGN_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const DESIGN_DOC = 'docs/PHASE2_PRIVACY_THRESHOLD_DESIGN_01.md';
const ACCESS_MATRIX_CODE = 'lib/auth/access-matrix.ts';
const ACCESS_MATRIX_DOC = 'docs/access-matrix.md';

// ── 1: doc exists ────────────────────────────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — design doc exists', () => {
  it(`${DESIGN_DOC} exists`, () => {
    expect(() => readSource(DESIGN_DOC)).not.toThrow();
  });
});

// ── 2-7: status and scope ────────────────────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — states draft/docs-only status and scope', () => {
  const source = readSource(DESIGN_DOC);

  it('states this is a draft, docs-only document', () => {
    expect(source).toMatch(/Bozza — solo documentazione\./);
  });

  it('states not DPO-approved and not legally approved', () => {
    expect(source).toMatch(/\*\*Non approvato dal DPO\. Non approvato legalmente\.\*\*/);
  });

  it('states no SQL/RLS/DB/aggregation job', () => {
    expect(source).toMatch(/\*\*Nessun SQL\. Nessuna RLS\. Nessun DB\. Nessun job di aggregazione\.\*\*/);
  });

  it('states no KORA Index integration', () => {
    expect(source).toMatch(/\*\*Nessuna integrazione con il KORA Index\.\*\*/);
  });

  it('states no companion score', () => {
    expect(source).toMatch(/\*\*Nessun punteggio companion\.\*\*/);
  });

  it('states one KORA Index remains the product principle', () => {
    expect(source).toMatch(/Principio di prodotto invariato: ci sarà un solo KORA Index/);
  });
});

// ── 8-9: privacy principle ────────────────────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — states the privacy principle', () => {
  const source = readSource(DESIGN_DOC);

  it('states company sees aggregate-only', () => {
    expect(source).toMatch(/L'azienda vede solo aggregati\./);
  });

  it('states aggregation alone is not sufficient', () => {
    expect(source).toMatch(/L'aggregazione da sola non è sufficiente/);
  });
});

// ── 10-12: existing threshold primitive ──────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — references the existing threshold primitive', () => {
  const source = readSource(DESIGN_DOC);

  it('references lib/privacy/group-threshold.ts', () => {
    expect(source).toContain('lib/privacy/group-threshold.ts');
  });

  it('states DPO must approve applicability to Phase 2', () => {
    expect(source).toMatch(/Il DPO deve approvare l'applicabilità al Phase 2/);
  });

  it('states N≥10 is not automatically sufficient for all Phase 2 signal types', () => {
    expect(source).toMatch(/N≥10 non è automaticamente sufficiente per tutti i tipi di segnale Phase 2/);
  });
});

// ── 13: all Phase 2 signal classes ───────────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — covers all Phase 2 signal classes', () => {
  const source = readSource(DESIGN_DOC);
  const signalClasses = [
    'uptake',
    'completion',
    'access',
    'value_band',
    'worker_choice',
    'partner_delivery',
    'continuity',
  ];

  it('covers all 7 static signal types plus partner-level, activity-type, fiscal-category, pillar, department, and adapter aggregate classes', () => {
    for (const cls of signalClasses) {
      expect(source, `missing signal class "${cls}"`).toContain(`\`${cls}\``);
    }
    expect(source).toMatch(/Aggregato a livello di singolo partner/);
    expect(source).toMatch(/Aggregato per tipo di attività/);
    expect(source).toMatch(/Aggregato per categoria fiscale\/welfare/);
    expect(source).toMatch(/Aggregato per pilastro/);
    expect(source).toMatch(/Aggregato per dipartimento\/sito\/team/);
    expect(source).toMatch(/Aggregato per il futuro adapter KORA Index/);
  });
});

// ── 14: draft threshold levels ────────────────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — defines draft threshold levels', () => {
  it('defines T0 through T4', () => {
    const source = readSource(DESIGN_DOC);
    for (const level of ['T0', 'T1', 'T2', 'T3', 'T4']) {
      expect(source, `missing threshold level ${level}`).toMatch(new RegExp(`\\*\\*${level}:\\*\\*`));
    }
  });
});

// ── 15: suppression output states ────────────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — defines suppression output states', () => {
  const source = readSource(DESIGN_DOC);
  const states = [
    'visible',
    'suppressed_low_n',
    'suppressed_sensitive_pattern',
    'suppressed_continuity_risk',
    'suppressed_partner_level_risk',
    'suppressed_department_grouping_risk',
    'needs_dpo_review',
    'needs_cto_review',
    'diagnostic_only',
    'not_collected',
  ];

  it('includes all 10 suppression output states', () => {
    for (const state of states) {
      expect(source, `missing suppression state "${state}"`).toContain(`\`${state}\``);
    }
  });
});

// ── 16-19: small-N, re-identification, combination, differencing ───────────

describe('Phase 2 Privacy Threshold Design 01 — covers small-N, re-identification, combination, and differencing risks', () => {
  const source = readSource(DESIGN_DOC);

  it('covers small-N risk', () => {
    expect(source).toMatch(/Piccolo N semplice/);
  });

  it('covers re-identification risk broadly', () => {
    expect(source).toMatch(/re-identificazione/);
  });

  it('covers combination attacks across filters', () => {
    expect(source).toMatch(/Attacchi di combinazione tra filtri/);
  });

  it('covers period-over-period differencing attacks', () => {
    expect(source).toMatch(/Attacchi di differenziazione periodo-su-periodo/);
  });
});

// ── 20-22: continuity, partner-level, dept/site/team ─────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — flags continuity, partner-level, and department grouping as high risk', () => {
  const source = readSource(DESIGN_DOC);

  it('states continuity is the highest-risk signal class', () => {
    expect(source).toMatch(/\*\*La continuità è la classe di segnale Phase 2 a rischio più alto\*\*/);
  });

  it('flags partner-level aggregates as high risk requiring DPO review', () => {
    expect(source).toMatch(/È richiesta una decisione DPO prima di qualunque visualizzazione azienda/);
  });

  it('states department/site/team grouping defaults to denied/suppressed', () => {
    expect(source).toMatch(/\*\*Dovrebbe di default essere negata\/soppressa\.\*\*/);
  });
});

// ── 23-24: privacy_threshold_rule / privacy_threshold_decision concepts ────

describe('Phase 2 Privacy Threshold Design 01 — defines the threshold decision record concepts', () => {
  const source = readSource(DESIGN_DOC);

  it('defines privacy_threshold_rule', () => {
    expect(source).toMatch(/### `privacy_threshold_rule`/);
  });

  it('defines privacy_threshold_decision', () => {
    expect(source).toMatch(/### `privacy_threshold_decision`/);
  });
});

// ── 25-28: company UI behavior ───────────────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — defines company UI behavior for suppressed signals', () => {
  const source = readSource(DESIGN_DOC);

  it('has a company UI behavior section', () => {
    expect(source).toMatch(/## 12\. Comportamento dell'interfaccia azienda/);
  });

  it('states no sourceBookingIds in company UI', () => {
    expect(source).toMatch(/\*\*Non mostrare mai `sourceBookingIds`\.\*\*/);
  });

  it('states no worker names/emails/IDs in company UI', () => {
    expect(source).toMatch(/\*\*Non mostrare mai nominativi, email, o ID lavoratore\.\*\*/);
  });

  it('states suppressed signals should not show risky exact counts', () => {
    expect(source).toMatch(/Non mostrare il conteggio esatto se il conteggio esatto crea un rischio/);
  });
});

// ── 29-30: KORA Index adapter boundary ───────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — states source events must never feed the adapter and adapter must be aggregate-only', () => {
  const source = readSource(DESIGN_DOC);

  it('states source events must never directly feed the KORA Index adapter', () => {
    expect(source).toMatch(/Gli eventi sorgente non devono mai alimentare direttamente l'adapter KORA Index/);
  });

  it('states the future adapter should read aggregate signals only', () => {
    expect(source).toMatch(/Il futuro adapter dovrebbe leggere solo segnali aggregati/);
  });
});

// ── 31-33: future tests, deferred scope, open decisions ──────────────────────

describe('Phase 2 Privacy Threshold Design 01 — lists future tests, deferred scope, and open decisions', () => {
  const source = readSource(DESIGN_DOC);

  it('has a test strategy section', () => {
    expect(source).toMatch(/## 14\. Strategia di test futura/);
  });

  it('has a what-not-to-implement-yet section', () => {
    expect(source).toMatch(/## 15\. Cosa non implementare ancora/);
    expect(source).toMatch(/Nessuna integrazione con il KORA Index\./);
    expect(source).toMatch(/Nessun punteggio companion\./);
  });

  it('has an open decisions section', () => {
    expect(source).toMatch(/## 16\. Decisioni aperte/);
  });
});

// ── 34: recommends exactly one next step ─────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — recommends exactly one next step', () => {
  it('recommends PHASE2-CONSENT-REVOCATION-DESIGN-01 as the single next step', () => {
    const source = readSource(DESIGN_DOC);
    expect(source).toMatch(/## 17\. Prossimo passo raccomandato/);
    expect(source).toMatch(/\*\*`PHASE2-CONSENT-REVOCATION-DESIGN-01`\*\*/);
    expect(source).not.toMatch(/\*\*`PHASE2-THRESHOLD-TESTS-RO`\*\*/);
    expect(source).not.toMatch(/\*\*`PHASE2-ACCESS-MATRIX-CANACCESS-RO`\*\*/);
    expect(source).not.toMatch(/\*\*`STOP_FOR_CTO_DPO`\*\*/);
  });
});

// ── 35: no SQL DDL statements or fenced code blocks ─────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — contains no SQL DDL statements', () => {
  it(`${DESIGN_DOC} contains no fenced code blocks`, () => {
    const source = readSource(DESIGN_DOC);
    expect(source).not.toContain('```');
  });

  it(`${DESIGN_DOC} contains no CREATE TABLE, CREATE POLICY, ALTER TABLE, GRANT, or REVOKE statements`, () => {
    const source = readSource(DESIGN_DOC);
    const forbidden = [
      /CREATE\s+POLICY\s+"/i,
      /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?[a-z]/i,
      /ALTER\s+TABLE\s+[a-z]/i,
      /\bGRANT\s+\w+\s+ON\b/i,
      /\bREVOKE\s+\w+\s+ON\b/i,
      /ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
      /FORCE\s+ROW\s+LEVEL\s+SECURITY/i,
    ];
    for (const pattern of forbidden) {
      expect(pattern.test(source), `must not match ${pattern}`).toBe(false);
    }
  });
});

// ── 36-38: no DPO/CTO decisions resolved, no separate score, no immediate integration ──

describe('Phase 2 Privacy Threshold Design 01 — does not overclaim or resolve decisions', () => {
  const source = readSource(DESIGN_DOC);

  it('does not mark any DPO/CTO decision as resolved', () => {
    expect(source).not.toMatch(/è stat[oa] (?:deciso|decisa|approvato|approvata) (?:da|dal) (?:CTO|DPO)/i);
    expect(source).not.toMatch(/(?:il|la) (?:CTO|DPO) ha (?:deciso|approvato)/i);
  });

  it('does not create a separate activation score', () => {
    expect(source).not.toMatch(/creiamo un punteggio di attivazione/i);
    expect(source).toMatch(/Nessun punteggio di attivazione pubblico separato/);
  });

  it('does not recommend immediate KORA Index integration', () => {
    expect(source).not.toMatch(/si raccomanda l'integrazione immediata (?:nel|con il) KORA Index/i);
  });
});

// ── 39-46: invariants untouched ──────────────────────────────────────────────

describe('Phase 2 Privacy Threshold Design 01 — proposed SQL, migrations, and access-matrix remain untouched', () => {
  it('034/035/036 remain readable and unchanged under supabase/proposed/', () => {
    for (const file of [
      'supabase/proposed/034_kora_link_schema.sql',
      'supabase/proposed/035_kora_link_rls.sql',
      'supabase/proposed/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
    const rls = readSource('supabase/proposed/035_kora_link_rls.sql');
    expect(rls).toMatch(/Worker SELECT self-only — BLOCKED until activation function is ready/);
  });

  it('supabase/migrations/001_live_v1_foundation.sql is unmodified (spot check)', () => {
    const migration = readSource('supabase/migrations/001_live_v1_foundation.sql');
    expect(migration).toMatch(/CREATE SCHEMA IF NOT EXISTS audit/);
  });

  it('lib/auth/access-matrix.ts remains untouched — B168 header and AccessResource union unchanged', () => {
    const source = readSource(ACCESS_MATRIX_CODE);
    expect(source).toMatch(/B168 — Matrice di accesso autoritativa per KORA/);
    for (const phase2Resource of ['phase2_partner_activity', 'phase2_activation_signal_aggregate', 'phase2_privacy_threshold_decision']) {
      expect(source).not.toContain(`'${phase2Resource}'`);
    }
  });

  it('docs/access-matrix.md remains untouched — authoritative header unchanged', () => {
    const doc = readSource(ACCESS_MATRIX_DOC);
    expect(doc).toMatch(/# KORA Access Matrix — Documento Autoritativo/);
    expect(doc).toMatch(/\*\*Autorità:\*\* Supera qualsiasi check hardcoded nel codice/);
  });

  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });

  it('lib/ingestion/raw-to-uef-interpreter.ts still bears its original header (not rewritten)', () => {
    const interpreter = readSource('lib/ingestion/raw-to-uef-interpreter.ts');
    expect(interpreter).toMatch(/Raw-to-UEF Rule-Based Interpreter v0\.1/);
  });

  it('migration 013 still creates commons.post, migration 025 still creates commons.booking and commons.contribution_event, unmodified', () => {
    const migration013 = readSource('supabase/migrations/013_kora_commons.sql');
    expect(migration013).toContain('CREATE TABLE IF NOT EXISTS commons.post');
    const migration025 = readSource('supabase/migrations/025_commons_booking_contribution.sql');
    expect(migration025).toContain('CREATE TABLE IF NOT EXISTS commons.booking');
    expect(migration025).toContain('CREATE TABLE IF NOT EXISTS commons.contribution_event');
  });
});
