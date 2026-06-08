'use client';
// W-03: Dynamic Impact CV™ — Foundation Light v0.1 completion (B73-B).
// Worker-controlled impact portfolio. Employer has zero access — enforced at service level.
//
// B81-B route classification: PREVIEW
// Current: CV items from MyKoraPreviewService (synthetic, export_available: false).
//          DynamicCVService.getProfile() delegates to persona fixtures.
// Pilot+:  DynamicCVService reads verified UEF records tagged to real worker_kora_id.
//          Worker-controlled sharing flags persisted in Supabase.
//          export_readiness becomes true when worker confirms export intent.

import { useRole, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService, type DynamicCVItem } from '@/services/my-kora-preview/MyKoraPreviewService';
import { workerAttributionService } from '@/services/worker-attribution/WorkerAttributionService';
import { workerAchievementService } from '@/services/worker-achievements/WorkerAchievementService';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { PreviewToLiveNotice } from '@/components/my-kora/PreviewToLiveNotice';
import { cn } from '@/lib/utils';

// ── Pillar styling ────────────────────────────────────────────────────────────

const PILLAR_LIGHT: Record<string, string> = {
  LIFE:       'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]',
  GROWTH:     'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  CONNECTION: 'bg-[rgba(217,151,103,0.10)] text-[#D99767] border-[rgba(217,151,103,0.25)]',
  IMPACT:     'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  LEGACY:     'bg-[rgba(138,117,98,0.10)] text-[#8A7562] border-[rgba(138,117,98,0.25)]',
};

const VERIF_BADGE: Record<string, string> = {
  verified:      'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  partial:       'bg-[rgba(217,154,43,0.10)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  self_declared: 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
};

const VERIF_LABEL: Record<string, string> = {
  verified:      'Verificato',
  partial:       'Parziale',
  self_declared: 'Autodichiarato',
};

const PILLAR_BAR_COLOR: Record<string, string> = {
  LIFE:       'bg-[#C76F3D]',
  GROWTH:     'bg-[#2F7D55]',
  CONNECTION: 'bg-[#D99767]',
  IMPACT:     'bg-[#D99A2B]',
  LEGACY:     'bg-[#8A7562]',
};

// ── Section definitions ───────────────────────────────────────────────────────

const CV_SECTIONS: Array<{
  key: string;
  label: string;
  sublabel: string;
  pillars: string[];
  contribution: boolean;
}> = [
  { key: 'growth',     label: 'Formazione & Crescita',    sublabel: 'Certificazioni, corsi, percorsi di sviluppo professionale', pillars: ['GROWTH'],     contribution: false },
  { key: 'impact',     label: 'Contributo & Community',   sublabel: 'Volontariato, iniziative territoriali, progetti ESG verificati', pillars: ['IMPACT'],     contribution: true  },
  { key: 'connection', label: 'Connessione & Mentoring',  sublabel: 'Mentoring, peer collaboration, attività community e cross-team', pillars: ['CONNECTION'], contribution: false },
  { key: 'life',       label: 'Benessere',                sublabel: 'Attività di prevenzione, salute e benessere verificate', pillars: ['LIFE'],       contribution: false },
  { key: 'legacy',     label: 'Legacy & Trasferimento',   sublabel: 'Knowledge transfer, documentazione, mentoring senior-junior', pillars: ['LEGACY'],    contribution: false },
];

const ALL_PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

// ── Pillar distribution helper ────────────────────────────────────────────────

function computePillarDistribution(items: DynamicCVItem[]): Array<{ pillar: string; count: number; label: string }> {
  const LABELS: Record<string, string> = {
    LIFE: 'Life', GROWTH: 'Growth', CONNECTION: 'Connection', IMPACT: 'Impact', LEGACY: 'Legacy',
  };
  return ALL_PILLARS.map((p) => ({
    pillar: p,
    count: items.filter((i) => i.pillar === p).length,
    label: LABELS[p],
  }));
}

// ── CV attribution reason — Task 3 B85-B ─────────────────────────────────────

function cvAttributionReason(item: DynamicCVItem, contribution: boolean): string {
  if (item.verification_status === 'verified') {
    if (contribution) return 'Contributo validato';
    return 'Attività verificata';
  }
  if (item.verification_status === 'partial') {
    return 'Verifica in corso — completa la verifica per condividerlo';
  }
  return 'Autodichiarato — richiede verifica esterna';
}

// ── CV item card ──────────────────────────────────────────────────────────────

function CVItemCard({ item, contribution }: { item: DynamicCVItem; contribution: boolean }) {
  // B85-B Task 3 — derive attribution class for "why it appears" explanation
  const attribution = workerAttributionService.classify({
    verification_status: item.verification_status,
    source_type: item.source_category.toLowerCase().includes('lms') ? 'lms_training'
      : item.source_category.toLowerCase().includes('esg') ? 'esg_initiatives'
      : item.source_category.toLowerCase().includes('welfare') ? 'welfare_provider'
      : item.source_category.toLowerCase().includes('partner') ? 'partner_events'
      : 'manual_upload',
  });

  const reason = cvAttributionReason(item, contribution);

  return (
    <div className={cn(
      'rounded-lg border p-4',
      contribution
        ? 'border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.04)]'
        : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{item.title}</p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5 font-mono">
            {item.date} · {item.source_category}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium',
            PILLAR_LIGHT[item.pillar] ?? 'bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
          )}>
            {item.pillar_label}
          </span>
          <span className={cn('rounded border px-1.5 py-0.5 text-xs',
            VERIF_BADGE[item.verification_status] ?? VERIF_BADGE.self_declared,
          )}>
            {VERIF_LABEL[item.verification_status] ?? item.verification_status}
          </span>
        </div>
      </div>

      {/* Task 3 B85-B — Attribution explainability: why this item appears */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.52)]">
          Classe {attribution.code}
        </span>
        <span
          className={cn(
            'rounded border px-1.5 py-0.5 text-[10px] font-medium',
            attribution.workerPibEligible
              ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.06)] text-[#2F7D55]'
              : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.42)]',
          )}
          data-testid={`cv-item-attribution-reason-${item.id}`}
        >
          {reason}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-[rgba(6,3,43,0.40)] italic">{item.export_label}</p>
        <span className={cn(
          'rounded border px-2 py-0.5 text-xs font-medium cursor-default',
          item.shareable
            ? 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]'
            : 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]',
        )}>
          {item.shareable ? 'Condivisibile' : 'Privato'}
        </span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DynamicCV() {
  const { activeRole } = useRole();
  const { activePersona } = usePersona();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em", lineHeight: 1.06, color: "#06032B" }}>Dynamic Impact CV</h1>
          <p className="text-sm text-[rgba(6,3,43,0.52)]">Portfolio di impatto personale del lavoratore</p>
        </div>
        <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-6 text-center">
          <p className="text-sm font-semibold text-[#9E3B2F]">Accesso Limitato</p>
          <p className="mt-1 text-xs text-[rgba(158,59,47,0.90)] max-w-sm mx-auto">
            Il Dynamic Impact CV è privato del lavoratore. I ruoli datore di lavoro non possono accedere
            ai dati CV individuali. Il lavoratore decide cosa esportare o condividere.
          </p>
          <p className="mt-3 text-xs font-mono text-[rgba(158,59,47,0.55)]">Ruolo attivo: {activeRole}</p>
        </div>
      </div>
    );
  }

  const personaId = activePersona?.id ?? 'persona-elena-m';
  const cvPreview = myKoraPreviewService.getDynamicCvPreview(personaId);
  const pillarDist = computePillarDistribution(cvPreview.items);
  const maxCount = Math.max(...pillarDist.map((p) => p.count), 1);

  const achStats = workerAchievementService.getAchievementStats();

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <BoundaryBadge mode="PREVIEW" variant="light" suffix="· Worker layer · dati sintetici" style={{ marginBottom: 6 }} />
        <div className="flex items-center gap-2">
          <h1 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em", lineHeight: 1.06, color: "#06032B" }}>
            Dynamic Impact CV
          </h1>
          <span style={{ borderRadius: 999, border: "1px solid rgba(6,3,43,0.14)", background: "rgba(6,3,43,0.04)", padding: "2px 8px", fontSize: "10px", fontWeight: 600, color: "rgba(6,3,43,0.52)", fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif" }}>
            Anteprima · Foundation Light
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">{cvPreview.persona_label}</p>
      </div>

      {/* ── PreviewToLiveNotice — Task 3 */}
      <PreviewToLiveNotice
        what="Stai vedendo il tuo Dynamic Impact CV in anteprima."
        preview="Le voci mostrate sono sintetiche — costruite su un profilo sintetico dimostrativo, non le tue attività reali."
        live="In Pilot+, proverranno dai tuoi eventi verificati nella pipeline KORA, registrati nel tuo account worker-owned."
        privacy="Il tuo datore di lavoro non ha accesso a questo CV in nessuna modalità."
      />

      {/* ── Worker Ownership Block — non-suppressible ── */}
      <div className="rounded-lg border border-[rgba(47,125,85,0.30)] bg-[rgba(47,125,85,0.07)] p-4 space-y-2">
        <p className="text-sm font-bold text-[rgba(6,3,43,0.90)]">Questo profilo appartiene a te.</p>
        <ul className="space-y-1">
          {[
            'Il tuo datore di lavoro non può accedere a questo CV.',
            'Il tuo datore di lavoro non può esportare questi dati.',
            'Il tuo datore di lavoro non può modificare o vedere le tue scelte.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-1.5 text-xs text-[rgba(6,3,43,0.72)]">
              <span className="text-[#2F7D55] shrink-0 mt-0.5">—</span>
              {line}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-[rgba(6,3,43,0.52)] italic border-t border-[rgba(47,125,85,0.15)] pt-2">
          Solo tu decidi cosa entra nel tuo Dynamic Impact CV e cosa condividere.
        </p>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Elementi totali</p>
          <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)] mt-1">{cvPreview.total_items}</p>
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Verificati</p>
          <p className="text-2xl font-bold text-[#2F7D55] mt-1">{cvPreview.verified_count}</p>
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Condivisibili</p>
          <p className="text-2xl font-bold text-[#C76F3D] mt-1">
            {cvPreview.items.filter((i) => i.shareable).length}
          </p>
        </div>
      </div>

      {/* ── CV Readiness Panel — Task 6 B99-B ── */}
      <div
        data-testid="cv-readiness-panel"
        className="rounded-lg border border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.04)] p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.80)]">
            Elementi pronti per il Dynamic CV
          </h2>
          <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#2F7D55]">
            {achStats.shareable} condivisibili
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border border-[rgba(47,125,85,0.18)] bg-[rgba(47,125,85,0.06)] p-2.5 text-center" data-testid="cv-ready-verified">
            <p className="text-lg font-bold text-[#2F7D55]">{achStats.verified}</p>
            <p className="text-[9px] text-[rgba(6,3,43,0.50)] mt-0.5">Verificati</p>
          </div>
          <div className="rounded border border-[rgba(199,111,61,0.18)] bg-[rgba(199,111,61,0.06)] p-2.5 text-center" data-testid="cv-ready-shareable">
            <p className="text-lg font-bold text-[#C76F3D]">{achStats.shareable}</p>
            <p className="text-[9px] text-[rgba(6,3,43,0.50)] mt-0.5">Condivisibili</p>
          </div>
          <div className="rounded border border-[rgba(217,154,43,0.18)] bg-[rgba(217,154,43,0.06)] p-2.5 text-center" data-testid="cv-ready-pending">
            <p className="text-lg font-bold text-[#D99A2B]">{achStats.pending}</p>
            <p className="text-[9px] text-[rgba(6,3,43,0.50)] mt-0.5">In verifica</p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-[rgba(6,3,43,0.62)] leading-relaxed">
          <p>
            <span className="font-semibold text-[#2F7D55]">Verificati:</span>{' '}
            confermati da fonte esterna (LMS, partner KORA, advisor). Pronti per il CV.
          </p>
          <p>
            <span className="font-semibold text-[#D99A2B]">In verifica:</span>{' '}
            la fonte esterna non ha ancora completato la conferma. Non ancora nel CV.
          </p>
          <p>
            <span className="font-semibold text-[rgba(6,3,43,0.50)]">Autodichiarati:</span>{' '}
            caricati dal lavoratore. Richiedono una verifica esterna per entrare nel CV condivisibile.
          </p>
        </div>

        <p className="text-[10px] text-[rgba(6,3,43,0.42)] italic border-t border-[rgba(47,125,85,0.12)] pt-2">
          Il riconoscimento appartiene a te. Non è visibile individualmente al datore di lavoro.
          Solo tu decidi cosa condividere dal tuo Dynamic CV.
        </p>
      </div>

      {/* ── Dynamic Impact Profile™ — pillar distribution ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Dynamic Impact Profile™</h2>
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-2 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.42)]">
            composizione CV — non PIB
          </span>
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.40)] leading-relaxed">
          Distribuzione delle attività nel tuo CV per pillar. Diverso dal PIB — mostra la composizione del
          tuo portfolio di impatto, non il punteggio personale.
        </p>
        <div className="space-y-2" data-testid="pillar-distribution">
          {pillarDist.map(({ pillar, count, label }) => (
            <div key={pillar} className="flex items-center gap-3">
              <span className="text-xs font-mono text-[rgba(6,3,43,0.52)] w-24 shrink-0">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-[rgba(6,3,43,0.06)]">
                <div
                  className={cn('h-2 rounded-full transition-all', PILLAR_BAR_COLOR[pillar] ?? 'bg-[rgba(6,3,43,0.30)]')}
                  style={{ width: count === 0 ? '0%' : `${Math.round((count / maxCount) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-[rgba(6,3,43,0.52)] w-6 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[rgba(6,3,43,0.38)] italic">
          Il profilo di impatto personale è privato e worker-owned. Non visibile al datore di lavoro.
        </p>
      </div>

      {/* ── Evidence Legend ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.02)] p-4" data-testid="evidence-legend">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-3">
          Stato di verifica
        </h2>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] px-2 py-0.5 text-xs text-[#2F7D55] shrink-0 mt-0.5">
              Verificato
            </span>
            <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed">
              Confermato da fonte esterna — LMS, welfare provider, partner KORA, o advisor. Condivisibile su tua iniziativa.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="rounded border border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.10)] px-2 py-0.5 text-xs text-[#8A5A00] shrink-0 mt-0.5">
              Parziale
            </span>
            <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed">
              Conferma parziale — il processo di verifica non è ancora completo. Non ancora condivisibile.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="rounded border border-[rgba(6,3,43,0.12)] bg-[rgba(6,3,43,0.04)] px-2 py-0.5 text-xs text-[rgba(6,3,43,0.52)] shrink-0 mt-0.5">
              Autodichiarato
            </span>
            <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed">
              Caricato direttamente dal lavoratore. Non verificato da terzi. Non condivisibile senza conferma esterna.
            </p>
          </div>
        </div>
      </div>

      {/* ── CV Sections — grouped by pillar domain ── */}
      <div className="space-y-5" data-testid="cv-sections">
        {CV_SECTIONS.map((section) => {
          const sectionItems = cvPreview.items.filter((i) => section.pillars.includes(i.pillar));
          return (
            <div key={section.key} data-testid={`cv-section-${section.key}`}>
              <div className={cn(
                'flex items-center gap-2 mb-1',
                section.contribution && 'border-l-2 border-[rgba(217,154,43,0.50)] pl-2',
              )}>
                <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">{section.label}</h2>
                {section.contribution && (
                  <span className="rounded border border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.08)] px-1.5 py-0.5 text-[10px] font-medium text-[#8A5A00]">
                    Contributo
                  </span>
                )}
              </div>
              <p className="text-xs text-[rgba(6,3,43,0.40)] mb-2">{section.sublabel}</p>
              {sectionItems.length > 0 ? (
                <div className="space-y-2">
                  {sectionItems.map((item) => (
                    <CVItemCard key={item.id} item={item} contribution={section.contribution} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.02)] px-4 py-3">
                  <p className="text-xs text-[rgba(6,3,43,0.38)] italic">
                    Nessuna attività {section.label.toLowerCase()} nel tuo CV. Le attività verificate in questa area
                    appariranno qui quando disponibili.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Milestones & Credentials — Pilot+ placeholder ── */}
      <div
        className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.02)] p-4 space-y-2"
        data-testid="milestones-placeholder"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.60)]">Milestone & Credenziali</h2>
          <span className="rounded border border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.05)] px-2 py-0.5 text-[10px] font-semibold text-[rgba(6,3,43,0.42)]">
            Disponibile in Pilot+
          </span>
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.48)] leading-relaxed">
          Le milestone vengono assegnate in base a pattern di attivazione verificata — quando un lavoratore
          raggiunge soglie significative in un pillar o mantiene un&apos;attivazione sostenuta nel tempo.
          Non sono trofei o punti: sono riconoscimenti di continuità di impatto reale.
        </p>
        <p className="text-[11px] text-[rgba(6,3,43,0.38)] italic">
          Disponibile dopo Gate 3 — richiede identità worker-owned e consenso verificato.
        </p>
      </div>

      {/* ── Disclaimer ── */}
      <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.06)] p-3">
        <p className="text-xs font-semibold text-amber-700 mb-1">Nota metodologica</p>
        <p className="text-xs text-amber-700 leading-relaxed">{cvPreview.disclaimer}</p>
      </div>

      {/* ── Future Vision: Export & Share ── */}
      <div className="rounded-lg border border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.06)] px-4 py-3">
        <p className="text-xs font-semibold text-[#8A5A00]">
          Future Vision / Non attivo in Foundation Light
        </p>
        <p className="text-xs text-[#D99A2B] mt-0.5">
          Esportazione, condivisione LinkedIn, KORA Link e credenziali verificabili sono previsti post-pilota.
          Nessuna esportazione reale avviene in questa demo.
        </p>
      </div>

      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[rgba(6,3,43,0.55)]">Esporta portfolio — Future Vision</p>
            <p className="text-xs text-[rgba(6,3,43,0.38)] mt-0.5">
              Genera un portfolio di impatto portabile con tutti gli elementi e il loro stato di verifica.
            </p>
          </div>
          <button
            disabled
            className="shrink-0 rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.35)] cursor-not-allowed"
          >
            Esporta — Non attivo
          </button>
        </div>
        <div className="border-t border-[rgba(6,3,43,0.05)] pt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[rgba(6,3,43,0.55)]">Condividi su LinkedIn — Future Vision</p>
            <p className="text-xs text-[rgba(6,3,43,0.38)] mt-0.5">
              Aggiungi il tuo KORA Impact Badge al profilo LinkedIn con evidenze verificate.
            </p>
          </div>
          <button
            disabled
            className="shrink-0 rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.35)] cursor-not-allowed"
          >
            LinkedIn — Non attivo
          </button>
        </div>
      </div>

    </div>
  );
}
