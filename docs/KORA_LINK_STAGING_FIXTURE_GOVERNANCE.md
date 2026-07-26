# KORA Link — Staging Fixture Governance

**Sprint:** KORA-LINK-HARDENING-AUTOMATION-13D — FIXTURE GOVERNANCE
**Data:** 2026-07-26
**Ambito:** solo progetto staging Supabase. Nessuna azione su produzione. Nessun dato reale coinvolto.

---

## 1. Scopo

Questo documento formalizza il **set minimo permanente di fixture KL11** presenti sul progetto staging, ereditato da KORA-LINK-RLS-LIVE-VALIDATION-11 (KL11) e mai smantellato per volontà esplicita (Gate 4, azione G: "restano intatti per eventuale audit").

L'obiettivo non è creare nuove fixture né eliminare quelle esistenti, ma:

- rendere esplicito e verificabile lo stato atteso di queste fixture;
- definire ownership, uso consentito/vietato, retention e lifecycle;
- fornire uno strumento di verifica automatica ripetibile (`check-staging-fixtures.ts`);
- fornire uno strumento di eliminazione controllata, non eseguibile per errore (`cleanup-staging-fixtures.ts`), da usare solo in futuro e solo con doppia conferma esplicita.

## 2. Perimetro

In perimetro:

- i 7 account Auth di base KL11 (1 KORA_ADMIN, 1 COMPANY_ADMIN, 1 COMPANY_VIEWER, 1 PARTNER, 3 WORKER);
- i 2 tenant di base KL11 (`KL11_TENANT_A`, `KL11_TENANT_B`);
- il relativo mapping di identità (`personal.worker_identity`, `analytics.company_identity`, `network.partner_identity`);
- le tabelle applicative `kora_link.*`, che devono restare a **0 righe residue** al di fuori delle esecuzioni di test (le fixture applicative dei runner C1–C10 sono transitorie, non permanenti — vedi sezione 14).

Fuori perimetro:

- produzione (mai toccata, in nessuna fase);
- qualunque dato lavoratore reale;
- qualunque nuova fixture applicativa non prefissata `KL11_AUTOMATION_`;
- l'esecuzione dello script di cleanup (non eseguito in questo sprint, per istruzione esplicita).

## 3. Inventario fixture (set minimo permanente)

Stato verificato live, sola lettura, il 2026-07-26 contro il progetto staging (`haqf****jl`).

| Alias | Tipo | Ruolo | Tenant | Scopo | Owner operativo |
|---|---|---|---|---|---|
| `KL11_ADMIN` | Auth | KORA_ADMIN | — (globale) | Percorsi cross-tenant, revoche/sostituzioni admin-only (C4, C8) | Engineering KORA Link |
| `KL11_COMPANY_ADMIN_A` | Auth | COMPANY_ADMIN | `KL11_TENANT_A` | Aggregati company-level, differenziale admin/viewer (C5) | Engineering KORA Link |
| `KL11_COMPANY_VIEWER_A` | Auth | COMPANY_VIEWER | `KL11_TENANT_A` | Differenziale sola-lettura vs admin (C5) | Engineering KORA Link |
| `KL11_PARTNER_P1` | Auth | PARTNER | — (non ancora mappato) | Deny-by-default partner, provisioning foundation (C6, C8) | Engineering KORA Link |
| `KL11_WORKER_A1` | Auth + `worker_identity` | WORKER | `KL11_TENANT_A` | Attivazione/lifecycle worker, race C10 (A1 vs A2, A1 vs B1) | Engineering KORA Link |
| `KL11_WORKER_A2` | Auth + `worker_identity` | WORKER | `KL11_TENANT_A` | Race concorrenza stesso tenant (C10) | Engineering KORA Link |
| `KL11_WORKER_B1` | Auth + `worker_identity` | WORKER | `KL11_TENANT_B` | Race cross-tenant asimmetrica (C10) | Engineering KORA Link |
| `KL11_TENANT_A` | `analytics.tenant` | — | — | Isolamento multi-tenant (C5, C7, C9, C10) | Engineering KORA Link |
| `KL11_TENANT_B` | `analytics.tenant` | — | — | Isolamento multi-tenant, contro-parte cross-tenant (C10) | Engineering KORA Link |

Risultato inventario live (2026-07-26):

