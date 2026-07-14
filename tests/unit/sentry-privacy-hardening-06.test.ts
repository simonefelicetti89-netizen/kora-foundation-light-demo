// tests/unit/sentry-privacy-hardening-06.test.ts
// SENTRY-PRIVACY-HARDENING-06 — data scrubbing for lib/sentry/scrub.ts.
// All fixtures are synthetic (example.com emails, made-up hex strings) —
// never real personal data.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';
import {
  sanitizeUrl,
  scrubText,
  sanitizeRequest,
  sanitizeUser,
  sanitizeTags,
  sanitizeExtra,
  sanitizeContexts,
  sanitizeException,
  scrubBreadcrumb,
  scrubSentryEvent,
} from '@/lib/sentry/scrub';

const ROOT = resolve(process.cwd());
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const FAKE_EMAIL = 'mario.rossi@example.com';
const FAKE_TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'; // synthetic 64-hex
const FAKE_UUID = '11111111-2222-3333-4444-555555555555';

function baseErrorEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return {
    event_id: 'evt-sample',
    level: 'error',
    environment: 'production',
    release: 'kora@0.1.0',
    exception: { values: [{ type: 'Error', value: 'Something failed' }] },
    ...overrides,
  } as ErrorEvent;
}

describe('1. sendDefaultPii esplicito', () => {
  for (const file of ['sentry.client.config.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts']) {
    it(`${file} imposta sendDefaultPii: false esplicitamente`, () => {
      const src = read(file);
      expect(src).toContain('sendDefaultPii: false');
    });
  }
});

describe('2-4. event.user — email, username, IP rimossi', () => {
  it('sanitizeUser rimuove interamente user (email, username, ip_address, id)', () => {
    const user = { email: FAKE_EMAIL, username: 'mrossi', ip_address: '203.0.113.5', id: 'u_123' };
    expect(sanitizeUser(user)).toBeUndefined();
  });

  it('scrubSentryEvent produce event.user undefined anche con un fixture completo', () => {
    const event = baseErrorEvent({ user: { email: FAKE_EMAIL, username: 'mrossi', ip_address: '203.0.113.5' } });
    const result = scrubSentryEvent(event, {});
    expect(result.user).toBeUndefined();
  });
});

describe('5. Cookie rimossi da event.request', () => {
  it('sanitizeRequest non include mai cookies, indipendentemente dal valore', () => {
    const request = { url: '/company/workspace', cookies: { 'sb-access-token': 'xyz', session: 'abc' } };
    const result = sanitizeRequest(request);
    expect(result).not.toHaveProperty('cookies');
  });
});

describe('6. Authorization / header completi rimossi', () => {
  it('sanitizeRequest non include mai headers, incluso Authorization', () => {
    const request = { url: '/api/worker/profile', headers: { authorization: 'Bearer secretsecretsecret', 'user-agent': 'test' } };
    const result = sanitizeRequest(request);
    expect(result).not.toHaveProperty('headers');
  });
});

describe('7. Token Supabase rimosso', () => {
  it('un token in query_string o headers non sopravvive alla sanitizzazione della request', () => {
    const request = {
      url: `/auth/callback?access_token=${FAKE_TOKEN}&refresh_token=${FAKE_TOKEN}`,
      query_string: `access_token=${FAKE_TOKEN}`,
      headers: { authorization: `Bearer ${FAKE_TOKEN}` },
    };
    const result = sanitizeRequest(request);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(FAKE_TOKEN);
    expect(result).not.toHaveProperty('query_string');
  });
});

describe('8. Request body rimosso', () => {
  it('sanitizeRequest non include mai data (body)', () => {
    const request = { url: '/api/admin/company-users', data: { email: FAKE_EMAIL, role: 'COMPANY_ADMIN' } };
    const result = sanitizeRequest(request);
    expect(result).not.toHaveProperty('data');
  });
});

describe('9. Query string rimossa dall’URL', () => {
  it('sanitizeUrl rimuove qualunque query string', () => {
    expect(sanitizeUrl('/company/workspace?tenantId=abc-123&debug=true')).toBe('/company/workspace');
  });

  it('sanitizeRequest.url non contiene mai "?"', () => {
    const result = sanitizeRequest({ url: '/api/worker/pib?workerId=w_999' });
    expect(result?.url).not.toContain('?');
  });
});

describe('10. /link/<token> → /link/[token]', () => {
  it('token esadecimale lungo', () => {
    expect(sanitizeUrl(`/link/${FAKE_TOKEN}`)).toBe('/link/[token]');
  });

  it('con sottopercorso /activate', () => {
    expect(sanitizeUrl(`/link/${FAKE_TOKEN}/activate`)).toBe('/link/[token]/activate');
  });

  it('con query string aggiuntiva', () => {
    expect(sanitizeUrl(`/link/${FAKE_TOKEN}?activation=activated`)).toBe('/link/[token]');
  });
});

describe('11. /cv/share/<token> → /cv/share/[token]', () => {
  it('token esadecimale a 64 caratteri (formato reale del progetto)', () => {
    expect(sanitizeUrl(`/cv/share/${FAKE_TOKEN}`)).toBe('/cv/share/[token]');
  });
});

