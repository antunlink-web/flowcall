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
  const { roles, loading: rolesLoading, isOwnerOrManager } = useUserRole();
  const location = useLocation();

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

  // Check if current route requires manager/owner access
  const isManagerOnlyRoute = managerOnlyRoutes.some(
    route => location.pathname === route || location.pathname.startsWith(route + "/")
  );

  // Allow agents to access /leads with a specific lead ID (from search)
  // RLS will properly restrict what they can see
  const isLeadDetailAccess = location.pathname === "/leads" && location.search.includes("id=");

  // If agent tries to access manager-only routes, redirect to home
  // Exception: agents can access lead detail view via /leads?id=...
  if (isManagerOnlyRoute && !isOwnerOrManager && !isLeadDetailAccess) {
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
