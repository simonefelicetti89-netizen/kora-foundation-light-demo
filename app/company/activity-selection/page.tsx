// app/company/activity-selection/page.tsx
// Company — Activity Selection shell (COMPANY-ACTIVITY-SELECTION-01).
//
// First operational step of Phase 2 Activation Intelligence (see
// docs/KORA_ACTIVATION_LAYER_01.md). Distinct from Phase 1 raw-data upload
// and analysis (KORA Index, Decision Pack, Activation Debt) and distinct
// from KORA Space / Contribution Initiatives (commons.post pipeline).
//
// Previews how a company would define an activation perimeter for standard
// Partner Activities before workers can discover, choose, book, request, or
// redeem them. Pure UI/UX preview: reuses the static Partner Activity
// catalog (lib/partner-activities/catalog.ts), no DB, no Supabase, no RPC,
// no real budget enforcement, no real eligibility logic, no worker booking.
// Protected by app/company/layout.tsx (requireCompanyUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS, PILLAR_COLORS, type PillarColorKey } from '@/lib/design/kora-design-tokens';
import {
  getPartnerActivities,
  getPartnerActivityCatalogSummary,
  FISCAL_CATEGORY_LABELS,
  FUTURE_WORKER_ACTION_LABELS,
  ACCESS_MODE_LABELS,
  INDEX_SIGNAL_ELIGIBILITY_LABELS,
  type FiscalCategory,
} from '@/lib/partner-activities/catalog';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: 20 }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 10px' }}>
      {children}
    </p>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: TOKENS.ink }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{note}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
        background: 'rgba(6,3,43,0.05)', color: TOKENS.inkSecondary, border: `1px solid ${TOKENS.inkBorder}`,
      }}
    >
      {children}
    </span>
  );
}

function PillarTag({ pillar }: { pillar: PillarColorKey }) {
  const color = PILLAR_COLORS[pillar];
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
        background: `${color}1A`, color, border: `1px solid ${color}45`,
      }}
    >
      {pillar}
    </span>
  );
}

interface FlowStep {
  step: string;
  note?: string;
}

