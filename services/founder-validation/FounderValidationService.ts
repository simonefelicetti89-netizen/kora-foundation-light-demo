// services/founder-validation/FounderValidationService.ts
// B96-B — Founder Validation Service
// Internal founder tool — tracks commercial and pilot validation signals.
// NOT part of KORA Index, product methodology, or company-visible outputs.
// Admin/Founder only. No DB. No persistence. Pure demo service.

import rawLeads from '@/data/synthetic/founder-validation-leads.json';
import {
  STAGE_META,
  OBJECTION_LABELS,
  FEEDBACK_LABELS,
  type ValidationLead,
  type FunnelSummary,
  type FunnelStage,
  type ObjectionCount,
  type FeedbackThemeCount,
  type PilotPipelineValue,
  type NextActionItem,
  type InvestorSignalSummary,
  type ValidationStage,
  type ObjectionType,
  type FeedbackTheme,
} from '@/lib/founder-validation/types';

const LEADS = rawLeads as ValidationLead[];

// ── Active funnel stages (ordered) ──────────────────────────────────────────

const FUNNEL_STAGES: ValidationStage[] = [
  'contacted',
  'meeting_scheduled',
  'meeting_done',
  'pilot_interested',
  'loi_discussed',
  'loi_signed',
];

// Stages that indicate the lead has at least reached "meeting done" or beyond
function atOrBeyond(lead: ValidationLead, stage: ValidationStage): boolean {
  const order = STAGE_META[stage].order;
  return STAGE_META[lead.stage].funnel && STAGE_META[lead.stage].order >= order;
}

// ── Service ──────────────────────────────────────────────────────────────────

class FounderValidationService {

  getLeads(): ValidationLead[] {
    return LEADS;
  }

  getFunnelSummary(): FunnelSummary {
    const active = LEADS.filter((l) => l.stage !== 'not_now' && l.stage !== 'lost');

    const stages: FunnelStage[] = FUNNEL_STAGES.map((stage) => ({
      stage,
      label:     STAGE_META[stage].label,
      count:     active.filter((l) => atOrBeyond(l, stage)).length,
      is_funnel: true,
    }));

    const contacted_total      = LEADS.length; // all leads ever contacted
    const meetings_done        = LEADS.filter((l) => atOrBeyond(l, 'meeting_done')).length;
    const pilot_interested_n   = LEADS.filter((l) => atOrBeyond(l, 'pilot_interested')).length;
    const loi_potential        = LEADS.filter((l) => atOrBeyond(l, 'loi_discussed')).length;
    const loi_signed           = LEADS.filter((l) => l.stage === 'loi_signed').length;

    return {
      stages,
      contacted_total,
      meetings_done,
      pilot_interested:        pilot_interested_n,
      loi_potential,
      contact_to_meeting_rate: contacted_total > 0 ? Math.round((meetings_done / contacted_total) * 100) : 0,
      meeting_to_pilot_rate:   meetings_done   > 0 ? Math.round((pilot_interested_n / meetings_done) * 100) : 0,
      pilot_to_loi_rate:       pilot_interested_n > 0 ? Math.round((loi_potential / pilot_interested_n) * 100) : 0,
      loi_to_signed_rate:      loi_potential > 0 ? Math.round((loi_signed / loi_potential) * 100) : 0,
    };
  }

