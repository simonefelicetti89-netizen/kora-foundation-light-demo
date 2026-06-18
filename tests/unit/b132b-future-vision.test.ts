// tests/unit/b132b-future-vision.test.ts
// B132-B: Future Vision — 7 moduli in esplorazione + boundary invarianti.
// Pure fs.readFileSync — no runtime, no DB, no Supabase.

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const FILE = path.resolve(__dirname, '../../app/demo/future-vision/page.tsx');

let src: string;
beforeAll(() => {
  src = fs.readFileSync(FILE, 'utf-8');
});

// ─────────────────────────────────────────────────────────────────────────────
// Presenza dei 7 moduli
// ─────────────────────────────────────────────────────────────────────────────

describe('B132-B — 7 moduli in esplorazione presenti', () => {
  it('contiene AI Transition Readiness', () => {
    expect(src).toContain('AI Transition Readiness');
  });

  it('contiene KORA Care', () => {
    expect(src).toContain('KORA Care');
  });

  it('contiene Workforce Resilience', () => {
    expect(src).toContain('Workforce Resilience');
  });

  it('contiene Just Transition', () => {
    expect(src).toContain('Just Transition');
  });

  it('contiene Supply Chain Activation', () => {
    expect(src).toContain('Supply Chain Activation');
  });

  it('contiene Mental Capital', () => {
    expect(src).toContain('Mental Capital');
  });

  it('contiene KORA Legacy Module', () => {
    expect(src).toContain('KORA Legacy Module');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Struttura e testid
// ─────────────────────────────────────────────────────────────────────────────

describe('B132-B — struttura sezione future-modules', () => {
  it('ha data-testid="future-modules"', () => {
    expect(src).toContain('data-testid="future-modules"');
  });

  it('contiene label "In esplorazione · non attivo"', () => {
    expect(src).toContain('In esplorazione · non attivo');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Disclaimer obbligatorio
// ─────────────────────────────────────────────────────────────────────────────

describe('B132-B — disclaimer sezione obbligatorio', () => {
  it('contiene "non attivi"', () => {
    expect(src).toMatch(/non sono attivi|non attivi/i);
  });

  it('contiene "non contrattualizzabili"', () => {
    expect(src).toContain('non sono contrattualizzabili');
  });

  it('contiene "validazione empirica"', () => {
    expect(src).toContain('validazione empirica');
  });

  it('contiene "legal/privacy review"', () => {
    expect(src).toContain('legal/privacy review');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Copy obbligatoria per moduli ad alta sensibilità
// ─────────────────────────────────────────────────────────────────────────────

describe('B132-B — Mental Capital: copy alta sensibilità', () => {
  it('contiene "mai psicometria individuale"', () => {
    expect(src).toContain('mai psicometria individuale');
  });

  it('contiene "mai dato clinico"', () => {
    expect(src).toContain('mai dato clinico');
  });

  it('contiene "mai worker scoring"', () => {
    expect(src).toContain('mai worker scoring');
  });
});

describe('B132-B — KORA Care: copy perimetro corretto', () => {
  it('contiene "caregiver"', () => {
    expect(src).toContain('caregiver');
  });

  it('contiene "genitorialità"', () => {
    expect(src).toContain('genitorialità');
  });

  it('contiene "senza dati clinici individuali"', () => {
    expect(src).toContain('senza dati clinici individuali');
  });
});

describe('B132-B — AI Transition Readiness: esclusione AI replacement score', () => {
  it('contiene "mai AI replacement score"', () => {
    expect(src).toContain('mai AI replacement score');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boundary invarianti: nessun href verso route live
// ─────────────────────────────────────────────────────────────────────────────

describe('B132-B — boundary: nessun href verso route riservate', () => {
  it('Phase 01 usa /company/* canonical (B171: demo copies removed)', () => {
    // B171: /demo/company/* RIDONDANTE rimossi. future-vision ora usa rotte canoniche.
    expect(src).toContain('/company/kora-index');
    expect(src).toContain('/company/activation');
    expect(src).toContain('/company/financial');
    expect(src).toContain('/company/reports');
  });

  it('non contiene href verso /admin/', () => {
    expect(src).not.toMatch(/href[=:\s]*['"]\/admin\//);
  });

  it('non contiene href verso /worker/', () => {
    expect(src).not.toMatch(/href[=:\s]*['"]\/worker\//);
  });

  it('non contiene href verso /partner/', () => {
    expect(src).not.toMatch(/href[=:\s]*['"]\/partner['"\/]/);
  });

  it('non contiene href verso /api/', () => {
    expect(src).not.toMatch(/href[=:\s]*['"]\/api\//);
  });

  it('CTA Demo Guide intatta', () => {
    expect(src).toContain('href="/demo/guide"');
  });
});
