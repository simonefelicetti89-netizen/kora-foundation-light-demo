// tests/unit/b93b-company-submission-wizard.test.ts
// B93-B — Company Submission Wizard & Template Library
// Tests: template config, template files structure, type guidance, privacy warning,
//        timeline steps, wizard step labels, clarification panel surface.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  SUBMISSION_TEMPLATES,
  SUBMISSION_TYPE_GUIDANCE,
  UPLOAD_PRIVACY_WARNING,
  SUBMISSION_TIMELINE_STEPS,
  SUBMISSION_STATUS_META,
  getTemplatesBySubmissionType,
  getTemplateById,
} from '../../lib/company-submissions/templates';

const TEMPLATES_DIR = join(process.cwd(), 'public', 'templates');

// ── TEMPLATE FILES ────────────────────────────────────────────────────────────

describe('template files — public/templates/', () => {
  const REQUIRED_FILES = [
    'iniziative.csv',
    'formazione.csv',
    'volontariato.csv',
    'mentoring.csv',
    'budget.csv',
    'evidenze.csv',
  ];

  it('all 6 required template files exist', () => {
    REQUIRED_FILES.forEach((file) => {
      const path = join(TEMPLATES_DIR, file);
      expect(existsSync(path), `${file} should exist`).toBe(true);
    });
  });

  it('each template file has a header row', () => {
    REQUIRED_FILES.forEach((file) => {
      const content = readFileSync(join(TEMPLATES_DIR, file), 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      expect(lines.length, `${file} should have at least 1 line`).toBeGreaterThan(0);
      const header = lines[0];
      expect(header.length, `${file} header should not be empty`).toBeGreaterThan(0);
    });
  });

  it('each template file has at least 1 example row beyond the header', () => {
    REQUIRED_FILES.forEach((file) => {
      const content = readFileSync(join(TEMPLATES_DIR, file), 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      expect(lines.length, `${file} should have header + at least 1 data row`).toBeGreaterThanOrEqual(2);
    });
  });

  it('template files do not contain obvious PII patterns', () => {
    REQUIRED_FILES.forEach((file) => {
      const content = readFileSync(join(TEMPLATES_DIR, file), 'utf-8').toLowerCase();
      // Should not contain email addresses
      expect(content).not.toMatch(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/);
      // Should not contain codice fiscale pattern (16 alphanumeric chars)
      expect(content).not.toMatch(/\b[a-z]{6}\d{2}[a-z]\d{2}[a-z]\d{3}[a-z]\b/i);
    });
  });

  it('iniziative.csv has expected Italian columns', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'iniziative.csv'), 'utf-8');
    const header = content.split('\n')[0].toLowerCase();
    expect(header).toContain('nome_iniziativa');
    expect(header).toContain('tipologia');
    expect(header).toContain('partecipanti');
  });

  it('formazione.csv has training-relevant columns', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'formazione.csv'), 'utf-8');
    const header = content.split('\n')[0].toLowerCase();
    expect(header).toContain('corso');
  });

  it('budget.csv has budget-relevant columns', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'budget.csv'), 'utf-8');
    const header = content.split('\n')[0].toLowerCase();
    expect(header).toContain('importo');
  });

  it('evidenze.csv has evidence-relevant columns', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'evidenze.csv'), 'utf-8');
    const header = content.split('\n')[0].toLowerCase();
    expect(header).toContain('tipo_evidenza');
  });

  it('mentoring.csv uses pseudonym IDs, not names', () => {
    const content = readFileSync(join(TEMPLATES_DIR, 'mentoring.csv'), 'utf-8');
    const header = content.split('\n')[0].toLowerCase();
    expect(header).toContain('pseudonym');
  });
});

// ── TEMPLATE CONFIG ───────────────────────────────────────────────────────────

