// C-07: Reports
export default function Reports() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Reports</h1>
      <p className="text-sm text-slate-500">Libreria report filtrata per ruolo. I report destinati al datore di lavoro non contengono dati individuali dei lavoratori.</p>
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
        La libreria report non è attiva in Foundation Light. La generazione di report filtrata per ruolo si sblocca in una fase futura.
      </div>
    </div>
  );
}
