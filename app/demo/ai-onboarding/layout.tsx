// app/demo/ai-onboarding/layout.tsx — B168.5-P3: gate Classification Engine.
import { requireDemoGate } from '@/lib/auth/demo-guard';
export default async function AiOnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireDemoGate();
  return <>{children}</>;
}
