# Phase 2 Privacy Threshold Design 01 — Draft Suppression Model for Activation Intelligence

**Data:** 2026-07-14
**Branch:** `feature/phase2-privacy-threshold-design-01`
**Tipo:** Documentazione di design — bozza. Nessun SQL, nessuna RLS, nessuna implementazione DB, nessun job di aggregazione, nessuna integrazione con il KORA Index, nessun punteggio companion, nessuna decisione DPO/CTO/fiscale/legale risolta.

---

## 1. Stato e perimetro

**Bozza — solo documentazione.**

Questo documento definisce, a livello di solo design, come i futuri segnali aggregati Phase 2 dovrebbero essere soppressi, consentiti, o segnalati prima di poter essere mostrati alle aziende o considerati come futuro input del KORA Index.

- **Non approvato dal DPO. Non approvato legalmente.**
- **Non implementato.**
- **Nessun SQL. Nessuna RLS. Nessun DB. Nessun job di aggregazione.**
- **Nessuna integrazione con il KORA Index.**
- **Nessun punteggio companion.**
- Nessun punteggio di attivazione pubblico separato.
- Nessuna decisione DPO/CTO/fiscale/legale è risolta in questo documento.

**Principio di prodotto invariato: ci sarà un solo KORA Index.** Il Phase 2 potrà in futuro alimentare quello stesso KORA Index solo dopo design della soglia di privacy, design di consenso/revoca, approvazione delle voci `AccessResource`, approvazione di schema/RLS, revisione CTO/DPO, e mappatura a livello di metodo sulle componenti canoniche — nessuno di questi passaggi avviene in questo sprint.

---

## 2. Principio di privacy

- **L'azienda vede solo aggregati.** Nessuna riga individuale, mai.
- **L'azienda non vede mai dati individuali del lavoratore** — nessuna azione, prenotazione, relazione, consenso, evento sorgente, riscatto voucher, o dettaglio partner-lavoratore.
- **L'aggregazione da sola non è sufficiente** se pattern a N piccolo o di utilizzo ripetuto possono ri-identificare le persone. Un conteggio aggregato che supera N≥10 non è automaticamente sicuro se combinato con altri filtri, ripetuto nel tempo, o incrociato con altre dimensioni.
- **La soppressione deve essere esplicita, auditabile e conservativa** — mai un azzeramento silenzioso, sempre un motivo tracciabile lato sistema (mai esposto al segmento soppresso stesso).
- **I segnali di scelta del lavoratore (`worker_choice`) richiedono un'attenzione speciale** — la scelta libera è più vicina a un dato comportamentale individuale rispetto a un semplice conteggio di partecipazione.
- **Gli aggregati a livello di singolo partner richiedono un'attenzione speciale** — un tenant piccolo con pochi partner può rendere identificante anche un aggregato "per partner".
- **I segnali di continuità/utilizzo ripetuto richiedono un trattamento più rigoroso** — un pattern di utilizzo ripetuto è strutturalmente più identificante di un conteggio singolo, anche quando N nominale è sopra soglia.

---

## 3. Primitiva di soglia esistente

`lib/privacy/group-threshold.ts` — la primitiva di privacy di piattaforma già esistente:

- **`DEFAULT_MIN_GROUP_SIZE = 10`** — coerente con `safe_aggregation_threshold` citato in `docs/access-matrix.md` e con CLAUDE.md §13.
- **Helper disponibili:** `suppressSmallGroups()` (mappa piatta → gruppi sicuri + bucket `_suppressed` opzionale), `validateNoSmallGroups()` (verifica di violazione, per audit/log server-side, mai esposta al segmento soppresso), `suppressNestedGroupMap()` (mappe annidate, una dimensione alla volta), `summarizeSuppression()` (riepilogo sicuro per il logging, senza nomi di gruppo soppressi).
- **Comportamento di soppressione/omissione:** i gruppi sotto soglia vengono sommati in un bucket `_suppressed`, ma il bucket stesso viene esposto solo se la somma è a sua volta ≥ soglia — se anche il bucket rivelerebbe una popolazione piccola, viene omesso del tutto. I nomi originali dei gruppi piccoli non sono mai restituiti in alcun output.
- **Limitazioni attuali:** la primitiva opera solo su conteggi puri (mappe piatte o annidate a un livello) — non modella pattern temporali (utilizzo ripetuto nel tempo), non modella attacchi di combinazione tra filtri multipli, e non distingue tra tipi di segnale a rischio diverso (un conteggio di adozione e un pattern di continuità non sono trattati diversamente da questa primitiva).
- **Copertura test:** test dedicati esistono per `suppressSmallGroups()` e `validateNoSmallGroups()` in `tests/unit/privacy-boundary.test.ts` (5 test: soglia di default, gruppi tutti sicuri, soppressione con bucket esposto, soppressione con bucket omesso, validazione con/senza violazioni). `suppressNestedGroupMap()` e `summarizeSuppression()` non hanno test dedicati diretti in quel file.

