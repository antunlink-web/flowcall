import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSubdomain } from "@/hooks/useTenant";
import { Suspense, lazy } from "react";

const LandingPage = lazy(() => import("@/pages/LandingPage"));

/**
 * Root route handler:
 * 1. Legacy subdomain (primelink.flowcall.eu) → redirect to /t/primelink/
 * 2. Logged-in user → redirect to /t/:tenantSlug/ (from profile)
 * 3. Not logged in → show landing page
 */
export function LandingOrRedirect() {
  const { user, loading: authLoading } = useAuth();
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  // Handle legacy subdomain URLs
  const subdomain = getCurrentSubdomain();

  useEffect(() => {
    if (subdomain) return; // handled by redirect below
    if (authLoading) return;
    if (!user) {
      setChecked(true);
      return;
    }

    const fetchTenantSlug = async () => {
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (roleData?.some(r => r.role === "product_owner")) {
          setTenantSlug("__product_owner__");
          setChecked(true);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (profile?.tenant_id) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("subdomain")
            .eq("id", profile.tenant_id)
            .single();

          if (tenant?.subdomain) {
            setTenantSlug(tenant.subdomain);
          }
        }
      } catch (err) {
        console.error("Error fetching tenant for redirect:", err);
      } finally {
        setChecked(true);
      }
    };

    fetchTenantSlug();
  }, [user, authLoading, subdomain]);

  // Legacy subdomain redirect
  if (subdomain) {
    return <Navigate to={`/t/${subdomain}/`} replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Suspense fallback={null}><LandingPage /></Suspense>;
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (tenantSlug === "__product_owner__") {
    return <Navigate to="/aiculedssul" replace />;
  }

  if (tenantSlug) {
    return <Navigate to={`/t/${tenantSlug}/`} replace />;
  }

  return <Suspense fallback={null}><LandingPage /></Suspense>;
}
