import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTenantPath } from "@/hooks/useTenantPath";
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
  const { basePath } = useTenantPath();

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

  const isOwnerOrManager = roles.includes("owner") || 
                           roles.includes("account_manager") || 
                           roles.includes("product_owner");

  // Strip basePath prefix for route matching
  const relativePath = basePath && location.pathname.startsWith(basePath)
    ? location.pathname.slice(basePath.length) || "/"
    : location.pathname;

  const isManagerOnlyRoute = managerOnlyRoutes.some(
    route => relativePath === route || relativePath.startsWith(route + "/")
  );

  const isLeadDetailAccess = relativePath === "/leads" && location.search.includes("id=");

  if (isManagerOnlyRoute && !isOwnerOrManager && !isLeadDetailAccess && roles.length > 0) {
    return <Navigate to={basePath || "/"} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(r => roles.includes(r as any));
    if (!hasRequiredRole) {
      return <Navigate to={basePath || "/"} replace />;
    }
  }

  return <>{children}</>;
}
