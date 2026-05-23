import type { BudgetToHumanImpactRecord, BudgetToHumanImpactRecommendation } from '@/lib/types';
import type { EligibilityGateSummary } from '@/services/ingestion-simulator/IngestionSimulatorService';

interface Props {
  s1Record: BudgetToHumanImpactRecord | undefined;
  s2Record: BudgetToHumanImpactRecord | undefined;
  recommendations: BudgetToHumanImpactRecommendation[];
  eligibilityGate: EligibilityGateSummary;
}

interface RiskItem { label: string; detail: string; severity: 'high' | 'medium'; }
interface OpportunityItem { label: string; detail: string; }
interface ActionItem { label: string; detail: string; }

const PRIORITY_STYLES: Record<string, string> = {
  alta:  'border-l-rose-400 bg-rose-50',
  media: 'border-l-amber-400 bg-amber-50',
  bassa: 'border-l-slate-300 bg-slate-50',
};
const PRIORITY_TAG: Record<string, string> = {
  alta:  'text-rose-700 bg-rose-100 border-rose-200',
  media: 'text-amber-700 bg-amber-100 border-amber-200',
  bassa: 'text-slate-600 bg-slate-100 border-slate-200',
};

function fmt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function ActionPlanReport({ s1Record, s2Record, recommendations, eligibilityGate }: Props) {
  const activeRecord = s2Record ?? s1Record;

  // Build dynamic risks from service data
  const risks: RiskItem[] = [];
  if (activeRecord) {
    if (activeRecord.economic_relief_share >= 0.25) {
      risks.push({
        label: 'Economic Relief ancora materiale',
        detail: `${Math.round(activeRecord.economic_relief_share * 100)}% della spesa welfare non genera Impact Units. Residuo di ${fmt(activeRecord.economic_relief_spend)} in benefit economici non convertiti.`,
        severity: activeRecord.economic_relief_share >= 0.40 ? 'high' : 'medium',
      });
    }
    if (activeRecord.activation_debt_eur > 0) {
      risks.push({
        label: 'Activation Debt residuo',
        detail: `${fmt(activeRecord.activation_debt_eur)} di budget welfare non ancora convertito in attivazione verificata.`,
        severity: activeRecord.activation_debt_eur > 40000 ? 'high' : 'medium',
      });
    }
    if (activeRecord.equity_of_spend < 0.50) {
      risks.push({
        label: 'Equity of Spend sotto soglia',
        detail: `Distribuzione della spesa welfare non equa tra segmenti della workforce (${Math.round(activeRecord.equity_of_spend * 100)}%). Rischio concentrazione in cluster già privilegiati.`,
        severity: 'medium',
      });
    }
    if (activeRecord.pillar_investment_balance < 0.50) {
      risks.push({
        label: 'Pillar Investment sbilanciato',
        detail: `Distribuzione degli investimenti tra pillar KORA non bilanciata (${Math.round(activeRecord.pillar_investment_balance * 100)}%). Pillar LEGACY e CONNECTION tipicamente sotto-investiti.`,
        severity: 'medium',
      });
    }
  }
  if (eligibilityGate.blocked_count > 0) {
    risks.push({
      label: 'Tentativi di upload Blocked — validazione necessaria',
      detail: `${eligibilityGate.blocked_count} righe classificate Blocked (compliance/HSE/legal). Verificare che la classificazione sia corretta e che la spesa obbligatoria non sia confusa con spesa welfare attivabile.`,
      severity: 'medium',
    });
  }

  // Build dynamic opportunities from service data
  const opportunities: OpportunityItem[] = [];
  if (activeRecord?.reallocation_opportunity_eur) {
    opportunities.push({
      label: 'Reallocation Opportunity — riorientamento budget',
      detail: `${fmt(activeRecord.reallocation_opportunity_eur)} in economic_relief potenzialmente riorientabili verso iniziative di deep_activation. Anche solo il 50% potrebbe aumentare significativamente il volume di IU verificate per euro investito.`,
    });
  }
  if (activeRecord && activeRecord.deep_activation_by_pillar) {
    const pillars = Object.entries(activeRecord.deep_activation_by_pillar) as [string, number][];
    const lowPillars = pillars.filter(([, v]) => v < 0.15).map(([k]) => k);
    if (lowPillars.length > 0) {
      opportunities.push({
        label: `Pillar sotto-investiti — ${lowPillars.join(', ')}`,
        detail: `Aumentare deep_activation in ${lowPillars.join(', ')} per migliorare Pillar Coverage (PC) e Pillar Balance (PB) — entrambi nel macroblock EQUITY.`,
      });
    }
  }
  if (activeRecord && activeRecord.equity_of_spend < 0.60) {
    opportunities.push({
      label: 'Riduzione concentrazione attivazione',
      detail: 'Estendere programmi a sedi, reparti e fasce contrattuali con AR sotto soglia. Equity (EQ) misura la distribuzione tra segmenti — non la qualità delle evidenze.',
    });
  }
  if (s1Record && s2Record) {
    opportunities.push({
      label: 'Continuità del miglioramento S2',
      detail: `Il pattern S1→S2 dimostra che la riallocazione parziale funziona. Continuare nella direzione S2 con obiettivi specifici per CO (Continuity) e VR (Verification Rate).`,
    });
  }

  // 90-day plan phases
  const phase0_30: ActionItem[] = [
    { label: 'Validare mappatura eligibility', detail: 'Confermare con HR/Finance/ESG la classificazione Blocked/Limited/Eligible per le categorie di spesa welfare principali.' },
    { label: 'Identificare top categorie a bassa attivazione', detail: 'Analizzare spend_by_pillar e deep_activation_by_pillar per individuare le categorie con il gap maggiore tra spesa e IU generate.' },
    { label: 'Revisione Activation Debt', detail: activeRecord ? `Analizzare ${fmt(activeRecord.activation_debt_eur)} di budget non convertito: identificare cause (budget non speso vs. spesa non attivante).` : 'Analizzare composizione Activation Debt per categoria e pillar.' },
  ];

  const phase30_60: ActionItem[] = [
    { label: 'Riallocazione parziale Economic Relief', detail: activeRecord ? `Riorientare almeno il 30-50% dei ${fmt(activeRecord.economic_relief_spend)} in economic_relief verso programmi di deep_activation identificati.` : 'Riorientare quota Economic Relief verso programmi deep_activation.' },
    { label: 'Attivare sedi/cluster sotto-rappresentati', detail: 'Avviare programmi pillar LIFE, GROWTH e CONNECTION nelle unità organizzative con AR più basso, sopra soglia privacy (≥10 lavoratori).' },
    { label: 'Rafforzare partner verificati', detail: 'Aggiungere o potenziare i partner che erogano servizi verificabili — aumenta VR (Verification Rate) nel macroblock QUALITY.' },
  ];

  const phase60_90: ActionItem[] = [
    { label: 'Misurare variazione attivazione', detail: 'Confrontare AR, MAR e Macroblock QUALITY prima e dopo le azioni di riallocazione. Il segnale atteso è: costo per IU in calo, deep_activation_share in crescita.' },
    { label: 'Revisione Activation Debt e Reallocation Opportunity', detail: activeRecord ? `Verificare se ${fmt(activeRecord.activation_debt_eur)} Activation Debt si è ridotto e se la Reallocation Opportunity residua (${fmt(activeRecord.reallocation_opportunity_eur)}) è diminuita.` : 'Aggiornare stima Activation Debt e Reallocation Opportunity.' },
    { label: 'Preparare nota Board/ESG', detail: 'Aggregare l\'evoluzione KORA Index S1→S2→S3 in una nota direzionale: escludere claim causali, includere CS e calibration_status. Correlazione ≠ causalità.' },
  ];

  return (
    <div className="space-y-5">

      {/* ── F. Top Risks ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">F — Top Rischi / Gap Prioritari</p>
        {risks.length === 0 ? (
          <p className="text-sm text-slate-400">Nessun rischio significativo identificato per questo scenario.</p>
        ) : (
          <div className="space-y-3">
            {risks.map((r, i) => (
              <div key={i} className={`rounded-lg border bg-white border-l-4 pl-4 pr-4 py-3 ${r.severity === 'high' ? 'border-l-rose-400' : 'border-l-amber-400'}`}>
                <div className="flex items-start gap-2">
                  <span className={`shrink-0 mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold ${r.severity === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {r.severity === 'high' ? 'Alta' : 'Media'}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{r.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{r.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── G. Top Opportunities ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">G — Top Opportunità</p>
        {opportunities.length === 0 ? (
          <p className="text-sm text-slate-400">Dati insufficienti per identificare opportunità strutturali.</p>
        ) : (
          <div className="space-y-3">
            {opportunities.map((o, i) => (
              <div key={i} className="rounded-lg border border-emerald-100 bg-emerald-50 border-l-4 border-l-emerald-400 pl-4 pr-4 py-3">
                <p className="text-xs font-semibold text-emerald-800">{o.label}</p>
                <p className="text-xs text-emerald-700 leading-relaxed mt-0.5">{o.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recommendations from BTI service ── */}
      {recommendations.length > 0 && (
        <div className="rounded-xl border border-indigo-100 bg-white p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Raccomandazioni BTI — Direzionali</p>
            <p className="text-[11px] text-slate-400 mt-1">Correlazione ≠ causalità — potenziale non garantito</p>
          </div>
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <div key={i} className={`rounded-lg border-l-4 pl-4 pr-4 py-3 ${PRIORITY_STYLES[r.priority] ?? 'bg-slate-50 border-l-slate-300'}`}>
                <div className="flex items-start gap-2">
                  <span className={`shrink-0 mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_TAG[r.priority] ?? ''}`}>
                    {r.priority.toUpperCase()}
                  </span>
                  {r.target_macroblock && (
                    <span className="shrink-0 mt-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                      {r.target_macroblock}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-1.5">{r.action_it}</p>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{r.expected_signal_it}</p>
                {r.budget_note && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{r.budget_note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── H. 90-Day Action Plan ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">H — Piano d&apos;Azione 90 Giorni</p>
          <p className="text-xs text-slate-400 mt-1">
            Piano direzionale derivato da KORA Index v3 e dati BTI — non un mandato operativo.
            Ogni azione richiede valutazione nel contesto organizzativo specifico.
          </p>
        </div>

        {/* Phase 0–30 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-700 text-white text-[10px] font-bold px-2.5 py-0.5">0–30 giorni</span>
            <p className="text-xs font-semibold text-slate-600">Diagnosi e Validazione</p>
          </div>
          <div className="ml-4 space-y-2">
            {phase0_30.map((a, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="shrink-0 font-bold text-slate-400">{i + 1}.</span>
                <div>
                  <p className="font-semibold text-slate-700">{a.label}</p>
                  <p className="text-slate-500 leading-relaxed">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Phase 30–60 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5">30–60 giorni</span>
            <p className="text-xs font-semibold text-slate-600">Riallocazione e Attivazione</p>
          </div>
          <div className="ml-4 space-y-2">
            {phase30_60.map((a, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="shrink-0 font-bold text-indigo-300">{i + 1}.</span>
                <div>
                  <p className="font-semibold text-slate-700">{a.label}</p>
                  <p className="text-slate-500 leading-relaxed">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Phase 60–90 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5">60–90 giorni</span>
            <p className="text-xs font-semibold text-slate-600">Misurazione e Board Report</p>
          </div>
          <div className="ml-4 space-y-2">
            {phase60_90.map((a, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="shrink-0 font-bold text-emerald-400">{i + 1}.</span>
                <div>
                  <p className="font-semibold text-slate-700">{a.label}</p>
                  <p className="text-slate-500 leading-relaxed">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 leading-relaxed">
          Le azioni raccomandate sono direzionali — potenziale non garantito. Correlazione ≠ causalità.
          Priorità e effort da valutare nel contesto organizzativo specifico di Meridiana Group.
        </p>
      </div>
    </div>
  );
}
