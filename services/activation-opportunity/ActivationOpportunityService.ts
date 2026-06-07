// Activation Opportunity Engine — deterministic, rule-based, no AI, no LLM.
// Transforms KORA diagnostic signals into prioritized, explainable action recommendations.
//
// Architecture: additive intelligence layer — does NOT modify KORA Index, IU, CS, or any formula.
// Every opportunity is derived from a named rule applied to a named signal.
// Privacy: aggregate-only inputs. No individual worker data. No PIB references.
// methodology_status: pre_empirical_calibration
// not_kora_index_component: true

import type { KoraIndexOutput, CompanyAggregateExtended, PillarCode } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OpportunityPriority = 'critical' | 'high' | 'medium' | 'low';
export type OpportunityCategory = 'reach' | 'quality' | 'equity' | 'bti' | 'worker_space' | 'evidence';

export interface ActivationOpportunity {
  id:                string;
  ruleId:            string;
  title:             string;
  description:       string;
  pillar:            PillarCode | 'COMPANY' | 'ALL';
  priority:          OpportunityPriority;
  expectedImpact:    string;
  sourceSignal:      string;    // "Rilevato perché: ..."
  recommendedAction: string;
  category:          OpportunityCategory;
}

// Flat signal interface — no dependency on KoraIndexOutput or CompanyAggregateExtended.
// Allows calling from server-side Decision Pack template without importing full scoring chain.
export interface OpportunitySignals {
  safeguardStatus:           'CLEAR' | 'WARNING' | 'FLAGGED';
  confidenceScore:           number;   // CS (0–1, external to KORA Index)
  // Component values (0–1)
  ar:  number;   // Activation Rate
  mar: number;   // Meaningful Activation Rate
  ni:  number;   // Normalized Intensity
  wb:  number;   // Worker Balance
  pc:  number;   // Pillar Coverage
  pb:  number;   // Pillar Balance
  eq:  number;   // Equity
  vr:  number;   // Verification Rate
  co:  number;   // Continuity
  // Aggregate
  totalWorkers:             number;
  activationRate:           number;  // same as ar when available from aggregate
  meaningfulActivationRate: number;
  pillarDistribution:       Partial<Record<string, number>>;  // raw IU values per pillar
  economicReliefShare?:     number;   // 0–1, from BTI if available
}

// ── Priority sort order ────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<OpportunityPriority, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
};

// ── Pillar share computation ───────────────────────────────────────────────────

function pillarShares(dist: Partial<Record<string, number>>): Record<string, number> {
  const PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
  const total = PILLARS.reduce((s, p) => s + (dist[p] ?? 0), 0);
  if (total === 0) return Object.fromEntries(PILLARS.map(p => [p, 0]));
  return Object.fromEntries(PILLARS.map(p => [p, (dist[p] ?? 0) / total]));
}

function dominantPillar(shares: Record<string, number>): { pillar: string; share: number } {
  let best = { pillar: 'LIFE', share: 0 };
  for (const [p, s] of Object.entries(shares)) {
    if (s > best.share) best = { pillar: p, share: s };
  }
  return best;
}

function weakestPillar(shares: Record<string, number>): { pillar: string; share: number } {
  let worst = { pillar: 'LEGACY', share: 1 };
  for (const [p, s] of Object.entries(shares)) {
    if (s < worst.share) worst = { pillar: p, share: s };
  }
  return worst;
}

// ── Rule engine ────────────────────────────────────────────────────────────────
// Each rule: condition + opportunity factory. Deterministic — no randomness.

type RuleCheck = (s: OpportunitySignals, shares: Record<string, number>) => ActivationOpportunity | null;

