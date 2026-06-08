// services/worker-achievements/WorkerAchievementService.ts
// B99-B — Worker recognition layer service.
// Reads synthetic demo achievements. Worker-private: employer roles never call this service.
// No IU generation. No DB writes. No auth. No real verification workflow.

import type { AchievementPreview, AchievementStats } from '@/lib/worker-achievements/types';
import achievementsData from '@/data/synthetic/worker-achievements.json';

const records = (achievementsData as { data: AchievementPreview[] }).data;

class WorkerAchievementService {
  getAchievements(): AchievementPreview[] {
    return records;
  }

  // Most recent first, limited by n (default 5)
  getRecentAchievements(limit = 5): AchievementPreview[] {
    return [...records]
      .sort((a, b) => b.completionDate.localeCompare(a.completionDate))
      .slice(0, limit);
  }

  // verified + recognized
  getVerifiedAchievements(): AchievementPreview[] {
    return records.filter(
      (a) => a.status === 'verified' || a.status === 'recognized',
    );
  }

  // verified/recognized AND cvEligible
  getCvEligibleAchievements(): AchievementPreview[] {
    return records.filter(
      (a) => a.cvEligible && (a.status === 'verified' || a.status === 'recognized'),
    );
  }

  getAchievementStats(): AchievementStats {
    const total      = records.length;
    const verified   = records.filter((a) => a.status === 'verified' || a.status === 'recognized').length;
    const shareable  = records.filter((a) => a.cvEligible && (a.status === 'verified' || a.status === 'recognized')).length;
    const pending    = records.filter((a) => a.status === 'pending_verification').length;
    const recognized = records.filter((a) => a.status === 'recognized').length;

    return { total, verified, shareable, pending, recognized, synthetic_demo_data: true };
  }
}

export const workerAchievementService = new WorkerAchievementService();
