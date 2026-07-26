/**
 * Worker Activity Discovery 01 — Phase 2 discovery shell guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: the
 * worker discovery shell previews standard Partner Activities inside a
 * company-enabled Phase 2 perimeter, stays distinct from KORA Space /
 * Contribution Initiatives, implements no real booking/request/contact/
 * voucher persistence, no worker eligibility logic, and no employer-visible
 * individual choice, and resolves no DPO/CTO/fiscal/legal decision.
 * See docs/WORKER_ACTIVITY_DISCOVERY_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const DISCOVERY_PAGE = 'app/worker/activity-discovery/page.tsx';
const DETAIL_PAGE = 'app/worker/activity-discovery/detail/page.tsx';

describe('Worker Activity Discovery 01 — routes exist and are readable', () => {
  it(`${DISCOVERY_PAGE} exists`, () => {
    expect(() => readSource(DISCOVERY_PAGE)).not.toThrow();
  });

  it(`${DETAIL_PAGE} exists`, () => {
    expect(() => readSource(DETAIL_PAGE)).not.toThrow();
  });
});

describe('Worker Activity Discovery 01 — frames itself as Phase 2 Activation Intelligence', () => {
  const source = readSource(DISCOVERY_PAGE);

  it('frames the page as Phase 2', () => {
    expect(source).toMatch(/Fase 2 Activation Intelligence/);
  });

  it('describes these as standard Partner Activities, not initiatives', () => {
    expect(source).toMatch(/Attività Partner standard/);
    expect(source).toMatch(/non iniziative KORA Space, non iniziative Contribution/);
  });
});

describe('Worker Activity Discovery 01 — uses Activity language, distinguishes from KORA Space/Contribution Initiatives', () => {
  const source = readSource(DISCOVERY_PAGE);

  it('links to /worker/commons as the distinct KORA Space (real initiatives) surface', () => {
    expect(source).toContain('href="/worker/commons"');
    expect(source).toMatch(/iniziative reali \(diverso dalle attività\)/);
  });
});

describe('Worker Activity Discovery 01 — reuses the static Partner Activity model', () => {
  it(`${DISCOVERY_PAGE} imports from lib/partner-activities/catalog`, () => {
    const source = readSource(DISCOVERY_PAGE);
    expect(source).toMatch(/from '@\/lib\/partner-activities\/catalog'/);
    expect(source).toMatch(/getPartnerActivities/);
  });

  it(`${DETAIL_PAGE} imports from lib/partner-activities/catalog`, () => {
    const source = readSource(DETAIL_PAGE);
    expect(source).toMatch(/from '@\/lib\/partner-activities\/catalog'/);
    expect(source).toMatch(/getPartnerActivityById/);
  });
});

describe('Worker Activity Discovery 01 — includes fiscal category and pillar mapping', () => {
  it(`${DISCOVERY_PAGE} renders fiscal category via FISCAL_CATEGORY_LABELS`, () => {
    const source = readSource(DISCOVERY_PAGE);
    expect(source).toMatch(/FISCAL_CATEGORY_LABELS/);
  });

  it(`${DETAIL_PAGE} shows pillar mapping (primary + secondary)`, () => {
    const source = readSource(DETAIL_PAGE);
    expect(source).toMatch(/primario/);
    expect(source).toMatch(/secondario/);
  });
});

describe('Worker Activity Discovery 01 — shows partner names as activity providers, never worker names', () => {
  const source = readSource(DISCOVERY_PAGE);

  it('renders activity.partnerName as the provider', () => {
    expect(source).toMatch(/activity\.partnerName/);
  });

  it('contains no worker name, email, worker ID, or tag UID', () => {
    const forbiddenPatterns = [
      /\bworkerId\s*[:=]/,
      /\.workerId\b/,
      /\bworker_id\s*[:=]/,
      /\.worker_id\b/,
      /\bworkerName\s*[:=]/,
      /\.workerName\b/,
      /\btagUid\s*[:=]/,
      /\btag_uid\s*[:=]/,
      /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(pattern.test(source), `must not match ${pattern}`).toBe(false);
    }
  });
});

describe('Worker Activity Discovery 01 — includes all five future worker action labels', () => {
  const source = readSource(DISCOVERY_PAGE);

  it('book -> Prenota', () => {
    expect(source).toMatch(/book:\s*'Prenota'/);
  });

  it('apply -> Candidati', () => {
    expect(source).toMatch(/apply:\s*'Candidati'/);
  });

  it('request_contact -> Richiedi contatto', () => {
    expect(source).toMatch(/request_contact:\s*'Richiedi contatto'/);
  });

  it('redeem_voucher -> Riscatta voucher', () => {
    expect(source).toMatch(/redeem_voucher:\s*'Riscatta voucher'/);
  });

  it('info_only -> Scopri di più', () => {
    expect(source).toMatch(/info_only:\s*'Scopri di più'/);
  });
});

describe('Worker Activity Discovery 01 — all CTAs are preview-only / non-functional', () => {
  const pages = [DISCOVERY_PAGE, DETAIL_PAGE];

  for (const page of pages) {
    it(`${page} has only disabled buttons, no real action handlers`, () => {
      const source = readSource(page);
      const buttonBlocks = source.match(/<button[\s\S]*?<\/button>/g) ?? [];
      expect(buttonBlocks.length).toBeGreaterThan(0);
      for (const block of buttonBlocks) {
        expect(block).toMatch(/disabled/);
        expect(block.toLowerCase()).not.toContain('(mock');
      }
      expect(source).not.toMatch(/onClick=/);
      expect(source).not.toMatch(/fetch\(/);
    });
  }
});

describe('Worker Activity Discovery 01 — states voluntary choice and privacy invariants', () => {
  const source = readSource(DISCOVERY_PAGE);

  it('states worker choice is voluntary', () => {
    expect(source).toMatch(/La scelta è sempre tua e volontaria/);
  });

  it('states browsing does not expose worker identity to employer', () => {
    expect(source).toMatch(/non ti espone in alcun modo alla tua\s*\n?\s*azienda/);
  });

  it('states partner named visibility starts only after worker-initiated action', () => {
    expect(source).toMatch(/il partner vede informazioni nominative solo\s*\n?\s*dopo un&apos;azione che scegli tu di avviare/);
  });

  it('states company output remains aggregate-only', () => {
    expect(source).toMatch(/L&apos;azienda riceve solo esiti aggregati/);
  });

  it('the detail page repeats the same invariants', () => {
    const detail = readSource(DETAIL_PAGE);
    expect(detail).toMatch(/Cosa non vedrebbe mai la tua azienda/);
    expect(detail).toMatch(/Riceve solo esiti aggregati, mai la tua scelta individuale/);
  });
});

describe('Worker Activity Discovery 01 — KORA Index and Contribution boundary statements', () => {
  const source = readSource(DISCOVERY_PAGE);

  it('states activity engagement may feed future aggregate KORA Index signals', () => {
    expect(source).toMatch(/potrà in futuro diventare un segnale aggregato per il KORA\s*\n?\s*Index/);
  });

  it('states live KORA Index computation is not changed', () => {
    expect(source).toMatch(/Nessun calcolo live del KORA Index è modificato in questo sprint/);
  });

  it('states activities do not directly feed KORA Contribution', () => {
    expect(source).toMatch(/Le Attività Partner non alimentano mai direttamente KORA Contribution/);
  });
});

describe('Worker Activity Discovery 01 — no individual booking, scan, or activation event data', () => {
  const pages = [DISCOVERY_PAGE, DETAIL_PAGE];

  it('renders no mock booking/scan/activation record structures', () => {
    for (const page of pages) {
      const source = readSource(page);
      expect(source).not.toMatch(/interface\s+Mock\w*(Booking|Scan|Activation)/);
    }
  });
});

describe('Worker Activity Discovery 01 — no Supabase, DB helper, RPC, or env secret access', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  for (const page of [DISCOVERY_PAGE, DETAIL_PAGE]) {
    it(`${page} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${page} must not match ${pattern}`).toBe(false);
      }
    });
  }
});

describe('Worker Activity Discovery 01 — no feature flag hardcoded', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  for (const page of [DISCOVERY_PAGE, DETAIL_PAGE]) {
    it(`${page} does not hardcode any KORA Link feature flag to true`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});

describe('Worker Activity Discovery 01 — pages are auth-gated, worker-only', () => {
  for (const page of [DISCOVERY_PAGE, DETAIL_PAGE]) {
    it(`${page} requires a real worker session via requireWorkerUser()`, () => {
      const source = readSource(page);
      expect(source).toMatch(/requireWorkerUser\(\)/);
      expect(source).toMatch(/isKoraAuthError/);
    });
  }
});

describe('Worker Activity Discovery 01 — no DPO/CTO/fiscal/legal decision is marked resolved', () => {
  for (const page of [DISCOVERY_PAGE, DETAIL_PAGE]) {
    it(`${page} does not claim any pending decision has been made`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
      expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
    });
  }
});

describe('Worker Activity Discovery 01 — worker navigation includes the new page', () => {
  it('Sidebar.tsx marks /worker/activity-discovery as preview', () => {
    const source = readSource('components/layout/Sidebar.tsx');
    expect(source).toMatch(/'\/worker\/activity-discovery',[^}]*preview: true/);
  });
});

describe('Worker Activity Discovery 01 — cross-links are present', () => {
  const source = readSource(DISCOVERY_PAGE);

  it('links to the detail preview', () => {
    expect(source).toContain('href="/worker/activity-discovery/detail"');
  });

  it('links to /partner/activity-catalog as the partner-side catalog reference', () => {
    expect(source).toContain('href="/partner/activity-catalog"');
  });

  it('links to /company/activity-selection as the company-side configuration reference', () => {
    expect(source).toContain('href="/company/activity-selection"');
  });

  it('links to /admin/kora-activation-layer as the product model reference', () => {
    expect(source).toContain('href="/admin/kora-activation-layer"');
  });

  it('the detail page links back to the discovery page', () => {
    const detail = readSource(DETAIL_PAGE);
    expect(detail).toContain('href="/worker/activity-discovery"');
  });
});

describe('Worker Activity Discovery 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
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

describe('Worker Activity Discovery 01 — KORA Index engine, commons pipeline remain untouched', () => {
  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });

  it('lib/commons/types.ts still defines CommonsPost unchanged in shape', () => {
    const commons = readSource('lib/commons/types.ts');
    expect(commons).toMatch(/export interface CommonsPost/);
  });
});
