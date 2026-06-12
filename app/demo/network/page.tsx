'use client';
// A-06: KORA Activation Network — ecosystem intelligence view.
// Scopo: visualizzare la copertura territoriale di partner e advisor,
//        il protocollo evidenze e il fitness di attivazione per pillar e zona.

import { cn } from '@/lib/utils';
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

// AD-01 extension: KORA Activation Network — ecosystem intelligence view
// Admin-only (protected by app/admin/layout.tsx — isAdminRole check).
// No marketplace, no geolocation, no real map API, no public ranking, no individual worker data.
// All territory and partner data is synthetic demo.

// ─── Types ────────────────────────────────────────────────────────────────────

type CoverageStatus = 'forte' | 'media' | 'debole' | 'scoperta';

interface TerritoryPillarCell {
  status: CoverageStatus;
  partner_count: number;
  protocol_note: string;
}

interface TerritoryRow {
  id: string;
  label: string;
  region: string;
  cells: Record<string, TerritoryPillarCell>;
}

interface NetworkPartner {
  id: string;
  name: string;
  territory: string;
  pillars: string[];
  service_type: string;
  evidence_protocol_status: string;
  advisor_process_audit_status: string;
  next_review: string | null;
  availability_signal: string;
  activation_fit: 'alto' | 'medio' | 'basso';
}

interface GapCard {
  id: string;
  territory: string;
  pillar: string;
  problem: string;
  suggested_action: string;
  severity: 'alta' | 'media';
}

interface MatchingRec {
  id: string;
  company_need: string;
  recommended_partner: string;
  reason: string;
  next_step: string;
}

interface Initiative {
  id: string;
  name: string;
  pillars: string[];
  territory: string;
  partner: string;
  status: string;
  status_style: string;
  participation_note: string | null;
  evidence_protocol: string;
  is_future_vision: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

const HERO_METRICS = [
  { label: 'Partner nella rete',            value: '12',  note: 'sintetici demo' },
  { label: 'Territori coperti',             value: '5',   note: 'Bergamo · Milano · Ancona · Bologna · Online' },
  { label: 'Pillar coverage medio',         value: '68%', note: 'forte + media / totale celle' },
  { label: 'Protocolli attivi o in review', value: '9',   note: 'company + partner' },
  { label: 'Gap territoriali aperti',       value: '5',   note: 'rilevati in questa preview' },
] as const;

// ─── Style maps ───────────────────────────────────────────────────────────────

const COVERAGE_STYLE: Record<CoverageStatus, string> = {
  forte:    'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  media:    'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  debole:   'bg-[rgba(158,59,47,0.06)] text-[rgba(158,59,47,0.90)] border-[rgba(158,59,47,0.20)]',
  scoperta: 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]',
};

const PILLAR_CHIP: Record<string, string> = {
  LIFE:       'bg-[rgba(47,125,85,0.10)] text-[#2F7D55]',
  GROWTH:     'bg-blue-100 text-blue-700',
  CONNECTION: 'bg-purple-100 text-purple-700',
  IMPACT:     'bg-[rgba(217,154,43,0.10)] text-[#8A5A00]',
  LEGACY:     'bg-[rgba(217,154,43,0.12)] text-[#8A5A00]',
};

const FIT_STYLE: Record<string, string> = {
  alto:  'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  medio: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  basso: 'bg-[rgba(158,59,47,0.06)] text-[rgba(158,59,47,0.90)] border-[rgba(158,59,47,0.20)]',
};

const PROTOCOL_BADGE: Record<string, string> = {
  'Protocollo attivo':    'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  'Audit completato':     'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  'Audit richiesto':      'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  'In corso':             'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  'Protocollo in review': 'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  'Protocollo parziale':  'bg-[rgba(217,154,43,0.10)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
};

const SAFEGUARD_NODE_STYLE: Record<string, string> = {
  CLEAR:   'border-[rgba(47,125,85,0.22)] bg-green-50',
  WARNING: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]',
  FLAGGED: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)]',
};

// ─── Territory coverage matrix ────────────────────────────────────────────────

