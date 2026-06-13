// FV-01: Future Vision — Architectural Roadmap
// Static mockup. No backend logic. Not active in Foundation Light.

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { TM } from '@/components/ui/TM';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface ClusterModule {
  name: string;
  desc: string;
  href?: string;
}

interface Cluster {
  phase: string;
  id: string;
  title: string;
  status: 'active' | 'upcoming' | 'roadmap' | 'vision';
  statusLabel: string;
  statusStyle: string;
  phaseStyle: string;
  titleStyle: string;
  purposeColor: string;
  purpose: string;
  modules: ClusterModule[];
}

const CLUSTERS: Cluster[] = [
  {
    phase: '01',
    id: 'foundation-light',
    title: 'Foundation Light',
    status: 'active',
    statusLabel: 'Attivo nel prototipo Foundation Light',
    statusStyle: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
    phaseStyle: 'border-[rgba(47,125,85,0.22)] bg-[#F8F6F1]',
    titleStyle: 'text-[#06032B]',
    purposeColor: 'text-[rgba(6,3,43,0.62)]',
    purpose: 'Misurare e rendere leggibile ciò che accade dopo la spesa.',
    modules: [
      { name: 'KORA Index',              desc: 'Indice di attivazione organizzativa — 4 macroblocks, 10 componenti.',       href: '/demo/company/kora-index' },
      { name: 'Eligibility Gate',        desc: 'Classificazione Eligible / Limited / Blocked per ogni evento welfare.',      href: '/demo/company/kora-index' },
      { name: 'Activation Debt',         desc: 'Budget welfare non convertito in Impact Units.',                             href: '/demo/company/activation' },
      { name: 'Budget-to-Human-Impact',  desc: 'Connette la spesa al segnale di attivazione verificato.',                   href: '/demo/company/financial'  },
      { name: 'Decision Pack',           desc: 'Report board-ready con KORA Index, pillars e raccomandazioni.',              href: '/demo/company/reports'    },
      { name: 'Data Room',               desc: 'Pipeline di ingestion, UEF review e scoring readiness — non disponibile in area demo.' },
    ],
  },
  {
    phase: '02',
    id: 'pilot-calibration',
    title: 'Pilot Calibration',
    status: 'upcoming',
    statusLabel: 'Prossima fase — richiede primi pilot aziendali',
    statusStyle: 'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
    phaseStyle: 'border-[rgba(30,74,138,0.15)] bg-[rgba(30,74,138,0.04)]',
    titleStyle: 'text-[#1B2A4A]',
    purposeColor: 'text-[#1E4A8A]',
    purpose: 'Trasformare il prototipo in metodologia validata su dati reali guidati.',
    modules: [
      { name: 'Real Dataset Intake',       desc: 'Onboarding di dati aziendali reali con privacy architecture e consent.' },
      { name: 'Advisor Review Workflow',   desc: 'Validazione delle evidenze da parte di advisor certificati KORA.' },
      { name: 'Methodology Calibration',   desc: 'Studio Delphi e calibrazione empirica dei pesi macroblock.' },
      { name: 'Confidence Score Maturation', desc: 'CS migliora con qualità dei dati, verifica e completezza progressiva.' },
      { name: 'Benchmark Normalization',   desc: 'Normalizzazione cross-settore dei valori di attivazione organizzativa.' },
      { name: 'Evidence Quality Layer',    desc: 'Verifica strutturata dell\'evidenza per ogni UEF record su dati reali.' },
    ],
  },
  {
    phase: '03',
    id: 'ecosystem-layer',
    title: 'Ecosystem Layer',
    status: 'roadmap',
    statusLabel: 'Roadmap ecosistemica — non attivo in Foundation Light',
    statusStyle: 'bg-[rgba(107,122,146,0.10)] text-[#344256] border-[rgba(107,122,146,0.22)]',
    phaseStyle: 'border-[rgba(107,122,146,0.20)] bg-[rgba(107,122,146,0.06)]',
    titleStyle: 'text-[#1D2B3A]',
    purposeColor: 'text-[#344256]',
    purpose: 'Connettere aziende, partner, advisor, territori e value chain.',
    modules: [
      { name: 'Partner Network',              desc: 'Rete verificata di partner welfare, LMS, ESG e territoriali.' },
      { name: 'Advisor Portal & Academy',     desc: 'Portale advisor KORA con percorso di certificazione metodologica.' },
      { name: 'KORA Value Chain',             desc: 'Attivazione ecosistemica attraverso reti di fornitura e filiera.' },
      { name: 'Territorial Activation Maps',  desc: 'Intelligence di impatto a livello distrettuale e provinciale.' },
      { name: 'Cross-Company Initiatives',    desc: 'Programmi multi-azienda con verifica aggregata cross-tenant.' },
      { name: 'KORA Certified',               desc: 'Status di intelligence organizzativa certificata — richiede calibrazione + advisor.' },
    ],
  },
  {
    phase: '04',
    id: 'worker-owned',
    title: 'Worker-Owned Layer',
    status: 'vision',
    statusLabel: 'Vision layer — richiede privacy architecture e consenso esplicito',
    statusStyle: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
    phaseStyle: 'border-[rgba(217,154,43,0.20)] bg-[rgba(217,154,43,0.08)]',
    titleStyle: 'text-[#5C3A00]',
    purposeColor: 'text-[#8A5A00]',
    purpose: 'Rendere il dato di impatto portabile, privato e posseduto dal lavoratore — esclusivamente su iniziative company-enabled.',
    modules: [
      { name: 'Worker PIB',                   desc: 'Personal Impact Balance — aggregato per pillar, privato e worker-owned. Solo iniziative company-enabled, mai attività privata.' },
      { name: 'Dynamic Impact CV',            desc: 'CV verificato di impatto umano, portabile e controllato dal lavoratore. Riflette l\'attivazione su iniziative aziendali, non la vita privata.' },
      { name: 'Consent Vault',                desc: 'Gestione del consenso granulare per ogni dimensione del dato di impatto. Il lavoratore sceglie cosa condividere con chi.' },
      { name: 'Portable Verified Credentials', desc: 'Credenziali verificate esportabili verso mercato del lavoro e network — basate su evidenza company-enabled.' },
      { name: 'KORA Link (NFC/QR)',            desc: 'Attivazione fisico-digitale — punti di contatto per worker confirmation su iniziative company-enabled.' },
      { name: 'KORA Impact Pledge',            desc: 'Impegni collettivi di livello governance con evidenza verificata su iniziative aziendali.' },
    ],
  },
];

