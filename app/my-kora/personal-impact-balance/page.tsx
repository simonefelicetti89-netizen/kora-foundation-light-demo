'use client';
// W-PIB: Personal Impact Balance — spazio privato del lavoratore.
// B141-B: pagina dedicata estratta dalla home My KORA.
//
// Contiene il bilancio completo worker-owned:
//   - IU totali del periodo
//   - Activation Profile + Activation Level
//   - KORA Activation Signature (STRATO worker)
//   - Pillar breakdown privato
//   - IU educational panel + Attribution Matrix
//   - Timeline personale completa
//   - KORA Link / QR (FUTURE_VISION — usa solo KoraStratoMark canonico, nessun dato worker)
//
// Privacy invariants: unchanged from B81-B.
//   PIB never shown to employer. Layout gate prevents employer access.
//   KoraStratoMark = brand canonico, nessun dato worker.
//   KoraActivationSignature = STRATO worker privato, solo in sezione PIB.

import Link from 'next/link';
import { useRole, useScenario, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { workerAttributionService } from '@/services/worker-attribution/WorkerAttributionService';
import { WorkerActivationSignatureCard } from '@/components/my-kora/WorkerActivationSignatureCard';
import { KoraStratoMark } from '@/components/brand/KoraStratoMark';
import { KoraLogo } from '@/components/brand/KoraLogo';
import { AttributionMatrix } from '@/components/my-kora/AttributionMatrix';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { PreviewToLiveNotice } from '@/components/my-kora/PreviewToLiveNotice';
import { cn } from '@/lib/utils';

// ─── Styling maps ─────────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  LIFE: 'bg-[#C76F3D]', GROWTH: 'bg-[#2F7D55]', CONNECTION: 'bg-[#D99767]',
  IMPACT: 'bg-[#2F7D55]', LEGACY: 'bg-[#8A7562]',
};

const PILLAR_LIGHT: Record<string, string> = {
  LIFE:       'bg-[#C76F3D]/10 text-[#C76F3D] border-[rgba(199,111,61,0.25)]',
  GROWTH:     'bg-[#2F7D55]/10 text-[#2F7D55] border-[rgba(47,125,85,0.25)]',
  CONNECTION: 'bg-[#D99767]/10 text-[#D99767] border-[rgba(217,151,103,0.25)]',
  IMPACT:     'bg-[rgba(74,127,224,0.10)] text-[#4A7FE0] border-[rgba(74,127,224,0.25)]',
  LEGACY:     'bg-[#8A7562]/10 text-[#8A7562] border-[rgba(138,117,98,0.25)]',
};

const PILLAR_TEXT: Record<string, string> = {
  LIFE:       'text-[#C76F3D]',
  GROWTH:     'text-[#2F7D55]',
  CONNECTION: 'text-[#D99767]',
  IMPACT:     'text-[#4A7FE0]',
  LEGACY:     'text-[#8A7562]',
};


