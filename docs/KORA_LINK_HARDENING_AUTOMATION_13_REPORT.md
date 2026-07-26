# KORA Link — Hardening Automation Sprint 13 — Final Report

**Sprint:** KORA-LINK-HARDENING-AUTOMATION-13 (13A → 13E)
**Data chiusura:** 2026-07-26
**Ambito:** staging Supabase (`haqf****jl`) e ambiente locale/CI. Nessuna azione su produzione, in nessuna fase.

---

## 1. KORA-LINK-HARDENING-AUTOMATION-13A — Audit hardening

`fn_revoke_link` e `fn_replace_link` non scrivevano alcuna riga `kora_link.audit_log`, su nessun ramo (Gate 4, finding 5/6). Migrazione `039_kora_link_audit_hardening.sql` (via `CREATE OR REPLACE FUNCTION`) aggiunge esattamente due `INSERT INTO kora_link.audit_log` per funzione (successo + diniego per ruolo non autorizzato), a zero modifiche su qualunque altra riga.

- PR #89, commit `7d2d2b8` ("feat: add KORA Link revoke and replace audit"), merge `b721234`.
- Validato manualmente contro un database locale effimero durante la propria FASE 5; validato live contro staging durante 13E (§5, C4.smoke.audit).

## 2. KORA-LINK-HARDENING-AUTOMATION-13B — Company/partner provisioning

Creata `analytics.company_identity` (mirror strutturale di `personal.worker_identity`), le funzioni `kora_link.is_provisioned_company_role()`/`is_provisioned_partner(uuid)`, e aggiornato il ramo `COMPANY_ADMIN` di `fn_company_link_status_aggregate` per richiedere il nuovo controllo di provisioning. Stato classificato esplicitamente nella migrazione: COMPANY provisioning implementato ed enforced; PARTNER provisioning foundation implementato, non ancora collegato a superficie applicativa (deny-by-default invariato).

- PR #90, commit `e353110` ("feat: add KORA Link company and partner provisioning"), merge `72896d2`.
- Migrazione `042_kora_link_company_partner_provisioning.sql`.

## 3. KORA-LINK-HARDENING-AUTOMATION-13C — Automazione C1–C10

Costruita un'architettura di test a tre livelli (A: statico/unitario; B: integrazione locale su Postgres effimero via Supabase CLI, obbligatoria in CI se Docker disponibile; C: staging live, manuale, opt-in). Runner locale esaustivo (`run-behavioral-suite.ts`, 85 scenari inclusi 17 di concorrenza reale a due connessioni per C10) e runner staging live più stretto (`run-live-staging-suite.ts`, sottoinsieme rappresentativo). Ridotti i marcatori `it.todo` BEHAVIORAL-MISSING da 24 a 5 (79%), con riclassificazione motivata (implementati/rinviati per decisione/obsoleti), senza mai trasformare todo in PASS fittizi.

- PR #91, commit `8bf0990` ("test: automate KORA Link behavioral suite"), merge `4eccf39`.
- CI: job `kora-link-local-integration` (sempre attivo se Docker disponibile) + workflow `kora-link-live-staging.yml` (manuale, `workflow_dispatch`, gate di conferma).
- Documentazione: `docs/KORA_LINK_AUTOMATED_TESTING.md`.

## 4. KORA-LINK-HARDENING-AUTOMATION-13D — Governance fixture

Formalizzato il set minimo permanente di fixture KL11 su staging (ereditato da KORA-LINK-RLS-LIVE-VALIDATION-11, mai smantellato): 7 account Auth, 2 tenant, 3 mapping `personal.worker_identity` permanenti. Stabilito il modello canonico: `KL11_COMPANY_ADMIN_A`, `KL11_COMPANY_VIEWER_A` e `KL11_PARTNER_P1` sono **fixture Auth dormienti** — il claim `kora_role` da solo non basta ad ottenere accesso applicativo; è richiesto un mapping `company_identity`/`partner_identity` che, per design, non esiste mai in modo permanente ma solo temporaneamente durante l'esecuzione dei runner (creato e rimosso in `finally`). Creati `check-staging-fixtures.ts` (verifica read-only, fallisce se un mapping permanente non previsto compare, se resta una fixture `KL11_AUTOMATION_`, o se restano righe in `kora_link.*`) e `cleanup-staging-fixtures.ts` (safe-by-default, doppia conferma — variabile d'ambiente + conferma interattiva a runtime — non eseguibile in CI, non eseguito in nessuna fase dello sprint).

- Commit `fc80246` ("docs: formalize KORA Link staging fixture governance"), merge PR #92 → `b4313a4`.
- Come parte della chiusura di 13D è stato colmato un gap di simmetria nel runner live: `run-live-staging-suite.ts` creava già un mapping company temporaneo (`smokeC5Company`) ma non un mapping partner temporaneo — aggiunto `smokeC6Partner`, stesso pattern (profilo/mapping usa-e-getta, cleanup in `finally`).
- Documentazione: `docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md`.

