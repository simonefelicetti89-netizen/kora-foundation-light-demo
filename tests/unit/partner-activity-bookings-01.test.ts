/**
 * Partner Activity Bookings 01 — worker-initiated request shell guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: the
 * bookings shell previews what a partner would see AFTER a worker
 * voluntarily initiates a relationship (booking/application/contact/
 * voucher/info request) tied to a standard Partner Activity, stays
 * distinct from KORA Space / Contribution Initiatives, implements no real
 * persistence, no status mutation, no partner notification, and resolves
 * no DPO/CTO/fiscal/legal decision. See docs/PARTNER_ACTIVITY_BOOKINGS_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getPartnerActivityBookings,
  getPartnerActivityBookingById,
  getPartnerActivityBookingsSummary,
} from '@/lib/partner-activities/bookings';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const BOOKINGS_PAGE = 'app/partner/activity-bookings/page.tsx';
const DETAIL_PAGE = 'app/partner/activity-bookings/detail/page.tsx';
const MODEL_FILE = 'lib/partner-activities/bookings.ts';

describe('Partner Activity Bookings 01 — routes and model file exist', () => {
  it(`${BOOKINGS_PAGE} exists`, () => {
    expect(() => readSource(BOOKINGS_PAGE)).not.toThrow();
  });

  it(`${DETAIL_PAGE} exists`, () => {
    expect(() => readSource(DETAIL_PAGE)).not.toThrow();
  });

  it(`${MODEL_FILE} exists`, () => {
    expect(() => readSource(MODEL_FILE)).not.toThrow();
  });
});

describe('Partner Activity Bookings 01 — frames itself as Phase 2 Activation Intelligence', () => {
  const source = readSource(BOOKINGS_PAGE);

  it('frames the page as Phase 2', () => {
    expect(source).toMatch(/Fase 2 Activation Intelligence/);
  });

  it('separates itself from KORA Space / Contribution Initiatives', () => {
    expect(source).toMatch(/non\s*\n?\s*iniziative KORA Space, non iniziative Contribution/);
  });
});

describe('Partner Activity Bookings 01 — uses Activity language for standard partner bookings', () => {
  const model = readSource(MODEL_FILE);

  it('does not name the entity as an initiative', () => {
    expect(model).not.toMatch(/interface\s+\w*Initiative\w*/);
  });

  it('is explicitly scoped to Partner Activities, not KORA Space', () => {
    expect(model).toMatch(/This is NOT a KORA Space\s*\n\/\/ initiative/);
  });
});

describe('Partner Activity Bookings 01 — reuses the static Partner Activity model', () => {
  it(`${MODEL_FILE} imports from lib/partner-activities/catalog`, () => {
    const model = readSource(MODEL_FILE);
    expect(model).toMatch(/from '\.\/catalog'/);
    expect(model).toMatch(/getPartnerActivityById/);
  });

  it(`${BOOKINGS_PAGE} imports FISCAL_CATEGORY_LABELS from the catalog module`, () => {
    const source = readSource(BOOKINGS_PAGE);
    expect(source).toMatch(/from '@\/lib\/partner-activities\/catalog'/);
  });
});

describe('Partner Activity Bookings 01 — worker names appear only in worker-initiated context', () => {
  const source = readSource(BOOKINGS_PAGE);

  it('states names appear only because the worker initiated the relationship', () => {
    expect(source).toMatch(/I nominativi compaiono qui solo perché il\s*\n?\s*lavoratore ha scelto di avviare la relazione/);
  });

  it('mock worker names are distinct from the /partner/relationships mock set', () => {
    const model = readSource(MODEL_FILE);
    const relationshipsNames = ['Giulia Bianchi', 'Marco Ferrari', 'Elena Conti', 'Davide Romano', 'Sara Greco'];
    for (const name of relationshipsNames) {
      expect(model, `${MODEL_FILE} must not reuse relationships.tsx mock name "${name}"`).not.toContain(name);
    }
  });
});

describe('Partner Activity Bookings 01 — worker action is the consent/visibility basis', () => {
  const source = readSource(BOOKINGS_PAGE);

  it('states worker-initiated action as the visibility basis', () => {
    expect(source).toMatch(/perché il lavoratore ha avviato una prenotazione, candidatura, richiesta di\s*\n?\s*contatto, riscatto voucher, o richiesta informazioni/);
  });

  it('states browsing alone is not visible to the partner', () => {
    expect(source).toMatch(/La sola navigazione \(Worker Activity Discovery\) non è mai visibile al partner/);
  });

  it('states partner can use shared data only to fulfil the request', () => {
    expect(source).toMatch(/Il partner può usare i campi condivisi solo per evadere quella specifica richiesta/);
  });
});

