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
          Future Vision / Not Active in Foundation Light — static concept screens only.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm text-slate-700 leading-relaxed">
          Beyond Foundation Light, KORA extends from company-level activation intelligence
          into a certified ecosystem layer — connecting companies, workers, partners, advisors
          and territorial networks into a verifiable human impact infrastructure.
          These modules unlock progressively after empirical calibration and pilot closure.
          None of the features below are active in Foundation Light.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Post-pilot strategic modules
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { name: 'KORA Certified', desc: 'Certified organizational intelligence status' },
            { name: 'KORA Link (NFC/QR)', desc: 'Physical-digital activation touchpoints' },
            { name: 'KORA Impact Pledge', desc: 'Governance-grade collective commitments' },
            { name: 'KORA Value Chain', desc: 'Ecosystem activation across supply networks' },
            { name: 'Territorial Activation Maps', desc: 'District-level impact intelligence layer' },
            { name: 'Advisor Certification Academy', desc: 'Formal methodology certification track' },
            { name: 'Partner Marketplace', desc: 'Verified partner and service discovery — no payment execution' },
            { name: 'Worker Wallet', desc: 'Portable verified impact portfolio' },
            { name: 'Benchmarking Marketplace', desc: 'Cross-sector calibrated intelligence exchange' },
          ].map((feature) => (
            <div
              key={feature.name}
              className="rounded-lg border border-orange-100 bg-orange-50/50 p-4 opacity-60"
            >
              <p className="text-sm font-semibold text-orange-700">{feature.name}</p>
              <p className="mt-1 text-xs text-orange-500">{feature.desc}</p>
              <p className="mt-2 text-[10px] text-orange-400 font-medium uppercase tracking-wide">
                Future Vision — Not Active
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
