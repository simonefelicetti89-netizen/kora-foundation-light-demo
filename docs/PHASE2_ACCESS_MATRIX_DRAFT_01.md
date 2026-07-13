# Phase 2 Access Matrix Draft 01 — Non-Authoritative Draft Extension

**Data:** 2026-07-14
**Branch:** `feature/phase2-access-matrix-draft-01`
**Tipo:** Documentazione di design — bozza non autoritativa. Nessun codice modificato, nessuna voce `AccessResource` aggiunta, nessuna RLS, nessun SQL, nessuna modifica a middleware o layout, nessuna implementazione DB, nessuna integrazione con il KORA Index, nessun punteggio companion, nessuna decisione DPO/CTO/fiscale/legale risolta.

---

## 1. Stato e perimetro

**Bozza — non autoritativa.**

Questo documento traduce la revisione read-only `PHASE2-RLS-DESIGN-RO` in una bozza concreta di estensione della matrice di accesso, ancora non parte del documento canonico.

Questo documento:
- **non fa ancora parte di `docs/access-matrix.md` canonico**;
- **non contiene alcuna modifica al codice**;
- **non aggiunge alcuna voce `AccessResource`** a `lib/auth/access-matrix.ts`;
- **non contiene RLS**;
- **non contiene SQL**;
- **non modifica middleware o layout**;
- **non è un'implementazione DB**;
- **non integra il Phase 2 con il calcolo live del KORA Index**;
- **non crea un punteggio companion**;
- non crea un punteggio di attivazione pubblico separato;
- non risolve alcuna decisione DPO, CTO, fiscale o legale.

**Principio di prodotto invariato: ci sarà un solo KORA Index.** Il Phase 2 potrà in futuro alimentare quello stesso KORA Index solo dopo revisione CTO, revisione DPO/legale, soglie di privacy definite, design di consenso/revoca, approvazione delle voci `AccessResource`, approvazione di schema/RLS, e mappatura a livello di metodo sulle componenti canoniche reali — nessuno di questi passaggi avviene in questo sprint.

---

## 2. Riepilogo del modello canonico esistente

- **`docs/access-matrix.md` è il documento autoritativo** — supera qualsiasi check hardcoded nel codice, per dichiarazione esplicita del documento stesso.
- **`lib/auth/access-matrix.ts` è l'implementazione TypeScript** di quella matrice.
- **`canAccess(role, resource, env)` è una funzione pura e deny-by-default** — nessun side effect, nessuna chiamata async, nessuna chiamata DB.
- **La difesa in profondità richiede middleware + guard di layout server + RLS** — tutti e tre obbligatori, nessuna eccezione per i dati individuali del lavoratore.
- **`ADVISOR` è oggi inattivo/deny di default** — ha una riga `DENY` esplicita su ogni risorsa esistente, nessun `require*User()`, nessun login reale, `/advisor` reindirizza permanentemente a una demo statica.
- **L'accesso di `KORA_ADMIN` ai dati individuali del lavoratore è intenzionalmente vincolato e auditato** — mai un bypass silenzioso; la migration 027 ha già rimosso l'accesso `KORA_ADMIN` da `personal.*`.
- **Il Phase 2 ha oggi zero voci `AccessResource` canoniche** — la union type in `lib/auth/access-matrix.ts` copre solo le 8 risorse esistenti, nessuna delle quali è Phase 2.

Le 8 voci `AccessResource` canoniche attuali sono: `company_kpi_kora_index`, `company_config_source_batch`, `company_submissions_approval`, `aggregates_n_ge_10`, `worker_individual_pib`, `worker_individual_uef`, `personal_pseudonym_map`, `hq_operator_console`.

---

## 3. Bozza di convenzione di naming per le risorse Phase 2

**Importante:** le voci `AccessResource` esistenti sono stringhe piatte in `snake_case`, non nomi di schema puntati (es. `worker_individual_pib`, non `personal.worker_pib`). Qualunque bozza di naming Phase 2 deve seguire la stessa convenzione.

Nomi bozza proposti (piatti, `snake_case`):

- `phase2_partner_activity`
- `phase2_company_activity_selection`
- `phase2_worker_activity_eligibility`
- `phase2_worker_activity_action`
- `phase2_partner_activity_booking`
- `phase2_partner_worker_relationship`
- `phase2_activation_signal_source_event`
- `phase2_activation_signal_aggregate`
- `phase2_privacy_threshold_decision`
- `phase2_partner_delivery_evidence`
- `phase2_worker_consent_event`
- `phase2_audit_event`

