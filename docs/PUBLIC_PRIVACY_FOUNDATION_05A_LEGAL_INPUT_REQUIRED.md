# Public Privacy Foundation 05A — Legal Input Required

**Sprint:** PUBLIC-PRIVACY-FOUNDATION-05A (pre-publication gate)
**Date:** 2026-07-14 · **Updated:** 2026-07-14 (05B — 6/11 resolved; 05D — remaining 5/11 resolved)
**Status:** ✅ **All 11 items resolved as of PUBLIC-PRIVACY-FOUNDATION-05D. Publication gate green. This document is now a historical record of how each item was resolved, kept for traceability — not an open action list.**

This document originally inventoried the 11 legal placeholders introduced
in `lib/legal/privacy-content.ts` (PUBLIC-PRIVACY-FOUNDATION-05). In
PUBLIC-PRIVACY-FOUNDATION-05B the titolare confirmed 6 of them directly. In
PUBLIC-PRIVACY-FOUNDATION-05D the titolare approved the prudent proposals
researched in 05C (`docs/PUBLIC_PRIVACY_FOUNDATION_05C_PROVIDER_RETENTION_VERIFICATION.md`)
for the remaining 5 — legal bases (scoped to the demo/test phase),
retention matrix, and provider/transfer wording. **0 items remain
unresolved.** Note: the content approved in 05D is explicitly scoped to
the current pre-pilota demo/test phase and will need re-evaluation (legal
bases with DPO support, contractual verification of providers) before a
pilot with real companies or workers.

## Classificazione

- **(A) Deve essere fornito dal titolare/founder** — non derivabile da codice, configurazione o fonte pubblica generica.
- **(B) Ricavabile con certezza, ma non dal codice sorgente** — accertabile controllando direttamente l'infrastruttura reale (dashboard del fornitore), non presente in questo repository.
- **(C) Già formulabile correttamente senza inventare il valore** — fatto giuridico generico applicabile con alta probabilità dato il contesto, già scritto in questi termini nel contenuto attuale.

## Risolto in PUBLIC-PRIVACY-FOUNDATION-05B (2026-07-14)

Confermato direttamente dal titolare — non derivato dal codice, non inventato:

