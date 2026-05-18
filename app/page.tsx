import { redirect } from 'next/navigation';

// Root — redirects to company workspace (default role: COMPANY_ADMIN)
export default function RootPage() {
  redirect('/company');
}
