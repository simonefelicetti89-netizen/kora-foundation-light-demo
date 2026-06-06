// tests/unit/my-kora-foundation.test.ts
// B70-B: My KORA Foundation Cleanup — unit tests
//
// Verifies: service-driven opportunities, DynamicCVService population,
// per-persona PIB dispatch, IU timeline values, PIB derivation metadata,
// privacy boundaries, and no employer access paths added.

import { describe, it, expect } from 'vitest';
import {
  myKoraPreviewService,
  type MyKoraHomePreview,
  type PibLightPreview,
  type TimelineItem,
} from '@/services/my-kora-preview/MyKoraPreviewService';
import { DynamicCVService } from '@/services/dynamic-cv/DynamicCVService';
import { PIBAggregationService } from '@/services/pib-aggregation/PIBAggregationService';

// ── MyKoraPreviewService — opportunities are service-driven ──────────────────

describe('MyKoraPreviewService.getOpportunitiesForPersona', () => {
  it('returns a non-empty array for persona-elena-m', () => {
    const opps = myKoraPreviewService.getOpportunitiesForPersona('persona-elena-m');
    expect(opps.length).toBeGreaterThan(0);
  });

  it('returns a non-empty array for persona-marco-t', () => {
    const opps = myKoraPreviewService.getOpportunitiesForPersona('persona-marco-t');
    expect(opps.length).toBeGreaterThan(0);
  });

  it('returns a non-empty array for persona-sofia-r', () => {
    const opps = myKoraPreviewService.getOpportunitiesForPersona('persona-sofia-r');
    expect(opps.length).toBeGreaterThan(0);
  });

  it('returns a non-empty array for persona-giovanni-b (Persona D)', () => {
    const opps = myKoraPreviewService.getOpportunitiesForPersona('persona-giovanni-b');
    expect(opps.length).toBeGreaterThan(0);
  });

  it('each opportunity has required fields', () => {
    const opps = myKoraPreviewService.getOpportunitiesForPersona('persona-elena-m');
    for (const opp of opps) {
      expect(opp.id).toBeTruthy();
      expect(opp.title).toBeTruthy();
      expect(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']).toContain(opp.pillar);
      expect(['partner', 'internal', 'community']).toContain(opp.type);
      expect(['coming_soon', 'preview']).toContain(opp.status);
    }
  });

  it('Elena M. opportunities are LIFE-weighted (pillar affinity)', () => {
    const opps = myKoraPreviewService.getOpportunitiesForPersona('persona-elena-m');
    const lifePillars = opps.filter((o) => o.pillar === 'LIFE').length;
    expect(lifePillars).toBeGreaterThanOrEqual(1);
  });

  it('Giovanni B. opportunities include LEGACY pillar (persona D affinity)', () => {
    const opps = myKoraPreviewService.getOpportunitiesForPersona('persona-giovanni-b');
    const legacyPillars = opps.filter((o) => o.pillar === 'LEGACY').length;
    expect(legacyPillars).toBeGreaterThanOrEqual(1);
  });

  it('unknown persona falls back to Persona A (elena-m) data', () => {
    const opps = myKoraPreviewService.getOpportunitiesForPersona('unknown-persona');
    expect(opps.length).toBeGreaterThan(0);
  });
});

// ── DynamicCVService — no longer an empty stub ───────────────────────────────

describe('DynamicCVService.getProfile — Foundation Light population', () => {
  const service = new DynamicCVService();

  it('returns non-empty cv_items for WORKER role (elena-m)', () => {
    const profile = service.getProfile('persona-elena-m', 'WORKER');
    expect(profile).not.toBeNull();
    expect(profile!.cv_items.length).toBeGreaterThan(0);
  });

  it('returns non-empty cv_items for persona-giovanni-b (Persona D)', () => {
    const profile = service.getProfile('persona-giovanni-b', 'WORKER');
    expect(profile).not.toBeNull();
    expect(profile!.cv_items.length).toBeGreaterThan(0);
  });

  it('each cv_item has id, title, pillar, status', () => {
    const profile = service.getProfile('persona-sofia-r', 'WORKER');
    expect(profile).not.toBeNull();
    for (const item of profile!.cv_items) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']).toContain(item.pillar);
      expect(['verified', 'partial', 'self_declared']).toContain(item.status);
    }
  });

  it('sharing_settings keys match cv_items ids', () => {
    const profile = service.getProfile('persona-marco-t', 'WORKER');
    expect(profile).not.toBeNull();
    for (const item of profile!.cv_items) {
      expect(typeof profile!.sharing_settings[item.id]).toBe('boolean');
    }
  });

  it('synthetic_demo_data is true', () => {
    const profile = service.getProfile('persona-elena-m', 'WORKER');
    expect(profile!.synthetic_demo_data).toBe(true);
  });

  it('throws on COMPANY_ADMIN role — privacy invariant', () => {
    expect(() => service.getProfile('any-worker', 'COMPANY_ADMIN')).toThrow();
  });

  it('throws on COMPANY_VIEWER role — privacy invariant', () => {
    expect(() => service.getProfile('any-worker', 'COMPANY_VIEWER')).toThrow();
  });

  it('throws on ADVISOR role — privacy invariant', () => {
    expect(() => service.getProfile('any-worker', 'ADVISOR')).toThrow();
  });
});