**I nomi sono bozza.** La denominazione finale richiede revisione CTO. **Nessuna voce di codice esiste ancora** in `lib/auth/access-matrix.ts`.

---

## 4. Catalogo bozza delle risorse

| Risorsa bozza | Entità future correlate | Scopo | Classe di accesso | DPO richiesto | CTO richiesto | Tempistica | Rischio |
|---|---|---|---|---|---|---|---|
| `phase2_partner_activity` | partner_activity, partner_activity_version | Catalogo attività partner | public/published (letture), tenant-owned (selezione azienda) | No | Sì | Presto | Basso |
| `phase2_company_activity_selection` | company_activity_selection, company_activity_budget_policy | Perimetro di abilitazione azienda | tenant-owned | Possibile (se budget) | Sì | Presto | Medio |
| `phase2_worker_activity_eligibility` | worker_activity_eligibility_view | Layer di eleggibilità/discovery privacy-safe | worker-own | Sì | Sì | Non ancora | **Alto** |
| `phase2_worker_activity_action` | worker_activity_action | Azione avviata dal lavoratore | worker-own | Sì | Sì | Non ancora | Alto |
| `phase2_partner_activity_booking` | partner_activity_booking | Richiesta/prenotazione visibile al partner | worker-own, partner-scoped | Sì | Sì | Non ancora | **Alto** |
| `phase2_partner_worker_relationship` | partner_worker_relationship | Relazione nominativa post-consenso | worker-own, partner-scoped | Sì | Sì | Non ancora | **Alto** |
| `phase2_activation_signal_source_event` | activation_signal_source_event | Evento nativo pre-aggregazione | system-only | Sì | Sì | Non ancora | Medio-alto |
| `phase2_activation_signal_aggregate` | activation_signal_aggregate | Segnale aggregato per reporting azienda | company aggregate-only | Sì (soglia) | Sì | Non ancora | Basso se soglia corretta |
| `phase2_privacy_threshold_decision` | privacy_threshold_rule, privacy_threshold_decision | Regola/decisione di soglia privacy | admin-audited (scrittura), company aggregate-only (stato) | **Sì — questa risorsa è la decisione DPO stessa** | Sì | Blocca il resto | Basso (metadato di governance) |
| `phase2_partner_delivery_evidence` | partner_delivery_evidence | Evidenza di erogazione lato partner | partner-scoped (scrittura), company aggregate-only (lettura) | Sì (policy contenuto) | No | Più avanti | Medio |
| `phase2_worker_consent_event` | worker_consent_event | Consenso/revoca per visibilità nominativa | worker-own | Sì | Sì | Non ancora | Alto |
| `phase2_audit_event` | phase2_audit_event | Traccia di audit — estende `audit.audit_log` | admin-audited | No | No | Presto (estensione a basso rischio) | Basso |

---

## 5. Bozza di matrice ruolo/risorsa

Etichette usate: `DENY`, `READ_PUBLISHED`, `READ_OWN`, `WRITE_OWN`, `READ_TENANT`, `WRITE_TENANT`, `READ_PARTNER_SCOPED`, `WRITE_PARTNER_SCOPED`, `READ_AGGREGATE_ONLY`, `ADMIN_READ_AUDITED`, `ADMIN_WRITE_AUDITED`, `SYSTEM_ONLY`, `DPO_GATED`, `CTO_GATED`.