describe('SUBMISSION_TEMPLATES config', () => {
  it('has exactly 6 templates', () => {
    expect(SUBMISSION_TEMPLATES).toHaveLength(6);
  });

  const EXPECTED_IDS = ['iniziative', 'formazione', 'volontariato', 'mentoring', 'budget', 'evidenze'];

  it('has all expected template IDs', () => {
    const ids = SUBMISSION_TEMPLATES.map((t) => t.id);
    EXPECTED_IDS.forEach((id) => {
      expect(ids).toContain(id);
    });
  });

  it('each template has all required fields', () => {
    SUBMISSION_TEMPLATES.forEach((tmpl) => {
      expect(tmpl.id, `${tmpl.id} must have id`).toBeTruthy();
      expect(tmpl.title, `${tmpl.id} must have title`).toBeTruthy();
      expect(tmpl.description, `${tmpl.id} must have description`).toBeTruthy();
      expect(tmpl.fileName, `${tmpl.id} must have fileName`).toBeTruthy();
      expect(tmpl.submissionType, `${tmpl.id} must have submissionType`).toBeTruthy();
      expect(tmpl.recommendedFor, `${tmpl.id} must have recommendedFor`).toBeTruthy();
      expect(tmpl.pillarHint, `${tmpl.id} must have pillarHint`).toBeTruthy();
      expect(tmpl.allowedDataNote, `${tmpl.id} must have allowedDataNote`).toBeTruthy();
      expect(tmpl.forbiddenFieldsNotice, `${tmpl.id} must have forbiddenFieldsNotice`).toBeTruthy();
      expect(tmpl.whatKoraDoesNext, `${tmpl.id} must have whatKoraDoesNext`).toBeTruthy();
    });
  });

  it('all fileName values are CSV', () => {
    SUBMISSION_TEMPLATES.forEach((tmpl) => {
      expect(tmpl.fileName).toMatch(/\.csv$/);
    });
  });

  it('template IDs are unique', () => {
    const ids = SUBMISSION_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fileNames are unique', () => {
    const files = SUBMISSION_TEMPLATES.map((t) => t.fileName);
    expect(new Set(files).size).toBe(files.length);
  });

  it('forbiddenFieldsNotice always mentions forbidden data', () => {
    SUBMISSION_TEMPLATES.forEach((tmpl) => {
      const notice = tmpl.forbiddenFieldsNotice.toLowerCase();
      // Must warn about at least one forbidden category
      const hasForbiddenWarning =
        notice.includes('individu') ||
        notice.includes('nominat') ||
        notice.includes('email') ||
        notice.includes('salari') ||
        notice.includes('sanitari') ||
        notice.includes('pib') ||
        notice.includes('fiscale');
      expect(hasForbiddenWarning, `${tmpl.id} forbidden notice must reference restricted data`).toBe(true);
    });
  });

  it('budget template does not mention individual salaries in allowedDataNote', () => {
    const budget = SUBMISSION_TEMPLATES.find((t) => t.id === 'budget');
    expect(budget?.allowedDataNote.toLowerCase()).not.toContain('salario individuale');
  });

  it('evidenze template references EV and Confidence Score', () => {
    const evidenze = SUBMISSION_TEMPLATES.find((t) => t.id === 'evidenze');
    expect(evidenze?.whatKoraDoesNext).toContain('EV');
    expect(evidenze?.whatKoraDoesNext).toContain('Confidence Score');
  });

  it('mentoring template references LEGACY pillar', () => {
    const mentoring = SUBMISSION_TEMPLATES.find((t) => t.id === 'mentoring');
    expect(mentoring?.pillarHint).toContain('LEGACY');
  });
});

// ── TEMPLATE LOOKUP FUNCTIONS ─────────────────────────────────────────────────

describe('getTemplateById', () => {
  it('returns template when id exists', () => {
    const tmpl = getTemplateById('iniziative');
    expect(tmpl?.id).toBe('iniziative');
  });

  it('returns undefined for unknown id', () => {
    expect(getTemplateById('unknown-xyz')).toBeUndefined();
  });
});

