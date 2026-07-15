# KORA-LINK-SECURITY-FOUNDATION-08

**Sprint:** KORA-LINK-SECURITY-FOUNDATION-08
**Branch:** `feature/kora-link-security-foundation-08`
**Data:** 2026-07-16
**Base:** `main` dopo il merge di `feature/kora-link-decision-gate-07` (commit `a39fd0c`)
**Stato:** migrazioni ancora in `supabase/proposed/`, **non applicate a nessun database**, KORA Link **non attivato**

Questo documento descrive lo Sprint 08, che corregge i blocker tecnici 1 e 2 identificati da
`docs/KORA_LINK_DECISION_GATE_07.md` (verdetto `HIDE FROM PILOT`, readiness 19/45) e rafforza
revoca/scadenza, sicurezza token, RLS/grants e audit trail di KORA Link. Non rende KORA Link
pronto al pilota: restano bloccanti Gate 2 (ratifica umana CTO), Gate 3 (DPO/legale), Gate 4
(review RLS dedicata) e i test comportamentali su database reale.

---

## 1. Problemi iniziali (da Gate 07)

Il Gate 07 ha rilevato, tra gli altri:

1. **Identità worker non verificata** — `fn_activate_link_for_worker` accettava un parametro
   `p_worker_id` fornito dal client senza verificarne la corrispondenza con `auth.uid()`. Un
   utente autenticato poteva, in teoria, fornire un `worker_id` arbitrario.
2. **Nessuna soglia di aggregazione privacy-safe** — `fn_company_link_status_aggregate`
   restituiva conteggi per stato senza alcuna soglia minima, in contrasto con
   `safe_aggregation_threshold ≥ 10` già applicato altrove nella piattaforma (CLAUDE.md §13,
   `lib/constants/kora.ts`, migrazione 015).
3. **Nessun boundary tenant esplicito nell'attivazione** — non rilevato esplicitamente dal Gate
   07 ma scoperto durante questo sprint: `fn_activate_link_for_worker` non verificava mai che il
   tenant del worker corrispondesse al tenant del link.
4. Retention, revoca/scadenza e test RLS comportamentali non coperti da test adeguati.

---

## 2. Modifiche alle migrazioni

Nessuna migrazione applicata. Modificati (testo SQL soltanto, in `supabase/proposed/`):

- **`036_kora_link_rpc_functions.sql`** — riscritte `fn_activate_link_for_worker` e
  `fn_company_link_status_aggregate`; header/commenti/TODO aggiornati.
- **`035_kora_link_rls.sql`** — commenti aggiornati (FUNCTION SPEC B, TODO-RLS-04/05); **nessuna
  modifica a tabelle, policy o grant** — lo scope RLS di questo file resta quello del Gate 4, non
  ancora chiuso.
- **`034_kora_link_schema.sql`** — **non modificato**. Lo schema tabelle era già solido (digest-only
  token, nessuna colonna PII, TTL documentato) e non richiedeva correzioni per i blocchi di questo
  sprint.

`037_contribution_atomic_attribution.sql` e `038_initiative_adoption_source_model.sql` sono
stati verificati come estranei a KORA Link (menzionano "KORA Link" solo in un commento sulla
numerazione delle migrazioni) e **non sono stati toccati**.

### Dipendenze verificate tra 033 → 034 → 035 → 036

- `033_personal_worker_identity_service_role_grant.sql` è **applicata** (`supabase/migrations/`) e
  concede a `service_role` accesso a `personal.worker_identity` — tabella ora letta anche da
  `fn_activate_link_for_worker` (034/035/036 restano proposte, non applicate).
