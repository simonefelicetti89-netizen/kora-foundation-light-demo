// services/explainability/ExplainabilityService.ts
//
// B-TRUTH Explainability Synthetic Retirement (2026-09-02): the synthetic-
// backed explanation branch (getExplanation, getTopWeakComponents,
// getTopStrongComponents, getNextBestActions, getLimitations, getWarnings —
// all reading data/synthetic/explainability-records.json) has been removed.
// Independently re-verified before removal: zero real runtime callers of any
// of the 6 methods, zero external callers of the Warning type. Its only
// real-ish caller was ReportGeneratorService (retired separately, 2026-09-02).
//
// The live methodology glossary (getConceptExplanation, listConceptKeys,
// CONCEPT_GLOSSARY, ConceptExplanation) is unchanged — it has no synthetic
// dependency (a static, hardcoded 21-concept object) and its real caller
// (components/kora-index/MethodologyGlossary.tsx) is unaffected.
//
// ExplainabilityComponentRef, ExplainabilityAction, and ExplainabilityRecord
// are kept as pure type declarations (no longer constructed by anything in
// this file) because components/kora-index/ExplainabilityPanel.tsx still
// has a type-only import of ExplainabilityRecord — smallest safe change,
// per B-TRUTH's "no product capability loss" discipline, even though that
// component is itself unreachable from any real entry point (confirmed:
// zero real imports/renders of it anywhere — a separate, out-of-scope fact,
// not acted on here).

export interface ExplainabilityComponentRef {
  code: string;
  label: string;
  value: number;
  explanation: string;
}

export interface ExplainabilityAction {
  priority: number;
  action: string;
  detail: string;
  target_components: string[];
}

export interface ExplainabilityRecord {
  id: string;
  company_id: string;
  scenario_id: string;
  reporting_period: string;
  kora_index_output_id: string;
  methodology_version_id: string;
  calibration_status: string;
  kora_index_explanation: string;
  safeguard_explanation: string;
  confidence_explanation: string;
  strong_components: ExplainabilityComponentRef[];
  weak_components: ExplainabilityComponentRef[];
  next_best_actions: ExplainabilityAction[];
  limitations_statement: string;
  individual_worker_data_present: false;
}

export interface ConceptExplanation {
  key: string;
  label_it: string;
  label_en: string;
  definition_it: string;
  related_concepts?: string[];
}

