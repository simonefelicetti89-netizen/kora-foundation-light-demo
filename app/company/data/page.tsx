'use client';
// C-03: Stato Dati & Evidenze — la superficie Company raggiungibile per lo stato
// dei dati inviati a KORA.
// Live-only: richiede una sessione company autenticata (COMPANY_ADMIN). B144: demo branch rimosso.
// Senza sessione live → stato di sessione non disponibile. Nessun dato sintetico. Nessun branch demo.
//
// KORA-WP-049 (Founder ruling READING B — REACH THE RIGHT COMPANY PERSONA,
// 2026-09-21): questa pagina prometteva il dettaglio delle evidenze ma non
// leggeva nulla, quindi un esito di qualità non era spiegabile a un utente
// Company non tecnico sul percorso che la Company raggiunge davvero. Ora legge
// la cronologia GIÀ persistita e GIÀ esposta da
// GET /api/company/data-submissions/history — nessuna nuova persistenza,
// nessun nuovo contratto d'errore, nessuna migrazione, nessun dato individuale:
// quell'endpoint filtra già a monte (niente righe lavoratore, niente
// pseudonym_id, niente storagePath) e restituisce solo conteggi aggregati.
// Gli esiti sono spiegati in ordine: cos'è successo → cosa significa → cosa fare
// → cosa sta facendo KORA. Nessuna remediation inventata: il testo operatore
// compare solo quando l'endpoint lo marca visibile alla Company.

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PX } from '@/lib/design/kora-design-tokens';
import {
  PageHead, Workspace, Col, Region, Metric, MetricStrip,
  Status, Chip, Notice, StateBlock, SkeletonRows,
} from '@/components/ui/px';
import { useCompanySession } from '../_providers/CompanySessionProvider';

interface EligibilityCounts {
  eligible?:       number | null;
  limited?:        number | null;
  blocked?:        number | null;
  reviewRequired?: number | null;
}

interface HistoryEntry {
  batchId:           string;
  sourceType:        string;
  sourceName:        string | null;
  period:            string | null;
  status:            string;
  statusLabel:       string;
  rowCount:          number | null;
  mappedCount:       number | null;
  rejectedCount:     number | null;
  createdAt:         string | null;
  processedAt:       string | null;
  submittedAt:       string | null;
  fileCount:         number | null;
  adminComment:      string | null;
  eligibilityCounts: EligibilityCounts | null;
}

type PxTone = 'ok' | 'warn' | 'risk' | 'info' | 'idle';

// Ogni stato è già canonico lato endpoint (STATUS_LABEL). Qui si aggiunge solo
// il tono e la spiegazione di prodotto — nessuno stato nuovo, nessuna promessa
// di tempi, nessuna causa inventata.
const STATUS_TONE: Record<string, PxTone> = {
  pending:                        'info',
  approved:                       'ok',
  rejected:                       'risk',
  archived:                       'idle',
  submission_draft:               'idle',
  submission_pending:             'info',
  submission_needs_clarification: 'warn',
  submission_accepted:            'ok',
  submission_rejected:            'risk',
  submission_archived:            'idle',
};

/** Cosa significa lo stato per la Company. Deriva solo dal workflow esistente:
 *  la Company invia, KORA Admin revisiona, l'esito torna nel workspace. */
const STATUS_MEANING: Record<string, string> = {
  pending:                        'KORA Operator ha ricevuto i dati e non ha ancora completato la revisione. Non è richiesta alcuna azione da parte tua.',
  approved:                       'I dati hanno superato la revisione e sono entrati nel calcolo del KORA Index per il periodo indicato.',
  rejected:                       'I dati non sono stati accettati per il calcolo. Il motivo, quando KORA Operator lo condivide, è riportato qui sotto.',
  archived:                       'Questo invio è stato archiviato e non concorre al calcolo corrente.',
  submission_draft:               'La bozza non è ancora stata inviata a KORA: finché resta in bozza non entra in revisione.',
  submission_pending:             'L’invio è arrivato a KORA. KORA Operator lo revisiona prima che i dati entrino nel calcolo.',
  submission_needs_clarification: 'KORA Operator ha bisogno di un chiarimento prima di completare la revisione. Questo è l’unico stato che richiede una tua risposta.',
  submission_accepted:            'L’invio è stato accettato da KORA Operator ed è entrato nel percorso di calcolo.',
  submission_rejected:            'L’invio non è stato accettato. Il motivo, quando KORA Operator lo condivide, è riportato qui sotto.',
  submission_archived:            'Questo invio è stato archiviato e non concorre al calcolo corrente.',
};

/** Prossimo passo. Solo ciò che il workflow attuale supporta davvero: nessun
 *  SLA, nessuna scadenza, nessun rimedio tecnico inventato. */
