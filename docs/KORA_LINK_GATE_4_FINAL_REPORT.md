# GATE 4 — REPORT FINALE

**Sprint:** KORA-LINK-RLS-LIVE-VALIDATION-11

**Classificazione: GATE 4 — PASS CON AZIONI DI FORMALIZZAZIONE PENDENTI**

Non si dichiara produzione pronta. Non si dichiara pilot readiness definitiva: restano prerequisiti di governance tecnica (sezione 14).

---

## 1. Executive Summary

Lo sprint KL11 aveva l'obiettivo di validare, in modo comportamentale e contro il progetto staging reale `haqf****jl`, i confini di sicurezza, identità, tenant, privacy, lifecycle e concorrenza dello schema `kora_link` (migrazioni proposte 034–036), senza mai toccare produzione e senza promuovere le migrazioni nella migration history canonica.

Dieci macro-scenari (C1–C10) sono stati eseguiti. C1–C9 hanno coperto 400 casi/assertion contabilizzati (verifica esplicita in sezione 8), considerando anche il caso C2 inizialmente BLOCKED e successivamente risolto da C3.9. C10 ha aggiunto 30 iterazioni concorrenti locali, 3 race concorrenti live su staging reale e 1 test live separato di rollback recovery.

Nessuno scenario ha prodotto FAIL. Non sono emerse violazioni high o critical, doppi vincitori, deadlock o stati parziali. Sono emersi 15 finding architetturali (nessuno bloccante) e 1 caso di documentation drift tra codice e commento di header.

Il Gate è classificato PASS CON AZIONI DI FORMALIZZAZIONE PENDENTI: la validazione tecnica è completa, ma la promozione canonica delle migrazioni e la riconciliazione della migration history restano aperte.

---

## 2. Scope del Gate 4

- **Oggetto**: schema `kora_link` (9 tabelle, 22 policy RLS attive, 7 funzioni), definito in `supabase/proposed/034_kora_link_schema.sql`, `035_kora_link_rls.sql`, `036_kora_link_rpc_functions.sql`.
- **Perimetro**: validazione comportamentale live contro staging reale; mai contro produzione; mai tramite modifica di migration history.
- **Fuori perimetro**: promozione delle migrazioni, riconciliazione dello storico, correzione della documentation drift, implementazione di audit aggiuntivo — tutte rimandate allo sprint successivo (sezioni 14 e 17).
- **Ruoli coperti**: anon, WORKER, COMPANY_ADMIN, COMPANY_VIEWER, PARTNER, KORA_ADMIN, service_role.

---

## 3. Ambiente verificato

- Progetto staging: `haqf****jl` (Supabase). Produzione mai coinvolta in nessuno dei dieci scenari.
- Percorsi di accesso: Supabase SQL Editor (C1–C9); connessione PostgreSQL diretta via Supavisor Session pooler, porta 5432 (C10 live) — mai Transaction pooler (porta 6543), mai credenziali service-role usate come password database.
- Client PostgreSQL per C10: driver Node.js `pg`, installato esclusivamente in directory temporanea (`/tmp/kora-c10-pg-runner`), mai nel repository, mai globalmente.
- Fixture: esclusivamente prefissate `KL11_C1_`…`KL11_C10_`, create in transazioni auto-rollback (C1–C9) o esplicitamente ripulite post-commit (C10, per necessità strutturale di concorrenza reale — sezione 9).

---

## 4. Stato iniziale e feature flag

- `KORA_LINK_ENABLED` di default `false`; nessuna feature flag è stata attivata durante l'intero sprint.
- KORA Link risultava, prima di questo sprint, "frozen" e privo di accoppiamento con il golden path.
- Nessuna fixture `kora_link` persistente esisteva prima dell'inizio di C1.

---

## 5. Migrazioni 034–036

- Le tre migrazioni restano in `supabase/proposed/`, non promosse a `supabase/migrations/`.
- Gate 2 (revisione tecnica CTO): sostanzialmente chiuso a livello ingegneristico (KL-19).
- Gate 3 (DPO/legale): i quattro blocker genuini sono stati ratificati (KORA-LINK-DPO-DECISIONS-09) — retention documentata, `request_fingerprint` rimosso, `consent_version` canonico, `delivery_channel` enum strutturato. Gate 3 non è complessivamente chiuso: restano DPIA prudenziale e RPC di auto-disattivazione worker.
- Il Gate 4 (revisione RLS 035) è ora validato comportamentalmente dal vivo — questo report ne costituisce l'evidenza.

---

## 6. Limite della migration history

Le migrazioni 034–036 sono state rese raggiungibili su staging per scopi di validazione live fuori dal percorso canonico (mai tramite `supabase migration up` o `supabase db push`, mai modificando `supabase/migrations/`). Ne consegue che:

