import type { LifecycleAuditEvent, KoraUserRole, TenantLifecycleAction, UserLifecycleAction } from '@/lib/types';
import auditData from '@/data/synthetic/lifecycle-audit.json';

const seedEvents = (auditData as { data: LifecycleAuditEvent[] }).data;

// Session-only audit log — appends to seed events during demo session
const sessionLog: LifecycleAuditEvent[] = [];

class LifecycleService {
  getAllEvents(): LifecycleAuditEvent[] {
    return [...seedEvents, ...sessionLog];
  }

  getLifecycleAuditForTenant(companyId: string): LifecycleAuditEvent[] {
    return this.getAllEvents().filter(
      (e) => e.target_type === 'tenant' && (e.target_id.includes(companyId) || e.notes?.includes(companyId)),
    );
  }

  getLifecycleAuditForUser(userId: string): LifecycleAuditEvent[] {
    return this.getAllEvents().filter(
      (e) => e.target_type === 'user' && e.target_id === userId,
    );
  }

  getLifecycleAuditForWorker(workerId: string): LifecycleAuditEvent[] {
    return this.getAllEvents().filter(
      (e) => e.target_type === 'worker' && e.target_id === workerId,
    );
  }

  logLifecycleEvent(
    actorRole: KoraUserRole,
    actorId: string,
    targetType: 'tenant' | 'user' | 'worker',
    targetId: string,
    action: TenantLifecycleAction | UserLifecycleAction,
    reason?: string,
    notes?: string,
  ): LifecycleAuditEvent {
    const event: LifecycleAuditEvent = {
      event_id: `evt-session-${Date.now()}`,
      actor_role: actorRole,
      actor_id: actorId,
      target_type: targetType,
      target_id: targetId,
      action,
      reason,
      timestamp: new Date().toISOString(),
      reversible: action !== 'delete_demo',
      notes: notes ?? 'Demo simulato — nessuna persistenza reale.',
    };
    sessionLog.push(event);
    return event;
  }

  getActionLabel(action: TenantLifecycleAction | UserLifecycleAction): string {
    const labels: Record<string, string> = {
      create_draft:    'Bozza creata',
      activate:        'Attivato',
      suspend:         'Sospeso',
      archive:         'Archiviato',
      restore:         'Ripristinato',
      delete_demo:     'Eliminato (demo)',
      invite:          'Invito inviato',
      activate_demo:   'Accesso demo attivato',
      disable:         'Disabilitato',
      revoke_invite:   'Invito revocato',
      reset_invite:    'Invito rigenerato',
    };
    return labels[action] ?? action;
  }

  isReversible(action: TenantLifecycleAction | UserLifecycleAction): boolean {
    return action !== 'delete_demo';
  }
}

export const lifecycleService = new LifecycleService();
