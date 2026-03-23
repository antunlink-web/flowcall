import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Users, Check, X, Loader2 } from "lucide-react";
import flowcallLogo from "@/assets/flowcall-logo.png";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

export default function Register() {
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = useTranslation();

  const emailSchema = z.string().email(t.validEmail);
  const passwordSchema = z.string().min(6, t.passwordMin);
  const subdomainSchema = z.string()
    .min(3, t.subdomainMin)
    .max(30, t.subdomainMax)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, t.subdomainFormat);

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  useEffect(() => {
    if (companyName && !subdomain) {
      const generated = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 30);
      setSubdomain(generated);
    }
  }, [companyName, subdomain]);

  useEffect(() => {
    const checkSubdomain = async () => {
      if (!subdomain || subdomain.length < 3) { setSubdomainAvailable(null); return; }
      const validation = subdomainSchema.safeParse(subdomain);
      if (!validation.success) { setSubdomainAvailable(null); return; }
      setCheckingSubdomain(true);
      try {
        const { data } = await supabase.from("tenants").select("id").eq("subdomain", subdomain).maybeSingle();
        setSubdomainAvailable(!data);
      } catch { setSubdomainAvailable(null); }
      finally { setCheckingSubdomain(false); }
    };
    const timer = setTimeout(checkSubdomain, 500);
    return () => clearTimeout(timer);
  }, [subdomain]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!companyName.trim()) newErrors.companyName = t.companyRequired;
    const subResult = subdomainSchema.safeParse(subdomain);
    if (!subResult.success) newErrors.subdomain = subResult.error.errors[0].message;
    if (!fullName.trim()) newErrors.fullName = t.nameRequired;
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) newErrors.password = pwResult.error.errors[0].message;
    if (subdomainAvailable === false) newErrors.subdomain = t.subdomainTaken;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await supabase.functions.invoke("register-tenant", {
        body: { companyName, subdomain, email, password, fullName },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      if (response.data?.pending) { navigate("/registration-pending"); return; }
      toast({ title: t.registrationSuccess, description: t.orgCreated });
      const hostname = window.location.hostname;
      const isRootDomain = hostname === "flowcall.eu" || hostname === "www.flowcall.eu";
      if (isRootDomain) { window.location.href = `https://${subdomain}.flowcall.eu/auth`; }
      else { navigate("/auth"); }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.registrationFailed;
      toast({ title: t.registrationFailed, description: message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <img src={flowcallLogo} alt="FlowCall" className="h-14 w-auto" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.createYourAccount}</h1>
          <p className="text-muted-foreground">{t.startFreeTrialToday}</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">{t.registerOrg}</CardTitle>
            <CardDescription className="text-center">{t.setupOrgAdmin}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t.companyName}</Label>
                <Input id="companyName" placeholder="Acme Inc." value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setErrors({ ...errors, companyName: "" }); }} />
                {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subdomain">{t.yourSubdomain}</Label>
                <div className="flex items-center gap-2">
                  <Input id="subdomain" placeholder="acme" value={subdomain}
                    onChange={(e) => { setSubdomain(e.target.value.toLowerCase()); setErrors({ ...errors, subdomain: "" }); setSubdomainAvailable(null); }}
                    className="flex-1" />
                  <span className="text-muted-foreground whitespace-nowrap">.flowcall.eu</span>
                  {checkingSubdomain && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {!checkingSubdomain && subdomainAvailable === true && <Check className="w-5 h-5 text-green-500" />}
                  {!checkingSubdomain && subdomainAvailable === false && <X className="w-5 h-5 text-destructive" />}
                </div>
                {errors.subdomain && <p className="text-sm text-destructive">{errors.subdomain}</p>}
                {subdomainAvailable === true && <p className="text-sm text-green-600">{t.subdomainAvailable}</p>}
              </div>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-4">{t.adminAccountDetails}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">{t.yourName}</Label>
                <Input id="fullName" placeholder="John Doe" value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors({ ...errors, fullName: "" }); }} />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: "" }); }} />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t.password}</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: "" }); }} />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.creatingAccount}</>) : t.createAccount}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t.alreadyHaveAccount}{" "}
                <Link to="/auth" className="text-primary hover:underline">{t.signIn}</Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">{t.yourSubdomainFeature}</p>
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
            <p className="text-xs text-muted-foreground">{t.unlimitedUsers}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