- Lo schema attualmente presente su staging non è riconciliato con la migration history tracciata nel repository.
- Nessuna azione di questo Gate ha alterato tale storico.
- La riconciliazione formale (promozione dei file, più verifica che lo stato applicato coincida esattamente con quanto promosso) resta un prerequisito di governance, non un'attività già svolta — vedi sezione 14.

---

## 7. Risultati strutturali

| Elemento | Verificato |
|---|---|
| 9 tabelle (`link_batches`, `links`, `link_assignments`, `link_activation_acknowledgements`, `link_events`, `revocations`, `link_replacements`, `audit_log`, `link_delivery_records`) | Sì |
| 22 policy RLS attive (+1 `kl_assignments_worker_self_select` commentata, non attiva) | Sì |
| 7 funzioni (`is_kora_admin`, `fn_is_valid_token_digest`, `fn_public_lookup_link`, `fn_activate_link_for_worker`, `fn_revoke_link`, `fn_replace_link`, `fn_company_link_status_aggregate`) | Sì |
| RLS ENABLE + FORCE su 9/9 tabelle | Sì |
| Nessun GRANT DELETE su alcun ruolo applicativo, su nessuna delle 9 tabelle | Sì |
| 5 tabelle storiche append-only (`link_activation_acknowledgements`, `link_events`, `revocations`, `link_replacements`, `audit_log`) — solo SELECT/INSERT concessi | Sì |
| Nessuna colonna di token raw persistito — solo `token_digest` (64 hex) e `token_digest_prefix` (8 char) | Sì |
| Soglia privacy `safe_aggregation_threshold = 10`, hardcoded, applicata per singolo bucket di stato | Sì |

---

## 8. Risultati comportamentali C1–C9

| Test | Esito | Casi |
|---|---|---|
| C1 — ANON | PASS | 43 |
| C2 — WORKER IDENTITY | PASS | 13 (12 PASS, 1 inizialmente BLOCKED, risolto da C3.9) |
| C3 — ACTIVATION LIFECYCLE | PASS | 12 |
| C4 — REVOCATION | PASS | 12 |
| C5 — COMPANY ADMIN / VIEWER | PASS | 88 |
| C6 — PARTNER DENY-BY-DEFAULT | PASS | 49 |
| C7 — KORA_ADMIN | PASS | 85 |
| C8 — SERVICE ROLE | PASS | 75 |
| C9 — SAFE AGGREGATION 9/10/11 | PASS | 23 |
| **Totale C1–C9** | | **400** |

Verifica del totale: 43 + 13 + 12 + 12 + 88 + 49 + 85 + 75 + 23 = 400. Il ricalcolo esplicito conferma il valore riportato; nessuna differenza rilevata.

Punti esplicitamente verificati attraverso questi scenari:

- Isolamento worker e tenant: confermato in C2 e C3.
- Attivazione derivata da `auth.uid()` e `personal.worker_identity`: `fn_activate_link_for_worker` non accetta alcun parametro `p_worker_id`; firma reale: `(p_token_digest text, p_activation_notice_version text)`. L'identità worker è risolta esclusivamente da `auth.uid()` internamente.
- Worker disabled bloccato operativamente: verificato via il branch che restituisce `unavailable` quando lo stato del worker è `disabled`.
- Revoca e sostituzione: C4 e C7 confermano transizioni di stato coerenti, nessuna duplicazione, idempotenza su richieste ripetute.
- Deny-by-default PARTNER: C6, 49/49, nessuna superficie KORA Link attiva per questo ruolo.
- KORA_ADMIN globale cross-tenant by design: confermato strutturalmente (nessuna delle 22 policy attive referenzia `kora.tenant_id()`) ed empiricamente in C7.
- service_role con BYPASSRLS ma soggetto a grant e vincoli DB: C8 dimostra che BYPASSRLS bypassa solo RLS, non i GRANT (ad esempio `is_kora_admin()` non è concesso a service_role) né UNIQUE, CHECK o FOREIGN KEY.
- Soglia privacy 10: C9 conferma 9 soppresso (count NULL), 10 visibile, 11 visibile, nessun off-by-one, soglia applicata indipendentemente per bucket.

---

## 9. Evidenza C10 locale e live

**Validazione locale**: 30/30 iterazioni concorrenti PASS, eseguite con due connessioni PostgreSQL reali contro un ambiente locale isolato.

**Staging live**, eseguito con due processi PostgreSQL realmente distinti (driver Node.js `pg`, connessione Session pooler porta 5432), con PID di backend verificati numerici e distinti prima di ogni race:

- 3/3 race concorrenti PASS:
  - A1 contro A2 sullo stesso link;
  - A1 contro A1 (stesso worker, due sessioni);
  - A1 (tenant A) contro B1 (tenant B) sullo stesso link tenant A.