// ── 21-concept Italian-first methodology glossary ──────────────────────────────
// Canonical explanations — never paraphrase or abbreviate in UI surfaces.
const CONCEPT_GLOSSARY: Record<string, ConceptExplanation> = {
  kora_index: {
    key: 'kora_index',
    label_it: 'KORA Index',
    label_en: 'KORA Index',
    definition_it:
      'Indicatore composito (0–100) che misura la qualità e l\'ampiezza dell\'attivazione umana a livello aziendale. È calcolato su 4 macroblocks: Activation Reach (25%), Activation Quality (30%), Distribution & Equity (25%), Budget-to-Human-Impact (20%). Il Confidence Score è esterno al calcolo — mostrato sempre accanto al KORA Index come indicatore di affidabilità dei dati.',
    related_concepts: ['confidence_score', 'activation_safeguard', 'macroblock'],
  },
  confidence_score: {
    key: 'confidence_score',
    label_it: 'Confidence Score',
    label_en: 'Confidence Score',
    definition_it:
      'Indicatore di affidabilità dei dati (0–1) che misura la completezza delle fonti, la qualità delle evidenze e il peso della verifica. Il Confidence Score non contribuisce al calcolo del KORA Index v1.0 (peso = 0) ma è mostrato obbligatoriamente accanto ad esso. Un Confidence Score basso riduce la fiducia interpretativa nell\'output — non ne modifica il valore numerico.',
    related_concepts: ['kora_index', 'verification_rate'],
  },
  activation_safeguard: {
    key: 'activation_safeguard',
    label_it: 'Activation Safeguard',
    label_en: 'Activation Safeguard',
    definition_it:
      'Gate interpretativo applicato dopo il calcolo del KORA Index. Stati: CLEAR (AR ≥ 0,40 E MAR ≥ 0,30 — output interpretabile con piena fiducia), WARNING (AR < 0,40 O MAR < 0,30 — output disponibile ma con fiducia ridotta), FLAGGED (AR < 0,20 O MAR < 0,15 — base di partecipazione troppo bassa per un\'interpretazione affidabile). L\'Activation Safeguard non è un componente del KORA Index: è un\'etichetta interpretativa non bypassabile.',
    related_concepts: ['activation_rate', 'meaningful_activation_rate', 'kora_index'],
  },
  activation_reach: {
    key: 'activation_reach',
    label_it: 'Activation Reach',
    label_en: 'Activation Reach',
    definition_it:
      'Il primo macroblocco del KORA Index v1.0 (peso 25%). Misura se l\'attivazione raggiunge una quota significativa della forza lavoro. Sintetizza due componenti analitici: AR (Activation Rate, peso 50%) e MAR (Meaningful Activation Rate, peso 50%). Un macroblocco basso segnala che la maggior parte dei lavoratori non è stata raggiunta da alcun programma di attivazione verificata nel periodo. Il macroblocco è una sintesi aggregata: non coincide con il solo AR. Un AR elevato con MAR basso (partecipazione formale ma non significativa) produce un macroblocco Activation Reach moderato, non massimo.',
    related_concepts: ['activation_rate', 'meaningful_activation_rate', 'kora_index'],
  },
  activation_quality: {
    key: 'activation_quality',
    label_it: 'Activation Quality',
    label_en: 'Activation Quality',
    definition_it:
      'Il secondo macroblocco del KORA Index v1.0 (peso 30%). Misura se le azioni generano attivazione profonda, verificata, addizionale e continua. Sintetizza tre componenti analitici: NI (Normalized Intensity, peso 33%), VR (Verification Rate, peso 33%), CO (Continuity, peso 34%). Un macroblocco basso segnala che l\'attivazione è superficiale, non verificata o episodica. Il macroblocco è una sintesi aggregata: non coincide con il solo CO o con il solo NI. Un NI alto con CO basso segnala engagement intenso ma non ricorrente.',
    related_concepts: ['normalized_intensity', 'verification_rate', 'continuity', 'kora_index'],
  },
  distribution_equity: {
    key: 'distribution_equity',
    label_it: 'Distribution & Equity',
    label_en: 'Distribution & Equity',
    definition_it:
      'Il terzo macroblocco del KORA Index v1.0 (peso 25%). Misura se valore e attivazione sono distribuiti equamente tra lavoratori, sedi, dipartimenti e cluster. Sintetizza quattro componenti analitici: WB (Worker Balance, peso 25%), PC (Pillar Coverage, peso 25%), PB (Pillar Balance, peso 25%), EQ (Equity, peso 25%). Alta concentrazione tra pochi lavoratori o siti riduce questo macroblocco anche se il KORA Index totale è positivo. Non coincide con il solo EQ: un punteggio di Equity alto ma con bassa Pillar Coverage produce comunque un macroblocco Distribution & Equity moderato.',
    related_concepts: ['worker_balance', 'pillar_coverage', 'pillar_balance', 'equity', 'kora_index'],
  },
  activation_rate: {
    key: 'activation_rate',
    label_it: 'Tasso di Attivazione (AR)',
    label_en: 'Activation Rate',
    definition_it:
      'Quota della forza lavoro eleggibile con almeno una Impact Unit approvata nel periodo di riferimento. AR = lavoratori_attivi / lavoratori_eleggibili. È il componente primario del macroblock Activation Reach. Soglia CLEAR: AR ≥ 0,40. Un AR basso segnala che la maggior parte della forza lavoro non ha partecipato ad alcun programma attivante nel periodo.',
    related_concepts: ['meaningful_activation_rate', 'activation_safeguard', 'impact_unit'],
  },
  meaningful_activation_rate: {
    key: 'meaningful_activation_rate',
    label_it: 'Tasso di Attivazione Significativa (MAR)',
    label_en: 'Meaningful Activation Rate',
    definition_it:
      'Quota della forza lavoro con Impact Units al di sopra della soglia di materialità. MAR filtra i lavoratori con partecipazione puramente formale (es. un solo evento di compliance minima). MAR = lavoratori_attivi_significativi / lavoratori_eleggibili. Soglia CLEAR: MAR ≥ 0,30. MAR < AR per definizione — la differenza segnala la dimensione della partecipazione superficiale.',
    related_concepts: ['activation_rate', 'impact_unit', 'activation_safeguard'],
  },
  normalized_intensity: {
    key: 'normalized_intensity',
    label_it: 'Intensità Normalizzata (NI)',
    label_en: 'Normalized Intensity',
    definition_it:
      'Media delle Impact Units per lavoratore attivo, normalizzata rispetto alla scala massima del periodo. NI misura la profondità dell\'engagement — quante IU genera in media un lavoratore che partecipa. Un NI alto su una base AR bassa segnala un programma che attiva intensamente una minoranza invece di distribuire l\'engagement. Componente del macroblock Activation Quality.',
    related_concepts: ['impact_unit', 'worker_balance', 'activation_rate'],
  },
  worker_balance: {
    key: 'worker_balance',
    label_it: 'Bilanciamento dei Lavoratori (WB)',
    label_en: 'Worker Balance',
    definition_it:
      'Misura l\'uniformità della distribuzione delle Impact Units tra i lavoratori attivi. WB basso segnala concentrazione strutturale: pochi lavoratori generano la maggior parte delle IU. Un WB alto indica che l\'attivazione è distribuita in modo equo tra chi partecipa. Componente del macroblock Distribution & Equity.',
    related_concepts: ['equity', 'normalized_intensity', 'pillar_balance'],
  },
  pillar_coverage: {
    key: 'pillar_coverage',
    label_it: 'Copertura dei Pillar (PC)',
    label_en: 'Pillar Coverage',
    definition_it:
      'Numero di pillar con presenza significativa nel periodo, espresso come quota sui 5 pillar KORA (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY). PC = pillar_attivi / 5. Un PC basso indica che l\'azienda genera IU solo in un sottoinsieme di pillar — tipicamente LIFE e GROWTH — mentre CONNECTION, IMPACT e LEGACY restano sottorappresentati. Componente del macroblock Distribution & Equity.',
    related_concepts: ['pillar_balance', 'kora_pillar'],
  },
  pillar_balance: {
    key: 'pillar_balance',
    label_it: 'Bilanciamento dei Pillar (PB)',
    label_en: 'Pillar Balance',
    definition_it:
      'Uniformità della distribuzione delle Impact Units tra i pillar attivi. PB alto indica che le IU sono distribuite equamente tra i pillar coperti. Un pillar dominante (es. LIFE al 44% in S1) abbassa PB anche se PC è moderato. Componente del macroblock Distribution & Equity.',
    related_concepts: ['pillar_coverage', 'kora_pillar', 'worker_balance'],
  },
  equity: {
    key: 'equity',
    label_it: 'Equità (EQ)',
    label_en: 'Equity',
    definition_it:
      'Equità distributiva dell\'attivazione tra segmenti aggregati della forza lavoro (dipartimenti, fasce di seniority, tipi di contratto, siti) al di sopra della soglia privacy (gruppo ≥ 10 lavoratori). EQ alta significa che l\'attivazione non è sistematicamente concentrata in segmenti privilegiati o già ad alta partecipazione. Un sito Operations con AR 11% a fronte di un HR al 88% è il segnale tipico di EQ bassa. Componente del macroblock Distribution & Equity.',
    related_concepts: ['worker_balance', 'activation_rate'],
  },
  verification_rate: {
    key: 'verification_rate',
    label_it: 'Tasso di Verifica (VR)',
    label_en: 'Verification Rate',
    definition_it:
      'Quota delle Impact Units supportate da evidenze verificate o parzialmente verificate (revisione advisor, integrazione LMS, dati provider via API). VR basso indica alta proporzione di eventi autodichiarati senza revisione. Un VR basso riduce l\'affidabilità dell\'output e si riflette nel Confidence Score. Componente del macroblock Activation Quality.',
    related_concepts: ['confidence_score', 'impact_unit'],
  },
  continuity: {
    key: 'continuity',
    label_it: 'Continuità (CO)',
    label_en: 'Continuity',
    definition_it:
      'Quota di lavoratori attivi con engagement sostenuto tra periodi consecutivi (cross-period). CO misura se i programmi costruiscono abitudini o si limitano a eventi una tantum. CO basso segnala che i lavoratori si attivano in un periodo ma non tornano nel successivo. Componente del macroblock Activation Quality.',
    related_concepts: ['activation_rate', 'meaningful_activation_rate'],
  },
  bti_macroblock: {
    key: 'bti_macroblock',
    label_it: 'Budget-to-Human-Impact (BTI)',
    label_en: 'Budget-to-Human-Impact macroblock',
    definition_it:
      'Il quarto macroblocco del KORA Index v1.0 (peso 20%). Il punteggio BTI è calcolato dal motore Budget-to-Human-Impact — non deriva dai valori dei componenti. Misura l\'efficienza di conversione della spesa welfare in attivazione umana reale. Budget allocato ≠ Budget attivato. La spesa in benefit monetari (buoni pasto, fringe) non genera Impact Units.',
    related_concepts: ['economic_relief', 'deep_activation', 'activation_debt', 'reallocation_opportunity'],
  },
  economic_relief: {
    key: 'economic_relief',
    label_it: 'Benefit monetari',
    label_en: 'Economic Relief',
    definition_it:
      'Categoria di spesa welfare a bassa attivazione: voucher alimentari, buoni carburante, fringe benefit generici, card shopping. I benefit monetari sono classificati Limited all\'Eligibility Gate — generano 0 Impact Units ma sono tracciati nel motore BTI come spesa in benefit monetari. Non è spesa sbagliata: è spesa che può diventare più intelligente attraverso la riallocazione verso programmi di attivazione profonda.',
    related_concepts: ['eligibility_gate', 'deep_activation', 'bti_macroblock'],
  },
  deep_activation: {
    key: 'deep_activation',
    label_it: 'Attivazione profonda',
    label_en: 'Deep Activation',
    definition_it:
      'Spesa welfare orientata a programmi che generano Impact Units verificate: formazione, benessere strutturato, mentoring, volontariato, programmi di comunità. Contrapposta ai benefit monetari, l\'attivazione profonda è la quota di budget che si converte in attivazione reale misurabile dal KORA Index. Il rapporto quota di attivazione profonda / quota di benefit monetari è il principale segnale diagnostico del macroblocco BTI.',
    related_concepts: ['economic_relief', 'impact_unit', 'bti_macroblock'],
  },
  activation_debt: {
    key: 'activation_debt',
    label_it: 'Activation Debt',
    label_en: 'Activation Debt',
    definition_it:
      'Budget allocato ma non convertito in attivazione verificata nel periodo. Include budget non speso e quota di spesa in benefit monetari che non genera IU. KORA misura ciò che accade dopo la spesa. Activation Debt è il segnale che il budget teorico non si traduce in impatto umano reale. Ridurre l\'Activation Debt richiede sia una maggiore spesa in attivazione profonda sia una migliore verifica degli eventi.',
    related_concepts: ['reallocation_opportunity', 'bti_macroblock', 'economic_relief'],
  },
  reallocation_opportunity: {
    key: 'reallocation_opportunity',
    label_it: 'Reallocation Opportunity',
    label_en: 'Reallocation Opportunity',
    definition_it:
      'Quota della spesa in benefit monetari che potrebbe essere riorientata verso programmi di attivazione profonda, aumentando il BTI score senza incrementare il budget totale. La Reallocation Opportunity non è una critica alla spesa esistente ma un\'indicazione quantitativa del potenziale di ottimizzazione. La riallocazione parziale (es. 50% dei benefit monetari) può generare miglioramenti materiali nell\'Activation Quality e nel KORA Index.',
    related_concepts: ['activation_debt', 'economic_relief', 'deep_activation'],
  },
  impact_unit: {
    key: 'impact_unit',
    label_it: 'Impact Unit (IU)',
    label_en: 'Impact Unit',
    definition_it:
      'Unità di misura dell\'attivazione individuale calcolata per ogni evento per ogni pillar. Formula: IU = NM × BC × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]. Le IU sono intermediate — mai employer-visible in forma individuale. Vengono aggregate a livello aziendale per alimentare i componenti del KORA Index. Un evento bloccato (AGF = 0 o Eligibility Gate = Blocked) genera IU = 0.',
    related_concepts: ['eligibility_gate', 'activation_rate', 'kora_index'],
  },
  eligibility_gate: {
    key: 'eligibility_gate',
    label_it: 'Eligibility Gate',
    label_en: 'Eligibility Gate',
    definition_it:
      'Classificazione pre-scoring applicata a ogni item caricato prima del calcolo delle Impact Units. Tre classi: Eligible (genera IU piena — programmi di attivazione profonda), Limited (0 IU — benefit monetari come buoni pasto e fringe; tracciati come spesa in benefit monetari nel motore BTI), Blocked (0 IU, 0 KORA Contribution — eventi obbligatori per legge o ruolo: DVR, DPI, DUVRI, formazione HSE obbligatoria). Il gate è obbligatorio e non bypassabile.',
    related_concepts: ['economic_relief', 'impact_unit', 'deep_activation'],
  },
  pre_empirical_calibration: {
    key: 'pre_empirical_calibration',
    label_it: 'Pre-calibrazione empirica',
    label_en: 'Pre-empirical calibration',
    definition_it:
      'Stato metodologico attuale di KORA Foundation Light. I pesi dei macroblocks (REACH 25%, QUALITY 30%, EQUITY 25%, BTI 20%) sono provvisori — non ancora calibrati empiricamente tramite lo Studio Delphi. Gli output sono strumenti di intelligence diagnostica pilot-grade, non certificati e non adatti a decisioni legali, fiscali o regolamentari. Lo stato di calibrazione è non sopprimibile e deve essere mostrato accanto a ogni output KORA Index.',
    related_concepts: ['kora_index', 'confidence_score'],
  },
  kora_contribution: {
    key: 'kora_contribution',
    label_it: 'KORA Contribution',
    label_en: 'KORA Contribution',
    definition_it:
      'Indicatore companion che misura il contributo collettivo ed ecosistemico dell\'azienda: iniziative di gruppo, attività KORA Network, contributi di sistema. KORA Contribution NON è un componente del KORA Index v1.0 — ha peso 0 nel calcolo dell\'indice. È mostrato separatamente come indicatore complementare. Non deve mai essere aggregato o sommato al KORA Index.',
    related_concepts: ['kora_index', 'kora_pillar'],
  },
  kora_pillar: {
    key: 'kora_pillar',
    label_it: 'Pillar KORA',
    label_en: 'KORA Pillar',
    definition_it:
      'I 5 domini di valore umano in cui ogni evento è classificato: LIFE (salute, benessere, prevenzione, supporto psicologico, sicurezza-benessere), GROWTH (formazione, competenze, sviluppo professionale, upskilling), CONNECTION (mentoring, peer support, comunità, coesione), IMPACT (volontariato, progetti sociali, territorio, ambiente), LEGACY (trasferimento di conoscenza, mentoring senior-junior, continuità organizzativa). Ogni evento è classificato in esattamente un pillar per istanza.',
    related_concepts: ['impact_unit', 'pillar_coverage', 'pillar_balance'],
  },
  eligible: {
    key: 'eligible',
    label_it: 'Eligible — Azioni Idonee',
    label_en: 'Eligible',
    definition_it:
      'Classe Eligibility Gate per azioni che possono generare Impact Units verificate: programmi di benessere strutturato, formazione volontaria, mentoring, volontariato, supporto psicologico, childcare/asilo nido, caregiver support, upskilling, reskilling, percorsi di legacy e trasferimento di conoscenza. Le azioni Eligible sono processate dall\'IU Engine e contribuiscono al KORA Index.',
    related_concepts: ['eligibility_gate', 'impact_unit', 'deep_activation'],
  },
  limited: {
    key: 'limited',
    label_it: 'Limited — Benefit monetari',
    label_en: 'Limited',
    definition_it:
      'Classe Eligibility Gate per benefit monetari utili ma a bassa profondità di attivazione: buoni pasto, card carburante, voucher shopping, fringe benefit generici. Gli item Limited generano 0 Impact Units ma sono tracciati nel motore BTI come spesa in benefit monetari. Non è spesa sbagliata: è spesa che può diventare più intelligente attraverso la riallocazione verso programmi di attivazione profonda.',
    related_concepts: ['eligibility_gate', 'economic_relief', 'bti_macroblock'],
  },
  blocked: {
    key: 'blocked',
    label_it: 'Blocked — Escluso per Design',
    label_en: 'Blocked',
    definition_it:
      'Classe Eligibility Gate per eventi di compliance obbligatoria legale/HSE/documentale: DVR/DUVRI, DPI, D.Lgs 81/08, sorveglianza sanitaria, privacy GDPR obbligatorio, patentini e licenze obbligatori per ruolo. Gli item Blocked generano 0 IU, 0 KORA Index contribution, 0 PIB e 0 KORA Contribution. Non sono "punteggio basso" — sono esclusi per design. KORA non trasforma la compliance in impatto. La conformità legale è una baseline, non impatto.',
    related_concepts: ['eligibility_gate', 'blocked_by_design'],
  },
  blocked_by_design: {
    key: 'blocked_by_design',
    label_it: 'Blocked by Design',
    label_en: 'Blocked by Design',
    definition_it:
      'Principio architetturale di KORA: la conformità legale obbligatoria non può essere convertita in punteggio di attivazione. Gli eventi obbligatori per legge o per ruolo sono classificati Blocked all\'Eligibility Gate e generano zero contributo a KORA Index, IU e PIB. Questa esclusione è intenzionale e non bypassabile — garantisce che il KORA Index misuri solo attivazione genuina e addizionale, non la baseline di compliance.',
    related_concepts: ['blocked', 'eligibility_gate', 'impact_unit'],
  },
  economic_relief_activation_opportunity: {
    key: 'economic_relief_activation_opportunity',
    label_it: 'Benefit monetari & opportunità di attivazione',
    label_en: 'Economic Relief & Activation Opportunity',
    definition_it:
      'Sezione diagnostica del KORA Index v1.0 che confronta la quota di spesa welfare destinata a benefit monetari (Limited) con quella destinata a programmi di attivazione profonda (Eligible). Un\'alta quota di benefit monetari (es. 48% in S1) segnala che il budget è concentrato in benefit a bassa attivazione. La riduzione verso S2 (30%) attraverso parziale riallocazione verso l\'attivazione profonda migliora il BTI score, la qualità dell\'attivazione e l\'equità della spesa. Il frame corretto: non è spesa sbagliata, è spesa che può diventare più intelligente.',
    related_concepts: ['economic_relief', 'deep_activation', 'reallocation_opportunity', 'bti_macroblock'],
  },
  budget_to_human_impact: {
    key: 'budget_to_human_impact',
    label_it: 'Budget-to-Human-Impact',
    label_en: 'Budget-to-Human-Impact',
    definition_it:
      'Pannello diagnostico del macroblocco BTI che mostra i principali indicatori di efficienza della conversione budget → attivazione: spesa totale welfare, spesa in benefit monetari, spesa in attivazione profonda, Activation Debt, Reallocation Opportunity, costo per IU, costo per lavoratore attivato in profondità, bilanciamento degli investimenti per pillar e equità della spesa. I dati provengono dal motore Budget-to-Human-Impact — non dai valori dei componenti del KORA Index. Solo informativo: KORA non gestisce pagamenti, non custodisce fondi e non fornisce consulenza fiscale.',
    related_concepts: ['bti_macroblock', 'activation_debt', 'reallocation_opportunity', 'cost_per_deep_activated_worker'],
  },
  cost_per_deep_activated_worker: {
    key: 'cost_per_deep_activated_worker',
    label_it: 'Costo per Lavoratore Profondamente Attivato',
    label_en: 'Cost per Deep Activated Worker',
    definition_it:
      'Spesa di attivazione profonda / numero di lavoratori con attivazione profonda verificata. Un aumento di questo indicatore non implica inefficienza: può riflettere l\'espansione dell\'accesso a programmi più strutturati e profondi per una platea più ampia. Leggere sempre insieme al costo per Impact Unit: se quest\'ultimo diminuisce, l\'efficienza complessiva dell\'attivazione è migliorata. In S1→S2: costo per lavoratore attivato +€181, ma costo per IU −8.6 — segnale di efficienza complessiva migliorata, non peggiorata.',
    related_concepts: ['deep_activation', 'budget_to_human_impact', 'bti_macroblock'],
  },
  structural_policy_activation: {
    key: 'structural_policy_activation',
    label_it: 'Attivazione da Policy Strutturale',
    label_en: 'Structural Policy Activation',
    definition_it:
      'Classe di attivazione generata da policy organizzative formali che modificano strutturalmente le condizioni di lavoro: ferie illimitate, smart working, diritto alla disconnessione, no meeting zone, accordi integrativi migliorativi. A differenza dei benefit individuali, le policy strutturali sono aggregate per design — non esistono record di utilizzo individuale. Le IU generate da policy strutturali sono non-budget-mediated: non hanno un costo diretto associato e sono escluse dal denominatore di cost_per_impact_unit nel BTI Engine. KORA le riconosce solo se formalizzate, verificabili, aggregate e privacy-safe. Non misura l\'utilizzo individuale, non misura il comportamento dei singoli lavoratori.',
    related_concepts: ['trust_and_flexibility_policy', 'non_budget_mediated_activation', 'impact_unit', 'eligibility_gate'],
  },
  trust_and_flexibility_policy: {
    key: 'trust_and_flexibility_policy',
    label_it: 'Fiducia & Flessibilità Organizzativa',
    label_en: 'Trust & Flexibility Policy',
    definition_it:
      'Action Family KORA per policy organizzative strutturali che aumentano la fiducia, l\'autonomia e la flessibilità della forza lavoro. Comprende 11 sottotipi: autonomia del tempo/ferie illimitate, congedo migliorativo, parental care policy, flessibilità cura e lavoro, smart working/lavoro ibrido, diritto alla disconnessione, no meeting zone, campus work-life, fondo solidarietà ferie, accordi di inclusione lavorativa, accordi integrativi people migliorativi. Base Contribution (BC) = 1,15 — sopra il neutro (1,0) ma inferiore ai benefit welfare diretti (1,2). Richiede calibrazione post-Studio Delphi. La fiducia organizzativa è misurabile solo come capacità collettiva, non come controllo individuale.',
    related_concepts: ['structural_policy_activation', 'non_budget_mediated_activation', 'policy_depth', 'kora_pillar'],
  },
  non_budget_mediated_activation: {
    key: 'non_budget_mediated_activation',
    label_it: 'Attivazione Non Budget-Mediated',
    label_en: 'Non-Budget-Mediated Activation',
    definition_it:
      'Impact Units generate da policy strutturali che non hanno un costo diretto associato — l\'attivazione non richiede una spesa per lavoratore misurabile. Esempi: policy di ferie illimitate, accordi di smart working strutturale, diritto alla disconnessione formalizzato. Il BTI Engine separa le IU non-budget-mediated dal calcolo di cost efficiency: la metrica cost_per_impact_unit si applica solo alle attivazioni budget-mediated. Non tutte le azioni KORA passano da un partner o da una fattura.',
    related_concepts: ['structural_policy_activation', 'trust_and_flexibility_policy', 'budget_to_human_impact', 'bti_macroblock'],
  },
  policy_depth: {
    key: 'policy_depth',
    label_it: 'Profondità della Policy (Policy Depth)',
    label_en: 'Policy Depth',
    definition_it:
      'Dimensione qualitativa che misura il grado di strutturazione e impatto reale di una policy organizzativa. In KORA Foundation Light, policy_depth è rappresentata come livello ordinale: superficial (policy dichiarata senza meccanismi di supporto), moderate (policy con misure di supporto parziali), deep (policy con meccanismi strutturati e verificati), transformative (policy che riorganizza strutturalmente i processi di lavoro). Il Normalized Magnitude (NM) per le policy strutturali richiede calibrazione post-Studio Delphi su coverage × depth × accessibility × duration. In Foundation Light: NM = 1.0 (stub pre-calibrazione).',
    related_concepts: ['structural_policy_activation', 'trust_and_flexibility_policy', 'non_budget_mediated_activation'],
  },
};

export interface IExplainabilityService {
  getConceptExplanation(key: string): ConceptExplanation | null;
  listConceptKeys(): string[];
}

export class ExplainabilityService implements IExplainabilityService {
  getConceptExplanation(key: string): ConceptExplanation | null {
    return CONCEPT_GLOSSARY[key] ?? null;
  }

  listConceptKeys(): string[] {
    return Object.keys(CONCEPT_GLOSSARY);
  }
}

export const explainabilityService = new ExplainabilityService();
