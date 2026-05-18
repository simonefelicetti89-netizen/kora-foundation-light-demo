// FV-01: Future Vision Overview — static mockup, no backend logic
export default function FutureVision() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Future Vision</h1>
      <p className="text-sm text-slate-500 italic">
        Future Vision / Not Active in Foundation Light — static mockup screens only.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          'KORA Certified',
          'KORA Link (NFC/QR)',
          'KORA Impact Pledge',
          'KORA Value Chain',
          'Territorial Activation Maps',
          'Advisor Certification Academy',
          'Partner Marketplace',
          'Worker Wallet',
          'Benchmarking Marketplace',
        ].map((feature) => (
          <div
            key={feature}
            className="rounded-lg border border-orange-100 bg-orange-50/50 p-4 text-sm text-orange-600 opacity-60"
          >
            <p className="font-medium">{feature}</p>
            <p className="mt-1 text-xs text-orange-400">Future Vision — Not Active</p>
          </div>
        ))}
      </div>
    </div>
  );
}
