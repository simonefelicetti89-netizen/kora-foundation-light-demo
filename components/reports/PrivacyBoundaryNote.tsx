export function PrivacyBoundaryNote() {
  const items = [
    'KORA misura l\'organizzazione, non i singoli lavoratori. Il KORA Index è un output company-level.',
    'Il PIB (Personal Impact Balance) è privato del lavoratore — mai visibile al datore di lavoro.',
    'Nessun worker ranking, nessuna sorveglianza, nessun sistema di performance individuale.',
    'Dati di segmento mostrati solo sopra soglia privacy (≥10 lavoratori) — sotto soglia: soppressione obbligatoria.',
    'Sensitive services (salute, supporto psicologico) contribuiscono al KORA Index solo in forma aggregata anonima.',
    'Il Confidence Score è un indicatore di affidabilità dei dati — non è un giudizio sulla performance aziendale.',
    'My KORA (timeline personale, Dynamic Impact CV, bookings, consenso) è completamente separato e inaccessibile ai ruoli datoriali.',
  ];

  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-6 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">I — Perimetro Privacy e Metodologia</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Privacy */}
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 space-y-2">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Privacy garantita</p>
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] text-emerald-800 leading-relaxed">
                <span className="shrink-0 mt-0.5 text-emerald-400">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Methodology */}
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 space-y-2">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Perimetro metodologico</p>
            <div className="space-y-1.5 text-[11px] text-amber-800 leading-relaxed">
              <p>Output di intelligence diagnostica organizzativa — non una certificazione, non un rating regolatorio.</p>
              <p>Metodologia in fase pre-empirical calibration — pesi e soglie raffinati post-Delphi Study e programma pilota.</p>
              <p>Correlazione ≠ causalità su tutte le implicazioni business.</p>
            </div>
          </div>

          <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] p-4 space-y-2">
            <p className="text-[11px] font-bold text-[rgba(6,3,43,0.62)] uppercase tracking-wide">Nota CSR/ESG</p>
            <p className="text-[11px] text-[rgba(6,3,43,0.52)] leading-relaxed">
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
              Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale,
              assurance o reporting obbligatorio.
            </p>
          </div>

          <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] p-4 space-y-1">
            <p className="text-[11px] font-bold text-[rgba(6,3,43,0.52)] uppercase tracking-wide">Label obbligatorie</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {[
                'synthetic_demo_data',
                'pre_empirical_calibration',
                'Foundation Light v0.1',
                'not_live_data',
                'informational_only',
              ].map((tag) => (
                <span key={tag} className="font-mono text-[10px] rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-[rgba(6,3,43,0.52)]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