// ── MyKoraPreviewService.getMyKoraHomePreview — persona dispatch ─────────────

describe('MyKoraPreviewService.getMyKoraHomePreview — persona dispatch', () => {
  it('returns non-null for persona-elena-m / S1', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview('persona-elena-m', 'S1');
    expect(preview).not.toBeNull();
  });

  it('returns non-null for all four personas', () => {
    const ids = ['persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b'];
    for (const id of ids) {
      const preview = myKoraPreviewService.getMyKoraHomePreview(id, 'S1');
      expect(preview).not.toBeNull();
    }
  });

  it('different personas return different overall_index values', () => {
    const a = myKoraPreviewService.getMyKoraHomePreview('persona-elena-m', 'S1');
    const c = myKoraPreviewService.getMyKoraHomePreview('persona-sofia-r', 'S1');
    const d = myKoraPreviewService.getMyKoraHomePreview('persona-giovanni-b', 'S1');
    expect(a!.pib_light.overall_index).not.toBe(c!.pib_light.overall_index);
    expect(a!.pib_light.overall_index).not.toBe(d!.pib_light.overall_index);
  });

  it('persona_id in result matches input persona id', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview('persona-marco-t', 'S1');
    expect(preview!.persona_id).toBe('persona-marco-t');
  });

  it('synthetic_demo_data is true', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview('persona-elena-m', 'S1') as MyKoraHomePreview;
    expect(preview.synthetic_demo_data).toBe(true);
  });

  it('S2 scenario returns higher overall_index than S1 for same persona (growth story)', () => {
    const s1 = myKoraPreviewService.getMyKoraHomePreview('persona-elena-m', 'S1');
    const s2 = myKoraPreviewService.getMyKoraHomePreview('persona-elena-m', 'S2');
    expect(s2!.pib_light.overall_index).toBeGreaterThan(s1!.pib_light.overall_index);
  });
});

// ── PibLightPreview — derivation metadata ────────────────────────────────────

