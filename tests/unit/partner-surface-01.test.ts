/**
 * Partner Surface — worker-initiated visibility model guards (PARTNER-SURFACE-01).
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the product principle:
 * KORA hides the worker from the EMPLOYER, not from every stakeholder.
 * A partner may see name/surname only inside a worker-initiated relationship
 * view; the company always stays aggregate-only. See docs/PARTNER_SURFACE_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const PARTNER_SURFACE_PAGES = [
  'app/partner/initiatives/page.tsx',
  'app/partner/relationships/page.tsx',
  'app/partner/aggregate-signals/page.tsx',
  'app/partner/privacy-boundary/page.tsx',
];

describe('Partner surface 01 — all four route files exist and are readable', () => {
  for (const page of PARTNER_SURFACE_PAGES) {
    it(`${page} exists`, () => {
      expect(() => readSource(page)).not.toThrow();
    });
  }
});

describe('Partner surface 01 — no new page touches Supabase, DB helpers, RPC, or env secrets', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  for (const page of PARTNER_SURFACE_PAGES) {
    it(`${page} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${page} must not match ${pattern}`).toBe(false);
      }
    });
  }
});

describe('Partner surface 01 — no new page hardcodes a KORA Link feature flag to true', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  for (const page of PARTNER_SURFACE_PAGES) {
    it(`${page} does not hardcode any feature flag to true`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});

describe('Partner surface 01 — worker names appear only in the worker-initiated relationships view', () => {
  const relationshipsSource = readSource('app/partner/relationships/page.tsx');
  // Fictitious mock names used to model worker-initiated relationships.
  const mockNames = ['Giulia Bianchi', 'Marco Ferrari', 'Elena Conti', 'Davide Romano', 'Sara Greco'];

  it('relationships page contains the mock worker names, scoped to relationship rows', () => {
    for (const name of mockNames) {
      expect(relationshipsSource).toContain(name);
    }
    // Names must be adjacent to relationship-type context, not floating in isolation.
    expect(relationshipsSource).toMatch(/workerName: string/);
    expect(relationshipsSource).toMatch(/relationshipType: RelationshipType/);
  });

  it('relationships page explains why names are visible here (worker-initiated, not company-shared)', () => {
    expect(relationshipsSource).toMatch(/il lavoratore ha scelto volontariamente di avviare/);
    expect(relationshipsSource).toMatch(/Non condiviso con l&apos;azienda — solo aggregati/);
  });

  const otherPages = [
    'app/partner/initiatives/page.tsx',
    'app/partner/aggregate-signals/page.tsx',
    'app/partner/privacy-boundary/page.tsx',
  ];

  for (const page of otherPages) {
    it(`${page} never contains any of the relationship mock worker names`, () => {
      const source = readSource(page);
      for (const name of mockNames) {
        expect(source, `${page} must not contain worker name "${name}"`).not.toContain(name);
      }
    });
  }
});

describe('Partner surface 01 — aggregate-signals page contains no individual worker data of any kind', () => {
  const source = readSource('app/partner/aggregate-signals/page.tsx');

  it('contains no email-shaped strings, worker identifiers, or tag identifiers', () => {
    expect(source).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    expect(source).not.toMatch(/\bworkerId\s*[:=]/);
    expect(source).not.toMatch(/\bworker_id\s*[:=]/);
    expect(source).not.toMatch(/\btagUid\s*[:=]/);
    expect(source).not.toMatch(/\btag_uid\s*[:=]/);
  });

  it('contains no per-event or per-worker data array — only aggregate metric/percentage constants', () => {
    expect(source).not.toMatch(/interface\s+Mock\w*(Event|Worker|Scan|Activation)/);
    expect(source).not.toMatch(/workerName/);
  });

  it('explicitly states it holds no personally identifiable data, with the threshold-pending statement stated once in the banner', () => {
    expect(source).toMatch(/Questa vista non contiene dati personali identificativi/);
    expect(source).toMatch(/Soglia aggregazione in attesa di\s*\n?\s*decisione CTO\/DPO/);
    // The lower "Nessun dato individuale" panel must not re-state the threshold
    // sentence a second time — it should add specificity instead (polish sprint).
    const thresholdMentions = (source.match(/in attesa di\s*\n?\s*decisione CTO\/DPO/g) ?? []).length;
    expect(thresholdMentions).toBe(1);
  });

  it('states no names, no individual scans, no individual activations, explicitly and specifically', () => {
    expect(source).toMatch(/non mostrerà mai nomi, email, identificativi worker \(worker_id\), tag UID, singoli/);
    expect(source).toMatch(/eventi di scansione o singole attivazioni/);
  });

  it('states the company also receives only aggregate outputs for these same signals', () => {
    expect(source).toMatch(/anche\s*\n?\s*l&apos;azienda riceve unicamente output aggregati, mai il dettaglio disaggregato/);
  });

  it('points to the relationships view as the only place names can legitimately appear', () => {
    expect(source).toMatch(/I nominativi\s*\n?\s*possono comparire solo nella vista Relazioni con i lavoratori/);
    expect(source).toMatch(/solo per relazioni avviate\s*\n?\s*volontariamente dal lavoratore/);
  });
});

describe('Partner surface 01 — privacy boundary page states the four required visibility rules', () => {
  const source = readSource('app/partner/privacy-boundary/page.tsx');

  it('states company receives aggregate-only data', () => {
    expect(source).toMatch(/L'azienda può vedere/);
    expect(source).toMatch(/Solo metriche aggregate/);
  });

  it('states company cannot see partner-worker relationship details', () => {
    expect(source).toMatch(/L'azienda non può vedere/);
    expect(source).toMatch(/I dettagli delle relazioni tra un lavoratore e un partner/);
  });

  it('states partner sees name/surname only when the worker voluntarily shares/initiates', () => {
    expect(source).toMatch(/Il partner può vedere/);
    expect(source).toMatch(/solo quando il lavoratore avvia direttamente una relazione/);
  });

  it('does not decide or imply final consent/legal text', () => {
    expect(source).toMatch(/resta di competenza\s*\n?\s*DPO\/legal \(Gate 3\) e non è deciso né implicato da questa pagina/);
    expect(source).not.toMatch(/consenso finale/i);
    expect(source).not.toMatch(/testo legale approvato/i);
  });
});

describe('Partner surface 01 — no page marks a CTO/DPO decision as resolved', () => {
  for (const page of PARTNER_SURFACE_PAGES) {
    it(`${page} does not claim a DPO/CTO decision has been made`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
      expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
      expect(source).not.toMatch(/decisione (?:CTO|DPO) risolta/i);
    });
  }
});

describe('Partner surface polish 01 — general initiatives and KORA Link Track A initiatives use disambiguated status labels', () => {
  const generalInitiatives = readSource('app/partner/initiatives/page.tsx');
  const koraLinkInitiatives = readSource('app/partner/kora-link/initiatives/page.tsx');

  it('/partner/initiatives no longer renders "Bozza" or "Verificata" — the labels KORA Link Track A uses', () => {
    expect(generalInitiatives).not.toMatch(/Draft:\s*'Bozza'/);
    expect(generalInitiatives).not.toMatch(/Verified:\s*'Verificata'/);
  });

  it('/partner/initiatives visible labels include the disambiguated set (In preparazione / In valutazione / Approvata / Attiva / Conclusa)', () => {
    expect(generalInitiatives).toMatch(/Draft:\s*'In preparazione'/);
    expect(generalInitiatives).toMatch(/'In review':\s*'In valutazione'/);
    expect(generalInitiatives).toMatch(/Verified:\s*'Approvata'/);
    expect(generalInitiatives).toMatch(/Active:\s*'Attiva'/);
    expect(generalInitiatives).toMatch(/Closed:\s*'Conclusa'/);
    // Free-text engagement narrative must not reintroduce the retired word either.
    expect(generalInitiatives).not.toMatch(/engagementState:\s*'Bozza/);
  });

  it('/partner/kora-link/initiatives keeps its own Track A status language unchanged (Bozza/Verificata)', () => {
    expect(koraLinkInitiatives).toMatch(/Draft:\s*'Bozza'/);
    expect(koraLinkInitiatives).toMatch(/Verified:\s*'Verificata'/);
    expect(koraLinkInitiatives).toMatch(/'Pending accreditation':\s*'In attesa di accreditamento'/);
  });

  it('the two initiative pipelines never share a visible status label string', () => {
    const generalLabels = ['In preparazione', 'In valutazione', 'Approvata', 'Attiva', 'Conclusa'];
    const koraLinkLabels = ['Bozza', 'In attesa di accreditamento', 'Verificata', 'Chiusa'];
    const overlap = generalLabels.filter((label) => koraLinkLabels.includes(label));
    expect(overlap, `label(s) shared between the two pipelines: ${overlap.join(', ')}`).toEqual([]);
  });
});

describe('Partner surface polish 01 — privacy boundary page still states the required invariants after the visual polish', () => {
  const source = readSource('app/partner/privacy-boundary/page.tsx');

  it('still states partner sees identity only through worker-initiated relationships', () => {
    expect(source).toMatch(/Il partner può vedere/);
    expect(source).toMatch(/solo quando il lavoratore avvia direttamente una relazione/);
  });

  it('still states company receives aggregate-only data', () => {
    expect(source).toMatch(/L'azienda può vedere/);
    expect(source).toMatch(/Solo metriche aggregate/);
  });

  it('still states DPO/legal decisions remain unresolved, not implemented as a new redesign side effect', () => {
    expect(source).toMatch(/resta di competenza\s*\n?\s*DPO\/legal \(Gate 3\) e non è deciso né implicato da questa pagina/);
  });

  it('the visual polish reuses existing safeguard tokens, not a new ad-hoc palette', () => {
    expect(source).toMatch(/TOKENS\.safeguard\.pass\.(text|bg)/);
    expect(source).toMatch(/TOKENS\.safeguard\.cap\.(text|bg)/);
  });
});

describe('Partner surface 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
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
