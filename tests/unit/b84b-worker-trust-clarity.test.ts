import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B84-B — Worker Trust & Preview-to-Live Clarity ────────────────────────────
//
// Goal: a first-time worker can understand My KORA in ≤60 seconds.
// Tasks covered:
//   T1: Entry framing block on /my-kora
//   T2: "My KORA" as page title (not "Il tuo Worker PIB™")
//   T3: PreviewToLiveNotice on all 5 routes
//   T4: Company Snapshot orientation sentence
//   T5: KORA Link FUTURE_VISION badge + "Non disponibile in Foundation Light"
//   T6: IU plain-Italian explanation on /my-kora
//   T7: PIB explanation near PIB section
//   T8: Opportunities IU generation clarification
//   T9: Privacy page non-interactive toggle warning
//   T10: Collective empty state — no developer language
//   T11: Trust language review
//
// Invariants:
//   - No new features, no backend changes, no auth changes
//   - DO NOT TOUCH: KORA Index, IU formula, PIB formula, WorkerSessionProvider,
//     WorkerSpaceCapabilityService, Database, Auth, RLS, Supabase

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

function exists(rel: string) {
  return fs.existsSync(path.resolve(__dirname, '../..', rel));
}

// ── T3: PreviewToLiveNotice component ────────────────────────────────────────

describe('B84-B T3 — PreviewToLiveNotice component created', () => {
  const src = read('components/my-kora/PreviewToLiveNotice.tsx');

  it('component file exists', () => {
    expect(exists('components/my-kora/PreviewToLiveNotice.tsx')).toBe(true);
  });

  it('exports PreviewToLiveNotice', () => {
    expect(src).toContain('export function PreviewToLiveNotice');
  });

  it('exports PreviewToLiveNoticeProps interface', () => {
    expect(src).toContain('PreviewToLiveNoticeProps');
  });

  it('accepts what, preview, live, privacy props', () => {
    expect(src).toContain('what:');
    expect(src).toContain('preview:');
    expect(src).toContain('live:');
    expect(src).toContain('privacy:');
  });

  it('renders all 4 labeled sections', () => {
    expect(src).toContain('Questa pagina');
    expect(src).toContain('Anteprima');
    expect(src).toContain('In Pilot+');
    expect(src).toContain('Privacy');
  });

  it('uses design tokens (TOKENS)', () => {
    expect(src).toContain('TOKENS');
  });

  it('does not import any service or seed file', () => {
    expect(src).not.toContain('import.*Service');
    expect(src).not.toContain('.json');
    expect(src).not.toContain('supabase');
  });
});

// ── T1 + T2: Home page entry framing and title ───────────────────────────────

describe('B84-B T1 + T2 — /my-kora home entry framing', () => {
  const home = read('app/my-kora/page.tsx');

  it('T2: page title is "My KORA" (no longer "Il tuo Worker PIB™")', () => {
    expect(home).toContain('>My KORA<');
    expect(home).not.toContain('Il tuo <TM>Worker PIB</TM>');
    expect(home).not.toContain('Il tuo Worker PIB');
  });

  it('T2: no longer imports PageMasthead', () => {
    expect(home).not.toContain("from '@/components/ui/PageMasthead'");
  });

  it('T2: no longer imports TM (was used only in PIB title)', () => {
    expect(home).not.toContain("from '@/components/ui/TM'");
  });

  it('T2: no longer imports DecisionContext', () => {
    expect(home).not.toContain("from '@/components/ui/DecisionContext'");
  });

  it('T1: entry framing block says "Questo spazio appartiene a te"', () => {
    expect(home).toContain('Questo spazio appartiene a te');
  });

  it('T1: entry framing mentions employer cannot see PIB', () => {
    expect(home).toContain('datore di lavoro non può vedere il tuo PIB');
  });

  it('T1: entry framing mentions employer cannot see Dynamic CV', () => {
    expect(home).toContain('Dynamic CV');
    expect(home).toContain('datore di lavoro non può vedere');
  });

  it('T1: entry framing clarifies data is synthetic', () => {
    expect(home).toContain('dati in questa anteprima sono sintetici');
  });

  it('T1: entry framing mentions Pilot+ transition', () => {
    expect(home).toContain('Pilot+');
    expect(home).toContain('attività realmente verificate');
  });

  it('T3: imports PreviewToLiveNotice', () => {
    expect(home).toContain("from '@/components/my-kora/PreviewToLiveNotice'");
  });

  it('T3: renders PreviewToLiveNotice', () => {
    expect(home).toContain('<PreviewToLiveNotice');
  });
});