| Risorsa | KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER | ADVISOR | SYSTEM/JOB |
|---|---|---|---|---|---|---|
| phase2_partner_activity | ADMIN_WRITE_AUDITED | READ_TENANT (via selezione) | READ_PUBLISHED (eleggibili) | WRITE_OWN | **DENY** | — |
| phase2_company_activity_selection | ADMIN_READ_AUDITED | WRITE_TENANT | **DENY** | **DENY** | **DENY** | — |
| phase2_worker_activity_eligibility | ADMIN_READ_AUDITED | **DENY** | READ_OWN | **DENY** | **DENY** | SYSTEM_ONLY (derivazione) |
| phase2_worker_activity_action | ADMIN_READ_AUDITED | **DENY** | WRITE_OWN | **DENY** | **DENY** | SYSTEM_ONLY (conversione) |
| phase2_partner_activity_booking | ADMIN_READ_AUDITED | **DENY** | READ_OWN | READ_PARTNER_SCOPED | **DENY** | — |
| phase2_partner_worker_relationship | ADMIN_READ_AUDITED | **DENY** | READ_OWN, WRITE_OWN (revoca) | READ_PARTNER_SCOPED | **DENY** | SYSTEM_ONLY (creazione) |
| phase2_activation_signal_source_event | ADMIN_READ_AUDITED | **DENY** | **DENY** | **DENY** | **DENY** | SYSTEM_ONLY |
| phase2_activation_signal_aggregate | ADMIN_READ_AUDITED | READ_AGGREGATE_ONLY | **DENY** | **DENY** | **DENY** | SYSTEM_ONLY (calcolo) |
| phase2_privacy_threshold_decision | ADMIN_WRITE_AUDITED | READ_AGGREGATE_ONLY (solo stato) | **DENY** | **DENY** | **DENY** | SYSTEM_ONLY |
| phase2_partner_delivery_evidence | ADMIN_READ_AUDITED | READ_AGGREGATE_ONLY | **DENY** | WRITE_PARTNER_SCOPED (proprie) | **DENY** | — |
| phase2_worker_consent_event | ADMIN_READ_AUDITED | **DENY** | READ_OWN, WRITE_OWN (revoca) | **DENY** | **DENY** | — |
| phase2_audit_event | ADMIN_READ_AUDITED | **DENY** | **DENY** | **DENY** | **DENY** | SYSTEM_ONLY (scrittura) |

**Vincoli conservativi rispettati:**
- `ADVISOR` è `DENY` su ogni risorsa, coerente con il pattern deny-by-default già stabilito per le risorse esistenti.
- `COMPANY_ADMIN` è `DENY` su ogni risorsa a livello di singolo lavoratore.
- `COMPANY_ADMIN` può solo leggere segnali Phase 2 aggregati (`READ_AGGREGATE_ONLY`).
- `PARTNER` non ha mai una lettura bulk dei lavoratori eleggibili — solo `READ_PARTNER_SCOPED`, sempre derivato da una relazione esistente.
- `WORKER` può solo leggere/scrivere i propri dati di azione/prenotazione/consenso.
- L'accesso `KORA_ADMIN` su risorse worker-adjacent è sempre `ADMIN_READ_AUDITED` (o `ADMIN_WRITE_AUDITED` solo per `phase2_privacy_threshold_decision`, una risorsa di governance, non di dato individuale) — mai un accesso completo silenzioso.

Alcune risorse dipendono anche da `DPO_GATED`/`CTO_GATED` come prerequisito di attivazione — vedi §4 e §10 per il dettaglio per risorsa.

---

## 6. Bozza di intento `canAccess()`

**Nessuna modifica al codice.** Questa sezione descrive il comportamento futuro *inteso*, non implementato.

| Risorsa | KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER | ADVISOR | `requiresAudit` | Guida `denyReason` | Live/staging/demo differiscono? |
|---|---|---|---|---|---|---|---|---|
| phase2_partner_activity | allowed | allowed (tenant) | allowed (eleggibili) | allowed (proprie) | denied | true per admin | "ADVISOR non ha accesso al catalogo Phase 2" | No |
| phase2_company_activity_selection | allowed | allowed (proprio tenant) | denied | denied | denied | true per admin | "Solo COMPANY_ADMIN del tenant può gestire la selezione attività" | No |
| phase2_worker_activity_eligibility | allowed (supporto) | denied | allowed (proprio) | denied | denied | true per admin | "L'eleggibilità individuale non è mai company-facing" | No |
| phase2_worker_activity_action | allowed | denied | allowed (proprio) | denied | denied | true per admin | "Le azioni individuali del lavoratore non sono mai company-facing" | No |
| phase2_partner_activity_booking | allowed | denied | allowed (proprio) | allowed (scoped) | denied | true per admin | "Le prenotazioni individuali non sono mai company-facing" | No |
| phase2_partner_worker_relationship | allowed | denied | allowed (proprio) | allowed (scoped) | denied | true per admin | "La relazione partner-lavoratore richiede consenso worker-initiated" | No |
| phase2_activation_signal_source_event | allowed | denied | denied | denied | denied | true per admin | "Gli eventi sorgente non sono mai letti da ruoli applicativi non-admin" | No |
| phase2_activation_signal_aggregate | allowed | allowed (solo aggregato) | denied | denied | denied | true per admin | "Solo aggregati sopra soglia sono company-facing" | Possibile: soglie più permissive in demo con dati sintetici |
| phase2_privacy_threshold_decision | allowed | allowed (solo stato) | denied | denied | denied | true per admin | "La regola di soglia è governance, non un dato operativo" | No |
| phase2_partner_delivery_evidence | allowed | allowed (solo aggregato) | denied | allowed (proprie) | denied | true per admin | "L'evidenza di erogazione individuale non è mai company-facing" | No |
| phase2_worker_consent_event | allowed | denied | allowed (proprio) | denied | denied | true per admin | "Il consenso è di proprietà esclusiva del lavoratore" | No |
| phase2_audit_event | allowed | denied | denied | denied | denied | false (è già di per sé un audit trail) | "L'audit trail Phase 2 è admin-only, come audit.audit_log" | No |

