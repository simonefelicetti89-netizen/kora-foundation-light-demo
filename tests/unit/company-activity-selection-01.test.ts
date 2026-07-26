/**
 * Company Activity Selection 01 — Phase 2 enablement shell guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: the
 * company activity-selection shell previews five enablement modes for the
 * Partner Activity Catalog (Phase 2 Activation Intelligence), stays
 * distinct from Phase 1 raw-data intelligence and from KORA Space /
 * Contribution Initiatives, implements no persistence, no budget
 * enforcement, no eligibility logic, and no worker booking, and resolves
 * no DPO/CTO/fiscal/legal decision. See docs/COMPANY_ACTIVITY_SELECTION_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const SELECTION_PAGE = 'app/company/activity-selection/page.tsx';
const PLAN_PAGE = 'app/company/activity-selection/plan/page.tsx';

describe('Company Activity Selection 01 — routes exist and are readable', () => {
  it(`${SELECTION_PAGE} exists`, () => {
    expect(() => readSource(SELECTION_PAGE)).not.toThrow();
  });

  it(`${PLAN_PAGE} exists`, () => {
    expect(() => readSource(PLAN_PAGE)).not.toThrow();
  });
});

describe('Company Activity Selection 01 — frames itself as Phase 2, distinct from Phase 1', () => {
  const source = readSource(SELECTION_PAGE);

  it('frames the page as Phase 2 Activation Intelligence', () => {
    expect(source).toMatch(/Fase 2 Activation Intelligence/);
    expect(source).toMatch(/Fase 2 \(Activation Intelligence\)/);
  });

  it('explicitly separates itself from Phase 1 raw data upload/analysis', () => {
    expect(source).toMatch(/distinta dalla Fase 1 \(caricamento e analisi\s*\n?\s*dati\s*\n?\s*grezzi, KORA Index attuale\)/);
  });
});

describe('Company Activity Selection 01 — uses Activity language, distinguishes from KORA Space/Contribution Initiatives', () => {
  const source = readSource(SELECTION_PAGE);

  it('describes Partner Activities, not initiatives, for the catalog objects', () => {
    expect(source).toMatch(/Attività Partner standard/);
    expect(source).toMatch(/non iniziative/);
  });

  it('explicitly distinguishes itself from KORA Space/Contribution initiatives', () => {
    expect(source).toMatch(/distinta dalle iniziative KORA Space\/Contribution/);
  });
});

describe('Company Activity Selection 01 — includes all five company selection modes', () => {
  const source = readSource(SELECTION_PAGE);

  it('mode A: fiscal/welfare category', () => {
    expect(source).toMatch(/Per categoria fiscale\/welfare/);
  });

  it('mode B: KORA pillar', () => {
    expect(source).toMatch(/Per pilastro KORA/);
  });

  it('mode C: partner', () => {
    expect(source).toMatch(/Per partner/);
  });

  it('mode D: specific activity', () => {
    expect(source).toMatch(/Per attività specifica/);
  });

  it('mode E: free worker choice', () => {
    expect(source).toMatch(/Scelta libera worker entro budget/);
  });
});

describe('Company Activity Selection 01 — reuses the static Partner Activity model', () => {
  const source = readSource(SELECTION_PAGE);

  it('imports from lib/partner-activities/catalog', () => {
    expect(source).toMatch(/from '@\/lib\/partner-activities\/catalog'/);
    expect(source).toMatch(/getPartnerActivities/);
    expect(source).toMatch(/getPartnerActivityCatalogSummary/);
  });

  it('the plan page also reuses the static model', () => {
    const plan = readSource(PLAN_PAGE);
    expect(plan).toMatch(/from '@\/lib\/partner-activities\/catalog'/);
    expect(plan).toMatch(/getPartnerActivities/);
  });
});

describe('Company Activity Selection 01 — includes fiscal category and pillar mapping', () => {
  const source = readSource(SELECTION_PAGE);

  it('renders fiscal categories via FISCAL_CATEGORY_LABELS', () => {
    expect(source).toMatch(/FISCAL_CATEGORY_LABELS/);
  });

  it('renders pillar tags for all five pillars', () => {
    expect(source).toMatch(/ALL_PILLARS/);
    expect(source).toMatch(/'LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'/);
  });
});

describe('Company Activity Selection 01 — includes a budget/perimeter preview', () => {
  const source = readSource(SELECTION_PAGE);

  it('renders a budget/perimeter preview section', () => {
    expect(source).toMatch(/Anteprima budget\/perimetro/);
    expect(source).toMatch(/Budget annuo indicativo/);
  });

  it('explicitly states no enforcement is implemented', () => {
    expect(source).toMatch(/Nessuna enforcement di budget è implementata/);
  });
});

describe('Company Activity Selection 01 — KORA Index and Phase boundary statements', () => {
  const source = readSource(SELECTION_PAGE);

  it('states activity engagement may feed future KORA Index aggregate signals', () => {
    expect(source).toMatch(/potrà in futuro diventare un segnale aggregato per il KORA Index/);
  });

  it('states live KORA Index computation is not changed', () => {
    expect(source).toMatch(/Questo sprint non modifica il calcolo live\s*\n?\s*del KORA Index/);
  });

  it('states Phase 2 signals are distinct from Phase 1 uploaded-data signals', () => {
    expect(source).toMatch(/distinto dai segnali Fase 1 derivati dai dati caricati/);
  });
});

describe('Company Activity Selection 01 — Contribution boundary', () => {
  const source = readSource(SELECTION_PAGE);

  it('states activities do not directly feed KORA Contribution', () => {
    expect(source).toMatch(/Le Attività Partner non alimentano mai direttamente KORA Contribution/);
  });

  it('states packaging into an initiative requires a separate proposal/review/adoption path', () => {
    expect(source).toMatch(/percorso separato di proposta, revisione e adozione/);
  });
});

describe('Company Activity Selection 01 — no worker-level data anywhere on either page', () => {
  const pages = [SELECTION_PAGE, PLAN_PAGE];
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

  for (const page of pages) {
    it(`${page} contains no worker name, email, worker ID, or tag UID`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${page} must not match ${pattern}`).toBe(false);
      }
    });
  }

  it('renders no individual booking, scan, or activation event data', () => {
    for (const page of pages) {
      const source = readSource(page);
      expect(source).not.toMatch(/interface\s+Mock\w*(Booking|Scan|Activation)/);
    }
  });
});

describe('Company Activity Selection 01 — privacy invariants', () => {
  const source = readSource(SELECTION_PAGE);

  it('states company output remains aggregate-only', () => {
    expect(source).toMatch(/L&apos;azienda riceve sempre e solo output aggregati/);
  });

  it('states partner named visibility is worker-initiated only', () => {
    expect(source).toMatch(/Il partner vede nominativi solo dopo prenotazione, candidatura, richiesta di\s*\n?\s*contatto o condivisione di profilo avviate volontariamente dal worker/);
  });

  it('the plan page repeats the same privacy boundary', () => {
    const plan = readSource(PLAN_PAGE);
    expect(plan).toMatch(/L&apos;azienda riceve sempre e solo output aggregati/);
  });
});

describe('Company Activity Selection 01 — does not claim final fiscal/legal approval', () => {
  const source = readSource(SELECTION_PAGE);

  it('states fiscal category is proposed metadata, validation stays with advisors', () => {
    expect(source).toMatch(/La categoria fiscale\/welfare è metadato proposto/);
    expect(source).toMatch(/payroll, consulenti fiscali e legali dell&apos;azienda/);
  });

  it('does not claim any fiscal category has been approved', () => {
    expect(source).not.toMatch(/categoria fiscale approvata/i);
  });
});

describe('Company Activity Selection 01 — no Supabase, DB helper, RPC, or env secret access', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  for (const page of [SELECTION_PAGE, PLAN_PAGE]) {
    it(`${page} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${page} must not match ${pattern}`).toBe(false);
      }
    });
  }
});

describe('Company Activity Selection 01 — no feature flag hardcoded', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  for (const page of [SELECTION_PAGE, PLAN_PAGE]) {
    it(`${page} does not hardcode any KORA Link feature flag to true`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});

describe('Company Activity Selection 01 — no DPO/CTO/fiscal/legal decision is marked resolved', () => {
  for (const page of [SELECTION_PAGE, PLAN_PAGE]) {
    it(`${page} does not claim any pending decision has been made`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
      expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
    });
  }
});

describe('Company Activity Selection 01 — company navigation includes the new page', () => {
  it('Sidebar.tsx marks /company/activity-selection as preview', () => {
    const source = readSource('components/layout/Sidebar.tsx');
    expect(source).toMatch(/'\/company\/activity-selection',[^}]*preview: true/);
  });
});

describe('Company Activity Selection 01 — cross-links are present', () => {
  const source = readSource(SELECTION_PAGE);

  it('links to /admin/kora-activation-layer', () => {
    expect(source).toContain('href="/admin/kora-activation-layer"');
  });

  it('links to /partner/activity-catalog', () => {
    expect(source).toContain('href="/partner/activity-catalog"');
  });

  it('links to /company/kora-index', () => {
    expect(source).toContain('href="/company/kora-index"');
  });

  it('links to /company/activation', () => {
    expect(source).toContain('href="/company/activation"');
  });

  it('links to /company/contribution as contrast, with distinct-pipeline wording', () => {
    expect(source).toContain('href="/company/contribution"');
    expect(source).toMatch(/per contrasto, pipeline separata/);
  });

  it('links to the example plan page', () => {
    expect(source).toContain('href="/company/activity-selection/plan"');
  });

  it('the plan page links back to the selection page', () => {
    const plan = readSource(PLAN_PAGE);
    expect(plan).toContain('href="/company/activity-selection"');
  });

  it('/admin/kora-activation-layer links to the new company page', () => {
    const layer = readSource('app/admin/kora-activation-layer/page.tsx');
    expect(layer).toContain('href="/company/activity-selection"');
  });
});

describe('Company Activity Selection 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
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

describe('Company Activity Selection 01 — KORA Index engine remains untouched', () => {
  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });
});
