// lib/commons/contribution-views.ts
// B167 — Forme di output delle view di KORA Contribution per la dashboard aziendale.
//
// DOTTRINA:
//   - Nessun punteggio aggregato unico ('Contribution Score'): è fuori dottrina.
//   - Le due sezioni promoter e origin_employer hanno peso visivo equivalente.
//   - KORA Contribution è companion indicator — MAI componente KORA Index (CLAUDE.md §12.7).
//   - Anonimato: origin_employer vede solo aggregati, mai legami worker↔iniziativa.

export interface ContributionPillarBreakdown {
  pillar:       string;
  count:        number;
  weight:       number;
  share_pct:    number;   // 0–100, share sul totale weight di questa sezione
}

/** Vista aggregata per la sezione "Le tue iniziative aperte all'ecosistema" (role='promoter') */
export interface ContributionPromoterView {
  tenant_id:              string;
  reporting_period:       string;
  /** Numero di iniziative distinte pubblicate come cross_company */
  distinct_initiatives:   number;
  /** Somma delle partecipazioni approvate (contribution_kind='cross_company_participation') */
  participations_received: number;
  /** Count eventi external_participants_event — familiari/comunità raggiunti */
  external_outreach_events: number;
  /** Peso totale verified per la sezione promoter */
  verified_weight:        number;
  /** Peso totale self_declared per la sezione promoter */
  self_declared_weight:   number;
  /** Breakdown per pillar (derivato da commons.post.pillar) */
  pillar_breakdown:       ContributionPillarBreakdown[];
  /** Frasi narrative pronte (prodotte da contribution-narrative.ts) */
  narrative:              string[];
  data_source:            'live_db';
  methodology_version_id: string;
  calibration_status:     'pre_empirical_calibration';
}

/** Vista aggregata per la sezione "I tuoi lavoratori nell'ecosistema" (role='origin_employer') */
export interface ContributionOriginEmployerView {
  tenant_id:              string;
  reporting_period:       string;
  /** Numero totale di partecipazioni cross_company di lavoratori di questa azienda */
  participations_sent:    number;
  /** Numero di iniziative distinte a cui i lavoratori hanno partecipato */
  distinct_initiatives:   number;
  /** Numero di aziende promotrici distinte (ecosistema raggiunto) */
  distinct_promoters:     number;
  /** Peso totale per sezione */
  total_weight:           number;
  /** Breakdown per pillar (delle iniziative che i lavoratori hanno frequentato) */
  pillar_breakdown:       ContributionPillarBreakdown[];
  /** Frasi narrative pronte (prodotte da contribution-narrative.ts) */
  narrative:              string[];
  data_source:            'live_db';
  methodology_version_id: string;
  calibration_status:     'pre_empirical_calibration';
}
