# PILOT-TRUST-02 — Residual Trust Gaps Audit

**Sprint:** PILOT-TRUST-02 — RESIDUAL TRUST GAPS AUDIT
**Data:** 2026-07-28
**Tipo:** Audit tecnico, indipendente, avversariale — **esclusivamente READ-ONLY**
**HEAD analizzato:** `527cc3d09d5c589750852f2ac7ba3bbabbf1a6d1` (`main`, allineato con `origin/main`)
**Ambiente di verifica comportamentale:** Supabase locale (Docker, via Supabase CLI) + Next.js dev server locale. Nessun accesso a staging o produzione in nessuna fase.

---

## 1. Executive verdict

Dei tre finding residui segnalati dopo PILOT-TRUST-01, l'audit ha determinato:

| # | Finding | Verdetto | Nota |
|---|---|---|---|
| 1 | `requireWorkerUser()` non verifica lo stato del tenant | **REAL — MEDIUM** | Confermato con evidenza comportamentale diretta. Non è un data-leak (RLS scopa comunque i dati), ma è una violazione del principio "sospensione immediata". |
| 2 | `analytics.uef_record` — assenza di policy RLS | **REAL — CRITICAL** (riclassificato) | L'assenza di RLS sulla tabella base è **intenzionale** (Gate 2.3, migrazione 030) e di per sé non è il problema. L'audit ha però scoperto, testando empiricamente le 4 funzioni SECURITY DEFINER che sostituiscono la RLS, un **bypass di autorizzazione sistemico e reale**: il controllo `current_role NOT IN ('service_role','postgres')` è sempre falso all'interno di una funzione SECURITY DEFINER (perché `current_role` diventa il *proprietario* della funzione, non il chiamante), rendendo il controllo di ruolo/tenant morto in tutte e 4 le funzioni. Confermato con exploit riprodotto in locale: una sessione con ruolo `WORKER` ha letto dati UEF reali di un altro tenant/pipeline (`fn_advisor_uef_read`) e ha **scritto** (`review_status` modificato) un record UEF arbitrario (`fn_admin_uef_update_review`) senza alcuna eccezione. |
| 3 | `app/partner/workspace/page.tsx` usa `getSupabaseServiceClient()` | **REAL — LOW** | Il service-role qui non è una scorciatoia pigra: `network.partner_profile` **non ha alcuna policy RLS per il ruolo PARTNER** (solo KORA_ADMIN e WORKER-published). Migrare al client di sessione senza prima aggiungere la policy romperebbe la pagina per ogni partner legittimo. Verificato empiricamente: nessuna fuga cross-partner, nessun accesso di ruoli non autorizzati. |

**Finding più grave: #2 (SECURITY DEFINER auth bypass su `analytics.uef_record`).**
Non è il finding originariamente ipotizzato (RLS mancante) ma un difetto molto più severo scoperto testando il meccanismo che la RLS mancante avrebbe dovuto sostituire.

**Pilot sintetico bloccato: SÌ** — il bug #2 è sfruttabile anche contro dati puramente sintetici, e la sua scoperta pubblica in un pilot (anche demo) comprometterebbe la fiducia nell'intera piattaforma.
**Pilot con dati reali bloccato: SÌ** — a maggior ragione.

**Verdetto finale: FIX_FIRST.**

---

## 2. Finding 1 — `requireWorkerUser()` tenant status

### Ricostruzione del flusso (fatto, da lettura codice)

`lib/auth/kora-session.ts`:
1. `resolveUser()` — legge la sessione Supabase via cookie (`supabase.auth.getUser()`) o header `Authorization: Bearer` — validazione server-side, non falsificabile.
2. `requireWorkerUser()` legge `app_metadata.kora_role` (deve essere `WORKER`), `app_metadata.kora_tenant_id` (deve esistere), `app_metadata.kora_worker_id` (deve esistere), `app_metadata.kora_status` (blocca solo se `=== 'disabled'`).
3. **Nessuna query al database avviene in `requireWorkerUser()`.** A differenza di `requireCompanyUser()` (righe 168-190 dello stesso file), che dopo i controlli su `app_metadata` esegue esplicitamente:
   ```ts
   const db = getSupabaseServiceClient();
   const { data: tenantRow } = await db.schema('analytics').from('tenant')
     .select('id, is_active').eq('id', tenantId).maybeSingle();
   if (!tenantRow) return 403;
   if (!tenantRow.is_active) return 403 'Workspace aziendale sospeso...';
   ```
   `requireWorkerUser()` non ha alcun equivalente.
