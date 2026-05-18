import type { BookingRequest, KoraRole } from '@/lib/types';
import { isWorkerRole } from '@/lib/permissions';

export type BookingAction = 'request' | 'confirm' | 'complete' | 'cancel';

export interface IBookingRequestService {
  // Worker-self only — no pricing, no availability engine, no payment path
  getRequests(workerId: string, role: KoraRole): BookingRequest[];
  applyAction(workerId: string, role: KoraRole, serviceId: string, action: BookingAction): BookingRequest | null;
}

export class BookingRequestService implements IBookingRequestService {
  getRequests(_workerId: string, role: KoraRole): BookingRequest[] {
    if (!isWorkerRole(role)) return [];
    return [];
  }

  applyAction(_workerId: string, role: KoraRole, _serviceId: string, _action: BookingAction): BookingRequest | null {
    if (!isWorkerRole(role)) return null;
    return null;
  }
}

export const bookingRequestService = new BookingRequestService();
