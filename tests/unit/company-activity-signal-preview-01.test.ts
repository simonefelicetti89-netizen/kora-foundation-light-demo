/**
 * Company Activity Signal Preview 01 — company-facing aggregate signal
 * reporting surface guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: the
 * strengthened /company/activity-signals page (and its optional compact
 * /company/activity-signals/summary) preview aggregate-only Phase 2
 * Activation Intelligence signals, distinct from Phase 1 uploaded-data
 * signals and from KORA Space / Contribution, without integrating with the
 * live KORA Index, without persistence, and without resolving any
 * DPO/CTO/fiscal/legal decision. See
 * docs/COMPANY_ACTIVITY_SIGNAL_PREVIEW_01.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const COMPANY_PAGE = 'app/company/activity-signals/page.tsx';
const SUMMARY_PAGE = 'app/company/activity-signals/summary/page.tsx';
const MODEL_FILE = 'lib/partner-activities/activation-signals.ts';
const ADMIN_PAGE = 'app/admin/activation-signal-pipeline/page.tsx';

// ── 1-2: routes exist ───────────────────────────────────────────────────────

describe('Company Activity Signal Preview 01 — routes exist', () => {
  it(`${COMPANY_PAGE} exists`, () => {
    expect(() => readSource(COMPANY_PAGE)).not.toThrow();
  });

  it(`${SUMMARY_PAGE} exists (optional compact summary was added)`, () => {
    expect(() => readSource(SUMMARY_PAGE)).not.toThrow();
  });
});

// ── 3: frames as Phase 2 aggregate signal preview ───────────────────────────

describe('Company Activity Signal Preview 01 — frames itself as a Phase 2 aggregate signal preview', () => {
  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} frames the page as Phase 2 Activation Intelligence`, () => {
      const source = readSource(page);
      expect(source).toMatch(/Fase 2 Activation Intelligence/);
    });
  }

  it(`${COMPANY_PAGE} explicitly frames the content as an aggregate preview`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toMatch(/Anteprima aggregata dei segnali di attivazione Fase 2/);
  });
});

// ── 4: separates Phase 2 from Phase 1 uploaded-data signals ─────────────────

describe('Company Activity Signal Preview 01 — separates Phase 2 signals from Phase 1 uploaded-data signals', () => {
  const source = readSource(COMPANY_PAGE);

  it('names Phase 1 explicitly as distinct', () => {
    expect(source).toMatch(/distinto dai\s*\n?\s*segnali Fase 1/);
  });

  it('links to the Phase 1 surfaces (KORA Index™, Activation Intelligence™) as the Phase 1 reference points', () => {
    expect(source).toContain('href="/company/kora-index"');
    expect(source).toContain('href="/company/activation"');
  });
});

// ── 5: separates from KORA Space / Contribution ─────────────────────────────

describe('Company Activity Signal Preview 01 — separates Partner Activity signals from KORA Space / Contribution', () => {
  const source = readSource(COMPANY_PAGE);

  it('states distinctness from KORA Contribution / KORA Space in the intro', () => {
    expect(source).toMatch(/distinto da\{' '\}\s*\n?\s*<Link href="\/company\/contribution"/);
  });

  it('states Partner Activity signals never directly feed KORA Contribution', () => {
    expect(source).toMatch(/I segnali di Attività Partner non alimentano mai direttamente KORA Contribution/);
  });

  it('states KORA Space / Contribution Initiatives remain a separate pipeline', () => {
    expect(source).toMatch(/KORA Space \/ Iniziative Contribution restano una pipeline separata/);
  });
});

// ── 6: reuses the static model ──────────────────────────────────────────────

describe('Company Activity Signal Preview 01 — reuses the static ActivationSignalPreview model', () => {
  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} imports from lib/partner-activities/activation-signals`, () => {
      const source = readSource(page);
      expect(source).toMatch(/from '@\/lib\/partner-activities\/activation-signals'/);
      expect(source).toMatch(/getActivationSignalPreviews|getActivationSignalSummary/);
    });
  }

  it(`${MODEL_FILE} is not duplicated or forked by the company pages`, () => {
    for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
      const source = readSource(page);
      expect(source).not.toMatch(/const MOCK_ACTIVATION_SIGNAL_PREVIEWS/);
    }
  });
});

// ── 7-10: required sections ──────────────────────────────────────────────────

describe('Company Activity Signal Preview 01 — includes executive summary cards', () => {
  it(`${COMPANY_PAGE} has an executive summary section`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toMatch(/Riepilogo esecutivo/);
  });
});

describe('Company Activity Signal Preview 01 — groups signals by KORA pillar', () => {
  const source = readSource(COMPANY_PAGE);

  it('has a pillar distribution section', () => {
    expect(source).toMatch(/Distribuzione per pilastro KORA/);
  });

  it('iterates the canonical pillar order (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY)', () => {
    expect(source).toMatch(/PILLAR_CODES\.map/);
    expect(source).toContain("from '@/lib/constants/kora'");
  });
});

describe('Company Activity Signal Preview 01 — groups signals by fiscal/welfare category', () => {
  const source = readSource(COMPANY_PAGE);

  it('has a fiscal category distribution section', () => {
    expect(source).toMatch(/Distribuzione per categoria fiscale\/welfare/);
  });

  it('states fiscal categories are proposed metadata, not legal/tax approval', () => {
    expect(source).toMatch(/metadati proposti — non costituiscono un&apos;approvazione fiscale o legale/);
  });
});

describe('Company Activity Signal Preview 01 — includes the KORA Index component preview', () => {
  const source = readSource(COMPANY_PAGE);

  it('has a component preview section', () => {
    expect(source).toMatch(/Anteprima componenti KORA Index/);
  });

  it('covers reach, quality, equity, activation, continuity, pillar_balance', () => {
    expect(source).toMatch(
      /\['reach', 'quality', 'equity', 'activation', 'continuity', 'pillar_balance'\]/,
    );
  });
});

// ── 11-13: KORA Index boundary ──────────────────────────────────────────────

describe('Company Activity Signal Preview 01 — states live KORA Index computation is unchanged', () => {
  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} states the live KORA Index calculation is not modified`, () => {
      const source = readSource(page);
      expect(source).toMatch(/calcolo live del KORA Index non è modificato/);
    });
  }
});

describe('Company Activity Signal Preview 01 — does not compute or display a KORA Index score', () => {
  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} does not import the KORA Index engine`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/from ['"]@\/lib\/kora-engine/);
    });
  }

  it(`${COMPANY_PAGE} states no KORA Index score is recomputed here`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toMatch(/Nessun punteggio KORA Index viene ricalcolato qui/);
  });
});

describe('Company Activity Signal Preview 01 — states KORA-INDEX-ACTIVATION-INTEGRATION-01 is future work requiring CTO review', () => {
  it(`${COMPANY_PAGE} names the future integration sprint and CTO review requirement`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toMatch(/KORA-INDEX-ACTIVATION-INTEGRATION-01/);
    expect(source).toMatch(/richiede revisione CTO/);
  });
});

// ── 14-16: privacy threshold ─────────────────────────────────────────────────

describe('Company Activity Signal Preview 01 — includes privacy threshold status', () => {
  const source = readSource(COMPANY_PAGE);

  it('has a privacy threshold panel', () => {
    expect(source).toMatch(/Soglie di privacy/);
  });

  it('renders per-signal privacy threshold badges', () => {
    expect(source).toMatch(/PrivacyStatusBadge/);
  });
});

describe('Company Activity Signal Preview 01 — states privacy thresholds are not final', () => {
  const source = readSource(COMPANY_PAGE);

  it('states thresholds are not decided in this sprint', () => {
    expect(source).toMatch(/Le soglie di privacy non sono decise in questo sprint/);
  });

  it('states low-count groups may require suppression', () => {
    expect(source).toMatch(/I gruppi con conteggio basso possono richiedere soppressione/);
  });
});

// ── 17-19: aggregate-only / can-cannot-see ──────────────────────────────────

describe('Company Activity Signal Preview 01 — states company output remains aggregate-only', () => {
  it(`${COMPANY_PAGE} states aggregate-only`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toMatch(/L&apos;azienda resta sempre aggregate-only/);
  });
});

describe('Company Activity Signal Preview 01 — lists what the company can and cannot see', () => {
  const source = readSource(COMPANY_PAGE);

  it('has a can-see list', () => {
    expect(source).toMatch(/Può vedere/);
    expect(source).toMatch(/Adozione \(uptake\) aggregata/);
  });

  it('has a cannot-see list', () => {
    expect(source).toMatch(/Non può mai vedere/);
    expect(source).toMatch(/Nominativi dei lavoratori/);
    expect(source).toMatch(/Riscatti voucher individuali/);
  });
});

// ── 20-21: no individual worker data / no sourceBookingIds ──────────────────

describe('Company Activity Signal Preview 01 — no worker-level data anywhere on the company pages', () => {
  const forbiddenPatterns = [
    /\bworkerId\s*[:=]/,
    /\.workerId\b/,
    /\bworker_id\s*[:=]/,
    /\.worker_id\b/,
    /\bworkerName\s*[:=]/,
    /\.workerName\b/,
    /\bworkerDisplayName\b/,
    /\bworkerSharedFields\b/,
    /\btagUid\s*[:=]/,
    /\btag_uid\s*[:=]/,
    /[\w.+-]+@[\w-]+\.[a-z]{2,}/i, // email-shaped strings
  ];

  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} contains no worker name, email, worker ID, or tag UID`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${page} must not match ${pattern}`).toBe(false);
      }
    });
  }
});

describe('Company Activity Signal Preview 01 — does not expose sourceBookingIds in the UI', () => {
  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} never accesses or renders the sourceBookingIds field`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/\.sourceBookingIds\b/);
      expect(source).not.toMatch(/\{s\.sourceBookingIds/);
      expect(source).not.toMatch(/sourceBookingIds\s*[:=]/);
    });
  }
});

// ── 22-23: worker-initiated / Contribution boundary ─────────────────────────

describe('Company Activity Signal Preview 01 — states partner named visibility remains worker-initiated only', () => {
  it(`${COMPANY_PAGE} states partner visibility is worker-initiated`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toMatch(/Il partner vede nominativi solo dopo un&apos;azione volontaria del lavoratore/);
    expect(source).toMatch(/visibilità nominativa del partner resta sempre worker-initiated/);
  });
});

describe('Company Activity Signal Preview 01 — states the Contribution boundary', () => {
  it(`${COMPANY_PAGE} states Partner Activity signals do not directly feed KORA Contribution`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toMatch(/I segnali di Attività Partner non alimentano mai direttamente KORA Contribution/);
  });
});

// ── 24: no Supabase/DB/RPC/env import ────────────────────────────────────────

describe('Company Activity Signal Preview 01 — no Supabase, DB helper, RPC, or env secret access', () => {
  const forbiddenPatterns = [
    /from ['"]@\/lib\/supabase/,
    /from ['"]@supabase\/supabase-js['"]/,
    /\.rpc\(/,
    /getSupabaseServiceClient/,
    /getSupabaseServerClient/,
    /process\.env/,
  ];

  for (const file of [MODEL_FILE, COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${file} never imports a Supabase/DB/RPC helper or reads process.env`, () => {
      const source = readSource(file);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${file} must not match ${pattern}`).toBe(false);
      }
    });
  }
});

// ── 25: no fetch/server action/mutation/onClick ─────────────────────────────

describe('Company Activity Signal Preview 01 — no fetch, server action, mutation, or onClick handler', () => {
  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} has no onClick, fetch, or 'use server' directive`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/onClick=/);
      expect(source).not.toMatch(/fetch\(/);
      expect(source).not.toMatch(/'use server'/);
    });
  }
});

// ── 26: no feature flag hardcoded ────────────────────────────────────────────

describe('Company Activity Signal Preview 01 — no feature flag hardcoded', () => {
  const forbiddenPatterns = [
    /KORA_LINK_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_DB_LOOKUP_ENABLED\s*=\s*(?:true|'true'|"true")/,
    /KORA_LINK_ACTIVATION_ENABLED\s*=\s*(?:true|'true'|"true")/,
  ];

  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} does not hardcode any KORA Link feature flag to true`, () => {
      const source = readSource(page);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});

// ── 27-30: proposed SQL untouched, invariants intact ────────────────────────

describe('Company Activity Signal Preview 01 — proposed SQL remains untouched, unapplied, and privacy-invariant', () => {
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

// ── 31: no DPO/CTO/fiscal/legal decision marked resolved ────────────────────

describe('Company Activity Signal Preview 01 — no DPO/CTO/fiscal/legal decision is marked resolved', () => {
  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} does not claim any pending decision has been made`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/deciso da (?:CTO|DPO)/i);
      expect(source).not.toMatch(/approvato dal (?:CTO|DPO)/i);
    });
  }

  it('docs/COMPANY_ACTIVITY_SIGNAL_PREVIEW_01.md does not mark any decision resolved', () => {
    const doc = readSource('docs/COMPANY_ACTIVITY_SIGNAL_PREVIEW_01.md');
    expect(doc).not.toMatch(/[Dd]ecisione presa/);
  });
});

// ── 32: company navigation remains correct ──────────────────────────────────

describe('Company Activity Signal Preview 01 — company navigation remains correct', () => {
  it('Sidebar still registers Segnali Attivazione pointing at /company/activity-signals', () => {
    const source = readSource('components/layout/Sidebar.tsx');
    expect(source).toContain("href: '/company/activity-signals'");
    expect(source).toMatch(/label: 'Segnali Attivazione'/);
  });
});

// ── 33: cross-links present ─────────────────────────────────────────────────

describe('Company Activity Signal Preview 01 — cross-links are present', () => {
  it(`${COMPANY_PAGE} links to admin pipeline, activity-selection, kora-index, activation, and contribution`, () => {
    const source = readSource(COMPANY_PAGE);
    expect(source).toContain('href="/admin/activation-signal-pipeline"');
    expect(source).toContain('href="/company/activity-selection"');
    expect(source).toContain('href="/company/kora-index"');
    expect(source).toContain('href="/company/activation"');
    expect(source).toContain('href="/company/contribution"');
  });

  it(`${SUMMARY_PAGE} links back to the full page and to the admin model`, () => {
    const source = readSource(SUMMARY_PAGE);
    expect(source).toContain('href="/company/activity-signals"');
    expect(source).toContain('href="/admin/activation-signal-pipeline"');
  });

  it(`${ADMIN_PAGE} links to /company/activity-signals`, () => {
    const source = readSource(ADMIN_PAGE);
    expect(source).toContain('href="/company/activity-signals"');
  });
});

// ── 34-36: KORA Index engine, ingestion/UEF, and commons tables untouched ──

describe('Company Activity Signal Preview 01 — KORA Index engine and ingestion remain untouched', () => {
  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });

  it('lib/ingestion/raw-to-uef-interpreter.ts still bears its original header (not rewritten)', () => {
    const interpreter = readSource('lib/ingestion/raw-to-uef-interpreter.ts');
    expect(interpreter).toMatch(/Raw-to-UEF Rule-Based Interpreter v0\.1/);
  });
});

describe('Company Activity Signal Preview 01 — commons.post, commons.booking, commons.contribution_event remain untouched', () => {
  it('migration 013 still creates commons.post unmodified', () => {
    const migration = readSource('supabase/migrations/013_kora_commons.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.post');
  });

  it('migration 025 still creates commons.booking and commons.contribution_event unmodified', () => {
    const migration = readSource('supabase/migrations/025_commons_booking_contribution.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.booking');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.contribution_event');
  });

  for (const page of [COMPANY_PAGE, SUMMARY_PAGE]) {
    it(`${page} does not import commons types`, () => {
      const source = readSource(page);
      expect(source).not.toMatch(/from ['"]@\/lib\/commons/);
    });
  }
});
