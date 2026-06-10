# KORA Foundation Light — Worker Trial Runbook

**Versione**: B114  
**Per**: KORA_ADMIN  
**Scope**: Verificare il circuito worker end-to-end — da provisioning a aggregati company — su un tenant trial controllato.

---

## Risposta alla domanda guida

> "Possiamo dimostrare il circuito worker completo senza improvvisare?"

**Sì. Questo runbook ti guida passo-passo.**

---

## Circuito da validare

```
KORA_ADMIN provisiona worker
  → worker riceve email con link di accesso
  → worker fa login da /worker/login
  → worker completa onboarding privacy
  → KORA_ADMIN pubblica iniziative
  → worker vede iniziative disponibili
  → worker esprime interesse / si iscrive
  → worker vede storico partecipazioni privato
  → worker vede profilo di attivazione per pillar
  → COMPANY_ADMIN vede solo aggregati anonimi (N≥10 → CLEAR, N<10 → SUPPRESSED)
  → nessun dato individuale worker esposto alla company
```

---

## Prerequisiti

Prima di iniziare:

- [ ] Deploy Vercel aggiornato (`main` deployato — verifica su Vercel dashboard)
- [ ] Supabase: migrazioni **007**, **008**, **009** applicate (vedi istruzioni sotto)
- [ ] SMTP configurato in Supabase (Project Settings → Auth → SMTP) — serve per le email di invito worker
- [ ] Account **KORA_ADMIN** attivo (`kora_role = KORA_ADMIN` in `app_metadata`)
- [ ] Account **COMPANY_ADMIN** su un tenant separato dal trial (per verificare l'isolation)
- [ ] File fixture: `data/worker-trial/worker_trial_seed.json` — riferimento per i dati trial

### Verifica migrazioni applicate

Nel SQL Editor di Supabase, esegui:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'personal'
ORDER BY table_name;
```

Devono apparire: `worker_identity`, `worker_profile_private`, `worker_initiative`, `worker_participation`.

Se mancano, applica le migrazioni in ordine:
- `supabase/migrations/007_worker_provisioning.sql`
- `supabase/migrations/008_worker_initiatives.sql`
- `supabase/migrations/009_worker_onboarding.sql`

---

## Step 1 — Crea il tenant trial

**URL**: `/admin/companies`

1. Clicca **"Provision new company"**
2. Compila:
   - **Company name**: `KORA Trial S.r.l.`
   - **Tenant code**: `KORA-TRIAL` (o variante con data: `KORA-TRIAL-0610`)
   - **Admin email**: usa un'email reale a cui hai accesso (es. la tua email +alias)
3. Premi **Provision**
4. Verifica risposta:
   ```json
   { "ok": true, "tenantCode": "KORA-TRIAL" }
   ```
5. Nota il **tenant UUID** — ti servirà per le iniziative.

> **IMPORTANTE**: usa un tenant code diverso per ogni trial. Non usare `OP-001` (riservato demo sintetica).

---

## Step 2 — Provisiona i worker trial

**URL**: `/admin/workers`

Per ogni worker nel file `data/worker-trial/worker_trial_seed.json`, provisiona usando:
- **Tenant code**: `KORA-TRIAL`
- **Email**: usa email reali a cui hai accesso (es. alias `+worker01@tuodominio.it`) **oppure** email di test verificate in Supabase

> **Nota privacy**: `worker_ref` è un codice opaco, non un nome reale. Usa i codici del fixture (`WRK-TRIAL-001`, ecc.).

**Per fare il trial minimo** (verifica circuito, non volume):

Provisiona almeno **3 worker** per testare il flusso individuale, poi valuta se arrivare a 10+ per testare la soglia privacy sull'aggregato company.

Per ogni worker:
1. Inserisci tenant code: `KORA-TRIAL`
2. Inserisci email worker (reale, a cui hai accesso)
3. Inserisci worker_ref: `WRK-TRIAL-001` (ecc.)
4. Premi **Provision**
5. Verifica:
   ```json
   { "ok": true, "workerId": "...", "workerRef": "WRK-TRIAL-001" }
   ```

Il sistema:
- Crea un account Supabase per il worker via `inviteUserByEmail`
- Inserisce la riga `personal.worker_identity`
- Setta `kora_worker_id` e `kora_role = WORKER` in `app_metadata`
- Invia email di invito (richiede SMTP configurato)

---

## Step 3 — Worker: primo accesso

Il worker riceve un'email con link di invito Supabase.

1. Worker clicca il link nell'email
2. Il link va a `/auth/callback?code=xxx&type=invite`
3. Il sistema scambia il codice e redirige a `/worker/setup-password`
4. Worker imposta la password (min 8 caratteri)
5. Viene rediretto a `/worker/onboarding`

**URL diretto per test**: `/worker/login`

Il worker può anche andare direttamente a `/worker/login` se ha già la password.

---

## Step 4 — Worker: onboarding privacy

**URL**: `/worker/onboarding`

L'onboarding è obbligatorio prima dell'accesso al workspace.

Il worker vede 5 step:
1. **Benvenuto** — cos'è My KORA
2. **Cosa vede l'azienda** — solo aggregati anonimi, soglia 10 lavoratori
3. **Cosa vedi tu** — profilo privato, storico, iniziative
4. **Consenso privacy** — checkbox obbligatorio:
   > "Ho compreso che il mio profilo individuale resta privato e che l'azienda vede solo dati aggregati anonimi."
5. **Profilo minimo** — display name (opzionale), lingua preferita

Dopo il consenso → redirect a `/worker/workspace`.

> **Verifica**: se il worker torna a `/worker/onboarding?mode=review`, deve vedere il riepilogo del privacy boundary senza richiedere nuovo consenso.

---

## Step 5 — Pubblica le iniziative worker

**URL**: `/admin/worker-initiatives`

Prima che i worker vedano le iniziative, devi pubblicarle.

1. Seleziona il tenant `KORA-TRIAL` nel dropdown
2. Crea le iniziative dal fixture `data/worker-trial/worker_trial_seed.json`:

| Iniziativa | Pillar | Status da impostare |
|---|---|---|
| Camminata aziendale | LIFE | published |
| Workshop Excel | GROWTH | published |
| Lunch & Learn | CONNECTION | published |
| Raccolta alimentare | IMPACT | published |
| Mentoring junior-senior | LEGACY | published |
| Sessione mindfulness | LIFE | published |
| Certificazione AWS | GROWTH | draft (non visibile ai worker) |
| Hackathon interno | CONNECTION | closed |

3. Per ogni iniziativa:
   - **Title**: copia dal fixture
   - **Pillar**: seleziona dal dropdown
   - **Status**: `draft` (poi pubblica)
   - Premi **Salva**
4. Per pubblicare: modifica status → `published` → Salva

> Verifica: `/admin/worker-initiatives?tenantId=<UUID>` deve mostrare le iniziative create.

---

## Step 6 — Worker: interazione con le iniziative

Il worker (loggato su `/worker/workspace`) vede le iniziative **published** del suo tenant.

### 6a — Esprimere interesse

1. Worker vede la lista iniziative nella sezione "Iniziative disponibili"
2. Clicca **"Mi interessa"** su un'iniziativa
3. Status diventa `interested`
4. Il pulsante cambia in "Iscrivi" o "Annulla interesse"

### 6b — Iscriversi

1. Worker clicca **"Mi iscrivo"** (o "Registrati")
2. Status diventa `registered`
3. Il pulsante mostra "Annulla iscrizione"

### 6c — Annullare

1. Worker clicca **"Annulla"**
2. Status diventa `cancelled`

### 6d — Verificare lo storico privato

Nella sezione "Storico partecipazioni":
- Worker vede le sue partecipazioni per data
- Vede pillar, titolo iniziativa, status
- Può aggiungere nota privata (se implementata)
- Nessun altro vede questo storico

### 6e — Verificare il profilo di attivazione per pillar

Nella sezione "Il tuo profilo di attivazione":
- Worker vede la distribuzione delle sue partecipazioni per pillar
- Mostra LIFE / GROWTH / CONNECTION / IMPACT / LEGACY con conteggio
- Etichetta chiara: "Visibile solo a te"
- Nessun punteggio PIB esposto
- Nessun confronto con altri worker

---

## Step 7 — Company: verifica aggregati

**URL**: `/company/workspace`

Loga come COMPANY_ADMIN del tenant `KORA-TRIAL`.

### 7a — Aggregati con N < 10 (suppressed)

Se hai provisonato meno di 10 worker con partecipazioni, la company vedrà:

```
Partecipazione: SOPPRESSA
Motivo: soglia privacy (< 10 partecipanti per pillar)
```

Questo è il **comportamento corretto e atteso**. Non è un errore.

### 7b — Aggregati con N ≥ 10 (clear)

Se hai provisonato 10+ worker e almeno 10 partecipazioni per pillar, la company vede:

```
LIFE:       X partecipazioni totali
GROWTH:     Y partecipazioni totali
CONNECTION: Z partecipazioni totali
...
```

Senza mai vedere:
- Nomi dei worker
- Email dei worker
- `worker_id` o `worker_ref`
- Note private
- Profili individuali

---

## Step 8 — Privacy checks obbligatori

Esegui questi check prima di dichiarare il trial completato:

### Check 1 — Company non vede nomi worker

Nella company workspace, verifica che **non appaia mai**:
- `WRK-TRIAL-001` (worker_ref)
- Email worker (`@kora-trial.example`)
- Nome/cognome individuale

### Check 2 — Company non vede profilo privato

La company non ha accesso a:
- `/worker/workspace`
- `/worker/onboarding`
- `/api/worker/*`

Se un COMPANY_ADMIN tenta questi URL → redirect a `/company/workspace`.

### Check 3 — Soglia privacy attiva

Con N < 10 partecipazioni per pillar → il campo è `suppressed: true`, non `0` o `-1`.

Verifica nella console del browser (Network tab):

```json
{
  "pillar": "LIFE",
  "suppressed": true,
  "suppression_reason": "privacy_threshold",
  "suppression_threshold": 10
}
```

### Check 4 — Worker non vede altri worker

Il worker sul proprio workspace **non vede**:
- Lista di altri worker
- Partecipazioni di altri worker
- Aggregate company (solo l'azienda le vede)

### Check 5 — Nessun employer access individuale

Verifica nel codice (o Network tab) che le API worker non restituiscano dati ad account company:

```
GET /api/worker/activation-profile → 401/403 per COMPANY_ADMIN
GET /api/worker/history             → 401/403 per COMPANY_ADMIN
```

---

## Troubleshooting

### "Table does not exist" o "relation does not exist"

Le migrazioni 007/008/009 non sono state applicate. Applica via SQL Editor Supabase in ordine:
```
007_worker_provisioning.sql
008_worker_initiatives.sql
009_worker_onboarding.sql
```

### Worker non riceve email di invito

1. Verifica SMTP in Supabase: Project Settings → Auth → SMTP
2. Controlla spam/junk
3. Usa email @gmail.com o @outlook.com (evita email alias temporanee)
4. Verifica che Supabase non stia usando rate limiting

### Link invito scaduto

Il link Supabase scade in 24 ore (default). Soluzioni:
1. Riprovisiona il worker: `/admin/workers` → nuovo invito
2. Oppure usa la funzione "Resend invite" da Supabase Auth dashboard

### Redirect sbagliato dopo setup password

Verifica che `app/worker/setup-password/_form.tsx` redirecti a `/worker/onboarding`, non a `/worker/workspace` direttamente.

### Loop onboarding

Sintomo: il worker continua a tornare a `/worker/onboarding`.
Causa: la riga `worker_profile_private` non è stata creata o `onboarding_completed_at` è null.

Verifica in Supabase SQL Editor:
```sql
SELECT worker_id, onboarding_completed_at, onboarding_status
FROM personal.worker_profile_private
WHERE worker_id = '<worker-uuid>';
```

Se manca la riga: il POST `/api/worker/onboarding` non ha completato correttamente.

### Aggregate suppressed inatteso

Con N < 10 partecipazioni per pillar, la soppressione è **corretta**. Non è un bug.
Per vedere aggregati chiari: porta almeno 10 worker attivi con 10+ partecipazioni per pillar.

### Worker vede /company/login invece di /worker/login

Aggiornamento B113-B non deployato. Verifica che il commit `076e686` sia su Vercel.

---

## Dati trial: cosa eliminare dopo il test

Dopo il trial, se vuoi ripulire il tenant di test:

1. In Supabase Auth → Users: elimina gli utenti `@kora-trial.example`
2. In Supabase SQL Editor:
   ```sql
   -- Prima verifica che sia il tenant giusto
   SELECT id, company_name FROM analytics.tenant WHERE tenant_code = 'KORA-TRIAL';
   
   -- Poi elimina (CASCADE su tutte le tabelle personal.*)
   DELETE FROM analytics.tenant WHERE tenant_code = 'KORA-TRIAL';
   ```
3. L'eliminazione a cascata rimuove: worker_identity, worker_profile_private, worker_initiative, worker_participation.

> **ATTENZIONE**: non eliminare mai tenant con dati reali. Solo tenant trial.

---

## Checklist UX — verifica prima di presentare il trial

Esegui questa verifica manuale per ogni sessione di trial demo:

### Worker experience
- [ ] `/worker/login` — la pagina mostra "Accesso lavoratore" con il messaggio privacy in basso
- [ ] `/worker/onboarding` — i 5 step sono navigabili, il consenso è richiesto
- [ ] `/worker/workspace` — il nome del worker appare nell'header (se ha display_name impostato)
- [ ] `/worker/workspace` — la sezione "Le tue iniziative" mostra le card con date in formato italiano (es. "15 gen 2024")
- [ ] `/worker/workspace` — il click su "Mi interessa" mostra "Aggiornamento salvato" dopo 2-3 secondi
- [ ] `/worker/workspace` — se nessuna iniziativa → messaggio spiegativo ("quando attive, appariranno qui")
- [ ] `/worker/workspace` — il profilo di attivazione è vuoto fino alla prima partecipazione (empty state corretto)
- [ ] `/worker/workspace` — il footer non mostra riferimenti tecnici interni
- [ ] `/worker/workspace` — "Rivedi privacy boundary" punta a `/worker/onboarding?mode=review`

### Privacy boundary
- [ ] Nessuna company route accessibile al worker (redirect a `/worker/login`)
- [ ] Nessun `worker_ref` esposto nell'interfaccia worker
- [ ] Il profilo di attivazione ha etichetta "non è una valutazione individuale"
- [ ] La company workspace mostra SUPPRESSED per N < 10 partecipazioni per pillar

### Navigazione
- [ ] Nessun link rotto nel workspace worker
- [ ] Nessun link a `/company/login` nel percorso worker

---

## MVP Limitations

Funzionalità non ancora costruite in Foundation Light — non presentare come attive:

| Funzionalità | Stato | Note |
|---|---|---|
| Dynamic Impact CV completo | Non disponibile | Placeholder "Prossimamente" nel workspace |
| Partner Map | Non disponibile | Fuori scope Foundation Light |
| KORA Commons / social feed | Non disponibile | Fuori scope Foundation Light |
| Worker ranking o gamification | Fuori scope permanente | Non costruire — vietato dall'architettura |
| Wallet / voucher / pagamenti | Fuori scope Foundation Light | Non costruire pre-Gate 3 |
| Note private sulle partecipazioni | Parziale | Campo presente nel DB, UI non esposta |
| Condivisione Dynamic CV (LinkedIn) | Non disponibile | Future Vision — mockup only |
| Prenotazioni dirette servizi | Non disponibile | Booking Light = solo request/confirm |

**Cosa dire al worker trial:**
> "Stai provando KORA Foundation Light — il circuito core è completo. Dynamic Impact CV e la condivisione del profilo arrivano nel prossimo sprint. Tutto quello che vedi è privato e non visibile alla tua azienda."

---

## Quanto manca alla Worker Platform MVP

Dopo B114, lo stato della Worker Platform è:

| Componente | Stato |
|---|---|
| Worker login (`/worker/login`) | ✓ COMPLETO |
| Worker onboarding & consent | ✓ COMPLETO |
| Worker workspace (identità, iniziative, storico, profilo attivazione) | ✓ COMPLETO |
| Worker participation privacy & RLS | ✓ COMPLETO |
| Company aggregate (suppressed/clear) | ✓ COMPLETO |
| End-to-end trial runbook | ✓ B114 |
| Dynamic Impact CV | ✗ Non iniziato |
| Partner Map | ✗ Non iniziato |
| Commons / social feed | ✗ Non iniziato |
| Worker ranking / gamification | ✗ Fuori scope (non costruire) |

**Worker Platform MVP è al ~80%.** Il circuito core è completo e dimostrabile. Mancano le feature di valorizzazione individuale (Dynamic CV) e di ecosistema (Partner Map, Commons).

---

*Documento generato automaticamente — B114 Worker Trial Runbook*  
*Canonical product architecture: `docs/kora-canonical-product-architecture-v1.md`*
