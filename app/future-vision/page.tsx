// FV-01: Future Vision Overview — static mockup, no backend logic
export default function FutureVision() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Future Vision</h1>
          <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
            Not Active in Foundation Light
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1 italic">
          Future Vision / Not Active in Foundation Light — solo schermate concettuali statiche.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm text-slate-700 leading-relaxed">
          Oltre Foundation Light, KORA si estende dall&apos;intelligence di attivazione aziendale
          verso un livello ecosistemico certificato — connettendo aziende, lavoratori, partner, advisor
          e reti territoriali in un&apos;infrastruttura di impatto umano verificabile.
          Questi moduli si sbloccano progressivamente dopo la calibrazione empirica e la chiusura del pilot.
          Nessuna delle funzionalità seguenti è attiva in Foundation Light.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Moduli strategici post-pilot
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { name: 'KORA Certified', desc: 'Status di intelligence organizzativa certificata' },
            { name: 'KORA Link (NFC/QR)', desc: 'Punti di contatto di attivazione fisico-digitale' },
            { name: 'KORA Impact Pledge', desc: 'Impegni collettivi di livello governance' },
            { name: 'KORA Value Chain', desc: 'Attivazione ecosistemica attraverso reti di fornitura' },
            { name: 'Mappe di Attivazione Territoriale', desc: 'Layer di intelligence di impatto a livello distrettuale' },
            { name: 'Advisor Certification Academy', desc: 'Percorso di certificazione formale della metodologia' },
            { name: 'Partner Marketplace', desc: 'Scoperta verificata di partner e servizi — nessuna esecuzione pagamento' },
            { name: 'Worker Wallet', desc: 'Portfolio di impatto verificato portabile' },
            { name: 'Benchmarking Marketplace', desc: 'Scambio di intelligence calibrata cross-settore' },
          ].map((feature) => (
            <div
              key={feature.name}
              className="rounded-lg border border-orange-100 bg-orange-50/50 p-4 opacity-60"
            >
              <p className="text-sm font-semibold text-orange-700">{feature.name}</p>
              <p className="mt-1 text-xs text-orange-500">{feature.desc}</p>
              <p className="mt-2 text-[10px] text-orange-400 font-medium uppercase tracking-wide">
                Future Vision — Non Attivo
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
