import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentSubdomain } from "@/hooks/useTenant";
import LandingPage from "@/pages/LandingPage";
import { TenantProvider } from "@/hooks/useTenant";

interface SubdomainRouterProps {
  children: ReactNode;
}

// Auth-related paths that should always render the CRM app (even on root domain)
const AUTH_PATHS = ["/auth", "/register", "/reset-password", "/accept-invite"];

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
  
  // Check if we're on the root domain (flowcall.eu without subdomain)
  const isRootDomain = hostname === "flowcall.eu" || hostname === "www.flowcall.eu";
  
  // For local development or Lovable preview URLs, show CRM
  const isDevOrPreview = 
    hostname === "localhost" || 
    hostname.includes("lovable.app") ||
    hostname.includes("lovableproject.com") ||
    hostname.includes("127.0.0.1");
  
  // Check if current path is an auth-related path
  const isAuthPath = AUTH_PATHS.some(path => location.pathname.startsWith(path));
  
  // If on root domain but on an auth path, render the CRM app for auth
  if (isRootDomain && isAuthPath) {
    return (
      <TenantProvider>
        {children}
      </TenantProvider>
    );
  }
  
  // If on root domain (not subdomain), show landing page
  if (isRootDomain) {
    return <LandingPage />;
  }
  
  // For subdomains (demo.flowcall.eu, tenant.flowcall.eu) or dev/preview, show CRM
  const subdomain = getCurrentSubdomain();
  
  // If we're on a subdomain or in dev/preview mode, render the CRM app
  if (subdomain || isDevOrPreview) {
    return (
      <TenantProvider>
        {children}
      </TenantProvider>
    );
  }
  
  // Fallback: show landing page
  return <LandingPage />;
}