| Categoria | Attese | Trovate | Esito |
|---|---|---|---|
| Account Auth `kl11.test` | 7 | 7 | conforme |
| — di cui KORA_ADMIN | 1 | 1 | conforme |
| — di cui COMPANY_ADMIN | 1 | 1 | conforme |
| — di cui COMPANY_VIEWER | 1 | 1 | conforme |
| — di cui PARTNER | 1 | 1 | conforme |
| — di cui WORKER | 3 | 3 | conforme |
| Tenant `KL11_TENANT_*` | 2 | 2 | conforme (entrambi `is_active = true`) |
| `personal.worker_identity` | 3 | 3 | conforme (tutti `status = active`, 2 su tenant A, 1 su tenant B) |
| `analytics.company_identity` (permanenti) | 0 | 0 | conforme — fixture dormiente per design (vedi §9) |
| `network.partner_identity` (permanenti) | 0 | 0 | conforme — fixture dormiente per design (vedi §9) |
| Righe residue `kora_link.*` (8 tabelle) | 0 | 0 | conforme |

Nessun account risulta `banned`/disabilitato lato Auth. Nessun dato reale rilevato — dominio email esclusivamente `kl11.test`, nomi tenant esplicitamente sintetici (`KL11 Synthetic Tenant A/B`).

## 4. Ownership

- **Owner operativo**: Engineering KORA Link (chi esegue gli sprint di hardening/automazione sul modulo KORA Link).
- **Approvazione a modificare/eliminare**: nessuna modifica o eliminazione di queste fixture senza autorizzazione esplicita — sono l'unica base condivisa per la riproducibilità dei runner C1–C10 in staging (`run-live-staging-suite.ts`) e per audit futuri.
- **Nessun owner individuale nominale**: la governance è di sprint/modulo, non di persona, per evitare dipendenza da un singolo account.

## 5. Classificazione TEST

Tutte le fixture di questo inventario sono classificate **TEST — dato sintetico**:

- dominio email esclusivamente `kl11.test` (mai un dominio reale);
- nomi tenant esplicitamente etichettati "Synthetic";
- nessun nome, cognome, email o identificativo di una persona reale;
- nessun dato lavoratore reale in nessuna tabella collegata.

Questa classificazione è verificata a ogni esecuzione di `check-staging-fixtures.ts` (rifiuto se il dominio email non contiene `kl11`).

## 6. Uso consentito

- Esecuzione manuale, opt-in, del runner `run-live-staging-suite.ts` contro staging.
- Verifiche di sola lettura tramite `check-staging-fixtures.ts`.
- Audit periodico dello stato (v. §11).
- Debug mirato di un singolo scenario C1–C10 in staging, sempre con fixture applicative temporanee prefissate `KL11_AUTOMATION_` e cleanup a fine sessione.

## 7. Uso vietato

- Utilizzo in produzione, in qualunque forma o percorso.
- Aggiunta di dati lavoratore reali, nomi reali, email reali a queste fixture o alle tabelle collegate.
- Creazione di nuove fixture di base senza aggiornare questo documento.
- Uso di queste credenziali in demo, pilot o presentazioni verso clienti/terzi.
- Condivisione delle password fuori dai canali definiti in §8.
- Esecuzione dello script di cleanup senza le due conferme esplicite previste (v. §10).

## 8. Gestione password

- Le password di questi 7 account esistono **solo** in file locali ignorati da Git (pattern `.env*` in `.gitignore`) o in un secret manager — mai nel repository, mai in un commit, mai in un messaggio di log o report.
- Rotazione periodica raccomandata: ad ogni chiusura di sprint KORA Link che ha usato attivamente questi account contro staging, o comunque non oltre una cadenza trimestrale.
- Nessuna password, connection string, token o chiave è mai stampata da nessuno script di questa governance (`check-staging-fixtures.ts`, `cleanup-staging-fixtures.ts`) — solo identificatori mascherati (`primi4****ultimi2`).

## 9. Lifecycle mapping

