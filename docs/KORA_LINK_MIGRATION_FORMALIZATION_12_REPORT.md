# KORA-LINK-MIGRATION-FORMALIZATION-12 — REPORT FINALE

**Sprint:** KORA-LINK-MIGRATION-FORMALIZATION-12

**Classificazione: PASS**

---

## 1. Executive Summary

Lo sprint KORA-LINK-MIGRATION-FORMALIZATION-12 aveva l'obiettivo di chiudere le due azioni di formalizzazione tecnica lasciate aperte da Gate 4 (KORA-LINK-RLS-LIVE-VALIDATION-11, `docs/KORA_LINK_GATE_4_FINAL_REPORT.md`, azioni A e B): promuovere le migrazioni `034_kora_link_schema.sql`, `035_kora_link_rls.sql`, `036_kora_link_rpc_functions.sql` da `supabase/proposed/` a `supabase/migrations/`, e riconciliare in modo controllato la migration history remota dello staging (`haqf****jl`) per le versioni 032–036, senza rieseguire alcun DDL.

Entrambe le azioni sono state completate con esito PASS. La promozione repository non ha modificato alcun contenuto SQL eseguibile (solo header/metadati e una correzione di documentation drift, comment-only). La riconciliazione della migration history è stata eseguita esclusivamente tramite `supabase migration repair`, versione per versione, con verifica intermedia dopo ciascun passo, senza mai eseguire SQL manuale su `supabase_migrations.schema_migrations` e senza mai eseguire un `db push` reale.

---

## 2. Scope dello sprint

- **Parte 1 — repository**: promozione canonica di 034–036, aggiornamento dei test di regressione che presidiavano lo stato pre-promozione, introduzione di un'allowlist esplicita per l'unico finding Gate 4 che richiedeva un adeguamento di test (§10, finding 5/10 del Gate 4 — assenza intenzionale di policy worker-self-select diretta su 5 tabelle).
- **Parte 2 — staging**: riconciliazione della migration history remota (`supabase_migrations.schema_migrations`) con lo stato già effettivamente presente su staging per le versioni 032–036, tramite il solo comando canonico `supabase migration repair`.
- **Fuori perimetro**: qualunque modifica a policy RLS, funzioni, grant o schema; qualunque azione su produzione; cleanup delle fixture KL11; apertura di nuovi sprint.

---

## 3. Promozione repository — 034–036 in `supabase/migrations/`

- `034_kora_link_schema.sql`, `035_kora_link_rls.sql`, `036_kora_link_rpc_functions.sql` spostati da `supabase/proposed/` a `supabase/migrations/`, mantenendo nome file invariato e ordine canonico (033 → 034 → 035 → 036).
- **Nessuna modifica SQL eseguibile**: verificato tramite diff riga-per-riga contro le versioni validate da Gate 4. Le uniche modifiche sono:
  - blocco header/status (da stato "proposto, non applicato" a stato canonico, con riferimento a `docs/KORA_LINK_GATE_4_FINAL_REPORT.md`);
  - testo dei messaggi `RAISE NOTICE` informativi in 035 e 036 (stringhe di stato, non logica);
  - una correzione di documentation drift in 036 (commento aggiuntivo, nessuna modifica al body della funzione): l'header dichiarava erroneamente che `fn_company_link_status_aggregate` scrive su `audit_log` — solo `fn_activate_link_for_worker` lo fa, come già accertato in Gate 4 §11.
- Nessuna riga di `CREATE TABLE`, `CREATE POLICY`, `CREATE FUNCTION`, `GRANT`, `ALTER TABLE ... ROW LEVEL SECURITY` è stata toccata in nessuno dei tre file.

---

## 4. Aggiornamento dei regression lock

- 23 file di test che presidiavano esplicitamente lo stato pre-promozione ("034/035/036 restano in `supabase/proposed/`, non applicate") sono stati trasformati — non eliminati — per presidiare il nuovo stato canonico: presenza in `supabase/migrations/`, assenza da `supabase/proposed/`, ordine e dipendenze intatti, `KORA_LINK_ENABLED` ancora `false` di default, nessun import di KORA Link dai servizi del golden path (scoring/ingestion).
- Zero test eliminati.

---

## 5. Allowlist esplicita — 5 tabelle KORA Link in `rls-policy-inventory.test.ts`

