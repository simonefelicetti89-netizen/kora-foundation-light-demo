# Partner Surface 01 — Worker-Initiated Visibility Model

**Data:** 2026-07-12
**Branch:** `feature/partner-surface-01`
**Tipo:** No-DB/no-RLS UI/UX preview pages + product principle documentation — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione CTO/DPO presa.

## Perché questo sprint

L'audit di piattaforma ha rilevato che Partner è la superficie stakeholder più debole di KORA — molte meno pagine rispetto a Company/Admin, e la sola pagina KORA Link (`/partner/kora-link/initiatives`) non bastava a rappresentare un'area partner credibile. Questo sprint introduce la prima Partner Surface reale, applicando la regola di prodotto corretta:

> KORA non nasconde il lavoratore a ogni stakeholder. KORA nasconde il lavoratore all'azienda quando l'interazione appartiene alla relazione lavoratore-partner.

## Il modello di visibilità

**Company (azienda):** sempre e solo aggregato. Nessun nome, nessuna interazione partner a livello di singolo worker, nessuno scan individuale, nessuna attivazione individuale, nessuna candidatura o prenotazione individuale.

**Partner:** aggregato di default nelle viste di analytics/reporting. Nominativo (nome/cognome) visibile **solo** dentro le viste di relazione avviata volontariamente dal lavoratore — candidatura, richiesta di contatto, iscrizione a iniziativa, condivisione di profilo, prenotazione volontaria. Il partner vede solo i campi che il lavoratore ha scelto esplicitamente di condividere (email, profilo, Dynamic CV) — mai oltre. Il partner non deve mai poter segnalare all'azienda l'attività nominativa di un lavoratore.

**Worker (lavoratore):** deve poter distinguere chiaramente quando è anonimo/aggregato e quando sta condividendo la propria identità con un partner. La condivisione avviata dal lavoratore deve essere volontaria e chiaramente delimitata. Il testo di consenso/legale definitivo resta di competenza DPO — non inventato in questo sprint.

## Pagine aggiunte

| Route | Scopo | Nominativi worker? |
|---|---|---|
| `/partner/initiatives` | Pipeline generale di iniziative (proponi, sponsorizza, adotta, supporta) — distinta dalle iniziative KORA Link Track A (scan fisico) già esistenti su `/partner/kora-link/initiatives` | No — solo interesse aggregato per iniziativa |
| `/partner/relationships` | Relazioni avviate volontariamente dal lavoratore col partner | **Sì, per design** — ogni riga rappresenta una relazione che il lavoratore ha scelto di avviare |
| `/partner/aggregate-signals` | Segnali privacy-safe su interesse, partecipazione, feedback e distribuzione per pilastro | No — nessun nominativo, nessun elenco di eventi individuali |
| `/partner/privacy-boundary` | Spiega esplicitamente cosa può/non può vedere il partner e cosa può/non può vedere l'azienda | No — pagina puramente esplicativa |

Tutte e quattro sono pure anteprime UI/UX: dati mock statici, nessuna connessione a database o servizi esterni, nessuna azione resa funzionale. `/partner/kora-link` e `/partner/kora-link/initiatives` (già esistenti, KORA-LINK-SHELL-01/POLISH-01) sono stati aggiornati con cross-link verso questa nuova area, senza sovraccaricarli di contenuto non pertinente a KORA Link Track A — restano scope-specifiche al canale di verifica scan.

## Cosa resta esplicitamente aperto

- Testo di consenso/legale definitivo per la condivisione lavoratore→partner: **DPO-owned**, non deciso qui.
- Soglia minima di aggregazione per `/partner/aggregate-signals`: in attesa di decisione CTO/DPO, come per il resto della piattaforma.
- Persistenza reale delle relazioni lavoratore-partner: richiede schema, RLS e RPC dedicati — non esistono oggi, `034/035/036` restano `proposed`, non applicati, e non toccati da questo sprint.
- Nessun flag KORA Link è stato abilitato; worker self-select su `link_assignments` resta commentato/inattivo; nessuna policy company-facing di SELECT diretta è stata aggiunta.

## Cosa NON è stato fatto (per design)

- Nessuna tabella o RLS per relazioni lavoratore-partner è stata creata o proposta in questo sprint — le pagine usano esclusivamente dati mock in-memory.
- Nessuna decisione CTO/DPO è stata presa o marcata come risolta.
- Nessun testo di consenso finale è stato scritto — solo un placeholder che rimanda esplicitamente a Gate 3.
- Nessuna funzionalità KORA Link (scan, activation, RPC) è stata toccata.

## Documenti collegati

`docs/KORA_LINK_CHANGELOG.md`, `docs/KORA_LINK_STATUS.md`, `docs/kora-canonical-product-architecture-v1.md` §25 (Capability Scope Matrix — Partner surfaces).
