'use client';
// /admin/founder-validation — B96-B
// Founder Validation Cockpit — commercial and pilot validation tracking.
// Strumento interno founder — non parte del KORA Index.
// KORA Admin / Founder only. No worker data. No company methodology impact.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { founderValidationService } from '@/services/founder-validation/FounderValidationService';
import {
  STAGE_META,
  INTEREST_META,
  PILOT_META,
  type ValidationStage,
  type InterestLevel,
} from '@/lib/founder-validation/types';

// ── Design tokens ─────────────────────────────────────────────────────────────

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const C = {
  ink:      'rgba(6,3,43,0.90)',
  inkSec:   'rgba(6,3,43,0.55)',
  inkHint:  'rgba(6,3,43,0.38)',
  inkBdr:   'rgba(6,3,43,0.08)',
  surface:  '#F8F6F1',
  accent:   '#C76F3D',
  green:    '#2F7D55',
  blue:     '#1E4DA0',
  amber:    '#8A5A00',
};

// ── Stage pills ────────────────────────────────────────────────────────────────

const STAGE_PILL: Record<ValidationStage, string> = {
  contacted:         'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.55)] border-[rgba(6,3,43,0.12)]',
  meeting_scheduled: 'bg-[rgba(74,127,224,0.08)] text-[#1E4DA0] border-[rgba(74,127,224,0.25)]',
  meeting_done:      'bg-[rgba(74,127,224,0.12)] text-[#1E4DA0] border-[rgba(74,127,224,0.30)]',
  pilot_interested:  'bg-[rgba(199,111,61,0.10)] text-[#C76F3D] border-[rgba(199,111,61,0.28)]',
  loi_discussed:     'bg-[rgba(217,154,43,0.12)] text-[#8A5A00] border-[rgba(217,154,43,0.30)]',
  loi_signed:        'bg-[rgba(47,125,85,0.12)] text-[#2F7D55] border-[rgba(47,125,85,0.30)]',
  not_now:           'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.40)] border-[rgba(6,3,43,0.08)]',
  lost:              'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.18)]',
};