describe('PibLightPreview — derivation metadata (B70-B Option B)', () => {
  function getPib(personaId: string): PibLightPreview {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    return preview!.pib_light;
  }

  it('pib_derivation_basis is synthetic_iu_pre_computed', () => {
    expect(getPib('persona-elena-m').pib_derivation_basis).toBe('synthetic_iu_pre_computed');
  });

  it('pib_derivation_note is non-empty and mentions IU formula', () => {
    const note = getPib('persona-elena-m').pib_derivation_note;
    expect(note.length).toBeGreaterThan(0);
    expect(note).toContain('IU');
  });

  it('not_employer_visible is true', () => {
    expect(getPib('persona-elena-m').not_employer_visible).toBe(true);
  });

  it('not_performance_score is true', () => {
    expect(getPib('persona-elena-m').not_performance_score).toBe(true);
  });

  it('overall_index is in 0–100 range', () => {
    const ids = ['persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b'];
    for (const id of ids) {
      const idx = getPib(id).overall_index;
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(100);
    }
  });

  it('pillar_breakdown has exactly 5 pillars', () => {
    const breakdown = getPib('persona-elena-m').pillar_breakdown;
    expect(breakdown.length).toBe(5);
  });

  it('all 5 canonical pillar codes present', () => {
    const pillars = getPib('persona-elena-m').pillar_breakdown.map((p) => p.pillar);
    for (const code of ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']) {
      expect(pillars).toContain(code);
    }
  });

  it('pillar scores are in 0–100 range', () => {
    const breakdown = getPib('persona-sofia-r').pillar_breakdown;
    for (const p of breakdown) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    }
  });

  it('pillar iu_total values are non-negative', () => {
    const breakdown = getPib('persona-giovanni-b').pillar_breakdown;
    for (const p of breakdown) {
      expect(p.iu_total).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── TimelineItem — IU values ──────────────────────────────────────────────────

describe('TimelineItem — iu_value (pre-computed formula)', () => {
  function getTimeline(personaId: string): TimelineItem[] {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    return preview!.timeline;
  }

  it('all timeline items have iu_value > 0', () => {
    const items = getTimeline('persona-elena-m');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.iu_value).toBeGreaterThan(0);
    }
  });

  it('iu_value is a finite number (not NaN, not Infinity)', () => {
    const items = getTimeline('persona-marco-t');
    for (const item of items) {
      expect(Number.isFinite(item.iu_value)).toBe(true);
    }
  });

  it('iu_value is a reasonable IU range (0 < iu_value <= 5.0)', () => {
    const ids = ['persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b'];
    for (const id of ids) {
      const items = getTimeline(id);
      for (const item of items) {
        expect(item.iu_value).toBeGreaterThan(0);
        expect(item.iu_value).toBeLessThanOrEqual(5.0);
      }
    }
  });

  it('verified items have higher iu_value than self_declared items (EV factor)', () => {
    const items = getTimeline('persona-sofia-r');
    const verified = items.filter((i) => i.verification_status === 'verified');
    const selfDeclared = items.filter((i) => i.verification_status === 'self_declared');
    if (verified.length > 0 && selfDeclared.length > 0) {
      const avgVerified = verified.reduce((s, i) => s + i.iu_value, 0) / verified.length;
      const avgSelfDeclared = selfDeclared.reduce((s, i) => s + i.iu_value, 0) / selfDeclared.length;
      expect(avgVerified).toBeGreaterThan(avgSelfDeclared);
    }
  });

  it('all timeline items have required fields', () => {
    const items = getTimeline('persona-giovanni-b');
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.date).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']).toContain(item.pillar);
      expect(['verified', 'partial', 'self_declared']).toContain(item.verification_status);
      expect(['high', 'medium', 'low']).toContain(item.iu_contribution);
    }
  });
});

// ── Privacy boundary — canAccess ─────────────────────────────────────────────

describe('MyKoraPreviewService — privacy access control', () => {
  it('WORKER role can access My KORA', () => {
    expect(myKoraPreviewService.canAccess('WORKER')).toBe(true);
  });

  it('KORA_ADMIN role can access My KORA (internal demo)', () => {
    expect(myKoraPreviewService.canAccess('KORA_ADMIN')).toBe(true);
  });

  it('COMPANY_ADMIN cannot access My KORA', () => {
    expect(myKoraPreviewService.canAccess('COMPANY_ADMIN')).toBe(false);
  });

  it('COMPANY_VIEWER cannot access My KORA', () => {
    expect(myKoraPreviewService.canAccess('COMPANY_VIEWER')).toBe(false);
  });

  it('PARTNER cannot access My KORA', () => {
    expect(myKoraPreviewService.canAccess('PARTNER')).toBe(false);
  });

  it('ADVISOR cannot access My KORA', () => {
    expect(myKoraPreviewService.canAccess('ADVISOR')).toBe(false);
  });
});

// ── PIBAggregationService — unchanged after B70-B ────────────────────────────

describe('PIBAggregationService — unchanged by B70-B (regression guard)', () => {
  const service = new PIBAggregationService();

  it('aggregateForBatch still returns pibSnapshotsAvailable=false', () => {
    const result = service.aggregateForBatch([], 100);
    expect(result.pibSnapshotsAvailable).toBe(false);
    expect(result.snapshots).toHaveLength(0);
  });

  it('getWorkerPIBSummary returns available=false for COMPANY_ADMIN', () => {
    const result = service.getWorkerPIBSummary('any-id', 'COMPANY_ADMIN') as { available: false; reason: string };
    expect(result.available).toBe(false);
  });

  it('getWorkerPIBSummary returns available=false even for WORKER (aggregate model)', () => {
    const result = service.getWorkerPIBSummary('any-id', 'WORKER') as { available: false; reason: string };
    expect(result.available).toBe(false);
  });
});

// ── DynamicCVPreview — per-persona content from getDynamicCvPreview ──────────