const STATUS_NEXT_STEP: Record<string, string> = {
  pending:                        'Nessuna azione richiesta: KORA Operator sta revisionando.',
  approved:                       'Nessuna azione richiesta: l’esito è visibile nel tuo KORA Workspace.',
  rejected:                       'Contatta KORA per concordare un nuovo invio.',
  archived:                       'Nessuna azione richiesta.',
  submission_draft:               'Completa e invia la bozza quando i dati sono pronti.',
  submission_pending:             'Nessuna azione richiesta: KORA Operator sta revisionando.',
  submission_needs_clarification: 'Rispondi al chiarimento richiesto da KORA Operator.',
  submission_accepted:            'Nessuna azione richiesta: l’esito è visibile nel tuo KORA Workspace.',
  submission_rejected:            'Contatta KORA per concordare un nuovo invio.',
  submission_archived:            'Nessuna azione richiesta.',
};

const ELIGIBILITY_LABEL: Record<keyof EligibilityCounts, string> = {
  eligible:       'Idonei',
  limited:        'Parziali',
  blocked:        'Non idonei',
  reviewRequired: 'Da verificare',
};

/** Cosa significa ciascun esito di idoneità, in linguaggio non tecnico. */
const ELIGIBILITY_MEANING: Record<keyof EligibilityCounts, string> = {
  eligible:       'record completi: generano Impact Units',
  limited:        'record utilizzabili solo in parte',
  blocked:        'record esclusi dal calcolo',
  reviewRequired: 'record che KORA Operator verifica manualmente',
};

// KORA-WP-049 empty-state remediation (Founder visual hold, 2026-09-21): the
// zero-submission main column terminated after one small block while the rail
// continued far below it — whitespace is allowed, dead space is not. The two
// blocks below fill it with REAL workflow truth only: the three steps are the
// canonical Operator-mediated path this page already describes, and the list
// names the fields the history endpoint actually returns. No fabricated
// submission, metric, count, trend or action, and no self-service upload
// implied — the Company sends the Data Pack to KORA, it does not ingest it.
const PROCESS_STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Invio dati',
    body:  'La tua organizzazione invia il Data Pack a KORA. L’invio resta in bozza finché non viene inviato, poi passa in revisione.',
  },
  {
    title: 'Revisione KORA Operator',
    body:  'KORA Operator verifica i dati prima che entrino nel calcolo. L’esito può essere: accettato, oppure chiarimento richiesto — l’unico stato che richiede una tua risposta.',
  },
  {
    title: 'Esito disponibile',
    body:  'Lo stato di ogni invio compare qui e nel tuo KORA Workspace, con cosa significa e l’eventuale prossimo passo.',
  },
];

/** Ciò che questa pagina mostrerà: sono i campi realmente restituiti dalla
 *  cronologia invii, descritti — mai valori inventati. */
const WHAT_APPEARS_HERE: string[] = [
  'Stato di ogni invio e periodo di riferimento',
  'Cosa significa quello stato per la tua organizzazione',
  'Il prossimo passo, quando è richiesta una tua azione',
  'Le note di KORA Operator, quando vengono condivise con te',
  'Conteggi aggregati dei record: idonei, parziali, non idonei, da verificare',
];

function formatStamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Un invio merita attenzione della Company solo quando il workflow lo dice:
 *  chiarimento richiesto, rifiuto, oppure record non accettati. */
function needsAttention(e: HistoryEntry): boolean {
  if (e.status === 'submission_needs_clarification') return true;
  if (e.status === 'rejected' || e.status === 'submission_rejected') return true;
  if ((e.rejectedCount ?? 0) > 0) return true;
  const c = e.eligibilityCounts;
  return Boolean(c && ((c.blocked ?? 0) > 0 || (c.reviewRequired ?? 0) > 0));
}

