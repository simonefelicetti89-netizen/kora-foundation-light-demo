// Rule-based intelligence layer on top of BTI data.
// No external LLM calls — all text is generated deterministically from data values (CLAUDE.md §11).
// Privacy: aggregate-only inputs, no PIB, no worker-level data (CLAUDE.md §13, D-04).

import type { BudgetToHumanImpactRecord, PillarCode, KoraRole } from '@/lib/types';
import { PILLAR_LABELS } from '@/lib/constants/kora';
import { lifeDiversityService, LIFE_SUBCATEGORY_META } from '@/services/life-diversity/LifeDiversityService';
import type { LifeDiversitySummary } from '@/services/life-diversity/LifeDiversityService';

const ALLOWED_ROLES: ReadonlySet<KoraRole> = new Set<KoraRole>([
  'KORA_ADMIN',
  'COMPANY_ADMIN',
  'COMPANY_VIEWER',
]);

export type PillarInvestmentStatus = 'over_concentrated' | 'balanced' | 'under_invested';

export interface PillarInvestmentClassification {
  pillar: PillarCode;
  label: string;
  budgetShare: number;
  deepActivationShare: number;
  deepActivationConversionRate: number;
  status: PillarInvestmentStatus;
  reason: string;
}

export interface ReallocationWhyReason {
  driver: string;
  evidence: string;
  contribution: 'primary' | 'secondary';
}

export interface ReallocationWhyTrace {
  totalOpportunity: number;
  currency: string;
  reasons: ReallocationWhyReason[];
}

export interface BTIIntelligenceSummary {
  executiveNarrative: string;
  reallocationAnalysis: ReallocationWhyTrace;
  pillarClassifications: PillarInvestmentClassification[];
  costPerIUConfidence: 'alta' | 'media' | 'bassa';
  costPerIUNote: string;
  pillarInvestmentBalanceSignal: 'bilanciato' | 'moderato' | 'sbilanciato';
  // B68-B: LIFE Diversity Intelligence™ — additive layer, not_kora_index_component
  lifeDiversityProfile: LifeDiversitySummary | null;
}

const PILLAR_ORDER: PillarCode[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];

export class BTIIntelligenceService {
  canAccess(role: KoraRole): boolean {
    return ALLOWED_ROLES.has(role);
  }

  compute(record: BudgetToHumanImpactRecord, role: KoraRole): BTIIntelligenceSummary | null {
    if (!this.canAccess(role)) return null;

    // B68-B: compute LIFE diversity profile first — passed to reallocation analysis for enrichment
    const lifeDiversityProfile = lifeDiversityService.computeFromBTI(record, role);

    return {
      executiveNarrative:          this.buildExecutiveNarrative(record),
      reallocationAnalysis:        this.buildReallocationAnalysis(record, lifeDiversityProfile),
      pillarClassifications:       this.buildPillarClassifications(record),
      costPerIUConfidence:         this.buildCostPerIUConfidence(record),
      costPerIUNote:               this.buildCostPerIUNote(record),
      pillarInvestmentBalanceSignal: this.buildPillarBalanceSignal(record),
      lifeDiversityProfile,
    };
  }

  private buildExecutiveNarrative(r: BudgetToHumanImpactRecord): string {
    const reliefPct = Math.round(r.economic_relief_share * 100);
    const deepPct   = Math.round(r.deep_activation_share * 100);
    const cpiu      = r.cost_per_impact_unit.toFixed(1);
    const debt      = r.activation_debt_eur.toLocaleString('it-IT');
    const score     = r.bti_score;

    if (score < 35) {
      return `Il ${reliefPct}% della spesa è concentrato in benefit monetari che non generano Impact Units — segnale che la composizione welfare non è ancora orientata all'attivazione profonda. Il costo per Impact Unit è €${cpiu}: ogni unità di attivazione verificata richiede un investimento significativo, ma la leva principale non è la spesa assoluta bensì la sua composizione. L'Activation Debt di €${debt} indica budget non convertito nel periodo — ridurre la quota benefit monetari verso programmi eligible è la priorità operativa.`;
    }

    if (score < 65) {
      return `La composizione del budget mostra una direzione positiva: il ${deepPct}% è orientato all'attivazione profonda. Il costo per Impact Unit è €${cpiu} — in miglioramento rispetto alla fase iniziale. L'Activation Debt residuo di €${debt} e la quota di benefit monetari (${reliefPct}%) rappresentano i margini di ottimizzazione prioritari per il prossimo periodo.`;
    }

    return `Il budget è efficacemente orientato all'attivazione profonda: il ${deepPct}% genera Impact Units verificati e il costo per Impact Unit è €${cpiu}. La quota di benefit monetari si è ridotta al ${reliefPct}% — la direzione è corretta. I margini residui riguardano la conversione dell'Activation Debt (€${debt}) e il completamento della copertura su pillar sotto-investiti.`;
  }