describe('12. Callback auth sanitizzata', () => {
  it('/auth/callback con code/token in query string non li espone', () => {
    const url = `/auth/callback?code=${FAKE_TOKEN}&type=recovery`;
    const result = sanitizeUrl(url);
    expect(result).toBe('/auth/callback');
    expect(result).not.toContain(FAKE_TOKEN);
  });
});

describe('13. Breadcrumb fetch/XHR sanitizzato', () => {
  it('rimuove il token dall’URL nel breadcrumb fetch', () => {
    const breadcrumb: Breadcrumb = {
      category: 'fetch',
      type: 'http',
      data: { method: 'POST', url: `/link/${FAKE_TOKEN}/activate`, status_code: 303 },
    };
    const result = scrubBreadcrumb(breadcrumb);
    expect(result?.data?.url).toBe('/link/[token]/activate');
    expect(JSON.stringify(result)).not.toContain(FAKE_TOKEN);
  });

  it('mantiene method e status_code (diagnosticamente utili, non sensibili)', () => {
    const breadcrumb: Breadcrumb = { category: 'xhr', data: { method: 'GET', url: '/api/worker/pib', status_code: 200 } };
    const result = scrubBreadcrumb(breadcrumb);
    expect(result?.data?.method).toBe('GET');
    expect(result?.data?.status_code).toBe(200);
  });

  it('rimuove eventuali campi body/request/response/headers se presenti', () => {
    const breadcrumb: Breadcrumb = {
      category: 'fetch',
      data: { url: '/api/x', body: { email: FAKE_EMAIL }, headers: { authorization: 'Bearer x' } } as Record<string, unknown>,
    };
    const result = scrubBreadcrumb(breadcrumb);
    expect(result?.data).not.toHaveProperty('body');
    expect(result?.data).not.toHaveProperty('headers');
  });
});

describe('14. Breadcrumb console sensibile eliminato', () => {
  it('elimina interamente un breadcrumb console contenente un token/password/secret', () => {
    for (const message of [
      'token=abc123 invalid',
      'password mismatch for user',
      'secret key rejected',
      `contact ${FAKE_EMAIL} for support`,
    ]) {
      const breadcrumb: Breadcrumb = { category: 'console', level: 'log', message };
      expect(scrubBreadcrumb(breadcrumb)).toBeNull();
    }
  });

  it('mantiene un breadcrumb console innocuo', () => {
    const breadcrumb: Breadcrumb = { category: 'console', level: 'log', message: 'component mounted' };
    expect(scrubBreadcrumb(breadcrumb)).not.toBeNull();
  });
});

describe('15. Tag tecnici mantenuti', () => {
  it('mantiene tag non personali (error_code, feature, route_name)', () => {
    const tags = { error_code: 'E_TIMEOUT', feature: 'data-intake', route_name: 'company.workspace' };
    expect(sanitizeTags(tags)).toEqual(tags);
  });
});

describe('16. Stack trace mantenuto', () => {
  it('sanitizeException conserva stacktrace e type, sanitizza solo value', () => {
    const exception = {
      values: [{
        type: 'TypeError',
        value: `Cannot read property of user ${FAKE_EMAIL}`,
        stacktrace: { frames: [{ filename: 'app/page.tsx', lineno: 10 }] },
      }],
    };
    const result = sanitizeException(exception);
    expect(result?.values?.[0].type).toBe('TypeError');
    expect(result?.values?.[0].stacktrace).toEqual(exception.values[0].stacktrace);
    expect(result?.values?.[0].value).not.toContain(FAKE_EMAIL);
  });
});

describe('17. Release / environment mantenuti', () => {
  it('scrubSentryEvent non tocca release/environment', () => {
    const event = baseErrorEvent({ release: 'kora@0.3.1', environment: 'production' });
    const result = scrubSentryEvent(event, {});
    expect(result.release).toBe('kora@0.3.1');
    expect(result.environment).toBe('production');
  });
});

