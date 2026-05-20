// AD-01: Advisor Review Workspace — Foundation Light Preview
export default function AdvisorDashboard() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Advisor Review Workspace</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            Foundation Light Preview
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Ruolo dedicato alla revisione delle evidenze nel layer metodologico KORA.
        </p>
      </div>

      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-5">
        <p className="text-sm font-semibold text-indigo-800 mb-2">Cosa fa l&apos;Advisor in KORA</p>
        <p className="text-sm text-indigo-700 leading-relaxed">
          L&apos;Advisor supporta la revisione delle evidenze, l&apos;assegnazione dell&apos;Advisor Confidence Stamp,
          l&apos;interpretazione metodologica e il design dei programmi di impatto per le aziende iscritte a KORA.
          Le decisioni di revisione influenzano direttamente il Verification Rate e il Confidence Score
          degli output KORA Index assegnati.
        </p>
        <p className="text-xs text-indigo-600 mt-2">
          Foundation Light mostra il concetto del ruolo Advisor. La coda completa di revisione
          — inclusi gli elementi Evidence assegnati, le decisioni di eleggibilità e il registro delle revisioni —
          sarà disponibile nella fase pilota.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Cosa includerà questo workspace
        </p>
        <div className="space-y-2">
          {[
            'Coda di revisione Evidence assegnata — per azienda, per pillar',
            'Assegnazione Advisor Confidence Stamp (verificato / parziale / non eleggibile)',
            'Supporto all\'interpretazione metodologica per casi limite',
            'Registro di revisione — tutte le decisioni sono tracciate e versioned metodologicamente',
          ].map((item) => (
            <div key={item} className="flex gap-2 text-sm text-slate-600">
              <span className="text-slate-300 shrink-0 mt-0.5">·</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <p className="font-semibold text-slate-600 mb-1">Chiarimento sul perimetro</p>
        Nessuna coda di revisione in produzione attiva · Nessun workflow Evidence reale · Nessuna azione di certificazione ·
        La revisione Advisor non equivale a certificazione aziendale · L&apos;Advisor non ha accesso al PIB individuale né al layer personale del lavoratore.
      </div>
    </div>
  );
}