4. `app/worker/layout.tsx` chiama solo `getCurrentWorkerUser()` (→ `requireWorkerUser()`), nessun controllo aggiuntivo.
5. `middleware.ts` fa solo instradamento per prefisso di path in base al ruolo — nessuna query DB, nessun controllo di stato.
6. Nessuna route API worker (19 file in `app/api/worker/*`) esegue un controllo `is_active` indipendente.
7. **Livello RLS**: `kora.tenant_id()` (migrazione 006, canonica) legge **solo** il claim JWT — non fa mai join con `analytics.tenant.is_active`. Verificato per l'intera history delle migrazioni: **nessuna policy RLS, in nessuna tabella, referenzia mai `tenant.is_active`** (`grep` su tutte le `CREATE POLICY` — zero occorrenze oltre alla definizione della colonna stessa).
8. Tutte le pagine/route worker usano `getSupabaseServerClient()` (client di sessione, governato da RLS) — **non** service-role. Questo significa che l'assenza del controllo non produce un *data leak* cross-tenant (RLS continua a filtrare correttamente per `tenant_id`), ma produce un **accesso continuato e indistinguibile da normale** per un worker il cui datore di lavoro è sospeso.
9. **Nessuna azione applicativa attuale sospende un tenant** (`is_active = false`): cercando in tutto `app/api/admin/*` non esiste una route che scriva `is_active: false`. Il meccanismo di sospensione esiste solo a livello di schema/codice difensivo (`requireCompanyUser`), non ha ancora un'interfaccia operativa — la sospensione è oggi un'operazione manuale DB, non un flusso di prodotto.

### Evidenza comportamentale (fatto, Supabase locale, fixture sintetiche, pulite a fine test)

