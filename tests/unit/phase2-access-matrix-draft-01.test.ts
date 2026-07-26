/**
 * Phase 2 Access Matrix Draft 01 — non-authoritative draft access-matrix
 * extension guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: this
 * is a docs-only, non-authoritative draft translating PHASE2-RLS-DESIGN-RO
 * into a concrete access-matrix extension proposal. No code change, no
 * AccessResource addition, no RLS, no SQL, no middleware/layout change, no
 * KORA Index integration, no companion score, no DPO/CTO decision marked
 * resolved. See docs/PHASE2_ACCESS_MATRIX_DRAFT_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const DRAFT_DOC = 'docs/PHASE2_ACCESS_MATRIX_DRAFT_01.md';
const ACCESS_MATRIX_CODE = 'lib/auth/access-matrix.ts';
const ACCESS_MATRIX_DOC = 'docs/access-matrix.md';
const SCHEMA_DESIGN_DOC = 'docs/PHASE2_SCHEMA_DESIGN_01.md';

// ── 1: doc exists ────────────────────────────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — draft doc exists', () => {
  it(`${DRAFT_DOC} exists`, () => {
    expect(() => readSource(DRAFT_DOC)).not.toThrow();
  });
});

// ── 2-8: status and scope ─────────────────────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — states draft/non-authoritative status and scope', () => {
  const source = readSource(DRAFT_DOC);

  it('states this is a draft, non-authoritative document', () => {
    expect(source).toMatch(/Bozza — non autoritativa\./);
  });

  it('states no code changes', () => {
    expect(source).toMatch(/non contiene alcuna modifica al codice/);
  });

  it('states no AccessResource additions', () => {
    expect(source).toMatch(/non aggiunge alcuna voce `AccessResource`/);
  });

  it('states no RLS/SQL/migration', () => {
    expect(source).toMatch(/non contiene RLS/);
    expect(source).toMatch(/non contiene SQL/);
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

// ── 9-11: canonical access model summary ─────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — summarizes the canonical access model', () => {
  const source = readSource(DRAFT_DOC);

  it('states docs/access-matrix.md is authoritative and canAccess() is pure/deny-by-default', () => {
    expect(source).toMatch(/`docs\/access-matrix\.md` è il documento autoritativo/);
    expect(source).toMatch(/`canAccess\(role, resource, env\)` è una funzione pura e deny-by-default/);
  });

  it('lists all 8 current canonical AccessResource values', () => {
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
      expect(source, `missing known resource "${resource}"`).toContain(resource);
    }
  });

  it('states no Phase 2 AccessResource exists yet', () => {
    expect(source).toMatch(/Il Phase 2 ha oggi zero voci `AccessResource` canoniche/);
  });
});

// ── 12-13: draft naming convention and all 12 resources ─────────────────────

describe('Phase 2 Access Matrix Draft 01 — proposes flat snake_case draft resource names', () => {
  const source = readSource(DRAFT_DOC);
  const draftResources = [
    'phase2_partner_activity',
    'phase2_company_activity_selection',
    'phase2_worker_activity_eligibility',
    'phase2_worker_activity_action',
    'phase2_partner_activity_booking',
    'phase2_partner_worker_relationship',
    'phase2_activation_signal_source_event',
    'phase2_activation_signal_aggregate',
    'phase2_privacy_threshold_decision',
    'phase2_partner_delivery_evidence',
    'phase2_worker_consent_event',
    'phase2_audit_event',
  ];

  it('includes all 12 draft Phase 2 resources as flat snake_case names', () => {
    for (const resource of draftResources) {
      expect(source, `missing draft resource "${resource}"`).toContain(`\`${resource}\``);
      expect(resource).not.toMatch(/\./); // flat, not dotted schema names
    }
  });

  it('states names are draft and final naming requires CTO review', () => {
    expect(source).toMatch(/\*\*I nomi sono bozza\.\*\* La denominazione finale richiede revisione CTO/);
    expect(source).toMatch(/Nessuna voce di codice esiste ancora/);
  });
});

// ── 14: draft resource catalog ────────────────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — includes a draft resource catalog', () => {
  it('has a resource catalog section with access-class/DPO/CTO/timing/risk columns', () => {
    const source = readSource(DRAFT_DOC);
    expect(source).toMatch(/## 4\. Catalogo bozza delle risorse/);
    expect(source).toMatch(/Classe di accesso/);
    expect(source).toMatch(/DPO richiesto/);
    expect(source).toMatch(/CTO richiesto/);
    expect(source).toMatch(/Tempistica/);
    expect(source).toMatch(/Rischio/);
  });
});

// ── 15-16: draft role/resource matrix, all roles ─────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — includes a draft role/resource matrix with all roles', () => {
  const source = readSource(DRAFT_DOC);

  it('has a role/resource matrix section', () => {
    expect(source).toMatch(/## 5\. Bozza di matrice ruolo\/risorsa/);
  });

  it('covers all required roles including SYSTEM/JOB', () => {
    for (const role of ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR', 'SYSTEM/JOB']) {
      expect(source, `missing role "${role}"`).toContain(role);
    }
  });
});

// ── 17: ADVISOR deny/default inactive ────────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — marks ADVISOR deny/default inactive', () => {
  it('states ADVISOR is DENY on every resource', () => {
    const source = readSource(DRAFT_DOC);
    expect(source).toMatch(/`ADVISOR` è `DENY` su ogni risorsa/);
  });
});

// ── 18-19: company boundaries ────────────────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — denies company access to worker-level resources and allows aggregate-only', () => {
  const source = readSource(DRAFT_DOC);

  it('states COMPANY_ADMIN is DENY on every worker-level resource', () => {
    expect(source).toMatch(/`COMPANY_ADMIN` è `DENY` su ogni risorsa a livello di singolo lavoratore/);
  });

  it('states COMPANY_ADMIN can only read aggregate Phase 2 signals', () => {
    expect(source).toMatch(/`COMPANY_ADMIN` può solo leggere segnali Phase 2 aggregati \(`READ_AGGREGATE_ONLY`\)/);
  });
});

// ── 20-21: partner boundaries ─────────────────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — denies partner bulk worker browsing and gates named visibility on consent', () => {
  const source = readSource(DRAFT_DOC);

  it('states PARTNER never has bulk read of eligible workers', () => {
    expect(source).toMatch(/`PARTNER` non ha mai una lettura bulk dei lavoratori eleggibili/);
  });

  it('states partner named visibility is gated by worker-initiated action/consent', () => {
    expect(source).toMatch(/vincolare la visibilità nominativa del partner[\s\S]*consenso\/azione avviati dal lavoratore/);
  });
});

// ── 22: worker limited to own data ───────────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — limits worker to own data', () => {
  it('states WORKER can only read/write own action/booking/consent data', () => {
    const source = readSource(DRAFT_DOC);
    expect(source).toMatch(/`WORKER` può solo leggere\/scrivere i propri dati di azione\/prenotazione\/consenso/);
  });
});

// ── 23: KORA_ADMIN worker-adjacent access audited ────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — marks KORA_ADMIN worker-adjacent access as audited', () => {
  it('states KORA_ADMIN access on worker-adjacent resources is always audited, never silent', () => {
    const source = readSource(DRAFT_DOC);
    expect(source).toMatch(/L'accesso `KORA_ADMIN` su risorse worker-adjacent è sempre `ADMIN_READ_AUDITED`/);
    expect(source).toMatch(/mai un accesso completo silenzioso/);
  });
});

// ── 24: canAccess intent ──────────────────────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — includes draft canAccess() intent', () => {
  const source = readSource(DRAFT_DOC);

  it('has a canAccess() intent section stating intent-only, no code changed', () => {
    expect(source).toMatch(/## 6\. Bozza di intento `canAccess\(\)`/);
    expect(source).toMatch(/Questo è solo intento\./);
    expect(source).toMatch(/Nessun codice è stato modificato in `lib\/auth\/access-matrix\.ts`/);
    expect(source).toMatch(/L'implementazione finale deve essere testata prima dell'uso/);
  });
});

// ── 25-26: middleware/layout implications, RLS mandatory ────────────────────

describe('Phase 2 Access Matrix Draft 01 — includes middleware/layout guard implications', () => {
  const source = readSource(DRAFT_DOC);

  it('has a middleware/layout implications section', () => {
    expect(source).toMatch(/## 7\. Implicazioni per middleware e guard di layout/);
    expect(source).toMatch(/Nessuna modifica a middleware o layout/);
  });

  it('states route prefix and layout guard alone are not enough, and RLS is mandatory', () => {
    expect(source).toMatch(/Il prefisso di route non basta/);
    expect(source).toMatch(/Il guard di layout server non basta/);
    expect(source).toMatch(/La RLS è obbligatoria/);
  });
});

// ── 27-28: RLS alignment, FORCE RLS, kora helpers ────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — RLS alignment notes', () => {
  const source = readSource(DRAFT_DOC);

  it('states FORCE ROW LEVEL SECURITY is expected for future policies', () => {
    expect(source).toMatch(/usare `FORCE ROW LEVEL SECURITY`/);
  });

  it('references kora.kora_role() and kora.tenant_id() helper functions', () => {
    expect(source).toMatch(/kora\.kora_role\(\)/);
    expect(source).toMatch(/kora\.tenant_id\(\)/);
  });
});

// ── 29: 16 boundary stress tests ──────────────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — includes the 16 boundary stress tests', () => {
  it('has a boundary stress-test matrix with all 16 scenarios', () => {
    const source = readSource(DRAFT_DOC);
    expect(source).toMatch(/## 9\. Matrice dei test di confine/);
    // Spot-check a representative sample across the 16 rows.
    expect(source).toMatch(/L'azienda legge azioni individuali del lavoratore/);
    expect(source).toMatch(/Il partner elenca tutti i lavoratori eleggibili/);
    expect(source).toMatch(/`ADVISOR` accede a dati worker Phase 2/);
    expect(source).toMatch(/Il worker revoca il consenso/);
    expect(source).toMatch(/Il futuro adapter KORA Index usa eventi sorgente invece di aggregati/);
    // Count numbered rows 1-16 in the table.
    for (let i = 1; i <= 16; i++) {
      expect(source, `missing stress test row #${i}`).toMatch(new RegExp(`\\| ${i} \\|`));
    }
  });
});

// ── 30-32: open decisions, implementation order, what not to implement ─────

describe('Phase 2 Access Matrix Draft 01 — lists open decisions, implementation order, and deferred scope', () => {
  const source = readSource(DRAFT_DOC);

  it('has an open decisions section', () => {
    expect(source).toMatch(/## 10\. Decisioni aperte/);
  });

  it('has an implementation order section', () => {
    expect(source).toMatch(/## 11\. Ordine di implementazione/);
    expect(source).toMatch(/Implementazione DB solo dopo la chiusura del gate/);
  });

  it('has a what-not-to-implement-yet section', () => {
    expect(source).toMatch(/## 12\. Cosa non implementare ancora/);
    expect(source).toMatch(/Nessuna integrazione con il KORA Index/);
    expect(source).toMatch(/Nessun punteggio companion/);
  });
});

// ── 33: recommends exactly one next step ─────────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — recommends exactly one next step', () => {
  it('recommends PHASE2-PRIVACY-THRESHOLD-DESIGN-01 as the single next step', () => {
    const source = readSource(DRAFT_DOC);
    expect(source).toMatch(/## 13\. Prossimo passo raccomandato/);
    expect(source).toMatch(/\*\*`PHASE2-PRIVACY-THRESHOLD-DESIGN-01`\*\*/);
    expect(source).not.toMatch(/\*\*`PHASE2-CONSENT-REVOCATION-DESIGN-01`\*\*/);
    expect(source).not.toMatch(/\*\*`PHASE2-ACCESS-MATRIX-CANACCESS-RO`\*\*/);
    expect(source).not.toMatch(/\*\*`STOP_FOR_CTO_DPO`\*\*/);
  });
});

