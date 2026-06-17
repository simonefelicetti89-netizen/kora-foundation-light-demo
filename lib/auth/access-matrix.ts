// lib/auth/access-matrix.ts
// B168 — Matrice di accesso autoritativa per KORA.
//
// Implementa la policy "company aggregate = admin OK con audit, worker individual = deny sempre".
// Fonte di autorità: docs/access-matrix.md — questo file è l'implementazione TypeScript.
//
// canAccess() è una funzione PURA: nessun side effect, nessun async, nessuna chiamata DB.
// Il logging dell'audit è responsabilità del chiamante (lib/audit/log-access.ts).
// Il rendering del banner è responsabilità del layout (components/auth/PrivilegedAccessBanner).

// ── Tipi ─────────────────────────────────────────────────────────────────────

export type KoraRole =
  | 'KORA_ADMIN'
  | 'COMPANY_ADMIN'
  | 'WORKER'
  | 'PARTNER'
  | 'DEMO_VIEWER';

// Ambiente operativo: determina il banner e il contesto dell'audit log.
// demo    → Foundation Light, dati sintetici
// live    → Pilot+, tenant production_ready=true, dati reali
// future  → Future Vision screens, dati forecast
export type KoraEnvironment = 'demo' | 'live' | 'future';

// Codici risorsa canonici — vedi docs/access-matrix.md per descrizioni.
export type AccessResource =
  | 'company_kpi_kora_index'       // KORA Index, activation, pillars, financial, reports
  | 'company_config_source_batch'  // Tenant config, source_batch, data intake
  | 'company_submissions_approval' // Submissions, approval workflow, status center
  | 'aggregates_n_ge_10'           // Aggregati anonimizzati N≥10 (safe aggregation output)
  | 'worker_individual_pib'        // personal.worker_pib — PIB per singolo worker
  | 'worker_individual_uef'        // analytics.uef_record — UEF per singolo worker
  | 'personal_pseudonym_map'       // personal.worker_pseudonym_map — tabella più sensibile
  | 'hq_operator_console';         // Pannello operativo KORA

// Variante banner per accesso privilegiato admin su risorse company.
export type BannerVariant = 'amber' | 'navy' | 'blueprint';

export interface AccessDecision {
  allowed:       boolean;
  requiresAudit: boolean;
  banner?:       BannerVariant;   // presente solo se allowed=true e role=KORA_ADMIN su risorse company
  denyReason?:   string;          // solo se allowed=false — per logging, non per UI utente
}

// ── Matrice interna ───────────────────────────────────────────────────────────
// Fonte: docs/access-matrix.md — non modificare senza aggiornare il documento.

type RoleDecision = {
  allowed:       boolean;
  requiresAudit: boolean;
  denyReason?:   string;
};

