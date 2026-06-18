// app/admin/worker-diagnostics/page.tsx
// B169 FASE 5 — consolidated under /admin/platform/diagnostics/worker
import { redirect } from 'next/navigation';
export default function WorkerDiagnosticsRedirect() {
  redirect('/admin/platform/diagnostics/worker');
}