function StagePill({ stage }: { stage: ValidationStage }) {
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${STAGE_PILL[stage]}`}>
      {STAGE_META[stage].label}
    </span>
  );
}

function InterestPill({ level }: { level: InterestLevel }) {
  const m = INTEREST_META[level];
  return (
    <span
      style={{
        display: 'inline-block', borderRadius: 4, padding: '1px 6px',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
        color: m.color, border: `1px solid ${m.color}33`, background: `${m.color}12`,
      }}
    >
      {m.label}
    </span>
  );
}

// ── Hero metric card ──────────────────────────────────────────────────────────

function HeroCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      style={{
        flex: 1, minWidth: 130,
        borderRadius: 12,
        border: accent ? `1px solid rgba(199,111,61,0.30)` : `1px solid ${C.inkBdr}`,
        background: accent ? 'rgba(199,111,61,0.06)' : '#FFFFFF',
        padding: '16px 18px',
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, color: accent ? C.accent : C.ink, lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: FONT, fontSize: 10, color: C.inkSec, marginTop: 4 }}>{sub}</p>
      )}
    </div>
  );
}

// ── Funnel row ────────────────────────────────────────────────────────────────

function FunnelRow({ label, count, total, rate, isLast }: {
  label: string; count: number; total: number; rate?: number; isLast?: boolean;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.ink, minWidth: 150 }}>{label}</span>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.inkBdr, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: C.accent, borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: C.ink, minWidth: 24, textAlign: 'right' as const }}>{count}</span>
      </div>
      {rate !== undefined && !isLast && (
        <div style={{ marginLeft: 8, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: C.inkHint }}>↓</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: rate >= 50 ? C.green : C.amber, fontWeight: 600 }}>
            {rate}% conversione
          </span>
        </div>
      )}
    </div>
  );
}

// ── Next action urgency badge ─────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: 'urgent' | 'normal' | 'low' }) {
  const cfg = {
    urgent: { label: 'URGENTE', cls: 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border-[rgba(158,59,47,0.25)]' },
    normal: { label: 'QUESTA SETTIMANA', cls: 'bg-[rgba(217,154,43,0.10)] text-[#8A5A00] border-[rgba(217,154,43,0.28)]' },
    low:    { label: 'IN PROGRAMMA', cls: 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.45)] border-[rgba(6,3,43,0.10)]' },
  }[urgency];
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Bar count item (objections / themes) ──────────────────────────────────────

function BarItem({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontFamily: FONT, fontSize: 11, color: C.ink }}>{label}</span>
        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.ink }}>{count}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: C.inkBdr, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: C.accent, borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── Format EUR ─────────────────────────────────────────────────────────────────

function fmtEur(v: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FounderValidationPage() {
  const leads    = founderValidationService.getLeads();
  const funnel   = founderValidationService.getFunnelSummary();
  const objList  = founderValidationService.getTopObjections();
  const themes   = founderValidationService.getFeedbackThemes();
  const pipeline = founderValidationService.getPilotPipelineValue();
  const actions  = founderValidationService.getNextActions();
  const signals  = founderValidationService.getInvestorSignals();
  const hero     = founderValidationService.getHeroMetrics();

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filterStage, setFilterStage]     = useState<string>('all');
  const [filterInterest, setFilterInterest] = useState<string>('all');
  const [filterSector, setFilterSector]   = useState<string>('all');

  const sectors = useMemo(() => {
    const s = new Set(leads.map((l) => l.sector));
    return ['all', ...Array.from(s).sort()];
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterStage    !== 'all' && l.stage          !== filterStage)    return false;
      if (filterInterest !== 'all' && l.interest_level !== filterInterest) return false;
      if (filterSector   !== 'all' && l.sector         !== filterSector)   return false;
      return true;
    });
  }, [leads, filterStage, filterInterest, filterSector]);

  const maxObj   = Math.max(...objList.map((o) => o.count),  1);
  const maxTheme = Math.max(...themes.map((t) => t.count), 1);

  return (
    <div style={{ maxWidth: 1040, fontFamily: FONT }} data-testid="founder-validation-cockpit">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 14, background: '#06032B',
        padding: '22px 28px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: C.accent, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 4 }}>
            KORA Admin · Founder Validation Cockpit
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, marginBottom: 4 }}>
            Validation Cockpit
          </h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5 }}>
            Tracciamento interesse di mercato, pipeline pilot e segnali commerciali.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 6 }}>
          <span style={{ borderRadius: 6, padding: '3px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, background: 'rgba(199,111,61,0.20)', color: '#C76F3D', border: '1px solid rgba(199,111,61,0.40)' }}>
            FOUNDER TOOL
          </span>
          <span style={{ borderRadius: 6, padding: '3px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.10)' }}>
            DEMO · dati sintetici
          </span>
        </div>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────────────────────── */}
      <div style={{ borderRadius: 8, border: `1px solid rgba(199,111,61,0.25)`, background: 'rgba(199,111,61,0.06)', padding: '8px 16px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>
          ⚙ Strumento interno founder — non parte del KORA Index.
        </p>
        <p style={{ fontSize: 10, color: C.inkSec, marginTop: 2 }}>
          Dati sintetici di validazione commerciale. Non visibili a Company Admin, Company Viewer, Worker, Partner o Advisor.
          Nessun dato aziendale reale. Nessun impatto su scoring, IU formula o metodologia KORA.
        </p>
      </div>

      {/* ── Hero metrics ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <HeroCard label="Aziende contattate" value={String(hero.companies_contacted)} />
        <HeroCard label="Meeting completati" value={String(hero.meetings_done)} sub={`${funnel.contact_to_meeting_rate}% del totale`} />
        <HeroCard label="Pilot interessati"  value={String(hero.pilot_interested)} sub={`${funnel.meeting_to_pilot_rate}% dei meeting`} />
        <HeroCard label="LOI potential"      value={String(hero.loi_potential)}    sub={`${funnel.pilot_to_loi_rate}% degli interessati`} />
        <HeroCard label="Valore pilot stimato" value={fmtEur(hero.estimated_pilot_value)} sub="pipeline totale" accent />
        <HeroCard label="Segnali investimento" value={String(hero.investment_signals)} sub="soft + formali" />
      </div>

      {/* ── Funnel + Next actions ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Funnel */}
        <div style={{ borderRadius: 12, border: `1px solid ${C.inkBdr}`, background: '#FFFFFF', padding: '20px 22px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 14 }}>
            Conversion Funnel
          </p>
          <FunnelRow label="Contattati"       count={funnel.contacted_total}  total={funnel.contacted_total}  />
          <FunnelRow label="Meeting fatto"    count={funnel.meetings_done}    total={funnel.contacted_total}  rate={funnel.contact_to_meeting_rate} />
          <FunnelRow label="Pilot interessati" count={funnel.pilot_interested} total={funnel.contacted_total} rate={funnel.meeting_to_pilot_rate} />
          <FunnelRow label="LOI (disc. + firmata)" count={funnel.loi_potential} total={funnel.contacted_total} rate={funnel.pilot_to_loi_rate} />
          <FunnelRow label="LOI firmata"      count={funnel.stages.find(s => s.stage === 'loi_signed')?.count ?? 0} total={funnel.contacted_total} rate={funnel.loi_to_signed_rate} isLast />
          <p style={{ fontSize: 9, color: C.inkHint, marginTop: 12 }}>
            Dati di validazione founder — {funnel.contacted_total} lead totali · synthetic_demo_data: true
          </p>
        </div>

        {/* Next Actions */}
        <div style={{ borderRadius: 12, border: `1px solid ${C.inkBdr}`, background: '#FFFFFF', padding: '20px 22px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 14 }}>
            Prossime azioni — top 5
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {actions.map(({ lead, urgency }) => (
              <div key={lead.id} style={{ borderRadius: 8, border: `1px solid ${C.inkBdr}`, padding: '10px 12px', background: C.surface }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{lead.company_name}</p>
                  <UrgencyBadge urgency={urgency} />
                </div>
                <p style={{ fontSize: 10, color: C.inkSec, marginBottom: 3, lineHeight: 1.4 }}>{lead.next_action}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: C.inkHint, fontFamily: 'ui-monospace, monospace' }}>{lead.next_action_date}</span>
                  <StagePill stage={lead.stage} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Leads table ─────────────────────────────────────────────────────── */}
      <div style={{ borderRadius: 12, border: `1px solid ${C.inkBdr}`, background: '#FFFFFF', marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px 12px', borderBottom: `1px solid ${C.inkBdr}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.09em', flex: 1 }}>
              Lead Table — {filtered.length} di {leads.length} aziende
            </p>
            {/* Filters */}
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              style={{ borderRadius: 6, border: `1px solid ${C.inkBdr}`, padding: '4px 8px', fontSize: 11, color: C.ink, background: C.surface, cursor: 'pointer' }}
            >
              <option value="all">Tutti gli stage</option>
              {(['contacted','meeting_scheduled','meeting_done','pilot_interested','loi_discussed','loi_signed','not_now','lost'] as ValidationStage[]).map((s) => (
                <option key={s} value={s}>{STAGE_META[s].label}</option>
              ))}
            </select>
            <select
              value={filterInterest}
              onChange={(e) => setFilterInterest(e.target.value)}
              style={{ borderRadius: 6, border: `1px solid ${C.inkBdr}`, padding: '4px 8px', fontSize: 11, color: C.ink, background: C.surface, cursor: 'pointer' }}
            >
              <option value="all">Tutti gli interessi</option>
              <option value="low">Basso</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
              <option value="strategic">Strategico</option>
            </select>
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              style={{ borderRadius: 6, border: `1px solid ${C.inkBdr}`, padding: '4px 8px', fontSize: 11, color: C.ink, background: C.surface, cursor: 'pointer' }}
            >
              {sectors.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'Tutti i settori' : s}</option>
              ))}
            </select>
            {(filterStage !== 'all' || filterInterest !== 'all' || filterSector !== 'all') && (
              <button
                onClick={() => { setFilterStage('all'); setFilterInterest('all'); setFilterSector('all'); }}
                style={{ fontSize: 10, color: C.inkHint, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Rimuovi filtri
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' as const }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.inkBdr}`, background: C.surface }}>
                {['Azienda', 'Settore', 'Dimensione', 'Ruolo', 'Stage', 'Interesse', 'Pilot', 'Prossima azione'].map((h) => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left' as const, fontSize: 9, fontWeight: 700, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.07em', whiteSpace: 'nowrap' as const }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: `1px solid ${C.inkBdr}` }} data-testid={`lead-row-${lead.id}`}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' as const }}>
                    <p style={{ fontWeight: 700, color: C.ink }}>{lead.company_name}</p>
                    {lead.estimated_pilot_value && (
                      <p style={{ fontSize: 9, color: C.accent, marginTop: 1 }}>{fmtEur(lead.estimated_pilot_value)}</p>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 10, color: C.inkSec, whiteSpace: 'nowrap' as const }}>{lead.sector}</td>
                  <td style={{ padding: '10px 14px', fontSize: 10, color: C.inkSec, whiteSpace: 'nowrap' as const }}>{lead.employee_count_band}</td>
                  <td style={{ padding: '10px 14px', fontSize: 10, color: C.inkSec, whiteSpace: 'nowrap' as const }}>{lead.contact_role}</td>
                  <td style={{ padding: '10px 14px' }}><StagePill stage={lead.stage} /></td>
                  <td style={{ padding: '10px 14px' }}><InterestPill level={lead.interest_level} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 10, color: C.inkSec, whiteSpace: 'nowrap' as const }}>
                    {PILOT_META[lead.pilot_potential].label}
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                    <p style={{ fontSize: 10, color: C.ink, lineHeight: 1.4 }}>{lead.next_action}</p>
                    <p style={{ fontSize: 9, color: C.inkHint, marginTop: 1, fontFamily: 'ui-monospace, monospace' }}>{lead.next_action_date}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center' as const, padding: 24, fontSize: 11, color: C.inkHint }}>
              Nessun lead corrisponde ai filtri selezionati.
            </p>
          )}
        </div>
      </div>

      {/* ── Objections + Feedback ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Objections */}
        <div style={{ borderRadius: 12, border: `1px solid ${C.inkBdr}`, background: '#FFFFFF', padding: '20px 22px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 14 }}>
            Top Obiezioni — frequenza
          </p>
          {objList.length > 0
            ? objList.map((o) => <BarItem key={o.objection} label={o.label} count={o.count} max={maxObj} />)
            : <p style={{ fontSize: 11, color: C.inkHint }}>Nessuna obiezione registrata.</p>
          }
        </div>

        {/* Feedback themes */}
        <div style={{ borderRadius: 12, border: `1px solid ${C.inkBdr}`, background: '#FFFFFF', padding: '20px 22px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 14 }}>
            Temi Feedback — frequenza
          </p>
          {themes.length > 0
            ? themes.map((t) => <BarItem key={t.theme} label={t.label} count={t.count} max={maxTheme} />)
            : <p style={{ fontSize: 11, color: C.inkHint }}>Nessun tema feedback registrato.</p>
          }
        </div>
      </div>

      {/* ── Investor Readiness ──────────────────────────────────────────────── */}
      <div style={{ borderRadius: 12, border: `1px solid rgba(47,125,85,0.22)`, background: 'rgba(47,125,85,0.03)', padding: '20px 24px', marginBottom: 20 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 14 }}>
          Investor Readiness Panel — solo uso founder
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'LOI firmate',             value: String(signals.loi_signed_count) },
            { label: 'LOI in discussione',       value: String(signals.loi_discussed_count) },
            { label: 'Interesse formale',        value: String(signals.formal_interest_count) },
            { label: 'Interesse strategico',     value: String(signals.strategic_interest_leads.length) },
            { label: 'Valore pilot totale',      value: fmtEur(signals.total_pilot_value_eur) },
            { label: 'Segnali soft',             value: String(signals.soft_commitment_count + signals.curious_count) },
          ].map(({ label, value }) => (
            <div key={label} style={{ borderRadius: 10, border: `1px solid rgba(47,125,85,0.18)`, background: '#FFFFFF', padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ borderRadius: 8, border: `1px solid rgba(47,125,85,0.20)`, background: 'rgba(47,125,85,0.06)', padding: '12px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.green, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 4 }}>
              ✓ Segnale più forte
            </p>
            <p style={{ fontSize: 11, color: C.ink }}>{signals.strongest_signal}</p>
          </div>
          <div style={{ borderRadius: 8, border: `1px solid rgba(217,154,43,0.25)`, background: 'rgba(217,154,43,0.06)', padding: '12px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.amber, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 4 }}>
              ⚠ Gap da colmare
            </p>
            <p style={{ fontSize: 11, color: C.ink }}>{signals.weakest_gap}</p>
          </div>
        </div>

        {signals.strategic_interest_leads.length > 0 && (
          <p style={{ fontSize: 10, color: C.inkSec, marginTop: 12 }}>
            Aziende con interesse strategico: {signals.strategic_interest_leads.join(', ')}
          </p>
        )}

        <p style={{ fontSize: 9, color: C.inkHint, marginTop: 12 }}>
          ⚠ Nessuna claim di investimento. Dati di validazione interna. Non condividere senza revisione legale.
        </p>
      </div>

      {/* ── Pilot pipeline value ────────────────────────────────────────────── */}
      <div style={{ borderRadius: 12, border: `1px solid ${C.inkBdr}`, background: '#FFFFFF', padding: '20px 24px', marginBottom: 20 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 14 }}>
          Pilot Pipeline Value — breakdown per stage
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {[
            { label: 'LOI firmata', value: pipeline.loi_signed_eur,       cls: 'border-[rgba(47,125,85,0.28)] bg-[rgba(47,125,85,0.06)]', color: C.green },
            { label: 'LOI in discussione', value: pipeline.loi_discussed_eur,  cls: 'border-[rgba(217,154,43,0.28)] bg-[rgba(217,154,43,0.06)]', color: C.amber },
            { label: 'Pilot interessati', value: pipeline.pilot_interested_eur, cls: 'border-[rgba(199,111,61,0.28)] bg-[rgba(199,111,61,0.06)]', color: C.accent },
            { label: 'Pipeline totale', value: pipeline.total_eur,          cls: 'border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.03)]', color: C.ink },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ borderRadius: 10, border: `1px solid ${C.inkBdr}`, background: C.surface, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: C.inkHint, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 17, fontWeight: 800, color }}>{fmtEur(value)}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 9, color: C.inkHint, marginTop: 10 }}>
          Valori stimati — non contrattualizzati. Basati su {pipeline.lead_count} lead con stima disponibile.
        </p>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div style={{ borderRadius: 8, border: `1px solid ${C.inkBdr}`, background: C.surface, padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/admin/pipeline" style={{ fontSize: 10, color: C.accent, textDecoration: 'none' }}>← Pilot Lifecycle</Link>
          <Link href="/admin/companies" style={{ fontSize: 10, color: C.inkSec, textDecoration: 'none' }}>Company Console</Link>
          <Link href="/admin" style={{ fontSize: 10, color: C.inkSec, textDecoration: 'none' }}>Admin Home</Link>
        </div>
        <p style={{ fontSize: 9, color: C.inkHint, marginTop: 8, fontFamily: 'ui-monospace, monospace' }}>
          KORA Admin · Founder Validation · B96-B · synthetic_demo_data: true ·
          no_kora_index_impact · no_scoring_changes · no_worker_data · no_db_changes · founder_tool_only
        </p>
      </div>

    </div>
  );
}