const COVERAGE_MATRIX: TerritoryRow[] = [
  {
    id: 'bergamo',
    label: 'Bergamo',
    region: 'Lombardia',
    cells: {
      LIFE:       { status: 'media',    partner_count: 1, protocol_note: 'audit richiesto' },
      GROWTH:     { status: 'debole',   partner_count: 1, protocol_note: 'protocollo in review' },
      CONNECTION: { status: 'forte',    partner_count: 2, protocol_note: 'protocollo attivo' },
      IMPACT:     { status: 'forte',    partner_count: 3, protocol_note: 'protocollo attivo' },
      LEGACY:     { status: 'scoperta', partner_count: 0, protocol_note: 'scoperto' },
    },
  },
  {
    id: 'milano',
    label: 'Milano',
    region: 'Lombardia',
    cells: {
      LIFE:       { status: 'forte',    partner_count: 3, protocol_note: 'protocollo attivo' },
      GROWTH:     { status: 'forte',    partner_count: 2, protocol_note: 'protocollo attivo' },
      CONNECTION: { status: 'media',    partner_count: 1, protocol_note: 'in review' },
      IMPACT:     { status: 'media',    partner_count: 1, protocol_note: 'in corso' },
      LEGACY:     { status: 'debole',   partner_count: 0, protocol_note: 'scoperto' },
    },
  },
  {
    id: 'ancona',
    label: 'Ancona',
    region: 'Marche',
    cells: {
      LIFE:       { status: 'scoperta', partner_count: 0, protocol_note: 'scoperto' },
      GROWTH:     { status: 'media',    partner_count: 1, protocol_note: 'in review' },
      CONNECTION: { status: 'scoperta', partner_count: 0, protocol_note: 'scoperto' },
      IMPACT:     { status: 'media',    partner_count: 1, protocol_note: 'protocollo in review' },
      LEGACY:     { status: 'media',    partner_count: 1, protocol_note: 'protocollo in review' },
    },
  },
  {
    id: 'bologna',
    label: 'Bologna',
    region: 'Emilia-Romagna',
    cells: {
      LIFE:       { status: 'media',   partner_count: 1, protocol_note: 'parziale' },
      GROWTH:     { status: 'media',   partner_count: 1, protocol_note: 'attivo' },
      CONNECTION: { status: 'media',   partner_count: 1, protocol_note: 'parziale' },
      IMPACT:     { status: 'debole',  partner_count: 0, protocol_note: 'scoperto' },
      LEGACY:     { status: 'debole',  partner_count: 0, protocol_note: 'scoperto' },
    },
  },
  {
    id: 'online',
    label: 'Nazionale',
    region: 'Online',
    cells: {
      LIFE:       { status: 'debole',  partner_count: 0, protocol_note: 'scoperto' },
      GROWTH:     { status: 'forte',   partner_count: 2, protocol_note: 'protocollo attivo' },
      CONNECTION: { status: 'debole',  partner_count: 0, protocol_note: 'scoperto' },
      IMPACT:     { status: 'debole',  partner_count: 0, protocol_note: 'scoperto' },
      LEGACY:     { status: 'forte',   partner_count: 1, protocol_note: 'protocollo attivo' },
    },
  },
];

// ─── Partner network ──────────────────────────────────────────────────────────

