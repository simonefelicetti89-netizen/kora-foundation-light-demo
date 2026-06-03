'use client';

import { useRole } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { cn } from '@/lib/utils';

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       'bg-green-500',
  GROWTH:     'bg-blue-500',
  CONNECTION: 'bg-purple-500',
  IMPACT:     'bg-orange-500',
  LEGACY:     'bg-amber-500',
};

const PILLAR_LIGHT: Record<string, string> = {
  LIFE:       'bg-green-50 text-green-700 border-green-200',
  GROWTH:     'bg-blue-50 text-blue-700 border-blue-200',
  CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
  IMPACT:     'bg-orange-50 text-orange-700 border-orange-200',
  LEGACY:     'bg-amber-50 text-amber-700 border-amber-200',
};

interface Opportunity {
  id: string;
  title: string;
  subtitle: string;
  pillar: string;
  pillar_label: string;
  provider: string;
  format: string;
  iu_potential: string;
  match_reason: string;
  type: 'partner' | 'internal' | 'community';
}

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-01',
    title: 'Workshop Community Leadership',
    subtitle: 'Leadership collaborativa e facilitazione di comunità',
    pillar: 'CONNECTION',
    pillar_label: 'CONNECTION',
    provider: 'Città Aperta APS',
    format: '2 sessioni · 4h totali',
    iu_potential: '+12–18 IU stimati',
    match_reason: 'Il tuo pilastro CONNECTION ha spazio di crescita. Questa attività potenzia mentoring e coesione.',
    type: 'partner',
  },
  {
    id: 'opp-02',
    title: 'Percorso Mentoring Legacy',
    subtitle: 'Trasferimento di conoscenza e memoria organizzativa',
    pillar: 'LEGACY',
    pillar_label: 'LEGACY',
    provider: 'GrowthLab Academy',
    format: '6 sessioni · 12h totali',
    iu_potential: '+20–30 IU stimati',
    match_reason: 'Il pilastro LEGACY è il tuo punto di forza. Un percorso mentoring rafforza continuità organizzativa.',
    type: 'partner',
  },
  {
    id: 'opp-03',
    title: 'Check prevenzione LIFE',
    subtitle: 'Screening di prevenzione e check salute di base',
    pillar: 'LIFE',
    pillar_label: 'LIFE',
    provider: 'VitaLab Network',
    format: '1 sessione · 2h',
    iu_potential: '+8–12 IU stimati',
    match_reason: 'Il pilastro LIFE mostra bassa continuità. Un check prevenzione supporta benessere sostenuto.',
    type: 'partner',
  },
  {
    id: 'opp-04',
    title: 'Volontariato territoriale',
    subtitle: 'Progetto di impatto comunitario e ambientale',
    pillar: 'IMPACT',
    pillar_label: 'IMPACT',
    provider: 'Città Aperta APS',
    format: '1 giornata · 6h',
    iu_potential: '+15–22 IU stimati',
    match_reason: 'Attività IMPACT con evidenza esterna verificata. Massimo potenziale per il pilastro.',
    type: 'community',
  },
  {
    id: 'opp-05',
    title: 'Emerging Leaders',
    subtitle: 'Sviluppo competenze leadership e digital skills',
    pillar: 'GROWTH',
    pillar_label: 'GROWTH',
    provider: 'LMS Aziendale',
    format: '4 moduli · 8h totali',
    iu_potential: '+18–26 IU stimati',
    match_reason: 'Il pilastro GROWTH può crescere. Certificazione interna con evidenza LMS verificata.',
    type: 'internal',
  },
  {
    id: 'opp-06',
    title: 'Ciclo Mentoring Cross-Generazionale',
    subtitle: 'Collaborazione senior-junior e scambio intergenerazionale',
    pillar: 'CONNECTION',
    pillar_label: 'CONNECTION',
    provider: 'Iniziativa interna',
    format: '8 sessioni · 16h totali',
    iu_potential: '+25–35 IU stimati',
    match_reason: 'Copre CONNECTION e LEGACY contemporaneamente. Alta coerenza con il tuo profilo.',
    type: 'internal',
  },
];

const TYPE_BADGE: Record<string, string> = {
  partner:   'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]',
  internal:  'bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
  community: 'bg-orange-50 text-orange-700 border-orange-200',
};

