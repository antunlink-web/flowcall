import { ReactNode } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useSubscription } from "@/hooks/useSubscription";
import { TrialPaywall } from "@/components/TrialPaywall";
import { isPast, parseISO } from "date-fns";

/**
 * Renders the paywall when trial expired + no subscription,
 * otherwise renders children (the CRM app).
 */
export function PaywallGate({ children }: { children: ReactNode }) {
  const { tenant, loading: tenantLoading } = useTenant();
  const { subscribed, loading: subLoading } = useSubscription();

  // While loading, children will show their own loading states
  if (tenantLoading || subLoading) return <>{children}</>;

  // Has subscription — allow access
  if (subscribed) return <>{children}</>;

  // No trial end date — allow access (shouldn't happen but safe fallback)
  if (!tenant?.trial_end_date) return <>{children}</>;

  // Trial not expired — allow access
  const endDate = parseISO(tenant.trial_end_date);
  if (!isPast(endDate)) return <>{children}</>;

  // Trial expired + no subscription — show paywall
  return <TrialPaywall />;
}
