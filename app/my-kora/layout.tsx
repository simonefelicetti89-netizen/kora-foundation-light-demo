'use client';

import { useRole } from '@/lib/demo-state';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import { isWorkerRole } from '@/lib/permissions';

// My KORA is worker-private — employer roles are actively blocked, not just hidden
export default function MyKoraLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();

  if (!isWorkerRole(activeRole)) {
    return (
      <div className="p-6">
        <h1 className="mb-4 text-xl font-bold text-[#06032B]">My KORA</h1>
        <PrivacyBoundaryNotice
          reason="employer_role"
          dataType="my_kora"
        />
      </div>
    );
  }

  return <>{children}</>;
}
