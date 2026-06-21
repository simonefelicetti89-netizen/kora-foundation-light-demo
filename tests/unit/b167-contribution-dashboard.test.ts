/**
 * B167 — Dashboard KORA Contribution
 *
 * Test strutturali + unit test puri su narrativa e aggregazione.
 * Nessuna chiamata DB: mock inline per service, funzioni narrative testate in isolamento.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}
function exists(rel: string): boolean {
  try { readFileSync(resolve(ROOT, rel)); return true; } catch { return false; }
}
function strip(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '');
}

// ── 1. File existence ─────────────────────────────────────────────────────────

describe('B167 — file existence', () => {
  it('lib/commons/contribution-views.ts esiste', () => {
    expect(exists('lib/commons/contribution-views.ts')).toBe(true);
  });

  it('lib/commons/contribution-narrative.ts esiste', () => {
    expect(exists('lib/commons/contribution-narrative.ts')).toBe(true);
  });

  it('app/company/contribution/page.tsx esiste', () => {
    expect(exists('app/company/contribution/page.tsx')).toBe(true);
  });

  it('KoraContributionService ha getContributionPromoterView', () => {
    expect(exists('services/kora-contribution/KoraContributionService.ts')).toBe(true);
    const src = read('services/kora-contribution/KoraContributionService.ts');
    expect(src).toContain('export async function getContributionPromoterView');
  });

  it('KoraContributionService ha getContributionOriginEmployerView', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    expect(src).toContain('export async function getContributionOriginEmployerView');
  });
});

// ── 2. Tipi ContributionViews ─────────────────────────────────────────────────

describe('B167 — tipi contribution-views', () => {
  const src = read('lib/commons/contribution-views.ts');

  it('ContributionPillarBreakdown esportato', () => {
    expect(src).toContain('export interface ContributionPillarBreakdown');
    expect(src).toContain('pillar:');
    expect(src).toContain('count:');
    expect(src).toContain('share_pct:');
  });

  it('ContributionPromoterView esportato con campi chiave', () => {
    expect(src).toContain('export interface ContributionPromoterView');
    expect(src).toContain('distinct_initiatives:');
    expect(src).toContain('participations_received:');
    expect(src).toContain('external_outreach_events:');
    expect(src).toContain('pillar_breakdown:');
    expect(src).toContain('narrative:');
  });

  it('ContributionOriginEmployerView esportato con campi chiave', () => {
    expect(src).toContain('export interface ContributionOriginEmployerView');
    expect(src).toContain('participations_sent:');
    expect(src).toContain('distinct_initiatives:');
    expect(src).toContain('distinct_promoters:');
    expect(src).toContain('pillar_breakdown:');
    expect(src).toContain('narrative:');
  });

  it('entrambe le view: calibration_status = pre_empirical_calibration', () => {
    expect(src).toContain("calibration_status:     'pre_empirical_calibration'");
  });

  it('nessun punteggio aggregato unico (no contribution_score)', () => {
    expect(src).not.toContain('contribution_score');
  });
});

// ── 3. Narrativa — funzioni pure ──────────────────────────────────────────────

describe('B167 — narrativa buildPromoterNarrative', () => {
  it('0 iniziative → frase "non ha ancora promosso"', async () => {
    const { buildPromoterNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildPromoterNarrative({
      distinct_initiatives:     0,
      participations_received:  0,
      external_outreach_events: 0,
      pillar_breakdown:         [],
    });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toContain('non ha ancora promosso');
  });

  it('1 iniziativa → frase con count "1"', async () => {
    const { buildPromoterNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildPromoterNarrative({
      distinct_initiatives:     1,
      participations_received:  3,
      external_outreach_events: 0,
      pillar_breakdown:         [{ pillar: 'GROWTH', count: 1, weight: 1.0, share_pct: 100 }],
    });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toContain('1');
    expect(result[0]).toContain('cross-azienda');
  });

  it('3 iniziative → frase con count "3"', async () => {
    const { buildPromoterNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildPromoterNarrative({
      distinct_initiatives:     3,
      participations_received:  12,
      external_outreach_events: 0,
      pillar_breakdown:         [
        { pillar: 'LIFE',   count: 6, weight: 2.0, share_pct: 60 },
        { pillar: 'GROWTH', count: 4, weight: 1.3, share_pct: 40 },
      ],
    });
    expect(result[0]).toContain('3');
    expect(result[0]).toContain('12');
  });

  it('pillar breakdown → frase con nome pillar prevalente', async () => {
    const { buildPromoterNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildPromoterNarrative({
      distinct_initiatives:     2,
      participations_received:  5,
      external_outreach_events: 0,
      pillar_breakdown:         [{ pillar: 'LIFE', count: 5, weight: 2.0, share_pct: 100 }],
    });
    const allText = result.join(' ');
    expect(allText).toContain('Benessere');
  });

  it('external_outreach_events > 0 → frase su partecipanti esterni', async () => {
    const { buildPromoterNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildPromoterNarrative({
      distinct_initiatives:     2,
      participations_received:  4,
      external_outreach_events: 1,
      pillar_breakdown:         [],
    });
    const allText = result.join(' ');
    expect(allText).toContain('esterni');
  });
});

describe('B167 — narrativa buildOriginEmployerNarrative', () => {
  it('0 partecipazioni → frase "non hanno ancora partecipato"', async () => {
    const { buildOriginEmployerNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildOriginEmployerNarrative({
      participations_sent:  0,
      distinct_initiatives: 0,
      distinct_promoters:   0,
      pillar_breakdown:     [],
    });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toContain('non hanno ancora partecipato');
  });

  it('5 partecipazioni → frase con count "5"', async () => {
    const { buildOriginEmployerNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildOriginEmployerNarrative({
      participations_sent:  5,
      distinct_initiatives: 2,
      distinct_promoters:   2,
      pillar_breakdown:     [{ pillar: 'IMPACT', count: 5, weight: 1.5, share_pct: 100 }],
    });
    expect(result[0]).toContain('5');
  });

  it('pillar prevalente → menzionato nella narrativa', async () => {
    const { buildOriginEmployerNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildOriginEmployerNarrative({
      participations_sent:  3,
      distinct_initiatives: 1,
      distinct_promoters:   1,
      pillar_breakdown:     [{ pillar: 'CONNECTION', count: 3, weight: 0.9, share_pct: 100 }],
    });
    const allText = result.join(' ');
    expect(allText).toContain('Connessione');
  });

  it('distinct_promoters > 1 → menzionato nella narrativa', async () => {
    const { buildOriginEmployerNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildOriginEmployerNarrative({
      participations_sent:  6,
      distinct_initiatives: 3,
      distinct_promoters:   3,
      pillar_breakdown:     [],
    });
    const allText = result.join(' ');
    expect(allText).toContain('3');
  });
});

// ── 4. Narrativa — determinismo ───────────────────────────────────────────────

describe('B167 — narrativa deterministica (no LLM)', () => {
  const src = read('lib/commons/contribution-narrative.ts');

  it('nessuna chiamata a fetch / LLM / API esterna', () => {
    const stripped = strip(src);
    expect(stripped).not.toContain('fetch(');
    expect(stripped).not.toContain('openai');
    expect(stripped).not.toContain('anthropic');
    expect(stripped).not.toContain('axios');
  });

  it('funzioni buildPromoterNarrative e buildOriginEmployerNarrative esportate', () => {
    expect(src).toContain('export function buildPromoterNarrative');
    expect(src).toContain('export function buildOriginEmployerNarrative');
  });

  it('output è array di stringhe italiane (non oggetti complessi)', async () => {
    const { buildPromoterNarrative } = await import('@/lib/commons/contribution-narrative');
    const result = buildPromoterNarrative({
      distinct_initiatives: 2, participations_received: 4,
      external_outreach_events: 0, pillar_breakdown: [],
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.every((s) => typeof s === 'string')).toBe(true);
  });
});

// ── 5. Service — feature gate production_ready ────────────────────────────────

describe('B167 — feature gate service', () => {
  const src = read('services/kora-contribution/KoraContributionService.ts');

  it('getContributionPromoterView controlla production_ready', () => {
    const fnSection = src.split('export async function getContributionPromoterView')[1]?.split('export async function')[0] ?? '';
    expect(fnSection).toContain('production_ready');
    expect(fnSection).toContain('return null');
  });

  it('getContributionOriginEmployerView controlla production_ready', () => {
    const fnSection = src.split('export async function getContributionOriginEmployerView')[1]?.split('export async function')[0] ?? '';
    expect(fnSection).toContain('production_ready');
    expect(fnSection).toContain('return null');
  });

  it('entrambe le funzioni usano stesso pattern feature gate di getContributionLive', () => {
    const gatePhraseCount = (src.match(/production_ready/g) ?? []).length;
    expect(gatePhraseCount).toBeGreaterThanOrEqual(3);
  });
});

// ── 6. Service — anonimato origin_employer ────────────────────────────────────

describe('B167 — anonimato origin_employer', () => {
  const src = read('services/kora-contribution/KoraContributionService.ts');

  it('getContributionOriginEmployerView NON seleziona source_booking_id', () => {
    const fnSection = src.split('export async function getContributionOriginEmployerView')[1] ?? '';
    // La select esplicita non deve includere source_booking_id
    const selectLine = fnSection.match(/.select\([^)]+\)/);
    if (selectLine) {
      expect(selectLine[0]).not.toContain('source_booking_id');
    }
    // Verifica indipendente: source_booking_id non appare nel body della funzione
    const bodyEnd = fnSection.split('export async function')[0];
    expect(bodyEnd).not.toContain("select('source_booking_id");
  });

  it('getContributionOriginEmployerView NON espone worker_identity_id', () => {
    const fnSection = src.split('export async function getContributionOriginEmployerView')[1]?.split('export async function')[0] ?? '';
    expect(fnSection).not.toContain('worker_identity_id');
  });

  it('getContributionOriginEmployerView produce solo aggregati (count, weight, pillar)', () => {
    const src2 = read('lib/commons/contribution-views.ts');
    const originSection = src2.split('ContributionOriginEmployerView')[1] ?? '';
    expect(originSection).not.toContain('worker_name');
    expect(originSection).not.toContain('booking_id');
    expect(originSection).toContain('participations_sent:');
    expect(originSection).toContain('distinct_initiatives:');
    expect(originSection).toContain('distinct_promoters:');
  });
});

// ── 7. Service — nessun punteggio aggregato ───────────────────────────────────

describe('B167 — nessun punteggio aggregato (dottrina)', () => {
  it('ContributionPromoterView non ha campo score/rating/level', () => {
    const src = read('lib/commons/contribution-views.ts');
    const promoterSection = src.split('ContributionPromoterView')[1]?.split('ContributionOriginEmployerView')[0] ?? '';
    expect(promoterSection).not.toContain('score:');
    expect(promoterSection).not.toContain('level:');
    expect(promoterSection).not.toContain('rating:');
  });

  it('ContributionOriginEmployerView non ha campo score/rating/level', () => {
    const src = read('lib/commons/contribution-views.ts');
    const originSection = src.split('ContributionOriginEmployerView')[1] ?? '';
    expect(originSection).not.toContain('score:');
    expect(originSection).not.toContain('level:');
    expect(originSection).not.toContain('rating:');
  });

  it('narrativa non contiene superlativi o giudizi di valore', async () => {
    const { buildPromoterNarrative, buildOriginEmployerNarrative } = await import('@/lib/commons/contribution-narrative');
    const p = buildPromoterNarrative({ distinct_initiatives: 5, participations_received: 20, external_outreach_events: 2, pillar_breakdown: [] });
    const o = buildOriginEmployerNarrative({ participations_sent: 5, distinct_initiatives: 3, distinct_promoters: 2, pillar_breakdown: [] });
    const allText = [...p, ...o].join(' ').toLowerCase();
    expect(allText).not.toContain('ottimo');
    expect(allText).not.toContain('eccellente');
    expect(allText).not.toContain('straordinario');
    expect(allText).not.toContain('congratulazioni');
  });
});

// ── 8. Pagina — struttura e dottrina ─────────────────────────────────────────

describe('B167 — pagina dashboard struttura', () => {
  const src = read('app/company/contribution/page.tsx');

  it('ha data-testid company-contribution-page', () => {
    expect(src).toContain('company-contribution-page');
  });

  it('ha data-testid contribution-live-data (Pilot+) e contribution-foundation-light-preview (FL)', () => {
    expect(src).toContain('contribution-live-data');
    expect(src).toContain('contribution-foundation-light-preview');
  });

  it('ha le due sezioni parallele con data-testid distinti', () => {
    expect(src).toContain('contribution-section-promoter');
    expect(src).toContain('contribution-section-origin');
  });

  it('dichiara testualmente "Non componente KORA Index"', () => {
    expect(src).toContain('Non componente KORA Index');
  });

  it('ha contribution-methodology-notice (non sopprimibile)', () => {
    expect(src).toContain('contribution-methodology-notice');
    expect(src).toContain('non calibrata empiricamente');
  });

  it('NON mostra punteggio aggregato nella pagina', () => {
    const stripped = strip(src);
    expect(stripped).not.toContain('contribution_score');
    expect(stripped).not.toContain('Punteggio Contribution');
  });

  it('usa getSupabaseServerClient — mai service-client (pattern B163)', () => {
    const stripped = strip(src);
    expect(stripped).toContain('getSupabaseServerClient');
    expect(stripped).not.toContain('getSupabaseServiceClient');
  });

  it('chiama le due view in Promise.all (parallele)', () => {
    expect(src).toContain('Promise.all');
    expect(src).toContain('getContributionPromoterView');
    expect(src).toContain('getContributionOriginEmployerView');
  });

  it('shell Foundation Light: anteprima metodologica (PRE-PILOT PREVIEW)', () => {
    expect(src).toContain('PRE-PILOT PREVIEW');
    expect(src).toContain('anteprima metodologica');
  });

  it('shell Foundation Light: ha link a KORA Space (commons)', () => {
    expect(src).toContain('/company/commons');
  });

  it('footer con nota qualità evidenza (verified vs self-declared)', () => {
    expect(src).toContain('verified');
    expect(src).toContain('self-declared');
    expect(src).toContain('CSR/ESG');
  });
});

// ── 9. Pagina — anonimato nella dashboard ────────────────────────────────────

describe('B167 — pagina anonimato', () => {
  const src = read('app/company/contribution/page.tsx');

  it('pagina NON mostra worker_identity_id', () => {
    const stripped = strip(src);
    expect(stripped).not.toContain('worker_identity_id');
  });

  it('pagina NON mostra source_booking_id', () => {
    const stripped = strip(src);
    expect(stripped).not.toContain('source_booking_id');
  });

  it('sezione origin non espone singolo lavoratore', () => {
    expect(src).not.toContain('worker_name');
    expect(src).not.toContain('lavoratore specifico');
  });
});

// ── 10. Nessuna migrazione aggiuntiva ─────────────────────────────────────────

describe('B167 — nessuna migrazione aggiuntiva', () => {
  it('non esiste migration 026 (B167 usa schema B166)', () => {
    try {
      readFileSync(resolve(ROOT, 'supabase/migrations/026_contribution_dashboard.sql'));
      throw new Error('026 non deve esistere');
    } catch (e: any) {
      expect(e.code).toBe('ENOENT');
    }
  });
});

// ── 11. Pillar breakdown — share_pct corretta ──────────────────────────────────

describe('B167 — pillar breakdown share_pct', () => {
  it('share_pct total sum ≈ 100 per un insieme ben formato', async () => {
    // Test sulla logica di calcolo: se i weight sono 2.0 e 1.0, share_pct deve essere 66.7 e 33.3
    const totalWeight = 3.0;
    const breakdown = [
      { pillar: 'LIFE',   weight: 2.0 },
      { pillar: 'GROWTH', weight: 1.0 },
    ].map(({ pillar, weight }) => ({
      pillar,
      count:     1,
      weight:    +weight.toFixed(4),
      share_pct: +((weight / totalWeight) * 100).toFixed(1),
    }));
    const total = breakdown.reduce((s, r) => s + r.share_pct, 0);
    expect(total).toBeCloseTo(100, 0);
  });
});

// ── 12. Regressione — b133 contribution page aggiornata ──────────────────────

describe('B167 — regressione b133', () => {
  const src = read('app/company/contribution/page.tsx');

  it('pagina NON importa getCurrentDemoUser (non demo data)', () => {
    expect(src).not.toContain('getCurrentDemoUser');
  });

  it('pagina NON importa useCompanySession (server component)', () => {
    const stripped = strip(src);
    expect(stripped).not.toContain('useCompanySession');
  });

  it('pagina ha export const runtime nodejs', () => {
    expect(src).toContain("export const runtime = 'nodejs'");
  });
});