const SCAN_DIRS = ['app', 'components', 'lib', 'services'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

// Matches an actual call — Sentry.setUser( — not a doc-comment mentioning
// the function name (e.g. this test file's own describe title, or
// lib/sentry/scrub.ts's comment documenting that no such call exists).
const SENTRY_SET_USER_CALL = /Sentry\.setUser\s*\(/;

function findSentrySetUserCalls(dir: string, hits: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      findSentrySetUserCalls(full, hits);
    } else if (/\.tsx?$/.test(entry)) {
      const srcWithoutComments = readFileSync(full, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
      if (SENTRY_SET_USER_CALL.test(srcWithoutComments)) hits.push(full);
    }
  }
  return hits;
}

describe('18. Nessuna email usata in setUser (nessuna chiamata esiste)', () => {
  it('nessun Sentry.setUser() in app/, components/, lib/, services/', () => {
    const hits = SCAN_DIRS.flatMap((dir) => findSentrySetUserCalls(resolve(ROOT, dir)));
    expect(hits).toEqual([]);
  });
});

describe('19. Nessun tenant/worker/partner ID in chiaro', () => {
  it('sanitizeTags rimuove chiavi worker_id/tenant_id/partner_id/user_id', () => {
    const tags = { worker_id: 'w_1', tenant_id: 't_1', partner_id: 'p_1', user_id: 'u_1', error_code: 'E_1' };
    const result = sanitizeTags(tags);
    expect(result).toEqual({ error_code: 'E_1' });
  });

  it('sanitizeExtra rimuove le stesse chiavi sensibili', () => {
    const extra = { workerId: 'w_1', tenantId: 't_1' };
    expect(sanitizeExtra(extra)).toEqual({});
  });
});

describe('20. Nessun payload request inviato', () => {
  it('scrubSentryEvent su un evento con request.data completo non lo include nel risultato', () => {
    const event = baseErrorEvent({
      request: { url: '/api/worker/onboarding', data: { firstName: 'Mario', lastName: 'Rossi', email: FAKE_EMAIL } },
    });
    const result = scrubSentryEvent(event, {});
    expect(JSON.stringify(result.request)).not.toContain('Mario');
    expect(JSON.stringify(result.request)).not.toContain(FAKE_EMAIL);
  });
});

describe('21. Errori Supabase ridotti — email/dettagli rimossi dal messaggio', () => {
  it('scrubText rimuove un email annidata in un messaggio di errore Supabase-like', () => {
    const supabaseLikeMessage = `duplicate key value violates unique constraint "users_email_key" for ${FAKE_EMAIL}`;
    const result = scrubText(supabaseLikeMessage);
    expect(result).not.toContain(FAKE_EMAIL);
    expect(result).toContain('duplicate key value violates unique constraint');
  });

  it('scrubText rimuove token lunghi eventualmente presenti in un messaggio di errore', () => {
    const message = `JWT verification failed for token ${FAKE_TOKEN}`;
    const result = scrubText(message);
    expect(result).not.toContain(FAKE_TOKEN);
  });
});

describe('22. Session replay disabilitato', () => {
  it('nessuna integrazione replay in nessuno dei 3 config Sentry', () => {
    for (const file of ['sentry.client.config.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts']) {
      const src = read(file);
      expect(src).not.toContain('replayIntegration');
      expect(src).not.toContain('replaysSessionSampleRate');
      expect(src).not.toContain('replaysOnErrorSampleRate');
    }
  });

  it('nessuna integrazione di profiling/tracing aggiuntiva introdotta in questo sprint', () => {
    for (const file of ['sentry.client.config.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts']) {
      const src = read(file);
      expect(src).not.toContain('profilesSampleRate');
      expect(src).not.toContain('nodeProfilingIntegration');
    }
  });
});

describe('24. Inventario — beforeSend/beforeBreadcrumb sono cablati in tutti e 3 i config', () => {
  for (const file of ['sentry.client.config.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts']) {
    it(`${file} usa beforeSend e beforeBreadcrumb da lib/sentry/scrub.ts`, () => {
      const src = read(file);
      expect(src).toContain("from '@/lib/sentry/scrub'");
      expect(src).toContain('beforeSend: scrubSentryEvent');
      expect(src).toContain('beforeBreadcrumb: scrubSentryBreadcrumb');
    });
  }

  it('UUID nei path viene generalizzato a [id] (difesa in profondità per route dinamiche non elencate esplicitamente)', () => {
    expect(sanitizeUrl(`/admin/companies/${FAKE_UUID}`)).toBe(`/admin/companies/[id]`);
  });

  it('fixture combinata: nessun campo sensibile sopravvive a scrubSentryEvent end-to-end', () => {
    const event = baseErrorEvent({
      user: { email: FAKE_EMAIL, id: 'u_1' },
      request: {
        url: `/link/${FAKE_TOKEN}?ref=email-campaign`,
        cookies: { session: 'x' },
        headers: { authorization: `Bearer ${FAKE_TOKEN}` },
        data: { note: `contact ${FAKE_EMAIL}` },
      },
      tags: { worker_id: 'w_1', error_code: 'E_BOOM' },
      extra: { tenantId: 't_1', retries: 3 },
      breadcrumbs: [
        { category: 'console', message: `password reset for ${FAKE_EMAIL}` },
        { category: 'fetch', data: { method: 'GET', url: `/cv/share/${FAKE_TOKEN}` } },
      ],
      exception: { values: [{ type: 'Error', value: `Failed for ${FAKE_EMAIL}` }] },
    });

    const result = scrubSentryEvent(event, {});
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(FAKE_EMAIL);
    expect(serialized).not.toContain(FAKE_TOKEN);
    expect(serialized).not.toContain('w_1');
    expect(serialized).not.toContain('t_1');
    expect(result.tags).toEqual({ error_code: 'E_BOOM' });
    expect(result.extra).toEqual({ retries: 3 });
    expect(result.breadcrumbs?.length).toBe(1); // console breadcrumb dropped, fetch kept+sanitized
    expect(result.breadcrumbs?.[0].data?.url).toBe('/cv/share/[token]');
  });
});