const NETWORK_PARTNERS: NetworkPartner[] = [
  {
    id: 'np-001',
    name: "Città Aperta APS",
    territory: 'Lombardia / Bergamo',
    pillars: ['IMPACT', 'CONNECTION'],
    service_type: 'Iniziative comunitarie e territoriali',
    evidence_protocol_status: 'Protocollo attivo',
    advisor_process_audit_status: 'Audit completato',
    next_review: '2026-09-01',
    availability_signal: 'Disponibile — iniziative attive',
    activation_fit: 'alto',
  },
  {
    id: 'np-002',
    name: 'VitaLab Network',
    territory: 'Lombardia / Bergamo',
    pillars: ['LIFE'],
    service_type: 'Salute preventiva e benessere organizzativo',
    evidence_protocol_status: 'Audit richiesto',
    advisor_process_audit_status: 'In corso',
    next_review: '2026-04-05',
    availability_signal: 'In attesa audit',
    activation_fit: 'medio',
  },
  {
    id: 'np-003',
    name: 'GrowthLab Academy',
    territory: 'Milano / Online',
    pillars: ['GROWTH', 'LEGACY'],
    service_type: 'Formazione, upskilling, mentoring',
    evidence_protocol_status: 'Protocollo attivo',
    advisor_process_audit_status: 'Periodico',
    next_review: '2026-06-01',
    availability_signal: 'Disponibile — scalabile multi-sede',
    activation_fit: 'alto',
  },
  {
    id: 'np-004',
    name: 'Comunità Futuro ETS',
    territory: 'Marche / Ancona',
    pillars: ['IMPACT', 'LEGACY'],
    service_type: 'Volontariato territoriale e legacy',
    evidence_protocol_status: 'Protocollo in review',
    advisor_process_audit_status: 'Richiesto',
    next_review: null,
    availability_signal: 'In attesa completamento protocollo',
    activation_fit: 'medio',
  },
  {
    id: 'np-005',
    name: 'Wellbeing Hub',
    territory: 'Emilia-Romagna / Bologna',
    pillars: ['LIFE', 'CONNECTION'],
    service_type: 'Benessere e comunità professionali',
    evidence_protocol_status: 'Protocollo parziale',
    advisor_process_audit_status: 'Da completare',
    next_review: null,
    availability_signal: 'Disponibile con limitazioni',
    activation_fit: 'medio',
  },
  {
    id: 'np-006',
    name: 'SkillBridge',
    territory: 'Online / Nazionale',
    pillars: ['GROWTH'],
    service_type: 'Digital upskilling e certificazioni',
    evidence_protocol_status: 'Protocollo attivo',
    advisor_process_audit_status: 'Periodico',
    next_review: '2026-07-01',
    availability_signal: 'Disponibile',
    activation_fit: 'alto',
  },
  {
    id: 'np-007',
    name: 'Bergamo Solidarity Network',
    territory: 'Lombardia / Bergamo',
    pillars: ['IMPACT', 'CONNECTION'],
    service_type: "Solidarietà territoriale e reti comunitarie",
    evidence_protocol_status: 'Protocollo attivo',
    advisor_process_audit_status: 'Sample check completato',
    next_review: '2026-06-15',
    availability_signal: 'Disponibile — iniziative attive',
    activation_fit: 'alto',
  },
];

// ─── Gap diagnostics ──────────────────────────────────────────────────────────

const GAP_CARDS: GapCard[] = [
  {
    id: 'gap-001',
    territory: 'Bergamo',
    pillar: 'LIFE',
    problem: 'Domanda LIFE superiore alla copertura partner disponibile.',
    suggested_action: 'Attivare audit processo su VitaLab Network o cercare nuovo partner LIFE.',
    severity: 'alta',
  },
  {
    id: 'gap-002',
    territory: 'Milano',
    pillar: 'CONNECTION',
    problem: 'Alta offerta GROWTH, debole continuità CONNECTION.',
    suggested_action: 'Introdurre iniziativa cross-team con partner territoriale.',
    severity: 'media',
  },
  {
    id: 'gap-003',
    territory: 'Ancona',
    pillar: 'LEGACY',
    problem: 'Legacy non coperto da partner locali.',
    suggested_action: 'Attivare mentoring territoriale o partner online.',
    severity: 'media',
  },
  {
    id: 'gap-004',
    territory: 'Online / Nazionale',
    pillar: 'GROWTH',
    problem: 'Copertura buona ma rischio concentrazione su top 12%.',
    suggested_action: 'Disegnare iniziative accessibili al bottom 50%.',
    severity: 'media',
  },
];

// ─── Company-to-Partner matching ──────────────────────────────────────────────

const MATCHING_RECS: MatchingRec[] = [
  {
    id: 'match-001',
    company_need: 'Debito LIFE alto su sede Bergamo',
    recommended_partner: 'VitaLab Network',
    reason: 'Copertura LIFE territoriale, audit processo richiesto, protocollo evidenze da completare',
    next_step: 'Richiedere Advisor Process Audit',
  },
  {
    id: 'match-002',
    company_need: 'CONNECTION debole nei reparti produttivi',
    recommended_partner: "Città Aperta APS",
    reason: "Esperienza IMPACT/CONNECTION, protocollo attivo, iniziative cross-team",
    next_step: 'Proporre iniziativa comunitaria',
  },
  {
    id: 'match-003',
    company_need: 'LEGACY e mentoring non coperti',
    recommended_partner: 'GrowthLab Academy',
    reason: 'GROWTH/LEGACY online, protocollo attivo, scalabile su più sedi',
    next_step: 'Avviare pilot mentoring',
  },
];