- Il test generico "tabelle worker-scoped devono avere una policy worker-ownership-aware" ha iniziato correttamente a rilevare, una volta che 034–036 sono entrate in `supabase/migrations/`, le 5 tabelle KORA Link (`link_activation_acknowledgements`, `link_assignments`, `link_events`, `link_replacements`, `revocations`) prive di policy diretta di worker-self-select.
- Questo è un finding Gate 4 già validato come design intenzionale (§10): l'accesso worker a queste tabelle passa esclusivamente per le funzioni RPC `SECURITY DEFINER` di `036_kora_link_rpc_functions.sql`, che autenticano il chiamante via `auth.uid()` risolto contro `personal.worker_identity`.
- È stata introdotta un'allowlist nominata esplicitamente sulle 5 tabelle (non un'esclusione generica dello schema `kora_link`), con riferimento diretto a Gate 4 §10 e verifica del percorso RPC alternativo. Il controllo generico continua a fallire per qualunque futura tabella worker-owned non elencata, in kora_link o altrove.
- Nessuna policy SQL modificata.

---

## 6. Qualità del repository

- **Typecheck**: PASS (`tsc --noEmit`, 0 errori).
- **Test**: PASS — 255/255 file, 10.431 test passati (30 skipped, 18 todo, invariati rispetto a prima della promozione).
- **Build**: PASS (`next build`).

---

## 7. Merge su main

- Commit di promozione `f9beb7f` ("feat: promote KORA Link migrations 034-036") pushato su `origin/feature/kora-link-migration-formalization-12` e mergiato su `main` tramite PR #87 (merge commit `6145d5f`).
- `main` locale riallineato a `origin/main` tramite fast-forward pulito, nessun conflitto.

---

## 8. Preflight read-only della migration history

Prima di qualunque azione di scrittura, la migration history remota dello staging è stata ispezionata in sola lettura tramite `supabase migration list --linked`, confermando:

- versioni locali (`supabase/migrations/`): 001–028, 030–036 (029 assente, coerente su entrambi i lati);
- versioni remote registrate: ferme a 001–028, 030, 031;
- nessuna versione remote-only inattesa.

---

## 9. Gap remoto 032–036 rilevato

Confermato un gap tra stato locale e migration history remota per le versioni 032, 033, 034, 035, 036: tutte presenti come file di migrazione canonici, nessuna registrata nella migration history remota, pur essendo già effettivamente applicate/presenti sullo staging.

---

## 10. Effetti live di 032–036 verificati

Prima di qualunque repair, gli effetti reali sullo staging sono stati verificati tramite query read-only dirette (sola `SELECT`, nessuna scrittura):

- grant di 032 (`GRANT USAGE ON SCHEMA network` a `authenticated` e `service_role`; `GRANT ALL` su `network.partner_profile` e `network.partner_identity` a `service_role`) — confermati presenti;
- grant di 033 (`SELECT, INSERT, UPDATE` su `personal.worker_identity` a `service_role`) — confermati presenti;
- 9 tabelle `kora_link` — tutte presenti;
- 22 policy RLS attive — confermate;
- 7 funzioni (`is_kora_admin`, `fn_is_valid_token_digest`, `fn_public_lookup_link`, `fn_activate_link_for_worker`, `fn_revoke_link`, `fn_replace_link`, `fn_company_link_status_aggregate`) — tutte presenti;
- RLS `ENABLE` + `FORCE` su 9/9 tabelle — confermato;
- nessun drift strutturale rispetto ai file promossi.

---

## 11. Riconciliazione — repair sequenziale

Eseguito esclusivamente tramite `supabase migration repair --status applied <versione> --linked`, una versione alla volta, con `supabase migration list --linked` di verifica dopo ciascun passo prima di procedere al successivo.

| Versione | Esito | Verifica post-repair |
|---|---|---|
| 032 | **PASS** | 032 presente local/remote; 033–036 ancora assenti remote; nessuna altra modifica |
| 033 | **PASS** | 033 presente local/remote; 034–036 ancora assenti remote; nessuna altra modifica |
| 034 | **PASS** | 034 presente local/remote; 035–036 ancora assenti remote; nessuna altra modifica |
| 035 | **PASS** | 035 presente local/remote; 036 ancora assente remote; nessuna altra modifica |
| 036 | **PASS** | 036 presente local/remote; nessuna altra modifica |

