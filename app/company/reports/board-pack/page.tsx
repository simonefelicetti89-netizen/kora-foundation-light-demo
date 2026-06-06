// C-07-BP: Board Pack Preview — DEPRECATED. Redirects to canonical Decision Pack.
// B80-B: static hardcoded page replaced by /api/company/decision-pack (dynamic, tenant-aware).
// This route is preserved for graceful redirect only — no content renders here.

import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Board Pack — KORA Foundation Light',
};

export default function BoardPackPage() {
  redirect('/api/company/decision-pack');
}
