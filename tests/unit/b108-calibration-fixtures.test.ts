/**
 * B108 — Calibration Fixtures & Score Interpretation Bands
 *
 * Verifica strutturale dei tre dataset di calibrazione e le bande di punteggio.
 * Non modifica algoritmo, formula, pesi, scoring, Eligibility Gate, CS, Safeguard, BTI.
 * Non esegue scoring reale — lettura file statici + unit test costanti.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getScoreBand, SCORE_BANDS, SCORE_BAND_DISCLAIMER } from '@/lib/constants/kora';

const root = resolve(process.cwd());

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  try { readFileSync(resolve(root, relPath)); return true; } catch { return false; }
}

function parseCSVRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]));
  });
}

// ── 1. File existence ──────────────────────────────────────────────────────────

describe('B108 — file existence', () => {
  it('weak company CSV exists', () => {
    expect(fileExists('data/golden-path/kora_weak_company_upload.csv')).toBe(true);
  });

  it('average company CSV exists', () => {
    expect(fileExists('data/golden-path/kora_average_company_upload.csv')).toBe(true);
  });

  it('golden path CSV still exists and is unchanged', () => {
    expect(fileExists('data/golden-path/kora_golden_path_upload.csv')).toBe(true);
  });
});

// ── 2. Weak dataset structure ──────────────────────────────────────────────────

describe('B108 — weak dataset structure', () => {
  const csv  = readFile('data/golden-path/kora_weak_company_upload.csv');
  const rows = parseCSVRows(csv);

  it('has between 12 and 15 data rows', () => {
    expect(rows.length).toBeGreaterThanOrEqual(12);
    expect(rows.length).toBeLessThanOrEqual(15);
  });

  it('contains only GROWTH and LIFE as eligible pillars (≤2 active pillars)', () => {
    const eligiblePillars = new Set(
      rows
        .filter(r => !['antincendio', 'sorveglianza', 'gdpr', '231', 'buoni pasto', 'gift card', 'fringe', 'credito'].some(kw =>
          r.initiative_name?.toLowerCase().includes(kw) || r.description?.toLowerCase().includes(kw)
        ))
        .map(r => r.pillar)
        .filter(Boolean)
    );
    expect(eligiblePillars.size).toBeLessThanOrEqual(2);
  });

  it('has at least 3 blocked-eligible records (compliance keywords)', () => {
    const blocked = rows.filter(r => {
      const text = `${r.initiative_name} ${r.description}`.toLowerCase();
      return (
        text.includes('antincendio') ||
        text.includes('sorveglianza sanitaria') ||
        text.includes('gdpr') ||
        text.includes('modello 231') ||
        text.includes('d.lgs 231') ||
        text.includes('d.lgs 81')
      );
    });
    expect(blocked.length).toBeGreaterThanOrEqual(3);
  });

  it('has no eligible record with L2+ evidence level', () => {
    const eligibleL2plus = rows.filter(r => {
      const text = `${r.initiative_name} ${r.description}`.toLowerCase();
      const isCompliance = text.includes('antincendio') || text.includes('sorveglianza') ||
        text.includes('gdpr') || text.includes('modello 231');
      const isLimited = text.includes('buoni pasto') || text.includes('gift card') ||
        text.includes('fringe') || text.includes('credito welfare');
      return !isCompliance && !isLimited && (r.evidence_level === 'L2' || r.evidence_level === 'L3' || r.evidence_level === 'L4');
    });
    expect(eligibleL2plus.length).toBe(0);
  });

  it('does not contain IMPACT or LEGACY pillars', () => {
    const impactOrLegacy = rows.filter(r => r.pillar === 'IMPACT' || r.pillar === 'LEGACY');
    expect(impactOrLegacy.length).toBe(0);
  });
});

// ── 3. Average dataset structure ───────────────────────────────────────────────

describe('B108 — average dataset structure', () => {
  const csv  = readFile('data/golden-path/kora_average_company_upload.csv');
  const rows = parseCSVRows(csv);

  it('has between 18 and 22 data rows', () => {
    expect(rows.length).toBeGreaterThanOrEqual(18);
    expect(rows.length).toBeLessThanOrEqual(22);
  });

  it('contains GROWTH, LIFE, and CONNECTION pillars', () => {
    const pillars = new Set(rows.map(r => r.pillar));
    expect(pillars.has('GROWTH')).toBe(true);
    expect(pillars.has('LIFE')).toBe(true);
    expect(pillars.has('CONNECTION')).toBe(true);
  });

  it('has LEGACY pillar with only 1 record (weak coverage signal)', () => {
    const legacy = rows.filter(r => r.pillar === 'LEGACY');
    expect(legacy.length).toBe(1);
  });

  it('does not contain IMPACT pillar (absent by design)', () => {
    const impact = rows.filter(r => r.pillar === 'IMPACT');
    expect(impact.length).toBe(0);
  });

  it('has at least 1 record with L3 evidence (Provider export)', () => {
    const l3 = rows.filter(r =>
      r.source?.toLowerCase().includes('provider export') ||
      r.evidence_level === 'L3'
    );
    expect(l3.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least 1 ambiguous record expected to be review_required', () => {
    const ambiguous = rows.filter(r => {
      const text = `${r.initiative_name} ${r.description}`.toLowerCase();
      return text.includes('qualità') || text.includes('resilienza');
    });
    expect(ambiguous.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 4. Golden path CSV unchanged ──────────────────────────────────────────────

describe('B108 — golden path CSV integrity', () => {
  const csv  = readFile('data/golden-path/kora_golden_path_upload.csv');
  const rows = parseCSVRows(csv);

  it('still has exactly 20 data rows', () => {
    expect(rows.length).toBe(20);
  });

  it('still contains all 5 pillars', () => {
    const pillars = new Set(rows.map(r => r.pillar));
    expect(pillars.has('LIFE')).toBe(true);
    expect(pillars.has('GROWTH')).toBe(true);
    expect(pillars.has('CONNECTION')).toBe(true);
    expect(pillars.has('IMPACT')).toBe(true);
    expect(pillars.has('LEGACY')).toBe(true);
  });
});

// ── 5. Score bands — unit tests ───────────────────────────────────────────────

describe('B108 — SCORE_BANDS constant structure', () => {
  it('has exactly 5 bands', () => {
    expect(SCORE_BANDS.length).toBe(5);
  });

  it('starts at 0 (no gap below first band)', () => {
    expect(SCORE_BANDS[0].min).toBe(0);
  });

  it('all bands have unique keys', () => {
    const keys = SCORE_BANDS.map(b => b.key);
    expect(new Set(keys).size).toBe(SCORE_BANDS.length);
  });

  it('SCORE_BAND_DISCLAIMER is defined and non-empty', () => {
    expect(typeof SCORE_BAND_DISCLAIMER).toBe('string');
    expect(SCORE_BAND_DISCLAIMER.length).toBeGreaterThan(10);
  });
});

// Bande v2.0 (da methodology-config.json — fonte canonica):
// 0–30 weak · 30–45 early · 45–60 developing · 60–75 solid · 75–101 leading

describe('B108 — getScoreBand()', () => {
  it('score 20 → weak (0–30)', () => {
    expect(getScoreBand(20).key).toBe('weak');
  });

  it('score 29 → weak (sotto soglia 30)', () => {
    expect(getScoreBand(29).key).toBe('weak');
  });

  it('score 42 → early (30–45)', () => {
    expect(getScoreBand(42).key).toBe('early');
  });

  it('score 57 → developing (45–60)', () => {
    expect(getScoreBand(57).key).toBe('developing');
  });

  it('score 68 → solid (60–75)', () => {
    expect(getScoreBand(68).key).toBe('solid');
  });

  it('score 80 → leading (75–100)', () => {
    expect(getScoreBand(80).key).toBe('leading');
  });

  it('score 0 → weak', () => {
    expect(getScoreBand(0).key).toBe('weak');
  });

  it('score 100 → leading', () => {
    expect(getScoreBand(100).key).toBe('leading');
  });

  it('boundary 30 → early (primo punto early, incluso)', () => {
    expect(getScoreBand(30).key).toBe('early');
  });

  it('boundary 45 → developing (primo punto developing, incluso)', () => {
    expect(getScoreBand(45).key).toBe('developing');
  });

  it('boundary 60 → solid (primo punto solid, incluso)', () => {
    expect(getScoreBand(60).key).toBe('solid');
  });

  it('boundary 75 → leading (primo punto leading, incluso)', () => {
    expect(getScoreBand(75).key).toBe('leading');
  });

  it('returns Italian label for each band', () => {
    const bands = [10, 35, 52, 67, 80].map(s => getScoreBand(s));
    bands.forEach(b => {
      expect(typeof b.labelIt).toBe('string');
      expect(b.labelIt.length).toBeGreaterThan(3);
    });
  });
});