  private buildReallocationAnalysis(
    r: BudgetToHumanImpactRecord,
    lifeDiversity?: LifeDiversitySummary | null,
  ): ReallocationWhyTrace {
    const reasons: ReallocationWhyReason[] = [];
    const total = r.total_people_welfare_budget;
    const spendByPillar = r.spend_by_pillar as Record<string, number>;

    if (r.economic_relief_share >= 0.40) {
      const reliefEur = r.economic_relief_spend.toLocaleString('it-IT');
      reasons.push({
        driver: 'Concentrazione in benefit monetari',
        evidence: `€${reliefEur} (${Math.round(r.economic_relief_share * 100)}% della spesa) classificati Limited all'Eligibility Gate — non generano Impact Units`,
        contribution: 'primary',
      });
    } else if (r.economic_relief_share >= 0.20) {
      const reliefEur = r.economic_relief_spend.toLocaleString('it-IT');
      reasons.push({
        driver: 'Quota benefit monetari residua',
        evidence: `€${reliefEur} (${Math.round(r.economic_relief_share * 100)}%) ancora in economic relief — conversione progressiva raccomandata`,
        contribution: 'secondary',
      });
    }

    const lifeSpend = spendByPillar['LIFE'] ?? 0;
    const lifeShare = total > 0 ? lifeSpend / total : 0;
    if (lifeShare >= 0.40) {
      reasons.push({
        driver: 'Concentrazione pillar LIFE',
        evidence: `LIFE assorbe il ${Math.round(lifeShare * 100)}% del budget — squilibrio rispetto al portfolio 5-pillar. Ridurre la concentrazione libera risorse per pillar a bassa copertura.`,
        contribution: 'primary',
      });
    }

    const underPillars: string[] = [];
    for (const p of PILLAR_ORDER) {
      const s  = spendByPillar[p] ?? 0;
      const sh = total > 0 ? s / total : 0;
      if (sh < 0.08) underPillars.push(PILLAR_LABELS[p] ?? p);
    }
    if (underPillars.length > 0) {
      reasons.push({
        driver: 'Pillar sotto-investiti',
        evidence: `${underPillars.join(', ')} — copertura insufficiente per generare un segnale misurabile. Budget minimo stimato: €8.000–12.000 per pillar per generare IU verificati.`,
        contribution: underPillars.length >= 2 ? 'primary' : 'secondary',
      });
    }

    if (r.activation_debt_eur > 0) {
      const debtEur = r.activation_debt_eur.toLocaleString('it-IT');
      reasons.push({
        driver: 'Budget non convertito (Activation Debt)',
        evidence: `€${debtEur} di budget welfare non convertito in attivazione verificata nel periodo — potenziale direttamente riorientabile verso programmi eligible`,
        contribution: reasons.filter((x) => x.contribution === 'primary').length === 0 ? 'primary' : 'secondary',
      });
    }

    // B68-B: LIFE intra-pillar concentration driver — only when LIFE share is high and diversity is low
    if (
      lifeDiversity &&
      lifeDiversity.concentrationStatus !== 'no_life_data' &&
      lifeShare >= 0.40 &&
      lifeDiversity.diversityScore < 0.30
    ) {
      const activeSub = lifeDiversity.activeSubcategories.length;
      const domLabel = lifeDiversity.dominantSubcategory
        ? (LIFE_SUBCATEGORY_META[lifeDiversity.dominantSubcategory]?.label ?? lifeDiversity.dominantSubcategory)
        : 'singola subcategoria';
      reasons.push({
        driver: 'Concentrazione intra-pillar LIFE',
        evidence: `Portfolio LIFE concentrato in ${activeSub} su 10 subcategorie disponibili (LIFE Diversity Score: ${Math.round(lifeDiversity.diversityScore * 100)}% — dominante: ${domLabel}). Riallocare all'interno del pillar LIFE verso subcategorie mancanti aumenta la profondità di attivazione senza incrementare la spesa totale.`,
        contribution: 'secondary',
      });
    }

    return {
      totalOpportunity: r.reallocation_opportunity_eur,
      currency: r.currency,
      reasons,
    };
  }

