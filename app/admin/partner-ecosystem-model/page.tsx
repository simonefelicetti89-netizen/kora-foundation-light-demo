// app/admin/partner-ecosystem-model/page.tsx
// Partner Ecosystem Model — alignment map (PARTNER-ECOSYSTEM-MODEL-01).
//
// Read-only product/model reference for KORA_ADMIN and reviewers. Explains
// the distinction between the existing, mature KORA Space / Contribution
// Initiative system (commons.post) and the future Partner Activity Catalog
// / KORA Index Activities concept (not yet built). Resolves no DPO/CTO/
// fiscal/legal decision, builds no catalog, persists no booking.
//
// No DB. No Supabase. No RPC. No feature flag touched.
// Protected by app/admin/layout.tsx (requireKoraAdmin — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

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

function LaneCard({
  title, subtitle, badge, badgeTone, rows,
}: {
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: 'mature' | 'future';
  rows: { label: string; value: string }[];
}) {
  const color = badgeTone === 'mature' ? TOKENS.safeguard.pass : TOKENS.safeguard.watch;
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TOKENS.ink }}>{title}</p>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: color.bg, color: color.text, whiteSpace: 'nowrap' }}>
          {badge}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{subtitle}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', gap: 8, fontSize: 11.5 }}>
            <span style={{ color: TOKENS.inkHint, minWidth: 110 }}>{r.label}</span>
            <span style={{ color: TOKENS.inkSecondary }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
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

const NAMING_COLLISIONS = [
  { surface: 'commons.post / CommonsInitiative', meaning: 'Iniziativa KORA Space reale, DB-backed, alimenta Contribution', status: 'Maturo' },
  { surface: '/partner/kora-link/initiatives', meaning: 'Iniziative verificate Track A (scan fisico KORA Link)', status: 'Mock, no-DB, KORA Link-specifico' },
  { surface: '/partner/initiatives', meaning: 'Pipeline di proposta/sponsorship/adozione del partner', status: 'Mock, no-DB — da leggere come "Proposte Partner"' },
  { surface: 'Partner Activity Catalog (futuro)', meaning: 'Attività/servizio standard del partner', status: 'Non esiste — solo concetto' },
];

export default function PartnerEcosystemModelPage() {
  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Admin · Partner Ecosystem Model
        </p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Modello ecosistema Partner — mappa di allineamento
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
          Mappa di riferimento in sola lettura per distinguere il sistema KORA Space / Contribution
          Initiatives (esistente, maturo) dal futuro Partner Activity Catalog / KORA Index Activities
          (non ancora costruito). Non costruisce alcun catalogo, non persiste alcun booking, non decide
          alcuna questione DPO/CTO/fiscale/legale.
        </p>
      </div>

      {/* Non-suppressible scope banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Mappa di modello in sola lettura.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa pagina non implica readiness di produzione, non chiama database o RPC, e non prende
          alcuna decisione CTO, DPO, fiscale o legale. Descrive lo stato — non lo cambia.
        </p>
      </div>

      {/* 1. Two-lane model */}
      <Panel>
        <SectionLabel>Modello a due corsie</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          <LaneCard
            title="Corsia A — KORA Space / Contribution Initiatives"
            subtitle="Oggetto ecosistema/community/contribution. Alimenta KORA Contribution — mai il KORA Index."
            badge="Esistente, maturo"
            badgeTone="mature"
            rows={[
              { label: 'Entità', value: 'commons.post (CommonsPost)' },
              { label: 'Partecipazione', value: 'commons.booking' },
              { label: 'Output', value: 'commons.contribution_event → KORA Contribution' },
              { label: 'Autore oggi', value: 'KORA_ADMIN / COMPANY_ADMIN' },
            ]}
          />
          <LaneCard
            title="Corsia B — Partner Activity Catalog / KORA Index Activities"
            subtitle="Oggetto catalogo/servizio/welfare/opportunità. Alimenta segnali aggregati KORA Index — mai KORA Contribution."
            badge="Futuro — non implementato"
            badgeTone="future"
            rows={[
              { label: 'Entità', value: 'partner_activity (nome di lavoro, non esiste)' },
              { label: 'Classificazione', value: 'fiscale/welfare + pilastro KORA' },
              { label: 'Azione worker', value: 'booking / candidatura / contatto / uso voucher' },
              { label: 'Output', value: 'segnali aggregati KORA Index' },
            ]}
          />
        </div>
      </Panel>

      {/* 2. Current state */}
      <Panel>
        <SectionLabel>Stato attuale</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Esiste e funziona:</strong> commons.post, commons.booking, commons.contribution_event,
            le dashboard Contribution (<code>/company/contribution</code>), la vista worker (<code>/worker/commons</code>) —
            tutto DB-backed, con copertura test estesa (b165/b166/b167 e adiacenti).
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Esiste solo come mock/no-DB:</strong> <code>/partner/initiatives</code>,{' '}
            <code>/partner/relationships</code>, <code>/partner/aggregate-signals</code>, <code>/partner/privacy-boundary</code>
            (PARTNER-SURFACE-01) — dati statici, nessuna connessione al sistema commons.post reale.
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Esiste solo come directory, non come catalogo:</strong> network.partner_profile —
            un pilastro, una categoria, per organizzazione partner. Nessun booking, nessun marketplace.
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Non esiste ancora:</strong> alcuna entità Partner Activity, alcuna selezione
            aziendale per categoria fiscale/pilastro/partner/scelta libera, alcun booking worker di attività partner,
            alcun percorso live verso segnali aggregati KORA Index da attività partner.
          </li>
        </ul>
      </Panel>

      {/* 3. Flow map */}
      <Panel>
        <SectionLabel>Mappa di flusso — Corsia A (proposta → KORA Space → Contribution)</SectionLabel>
        <FlowMap
          steps={[
            { step: 'Proposta Partner', note: 'Il partner propone un\'iniziativa — non scrive mai direttamente in commons.post.' },
            { step: 'Revisione KORA/Admin', note: 'KORA Admin (o l\'azienda che adotta) revisiona la proposta.' },
            { step: 'Adozione Company/KORA', note: 'L\'iniziativa viene adottata e preparata per la pubblicazione.' },
            { step: 'Pubblicazione KORA Space', note: 'Diventa un commons.post reale, visibile secondo l\'opening_grade.' },
            { step: 'Partecipazione worker', note: 'Il worker prenota volontariamente (commons.booking).' },
            { step: 'Aggregato Contribution', note: 'Alla presenza confermata, genera un commons.contribution_event aggregato.' },
          ]}
        />
      </Panel>

      <Panel>
        <SectionLabel>Mappa di flusso — Corsia B (attività partner → KORA Index, futura)</SectionLabel>
        <FlowMap
          steps={[
            { step: 'Attività Partner', note: 'Il partner cataloga un\'attività/servizio standard (non esiste ancora).' },
            { step: 'Classificazione fiscale/pilastro', note: 'Categoria fiscale/welfare + mappatura su uno o più pilastri KORA.' },
            { step: 'Abilitazione azienda', note: 'L\'azienda seleziona per categoria, pilastro, partner, o scelta libera worker.' },
            { step: 'Booking/richiesta worker', note: 'Il worker prenota, si candida, o richiede contatto — azione volontaria.' },
            { step: 'Relazione nominativa partner', note: 'Il partner vede il nominativo solo dopo l\'azione del worker (già implementato in /partner/relationships).' },
            { step: 'Segnale aggregato KORA Index', note: 'L\'attivazione alimenta segnali aggregati KORA Index — mai KORA Contribution.' },
          ]}
        />
      </Panel>

      {/* 4. Naming guard */}
      <Panel>
        <SectionLabel>Guardia di naming — tre significati di &quot;iniziativa&quot;</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {NAMING_COLLISIONS.map((c) => (
            <div key={c.surface} style={{ padding: '12px 14px', borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, background: '#fff' }}>
              <p style={{ margin: '0 0 4px', fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>
                <code>{c.surface}</code>
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{c.meaning}</p>
              <p style={{ margin: 0, fontSize: 11, color: TOKENS.inkHint }}>{c.status}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 11.5, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Il futuro Partner Activity Catalog deve sempre usare &quot;Activity&quot;/&quot;Attività&quot;, mai
          &quot;Initiative&quot;/&quot;Iniziativa&quot;, per restare distinguibile a colpo d&apos;occhio da commons.post.
        </p>
      </Panel>

      {/* 5. Privacy boundary */}
      <Panel>
        <SectionLabel>Confine privacy</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>L&apos;azienda vede solo aggregati — invariato tra le due corsie.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il partner vede nominativi solo dopo un&apos;azione volontaria del worker (booking, candidatura, contatto, condivisione profilo).</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il worker controlla la propria relazione personale — la scelta è sempre sua.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessuna decisione DPO, CTO, fiscale o legale è presa da questa pagina.</li>
        </ul>
      </Panel>

      {/* 6. Next implementation options */}
      <Panel>
        <SectionLabel>Prossime opzioni di implementazione</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Partner Activity Catalog — entità e classificazione base.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Company Activity Selection — scelta per categoria/pilastro/partner/libera.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Worker Activity Booking — prenotazione/candidatura lato worker.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Percorso Proposta Partner → pubblicazione KORA Space.</li>
        </ul>
      </Panel>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/admin/governance" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Governance &amp; Privacy →
        </Link>
        <Link href="/partner/initiatives" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Proposte Partner (mock) →
        </Link>
        <Link href="/company/contribution" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Contribution (live) →
        </Link>
      </div>

    </div>
  );
}