**Modello canonico (formalizzato in questo sprint, sostituisce l'inquadramento come "gap" usato nella prima stesura di questo documento):**

Il set minimo permanente comprende **7 account Auth e 2 tenant**, ma solo **3 mapping di identità permanenti** — quelli dei worker. Questo è intenzionale, non un difetto:

- `personal.worker_identity`: **3 mapping permanenti**, completi e attivi (`status = active`, 2 su `KL11_TENANT_A`, 1 su `KL11_TENANT_B`). I worker sono l'unico ruolo il cui accesso applicativo KORA Link dipende da un mapping stabile, perché C2/C3/C7/C9/C10 devono poter attivare/revocare/gareggiare in modo ripetibile senza riprovisionare nulla a ogni run.
- `analytics.company_identity`: **0 mapping permanenti attesi**, sempre. `KL11_COMPANY_ADMIN_A` e `KL11_COMPANY_VIEWER_A` sono **fixture Auth dormienti**: l'account esiste (email, password, ruolo in `app_metadata`), ma il solo claim `kora_role = COMPANY_ADMIN/COMPANY_VIEWER` sul JWT **non è sufficiente** a ottenere accesso applicativo — `kora_link.is_provisioned_company_role()` (migrazione 042) richiede in aggiunta una riga `company_identity` con `tenant_id`/`role`/`status='active'` coerenti, che queste due fixture non hanno mai in modo permanente. Un mapping compare **solo temporaneamente**, creato dai runner contro un database reale (locale o staging) su un `auth_user_id` usa-e-getta generato al volo — non sui due account Auth dormienti stessi — e viene sempre rimosso in un blocco `finally` a fine esecuzione (`run-behavioral-suite.ts` C5, `run-live-staging-suite.ts` `smokeC5Company`).
- `network.partner_identity`: stesso principio. **0 mapping permanenti attesi.** `KL11_PARTNER_P1` è una fixture Auth dormiente: nessuna riga `partner_identity`/`partner_profile` collegata in modo permanente. `kora_link.is_provisioned_partner()` richiede lo stesso tipo di mapping esplicito, e resta comunque **deny-by-default** anche con mapping valido — nessuna RPC KORA Link concede oggi superficie al ruolo PARTNER (`docs/KORA_LINK_GATE_4_FINAL_REPORT.md`). Un mapping partner compare **solo temporaneamente** nei runner (`run-behavioral-suite.ts` C6, `run-live-staging-suite.ts` `smokeC6Partner`), su un profilo partner e un `auth_user_id` usa-e-getta, sempre rimossi in `finally`.

**Regola di coerenza**: nessun mapping temporaneo — worker, company o partner che sia — deve sopravvivere a un'esecuzione di test. Se `check-staging-fixtures.ts` trova più di 0 righe `company_identity`/`partner_identity` a riposo (fuori da un'esecuzione di test in corso), questo è **sempre un'incoerenza**: o un residuo di un run interrotto, o un mapping permanente non previsto — mai uno stato accettabile. `check-staging-fixtures.ts` tratta questo come condizione di fallimento (exit code 1), non come nota informativa.

Ogni mapping, quando esiste (anche temporaneamente), è disabilitabile immediatamente impostando `status = 'disabled'` sulla riga corrispondente (`worker_identity`, `company_identity`, `network.partner_identity`) — nessun'altra azione richiesta, l'accesso viene negato al livello database indipendentemente dal JWT.

## 10. Cleanup

Due livelli distinti, da non confondere:

1. **Cleanup applicativo di routine** (già esistente, sprint 13C): ogni esecuzione dei runner (`run-behavioral-suite.ts`, `run-live-staging-suite.ts`) crea fixture proprie, prefissate `KORA_LINK_AUTOMATION_`/`KL11_AUTOMATION_`, e le rimuove sempre in un blocco `finally`, indipendentemente da successo o fallimento. Questo non tocca mai le 9 fixture di base di questo documento.
2. **Cleanup delle fixture di base** (`cleanup-staging-fixtures.ts`, questo sprint): script dedicato, **non eseguito** in questo sprint, pensato per un'eventuale eliminazione futura e completa del set KL11 di base. Vedi §5 dello script e §15 di questo documento per i criteri. Safe-by-default: richiede una variabile di conferma esplicita, mostra prima un piano count-only, richiede una seconda conferma runtime, opera solo su alias/prefissi KL11 espliciti, rispetta l'ordine FK-safe, non stampa dati sensibili.

## 11. Periodic review

- Ad ogni sprint KORA Link che tocca lo schema `kora_link`, RLS, o la logica di provisioning company/partner: rieseguire `check-staging-fixtures.ts` in sola lettura per confermare che il set minimo sia ancora coerente.
- Almeno una volta per trimestre indipendentemente da attività di sprint, per rilevare drift (es. rotazione password scaduta, account disabilitato manualmente, righe residue lasciate da un test runner interrotto a metà).
- Ogni review va registrata (data, esito, eventuali incoerenze) — non richiede un nuovo documento, un aggiornamento della tabella §3 con la data più recente è sufficiente.

