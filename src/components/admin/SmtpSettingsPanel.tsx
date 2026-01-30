import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, Save, TestTube } from "lucide-react";

interface SmtpSettings {
  host: string;
  port: string;
  username: string;
  password: string;
  from_email: string;
  admin_email: string;
  use_tls: boolean;
}

export function SmtpSettingsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  
  const [settings, setSettings] = useState<SmtpSettings>({
    host: "",
    port: "587",
    username: "",
    password: "",
    from_email: "",
    admin_email: "",
    use_tls: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Fetch from account_settings table (platform-level settings)
      const { data, error } = await supabase
        .from("account_settings")
        .select("setting_key, setting_value")
        .is("tenant_id", null)
        .in("setting_key", ["smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from_email", "admin_notification_email", "smtp_use_tls"]);

      if (error) throw error;

      const settingsMap: Record<string, any> = {};
      data?.forEach(row => {
        settingsMap[row.setting_key] = row.setting_value;
      });

      setSettings({
        host: settingsMap.smtp_host || "",
        port: settingsMap.smtp_port || "587",
        username: settingsMap.smtp_username || "",
        password: settingsMap.smtp_password || "",
        from_email: settingsMap.smtp_from_email || "",
        admin_email: settingsMap.admin_notification_email || "",
        use_tls: settingsMap.smtp_use_tls === true,
      });
    } catch (error) {
      console.error("Error loading SMTP settings:", error);
      toast({
        title: "Error",
        description: "Failed to load SMTP settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase
      .from("account_settings")
      .select("id")
      .eq("setting_key", key)
      .is("tenant_id", null)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("account_settings")
        .update({ setting_value: value })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("account_settings")
        .insert({ 
          setting_key: key, 
          setting_value: value,
          tenant_id: null 
        });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting("smtp_host", settings.host),
        saveSetting("smtp_port", settings.port),
        saveSetting("smtp_username", settings.username),
        saveSetting("smtp_password", settings.password),
        saveSetting("smtp_from_email", settings.from_email),
        saveSetting("admin_notification_email", settings.admin_email),
        saveSetting("smtp_use_tls", settings.use_tls),
      ]);

      toast({
        title: "Settings Saved",
        description: "SMTP configuration has been updated",
      });
    } catch (error) {
      console.error("Error saving SMTP settings:", error);
      toast({
        title: "Error",
        description: "Failed to save SMTP settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast({
        title: "Enter test email",
        description: "Please enter an email address to send the test to",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      const response = await supabase.functions.invoke("test-smtp", {
        body: {
          toEmail: testEmail,
          smtpConfig: {
            host: settings.host,
            port: parseInt(settings.port),
            username: settings.username,
            password: settings.password,
            from_email: settings.from_email,
            use_tls: settings.use_tls,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Test failed");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Test Email Sent!",
        description: `Check ${testEmail} for the test message`,
      });
    } catch (error: any) {
      console.error("SMTP test error:", error);
      toast({
        title: "Test Failed",
        description: error.message || "Could not send test email",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            SMTP Configuration
          </CardTitle>
          <CardDescription>
            Configure the mail server for system emails (registrations, notifications)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                value={settings.host}
                onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                placeholder="mail.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                value={settings.port}
                onChange={(e) => setSettings({ ...settings, port: e.target.value })}
                placeholder="587"
              />
              <p className="text-xs text-muted-foreground">
                587 for STARTTLS, 465 for implicit TLS
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={settings.username}
                onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={settings.password}
                onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input
                type="email"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                placeholder="noreply@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Admin Notification Email</Label>
              <Input
                type="email"
                value={settings.admin_email}
                onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
                placeholder="admin@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Receives registration notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={settings.use_tls}
              onCheckedChange={(v) => setSettings({ ...settings, use_tls: v })}
            />
            <div>
              <Label>Use Implicit TLS (Port 465)</Label>
              <p className="text-xs text-muted-foreground">
                Enable for port 465, disable for port 587 (STARTTLS)
              </p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Test SMTP Connection
          </CardTitle>
          <CardDescription>
            Send a test email to verify the configuration works
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email to receive test"
              />
            </div>
            <Button onClick={handleTest} disabled={testing} variant="secondary" className="gap-2">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Test
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This will send a test email using the current settings (uses values from the form above, save first if you made changes).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