// Keyed by resource then role — data-driven, non if-else.
const MATRIX: Record<AccessResource, Partial<Record<KoraRole, RoleDecision>>> = {
  company_kpi_kora_index: {
    KORA_ADMIN:   { allowed: true,  requiresAudit: true  },
    COMPANY_ADMIN: { allowed: true,  requiresAudit: false },
    WORKER:        { allowed: false, requiresAudit: false, denyReason: 'Company KPI not accessible to WORKER role' },
    PARTNER:       { allowed: false, requiresAudit: false, denyReason: 'Company KPI not accessible to PARTNER role' },
    DEMO_VIEWER:   { allowed: false, requiresAudit: false, denyReason: 'Company KPI not accessible to DEMO_VIEWER role' },
  },

  company_config_source_batch: {
    KORA_ADMIN:    { allowed: true,  requiresAudit: true  },
    COMPANY_ADMIN: { allowed: true,  requiresAudit: false },
    WORKER:        { allowed: false, requiresAudit: false, denyReason: 'Company config not accessible to WORKER role' },
    PARTNER:       { allowed: false, requiresAudit: false, denyReason: 'Company config not accessible to PARTNER role' },
    DEMO_VIEWER:   { allowed: false, requiresAudit: false, denyReason: 'Company config not accessible to DEMO_VIEWER role' },
  },

  company_submissions_approval: {
    KORA_ADMIN:    { allowed: true,  requiresAudit: true  },
    COMPANY_ADMIN: { allowed: true,  requiresAudit: false },
    WORKER:        { allowed: false, requiresAudit: false, denyReason: 'Submissions not accessible to WORKER role' },
    PARTNER:       { allowed: false, requiresAudit: false, denyReason: 'Submissions not accessible to PARTNER role' },
    DEMO_VIEWER:   { allowed: false, requiresAudit: false, denyReason: 'Submissions not accessible to DEMO_VIEWER role' },
  },

  aggregates_n_ge_10: {
    KORA_ADMIN:    { allowed: true,  requiresAudit: false },
    COMPANY_ADMIN: { allowed: true,  requiresAudit: false },
    WORKER:        { allowed: true,  requiresAudit: false },
    PARTNER:       { allowed: false, requiresAudit: false, denyReason: 'Aggregate data not accessible to PARTNER role' },
    DEMO_VIEWER:   { allowed: false, requiresAudit: false, denyReason: 'Aggregate data not accessible to DEMO_VIEWER role' },
  },

  // Worker-individual: DENY for KORA_ADMIN — non negoziabile, invariato in ogni env.
  worker_individual_pib: {
    KORA_ADMIN:    { allowed: false, requiresAudit: false, denyReason: 'Worker individual data is not accessible to KORA service team by design' },
    COMPANY_ADMIN: { allowed: false, requiresAudit: false, denyReason: 'Worker individual PIB not accessible to employer role — privacy boundary' },
    WORKER:        { allowed: true,  requiresAudit: false }, // own data only — enforced at RLS layer
    PARTNER:       { allowed: false, requiresAudit: false, denyReason: 'Worker individual data not accessible to PARTNER role' },
    DEMO_VIEWER:   { allowed: false, requiresAudit: false, denyReason: 'Worker individual data not accessible to DEMO_VIEWER role' },
  },

  worker_individual_uef: {
    KORA_ADMIN:    { allowed: false, requiresAudit: false, denyReason: 'Worker individual data is not accessible to KORA service team by design' },
    COMPANY_ADMIN: { allowed: false, requiresAudit: false, denyReason: 'Worker individual UEF not accessible to employer role — privacy boundary' },
    WORKER:        { allowed: true,  requiresAudit: false }, // own data only — enforced at RLS layer
    PARTNER:       { allowed: false, requiresAudit: false, denyReason: 'Worker individual data not accessible to PARTNER role' },
    DEMO_VIEWER:   { allowed: false, requiresAudit: false, denyReason: 'Worker individual data not accessible to DEMO_VIEWER role' },
  },

  // Tabella più sensibile: DENY per tutti — zero accessi applicativi.
  // Solo funzioni SECURITY DEFINER di sistema possono leggere/scrivere.
  personal_pseudonym_map: {
    KORA_ADMIN:    { allowed: false, requiresAudit: false, denyReason: 'pseudonym_map: zero application access — system procedures only' },
    COMPANY_ADMIN: { allowed: false, requiresAudit: false, denyReason: 'pseudonym_map: zero application access — system procedures only' },
    WORKER:        { allowed: false, requiresAudit: false, denyReason: 'pseudonym_map: zero application access — system procedures only' },
    PARTNER:       { allowed: false, requiresAudit: false, denyReason: 'pseudonym_map: zero application access — system procedures only' },
    DEMO_VIEWER:   { allowed: false, requiresAudit: false, denyReason: 'pseudonym_map: zero application access — system procedures only' },
  },

  hq_operator_console: {
    KORA_ADMIN:    { allowed: true,  requiresAudit: false },
    COMPANY_ADMIN: { allowed: false, requiresAudit: false, denyReason: 'HQ Operator Console not accessible to COMPANY_ADMIN role' },
    WORKER:        { allowed: false, requiresAudit: false, denyReason: 'HQ Operator Console not accessible to WORKER role' },
    PARTNER:       { allowed: false, requiresAudit: false, denyReason: 'HQ Operator Console not accessible to PARTNER role' },
    DEMO_VIEWER:   { allowed: false, requiresAudit: false, denyReason: 'HQ Operator Console not accessible to DEMO_VIEWER role' },
  },
};

// Banner variant per accesso admin su risorse company — dipende dall'ambiente.
const ADMIN_COMPANY_BANNER: Record<KoraEnvironment, BannerVariant> = {
  demo:   'amber',
  live:   'navy',
  future: 'blueprint',
};

// Risorse company che richiedono banner quando accedute da KORA_ADMIN.
const COMPANY_RESOURCES_REQUIRING_BANNER = new Set<AccessResource>([
  'company_kpi_kora_index',
  'company_config_source_batch',
  'company_submissions_approval',
]);

// ── canAccess — funzione pura ────────────────────────────────────────────────

/**
 * Determina se un ruolo può accedere a una risorsa in un dato ambiente.
 * Pura: nessun side effect, nessun async, nessuna chiamata DB.
 * Il caller è responsabile di scrivere l'audit log se requiresAudit=true.
 */
export function canAccess(
  role: KoraRole,
  resource: AccessResource,
  env: KoraEnvironment,
): AccessDecision {
  const resourceMatrix = MATRIX[resource];
  const decision = resourceMatrix[role];

  if (!decision) {
    // Ruolo non definito per questa risorsa — deny by default (fail closed).
    return { allowed: false, requiresAudit: false, denyReason: `No access rule defined for role=${role} resource=${resource}` };
  }

  if (!decision.allowed) {
    return { allowed: false, requiresAudit: false, denyReason: decision.denyReason };
  }

  // Accesso consentito — aggiunge banner se KORA_ADMIN su risorsa company.
  const needsBanner = role === 'KORA_ADMIN' && COMPANY_RESOURCES_REQUIRING_BANNER.has(resource);

  return {
    allowed:       true,
    requiresAudit: decision.requiresAudit,
    banner:        needsBanner ? ADMIN_COMPANY_BANNER[env] : undefined,
  };
}
