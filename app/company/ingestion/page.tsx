// C-03: AI Upload Studio
export default function AIUploadStudio() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">AI Upload Studio</h1>
      <p className="text-sm text-slate-500">Upload and parse source files. AI mapping suggestions use BCM taxonomy classifier — no external LLM.</p>
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-sm text-slate-400">
        AI Upload Studio is not active in Foundation Light. Source file ingestion and BCM mapping simulation unlock in a future phase.
      </div>
    </div>
  );
}