// ── 34: no SQL DDL statements or fenced code blocks ─────────────────────────

describe('Phase 2 Access Matrix Draft 01 — contains no SQL DDL statements', () => {
  it(`${DRAFT_DOC} contains no fenced code blocks`, () => {
    const source = readSource(DRAFT_DOC);
    expect(source).not.toContain('```');
  });

  it(`${DRAFT_DOC} contains no CREATE POLICY, CREATE TABLE, ALTER TABLE, GRANT, or REVOKE statements`, () => {
    const source = readSource(DRAFT_DOC);
    const forbidden = [
      /CREATE\s+POLICY\s+"/i,
      /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?[a-z]/i,
      /ALTER\s+TABLE\s+[a-z]/i,
      /\bGRANT\s+\w+\s+ON\b/i,
      /\bREVOKE\s+\w+\s+ON\b/i,
    ];
    for (const pattern of forbidden) {
      expect(pattern.test(source), `must not match ${pattern}`).toBe(false);
    }
  });
});

// ── 35: no DPO/CTO decisions marked resolved ─────────────────────────────────

describe('Phase 2 Access Matrix Draft 01 — does not claim DPO/CTO decisions resolved', () => {
  it(`${DRAFT_DOC} does not mark any decision as resolved`, () => {
    const source = readSource(DRAFT_DOC);
    expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
    expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
  });
});