const RULES: RuleCheck[] = [

  // ── R-01: SAFEGUARD FLAGGED ────────────────────────────────────────────────
  (s) => s.safeguardStatus !== 'FLAGGED' ? null : ({
    id:                'opp-r01',
    ruleId:            'R-01',
    title:             'Activation Safeguard FLAGGED — intervento urgente',
    description:       'Lo stato Activation Safeguard è FLAGGED. Uno o più parametri primari sono sotto la soglia minima operativa. Il KORA Index non è utilizzabile per decisioni gestionali senza una revisione del perimetro di attivazione.',
    pillar:            'ALL',
    priority:          'critical',
    expectedImpact:    'Riportare l\'organizzazione in zona CLEAR o WARNING attraverso un piano di attivazione strutturato è il prerequisito per qualsiasi lettura significativa del KORA Index.',
    sourceSignal:      `Rilevato perché: Activation Safeguard = FLAGGED — AR ${Math.round(s.ar * 100)}%, MAR ${Math.round(s.mar * 100)}%. Almeno una soglia minima (AR < 20% o MAR < 15%) non è raggiunta.`,
    recommendedAction: 'Avviare un piano di attivazione d\'emergenza: identificare le aree con zero partecipazione, avviare almeno un programma per pillar, e verificare il perimetro della forza lavoro inclusa nel calcolo.',
    category:          'reach',
  }),

  // ── R-02: CRITICAL AR ──────────────────────────────────────────────────────
  (s) => s.ar >= 0.20 ? null : ({
    id:                'opp-r02',
    ruleId:            'R-02',
    title:             'Copertura workforce critica — meno del 20% partecipa',
    description:       `Solo il ${Math.round(s.ar * 100)}% della forza lavoro ha almeno un evento attivato nel periodo. La grande maggioranza dei lavoratori non è raggiunta da nessun programma.`,
    pillar:            'COMPANY',
    priority:          'critical',
    expectedImpact:    'Ogni punto percentuale di AR guadagnato porta un segmento della forza lavoro all\'interno del perimetro di attivazione misurabile.',
    sourceSignal:      `Rilevato perché: Activation Rate (AR) = ${Math.round(s.ar * 100)}% — sotto la soglia critica del 20% (Activation Safeguard FLAGGED threshold).`,
    recommendedAction: 'Mappare i reparti con AR = 0. Avviare un programma pilota su almeno 2 pillar per i segmenti non raggiunti. Verificare se l\'esclusione è strutturale (ruoli specifici) o operativa (comunicazione).',
    category:          'reach',
  }),

  // ── R-03: CRITICAL MAR ────────────────────────────────────────────────────
  (s) => s.mar >= 0.15 ? null : ({
    id:                'opp-r03',
    ruleId:            'R-03',
    title:             'Attivazione profonda assente — meno del 15% ha impatto significativo',
    description:       `Solo il ${Math.round(s.mar * 100)}% dei lavoratori supera la soglia di attivazione significativa. L\'organizzazione è presente sulla carta ma non attiva in profondità.`,
    pillar:            'COMPANY',
    priority:          'critical',
    expectedImpact:    'Aumentare il MAR è il segnale più importante per il KORA Index. Il MAR misura l\'attivazione reale, non solo la presenza nominale nei programmi.',
    sourceSignal:      `Rilevato perché: Meaningful Activation Rate (MAR) = ${Math.round(s.mar * 100)}% — sotto la soglia critica del 15% (Activation Safeguard FLAGGED threshold).`,
    recommendedAction: 'Spostare l\'investimento da programmi ad ampia copertura (voucher, fringe) verso programmi ad alta intensità (formazione strutturata, mentoring, wellbeing attivo). Verificare la profondità media delle attivazioni esistenti.',
    category:          'reach',
  }),

  // ── R-04: LOW AR (WARNING ZONE) ───────────────────────────────────────────
  (s) => (s.ar < 0.20 || s.ar >= 0.40) ? null : ({
    id:                'opp-r04',
    ruleId:            'R-04',
    title:             'Reach insufficiente — meno del 40% della forza lavoro',
    description:       `Il ${Math.round(s.ar * 100)}% di copertura è in zona WARNING. L\'organizzazione non ha ancora raggiunto la soglia CLEAR (40%). Una quota significativa della forza lavoro non è inclusa nell\'attivazione.`,
    pillar:            'COMPANY',
    priority:          'high',
    expectedImpact:    'Portare l\'AR al 40% o oltre sblocca lo stato CLEAR dell\'Activation Safeguard e migliora significativamente il macroblocco Activation Reach (peso 25% KORA Index).',
    sourceSignal:      `Rilevato perché: Activation Rate (AR) = ${Math.round(s.ar * 100)}% — nella zona WARNING (20%–40%). La soglia CLEAR richiede AR ≥ 40%.`,
    recommendedAction: 'Analizzare i segmenti con attivazione nulla o bassa. Prioritizzare l\'inclusione di reparti non raggiunti. Considerare programmi strutturali (policy time & flexibility) che coprono automaticamente l\'intera popolazione.',
    category:          'reach',
  }),

  // ── R-05: LOW MAR (WARNING ZONE) ──────────────────────────────────────────
  (s) => (s.mar < 0.15 || s.mar >= 0.30) ? null : ({
    id:                'opp-r05',
    ruleId:            'R-05',
    title:             'Attivazione profonda in zona WARNING',
    description:       `Il Meaningful Activation Rate del ${Math.round(s.mar * 100)}% è in zona WARNING. La soglia CLEAR richiede MAR ≥ 30%. I programmi esistenti coprono la forza lavoro ma non generano ancora impatto profondo significativo.`,
    pillar:            'COMPANY',
    priority:          'high',
    expectedImpact:    'Portare il MAR al 30% è il requisito per lo stato CLEAR. Il MAR ha impatto diretto sul macroblocco Activation Reach (peso 25% KORA Index).',
    sourceSignal:      `Rilevato perché: Meaningful Activation Rate (MAR) = ${Math.round(s.mar * 100)}% — nella zona WARNING (15%–30%). La soglia CLEAR richiede MAR ≥ 30%.`,
    recommendedAction: 'Trasformare programmi a bassa intensità in percorsi strutturati multi-sessione. Verificare la profondità delle attivazioni welfare esistenti. Introdurre programmi formativi con certificazione o valutazione.',
    category:          'reach',
  }),

  // ── R-06: SAFEGUARD WARNING (without FLAGGED) ─────────────────────────────
  (s) => s.safeguardStatus !== 'WARNING' ? null : ({
    id:                'opp-r06',
    ruleId:            'R-06',
    title:             'Activation Safeguard WARNING — piano di rientro richiesto',
    description:       'Lo stato Activation Safeguard è WARNING. Uno o più parametri di copertura non raggiungono ancora i requisiti per lo stato CLEAR. Il KORA Index è disponibile ma con limitazioni interpretative.',
    pillar:            'COMPANY',
    priority:          'high',
    expectedImpact:    'Raggiungere lo stato CLEAR consente un\'interpretazione piena del KORA Index e rimuove il vincolo WARNING dalla lettura dei macroblocchi.',
    sourceSignal:      `Rilevato perché: Activation Safeguard = WARNING — AR ${Math.round(s.ar * 100)}%, MAR ${Math.round(s.mar * 100)}%. Almeno un parametro non raggiunge la soglia CLEAR.`,
    recommendedAction: 'Definire un piano di rientro trimestrale. Identificare il parametro più distante dalla soglia CLEAR (AR o MAR) e concentrare le risorse su quello specifico gap.',
    category:          'reach',
  }),

  // ── R-07: HIGH ECONOMIC RELIEF GAP ────────────────────────────────────────
  (s) => ((s.ar - s.mar) <= 0.20) ? null : ({
    id:                'opp-r07',
    ruleId:            'R-07',
    title:             'Alta quota di economic relief — riallocare verso attivazione profonda',
    description:       `Il gap AR−MAR di ${Math.round((s.ar - s.mar) * 100)} punti percentuali indica che una quota significativa dell\'attivazione è generata da benefit economici (voucher, fringe benefit) che non producono attivazione profonda.`,
    pillar:            'COMPANY',
    priority:          'high',
    expectedImpact:    'Ridurre il gap AR−MAR avvicinando i due parametri indica che l\'attivazione è più reale e meno legata a benefit economici diffusi. Migliora il rapporto BTI e la qualità del KORA Index.',
    sourceSignal:      `Rilevato perché: gap AR−MAR = ${Math.round((s.ar - s.mar) * 100)}pp — sopra la soglia di attenzione del 20pp. AR ${Math.round(s.ar * 100)}% vs MAR ${Math.round(s.mar * 100)}%.`,
    recommendedAction: 'Analizzare la distribuzione del budget: identificare la quota di spesa in economic relief (EligibilityClass=limited). Considerare la conversione di parte del budget voucher in programmi welfare strutturati con deep activation.',
    category:          'bti',
  }),

  // ── R-08: LOW VERIFICATION RATE ───────────────────────────────────────────
  (s) => s.vr >= 0.50 ? null : ({
    id:                'opp-r08',
    ruleId:            'R-08',
    title:             'Qualità evidenza bassa — Verification Rate insufficiente',
    description:       `Il Verification Rate (VR) del ${Math.round(s.vr * 100)}% indica che meno della metà degli Impact Unit è supportata da evidenza verificata o parzialmente verificata. Alta quota di attivazione autodichiarata.`,
    pillar:            'COMPANY',
    priority:          'high',
    expectedImpact:    'Aumentare il VR migliora la componente Activation Quality (peso 30% KORA Index). Evidenza più forte aumenta il fattore EV nella formula IU, producendo Impact Unit di qualità superiore.',
    sourceSignal:      `Rilevato perché: Verification Rate (VR) = ${Math.round(s.vr * 100)}% — sotto la soglia operativa del 50%. Il VR misura la quota di IU supportata da evidenza verificata (L2/L3/L4).`,
    recommendedAction: 'Richiedere report di partecipazione ai fornitori welfare e LMS. Chiedere all\'Advisor di completare la revisione UEF dei record pendenti. Convertire evidenza autodichiarata (L1) in documentata (L2→L3).',
    category:          'evidence',
  }),

  // ── R-09: LOW EQUITY ──────────────────────────────────────────────────────
  (s) => s.eq >= 0.45 ? null : ({
    id:                'opp-r09',
    ruleId:            'R-09',
    title:             'Equity distributiva insufficiente — accesso diseguale',
    description:       `La componente Equity (EQ = ${Math.round(s.eq * 100)}%) indica che l\'attivazione è sistematicamente concentrata in segmenti già privilegiati o ad alta partecipazione. I gruppi sottorappresentati non sono raggiunti equamente.`,
    pillar:            'COMPANY',
    priority:          'high',
    expectedImpact:    'Aumentare l\'EQ migliora il macroblocco Distribution & Equity (peso 25% KORA Index). Un\'attivazione più equa riflette un impatto organizzativo più genuino e strutturale.',
    sourceSignal:      `Rilevato perché: Equity (EQ) = ${Math.round(s.eq * 100)}% — sotto la soglia di attenzione del 45%. Il valore indica attivazione sistematicamente sbilanciata tra segmenti della workforce.`,
    recommendedAction: 'Analizzare l\'attivazione per dipartimento, fascia di seniority e tipo di contratto. Progettare programmi specifici per i segmenti sotto-attivati. Verificare che i programmi siano accessibili (orari, formato) a tutti i segmenti.',
    category:          'equity',
  }),

  // ── R-10: LOW CONFIDENCE SCORE ────────────────────────────────────────────
  (s) => s.confidenceScore >= 0.50 ? null : ({
    id:                'opp-r10',
    ruleId:            'R-10',
    title:             'Data Reliability Index™ basso — qualità dati insufficiente',
    description:       `Il Data Reliability Index™ (Confidence Score = ${Math.round(s.confidenceScore * 100)}%) indica che la qualità complessiva dei dati è bassa. Il KORA Index è disponibile ma con affidabilità limitata.`,
    pillar:            'COMPANY',
    priority:          'high',
    expectedImpact:    'Un Confidence Score più alto non modifica il KORA Index (CS peso = 0) ma indica che i segnali sottostanti sono più affidabili e interpretabili.',
    sourceSignal:      `Rilevato perché: Confidence Score (CS) = ${Math.round(s.confidenceScore * 100)}% — sotto la soglia operativa del 50%. Il CS misura qualità evidenza, completezza dati e revisione UEF.`,
    recommendedAction: 'Completare la revisione UEF con l\'Advisor. Raccogliere documentazione mancante dai fornitori. Verificare la completezza dei campi obbligatori nei record di ingestion.',
    category:          'evidence',
  }),

  // ── R-11: LOW WORKER BALANCE ──────────────────────────────────────────────
  (s) => s.wb >= 0.40 ? null : ({
    id:                'opp-r11',
    ruleId:            'R-11',
    title:             'Worker Balance basso — distribuzione IU sbilanciata',
    description:       `La componente Worker Balance (WB = ${Math.round(s.wb * 100)}%) indica che gli Impact Unit sono concentrati in un piccolo numero di lavoratori. L\'attivazione non è distribuita equamente tra i partecipanti.`,
    pillar:            'COMPANY',
    priority:          'medium',
    expectedImpact:    'Migliorare il WB contribuisce al macroblocco Distribution & Equity (peso 25% KORA Index). Una distribuzione più uniforme indica un\'attivazione più rappresentativa dell\'intera forza lavoro.',
    sourceSignal:      `Rilevato perché: Worker Balance (WB) = ${Math.round(s.wb * 100)}% — sotto la soglia di attenzione del 40%. Il WB misura la dispersione degli IU tra i lavoratori attivi.`,
    recommendedAction: 'Verificare se i programmi più ricchi di IU sono accessibili a tutti i segmenti. Evitare programmi ad alto IU accessibili solo a ruoli o fasce senior. Progettare programmi inclusivi con IU distribuiti orizzontalmente.',
    category:          'equity',
  }),

  // ── R-12: LOW PILLAR COVERAGE ─────────────────────────────────────────────
  (s) => s.pc >= 0.60 ? null : ({
    id:                'opp-r12',
    ruleId:            'R-12',
    title:             'Pillar Coverage incompleta — portfolio attivazione non bilanciato',
    description:       `La componente Pillar Coverage (PC = ${Math.round(s.pc * 100)}%) indica che non tutti i pillar KORA sono attivi con presenza significativa. Uno o più pillar sono assenti o sotto-rappresentati nel portfolio di attivazione.`,
    pillar:            'COMPANY',
    priority:          'medium',
    expectedImpact:    'Attivare tutti i 5 pillar KORA con presenza significativa migliora il PC e il macroblocco Distribution & Equity. Un portfolio multi-pillar è più robusto e rappresentativo dell\'attivazione umana dell\'organizzazione.',
    sourceSignal:      `Rilevato perché: Pillar Coverage (PC) = ${Math.round(s.pc * 100)}% — sotto la soglia operativa del 60%. Il PC misura la copertura dei pillar con presenza IU significativa.`,
    recommendedAction: 'Identificare il pillar o i pillar con IU = 0 o molto bassi. Avviare almeno un programma per pillar mancante. Valutare l\'impatto su LEGACY (mentoring) e IMPACT (volontariato) che spesso richiedono attivazione esplicita.',
    category:          'equity',
  }),

  // ── R-13: LOW PILLAR BALANCE ──────────────────────────────────────────────
  (s) => s.pb >= 0.45 ? null : ({
    id:                'opp-r13',
    ruleId:            'R-13',
    title:             'Pillar Balance sbilanciato — concentrazione eccessiva su un pillar',
    description:       `La componente Pillar Balance (PB = ${Math.round(s.pb * 100)}%) indica che gli IU sono concentrati in uno o pochi pillar dominanti. L\'organizzazione ha un portfolio di attivazione poco diversificato.`,
    pillar:            'COMPANY',
    priority:          'medium',
    expectedImpact:    'Diversificare l\'attivazione tra i pillar migliora il PB e contribuisce a una lettura più robusta del KORA Index. Un portfolio bilanciato è anche più resiliente ai cambiamenti del dataset.',
    sourceSignal:      `Rilevato perché: Pillar Balance (PB) = ${Math.round(s.pb * 100)}% — sotto la soglia di attenzione del 45%. Il PB misura la distribuzione degli IU tra i pillar attivi.`,
    recommendedAction: 'Identificare il pillar o i pillar dominanti. Bilanciare gli investimenti verso i pillar sotto-rappresentati. Verificare se il portafoglio programmi è concentrato su un\'unica area (es. solo welfare vs solo formazione).',
    category:          'equity',
  }),

  // ── R-14: LOW CONTINUITY ─────────────────────────────────────────────────
  (s) => s.co >= 0.50 ? null : ({
    id:                'opp-r14',
    ruleId:            'R-14',
    title:             'Continuità attivazione bassa — attivazione episodica',
    description:       `La componente Continuity (CO = ${Math.round(s.co * 100)}%) indica che i lavoratori non mantengono l\'attivazione tra periodi successivi. L\'attivazione è episodica, non strutturale.`,
    pillar:            'COMPANY',
    priority:          'medium',
    expectedImpact:    'Aumentare il CO migliora il macroblocco Activation Quality (peso 30% KORA Index). Lavoratori continuamente attivi generano IU con maggiore affidabilità e con segnale di impatto più stabile.',
    sourceSignal:      `Rilevato perché: Continuity (CO) = ${Math.round(s.co * 100)}% — sotto la soglia di attenzione del 50%. Il CO misura la quota di lavoratori con attivazione cross-period.`,
    recommendedAction: 'Introdurre programmi a iscrizione pluriennale (abbonamenti welfare, percorsi formativi multi-sessione). Verificare se i programmi annuali sono rinnovati attivamente. Creare incentivi per la continuità (percorsi progressivi, certificazioni multi-livello).',
    category:          'quality',
  }),

  // ── R-15: LOW NORMALIZED INTENSITY ────────────────────────────────────────
  (s) => s.ni >= 0.45 ? null : ({
    id:                'opp-r15',
    ruleId:            'R-15',
    title:             'Intensità attivazione bassa — programmi a basso impatto IU',
    description:       `La componente Normalized Intensity (NI = ${Math.round(s.ni * 100)}%) indica che i lavoratori attivi generano IU medi bassi. I programmi esistenti hanno bassa profondità di impatto individuale.`,
    pillar:            'COMPANY',
    priority:          'medium',
    expectedImpact:    'Aumentare il NI migliora il macroblocco Activation Quality (peso 30% KORA Index). Programmi ad alta intensità generano IU più elevati per lavoratore attivo.',
    sourceSignal:      `Rilevato perché: Normalized Intensity (NI) = ${Math.round(s.ni * 100)}% — sotto la soglia di attenzione del 45%. Il NI misura l\'intensità media degli IU generati per lavoratore attivo.`,
    recommendedAction: 'Valutare la profondità media dei programmi esistenti. Sostituire programmi a superficie alta ma IU bassi (es. accesso piattaforma non utilizzata) con programmi strutturati e verificati. Prioritizzare la qualità dell\'attivazione rispetto alla quantità.',
    category:          'quality',
  }),

  // ── R-16: LOW LEGACY PILLAR ────────────────────────────────────────────────
  (s, shares) => (shares['LEGACY'] ?? 0) >= 0.10 ? null : ({
    id:                'opp-r16',
    ruleId:            'R-16',
    title:             'Pillar LEGACY sottorappresentato — avviare programma mentoring',
    description:       `Il pillar LEGACY rappresenta il ${Math.round((shares['LEGACY'] ?? 0) * 100)}% degli IU aziendali — sotto la soglia del 10%. La trasmissione di conoscenza, il mentoring senior-junior e la continuità organizzativa non sono attivi in modo misurabile.`,
    pillar:            'LEGACY',
    priority:          'medium',
    expectedImpact:    'Attivare il pillar LEGACY migliora la Pillar Coverage (PC) e contribuisce al macroblocco Distribution & Equity. Il mentoring strutturato ha alta resa IU (BC = 1.10, DF opzionale [1.00–1.30]).',
    sourceSignal:      `Rilevato perché: pillar LEGACY = ${Math.round((shares['LEGACY'] ?? 0) * 100)}% degli IU totali — sotto la soglia del 10%. Trasmissione conoscenza e mentoring senior-junior assenti o marginali.`,
    recommendedAction: 'Avviare un programma di mentoring senior-junior formale. Documentare le sessioni di trasferimento conoscenza. Formalizzare community of practice interne. Raccogliere evidenza documentata (log sessioni, attestati partecipazione) per elevare l\'EV.',
    category:          'reach',
  }),

  // ── R-17: LOW CONNECTION PILLAR ───────────────────────────────────────────
  (s, shares) => (shares['CONNECTION'] ?? 0) >= 0.10 ? null : ({
    id:                'opp-r17',
    ruleId:            'R-17',
    title:             'Pillar CONNECTION basso — iniziativa community richiesta',
    description:       `Il pillar CONNECTION rappresenta il ${Math.round((shares['CONNECTION'] ?? 0) * 100)}% degli IU aziendali — sotto la soglia del 10%. Mentoring, peer support, collaborazione trasversale e community interne non generano impatto misurabile.`,
    pillar:            'CONNECTION',
    priority:          'medium',
    expectedImpact:    'Attivare il pillar CONNECTION migliora la Pillar Coverage (PC). I programmi di community e mentoring contribuiscono anche alla coesione organizzativa e alla riduzione del turnover.',
    sourceSignal:      `Rilevato perché: pillar CONNECTION = ${Math.round((shares['CONNECTION'] ?? 0) * 100)}% degli IU totali — sotto la soglia del 10%. Attivazione community e peer support assenti o marginali.`,
    recommendedAction: 'Avviare una community cross-funzionale su un tema rilevante per l\'organizzazione. Strutturare programmi di peer mentoring. Registrare le sessioni di collaborazione come eventi UEF con evidenza verificabile.',
    category:          'reach',
  }),

  // ── R-18: LOW IMPACT PILLAR ───────────────────────────────────────────────
  (s, shares) => (shares['IMPACT'] ?? 0) >= 0.05 ? null : ({
    id:                'opp-r18',
    ruleId:            'R-18',
    title:             'Pillar IMPACT assente — contributo territoriale non attivo',
    description:       `Il pillar IMPACT rappresenta solo il ${Math.round((shares['IMPACT'] ?? 0) * 100)}% degli IU aziendali — sotto la soglia del 5%. Volontariato, progetti sociali e iniziative territoriali non sono ancora attivi nel portfolio di attivazione.`,
    pillar:            'IMPACT',
    priority:          'medium',
    expectedImpact:    'Attivare il pillar IMPACT migliora la Pillar Coverage (PC) e introduce il fattore EXF opzionale [1.00–1.20] disponibile per questo pillar. Contribuisce anche alla rendicontazione CSR/ESG.',
    sourceSignal:      `Rilevato perché: pillar IMPACT = ${Math.round((shares['IMPACT'] ?? 0) * 100)}% degli IU totali — sotto la soglia del 5%. Volontariato, community e iniziative ESG assenti nel portfolio KORA.`,
    recommendedAction: 'Avviare almeno un programma di volontariato aziendale strutturato con raccolta evidenza (report partecipazione, attestati). Collaborare con associazioni locali o partner KORA IMPACT. Registrare le iniziative come eventi UEF verificabili.',
    category:          'reach',
  }),

  // ── R-19: DOMINANT PILLAR ─────────────────────────────────────────────────
  (s, shares) => {
    const dom = dominantPillar(shares);
    return dom.share < 0.60 ? null : ({
      id:                'opp-r19',
      ruleId:            'R-19',
      title:             `Pillar ${dom.pillar} dominante — ribilanciare il portfolio`,
      description:       `Il pillar ${dom.pillar} rappresenta il ${Math.round(dom.share * 100)}% degli IU totali — una concentrazione elevata che riduce la diversificazione dell\'attivazione.`,
      pillar:            dom.pillar as PillarCode,
      priority:          'low',
      expectedImpact:    'Ridurre la dominanza di un singolo pillar migliora il Pillar Balance (PB) e contribuisce a un portfolio di attivazione più robusto e interpretabile.',
      sourceSignal:      `Rilevato perché: pillar ${dom.pillar} = ${Math.round(dom.share * 100)}% degli IU — sopra la soglia di attenzione del 60%. Pillar Balance (PB) potenzialmente compromesso da questa concentrazione.`,
      recommendedAction: `Investire nei pillar sotto-rappresentati per ridurre la quota ${dom.pillar} al di sotto del 60%. Non ridurre i programmi ${dom.pillar} esistenti — aggiungere attivazione negli altri pillar.`,
      category:          'equity' as OpportunityCategory,
    });
  },

  // ── R-20: WEAKEST PILLAR PARTNER OPPORTUNITY ──────────────────────────────
  (s, shares) => {
    const weak = weakestPillar(shares);
    if (weak.share >= 0.12) return null;
    const PARTNER_TYPES: Record<string, string> = {
      LIFE:       'provider welfare e salute (programmi prevenzione, psicologia, nutrizione)',
      GROWTH:     'formatore certificato o LMS partner (corsi, upskilling, certificazioni)',
      CONNECTION: 'rete di mentoring o community partner (programmi peer, collaborazione)',
      IMPACT:     'associazione territoriale o partner ESG (volontariato, progetti sociali)',
      LEGACY:     'network professionale senior o knowledge management partner',
    };
    return {
      id:                'opp-r20',
      ruleId:            'R-20',
      title:             `Partner KORA per ${weak.pillar} — anteprima`,
      description:       `Il pillar ${weak.pillar} (${Math.round(weak.share * 100)}% degli IU) è il più debole nel portfolio. Un partner specializzato potrebbe supportare la crescita di questo pillar con evidenza verificabile.`,
      pillar:            weak.pillar as PillarCode,
      priority:          'low',
      expectedImpact:    `Un partner ${weak.pillar} certificato KORA porta evidenza di livello L3/L4 (EV ≥ 0.90) e partecipazione documentata — migliorando sia il VR che gli IU del pillar.`,
      sourceSignal:      `Rilevato perché: ${weak.pillar} è il pillar con IU share più bassa (${Math.round(weak.share * 100)}%). Un partner specializzato può accelerare l\'attivazione verificata in questo pillar.`,
      recommendedAction: `Esplorare un partner di tipo: ${PARTNER_TYPES[weak.pillar] ?? 'partner specializzato'}. In Foundation Light questa è un\'anteprima — la rete partner operativa è disponibile in Pilot+.`,
      category:          'worker_space' as OpportunityCategory,
    };
  },
];

