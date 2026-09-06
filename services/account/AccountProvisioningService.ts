// B-TRUTH AccountProvisioningService Pipeline Role Migration (2026-09-06):
// this service used to mix two responsibilities — (1) pipeline/admin
// provisioning status for the B95-B Pilot Lifecycle orchestrator, and (2)
// My KORA/session identity resolution for the worker-preview surface. Only
// (1) has been migrated to canonical Supabase Auth state (see
// lib/live/account-provisioning-status-view.ts); getAccountsForCompany(),
// its sole pipeline-only method (was called by
// app/admin/pipeline/_components/PilotLifecycleClient.tsx, real caller
// count 1), has been removed accordingly.
//
// B-WORKER final cleanup (2026-09-06): getCurrentDemoUser() — the method
// this comment used to describe as "the sole remaining real caller" via
// app/my-kora/page.tsx's session-identity resolution — lost that caller
// earlier in the B-WORKER workstream (CC-00 Final Scoring Canonicalization
// removed the accountProvisioningService import from app/my-kora/page.tsx),
// leaving it zero-caller. Verified fresh and removed below. The remaining
// methods are unrelated, pre-existing, zero-caller responsibilities — out
// of this cleanup's narrow scope, not proven dead individually, so left
// untouched (no opportunistic cleanup). The synthetic seed
// (data/synthetic/user-accounts.json) is still required by those methods.
import type {
  KoraUserAccount,
  KoraUserRole,
  KoraAccountStatus,
  KoraInvitationStatus,
  CompanyAdminProvisioningDraft,
} from '@/lib/types';
import accountsData from '@/data/synthetic/user-accounts.json';

const records = (accountsData as { data: KoraUserAccount[] }).data;

const ADMIN_ROLES: KoraUserRole[] = ['KORA_ADMIN'];
const COMPANY_ROLES: KoraUserRole[] = ['COMPANY_ADMIN'];

const DEFAULT_VISIBLE_SECTIONS: Record<KoraUserRole, string[]> = {
  KORA_ADMIN:    ['all'],
  COMPANY_ADMIN: ['executive-cockpit', 'kora-index', 'reports', 'financial', 'pillars', 'activation', 'contribution', 'profile'],
  WORKER:        ['my-kora', 'pib-private', 'dynamic-cv', 'privacy', 'opportunities'],
  PARTNER:       ['partner'],
  ADVISOR:       ['advisor', 'company-readonly'],
};

class AccountProvisioningService {
  getAccountsForTenant(tenantId: string): KoraUserAccount[] {
    return records.filter((u) => u.tenant_id === tenantId);
  }

  getKoraStaffAccounts(): KoraUserAccount[] {
    return records.filter((u) => (ADMIN_ROLES as KoraUserRole[]).includes(u.role));
  }

  getWorkerAccountsForCompany(companyId: string): KoraUserAccount[] {
    return records.filter((u) => u.company_id === companyId && u.role === 'WORKER');
  }

  getCompanyAdmins(companyId: string): KoraUserAccount[] {
    return records.filter((u) => u.company_id === companyId && u.role === 'COMPANY_ADMIN');
  }

  getPrimaryCompanyAdmin(companyId: string): KoraUserAccount | null {
    return this.getCompanyAdmins(companyId).find((u) => u.account_status === 'active_demo') ?? null;
  }

  createCompanyUserDraft(
    companyId: string,
    tenantId: string,
    input: {
      admin_name: string;
      admin_email: string;
      admin_role?: KoraUserRole;
      password_setup_mode?: CompanyAdminProvisioningDraft['password_setup_mode'];
      visible_sections?: string[];
    },
  ): CompanyAdminProvisioningDraft {
    const role = input.admin_role ?? 'COMPANY_ADMIN';
    return {
      provisioning_id: `prov-${Date.now()}`,
      tenant_id: tenantId,
      company_id: companyId,
      admin_name: input.admin_name,
      admin_email: input.admin_email,
      admin_role: role,
      access_scope: 'company_scoped',
      invitation_status: 'not_sent',
      default_route: '/company',
      visible_sections: input.visible_sections ?? DEFAULT_VISIBLE_SECTIONS[role] ?? [],
      hidden_sections: [
        'company-setup', 'onboarding-studio', 'workforce-baseline-upload',
        'ai-ingestion', 'uef-review', 'scoring-run', 'decision-pack-generation',
      ],
      password_setup_mode: input.password_setup_mode ?? 'invite_link',
      security_notes: 'Nessuna password in chiaro salvata. Demo-only. Invito link non reale.',
      production_ready: false,
      demo_only: true,
    };
  }