Nessun SQL manuale eseguito su `supabase_migrations.schema_migrations` in nessun passo.

---

## 12. Migration list finale allineata

Dopo il repair di 036, `supabase migration list --linked` conferma:

- 001–028 presenti, local = remote;
- 029 assente, sia local sia remote (coerente, nessun gap reale);
- 030–036 presenti, local = remote;
- nessuna versione remote-only;
- nessun gap residuo tra 032 e 036.

---

## 13. `db push --dry-run` — PASS

Eseguito `supabase db push --dry-run --linked` dopo il completamento del repair. Output:

> "Remote database is up to date."

---

## 14. Migrazioni pendenti: 0

Il dry-run non ha rilevato alcuna migrazione pendente e nessun DDL pianificato per l'applicazione.

---

## 15. Nessun DDL eseguito

In nessuna fase dello sprint — né nella promozione repository, né nella riconciliazione della migration history, né nelle verifiche — è stato eseguito alcun comando DDL (`CREATE`, `ALTER`, `DROP`, `GRANT`, `REVOKE`) contro lo staging. Tutte le operazioni di scrittura sullo staging si sono limitate a `supabase migration repair`, che modifica esclusivamente la tabella di storico `supabase_migrations.schema_migrations`, non lo schema applicativo.

---

## 16. Staging schema invariato

Lo schema applicativo dello staging (tabelle, policy, funzioni, grant) risulta identico prima e dopo la riconciliazione della migration history, come confermato dalla verifica read-only ripetuta in §17.

---

## 17. Nessun drift strutturale

La verifica read-only finale, ripetuta dopo il completamento del repair, conferma valori identici alla verifica pre-repair (§10): 9 tabelle, 22 policy, 7 funzioni, RLS `ENABLE`+`FORCE` 9/9, grant di 032 e 033 confermati. Nessun drift strutturale introdotto dalla riconciliazione della migration history.

---

## 18. Fixture KL11 ancora intatte

Le fixture create durante KORA-LINK-RLS-LIVE-VALIDATION-11 (prefisso `KL11_C1_`…`KL11_C10_`, incluso il file locale di riferimento tenant) non sono state toccate in nessuna fase di questo sprint. Il cleanup finale resta deliberatamente non eseguito, come da azione G di Gate 4 §14, in attesa di eventuale audit.

---

## 19. Produzione non coinvolta

Ogni comando con effetto di scrittura (repair) o di verifica (migration list, dry-run, query read-only) è stato eseguito esclusivamente contro il progetto Supabase staging linkato (`haqf****jl`), mai contro produzione. Nessuna credenziale, connection string o variabile d'ambiente di produzione è stata utilizzata in nessuna fase.

---

## 20. Decisione finale

Lo sprint KORA-LINK-MIGRATION-FORMALIZATION-12 ha completato con successo la promozione canonica delle migrazioni 034–036 e la riconciliazione controllata della migration history dello staging per le versioni 032–036. Repository, stato live e migration history risultano ora allineati. Il dry-run Supabase conferma zero migrazioni pendenti e nessun DDL da applicare.

---

## 21. Stato delle azioni di formalizzazione Gate 4 (§14)

| Azione | Stato dopo questo sprint |
|---|---|
| A — Promuovere 034–036 a `supabase/migrations/` | **Completata** |
| B — Riconciliare la migration history con lo stato live | **Completata** (032–036) |
| C — Correggere la documentation drift di 036 | **Completata** (comment-only, nessuna modifica al body) |
| D — Audit dei tentativi negati su revoke/replace | Non avviata — decisione di design ancora aperta |
| E — Tabella di provisioning server-side per company/partner | Non avviata — decisione di design ancora aperta |
| F — Trasformare in test automatici solo gli scenari dimostrati | Parzialmente coperta dagli aggiornamenti ai regression lock (§4–5) |
| G — Cleanup fixture KL11 base | Deliberatamente non eseguito, fixture conservate |
| H — Rieseguire typecheck/test/build dopo formalizzazione | **Completata** (§6) |

Gate 3 (DPO) complessivo resta aperto (DPIA prudenziale, RPC di auto-disattivazione worker), indipendentemente da questo sprint, come già riportato in Gate 4 §13.
