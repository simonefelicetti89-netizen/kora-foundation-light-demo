// tests/unit/b168-5-p3-request-access-next.test.ts
// B168.5-P3 — verifica supporto parametro ?next= in /request-access
// e struttura della pagina.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

describe('/request-access — struttura base', () => {
  const src = read('app/request-access/page.tsx');

  it('è una pagina pubblica (nessun requireKoraAdmin o requireDemoAccess)', () => {
    expect(src).not.toContain('requireKoraAdmin');
    expect(src).not.toContain('requireDemoAccess');
  });

  it('usa mailto: nessun Supabase auth call', () => {
    expect(src).toContain('mailto:');
    expect(src).not.toContain('supabase.auth');
    expect(src).not.toContain('getUser()');
  });

  it('ha il data-testid request-access-page', () => {
    expect(src).toContain('data-testid="request-access-page"');
  });

  it('ha CTA mailto con data-testid', () => {
    expect(src).toContain('data-testid="request-access-mailto-cta"');
  });

  it('ha avviso NON crea account con data-testid', () => {
    expect(src).toContain('data-testid="request-access-no-account-notice"');
    expect(src).toContain('NON crea un account');
  });

  it('NON usa localStorage (vietato in questo ambiente)', () => {
    expect(src).not.toContain('localStorage');
  });
});

describe('/request-access — supporto parametro ?next= (B168.5-P3)', () => {
  const src = read('app/request-access/page.tsx');

  it('è async e legge searchParams', () => {
    expect(src).toContain('async function RequestAccessPage');
    expect(src).toContain('searchParams');
    expect(src).toContain('await searchParams');
  });

  it('estrae il parametro next da searchParams', () => {
    expect(src).toContain('next?:');
    expect(src).toContain('sp.next');
  });

  it('mostra il path richiesto quando next è presente', () => {
    expect(src).toContain('data-testid="request-access-context-path"');
    expect(src).toContain('requestedPath');
    expect(src).toContain('Ti contatteremo entro 24h');
  });

  it('include requestedPath nel body del mailto', () => {
    expect(src).toContain('Pagina di interesse:');
    expect(src).toContain('bodyWithContext');
  });

  it('il blocco context-path è condizionale (solo se requestedPath presente)', () => {
    expect(src).toContain('{requestedPath && (');
  });
});

describe('/request-access — robots e metadata', () => {
  const src = read('app/request-access/page.tsx');

  it('ha robots noindex', () => {
    expect(src).toContain('index: false');
    expect(src).toContain('follow: false');
  });

  it('ha title KORA', () => {
    expect(src).toContain('Richiedi accesso · KORA');
  });
});
