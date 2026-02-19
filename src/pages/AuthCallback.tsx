import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import flowcallLogo from "@/assets/flowcall-logo.png";

/**
 * Handles cross-subdomain session transfer.
 *
 * Flow:
 * 1. On fresh subdomain page load, useAuth starts with loading=true.
 * 2. getSession() returns null (no session yet) → loading=false, user=null.
 * 3. We call setSession() here → this fires onAuthStateChange(SIGNED_IN) in useAuth
 *    → user becomes non-null.
 * 4. We watch user from useAuth; once it's set, we navigate to /.
 *
 * This avoids the race where we navigate BEFORE useAuth has processed the session,
 * which caused ProtectedRoute to see user=null and redirect back to /auth.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const sessionRestored = useRef(false);
  const [error, setError] = useState(false);

  // Step 1: Restore the session once on mount
  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      navigate("/auth", { replace: true });
      return;
    }

    // Call setSession — this will fire onAuthStateChange(SIGNED_IN) in the AuthProvider
    // which will update user in context. We then watch user below to navigate.
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(({ error }) => {
      if (error) {
        console.error("[AuthCallback] setSession failed:", error);
        setError(true);
      } else {
        sessionRestored.current = true;
      }
    });

    // Safety timeout: if user never becomes non-null after 8s, go to /auth
    const timeout = setTimeout(() => {
      if (!sessionRestored.current) {
        console.warn("[AuthCallback] Timed out waiting for session, redirecting to /auth");
        navigate("/auth", { replace: true });
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2: Once useAuth has the user (meaning session is fully propagated), navigate
  useEffect(() => {
    if (error) {
      navigate("/auth", { replace: true });
      return;
    }
    // Wait until auth loading is done AND user is set
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, error, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <img src={flowcallLogo} alt="FlowCall" className="h-14 w-auto mx-auto animate-pulse" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