const DEPENDENCIES = [
  { output: 'KORA Certified',            requires: 'Metodologia calibrata + advisor review workflow' },
  { output: 'Worker-Owned Layer',        requires: 'Privacy architecture + consent vault + worker identity' },
  { output: 'KORA Link (NFC/QR)',        requires: 'Worker-owned identity + event verification layer' },
  { output: 'KORA Value Chain',          requires: 'Partner/advisor network + standard di evidenza condivisi' },
  { output: 'Territorial Activation Maps', requires: 'Contribution events verificati + cross-company initiative layer' },
];

const PHASE_TIMELINE = [
  { phase: '01', label: 'Foundation Light', active: true  },
  { phase: '02', label: 'Pilot Calibration', active: false },
  { phase: '03', label: 'Ecosystem Layer',   active: false },
  { phase: '04', label: 'Worker-Owned',      active: false },
];

const MODULE_CARD_STYLES: Record<Cluster['status'], string> = {
  active:   'bg-[#F8F6F1]',
  upcoming: 'bg-[#F8F6F1] opacity-90',
  roadmap:  'bg-[rgba(107,122,146,0.05)] opacity-80',
  vision:   'bg-[rgba(217,154,43,0.05)] opacity-80',
};

const MODULE_BORDER_STYLES: Record<Cluster['status'], string> = {
  active:   'rgba(6,3,43,0.08)',
  upcoming: 'rgba(30,74,138,0.15)',
  roadmap:  'rgba(107,122,146,0.20)',
  vision:   'rgba(217,154,43,0.22)',
};

const MODULE_NAME_STYLES: Record<Cluster['status'], string> = {
  active:   '',
  upcoming: 'text-[#1E4A8A]',
  roadmap:  'text-[#344256]',
  vision:   'text-[#8A5A00]',
};

const MODULE_DESC_STYLES: Record<Cluster['status'], string> = {
  active:   '',
  upcoming: 'text-[#1B2A4A]/70',
  roadmap:  'text-[#344256]/70',
  vision:   'text-[#7A4A1A]/80',
};

