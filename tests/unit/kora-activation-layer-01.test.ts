/**
 * KORA Activation Layer 01 — Phase 1 vs Phase 2 signal stream guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: the
 * activation layer page distinguishes Phase 1 (Raw Data Intelligence,
 * mature, DB-backed) from Phase 2 (Activation Intelligence, catalog-only,
 * no-DB), states both can feed KORA Index through distinct signal streams,
 * and resolves no DPO/CTO/fiscal/legal decision. It changes no KORA Index
 * or ingestion computation. See docs/KORA_ACTIVATION_LAYER_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const LAYER_PAGE = 'app/admin/kora-activation-layer/page.tsx';

describe('KORA Activation Layer 01 — route exists and is readable', () => {
  it(`${LAYER_PAGE} exists`, () => {
    expect(() => readSource(LAYER_PAGE)).not.toThrow();
  });
});

describe('KORA Activation Layer 01 — distinguishes Phase 1 from Phase 2', () => {
  const source = readSource(LAYER_PAGE);

  it('names Phase 1 / Raw Data Intelligence', () => {
    expect(source).toMatch(/Fase 1 — Raw Data Intelligence/);
  });

  it('names Phase 2 / Activation Intelligence', () => {
    expect(source).toMatch(/Fase 2 — Activation Intelligence/);
  });
});

describe('KORA Activation Layer 01 — states both phases can feed KORA Index', () => {
  const source = readSource(LAYER_PAGE);

  it('states the two-stream KORA Index principle', () => {
    expect(source).toMatch(/Il KORA Index è alimentato da due flussi complementari/);
  });

  it('states the two pipelines remain distinct', () => {
    const doc = readSource('docs/KORA_ACTIVATION_LAYER_01.md');
    expect(doc).toMatch(/Le due pipeline non vanno mai fuse/);
  });
});

describe('KORA Activation Layer 01 — describes Phase 1 inputs and Phase 2 inputs correctly', () => {
  const source = readSource(LAYER_PAGE);

  it('Phase 1 uses uploaded/classified raw organizational data', () => {
    expect(source).toMatch(/Dati aziendali caricati \(HR\/welfare\/formazione\/budget\)/);
    expect(source).toMatch(/Ingestion → normalizzazione UEF → classificazione/);
  });

  it('Phase 2 uses partner activities, company enablement, worker voluntary choice, and aggregate activation signals', () => {
    expect(source).toMatch(/Catalogo attività partner \+ abilitazione azienda \+ scelta worker/);
    expect(source).toMatch(/Segnali aggregati KORA Index per pilastro\/categoria fiscale \(futuro\)/);
  });
});

describe('KORA Activation Layer 01 — states this sprint changes no live computation', () => {
  const source = readSource(LAYER_PAGE);

  it('states KORA Index computation is unchanged', () => {
    expect(source).toMatch(/Nessun calcolo del KORA Index è modificato da questa pagina/);
    expect(source).toMatch(/Il calcolo del KORA Index non è stato modificato/);
  });

  it('states no real activation signal is generated', () => {
    expect(source).toMatch(/Nessun segnale di attivazione reale è\s*\n?\s*generato/);
  });
});

describe('KORA Activation Layer 01 — states current implementation status per component', () => {
  const source = readSource(LAYER_PAGE);

  it('states the Partner Activity Catalog exists only as a no-DB shell', () => {
    expect(source).toMatch(/Il Catalogo Attività Partner esiste solo come shell no-DB/);
  });

  it('states Company Activity Selection is not yet implemented', () => {
    expect(source).toMatch(/La Selezione Attività Azienda non è ancora implementata/);
  });

  it('states Worker Activity Discovery\\/Booking is not yet implemented', () => {
    expect(source).toMatch(/La Discovery\/Prenotazione Attività Worker non è ancora implementata/);
  });

  it('states the Activation Signal Pipeline is not yet implemented', () => {
    expect(source).toMatch(/La Pipeline di Segnale di Attivazione non è ancora implementata/);
  });
});

describe('KORA Activation Layer 01 — states the Contribution boundary', () => {
  const source = readSource(LAYER_PAGE);

  it('states Partner Activities never feed KORA Contribution directly', () => {
    expect(source).toMatch(/Le Attività Partner non alimentano mai direttamente KORA Contribution/);
  });
});

describe('KORA Activation Layer 01 — states the privacy invariants', () => {
  const source = readSource(LAYER_PAGE);

  it('states company remains aggregate-only', () => {
    expect(source).toMatch(/L&apos;azienda vede solo aggregati — in entrambe le fasi/);
  });

  it('states partner named visibility is worker-initiated only', () => {
    expect(source).toMatch(/Il partner vede nominativi solo dopo un&apos;azione volontaria del worker/);
  });
});

describe('KORA Activation Layer 01 — no worker-level data anywhere on the page', () => {
  const source = readSource(LAYER_PAGE);
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

  it('contains no worker name, email, worker ID, or tag UID', () => {
    for (const pattern of forbiddenPatterns) {
      expect(pattern.test(source), `must not match ${pattern}`).toBe(false);
    }
  });

  it('renders no individual booking, scan, or activation event data', () => {
    expect(source).not.toMatch(/interface\s+Mock\w*(Booking|Scan|Activation)/);
  });
});

describe('KORA Activation Layer 01 — no Supabase, DB helper, RPC, or env secret access', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  it(`${LAYER_PAGE} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
    const source = readSource(LAYER_PAGE);
    for (const pattern of forbiddenPatterns) {
      expect(pattern.test(source), `must not match ${pattern}`).toBe(false);
    }
  });
});

describe('KORA Activation Layer 01 — no feature flag hardcoded', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  it(`${LAYER_PAGE} does not hardcode any KORA Link feature flag to true`, () => {
    const source = readSource(LAYER_PAGE);
    for (const pattern of forbiddenPatterns) {
      expect(pattern.test(source)).toBe(false);
    }
  });
});

describe('KORA Activation Layer 01 — no DPO/CTO/fiscal/legal decision is marked resolved', () => {
  it(`${LAYER_PAGE} does not claim any pending decision has been made`, () => {
    const source = readSource(LAYER_PAGE);
    expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
    expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
    expect(source).toMatch(/Nessuna decisione CTO, DPO, fiscale o legale è presa qui/);
  });

  it('docs/KORA_ACTIVATION_LAYER_01.md does not mark any decision resolved', () => {
    const doc = readSource('docs/KORA_ACTIVATION_LAYER_01.md');
    expect(doc).not.toMatch(/[Dd]ecisione presa/);
    expect(doc).not.toMatch(/[Rr]isolt[oa]/);
  });
});

describe('KORA Activation Layer 01 — admin navigation includes the new page', () => {
  it('registers KORA Activation Layer under Network & Content', () => {
    const source = readSource('lib/navigation/admin-nav-groups.ts');
    expect(source).toContain("href: '/admin/kora-activation-layer'");
    expect(source).toMatch(/label:\s*'KORA Activation Layer',/);
  });
});

describe('KORA Activation Layer 01 — cross-links are present', () => {
  it('/admin/partner-ecosystem-model links to /admin/kora-activation-layer', () => {
    const source = readSource('app/admin/partner-ecosystem-model/page.tsx');
    expect(source).toContain('href="/admin/kora-activation-layer"');
  });

  it('/partner/activity-catalog links to /admin/kora-activation-layer', () => {
    const source = readSource('app/partner/activity-catalog/page.tsx');
    expect(source).toContain('href="/admin/kora-activation-layer"');
  });

  it('the activation layer page links back to partner-ecosystem-model and activity-catalog', () => {
    const source = readSource(LAYER_PAGE);
    expect(source).toContain('href="/admin/partner-ecosystem-model"');
    expect(source).toContain('href="/partner/activity-catalog"');
  });
});

describe('KORA Activation Layer 01 — naming collision with existing Activation Intelligence™ is registered', () => {
  it('the page explicitly disambiguates from /company/activation', () => {
    const source = readSource(LAYER_PAGE);
    expect(source).toMatch(/Activation Intelligence™[\s\S]{0,40}già\s*\n?\s*esistente su/);
  });

  it('the doc contains a naming-collision register for "activation"', () => {
    const doc = readSource('docs/KORA_ACTIVATION_LAYER_01.md');
    expect(doc).toMatch(/Activation Safeguard/);
    expect(doc).toMatch(/Activation Intelligence™/);
    expect(doc).toMatch(/KORA Link "attivazione"/);
  });
});

describe('KORA Activation Layer 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
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

describe('KORA Activation Layer 01 — KORA Index engine and ingestion remain untouched', () => {
  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });
});