// ── Service class ─────────────────────────────────────────────────────────────

export class ActivationOpportunityService {
  // Returns all fired opportunities sorted by priority (critical first), then rule order.
  computeFromSignals(signals: OpportunitySignals): ActivationOpportunity[] {
    const shares = pillarShares(signals.pillarDistribution);
    const results: ActivationOpportunity[] = [];

    for (const rule of RULES) {
      const opp = rule(signals, shares);
      if (opp !== null) results.push(opp);
    }

    return results.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }

  // Convenience: derive signals from KoraIndexOutput + CompanyAggregateExtended
  compute(koraIndex: KoraIndexOutput, aggregate: CompanyAggregateExtended): ActivationOpportunity[] {
    return this.computeFromSignals(deriveSignals(koraIndex, aggregate));
  }

  // Top N opportunities by priority
  getTop(koraIndex: KoraIndexOutput, aggregate: CompanyAggregateExtended, n: number): ActivationOpportunity[] {
    return this.compute(koraIndex, aggregate).slice(0, n);
  }
}

// ── Signal derivation helpers ─────────────────────────────────────────────────

export function deriveSignals(
  koraIndex: KoraIndexOutput,
  aggregate: CompanyAggregateExtended,
): OpportunitySignals {
  const comp = (code: string): number =>
    koraIndex.components.find((c) => c.code === code)?.value ?? 0;

  return {
    safeguardStatus:           koraIndex.safeguard_status,
    confidenceScore:           koraIndex.confidence_score,
    ar:                        comp('AR'),
    mar:                       comp('MAR'),
    ni:                        comp('NI'),
    wb:                        comp('WB'),
    pc:                        comp('PC'),
    pb:                        comp('PB'),
    eq:                        comp('EQ'),
    vr:                        comp('VR'),
    co:                        comp('CO'),
    totalWorkers:              aggregate.total_workers,
    activationRate:            aggregate.activation_rate,
    meaningfulActivationRate:  aggregate.meaningful_activation_rate,
    pillarDistribution:        aggregate.pillar_distribution,
    economicReliefShare:       undefined,
  };
}

