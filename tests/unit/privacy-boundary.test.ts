import { describe, it, expect } from 'vitest';
import { privacyVisibilityService } from '@/services/privacy-visibility/PrivacyVisibilityService';
import { rolePermissionService } from '@/services/role-permission/RolePermissionService';
import {
  suppressSmallGroups,
  validateNoSmallGroups,
  DEFAULT_MIN_GROUP_SIZE,
  SUPPRESSED_BUCKET_KEY,
} from '@/lib/privacy/group-threshold';

// ── PrivacyVisibilityService — employer suppression ────────────────────────────
// All valid PrivacyDataTypes are in EMPLOYER_BLOCKED_TYPES.
// This means employer roles are suppressed for all defined types via employer_role check.
// The group_too_small path is a secondary guard for future types or direct groupSize callers.

describe('PrivacyVisibilityService — employer suppression for all individual data types', () => {

  it('suppresses PIB for COMPANY_ADMIN (reason: employer_role)', () => {
    const r = privacyVisibilityService.isSuppressed('COMPANY_ADMIN', 'pib');
    expect(r.suppressed).toBe(true);
    expect(r.reason).toBe('employer_role');
  });

  it('suppresses UEF records for COMPANY_ADMIN', () => {
    const r = privacyVisibilityService.isSuppressed('COMPANY_ADMIN', 'uef');
    expect(r.suppressed).toBe(true);
    expect(r.reason).toBe('employer_role');
  });

  it('suppresses impact_units for COMPANY_ADMIN', () => {
    const r = privacyVisibilityService.isSuppressed('COMPANY_ADMIN', 'impact_units');
    expect(r.suppressed).toBe(true);
  });

  it('suppresses worker_profiles for COMPANY_ADMIN', () => {
    const r = privacyVisibilityService.isSuppressed('COMPANY_ADMIN', 'worker_profiles');
    expect(r.suppressed).toBe(true);
  });

  it('suppresses My KORA data for COMPANY_ADMIN', () => {
    const r = privacyVisibilityService.isSuppressed('COMPANY_ADMIN', 'my_kora');
    expect(r.suppressed).toBe(true);
  });

  it('suppresses dynamic_cv for COMPANY_ADMIN', () => {
    const r = privacyVisibilityService.isSuppressed('COMPANY_ADMIN', 'dynamic_cv');
    expect(r.suppressed).toBe(true);
  });

  it('suppresses consent records for COMPANY_ADMIN', () => {
    const r = privacyVisibilityService.isSuppressed('COMPANY_ADMIN', 'consent');
    expect(r.suppressed).toBe(true);
  });

  it('suppresses also for COMPANY_VIEWER role', () => {
    const r = privacyVisibilityService.isSuppressed('COMPANY_VIEWER', 'pib');
    expect(r.suppressed).toBe(true);
  });

});

describe('PrivacyVisibilityService — WORKER visibility', () => {

  it('does NOT suppress PIB for WORKER', () => {
    const r = privacyVisibilityService.isSuppressed('WORKER', 'pib');
    expect(r.suppressed).toBe(false);
  });

  it('does NOT suppress My KORA for WORKER', () => {
    const r = privacyVisibilityService.isSuppressed('WORKER', 'my_kora');
    expect(r.suppressed).toBe(false);
  });

  it('does NOT suppress dynamic_cv for WORKER', () => {
    const r = privacyVisibilityService.isSuppressed('WORKER', 'dynamic_cv');
    expect(r.suppressed).toBe(false);
  });

});

describe('PrivacyVisibilityService — KORA_ADMIN visibility', () => {

  it('does NOT suppress PIB for KORA_ADMIN', () => {
    const r = privacyVisibilityService.isSuppressed('KORA_ADMIN', 'pib');
    expect(r.suppressed).toBe(false);
  });

  it('does NOT suppress UEF for KORA_ADMIN', () => {
    const r = privacyVisibilityService.isSuppressed('KORA_ADMIN', 'uef');
    expect(r.suppressed).toBe(false);
  });

});

