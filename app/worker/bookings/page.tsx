// app/worker/bookings/page.tsx
// B-WORKER-3: canonical Bookings & Requests page on /worker.
//
// Migrates the EXISTING, already-fully-real /my-kora/bookings capability
// (real /api/worker/commons/bookings GET/DELETE, real cancel action, real
// status/date rendering) onto the canonical /worker surface with a real,
// requireWorkerUser-gated server wrapper — no new booking feature, no new
// booking states, same data/service authority (services/commons/BookingService.ts).
//
// Access: WORKER only. requireWorkerUser enforced server-side.

import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import { BookingsClient } from './_components/BookingsClient';

export const metadata = { title: 'Prenotazioni & Richieste · KORA' };

export default async function WorkerBookingsPage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/login');

  return <BookingsClient />;
}
