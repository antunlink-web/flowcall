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

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const subdomainSchema = z.string()
  .min(3, "Subdomain must be at least 3 characters")
  .max(30, "Subdomain must be less than 30 characters")
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Only lowercase letters, numbers, and hyphens allowed");

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

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Auto-generate subdomain from company name
  useEffect(() => {
    if (companyName && !subdomain) {
      const generated = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 30);
      setSubdomain(generated);
    }
  }, [companyName, subdomain]);

  // Check subdomain availability with debounce
  useEffect(() => {
    const checkSubdomain = async () => {
      if (!subdomain || subdomain.length < 3) {
        setSubdomainAvailable(null);
        return;
      }

      const validation = subdomainSchema.safeParse(subdomain);
      if (!validation.success) {
        setSubdomainAvailable(null);
        return;
      }

      setCheckingSubdomain(true);
      try {
        const { data } = await supabase
          .from("tenants")
          .select("id")
          .eq("subdomain", subdomain)
          .maybeSingle();
        
        setSubdomainAvailable(!data);
      } catch {
        setSubdomainAvailable(null);
      } finally {
        setCheckingSubdomain(false);
      }
    };

    const timer = setTimeout(checkSubdomain, 500);
    return () => clearTimeout(timer);
  }, [subdomain]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }

    const subdomainResult = subdomainSchema.safeParse(subdomain);
    if (!subdomainResult.success) {
      newErrors.subdomain = subdomainResult.error.errors[0].message;
    }

    if (!fullName.trim()) {
      newErrors.fullName = "Your name is required";
    }
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (subdomainAvailable === false) {
      newErrors.subdomain = "This subdomain is already taken";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke("register-tenant", {
        body: {
          companyName,
          subdomain,
          email,
          password,
          fullName,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Registration successful!",
        description: `Your organization "${companyName}" has been created. Redirecting to your workspace...`,
      });

      // Redirect to tenant subdomain
      const hostname = window.location.hostname;
      const isRootDomain = hostname === "flowcall.eu" || hostname === "www.flowcall.eu";
      
      if (isRootDomain) {
        // Redirect to the new tenant's subdomain auth page
        window.location.href = `https://${subdomain}.flowcall.eu/auth`;
      } else {
        // In dev/preview, just go to auth
        navigate("/auth");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <img src={flowcallLogo} alt="FlowCall" className="h-14 w-auto" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Create Your Account</h1>
          <p className="text-muted-foreground">Start your free trial today</p>
        </div>

        {/* Registration Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">Register Your Organization</CardTitle>
            <CardDescription className="text-center">
              Set up your organization and admin account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company / Organization Name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setErrors({ ...errors, companyName: "" });
                  }}
                />
                {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
              </div>

              {/* Subdomain */}
              <div className="space-y-2">
                <Label htmlFor="subdomain">Your Subdomain</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="subdomain"
                    placeholder="acme"
                    value={subdomain}
                    onChange={(e) => {
                      setSubdomain(e.target.value.toLowerCase());
                      setErrors({ ...errors, subdomain: "" });
                      setSubdomainAvailable(null);
                    }}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground whitespace-nowrap">.flowcall.eu</span>
                  {checkingSubdomain && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {!checkingSubdomain && subdomainAvailable === true && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {!checkingSubdomain && subdomainAvailable === false && (
                    <X className="w-5 h-5 text-destructive" />
                  )}
                </div>
                {errors.subdomain && <p className="text-sm text-destructive">{errors.subdomain}</p>}
                {subdomainAvailable === true && (
                  <p className="text-sm text-green-600">This subdomain is available!</p>
                )}
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-4">Your admin account details</p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Your Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setErrors({ ...errors, fullName: "" });
                  }}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors({ ...errors, email: "" });
                  }}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({ ...errors, password: "" });
                  }}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/auth" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Your subdomain</p>
          </div>
          <div className="space-y-1">
            <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Built-in email</p>
          </div>
          <div className="space-y-1">
            <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Unlimited users</p>
          </div>
        </div>
      </div>
    </div>
  );
}