describe('Partner Activity Bookings 01 — company aggregate-only boundary', () => {
  const source = readSource(BOOKINGS_PAGE);

  it('states company output remains aggregate-only', () => {
    expect(source).toMatch(/L&apos;azienda riceve solo output aggregati/);
  });

  it('states employer never receives named booking/request/contact/voucher details', () => {
    expect(source).toMatch(/L&apos;azienda non riceve mai i dettagli nominativi di queste richieste/);
  });

  it('lists what company output would never include', () => {
    expect(source).toMatch(/Non includerebbe mai/);
    expect(source).toMatch(/Nominativi dei lavoratori/);
    expect(source).toMatch(/Riscatti voucher individuali/);
  });
});

describe('Partner Activity Bookings 01 — includes all five worker action types', () => {
  const model = readSource(MODEL_FILE);

  it('booking, application, contact_request, voucher_redemption, info_request', () => {
    expect(model).toMatch(/'booking'\s*\|\s*'application'\s*\|\s*'contact_request'\s*\|\s*'voucher_redemption'\s*\|\s*'info_request'/);
  });

  it('all five action types are represented in the mock data', () => {
    const actions = new Set(getPartnerActivityBookings().map((b) => b.workerActionType));
    expect(actions.size).toBe(5);
  });
});

describe('Partner Activity Bookings 01 — includes the six-status workflow preview', () => {
  const model = readSource(MODEL_FILE);

  it('new, confirmed, completed, cancelled, withdrawn, follow_up_needed', () => {
    expect(model).toMatch(/'new'\s*\|\s*'confirmed'\s*\|\s*'completed'\s*\|\s*'cancelled'\s*\|\s*'withdrawn'\s*\|\s*'follow_up_needed'/);
  });

  it(`${BOOKINGS_PAGE} renders all six statuses as a preview`, () => {
    const source = readSource(BOOKINGS_PAGE);
    expect(source).toMatch(/Anteprima flusso di stato \(non funzionale\)/);
    expect(source).toMatch(/'new', 'confirmed', 'completed', 'cancelled', 'withdrawn', 'follow_up_needed'/);
  });
});

describe('Partner Activity Bookings 01 — includes fiscal category and pillar mapping', () => {
  it(`${BOOKINGS_PAGE} renders fiscal category per booking`, () => {
    const source = readSource(BOOKINGS_PAGE);
    expect(source).toMatch(/FISCAL_CATEGORY_LABELS\[b\.fiscalCategory\]/);
  });

  it(`${DETAIL_PAGE} shows pillar and fiscal category`, () => {
    const source = readSource(DETAIL_PAGE);
    expect(source).toMatch(/booking\.primaryPillar/);
    expect(source).toMatch(/FISCAL_CATEGORY_LABELS\[booking\.fiscalCategory\]/);
  });
});

describe('Partner Activity Bookings 01 — states future KORA Index and Contribution boundaries', () => {
  const source = readSource(BOOKINGS_PAGE);

  it('states completed/fulfilled engagement may feed future aggregate KORA Index signals', () => {
    expect(source).toMatch(/potrà in futuro diventare un segnale aggregato per il KORA\s*\n?\s*Index/);
  });

  it('states live KORA Index computation is not changed', () => {
    expect(source).toMatch(/Questo sprint non modifica il calcolo live del KORA Index/);
  });

  it('states bookings do not directly feed KORA Contribution', () => {
    expect(source).toMatch(/Le prenotazioni di Attività Partner non alimentano mai direttamente KORA Contribution/);
  });
});

describe('Partner Activity Bookings 01 — does not render employer-visible individual outputs', () => {
  it('the page never exposes company-only controls or an employer audience label', () => {
    const source = readSource(BOOKINGS_PAGE);
    expect(source).not.toMatch(/requireCompanyUser/);
    expect(source).not.toMatch(/COMPANY_ADMIN/);
  });
});

describe('Partner Activity Bookings 01 — no Supabase, DB helper, RPC, or env secret access', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  for (const file of [MODEL_FILE, BOOKINGS_PAGE, DETAIL_PAGE]) {
    it(`${file} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
      const source = readSource(file);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${file} must not match ${pattern}`).toBe(false);
      }
    });
  }
});