- Rollback recovery live: PASS. Test separato, sequenziale e non concorrente per costruzione: la sessione A attiva e poi esegue ROLLBACK, la sessione B successiva attiva pulitamente.
- Doppio vincitore: 0.
- Deadlock: 0.
- Stato parziale: 0.
- Cleanup completo.
- Fixture residue: 0.

Meccanismo osservato: `FOR UPDATE NOWAIT` sulla riga `links` serializza i tentativi; il secondo chiamante riceve uniformemente stato di errore con motivo `concurrent_request` in tutte e tre le race — il lock viene conteso prima di qualunque controllo di stato o tenant, per cui anche B1, cross-tenant, riceve `concurrent_request` e non un rifiuto specifico di tenant. Il vincolo `uq_assignment_link_active` resta confermato come difesa aggiuntiva, non necessaria ad attivarsi nelle race osservate poiché il lock ha già serializzato correttamente. Per ogni link raced: esattamente un assignment attivo, un acknowledgement coerente, un evento di attivazione completata, una riga di audit corrispondente — nessuna riga parziale o orfana. Cleanup finale eseguito con connessione owner, mai con ruolo service_role, poiché DELETE non è concesso a nessun ruolo applicativo.

---

## 10. Findings architetturali

1. COMPANY_ADMIN e COMPANY_VIEWER differiscono materialmente solo per `fn_company_link_status_aggregate`.
2. I ruoli company e PARTNER non hanno una tabella di provisioning equivalente a `personal.worker_identity`; il database si fida dei claim JWT firmati.
3. PARTNER non ha oggi alcuna superficie KORA Link attiva.
4. KORA_ADMIN non può leggere `personal.worker_identity` direttamente per effetto della migration 027, che ha rimosso la policy `worker_identity_kora_admin_all` senza sostituto.
5. `fn_revoke_link` e `fn_replace_link` non scrivono `audit_log`.
6. I tentativi amministrativi negati su revoke e replace non lasciano alcun audit trail.
7. `fn_company_link_status_aggregate` non scrive `audit_log`, nonostante l'header di 036 affermi il contrario (sezione 11).
8. La soglia 10 è hardcoded e applicata per singolo bucket di stato, non sul totale tenant.
9. Wrong role, wrong tenant e zero dati restituiscono tutti result set vuoto, indistinguibili dalla sola forma della risposta.
10. La policy `kl_assignments_worker_self_select` è presente nel commento del file 035 ma commentata, non attiva.
11. `fn_activate_link_for_worker` usa `FOR UPDATE NOWAIT` e converte la contesa in `concurrent_request`.
12. Il lock viene conteso prima del controllo tenant e stato: anche il worker cross-tenant concorrente riceve `concurrent_request`.
13. `link_assignments.worker_id` referenzia `personal.worker_identity.id`, non `auth.users.id`.
14. Nessun rischio deadlock strutturale rilevato nel flusso testato, poiché NOWAIT elimina l'attesa e quindi elimina l'attesa circolare.
15. Nessuno stato parziale sopravvive alle eccezioni o al rollback: il blocco EXCEPTION di PL/pgSQL annulla tutte le scritture della funzione fino a quel punto.

---

## 11. Documentation drift

L'header di `036_kora_link_rpc_functions.sql`, nella nota di modifica KORA-LINK-SECURITY-FOUNDATION-08, dichiara che `fn_activate_link_for_worker` e `fn_company_link_status_aggregate` scrivono su `kora_link.audit_log`. La lettura diretta del body di `fn_company_link_status_aggregate` e la verifica live confermano che nessun INSERT su `audit_log` esiste in questa funzione, su alcun percorso, di successo o di diniego. Non è un difetto funzionale poiché i gate di privacy e tenant restano applicati correttamente, ma è una discrepanza tra documentazione e codice che va corretta o allineata (sezione 14).

---

## 12. Incidenti operativi

UUID sintetici o di staging sono stati mostrati accidentalmente in output di terminale in alcune occasioni, mai in file tracciati né in commit. Nessuna password, JWT, token o service-role key è mai stata esposta. Gli UUID non sono credenziali. Nessuna produzione è mai stata coinvolta. È stato successivamente introdotto e rispettato un divieto esplicito di preview raw dei file contenenti UUID.

Diverse esecuzioni iniziali sono fallite per cause via via diagnosticate e risolte: meta-comandi psql incompatibili con il SQL Editor; copie in `/tmp` e nella root divergenti tra loro; placeholder non sostituiti in una delle due copie; password del database non URL-encoded nella connection string.

Durante C10 live, un tenant UUID è stato stampato in chiaro in un output di setup, con mascheramento sistematico introdotto immediatamente dopo. Uno script di supporto, non la funzione applicativa, ha eseguito per errore un COMMIT reale al posto del ROLLBACK previsto nel primo tentativo del test di rollback, per un bug di sostituzione stringa. Lo stato è comunque rimasto coerente, con un solo vincitore e nessuna corruzione, e il test è stato ripetuto correttamente su una fixture non ancora utilizzata. Il cleanup finale è stato completo e verificato. Nessuna contaminazione permanente di staging è stata rilevata.