  createCompanyAdminDraft(
    companyId: string,
    tenantId: string,
    input: {
      admin_name: string;
      admin_email: string;
      admin_role?: KoraUserRole;
      password_setup_mode?: CompanyAdminProvisioningDraft['password_setup_mode'];
      visible_sections?: string[];
    },
  ): CompanyAdminProvisioningDraft {
    const role = input.admin_role ?? 'COMPANY_ADMIN';
    return {
      provisioning_id: `prov-${Date.now()}`,
      tenant_id: tenantId,
      company_id: companyId,
      admin_name: input.admin_name,
      admin_email: input.admin_email,
      admin_role: role,
      access_scope: 'company_scoped',
      invitation_status: 'not_sent',
      default_route: '/company',
      visible_sections: input.visible_sections ?? DEFAULT_VISIBLE_SECTIONS[role] ?? [],
      hidden_sections: [
        'company-setup', 'onboarding-studio', 'workforce-baseline-upload',
        'ai-ingestion', 'uef-review', 'scoring-run', 'decision-pack-generation',
      ],
      password_setup_mode: input.password_setup_mode ?? 'invite_link',
      security_notes: 'Nessuna password in chiaro salvata. Demo-only. Invito link non reale.',
      production_ready: false,
      demo_only: true,
    };
  }

  inviteCompanyUser(userId: string): { success: boolean; note: string } {
    return {
      success: true,
      note: `Demo: invito simulato per ${userId}. Nessuna email reale inviata. In produzione richiede backend auth provider.`,
    };
  }

  revokeInvite(userId: string): { success: boolean; note: string } {
    return {
      success: true,
      note: `Demo: invito revocato per ${userId} (simulato).`,
    };
  }

  resetInvite(userId: string): { success: boolean; note: string } {
    return {
      success: true,
      note: `Demo: nuovo invito generato per ${userId} (simulato).`,
    };
  }

  disableUser(userId: string): { success: boolean; note: string } {
    return {
      success: true,
      note: `Demo: utente ${userId} disabilitato (simulato).`,
    };
  }

  suspendUser(userId: string): { success: boolean; note: string } {
    return {
      success: true,
      note: `Demo: utente ${userId} sospeso (simulato).`,
    };
  }

  deleteDemoUser(userId: string): { success: boolean; note: string } {
    const user = records.find((u) => u.user_id === userId);
    if (!user) return { success: false, note: 'Utente non trovato.' };
    if (!['draft', 'invited'].includes(user.account_status)) {
      return { success: false, note: 'Solo utenti in stato draft/invited possono essere eliminati in demo.' };
    }
    return {
      success: true,
      note: `Demo: utente ${userId} eliminato (simulato — nessuna persistenza reale).`,
    };
  }

  getUserAccessProfile(userId: string): KoraUserAccount | null {
    return records.find((u) => u.user_id === userId) ?? null;
  }

  canAccessCompany(user: KoraUserAccount, companyId: string): boolean {
    if ((ADMIN_ROLES as KoraUserRole[]).includes(user.role)) return true;
    if ((COMPANY_ROLES as KoraUserRole[]).includes(user.role)) {
      return user.company_id === companyId;
    }
    return false;
  }

  canAccessAdmin(user: KoraUserAccount): boolean {
    return (ADMIN_ROLES as KoraUserRole[]).includes(user.role);
  }

  getVisibleSections(user: KoraUserAccount): string[] {
    return user.visible_sections;
  }

  getAccountStatusBadge(status: KoraAccountStatus): { label: string; classes: string } {
    const map: Record<KoraAccountStatus, { label: string; classes: string }> = {
      draft:        { label: 'Bozza',            classes: 'border-slate-200 bg-slate-50 text-slate-500' },
      invited:      { label: 'Invitato',          classes: 'border-blue-200 bg-blue-50 text-blue-600' },
      active_demo:  { label: 'Attivo (demo)',     classes: 'border-green-200 bg-green-50 text-green-700' },
      suspended:    { label: 'Sospeso',           classes: 'border-amber-200 bg-amber-50 text-amber-700' },
      disabled:     { label: 'Disabilitato',      classes: 'border-slate-300 bg-slate-100 text-slate-500' },
      revoked:      { label: 'Revocato',          classes: 'border-rose-200 bg-rose-50 text-rose-500' },
      deleted_demo: { label: 'Eliminato (demo)',  classes: 'border-rose-200 bg-rose-50 text-rose-400' },
    };
    return map[status] ?? { label: status, classes: 'border-slate-200 bg-slate-50 text-slate-500' };
  }

  getInvitationStatusBadge(status: KoraInvitationStatus): { label: string; classes: string } {
    const map: Record<KoraInvitationStatus, { label: string; classes: string }> = {
      not_sent: { label: 'Non inviato', classes: 'text-slate-400' },
      pending:  { label: 'In attesa',   classes: 'text-blue-500' },
      accepted: { label: 'Accettato',   classes: 'text-green-600' },
      revoked:  { label: 'Revocato',    classes: 'text-rose-500' },
      expired:  { label: 'Scaduto',     classes: 'text-amber-500' },
    };
    return map[status] ?? { label: status, classes: 'text-slate-400' };
  }
}

export const accountProvisioningService = new AccountProvisioningService();
