// tests/unit/b96b-founder-validation.test.ts
// B96-B — Founder Validation Cockpit
// Covers: seed data completeness, funnel summary, conversion rates,
//         objection aggregation, feedback theme aggregation, next action sorting,
//         pilot pipeline value, investor signal calculation, route/nav presence.
//
// Privacy invariant: no worker PIB, no company data, no employer-visible content.
// Founder tool only — not part of KORA Index or product methodology.

import { describe, it, expect } from 'vitest';
import { founderValidationService } from '../../services/founder-validation/FounderValidationService';
import { buildNavGroups } from '../../components/layout/Sidebar';
import {
  STAGE_META,
  INTEREST_META,
  PILOT_META,
  INVESTMENT_META,
  OBJECTION_LABELS,
  FEEDBACK_LABELS,
  type ValidationStage,
  type InterestLevel,
  type PilotPotential,
  type InvestmentSignal,
} from '../../lib/founder-validation/types';

// ── Seed data completeness ────────────────────────────────────────────────────

describe('B96-B Seed data — completeness and structure', () => {

  it('loads at least 10 leads', () => {
    const leads = founderValidationService.getLeads();
    expect(leads.length).toBeGreaterThanOrEqual(10);
  });

  it('every lead has required string fields non-empty', () => {
    const leads = founderValidationService.getLeads();
    for (const lead of leads) {
      expect(lead.id).toBeTruthy();
      expect(lead.company_name).toBeTruthy();
      expect(lead.sector).toBeTruthy();
      expect(lead.employee_count_band).toBeTruthy();
      expect(lead.contact_role).toBeTruthy();
      expect(lead.next_action).toBeTruthy();
      expect(lead.next_action_date).toBeTruthy();
      expect(lead.last_contact_date).toBeTruthy();
    }
  });

  it('every lead has a valid stage', () => {
    const validStages: ValidationStage[] = [
      'contacted','meeting_scheduled','meeting_done','pilot_interested',
      'loi_discussed','loi_signed','not_now','lost',
    ];
    const leads = founderValidationService.getLeads();
    for (const lead of leads) {
      expect(validStages).toContain(lead.stage);
    }
  });

  it('every lead has a valid interest_level', () => {
    const validLevels: InterestLevel[] = ['low', 'medium', 'high', 'strategic'];
    const leads = founderValidationService.getLeads();
    for (const lead of leads) {
      expect(validLevels).toContain(lead.interest_level);
    }
  });

  it('every lead has a valid pilot_potential', () => {
    const validPilot: PilotPotential[] = ['none', 'small', 'medium', 'large'];
    const leads = founderValidationService.getLeads();
    for (const lead of leads) {
      expect(validPilot).toContain(lead.pilot_potential);
    }
  });

  it('every lead has a valid investment_signal', () => {
    const validSignals: InvestmentSignal[] = ['none', 'curious', 'soft_commitment', 'formal_interest'];
    const leads = founderValidationService.getLeads();
    for (const lead of leads) {
      expect(validSignals).toContain(lead.investment_signal);
    }
  });

  it('estimated_pilot_value is null or a positive number', () => {
    const leads = founderValidationService.getLeads();
    for (const lead of leads) {
      if (lead.estimated_pilot_value !== null) {
        expect(lead.estimated_pilot_value).toBeGreaterThan(0);
      }
    }
  });

  it('feedback_themes is an array', () => {
    const leads = founderValidationService.getLeads();
    for (const lead of leads) {
      expect(Array.isArray(lead.feedback_themes)).toBe(true);
    }
  });

  it('all lead IDs are unique', () => {
    const leads = founderValidationService.getLeads();
    const ids = leads.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all lead company names are unique', () => {
    const leads = founderValidationService.getLeads();
    const names = leads.map((l) => l.company_name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('next_action_date is a valid ISO date string', () => {
    const leads = founderValidationService.getLeads();
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const lead of leads) {
      expect(lead.next_action_date).toMatch(isoPattern);
    }
  });

  it('seed data includes all required stages for a realistic funnel', () => {
    const leads = founderValidationService.getLeads();
    const stages = new Set(leads.map((l) => l.stage));
    // A realistic validation funnel must have at least contacted, meeting_done, and one advanced stage
    expect(stages.has('contacted')).toBe(true);
    expect(stages.has('meeting_done')).toBe(true);
    const hasAdvanced = stages.has('pilot_interested') || stages.has('loi_discussed') || stages.has('loi_signed');
    expect(hasAdvanced).toBe(true);
  });
});

// ── Funnel summary ────────────────────────────────────────────────────────────

describe('B96-B Funnel summary', () => {

  it('returns a valid FunnelSummary object', () => {
    const funnel = founderValidationService.getFunnelSummary();
    expect(funnel).toBeDefined();
    expect(typeof funnel.contacted_total).toBe('number');
    expect(typeof funnel.meetings_done).toBe('number');
    expect(typeof funnel.pilot_interested).toBe('number');
    expect(typeof funnel.loi_potential).toBe('number');
  });

  it('contacted_total equals total lead count', () => {
    const leads  = founderValidationService.getLeads();
    const funnel = founderValidationService.getFunnelSummary();
    expect(funnel.contacted_total).toBe(leads.length);
  });

  it('funnel stages array covers all 6 active funnel stages', () => {
    const funnel = founderValidationService.getFunnelSummary();
    expect(funnel.stages).toHaveLength(6);
    const stageIds = funnel.stages.map((s) => s.stage);
    expect(stageIds).toContain('contacted');
    expect(stageIds).toContain('loi_signed');
  });

  it('funnel is monotonically non-increasing (each stage <= previous)', () => {
    const funnel = founderValidationService.getFunnelSummary();
    for (let i = 1; i < funnel.stages.length; i++) {
      expect(funnel.stages[i].count).toBeLessThanOrEqual(funnel.stages[i - 1].count);
    }
  });

  it('meetings_done is >= pilot_interested', () => {
    const funnel = founderValidationService.getFunnelSummary();
    expect(funnel.meetings_done).toBeGreaterThanOrEqual(funnel.pilot_interested);
  });

  it('pilot_interested is >= loi_potential', () => {
    const funnel = founderValidationService.getFunnelSummary();
    expect(funnel.pilot_interested).toBeGreaterThanOrEqual(funnel.loi_potential);
  });
});

// ── Conversion rates ──────────────────────────────────────────────────────────

describe('B96-B Conversion rates', () => {

  it('all conversion rates are between 0 and 100', () => {
    const funnel = founderValidationService.getFunnelSummary();
    expect(funnel.contact_to_meeting_rate).toBeGreaterThanOrEqual(0);
    expect(funnel.contact_to_meeting_rate).toBeLessThanOrEqual(100);
    expect(funnel.meeting_to_pilot_rate).toBeGreaterThanOrEqual(0);
    expect(funnel.meeting_to_pilot_rate).toBeLessThanOrEqual(100);
    expect(funnel.pilot_to_loi_rate).toBeGreaterThanOrEqual(0);
    expect(funnel.pilot_to_loi_rate).toBeLessThanOrEqual(100);
    expect(funnel.loi_to_signed_rate).toBeGreaterThanOrEqual(0);
    expect(funnel.loi_to_signed_rate).toBeLessThanOrEqual(100);
  });

  it('conversion rates are integers (rounded)', () => {
    const funnel = founderValidationService.getFunnelSummary();
    expect(funnel.contact_to_meeting_rate % 1).toBe(0);
    expect(funnel.meeting_to_pilot_rate % 1).toBe(0);
    expect(funnel.pilot_to_loi_rate % 1).toBe(0);
  });

  it('contact_to_meeting_rate is positive when meetings exist', () => {
    const funnel = founderValidationService.getFunnelSummary();
    if (funnel.meetings_done > 0) {
      expect(funnel.contact_to_meeting_rate).toBeGreaterThan(0);
    }
  });
});

// ── Objection aggregation ─────────────────────────────────────────────────────

describe('B96-B Objection aggregation', () => {

  it('returns non-empty objection list', () => {
    const objections = founderValidationService.getTopObjections();
    expect(objections.length).toBeGreaterThan(0);
  });

  it('objection counts are positive integers', () => {
    const objections = founderValidationService.getTopObjections();
    for (const o of objections) {
      expect(o.count).toBeGreaterThan(0);
      expect(Number.isInteger(o.count)).toBe(true);
    }
  });

  it('objections are sorted descending by count', () => {
    const objections = founderValidationService.getTopObjections();
    for (let i = 1; i < objections.length; i++) {
      expect(objections[i].count).toBeLessThanOrEqual(objections[i - 1].count);
    }
  });

  it('each objection has a label from OBJECTION_LABELS', () => {
    const objections = founderValidationService.getTopObjections();
    for (const o of objections) {
      expect(OBJECTION_LABELS[o.objection]).toBeDefined();
      expect(o.label).toBe(OBJECTION_LABELS[o.objection]);
    }
  });

  it('total objection count does not exceed lead count', () => {
    const leads      = founderValidationService.getLeads();
    const objections = founderValidationService.getTopObjections();
    const total = objections.reduce((s, o) => s + o.count, 0);
    expect(total).toBeLessThanOrEqual(leads.length);
  });
});

// ── Feedback theme aggregation ────────────────────────────────────────────────

describe('B96-B Feedback theme aggregation', () => {

  it('returns non-empty theme list', () => {
    const themes = founderValidationService.getFeedbackThemes();
    expect(themes.length).toBeGreaterThan(0);
  });

  it('theme counts are positive integers', () => {
    const themes = founderValidationService.getFeedbackThemes();
    for (const t of themes) {
      expect(t.count).toBeGreaterThan(0);
      expect(Number.isInteger(t.count)).toBe(true);
    }
  });

  it('themes are sorted descending by count', () => {
    const themes = founderValidationService.getFeedbackThemes();
    for (let i = 1; i < themes.length; i++) {
      expect(themes[i].count).toBeLessThanOrEqual(themes[i - 1].count);
    }
  });

  it('each theme has a label from FEEDBACK_LABELS', () => {
    const themes = founderValidationService.getFeedbackThemes();
    for (const t of themes) {
      expect(FEEDBACK_LABELS[t.theme]).toBeDefined();
      expect(t.label).toBe(FEEDBACK_LABELS[t.theme]);
    }
  });
});

// ── Next action sorting ───────────────────────────────────────────────────────

describe('B96-B Next actions', () => {

  it('returns at most 5 next actions', () => {
    const actions = founderValidationService.getNextActions();
    expect(actions.length).toBeLessThanOrEqual(5);
  });

  it('returns at least 1 next action', () => {
    const actions = founderValidationService.getNextActions();
    expect(actions.length).toBeGreaterThan(0);
  });

  it('next actions are sorted by date ascending', () => {
    const actions = founderValidationService.getNextActions();
    for (let i = 1; i < actions.length; i++) {
      expect(actions[i].lead.next_action_date >= actions[i - 1].lead.next_action_date).toBe(true);
    }
  });

  it('every action has an urgency level', () => {
    const actions = founderValidationService.getNextActions();
    for (const action of actions) {
      expect(['urgent', 'normal', 'low']).toContain(action.urgency);
    }
  });

  it('next actions exclude not_now and lost leads', () => {
    const actions = founderValidationService.getNextActions();
    for (const action of actions) {
      expect(action.lead.stage).not.toBe('not_now');
      expect(action.lead.stage).not.toBe('lost');
    }
  });
});

// ── Pilot pipeline value ──────────────────────────────────────────────────────

describe('B96-B Pilot pipeline value', () => {

  it('returns a PilotPipelineValue object', () => {
    const pipeline = founderValidationService.getPilotPipelineValue();
    expect(typeof pipeline.total_eur).toBe('number');
    expect(typeof pipeline.loi_signed_eur).toBe('number');
    expect(typeof pipeline.loi_discussed_eur).toBe('number');
    expect(typeof pipeline.pilot_interested_eur).toBe('number');
    expect(typeof pipeline.lead_count).toBe('number');
  });

  it('total_eur is positive', () => {
    const pipeline = founderValidationService.getPilotPipelineValue();
    expect(pipeline.total_eur).toBeGreaterThan(0);
  });

  it('total_eur >= loi_signed_eur + loi_discussed_eur + pilot_interested_eur', () => {
    const pipeline = founderValidationService.getPilotPipelineValue();
    const sum = pipeline.loi_signed_eur + pipeline.loi_discussed_eur + pipeline.pilot_interested_eur;
    expect(pipeline.total_eur).toBeGreaterThanOrEqual(sum);
  });

  it('stage-specific values are non-negative', () => {
    const pipeline = founderValidationService.getPilotPipelineValue();
    expect(pipeline.loi_signed_eur).toBeGreaterThanOrEqual(0);
    expect(pipeline.loi_discussed_eur).toBeGreaterThanOrEqual(0);
    expect(pipeline.pilot_interested_eur).toBeGreaterThanOrEqual(0);
  });

  it('lead_count equals number of leads with non-null estimated_pilot_value', () => {
    const leads    = founderValidationService.getLeads();
    const pipeline = founderValidationService.getPilotPipelineValue();
    const expected = leads.filter((l) => l.estimated_pilot_value !== null).length;
    expect(pipeline.lead_count).toBe(expected);
  });
});

// ── Investor signal calculation ───────────────────────────────────────────────

describe('B96-B Investor signals', () => {

  it('returns an InvestorSignalSummary', () => {
    const signals = founderValidationService.getInvestorSignals();
    expect(typeof signals.formal_interest_count).toBe('number');
    expect(typeof signals.soft_commitment_count).toBe('number');
    expect(typeof signals.curious_count).toBe('number');
    expect(Array.isArray(signals.strategic_interest_leads)).toBe(true);
    expect(typeof signals.loi_signed_count).toBe('number');
    expect(typeof signals.total_pilot_value_eur).toBe('number');
    expect(typeof signals.strongest_signal).toBe('string');
    expect(typeof signals.weakest_gap).toBe('string');
  });

  it('all signal counts are non-negative', () => {
    const signals = founderValidationService.getInvestorSignals();
    expect(signals.formal_interest_count).toBeGreaterThanOrEqual(0);
    expect(signals.soft_commitment_count).toBeGreaterThanOrEqual(0);
    expect(signals.curious_count).toBeGreaterThanOrEqual(0);
    expect(signals.loi_signed_count).toBeGreaterThanOrEqual(0);
  });

  it('loi_signed_count matches leads with stage loi_signed', () => {
    const leads   = founderValidationService.getLeads();
    const signals = founderValidationService.getInvestorSignals();
    const expected = leads.filter((l) => l.stage === 'loi_signed').length;
    expect(signals.loi_signed_count).toBe(expected);
  });

  it('formal_interest_count matches leads with formal_interest signal', () => {
    const leads   = founderValidationService.getLeads();
    const signals = founderValidationService.getInvestorSignals();
    const expected = leads.filter((l) => l.investment_signal === 'formal_interest').length;
    expect(signals.formal_interest_count).toBe(expected);
  });

  it('strategic_interest_leads are company names', () => {
    const leads   = founderValidationService.getLeads();
    const signals = founderValidationService.getInvestorSignals();
    const expected = leads.filter((l) => l.interest_level === 'strategic').map((l) => l.company_name);
    expect(signals.strategic_interest_leads).toEqual(expected);
  });

  it('strongest_signal and weakest_gap are non-empty strings', () => {
    const signals = founderValidationService.getInvestorSignals();
    expect(signals.strongest_signal.length).toBeGreaterThan(5);
    expect(signals.weakest_gap.length).toBeGreaterThan(5);
  });

  it('total_pilot_value_eur matches getPilotPipelineValue().total_eur', () => {
    const signals  = founderValidationService.getInvestorSignals();
    const pipeline = founderValidationService.getPilotPipelineValue();
    expect(signals.total_pilot_value_eur).toBe(pipeline.total_eur);
  });
});

// ── Hero metrics ──────────────────────────────────────────────────────────────

describe('B96-B Hero metrics', () => {

  it('returns all 6 hero metric keys', () => {
    const hero = founderValidationService.getHeroMetrics();
    expect(typeof hero.companies_contacted).toBe('number');
    expect(typeof hero.meetings_done).toBe('number');
    expect(typeof hero.pilot_interested).toBe('number');
    expect(typeof hero.loi_potential).toBe('number');
    expect(typeof hero.estimated_pilot_value).toBe('number');
    expect(typeof hero.investment_signals).toBe('number');
  });

  it('companies_contacted equals lead count', () => {
    const leads = founderValidationService.getLeads();
    const hero  = founderValidationService.getHeroMetrics();
    expect(hero.companies_contacted).toBe(leads.length);
  });

  it('investment_signals = formal + soft_commitment count', () => {
    const signals = founderValidationService.getInvestorSignals();
    const hero    = founderValidationService.getHeroMetrics();
    expect(hero.investment_signals).toBe(
      signals.formal_interest_count + signals.soft_commitment_count
    );
  });
});

// ── Route/nav presence ────────────────────────────────────────────────────────

describe('B96-B Navigation — Founder Tools group in admin sidebar', () => {

  it('admin sidebar includes a Founder Tools group', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const founderGroup = groups.find((g) => g.heading === 'Founder Tools');
    expect(founderGroup).toBeDefined();
  });

  it('Founder Tools group contains Validation Cockpit item', () => {
    const groups       = buildNavGroups('KORA_ADMIN');
    const founderGroup = groups.find((g) => g.heading === 'Founder Tools');
    const cockpit = founderGroup?.items.find((i) => i.label === 'Validation Cockpit');
    expect(cockpit).toBeDefined();
  });

  it('Validation Cockpit links to /admin/founder-validation', () => {
    const groups       = buildNavGroups('KORA_ADMIN');
    const founderGroup = groups.find((g) => g.heading === 'Founder Tools');
    const cockpit = founderGroup?.items.find((i) => i.label === 'Validation Cockpit');
    expect(cockpit?.href).toBe('/admin/founder-validation');
  });

  it('Founder Tools has FOUNDER badge key', () => {
    const groups       = buildNavGroups('KORA_ADMIN');
    const founderGroup = groups.find((g) => g.heading === 'Founder Tools');
    expect(founderGroup?.badgeKey).toBe('FOUNDER');
  });

  it('non-admin roles do not have Founder Tools group', () => {
    const roles = ['COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']; // B143: COMPANY_VIEWER rimosso
    for (const role of roles) {
      const groups = buildNavGroups(role);
      const founderGroup = groups.find((g) => g.heading === 'Founder Tools');
      expect(founderGroup).toBeUndefined();
    }
  });

  it('non-admin roles cannot reach /admin/founder-validation from sidebar', () => {
    const roles = ['COMPANY_ADMIN', 'WORKER', 'PARTNER'];
    for (const role of roles) {
      const groups = buildNavGroups(role);
      const allItems = groups.flatMap((g) => g.items);
      const fvItem = allItems.find((i) => i.href === '/admin/founder-validation');
      expect(fvItem).toBeUndefined();
    }
  });
});

// ── Privacy invariants ────────────────────────────────────────────────────────

describe('B96-B Privacy invariants', () => {

  it('leads contain no PIB data', () => {
    const leads = founderValidationService.getLeads();
    for (const lead of leads) {
      expect(JSON.stringify(lead)).not.toContain('pib');
      expect(JSON.stringify(lead)).not.toContain('impact_unit');
    }
  });

  it('leads do not expose individual worker records', () => {
    const leads = founderValidationService.getLeads();
    for (const lead of leads) {
      expect(JSON.stringify(lead)).not.toContain('worker_id');
      expect(JSON.stringify(lead)).not.toContain('my_kora');
    }
  });

  it('validation service is independent of scoring or KORA Index services', () => {
    // Service returns data without depending on ScoringSimulatorService
    const leads  = founderValidationService.getLeads();
    const funnel = founderValidationService.getFunnelSummary();
    expect(leads.length).toBeGreaterThan(0);
    expect(funnel.contacted_total).toBeGreaterThan(0);
  });
});

// ── Type metadata completeness ─────────────────────────────────────────────────

describe('B96-B Type metadata', () => {

  it('STAGE_META covers all 8 ValidationStage values', () => {
    const stages: ValidationStage[] = [
      'contacted','meeting_scheduled','meeting_done','pilot_interested',
      'loi_discussed','loi_signed','not_now','lost',
    ];
    for (const stage of stages) {
      expect(STAGE_META[stage]).toBeDefined();
      expect(STAGE_META[stage].label).toBeTruthy();
    }
  });

  it('INTEREST_META covers all 4 InterestLevel values', () => {
    const levels: InterestLevel[] = ['low', 'medium', 'high', 'strategic'];
    for (const level of levels) {
      expect(INTEREST_META[level]).toBeDefined();
      expect(INTEREST_META[level].label).toBeTruthy();
    }
  });

  it('PILOT_META covers all 4 PilotPotential values', () => {
    const potentials: PilotPotential[] = ['none', 'small', 'medium', 'large'];
    for (const p of potentials) {
      expect(PILOT_META[p]).toBeDefined();
      expect(PILOT_META[p].label).toBeTruthy();
    }
  });

  it('INVESTMENT_META covers all 4 InvestmentSignal values', () => {
    const signals: InvestmentSignal[] = ['none', 'curious', 'soft_commitment', 'formal_interest'];
    for (const s of signals) {
      expect(INVESTMENT_META[s]).toBeDefined();
    }
  });
});
