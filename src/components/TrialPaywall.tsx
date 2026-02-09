import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";
import { useSubscription, STRIPE_PLANS } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import { isPast, parseISO } from "date-fns";
import { Shield, Zap, Crown, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function TrialPaywall() {
  const { tenant, loading: tenantLoading } = useTenant();
  const { subscribed, loading: subLoading, createCheckout } = useSubscription();
  const { roles } = useUserRole();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const isOwner = roles.includes("owner");

  // Still loading
  if (tenantLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Has subscription - don't block
  if (subscribed) return null;

  // Check trial
  if (!tenant?.trial_end_date) return null;
  
  const endDate = parseISO(tenant.trial_end_date);
  if (!isPast(endDate)) return null;

  // Trial expired and no subscription - show paywall
  const seatCount = tenant.seat_count || 1;

  const handleCheckout = async (planKey: "basic" | "plus") => {
    if (!isOwner) {
      toast({
        title: "Owner required",
        description: "Only the organization owner can manage billing. Please contact your administrator.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutLoading(planKey);
    try {
      await createCheckout(STRIPE_PLANS[planKey].price_id, seatCount);
    } catch (error: any) {
      toast({
        title: "Checkout error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-3xl w-full space-y-6">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Your trial has ended</h1>
          <p className="text-muted-foreground text-lg">
            Choose a plan to continue using FlowCall for <strong>{tenant.name}</strong>
          </p>
          {!isOwner && (
            <p className="text-sm text-destructive mt-2">
              Only the organization owner can subscribe. Please contact your administrator.
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Basic Plan */}
          <Card className="relative border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <CardTitle>Basic</CardTitle>
              </div>
              <CardDescription>Everything you need to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-4xl font-bold">€12</span>
                <span className="text-muted-foreground">/user/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {seatCount} {seatCount === 1 ? "seat" : "seats"} × €12 = <strong>€{seatCount * 12}/mo</strong>
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Lead management</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Call tracking & dialer</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Email & SMS tools</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Team management</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Reports & analytics</li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handleCheckout("basic")}
                disabled={!isOwner || checkoutLoading !== null}
              >
                {checkoutLoading === "basic" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Subscribe to Basic"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Plus Plan */}
          <Card className="relative border-2 border-primary shadow-lg">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Recommended</Badge>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <CardTitle>Plus</CardTitle>
              </div>
              <CardDescription>Advanced features for growing teams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-4xl font-bold">€18</span>
                <span className="text-muted-foreground">/user/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {seatCount} {seatCount === 1 ? "seat" : "seats"} × €18 = <strong>€{seatCount * 18}/mo</strong>
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Everything in Basic</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Custom branding</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Advanced reporting</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Priority support</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Custom integrations</li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handleCheckout("plus")}
                disabled={!isOwner || checkoutLoading !== null}
              >
                {checkoutLoading === "plus" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Subscribe to Plus"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