Ambiente: `supabase db reset` pulito (001→046), dev server locale con override esplicito `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` (tecnica identica a quella usata in PILOT-TRUST-01 FASE 8 — la CSP dell'app impedisce al browser di autenticarsi contro Supabase locale, quindi la sessione viene creata Node-side e iniettata come cookie via `@supabase/ssr`).

| Scenario | Login | `/worker/workspace` | `/worker/commons` |
|---|---|---|---|
| WORKER attivo + tenant attivo (controllo) | OK | 200, resta su area worker | 200 |
| **WORKER attivo + tenant SOSPESO (`is_active=false`)** | OK | **200 — NESSUN blocco, NESSUN redirect** | **200 — NESSUN blocco** |
| WORKER con `kora_status='disabled'` + tenant attivo | OK | **Bloccato → redirect `/login`** (comportamento corretto, conferma che il check `kora_status` funziona) | Bloccato |
| WORKER con mapping `personal.worker_identity.status='disabled'` + tenant attivo | OK | **200 — NESSUN blocco** (mapping disabilitato non ha alcun effetto) | 200 |
| WORKER con claim tenant manomesso/inesistente | OK | **200 — NESSUN blocco** (nessuna validazione di esistenza del tenant) | — |
| KORA_ADMIN su `/worker/workspace` (ruolo diverso) | OK | Bloccato → redirect `/admin` (corretto) | — |
| anon su `/worker/workspace` | — | Bloccato → redirect `/login` (corretto) | — |
| **Controllo positivo: COMPANY_ADMIN sullo stesso tenant sospeso** | OK | **Bloccato → redirect `/login`** (conferma che il meccanismo esiste ed è efficace lato company) | — |

**Scoperta secondaria, nello stesso ambito FASE 2**: il campo `personal.worker_identity.status` (`invited`/`active`/`pending`/`disabled`) **non è verificato da nessuna parte** — né da `requireWorkerUser()`, né da alcuna RLS policy (`worker_identity_worker_own_select` filtra solo per `auth_user_id = auth.uid()`, non per `status`). Disabilitare il mapping di un worker (azione che un KORA_ADMIN potrebbe ragionevolmente aspettarsi essere equivalente a "disattivare l'account") non ha **alcun** effetto pratico finché `app_metadata.kora_status` non viene aggiornato separatamente — le due operazioni non sono atomiche né collegate nel codice attuale.

### Classificazione

**REAL — MEDIUM.**

- **Layer che fallisce**: `requireWorkerUser()` (app layer) — nessun controllo `tenant.is_active` né `worker_identity.status`.
- **Layer che mitiga**: RLS continua a filtrare correttamente per `tenant_id` — nessuna fuga di dati cross-tenant. Il worker vede solo i propri dati legittimi, semplicemente non dovrebbe più vederli.
- **Perché MEDIUM e non HIGH/CRITICAL**: non c'è violazione di confidenzialità o di isolamento; è una violazione del principio di business "sospensione immediata" — un worker di un'azienda sospesa (es. per contenzioso, mancato pagamento, uscita dal programma) continua a operare come se nulla fosse.
- **Remediation minima**: aggiungere in `requireWorkerUser()` lo stesso blocco già presente in `requireCompanyUser()` (query `analytics.tenant.is_active` via service client) + un controllo su `personal.worker_identity.status <> 'active'`.
- **Migrazione necessaria**: **no** — è un fix applicativo puro, nessuna modifica di schema.
- **Test obbligatorio**: test comportamentale (non solo unit/statico) che verifichi esplicitamente WORKER + tenant sospeso → 403/redirect, e WORKER + mapping disabilitato → 403/redirect. Attualmente **non esiste alcun test, né per COMPANY né per WORKER**, che verifichi behavioralmente il ramo "tenant sospeso" (confermato: zero occorrenze di `is_active`/`sospeso` nei test riferiti a `requireCompanyUser`/`requireWorkerUser`).

---

## 3. Finding 2 — `analytics.uef_record` RLS

### Stato RLS attuale (fatto, da lettura migrazioni 001→046)

- Migrazione 001: RLS abilitata (`ENABLE ROW LEVEL SECURITY`, non `FORCE`), 2 policy: `kora_admin_all_uef` (KORA_ADMIN, FOR ALL) e `advisor_tenant_uef_read` (ADVISOR, tenant-scoped SELECT). Nessuna policy COMPANY/WORKER/PARTNER (intenzionale, commentato in schema).
- **Migrazione 030 ("Gate 2.3 — UEF Admin Access Hardening") ha DROPPATO entrambe le policy** e le ha sostituite con 4 funzioni `SECURITY DEFINER`:
  - `fn_admin_uef_review(batch_id)` — lettura, esclude `payload` grezzo.
  - `fn_admin_uef_update_review(uef_id, action, notes, reviewer)` — scrittura (approve/reject/needs_info).
  - `fn_admin_uef_enrich(uef_id, fields, reviewer)` — scrittura (arricchimento whitelisted).
  - `fn_advisor_uef_read(tenant_id)` — lettura per ADVISOR, tenant-scoped, con guardia cross-tenant esplicita.
- Il commento della migrazione 030 stessa (riga 530) dichiara esplicitamente: *"nessuna policy RLS su uef_record post-030 — accesso solo via BYPASSRLS o SECURITY DEFINER functions"*. **Questo è dichiarato e intenzionale**, non una svista.
- `GRANT SELECT ON analytics.uef_record TO authenticated` resta attivo (migrazione 002) — con RLS abilitata e zero policy, questo significa: **query dirette via PostgREST da qualunque ruolo restituiscono correttamente 0 righe** (confermato empiricamente sotto). Nessun leak sulla tabella base.
- La vista `analytics.v_company_uef_eligibility_summary` (migrazione 015) è **postgres-owned**, bypassa la RLS per costruzione (documentato estesamente e correttamente nel commento della migrazione stessa, con riferimento esplicito a PostgreSQL §5.8), e applica isolamento tenant manualmente via `WHERE tenant_id = kora.tenant_id()`. Solo aggregati, nessun identificativo worker.

**Il finding come originariamente formulato ("potrebbe non avere policy RLS") è tecnicamente vero ma descrive uno stato *voluto* e ben documentato, non una svista.** L'endpoint `app/api/company/live-eligibility/route.ts` che "assume scoping via RLS" in realtà lo dichiara correttamente nel proprio commento ("VIEW... bypasses FORCE RLS") — non è fuorviante.

### Scoperta reale (fatto, verificato empiricamente — non solo parsing statico)

Testando le 4 funzioni SECURITY DEFINER con simulazione diretta dei claim JWT contro Postgres locale (stessa tecnica di RLS-03/05/06/07), è emerso un **bug di autorizzazione sistemico**:

```sql
IF current_role NOT IN ('service_role', 'postgres')
   AND kora.kora_role() <> 'KORA_ADMIN' THEN
  RAISE EXCEPTION ...
END IF;
```

**`current_role`, all'interno di una funzione `SECURITY DEFINER`, è sempre il proprietario della funzione (`postgres`), mai il ruolo del chiamante** — comportamento standard e documentato di PostgreSQL (§ Security Definer). Di conseguenza `current_role NOT IN ('service_role','postgres')` è **sempre falso**, l'intero blocco `IF` è **codice morto per ogni chiamante**, e il controllo di ruolo/tenant non viene mai eseguito. Il pattern è identico in tutte e 4 le funzioni (verificato leggendo il testo di ciascuna).

**Exploit riprodotto in locale (Supabase Docker, dati sintetici, transazioni con ROLLBACK dove possibile, righe temporanee rimosse a fine test):**

| Test | Atteso | Osservato |
|---|---|---|
| `fn_advisor_uef_read` come ADVISOR, tenant proprio | 1 riga | PASS — 1 riga |
| `fn_advisor_uef_read` come ADVISOR, **tenant altrui** (cross-tenant) | `RAISE EXCEPTION` | **FAIL — nessuna eccezione, 0 righe restituite** (il filtro `WHERE` sull'id richiesto non ha trovato righe per coincidenza dei dati di test, ma **nessun controllo di autorizzazione è stato eseguito** — vedi test successivo per prova diretta) |
| `fn_advisor_uef_read` come **WORKER** (ruolo non autorizzato) | `RAISE EXCEPTION` | **FAIL — nessuna eccezione. Verificato con debug dedicato: la funzione ha restituito la riga UEF reale (`raw_name` incluso) del tenant del WORKER richiedente.** |
| `fn_advisor_uef_read` come **COMPANY_ADMIN** | `RAISE EXCEPTION` | **FAIL — nessuna eccezione (stesso bug)** |
| `fn_advisor_uef_read` come anon | denied | PASS — negato (nessun GRANT EXECUTE ad `anon`) |
| **`fn_admin_uef_update_review` come WORKER, su un record UEF non proprio** (azione `approve` + note arbitrarie) | `RAISE EXCEPTION`, nessuna modifica | **FAIL CRITICO — nessuna eccezione. Verificato con lettura diretta post-chiamata (via `RESET ROLE` nella stessa transazione, poi `ROLLBACK`): `review_status` cambiato da `'pending'` a `'approve'`, `reviewer_notes` impostato al testo arbitrario fornito dal chiamante WORKER.** |
| `fn_admin_uef_review` (SQL, non plpgsql) — stesso pattern (`current_role IN (...) OR kora_role='KORA_ADMIN'`) | — | Stesso difetto strutturale confermato per lettura (`WHERE ... AND (current_role IN ('service_role','postgres') OR kora.kora_role()='KORA_ADMIN')` — sempre vero per il primo termine). |
| `fn_admin_uef_enrich` | — | Stesso pattern (`IF current_role NOT IN (...) AND kora.kora_role() <> 'KORA_ADMIN'`), stesso difetto. |

Tutte e 4 le funzioni hanno `GRANT EXECUTE ... TO authenticated` (migrazione 030/031) — sono quindi chiamabili via l'endpoint RPC standard di PostgREST (`POST /rest/v1/rpc/<nome_funzione>`) da **qualunque utente autenticato con qualunque ruolo KORA**, indipendentemente da cosa fa o non fa il codice Next.js applicativo. Il bypass è a livello di API database, non di route applicativa.

### Perché nessun test esistente l'ha rilevato (fatto)

I test esistenti collegati alla migrazione 030 (`gate2-3-migration-030-preapply-review.test.ts`, `gate2-3-migration-030-advisor-revision.test.ts`, `gate2-3-final-closure-audit.test.ts`) sono **esclusivamente asserzioni testuali/regex sul codice SQL della migrazione**, ad esempio:

```ts
expect(SQL).toMatch(/current_role NOT IN.*service_role.*postgres/i);
```

Questo tipo di test verifica che il **pattern testuale** sia presente — non che il comportamento sia corretto. Un test di questo tipo **passa identicamente sia con il bug che con una versione corretta**, perché non esegue mai la funzione contro un database reale con un JWT/claim di un ruolo non privilegiato. Questo è esattamente il motivo per cui l'istruzione di questo sprint ("non usare parsing statico come unica prova") era pertinente: il parsing statico è precisamente ciò che ha permesso a questo bug di attraversare la pre-apply review, l'apply su staging e l'audit di chiusura Gate 2.3 senza essere scoperto.

### Vista company-safe — verifica positiva

`v_company_uef_eligibility_summary` è stata verificata **corretta**: COMPANY_ADMIN tenant A vede `total_uef_records=3` (dato reale inserito), COMPANY_ADMIN tenant B vede `total_uef_records=5`, **isolamento cross-tenant confermato empiricamente**. Claim tenant inesistente → 0 righe (nessun bypass). Nota minore, severità bassa: il `GRANT` sulla vista è a `authenticated` in generale, non ristretto a COMPANY_ADMIN — un WORKER con il proprio claim tenant può leggere l'aggregato della propria azienda direttamente (nessun dato individuale, solo conteggi) — deviazione di perimetro di ruolo, non un data-leak.

### Classificazione

**REAL — CRITICAL.**

- **Layer che fallisce**: le 4 funzioni SECURITY DEFINER stesse — il meccanismo costruito appositamente per compensare l'assenza di RLS sulla tabella base è comprensivamente compromesso da un errore di scoping Postgres (`current_role` vs `session_user`/chiamante reale).
- **Layer che mitiga**: nessuno. Non è un errore RLS (RLS sulla tabella base funziona correttamente e blocca l'accesso diretto). Il bug è interamente nelle funzioni che *sostituiscono* la RLS.
- **Remediation minima (non implementata in questo sprint, solo raccomandata)**: sostituire `current_role NOT IN ('service_role','postgres')` con un controllo basato su `session_user` (es. `session_user = 'service_role'`) oppure — più robusto — rimuovere del tutto la clausola di bypass per `current_role`/`postgres` e basare l'intera autorizzazione solo su `kora.kora_role()` (che legge correttamente il JWT del chiamante originale indipendentemente dal contesto SECURITY DEFINER), lasciando un percorso di bypass esplicito e separato solo per chiamate dirette da `service_role` reale (verificabile con `session_user = 'service_role'`, mai `current_role`).
- **Migrazione necessaria**: **sì** — richiede una nuova migrazione che sostituisca (CREATE OR REPLACE) le 4 funzioni con la logica di controllo corretta.
- **Test obbligatorio**: test di integrazione comportamentale reale (claim simulation diretta contro Postgres, come RLS-03/05/06/07) per ciascuna delle 4 funzioni × ciascun ruolo non autorizzato, sostituendo/integrando gli attuali test basati solo su regex.
- **Opzione di remediation (tra A–E del mandato)**: **E — altra soluzione motivata**: non è né "aggiungere una policy RLS diretta" (A — la tabella è stata deliberatamente spostata fuori da RLS) né "vista aggregata" (C — già esiste per il caso company) né "solo service-role" (D — già è di fatto quello che serve, ma con un controllo di autorizzazione applicativo corretto dentro le funzioni). La soluzione minima è: **correggere il controllo di ruolo nelle funzioni SECURITY DEFINER esistenti**, mantenendo l'architettura attuale (B, di fatto: le funzioni sono già "RPC-only", va solo riparato il controllo di autorizzazione al loro interno).

---

## 4. Finding 3 — partner workspace service-role

### Ricostruzione (fatto)

`app/partner/workspace/page.tsx` è l'**unica pagina live** nell'intera area `/partner/*` — tutte le altre (`activity-catalog`, `activity-bookings`, `initiatives`, `aggregate-signals`, `relationships`, `privacy-boundary`, `kora-link`) sono dichiarate esplicitamente "Pure UI/UX preview. No DB." nei loro stessi commenti di intestazione.

- Auth: `requirePartnerUser()` (via `app/partner/layout.tsx`, server-side, gate corretto) — richiede ruolo `PARTNER`, `kora_partner_id` presente, `kora_status <> 'disabled'`.
- Query: **una sola**, `getSupabaseServiceClient().schema('network').from('partner_profile').select(...).eq('id', partnerId).maybeSingle()` — `partnerId` proviene **esclusivamente** da `auth.partnerId` (claim server-controllato, mai da URL/body).
- **Perché service-role e non client di sessione**: `network.partner_profile` ha RLS `FORCE`-ata con **solo 2 policy**: `network_partner_kora_admin_all` (KORA_ADMIN) e `network_partner_worker_published_select` (WORKER, solo record `published`). **Non esiste alcuna policy che permetta a un PARTNER di leggere/scrivere il proprio profilo.** Migrare questa route al client di sessione, così com'è, romperebbe la pagina per ogni partner legittimo (0 righe restituite da RLS).
- Nessuna seconda query nel file — nessun rischio di "query senza `.eq()`" (il rischio ipotizzato dal mandato non si applica: l'unica query presente ha sempre il filtro).
- `network.partner_profile` non ha colonna `tenant_id` — i partner non sono tenant-scoped (fornitori di servizio cross-azienda by design), quindi "rischio cross-tenant" non è un asse pertinente per questa tabella.

### Evidenza comportamentale (fatto, Supabase locale)

| Scenario | Risultato |
|---|---|
| Partner autorizzato, profilo esistente | Profilo proprio mostrato correttamente; **nessuna fuga** del contenuto di un secondo profilo partner sintetico (verificato cercando il testo segreto del secondo profilo nella pagina — assente) |
| Partner autorizzato, **nessun mapping** (`kora_partner_id` punta a un profilo inesistente — fixture "dormiente") | Stato "Profilo partner non trovato" mostrato correttamente — nessun crash, nessun dato sbagliato |
| anon su `/partner/workspace` | Bloccato → redirect `/login` (layer layout, corretto) |

### Classificazione

**REAL — LOW.**

- **Rischio attuale**: basso. Il filtro è unico, sempre presente, derivato da un claim non falsificabile. Nessuna fuga osservata in nessuno scenario testato.
- **Rischio futuro**: se in futuro venisse aggiunta una seconda query in questo file (es. lista di iniziative, statistiche aggregate) usando lo stesso client service-role senza disciplina identica, l'assenza di un backstop RLS renderebbe quell'eventuale nuova query un singolo punto di fallimento silenzioso.
- **Remediation minima**: aggiungere una policy RLS `network_partner_own_profile_select/update` (richiede una nuova funzione `kora.partner_id()` lettrice di claim, oggi inesistente — solo `kora.tenant_id()` e `kora.kora_role()` esistono) e poi migrare la route al client di sessione. Questo è un cambiamento di schema, non un semplice refactor del file.
- **Migrazione necessaria**: sì (nuova funzione claim-reader + nuova policy).
- **Test obbligatorio**: test di integrazione RLS "partner-own-profile" (stesso pattern di RLS-07 per i worker) una volta introdotta la policy.
- **Opzione di remediation**: **congelamento controllato** (mantenere service-role con la disciplina attuale — filtro singolo, mai rimuovere l'`.eq()`, nessuna query aggiuntiva senza lo stesso pattern) fino a quando la policy RLS dedicata non sarà introdotta in uno sprint successivo non urgente.

---

## 5. Behavioral evidence

Tutti i test comportamentali sono stati eseguiti contro **Supabase locale (Docker)**, con `supabase db reset` pulito a 046 prima di ogni fase, fixture sintetiche create e rimosse (`DELETE`/cleanup esplicito) a fine di ciascuna fase, **mai contro staging o produzione**. Tecnica: sessione ottenuta via password-grant Node-side + iniezione cookie via `@supabase/ssr` (stessa tecnica, verificata e già usata in PILOT-TRUST-01 FASE 8), dev server locale avviato con override esplicito delle variabili `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` puntate a `127.0.0.1:54321` (mai a staging, verificato: `.env.local` di default punta a staging e non è mai stato usato/modificato in questo sprint).

Riepilogo quantitativo:
- FASE 2: 4 scenari worker principali + 3 scenari supplementari (claim manomesso, ruolo diverso, anon) + 1 controllo positivo company = **8 verifiche comportamentali dirette**.
- FASE 3: 12 verifiche RLS/vista dirette contro Postgres + 5 verifiche sulle funzioni SECURITY DEFINER + 1 exploit di scrittura confermato = **18 verifiche**.
- FASE 4: 3 scenari comportamentali HTTP (partner autorizzato, partner senza mapping, anon).

Nessun dato di staging o produzione è stato letto, scritto o interrogato in questo sprint.

---

## 6. Database evidence

- Migrazioni ispezionate integralmente: 001, 002, 003, 004, 005, 006, 007, 010, 012, 014, 015, 016, 017, 018, 019, 020, 023, 025, 027, 030, 031, 032, 042, 045, 046.
- RLS su `analytics.uef_record`: **ENABLE, non FORCE**, **0 policy attive post-030** (dichiarato nella migrazione stessa).
- RLS su `network.partner_profile`: **ENABLE + FORCE**, 2 policy (`KORA_ADMIN` full, `WORKER` published-only) — **0 policy PARTNER**.
- RLS su `personal.worker_identity`: **FORCE**, policy `worker_identity_worker_own_select` filtra solo per `auth_user_id = auth.uid()` — **nessun filtro su `status`**.
- Nessuna policy, in nessuna tabella di tutta la history delle migrazioni, referenzia `analytics.tenant.is_active`.
- 4 funzioni SECURITY DEFINER (`fn_admin_uef_review`, `fn_admin_uef_update_review`, `fn_admin_uef_enrich`, `fn_advisor_uef_read`) — tutte con lo stesso difetto di controllo `current_role`.

---

## 7. Architectural consistency

| Finding | Principio KORA toccato | Valutazione |
|---|---|---|
| 1 — tenant status | "Sospensione immediata" | **Deviazione reale** — non ancora violazione di privacy, ma di garanzia di business dichiarata. |
| 2 — SECURITY DEFINER bypass | "RLS come barriera primaria", "Ruoli da app_metadata", "Accesso minimo necessario" | **Violazione diretta e severa** — il meccanismo di autorizzazione per ruolo, costruito apposta, non funziona per un errore di implementazione Postgres ben noto (`current_role` in SECURITY DEFINER). Non è una scorciatoia legacy: è un bug. |
| 3 — partner service-role | "Service-role come eccezione" | **Scorciatoia legacy motivata**, non una violazione: è l'unico modo attuale di servire questa pagina, dato che la policy RLS partner-own non esiste ancora. Documentata implicitamente ma non esplicitamente come debito tecnico nel codice. |

Nessuno dei tre finding è un falso allarme puro. Nessuno è pienamente "già mitigato" nel senso di "nessuna azione necessaria" — anche il finding 3, il più lieve, richiede lavoro di schema per essere davvero chiuso.

---

## 8. Risk matrix

| FINDING | STATO | SEVERITÀ | RISCHIO ATTUALE | RISCHIO FUTURO | FIX MINIMO | MIGRAZIONE | TEST | EFFORT |
|---|---|---|---|---|---|---|---|---|
| 2 — SECURITY DEFINER auth bypass su `uef_record` | REAL | **CRITICAL** | Alto — sfruttabile oggi da qualunque ruolo autenticato via RPC diretto, lettura e scrittura | Alto — mina la fiducia nell'intero modello di autorizzazione basato su funzioni | Sostituire il controllo `current_role` con `session_user`/logica basata solo su `kora.kora_role()` nelle 4 funzioni | Sì (CREATE OR REPLACE funzioni) | Comportamentali reali (no regex) per tutte e 4 le funzioni × ruoli non autorizzati | Piccolo-medio (4 funzioni, pattern identico) |
| 1 — `requireWorkerUser()` tenant/mapping status | REAL | MEDIUM | Basso-medio — nessun leak, ma continuità di accesso indebita | Medio — blocca l'affidabilità della sospensione per pilot con dati reali | Aggiungere check `tenant.is_active` + `worker_identity.status` in `requireWorkerUser()` | No | Comportamentali (tenant sospeso, mapping disabilitato) | Piccolo |
| 3 — partner workspace service-role | REAL | LOW | Basso — filtro singolo, unforgeable, verificato | Basso-medio se il file cresce senza disciplina | Nuova policy RLS partner-own + nuova funzione claim-reader + migrare a client sessione | Sì | RLS partner-own-profile | Medio (nuovo schema) |

**P0:** 1 (Finding 2).
**P1:** 1 (Finding 1).
**P2:** 1 (Finding 3).
**NO ACTION:** 0.

- **Cosa blocca un pilot sintetico**: Finding 2 (sfruttabile anche su dati sintetici; la scoperta pubblica sarebbe comunque un incidente di fiducia).
- **Cosa blocca un pilot con dati reali**: Finding 2 (a maggior ragione) e Finding 1 (sospensione tenant deve funzionare con aziende reali).
- **Cosa può aspettare**: Finding 3 (nessun rischio osservato, richiede solo lavoro di schema non urgente).
- **Cosa va corretto prima della CSP**: Finding 2, integralmente. Finding 1 raccomandato ma non strettamente bloccante per la CSP in sé (è un tema di autorizzazione applicativa, non di Content-Security-Policy).
- **Cosa può entrare nello stesso sprint**: Finding 2 da solo — è già sufficientemente ampio (4 funzioni, nuovi test comportamentali) da giustificare uno sprint dedicato.
- **Cosa deve restare separato**: Finding 1 e Finding 3 — root cause e superficie di modifica completamente diverse da Finding 2, meritano sprint propri successivi.

---

## 9. Remediation options

- **Finding 2**: Opzione E (motivata) — riparare il controllo di autorizzazione dentro le funzioni SECURITY DEFINER esistenti, mantenendo l'architettura "RPC-only" già scelta in migrazione 030. Non serve reintrodurre RLS sulla tabella base (sarebbe un passo indietro rispetto a una scelta architetturale già presa e documentata), non serve una vista aggiuntiva.
- **Finding 1**: replicare in `requireWorkerUser()` lo stesso pattern già presente e collaudato in `requireCompanyUser()` — nessuna opzione alternativa necessaria, il precedente esiste già nello stesso file.
- **Finding 3**: Opzione "migrazione al client RLS" **preceduta da** una nuova policy RLS partner-own-profile — non è possibile fare l'una senza l'altra. Nell'immediato: congelamento controllato (mantenere l'attuale disciplina service-role, nessuna modifica di codice in questo sprint).

---

## 10. Prioritized next step

**Priorità reale (non l'ordine originale del mandato): 2 → 1 → 3.**

Il Finding 2 deve essere risolto per primo e da solo, con uno sprint dedicato, prima di qualunque altro lavoro — incluso il proseguimento verso CSP/Gate 3.

---

## 11. Next sprint recommendation

### PILOT-TRUST-03 — UEF SECURITY DEFINER AUTHORIZATION FIX

**Obiettivo**: correggere il bypass di autorizzazione nelle 4 funzioni SECURITY DEFINER che proteggono `analytics.uef_record` (`fn_admin_uef_review`, `fn_admin_uef_update_review`, `fn_admin_uef_enrich`, `fn_advisor_uef_read`), sostituendo il controllo basato su `current_role` (sempre falso in contesto SECURITY DEFINER) con un controllo corretto basato su `session_user`/`kora.kora_role()`.

**Perché viene prima**: è l'unico finding di questo audit classificato CRITICAL, sfruttabile oggi contro dati sintetici e reali, in lettura e scrittura, da qualunque ruolo autenticato, senza bisogno di alcun privilegio elevato — un problema di questa natura non può convivere con l'avanzamento verso CSP/Gate 3 o con qualunque pilot, nemmeno dimostrativo.

**Scope incluso**:
- Nuova migrazione (`CREATE OR REPLACE FUNCTION`) per le 4 funzioni, correggendo esclusivamente la logica del controllo di autorizzazione (nessuna modifica alla whitelist di colonne, alla logica di business, ai nomi delle funzioni o alle firme).
- Nuovi test di integrazione comportamentali reali (claim simulation diretta, stesso pattern RLS-03/05/06/07) per ciascuna funzione × ciascun ruolo non autorizzato (WORKER, COMPANY_ADMIN, PARTNER, anon, ADVISOR cross-tenant).
- Verifica di non-regressione dei percorsi legittimi esistenti (KORA_ADMIN, ADVISOR proprio tenant, `uef-service-key.ts`/service-role).

**Scope escluso**:
- Finding 1 (`requireWorkerUser`) — sprint separato.
- Finding 3 (partner workspace) — sprint separato, richiede nuovo schema.
- Qualunque modifica a CSP, DPO, KORA Link.
- Qualunque modifica alla whitelist colonne o alla logica applicativa di enrichment/review.

**Sotto-step ordinati**:
1. Scrivere i test comportamentali FALLIENTI (che riproducono l'exploit) contro Supabase locale, come baseline "rosso" prima del fix.
2. Scrivere la migrazione correttiva (nuova, numerata secondo la governance esistente — non riutilizzare numeri ritirati).
3. Applicare in locale, verificare che i test comportamentali passino ("verde").
4. Verificare non-regressione dei percorsi legittimi (KORA_ADMIN, ADVISOR proprio tenant).
5. Rollback script per la nuova migrazione.
6. Aggiornare (non sostituire) i test statici esistenti se necessario, senza rimuoverli — vanno integrati con quelli comportamentali, non sostituiti.

**File coinvolti**:
- Nuova migrazione in `supabase/migrations/` (dopo 046).
- Nuovo rollback in `supabase/rollback/`.
- Nuovo/aggiornato test in `tests/integration/` (comportamentale, non `tests/unit/` statico).

**Migrazioni**: sì, una nuova migrazione (`CREATE OR REPLACE FUNCTION` × 4).

**Test obbligatori**: comportamentali reali per le 4 funzioni × ruoli non autorizzati + cross-tenant ADVISOR + non-regressione KORA_ADMIN/ADVISOR/service-role.

**Definition of done**:
- Le 4 funzioni rifiutano esplicitamente (RAISE EXCEPTION) ogni ruolo non autorizzato, verificato comportalmente contro Postgres reale (non solo testo SQL).
- I percorsi legittimi (KORA_ADMIN, ADVISOR proprio tenant, service-role) restano invariati.
- `npm run typecheck`, `npm run lint`, `npm test` verdi.
- Nessuna regressione nei test esistenti di migrazione 030/031.

**Effort complessivo**: piccolo-medio — 4 funzioni con pattern identico, fix concettualmente semplice (una riga di condizione per funzione), ma richiede test comportamentali nuovi e verifica accurata di non-regressione data la sensibilità della tabella.

---

## 12. Audit limits

- Questo audit è stato condotto **esclusivamente in locale** (Supabase Docker) — non è stato eseguito alcun test contro staging o produzione, come richiesto dal mandato.
- La scoperta del bug SECURITY DEFINER non era tra gli obiettivi originari del mandato (che ipotizzava un problema di RLS mancante sulla tabella base) — è emersa testando comportalmente, come esplicitamente richiesto, il meccanismo che sostituisce la RLS invece di fermarsi al controllo statico del testo della migrazione.
- Non è stato verificato se questo stesso pattern (`current_role NOT IN (...)`) sia presente in **altre** funzioni SECURITY DEFINER del codebase al di fuori di `analytics.uef_record` — questa verifica è fuori perimetro per questo sprint (il mandato era specifico su `uef_record`) ma è **fortemente raccomandata** come prossimo controllo, dato che il pattern potrebbe essere stato copiato altrove.
- Il meccanismo di sospensione tenant (Finding 1) non ha oggi alcuna interfaccia applicativa per essere attivato (nessuna route scrive `is_active=false`) — l'intero finding è stato verificato scrivendo direttamente `is_active=false` via SQL diretto in locale, non tramite un flusso di prodotto esistente.
- Il finding 3 è stato verificato con due account partner sintetici e due profili; non sono stati testati scenari con centinaia di partner o condizioni di carico.
- Nessuna modifica di codice, migrazione, commit o push è stata eseguita in questo sprint, in conformità al mandato READ-ONLY.
