'use client';
// W-01: My KORA Home — spazio personale del lavoratore.
// Scopo: rispondere a 'come sta crescendo la mia attivazione e cosa posso fare oggi?'
// Il PIB™ è privato — mai visibile al datore di lavoro. N≥10 per ogni aggregato aziendale.
// Dati sintetici per-persona — Foundation Light v0.1.
//
// B81-B route classification: PREVIEW
// Current: data from MyKoraPreviewService (synthetic persona fixtures).
//          Session from WorkerSessionProvider (demo-state, no live JWT).
// Pilot+:  WorkerSessionProvider resolves LIVE session from Supabase worker JWT.
//          Data from MyKoraService (real Supabase per-worker UEF records + PIB).
//          No component changes required — only provider and service swap.

import { useState } from 'react';
import Link from 'next/link';
import { useRole, useScenario, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerAttributionService } from '@/services/worker-attribution/WorkerAttributionService';
import { AttributionMatrix } from '@/components/my-kora/AttributionMatrix';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { PreviewToLiveNotice } from '@/components/my-kora/PreviewToLiveNotice';
import { cn } from '@/lib/utils';

// ─── Pillar styling ───────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  LIFE: 'bg-[#C76F3D]', GROWTH: 'bg-[#2F7D55]', CONNECTION: 'bg-[#D99767]',
  IMPACT: 'bg-[#2F7D55]', LEGACY: 'bg-[#8A7562]',
};

const PILLAR_LIGHT: Record<string, string> = {
  LIFE:       'bg-[#C76F3D]/10 text-[#C76F3D] border-pillar-life/30',
  GROWTH:     'bg-[#2F7D55]/10 text-[#2F7D55] border-pillar-growth/30',
  CONNECTION: 'bg-[#D99767]/10 text-[#D99767] border-pillar-connection/30',
  IMPACT:     'bg-[rgba(199,111,61,0.10)] text-[#C76F3D] border-[rgba(199,111,61,0.25)]',
  LEGACY:     'bg-[#8A7562]/10 text-[#8A7562] border-pillar-legacy/30',
};

const PILLAR_TEXT: Record<string, string> = {
  LIFE:       'text-[#C76F3D]',
  GROWTH:     'text-[#2F7D55]',
  CONNECTION: 'text-[#D99767]',
  IMPACT:     'text-[#06032B]',
  LEGACY:     'text-[#8A7562]',
};

const TREND_ICON: Record<string, string> = { up: '↑', stable: '→', down: '↓' };
const TREND_COLOR: Record<string, string> = { up: 'text-[#2F7D55]', stable: 'text-[rgba(6,3,43,0.42)]', down: 'text-[#9E3B2F]' };

const VERIF_LABEL: Record<string, string> = {
  verified: 'Verificato', partial: 'Parziale', self_declared: 'Autodichiarato',
};
const VERIF_COLOR: Record<string, string> = {
  verified: 'text-[#2F7D55]', partial: 'text-[#D99A2B]', self_declared: 'text-[rgba(6,3,43,0.42)]',
};

// ─── KORA Link / QR stepper steps ────────────────────────────────────────────

