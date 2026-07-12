/**
 * Partner Activity Catalog 01 — initiatives-vs-activities boundary guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: a
 * Partner Activity is NOT a KORA Space initiative, never feeds KORA
 * Contribution directly, and is intended (not yet implemented) to feed
 * KORA Index aggregate activation signals. See
 * docs/PARTNER_ACTIVITY_CATALOG_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getPartnerActivities,
  getPartnerActivityById,
  getPartnerActivityCatalogSummary,
} from '@/lib/partner-activities/catalog';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const CATALOG_PAGE = 'app/partner/activity-catalog/page.tsx';
const DETAIL_PAGE = 'app/partner/activity-catalog/[activityId]/page.tsx';
const MODEL_FILE = 'lib/partner-activities/catalog.ts';

describe('Partner Activity Catalog 01 — routes and model file exist', () => {
  it(`${CATALOG_PAGE} exists`, () => {
    expect(() => readSource(CATALOG_PAGE)).not.toThrow();
  });

  it(`${DETAIL_PAGE} exists`, () => {
    expect(() => readSource(DETAIL_PAGE)).not.toThrow();
  });

  it(`${MODEL_FILE} exists`, () => {
    expect(() => readSource(MODEL_FILE)).not.toThrow();
  });
});

describe('Partner Activity Catalog 01 — uses Activity/Attività language, not Initiative/Iniziativa', () => {
  const source = readSource(CATALOG_PAGE);

  it('the page title and section labels use "Attività"/"Catalogo", not "Iniziativa" for catalog objects', () => {
    expect(source).toMatch(/Catalogo Attività/);
    expect(source).toMatch(/Attività standard/);
  });

  it('the static model never uses "initiative" naming for the entity or its exports', () => {
    const model = readSource(MODEL_FILE);
    expect(model).not.toMatch(/\bPartnerInitiative\b/);
    expect(model).not.toMatch(/interface\s+\w*Initiative\w*/);
  });
});

describe('Partner Activity Catalog 01 — distinguishes itself from Proposte Partner / KORA Space Initiatives', () => {
  const source = readSource(CATALOG_PAGE);

  it('explicitly names "Proposte Partner" as the separate lane', () => {
    expect(source).toMatch(/Proposte Partner/);
  });

  it('explicitly states this catalog is distinct from KORA Space initiatives', () => {
    expect(source).toMatch(/distinte/);
    expect(source).toMatch(/iniziative KORA Space/);
  });
});

describe('Partner Activity Catalog 01 — states the output boundary (KORA Index, not Contribution)', () => {
  const catalogSource = readSource(CATALOG_PAGE);
  const detailSource = readSource(DETAIL_PAGE);

  it('catalog page states activities feed future KORA Index aggregate signals', () => {
    expect(catalogSource).toMatch(/alimentano in futuro\s*\n?\s*segnali aggregati KORA Index/);
  });

  it('catalog page states activities never feed KORA Contribution directly', () => {
    expect(catalogSource).toMatch(/non\s*\n?\s*alimentano mai direttamente KORA Contribution/);
  });

  it('detail page repeats the same Contribution boundary', () => {
    expect(detailSource).toMatch(/Le attività non alimentano mai direttamente KORA Contribution/);
    expect(detailSource).toMatch(/solo le iniziative KORA Space lo fanno/);
  });
});

describe('Partner Activity Catalog 01 — includes fiscal/welfare category and pillar mapping', () => {
  const catalogSource = readSource(CATALOG_PAGE);
  const detailSource = readSource(DETAIL_PAGE);

  it('catalog page renders fiscal category per activity', () => {
    expect(catalogSource).toMatch(/FISCAL_CATEGORY_LABELS/);
  });

  it('catalog page groups activities by fiscal category', () => {
    expect(catalogSource).toMatch(/Attività per categoria fiscale/);
  });

  it('detail page shows pillar mapping (primary + secondary)', () => {
    expect(detailSource).toMatch(/Mappatura pilastri/);
    expect(detailSource).toMatch(/primario/);
    expect(detailSource).toMatch(/secondario/);
  });
});

describe('Partner Activity Catalog 01 — fiscal review status present, no final legal/tax approval claimed', () => {
  const catalogSource = readSource(CATALOG_PAGE);
  const detailSource = readSource(DETAIL_PAGE);

  it('renders fiscal review status', () => {
    expect(catalogSource).toMatch(/Revisione fiscale/);
    expect(detailSource).toMatch(/Stato revisione fiscale/);
  });

  it('explicitly states fiscal category is proposed metadata, not legal/tax approval', () => {
    expect(catalogSource).toMatch(/metadato proposto, non un&apos;approvazione fiscale o legale/);
    expect(detailSource).toMatch(/metadato proposto, non un&apos;approvazione fiscale, payroll o legale/);
  });

  it('does not claim any fiscal category has been approved', () => {
    expect(catalogSource).not.toMatch(/categoria fiscale approvata/i);
    expect(detailSource).not.toMatch(/categoria fiscale approvata/i);
  });
});

describe('Partner Activity Catalog 01 — includes the future worker action model', () => {
  const catalogSource = readSource(CATALOG_PAGE);
  const detailSource = readSource(DETAIL_PAGE);

  it('catalog page renders future worker action per activity', () => {
    expect(catalogSource).toMatch(/Azione futura worker/);
    expect(catalogSource).toMatch(/FUTURE_WORKER_ACTION_LABELS/);
  });

  it('detail page states the future worker action explicitly', () => {
    expect(detailSource).toMatch(/Azione futura del worker/);
  });

  it('the model defines book/apply/request_contact/redeem_voucher/info_only as the future worker action set', () => {
    const model = readSource(MODEL_FILE);
    expect(model).toMatch(/'book'/);
    expect(model).toMatch(/'apply'/);
    expect(model).toMatch(/'request_contact'/);
    expect(model).toMatch(/'redeem_voucher'/);
    expect(model).toMatch(/'info_only'/);
  });
});