describe('Partner Activity Bookings 01 — no fetch, server action, mutation, or status-update handler', () => {
  for (const page of [BOOKINGS_PAGE, DETAIL_PAGE]) {
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

describe('Partner Activity Bookings 01 — no feature flag hardcoded', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  for (const page of [BOOKINGS_PAGE, DETAIL_PAGE]) {
    it(`${page} does not hardcode any KORA Link feature flag to true`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});

describe('Partner Activity Bookings 01 — no DPO/CTO/fiscal/legal decision is marked resolved', () => {
  for (const page of [BOOKINGS_PAGE, DETAIL_PAGE]) {
    it(`${page} does not claim any pending decision has been made`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
      expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
    });
  }
});

describe('Partner Activity Bookings 01 — navigation includes the new page', () => {
  it('Sidebar.tsx marks /partner/activity-bookings as preview', () => {
    const source = readSource('components/layout/Sidebar.tsx');
    expect(source).toMatch(/'\/partner\/activity-bookings',[^}]*preview: true/);
  });
});

describe('Partner Activity Bookings 01 — cross-links are present', () => {
  const source = readSource(BOOKINGS_PAGE);

  it('links to /partner/activity-catalog, /worker/activity-discovery, /admin/kora-activation-layer, /partner/privacy-boundary', () => {
    expect(source).toContain('href="/partner/activity-catalog"');
    expect(source).toContain('href="/worker/activity-discovery"');
    expect(source).toContain('href="/admin/kora-activation-layer"');
    expect(source).toContain('href="/partner/privacy-boundary"');
  });

  it('links to the detail preview, and the detail page links back', () => {
    expect(source).toContain('href="/partner/activity-bookings/detail"');
    const detail = readSource(DETAIL_PAGE);
    expect(detail).toContain('href="/partner/activity-bookings"');
  });

  it('/partner/activity-catalog links to /partner/activity-bookings', () => {
    const catalog = readSource('app/partner/activity-catalog/page.tsx');
    expect(catalog).toContain('href="/partner/activity-bookings"');
  });

  it('/partner/relationships links to /partner/activity-bookings', () => {
    const relationships = readSource('app/partner/relationships/page.tsx');
    expect(relationships).toContain('href="/partner/activity-bookings"');
  });
});

describe('Partner Activity Bookings 01 — no sensitive mock worker details', () => {
  const model = readSource(MODEL_FILE);
  // Scan only the mock data block, not header/doc comments — the module's
  // own doc comment legitimately states "no health, no union/political
  // data" as a safety declaration, which would otherwise false-positive
  // against a naive whole-file scan (same class of issue handled in
  // kora-link-privacy-invariants.test.ts for prose-vs-code distinction).
  const dataStart = model.indexOf('export const MOCK_PARTNER_ACTIVITY_BOOKINGS');
  const dataEnd = model.indexOf('\n];', dataStart) + 3;
  const dataBlock = model.slice(dataStart, dataEnd);

  const forbiddenTerms = [
    /diagnos/i, /malatt/i, /terapia/i, /cartella clinica/i, /sindacal/i, /partito/i, /politic/i,
    /religion/i, /orientamento sessuale/i, /codice fiscale/i, /iban/i,
  ];

  it('the mock data block was located correctly', () => {
    expect(dataStart).toBeGreaterThan(-1);
    expect(dataEnd).toBeGreaterThan(dataStart);
  });

  it('contains no health, union/political, or sensitive-identifier terms in the actual data', () => {
    for (const pattern of forbiddenTerms) {
      expect(pattern.test(dataBlock), `must not match ${pattern}`).toBe(false);
    }
  });

  it('email fields use an explicitly fictitious example domain', () => {
    const emails = dataBlock.match(/[\w.]+@[\w.-]+\.\w+/g) ?? [];
    expect(emails.length).toBeGreaterThan(0);
    for (const email of emails) {
      expect(email).toMatch(/example-worker\.test$/);
    }
  });
});

describe('Partner Activity Bookings 01 — the static model is a well-formed, pure module', () => {
  it('getPartnerActivityBookings returns a non-empty array, all marked previewOnly', () => {
    const bookings = getPartnerActivityBookings();
    expect(bookings.length).toBeGreaterThan(0);
    for (const b of bookings) {
      expect(b.previewOnly).toBe(true);
      expect(b.companyVisibility).toBe('aggregate_only');
      expect(b.consentBasis).toBe('worker_initiated');
    }
  });

  it('getPartnerActivityBookingById resolves a known id and returns undefined for an unknown one', () => {
    const first = getPartnerActivityBookings()[0];
    expect(getPartnerActivityBookingById(first.bookingId)).toEqual(first);
    expect(getPartnerActivityBookingById('does-not-exist')).toBeUndefined();
  });

  it('getPartnerActivityBookingsSummary derives counts consistent with the underlying array', () => {
    const bookings = getPartnerActivityBookings();
    const summary = getPartnerActivityBookingsSummary();
    expect(summary.totalBookings).toBe(bookings.length);
    const sumByStatus = Object.values(summary.byStatus).reduce((a, b) => a + b, 0);
    expect(sumByStatus).toBe(bookings.length);
  });
});

describe('Partner Activity Bookings 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
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

describe('Partner Activity Bookings 01 — KORA Index engine and commons pipeline remain untouched', () => {
  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });

  it('lib/commons/types.ts still defines CommonsPost unchanged in shape', () => {
    const commons = readSource('lib/commons/types.ts');
    expect(commons).toMatch(/export interface CommonsPost/);
  });

  it('lib/commons/booking-types.ts (KORA Space bookings) is untouched by this sprint', () => {
    const bookingTypes = readSource('lib/commons/booking-types.ts');
    expect(bookingTypes).toMatch(/export interface CommonsBooking/);
  });
});