| # | Sezione | Valore | Come risolto |
|---|---|---|---|
| 1 | Titolare | Denominazione | "Simone Felicetti" — persona fisica, nessuna società costituita |
| 2 | Titolare | Sede legale | "Via Carso 14, San Benedetto del Tronto (AP), Italia" |
| 3 | Titolare | Partita IVA / codice fiscale | **Rimosso come campo obbligatorio** — il titolare è persona fisica, nessuna società costituita o dichiarata; non pubblicato per esplicita istruzione |
| 4 | Contatti privacy | Email dedicata al DPO | **Rimosso come campo obbligatorio** — nessun DPO nominato (v. #5) |
| 5 | Contatti privacy | Nominativo del DPO | Confermato: nessun DPO nominato. Testo pubblicato: *"Alla data di aggiornamento della presente informativa non è stato designato un Responsabile della protezione dei dati (DPO). Per ogni richiesta relativa alla protezione dei dati personali è possibile contattare direttamente il titolare all'indirizzo indicato."* (formulazione fornita testualmente dal titolare, usata invariata) |
| 11 | Reclamo all'autorità di controllo | Conferma giurisdizione | Confermato italiano (sede legale ora nota) — Garante per la protezione dei dati personali, nessun recapito ulteriore inventato |

Contatto privacy pubblicato: **simone.felicetti.kora@gmail.com** (nuovo
contatto dedicato, confermato dal titolare — distinto da `accesso@kora.io`,
già in uso per richieste di provisioning, mantenuto anch'esso nella pagina).

Aggiunto anche, su richiesta esplicita e non presente nell'inventario
originale: dichiarazione di stato piattaforma (fase pre-pilota, solo
account demo/test) e impegno di aggiornamento dell'informativa prima
dell'apertura a utenti reali — vedi `PRIVACY_PLATFORM_STATUS` /
`PRIVACY_UPDATE_COMMITMENT` in `lib/legal/privacy-content.ts`.

## Risolti in PUBLIC-PRIVACY-FOUNDATION-05D (2026-07-14) — i 5 punti restanti

Il titolare ha approvato le proposte prudenti preparate in 05C per tutti e
5 i punti sotto. Il contenuto pubblicato in `lib/legal/privacy-content.ts`
è esplicitamente scoped alla sola fase demo/test attuale (mai presentato
come valido per un pilota con aziende/lavoratori reali) e non afferma
alcun fatto contrattuale/tecnico non verificato (nessun DPA dichiarato
firmato, nessuna regione inventata — v.
`docs/PUBLIC_PRIVACY_FOUNDATION_05C_PROVIDER_RETENTION_VERIFICATION.md`
per il dettaglio della ricerca alla base di ogni formulazione).

Aggiornato in PUBLIC-PRIVACY-FOUNDATION-05C (2026-07-14) con una terza
classificazione, più precisa della sola A/B/C sopra, che distingue il
*tipo* di lavoro ancora necessario per ciascun punto. Ricerca completa,
matrici e proposte non definitive in
`docs/PUBLIC_PRIVACY_FOUNDATION_05C_PROVIDER_RETENTION_VERIFICATION.md` —
questo documento resta il riferimento per *cosa* manca, quello per il
dettaglio di *cosa è stato verificato finora e cosa viene proposto*.

- 🔧 **Dato tecnico verificato** — accertabile con certezza dal codice o da fonti pubbliche del fornitore, ma non ancora inserito perché richiede comunque una conferma finale.
- 🧑‍⚖️ **Decisione del titolare ancora richiesta** — non è un fatto da scoprire, è una scelta da fare (eventualmente con supporto DPO/legale) — una proposta prudente è già stata preparata in 05C.
- 📄 **Verifica contrattuale ancora richiesta** — dipende da un documento/accettazione contrattuale (DPA, piano attivo) che nessuna ricerca tecnica può confermare da sola.

| # | Sezione | Valore richiesto | Motivo | Fonte necessaria | Proposta di formulazione (nessun valore inventato) | Classe A/B/C | Classe 05C |
|---|---|---|---|---|---|---|---|
| 6 | Basi giuridiche | Base giuridica confermata per ciascuna categoria di trattamento (art. 6/9 GDPR) | `docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md` segnala esplicitamente che il consenso in ambito lavorativo è presuntivamente non valido e richiede valutazione DPO dedicata — non è una determinazione che il codice può risolvere | DPO/legale esterno | Struttura già pronta per categoria (autenticazione, dati worker, dati azienda, ecc.) — richiede la base giuridica specifica per ciascuna, non un'unica dicitura generica. **Proposta prudente completa per la sola fase demo/test in 05C §8** | A | 🧑‍⚖️ Decisione del titolare (con DPO) — proposta già pronta, da confermare |
| 7 | Destinatari e fornitori | DPA sottoscritti con Supabase/Vercel/Sentry/Upstash | Un DPA è un documento contrattuale — non risulta e non può risultare nel codice sorgente | Founder/titolare (verifica diretta con ciascun fornitore) | Verificato: tutti e 3 i fornitori raggiungibili (Supabase, Vercel, Sentry) pubblicano un DPA, **nessuno vincolante senza firma/accettazione esplicita** — Upstash non verificato (pagine legali non raggiunte) | A | 📄 Verifica contrattuale — disponibilità confermata, firma da verificare |
| 8 | Trasferimenti internazionali | Regione/localizzazione effettiva dei server di Supabase, Vercel, Sentry, Upstash | Non configurata/documentata nel codice — `.env.local.example` usa solo placeholder (`<project-ref>.supabase.co`), nessuna regione è mai specificata in nessun file del repository | Founder/operatore — verifica diretta sulle dashboard reali dei 4 fornitori | Vercel dichiara pubblicamente "primary processing facilities... United States" (fonte: DPA pubblico) — le altre 3 restano non verificate | B | 🔧 Dato tecnico (parziale, solo Vercel) + 📄 verifica dashboard per le altre 3 |
| 9 | Trasferimenti internazionali | Garanzie per trasferimenti extra SEE, se applicabili | Dipende interamente dal punto 8 — se un fornitore tratta dati fuori SEE, serve la base legale del trasferimento (es. clausole contrattuali standard) | Founder/legale, dopo aver accertato il punto 8 | Verificato per Vercel e Sentry: entrambi dichiarano pubblicamente SCC (+ UK IDTA per Vercel, Data Privacy Framework per Sentry) come meccanismo — Supabase e Upstash non verificati | A (dipendente da B) | 🔧 Dato tecnico (Vercel/Sentry) + 📄 verifica per Supabase/Upstash |
| 10 | Tempi di conservazione | Politica di conservazione (retention) per ciascuna categoria di dati | `docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md` la elenca esplicitamente come blocco aperto (§8.11): **non esiste ancora una policy**, non solo non è documentata — è una decisione non ancora presa | Founder + DPO (decisione da prendere, non solo da riportare) | Inventario tecnico completo (cosa è già applicato vs. assente) + matrice proposta completa per categoria in **05C §6-7, §9** | A | 🧑‍⚖️ Decisione del titolare (con DPO) — proposta prudente già pronta, da confermare |

## Regola seguita

Nessuno degli 11 valori è stato sostituito autonomamente in nessuna fase.
I 6 punti risolti in 05B provengono testualmente dall'istruzione esplicita
del titolare. I restanti 5, risolti in 05D, provengono da proposte
prudenti preparate in 05C (basate su ricerca tecnica verificabile) e
approvate esplicitamente dal titolare prima della pubblicazione — nessuna
invenzione, nessuna inferenza non dichiarata. Il gate di pubblicazione
(`tests/unit/public-privacy-foundation-05a-publication-gate.test.ts`)
calcola il numero di placeholder residui dinamicamente dal contenuto reale
di `lib/legal/privacy-content.ts` — oggi risulta correttamente **0**, non
un valore hardcoded.

## Prossimo passo

Nessun'azione richiesta per la pubblicazione della fase demo/test attuale.
Prima di un'apertura reale ad aziende/lavoratori, restano da fare: verifica
contrattuale diretta dei 4 fornitori sulle dashboard reali (checklist in
`docs/PUBLIC_PRIVACY_FOUNDATION_05C_PROVIDER_RETENTION_VERIFICATION.md`
§"Checklist per il titolare"), rivalutazione delle basi giuridiche con
supporto DPO/legale per il contesto lavorativo reale, e implementazione di
un job di cleanup automatico per account/dati demo prima che la retention
organizzativa (oggi gestita manualmente) debba scalare oltre l'uso attuale.