// ── N≥10 threshold — group-threshold.ts (canonical privacy function) ───────────
// The N≥10 rule is enforced at the data aggregation layer via suppressSmallGroups().
// FINDING: PrivacyVisibilityService.isSuppressed() does not reach the group_too_small
// path for any current PrivacyDataType because all defined types are in EMPLOYER_BLOCKED_TYPES
// (employer_role check fires first). The group_too_small guard is a secondary defense
// for future types and direct suppressSmallGroups() callers (e.g. workforce baseline).

describe('N≥10 threshold — group-threshold.ts canonical enforcement', () => {

  it('DEFAULT_MIN_GROUP_SIZE is 10', () => {
    expect(DEFAULT_MIN_GROUP_SIZE).toBe(10);
  });

  it('passes all groups >= 10 unchanged', () => {
    const input = { 'dept-tech': 20, 'dept-sales': 15, 'dept-ops': 15 };
    const result = suppressSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);
    expect(result.allSafe).toBe(true);
    expect(result.safe['dept-tech']).toBe(20);
    expect(result.safe['dept-sales']).toBe(15);
    expect(result.safe[SUPPRESSED_BUCKET_KEY]).toBeUndefined();
  });

  it('suppresses a group below threshold and buckets it if sum >= 10', () => {
    const input = { 'dept-large': 50, 'dept-small-a': 4, 'dept-small-b': 6 };
    const result = suppressSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);
    expect(result.safe['dept-large']).toBe(50);
    expect(result.safe['dept-small-a']).toBeUndefined();
    expect(result.safe['dept-small-b']).toBeUndefined();
    // Suppressed groups (4+6=10) meet threshold → bucket created
    expect(result.safe[SUPPRESSED_BUCKET_KEY]).toBe(10);
    expect(result.hasSuppressedBucket).toBe(true);
  });

  it('fully suppresses groups below threshold when bucket sum < 10', () => {
    const input = { 'dept-large': 50, 'dept-tiny': 3 };
    const result = suppressSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);
    expect(result.safe['dept-large']).toBe(50);
    expect(result.safe['dept-tiny']).toBeUndefined();
    // Bucket sum is 3, below threshold → no bucket key
    expect(result.safe[SUPPRESSED_BUCKET_KEY]).toBeUndefined();
    expect(result.hasSuppressedBucket).toBe(false);
  });

  it('validateNoSmallGroups returns valid for all-safe input', () => {
    const input = { 'dept-a': 12, 'dept-b': 25 };
    const validation = validateNoSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('validateNoSmallGroups returns violations for groups below threshold', () => {
    const input = { 'dept-safe': 15, 'dept-unsafe': 7 };
    const validation = validateNoSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);
    expect(validation.valid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);
  });

});

// ── RolePermissionService — PIB access ────────────────────────────────────────

describe('RolePermissionService — PIB access', () => {

  it('denies COMPANY_ADMIN access to pib-records', () => {
    const r = rolePermissionService.canAccess('COMPANY_ADMIN', 'pib-records');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it('denies COMPANY_VIEWER access to pib-records', () => {
    const r = rolePermissionService.canAccess('COMPANY_VIEWER', 'pib-records');
    expect(r.allowed).toBe(false);
  });

  it('denies KORA_ADMIN access to pib-records at service layer', () => {
    // RolePermissionService denies pib-records for ALL non-worker roles including KORA_ADMIN.
    // KORA_ADMIN accesses PIB data via the DB service role directly, not this service layer.
    // This is intentional: the service enforces the worker-private boundary universally.
    const r = rolePermissionService.canAccess('KORA_ADMIN', 'pib-records');
    expect(r.allowed).toBe(false);
  });

  it('allows WORKER access to pib-records', () => {
    const r = rolePermissionService.canAccess('WORKER', 'pib-records');
    expect(r.allowed).toBe(true);
  });

});
