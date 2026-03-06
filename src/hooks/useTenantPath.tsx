import { createContext, useContext, useCallback, ReactNode } from "react";
import { useNavigate, NavigateOptions } from "react-router-dom";

interface TenantPathContextType {
  basePath: string;
  tenantSlug: string;
}

const TenantPathContext = createContext<TenantPathContextType>({ basePath: "", tenantSlug: "" });

export function TenantPathProvider({ tenantSlug, children }: { tenantSlug: string; children: ReactNode }) {
  const basePath = `/t/${tenantSlug}`;
  return (
    <TenantPathContext.Provider value={{ basePath, tenantSlug }}>
      {children}
    </TenantPathContext.Provider>
  );
}

export function useTenantPath() {
  return useContext(TenantPathContext);
}

/**
 * Tenant-aware navigate: automatically prefixes absolute paths with the tenant base path.
 * - navigate("/work") → /t/primelink/work
 * - navigate("/") → /t/primelink
 * - Numeric values (back/forward) pass through unchanged.
 * - Non-absolute paths pass through unchanged.
 */
export function useTenantNavigate() {
  const navigate = useNavigate();
  const { basePath } = useTenantPath();

  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }
      if (to.startsWith("/")) {
        const resolved = to === "/" ? (basePath || "/") : `${basePath}${to}`;
        navigate(resolved, options);
      } else {
        navigate(to, options);
      }
    },
    [navigate, basePath]
  );
}

/**
 * Helper to resolve a path within the current tenant context.
 * t("/work") → "/t/primelink/work"
 * t("/") → "/t/primelink"
 */
export function useTenantLinkPath() {
  const { basePath } = useTenantPath();
  return useCallback(
    (path: string) => {
      if (path === "/") return basePath || "/";
      if (path.startsWith("/")) return `${basePath}${path}`;
      return path;
    },
    [basePath]
  );
}