describe('MyKoraPreviewService.getDynamicCvPreview — persona-specific items', () => {
  it('returns items array for all four personas', () => {
    const ids = ['persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b'];
    for (const id of ids) {
      const preview = myKoraPreviewService.getDynamicCvPreview(id);
      expect(preview.items.length).toBeGreaterThan(0);
    }
  });

  it('export_available is false (Pilot+)', () => {
    const preview = myKoraPreviewService.getDynamicCvPreview('persona-elena-m');
    expect(preview.export_available).toBe(false);
  });

  it('all items have id, title, pillar, verification_status, shareable', () => {
    const preview = myKoraPreviewService.getDynamicCvPreview('persona-sofia-r');
    for (const item of preview.items) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']).toContain(item.pillar);
      expect(['verified', 'partial', 'self_declared']).toContain(item.verification_status);
      expect(typeof item.shareable).toBe('boolean');
    }
  });

  it('total_items matches items array length', () => {
    const preview = myKoraPreviewService.getDynamicCvPreview('persona-marco-t');
    expect(preview.total_items).toBe(preview.items.length);
  });

  it('verified_count matches items with verified status', () => {
    const preview = myKoraPreviewService.getDynamicCvPreview('persona-giovanni-b');
    const expected = preview.items.filter((i) => i.verification_status === 'verified').length;
    expect(preview.verified_count).toBe(expected);
  });

  it('no DynamicCVItem exposes an iu_value field — IU must not appear in CV', () => {
    const ids = ['persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b'];
    for (const id of ids) {
      const preview = myKoraPreviewService.getDynamicCvPreview(id);
      for (const item of preview.items) {
        expect('iu_value' in item).toBe(false);
      }
    }
  });

  it('only verified items are shareable — partial and self_declared are not', () => {
    const ids = ['persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b'];
    for (const id of ids) {
      const preview = myKoraPreviewService.getDynamicCvPreview(id);
      for (const item of preview.items) {
        if (item.shareable) {
          expect(item.verification_status).toBe('verified');
        }
        if (item.verification_status !== 'verified') {
          expect(item.shareable).toBe(false);
        }
      }
    }
  });
});

// ── B73-B: TimelineItem — cv_eligible enrichment ─────────────────────────────

describe('B73-B: TimelineItem — cv_eligible and cv_eligible_reason', () => {
  function getTimeline(personaId: string): TimelineItem[] {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    return preview!.timeline;
  }

  it('all timeline items have cv_eligible field (boolean)', () => {
    const items = getTimeline('persona-elena-m');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(typeof item.cv_eligible).toBe('boolean');
    }
  });

  it('all timeline items have non-empty cv_eligible_reason', () => {
    const ids = ['persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b'];
    for (const id of ids) {
      for (const item of getTimeline(id)) {
        expect(item.cv_eligible_reason.length).toBeGreaterThan(0);
      }
    }
  });

  it('verified items from lms_training are cv_eligible', () => {
    const items = getTimeline('persona-elena-m');
    const lmsVerified = items.filter(
      (i) => i.source_type === 'lms_training' && i.verification_status === 'verified',
    );
    expect(lmsVerified.length).toBeGreaterThan(0);
    for (const item of lmsVerified) {
      expect(item.cv_eligible).toBe(true);
    }
  });

  it('self_declared items are not cv_eligible', () => {
    const allItems: TimelineItem[] = [
      'persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b',
    ].flatMap((id) => getTimeline(id));
    const selfDeclared = allItems.filter((i) => i.verification_status === 'self_declared');
    for (const item of selfDeclared) {
      expect(item.cv_eligible).toBe(false);
    }
  });

  it('manual_upload items are not cv_eligible regardless of verification', () => {
    const allItems: TimelineItem[] = [
      'persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b',
    ].flatMap((id) => getTimeline(id));
    const manualUploads = allItems.filter((i) => i.source_type === 'manual_upload');
    for (const item of manualUploads) {
      expect(item.cv_eligible).toBe(false);
    }
  });

  it('esg_initiatives items are cv_eligible when at least partially verified', () => {
    const items = getTimeline('persona-elena-m');
    const esgItems = items.filter(
      (i) => i.source_type === 'esg_initiatives' && i.verification_status !== 'self_declared',
    );
    for (const item of esgItems) {
      expect(item.cv_eligible).toBe(true);
    }
  });

  it('cv_eligible_reason for verified lms_training mentions formativa', () => {
    const allItems: TimelineItem[] = [
      'persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b',
    ].flatMap((id) => getTimeline(id));
    const lmsVerified = allItems.filter(
      (i) => i.source_type === 'lms_training' && i.verification_status === 'verified',
    );
    expect(lmsVerified.length).toBeGreaterThan(0);
    for (const item of lmsVerified) {
      expect(item.cv_eligible_reason.toLowerCase()).toContain('formativa');
    }
  });
});

