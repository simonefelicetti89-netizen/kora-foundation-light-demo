// tests/unit/b99b-worker-achievements.test.ts
// B99-B — Worker recognition layer: achievement model, service, Dynamic CV integration,
//          Commons integration, privacy copy.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { workerAchievementService } from '../../services/worker-achievements/WorkerAchievementService';
import {
  STATUS_LABELS,
  STATUS_DESCRIPTION,
  VERIFICATION_LEVEL_LABELS,
  PILLAR_ACHIEVEMENT_LABELS,
  type AchievementStatus,
  type AchievementVerificationLevel,
  type AchievementPillar,
} from '../../lib/worker-achievements/types';

function readFile(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf-8');
}

// ── Achievement model: type completeness ──────────────────────────────────────

describe('Achievement type definitions', () => {
  it('STATUS_LABELS covers all 4 statuses', () => {
    const statuses: AchievementStatus[] = ['participated', 'pending_verification', 'verified', 'recognized'];
    for (const s of statuses) {
      expect(STATUS_LABELS[s]).toBeTruthy();
    }
  });

  it('STATUS_DESCRIPTION covers all 4 statuses', () => {
    const statuses: AchievementStatus[] = ['participated', 'pending_verification', 'verified', 'recognized'];
    for (const s of statuses) {
      expect(STATUS_DESCRIPTION[s]).toBeTruthy();
    }
  });

  it('VERIFICATION_LEVEL_LABELS covers all 3 levels', () => {
    const levels: AchievementVerificationLevel[] = ['external', 'partial', 'self_declared'];
    for (const l of levels) {
      expect(VERIFICATION_LEVEL_LABELS[l]).toBeTruthy();
    }
  });

  it('PILLAR_ACHIEVEMENT_LABELS covers all 5 pillars', () => {
    const pillars: AchievementPillar[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
    for (const p of pillars) {
      expect(PILLAR_ACHIEVEMENT_LABELS[p]).toBeTruthy();
    }
  });
});

// ── WorkerAchievementService — getAchievements() ─────────────────────────────

describe('WorkerAchievementService — getAchievements()', () => {
  it('returns at least 15 achievements', () => {
    expect(workerAchievementService.getAchievements().length).toBeGreaterThanOrEqual(15);
  });

  it('every achievement has required fields', () => {
    for (const a of workerAchievementService.getAchievements()) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.pillar).toBeTruthy();
      expect(a.status).toBeTruthy();
      expect(a.verificationLevel).toBeTruthy();
      expect(typeof a.cvEligible).toBe('boolean');
      expect(a.organization).toBeTruthy();
      expect(a.completionDate).toBeTruthy();
      expect(a.synthetic_demo_data).toBe(true);
    }
  });

  it('all pillars are canonical KORA pillars', () => {
    const valid = new Set<AchievementPillar>(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']);
    for (const a of workerAchievementService.getAchievements()) {
      expect(valid.has(a.pillar)).toBe(true);
    }
  });

  it('all statuses are valid', () => {
    const valid = new Set<AchievementStatus>(['participated', 'pending_verification', 'verified', 'recognized']);
    for (const a of workerAchievementService.getAchievements()) {
      expect(valid.has(a.status)).toBe(true);
    }
  });

  it('all verificationLevels are valid', () => {
    const valid = new Set<AchievementVerificationLevel>(['external', 'partial', 'self_declared']);
    for (const a of workerAchievementService.getAchievements()) {
      expect(valid.has(a.verificationLevel)).toBe(true);
    }
  });

  it('completionDate is a valid ISO date string', () => {
    for (const a of workerAchievementService.getAchievements()) {
      expect(new Date(a.completionDate).toString()).not.toBe('Invalid Date');
    }
  });

  it('all IDs are unique', () => {
    const all = workerAchievementService.getAchievements();
    const ids = all.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all 5 pillars are represented in the dataset', () => {
    const all = workerAchievementService.getAchievements();
    const pillars = new Set(all.map((a) => a.pillar));
    for (const p of ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']) {
      expect(pillars.has(p as AchievementPillar)).toBe(true);
    }
  });
});

// ── CV eligibility — status derivation rule ───────────────────────────────────

describe('Achievement status derivation', () => {
  it('cvEligible is only true on verified or recognized achievements', () => {
    const all = workerAchievementService.getAchievements();
    for (const a of all) {
      if (a.cvEligible) {
        expect(['verified', 'recognized']).toContain(a.status);
      }
    }
  });

  it('participated achievements are never cvEligible', () => {
    const participated = workerAchievementService.getAchievements()
      .filter((a) => a.status === 'participated');
    for (const a of participated) {
      expect(a.cvEligible).toBe(false);
    }
  });

  it('pending_verification achievements are never cvEligible', () => {
    const pending = workerAchievementService.getAchievements()
      .filter((a) => a.status === 'pending_verification');
    for (const a of pending) {
      expect(a.cvEligible).toBe(false);
    }
  });
});

