// lib/sentry/scrub.ts — SENTRY-PRIVACY-HARDENING-06
//
// Centralized event/breadcrumb sanitization wired into beforeSend/
// beforeBreadcrumb in sentry.client.config.ts, sentry.server.config.ts, and
// sentry.edge.config.ts. Sentry must receive only what's needed to
// diagnose a technical problem: error type, stack trace, route template,
// release, environment, non-personal tags. It must never receive email,
// name, cookies, Authorization/session tokens, request bodies, query
// strings, or raw URLs containing a token.
//
// Design note: no call site in this codebase attaches manual user/extra
// data to Sentry (verified — the only capture calls are
// `Sentry.captureException(error)` in the five app/**/error.tsx boundaries,
// with no custom context). Sanitization therefore lives entirely here,
// applied uniformly to every event regardless of source (manual capture or
// the SDK's own automatic instrumentation) — this is deliberately more
// robust than sanitizing at each call site, and it is the only mechanism
// that also covers Sentry's automatic request/breadcrumb capture.

import type { Breadcrumb, ErrorEvent, Event, EventHint } from '@sentry/nextjs';

const REDACTED = '[redacted]';

// ── URL sanitization ─────────────────────────────────────────────────────────

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// 16+ hex chars (KORA Link / CV share tokens are 64-char hex; this also
// catches shorter opaque hex-like ids defensively) or a UUID.
const HEX_TOKEN_SEGMENT = /^[0-9a-f]{16,}$/i;
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Long base64/hex-ish run inside a larger string (e.g. embedded in an error
// message) — conservative threshold to avoid false positives on ordinary words.
const EMBEDDED_TOKEN_PATTERN = /\b[A-Za-z0-9_-]{24,}\b/g;

/** Reduces a path to its route template — no query string, dynamic id/token
 *  segments generalized. Never returns a token in cleartext. */
export function sanitizeUrl(rawUrl: string | undefined | null): string | undefined {
  if (!rawUrl) return undefined;

  let path: string;
  try {
    // Base is arbitrary — only used to parse relative URLs; never sent anywhere.
    const parsed = new URL(rawUrl, 'http://internal.invalid');
    path = parsed.pathname;
  } catch {
    const queryIndex = rawUrl.indexOf('?');
    path = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
  }

  // Named KORA public token routes — explicit route-template form.
  path = path.replace(/^\/link\/[^/]+\/activate\/?$/i, '/link/[token]/activate');
  path = path.replace(/^\/link\/[^/]+\/?$/i, '/link/[token]');
  path = path.replace(/^\/cv\/share\/[^/]+\/?$/i, '/cv/share/[token]');

  // Generic defense-in-depth for every other dynamic route (companies,
  // activities, worker initiatives, share links, etc.) — no route needs to
  // be hardcoded individually.
  path = path
    .split('/')
    .map((segment) => {
      if (UUID_SEGMENT.test(segment)) return '[id]';
      if (HEX_TOKEN_SEGMENT.test(segment)) return '[token]';
      return segment;
    })
    .join('/');

  return path;
}

// ── Free-text scrubbing (error messages, log entries) ──────────────────────

/** Redacts emails and long opaque token-like substrings from free text.
 *  Used on exception/log messages, which are not structured and may contain
 *  an interpolated value (e.g. a Supabase error message, a validation
 *  message built with template literals). */
export function scrubText(text: string | undefined | null): string | undefined {
  if (!text) return text ?? undefined;
  return text
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(EMBEDDED_TOKEN_PATTERN, (match) => (match.length >= 24 ? REDACTED : match));
}

// ── Request sanitization ────────────────────────────────────────────────────

/** Keeps only method + route-template URL. Drops query string, cookies,
 *  headers (Authorization included), request body, and env. */
export function sanitizeRequest(request: Event['request']): Event['request'] | undefined {
  if (!request) return undefined;
  const sanitized: Event['request'] = {};
  if (request.method) sanitized.method = request.method;
  const url = sanitizeUrl(request.url);
  if (url) sanitized.url = url;
  // Deliberately omitted: data (body), query_string, cookies, headers, env.
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

// ── User sanitization ───────────────────────────────────────────────────────

/** No Sentry.setUser() call exists anywhere in this codebase (verified), and
 *  there is no current need for cross-event user correlation in Sentry. User
 *  context is stripped unconditionally — belt-and-suspenders on top of
 *  sendDefaultPii: false, in case automatic instrumentation or a future call
 *  site ever populates it. */
export function sanitizeUser(_user: Event['user']): Event['user'] | undefined {
  return undefined;
}

// ── Tags / extra / contexts sanitization ────────────────────────────────────

const SENSITIVE_KEY_PATTERN = /email|password|secret|token|cookie|authoriz|session|worker.?id|tenant.?id|partner.?id|user.?id|ip.?address|phone|address|codice.?fiscale|iban/i;

function isSensitiveValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (EMAIL_PATTERN.test(value)) { EMAIL_PATTERN.lastIndex = 0; return true; }
  if (value.length >= 24 && /^[A-Za-z0-9_-]+$/.test(value)) return true; // opaque token-shaped
  return false;
}

/** Drops any tag/extra whose key name suggests personal data, or whose value
 *  looks like an email or an opaque token — regardless of key name. Keeps
 *  everything else (route names, error codes, feature flags, counts). */
function scrubKeyValueMap<T extends Record<string, unknown>>(map: T | undefined): T | undefined {
  if (!map) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(map)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    if (isSensitiveValue(value)) continue;
    result[key] = value;
  }
  return result as T;
}

