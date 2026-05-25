// FV-01: Future Vision — Architectural Roadmap
// Static mockup. No backend logic. Not active in Foundation Light.

import Link from 'next/link';
import { cn } from '@/lib/utils';

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
    statusStyle: 'bg-green-50 text-green-700 border-green-200',
    phaseStyle: 'border-green-200 bg-white',
    titleStyle: 'text-slate-900',
    purposeColor: 'text-slate-600',
    purpose: 'Misurare e rendere leggibile ciò che accade dopo la spesa.',
    modules: [
      { name: 'KORA Index',              desc: 'Indice di attivazione organizzativa — 4 macroblocks, 10 componenti.',       href: '/company/kora-index' },
      { name: 'Eligibility Gate',        desc: 'Classificazione Eligible / Limited / Blocked per ogni evento welfare.',      href: '/company/kora-index' },
      { name: 'Activation Debt',         desc: 'Budget welfare non convertito in Impact Units.',                             href: '/company/activation' },
      { name: 'Budget-to-Human-Impact',  desc: 'Connette la spesa al segnale di attivazione verificato.',                   href: '/company/financial'  },
      { name: 'Decision Pack',           desc: 'Report board-ready con KORA Index, pillars e raccomandazioni.',              href: '/company/reports'    },
      { name: 'Data Room',               desc: 'Pipeline di ingestion, UEF review e scoring readiness.',                    href: '/company/data'       },
    ],
  },
  {
    phase: '02',
    id: 'pilot-calibration',
    title: 'Pilot Calibration',
    status: 'upcoming',
    statusLabel: 'Prossima fase — richiede primi pilot aziendali',
    statusStyle: 'bg-blue-50 text-blue-700 border-blue-200',
    phaseStyle: 'border-blue-100 bg-blue-50/40',
    titleStyle: 'text-blue-900',
    purposeColor: 'text-blue-700',
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
    statusStyle: 'bg-violet-50 text-violet-700 border-violet-200',
    phaseStyle: 'border-violet-100 bg-violet-50/30',
    titleStyle: 'text-violet-900',
    purposeColor: 'text-violet-700',
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
    statusStyle: 'bg-amber-50 text-amber-700 border-amber-200',
    phaseStyle: 'border-amber-100 bg-amber-50/30',
    titleStyle: 'text-amber-900',
    purposeColor: 'text-amber-700',
    purpose: 'Rendere il dato di impatto portabile, privato e posseduto dal lavoratore.',
    modules: [
      { name: 'Worker PIB',                   desc: 'Personal Impact Balance — aggregato per pillar, privato e worker-owned.' },
      { name: 'Dynamic Impact CV',            desc: 'CV verificato di impatto umano, portabile e controllato dal lavoratore.' },
      { name: 'Consent Vault',                desc: 'Gestione del consenso granulare per ogni dimensione del dato di impatto.' },
      { name: 'Portable Verified Credentials', desc: 'Credenziali verificate esportabili verso mercato del lavoro e network.' },
      { name: 'KORA Link (NFC/QR)',            desc: 'Attivazione fisico-digitale — punti di contatto per worker self-declaration.' },
      { name: 'KORA Impact Pledge',            desc: 'Impegni collettivi di livello governance con evidenza verificata.' },
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
  active:   'border-slate-200 bg-white',
  upcoming: 'border-blue-100 bg-white/60 opacity-90',
  roadmap:  'border-violet-100 bg-white/40 opacity-80',
  vision:   'border-amber-100 bg-white/40 opacity-80',
};

const MODULE_NAME_STYLES: Record<Cluster['status'], string> = {
  active:   'text-slate-800',
  upcoming: 'text-blue-800',
  roadmap:  'text-violet-800',
  vision:   'text-amber-800',
};

const MODULE_DESC_STYLES: Record<Cluster['status'], string> = {
  active:   'text-slate-500',
  upcoming: 'text-blue-600/80',
  roadmap:  'text-violet-600/80',
  vision:   'text-amber-600/80',
};

export default function FutureVision() {
  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── Hero ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Roadmap Architetturale
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Future Vision</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
          Dalla misurazione Foundation Light all&apos;infrastruttura KORA completa: dati, attivazione, ecosistema, lavoratori e territori.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Roadmap architetturale
          </span>
          <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
            Non attivo in Foundation Light
          </span>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
            Dipendenze future
          </span>
          <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
            No production claim
          </span>
        </div>
      </div>

      {/* ── Phase Timeline ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Sequenza Architetturale
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {PHASE_TIMELINE.map((p, i) => (
            <div key={p.phase} className="flex items-center gap-1.5">
              <div className={cn(
                'rounded px-3 py-1.5 border',
                p.active
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-500 border-slate-200',
              )}>
                <span className={cn('text-[9px] font-bold uppercase tracking-wider block', p.active ? 'text-slate-400' : 'text-slate-400')}>
                  Fase {p.phase}
                </span>
                <span className={cn('text-xs font-semibold', p.active ? 'text-white' : 'text-slate-600')}>
                  {p.label}
                </span>
              </div>
              {i < PHASE_TIMELINE.length - 1 && (
                <span className="text-slate-300 font-bold">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-3">
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
                  <span className="text-[10px] font-bold text-slate-400 font-mono">FASE {cluster.phase}</span>
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
                  className={cn('rounded-lg border p-3 space-y-1', MODULE_CARD_STYLES[cluster.status])}
                >
                  <p className={cn('text-xs font-semibold leading-snug', MODULE_NAME_STYLES[cluster.status])}>
                    {mod.name}
                  </p>
                  <p className={cn('text-[10px] leading-relaxed', MODULE_DESC_STYLES[cluster.status])}>
                    {mod.desc}
                  </p>
                  {mod.href ? (
                    <Link
                      href={mod.href}
                      className="inline-block text-[10px] font-semibold text-slate-400 hover:text-slate-700 underline underline-offset-2 mt-0.5"
                    >
                      Vai →
                    </Link>
                  ) : (
                    <span className="inline-block text-[10px] font-semibold text-slate-300 mt-0.5 uppercase tracking-wide">
                      {cluster.status === 'upcoming' ? 'Prossima fase' : cluster.status === 'roadmap' ? 'Roadmap' : 'Vision'}
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
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Logica delle Dipendenze
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {DEPENDENCIES.map((dep, i) => (
            <div
              key={dep.output}
              className={cn(
                'flex items-start gap-3 px-4 py-3',
                i < DEPENDENCIES.length - 1 ? 'border-b border-slate-100' : '',
              )}
            >
              <span className="mt-0.5 text-slate-300 font-bold text-xs shrink-0">→</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700">{dep.output}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-slate-400">richiede: </span>
                  {dep.requires}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Nessun modulo futuro è indipendente. L&apos;architettura è sequenziale e incrementale — ogni fase abilita quella successiva.
        </p>
      </section>

      {/* ── Boundary Box ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1.5">
        <p className="font-semibold text-slate-600">Confini della roadmap</p>
        <ul className="space-y-1 pl-3">
          <li className="list-disc leading-relaxed">I moduli futuri non sono attivi in Foundation Light.</li>
          <li className="list-disc leading-relaxed">Nessuna funzionalità futura è un production claim.</li>
          <li className="list-disc leading-relaxed">Il dato worker-owned rimane privato — mai esposto a ruoli employer senza consenso esplicito.</li>
          <li className="list-disc leading-relaxed">Lo scoring ecosistemico richiede evidenze verificate e calibrazione empirica.</li>
          <li className="list-disc leading-relaxed">Foundation Light è il punto di ingresso attuale — la roadmap si attiva progressivamente.</li>
        </ul>
      </div>

      {/* ── CTA ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <Link
          href="/company"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          ← Executive Cockpit
        </Link>
        <Link
          href="/company/kora-index"
          className="text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          KORA Index →
        </Link>
        <Link
          href="/company/contribution"
          className="text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          KORA Contribution →
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        Future Vision · static mockup · not active in Foundation Light · synthetic_demo_data: true
      </p>
    </div>
  );
}