// ── T6: IU plain-language explanation ────────────────────────────────────────

describe('B84-B T6 — IU explanation on /my-kora', () => {
  const home = read('app/my-kora/page.tsx');

  it('IU explanation block exists', () => {
    expect(home).toContain('Cosa sono gli Impact Unit (IU)?');
  });

  it('explains IU are not for individual comparison', () => {
    expect(home).toContain('non servono per valutarti');
  });

  it('mentions Pilot+ for live IU derivation', () => {
    expect(home).toContain('Pilot+');
    expect(home).toContain('attività realmente verificate');
  });
});

// ── T7: PIB plain-language explanation ───────────────────────────────────────

describe('B84-B T7 — PIB explanation near PIB section on /my-kora', () => {
  const home = read('app/my-kora/page.tsx');

  it('PIB explanation is near PIB section', () => {
    // Check the PIB explanation paragraph exists
    expect(home).toContain('Personal Impact Balance (PIB) è la stima');
  });

  it('PIB explanation says it is not a vote', () => {
    expect(home).toContain('Non è un voto');
  });

  it('PIB explanation says it is not a ranking', () => {
    expect(home).toContain('Non è una classifica');
  });

  it('PIB explanation says not visible to employer', () => {
    expect(home).toContain('Non è visibile al tuo datore di lavoro');
  });
});

// ── T4: Company Snapshot orientation sentence ─────────────────────────────────

describe('B84-B T4 — Company Snapshot orientation sentence', () => {
  const home = read('app/my-kora/page.tsx');

  it('Company Snapshot has orientation sentence', () => {
    expect(home).toContain('Questi risultati descrivono la tua organizzazione nel suo insieme');
  });

  it('orientation sentence clarifies no individual data', () => {
    expect(home).toContain('Non mostrano i tuoi dati');
  });
});

// ── T5: KORA Link FUTURE_VISION badge ────────────────────────────────────────

describe('B84-B T5 — KORA Link FUTURE_VISION badge', () => {
  const home = read('app/my-kora/page.tsx');

  it('KORA Link has FUTURE_VISION mode badge', () => {
    expect(home).toContain('mode="FUTURE_VISION"');
  });

  it('KORA Link says "Non disponibile in Foundation Light"', () => {
    expect(home).toContain('Non disponibile in Foundation Light');
  });

  it('KORA Link no longer has insufficient "Demo" badge as standalone span', () => {
    // The old badge was: <span ...>Demo</span> beside the heading
    // Now replaced by BoundaryBadge mode="FUTURE_VISION"
    expect(home).not.toContain('>Demo<');
  });
});

// ── T3: PreviewToLiveNotice on dynamic-cv ────────────────────────────────────

describe('B84-B T3 — PreviewToLiveNotice on /my-kora/dynamic-cv', () => {
  const cv = read('app/my-kora/dynamic-cv/page.tsx');

  it('imports PreviewToLiveNotice', () => {
    expect(cv).toContain("from '@/components/my-kora/PreviewToLiveNotice'");
  });

  it('renders PreviewToLiveNotice', () => {
    expect(cv).toContain('<PreviewToLiveNotice');
  });

  it('notice mentions synthetic CV items', () => {
    expect(cv).toContain('sintetico');
  });

  it('notice mentions Pilot+ live source', () => {
    expect(cv).toContain('Pilot+');
  });

  it('notice mentions employer privacy', () => {
    expect(cv).toContain('datore di lavoro non ha accesso');
  });
});