**Questo è solo intento.** Nessun codice è stato modificato in `lib/auth/access-matrix.ts` o altrove. **L'implementazione finale deve essere testata prima dell'uso**, con la stessa disciplina già applicata a `pilot-saas-01-role-architecture-invariants.test.ts` e `rls06-kora-admin-access-control.test.ts`.

---

## 7. Implicazioni per middleware e guard di layout

**Nessuna modifica a middleware o layout.** Questa sezione descrive solo implicazioni future.

- **Future route azienda Phase 2** (es. estensioni di `/company/activity-selection`, `/company/activity-signals`): resterebbero sotto `app/company/layout.tsx` (`requireCompanyUser`), ma qualunque nuova API route company-facing dovrebbe restituire solo output aggregato — mai un accesso diretto a tabelle worker-level.
- **Future route lavoratore Phase 2** (es. persistenza reale dietro `/worker/activity-discovery`): resterebbero sotto `app/worker/layout.tsx` (`requireWorkerUser`), che già blocca `KORA_ADMIN` a livello di layout (difesa in profondità, layer 2) — questo blocco deve estendersi a qualunque nuova tabella Phase 2 worker-adjacent.
- **Future route partner Phase 2** (es. persistenza reale dietro `/partner/activity-bookings`): resterebbero sotto `app/partner/layout.tsx` (`requirePartnerUser`), con lettura sempre scoped alla relazione worker-iniziata, mai bulk.
- **Future route admin Phase 2** (es. estensioni di `/admin/activation-signal-pipeline`): resterebbero sotto `app/admin/layout.tsx` (`requireKoraAdmin`), con accesso a dati worker-adjacent sempre auditato.

**Vincoli da rispettare in ogni futura implementazione:**
- **Il prefisso di route non basta** — un prefisso di percorso corretto in middleware non sostituisce un controllo a livello di dato.
- **Il guard di layout server non basta** — impedisce il rendering della pagina ma non protegge una query diretta o una RPC.
- **La RLS è obbligatoria** — resta l'unico livello che tiene anche se l'app fosse compromessa.
- **I dati Phase 2 worker-adjacent persistiti necessitano di protezione di livello worker-individual** — lo stesso standard oggi applicato a `personal.worker_pib`/`worker_identity`, non uno standard più leggero solo perché "è nuovo".
- **`KORA_ADMIN` non deve entrare nelle pagine Phase 2 worker a meno che non sia esplicitamente consentito e auditato** — stesso principio già applicato in `app/worker/layout.tsx` e nel blocco di `middleware.ts` per `worker_individual_pib`.

---

## 8. Note di allineamento RLS

**Nessun SQL scritto qui.** Solo principi di allineamento per un futuro design RLS reale:

- Le policy future devono usare `FORCE ROW LEVEL SECURITY`, non solo l'abilitazione base, per chiudere il bypass del proprietario della tabella — coerente con il pattern già usato su `network.partner_profile`.
- Le policy future devono seguire la convenzione di naming già stabilita nel repo (`<tabella>_<ruolo>_<scope>`).
- Le policy future devono usare le funzioni helper `kora.kora_role()` e `kora.tenant_id()` dove applicabile, non un meccanismo di autorizzazione parallelo.
- Le policy future devono **negare il SELECT diretto dell'azienda** su `worker_activity_action`, `partner_activity_booking`, `partner_worker_relationship`, `worker_consent_event`, `activation_signal_source_event`.
- Le policy future devono **consentire all'azienda solo letture aggregate** da `activation_signal_aggregate`, e solo dopo che la soglia di privacy è stata applicata.
- Le policy future devono **negare la navigazione bulk dei lavoratori** da parte del partner.
- Le policy future devono **vincolare la visibilità nominativa del partner** al consenso/azione avviati dal lavoratore.
- Le policy future devono **negare `ADVISOR` di default**, coerente con il pattern deny-by-default già stabilito per `ADVISOR` sulle risorse esistenti.
- Le policy future devono **auditare l'accesso di `KORA_ADMIN`** ai dati worker-adjacent, mai un accesso silenzioso.