---

## 13. Rischi residui

- Migration history non riconciliata: lo schema live su staging non corrisponde a ciò che è formalmente tracciato in `supabase/migrations/`.
- Gate 3 DPO non complessivamente chiuso: DPIA prudenziale e RPC di auto-disattivazione worker restano aperti.
- Nessun audit trail per tentativi amministrativi negati su revoke e replace: un attore con credenziali service_role ma senza claim KORA_ADMIN può tentare un'azione amministrativa senza lasciare traccia forense.
- Documentation drift non corretto, come descritto in sezione 11.
- Assenza di tabella di provisioning server-side per ruoli company e partner: il database si affida interamente ai claim JWT firmati, senza cross-check di mapping account come avviene per WORKER.
- PARTNER privo di superficie funzionale reale: il deny-by-default è confermato, ma non rappresenta ancora un'assenza di design maturo.

---

## 14. Azioni di formalizzazione

A. Promuovere 034–036 da `supabase/proposed/` a `supabase/migrations/` seguendo il pattern canonico del repository.

B. Riconciliare in modo sicuro la migration history, verificando che lo stato applicato su staging coincida esattamente con i file promossi.

C. Correggere la documentation drift di 036, oppure implementare l'audit dichiarato per `fn_company_link_status_aggregate`.

D. Decidere se aggiungere audit dei tentativi amministrativi negati su `fn_revoke_link` e `fn_replace_link`.

E. Valutare una tabella di provisioning server-side per company e partner, analoga a `personal.worker_identity`.

F. Trasformare in test automatici di repository solo gli scenari realmente dimostrati in questo Gate.

G. Conservare le evidenze di questo Gate e solo successivamente eseguire il cleanup finale di account, mapping e tenant KL11 di base, non ancora eseguito: restano intatti per eventuale audit.

H. Rieseguire typecheck, test e build del repository dopo la formalizzazione delle migrazioni.

---

## 15. Decisione finale

Il Gate 4 ha validato con evidenze strutturali e comportamentali i confini di sicurezza, identità, tenant, privacy, lifecycle e concorrenza del KORA Link sullo staging reale. Tutti gli scenari C1–C10 risultano PASS. Non sono emerse violazioni high o critical, doppi vincitori, deadlock o stati parziali. Il Gate è pertanto classificato PASS CON AZIONI DI FORMALIZZAZIONE PENDENTI. La promozione canonica delle migrazioni 034–036 e la riconciliazione della migration history restano prerequisiti di governance tecnica prima della chiusura definitiva e dell'eventuale pilot readiness.

---

## 16. Matrice test/evidenze

| Test | Scenario | Ruoli coinvolti | Esito | Evidenza chiave |
|---|---|---|---|---|
| C1 | ANON | anon | PASS — 43 | Deny-by-default salvo `fn_public_lookup_link` e `fn_is_valid_token_digest` |
| C2 | WORKER IDENTITY | WORKER | PASS — 13 (12 PASS, 1 BLOCKED risolto da C3.9) | Mapping `personal.worker_identity` |
| C3 | ACTIVATION LIFECYCLE | WORKER | PASS — 12 | Identità derivata solo da `auth.uid()`, nessun parametro `p_worker_id` |
| C4 | REVOCATION | KORA_ADMIN | PASS — 12 | Transizioni di stato coerenti |
| C5 | COMPANY ADMIN / VIEWER | COMPANY_ADMIN, COMPANY_VIEWER | PASS — 88 | Differenza unica: aggregate RPC |
| C6 | PARTNER DENY-BY-DEFAULT | PARTNER | PASS — 49 | Nessuna superficie attiva |
| C7 | KORA_ADMIN | KORA_ADMIN | PASS — 85 | Globale cross-tenant by design |
| C8 | SERVICE ROLE | service_role | PASS — 75 | BYPASSRLS non equivale a bypass di grant o vincoli |
| C9 | SAFE AGGREGATION 9/10/11 | COMPANY_ADMIN, KORA_ADMIN, COMPANY_VIEWER | PASS — 23 | Soglia 10 applicata per bucket |
| C10 | CONCURRENCY locale | WORKER | PASS — 30/30 iterazioni | Risposta `concurrent_request` uniforme |
| C10 | CONCURRENCY live | WORKER | PASS — 3/3 race, rollback recovery PASS | PID distinti, 0 doppi vincitori, 0 deadlock, 0 stati parziali |

---

## 17. Prossimo sprint raccomandato

KORA-LINK-MIGRATION-FORMALIZATION-12 — non avviato.