  getTopObjections(): ObjectionCount[] {
    const counts: Partial<Record<ObjectionType, number>> = {};
    for (const lead of LEADS) {
      if (lead.key_objection) {
        counts[lead.key_objection] = (counts[lead.key_objection] ?? 0) + 1;
      }
    }
    return (Object.entries(counts) as [ObjectionType, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([objection, count]) => ({
        objection,
        label: OBJECTION_LABELS[objection],
        count,
      }));
  }

  getFeedbackThemes(): FeedbackThemeCount[] {
    const counts: Partial<Record<FeedbackTheme, number>> = {};
    for (const lead of LEADS) {
      for (const theme of lead.feedback_themes) {
        counts[theme] = (counts[theme] ?? 0) + 1;
      }
    }
    return (Object.entries(counts) as [FeedbackTheme, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => ({
        theme,
        label: FEEDBACK_LABELS[theme],
        count,
      }));
  }

  getPilotPipelineValue(): PilotPipelineValue {
    const withValue = LEADS.filter((l) => l.estimated_pilot_value !== null);

    const loi_signed_eur = LEADS
      .filter((l) => l.stage === 'loi_signed' && l.estimated_pilot_value !== null)
      .reduce((s, l) => s + (l.estimated_pilot_value ?? 0), 0);

    const loi_discussed_eur = LEADS
      .filter((l) => l.stage === 'loi_discussed' && l.estimated_pilot_value !== null)
      .reduce((s, l) => s + (l.estimated_pilot_value ?? 0), 0);

    const pilot_interested_eur = LEADS
      .filter((l) => l.stage === 'pilot_interested' && l.estimated_pilot_value !== null)
      .reduce((s, l) => s + (l.estimated_pilot_value ?? 0), 0);

    return {
      total_eur:            withValue.reduce((s, l) => s + (l.estimated_pilot_value ?? 0), 0),
      loi_signed_eur,
      loi_discussed_eur,
      pilot_interested_eur,
      lead_count:           withValue.length,
    };
  }

  getNextActions(): NextActionItem[] {
    const today = new Date('2026-06-07');
    return LEADS
      .filter((l) => l.stage !== 'not_now' && l.stage !== 'lost')
      .sort((a, b) => a.next_action_date.localeCompare(b.next_action_date))
      .slice(0, 5)
      .map((lead) => {
        const daysUntil = Math.ceil(
          (new Date(lead.next_action_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        const urgency: NextActionItem['urgency'] =
          daysUntil <= 2 ? 'urgent' : daysUntil <= 7 ? 'normal' : 'low';
        return { lead, urgency };
      });
  }

  getInvestorSignals(): InvestorSignalSummary {
    const formal_interest_count  = LEADS.filter((l) => l.investment_signal === 'formal_interest').length;
    const soft_commitment_count  = LEADS.filter((l) => l.investment_signal === 'soft_commitment').length;
    const curious_count          = LEADS.filter((l) => l.investment_signal === 'curious').length;
    const strategic_leads        = LEADS.filter((l) => l.interest_level === 'strategic').map((l) => l.company_name);
    const loi_signed_count       = LEADS.filter((l) => l.stage === 'loi_signed').length;
    const loi_discussed_count    = LEADS.filter((l) => l.stage === 'loi_discussed').length;
    const total_pilot_value      = this.getPilotPipelineValue().total_eur;

    const strongest_signal = loi_signed_count > 0
      ? `${loi_signed_count} LOI firmata — segnale di conversione concreto`
      : loi_discussed_count > 0
      ? `${loi_discussed_count} LOI in discussione — interesse commerciale avanzato`
      : `${strategic_leads.length} aziende con interesse strategico`
    ;

    const weakest_gap = formal_interest_count === 0
      ? 'Nessun interesse formale di investimento — area da sviluppare'
      : curious_count > soft_commitment_count
      ? 'Molti interessati ma pochi impegni concreti — intensificare follow-up'
      : 'Pipeline LOI solida — accelerare chiusura';

    return {
      formal_interest_count,
      soft_commitment_count,
      curious_count,
      strategic_interest_leads: strategic_leads,
      loi_signed_count,
      loi_discussed_count,
      total_pilot_value_eur:     total_pilot_value,
      strongest_signal,
      weakest_gap,
    };
  }

  getHeroMetrics() {
    const funnel   = this.getFunnelSummary();
    const pipeline = this.getPilotPipelineValue();
    const signals  = this.getInvestorSignals();
    return {
      companies_contacted:  funnel.contacted_total,
      meetings_done:        funnel.meetings_done,
      pilot_interested:     funnel.pilot_interested,
      loi_potential:        funnel.loi_potential,
      estimated_pilot_value: pipeline.total_eur,
      investment_signals:   signals.formal_interest_count + signals.soft_commitment_count,
    };
  }
}

export const founderValidationService = new FounderValidationService();