// ── WorkerAchievementService — getRecentAchievements() ───────────────────────

describe('WorkerAchievementService — getRecentAchievements()', () => {
  it('returns at most 5 by default', () => {
    expect(workerAchievementService.getRecentAchievements().length).toBeLessThanOrEqual(5);
  });

  it('respects custom limit', () => {
    expect(workerAchievementService.getRecentAchievements(3).length).toBeLessThanOrEqual(3);
  });

  it('is sorted most-recent first (descending completionDate)', () => {
    const recent = workerAchievementService.getRecentAchievements();
    for (let i = 1; i < recent.length; i++) {
      expect(recent[i].completionDate <= recent[i - 1].completionDate).toBe(true);
    }
  });
});

// ── WorkerAchievementService — getVerifiedAchievements() ─────────────────────

describe('WorkerAchievementService — getVerifiedAchievements()', () => {
  it('returns only verified or recognized achievements', () => {
    for (const a of workerAchievementService.getVerifiedAchievements()) {
      expect(['verified', 'recognized']).toContain(a.status);
    }
  });

  it('returns at least one achievement', () => {
    expect(workerAchievementService.getVerifiedAchievements().length).toBeGreaterThan(0);
  });
});

// ── WorkerAchievementService — getCvEligibleAchievements() ───────────────────

describe('WorkerAchievementService — getCvEligibleAchievements()', () => {
  it('all returned achievements are cvEligible', () => {
    for (const a of workerAchievementService.getCvEligibleAchievements()) {
      expect(a.cvEligible).toBe(true);
    }
  });

  it('all returned achievements are verified or recognized', () => {
    for (const a of workerAchievementService.getCvEligibleAchievements()) {
      expect(['verified', 'recognized']).toContain(a.status);
    }
  });

  it('returns at least one achievement', () => {
    expect(workerAchievementService.getCvEligibleAchievements().length).toBeGreaterThan(0);
  });
});

// ── WorkerAchievementService — getAchievementStats() ─────────────────────────

describe('WorkerAchievementService — getAchievementStats()', () => {
  it('returns valid stats object', () => {
    const stats = workerAchievementService.getAchievementStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.verified).toBeGreaterThanOrEqual(0);
    expect(stats.shareable).toBeGreaterThanOrEqual(0);
    expect(stats.pending).toBeGreaterThanOrEqual(0);
    expect(stats.recognized).toBeGreaterThanOrEqual(0);
    expect(stats.synthetic_demo_data).toBe(true);
  });

  it('shareable <= verified', () => {
    const stats = workerAchievementService.getAchievementStats();
    expect(stats.shareable).toBeLessThanOrEqual(stats.verified);
  });

  it('recognized <= verified', () => {
    const stats = workerAchievementService.getAchievementStats();
    expect(stats.recognized).toBeLessThanOrEqual(stats.verified);
  });

  it('total = verified + pending + participated', () => {
    const all = workerAchievementService.getAchievements();
    const stats = workerAchievementService.getAchievementStats();
    const participatedCount = all.filter((a) => a.status === 'participated').length;
    expect(stats.verified + stats.pending + participatedCount).toBe(stats.total);
  });

  it('stats.total matches getAchievements().length', () => {
    const stats = workerAchievementService.getAchievementStats();
    expect(stats.total).toBe(workerAchievementService.getAchievements().length);
  });
});

// ── Privacy constraints ───────────────────────────────────────────────────────

describe('Achievement privacy constraints', () => {
  it('My KORA page contains recognition privacy copy', () => {
    const page = readFile('app/my-kora/page.tsx');
    expect(page).toContain('Il riconoscimento appartiene a te.');
    expect(page).toContain('Non è visibile individualmente al datore di lavoro.');
  });

  it('Dynamic CV page contains recognition privacy copy', () => {
    const page = readFile('app/my-kora/dynamic-cv/page.tsx');
    expect(page).toContain('Il riconoscimento appartiene a te.');
    expect(page).toContain('Non è visibile individualmente al datore di lavoro.');
  });

  it('WorkerAchievementService has no employer-facing method', () => {
    const service = workerAchievementService as unknown as Record<string, unknown>;
    expect(service['getAchievementsForEmployer']).toBeUndefined();
    expect(service['getCompanyAchievements']).toBeUndefined();
  });

  it('achievement data is marked synthetic_demo_data: true', () => {
    const stats = workerAchievementService.getAchievementStats();
    expect(stats.synthetic_demo_data).toBe(true);
    for (const a of workerAchievementService.getAchievements()) {
      expect(a.synthetic_demo_data).toBe(true);
    }
  });
});

