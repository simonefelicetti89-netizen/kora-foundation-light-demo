import { redirect } from 'next/navigation';

export default function DiagnosticsIndexPage() {
  redirect('/admin/platform/diagnostics/live-spine');
}