const TYPE_LABEL: Record<string, string> = {
  partner:   'Partner',
  internal:  'Interno',
  community: 'Community',
};

// W-04: Opportunità per te
export default function Opportunities() {
  const { activeRole } = useRole();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#06032B]">Opportunità per te</h1>
          <p className="text-sm text-[rgba(6,3,43,0.52)]">Percorsi e iniziative abbinati al tuo profilo di impatto</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">Accesso Limitato</p>
          <p className="mt-1 text-xs text-rose-600 max-w-sm mx-auto">
            Le opportunità personalizzate sono visibili solo al lavoratore. I ruoli datore di lavoro
            non possono accedere ai percorsi individuali.
          </p>
          <p className="mt-3 text-xs font-mono text-rose-400">Ruolo attivo: {activeRole}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#06032B]">Opportunità per te</h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">
          Percorsi e iniziative abbinati al tuo profilo di impatto — {OPPORTUNITIES.length} suggerimenti
        </p>
      </div>

      {/* Privacy notice — non-suppressible */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] p-3">
        <p className="text-xs font-semibold text-indigo-800">Visibile solo a te.</p>
        <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
          Il tuo datore di lavoro non vede quali opportunità esplori o selezioni. La partecipazione
          genera IU solo se e quando avviene e viene verificata.
        </p>
      </div>

      {/* Demo notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-700">Solo anteprima — Foundation Light</p>
        <p className="text-xs text-amber-700 mt-0.5">
          I pulsanti di adesione non sono attivi in questa demo. Nessuna prenotazione reale, nessuna
          notifica a partner, nessun pagamento. In produzione, la richiesta passerebbe da KORA verso
          il partner autorizzato.
        </p>
      </div>

      {/* Opportunity cards */}
      <div className="space-y-3">
        {OPPORTUNITIES.map((opp) => (
          <div
            key={opp.id}
            className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden"
          >
            {/* Pillar accent bar */}
            <div className={cn('h-1 w-full', PILLAR_COLORS[opp.pillar] ?? 'bg-[rgba(6,3,43,0.18)]')} />

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{opp.title}</p>
                    <span className={cn(
                      'rounded border px-1.5 py-0.5 text-xs font-medium',
                      PILLAR_LIGHT[opp.pillar] ?? 'bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
                    )}>
                      {opp.pillar_label}
                    </span>
                    <span className={cn(
                      'rounded border px-1.5 py-0.5 text-xs',
                      TYPE_BADGE[opp.type],
                    )}>
                      {TYPE_LABEL[opp.type]}
                    </span>
                  </div>
                  <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">{opp.subtitle}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-[rgba(6,3,43,0.40)]">Provider</p>
                  <p className="text-xs font-medium text-[rgba(6,3,43,0.78)] mt-0.5">{opp.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-[rgba(6,3,43,0.40)]">Formato</p>
                  <p className="text-xs font-medium text-[rgba(6,3,43,0.78)] mt-0.5">{opp.format}</p>
                </div>
                <div>
                  <p className="text-xs text-[rgba(6,3,43,0.40)]">IU potenziali</p>
                  <p className="text-xs font-medium text-[#C76F3D] mt-0.5">{opp.iu_potential}</p>
                </div>
              </div>

              <div className="mt-3 rounded bg-[rgba(6,3,43,0.03)] border border-[rgba(6,3,43,0.05)] px-3 py-2">
                <p className="text-xs text-[rgba(6,3,43,0.52)] italic leading-relaxed">{opp.match_reason}</p>
              </div>

              <div className="mt-3 flex items-center justify-end">
                <button
                  disabled
                  className="rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.40)] cursor-not-allowed"
                >
                  Richiedi partecipazione — Solo anteprima
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* IU estimate disclaimer */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.62)] mb-1">Nota sugli IU stimati</p>
        <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          Gli Impact Unit stimati sono indicazioni orientative basate sulla metodologia KORA v0.1 pre-calibrazione empirica.
          Il valore reale dipende da completamento, verifica dell&apos;evidenza e fattori di correzione applicati.
          Questi dati sono sintetici e solo a scopo dimostrativo.
        </p>
        <p className="mt-1.5 text-xs font-mono text-[rgba(6,3,43,0.28)]">
          synthetic_demo_data: true · methodology_version: v0.1 · calibration_status: pre_empirical_calibration
        </p>
      </div>
    </div>
  );
}