- 034 crea lo schema `kora_link` e le 9 tabelle; 035 dipende da 034 (RLS sulle tabelle); 036
  dipende da entrambe (funzioni SECURITY DEFINER che operano sulle tabelle di 034, con i
  controlli di ruolo definiti tramite l'helper `kora_link.is_kora_admin()` di 035).
- Ordine di applicazione futura invariato: `033 → 034 → 035 → 036`.

---

## 3. BLOCCO 1 — Identità worker

### Modello precedente
`fn_activate_link_for_worker(p_token_digest text, p_worker_id uuid, p_consent_version text)` —
il chiamante (route Next.js) risolveva già `workerId` dalla sessione autenticata
(`getCurrentWorkerUser` → `app_metadata.kora_worker_id`), ma la funzione database **non
verificava questa corrispondenza indipendentemente**. Una funzione `SECURITY DEFINER` che si
fida di un parametro client è un gap di difesa in profondità, indipendentemente dalla disciplina
dell'unico chiamante applicativo esistente oggi.

### Soluzione scelta: **Opzione A** (nessun `p_worker_id` client-controlled)

Nuova firma: `fn_activate_link_for_worker(p_token_digest text, p_consent_version text)`.

L'identità worker è risolta **dentro la funzione**, da `auth.uid()`:

```sql
SELECT wi.id, wi.tenant_id, wi.status
INTO v_worker_id, v_worker_tenant_id, v_worker_status
FROM personal.worker_identity wi
WHERE wi.auth_user_id = auth.uid()
LIMIT 1;
```

Questo pattern **non è nuovo nel repository**: replica esattamente
`supabase/migrations/020_redistribute_worker_pib_rpc.sql`
(`fn_redistribute_worker_pib`, commento originale: *"Risolve worker_identity_id da auth.uid() —
mai dal client"*), già applicata e in produzione. Non richiede nuovi `GRANT` su
`personal.worker_identity`: la funzione è posseduta da `postgres` (superuser, `BYPASSRLS`), lo
stesso meccanismo documentato in `supabase/migrations/015_company_safe_aggregation_layer.sql`
§SECURITY MECHANISM.

**Perché Opzione A e non B:** l'Opzione B (parametro mantenuto ma verificato) resta comunque
un parametro che *potrebbe* essere fornito in modo scorretto da un futuro chiamante — un bug di
refactoring lo riattiverebbe. L'Opzione A rende l'attacco strutturalmente impossibile: non esiste
alcun parametro attraverso cui tentarlo. L'unico chiamante applicativo esistente
(`app/link/[token]/activate/route.ts` → `lib/kora-link/activation.ts`) già risolveva l'id worker
lato server da sessione autenticata, quindi la modifica alla firma non richiede alcun
cambiamento di logica applicativa oltre a smettere di inoltrare quel valore alla RPC.

### Boundary tenant — gap preesistente, non segnalato esplicitamente dal Gate 07

La funzione precedente non verificava **mai** che `worker.tenant_id` corrispondesse a
`link.tenant_id`. Aggiunto:

```sql
IF v_link_tenant_id IS DISTINCT FROM v_worker_tenant_id THEN
  -- audit_log ACTIVATION_ATTEMPTED/forbidden, poi risposta generica
  RETURN jsonb_build_object('status', 'unavailable');
END IF;
```

### Requisiti SQL verificati

| Requisito | Esito |
|---|---|
| `SECURITY DEFINER` | presente, invariato |
| `search_path` esplicito | `kora_link, personal, kora, public` (aggiunto `personal`) |
| Schemi qualificati | tutte le query usano `schema.tabella` |
| Nessuna escalation via oggetti shadow | nessun oggetto creato in schemi diversi da `kora_link` |
| `EXECUTE` grants | invariati: `authenticated, service_role` — **mai `anon`** |
| `auth.uid() IS NULL` | rigettato con `{status: error, reason: unauthenticated}` prima di ogni lookup |
| worker inesistente | risposta generica `{status: unavailable}` — indistinguibile da altri rigetti |
| worker di altro tenant | risposta generica `{status: unavailable}` — nuovo controllo |
| worker disabilitato | risposta generica `{status: unavailable}` |
| link revocato/scaduto | invariato, già gestito |
| token già utilizzato | invariato: `already_active` per lo stesso worker, `unavailable` altrimenti |
| chiamate concorrenti | invariato: `FOR UPDATE NOWAIT` + cattura `lock_not_available` |
| idempotenza | invariato: riattivazione dello stesso worker ⇒ `already_active` |

Nessuna delle risposte di rigetto permette di distinguere token inesistente, token revocato,
worker non autorizzato o worker di altro tenant — tutte collassano su `{status: 'unavailable'}`.

---

## 4. Firma RPC — prima e dopo

```
PRIMA:  fn_activate_link_for_worker(p_token_digest text, p_worker_id uuid, p_consent_version text)
DOPO:   fn_activate_link_for_worker(p_token_digest text, p_consent_version text)
```

**Chiamanti aggiornati (minimo indispensabile, nessun refactoring esteso):**

- `lib/kora-link/activation.ts` — `KoraLinkActivationRpcClient.rpc()` non accetta più
  `p_worker_id` negli argomenti; la chiamata RPC ora invia solo `p_token_digest` e
  `p_consent_version`. Il parametro `workerId` di `ActivateKoraLinkForWorkerParams` **resta**
  come guardia applicativa pre-flight (il chiamante deve essere un worker autenticato) ma non
  viene più inoltrato alla RPC.
- `app/link/[token]/activate/route.ts` — **nessuna modifica**: continua a risolvere
  `worker.workerId` da `getCurrentWorkerUser(request)` e a passarlo a
  `activateKoraLinkForWorker()`, che ora semplicemente non lo inoltra oltre.

Nessun altro chiamante esiste nel repository (verificato via grep su tutto `app/` e `lib/`).

**Compatibilità:** rottura di compatibilità intenzionale della firma SQL (nessun ambiente reale la
consuma, essendo `036` mai applicata). Messaggi privacy-safe, rate limiting, Origin guard e
sanitizzazione Sentry del percorso applicativo restano invariati (nessun file toccato in
`lib/security/`, `middleware.ts`, o configurazione Sentry).

---

## 5. Modello token

Non modificato in questo sprint — già solido:

- `token_digest = HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET)`, 64 char hex, `UNIQUE`.
- Nessuna colonna `token_value` in nessuna tabella (verificato staticamente).
- Il digest completo non è mai restituito da nessuna RPC; solo `token_digest_prefix` (primi 8
  caratteri) può comparire in `audit_log`, mai in una risposta al client.
- Effettivamente single-assignment-per-token: indice unico parziale
  `uq_assignment_link_active` impedisce due assegnazioni attive sullo stesso link.
- Riattivazione dello stesso worker sullo stesso token è idempotente (`already_active`), non
  un errore.

Nessuna modifica necessaria per questo sprint; verificato con nuovi test statici (BLOCCO 4).

---

## 6. Revoca

Non modificata in questo sprint — già conforme ai requisiti:

- Immediata (transazione singola, nessun job asincrono).
- `fn_revoke_link` richiede `kora_link.is_kora_admin()` — ruolo autorizzato.
- Idempotente in modo esplicito: revocare un link già `revoked/replaced/orphaned` restituisce
  `{success: false, error_code: 'already_terminal'}`, non un'eccezione né un successo silenzioso.
- Row lock `FOR UPDATE NOWAIT` prima della transizione — previene race con attivazione
  concorrente.
- Registrata in `kora_link.revocations` (append-only) e `kora_link.link_events`.
- **Revoca cross-tenant da KORA_ADMIN è intenzionalmente permessa** — pattern di accesso admin
  limitato e documentato altrove nel repository (RLS-03/05/06), non un gap. `COMPANY_ADMIN` non
  ha alcun percorso di revoca (nessuna policy, nessuna funzione a lui concessa).

---

## 7. Scadenza

- **Default:** `pre_activation_expires_at = created_at + INTERVAL '180 days'` — decisione
  canonica già esistente e già rivista (KL-16/KL-19), **non sostituita** con un default generico
  di 7 giorni suggerito dal brief, perché una decisione canonica di progetto esiste già e il
  brief stesso richiede di rispettarla in questo caso.
- **Massimo:** i 180 giorni sono anche il massimo — non esiste meccanismo di estensione nello
  schema attuale.
- **Confronto temporale:** `<=  now()` — al confine esatto il token è considerato scaduto
  (inclusivo).
- **Post-attivazione:** nessun TTL — scelta di design esplicita e documentata (revoca manuale
  per offboarding); non modificata in questo sprint.
- **Timezone:** `timestamptz` in tutte le colonne — nessuna ambiguità di fuso.
- **Token pubblico scaduto:** `fn_public_lookup_link` restituisce la stessa risposta generica di
  "non trovato" (nessuna enumerazione).

---

## 8. Retention

- **Token/record link dopo scadenza/revoca:** nessuna cancellazione automatica; lo stato
  `expired`/`revoked` resta interrogabile per audit. Nessun cron implementato (fuori scope).
- **Audit log:** durata di retention **non definita** — bloccante DPO esplicito e invariato
  (`BLOCKER TODO-CTO-05 / GATE-3` in `034`, riconfermato da test statico in questo sprint).
- **Aggregati:** calcolati on-the-fly da `fn_company_link_status_aggregate`, nessuno stato
  persistito da ritenere.
- Lo schema resta "retention-ready" (colonne `created_at`/`revoked_at`/`ended_at` su tutte le
  tabelle rilevanti) per un job di cleanup futuro, non implementato in questo sprint.

---

## 9. Soglia di aggregazione privacy-safe

### Comportamento precedente
`fn_company_link_status_aggregate` restituiva `(status, count)` per ogni stato senza soglia.

### Comportamento nuovo
Soglia canonica riusata (non duplicata): `SAFE_AGGREGATION_THRESHOLD = 10`
(`lib/constants/kora.ts`, CLAUDE.md §13), applicata **per ogni bucket di stato**, con la stessa
semantica già in produzione in `analytics.fn_company_activation_summary` (migrazione 015, [G2]):

```
count = 0          → il bucket non compare come riga (nessuna riga con 0 in un GROUP BY)
count in [1, 9]     → count = NULL, suppressed = true
count >= 10         → count = valore reale, suppressed = false
```

Nuova firma di ritorno: `TABLE (status text, count bigint, suppressed boolean)` (prima:
`(status text, count bigint)`).

**Perché non si tratta di una nuova decisione CTO/DPO:** il valore 10 è già costituzionale
(CLAUDE.md §13, `safe_aggregation_threshold`) e già applicato altrove nello schema (migrazione
015). Applicarlo qui è un'applicazione di ingegneria di una regola già approvata, non
l'introduzione di una nuova politica.

**Non sono richiesti filtri combinabili:** questa RPC accetta un solo parametro (`p_tenant_id`),
quindi non esiste superficie per inferenze tramite combinazioni di filtri. Nessun totale
complessivo viene mai restituito, quindi non è possibile ricavare un bucket soppresso per
sottrazione dagli altri bucket visibili.

**Impatto applicativo:** verificato che nessun file in `app/`/`lib/` chiama attualmente questa
RPC — nessun chiamante applicativo da aggiornare in questo sprint.

---

## 10. Modifiche RLS

**Nessuna** — lo scope di questo sprint sul file 035 è stato limitato a soli commenti (FUNCTION
SPEC B aggiornata alla nuova firma; TODO-RLS-04 marcato risolto; TODO-RLS-05 aggiornato per
riflettere la scrittura di audit da parte di `fn_activate_link_for_worker`). Tabelle, `ENABLE/FORCE
ROW LEVEL SECURITY`, e tutte le 22 policy esistenti sono invariate — verificato dal test suite
esistente (`kora-link-rls035-review.test.ts`, tutti verdi) più i nuovi test statici di questo
sprint. Il Gate 4 (review RLS dedicata: worker self-select, policy company) resta aperto come
prima di questo sprint.

## 11. Modifiche grants

Nessuna in 034/035. In 036: i `GRANT EXECUTE` per `fn_activate_link_for_worker` sono ora legati
alla firma a 2 argomenti anziché 3 (`(text, text)` invece di `(text, uuid, text)`); i grantee
restano identici (`authenticated, service_role`, mai `anon`).

## 12. Funzioni `security definer` analizzate

Tutte le 5 funzioni `SECURITY DEFINER` di 036 sono state riverificate:
`fn_public_lookup_link`, `fn_activate_link_for_worker` (modificata), `fn_revoke_link`,
`fn_replace_link`, `fn_company_link_status_aggregate` (modificata). Tutte mantengono:
`search_path` esplicito, `REVOKE ALL ... FROM PUBLIC` prima del `GRANT EXECUTE` selettivo,
nessun `SELECT *`, nessun riferimento a `token_value`.

---

## 13. Audit privacy-safe

`kora_link.audit_log` esisteva già nello schema (034) ma **nessuna funzione scriveva mai al suo
interno** — la tabella era definita ma inutilizzata. In questo sprint, `fn_activate_link_for_worker`
scrive:

- `ACTIVATION_COMPLETED` / `ok` — al successo.
- `ACTIVATION_ATTEMPTED` / `forbidden` — sul nuovo rigetto per boundary tenant (l'anomalia esatta
  che il Gate 07 temeva).

Ogni riga usa solo `token_digest_prefix` (8 caratteri, mai il digest completo), nessun nome,
nessuna email, nessun payload libero.

**Chi può leggere l'audit:** solo `KORA_ADMIN` (policy `kl_audit_admin_select`, invariata).
Nessun accesso `COMPANY_ADMIN` — l'azienda non vede mai l'audit tecnico individuale dei worker.

**Gap residuo, esplicitamente non chiuso in questo sprint:** `fn_revoke_link`, `fn_replace_link`
e `fn_public_lookup_link` **non** scrivono ancora su `audit_log` (restano coperte solo da
`link_events`, visibile solo a `KORA_ADMIN`). Documentato in `035` (`TODO-RLS-05` aggiornato) e
in un test statico dedicato che verifica esplicitamente l'assenza, per non dichiarare
implicitamente una copertura che non esiste.

---

## 14. File creati e modificati

**Modificati:**
- `supabase/proposed/036_kora_link_rpc_functions.sql`
- `supabase/proposed/035_kora_link_rls.sql` (solo commenti)
- `lib/kora-link/activation.ts`
- `tests/unit/kora-link-activation.test.ts`
- `tests/unit/kora-link-rls035-review.test.ts`
- `tests/unit/kora-link-privacy-invariants.test.ts`

**Creati:**
- `tests/unit/kora-link-security-foundation-08.test.ts`
- `docs/KORA_LINK_SECURITY_FOUNDATION_08.md` (questo file)

**Non modificati (fuori scope, confermato):**
- `supabase/proposed/034_kora_link_schema.sql`
- `supabase/proposed/037_contribution_atomic_attribution.sql`
- `supabase/proposed/038_initiative_adoption_source_model.sql`
- Qualunque file UI/navigazione, middleware generale, auth globale, Sentry, CSP, Origin guard,
  rate limiting generale, privacy policy pubblica, package/env.

---

## 15. Test

### Test statici aggiunti (questo sprint)
`tests/unit/kora-link-security-foundation-08.test.ts` — 66 assert statiche organizzate per
BLOCCO 1-6, più 18 `it.todo()` che documentano esplicitamente gli scenari **comportamentali**
richiesti dal brief e **non coperti** da questo file (nessun harness DB in questo repository).

Aggiornati (per riflettere la nuova firma/shape, senza indebolire alcuna verifica esistente):
`tests/unit/kora-link-activation.test.ts`, `tests/unit/kora-link-rls035-review.test.ts`,
`tests/unit/kora-link-privacy-invariants.test.ts`.

### Test statici (esistenti, riverificati verdi)
`kora-link-schema034-review.test.ts`, `kora-link-public-lookup.test.ts`,
`kora-link-token.test.ts`, `kora-link-config.test.ts`, `kora-link-ecosystem.test.ts`, e tutti gli
altri file `kora-link-*` esistenti.

### Test comportamentali reali — **ancora mancanti** (dichiarato esplicitamente, non "RLS verificata")
- Attivazione end-to-end contro un Postgres reale con 034-036 applicate (worker corretto, worker
  di altro worker/tenant, worker inesistente, worker disabilitato, `auth.uid()` nullo).
- Race condition reali (transazioni concorrenti sulla stessa riga `links`).
- RLS sotto JWT reali (Company A non legge Company B; anon non enumera; worker non legge altri
  worker) — oggi solo verificata come testo SQL presente, mai eseguita.
- Soglia di aggregazione con dati seminati reali (0/1/9/10/11 chip per tenant).
- Revoca/scadenza end-to-end con timestamp reali al confine esatto.

Questi rimangono bloccanti per il Gate 07 blocker #6/#7 (non chiusi da questo sprint, come da
scope esplicito del brief).

### Risultato test specifici (questo sprint)
```
tests/unit/kora-link-security-foundation-08.test.ts   66 passed | 18 todo
tests/unit/kora-link-activation.test.ts               tutti verdi
tests/unit/kora-link-rls035-review.test.ts             115 passed
tests/unit/kora-link-privacy-invariants.test.ts        tutti verdi
tests/unit/kora-link-schema034-review.test.ts          tutti verdi
```

### Risultato suite completa
```
npm test -- --run
Test Files  255 passed (255)
Tests       10401 passed | 30 skipped | 18 todo (10449)
```

### Risultato typecheck
```
npx tsc --noEmit    → nessun errore
```

### Risultato build
```
npm run build        → completata con successo (già verificato in baseline; ri-verificata a fine sprint, vedi §16)
```

### Risultato npm audit
```
npm audit             → 0 vulnerabilità (baseline e fine sprint)
```

---

## 16. Compatibilità applicativa

| RPC | Firma precedente | Firma nuova | Chiamanti | Rischio rottura | Test |
|---|---|---|---|---|---|
| `fn_activate_link_for_worker` | `(text, uuid, text)` | `(text, text)` | `lib/kora-link/activation.ts` (unico) | Nessuno — mai applicata in nessun DB; unico chiamante aggiornato in questo sprint | `kora-link-activation.test.ts` aggiornato |
| `fn_company_link_status_aggregate` | `(status, count)` | `(status, count, suppressed)` | nessuno nel repository | Nessuno | `kora-link-security-foundation-08.test.ts` |
| `fn_public_lookup_link`, `fn_revoke_link`, `fn_replace_link` | invariate | invariate | — | — | invariati |

Rate limiting, Origin guard e sanitizzazione Sentry: **non toccati**, verificato che nessun file
in `lib/security/`, `middleware.ts`, o configurazione Sentry sia stato modificato in questo
sprint (`git diff --stat` limitato ai file elencati in §14).

---

## 17. Limiti residui e rischi residui

1. **Gate 2 (CTO):** la sostanza tecnica di 034 era già "tecnicamente rivista" (KL-19); questo
   sprint hardenizza 036 ma **non costituisce ratifica umana CTO** — resta da fare.
2. **Gate 3 (DPO):** retention `audit_log`, base giuridica `request_fingerprint`, testo
   `consent_version` restano bloccanti legali, non toccati (per esplicito divieto del brief di
   fare scelte DPO per default engineering).
3. **Mismatch `consent_version`:** la costante SQL (`'kora-link-privacy-v1.0'`) e la costante
   applicativa (`lib/kora-link/activation.ts`, `'kora-link-consent-v1-draft'`) sono **due stringhe
   diverse** — entrambe segnaposto provvisori in attesa di approvazione DPO. Non riconciliate
   deliberatamente in questo sprint: scegliere un valore sarebbe una decisione DPO, non
   ingegneristica. Il flusso di attivazione non potrà mai completarsi end-to-end finché DPO non
   approva un testo e **entrambi** i lati non vengono allineati a quel valore.
4. **Gate 4 (review RLS dedicata):** worker self-select su `link_assignments` e qualunque policy
   company-facing restano commentate/inattive, come da design — non riaperte in questo sprint.
5. **Audit non ancora completo:** `fn_revoke_link`, `fn_replace_link`, `fn_public_lookup_link` non
   scrivono su `audit_log` (§13).
6. **Nessun test comportamentale reale** (§15) — resta il gap più grande prima di qualunque
   applicazione a staging.
7. **Flusso di creazione/emissione link** (Gate 07 blocker #10) — non esiste ancora alcuna RPC di
   creazione tra le 6 definite; esplicitamente fuori scope per questo sprint ("non creare nuovi
   flussi non necessari").

---

## 18. Piano di applicazione futura su staging (non eseguito in questo sprint)

1. Ratifica umana CTO delle modifiche di questo sprint (non solo lettura automatica).
2. Chiusura Gate 3: decisione DPO sui 4 blocker in `034` + riconciliazione `consent_version`
   (§17.3).
3. Review RLS dedicata "Gate 4" per 035 (worker self-select, eventuale company view).
4. Estensione della scrittura `audit_log` a `fn_revoke_link`/`fn_replace_link`/
   `fn_public_lookup_link` (§13, gap residuo).
5. Applicazione di 034 → 035 → 036 **in ordine**, su un ambiente Postgres isolato pulito, non
   su staging condiviso direttamente.
6. Esecuzione delle query di verifica POST-APPLY già documentate in ciascun file `.sql`.
7. Test comportamentali reali (§15) contro quell'ambiente isolato — inclusi i 18 scenari oggi
   marcati `it.todo()`.
8. Solo dopo il successo di 1-7: promozione a `supabase/migrations/` e applicazione a staging
   condiviso.
9. Nuovo decision gate (Gate 08 o revisione di questo) prima di qualunque inclusione nel pilota.

## 19. Rollback

Nessuna migrazione applicata in questo sprint — nessun rollback di database necessario. Rollback
del solo codice: `git revert` del commit di questo sprint (o dei singoli file elencati in §14)
riporta 034/035/036 e `lib/kora-link/activation.ts` allo stato del Gate 07. I blocchi `ROLLBACK`
già documentati in ciascun file `.sql` (`DROP FUNCTION IF EXISTS ... CASCADE`,
`DROP SCHEMA kora_link CASCADE`) restano invariati e continuano ad applicarsi solo a un futuro
scenario di applicazione reale, non a questo sprint.

## 20. Checklist pre-migration (da soddisfare prima di una futura applicazione)

- [ ] Ratifica CTO scritta di questo sprint
- [ ] Sign-off DPO sui 4 blocker Gate 3 in `034`
- [ ] `consent_version` riconciliato tra SQL e applicazione, testo approvato da DPO/legale
- [ ] Review RLS "Gate 4" completata per `035`
- [ ] Estensione audit_log a fn_revoke_link/fn_replace_link/fn_public_lookup_link (o decisione
      esplicita di non farlo, documentata)
- [ ] Test comportamentali reali eseguiti su ambiente Postgres isolato (18 scenari `it.todo()`)
- [ ] Flusso di creazione/emissione link definito (Gate 07 blocker #10) o processo admin-only
      manuale confermato dal team di prodotto
- [ ] Meccanismo di sospensione della navigazione per KORA Link (Gate 07 blocker #9) se il pilota
      includerà utenti reali
- [ ] Variabili `KORA_LINK_*` verificate in ogni ambiente Vercel raggiungibile da utenti reali

---

*Documento generato da KORA-LINK-SECURITY-FOUNDATION-08. Nessuna migrazione applicata, nessun
database remoto modificato, KORA Link non attivato, come da vincolo del brief.*
