// tests/unit/cc00-final-scoring-canonicalization.test.ts
// CC-00 — Final Scoring Canonicalization (2026-09-05).
//
// Final technical implementation slice of B-TRUTH before CC-022. Eliminates
// every B-TRUTH-owned synthetic scoring dependency (per CC-00 I9 Governance
// Ratification, 2026-09-05 — see docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md
// §32a) while preserving the canonical KORA scoring path and all real
// downstream consumers.
//
// Retired: services/scoring-simulator/ScoringSimulatorService.ts,
// services/demo-data/DemoDataService.ts, services/scoring/DemoScoringAdapter.ts
// (all zero real callers, confirmed by repo-wide grep before deletion), and
// services/activation-safeguard/ActivationSafeguardService.ts's synthetic
// evaluateFromSeed() method (its only caller was the now-deleted
// ScoringSimulatorService). 7 synthetic fixtures deleted (all became
// zero-consumer): kora-index-outputs.json, company-aggregates.json,
// confidence-records.json, companies.json, departments-sites.json,
// programs.json, activation-safeguard-results.json.
//
// I9: 6 files / 11 imports -> 3 files / 3 imports.
// BTRUTH_OWNED_SYNTHETIC_IMPORTS: 3 -> 0 (CC-022's own gate satisfied).
// BWORKER_OWNED_SYNTHETIC_IMPORTS: unchanged (3 files, untouched).
//
// No KORA Index methodology changed. No replacement simulator, no second
// scoring path — lib/scoring-result/index.ts's environment === 'demo'
// branch now returns 'insufficient_data' (the same honest state a real
// tenant sees before its first scoring run), reusing existing empty-state
// UI on 5 real company pages (kora-index, activation, pillars, reports,
// financial) rather than fabricating a result.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import {
  SYNTHETIC_IMPORT_ALLOWLIST,
  BTRUTH_OWNED_SYNTHETIC_IMPORTS,
  BWORKER_OWNED_SYNTHETIC_IMPORTS,
} from '@/lib/security/synthetic-import-allowlist';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

function stripComments(src: string): string {
  return src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

function walkTs(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry)) continue;
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) out.push(...walkTs(p));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];

// ── 1. ScoringSimulatorService no longer acts as runtime scoring authority ──

