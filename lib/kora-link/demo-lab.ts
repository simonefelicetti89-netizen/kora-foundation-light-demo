// lib/kora-link/demo-lab.ts
// KORA Link — Demo Lab helper (KL-20). Ephemeral demo tokens for NFC chip lab writing.
// Server-only. No Supabase. No DB. No persistence. No activation. No worker assignment.
//
// INVARIANTS
//   • Generated token/URL exist only in the returned value — nothing is written to storage
//   • KORA_LINK_TOKEN_SECRET is never read, computed, or included in any return value
//   • Missing/invalid base URL → safe result object, never throws to the caller
//   • No RPC call, no digest computation — demo lab never touches the DB path

import { generateToken } from './token';
import {
  isKoraLinkEnabled,
  isKoraLinkDbLookupEnabled,
  getKoraLinkPublicBaseUrl,
  getKoraLinkRateLimitProvider,
  type KoraLinkEnv,
} from './config';

// ── Runtime status ────────────────────────────────────────────────────────────

export type KoraLinkDemoLabRuntimeStatus = {
  koraLinkEnabled: boolean;
  publicBaseUrlConfigured: boolean;
  dbLookupEnabled: boolean;
  rateLimitProvider: 'disabled' | 'upstash' | null;
};

/**
 * Snapshot of KORA Link runtime config for the demo lab status panel.
 * Only booleans and the rate-limit provider name are exposed — never a secret value.
 */
export function getKoraLinkDemoLabRuntimeStatus(
  env: KoraLinkEnv = process.env
): KoraLinkDemoLabRuntimeStatus {
  let publicBaseUrlConfigured = false;
  try {
    getKoraLinkPublicBaseUrl(env);
    publicBaseUrlConfigured = true;
  } catch {
    publicBaseUrlConfigured = false;
  }

  let rateLimitProvider: 'disabled' | 'upstash' | null = null;
  try {
    rateLimitProvider = getKoraLinkRateLimitProvider(env);
  } catch {
    rateLimitProvider = null;
  }

  return {
    koraLinkEnabled: isKoraLinkEnabled(env),
    publicBaseUrlConfigured,
    dbLookupEnabled: isKoraLinkDbLookupEnabled(env),
    rateLimitProvider,
  };
}

// ── Public link URL builder ───────────────────────────────────────────────────

/**
 * Builds the public `/link/<token>` URL for a given token.
 * Throws if KORA_LINK_PUBLIC_BASE_URL is missing or invalid (see getKoraLinkPublicBaseUrl).
 * Never logs or persists the token.
 */
export function getKoraLinkPublicLinkUrl(token: string, env: KoraLinkEnv = process.env): string {
  const baseUrl = getKoraLinkPublicBaseUrl(env);
  return `${baseUrl}/link/${token}`;
}

// ── Demo lab token generation ─────────────────────────────────────────────────

export type KoraLinkDemoLabLinkResult =
  | { ok: true; token: string; url: string; persisted: false }
  | { ok: false; reason: 'base_url_not_configured' };

/**
 * Generates an ephemeral demo token + public URL for NFC chip lab writing.
 * DEMO ONLY — never persisted. No DB record, no worker assignment, no activation.
 * `persisted: false` is a literal marker, not a live check — this function
 * never writes anywhere, so the value is always false by construction.
 */
export function generateKoraLinkDemoLabLink(
  env: KoraLinkEnv = process.env
): KoraLinkDemoLabLinkResult {
  const token = generateToken();
  try {
    const url = getKoraLinkPublicLinkUrl(token, env);
    return { ok: true, token, url, persisted: false };
  } catch {
    return { ok: false, reason: 'base_url_not_configured' };
  }
}

// ── Safety boundaries ─────────────────────────────────────────────────────────

/**
 * Fixed list of safety guarantees shown on the Lab page.
 * Kept as data (not hardcoded JSX strings) so it can be unit-tested directly.
 */
export const KORA_LINK_DEMO_LAB_SAFETY_BOUNDARIES: readonly string[] = [
  'Nessuna scrittura su database',
  'Nessuna chiamata a Supabase',
  'Nessuna associazione a un worker',
  'Nessuna activation',
  'Nessuna persistenza del token',
  'Nessun effetto sul KORA Index',
];

export function getKoraLinkDemoLabSafetyBoundaries(): readonly string[] {
  return KORA_LINK_DEMO_LAB_SAFETY_BOUNDARIES;
}

// ── NFC write checklist ───────────────────────────────────────────────────────

/**
 * Ordered operational steps for writing the generated URL to a physical NFC
 * chip and testing it. Pure content — no chip I/O happens in this module.
 */
export const KORA_LINK_DEMO_LAB_NFC_CHECKLIST: readonly string[] = [
  "Copia l'URL generato qui sopra",
  "Apri un'app di scrittura NFC esterna sul telefono (es. NFC Tools)",
  "Scrivi un record URL/URI sul chip usando l'URL copiato",
  'Avvicina il telefono al chip per testare la lettura',
  'Verifica che si apra la route /link/[token] nel browser',
  'Se la route mostra "unavailable" o non trovata, verifica KORA_LINK_ENABLED e KORA_LINK_PUBLIC_BASE_URL nel pannello Stato runtime',
];

export function getKoraLinkDemoLabNfcChecklist(): readonly string[] {
  return KORA_LINK_DEMO_LAB_NFC_CHECKLIST;
}

// ── Expected behavior ──────────────────────────────────────────────────────────

export type KoraLinkDemoLabExpectedBehaviorItem = {
  condition: string;
  outcome: string;
};

/**
 * Explains what the public /link/[token] route will actually do given the
 * current feature-flag combination — differentiates lookup off vs on so the
 * person testing NFC in the field knows what result to expect.
 */
export function getKoraLinkDemoLabExpectedBehavior(
  status: KoraLinkDemoLabRuntimeStatus
): KoraLinkDemoLabExpectedBehaviorItem[] {
  const items: KoraLinkDemoLabExpectedBehaviorItem[] = [];

  if (!status.koraLinkEnabled) {
    items.push({
      condition: 'KORA_LINK_ENABLED=false',
      outcome: 'La route /link/[token] resta nascosta (risposta 404 safe) — nessun dato esposto.',
    });
  } else if (!status.dbLookupEnabled) {
    items.push({
      condition: 'KORA_LINK_ENABLED=true · KORA_LINK_DB_LOOKUP_ENABLED=false',
      outcome: 'La route mostra lo stato skeleton (safe) — nessun accesso al database.',
    });
  } else {
    items.push({
      condition: 'KORA_LINK_ENABLED=true · KORA_LINK_DB_LOOKUP_ENABLED=true',
      outcome: 'La route esegue il lookup RPC; se la RPC non è disponibile mostra "unavailable" (fallback safe), mai un errore.',
    });
  }

  items.push(
    { condition: 'In ogni caso', outcome: 'Nessun worker viene attivato.' },
    { condition: 'In ogni caso', outcome: 'Nessun dato viene salvato dal Lab.' },
    { condition: 'In ogni caso', outcome: 'Nessun record DB viene creato dal Lab.' }
  );

  return items;
}
