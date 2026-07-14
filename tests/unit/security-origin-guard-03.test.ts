// tests/unit/security-origin-guard-03.test.ts
// SECURITY-ORIGIN-GUARD-03 — origin guard helper (lib/security/origin.ts).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { checkOrigin, assertSameOrigin } from '@/lib/security/origin';

const SELF = 'https://app.kora.example';

function makeRequest(opts: {
  method?: string;
  origin?: string | null;
  authorization?: string;
  url?: string;
}): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.origin !== undefined && opts.origin !== null) headers.origin = opts.origin;
  if (opts.authorization) headers.authorization = opts.authorization;

  return new NextRequest(opts.url ?? `${SELF}/api/worker/profile`, {
    method: opts.method ?? 'POST',
    headers,
  });
}

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = SELF;
});

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  }
});

describe('checkOrigin — richieste consentite', () => {
  it('same-origin valida (Origin === self origin derivato da nextUrl)', () => {
    const req = makeRequest({ origin: SELF });
    const result = checkOrigin(req);
    expect(result).toEqual({ allowed: true, reason: 'origin_allowed' });
  });

  it('origine esplicitamente consentita via NEXT_PUBLIC_SITE_URL (diversa dal self-origin della request)', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://staging.kora.example';
    const req = makeRequest({ url: `${SELF}/api/worker/profile`, origin: 'https://staging.kora.example' });
    const result = checkOrigin(req);
    expect(result).toEqual({ allowed: true, reason: 'origin_allowed' });
  });

  it('nessun header Origin → consentita (policy documentata, non un bypass silenzioso)', () => {
    const req = makeRequest({ origin: null });
    const result = checkOrigin(req);
    expect(result).toEqual({ allowed: true, reason: 'no_origin_header' });
  });

  it('richiesta con Authorization: Bearer → consentita indipendentemente da Origin', () => {
    const req = makeRequest({ origin: 'https://evil.example', authorization: 'Bearer some-token' });
    const result = checkOrigin(req);
    expect(result).toEqual({ allowed: true, reason: 'bearer_auth' });
  });

  it('Authorization case-insensitive su "Bearer"', () => {
    const req = makeRequest({ origin: 'https://evil.example', authorization: 'bearer some-token' });
    const result = checkOrigin(req);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('bearer_auth');
  });

  it('metodo GET non è soggetto al guard, anche con Origin esterna', () => {
    const req = makeRequest({ method: 'GET', origin: 'https://evil.example' });
    const result = checkOrigin(req);
    expect(result).toEqual({ allowed: true, reason: 'safe_method' });
  });

  it('metodo HEAD non è soggetto al guard', () => {
    const req = makeRequest({ method: 'HEAD', origin: 'https://evil.example' });
    expect(checkOrigin(req).allowed).toBe(true);
  });

  it('metodo OPTIONS non è soggetto al guard', () => {
    const req = makeRequest({ method: 'OPTIONS', origin: 'https://evil.example' });
    expect(checkOrigin(req).allowed).toBe(true);
  });

  it('ambiente locale — self-origin da nextUrl (localhost) funziona senza configurazione', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const req = makeRequest({ url: 'http://localhost:3000/api/worker/profile', origin: 'http://localhost:3000' });
    const result = checkOrigin(req);
    expect(result).toEqual({ allowed: true, reason: 'origin_allowed' });
  });
});

describe('checkOrigin — richieste rifiutate', () => {
  it('metodo mutante è soggetto al guard (POST con Origin esterna → negata)', () => {
    const req = makeRequest({ method: 'POST', origin: 'https://evil.example' });
    const result = checkOrigin(req);
    expect(result).toEqual({ allowed: false, reason: 'origin_denied' });
  });

  it('origine esterna non consentita', () => {
    const req = makeRequest({ origin: 'https://not-kora.example' });
    expect(checkOrigin(req)).toEqual({ allowed: false, reason: 'origin_denied' });
  });

  it('Origin: null (contesto opaco/sandboxed) → rifiutata come malformata', () => {
    const req = makeRequest({ origin: 'null' });
    expect(checkOrigin(req)).toEqual({ allowed: false, reason: 'origin_malformed' });
  });

  it('origine malformata (stringa non parsabile come URL) → rifiutata', () => {
    const req = makeRequest({ origin: 'not-a-url' });
    expect(checkOrigin(req)).toEqual({ allowed: false, reason: 'origin_malformed' });
  });

  it('bypass tentato via differenza di protocollo (http vs https) → rifiutata', () => {
    const req = makeRequest({ origin: 'http://app.kora.example' }); // SELF è https
    expect(checkOrigin(req)).toEqual({ allowed: false, reason: 'origin_denied' });
  });

  it('bypass tentato via porta diversa → rifiutata', () => {
    const req = makeRequest({ origin: 'https://app.kora.example:8443' });
    expect(checkOrigin(req)).toEqual({ allowed: false, reason: 'origin_denied' });
  });

  it('bypass tentato via sottodominio non consentito → rifiutata', () => {
    const req = makeRequest({ origin: 'https://evil.app.kora.example' });
    expect(checkOrigin(req)).toEqual({ allowed: false, reason: 'origin_denied' });
  });

  it('bypass tentato via suffisso di dominio (trusted.com.evil.com) → rifiutata', () => {
    const req = makeRequest({ origin: 'https://app.kora.example.evil.example' });
    expect(checkOrigin(req)).toEqual({ allowed: false, reason: 'origin_denied' });
  });

  it('bypass tentato via credenziali nell\'URL (userinfo che maschera l\'host reale) → rifiutata', () => {
    // new URL('https://app.kora.example@evil.example') → host reale è evil.example
    const req = makeRequest({ origin: 'https://app.kora.example@evil.example' });
    expect(checkOrigin(req)).toEqual({ allowed: false, reason: 'origin_denied' });
  });

  it('bypass tentato via maiuscole/minuscole diverse → normalizzata e comunque valutata correttamente (host case-insensitive)', () => {
    // Il case dell'host è normalizzato dal parser URL: questo verifica che
    // un host legittimo in maiuscolo continui a essere RICONOSCIUTO come
    // uguale (non un bypass, ma nemmeno un falso rifiuto).
    const req = makeRequest({ origin: 'HTTPS://APP.KORA.EXAMPLE' });
    expect(checkOrigin(req)).toEqual({ allowed: true, reason: 'origin_allowed' });
  });
});

describe('assertSameOrigin — risposta 403', () => {
  it('restituisce null (via libera) quando la richiesta è consentita', async () => {
    const req = makeRequest({ origin: SELF });
    expect(assertSameOrigin(req)).toBeNull();
  });

  it('restituisce una NextResponse 403 quando l\'origine non è consentita', async () => {
    const req = makeRequest({ origin: 'https://evil.example' });
    const res = assertSameOrigin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('il corpo della risposta 403 non espone dettagli sensibili (nessuna origin allowlist, nessun header, nessun token)', async () => {
    const req = makeRequest({ origin: 'https://evil.example' });
    const res = assertSameOrigin(req);
    expect(res).not.toBeNull();
    const body = await res!.json();
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('evil.example');
    expect(bodyStr).not.toContain('kora.example');
    expect(body).toEqual({ error: 'Forbidden' });
  });
});