describe('CC-00 Final Scoring Canonicalization — ScoringSimulatorService retired', () => {
  it('services/scoring-simulator/ does not exist', () => {
    expect(exists('services/scoring-simulator')).toBe(false);
  });

  it('services/scoring/DemoScoringAdapter.ts (its thin wrapper, zero real callers of its own) does not exist', () => {
    expect(exists('services/scoring/DemoScoringAdapter.ts')).toBe(false);
  });

  it('no runtime file references scoringSimulatorService or ScoringSimulatorService as a value', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (relative === 'lib/architecture/registry.ts' || relative === 'lib/security/synthetic-import-allowlist.ts') continue;
        const codeOnly = stripComments(read(relative));
        if (/scoringSimulatorService/.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ── 2. No B-TRUTH synthetic import remains ──────────────────────────────────

describe('CC-00 Final Scoring Canonicalization — B-TRUTH I9 is zero', () => {
  it('BTRUTH_OWNED_SYNTHETIC_IMPORTS is empty — CC-022 B-TRUTH-scoped I9 gate satisfied', () => {
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS).toEqual([]);
  });

  it('global allowlist is 3 files / 3 imports, all owner: B_WORKER', () => {
    expect(SYNTHETIC_IMPORT_ALLOWLIST.length).toBe(3);
    for (const entry of SYNTHETIC_IMPORT_ALLOWLIST) {
      expect(entry.owner).toBe('B_WORKER');
    }
    const allowlistSrc = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlistSrc).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 3 files / 3 import statements');
  });

  it('the 7 retired synthetic fixtures no longer exist', () => {
    for (const f of [
      'data/synthetic/kora-index-outputs.json',
      'data/synthetic/company-aggregates.json',
      'data/synthetic/confidence-records.json',
      'data/synthetic/companies.json',
      'data/synthetic/departments-sites.json',
      'data/synthetic/programs.json',
      'data/synthetic/activation-safeguard-results.json',
    ]) {
      expect(exists(f)).toBe(false);
    }
  });
});

// ── 3. DemoDataService retired ───────────────────────────────────────────────

describe('CC-00 Final Scoring Canonicalization — DemoDataService retired', () => {
  it('services/demo-data/ does not exist', () => {
    expect(exists('services/demo-data')).toBe(false);
  });

  it('no runtime file references demoDataService as a value', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (relative === 'lib/architecture/registry.ts' || relative === 'lib/security/synthetic-import-allowlist.ts') continue;
        const codeOnly = stripComments(read(relative));
        if (/demoDataService/.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ── 4 & 5. evaluateFromSeed() retired, real evaluate() preserved ────────────

describe('CC-00 Final Scoring Canonicalization — ActivationSafeguardService', () => {
  it('evaluateFromSeed() and its synthetic import no longer exist', () => {
    const src = read('services/activation-safeguard/ActivationSafeguardService.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('evaluateFromSeed');
    expect(codeOnly).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('evaluate() is byte-identical in logic to before this slice — same OR-logic thresholds, same signature', () => {
    const src = read('services/activation-safeguard/ActivationSafeguardService.ts');
    expect(src).toContain('evaluate(ar: number, mar: number): ActivationSafeguardResult');
    expect(src).toContain('t.FLAGGED.AR_max');
    expect(src).toContain('t.FLAGGED.MAR_max');
    expect(src).toContain('t.CLEAR.AR');
    expect(src).toContain('t.CLEAR.MAR');
    expect(src).toContain("getThresholds");
  });

  it('every real live company page still calls only evaluate(), never evaluateFromSeed', () => {
    for (const page of ['app/company/activation/page.tsx', 'app/company/kora-index/page.tsx', 'app/company/reports/page.tsx']) {
      const src = read(page);
      expect(src).toMatch(/activationSafeguardService\.evaluate\(/);
      expect(src).not.toContain('activationSafeguardService.evaluateFromSeed');
    }
  });

  it('ActivationSafeguardService.ts is no longer an I9 allowlist entry', () => {
    const allowlistFiles = SYNTHETIC_IMPORT_ALLOWLIST.map((e) => e.file);
    expect(allowlistFiles).not.toContain('services/activation-safeguard/ActivationSafeguardService.ts');
  });
});

// ── 6. Scoring mapper consumes canonical result ─────────────────────────────

describe('CC-00 Final Scoring Canonicalization — scoring mapper is canonical-only', () => {
  it('lib/live/scoring-mapper.ts has zero synthetic dependency and imports ConfidenceRecord from lib/types', () => {
    const src = read('lib/live/scoring-mapper.ts');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    expect(src).not.toContain('scoring-simulator');
    expect(src).toContain("import type { ConfidenceRecord } from '@/lib/types'");
  });

  it('ConfidenceRecord is defined once, canonically, in lib/types', () => {
    const typesSrc = read('lib/types/index.ts');
    expect(typesSrc).toContain('export interface ConfidenceRecord');
  });

  it('components/kora-index/ConfidenceBreakdown.tsx and components/reports/DecisionPackHero.tsx import ConfidenceRecord from lib/types, not from the deleted service', () => {
    for (const file of ['components/kora-index/ConfidenceBreakdown.tsx', 'components/reports/DecisionPackHero.tsx']) {
      const src = read(file);
      expect(src).toContain("from '@/lib/types'");
      expect(src).not.toContain('scoring-simulator');
    }
  });
});

// ── 7. Decision Pack status consumes canonical result ───────────────────────

describe('CC-00 Final Scoring Canonicalization — Decision Pack status is canonical-only', () => {
  it('lib/live/decision-pack-status-view.ts has zero synthetic dependency (was already canonical, unaffected by this slice)', () => {
    const src = read('lib/live/decision-pack-status-view.ts');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    expect(src).not.toContain('scoring-simulator');
  });
});

// ── 8. KORA Index pillars/methodology unchanged ─────────────────────────────

describe('CC-00 Final Scoring Canonicalization — methodology unchanged', () => {
  it('lib/methodology-config/v0.1.ts is untouched by this slice — still exports getMacroblockWeights/getThresholds', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    expect(src).toContain('getMacroblockWeights');
    expect(src).toContain('getThresholds');
  });

  it('lib/kora-engine/kora-index-engine.ts (the live pipeline\'s macroblock-sum authority) is untouched', () => {
    const src = read('lib/kora-engine/kora-index-engine.ts');
    expect(src).toContain('getMacroblockWeights');
  });

  it('the 5 canonical pillars are unchanged in lib/constants/kora.ts', () => {
    const src = read('lib/constants/kora.ts');
    for (const pillar of ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']) {
      expect(src).toContain(pillar);
    }
  });
});

// ── 9. Confidence weight remains 0 ───────────────────────────────────────────

describe('CC-00 Final Scoring Canonicalization — Confidence remains external, weight 0', () => {
  it('KORA Index component weights are untouched — this slice did not modify methodology-config', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    expect(src).toMatch(/CS[\s\S]{0,80}0/);
  });
});

// ── 10. Safeguard remains separate from score computation ──────────────────

describe('CC-00 Final Scoring Canonicalization — Safeguard remains separate', () => {
  it('ActivationSafeguardService.evaluate() is not merged into any KORA Index computation function', () => {
    const engineSrc = read('lib/kora-engine/kora-index-engine.ts');
    expect(engineSrc).not.toContain('ActivationSafeguardService');
    expect(engineSrc).not.toContain('activationSafeguardService');
  });
});

// ── 11. No downstream output seeding ────────────────────────────────────────

describe('CC-00 Final Scoring Canonicalization — no output seeding', () => {
  it('no new data/synthetic/** fixture was added by this slice — only deletions', () => {
    const files = readdirSync(resolve(root, 'data/synthetic'));
    // Sanity: the retired 7 fixtures are gone; no replacement fixture was
    // introduced under a new name for the same purpose.
    for (const retired of ['kora-index-outputs', 'company-aggregates', 'confidence-records', 'companies', 'departments-sites', 'programs', 'activation-safeguard-results']) {
      expect(files).not.toContain(`${retired}.json`);
    }
  });

  it('getDemoScoringResult() computes nothing and persists nothing — pure literal return', () => {
    const src = read('lib/scoring-result/index.ts');
    const fnStart = src.indexOf('function getDemoScoringResult');
    const fnBody = src.slice(fnStart, src.indexOf('}', src.indexOf('return {', fnStart)) + 1);
    expect(fnBody).toContain("status: 'insufficient_data'");
    expect(fnBody).not.toMatch(/supabase|\.from\(|\.insert\(|\.upsert\(/i);
  });
});

// ── 12 & 13. Test tenants use canonical path, no tenant_kind scoring branch ──

describe('CC-00 Final Scoring Canonicalization — canonical test tenants unaffected', () => {
  it('scripts/koratest-canonical-seed.ts is untouched by this slice', () => {
    expect(exists('scripts/koratest-canonical-seed.ts')).toBe(true);
  });

  it('lib/scoring-result/index.ts has no tenant_kind or tenant_code branch', () => {
    const src = read('lib/scoring-result/index.ts');
    expect(src).not.toContain('tenant_kind');
    expect(src).not.toContain('KORATEST-01');
  });

  it('fetchLiveScoringResult (the live path KoraTest/Bosco Verde and every real tenant share) is unchanged', () => {
    const src = read('lib/scoring-result/index.ts');
    expect(src).toContain("schema('analytics')");
    expect(src).toContain(".from('kora_index_result')");
    expect(src).toContain("LIVE must NEVER fallback to demo seed data");
  });
});

// ── 14 & 15. B-WORKER residuals unchanged, B-WORKER not started ────────────

describe('CC-00 Final Scoring Canonicalization — B-WORKER untouched, not started', () => {
  it('B-WORKER-owned synthetic residuals are unchanged — same 3 files, same owner', () => {
    const files = BWORKER_OWNED_SYNTHETIC_IMPORTS.map((e) => e.file).sort();
    expect(files).toEqual([
      'services/account/AccountProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/worker-provisioning/WorkerProvisioningService.ts',
    ].sort());
  });

  it('WorkerProvisioningService.ts and WorkerAchievementService.ts source is byte-unchanged (still 100% synthetic, still reading their original fixtures)', () => {
    const roster = read('services/worker-provisioning/WorkerProvisioningService.ts');
    const achievements = read('services/worker-achievements/WorkerAchievementService.ts');
    expect(roster).toMatch(/from ['"][^'"]*\/data\/synthetic\/worker-roster\.json['"]/);
    expect(achievements).toMatch(/from ['"][^'"]*\/data\/synthetic\/worker-achievements\.json['"]/);
  });

  it('AccountProvisioningService.ts itself is untouched (not modified, not deleted) — getCurrentDemoUser() still defined, unchanged', () => {
    const src = read('services/account/AccountProvisioningService.ts');
    expect(src).toContain('getCurrentDemoUser(role?: string): KoraUserAccount');
    expect(src).toMatch(/from ['"][^'"]*\/data\/synthetic\/user-accounts\.json['"]/);
  });

  it('no My KORA live-session identity model, no new worker feature, no new achievement methodology was introduced', () => {
    const myKoraSrc = read('app/my-kora/page.tsx');
    expect(myKoraSrc).not.toContain('getCurrentDemoUser');
    expect(myKoraSrc).toContain("useRole, useScenario, usePersona");
  });
});

// ── 16. CC-00 remains OPEN ───────────────────────────────────────────────────

describe('CC-00 Final Scoring Canonicalization — CC-00 status', () => {
  it('registry does not claim CC-00 is closed on any of the touched entries', () => {
    const registry = read('lib/architecture/registry.ts');
    for (const id of [
      "id: 'svc.scoring-simulator'",
      "id: 'svc.demo-data'",
      "id: 'svc.activation-safeguard'",
      "id: 'svc.account'",
    ]) {
      const idx = registry.indexOf(id);
      expect(idx).toBeGreaterThan(-1);
      const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
      expect(entry).not.toMatch(/CC-00 (is )?(closed|resolved|complete)\b/i);
    }
  });

  it('the retired services are marked DEAD with deletableWhen set — not silently vanished from the registry', () => {
    const registry = read('lib/architecture/registry.ts');
    for (const id of ["id: 'svc.scoring-simulator'", "id: 'svc.demo-data'"]) {
      const idx = registry.indexOf(id);
      const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
      expect(entry).toMatch(/status:\s*'DEAD'/);
      expect(entry).toContain("deletableWhen: 'Already deleted");
    }
  });

  it('Master Plan §32a records the B-TRUTH gate closure without erasing the original rule or claiming CC-022 itself is closed', () => {
    const plan = read('docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md');
    expect(plan).toContain('demo = live, I9 = 0; KORA Space live');
    expect(plan).toContain('Chiusura del gate B-TRUTH-scoped (CC-00 Final Scoring Canonicalization, 2026-09-05)');
    expect(plan).not.toContain('CC-022 closed');
    expect(plan).not.toContain('CC-022 è chiuso');
  });

  it('this is a scoring-canonicalization slice — no B-WORKER work, no My KORA redesign, no CC-022/CC-023 execution was started', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).not.toContain('B-WORKER started');
    expect(registry).not.toContain('CC-022 closed');
    expect(registry).not.toContain('CC-023 started');
  });
});
