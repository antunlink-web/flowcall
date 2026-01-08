import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "owner" | "account_manager" | "agent";

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoles() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
      } else {
        setRoles((data?.map(r => r.role) as AppRole[]) ?? []);
      }
      setLoading(false);
    }

    fetchRoles();
  }, [user]);

  const isOwner = roles.includes("owner");
  const isAccountManager = roles.includes("account_manager");
  const isAgent = roles.includes("agent");
  const isOwnerOrManager = isOwner || isAccountManager;
  
  // For backwards compatibility
  const isAdmin = isOwner;
  const isManager = isAccountManager;
  const isAdminOrManager = isOwnerOrManager;
  
  // Primary role for display (owner > account_manager > agent)
  const primaryRole: AppRole | null = isOwner ? "owner" : isAccountManager ? "account_manager" : isAgent ? "agent" : null;

  return { 
    roles, 
    loading, 
    isOwner, 
    isAccountManager, 
    isAgent,
    isOwnerOrManager,
    primaryRole,
    // Backwards compatibility
    role: primaryRole,
    isAdmin,
    isManager,
    isAdminOrManager,
  };
}