// ─── Territorial initiatives ──────────────────────────────────────────────────

const INITIATIVES: Initiative[] = [
  {
    id: 'init-001',
    name: 'Bergamo Solidarity Network',
    pillars: ['IMPACT', 'CONNECTION'],
    territory: 'Lombardia / Bergamo',
    partner: "Città Aperta APS",
    status: 'Attiva — demo',
    status_style: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
    participation_note: 'Aggregato sopra soglia — partecipazione verificata',
    evidence_protocol: 'Protocollo attivo',
    is_future_vision: false,
  },
  {
    id: 'init-002',
    name: 'LIFE Access Days',
    pillars: ['LIFE'],
    territory: 'Lombardia / Bergamo',
    partner: 'VitaLab Network',
    status: 'In review protocollo',
    status_style: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
    participation_note: null,
    evidence_protocol: 'Audit richiesto',
    is_future_vision: false,
  },
  {
    id: 'init-003',
    name: 'Legacy Mentoring Circles',
    pillars: ['LEGACY', 'GROWTH'],
    territory: 'Online / Nazionale',
    partner: 'GrowthLab Academy',
    status: 'Proposta',
    status_style: 'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
    participation_note: null,
    evidence_protocol: 'Protocollo da definire',
    is_future_vision: false,
  },
  {
    id: 'init-004',
    name: 'Community Skills Lab',
    pillars: ['CONNECTION', 'GROWTH'],
    territory: 'Online / Nazionale',
    partner: 'SkillBridge + GrowthLab Academy',
    status: 'Future Vision',
    status_style: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
    participation_note: null,
    evidence_protocol: 'Non attivo in Foundation Light',
    is_future_vision: true,
  },
];

// ─── Synthetic network map nodes ──────────────────────────────────────────────

