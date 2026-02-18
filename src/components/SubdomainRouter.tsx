import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentSubdomain } from "@/hooks/useTenant";
import LandingPage from "@/pages/LandingPage";
import { TenantProvider, useTenant } from "@/hooks/useTenant";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { TrialPaywall } from "@/components/TrialPaywall";
import { isPast, parseISO } from "date-fns";

interface SubdomainRouterProps {
  children: ReactNode;
}

// Auth-related paths that should always render the CRM app (even on root domain)
const AUTH_PATHS = ["/auth", "/register", "/reset-password", "/accept-invite"];

/**
 * Renders the paywall when trial expired + no subscription,
 * otherwise renders children (the CRM app).
 */
function PaywallGate({ children }: { children: ReactNode }) {
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

function CrmWithPaywall({ children }: { children: ReactNode }) {
  return (
    <TenantProvider>
      <SubscriptionProvider>
        <PaywallGate>{children}</PaywallGate>
      </SubscriptionProvider>
    </TenantProvider>
  );
}

/**
 * Routes based on subdomain:
 * - flowcall.eu (no subdomain) → Landing page (except auth routes)
 * - demo.flowcall.eu → CRM app
 * - xxx.flowcall.eu → CRM app for tenant xxx
 * - localhost / preview URLs → CRM app (development)
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  const hostname = window.location.hostname;
  const location = useLocation();
  
  console.log("[SubdomainRouter] hostname:", hostname);
  console.log("[SubdomainRouter] pathname:", location.pathname);
  
  const isRootDomain = hostname === "flowcall.eu" || hostname === "www.flowcall.eu";
  
  const isDevOrPreview = 
    hostname === "localhost" || 
    hostname.includes("lovable.app") ||
    hostname.includes("lovableproject.com") ||
    hostname.includes("127.0.0.1") ||
    // Also treat the published URL as CRM (used by native Android/iOS app)
    hostname === "flowcall.lovable.app";
  
  console.log("[SubdomainRouter] isRootDomain:", isRootDomain, "isDevOrPreview:", isDevOrPreview);
  
  const isAuthPath = AUTH_PATHS.some(path => location.pathname.startsWith(path));
  
  if (isRootDomain && isAuthPath) {
    return (
      <TenantProvider>
        {children}
      </TenantProvider>
    );
  }
  
  if (isRootDomain) {
    return <LandingPage />;
  }
  
  const subdomain = getCurrentSubdomain();
  
  if (subdomain || isDevOrPreview) {
    return (
      <CrmWithPaywall>
        {children}
      </CrmWithPaywall>
    );
  }
  
  // Fallback: show landing page
  return <LandingPage />;
}
