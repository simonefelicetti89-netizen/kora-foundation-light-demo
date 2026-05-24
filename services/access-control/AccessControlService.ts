import type { KoraDemoUser, KoraUserRole, CompanyAccessProfile } from '@/lib/types';

// Demo user registry — session-only, no real auth
const DEMO_USERS: KoraDemoUser[] = [
  {
    user_id: 'admin-001',
    display_name: 'KORA Admin',
    role: 'KORA_ADMIN',
    access_scope: 'global_admin',
    can_access_admin: true,
    can_access_company_portal: true,
    allowed_routes: ['/admin', '/admin/companies', '/company'],
    notes: 'Full platform access. Sees all companies.',
  },
  {
    user_id: 'meridiana-admin-001',
    display_name: 'Meridiana Admin',
    role: 'COMPANY_ADMIN',
    access_scope: 'company_scoped',
    company_id: 'meridiana-group',
    can_access_admin: false,
    can_access_company_portal: true,
    allowed_routes: ['/company', '/company/kora-index', '/company/reports', '/company/financial', '/company/profile'],
    notes: 'Scoped to Meridiana Group only. Cannot see other companies.',
  },
  {
    user_id: 'alba-viewer-001',
    display_name: 'Alba Viewer',
    role: 'COMPANY_VIEWER',
    access_scope: 'company_scoped',
    company_id: 'alba-manufacturing',
    can_access_admin: false,
    can_access_company_portal: true,
    allowed_routes: ['/company', '/company/kora-index', '/company/profile'],
    notes: 'Read-only access to Alba Manufacturing KORA Index and Executive Cockpit.',
  },
];

const COMPANY_ACCESS_PROFILES: CompanyAccessProfile[] = [
  {
    company_id: 'meridiana-group',
    company_name: 'Meridiana Group S.r.l.',
    allowed_company_roles: ['COMPANY_ADMIN', 'COMPANY_VIEWER'],
    default_company_route: '/company',
    visible_company_sections: [
      'executive-cockpit',
      'kora-index',
      'reports',
      'financial',
      'pillars',
      'activation',
      'contribution',
      'profile',
    ],
    hidden_operational_sections: [
      'company-setup',
      'onboarding-studio',
      'workforce-baseline-upload',
      'ai-ingestion',
      'uef-review',
      'scoring-run',
    ],
    admin_managed_sections: [
      'company-setup',
      'onboarding-studio',
      'workforce-baseline-upload',
      'ai-ingestion',
      'uef-review',
      'scoring-run',
      'decision-pack-generation',
    ],
  },
  {
    company_id: 'alba-manufacturing',
    company_name: 'Alba Manufacturing S.p.A.',
    allowed_company_roles: ['COMPANY_ADMIN', 'COMPANY_VIEWER'],
    default_company_route: '/company',
    visible_company_sections: ['executive-cockpit', 'kora-index', 'reports', 'profile'],
    hidden_operational_sections: [
      'company-setup', 'onboarding-studio', 'workforce-baseline-upload',
      'ai-ingestion', 'uef-review', 'scoring-run',
    ],
    admin_managed_sections: [
      'company-setup', 'onboarding-studio', 'workforce-baseline-upload',
      'ai-ingestion', 'uef-review', 'scoring-run', 'decision-pack-generation',
    ],
  },
];

const ADMIN_ROLES: KoraUserRole[] = ['KORA_ADMIN'];
const COMPANY_ROLES: KoraUserRole[] = ['COMPANY_ADMIN', 'COMPANY_VIEWER'];

class AccessControlService {
  getCurrentDemoUser(role?: string): KoraDemoUser {
    if (!role) return DEMO_USERS[0];
    return (
      DEMO_USERS.find((u) => u.role === (role as KoraUserRole)) ??
      DEMO_USERS.find((u) => u.access_scope === 'global_admin') ??
      DEMO_USERS[0]
    );
  }

  getDemoUsers(): KoraDemoUser[] {
    return DEMO_USERS;
  }

  canAccessAdmin(user: KoraDemoUser): boolean {
    return user.can_access_admin && ADMIN_ROLES.includes(user.role);
  }

  canAccessCompany(user: KoraDemoUser, companyId: string): boolean {
    if (!user.can_access_company_portal) return false;
    if (ADMIN_ROLES.includes(user.role)) return true;
    if (COMPANY_ROLES.includes(user.role)) {
      return user.company_id === companyId || !user.company_id;
    }
    return false;
  }

  getCompanyScope(user: KoraDemoUser): string | null {
    if (user.access_scope === 'company_scoped') return user.company_id ?? null;
    if (user.access_scope === 'global_admin') return null;
    return null;
  }

  getVisibleCompanySections(user: KoraDemoUser): string[] {
    if (ADMIN_ROLES.includes(user.role)) {
      return [
        'executive-cockpit', 'kora-index', 'reports', 'financial',
        'pillars', 'activation', 'contribution', 'profile',
        'company-setup', 'onboarding-studio', 'workforce-baseline-upload',
        'ai-ingestion', 'uef-review', 'scoring-run',
      ];
    }
    const companyId = user.company_id ?? 'meridiana-group';
    const profile = COMPANY_ACCESS_PROFILES.find((p) => p.company_id === companyId);
    return profile?.visible_company_sections ?? ['executive-cockpit', 'kora-index', 'reports', 'profile'];
  }

  getHiddenOperationalSections(user: KoraDemoUser): string[] {
    const companyId = user.company_id ?? 'meridiana-group';
    const profile = COMPANY_ACCESS_PROFILES.find((p) => p.company_id === companyId);
    if (ADMIN_ROLES.includes(user.role)) return [];
    return profile?.hidden_operational_sections ?? [];
  }

  assertCompanyScoped(user: KoraDemoUser, companyId: string): boolean {
    return this.canAccessCompany(user, companyId);
  }

  getAccessBoundaryNotes(user: KoraDemoUser): string[] {
    if (ADMIN_ROLES.includes(user.role)) {
      return ['Accesso globale — tutte le aziende visibili.', 'KORA Admin — gestione azienda cliente.'];
    }
    if (COMPANY_ROLES.includes(user.role)) {
      const scope = user.company_id ? `Stai visualizzando lo spazio KORA di ${user.company_id}.` : 'Accesso azienda — scope company.';
      return [
        scope,
        'Il setup operativo e la validazione dati sono gestiti lato KORA Admin.',
        'KORA misura l\'organizzazione, non gli individui.',
      ];
    }
    return [];
  }

  getCompanyAccessProfile(companyId: string): CompanyAccessProfile | null {
    return COMPANY_ACCESS_PROFILES.find((p) => p.company_id === companyId) ?? null;
  }

  listCompanyAccessProfiles(): CompanyAccessProfile[] {
    return COMPANY_ACCESS_PROFILES;
  }
}

export const accessControlService = new AccessControlService();