describe('Partner Activity Catalog 01 — no worker-level data anywhere in the catalog', () => {
  const pages = [CATALOG_PAGE, DETAIL_PAGE, MODEL_FILE];
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
    for (const page of [CATALOG_PAGE, DETAIL_PAGE]) {
      const source = readSource(page);
      expect(source).not.toMatch(/interface\s+Mock\w*(Booking|Scan|Activation)/);
    }
  });
});

describe('Partner Activity Catalog 01 — states partner named visibility is worker-initiated only, company stays aggregate-only', () => {
  const catalogSource = readSource(CATALOG_PAGE);
  const detailSource = readSource(DETAIL_PAGE);

  it('catalog page states named visibility is worker-initiated', () => {
    expect(catalogSource).toMatch(/dopo\s*\n?\s*un&apos;azione volontaria del worker/);
    expect(catalogSource).toMatch(/L&apos;azienda riceve sempre e solo segnali aggregati/);
  });

  it('detail page repeats the same privacy boundary', () => {
    expect(detailSource).toMatch(/Il partner vedrà un nominativo solo dopo un&apos;azione/);
    expect(detailSource).toMatch(/L&apos;azienda riceve sempre e solo segnali aggregati/);
  });
});

describe('Partner Activity Catalog 01 — static model does not import Supabase/DB/RPC/env helpers', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  for (const file of [MODEL_FILE, CATALOG_PAGE, DETAIL_PAGE]) {
    it(`${file} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
      const source = readSource(file);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${file} must not match ${pattern}`).toBe(false);
      }
    });
  }
});

describe('Partner Activity Catalog 01 — no feature flag hardcoded', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  for (const file of [CATALOG_PAGE, DETAIL_PAGE]) {
    it(`${file} does not hardcode any KORA Link feature flag to true`, () => {
      const source = readSource(file);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});

describe('Partner Activity Catalog 01 — the static model is a well-formed, pure module', () => {
  it('getPartnerActivities returns a non-empty array', () => {
    expect(getPartnerActivities().length).toBeGreaterThan(0);
  });

  it('getPartnerActivityById resolves a known id and returns undefined for an unknown one', () => {
    const first = getPartnerActivities()[0];
    expect(getPartnerActivityById(first.activityId)).toEqual(first);
    expect(getPartnerActivityById('does-not-exist')).toBeUndefined();
  });

  it('getPartnerActivityCatalogSummary derives counts consistent with the underlying array', () => {
    const activities = getPartnerActivities();
    const summary = getPartnerActivityCatalogSummary();
    expect(summary.totalActivities).toBe(activities.length);
    const sumByCategory = Object.values(summary.byFiscalCategory).reduce((a, b) => a + b, 0);
    expect(sumByCategory).toBe(activities.length);
  });

  it('no activity has a contributionEligibility value implying direct Contribution feed', () => {
    for (const a of getPartnerActivities()) {
      expect(['not_contribution_source', 'may_be_packaged_into_initiative']).toContain(a.contributionEligibility);
    }
  });
});

describe('Partner Activity Catalog 01 — no DPO/CTO/fiscal/legal decision is marked resolved', () => {
  for (const file of [CATALOG_PAGE, DETAIL_PAGE]) {
    it(`${file} does not claim any pending decision has been made`, () => {
      const source = readSource(file);
      expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
      expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
    });
  }
});

describe('Partner Activity Catalog 01 — /partner/initiatives still clarifies it is Proposte Partner, distinct from the catalog', () => {
  const source = readSource('app/partner/initiatives/page.tsx');

  it('still describes itself as Partner proposals', () => {
    expect(source).toMatch(/Proposte Partner/);
    expect(source).toMatch(/non iniziative KORA Space già\s*\n?\s*pubblicate/);
  });

  it('still explicitly distinguishes itself from the Activity Catalog', () => {
    expect(source).toMatch(/non il futuro catalogo di attività partner/);
  });

  it('now cross-links to the Activity Catalog as a separate lane', () => {
    expect(source).toContain('href="/partner/activity-catalog"');
  });
});

describe('Partner Activity Catalog 01 — navigation registers the catalog under Partner nav', () => {
  it('Sidebar.tsx marks /partner/activity-catalog as preview', () => {
    const source = readSource('components/layout/Sidebar.tsx');
    expect(source).toMatch(/'\/partner\/activity-catalog',[^}]*preview: true/);
  });
});

describe('Partner Activity Catalog 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
  it('034/035/036 are still readable under supabase/proposed/', () => {
    for (const file of [
      'supabase/proposed/034_kora_link_schema.sql',
      'supabase/proposed/035_kora_link_rls.sql',
      'supabase/proposed/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
  });

  it('worker self-select on link_assignments remains commented out (inactive)', () => {
    const rls = readSource('supabase/proposed/035_kora_link_rls.sql');
    expect(rls).toMatch(/Worker SELECT self-only — BLOCKED until activation function is ready/);
    expect(rls).toMatch(/-- CREATE POLICY "kl_assignments_worker_self_select"/);
  });

  it('no direct company-facing table SELECT policy exists or is planned', () => {
    const rls = readSource('supabase/proposed/035_kora_link_rls.sql');
    expect(rls).toMatch(/No\s*\n?-- direct company table SELECT policy exists here or is planned/);
  });
});
