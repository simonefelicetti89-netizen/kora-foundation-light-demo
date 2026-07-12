/**
 * B174-A3c — E2E staging target safety guard.
 *
 * Hardens tests/e2e/helpers/env.ts#guardBaseUrl(), which this file does not
 * modify or replace (golden-admin-company.spec.ts still uses it unchanged).
 * guardBaseUrl() has one weakness this module exists to close: a single
 * env var, E2E_ALLOW_PRODUCTION=true, is enough by itself to unblock ANY
 * non-local host — including the repo's own documented Production Vercel
 * hostname (see docs/STATUS.md, docs/GOLDEN_PATH.md). B174-A3's read-only
 * preflight found exactly that combination configured locally
 * (E2E_BASE_URL pointing at the production-documented hostname,
 * E2E_ALLOW_PRODUCTION=true persisted in .env.e2e.local) and correctly
 * refused to run any authenticated E2E as a result — see
 * docs/issue-drafts/b174-a3b-staging-confirmation-safety.md.
 *
 * Design, for authenticated-smoke.spec.ts / two-tenant-isolation.spec.ts /
 * golden-data-bearing.spec.ts only:
 *   - localhost / 127.0.0.1 / ::1 / *.local — always allowed.
 *   - a host explicitly listed in E2E_ALLOWED_STAGING_HOSTS (comma-separated
 *     hostnames, no scheme/path/query) — allowed. This repo does not
 *     hardcode a "known-safe" staging hostname; the operator must name one.
 *   - any other non-local host, INCLUDING the known production-documented
 *     hostname — blocked by default. E2E_ALLOW_PRODUCTION=true alone is
 *     NEVER sufficient here (unlike guardBaseUrl()) — it is accepted only
 *     as a secondary signal, never the sole approval. Unblocking requires
 *     the stronger, deliberately scary E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND=true,
 *     which this repo does not set anywhere and does not document as normal
 *     workflow. This is intentional friction, not a bug.
 *
 * Every message below reports variable names and bare hostnames only —
 * never a full URL (which could carry a query string/token), never a
 * credential, never a password.
 */

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

/** Bare, lowercased hostnames only — no scheme, no path, no port, no query. */
export const KNOWN_PRODUCTION_HOSTNAMES: readonly string[] = [
  'kora-foundation-light-demo.vercel.app',
];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

export function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return LOCAL_HOSTS.has(h) || h.endsWith('.local');
}

/** Parses E2E_ALLOWED_STAGING_HOSTS into a lowercased, trimmed hostname list. */
export function parseAllowedStagingHosts(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0);
}

export interface E2ETargetSafetyOptions {
  /** Already-resolved base URL. Pass the caller's resolved value — do not
   * silently substitute a default here, so a genuinely missing/blank value
   * fails loudly instead of being guessed at. */
  baseUrl: string | undefined;
  /** process.env.E2E_ALLOW_PRODUCTION === 'true' */
  allowProduction: boolean;
  /** process.env.E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND === 'true' */
  confirmProductionAuthE2E: boolean;
  /** Hostnames from E2E_ALLOWED_STAGING_HOSTS, already parsed/lowercased. */
  allowedStagingHosts: string[];
  /** For message context only, e.g. "authenticated-smoke". Never sensitive. */
  suiteName: string;
}

export interface E2ETargetSafetyResult {
  blocked: boolean;
  /** Non-secret: variable names and bare hostnames only, never a full URL. */
  reason?: string;
}

/**
 * Pure decision function — no env reads, fully unit-testable. This is the
 * function requested by name in the B174-A3c task ("assertSafeE2ETarget").
 */
export function assertSafeE2ETarget(options: E2ETargetSafetyOptions): E2ETargetSafetyResult {
  const { baseUrl, allowProduction, confirmProductionAuthE2E, allowedStagingHosts, suiteName } = options;

  if (!baseUrl || baseUrl.trim().length === 0) {
    return {
      blocked: true,
      reason:
        `[${suiteName}] E2E_BASE_URL non è impostato o non è stato risolto. ` +
        `Imposta E2E_BASE_URL esplicitamente (localhost per lo sviluppo locale, ` +
        `un host di staging/preview esplicito per una conferma live).`,
    };
  }

  let hostname: string;
  try {
    hostname = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return {
      blocked: true,
      reason:
        `[${suiteName}] E2E_BASE_URL non è un URL valido (schema mancante o formato errato). ` +
        `Nessun target E2E può essere determinato in sicurezza.`,
    };
  }

  if (isLocalHostname(hostname)) {
    return { blocked: false };
  }

  if (allowedStagingHosts.includes(hostname)) {
    return { blocked: false };
  }

  const isKnownProduction = KNOWN_PRODUCTION_HOSTNAMES.includes(hostname);

  if (confirmProductionAuthE2E) {
    // Deliberately still allowed even for an unclassified host: this is the
    // one escape hatch, and it requires the scary variable regardless of
    // which non-local hostname is configured.
    return { blocked: false };
  }

  const hostnameNote = isKnownProduction
    ? `L'hostname configurato corrisponde al deployment Production documentato di questo repo (${hostname}).`
    : `L'hostname configurato (${hostname}) non è né locale né presente in E2E_ALLOWED_STAGING_HOSTS — trattato come production-like per sicurezza.`;

  return {
    blocked: true,
    reason:
      `[${suiteName}] ${hostnameNote} ` +
      `E2E_ALLOW_PRODUCTION=true (attualmente: ${allowProduction ? 'impostato' : 'non impostato'}) non è sufficiente da solo per eseguire E2E autenticati qui — ` +
      `usa invece un host di staging/preview non ambiguo elencato in E2E_ALLOWED_STAGING_HOSTS. ` +
      `Se un E2E autenticato contro questo host è davvero necessario, richiede l'esplicita conferma E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND=true, ` +
      `impostata deliberatamente per questa singola esecuzione — non normale flusso di lavoro.`,
  };
}

/**
 * Convenience wrapper reading from process.env — the call site tests use.
 * Mirrors guardBaseUrl()'s ergonomics: `test.skip(guard.blocked, guard.reason)`.
 */
export function guardE2ETarget(suiteName: string): E2ETargetSafetyResult {
  return assertSafeE2ETarget({
    baseUrl: readEnv('E2E_BASE_URL') ?? 'http://localhost:3000',
    allowProduction: readEnv('E2E_ALLOW_PRODUCTION') === 'true',
    confirmProductionAuthE2E: readEnv('E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND') === 'true',
    allowedStagingHosts: parseAllowedStagingHosts(readEnv('E2E_ALLOWED_STAGING_HOSTS')),
    suiteName,
  });
}

/**
 * GD01-specific mutation gate. Separate from target safety on purpose —
 * GD01 needs both a safe target (guardE2ETarget) AND this explicit,
 * per-run, mutation-specific opt-in (unchanged variable name/semantics from
 * tests/e2e/helpers/env.ts#isGoldenDataBearingRunAllowed(), re-exposed here
 * so golden-data-bearing.spec.ts can get both checks from one import).
 */
export function guardGoldenDataBearingRun(): E2ETargetSafetyResult {
  const allowed = readEnv('E2E_GOLDEN_DATA_BEARING_ALLOW_RUN') === 'true';
  if (allowed) return { blocked: false };
  return {
    blocked: true,
    reason:
      'E2E_GOLDEN_DATA_BEARING_ALLOW_RUN non impostato a "true" — GD01 muta dati reali sul tenant target ' +
      'ad ogni esecuzione e richiede questo opt-in esplicito, per-esecuzione, separato dal target safety check.',
  };
}
