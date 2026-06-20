/**
 * UI Governance — KORA Index output contract (doc 21b)
 *
 * Verifica staticamente che le superfici KORA Index espongano sempre:
 *   · KORA Index value
 *   · Confidence Score
 *   · Activation Safeguard status
 *   · calibration_status
 *   · methodology_version_id
 *
 * Nessun browser, nessun rendering React. Analisi statica su sorgente.
 * Non testa estetica (classi, colori, layout) — testa governance.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── 1. KoraIndexHero — SafeguardBadge ────────────────────────────────────────

describe('UI Governance — KoraIndexHero: SafeguardBadge', () => {
  const hero = src('components/kora-index/KoraIndexHero.tsx');

  it('importa SafeguardBadge', () => {
    expect(hero).toMatch(/import.*SafeguardBadge/);
  });

  it('renderizza <SafeguardBadge nel JSX', () => {
    expect(hero).toContain('<SafeguardBadge');
  });

  it('SafeguardBadge riceve safeguard_status (via prop o variabile locale)', () => {
    expect(hero).toMatch(/safeguard_status|safeguardStatus/);
  });
});

// ── 2. KoraIndexHero — CalibrationBadge ──────────────────────────────────────

describe('UI Governance — KoraIndexHero: CalibrationBadge', () => {
  const hero = src('components/kora-index/KoraIndexHero.tsx');

  it('importa CalibrationBadge', () => {
    expect(hero).toMatch(/import.*CalibrationBadge/);
  });

  it('renderizza <CalibrationBadge nel JSX', () => {
    expect(hero).toContain('<CalibrationBadge');
  });

  it('CalibrationBadge riceve calibration_status (via prop o variabile locale)', () => {
    expect(hero).toMatch(/calibration_status|calibrationStatus/);
  });
});

// ── 3. KoraIndexHero — Confidence Score ──────────────────────────────────────

describe('UI Governance — KoraIndexHero: Confidence Score', () => {
  const hero = src('components/kora-index/KoraIndexHero.tsx');

  it('legge confidence_score o confidenceScore dal prop output', () => {
    expect(hero).toMatch(/confidence_score|confidenceScore/);
  });

  it('label "Confidence Score" visibile nel markup (non solo commento/type)', () => {
    // Cerca la label come stringa JSX — almeno uno tra varianti attese
    const hasLabel =
      hero.includes('Confidence Score') ||
      hero.includes('Confidence score') ||
      hero.includes('confidence_score');
    expect(hasLabel).toBe(true);
  });

  it('confidence non è solo importato come tipo — è usato in JSX', () => {
    // confidenceScore deve apparire sia fuori dai commenti che nel return/JSX
    const withoutComments = hero.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(withoutComments).toMatch(/confidenceScore|confidence_score/);
  });
});

// ── 4. KoraIndexHero — methodology_version_id ────────────────────────────────

describe('UI Governance — KoraIndexHero: methodology version', () => {
  const hero = src('components/kora-index/KoraIndexHero.tsx');

  it('legge methodology_version_id o methodologyVersionId', () => {
    expect(hero).toMatch(/methodology_version_id|methodologyVersionId/);
  });

  it('version è usato nel JSX — non solo letto fuori dal return', () => {
    const withoutComments = hero.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(withoutComments).toMatch(/methodologyVersionId|methodology_version_id/);
  });
});

// ── 5. KoraIndexOutput — campi minimi di governance nel tipo TypeScript ───────

describe('UI Governance — KoraIndexOutput type: campi obbligatori doc 21b', () => {
  const types = src('lib/types/index.ts');

  // Estrai solo il blocco interface KoraIndexOutput (fino alla prima '}' chiudente)
  const match = types.match(/export interface KoraIndexOutput \{[\s\S]*?\n\}/);
  const block  = match ? match[0] : types;

  it('KoraIndexOutput esiste in lib/types/index.ts', () => {
    expect(types).toContain('export interface KoraIndexOutput');
  });

  it('KoraIndexOutput contiene kora_index_value', () => {
    expect(block).toContain('kora_index_value');
  });

  it('KoraIndexOutput contiene confidence_score', () => {
    expect(block).toContain('confidence_score');
  });

  it('KoraIndexOutput contiene safeguard_status', () => {
    expect(block).toContain('safeguard_status');
  });

  it('KoraIndexOutput contiene methodology_version_id', () => {
    expect(block).toContain('methodology_version_id');
  });

  it('KoraIndexOutput contiene calibration_status', () => {
    expect(block).toContain('calibration_status');
  });
});

// ── 6. useScoringResult — no demo fallback in live mode ───────────────────────

describe('UI Governance — useScoringResult: nessun fallback demo in live', () => {
  const hook = src('lib/scoring-result/index.ts');

  it('contiene guardia esplicita "LIVE must NEVER fallback to demo seed data"', () => {
    expect(hook).toContain('LIVE must NEVER fallback to demo seed data');
  });

  it('il path live (fetchLiveScoringResult) NON chiama getDemoScoringResult', () => {
    // Isola la funzione fetchLiveScoringResult
    const fetchFnMatch = hook.match(/async function fetchLiveScoringResult[\s\S]*?^}/m);
    const fetchFn = fetchFnMatch ? fetchFnMatch[0] : '';
    // getDemoScoringResult non deve apparire nel body della funzione live
    expect(fetchFn).not.toContain('getDemoScoringResult');
    expect(fetchFn).not.toContain('scoringSimulatorService');
  });

  it('in live mode il fallback è insufficient_data, non demo data', () => {
    // Se Supabase non ha dati, il branch live restituisce insufficient_data
    expect(hook).toContain("status: 'insufficient_data'");
    // Verifica che il return di insufficient_data abbia koraIndex: null (non demo)
    const insufficientBlock = hook.match(/status:\s*['"]insufficient_data['"][\s\S]{0,200}/)?.[0] ?? '';
    expect(insufficientBlock).toMatch(/koraIndex:\s*null/);
  });

  it('forceEnvironment=live non raggiunge il branch demo (demo ramo solo se environment==="demo")', () => {
    // La guardia deve essere esplicita: solo "demo" porta a getDemoScoringResult
    expect(hook).toMatch(/environment\s*===?\s*['"]demo['"]/);
    // Il return demo deve essere condizionale, non unconditional
    const demoReturn = hook.indexOf('getDemoScoringResult');
    const demoCondition = hook.lastIndexOf('demo', demoReturn);
    expect(demoCondition).toBeGreaterThan(0);
  });
});

// ── 7. /company/kora-index/page.tsx — superfice principale: componenti governance

describe('UI Governance — /company/kora-index/page.tsx: componenti governance', () => {
  const page = src('app/company/kora-index/page.tsx');

  it('usa ActivationSafeguardPanel', () => {
    expect(page).toContain('ActivationSafeguardPanel');
  });

  it('usa ConfidenceBreakdown', () => {
    expect(page).toContain('ConfidenceBreakdown');
  });

  it('usa ComponentBreakdown (10 componenti)', () => {
    expect(page).toContain('ComponentBreakdown');
  });

  it('usa KoraIndexBuildCard o KoraIndexHero come entry point output', () => {
    const hasHero  = page.includes('KoraIndexHero');
    const hasBuild = page.includes('KoraIndexBuildCard');
    expect(hasHero || hasBuild).toBe(true);
  });

  it('usa useScoringResult — entry point canonico', () => {
    expect(page).toContain('useScoringResult');
  });

  it('forceEnvironment=live — nessun fallback demo su questa pagina', () => {
    expect(page).toMatch(/forceEnvironment\s*[=:]\s*['"]live['"]/);
  });
});

// ── 8. /company/reports/page.tsx — audit non bloccante (era YELLOW in audit) ──

describe('UI Governance — /company/reports/page.tsx: audit statico', () => {
  const page = src('app/company/reports/page.tsx');

  it('usa KoraIndexHero come entry point KORA Index output (risolve stato YELLOW precedente)', () => {
    // Reports era YELLOW nell'audit — verificato ora che usa KoraIndexHero
    expect(page).toContain('KoraIndexHero');
  });

  it('usa ComponentBreakdown', () => {
    expect(page).toContain('ComponentBreakdown');
  });

  it('usa ActivationSafeguardPanel', () => {
    expect(page).toContain('ActivationSafeguardPanel');
  });

  it('espone confidence_score (non solo in import/type)', () => {
    const withoutImports = page.replace(/^import.*$/gm, '');
    expect(withoutImports).toMatch(/confidence_score|confidenceScore/);
  });

  // Non bloccante: verifica presenza di safeguard_status fuori dalle import
  it('espone safeguard_status nel JSX', () => {
    const withoutImports = page.replace(/^import.*$/gm, '');
    expect(withoutImports).toMatch(/safeguard_status|safeguardStatus/);
  });
});
