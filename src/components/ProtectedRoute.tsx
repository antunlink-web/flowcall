import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

// Routes that require owner or account_manager role
const managerOnlyRoutes = [
  "/manage",
  "/reports",
  "/team",
  "/campaigns",
  "/leads",
];

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useUserRole();
  const location = useLocation();

  // Show loading while auth or roles are being fetched
  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Compute isOwnerOrManager directly from roles array AFTER loading is complete
  // This ensures we're using the freshest roles data
  const isOwnerOrManager = roles.includes("owner") || 
                           roles.includes("account_manager") || 
                           roles.includes("product_owner");

  // Check if current route requires manager/owner access
  const isManagerOnlyRoute = managerOnlyRoutes.some(
    route => location.pathname === route || location.pathname.startsWith(route + "/")
  );

  // Allow agents to access /leads with a specific lead ID (from search)
  // RLS will properly restrict what they can see
  const isLeadDetailAccess = location.pathname === "/leads" && location.search.includes("id=");

  // If agent tries to access manager-only routes, redirect to home
  // Exception: agents can access lead detail view via /leads?id=...
  // Also, if no roles are loaded yet (empty array), don't redirect - wait for roles
  if (isManagerOnlyRoute && !isOwnerOrManager && !isLeadDetailAccess && roles.length > 0) {
    return <Navigate to="/" replace />;
  }

  // Check for specific required roles if provided
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(r => roles.includes(r as any));
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