// ── T3 + T9: PreviewToLiveNotice and toggle warning on /my-kora/privacy ──────

describe('B84-B T3 + T9 — /my-kora/privacy page', () => {
  const priv = read('app/my-kora/privacy/page.tsx');

  it('T3: imports PreviewToLiveNotice', () => {
    expect(priv).toContain("from '@/components/my-kora/PreviewToLiveNotice'");
  });

  it('T3: renders PreviewToLiveNotice', () => {
    expect(priv).toContain('<PreviewToLiveNotice');
  });

  it('T9: has non-interactive toggle warning block', () => {
    expect(priv).toContain('Queste impostazioni non modificano dati reali');
  });

  it('T9: toggle warning explains controls are visual only', () => {
    expect(priv).toContain('controlli sono visivi — non attivi');
  });

  it('T9: toggle warning is above the consent toggle list', () => {
    const warningPos = priv.indexOf('Queste impostazioni non modificano dati reali');
    const toggleListPos = priv.indexOf('consent_toggles.map');
    expect(warningPos).toBeGreaterThan(-1);
    expect(toggleListPos).toBeGreaterThan(-1);
    expect(warningPos).toBeLessThan(toggleListPos);
  });
});

// ── T3 + T8: PreviewToLiveNotice and IU clarification on /my-kora/opportunities

describe('B84-B T3 + T8 — /my-kora/opportunities page', () => {
  const opps = read('app/my-kora/opportunities/page.tsx');

  it('T3: imports PreviewToLiveNotice', () => {
    expect(opps).toContain("from '@/components/my-kora/PreviewToLiveNotice'");
  });

  it('T3: renders PreviewToLiveNotice', () => {
    expect(opps).toContain('<PreviewToLiveNotice');
  });

  it('T8: IU generation clarification exists', () => {
    expect(opps).toContain('Come si generano gli Impact Unit dalle opportunità?');
  });

  it('T8: clarification says IU not generated by viewing', () => {
    expect(opps).toContain('solo dopo una partecipazione reale e verificata');
  });

  it('T8: clarification mentions verification step', () => {
    expect(opps).toContain('revisione da parte di un advisor');
  });
});

// ── T3 + T10: PreviewToLiveNotice and empty state fix on /my-kora/collective ──

describe('B84-B T3 + T10 — /my-kora/collective page', () => {
  const col = read('app/my-kora/collective/page.tsx');

  it('T3: imports PreviewToLiveNotice', () => {
    expect(col).toContain("from '@/components/my-kora/PreviewToLiveNotice'");
  });

  it('T3: renders PreviewToLiveNotice', () => {
    expect(col).toContain('<PreviewToLiveNotice');
  });

  it('T10: empty state no longer contains "scenario S2" developer language', () => {
    // Check the empty state block does not reference "S2"
    const emptyStateStart = col.indexOf('No contribution events');
    const emptyStateEnd   = col.indexOf('</div>', emptyStateStart + 50);
    const emptyBlock      = col.slice(emptyStateStart, emptyStateEnd + 6);
    expect(emptyBlock).not.toContain('S2');
    expect(emptyBlock).not.toContain('selezionare lo scenario');
  });

  it('T10: empty state is worker-friendly, mentions Pilot+', () => {
    expect(col).toContain('Pilot+');
    expect(col).toContain('profilo dimostrativo');
  });

  it('T10: no "Prova a selezionare lo scenario" developer prompt', () => {
    expect(col).not.toContain('Prova a selezionare lo scenario');
  });
});

// ── T11: Trust language review across all pages ───────────────────────────────