**Questa primitiva può essere riusata concettualmente per il Phase 2.** **Il DPO deve approvare l'applicabilità al Phase 2** prima di qualunque uso reale — non è un'approvazione implicita solo perché la primitiva esiste ed è già usata altrove nella piattaforma. **N≥10 non è automaticamente sufficiente per tutti i tipi di segnale Phase 2** — in particolare non per continuità/utilizzo ripetuto e per aggregati a livello di singolo partner (vedi §8 e §9).

---

## 4. Classi di segnale aggregato Phase 2

| Classe di segnale | Livello di rischio | Perché | Trattamento minimo raccomandato | N≥10 può bastare? | Soglia più stringente probabile? | Revisione DPO obbligatoria? | Revisione CTO obbligatoria? | Visualizzazione azienda |
|---|---|---|---|---|---|---|---|---|
| `uptake` | Medio | Conteggio semplice di adozione, ma può rivelare popolazione totale piccola | Soppressione N≥10 standard | Sì, probabilmente | No | Sì | Sì | Consentita sopra soglia |
| `completion` | Medio | Simile a uptake, ma può incrociarsi con tipo attività per ridurre N effettivo | Soppressione N≥10 + attenzione a combinazioni di filtro | Sì, probabilmente | No | Sì | Sì | Consentita sopra soglia |
| `access` | Medio-alto | Misura distribuzione tra categorie — rischio di combinazione tra categoria e pilastro | Soppressione N≥10 per cella della combinazione, non solo sul totale | Parzialmente | Possibile | Sì | Sì | Gated — solo per cella sopra soglia |
| `value_band` | Basso-medio | Fasce di valore stimate, non importi reali | Soppressione N≥10 standard | Sì | No | Sì | No | Consentita sopra soglia |
| `worker_choice` | **Alto** | La scelta libera è comportamento individuale aggregato — più vicina a un dato di preferenza personale | Soppressione più stringente della soglia standard, mai a livello di singola attività con N piccolo | No, non da sola | **Sì** | **Sì** | Sì | Gated — richiede revisione dedicata |
| `partner_delivery` | Medio-alto | Aggregato a livello di singolo partner (vedi §9) | Soppressione N≥10 + verifica anti-triangolazione partner | Parzialmente | Possibile | Sì | Sì | Gated |
| `continuity` | **Il più alto** | Pattern di utilizzo ripetuto — identificante anche con N nominale sopra soglia (vedi §8) | Finestre più larghe, nessuna disaggregazione per partner/attività, solo livello pilastro/categoria | **No** | **Sì, sempre** | **Sì, obbligatoria prima di qualunque visibilità azienda** | Sì | Gated, non ancora consentita |
| Aggregato a livello di singolo partner | **Alto** | Un tenant piccolo con pochi partner rende identificante anche un aggregato "per partner" (vedi §9) | Soppressione + coarsening, o negazione finché soglia e test anti-triangolazione non passano | No, non da sola | Sì | Sì | Sì | Gated, non ancora consentita di default |
| Aggregato per tipo di attività | Medio | Simile a `access`, rischio di combinazione con categoria fiscale | Soppressione N≥10 per cella | Sì, probabilmente | Possibile | Sì | Sì | Consentita sopra soglia |
| Aggregato per categoria fiscale/welfare | Basso-medio | Metadato proposto, non un dato individuale, ma può combinarsi con altre dimensioni | Soppressione N≥10 standard | Sì | No | Sì | No | Consentita sopra soglia |
| Aggregato per pilastro | Basso | Distribuzione ampia su 5 categorie, rischio di combinazione basso se non incrociato oltre | Soppressione N≥10 standard | Sì | No | Sì | No | Consentita sopra soglia |
| Aggregato per dipartimento/sito/team | **Alto — non ancora progettato** | Nessuna dimensione di questo tipo esiste oggi nel Phase 2 (vedi §10) | Negato di default finché non esiste design dedicato | Non applicabile | Sì, quasi certamente | Sì | Sì | **Negata di default** |
| Aggregato per il futuro adapter KORA Index | Da definire — fuori scope qui | Dipende dalla mappatura futura sulle componenti canoniche | Deve leggere solo aggregati già approvati da soglia, mai eventi sorgente | Da decidere in sede di mappatura futura | Da decidere | Sì | Sì | Non applicabile in questo sprint — vedi §13 |

