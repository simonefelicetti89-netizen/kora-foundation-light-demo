// app/advisor/page.tsx
// KORA-WP-030 — Advisor self-view. Read-only: own Identity/Profile and own
// Role Qualifications (doc 76 §7A "Self scope" — no organisation Assignment
// needed). Server component, no client fetch, no API route — the trusted
// authUserId comes only from requireAdvisorUser(), never a request param.
//
// No edit controls: qualification creation/status changes are a governed
// capability (doc 76 §4), service-role/KORA_ADMIN only — out of this WP's
// UI scope entirely (Step 27/18 of this WP's own authorization).

import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import {
  getAdvisorIdentityByAuthUserId,
  listRoleQualificationsForAdvisor,
  type QualificationStatus,
} from '@/lib/advisor-identity/advisor-identity-service';

const IDENTITY_STATUS_LABEL: Record<string, string> = {
  candidate_onboarding: 'In fase di onboarding',
  active: 'Attivo',
  unavailable: 'Non disponibile',
  globally_suspended: 'Sospeso',
  inactive_offboarded: 'Non più attivo',
};

const QUALIFICATION_STATUS_LABEL: Record<QualificationStatus, string> = {
  CANDIDATE: 'Candidato',
  'QUALIFICATION IN PROGRESS': 'Qualificazione in corso',
  QUALIFIED: 'Qualificato',
  'RENEWAL DUE': 'Rinnovo in scadenza',
  EXPIRED: 'Scaduto',
  SUSPENDED: 'Sospeso',
  REVOKED: 'Revocato',
};

const ROLE_LABEL: Record<string, string> = {
  'Company Advisor': 'Company Advisor',
  'Partner Advisor': 'Partner Advisor',
};

export default async function AdvisorProfilePage() {
  const auth = await requireAdvisorUser();
  if (isKoraAuthError(auth)) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.62)' }}>Accesso non autorizzato.</p>
      </div>
    );
  }

  const identity = await getAdvisorIdentityByAuthUserId(auth.id);

  if (!identity) {
    return (
      <div style={{ padding: 48, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.62)', lineHeight: 1.5 }}>
          Il tuo profilo Advisor non è ancora stato attivato da KORA. Contatta l&apos;amministrazione KORA per completare l&apos;attivazione.
        </p>
      </div>
    );
  }

  const qualifications = await listRoleQualificationsForAdvisor(identity.id);

  return (
    <div style={{ padding: 32, maxWidth: 640, margin: '0 auto' }} className="space-y-6">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.40)', marginBottom: 6 }}>
          Profilo Advisor
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#06032B', marginBottom: 4 }}>
          {identity.fullName}
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.62)' }}>
          Stato identità: {IDENTITY_STATUS_LABEL[identity.status] ?? identity.status}
        </p>
      </div>

      <div>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#06032B', marginBottom: 10 }}>
          Qualifiche di ruolo
        </p>

        {qualifications.length === 0 && (
          <p style={{ fontSize: '12px', color: 'rgba(6,3,43,0.40)' }}>
            Nessuna qualifica di ruolo registrata al momento.
          </p>
        )}

        {qualifications.length > 0 && (
          <ul className="space-y-2">
            {qualifications.map((q) => (
              <li
                key={q.id}
                className="rounded-[12px] px-4 py-3"
                style={{ background: '#F8F6F1', border: '1px solid rgba(6,3,43,0.08)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#06032B' }}>
                    {ROLE_LABEL[q.role] ?? q.role}
                  </span>
                  <span style={{ fontSize: '11px', color: 'rgba(6,3,43,0.62)' }}>
                    {QUALIFICATION_STATUS_LABEL[q.status] ?? q.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
