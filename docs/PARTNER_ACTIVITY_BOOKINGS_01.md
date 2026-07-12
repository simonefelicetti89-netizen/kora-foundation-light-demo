# Partner Activity Bookings 01 — Worker-Initiated Requests Shell

**Data:** 2026-07-13
**Branch:** `feature/partner-activity-bookings-01`
**Tipo:** No-DB/no-RLS UI shell — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione DPO/CTO/fiscale/legale presa, nessuna persistenza reale, nessuna notifica reale, nessuna condivisione worker reale, nessun aggiornamento di stato reale.

## Scopo

Questo sprint introduce il primo shell **Partner Activity Bookings** — il quarto passo operativo della Fase 2 (Activation Intelligence), dopo `PARTNER-ACTIVITY-CATALOG-01` (catalogo), `COMPANY-ACTIVITY-SELECTION-01` (perimetro azienda) e `WORKER-ACTIVITY-DISCOVERY-01` (discovery worker). Mostra come un partner vedrebbe le azioni avviate volontariamente dai worker su Attività Partner standard — prenotazione, candidatura, richiesta di contatto, riscatto voucher, richiesta informazioni.

## Relazione con KORA Activation Layer

Sequenza Fase 2:

```
Catalogo Attività Partner (esiste, no-DB)
→ Selezione Attività Azienda (esiste, no-DB)
→ Worker Activity Discovery / Choice (esiste, no-DB)
→ Partner Booking / Request / Delivery (questo sprint, no-DB)
→ Segnali di Attivazione Aggregati (non ancora implementata)
→ futuro segnale KORA Index
```

## Relazione con Worker Activity Discovery

Su `/worker/activity-discovery` ogni attività ha una CTA disabilitata (Prenota/Candidati/Richiedi contatto/Riscatta voucher/Scopri di più). Questo sprint modella cosa il partner vedrebbe SE quella CTA fosse reale e il worker la utilizzasse volontariamente — nessun collegamento funzionale reale esiste tra le due pagine.

## Relazione con Partner Activity Catalog

Riusa direttamente `lib/partner-activities/catalog.ts` (via `getPartnerActivityById`) per derivare titolo attività, partner, categoria fiscale, pilastro e modalità di erogazione di ogni richiesta mock — nessuna duplicazione di modello.

## Modello di visibilità worker-initiated

Stesso principio già implementato in `/partner/relationships` (PARTNER-SURFACE-01): il nominativo del worker appare **solo** perché il worker ha scelto volontariamente di avviare la relazione. I nomi mock usati qui (Federica Moretti, Luca Santoro, Chiara Ricci, Alessandro Bruno, Valentina Colombo, Matteo Gallo) sono deliberatamente distinti dal set mock già usato in `/partner/relationships`, per evitare qualunque impressione di continuità tra i due dataset fittizi.

## Cosa può vedere il partner

- Il nominativo e i campi che il worker ha scelto di condividere (email, telefono, note) — solo per la richiesta specifica.
- L'attività, il tipo di azione, e lo stato della richiesta.
- Il campo `partnerAllowedUse` descrive esplicitamente per cosa può essere usato quel dato.

## Cosa non può vedere il partner

- L'intera forza lavoro dell'azienda cliente.
- Chi ha semplicemente sfogliato le attività senza avviare un'azione (Worker Activity Discovery non è mai visibile al partner).
- Lavoratori che non hanno avviato alcuna azione.
- Dati aziendali a livello individuale, analitiche employer-only.

## Cosa non vede mai l'azienda

Nominativi, email, stato individuale delle richieste, scelte individuali di attività, riscatti voucher individuali, o dettagli della relazione partner-lavoratore. L'azienda riceve sempre e solo output aggregati (`companyVisibility: 'aggregate_only'` su ogni record).

## Anteprima flusso di stato

Sei stati (`BookingStatus`): `new` (Nuova), `confirmed` (Confermata), `completed` (Completata), `cancelled` (Annullata), `withdrawn` (Ritirata), `follow_up_needed` (Richiede follow-up). Mostrati come badge statici — nessun aggiornamento di stato è implementato, nessun `onClick`, nessuna `fetch`, nessuna `'use server'`.

## Direzione del segnale KORA Index

Un'attività completata o evasa potrà in futuro alimentare un segnale aggregato KORA Index — distinto dai segnali Fase 1. **Il calcolo live del KORA Index (`lib/kora-engine/kora-index-engine.ts`) non è stato toccato da questo sprint.**

## Confine Contribution

Le prenotazioni di Attività Partner non alimentano mai direttamente KORA Contribution. Le iniziative KORA Space restano separate (`lib/commons/types.ts`, `lib/commons/booking-types.ts` — entrambi non toccati).

## Confine privacy

Invariato: il partner vede nominativi solo dopo un'azione volontaria del worker; la sola navigazione non è mai visibile; l'azienda resta sempre aggregate-only. Nessun dato sanitario, sindacale/politico, o eccessivamente personale è presente nei record mock (test-verificato).

## Cosa è stato costruito

- `lib/partner-activities/bookings.ts` — modello statico puro: tipi (`PartnerActivityBookingPreview`, `WorkerActionType`, `BookingStatus`), etichette italiane, 6 richieste mock (una per tipo di azione, stati variati), funzioni di accesso pure e riepilogo derivato.
- `/partner/activity-bookings` — pagina principale: introduzione Fase 2, card di riepilogo, elenco richieste (dati mock), pannello confine dati worker, pannello azienda aggregate-only, anteprima flusso di stato, nota di flusso Fase 2, note KORA Index e Contribution.
- `/partner/activity-bookings/detail` — anteprima statica di dettaglio per una richiesta di esempio (non route dinamica, per restare a basso rischio): campi condivisi, attività, cosa può fare il partner, cosa non vede l'azienda, base di consenso, cronologia stato in anteprima.
- Voce di navigazione partner "Richieste attività" sotto "Catalogo Attività", con badge `preview`.
- Cross-link a `/partner/activity-catalog`, `/worker/activity-discovery`, `/admin/kora-activation-layer`, `/partner/privacy-boundary`; e cross-link aggiunti da `/partner/activity-catalog` e `/partner/relationships` verso questa nuova pagina.

## Lavoro futuro (esplicitamente fuori scope qui)

- Entità reale `partner_activity_booking`, DB-backed.
- Modello reale di consenso e condivisione dati.
- Flusso reale di prenotazione/candidatura/richiesta di contatto/riscatto voucher.
- Aggiornamenti di stato reali lato partner.
- Pipeline reale di segnale di attivazione aggregato (`ACTIVATION-SIGNAL-PIPELINE-01`).
- Integrazione futura nel calcolo KORA Index, solo dopo revisione CTO (`KORA-INDEX-ACTIVATION-INTEGRATION-01`).

## Documenti collegati

`docs/KORA_ACTIVATION_LAYER_01.md`, `docs/WORKER_ACTIVITY_DISCOVERY_01.md`, `docs/COMPANY_ACTIVITY_SELECTION_01.md`, `docs/PARTNER_ACTIVITY_CATALOG_01.md`, `docs/PARTNER_SURFACE_01.md`.
