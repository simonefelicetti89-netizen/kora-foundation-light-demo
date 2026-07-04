/**
 * GOLDEN-02 — E2E environment helper.
 *
 * Framework-agnostic (no Playwright import) so this logic is unit-testable
 * with vitest independently of the Playwright runner.
 *
 * Rules:
 *   - reads credentials only from process.env;
 *   - never returns/logs raw secret values — only presence/absence;
 *   - missing credentials resolve to `null`, callers must skip, never throw.
 */

export interface Credentials {
  email: string;
  password: string;
}

export interface CompanyCredentials extends Credentials {
  tenantCode?: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export function getAdminCredentials(): Credentials | null {
  const email = readEnv('E2E_KORA_ADMIN_EMAIL');
  const password = readEnv('E2E_KORA_ADMIN_PASSWORD');
  if (!email || !password) return null;
  return { email, password };
}

export function getCompanyACredentials(): CompanyCredentials | null {
  const email = readEnv('E2E_COMPANY_A_EMAIL');
  const password = readEnv('E2E_COMPANY_A_PASSWORD');
  if (!email || !password) return null;
  return { email, password, tenantCode: readEnv('E2E_COMPANY_A_TENANT_CODE') };
}

export function getCompanyBCredentials(): CompanyCredentials | null {
  const email = readEnv('E2E_COMPANY_B_EMAIL');
  const password = readEnv('E2E_COMPANY_B_PASSWORD');
  if (!email || !password) return null;
  return { email, password, tenantCode: readEnv('E2E_COMPANY_B_TENANT_CODE') };
}

export function getBaseUrl(): string {
  return readEnv('E2E_BASE_URL') ?? 'http://localhost:3000';
}

/**
 * Conservative heuristic: anything that isn't an explicit local host is
 * treated as production-like and requires an explicit opt-in.
 */
export function isProductionLikeUrl(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    // Unparseable URL — fail safe by treating it as production-like.
    return true;
  }
  // Node's URL parser reports IPv6 hostnames bracketed, e.g. "[::1]".
  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);
  if (localHosts.has(hostname)) return false;
  if (hostname.endsWith('.local')) return false;
  return true;
}

export function isProductionAllowed(): boolean {
  return readEnv('E2E_ALLOW_PRODUCTION') === 'true';
}

export interface BaseUrlGuardResult {
  blocked: boolean;
  reason?: string;
}

/**
 * Guards against accidentally running authenticated E2E tests against a
 * production-looking base URL. Returns a result instead of throwing so
 * callers can turn a block into a clean test skip.
 */
export function guardBaseUrl(): BaseUrlGuardResult {
  const baseUrl = getBaseUrl();
  if (!isProductionLikeUrl(baseUrl)) return { blocked: false };
  if (isProductionAllowed()) return { blocked: false };
  return {
    blocked: true,
    reason: `E2E_BASE_URL ("${baseUrl}") sembra un ambiente di produzione. ` +
      `Imposta E2E_ALLOW_PRODUCTION=true per eseguire deliberatamente contro produzione.`,
  };
}

/** Safe presence check for debug/skip messages — never prints the value itself. */
export function envPresence(name: string): 'set' | 'missing' {
  return readEnv(name) ? 'set' : 'missing';
}

/**
 * GOLDEN-E2E-02 — explicit second gate for the data-bearing golden path test.
 * Unlike the read-only reachability tests, this one uploads a file, creates a
 * real source_batch row, generates/approves UEF records, and runs scoring
 * against whatever tenant E2E_COMPANY_A_* points at. Credential presence
 * alone is not enough consent for a mutating test — mirrors the
 * RLS03_ALLOW_RUN / RLS05_ALLOW_RUN pattern already used in this repo for
 * higher-risk test tiers.
 */
export function isGoldenDataBearingRunAllowed(): boolean {
  return readEnv('E2E_GOLDEN_DATA_BEARING_ALLOW_RUN') === 'true';
}
