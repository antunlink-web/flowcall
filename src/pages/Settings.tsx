import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [smtp, setSmtp] = useState({ host: "", port: "587", username: "", password: "", from_email: "", from_name: "", use_tls: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase.from("smtp_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setSmtp({ host: data.host, port: String(data.port), username: data.username, password: data.password, from_email: data.from_email, from_name: data.from_name || "", use_tls: data.use_tls });
    }
    load();
  }, [user]);

  const saveSmtp = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { user_id: user.id, host: smtp.host, port: parseInt(smtp.port), username: smtp.username, password: smtp.password, from_email: smtp.from_email, from_name: smtp.from_name || null, use_tls: smtp.use_tls };
    const { data: existing } = await supabase.from("smtp_settings").select("id").eq("user_id", user.id).maybeSingle();
    if (existing) {
      await supabase.from("smtp_settings").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("smtp_settings").insert(payload);
    }
    toast({ title: "SMTP settings saved" });
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-display font-bold">Settings</h1>
        <Tabs defaultValue="smtp">
          <TabsList><TabsTrigger value="smtp">Email (SMTP)</TabsTrigger><TabsTrigger value="profile">Profile</TabsTrigger></TabsList>
          <TabsContent value="smtp" className="mt-4">
            <Card>
              <CardHeader><CardTitle>SMTP Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>SMTP Host</Label><Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.example.com" /></div>
                  <div className="space-y-2"><Label>Port</Label><Input value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} placeholder="587" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Username</Label><Input value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Password</Label><Input type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>From Email</Label><Input value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>From Name</Label><Input value={smtp.from_name} onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={smtp.use_tls} onCheckedChange={(v) => setSmtp({ ...smtp, use_tls: v })} /><Label>Use TLS</Label></div>
                <Button onClick={saveSmtp} disabled={saving}>{saving ? "Saving..." : "Save SMTP Settings"}</Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="profile" className="mt-4">
            <Card><CardContent className="p-6"><p className="text-muted-foreground">Profile settings coming soon.</p></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}