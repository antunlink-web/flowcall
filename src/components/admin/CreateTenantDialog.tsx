import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, RefreshCw } from "lucide-react";

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTenantDialog({ open, onOpenChange, onCreated }: CreateTenantDialogProps) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [skipTrial, setSkipTrial] = useState(false);
  const [autoActivate, setAutoActivate] = useState(true);

  const resetForm = () => {
    setCompanyName("");
    setSubdomain("");
    setEmail("");
    setPassword("");
    setFullName("");
    setSkipTrial(false);
    setAutoActivate(true);
  };

  const handleCreate = async () => {
    if (!companyName || !subdomain || !email || !password || !fullName) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      // Use the existing register-tenant edge function
      const response = await supabase.functions.invoke("register-tenant", {
        body: { companyName, subdomain: subdomain.toLowerCase(), email, password, fullName },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      const tenantId = response.data?.tenant?.id;

      // If auto-activate, approve the tenant immediately
      if (autoActivate && tenantId) {
        const approveResponse = await supabase.functions.invoke("approve-tenant", {
          body: { tenantId },
        });
        if (approveResponse.error) {
          console.error("Auto-approve failed:", approveResponse.error);
        }
      }

      // If skip trial, set trial_end_date far in the future
      if (skipTrial && tenantId) {
        await supabase
          .from("tenants")
          .update({ trial_end_date: "2099-12-31T23:59:59Z" })
          .eq("id", tenantId);
      }

      toast({
        title: "Organization created",
        description: `${companyName} has been created${autoActivate ? " and activated" : ""}.`,
      });

      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create organization", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Create Organization
          </DialogTitle>
          <DialogDescription>
            Create a new tenant with an owner account. The user will be able to log in immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">flowcall.eu/t/</span>
                <Input id="subdomain" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="acme" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-name">Owner Full Name</Label>
            <Input id="owner-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-email">Owner Email</Label>
            <Input id="owner-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@acme.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-password">Temporary Password</Label>
            <Input id="owner-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Auto-activate</p>
              <p className="text-xs text-muted-foreground">Skip pending approval, activate immediately</p>
            </div>
            <Switch checked={autoActivate} onCheckedChange={setAutoActivate} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Free plan (no trial limit)</p>
              <p className="text-xs text-muted-foreground">Set trial expiry to 2099, bypassing the paywall</p>
            </div>
            <Switch checked={skipTrial} onCheckedChange={setSkipTrial} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating} className="gap-2">
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
            Create Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
