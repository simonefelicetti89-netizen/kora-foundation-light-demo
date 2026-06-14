/**
 * B152-B — Company Routes Migration to Company-Safe Aggregation Layer
 *
 * Cosa validano questi test (source-level audit):
 *   (a) Nessuna delle 5 route usa getSupabaseServiceClient
 *   (b) Nessuna delle 5 route legge direttamente tabelle worker-level/sensitive:
 *       personal.worker_identity, personal.worker_initiative,
 *       personal.worker_participation, personal.uploaded_record,
 *       analytics.uef_record
 *   (c) Ogni route referenzia il corretto oggetto company-safe (migration 015)
 *   (d) activation-aggregate: safeCount() rimosso, suppression viene dal SQL
 *   (e) evidence-archive: initiative_name_raw non restituito direttamente al client
 *   (f) live-eligibility: no blind .maybeSingle() su result potenzialmente multi-row
 *   (g) Auth guards (requireCompanyUser + isKoraAuthError) intatti
 *
 * Cosa NON validano:
 *   - RLS enforcement PostgreSQL (richiede DB reale, Gate 2 open)
 *   - Comportamento HTTP o di rete
 *   - Correttezza SQL effettiva
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function stripLineComments(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '');
}

const ROUTES = {
  aggregate:           'app/api/company/workers/aggregate/route.ts',
  activationAggregate: 'app/api/company/workers/activation-aggregate/route.ts',
  liveEligibility:     'app/api/company/live-eligibility/route.ts',
  evidenceRecord:      'app/api/company/evidence-record/route.ts',
  evidenceArchive:     'app/api/company/evidence-archive/route.ts',
} as const;

// ── (a) Nessuna route usa service client ──────────────────────────────────────

describe('B152-B — nessun service client nelle route migrate', () => {
  for (const [name, path] of Object.entries(ROUTES)) {
    it(`${name}: non importa getSupabaseServiceClient`, () => {
      const stripped = stripLineComments(read(path));
      expect(stripped).not.toContain('getSupabaseServiceClient');
    });
  }
});

// ── (b) Nessuna lettura diretta da tabelle worker-level ───────────────────────

describe('B152-B — nessuna lettura diretta da tabelle worker-level/sensitive', () => {
  const workerLevelTables = [
    { pattern: "from('worker_identity')",   label: 'worker_identity'   },
    { pattern: "from('worker_initiative')", label: 'worker_initiative' },
    { pattern: "from('worker_participation')", label: 'worker_participation' },
    { pattern: "from('uploaded_record')",   label: 'uploaded_record'   },
    { pattern: "from('uef_record')",        label: 'uef_record'        },
  ];

  for (const [name, path] of Object.entries(ROUTES)) {
    for (const { pattern, label } of workerLevelTables) {
      it(`${name}: non accede a ${label} direttamente`, () => {
        const stripped = stripLineComments(read(path));
        expect(stripped).not.toContain(pattern);
      });
    }
  }
});

// ── (c) Ogni route usa il corretto oggetto company-safe ───────────────────────

describe('B152-B — route referenziano oggetti company-safe (migration 015)', () => {
  it('workers/aggregate usa fn_company_worker_status', () => {
    expect(read(ROUTES.aggregate)).toContain('fn_company_worker_status');
  });

  it('workers/activation-aggregate usa fn_company_activation_summary', () => {
    expect(read(ROUTES.activationAggregate)).toContain('fn_company_activation_summary');
  });

  it('live-eligibility usa v_company_uef_eligibility_summary', () => {
    expect(read(ROUTES.liveEligibility)).toContain('v_company_uef_eligibility_summary');
  });

  it('evidence-record usa v_company_uploaded_record_safe', () => {
    expect(read(ROUTES.evidenceRecord)).toContain('v_company_uploaded_record_safe');
  });

  it('evidence-archive usa v_company_uploaded_record_safe', () => {
    expect(read(ROUTES.evidenceArchive)).toContain('v_company_uploaded_record_safe');
  });
});

// ── (d) activation-aggregate: suppression in SQL, non in TS ──────────────────

describe('B152-B — activation-aggregate: suppression migrata in SQL', () => {
  const src = read(ROUTES.activationAggregate);
  const stripped = stripLineComments(src);

  it('non definisce safeCount() come funzione TS', () => {
    expect(stripped).not.toContain('function safeCount');
    expect(stripped).not.toContain('safeCount(');
  });

  it('non dichiara SAFE_AGGREGATION_THRESHOLD come costante TS', () => {
    expect(stripped).not.toContain('const SAFE_AGGREGATION_THRESHOLD = 10');
  });

  it('legge la suppression dal risultato SQL (total_engagements_suppressed)', () => {
    expect(src).toContain('total_engagements_suppressed');
  });

  it('chiama fn_company_activation_summary via rpc()', () => {
    expect(stripped).toContain("rpc('fn_company_activation_summary'");
  });

  it('usa getSupabaseServerClient', () => {
    expect(stripped).toContain('getSupabaseServerClient');
  });

  it('mantiene participation_summary nella response', () => {
    expect(src).toContain('participation_summary');
  });

  it('mantiene pillar_breakdown nella response', () => {
    expect(src).toContain('pillar_breakdown');
  });

  it('mantiene suppression_reason nella response (backward compat)', () => {
    expect(src).toContain('suppression_reason');
    expect(src).toContain('privacy_threshold');
  });

  it('mantiene suppression_threshold nella response (backward compat)', () => {
    expect(src).toContain('suppression_threshold');
  });
});

// ── (e) evidence-archive: initiative_name_raw mai restituito direttamente ─────

describe('B152-B — evidence-archive: initiative_name_raw non nel client response', () => {
  const src = read(ROUTES.evidenceArchive);
  const stripped = stripLineComments(src);

  it('initiative_name_raw viene letto ma passato attraverso buildSafeName', () => {
    expect(src).toContain('initiative_name_raw');
    expect(src).toContain('buildSafeName');
  });

  it('return finale non include initiative_name_raw come chiave JSON', () => {
    const returnSection = stripped.slice(stripped.lastIndexOf('return NextResponse.json'));
    expect(returnSection).not.toContain('initiative_name_raw');
  });

  it('oggetti initiatives.map non includono initiative_name_raw come campo', () => {
    const mapIdx    = stripped.lastIndexOf('.map((rec, idx)');
    const returnIdx = stripped.lastIndexOf('return NextResponse.json');
    const mapSection = stripped.slice(mapIdx, returnIdx);
    expect(mapSection).not.toContain("initiative_name_raw:");
  });
});

// ── (f) live-eligibility: gestione sicura del caso multi-periodo ──────────────

describe('B152-B — live-eligibility: nessun blind .maybeSingle() su multi-row', () => {
  const src = read(ROUTES.liveEligibility);

  it('usa order("reporting_period") quando period è assente', () => {
    expect(src).toContain("order('reporting_period'");
  });

  it('usa limit(1) quando period è assente per evitare multi-row maybeSingle()', () => {
    expect(src).toContain('limit(1)');
  });

  it('usa eq("reporting_period", period) quando period è presente', () => {
    expect(src).toContain("eq('reporting_period', period)");
  });

  it('usa getSupabaseServerClient', () => {
    expect(stripLineComments(src)).toContain('getSupabaseServerClient');
  });

  it('gestisce il caso row === null con empty response (nessun crash)', () => {
    expect(src).toContain('if (!row)');
  });
});

// ── (g) Auth guards intatti su tutte le route migrate ─────────────────────────

describe('B152-B — auth guards intatti', () => {
  for (const [name, path] of Object.entries(ROUTES)) {
    it(`${name}: usa requireCompanyUser + isKoraAuthError`, () => {
      const src = read(path);
      expect(src).toContain('requireCompanyUser');
      expect(src).toContain('isKoraAuthError');
    });
  }
});

// ── (h) workers/aggregate: mapping total_workers → total ─────────────────────

describe('B152-B — workers/aggregate: mapping campi dalla funzione', () => {
  const src = read(ROUTES.aggregate);
  const stripped = stripLineComments(src);

  it('legge total_workers dalla funzione', () => {
    expect(stripped).toContain("'total_workers'");
  });

  it('mappa total_workers → total nella response', () => {
    const responseSection = stripped.slice(stripped.lastIndexOf('return NextResponse.json'));
    expect(responseSection).toContain('total:');
  });

  it('mappa coverage_pct → coveragePct nella response', () => {
    const responseSection = stripped.slice(stripped.lastIndexOf('return NextResponse.json'));
    expect(responseSection).toContain('coveragePct:');
    expect(stripped).toContain("'coverage_pct'");
  });
});