const KORA_LINK_STEPS = [
  { label: 'Azione reale',            desc: 'Partecipi a un evento, corso o iniziativa verificabile.' },
  { label: 'QR / KORA Link',         desc: 'Scansioni il QR o usi KORA Link — solo simulazione demo.' },
  { label: 'Evidenza generata',       desc: "Viene generata un'evidenza candidata con metadati di categoria." },
  { label: 'UEF candidate',          desc: 'Il record diventa un UEF candidate — pipeline di validazione avviata.' },
  { label: 'Review',                  desc: 'Advisor o partner conferma la categoria e il pillar assegnato.' },
  { label: 'Impact Units',           desc: 'Se approvato, genera IU calcolate nel tuo PIB privato.' },
  { label: 'PIB privato aggiornato', desc: 'Il tuo Personal Impact Balance si aggiorna — visibile solo a te.' },
  { label: 'Aggregazione aziendale', desc: "Contribuisce all'aggregato aziendale solo sopra soglia privacy — in forma anonima." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

// W-01: My KORA Home
export default function MyKoraHome() {
  const [koraLinkStep, setKoraLinkStep] = useState(0);
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const { activePersona } = usePersona();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em", lineHeight: 1.06, color: "#06032B" }}>My KORA</h1>
          <p className="text-sm text-[rgba(6,3,43,0.52)]">Spazio personale del lavoratore</p>
        </div>
        <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-6 text-center">
          <p className="text-sm font-semibold text-[#9E3B2F]">Accesso Limitato</p>
          <p className="mt-1 text-xs text-[rgba(158,59,47,0.90)] max-w-sm mx-auto">
            My KORA è uno spazio privato del lavoratore. I ruoli datore di lavoro e admin non possono accedere
            ai dati individuali. Il datore di lavoro vede l&apos;organizzazione, non il singolo.
          </p>
          <p className="mt-3 text-xs font-mono text-[rgba(158,59,47,0.55)]">Ruolo attivo: {activeRole}</p>
          <p className="mt-1 text-xs text-[rgba(158,59,47,0.55)]">Passa al ruolo WORKER per visualizzare questo spazio.</p>
        </div>
      </div>
    );
  }

  const personaId = activePersona?.id ?? 'persona-elena-m';
  const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, activeScenario);
  const workerCompanyId = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const aggregate = scoringSimulatorService.getCompanyAggregate(workerCompanyId, activeScenario);

  if (!preview) return null;

  const strongestPillar = preview.pib_light.pillar_breakdown.reduce(
    (a, b) => (b.score > a.score ? b : a),
    preview.pib_light.pillar_breakdown[0],
  );

  const shareableCount = myKoraPreviewService.getDynamicCvPreview(personaId).items.filter((i) => i.shareable).length;

  return (
    <div className="space-y-6">

      {/* ── Header — Task 2: page identity is "My KORA", not the PIB score ── */}
      <div>
        <BoundaryBadge mode="PREVIEW" variant="light" suffix="· dati sintetici" style={{ marginBottom: 10 }} />
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: '#06032B' }}>
          My KORA
        </h1>
        <p style={{ fontSize: '13.5px', color: 'rgba(6,3,43,0.52)', marginTop: 4, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Il tuo spazio personale · {preview.persona_label}
        </p>
      </div>

      {/* ── Entry framing block — Task 1: worker must understand My KORA in ≤60s ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
        <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)] mb-2">Questo spazio appartiene a te.</p>
        <ul className="space-y-1.5">
          {([
            'Il tuo datore di lavoro non può vedere il tuo PIB individuale.',
            'Il tuo datore di lavoro non può vedere il tuo Dynamic CV o la tua timeline personale.',
            'I dati in questa anteprima sono sintetici — dimostrativi, non identità reale.',
            'In Pilot+, My KORA si aggiornerà con le tue attività realmente verificate.',
          ] as string[]).map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[rgba(6,3,43,0.72)]">
              <span className="text-[#C76F3D] shrink-0 mt-0.5">—</span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* ── PreviewToLiveNotice — Task 3 ── */}
      <PreviewToLiveNotice
        what="My KORA è il tuo spazio personale KORA — privato, non accessibile al datore di lavoro."
        preview="Il PIB e la timeline mostrati sono costruiti su un profilo sintetico dimostrativo."
        live="Proverranno dalle tue attività realmente verificate tramite la pipeline KORA aziendale."
        privacy="Il tuo datore di lavoro non accede a questo spazio in nessuna modalità."
      />

      {/* ── Core privacy statement — non-suppressible ── */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] p-4">
        <p className="text-sm font-bold text-[#06032B]">
          Il dato è mio. Posso capirlo, proteggerlo, usarlo e trasformarlo in valore personale.
        </p>
        <p className="text-xs text-[rgba(6,3,43,0.72)] mt-1.5 leading-relaxed">
          Il datore di lavoro non vede il tuo PIB individuale, la tua timeline personale, le tue scelte
          o il tuo Dynamic Impact CV. Solo dati aggregati e anonimizzati — sopra soglia privacy —
          contribuiscono al KORA Index aziendale.
        </p>
        <p className="text-[11px] text-[rgba(6,3,43,0.52)] mt-1.5 italic">
          My KORA non è performance management. Non è una classifica. Non è accessibile al datore di lavoro.
          KORA misura l&apos;organizzazione, non sorveglia il lavoratore.
        </p>
      </div>

      {/* ── Hero metric cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">PIB privato</p>
          <div className="flex items-end gap-1 mt-1">
            <span className="text-2xl font-bold text-[rgba(6,3,43,0.90)]">{preview.pib_light.overall_index}</span>
            <span className="text-sm text-[rgba(6,3,43,0.40)] pb-0.5">/ 100</span>
          </div>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Personal Impact Balance</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-1 italic">Visibile solo nel tuo layer personale.</p>
        </div>

        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Pillar più forte</p>
          <p className={cn('text-2xl font-bold mt-1', PILLAR_TEXT[strongestPillar?.pillar ?? ''] ?? 'text-[rgba(6,3,43,0.90)]')}>
            {strongestPillar?.pillar ?? '—'}
          </p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">score {strongestPillar?.score ?? 0}</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-1 italic">Pillar con maggiore IU accumulati.</p>
        </div>

        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Opportunità</p>
          <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)] mt-1">{preview.opportunities.length}</p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">iniziative e servizi</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-1 italic">Suggeriti per te — visibili solo a te.</p>
        </div>

        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Elementi condivisibili</p>
          <p className="text-2xl font-bold text-[#C76F3D] mt-1">{shareableCount}</p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Dynamic Impact CV</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-1 italic">Badge / esperienze esportabili solo se decidi tu.</p>
        </div>
      </div>

      {/* ── Il tuo PIB privato — derivazione IU sintetici ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Il tuo PIB privato</h2>
          <div className="flex items-center gap-2">
            <span className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-2 py-0.5 text-xs font-mono text-[#C76F3D]">
              privato-lavoratore
            </span>
            <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-2 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.42)]">
              IU sintetici pre-computati
            </span>
          </div>
        </div>

        {/* PIB plain-language explanation — Task 7 */}
        <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed">
          Il Personal Impact Balance (PIB) è la stima della tua attivazione nel tempo — quante iniziative hai
          partecipato, con quale intensità verificata, distribuite tra i pillar KORA. Non è un voto.
          Non è una classifica. Non è visibile al tuo datore di lavoro.
        </p>

        {/* PIB derivation disclosure — non-suppressible per B70-B */}
        <div className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.06)] px-3 py-2">
          <p className="text-[10px] font-semibold text-[#8A5A00]">Dato sintetico · derivato da IU computati</p>
          <p className="text-[10px] text-[#8A5A00] mt-0.5 leading-relaxed">
            {preview.pib_light.pib_derivation_note}
          </p>
          <p className="text-[10px] text-[rgba(6,3,43,0.42)] mt-1 italic">
            Il PIB reale richiederà identità worker-owned e consenso (Pilot+) — KORA Methodology v0.1 pre-calibrazione empirica.
          </p>
        </div>

        <p className="text-xs text-[rgba(6,3,43,0.40)]">
          {preview.pib_light.active_pillars} pillar attivi · {preview.pib_light.total_events} eventi · {preview.pib_light.period}
        </p>

        <div className="divide-y divide-[rgba(6,3,43,0.05)]">
          {preview.pib_light.pillar_breakdown.map((p) => (
            <div key={p.pillar} className="py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-mono font-semibold', PILLAR_TEXT[p.pillar] ?? 'text-[rgba(6,3,43,0.62)]')}>
                    {p.pillar}
                  </span>
                  <span className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.40)]">
                    Privato
                  </span>
                  {p.iu_total > 0 && (
                    <span className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.38)]">
                      {p.iu_total.toFixed(2)} IU
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs font-mono text-[rgba(6,3,43,0.52)] shrink-0">
                  {p.score}
                  <span className={cn('text-xs', TREND_COLOR[p.trend])}>
                    {TREND_ICON[p.trend]}
                  </span>
                  <span className="text-[rgba(6,3,43,0.28)] ml-1">{p.event_count} eventi</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[rgba(6,3,43,0.05)] mb-1">
                <div
                  className={cn('h-1.5 rounded-full', PILLAR_COLORS[p.pillar] ?? 'bg-[rgba(6,3,43,0.35)]')}
                  style={{ width: `${p.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[rgba(6,3,43,0.40)] border-t border-[rgba(6,3,43,0.05)] pt-2 leading-relaxed">
          Questi valori non vengono mostrati all&apos;azienda. L&apos;azienda vede solo aggregati sopra soglia
          privacy (≥10 lavoratori). Il PIB è un indicatore personale — non un voto, non una classifica,
          non un parametro di performance.
        </p>
      </div>

      {/* ── IU plain-language explanation — Task 6 */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)] px-4 py-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)] mb-1">Cosa sono gli Impact Unit (IU)?</p>
        <p className="text-[11px] text-[rgba(6,3,43,0.58)] leading-relaxed">
          Gli Impact Unit non servono per valutarti o confrontarti con altri lavoratori. Ogni partecipazione
          verificata produce IU che contribuiscono all&apos;attivazione complessiva dell&apos;organizzazione —
          mai come classifica individuale. Gli IU mostrati in questa anteprima sono calcolati su dati sintetici.
          In Pilot+, deriveranno dalle tue attività realmente verificate.
        </p>
      </div>

      {/* ── "Quando un Impact Unit diventa tuo?" — Task 4 — B85-B ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-4" data-testid="iu-educational-panel">
        <div>
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Quando un Impact Unit diventa tuo?</h2>
          <p className="text-[11px] text-[rgba(6,3,43,0.40)] mt-0.5">
            In Foundation Light vedi IU sintetici. In Pilot+, i tuoi IU reali seguono questo percorso.
          </p>
        </div>
        <div className="space-y-2">
          {([
            {
              step: '1',
              label: "L'attività deve essere idonea.",
              desc: 'Non tutte le attività generano Impact Units. Solo quelle che producono attivazione reale — verificabile, volontaria, non obbligatoria per legge o contratto.',
            },
            {
              step: '2',
              label: 'Deve essere verificata.',
              desc: "Una verifica esterna — da LMS, welfare provider, partner KORA o advisor — è necessaria. L'autodichiarazione non è sufficiente da sola.",
            },
            {
              step: '3',
              label: 'Non può essere solo conformità o sostegno economico.',
              desc: "La sicurezza obbligatoria, i voucher e i fringe benefit non generano IU. La baseline non è impatto. KORA misura ciò che va oltre il minimo dovuto.",
            },
            {
              step: '4',
              label: 'Nel programma Pilot+ verrà associata al tuo profilo.',
              desc: 'Solo in Pilot+, con identità worker-owned e consenso, gli IU vengono collegati al tuo PIB personale. In Foundation Light sono sintetici.',
            },
          ] as { step: string; label: string; desc: string }[]).map(({ step, label, desc }) => (
            <div key={step} className="flex items-start gap-3 rounded-md border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] p-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#C76F3D] flex items-center justify-center text-[10px] font-bold text-white mt-0.5">
                {step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[rgba(6,3,43,0.82)]">{label}</p>
                <p className="text-[11px] text-[rgba(6,3,43,0.52)] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Task 10 — Trust copy — non-suppressible */}
        <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2.5">
          <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed italic">
            Non tutte le attività diventano parte del tuo percorso personale.
            KORA considera solo attività idonee e verificabili.
          </p>
        </div>

        {/* Task 9 — Attribution Matrix */}
        <AttributionMatrix />
      </div>

      {/* ── Personal impact timeline — con valori IU ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Timeline personale</h2>
          <span className="text-xs text-[rgba(6,3,43,0.40)] font-mono">privata · IU sintetici</span>
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mb-3 leading-relaxed">
          La timeline personale appartiene al lavoratore. Può contribuire agli aggregati aziendali solo in
          forma anonima e sopra soglia privacy. I valori IU mostrati sono derivati dalla formula
          KORA Methodology v0.1 su dati sintetici.
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {preview.timeline.map((item) => {
              // B85-B: derive attribution class for explainability labels
              const attribution = workerAttributionService.classify({
                verification_status: item.verification_status,
                source_type: item.source_type,
              });
              return (
                <div key={item.id} className="px-4 py-3 hover:bg-[rgba(6,3,43,0.03)]">
                  <div className="flex items-start gap-3">
                    <div className="text-xs font-mono text-[rgba(6,3,43,0.40)] w-24 shrink-0 mt-0.5">{item.date}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[rgba(6,3,43,0.90)]">{item.category}</p>

                      {/* Row 1: pillar · verification · IU · Task 2 attribution badge */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono',
                          PILLAR_LIGHT[item.pillar] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
                        )}>
                          {item.pillar}
                        </span>
                        <span className={cn('text-[10px] font-medium', VERIF_COLOR[item.verification_status])}>
                          {VERIF_LABEL[item.verification_status] ?? item.verification_status}
                        </span>
                        <span className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.48)]">
                          {item.iu_value.toFixed(2)} IU
                        </span>
                        {/* Task 2 — Attribution class badge */}
                        <span
                          className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.52)]"
                          data-testid={`attribution-badge-${item.id}`}
                        >
                          Classe {attribution.code}
                        </span>
                        <span className="text-[10px] text-[rgba(6,3,43,0.38)]">{attribution.label}</span>
                      </div>

                      {/* Row 2: privacy · Task 5 PIB eligibility · Task 6 Dynamic CV eligibility */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.40)]">
                          Privato
                        </span>

                        {/* Task 5 — PIB eligibility */}
                        {attribution.workerPibEligible ? (
                          <span
                            className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.06)] px-1.5 py-0.5 text-[10px] text-[#2F7D55]"
                            data-testid={`pib-eligible-${item.id}`}
                          >
                            Può contribuire al tuo PIB
                          </span>
                        ) : (
                          <span
                            className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.38)]"
                            data-testid={`pib-not-eligible-${item.id}`}
                          >
                            Non contribuisce al tuo PIB
                          </span>
                        )}

                        {/* Task 6 — Dynamic CV eligibility (attribution-derived) */}
                        {attribution.dynamicCvEligible ? (
                          <span
                            className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.06)] px-1.5 py-0.5 text-[10px] text-[#2F7D55]"
                            data-testid={`cv-eligible-attr-${item.id}`}
                          >
                            Può comparire nel Dynamic CV
                          </span>
                        ) : (
                          <span
                            className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.38)]"
                            data-testid={`cv-not-eligible-attr-${item.id}`}
                          >
                            Non idoneo al Dynamic CV
                          </span>
                        )}
                      </div>

                      {/* Existing detail: CV eligible reason */}
                      <p className="text-[10px] text-[rgba(6,3,43,0.38)] mt-0.5 leading-relaxed">
                        {item.cv_eligible_reason}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-[rgba(6,3,43,0.40)]">
          Solo visualizzazione a livello di categoria. Nessun dettaglio sanitario, nome o identificatore personale.
          Valori IU = NM × BC × CQ × EV × CF × AGF (pre-computati, sintetici).
        </p>
      </div>

      {/* ── Company KORA Snapshot — aggregate only ── */}
      {aggregate && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Company KORA Snapshot</h2>
            <span className="text-xs text-[rgba(6,3,43,0.40)] font-mono">aggregato · non individuale</span>
          </div>
          {/* Company Snapshot orientation — Task 4 */}
          <p className="text-xs text-[rgba(6,3,43,0.52)] mb-3 leading-relaxed">
            Questi risultati descrivono la tua organizzazione nel suo insieme. Non mostrano i tuoi dati
            individuali — i tuoi contributi entrano solo come aggregato anonimo sopra soglia privacy.
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Activation Rate</p>
              <p className="text-lg font-bold text-[rgba(6,3,43,0.90)] mt-0.5">
                {(aggregate.activation_rate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Verification Rate</p>
              <p className="text-lg font-bold text-[rgba(6,3,43,0.90)] mt-0.5">
                {(aggregate.verification_rate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Lavoratori Attivi</p>
              <p className="text-lg font-bold text-[rgba(6,3,43,0.90)] mt-0.5">
                {aggregate.active_worker_count}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-[rgba(6,3,43,0.40)]">
            Solo dati aggregati aziendali — nessun dato individuale è mostrato o condiviso.
          </p>
        </div>
      )}

      {/* ── KORA Link / QR Action Preview — stepper ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">KORA Link / QR</h2>
              {/* Task 5: KORA Link is FUTURE_VISION — replace insufficient "Demo" badge */}
              <BoundaryBadge mode="FUTURE_VISION" variant="light" />
            </div>
            <p className="text-xs font-medium text-[rgba(6,3,43,0.60)] mb-1">
              Non disponibile in Foundation Light.
            </p>
            <p className="text-xs text-[rgba(6,3,43,0.40)] leading-relaxed">
              La simulazione qui sotto mostra come un&apos;azione reale diventerebbe evidenza, UEF candidate,
              Impact Units e aggiornamento del PIB privato — in Pilot+, quando KORA Link sarà operativo.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {KORA_LINK_STEPS.map((step, i) => {
            const stepNum = i + 1;
            const isComplete = koraLinkStep >= stepNum;
            return (
              <div
                key={step.label}
                className={cn(
                  'flex items-start gap-3 rounded-md border p-2.5 transition-colors',
                  isComplete ? 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.10)]' : 'border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]',
                )}
              >
                <span className={cn(
                  'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5',
                  isComplete ? 'bg-[#2F7D55] text-[#06032B]' : 'bg-[rgba(6,3,43,0.12)] text-[rgba(6,3,43,0.52)]',
                )}>
                  {isComplete ? '✓' : stepNum}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold', isComplete ? 'text-[#06032B]' : 'text-[rgba(6,3,43,0.62)]')}>
                    {step.label}
                  </p>
                  <p className={cn('text-[10px] leading-snug', isComplete ? 'text-[#06032B]/70' : 'text-[rgba(6,3,43,0.40)]')}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pt-1">
          {koraLinkStep < KORA_LINK_STEPS.length ? (
            <button
              onClick={() => setKoraLinkStep((s) => s + 1)}
              className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-3 py-1.5 text-xs font-semibold text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.06)] transition-colors"
            >
              {koraLinkStep === 0
                ? 'Simula azione — demo'
                : `Prossimo step (${koraLinkStep + 1}/${KORA_LINK_STEPS.length})`}
            </button>
          ) : (
            <button
              onClick={() => setKoraLinkStep(0)}
              className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.52)] hover:bg-[rgba(6,3,43,0.05)] transition-colors"
            >
              Ricomincia simulazione
            </button>
          )}
          <span className="text-[10px] text-[rgba(6,3,43,0.40)] italic">
            Simulazione locale. Nessun QR/NFC reale, nessuna identità reale, nessuna scrittura su backend.
          </span>
        </div>
      </div>

      {/* ── Worker trust explainer ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[rgba(6,3,43,0.78)]">Cosa vede l&apos;azienda?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4">
            <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)] mb-2">L&apos;azienda VEDE:</p>
            <ul className="space-y-1.5">
              {[
                'Aggregati sopra soglia privacy (≥10 lavoratori)',
                'KORA Index aziendale (10 componenti)',
                'Activation Debt (stima aggregata)',
                'Pillar coverage organizzativa',
                'Trend organizzativi e report aggregati',
                'Raccomandazioni di investimento',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-[rgba(6,3,43,0.62)]">
                  <span className="text-[rgba(6,3,43,0.40)] shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-4">
            <p className="text-xs font-semibold text-[#9E3B2F] mb-2">L&apos;azienda NON VEDE:</p>
            <ul className="space-y-1.5">
              {[
                'Il tuo PIB individuale',
                'La tua timeline personale',
                'Le tue scelte individuali',
                'Il tuo Dynamic Impact CV',
                'I singoli eventi personali',
                'Il tuo profilo lavoratore',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-[#9E3B2F]">
                  <span className="text-[rgba(158,59,47,0.55)] shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] font-semibold text-[#9E3B2F] italic">
              Il datore di lavoro vede l&apos;organizzazione, non te.
            </p>
          </div>
        </div>
      </div>

      {/* ── Future Vision: KORA Activation Community ── */}
      <div className="rounded-lg border border-kora-violet/20 bg-kora-violet/5 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-xs font-semibold text-[#C76F3D]">Opportunità dalla KORA Activation Community</p>
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.05)] px-1.5 py-0.5 text-[10px] font-semibold text-[rgba(6,3,43,0.52)]">
            Future Vision / Non attivo in Foundation Light
          </span>
        </div>
        <ul className="space-y-1">
          {[
            'Iniziative territoriali condivise tra più aziende',
            'Opportunità partner verificate con evidenza collettiva',
            'Contributo aggregato a community — worker-controlled',
            'Badge collettivi portabili nel Dynamic Impact CV',
          ].map((item) => (
            <li key={item} className="flex gap-1.5 text-xs text-[#C76F3D]/80">
              <span className="text-[#C76F3D]/40 shrink-0 mt-0.5">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── KORA Commons entry ── */}
      <div className="rounded-lg border border-[rgba(74,127,224,0.18)] bg-[rgba(74,127,224,0.05)] p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-sm font-semibold text-[#06032B]">KORA Commons — Attivazione condivisa</p>
          <span className="rounded border border-[rgba(74,127,224,0.22)] bg-[rgba(74,127,224,0.10)] px-1.5 py-0.5 text-[9px] font-bold text-[rgba(74,127,224,0.85)] uppercase tracking-[0.08em]">
            PREVIEW
          </span>
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.55)] leading-relaxed mb-3">
          Scopri opportunità di attivazione aperte dalla rete KORA — formazione, volontariato, mentoring,
          comunità. <strong className="text-[rgba(6,3,43,0.70)]">KORA Commons non è un social network.</strong>{' '}
          I tuoi dati rimangono privati.
        </p>
        <Link
          href="/commons"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#06032B] px-3.5 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
          style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', textDecoration: 'none' }}
        >
          Esplora Commons →
        </Link>
      </div>

      {/* ── Navigation cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link href="/my-kora/dynamic-cv" className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 hover:bg-[rgba(6,3,43,0.03)] transition-colors">
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Dynamic Impact CV</p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Il tuo portfolio di impatto verificato</p>
        </Link>
        <Link href="/my-kora/privacy" className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 hover:bg-[rgba(6,3,43,0.03)] transition-colors">
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Privacy & Sharing</p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Consent & Sharing Vault</p>
        </Link>
        <Link href="/my-kora/opportunities" className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] p-4 hover:bg-[rgba(6,3,43,0.06)] transition-colors">
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.72)]">Opportunità</p>
          <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">Iniziative e servizi suggeriti per te</p>
        </Link>
      </div>

      {/* ── Synthetic demo notice ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.40)] leading-relaxed">
        Questa anteprima usa dati sintetici. My KORA è una preview del layer personale.
        Non rappresenta account reali, identità reali, wallet, booking, pagamenti o certificazioni attive.
        Il PIB reale richiederà identità worker-owned e consenso (Pilot+).
        <span className="block mt-0.5 font-mono text-[rgba(6,3,43,0.28)]">
          synthetic_demo_data: true · Foundation Light Preview · KORA Methodology v0.1 · pre_empirical_calibration
        </span>
      </div>
    </div>
  );
}