---

## 9. Matrice dei test di confine (boundary stress test)

Conversione in formato documentale dei 16 stress test individuati in `PHASE2-RLS-DESIGN-RO`.

| # | Scenario | Comportamento atteso | Livello responsabile | Risorsa bozza coinvolta | Test futuro richiesto | Dipendenza DPO/CTO | Rischio residuo |
|---|---|---|---|---|---|---|---|
| 1 | L'azienda legge azioni individuali del lavoratore | DENY | Access matrix + RLS | phase2_worker_activity_action | Test negativo stile RLS-03 | CTO | Basso se RLS corretta |
| 2 | L'azienda legge prenotazioni partner | DENY | Access matrix + RLS | phase2_partner_activity_booking | Test negativo dedicato | DPO + CTO | Alto — entità con più PII |
| 3 | L'azienda inferisce scelta worker a N piccolo da aggregato per attività | SUPPRESS | Motore soglia privacy | phase2_activation_signal_aggregate | Nuova classe di test di soppressione | DPO | Alto — vettore di re-identificazione reale |
| 4 | L'azienda vede aggregati a livello partner in un tenant piccolo | DENY/SUPPRESS, in attesa di decisione DPO | Motore soglia privacy + decisione DPO | phase2_activation_signal_aggregate | Non testabile finché DPO non decide | DPO | Medio-alto — decisione aperta |
| 5 | Il partner elenca tutti i lavoratori eleggibili | DENY | Access matrix + RLS | phase2_worker_activity_eligibility | Test negativo — nessuna lettura bulk | CTO | Alto se non bloccato |
| 6 | Il partner legge campi di contatto senza azione del worker | DENY | RLS (gated da relationship) | phase2_partner_worker_relationship | Test: assenza relazione → campi inaccessibili | DPO + CTO | Alto |
| 7 | Il partner legge prenotazioni di un altro partner | DENY | RLS (predicato partner-scoped) | phase2_partner_activity_booking | Test standard di isolamento partner | CTO | Medio |
| 8 | Il worker legge azione/prenotazione/consenso di un altro worker | DENY | RLS (predicato worker-own) | phase2_worker_activity_action, phase2_partner_activity_booking, phase2_worker_consent_event | Test standard di isolamento worker | CTO | Medio |
| 9 | `KORA_ADMIN` legge dati Phase 2 worker-level senza audit | DENY se non auditato | Access matrix (`requiresAudit`) + audit log | tutte le risorse worker-adjacent | Test positivo stile RLS-06 esteso al Phase 2 | CTO | Medio |
| 10 | `ADVISOR` accede a dati worker Phase 2 | DENY | Access matrix (riga DENY esplicita) | tutte le risorse | Estensione di `pilot-saas-01-role-architecture-invariants.test.ts` | CTO | Basso — precedente già stabilito |
| 11 | Aggregato calcolato sotto soglia | SUPPRESS, non azzeramento silenzioso | Motore soglia privacy | phase2_activation_signal_aggregate | Test mirror di `group-threshold.ts` (oggi mancante) | DPO | Medio |
| 12 | Aggregato di continuità/utilizzo ripetuto rischia re-identificazione | Richiede soglia più stringente, in attesa di DPO | Motore soglia privacy + decisione DPO | phase2_activation_signal_aggregate | Non testabile finché DPO non decide la regola più stringente | DPO | **Alto — segnalato ripetutamente in tutte le revisioni precedenti** |
| 13 | Il worker revoca il consenso | L'accesso alla relazione deve terminare; storico secondo policy di retention (non decisa) | RLS (predicato gated da consenso) + policy di retention | phase2_worker_consent_event, phase2_partner_worker_relationship | Nuova classe di test, bloccata da decisione di retention | DPO + CTO | Alto — nessun pattern esistente di revoca end-to-end |
| 14 | L'evidenza di erogazione partner contiene testo libero con info sensibili del worker | Deve restare aggregate-only lato azienda comunque | Policy di contenuto (non decisa) + RLS | phase2_partner_delivery_evidence | Design della policy di contenuto necessario prima di poter testare | DPO | Medio-alto — testo libero difficile da vincolare via sola RLS |
| 15 | L'azienda richiede disaggregazione per dipartimento/sito/team | DENY finché non esistono fonte dati e regole di soglia | Access matrix + motore soglia privacy | phase2_activation_signal_aggregate | Non testabile finché la dimensione non è progettata | DPO + CTO | Medio |
| 16 | Il futuro adapter KORA Index usa eventi sorgente invece di aggregati | Deve essere strutturalmente impossibile | Design dell'adapter (fuori scope) | phase2_activation_signal_source_event, phase2_activation_signal_aggregate | Test a livello adapter che verifichi l'assenza di query dirette su eventi sorgente | CTO | Alto se mai violato |