const VERIF_LABEL: Record<string, string> = {
  verified: 'Verificato', partial: 'In verifica', self_declared: 'Autodichiarato',
};
const VERIF_COLOR: Record<string, string> = {
  verified: 'text-[#2F7D55]', partial: 'text-[#D99A2B]', self_declared: 'text-[rgba(6,3,43,0.42)]',
};


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonalImpactBalancePage() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const { activePersona } = usePersona();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-6 text-center" data-testid="access-denied">
        <p className="text-sm font-semibold text-[#9E3B2F]">Accesso Limitato</p>
        <p className="mt-1 text-xs text-[rgba(158,59,47,0.90)] max-w-sm mx-auto">
          Personal Impact Balance è una sezione privata del lavoratore.
        </p>
      </div>
    );
  }

  const personaId = activePersona?.id ?? 'persona-elena-m';
  const preview   = myKoraPreviewService.getMyKoraHomePreview(personaId, activeScenario);

  if (!preview) return null;

  return (
    <div className="space-y-6" data-testid="pib-dedicated-page">

      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/my-kora"
          className="text-xs text-[rgba(6,3,43,0.45)] hover:text-[rgba(6,3,43,0.70)] transition-colors"
          style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', textDecoration: 'none' }}
        >
          ← My KORA
        </Link>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div data-testid="pib-page-header">
        <BoundaryBadge mode="PREVIEW" variant="light" suffix="· dati sintetici" style={{ marginBottom: 10 }} />
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: '#06032B' }}>
          Personal Impact Balance
        </h1>
        <p style={{ fontSize: '13.5px', color: 'rgba(6,3,43,0.52)', marginTop: 4, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Il bilancio privato delle tue esperienze di attivazione.
        </p>
      </div>

      {/* ── Bilancio personale di attivazione ───────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3" data-testid="pib-section">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Bilancio personale di attivazione
          </h2>
          <div className="flex items-center gap-2">
            <span className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-2 py-0.5 text-xs font-mono text-[#C76F3D]">
              privato · solo per te
            </span>
            <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-2 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.42)]">
              IU sintetici pre-computati
            </span>
          </div>
        </div>

        {/* IU total — quantità assoluta, fuori dall'emblema STRATO */}
        <p className="text-xs font-mono text-[rgba(6,3,43,0.55)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }} data-testid="period-iu-total">
          {preview.pib_light.period_iu_total.toFixed(1).replace('.', ',')} Impact Units attivate · periodo {preview.pib_light.period} · privato
        </p>
        <p className="text-[11px] text-[rgba(6,3,43,0.42)] leading-relaxed italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Le IU misurano il lavoro di attivazione che hai reso visibile, non una prestazione. Non c&apos;è un massimo da raggiungere.
        </p>

        {/* Privacy notice — non-suppressible */}
        <p className="text-xs text-[rgba(6,3,43,0.60)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Questo spazio appartiene a te. KORA misura l&apos;organizzazione, non classifica i lavoratori.
          Il tuo datore di lavoro non vede queste informazioni.
        </p>

        {/* Anti-score boundary — non-suppressible */}
        <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
          <p className="text-[11px] text-[rgba(6,3,43,0.55)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Non è un voto di performance. Non è una classifica. Non è un indicatore di produttività,
            loyalty o benessere individuale.
          </p>
        </div>

        {/* Pillar activation + worker signature — 2-col layout */}
        {/* Signature is emblem-sized (~176px), not full-width. Bands are proportional to container. */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start"
          data-testid="pillar-signature-grid"
        >
          {/* Left: compact 5-pillar activation */}
          <div className="space-y-2">
            <p
              className="text-[10px] font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-widest mb-1"
              style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}
            >
              Pillar activation
            </p>
            {preview.pib_light.pillar_breakdown.map((p) => (
              <div key={p.pillar} className="flex items-center gap-2">
                <span
                  className={cn('text-[11px] font-mono font-semibold shrink-0', PILLAR_TEXT[p.pillar] ?? 'text-[rgba(6,3,43,0.62)]')}
                  style={{ width: 84 }}
                >
                  {p.pillar}
                </span>
                <div
                  className="relative h-1.5 rounded-full bg-[rgba(6,3,43,0.06)] shrink-0"
                  style={{ width: 120 }}
                >
                  <div
                    className={cn('h-1.5 rounded-full', p.event_count > 0 ? (PILLAR_COLORS[p.pillar] ?? 'bg-[rgba(6,3,43,0.35)]') : 'bg-transparent')}
                    style={{ width: p.event_count > 0 ? `${p.score}%` : '0%' }}
                  />
                </div>
                <span className="text-[11px] font-mono text-[rgba(6,3,43,0.48)] shrink-0">
                  {p.iu_total.toFixed(1).replace('.', ',')} IU
                </span>
              </div>
            ))}
          </div>

          {/* Right: premium personal pictogram — dark card, worker-owned */}
          <div className="flex flex-col gap-2">
            <WorkerActivationSignatureCard
              pillarBreakdown={preview.pib_light.pillar_breakdown}
              activationProfile={preview.pib_light.activation_profile}
            />
            <p
              className="text-[10px] text-[rgba(6,3,43,0.38)] italic text-center"
              style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}
            >
              Composizione del periodo, non una classifica.
            </p>
          </div>
        </div>

        {/* Activation profile — standalone below the 2-col grid */}
        <div className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.03)] px-3 py-2" data-testid="activation-profile-block">
          <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.72)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Profilo del periodo: <span className="text-[#C76F3D]">{preview.pib_light.activation_profile}</span>
          </p>
          <p className="text-[11px] text-[rgba(6,3,43,0.52)] mt-0.5 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            {preview.pib_light.activation_profile_description}
          </p>
          <p className="text-[10px] text-[rgba(6,3,43,0.35)] mt-1 italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Descrive il mix delle tue esperienze, non te. Cambia a ogni periodo.
          </p>
        </div>

        {/* Qualitative activation level */}
        <div className="rounded border border-[rgba(199,111,61,0.18)] bg-[rgba(199,111,61,0.05)] px-3 py-2.5">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            {preview.pib_light.activation_level_label}
          </p>
          <p className="text-[11px] text-[rgba(6,3,43,0.50)] mt-0.5 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            {preview.pib_light.activation_level_description}
          </p>
        </div>

        {/* Summary counts — qualitative, no numeric score */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center rounded border border-[rgba(6,3,43,0.06)] bg-white p-2.5">
            <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)]">{preview.pib_light.active_pillars}/5</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">Pillar presenti</p>
          </div>
          <div className="text-center rounded border border-[rgba(6,3,43,0.06)] bg-white p-2.5">
            <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)]">{preview.pib_light.total_events}</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">Esperienze</p>
          </div>
        </div>

        {/* PIB derivation disclosure — non-suppressible */}
        <div className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.06)] px-3 py-2">
          <p className="text-[10px] font-semibold text-[#8A5A00]">Dato sintetico · derivato da IU computati</p>
          <p className="text-[10px] text-[#8A5A00] mt-0.5 leading-relaxed">
            {preview.pib_light.pib_derivation_note}
          </p>
        </div>

        <p className="text-xs text-[rgba(6,3,43,0.40)]">
          {preview.pib_light.active_pillars} pillar presenti · {preview.pib_light.total_events} esperienze · {preview.pib_light.period}
        </p>


        {/* Dynamic CV connection — non-suppressible */}
        <div className="rounded border border-[rgba(47,125,85,0.18)] bg-[rgba(47,125,85,0.05)] px-3 py-2.5">
          <p className="text-[11px] font-semibold text-[#2F7D55] mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Puoi scegliere quali esperienze portare nel tuo Dynamic Impact CV.
          </p>
          <p className="text-[11px] text-[rgba(6,3,43,0.52)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            L&apos;azienda vede solo aggregati anonimi — mai i tuoi dati individuali.
          </p>
          <Link
            href="/my-kora/dynamic-cv"
            className="text-[11px] font-semibold text-[#2F7D55] hover:underline mt-1.5 inline-block"
            style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}
          >
            Scegli cosa portare nel Dynamic Impact CV →
          </Link>
        </div>

        <p className="text-[11px] text-[rgba(6,3,43,0.40)] border-t border-[rgba(6,3,43,0.05)] pt-2 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          L&apos;azienda vede solo dati aggregati e anonimi dell&apos;intera organizzazione. Questo bilancio non lascia
          mai il tuo account, se non per le esperienze che scegli tu.
        </p>
      </div>

      {/* ── IU plain-language explanation ─────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)] px-4 py-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Cosa sono gli Impact Unit (IU)?
        </p>
        <p className="text-[11px] text-[rgba(6,3,43,0.58)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Gli Impact Unit non servono per valutarti o confrontarti con altri lavoratori. Ogni partecipazione
          verificata produce IU che contribuiscono all&apos;attivazione complessiva dell&apos;organizzazione —
          mai come classifica individuale. Gli IU mostrati in questa anteprima sono calcolati su dati sintetici.
          In Pilot+, deriveranno dalle tue attività realmente verificate.
        </p>
      </div>

      {/* ── "Quando un Impact Unit diventa tuo?" — educational panel ──────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-4" data-testid="iu-educational-panel">
        <div>
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Quando un Impact Unit diventa tuo?
          </h2>
          <p className="text-[11px] text-[rgba(6,3,43,0.40)] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            In Foundation Light vedi IU sintetici. In Pilot+, i tuoi IU reali seguono questo percorso.
          </p>
        </div>
        <div className="space-y-2">
          {([
            { step: '1', label: "L'attività deve essere idonea.", desc: 'Non tutte le attività generano Impact Units. Solo quelle che producono attivazione reale — verificabile, volontaria, non obbligatoria per legge o contratto.' },
            { step: '2', label: 'Deve essere verificata.', desc: "Una verifica esterna — da LMS, welfare provider, partner KORA o advisor — è necessaria. L'autodichiarazione non è sufficiente da sola." },
            { step: '3', label: 'Non può essere solo conformità o sostegno economico.', desc: "La sicurezza obbligatoria, i voucher e i fringe benefit non generano IU. La baseline non è impatto. KORA misura ciò che va oltre il minimo dovuto." },
            { step: '4', label: 'Nel programma Pilot+ verrà associata al tuo profilo.', desc: 'Solo in Pilot+, con identità worker-owned e consenso, gli IU vengono collegati al tuo percorso personale. In Foundation Light sono sintetici.' },
          ] as { step: string; label: string; desc: string }[]).map(({ step, label, desc }) => (
            <div key={step} className="flex items-start gap-3 rounded-md border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] p-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#C76F3D] flex items-center justify-center text-[10px] font-bold text-white mt-0.5">{step}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[rgba(6,3,43,0.82)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{label}</p>
                <p className="text-[11px] text-[rgba(6,3,43,0.52)] mt-0.5 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2.5">
          <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Non tutte le attività diventano parte del tuo percorso personale.
            KORA considera solo attività idonee e verificabili.
          </p>
        </div>
        <AttributionMatrix />
      </div>

      {/* ── Personal impact timeline — full detail ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Timeline personale
          </h2>
          <span className="text-xs text-[rgba(6,3,43,0.40)] font-mono">privata · IU sintetici</span>
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mb-3 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          La timeline personale appartiene al lavoratore. Può contribuire agli aggregati aziendali solo in
          forma anonima e sopra soglia privacy. I valori IU mostrati sono derivati dalla formula
          KORA Index v1.0 su dati sintetici.
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {preview.timeline.map((item) => {
              const attribution = workerAttributionService.classify({
                verification_status: item.verification_status,
                source_type: item.source_type,
              });
              return (
                <div key={item.id} className="px-4 py-3 hover:bg-[rgba(6,3,43,0.03)]">
                  <div className="flex items-start gap-3">
                    <div className="text-xs font-mono text-[rgba(6,3,43,0.40)] w-24 shrink-0 mt-0.5">{item.date}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[rgba(6,3,43,0.90)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{item.category}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono',
                          PILLAR_LIGHT[item.pillar] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
                        )}>{item.pillar}</span>
                        <span className={cn('text-[10px] font-medium', VERIF_COLOR[item.verification_status])}>
                          {VERIF_LABEL[item.verification_status]}
                        </span>
                        <span className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.48)]">
                          {item.iu_value.toFixed(2)} IU
                        </span>
                        <span
                          className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.52)]"
                          data-testid={`attribution-badge-${item.id}`}
                        >
                          Classe {attribution.code}
                        </span>
                        <span className="text-[10px] text-[rgba(6,3,43,0.38)]">{attribution.label}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.40)]">Privato</span>
                        {attribution.workerPibEligible ? (
                          <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.06)] px-1.5 py-0.5 text-[10px] text-[#2F7D55]" data-testid={`pib-eligible-${item.id}`}>
                            Può contribuire al tuo PIB
                          </span>
                        ) : (
                          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.38)]" data-testid={`pib-not-eligible-${item.id}`}>
                            Non contribuisce al tuo PIB
                          </span>
                        )}
                        {attribution.dynamicCvEligible ? (
                          <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.06)] px-1.5 py-0.5 text-[10px] text-[#2F7D55]" data-testid={`cv-eligible-attr-${item.id}`}>
                            Può comparire nel Dynamic CV
                          </span>
                        ) : (
                          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.38)]" data-testid={`cv-not-eligible-attr-${item.id}`}>
                            Non idoneo al Dynamic CV
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[rgba(6,3,43,0.38)] mt-0.5 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{item.cv_eligible_reason}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-[rgba(6,3,43,0.40)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Solo visualizzazione a livello di categoria. Nessun dettaglio sanitario, nome o identificatore personale.
        </p>
      </div>

      {/* ── KORA Link — Future Vision, sezione informativa ───────────────────── */}
      {/* KoraStratoMark = brand canonico con proporzioni fisse. NON usa dati worker. */}
      {/* KoraActivationSignature worker è nella card personale sopra — separata.   */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)] px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.60)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Future Vision · KORA Link
          </h2>
          <BoundaryBadge mode="FUTURE_VISION" variant="light" />
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.40)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          KORA Link è una visione futura per portare esperienze scelte dal worker su supporti NFC/QR.
          Usa lo Strato canonico KORA — non la tua Activation Signature personale.
        </p>

        {/* Mini-thumbnail canonica — brand only, nessun dato worker */}
        <div className="flex items-center gap-3">
          <div
            data-testid="kora-link-card"
            style={{
              background:    '#211F1A',
              borderRadius:  10,
              padding:       '10px 14px',
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           8,
            }}
          >
            <KoraStratoMark variant="negative" size="sm" className="w-16" />
            <p style={{ fontSize: 8, color: 'rgba(246,244,239,0.32)', letterSpacing: '0.06em', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Strato canonico KORA · non personalizzato
            </p>
          </div>
          <p className="text-[11px] text-[rgba(6,3,43,0.38)] leading-relaxed flex-1" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Non disponibile in Foundation Light. In futuro, KORA Link potrà portare il tuo
            impatto su supporti fisici NFC/alluminio — scelti e condivisi da te.
          </p>
        </div>
      </div>

      {/* ── PreviewToLiveNotice ────────────────────────────────────────────────── */}
      <PreviewToLiveNotice
        what="Personal Impact Balance è il bilancio privato delle tue esperienze di attivazione — mai visibile al datore di lavoro."
        preview="I dati mostrati sono costruiti su un profilo sintetico dimostrativo."
        live="Proverranno dalle tue attività realmente verificate tramite la pipeline KORA aziendale."
        privacy="Il tuo datore di lavoro non accede a questo spazio in nessuna modalità."
      />

      {/* ── Synthetic demo notice ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.40)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
        Questa anteprima usa dati sintetici. Personal Impact Balance è una preview del layer personale.
        Non rappresenta account reali, identità reali, wallet, booking, pagamenti o certificazioni attive.
        Il percorso reale richiederà identità worker-owned e consenso (Pilot+).
        <span className="block mt-0.5 font-mono text-[rgba(6,3,43,0.28)]">
          synthetic_demo_data: true · Foundation Light Preview · KORA Index v1.0 · pre_empirical_calibration
        </span>
      </div>
    </div>
  );
}
