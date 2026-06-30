/**
 * KORA feature flags — all default OFF.
 * A flag evaluates to true ONLY when the corresponding env var is explicitly set to 'true'.
 * Absent or any other value → false. Safe to import in server components and API routes.
 */
export const FEATURE_FLAGS = {
  // KORA Link v1 — NFC/QR hardware integration. Excluded from Foundation Light (doc 22A §7).
  // DO NOT set to true until feat/kora-link-v1 is complete and explicitly enabled.
  KORA_LINK_ENABLED: process.env.KORA_LINK_ENABLED === 'true',
} as const;