## 12. Incident handling

Se `check-staging-fixtures.ts` rileva un'incoerenza (exit code 1):

1. non intervenire manualmente su staging prima di aver letto l'output JSON completo (quali fixture mancano/differiscono);
2. se il problema è righe residue in `kora_link.*`: verificare se provengono da un'esecuzione interrotta del runner comportamentale; se sì, il cleanup di quella singola esecuzione può essere rieseguito manualmente per gli alias `KORA_LINK_AUTOMATION_`/`KL11_AUTOMATION_` coinvolti, mai con una `DELETE` generica;
3. se il problema è un account Auth mancante, disabilitato o con ruolo alterato: non ricrearlo/modificarlo senza autorizzazione esplicita — potrebbe essere un'azione intenzionale non ancora documentata;
4. se si sospetta un'esposizione di credenziali (password committata, token loggato): ruotare immediatamente la password interessata e verificare la history Git per l'eventuale necessità di un'azione correttiva sul repository, prima di qualunque altra attività.

## 13. Anti-production safeguards

Entrambi gli script di questo sprint condividono lo stesso schema di sicurezza già validato in `run-live-staging-suite.ts` (13C):

- richiedono una variabile di conferma esplicita con valore esatto (mai un default silenzioso);
- richiedono `KORA_LINK_STAGING_DB_URL` e `KORA_LINK_STAGING_PROJECT_REF` espliciti — nessuna connection string hardcoded o di default;
- rifiutano la porta `6543` (Supavisor Transaction pooler);
- verificano che il project ref della connessione coincida con quello atteso (mascherato in ogni output);
- rifiutano esplicitamente qualunque ref o connection string che contenga la sottostringa `prod`;
- rifiutano una password che assomigli a una service-role API key (JWT, prefisso `eyJ`);
- non stampano mai UUID, email, password, token o connection string per intero.

## 14. Relazione con il runner C1–C10

Le fixture di questo documento **non sono create né distrutte** dai runner di test (`run-behavioral-suite.ts` per lo staging locale, `run-live-staging-suite.ts` per lo staging reale). Sono un prerequisito ambientale, non un output di test:

- `run-live-staging-suite.ts` presuppone che questi 7 account e 2 tenant esistano già e li usa solo per autenticarsi/simulare claim (`claimAs`) — non li crea, non li elimina, non li modifica.
- I runner creano esclusivamente fixture applicative temporanee, prefissate `KORA_LINK_AUTOMATION_` (locale) o `KL11_AUTOMATION_` (staging), sempre rimosse a fine esecuzione. Questo include i mapping `company_identity` (`smokeC5Company`) e `partner_identity`/`partner_profile` (`smokeC6Partner`), entrambi creati su un `auth_user_id`/profilo usa-e-getta — mai sui due account COMPANY o sull'account PARTNER dormienti stessi — e rimossi in `finally` indipendentemente da successo o fallimento.
- Nessuno dei due runner richiede, né crea in modo permanente, un mapping `company_identity` o `partner_identity` — è compatibile per costruzione con il modello "fixture Auth dormienti + mapping solo temporaneo" di §9.
- `check-staging-fixtures.ts` (questo sprint) verifica lo stato del prerequisito ambientale, non l'esito di uno scenario di test — è complementare, non sovrapposto, a `run-live-staging-suite.ts`.

## 15. Criteri di eliminazione futura

Il set minimo permanente NON va eliminato per default. Un'eliminazione completa è possibile solo se, in futuro:

1. il modulo KORA Link raggiunge un punto in cui la validazione live contro staging non è più necessaria (es. sostituita integralmente da una suite locale sufficientemente rappresentativa, o il modulo esce definitivamente da fase pilota); **oppure**
2. il progetto staging stesso viene dismesso/ricreato da zero; **oppure**
3. un'autorizzazione esplicita del titolare del progetto richiede la rimozione per motivi di governance (es. audit di sicurezza, riduzione della superficie di account di test).

In ciascuno di questi casi, l'eliminazione va eseguita **solo** tramite `cleanup-staging-fixtures.ts`, mai manualmente, per garantire l'ordine FK-safe e la registrazione (via output JSON) di cosa è stato effettivamente rimosso.