export function sanitizeTags(tags: Event['tags']): Event['tags'] | undefined {
  return scrubKeyValueMap(tags);
}

export function sanitizeExtra(extra: Event['extra']): Event['extra'] | undefined {
  return scrubKeyValueMap(extra);
}

// contexts is a nested map of named context objects (browser, os, device,
// runtime, app, ...). Standard Sentry-populated contexts carry no personal
// data (browser name/version, OS, device model class) — allowlisted through.
// Anything else (custom contexts a future call site might add) is dropped
// unless every key inside it passes the same scrub as tags/extra.
const SAFE_STANDARD_CONTEXTS = new Set(['browser', 'os', 'device', 'runtime', 'app', 'culture', 'cloud_resource']);

export function sanitizeContexts(contexts: Event['contexts']): Event['contexts'] | undefined {
  if (!contexts) return undefined;
  const result: NonNullable<Event['contexts']> = {};
  for (const [name, value] of Object.entries(contexts)) {
    if (SAFE_STANDARD_CONTEXTS.has(name)) {
      result[name] = value;
      continue;
    }
    if (value && typeof value === 'object') {
      const scrubbed = scrubKeyValueMap(value as Record<string, unknown>);
      if (scrubbed && Object.keys(scrubbed).length > 0) result[name] = scrubbed;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// ── Exception / message sanitization ────────────────────────────────────────

export function sanitizeException(exception: Event['exception']): Event['exception'] | undefined {
  if (!exception?.values) return exception;
  return {
    values: exception.values.map((value) => ({
      ...value,
      value: scrubText(value.value),
      // type and stacktrace are kept as-is — they're the diagnostic payload.
    })),
  };
}

// ── Breadcrumb sanitization ─────────────────────────────────────────────────

const SENSITIVE_CONSOLE_PATTERN = /token|password|secret|authoriz|cookie|@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

/** Returns the sanitized breadcrumb, or null to drop it entirely. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'console') {
    if (breadcrumb.message && SENSITIVE_CONSOLE_PATTERN.test(breadcrumb.message)) return null;
    if (breadcrumb.message) {
      return { ...breadcrumb, message: scrubText(breadcrumb.message) };
    }
    return breadcrumb;
  }

  if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
    const data = breadcrumb.data ? { ...breadcrumb.data } : undefined;
    if (data) {
      if (typeof data.url === 'string') data.url = sanitizeUrl(data.url);
      // The SDK's default fetch/xhr breadcrumb data never includes body
      // content (only sizes) — dropped defensively in case a future SDK
      // version or manual breadcrumb adds one.
      delete data.body;
      delete data.request;
      delete data.response;
      delete data.headers;
    }
    return { ...breadcrumb, data };
  }

  if (breadcrumb.category === 'navigation' && breadcrumb.data) {
    const data = { ...breadcrumb.data };
    if (typeof data.to === 'string') data.to = sanitizeUrl(data.to);
    if (typeof data.from === 'string') data.from = sanitizeUrl(data.from);
    return { ...breadcrumb, data };
  }

  // Any other breadcrumb: scrub key/value data generically, drop nothing
  // wholesale (route templates, click targets, UI state changes are useful
  // and not personal).
  if (breadcrumb.data) {
    const scrubbedData = scrubKeyValueMap(breadcrumb.data);
    return { ...breadcrumb, data: scrubbedData };
  }

  return breadcrumb;
}

// ── Top-level beforeSend / beforeBreadcrumb ─────────────────────────────────

export function scrubSentryEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent {
  return {
    ...event,
    message: scrubText(event.message),
    logentry: event.logentry
      ? { ...event.logentry, message: scrubText(event.logentry.message) }
      : event.logentry,
    request: sanitizeRequest(event.request),
    user: sanitizeUser(event.user),
    tags: sanitizeTags(event.tags),
    extra: sanitizeExtra(event.extra),
    contexts: sanitizeContexts(event.contexts),
    exception: sanitizeException(event.exception),
    breadcrumbs: event.breadcrumbs
      ?.map((b) => scrubBreadcrumb(b))
      .filter((b): b is Breadcrumb => b !== null),
  };
}

export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  return scrubBreadcrumb(breadcrumb);
}