  private buildPillarClassifications(r: BudgetToHumanImpactRecord): PillarInvestmentClassification[] {
    const total         = r.total_people_welfare_budget;
    const spendByPillar = r.spend_by_pillar          as Record<string, number>;
    const deepByPillar  = r.deep_activation_by_pillar as Record<string, number>;
    const totalDeep     = PILLAR_ORDER.reduce((acc, p) => acc + (deepByPillar[p] ?? 0), 0);

    return PILLAR_ORDER.map((p) => {
      const budget  = spendByPillar[p] ?? 0;
      const deep    = deepByPillar[p]  ?? 0;
      const budgetShare  = total      > 0 ? budget / total      : 0;
      const deepShare    = totalDeep  > 0 ? deep   / totalDeep  : 0;
      const convRate     = budget     > 0 ? deep   / budget     : 0;

      let status: PillarInvestmentStatus;
      let reason: string;

      if (budgetShare >= 0.40) {
        status = 'over_concentrated';
        reason = `${Math.round(budgetShare * 100)}% del budget — concentrazione elevata, rischio di squilibrio portfolio`;
      } else if (budgetShare < 0.08) {
        status = 'under_invested';
        reason = budget === 0
          ? 'Nessuna spesa nel periodo — pillar inattivo'
          : `${Math.round(budgetShare * 100)}% del budget — sotto soglia di segnale misurabile`;
      } else {
        status = 'balanced';
        reason = `${Math.round(budgetShare * 100)}% del budget — distribuzione equilibrata nel portfolio`;
      }

      return {
        pillar: p,
        label: PILLAR_LABELS[p] ?? p,
        budgetShare,
        deepActivationShare: deepShare,
        deepActivationConversionRate: convRate,
        status,
        reason,
      };
    });
  }

  private buildCostPerIUConfidence(r: BudgetToHumanImpactRecord): 'alta' | 'media' | 'bassa' {
    if (r.cost_per_impact_unit <= 15) return 'alta';
    if (r.cost_per_impact_unit <= 30) return 'media';
    return 'bassa';
  }

  private buildCostPerIUNote(r: BudgetToHumanImpactRecord): string {
    const cpiu = r.cost_per_impact_unit.toFixed(1);

    if (r.cost_per_impact_unit <= 15) {
      return `€${cpiu} per Impact Unit verificata — efficienza elevata. Il budget è ben orientato verso attivazioni profonde certificate da dati di qualità. Solo budget-mediated — le IU generate da policy strutturali sono escluse dal denominatore per preservare l'integrità della metrica.`;
    }
    if (r.cost_per_impact_unit <= 30) {
      return `€${cpiu} per Impact Unit — efficienza media. Esiste margine di riallocazione verso programmi eligible a maggiore profondità. Spostare budget da benefit monetari (economic relief) a programmi attivanti riduce il costo per IU senza incrementare la spesa totale.`;
    }
    return `€${cpiu} per Impact Unit — costo elevato, segnale di composizione budget da ottimizzare. La leva principale non è la spesa assoluta: riorienta la quota in benefit monetari verso programmi eligible. Il costo per IU è inversamente correlato alla quota di deep activation spend.`;
  }

  private buildPillarBalanceSignal(r: BudgetToHumanImpactRecord): 'bilanciato' | 'moderato' | 'sbilanciato' {
    if (r.pillar_investment_balance >= 0.60) return 'bilanciato';
    if (r.pillar_investment_balance >= 0.35) return 'moderato';
    return 'sbilanciato';
  }
}

export const btiIntelligenceService = new BTIIntelligenceService();