---

## 5. Bozza di livelli di soglia

**Solo per revisione — non definitivi.**

- **T0:** non mostrare mai individualmente — si applica a qualunque dato a livello di singolo lavoratore/prenotazione/relazione/consenso/evento sorgente.
- **T1:** mostrare solo come diagnostica interna/admin, mai all'azienda — per aggregati con N sotto soglia standard ma potenzialmente utili per il monitoraggio interno di KORA_ADMIN.
- **T2:** aggregato azienda consentito se N≥10 e la classe di segnale non è sensibile — per `uptake`, `completion`, `value_band`, aggregato per pilastro, aggregato per categoria fiscale.
- **T3:** aggregato azienda consentito solo con soglia più stringente o raggruppamento più grossolano — per `access`, `partner_delivery`, aggregato per tipo di attività.
- **T4:** sopprimere sempre fino a decisione DPO — per `worker_choice`, `continuity`, aggregato a livello di singolo partner, aggregato per dipartimento/sito/team.

**Questi livelli non sono definitivi.** Sono una bozza per la revisione DPO/CTO.

---

## 6. Comportamento di soppressione

Stati di output possibili per un segnale aggregato Phase 2, con etichetta company-visibile, significato interno, e cosa viene mostrato:

| Stato | Etichetta company-visibile | Significato interno | Valore metrica mostrato? | Conteggio mostrato? | Placeholder/badge mostrato? | Può alimentare un futuro KORA Index? | Esportabile? |
|---|---|---|---|---|---|---|---|
| `visible` | Valore/conteggio normale | Soglia superata, nessun rischio noto | Sì | Sì | No | Sì (in futuro, previa mappatura approvata) | Sì |
| `suppressed_low_n` | "Dati insufficienti per un aggregato sicuro" | N sotto soglia standard | No | No | Sì | No | No |
| `suppressed_sensitive_pattern` | "Segnale non mostrabile per questa combinazione" | Combinazione di filtri rischia di ridurre N effettivo | No | No | Sì | No | No |
| `suppressed_continuity_risk` | "Continuità non ancora disponibile a questo livello" | Rischio di re-identificazione da pattern di utilizzo ripetuto | No | No | Sì | No | No |
| `suppressed_partner_level_risk` | "Dettaglio per partner non ancora disponibile" | Rischio di triangolazione a livello di singolo partner | No | No | Sì | No | No |
| `suppressed_department_grouping_risk` | "Disaggregazione per reparto non disponibile" | Dimensione non ancora progettata/approvata | No | No | Sì | No | No |
| `needs_dpo_review` | "In attesa di revisione privacy" | Classe di segnale non ancora approvata dal DPO per la visualizzazione azienda | No | No | Sì | No | No |
| `needs_cto_review` | "In attesa di revisione tecnica" | Meccanismo di calcolo/adapter non ancora approvato dal CTO | No | No | Sì | No | No |
| `diagnostic_only` | (non mostrato all'azienda) | Visibile solo a KORA_ADMIN per monitoraggio interno | Sì (solo admin) | Sì (solo admin) | N/A per azienda | No | No (solo audit interno) |
| `not_collected` | "Nessun dato per questo periodo/categoria" | Nessun evento sorgente esistente per questa combinazione — non è soppressione, è assenza di dato | No | No | Sì (neutro, non implica soppressione) | N/A | No |

---

## 7. Regole su piccolo N e re-identificazione

Da coprire in ogni futuro design reale:

- **Piccolo N semplice:** un conteggio grezzo sotto soglia.
- **Tenant piccolo:** l'intera azienda ha una forza lavoro piccola, per cui anche aggregati "grandi" in percentuale sono piccoli in valore assoluto.
- **Dipartimento/sito/team piccolo:** stessa logica del tenant piccolo, applicata a un sottogruppo.
- **Attività rara:** un'attività con pochissime richieste rende identificante chiunque l'abbia scelta.
- **Partner raro:** un partner con pochissime relazioni rende identificante chiunque vi abbia interagito.
- **Categoria fiscale rara:** una categoria poco utilizzata può isolare un piccolo gruppo.
- **Pattern di utilizzo ripetuto raro:** pochi lavoratori con utilizzo ripetuto sono più identificanti di pochi lavoratori con un solo evento.
- **Utilizzo ripetuto dallo stesso piccolo gruppo:** combina i due rischi precedenti.
- **Attacchi di combinazione tra filtri:** incrociare pilastro + categoria fiscale + tipo attività può ridurre N effettivo sotto soglia anche se ogni dimensione singola è sopra soglia.
- **Attacchi di differenziazione periodo-su-periodo:** confrontare due periodi consecutivi può rivelare un singolo evento per differenza, anche se ogni periodo preso singolarmente è sopra soglia.
- **Triangolazione a livello di partner:** incrociare aggregati di più partner può isolare un singolo lavoratore che ha usato più servizi.
- **Triangolazione per ruolo/funzione del lavoratore:** incrociare un aggregato Phase 2 con dati di ruolo/funzione noti altrove (es. Phase 1) può ridurre drasticamente la popolazione anonima.

---

## 8. Trattamento speciale — continuità/utilizzo ripetuto

- **La continuità è la classe di segnale Phase 2 a rischio più alto** — segnalato ripetutamente in ogni revisione Phase 2 condotta finora (`KORA-INDEX-ACTIVATION-INTEGRATION-RO`, `PHASE2-SCHEMA-RO`, `PHASE2-RLS-DESIGN-RO`).
- **I pattern di utilizzo ripetuto possono essere identificanti anche quando N≥10** — perché il pattern stesso (non solo il conteggio) porta informazione.
- **La continuità può richiedere finestre temporali più ampie** — invece di aggregati mensili, potrebbero servire finestre trimestrali o più larghe per diluire il pattern.
- **La continuità può richiedere di non avere mai visualizzazione azienda a livello di singolo partner o singola attività** — solo aggregato a livello di pilastro o categoria, mai più granulare.
- **La continuità può richiedere di avere solo visualizzazione a livello di pilastro/categoria** — coerente con il punto precedente.
- **La continuità richiede approvazione DPO prima di qualunque visibilità azienda** — non è un default consentito nemmeno sopra soglia N standard.

---

## 9. Trattamento speciale — aggregato a livello di singolo partner

- **Un aggregato a livello di singolo partner non è un dato individuale, ma può comunque essere identificante in tenant piccoli** — se solo poche persone in azienda hanno accesso a un dato partner, l'aggregato "per partner" equivale quasi a un dato individuale.
- **Gli aggregati a livello di singolo partner possono rivelare chi ha usato un servizio quando solo poche persone vi avevano accesso** — questo è il vettore di rischio specifico.
- **Gli aggregati a livello di singolo partner dovrebbero essere soppressi o resi più grossolani** a meno che soglia e test anti-triangolazione non siano superati.
- **È richiesta una decisione DPO prima di qualunque visualizzazione azienda** a livello di singolo partner.

---

## 10. Disaggregazione per dipartimento/sito/team

- **Non implementata.**
- **Non ancora progettata per il Phase 2.**
- **Dovrebbe di default essere negata/soppressa.**
- **Richiede un design separato**, non un'estensione automatica del modello Phase 2 esistente.
- **Richiede soglia per gruppo**, non solo una soglia sul totale aziendale.
- **Può richiedere una dimensione minima di forza lavoro per segmento**, oltre alla soglia sul conteggio di eventi.
- **Non dovrebbe essere abilitata solo perché la Fase 1 ha già concetti di dipartimento/sito** — Fase 1 e Fase 2 restano pipeline di segnale distinte (`docs/KORA_ACTIVATION_LAYER_01.md`), e l'esistenza di un concetto in Fase 1 non giustifica l'importazione automatica nel Phase 2 senza revisione propria.

---

## 11. Design del record di decisione di soglia

Concetto solo documentale per il futuro — **nessuno schema o SQL creato qui.**

### `privacy_threshold_rule`
- **Scopo:** regola di soglia configurabile, la decisione DPO resa durevole.
- **Campi bozza:** `id, rule_name, applies_to_signal_class, min_group_size, coarsening_strategy, effective_from, approved_by, approved_at`.
- **Relazione con `activation_signal_aggregate`:** referenziata da ogni riga aggregata per determinare quale regola è stata applicata.
- **Chi può leggere:** KORA_ADMIN (completo), COMPANY_ADMIN (nessuno — è una regola di governance, non un dato operativo).
- **Chi può scrivere:** solo KORA_ADMIN, dopo approvazione DPO.
- **Requisiti di audit:** ogni creazione/modifica deve essere auditata (estensione di `audit.audit_log`).
- **Dipendenza DPO/CTO:** **questa tabella è la decisione DPO stessa, resa durevole** — dipendenza obbligatoria.

### `privacy_threshold_decision`
- **Scopo:** risultato della valutazione della soglia per un gruppo aggregato specifico.
- **Campi bozza:** `id, aggregate_id, rule_id_applied, passed (bool), suppressed_count, decision_state (uno degli stati di §6), computed_at`.
- **Relazione con `activation_signal_aggregate`:** relazione 1—1, ogni riga aggregata ha esattamente una decisione di soglia associata.
- **Chi può leggere:** KORA_ADMIN (completo), COMPANY_ADMIN (solo lo stato/etichetta, mai il conteggio soppresso).
- **Chi può scrivere:** solo il job di calcolo (system-only).
- **Requisiti di audit:** ogni decisione dovrebbe essere tracciabile per audit interno, senza esporre conteggi soppressi all'azienda.
- **Dipendenza DPO/CTO:** entrambi.

---

## 12. Comportamento dell'interfaccia azienda

- **Non mostrare mai righe individuali.**
- **Non mostrare mai `sourceBookingIds`.**
- **Non mostrare mai nominativi, email, o ID lavoratore.**
- **Mostrare un badge "soppresso per privacy" dove appropriato** — mai un vuoto silenzioso senza spiegazione.
- **Non mostrare il conteggio esatto se il conteggio esatto crea un rischio** — anche uno stato "quasi soppresso" (es. N=11 su soglia 10) può essere rischioso se combinato con altre informazioni note.
- **Usare fasce/bande dove più sicuro** invece di un numero esatto.
- **Evitare combinazioni di filtro che aggirino le soglie** — l'interfaccia non dovrebbe permettere di incrociare filtri fino a isolare un gruppo sotto soglia anche se ogni singolo filtro passa la soglia.
- **Dichiarare "dati aggregati insufficienti" piuttosto che "zero"** — zero è un'affermazione fattuale che potrebbe essere falsa (i dati esistono ma sono soppressi) e comunque rischia di essere informativa quanto un conteggio reale.

---

## 13. Confine futuro con il KORA Index

- **Nessuna modifica al calcolo live del KORA Index.**
- **I segnali Phase 2 potranno in futuro alimentare l'unico KORA Index solo attraverso segnali aggregati e approvati da soglia** — mai segnali grezzi, mai eventi individuali.
- **Gli eventi sorgente non devono mai alimentare direttamente l'adapter KORA Index** — solo `activation_signal_aggregate`, mai `activation_signal_source_event`.
- **Il futuro adapter dovrebbe leggere solo segnali aggregati**, mai eventi sorgente, coerente con quanto già raccomandato in `PHASE2-RLS-DESIGN-RO` (scenario di stress test #16).
- **La mappatura sulle componenti canoniche è futura ed è vincolata a revisione CTO/DPO** — non è scope di questo documento.
- **Nessun punteggio companion.**

---

## 14. Strategia di test futura

Test futuri necessari, non implementati in questo sprint:

- Test unitari sulla soglia di gruppo (estensione della copertura già esistente in `tests/unit/privacy-boundary.test.ts` a `suppressNestedGroupMap()` e `summarizeSuppression()`).
- Test di soppressione degli aggregati per ciascuna classe di segnale Phase 2.
- Test di soglia più stringente per la continuità.
- Test di soppressione a livello di singolo partner.
- Test di negazione di default per la disaggregazione per dipartimento/sito/team.
- Test che verifichino l'assenza di `sourceBookingIds` nell'interfaccia azienda.
- Test che verifichino l'assenza di campi individuali del lavoratore nell'interfaccia azienda.
- Test sugli attacchi di differenziazione periodo-su-periodo.
- Test sui guard di route/pagina.
- Test negativi di RLS (quando esisterà RLS reale).
- Test statici di inventario SQL/RLS (quando esisterà SQL reale, sul modello di `rls-policy-inventory.test.ts`).
- Test futuri sull'adapter KORA Index che verifichino che legga solo aggregati, mai eventi sorgente.

---

## 15. Cosa non implementare ancora

- Nessuna tabella di soglia nel DB.
- Nessuna persistenza di `activation_signal`.
- Nessun job di aggregazione.
- Nessuna implementazione reale di `privacy_threshold_rule`.
- Nessun aggregato a livello di singolo partner mostrato all'azienda senza revisione DPO.
- Nessuna visualizzazione azienda della continuità senza una regola più stringente approvata.
- Nessuna disaggregazione per dipartimento/team.
- Nessuna integrazione con il KORA Index.
- Nessun punteggio companion.
- Nessun punteggio di attivazione pubblico separato.
- Nessun self-select worker.
- Nessuna visibilità individuale per l'azienda.
- Nessuna navigazione bulk dei lavoratori da parte del partner.

---

## 16. Decisioni aperte

1. Se N≥10 è sufficiente per gli aggregati Phase 2 di base.
2. Soglia più stringente per continuità/utilizzo ripetuto.
3. Visibilità degli aggregati a livello di singolo partner.
4. Visibilità degli aggregati a livello di singola attività.
5. Visibilità per categoria fiscale/welfare.
6. Disaggregazione per dipartimento/sito/team.
7. Regole di raggruppamento più grossolano (coarsening).
8. Protezione dagli attacchi di differenziazione.
9. Fasce/bande di visualizzazione.
10. Periodo di conservazione dei dati.
11. Regole di esportazione.
12. Sequenza di approvazione DPO.
13. Sequenza di approvazione CTO.

Nessuna di queste è risolta in questo documento.

---

## 17. Prossimo passo raccomandato

**`PHASE2-CONSENT-REVOCATION-DESIGN-01`** — un design doc/test dedicato al modello di consenso e revoca del lavoratore. Si raccomanda questo passo rispetto a `PHASE2-THRESHOLD-TESTS-RO`, `PHASE2-ACCESS-MATRIX-CANACCESS-RO`, o `STOP_FOR_CTO_DPO` perché la sequenza naturale di design Phase 2 (schema → matrice di accesso → soglia di privacy → consenso/revoca) è ora al suo penultimo passo documentale: questo documento ha prodotto un modello di soglia sufficientemente concreto (livelli T0–T4, stati di soppressione, classi di rischio per segnale) da rendere il design di consenso/revoca il prossimo gap logico da colmare prima di qualunque bozza SQL — `worker_consent_event` resta infatti l'unico prerequisito ancora del tutto privo di un design dedicato tra le entità ad alto rischio individuate finora. Una revisione dei soli test di soglia (`PHASE2-THRESHOLD-TESTS-RO`) sarebbe prematura finché DPO non approva almeno i livelli T0–T4 qui proposti.

---

## Documenti collegati

`docs/PHASE2_SCHEMA_DESIGN_01.md`, `docs/PHASE2_ACCESS_MATRIX_DRAFT_01.md`, `docs/PARTNER_ECOSYSTEM_MODEL_01.md`, `docs/KORA_ACTIVATION_LAYER_01.md`, `docs/ACTIVATION_SIGNAL_PIPELINE_01.md`, `docs/COMPANY_ACTIVITY_SIGNAL_PREVIEW_01.md`, `docs/access-matrix.md`.