export default function DataEvidence() {
  const { isLive, companyName: liveCompanyName, sessionLoading } = useCompanySession();
  // Both pieces of state are written only from the fetch callbacks, so the
  // load state below is derived rather than set synchronously inside an effect.
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    fetch('/api/company/data-submissions/history', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('history'))))
      .then((res) => setHistory((res.history ?? []) as HistoryEntry[]))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!isLive || sessionLoading) return;
    load();
  }, [isLive, sessionLoading, load]);

  const loadState: 'loading' | 'loaded' | 'error' =
    failed ? 'error' : history === null ? 'loading' : 'loaded';

  if (sessionLoading) {
    return <SkeletonRows rows={4} rowHeight={44} />;
  }

  if (!isLive) {
    return (
      <StateBlock
        title="Sessione non disponibile"
        body="Ricarica la pagina o effettua nuovamente il login per vedere lo stato dei tuoi dati."
      />
    );
  }

  const entries = history ?? [];
  const attention = entries.filter(needsAttention);
  const totals = entries.reduce(
    (acc, e) => {
      acc.rows += e.rowCount ?? 0;
      acc.rejected += e.rejectedCount ?? 0;
      const c = e.eligibilityCounts;
      if (c) {
        acc.blocked += c.blocked ?? 0;
        acc.review += c.reviewRequired ?? 0;
      }
      return acc;
    },
    { rows: 0, rejected: 0, blocked: 0, review: 0 },
  );

  const entryCard = (e: HistoryEntry) => {
    const tone = STATUS_TONE[e.status] ?? 'idle';
    const counts = e.eligibilityCounts;
    const countRows = counts
      ? (Object.keys(ELIGIBILITY_LABEL) as Array<keyof EligibilityCounts>)
          .filter((k) => typeof counts[k] === 'number')
          .map((k) => ({ key: k, value: counts[k] as number }))
      : [];

    return (
      <div
        key={e.batchId}
        style={{
          display: 'grid', gap: 11, padding: '14px 16px', minWidth: 0,
          borderRadius: PX.rInner, border: `1px solid ${PX.line}`, background: PX.l1,
          fontFamily: PX.sans,
        }}
      >
        {/* 1 — Cos'è successo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: PX.ink, minWidth: 0, overflowWrap: 'anywhere' }}>
            {e.sourceName ?? 'Invio dati'}
          </span>
          {e.period && <Chip>{e.period}</Chip>}
          <span style={{ marginLeft: 'auto' }}>
            <Status tone={tone}>{e.statusLabel}</Status>
          </span>
        </div>

        {/* 2 — Cosa significa */}
        <p style={{ margin: 0, maxWidth: '76ch', fontSize: 12.5, lineHeight: 1.6, color: PX.ink2 }}>
          {STATUS_MEANING[e.status] ?? 'Lo stato di questo invio è registrato da KORA Operator.'}
        </p>

        {/* Esiti aggregati, spiegati */}
        {countRows.length > 0 && (
          <div style={{ display: 'grid', gap: 5 }}>
            {countRows.map(({ key, value }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: PX.ink, fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>
                  {value}
                </span>
                <span style={{ fontWeight: 650, color: PX.ink2 }}>{ELIGIBILITY_LABEL[key]}</span>
                <span style={{ color: PX.ink3 }}>— {ELIGIBILITY_MEANING[key]}</span>
              </div>
            ))}
          </div>
        )}

        {(e.rowCount !== null || e.rejectedCount) ? (
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: PX.ink3 }}>
            {e.rowCount !== null
              ? `${e.rowCount} ${e.rowCount === 1 ? 'riga ricevuta' : 'righe ricevute'}`
              : 'Righe ricevute non disponibili'}
            {e.rejectedCount ? ` · ${e.rejectedCount} ${e.rejectedCount === 1 ? 'non accettata' : 'non accettate'}` : ''}
            {e.fileCount ? ` · ${e.fileCount} ${e.fileCount === 1 ? 'file' : 'file'}` : ''}
          </p>
        ) : null}

        {/* Spiegazione dell'operatore — solo se l'endpoint la marca visibile alla Company */}
        {e.adminComment && (
          <Notice tone="info">
            <strong>Nota di KORA Operator:</strong> {e.adminComment}
          </Notice>
        )}

        {/* 3/4 — Cosa fare e cosa sta facendo KORA */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', paddingTop: 2, borderTop: `1px solid ${PX.line}` }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3, paddingTop: 9 }}>
            Prossimo passo
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 650, color: PX.ink2, minWidth: 0, overflowWrap: 'anywhere', paddingTop: 9 }}>
            {STATUS_NEXT_STEP[e.status] ?? 'Nessuna azione richiesta: KORA Operator sta revisionando.'}
          </span>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
          Inviato il {formatStamp(e.submittedAt ?? e.createdAt)}
          {e.processedAt ? ` · revisionato il ${formatStamp(e.processedAt)}` : ''} · rif. {e.batchId.slice(0, 8)}
        </p>
      </div>
    );
  };

  return (
    <>
      <PageHead
        eyebrow="Stato dati & evidenze"
        title={liveCompanyName ?? 'La tua organizzazione'}
        lead="Che fine hanno fatto i dati che hai inviato a KORA: cosa è stato ricevuto, cosa è entrato nel calcolo, cosa richiede una tua risposta. Nessun dato individuale — solo conteggi aggregati."
        meta={
          loadState === 'loaded' ? (
            <>
              <Chip>{entries.length === 1 ? '1 invio' : `${entries.length} invii`}</Chip>
              <Status tone={attention.length > 0 ? 'warn' : 'ok'}>
                {attention.length > 0
                  ? (attention.length === 1 ? '1 invio da attenzionare' : `${attention.length} invii da attenzionare`)
                  : 'Nessun invio da attenzionare'}
              </Status>
            </>
          ) : undefined
        }
      />

      <Workspace>
        <Col span="main">
          <Region label="Invii e relativo esito">
            {loadState === 'loading' ? (
              <SkeletonRows rows={3} rowHeight={72} />
            ) : loadState === 'error' ? (
              <StateBlock
                title="Stato dei dati non disponibile"
                body="Non è stato possibile leggere la cronologia degli invii. Ricarica la pagina; se il problema persiste contatta KORA."
              />
            ) : entries.length === 0 ? (
              <StateBlock
                tone="pending"
                title="Nessun dato ancora inviato a KORA"
                body="Quando la tua organizzazione invia il primo Data Pack, qui compare ogni invio con il suo esito, cosa significa e l’eventuale azione richiesta. L’elaborazione resta gestita da KORA Operator."
              />
            ) : (
              <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                {entries.map(entryCard)}
              </div>
            )}
          </Region>

          {loadState === 'loaded' && entries.length === 0 && (
            <Region label="Come arrivano i dati a KORA">
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12, minWidth: 0 }}>
                {PROCESS_STEPS.map((step, i) => (
                  <li key={step.title} style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        flex: 'none', width: 24, height: 24, borderRadius: PX.rPill,
                        display: 'grid', placeItems: 'center',
                        background: PX.inkWash, border: `1px solid ${PX.line}`,
                        fontSize: 11.5, fontWeight: 750, color: PX.ink2,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: PX.ink }}>{step.title}</span>
                      <span style={{ fontSize: 12.5, lineHeight: 1.6, color: PX.ink2, maxWidth: '72ch' }}>
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Region>
          )}

          {loadState === 'loaded' && entries.length === 0 && (
            <Region label="Cosa vedrai qui" tone="inset">
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 7, minWidth: 0 }}>
                {WHAT_APPEARS_HERE.map((item) => (
                  <li key={item} style={{ display: 'flex', gap: 9, minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{ flex: 'none', width: 5, height: 5, borderRadius: PX.rPill, background: PX.inkMute, marginTop: 7 }}
                    />
                    <span style={{ fontSize: 12.5, lineHeight: 1.55, color: PX.ink2, overflowWrap: 'anywhere' }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Region>
          )}
        </Col>

        <Col span="rail">
          <Region label="Riepilogo">
            {loadState === 'loaded' && entries.length > 0 ? (
              <MetricStrip>
                <Metric label="Invii" value={entries.length} hint="registrati per la tua organizzazione" />
                <Metric label="Righe ricevute" value={totals.rows} hint="conteggio aggregato su tutti gli invii" />
                <Metric
                  label="Da attenzionare"
                  value={attention.length}
                  tone={attention.length === 0 ? 'mute' : 'ink'}
                  hint={attention.length === 0 ? 'nessuna azione richiesta' : 'richiedono una verifica'}
                />
              </MetricStrip>
            ) : loadState === 'loaded' ? (
              <StateBlock title="Ancora nessun invio" body="Il riepilogo compare dopo il primo invio." />
            ) : (
              <SkeletonRows rows={3} rowHeight={54} />
            )}
          </Region>

          <Region label="Elaborazione gestita da KORA Operator" tone="inset">
            <Notice tone="info">
              KORA Admin elabora i tuoi file prima che entrino nel calcolo del KORA Index. Lo stato di ogni
              invio viene aggiornato qui e nel tuo KORA Workspace quando KORA Admin completa la revisione.
              Questa pagina mostra solo conteggi aggregati: nessun dato individuale, nessuna riga del file.
            </Notice>
          </Region>

          <Region label="Percorsi collegati">
            <div style={{ display: 'grid', gap: 9 }}>
              {[
                { href: '/company/workspace', label: '← Torna al Workspace', hint: 'riepilogo del periodo corrente' },
                { href: '/company/status', label: 'Status Center', hint: 'stato pipeline e prossimi passi' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    display: 'grid', gap: 2, padding: '9px 11px', minWidth: 0,
                    borderRadius: PX.rInner, border: `1px solid ${PX.line}`, background: PX.l1,
                    textDecoration: 'none', fontFamily: PX.sans,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: PX.violet700 }}>{l.label}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: PX.ink3 }}>{l.hint}</span>
                </Link>
              ))}
            </div>
          </Region>
        </Col>
      </Workspace>
    </>
  );
}
