import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  trial_start_date: string | null;
  trial_end_date: string | null;
  seat_count: number;
  max_seats: number | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = async () => {
    if (!user) {
      setTenant(null);
      setLoading(false);
      return;
    }

    try {
      // First get the user's tenant_id from their profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setError("Failed to load user profile");
        setLoading(false);
        return;
      }

      if (!profile?.tenant_id) {
        // User might be product owner without tenant
        setTenant(null);
        setLoading(false);
        return;
      }

      // Fetch the tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", profile.tenant_id)
        .single();

      if (tenantError) {
        console.error("Error fetching tenant:", tenantError);
        setError("Failed to load organization");
        setLoading(false);
        return;
      }

      setTenant(tenantData as Tenant);
      setError(null);
    } catch (err) {
      console.error("Tenant fetch error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [user]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refetch: fetchTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

// Helper to get current subdomain from URL
export function getCurrentSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  // Check if we're on a subdomain of flowcall.eu
  const flowcallMatch = hostname.match(/^([a-z0-9-]+)\.flowcall\.eu$/i);
  if (flowcallMatch) {
    return flowcallMatch[1].toLowerCase();
  }

  // For local development or preview URLs, return null
  return null;
}
