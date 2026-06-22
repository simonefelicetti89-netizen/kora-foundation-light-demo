/**
 * Gate 3 — Legal/DPO Readiness Review assertions.
 *
 * Verifies that docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md correctly documents
 * the Gate 3 legal/privacy architecture readiness assessment: role model,
 * lawful basis, data classification, employer visibility boundary, DPIA-like
 * risk register, required legal artifacts, Gate 3 decision, and 027 status.
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 * This test does not verify legal compliance — it verifies documentation completeness.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DOC_PATH = 'docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md';

function doc(): string {
  return readFileSync(resolve(process.cwd(), DOC_PATH), 'utf-8');
}

// ── 1. Document identity and disclaimer ───────────────────────────────────────

describe('gate3-legal-dpo-readiness — identity', () => {
  it('doc contains Gate 3 Legal/DPO readiness review title', () => {
    expect(doc()).toMatch(/Gate 3.*Legal.*DPO|Legal.*DPO.*Readiness/i);
  });

  it('doc contains non-legal-advice disclaimer', () => {
    expect(doc()).toMatch(/NOT legal advice|not.*legal.*advice|disclaimer/i);
  });

  it('doc confirms production NOT touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|NOT touched.*Production/i);
  });

  it('doc references staging project ref haqflkurpmeaxpikozjl', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl/);
  });
});

// ── 2. KORA identity constraints ──────────────────────────────────────────────

describe('gate3-legal-dpo-readiness — KORA identity constraints', () => {
  it('doc states KORA measures organizations not individuals', () => {
    expect(doc()).toMatch(/measures.*organizations.*not individuals|organizations.*not.*individuals/i);
  });

  it('doc states Worker PIB is private', () => {
    expect(doc()).toMatch(/PIB.*private|private.*PIB|Worker PIB.*never.*employer/i);
  });

  it('doc states employer must not see individual PIB', () => {
    expect(doc()).toMatch(/employer.*not see.*PIB|employer.*never.*PIB|PIB.*BLOCKED/i);
  });

  it('doc states employer must not see individual UEF or IU traces', () => {
    expect(doc()).toMatch(/UEF.*BLOCKED|employer.*UEF|individual.*UEF.*BLOCKED/i);
  });

  it('doc confirms AI v0.1 is rule/taxonomy-based with no external LLM on worker/HR data', () => {
    expect(doc()).toMatch(/rule.*taxonomy|BCM.*classifier|no external LLM.*worker|no external LLM.*HR/i);
  });
});

// ── 3. Role model / controller-processor assessment ───────────────────────────

describe('gate3-legal-dpo-readiness — role model', () => {
  it('doc contains controller/processor assessment', () => {
    expect(doc()).toMatch(/[Cc]ontroller.*[Pp]rocessor|[Pp]rocessor.*[Cc]ontroller/);
  });

  it('doc assesses joint controllership risk', () => {
    expect(doc()).toMatch(/[Jj]oint [Cc]ontrollership|[Jj]oint [Cc]ontroller/);
  });

  it('doc identifies DPA as required', () => {
    expect(doc()).toMatch(/DPA.*[Rr]equired|Data Processing Agreement.*[Rr]equired/i);
  });

  it('doc identifies worker privacy notice as required', () => {
    expect(doc()).toMatch(/[Ww]orker.*[Pp]rivacy [Nn]otice|[Pp]rivacy [Nn]otice.*[Ww]orker/);
  });
});

// ── 4. Lawful basis / consent risk ───────────────────────────────────────────

describe('gate3-legal-dpo-readiness — lawful basis', () => {
  it('doc contains lawful basis assessment', () => {
    expect(doc()).toMatch(/[Ll]awful [Bb]asis|lawful basis/i);
  });

  it('doc addresses consent risk in employment context', () => {
    expect(doc()).toMatch(/consent.*employment|employment.*consent/i);
  });

  it('doc addresses special category data risk', () => {
    expect(doc()).toMatch(/[Ss]pecial [Cc]ategory|Art\. 9|Article 9/);
  });

  it('doc identifies health/mental health processing as blocker', () => {
    expect(doc()).toMatch(/health.*BLOCKER|mental health.*BLOCKER|BLOCKER.*health/i);
  });
});

// ── 5. Data classification matrix ─────────────────────────────────────────────

describe('gate3-legal-dpo-readiness — data classification', () => {
  it('doc contains data classification matrix', () => {
    expect(doc()).toMatch(/[Dd]ata [Cc]lassification [Mm]atrix/);
  });

  it('doc classifies Worker PIB as BLOCKED for employer', () => {
    expect(doc()).toMatch(/PIB.*BLOCKED|BLOCKED.*PIB/);
  });

  it('doc classifies health/wellbeing as high special category risk', () => {
    expect(doc()).toMatch(/[Hh]ealth.*HIGH|HIGH.*[Hh]ealth/);
  });

  it('doc classifies compliance/HSE/legal records as blocked from KORA scoring', () => {
    expect(doc()).toMatch(/[Cc]ompliance.*[Bb]locked|HSE.*[Bb]locked|legal.*[Bb]locked.*scor/i);
  });

  it('doc classifies KORA Index as non-personal organizational output', () => {
    expect(doc()).toMatch(/KORA Index.*NO|KORA Index.*organizational/i);
  });
});

// ── 6. Employer visibility boundary ───────────────────────────────────────────

describe('gate3-legal-dpo-readiness — employer visibility boundary', () => {
  it('doc contains employer visibility boundary section', () => {
    expect(doc()).toMatch(/[Ee]mployer [Vv]isibility [Bb]oundary/);
  });

  it('doc specifies aggregation threshold (group size ≥ 10)', () => {
    expect(doc()).toMatch(/safe_aggregation_threshold|group size.*10|≥.*10|10.*threshold/i);
  });

  it('doc states individual worker PIB is BLOCKED for COMPANY_ADMIN', () => {
    expect(doc()).toMatch(/COMPANY_ADMIN.*BLOCKED|BLOCKED.*COMPANY_ADMIN/);
  });

  it('doc requires audit logging for employer data access', () => {
    expect(doc()).toMatch(/audit.*log.*employer|employer.*audit/i);
  });
});

// ── 7. DPIA-like risk register ────────────────────────────────────────────────

describe('gate3-legal-dpo-readiness — DPIA risk register', () => {
  it('doc contains DPIA-like risk register', () => {
    expect(doc()).toMatch(/DPIA.*[Rr]isk [Rr]egister|[Rr]isk [Rr]egister/i);
  });

  it('doc registers employer surveillance perception risk', () => {
    expect(doc()).toMatch(/surveillance.*perception|employer.*surveillance/i);
  });

  it('doc registers re-identification risk in small populations', () => {
    expect(doc()).toMatch(/re-identification|small.*population/i);
  });

  it('doc registers consent invalidity in employment context as critical', () => {
    expect(doc()).toMatch(/[Cc]onsent.*invalid|CRITICAL.*[Cc]onsent/);
  });

  it('doc registers function creep risk', () => {
    expect(doc()).toMatch(/[Ff]unction [Cc]reep|function creep/i);
  });

  it('doc registers KORA Space privacy risk', () => {
    expect(doc()).toMatch(/KORA Space.*risk|KORA Space.*misuse/i);
  });

  it('doc registers partner data leakage risk', () => {
    expect(doc()).toMatch(/[Pp]artner.*leakage|[Pp]artner.*data/);
  });

  it('doc registers KORA Link event tracing risk', () => {
    expect(doc()).toMatch(/KORA Link.*trac|KORA Link.*risk/i);
  });

  it('doc registers excessive retention risk', () => {
    expect(doc()).toMatch(/[Ee]xcessive.*[Rr]etention|retention.*risk/i);
  });

  it('doc registers DSAR complexity risk', () => {
    expect(doc()).toMatch(/DSAR.*complex|DSAR/);
  });

  it('doc registers right to erasure risk', () => {
    expect(doc()).toMatch(/[Rr]ight to [Ee]rasure|erasure.*audit/i);
  });
});

// ── 8. Required legal artifact pack ──────────────────────────────────────────

describe('gate3-legal-dpo-readiness — required legal artifacts', () => {
  it('doc requires DPA', () => {
    expect(doc()).toMatch(/DPA|Data Processing Agreement/);
  });

  it('doc requires worker privacy notice', () => {
    expect(doc()).toMatch(/[Ww]orker.*[Pp]rivacy [Nn]otice|privacy notice.*worker/i);
  });

  it('doc requires data retention policy', () => {
    expect(doc()).toMatch(/[Rr]etention [Pp]olicy|retention policy/i);
  });

  it('doc requires DSAR procedure', () => {
    expect(doc()).toMatch(/DSAR.*procedure|DSAR/);
  });

  it('doc requires DPIA or DPIA screening', () => {
    expect(doc()).toMatch(/DPIA/);
  });

  it('doc requires aggregate/anonymization threshold policy', () => {
    expect(doc()).toMatch(/[Aa]ggregate.*threshold|threshold.*policy|anonymization.*threshold/i);
  });

  it('doc requires special category data handling policy', () => {
    expect(doc()).toMatch(/[Ss]pecial.*[Cc]ategory.*[Pp]olicy|special category.*handling/i);
  });
});

// ── 9. Migration 027 status ───────────────────────────────────────────────────

describe('gate3-legal-dpo-readiness — migration 027', () => {
  it('doc confirms 027 remains suspended', () => {
    expect(doc()).toMatch(/027.*suspend|suspend.*027|027.*NOT applied/i);
  });

  it('doc links 027 suspension to Gate 3 requirement', () => {
    expect(doc()).toMatch(/027.*Gate 3|Gate 3.*027/i);
  });

  it('doc confirms 029 NOT applied', () => {
    expect(doc()).toMatch(/029.*NOT applied|NOT applied.*029/i);
  });
});

// ── 10. Gate 3 decision ───────────────────────────────────────────────────────

describe('gate3-legal-dpo-readiness — Gate 3 decision', () => {
  it('doc states Gate 3 is OPEN — NOT CLOSED', () => {
    expect(doc()).toMatch(/GATE 3 OPEN|Gate 3.*OPEN.*NOT CLOSED|NOT CLOSED/i);
  });

  it('doc does not claim Gate 3 is closed (standalone verdict)', () => {
    // "GATE 3 OPEN — NOT CLOSED" is fine; "GATE 3 CLOSED" without "OPEN" or "NOT" is not
    expect(doc()).not.toMatch(/\bGATE 3\s+CLOSED\b/);
  });
});

// ── 11. Production and secrets hygiene ───────────────────────────────────────

describe('gate3-legal-dpo-readiness — production and secrets hygiene', () => {
  it('doc confirms no real worker data created', () => {
    expect(doc()).toMatch(/no real worker data|real worker data.*NOT/i);
  });

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