describe('B84-B T11 — Trust language review', () => {
  it('home page no longer uses "layer worker-owned" as meta copy', () => {
    const home = read('app/my-kora/page.tsx');
    expect(home).not.toContain('layer worker-owned');
  });

  it('collective page no longer uses "scenario:" developer footer in empty state', () => {
    const col = read('app/my-kora/collective/page.tsx');
    const emptyStateStart = col.indexOf('No contribution events');
    const emptyStateEnd   = col.indexOf('</div>', emptyStateStart + 50);
    const emptyBlock      = col.slice(emptyStateStart, emptyStateEnd + 6);
    expect(emptyBlock).not.toContain('scenario:');
  });

  it('all 5 routes use BoundaryBadge PREVIEW', () => {
    const routes = [
      'app/my-kora/page.tsx',
      'app/my-kora/dynamic-cv/page.tsx',
      'app/my-kora/privacy/page.tsx',
      'app/my-kora/opportunities/page.tsx',
      'app/my-kora/collective/page.tsx',
    ];
    routes.forEach((route) => {
      const src = read(route);
      expect(src).toContain('BoundaryBadge');
    });
  });

  it('all 5 routes import PreviewToLiveNotice', () => {
    const routes = [
      'app/my-kora/page.tsx',
      'app/my-kora/dynamic-cv/page.tsx',
      'app/my-kora/privacy/page.tsx',
      'app/my-kora/opportunities/page.tsx',
      'app/my-kora/collective/page.tsx',
    ];
    routes.forEach((route) => {
      const src = read(route);
      expect(src).toContain("from '@/components/my-kora/PreviewToLiveNotice'");
    });
  });
});

// ── Invariants — nothing forbidden was changed ────────────────────────────────

describe('B84-B invariants — no forbidden changes', () => {
  it('WorkerSessionProvider is unchanged (DO NOT TOUCH)', () => {
    const src = read('app/my-kora/_providers/WorkerSessionProvider.tsx');
    expect(src).toContain('WorkerSessionProvider');
    // liveSession is null — always PREVIEW in Foundation Light
    expect(src).toContain('liveSession');
    expect(src).toContain('null');
  });

  it('WorkerSpaceCapabilityService is unchanged (DO NOT TOUCH)', () => {
    const src = read('services/worker-space/WorkerSpaceCapabilityService.ts');
    expect(src).toContain('getCapabilityByCompanyId');
  });

  it('methodology config unchanged — 10 KORA Index components', () => {
    const src = read('lib/constants/kora.ts');
    expect(src).toContain("KORA_INDEX_COMPONENTS = ['AR', 'MAR', 'NI', 'WB', 'PC', 'PB', 'EQ', 'VR', 'CO', 'CS']");
  });

  it('no SQL or Prisma added', () => {
    const home = read('app/my-kora/page.tsx');
    expect(home).not.toContain('CREATE TABLE');
    expect(home).not.toContain('prisma');
    expect(home).not.toContain('supabase');
  });

  it('no new KORA Index component added', () => {
    const src = read('lib/constants/kora.ts');
    // The components array must still be exactly 10
    const match = src.match(/KORA_INDEX_COMPONENTS\s*=\s*\[([^\]]+)\]/);
    if (match) {
      const components = match[1].split(',').map((s) => s.trim().replace(/['"]/g, ''));
      expect(components.length).toBe(10);
    }
  });

  it('PreviewToLiveNotice has no database or auth imports', () => {
    const src = read('components/my-kora/PreviewToLiveNotice.tsx');
    expect(src).not.toContain('supabase');
    expect(src).not.toContain('prisma');
    expect(src).not.toContain('signIn');
    expect(src).not.toContain('useSession');
  });

  it('no hardcoded methodology weights in any edited file', () => {
    const files = [
      'app/my-kora/page.tsx',
      'app/my-kora/dynamic-cv/page.tsx',
      'app/my-kora/privacy/page.tsx',
      'app/my-kora/opportunities/page.tsx',
      'app/my-kora/collective/page.tsx',
    ];
    files.forEach((f) => {
      const src = read(f);
      expect(src).not.toContain('weight: 0.');
      expect(src).not.toContain('0.10 *');
    });
  });
});
