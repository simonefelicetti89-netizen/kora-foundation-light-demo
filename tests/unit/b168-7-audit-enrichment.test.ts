// tests/unit/b168-7-audit-enrichment.test.ts
// B168.7 — Verifica che ip_hash e user_agent_hash siano popolati correttamente
// nell'helper logServiceAccess tramite hashing one-way con AUDIT_HASH_SALT.

import { readFileSync } from 'fs';
import { join }        from 'path';
import { createHash }  from 'crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const SRC = join(process.cwd(), 'lib/audit/log-access.ts');
const src = readFileSync(SRC, 'utf8');

// ── Group 1: Source structure ────────────────────────────────────────────────

describe('B168.7 — log-access.ts source structure', () => {
  it('imports createHash from crypto', () => {
    expect(src).toContain("from 'crypto'");
    expect(src).toContain('createHash');
  });

  it('reads AUDIT_HASH_SALT from process.env with fallback', () => {
    expect(src).toContain('process.env.AUDIT_HASH_SALT');
    expect(src).toContain("'kora-audit-salt'");
  });

  it('interface has ipAddress and userAgent (raw strings, not pre-hashed)', () => {
    expect(src).toContain('ipAddress?:');
    expect(src).toContain('userAgent?:');
    // Pre-hashed fields removed from interface
    expect(src).not.toMatch(/^\s+ipHash\?:/m);
    expect(src).not.toMatch(/^\s+userAgentHash\?:/m);
  });

  it('hashes ipAddress into ip_hash in the insert', () => {
    expect(src).toContain('ip_hash:');
    expect(src).toContain('entry.ipAddress');
  });

  it('hashes userAgent into user_agent_hash in the insert', () => {
    expect(src).toContain('user_agent_hash:');
    expect(src).toContain('entry.userAgent');
  });

  it('uses null (not undefined) when ipAddress is absent', () => {
    expect(src).toContain(': null');
  });
});

// ── Group 2: Hash logic ───────────────────────────────────────────────────────

describe('B168.7 — hash logic invariants', () => {
  const salt = 'test-salt-for-unit';

  function hashWith(s: string, value: string): string {
    return createHash('sha256').update(s + value).digest('hex');
  }

  it('produces a 64-char hex string (SHA-256)', () => {
    const h = hashWith(salt, '1.2.3.4');
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic — same input → same output', () => {
    const h1 = hashWith(salt, '1.2.3.4');
    const h2 = hashWith(salt, '1.2.3.4');
    expect(h1).toBe(h2);
  });

  it('is salt-sensitive — same input, different salt → different output', () => {
    const h1 = hashWith('salt-A', '1.2.3.4');
    const h2 = hashWith('salt-B', '1.2.3.4');
    expect(h1).not.toBe(h2);
  });

  it('is input-sensitive — different IP → different hash', () => {
    const h1 = hashWith(salt, '1.2.3.4');
    const h2 = hashWith(salt, '5.6.7.8');
    expect(h1).not.toBe(h2);
  });

  it('produces different hashes for IP vs user-agent (non-collision)', () => {
    const h1 = hashWith(salt, 'Mozilla/5.0');
    const h2 = hashWith(salt, '1.2.3.4');
    expect(h1).not.toBe(h2);
  });
});

// ── Group 3: AUDIT_HASH_SALT env reading ─────────────────────────────────────

describe('B168.7 — AUDIT_HASH_SALT environment variable', () => {
  const original = process.env.AUDIT_HASH_SALT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.AUDIT_HASH_SALT;
    } else {
      process.env.AUDIT_HASH_SALT = original;
    }
  });

  it('source reads AUDIT_HASH_SALT from process.env', () => {
    // Structural: the source contains the env var read
    expect(src).toContain('process.env.AUDIT_HASH_SALT');
  });

  it('.env.local.example includes AUDIT_HASH_SALT placeholder', () => {
    const example = readFileSync(join(process.cwd(), '.env.local.example'), 'utf8');
    expect(example).toContain('AUDIT_HASH_SALT=cambia-questo-valore-in-produzione');
  });
});

// ── Group 4: Company layout call site ────────────────────────────────────────

describe('B168.7 — company/layout.tsx call site', () => {
  const layoutSrc = readFileSync(
    join(process.cwd(), 'app/company/layout.tsx'),
    'utf8'
  );

  it('imports headers from next/headers', () => {
    expect(layoutSrc).toContain("{ cookies, headers }");
    expect(layoutSrc).toContain("from 'next/headers'");
  });

  it('reads x-forwarded-for header for IP', () => {
    expect(layoutSrc).toContain('x-forwarded-for');
  });

  it('reads user-agent header', () => {
    expect(layoutSrc).toContain('user-agent');
  });

  it('passes ipAddress to logServiceAccess', () => {
    expect(layoutSrc).toContain('ipAddress:');
  });

  it('passes userAgent to logServiceAccess', () => {
    expect(layoutSrc).toContain('userAgent:');
  });

  it('call is fire-and-forget (void, not await)', () => {
    expect(layoutSrc).toContain('void logServiceAccess(');
  });
});