---

## 10. Decisioni aperte

1. Nomi finali delle voci `AccessResource`.
2. Se tutte e 12 le risorse restano separate o se alcune collassano insieme.
3. Se `privacy_threshold_rule` e `privacy_threshold_decision` richiedono risorse `AccessResource` separate.
4. Se gli aggregati a livello di singolo partner sono visibili all'azienda.
5. Se continuità/utilizzo ripetuto richiede una soglia più stringente.
6. Se la disaggregazione per dipartimento/sito/team è consentita.
7. Se e come `KORA_ADMIN` può accedere a dati Phase 2 worker-adjacent, e sotto quale meccanismo di audit.
8. Comportamento di revoca del consenso.
9. Periodo di conservazione dei dati.
10. Policy di contenuto per l'evidenza di erogazione partner.
11. Sequenza di approvazione CTO/DPO.

Nessuna di queste è risolta in questo documento.

---

## 11. Ordine di implementazione

Ordine bozza, solo documentale:

1. Questa bozza.
2. Revisione CTO/DPO della bozza di matrice di accesso.
3. Aggiornamento bozza autoritativo di `docs/access-matrix.md`.
4. Implementazione delle voci `AccessResource` in `lib/auth/access-matrix.ts`.
5. Test su `canAccess()`.
6. Test su guard di route/layout.
7. Bozza di design/SQL per policy RLS proposte.
8. Test statici di inventario SQL/RLS.
9. Discussione di migration.
10. Implementazione DB solo dopo la chiusura del gate.

---

## 12. Cosa non implementare ancora

- Nessuna modifica di codice alle voci `AccessResource`.
- Nessuna modifica autoritativa a `docs/access-matrix.md`.
- Nessuna policy RLS.
- Nessun SQL.
- Nessuna migration.
- Nessun self-select worker.
- Nessuna visibilità individuale per l'azienda.
- Nessuna navigazione bulk dei lavoratori da parte del partner.
- Nessuna persistenza di `activation_signal`.
- Nessuna integrazione con il KORA Index.
- Nessun punteggio companion.
- Nessun punteggio di attivazione pubblico separato.

---

## 13. Prossimo passo raccomandato

**`PHASE2-PRIVACY-THRESHOLD-DESIGN-01`** — un design doc/test dedicato al modello di soglia privacy e soppressione. Si raccomanda questo passo rispetto a `PHASE2-CONSENT-REVOCATION-DESIGN-01`, `PHASE2-ACCESS-MATRIX-CANACCESS-RO`, o `STOP_FOR_CTO_DPO` perché la tabella §4 di questo documento mostra che `phase2_privacy_threshold_decision` "blocca il resto" più di ogni altra risorsa, e perché continuità/utilizzo ripetuto (§9, scenario 12) è stato segnalato come il rischio più alto in **ogni** revisione Phase 2 fin qui condotta (`KORA-INDEX-ACTIVATION-INTEGRATION-RO`, `PHASE2-SCHEMA-RO`, `PHASE2-RLS-DESIGN-RO`). Il design di consenso/revoca resta un passo successivo ravvicinato, ma strutturalmente meno bloccante.

---

## Documenti collegati

`docs/PHASE2_SCHEMA_DESIGN_01.md`, `docs/PARTNER_ECOSYSTEM_MODEL_01.md`, `docs/KORA_ACTIVATION_LAYER_01.md`, `docs/ACTIVATION_SIGNAL_PIPELINE_01.md`, `docs/COMPANY_ACTIVITY_SIGNAL_PREVIEW_01.md`, `docs/access-matrix.md`.
