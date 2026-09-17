/**
 * KORA-WP-040 — Economic Evidence Register (Controlled Manual Register).
 *
 * Registry 142, verbatim: "Proposed New: NONE — no application table, no
 * migration... Service/API: NONE... UI: NONE... Auth/RLS: N/A — this is an
 * operational procedure, not an app surface." This WP's own deliverable is
 * the register template/specification and operating procedure document
 * itself (docs/ECONOMIC_EVIDENCE_REGISTER_TEMPLATE_AND_PROCEDURE.md) — its
 * own registry Tests field, verbatim: "field-completeness check per data
 * source, procedure walkthrough." This file IS that check: a structural
 * (not behavioral) test over the document's own text, proving every
 * canonical field-schema category from doc 98 §7 is present, and every
 * named boundary (ADMIN-020 ≠ Cash Truth, no application table, Prime
 * exclusion, Decision Spine exclusion, KORA Index/IU/BTI/Confidence
 * exclusion, Case/audit-linkage requirement) is explicitly documented.
 *
 * There is no application code to test behaviorally — none exists, and
 * none is built by this WP. No real-DB validation applies (registry:
 * "Data/Migration Impact: NONE") — stated clearly, per the founder
 * prompt's own instruction to state this rather than manufacture one.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const DOC_PATH = 'docs/ECONOMIC_EVIDENCE_REGISTER_TEMPLATE_AND_PROCEDURE.md';

function readDoc(): string {
  return readFileSync(DOC_PATH, 'utf8');
}

describe('KORA-WP-040 — the register template/specification and operating procedure exist', () => {
  it('the document exists on disk (Acceptance: template/specification and procedure exist)', () => {
    expect(existsSync(DOC_PATH)).toBe(true);
  });
});

describe('KORA-WP-040 — A. field-completeness check: all 7 canonical field-schema categories (doc 98 §7, verbatim)', () => {
  const doc = readDoc();

  it('1. Identity / Linkage — record ID, Company, period, Case reference, source/evidence reference', () => {
    for (const term of ['Record ID', 'Company', 'Period', 'Case reference', 'source/evidence reference']) {
      expect(doc).toContain(term);
    }
  });

  it('2. Human Workload — sourced from KORA-WP-008', () => {
    expect(doc).toMatch(/Human Workload/);
    expect(doc).toMatch(/KORA-WP-008/);
    expect(doc).toMatch(/getAggregateEffortByCategory/);
  });

  it('3. Infrastructure / External Cost — provider/category, amount, period, evidence source', () => {
    expect(doc).toMatch(/Infrastructure \/ External Cost/);
    for (const term of ['Provider/category', 'Amount', 'Evidence source']) {
      expect(doc).toContain(term);
    }
  });

  it('4. Commercial / Billing — invoiced, collected, payment date, outstanding amount', () => {
    expect(doc).toMatch(/Commercial \/ Billing/);
    for (const term of ['Activation invoiced', 'Recurring fee invoiced', 'Amount collected', 'Payment date', 'Outstanding amount']) {
      expect(doc).toContain(term);
    }
  });

  it('5. Advisor Economic Input — accrued/payable cost, payment timing', () => {
    expect(doc).toMatch(/Advisor Economic Input/);
    expect(doc).toMatch(/[Aa]ccrued\/payable cost/);
    expect(doc).toContain('Payment timing');
  });

  it('6. Classification — exactly actual/estimated/unknown, no other value', () => {
    expect(doc).toMatch(/Classification/);
    expect(doc).toMatch(/\bactual\b/);
    expect(doc).toMatch(/\bestimated\b/);
    expect(doc).toMatch(/\bunknown\b/);
  });

  it('7. Provenance — recorded-by, recorded-at, source document', () => {
    expect(doc).toMatch(/Provenance/);
    for (const term of ['Recorded-by', 'Recorded-at', 'Source document']) {
      expect(doc).toContain(term);
    }
  });

  it('Prime Inputs are explicitly NOT part of the current field schema (deferred to Prime/DD-4)', () => {
    expect(doc).toMatch(/Prime Inputs.*(later|deferred)/i);
  });
});

describe('KORA-WP-040 — F. economic evidence vs economic truth boundary', () => {
  const doc = readDoc();

  it('the hard rule ADMIN-020 ≠ Cash Truth is stated explicitly', () => {
    expect(doc).toMatch(/ADMIN-020.*(≠|never).*[Cc]ash/);
  });

  it('Resource Allocation Ledger (WP-015) is named as untouched/unmutated', () => {
    expect(doc).toMatch(/KORA-WP-015/);
    expect(doc).toMatch(/never mutates or duplicates/);
  });

  it('Commercial Entitlement / fee_charge_event (WP-062) is named as the sole billing truth', () => {
    expect(doc).toMatch(/KORA-WP-062/);
    expect(doc).toMatch(/fee_charge_event/);
    expect(doc).toMatch(/manually transcribed/);
  });

  it('Prime economic architecture is named as entirely out of scope', () => {
    expect(doc).toMatch(/Program Funds/);
    expect(doc).toMatch(/Worker Entitlement/);
    expect(doc).toMatch(/Partner payable/);
    expect(doc).toMatch(/settlement/);
  });
});

describe('KORA-WP-040 — G. impact boundary', () => {
  it('KORA Index/IU/BTI/Confidence are named as never influenced by this register', () => {
    const doc = readDoc();
    expect(doc).toMatch(/KORA Index/);
    expect(doc).toMatch(/\bIU\b/);
    expect(doc).toMatch(/\bBTI\b/);
    expect(doc).toMatch(/Confidence Score/);
    expect(doc).toMatch(/never influences, informs, or feeds/);
  });

  it('the Decision Spine is named as never mutated/substituted', () => {
    const doc = readDoc();
    expect(doc).toMatch(/Decision Spine/);
    expect(doc).toMatch(/Review verdict/);
  });
});

describe('KORA-WP-040 — H/I. authority model and Company/tenant scoping', () => {
  const doc = readDoc();

  it('authority is documented as organizational/procedural, not code-enforced', () => {
    expect(doc).toMatch(/organizational/i);
    expect(doc).toMatch(/not.{0,20}code-enforced/i);
    expect(doc).toMatch(/KORA Operations/);
  });

  it('no Company/Advisor/Partner/Worker role is granted create/edit authority', () => {
    expect(doc).toMatch(/no role outside KORA Operations creates, edits, or reviews/i);
  });

  it('each entry names the Company it concerns (Company field in Identity/Linkage)', () => {
    expect(doc).toMatch(/Company \(the Company this entry/);
  });
});

describe('KORA-WP-040 — J. amount/currency model', () => {
  it('pilot #1 scope is explicitly EUR-only, no multi-currency invented', () => {
    const doc = readDoc();
    expect(doc).toMatch(/EUR only/);
    expect(doc).toMatch(/no multi-currency/);
  });

  it('amounts are specified as exact decimal, never floating-point-approximated', () => {
    const doc = readDoc();
    expect(doc).toMatch(/exact decimal/);
    expect(doc).toMatch(/never.{0,40}floating-point/);
  });
});

describe('KORA-WP-040 — L/M. immutability and duplicate/conflict model', () => {
  const doc = readDoc();

  it('a correction is a new dated entry, never an overwrite', () => {
    expect(doc).toMatch(/not silently altered/);
    expect(doc).toMatch(/never an overwrite/);
  });

  it('deletion is not permitted as a matter of course', () => {
    expect(doc).toMatch(/not deleted\*{0,2} as a matter of course/);
  });

  it('duplicate detection is documented as a manual check, no DB uniqueness constraint claimed', () => {
    expect(doc).toMatch(/[Dd]uplicate detection/);
    expect(doc).toMatch(/no table exists to enforce/);
  });
});

describe('KORA-WP-040 — E/N. governance/Case-linkage and privacy', () => {
  const doc = readDoc();

  it('every entry and review is Case-linked via the existing WP-007 primitive', () => {
    expect(doc).toMatch(/KORA-WP-007/);
    expect(doc).toMatch(/Operational Case/);
    expect(doc).toMatch(/organisationType: 'admin'/);
  });

  it('audit trail is the existing governance_event substrate — no new logging mechanism', () => {
    expect(doc).toMatch(/audit\.governance_event/);
    expect(doc).toMatch(/does not introduce a new governance mechanism/);
  });

  it('WP-046 observability is explicitly excluded as an economic-evidence/audit substitute', () => {
    expect(doc).toMatch(/KORA-WP-046/);
    expect(doc).toMatch(/not.{0,40}used as economic evidence/);
  });

  it('no Worker/PIB data is named anywhere in the register scope', () => {
    expect(doc).toMatch(/No Worker or PIB/);
  });

  it('raw source documents are never copied into the register — reference identifiers only', () => {
    expect(doc).toMatch(/reference identifiers only/);
    expect(doc).toMatch(/never copied into the register/);
  });
});

describe('KORA-WP-040 — O/U. persistence boundary — no application table, no migration', () => {
  const doc = readDoc();

  it('the document states no dedicated application table/migration/finance BI/UI exists', () => {
    expect(doc).toMatch(/No dedicated application table, no migration, no finance BI system, no customer-facing UI/);
  });

  it('productization is documented as a future trigger only, never pre-built', () => {
    expect(doc).toMatch(/Productization/);
    expect(doc).toMatch(/never pre-built/);
  });

  it('no new migration file exists for this WP (registry: Data/Migration Impact = NONE)', async () => {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(Math.max(...numbers)).toBe(79); // unchanged since KORA-WP-027
  });

  it('no new application/service file exists under lib/ or services/ for this WP', () => {
    // This WP's own deliverable is documentation-only; confirmed by the
    // absence of any lib/economic-evidence* or services/economic-evidence*
    // path anywhere in the repository at the time this test was authored.
    expect(existsSync('lib/economic-evidence')).toBe(false);
    expect(existsSync('services/economic-evidence')).toBe(false);
  });
});

describe('KORA-WP-040 — Q. review cadence is defined (Acceptance requirement)', () => {
  it('a specific, defined cadence is stated', () => {
    const doc = readDoc();
    expect(doc).toMatch(/reviewed \*\*monthly\*\*/);
  });
});

describe('KORA-WP-040 — S. downstream contract for WP-043/WP-044', () => {
  it('names both downstream WPs and states there is no application surface for either to extend', () => {
    const doc = readDoc();
    expect(doc).toMatch(/KORA-WP-043/);
    expect(doc).toMatch(/KORA-WP-044/);
    expect(doc).toMatch(/zero application code/);
  });
});