// Slim derivation for server-side use (Decision Pack, etc.)
// Avoids importing the full scoring simulator chain.
export function deriveSignalsSlim(params: {
  safeguardStatus: string;
  confidenceScore: number;
  activationRate: number;
  meaningfulActivationRate: number;
  components: Array<{ code: string; value: number }>;
  pillarDistribution: Partial<Record<string, number>>;
  economicReliefShare?: number;
}): OpportunitySignals {
  const comp = (code: string): number =>
    params.components.find((c) => c.code === code)?.value ?? 0;

  const sf = params.safeguardStatus;
  const safeguard: 'CLEAR' | 'WARNING' | 'FLAGGED' =
    sf === 'CLEAR' || sf === 'WARNING' || sf === 'FLAGGED' ? sf : 'FLAGGED';

  return {
    safeguardStatus:           safeguard,
    confidenceScore:           params.confidenceScore,
    ar:                        params.activationRate,
    mar:                       params.meaningfulActivationRate,
    ni:                        comp('NI'),
    wb:                        comp('WB'),
    pc:                        comp('PC'),
    pb:                        comp('PB'),
    eq:                        comp('EQ'),
    vr:                        comp('VR'),
    co:                        comp('CO'),
    totalWorkers:              0,
    activationRate:            params.activationRate,
    meaningfulActivationRate:  params.meaningfulActivationRate,
    pillarDistribution:        params.pillarDistribution,
    economicReliefShare:       params.economicReliefShare,
  };
}

export const activationOpportunityService = new ActivationOpportunityService();
