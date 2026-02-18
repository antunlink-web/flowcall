import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import flowcallLogo from "@/assets/flowcall-logo.png";

/**
 * Handles cross-subdomain session transfer.
 * When logging in on flowcall.eu and redirecting to tenant.flowcall.eu,
 * localStorage doesn't transfer between origins, so we pass tokens in the URL.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");

      if (accessToken && refreshToken) {
        // Set the session on this subdomain's Supabase client
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("[AuthCallback] Failed to restore session:", error);
          navigate("/auth", { replace: true });
          return;
        }

        // Session restored — go to app
        navigate("/", { replace: true });
      } else {
        // No tokens — just go to auth
        navigate("/auth", { replace: true });
      }
    };

    restoreSession();
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
