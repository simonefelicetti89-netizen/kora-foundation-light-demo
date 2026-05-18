'use client';

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  if (activeRole !== 'PARTNER_ADMIN_LIGHT') {
    return <AccessDeniedState role={activeRole} route="/partner" reason="Partner workspace is for Partner Admin Light role only." />;
  }
  return <>{children}</>;
}