const MAP_NODES = [
  {
    territory: 'Bergamo',
    region: 'Lombardia',
    partners: ["Città Aperta APS", 'VitaLab Network', 'Bergamo Solidarity Network'],
    pillar_coverage: ['CONNECTION', 'IMPACT', 'LIFE'],
    safeguard_signal: 'CLEAR',
  },
  {
    territory: 'Milano',
    region: 'Lombardia',
    partners: ['GrowthLab Academy', 'MindSpace Wellness', 'MediFlex Health'],
    pillar_coverage: ['LIFE', 'GROWTH', 'LEGACY'],
    safeguard_signal: 'WARNING',
  },
  {
    territory: 'Ancona',
    region: 'Marche',
    partners: ['Comunità Futuro ETS'],
    pillar_coverage: ['IMPACT', 'LEGACY'],
    safeguard_signal: 'WARNING',
  },
  {
    territory: 'Bologna',
    region: 'Emilia-Romagna',
    partners: ['Wellbeing Hub', 'SkillBridge'],
    pillar_coverage: ['LIFE', 'GROWTH', 'CONNECTION'],
    safeguard_signal: 'CLEAR',
  },
  {
    territory: 'Nazionale',
    region: 'Online',
    partners: ['GrowthLab Academy', 'SkillBridge', 'NutriWell Italia'],
    pillar_coverage: ['GROWTH', 'LEGACY'],
    safeguard_signal: 'CLEAR',
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NetworkPage() {
  const advisors = adminPreviewService.getAdvisorNetworkPreview();

  return (
    <div className="space-y-10 max-w-4xl">

      {/* ── 1. Header ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <BoundaryBadge mode="DEMO" variant="light" suffix="· dati sintetici" />
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-xs font-medium text-[rgba(6,3,43,0.40)]">
            Solo Admin
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[#06032B]">KORA Activation Network</h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1.5 max-w-2xl leading-relaxed">
          La vista ecosistemica che collega territori, partner, pillar, protocolli evidenze e opportunità di attivazione.
        </p>
        <div className="mt-3 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-4 py-2.5">
          <p className="text-xs text-[rgba(6,3,43,0.72)]">
            Questa non è una marketplace map. È una mappa di copertura e attivazione della rete KORA,
            basata su dati sintetici demo.
          </p>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[
            'Nessun marketplace',
            'Nessuna classifica pubblica',
            'Nessun dato reale di geolocalizzazione',
            'Nessun pricing engine',
            'Nessun dato individuale lavoratore',
          ].map((b) => (
            <span key={b} className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] font-medium text-[rgba(6,3,43,0.40)]">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── 2. Hero metrics ── */}
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {HERO_METRICS.map((m) => (
            <div key={m.label} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3">
              <p className="text-xs text-[rgba(6,3,43,0.40)] leading-snug">{m.label}</p>
              <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)] mt-1">{m.value}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.28)] mt-0.5 font-mono">{m.note}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-2 font-mono">
          Dati sintetici demo. Nessun dato reale di geolocalizzazione, nessuna classifica pubblica, nessun marketplace o pricing engine.
        </p>
      </div>

      {/* ── 3. Territory coverage matrix ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Copertura territoriale e pillar
        </h2>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-x-auto">
          <table className="w-full min-w-[680px] text-xs">
            <thead>
              <tr className="border-b border-[rgba(6,3,43,0.05)]">
                <th className="text-left px-4 py-2.5 text-[rgba(6,3,43,0.40)] font-medium w-36">Territorio</th>
                {PILLARS.map((p) => (
                  <th key={p} className="px-3 py-2.5 text-center">
                    <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold', PILLAR_CHIP[p])}>
                      {p}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {COVERAGE_MATRIX.map((row) => (
                <tr key={row.id} className="hover:bg-[rgba(6,3,43,0.03)]/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[rgba(6,3,43,0.90)]">{row.label}</p>
                    <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono">{row.region}</p>
                  </td>
                  {PILLARS.map((p) => {
                    const cell: TerritoryPillarCell = row.cells[p] ?? {
                      status: 'scoperta',
                      partner_count: 0,
                      protocol_note: '—',
                    };
                    return (
                      <td key={p} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', COVERAGE_STYLE[cell.status])}>
                            {cell.status}
                          </span>
                          {cell.partner_count > 0 && (
                            <span className="text-[10px] text-[rgba(6,3,43,0.52)] font-mono">
                              {cell.partner_count}p
                            </span>
                          )}
                          <span className="text-[9px] text-[rgba(6,3,43,0.28)] font-mono leading-snug max-w-[80px] text-center">
                            {cell.protocol_note}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-2">
          La copertura misura disponibilità ecosistemica e protocollo evidenze. Non misura qualità individuale dei lavoratori o ranking partner.
        </p>
      </div>

      {/* ── 4. Partner network panel ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Partner disponibili nella rete — preview
        </h2>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {NETWORK_PARTNERS.map((partner) => (
              <div key={partner.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{partner.name}</p>
                      <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', FIT_STYLE[partner.activation_fit])}>
                        fit {partner.activation_fit}
                      </span>
                    </div>
                    <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">{partner.service_type}</p>
                    <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono mt-0.5">{partner.territory}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex flex-wrap justify-end gap-1">
                      {partner.pillars.map((pl) => (
                        <span key={pl} className={cn('rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold', PILLAR_CHIP[pl] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)]')}>
                          {pl}
                        </span>
                      ))}
                    </div>
                    <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', PROTOCOL_BADGE[partner.evidence_protocol_status] ?? 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]')}>
                      {partner.evidence_protocol_status}
                    </span>
                    <span className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono">{partner.availability_signal}</span>
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-[rgba(6,3,43,0.40)] font-mono">
                  <span>audit: {partner.advisor_process_audit_status}</span>
                  {partner.next_review && (
                    <span>prossima review: {partner.next_review}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
          <p className="text-[10px] text-[rgba(6,3,43,0.40)]">
            Nessun prezzo. Nessuna prenotazione diretta. Nessuna classifica pubblica.
            Il campo &quot;fit&quot; è una stima dimostrativa di compatibilità ecosistemica, non un ranking.
          </p>
        </div>
      </div>

      {/* ── 5. Gap diagnostics ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Gap territoriali rilevati
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAP_CARDS.map((gap) => (
            <div
              key={gap.id}
              className={cn(
                'rounded-lg border p-4',
                gap.severity === 'alta'
                  ? 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)]'
                  : 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', PILLAR_CHIP[gap.pillar] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)]')}>
                  {gap.pillar}
                </span>
                <span className="text-xs font-semibold text-[rgba(6,3,43,0.78)]">{gap.territory}</span>
                {gap.severity === 'alta' && (
                  <span className="ml-auto rounded border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.10)] px-1.5 py-0.5 text-[9px] font-semibold text-[#9E3B2F]">
                    alta priorità
                  </span>
                )}
              </div>
              <p className="text-xs text-[rgba(6,3,43,0.78)] leading-relaxed">{gap.problem}</p>
              <div className="mt-2 rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2.5 py-1.5">
                <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.52)] mb-0.5">Azione suggerita</p>
                <p className="text-xs text-[rgba(6,3,43,0.62)]">{gap.suggested_action}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-2">
          Questi gap orientano decisioni di attivazione. Non sono scoring pubblico dei territori o dei partner.
        </p>
      </div>

      {/* ── 6. Company-to-Partner Matching ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Company-to-Partner Matching — preview
        </h2>
        <p className="text-xs text-[rgba(6,3,43,0.52)] mb-3">
          Come KORA orienta la scelta del partner in base ai gap di attivazione aziendali.
        </p>
        <div className="space-y-3">
          {MATCHING_RECS.map((rec, i) => (
            <div key={rec.id} className="rounded-lg border border-[rgba(6,3,43,0.06)] bg-[rgba(199,111,61,0.08)]/60 p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-[rgba(199,111,61,0.20)] text-[rgba(6,3,43,0.72)] text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-[10px] font-semibold text-[rgba(6,3,43,0.52)]">Esigenza:</span>
                    <span className="text-xs text-[rgba(6,3,43,0.78)] italic">{rec.company_need}</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-[10px] font-semibold text-[#C76F3D]">Partner raccomandato:</span>
                    <span className="text-xs font-bold text-[rgba(6,3,43,0.88)]">{rec.recommended_partner}</span>
                  </div>
                  <p className="text-[10px] text-[rgba(6,3,43,0.52)] leading-relaxed">{rec.reason}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)]">Passo successivo:</span>
                    <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-2 py-0.5 text-[10px] font-medium text-[rgba(6,3,43,0.72)]">
                      {rec.next_step}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-2">
          Matching dimostrativo. Non è marketplace, non mostra prezzi, non esegue prenotazioni o pagamenti.
        </p>
      </div>

      {/* ── 7. Territorial initiatives ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Iniziative territoriali — preview
        </h2>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {INITIATIVES.map((init) => (
              <div
                key={init.id}
                className={cn('px-4 py-3', init.is_future_vision && 'opacity-70')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{init.name}</p>
                      <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', init.status_style)}>
                        {init.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {init.pillars.map((pl) => (
                        <span key={pl} className={cn('rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold', PILLAR_CHIP[pl] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)]')}>
                          {pl}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono">{init.territory} · {init.partner}</p>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <p className="text-[10px] text-[rgba(6,3,43,0.40)]">protocollo: {init.evidence_protocol}</p>
                    {init.participation_note && (
                      <p className="text-[10px] text-green-600 font-medium">{init.participation_note}</p>
                    )}
                    {!init.participation_note && !init.is_future_vision && (
                      <p className="text-[10px] text-[rgba(6,3,43,0.28)] font-mono">aggregato: non ancora disponibile</p>
                    )}
                    {init.is_future_vision && (
                      <p className="text-[10px] text-[#D99A2B] font-semibold">Future Vision — Non attivo</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-2">
          La partecipazione è mostrata solo in forma aggregata sopra soglia (minimo 10 lavoratori per segmento). Nessun dato individuale.
        </p>
      </div>

      {/* ── 8. Synthetic network map ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Mappa sintetica della rete
        </h2>
        <p className="text-[10px] text-[rgba(6,3,43,0.40)] mb-3 font-mono">
          Mappa dimostrativa non geolocalizzata. Nessun dato reale di posizione o tracking.
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4">
          <div className="space-y-3">
            {MAP_NODES.map((node) => (
              <div key={node.territory} className="flex items-start gap-3">
                {/* Territory node */}
                <div className={cn(
                  'shrink-0 rounded-lg border p-3 w-32 text-center',
                  SAFEGUARD_NODE_STYLE[node.safeguard_signal] ?? 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]',
                )}>
                  <p className="text-xs font-bold text-[rgba(6,3,43,0.78)]">{node.territory}</p>
                  <p className="text-[9px] text-[rgba(6,3,43,0.40)] font-mono">{node.region}</p>
                  <div className="mt-1.5 flex flex-wrap gap-0.5 justify-center">
                    {node.pillar_coverage.map((p) => (
                      <span key={p} className={cn('rounded px-1 py-0.5 text-[8px] font-bold', PILLAR_CHIP[p] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)]')}>
                        {p[0]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Connector */}
                <div className="mt-5 shrink-0 text-[rgba(6,3,43,0.28)] text-sm select-none">→</div>

                {/* Partner nodes */}
                <div className="flex-1 flex flex-wrap gap-2 pt-2">
                  {node.partners.map((pName) => (
                    <div key={pName} className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2.5 py-1.5">
                      <p className="text-[10px] font-medium text-[rgba(6,3,43,0.62)]">{pName}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 border-t border-[rgba(6,3,43,0.08)] pt-3 text-[10px] text-[rgba(6,3,43,0.40)] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-[rgba(47,125,85,0.22)] bg-green-50" />
              CLEAR — attivazione OK
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]" />
              WARNING — da monitorare
            </span>
          </div>
        </div>
      </div>

      {/* ── 9. Future Vision bridge ── */}
      <div className="rounded-lg border border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.08)]/60 p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h2 className="text-sm font-bold text-[#8A5A00]">Territorial Impact View — Future Vision</h2>
          <span className="rounded border border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.08)] px-1.5 py-0.5 text-[10px] font-semibold text-[#D99A2B]">
            Not Active in Foundation Light
          </span>
        </div>
        <p className="text-xs text-[#8A5A00] leading-relaxed mb-3">
          In futuro KORA potrà mostrare impatto territoriale aggregato, iniziative cross-company,
          Public KORA Snapshot e KORA Value Chain, sempre con consenso, governance e soglie privacy.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Public Snapshot — Future Vision', 'KORA Value Chain — Future Vision', 'Territorial Contribution — Future Vision'].map((label) => (
            <span
              key={label}
              className="rounded border border-[rgba(217,154,43,0.22)] bg-[#F8F6F1] px-2.5 py-1 text-xs font-medium text-[rgba(217,154,43,0.80)] opacity-60 cursor-not-allowed"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── 10. Advisor network (condensed) ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Advisor attivi nella rete
        </h2>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {advisors.map((a) => (
              <div key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[rgba(6,3,43,0.90)]">{a.name}</p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono mt-0.5">{a.specialization}</p>
                  {a.assigned_companies.length > 0 && (
                    <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">
                      Assegnato a: {a.assigned_companies.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <span className="font-mono text-[rgba(6,3,43,0.40)]">{a.pending_reviews} review in coda</span>
                  <span className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] font-medium',
                    a.status === 'active'
                      ? 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]'
                      : 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]',
                  )}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-1.5">
          Advisor-reviewed ≠ KORA Certified. Gli advisor eseguono Advisor Process Audit — non validazione azione per azione.
        </p>
      </div>

      {/* ── 11. Boundary block ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.62)] mb-1.5">Perimetro KORA Activation Network</p>
        <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          KORA Activation Network non è un marketplace. Non mostra prezzi, non classifica partner,
          non abilita pagamenti, non espone dati individuali e non pubblica ranking territoriali.
          In Foundation Light è una preview sintetica della copertura ecosistemica.
        </p>
        <p className="mt-2 text-[10px] font-mono text-[rgba(6,3,43,0.28)]">
          synthetic_demo_data: true · no_marketplace: true · no_pricing: true · no_geolocation: true · no_public_ranking: true
        </p>
      </div>

      {/* ── 12. Cross-links ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Navigazione correlata
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { label: 'Activation Debt — /company/activation', note: 'Richiede accesso KORA_ADMIN (area live)' },
            { label: 'Advisor Workspace — /demo/advisor',      note: 'Disponibile nell\'area demo' },
            { label: 'Partner Workspace — /partner',           note: 'Richiede accesso KORA_ADMIN (area live)' },
            { label: 'Future Vision — /demo/future-vision',    note: 'Disponibile nell\'area demo' },
          ].map((link) => (
            <div key={link.label} className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2">
              <p className="text-xs font-medium text-[rgba(6,3,43,0.62)]">{link.label}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">{link.note}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