export default function FutureVision() {
  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── Hero ── */}
      <div>
        <PageMasthead
          eyebrow="KORA · Roadmap architetturale"
          title="Future Vision"
          subline="Dalla misurazione Foundation Light all'infrastruttura KORA completa: dati, attivazione, ecosistema, lavoratori e territori."
        />
        <div className="flex flex-wrap items-center gap-1.5 -mt-4 mb-6">
          <span
            className="rounded-full px-2.5 py-0.5 text-[9.5px] font-semibold"
            style={{ background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` }}
          >
            ROADMAP · Non attivo in Foundation Light
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-[9.5px] font-semibold"
            style={{ background: TOKENS.safeguard.cap.bg, color: TOKENS.safeguard.cap.text, border: `1px solid ${TOKENS.safeguard.cap.dot}40` }}
          >
            Nessun production claim
          </span>
        </div>
        <div
          className="rounded-[16px] px-4 py-3 text-xs leading-relaxed"
          style={{ background: TOKENS.accentSoft, border: `1px solid rgba(199,111,61,0.20)`, color: TOKENS.inkSecondary }}
        >
          <span style={{ fontWeight: 600, color: TOKENS.ink }}>FUTURE VISION · NON ATTIVO — </span>
          Questi moduli sono dipendenze sequenziali future, non funzionalità attuali di <TM>KORA Foundation Light</TM>.
          Nessun modulo in Fase 02–04 è disponibile, contrattualizzabile o promesso.
        </div>
      </div>

      {/* ── Phase Timeline ── */}
      <div
        className="rounded-[18px] p-5"
        style={{ background: TOKENS.surface, border: TOKENS.cardBorder, boxShadow: TOKENS.cardShadow }}
      >
        <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: TOKENS.inkHint, marginBottom: 12 }}>
          Sequenza architetturale
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {PHASE_TIMELINE.map((p, i) => (
            <div key={p.phase} className="flex items-center gap-2">
              <div
                className="rounded-xl px-3 py-2"
                style={p.active
                  ? { background: TOKENS.ink, border: `1px solid ${TOKENS.ink}` }
                  : { background: TOKENS.inkBorder, border: TOKENS.cardBorder }
                }
              >
                <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.10em', display: 'block', color: p.active ? 'rgba(255,255,255,0.50)' : TOKENS.inkHint }}>
                  Fase {p.phase}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: p.active ? '#FFFFFF' : TOKENS.inkSecondary }}>
                  {p.label}
                </span>
              </div>
              {i < PHASE_TIMELINE.length - 1 && (
                <span style={{ color: TOKENS.inkBorderStrong, fontWeight: 700 }}>→</span>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 12 }}>
          Foundation Light è la fase attiva del prototipo. Le fasi successive si sbloccano progressivamente dopo calibrazione empirica e chiusura dei pilot.
        </p>
      </div>

      {/* ── Clusters ── */}
      {CLUSTERS.map((cluster) => (
        <section key={cluster.id}>
          {/* Cluster header */}
          <div className={cn('rounded-t-lg border border-b-0 px-5 py-4', cluster.phaseStyle)}>
            <div className="flex flex-wrap items-start gap-3 justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[rgba(6,3,43,0.40)] font-mono">FASE {cluster.phase}</span>
                  <h2 className={cn('text-base font-bold', cluster.titleStyle)}>{cluster.title}</h2>
                </div>
                <p className={cn('text-xs mt-0.5 leading-relaxed', cluster.purposeColor)}>{cluster.purpose}</p>
              </div>
              <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold shrink-0', cluster.statusStyle)}>
                {cluster.statusLabel}
              </span>
            </div>
          </div>

          {/* Module grid */}
          <div className={cn('rounded-b-lg border px-5 py-4', cluster.phaseStyle)}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {cluster.modules.map((mod) => (
                <div
                  key={mod.name}
                  className={cn('rounded-[14px] p-3 space-y-1', MODULE_CARD_STYLES[cluster.status])}
                  style={{ border: `1px solid ${MODULE_BORDER_STYLES[cluster.status]}` }}
                >
                  <p
                    className={cn('text-xs font-semibold leading-snug', MODULE_NAME_STYLES[cluster.status])}
                    style={!MODULE_NAME_STYLES[cluster.status] ? { color: TOKENS.ink } : {}}
                  >
                    {mod.name}
                  </p>
                  <p
                    className={cn('text-[10px] leading-relaxed', MODULE_DESC_STYLES[cluster.status])}
                    style={!MODULE_DESC_STYLES[cluster.status] ? { color: TOKENS.inkSecondary } : {}}
                  >
                    {mod.desc}
                  </p>
                  {mod.href ? (
                    <Link
                      href={mod.href}
                      className="inline-block text-[10px] font-semibold underline underline-offset-2 mt-0.5"
                      style={{ color: TOKENS.accent }}
                    >
                      Vai →
                    </Link>
                  ) : (
                    <span
                      className="inline-block text-[9px] font-semibold mt-0.5 uppercase tracking-wide"
                      style={{ color: TOKENS.inkHint }}
                    >
                      {cluster.status === 'active' ? 'Non disponibile in demo'
                        : cluster.status === 'upcoming' ? 'Prossima fase'
                        : cluster.status === 'roadmap' ? 'Roadmap'
                        : 'Vision'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── Dependency Logic ── */}
      <section>
        <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: TOKENS.inkHint, marginBottom: 12 }}>
          Logica delle dipendenze
        </p>
        <div
          className="rounded-[18px] overflow-hidden"
          style={{ background: TOKENS.surface, border: TOKENS.cardBorder, boxShadow: TOKENS.cardShadow }}
        >
          {DEPENDENCIES.map((dep, i) => (
            <div
              key={dep.output}
              className="flex items-start gap-3 px-5 py-3.5"
              style={{ borderBottom: i < DEPENDENCIES.length - 1 ? TOKENS.cardBorder : 'none' }}
            >
              <span style={{ marginTop: 2, color: TOKENS.accent, fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>→</span>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink }}>{dep.output}</p>
                <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 2 }}>
                  <span style={{ fontWeight: 500, color: TOKENS.inkHint }}>richiede: </span>
                  {dep.requires}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '10px', color: TOKENS.inkHint, marginTop: 8 }}>
          Nessun modulo futuro è indipendente. L&apos;architettura è sequenziale — ogni fase abilita quella successiva.
        </p>
      </section>

      {/* ── Boundary Box ── */}
      <div
        className="rounded-[16px] px-5 py-4 space-y-2"
        style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink }}>Confini della roadmap</p>
        <ul className="space-y-1.5 pl-3" style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
          <li className="list-disc">I moduli futuri non sono attivi in Foundation Light.</li>
          <li className="list-disc">Nessuna funzionalità futura è un production claim.</li>
          <li className="list-disc">Il dato worker-owned rimane privato — mai esposto a ruoli employer senza consenso esplicito.</li>
          <li className="list-disc"><TM>Worker PIB</TM> misura l&apos;attivazione su iniziative company-enabled — non raccoglie né deduce dati sulla vita privata del lavoratore.</li>
          <li className="list-disc">Lo scoring ecosistemico richiede evidenze verificate e calibrazione empirica.</li>
          <li className="list-disc">Foundation Light è il punto di ingresso attuale — la roadmap si attiva progressivamente.</li>
        </ul>
      </div>

      {/* ── CTA — link live disabilitati per DEMO_VIEWER, solo KORA_ADMIN può accedere al workspace company ── */}
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/demo/guide"
          className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-colors"
          style={{ background: TOKENS.ink }}
        >
          ← Demo Guide
        </Link>
        <span
          className="text-xs font-semibold"
          style={{ color: TOKENS.inkHint, cursor: 'default' }}
          title="Richiede accesso KORA_ADMIN"
        >
          Executive Cockpit{' '}
          <span style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(6,3,43,0.07)', borderRadius: 3, padding: '1px 5px' }}>
            KORA_ADMIN
          </span>
        </span>
        <span
          className="text-xs font-semibold"
          style={{ color: TOKENS.inkHint, cursor: 'default' }}
          title="Richiede accesso KORA_ADMIN"
        >
          <TM>KORA Index</TM>{' '}
          <span style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(6,3,43,0.07)', borderRadius: 3, padding: '1px 5px' }}>
            KORA_ADMIN
          </span>
        </span>
      </div>

      <p style={{ fontSize: '9.5px', fontFamily: 'monospace', color: TOKENS.inkHint }}>
        Future Vision · static mockup · not active in Foundation Light · synthetic_demo_data: true
      </p>
    </div>
  );
}