function FlowMap({ steps }: { steps: FlowStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 10.5, color: TOKENS.inkHint, width: 16, flexShrink: 0 }}>{i + 1}</span>
          <div>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>{s.step}</p>
            {s.note && <p style={{ margin: '2px 0 0', fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{s.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SelectionModeCard({
  letter, title, description, example,
}: {
  letter: string;
  title: string;
  description: string;
  example: React.ReactNode;
}) {
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>
        <span style={{ color: TOKENS.accent }}>{letter}.</span> {title}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{description}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{example}</div>
    </div>
  );
}

const ALL_PILLARS: PillarColorKey[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];

export default function CompanyActivitySelectionPage() {
  const activities = getPartnerActivities();
  const summary = getPartnerActivityCatalogSummary();
  const fiscalCategories = Object.keys(FISCAL_CATEGORY_LABELS) as FiscalCategory[];
  const partnerNames = Array.from(new Set(activities.map((a) => a.partnerName)));

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 1. Intro panel */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Company · Fase 2 Activation Intelligence
        </p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Selezione Attività Partner
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 740 }}>
          Questa è la Fase 2 (Activation Intelligence) — distinta dalla Fase 1 (caricamento e analisi dati
          grezzi, KORA Index attuale) e distinta dalle iniziative KORA Space/Contribution. Qui l&apos;azienda
          definirebbe il perimetro di attivazione per le Attività Partner standard — servizi e opportunità
          offerti dai partner accreditati, non iniziative. L&apos;output futuro sono segnali aggregati per il
          KORA Index. L&apos;azienda non vede mai le scelte individuali dei singoli worker.
        </p>
      </div>

      {/* Preview banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Nessuna selezione qui è persistita. Nessun budget è realmente applicato. Nessuna eleggibilità worker
          è realmente calcolata. Nessuna prenotazione worker esiste in questa build.
        </p>
      </div>

      {/* 2. Phase 2 flow */}
      <Panel>
        <SectionLabel>Flusso Fase 2</SectionLabel>
        <FlowMap
          steps={[
            { step: 'Catalogo Attività Partner', note: 'Esiste come shell no-DB — /partner/activity-catalog.' },
            { step: 'Selezione Attività Azienda', note: 'Questa pagina — shell no-DB, anteprima design.' },
            { step: 'Discovery/scelta worker', note: 'Non ancora implementata.' },
            { step: 'Erogazione partner', note: 'Non ancora implementata.' },
            { step: 'Segnali di attivazione aggregati', note: 'Non ancora implementata.' },
            { step: 'KORA Index', note: 'Integrazione futura, solo dopo revisione CTO.' },
          ]}
        />
        <p style={{ margin: '12px 0 0', fontSize: 11.5, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Solo i primi due passaggi esistono oggi, entrambi come shell/anteprima — nessuno degli altri è implementato.
        </p>
      </Panel>

      {/* 3. Five selection modes */}
      <Panel>
        <SectionLabel>Cinque modalità di abilitazione</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <SelectionModeCard
            letter="A"
            title="Per categoria fiscale/welfare"
            description="L'azienda abilita intere categorie fiscali — tutte le attività di quella categoria diventano visibili."
            example={fiscalCategories.slice(0, 6).map((c) => <Tag key={c}>{FISCAL_CATEGORY_LABELS[c]}</Tag>)}
          />
          <SelectionModeCard
            letter="B"
            title="Per pilastro KORA"
            description="L'azienda abilita attività in base al pilastro che generano — indipendentemente dalla categoria fiscale."
            example={ALL_PILLARS.map((p) => <PillarTag key={p} pillar={p} />)}
          />
          <SelectionModeCard
            letter="C"
            title="Per partner"
            description="L'azienda abilita uno o più partner accreditati specifici, indipendentemente dal tipo di attività offerta."
            example={partnerNames.slice(0, 4).map((p) => <Tag key={p}>{p}</Tag>)}
          />
          <SelectionModeCard
            letter="D"
            title="Per attività specifica"
            description="L'azienda seleziona singole attività dal catalogo, una per una, senza abilitare l'intera categoria o partner."
            example={[
              <Link key="link" href="/partner/activity-catalog" style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
                Sfoglia il Catalogo Attività →
              </Link>,
            ]}
          />
          <SelectionModeCard
            letter="E"
            title="Scelta libera worker entro budget"
            description="L'azienda definisce un budget/perimetro aggregato e lascia al worker la scelta libera tra le attività eleggibili — nessuna selezione azienda per singola attività."
            example={[<Tag key="budget">Budget indicativo per worker</Tag>, <Tag key="perimeter">Perimetro categorie/pilastri</Tag>]}
          />
        </div>
      </Panel>

      {/* 4. Activity preview — reused static catalog */}
      <Panel>
        <SectionLabel>Anteprima catalogo (dati mock, riutilizzati)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
          <MetricCard label="Attività totali" value={String(summary.totalActivities)} note="Numero totale nel catalogo condiviso." />
          <MetricCard label="Categorie fiscali" value={String(Object.keys(summary.byFiscalCategory).length)} note="Categorie fiscali distinte rappresentate." />
          <MetricCard label="Pilastri coperti" value={String(Object.keys(summary.byPillar).length)} note="Pilastri KORA coperti (primario o secondario)." />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase' }}>Attività</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase' }}>Partner</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase' }}>Categoria fiscale</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase' }}>Pilastro</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase' }}>Accesso</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase' }}>Azione worker</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase' }}>Segnale Index</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.activityId} style={{ borderTop: `1px solid ${TOKENS.inkBorder}` }}>
                  <td style={{ padding: '8px 10px', color: TOKENS.ink, fontWeight: 600 }}>{a.title}</td>
                  <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{a.partnerName}</td>
                  <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{FISCAL_CATEGORY_LABELS[a.fiscalCategory]}</td>
                  <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{a.primaryPillar}</td>
                  <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{ACCESS_MODE_LABELS[a.accessMode]}</td>
                  <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{FUTURE_WORKER_ACTION_LABELS[a.futureWorkerAction]}</td>
                  <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{INDEX_SIGNAL_ELIGIBILITY_LABELS[a.indexSignalEligibility]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Nessun nominativo worker, nessuna prenotazione individuale, nessun record di attivazione individuale
          appare in questa tabella — solo metadato di catalogo.
        </p>
      </Panel>

      {/* 5. Budget/perimeter preview */}
      <Panel>
        <SectionLabel>Anteprima budget/perimetro (esempio statico)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          <MetricCard label="Budget annuo indicativo" value="€ 45.000" note="Cifra illustrativa — nessuna applicazione reale." />
          <MetricCard label="Categorie fiscali abilitate" value="3 di 13" note="Welfare aziendale, Salute e prevenzione, Formazione (esempio)." />
          <MetricCard label="Pilastri abilitati" value="3 di 5" note="LIFE, GROWTH, CONNECTION (esempio)." />
          <MetricCard label="Partner abilitati" value={`2 di ${partnerNames.length}`} note="Esempio, non una selezione reale." />
          <MetricCard label="Attività abilitate" value={`4 di ${activities.length}`} note="Esempio, non una selezione reale." />
          <MetricCard label="Modalità scelta worker" value="Libera entro perimetro" note="Esempio — nessuna delle cinque modalità è realmente attiva." />
          <MetricCard label="Stato revisione" value="Bozza" note="Nessun piano è realmente salvato in questa build." />
          <MetricCard label="Revisione payroll/fiscale" value="Richiesta" note="Nessuna approvazione fiscale o legale è implicata." />
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Nessuna enforcement di budget è implementata. Questo è un esempio illustrativo di come un piano futuro
          potrebbe apparire, non un piano reale.
        </p>
      </Panel>

      {/* 6. Aggregate reporting preview */}
      <Panel>
        <SectionLabel>Anteprima reportistica aggregata (futura)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          <MetricCard label="Adesione per categoria fiscale" value="Anteprima" note="Distribuzione aggregata dell'utilizzo per categoria — nessun dato reale oggi." />
          <MetricCard label="Adesione per pilastro" value="Anteprima" note="Distribuzione aggregata dell'utilizzo per pilastro — nessun dato reale oggi." />
          <MetricCard label="Partecipazione/completamento" value="Anteprima" note="Percentuale aggregata di partecipazione e completamento — nessun dato reale oggi." />
          <MetricCard label="Fasce di valore" value="Anteprima" note="Distribuzione per fascia di valore stimato — mai per singolo worker." />
          <MetricCard label="Segnale KORA Index" value="Anteprima" note="Nessun segnale reale è generato da questa pagina." />
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Ogni eventuale distribuzione per gruppo di popolazione eleggibile sarà mostrata solo in forma
          aggregata (soglia N≥10) — mai per singolo worker. Nessun nome, email, ID worker, tag UID,
          prenotazione individuale, scansione individuale, o relazione partner individuale appare qui.
        </p>
      </Panel>

      {/* 7. Privacy/output note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Confine privacy</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>L&apos;azienda riceve sempre e solo output aggregati.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il partner vede nominativi solo dopo prenotazione, candidatura, richiesta di contatto o condivisione di profilo avviate volontariamente dal worker.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>La scelta del worker è sempre volontaria.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessuna attività individuale del worker torna mai al datore di lavoro.</li>
        </ul>
      </div>

      {/* 8. KORA Index note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nota KORA Index</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          L&apos;attivazione di queste attività potrà in futuro diventare un segnale aggregato per il KORA Index —
          distinto dai segnali Fase 1 derivati dai dati caricati. Questo sprint non modifica il calcolo live
          del KORA Index.
        </p>
      </div>

      {/* 9. Contribution note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nota Contribution</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Le Attività Partner non alimentano mai direttamente KORA Contribution. Le iniziative KORA Space/
          Contribution restano separate. Un&apos;attività può essere impacchettata in un&apos;iniziativa solo
          tramite un percorso separato di proposta, revisione e adozione.
        </p>
      </div>

      {/* 10. Fiscal/legal note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nota fiscale/legale</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          La categoria fiscale/welfare è metadato proposto. La validazione definitiva resta in capo a
          payroll, consulenti fiscali e legali dell&apos;azienda. Questo sprint non fornisce alcuna
          approvazione fiscale o legale.
        </p>
      </div>

      {/* Cross-links */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/company/activity-selection/plan" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Esempio di piano →
        </Link>
        <Link href="/admin/kora-activation-layer" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Activation Layer — Fase 1 vs Fase 2 →
        </Link>
        <Link href="/partner/activity-catalog" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Catalogo Attività Partner →
        </Link>
        <Link href="/company/kora-index" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Index™ (Fase 1, live) →
        </Link>
        <Link href="/company/activation" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Activation Intelligence™ (Fase 1) →
        </Link>
        <Link href="/company/contribution" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Contribution™ (per contrasto, pipeline separata) →
        </Link>
      </div>

    </div>
  );
}