describe('getTemplatesBySubmissionType', () => {
  it('returns templates for known type', () => {
    const tmpls = getTemplatesBySubmissionType('initiatives');
    expect(tmpls.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown type', () => {
    const tmpls = getTemplatesBySubmissionType('nonexistent-type-999');
    expect(tmpls).toHaveLength(0);
  });

  it('budget type returns budget template', () => {
    const tmpls = getTemplatesBySubmissionType('budget');
    expect(tmpls.some((t) => t.id === 'budget')).toBe(true);
  });

  it('evidence type returns evidenze template', () => {
    const tmpls = getTemplatesBySubmissionType('evidence');
    expect(tmpls.some((t) => t.id === 'evidenze')).toBe(true);
  });

  it('lms type returns formazione template', () => {
    const tmpls = getTemplatesBySubmissionType('lms');
    expect(tmpls.some((t) => t.id === 'formazione')).toBe(true);
  });
});

// ── TYPE GUIDANCE ─────────────────────────────────────────────────────────────

describe('SUBMISSION_TYPE_GUIDANCE', () => {
  const REQUIRED_TYPES = ['initiatives', 'budget', 'participation', 'evidence', 'lms', 'provider', 'policy', 'mixed', 'other'];

  it('has guidance for all required submission types', () => {
    REQUIRED_TYPES.forEach((type) => {
      expect(SUBMISSION_TYPE_GUIDANCE[type], `guidance missing for type: ${type}`).toBeDefined();
    });
  });

  it('each guidance entry has label, allowedSummary, forbiddenSummary, whatKoraDoesNext', () => {
    REQUIRED_TYPES.forEach((type) => {
      const g = SUBMISSION_TYPE_GUIDANCE[type];
      expect(g.label).toBeTruthy();
      expect(g.allowedSummary).toBeTruthy();
      expect(g.forbiddenSummary).toBeTruthy();
      expect(g.whatKoraDoesNext).toBeTruthy();
    });
  });

  it('initiatives guidance recommends KORA Admin classification', () => {
    const g = SUBMISSION_TYPE_GUIDANCE['initiatives'];
    expect(g.whatKoraDoesNext.toLowerCase()).toContain('admin');
  });

  it('budget guidance forbids individual salaries', () => {
    const g = SUBMISSION_TYPE_GUIDANCE['budget'];
    expect(g.forbiddenSummary.toLowerCase()).toContain('salari');
  });

  it('evidence guidance mentions Confidence Score or EV', () => {
    const g = SUBMISSION_TYPE_GUIDANCE['evidence'];
    const combined = `${g.whatKoraDoesNext} ${g.allowedSummary}`;
    expect(combined).toMatch(/EV|Confidence Score/);
  });

  it('all forbiddenSummary values contain explicit forbidden data warning', () => {
    REQUIRED_TYPES.forEach((type) => {
      const g = SUBMISSION_TYPE_GUIDANCE[type];
      const lower = g.forbiddenSummary.toLowerCase();
      const hasForbidden =
        lower.includes('non include') ||
        lower.includes('individu') ||
        lower.includes('nominat') ||
        lower.includes('email') ||
        lower.includes('salari') ||
        lower.includes('sanitari') ||
        lower.includes('pib') ||
        lower.includes('personali');
      expect(hasForbidden, `type ${type} forbiddenSummary must warn about restricted data`).toBe(true);
    });
  });
});

// ── UPLOAD PRIVACY WARNING ────────────────────────────────────────────────────

describe('UPLOAD_PRIVACY_WARNING', () => {
  it('is a non-empty string', () => {
    expect(UPLOAD_PRIVACY_WARNING).toBeTruthy();
    expect(typeof UPLOAD_PRIVACY_WARNING).toBe('string');
  });

  it('warns about health data (sanitari)', () => {
    expect(UPLOAD_PRIVACY_WARNING.toLowerCase()).toContain('sanitari');
  });

  it('warns about performance individuali', () => {
    expect(UPLOAD_PRIVACY_WARNING.toLowerCase()).toContain('performance');
  });

  it('warns about salari', () => {
    expect(UPLOAD_PRIVACY_WARNING.toLowerCase()).toContain('salari');
  });

  it('warns about PIB', () => {
    expect(UPLOAD_PRIVACY_WARNING).toContain('PIB');
  });

  it('warns about IU', () => {
    expect(UPLOAD_PRIVACY_WARNING).toContain('IU');
  });

  it('warns about consensi', () => {
    expect(UPLOAD_PRIVACY_WARNING.toLowerCase()).toContain('consensi');
  });

  it('warns about activities private to workers', () => {
    expect(UPLOAD_PRIVACY_WARNING.toLowerCase()).toContain('lavoratori');
  });
});

// ── SUBMISSION TIMELINE ───────────────────────────────────────────────────────

describe('SUBMISSION_TIMELINE_STEPS', () => {
  it('has exactly 4 steps', () => {
    expect(SUBMISSION_TIMELINE_STEPS).toHaveLength(4);
  });

  it('first step is draft', () => {
    expect(SUBMISSION_TIMELINE_STEPS[0].key).toBe('draft');
  });

  it('last step is outcome', () => {
    expect(SUBMISSION_TIMELINE_STEPS[3].key).toBe('outcome');
  });

  it('all steps have key, label, statuses', () => {
    SUBMISSION_TIMELINE_STEPS.forEach((step) => {
      expect(step.key).toBeTruthy();
      expect(step.label).toBeTruthy();
      expect(step.statuses).toBeDefined();
      expect(step.statuses.length).toBeGreaterThan(0);
    });
  });

  it('step keys are unique', () => {
    const keys = SUBMISSION_TIMELINE_STEPS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('draft step includes submission_draft status', () => {
    const draft = SUBMISSION_TIMELINE_STEPS.find((s) => s.key === 'draft');
    expect((draft?.statuses as readonly string[]).includes('submission_draft')).toBe(true);
  });

  it('outcome step includes submission_accepted', () => {
    const outcome = SUBMISSION_TIMELINE_STEPS.find((s) => s.key === 'outcome');
    expect((outcome?.statuses as readonly string[]).includes('submission_accepted')).toBe(true);
  });

  it('outcome step includes submission_rejected', () => {
    const outcome = SUBMISSION_TIMELINE_STEPS.find((s) => s.key === 'outcome');
    expect((outcome?.statuses as readonly string[]).includes('submission_rejected')).toBe(true);
  });

  it('submitted step includes submission_pending', () => {
    const submitted = SUBMISSION_TIMELINE_STEPS.find((s) => s.key === 'submitted');
    expect((submitted?.statuses as readonly string[]).includes('submission_pending')).toBe(true);
  });

  it('submitted step includes needs_clarification', () => {
    const submitted = SUBMISSION_TIMELINE_STEPS.find((s) => s.key === 'submitted');
    expect((submitted?.statuses as readonly string[]).includes('submission_needs_clarification')).toBe(true);
  });
});

// ── SUBMISSION STATUS META ────────────────────────────────────────────────────

describe('SUBMISSION_STATUS_META', () => {
  const EXPECTED_STATUSES = [
    'submission_draft',
    'submission_pending',
    'submission_needs_clarification',
    'submission_accepted',
    'submission_rejected',
    'submission_archived',
  ];

  it('has metadata for all expected statuses', () => {
    EXPECTED_STATUSES.forEach((s) => {
      expect(SUBMISSION_STATUS_META[s], `missing meta for ${s}`).toBeDefined();
    });
  });

  it('each status has label, step, total', () => {
    EXPECTED_STATUSES.forEach((s) => {
      const meta = SUBMISSION_STATUS_META[s];
      expect(meta.label).toBeTruthy();
      expect(meta.step).toBeGreaterThanOrEqual(1);
      expect(meta.total).toBeGreaterThan(0);
    });
  });

  it('draft is step 1', () => {
    expect(SUBMISSION_STATUS_META['submission_draft'].step).toBe(1);
  });

  it('accepted is step 3 (after review)', () => {
    expect(SUBMISSION_STATUS_META['submission_accepted'].step).toBe(3);
  });
});

// ── PRIVACY INVARIANTS ────────────────────────────────────────────────────────

describe('privacy invariants in template config', () => {
  it('no template allowedDataNote mentions individual names', () => {
    SUBMISSION_TEMPLATES.forEach((tmpl) => {
      const note = tmpl.allowedDataNote.toLowerCase();
      expect(note).not.toContain('nome individuale');
      expect(note).not.toContain('lista nominat');
    });
  });

  it('no template config references PIB or IU as allowed data', () => {
    SUBMISSION_TEMPLATES.forEach((tmpl) => {
      const allowed = tmpl.allowedDataNote.toLowerCase();
      expect(allowed).not.toContain('pib');
      expect(allowed).not.toContain('impact unit');
    });
  });

  it('every template has at least one forbidden field mentioned in forbiddenFieldsNotice', () => {
    SUBMISSION_TEMPLATES.forEach((tmpl) => {
      expect(tmpl.forbiddenFieldsNotice.length).toBeGreaterThan(20);
    });
  });

  it('whatKoraDoesNext never mentions worker individual score', () => {
    SUBMISSION_TEMPLATES.forEach((tmpl) => {
      const next = tmpl.whatKoraDoesNext.toLowerCase();
      expect(next).not.toContain('pib individuale');
      expect(next).not.toContain('punteggio individuale');
    });
  });
});

// ── WIZARD STEP CONFIG ────────────────────────────────────────────────────────

describe('wizard step config consistency', () => {
  it('SUBMISSION_TYPE_GUIDANCE covers all SUBMISSION_TYPES used in wizard', () => {
    const wizardTypes = ['initiatives','budget','participation','evidence','lms','provider','policy','mixed','other'];
    wizardTypes.forEach((t) => {
      expect(SUBMISSION_TYPE_GUIDANCE[t], `wizard type ${t} needs guidance`).toBeDefined();
    });
  });

  it('all guidance labels are non-empty Italian strings', () => {
    Object.values(SUBMISSION_TYPE_GUIDANCE).forEach((g) => {
      expect(g.label.length).toBeGreaterThan(0);
    });
  });

  it('upload privacy warning is long enough to be meaningful', () => {
    expect(UPLOAD_PRIVACY_WARNING.length).toBeGreaterThan(80);
  });
});
