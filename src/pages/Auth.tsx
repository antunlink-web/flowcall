import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Users, ArrowLeft } from "lucide-react";
import flowcallLogo from "@/assets/flowcall-logo.png";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const isNativeApp = () => {
  return !!(window as any).Capacitor?.isNativePlatform?.();
};

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = useTranslation();

  useEffect(() => {
    const redirectAfterLogin = async () => {
      if (!user) return;
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        const isProductOwner = roleData?.some(r => r.role === "product_owner");
        if (isProductOwner) { navigate("/aiculedssul"); return; }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .single();
        
        if (profileError) {
          toast({ title: "Error", description: t.noWorkspaceDesc, variant: "destructive" });
          return;
        }
        
        if (profile?.tenant_id) {
          const { data: tenant, error: tenantError } = await supabase
            .from("tenants")
            .select("subdomain")
            .eq("id", profile.tenant_id)
            .single();
          
          if (tenantError) {
            toast({ title: "Error", description: t.noWorkspaceDesc, variant: "destructive" });
            return;
          }
          
          if (tenant?.subdomain) {
            navigate(`/t/${tenant.subdomain}/`);
            return;
          }
        }
        
        toast({ title: t.noWorkspaceFound, description: t.noWorkspaceDesc, variant: "destructive" });
      } catch (error) {
        console.error("Error during redirect:", error);
      }
    };
    redirectAfterLogin();
  }, [user, navigate, toast]);

  const validateForm = (emailOnly: boolean = false) => {
    const newErrors: typeof errors = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = t.validEmail;
    if (!emailOnly) {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) newErrors.password = t.passwordMin;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({
        title: t.signInFailed,
        description: error.message === "Invalid login credentials" ? t.invalidCredentials : error.message,
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast({ title: t.resetFailed, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.checkYourEmail, description: t.resetLinkSent });
      setShowForgotPassword(false);
    }
  };

  if (redirecting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <img src={flowcallLogo} alt="FlowCall" className="h-14 w-auto mx-auto animate-pulse" />
          <p className="text-muted-foreground">{t.redirecting}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <img src={flowcallLogo} alt="FlowCall" className="h-14 w-auto" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">FlowCall CRM</h1>
          <p className="text-muted-foreground">{t.coldCallingSimple}</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">
              {showForgotPassword ? t.resetPassword : t.signIn}
            </CardTitle>
            {showForgotPassword && (
              <CardDescription className="text-center">{t.resetPasswordDesc}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">{t.email}</Label>
                  <Input id="reset-email" type="email" placeholder="you@company.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: undefined }); }} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t.sending : t.sendResetLink}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> {t.backToSignIn}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t.email}</Label>
                  <Input id="signin-email" type="email" placeholder="you@company.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: undefined }); }} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t.password}</Label>
                  <Input id="signin-password" type="password" placeholder="••••••••" value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: undefined }); }} />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t.loading : t.signIn}
                </Button>
                <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowForgotPassword(true)}>
                  {t.forgotPassword}
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <img src={flowcallLogo} alt="FlowCall" className="h-6 w-auto" />
            </div>
            <p className="text-xs text-muted-foreground">{t.clickToCall}</p>
          </div>
          <div className="space-y-1">
            <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">{t.builtInEmail}</p>
          </div>
          <div className="space-y-1">
            <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">{t.teamReady}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