## 5. KORA-LINK-HARDENING-AUTOMATION-13E — Validazione live finale

Eseguita, con autorizzazione esplicita, la suite live contro staging reale (`haqf****jl`):

- **Preflight**: `supabase migration list --linked` — history locale/remota allineata su tutte le migrazioni (001–028, 030–036, 039, 042; 029/037/038/040/041 correttamente assenti, numeri ritirati). `supabase db push --dry-run --linked` → *"Remote database is up to date"*, zero migrazioni pendenti.
- **Fixture check pre-run** (`check-staging-fixtures.ts`, sola lettura): 7/7 account Auth, 2/2 tenant, 3/3 `worker_identity`, 0/0 `company_identity` permanenti, 0/0 `partner_identity` permanenti, 0/0 righe `kora_link.*` — `overall_coherent: true`, exit 0.
- **Suite live staging** (`run-live-staging-suite.ts`, `KORA_LINK_LIVE_TESTS_CONFIRM=YES`): 11/11 scenari PASS — C1 (anon deny), C2/C3 (worker activation valida + mapping assente negato), C4 + C4 audit (revoca KORA_ADMIN, esattamente 1 riga `LINK_REVOKED`, conferma live della 039), C5 (company_identity assente → negato; mapping temporaneo valido → consentito), C6 (partner_identity assente → `is_provisioned_partner()` falso; mapping temporaneo valido → vero), C10 (race a due connessioni PostgreSQL reali distinte: esattamente un vincitore, esattamente una riga `link_assignments` attiva — 0 doppi vincitori, 0 deadlock, 0 stati parziali). Il runner ha usato esclusivamente fixture prefissate `KL11_AUTOMATION_`, mai un mapping permanente sui 7 account di base, cleanup eseguito in `finally`. Nessuna password, connection string, UUID completo o token stampato nell'output.
- **Fixture check post-run**: stessi 7/2/3/0/0/0 attesi, tutti confermati, `overall_coherent: true`, exit 0. Query dirette su `pg_locks`/`pg_stat_activity` confermano 0 lock non concessi e 0 sessioni idle-in-transaction residue.
- **Migration list / dry-run post-run**: identici ai risultati pre-run — history ancora allineata, zero migrazioni pendenti, nessun DDL pianificato.
- **Validazione repository**: typecheck PASS; test 258/258 file, 10599 test PASS (30 skipped, 5 todo residui — tutti con giustificazione documentata, non colmabili senza harness di fault-injection dedicato o decisione di scope); build PASS; suite locale comportamentale 85/85 PASS; suite locale concorrenza 17/17 PASS; `supabase db reset` locale (migrazioni 001–042) completato senza errori bloccanti.

## 6. Migrazioni 039 e 042 applicate su staging

Confermato via `supabase migration list --linked`, sia pre che post esecuzione della suite live: entrambe presenti e allineate (colonna Local = Remote = `039` e `042`).

## 7. History allineata

`supabase migration list --linked` mostra corrispondenza esatta Local/Remote su ogni riga, dalla `001` alla `042`, sia pre-run che post-run.

## 8. Zero migrazioni pendenti

`supabase db push --dry-run --linked` → *"Remote database is up to date."*, sia pre-run che post-run.

## 9. Zero drift strutturale

Nessuna differenza tra lo schema atteso (migrazioni canoniche) e lo stato osservato su staging: il fixture check e il dry-run push non rilevano alcuna discrepanza strutturale prima o dopo l'esecuzione della suite live.

## 10. Zero fixture residue

Il fixture check post-run conferma 0 righe in tutte le 8 tabelle `kora_link.*`, e conteggi di account/tenant/worker_identity identici al set minimo permanente (nessuna fixture `KL11_AUTOMATION_` sopravvissuta). Il cleanup del runner live, eseguito in `finally`, ha rimosso ogni riga temporanea creata durante l'esecuzione.

## 11. Produzione non coinvolta

Ogni operazione di questo sprint (13A–13E) è stata eseguita esclusivamente contro il progetto staging (`haqf****jl`) o contro un database locale effimero. Ogni script con accesso a un database reale (`run-live-staging-suite.ts`, `check-staging-fixtures.ts`, `cleanup-staging-fixtures.ts`) rifiuta esplicitamente qualunque project ref o connection string contenente la sottostringa `prod`, la porta del Transaction pooler (`6543`), e una password che assomigli a una service-role API key. Nessuna azione è stata eseguita su produzione in nessuna fase.

## 12. Decisione finale dello sprint

**KORA-LINK-HARDENING-AUTOMATION-13 — PASS**

Staging security/privacy hardening and behavioral automation complete.