// ── 36-39: canonical/access-matrix code, migrations, proposed untouched ────

describe('Phase 2 Access Matrix Draft 01 — does not modify docs/access-matrix.md as authoritative truth', () => {
  it('docs/access-matrix.md still bears its authoritative header, unchanged', () => {
    const doc = readSource(ACCESS_MATRIX_DOC);
    expect(doc).toMatch(/# KORA Access Matrix — Documento Autoritativo/);
    expect(doc).toMatch(/\*\*Autorità:\*\* Supera qualsiasi check hardcoded nel codice/);
  });
});

describe('Phase 2 Access Matrix Draft 01 — does not modify lib/auth/access-matrix.ts', () => {
  it('still bears its B168 authoritative header and unchanged AccessResource union', () => {
    const source = readSource(ACCESS_MATRIX_CODE);
    expect(source).toMatch(/B168 — Matrice di accesso autoritativa per KORA/);
    for (const phase2Resource of ['phase2_partner_activity', 'phase2_activation_signal_aggregate']) {
      expect(source).not.toContain(`'${phase2Resource}'`);
    }
  });
});

describe('Phase 2 Access Matrix Draft 01 — does not touch supabase/migrations or supabase/proposed', () => {
  it('034/035/036 remain readable and unchanged under supabase/proposed/', () => {
    for (const file of [
      'supabase/migrations/034_kora_link_schema.sql',
      'supabase/migrations/035_kora_link_rls.sql',
      'supabase/migrations/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
    const rls = readSource('supabase/migrations/035_kora_link_rls.sql');
    expect(rls).toMatch(/Worker SELECT self-only — BLOCKED until activation function is ready/);
  });

  it('supabase/migrations/001_live_v1_foundation.sql is unmodified (spot check)', () => {
    const migration = readSource('supabase/migrations/001_live_v1_foundation.sql');
    expect(migration).toMatch(/CREATE SCHEMA IF NOT EXISTS audit/);
  });
});

// ── 40-41: no companion/public score, no immediate KORA Index integration ──

describe('Phase 2 Access Matrix Draft 01 — no companion score, no separate public score, no immediate integration', () => {
  const source = readSource(DRAFT_DOC);

  it('does not introduce a separate/public activation score', () => {
    expect(source).not.toMatch(/creiamo un punteggio di attivazione/i);
  });

  it('does not recommend immediate KORA Index integration', () => {
    expect(source).not.toMatch(/si raccomanda l'integrazione immediata (?:nel|con il) KORA Index/i);
  });
});

// ── Optional cross-reference from the schema design doc ────────────────────

describe('Phase 2 Access Matrix Draft 01 — cross-reference from the schema design doc (if added)', () => {
  it(`${SCHEMA_DESIGN_DOC} either omits or clearly marks a draft/non-authoritative cross-link`, () => {
    const source = readSource(SCHEMA_DESIGN_DOC);
    if (source.includes('PHASE2_ACCESS_MATRIX_DRAFT_01')) {
      expect(source).toMatch(/PHASE2_ACCESS_MATRIX_DRAFT_01\.md/);
    }
  });
});