// ── Dynamic CV integration ────────────────────────────────────────────────────

describe('Dynamic CV integration (Task 6)', () => {
  it('Dynamic CV page imports workerAchievementService', () => {
    const page = readFile('app/my-kora/dynamic-cv/page.tsx');
    expect(page).toContain('workerAchievementService');
  });

  it('Dynamic CV page has cv-readiness-panel section', () => {
    const page = readFile('app/my-kora/dynamic-cv/page.tsx');
    expect(page).toContain('cv-readiness-panel');
    expect(page).toContain('Elementi pronti per il Dynamic CV');
  });

  it('Dynamic CV page shows verified, shareable, pending counts', () => {
    const page = readFile('app/my-kora/dynamic-cv/page.tsx');
    expect(page).toContain('cv-ready-verified');
    expect(page).toContain('cv-ready-shareable');
    expect(page).toContain('cv-ready-pending');
  });

  it('Dynamic CV page explains why items are not yet visible', () => {
    const page = readFile('app/my-kora/dynamic-cv/page.tsx');
    expect(page).toContain('Richiedono una verifica esterna');
  });
});

// ── My KORA page sections ─────────────────────────────────────────────────────

describe('My KORA page — achievement sections (Task 4, 5, 7, 9)', () => {
  const page = readFile('app/my-kora/page.tsx');

  it('has achievements-section with data-testid', () => {
    expect(page).toContain('data-testid="achievements-section"');
  });

  it('has participation-journey with data-testid', () => {
    expect(page).toContain('data-testid="participation-journey"');
  });

  it('participation journey has 4 steps', () => {
    expect(page).toContain('Partecipazione');
    expect(page).toContain('Verifica');
    expect(page).toContain('Riconoscimento');
    expect(page).toContain('Dynamic CV');
  });

  it('has recognition-summary with data-testid', () => {
    expect(page).toContain('data-testid="recognition-summary"');
  });

  it('recognition summary shows 4 metrics', () => {
    expect(page).toContain('Totali');
    expect(page).toContain('Verificati');
    expect(page).toContain('Condivisibili');
    expect(page).toContain('In verifica');
  });

  it('has achievement-privacy-note with data-testid', () => {
    expect(page).toContain('data-testid="achievement-privacy-note"');
  });

  it('has achievement-cards section', () => {
    expect(page).toContain('data-testid="achievement-cards"');
  });

  it('shows "Pronto per il Dynamic CV" on cvEligible achievements', () => {
    expect(page).toContain('Pronto per il Dynamic CV');
  });

  it('imports WorkerAchievementService', () => {
    expect(page).toContain('workerAchievementService');
  });
});

// ── Commons integration (Task 8) ─────────────────────────────────────────────

// Commons "recognition eligibility" badge (Task 8) relied on the synthetic
// verification_possible field, retired by CC-052 (2026-08-31): the field
// was explicitly DEFERRED (no live commons.post column, no confirmed
// product owner) rather than backed by a placeholder value. See
// lib/commons/discovery-view.ts's own header for the full field
// disposition. If a real evidence-verification concept is promoted into
// canonical KORA Space scope later, it belongs on a fresh ticket, not a
// revived synthetic flag.
describe('Commons page — no synthetic verification_possible remnant', () => {
  it('Commons page does not reference the retired verification_possible field', () => {
    const page = readFile('app/commons/page.tsx');
    expect(page).not.toContain('verification_possible');
  });
});

// ── No gamification / no ranking / no scores ──────────────────────────────────

describe('No gamification, no ranking, no scores (architectural constraint)', () => {
  it('achievement data has no points, badges, or ranking fields', () => {
    for (const a of workerAchievementService.getAchievements()) {
      const r = a as unknown as Record<string, unknown>;
      expect(r['points']).toBeUndefined();
      expect(r['badge']).toBeUndefined();
      expect(r['rank']).toBeUndefined();
      expect(r['score']).toBeUndefined();
      expect(r['leaderboard']).toBeUndefined();
    }
  });

  it('getAchievementStats has no ranking or leaderboard field', () => {
    const stats = workerAchievementService.getAchievementStats() as unknown as Record<string, unknown>;
    expect(stats['rank']).toBeUndefined();
    expect(stats['leaderboard']).toBeUndefined();
    expect(stats['points']).toBeUndefined();
    expect(stats['badges']).toBeUndefined();
  });

  it('My KORA page has no positive gamification claims', () => {
    const page = readFile('app/my-kora/page.tsx');
    // Positive gamification claims must not appear. Anti-gamification copy ("nessuna classifica") is fine.
    expect(page).not.toContain('sei in classifica');
    expect(page).not.toContain('trofeo');
    expect(page).not.toContain('guadagna punti');
    expect(page).not.toContain('hai vinto');
    expect(page).not.toContain('livello raggiunto');
  });
});
