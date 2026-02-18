import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import flowcallLogo from "@/assets/flowcall-logo.png";

/**
 * Handles cross-subdomain session transfer.
 * When logging in on flowcall.eu and redirecting to tenant.flowcall.eu,
 * localStorage doesn't transfer between origins, so we pass tokens in the URL.
 * 
 * After setSession(), we wait for the onAuthStateChange event to confirm
 * the session is active before navigating — this prevents the race condition
 * where the app renders with a stale null-user state and crashes.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // No tokens — go to auth
      navigate("/auth", { replace: true });
      return;
    }

    // Listen for auth state change FIRST, then call setSession.
    // This guarantees we navigate only after the AuthProvider has
    // processed the new session and user is non-null everywhere.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        // Small timeout to let React flush the AuthProvider state update
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 50);
      }
    });

    // Now restore the session — this will fire the listener above
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(({ error }) => {
      if (error) {
        console.error("[AuthCallback] Failed to restore session:", error);
        subscription.unsubscribe();
        navigate("/auth", { replace: true });
      }
    });

    // Safety timeout: if auth never fires within 5s, redirect to auth
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      navigate("/auth", { replace: true });
    }, 5000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <img src={flowcallLogo} alt="FlowCall" className="h-14 w-auto mx-auto animate-pulse" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}