// ── B73-B: Dynamic CV pillar distribution ────────────────────────────────────

describe('B73-B: Dynamic CV pillar distribution', () => {
  const ALL_PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];

  function computePillarDistribution(personaId: string): Record<string, number> {
    const preview = myKoraPreviewService.getDynamicCvPreview(personaId);
    const dist: Record<string, number> = {};
    for (const p of ALL_PILLARS) {
      dist[p] = preview.items.filter((i) => i.pillar === p).length;
    }
    return dist;
  }

  it('pillar distribution covers all 5 canonical pillars', () => {
    const dist = computePillarDistribution('persona-elena-m');
    for (const p of ALL_PILLARS) {
      expect(p in dist).toBe(true);
    }
  });

  it('sum of pillar counts equals total_items', () => {
    const ids = ['persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b'];
    for (const id of ids) {
      const preview = myKoraPreviewService.getDynamicCvPreview(id);
      const dist = computePillarDistribution(id);
      const total = ALL_PILLARS.reduce((s, p) => s + dist[p], 0);
      expect(total).toBe(preview.total_items);
    }
  });

  it('pillar counts are non-negative integers', () => {
    const dist = computePillarDistribution('persona-sofia-r');
    for (const p of ALL_PILLARS) {
      expect(dist[p]).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(dist[p])).toBe(true);
    }
  });

  it('GROWTH pillar has at least one item for all personas (learning activities)', () => {
    for (const id of ['persona-elena-m', 'persona-marco-t', 'persona-sofia-r', 'persona-giovanni-b']) {
      const dist = computePillarDistribution(id);
      expect(dist['GROWTH']).toBeGreaterThanOrEqual(1);
    }
  });
});

// ── B73-B: Contribution section — IMPACT items exist ─────────────────────────

describe('B73-B: Contribution section — IMPACT pillar items', () => {
  it('persona-elena-m S2 has IMPACT pillar CV items (contribution events)', () => {
    const preview = myKoraPreviewService.getDynamicCvPreview('persona-elena-m');
    const impactItems = preview.items.filter((i) => i.pillar === 'IMPACT');
    expect(impactItems.length).toBeGreaterThan(0);
  });

  it('persona-giovanni-b has IMPACT pillar CV items', () => {
    const preview = myKoraPreviewService.getDynamicCvPreview('persona-giovanni-b');
    const impactItems = preview.items.filter((i) => i.pillar === 'IMPACT');
    expect(impactItems.length).toBeGreaterThan(0);
  });

  it('IMPACT items have a non-empty export_label (verifier identification)', () => {
    const preview = myKoraPreviewService.getDynamicCvPreview('persona-sofia-r');
    const impactItems = preview.items.filter((i) => i.pillar === 'IMPACT');
    for (const item of impactItems) {
      expect(item.export_label.length).toBeGreaterThan(0);
    }
  });
});

// ── B73-B: Privacy regression — employer still blocked ───────────────────────

describe('B73-B: Privacy regression — employer access still blocked after B73-B', () => {
  const service = new DynamicCVService();

  it('COMPANY_ADMIN still throws after B73-B changes', () => {
    expect(() => service.getProfile('any-worker', 'COMPANY_ADMIN')).toThrow();
  });

  it('COMPANY_VIEWER still throws after B73-B changes', () => {
    expect(() => service.getProfile('any-worker', 'COMPANY_VIEWER')).toThrow();
  });

  it('PARTNER still throws after B73-B changes', () => {
    expect(() => service.getProfile('any-worker', 'PARTNER')).toThrow();
  });

  it('ADVISOR still throws after B73-B changes', () => {
    expect(() => service.getProfile('any-worker', 'ADVISOR')).toThrow();
  });

  it('MyKoraPreviewService still blocks COMPANY_ADMIN', () => {
    expect(myKoraPreviewService.canAccess('COMPANY_ADMIN')).toBe(false);
  });

  it('MyKoraPreviewService still blocks COMPANY_VIEWER', () => {
    expect(myKoraPreviewService.canAccess('COMPANY_VIEWER')).toBe(false);
  });

  it('enriched timeline is still not returned for employer roles — canAccess prevents it', () => {
    // canAccess is the gate; employer roles never reach getMyKoraHomePreview
    expect(myKoraPreviewService.canAccess('COMPANY_ADMIN')).toBe(false);
    expect(myKoraPreviewService.canAccess('COMPANY_VIEWER')).toBe(false);
    expect(myKoraPreviewService.canAccess('PARTNER')).toBe(false);
  });
});
