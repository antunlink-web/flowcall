import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  subject?: string;
  body?: string;
  content?: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { isAdminOrManager } = useUserRole();
  const { toast } = useToast();

  // SMTP State
  const [smtp, setSmtp] = useState({
    host: "",
    port: "587",
    username: "",
    password: "",
    from_email: "",
    from_name: "",
    use_tls: true,
  });
  const [saving, setSaving] = useState(false);

  // Templates State
  const [emailTemplates, setEmailTemplates] = useState<Template[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<Template[]>([]);
  const [scripts, setScripts] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Template | null>(null);
  const [formData, setFormData] = useState({ name: "", subject: "", body: "", content: "" });

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);

      const [smtpRes, emailRes, smsRes, scriptRes] = await Promise.all([
        supabase.from("smtp_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("email_templates").select("*").order("created_at"),
        supabase.from("sms_templates").select("*").order("created_at"),
        supabase.from("call_scripts").select("*").order("created_at"),
      ]);

      if (smtpRes.data) {
        setSmtp({
          host: smtpRes.data.host,
          port: String(smtpRes.data.port),
          username: smtpRes.data.username,
          password: smtpRes.data.password,
          from_email: smtpRes.data.from_email,
          from_name: smtpRes.data.from_name || "",
          use_tls: smtpRes.data.use_tls,
        });
      }

      setEmailTemplates((emailRes.data as Template[]) || []);
      setSmsTemplates((smsRes.data as Template[]) || []);
      setScripts((scriptRes.data as Template[]) || []);
      setLoading(false);
    }
    load();
  }, [user]);

  const saveSmtp = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      host: smtp.host,
      port: parseInt(smtp.port),
      username: smtp.username,
      password: smtp.password,
      from_email: smtp.from_email,
      from_name: smtp.from_name || null,
      use_tls: smtp.use_tls,
    };

    const { data: existing } = await supabase
      .from("smtp_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("smtp_settings").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("smtp_settings").insert(payload);
    }

    toast({ title: "SMTP settings saved" });
    setSaving(false);
  };

  const resetForm = () => {
    setFormData({ name: "", subject: "", body: "", content: "" });
    setEditingItem(null);
  };

  // Email Templates
  const handleEmailSubmit = async () => {
    if (!user) return;
    const payload = {
      name: formData.name,
      subject: formData.subject,
      body: formData.body,
      created_by: user.id,
    };

    if (editingItem) {
      await supabase.from("email_templates").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("email_templates").insert(payload);
    }

    const { data } = await supabase.from("email_templates").select("*").order("created_at");
    setEmailTemplates((data as Template[]) || []);
    setShowEmailDialog(false);
    resetForm();
    toast({ title: editingItem ? "Template updated" : "Template created" });
  };

  const handleEmailEdit = (t: Template) => {
    setFormData({ name: t.name, subject: t.subject || "", body: t.body || "", content: "" });
    setEditingItem(t);
    setShowEmailDialog(true);
  };

  const handleEmailDelete = async (id: string) => {
    await supabase.from("email_templates").delete().eq("id", id);
    setEmailTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Template deleted" });
  };

  // SMS Templates
  const handleSmsSubmit = async () => {
    if (!user) return;
    const payload = { name: formData.name, content: formData.content, created_by: user.id };

    if (editingItem) {
      await supabase.from("sms_templates").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("sms_templates").insert(payload);
    }

    const { data } = await supabase.from("sms_templates").select("*").order("created_at");
    setSmsTemplates((data as Template[]) || []);
    setShowSmsDialog(false);
    resetForm();
    toast({ title: editingItem ? "Template updated" : "Template created" });
  };

  const handleSmsEdit = (t: Template) => {
    setFormData({ name: t.name, subject: "", body: "", content: t.content || "" });
    setEditingItem(t);
    setShowSmsDialog(true);
  };

  const handleSmsDelete = async (id: string) => {
    await supabase.from("sms_templates").delete().eq("id", id);
    setSmsTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Template deleted" });
  };

  // Call Scripts
  const handleScriptSubmit = async () => {
    if (!user) return;
    const payload = { name: formData.name, content: formData.content, created_by: user.id };

    if (editingItem) {
      await supabase.from("call_scripts").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("call_scripts").insert(payload);
    }

    const { data } = await supabase.from("call_scripts").select("*").order("created_at");
    setScripts((data as Template[]) || []);
    setShowScriptDialog(false);
    resetForm();
    toast({ title: editingItem ? "Script updated" : "Script created" });
  };

  const handleScriptEdit = (t: Template) => {
    setFormData({ name: t.name, subject: "", body: "", content: t.content || "" });
    setEditingItem(t);
    setShowScriptDialog(true);
  };

  const handleScriptDelete = async (id: string) => {
    await supabase.from("call_scripts").delete().eq("id", id);
    setScripts((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Script deleted" });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-display font-bold">Settings</h1>

        <Tabs defaultValue="smtp">
          <TabsList>
            <TabsTrigger value="smtp">Email (SMTP)</TabsTrigger>
            {isAdminOrManager && <TabsTrigger value="email-templates">Email Templates</TabsTrigger>}
            {isAdminOrManager && <TabsTrigger value="sms-templates">SMS Templates</TabsTrigger>}
            {isAdminOrManager && <TabsTrigger value="scripts">Call Scripts</TabsTrigger>}
          </TabsList>

          {/* SMTP Tab */}
          <TabsContent value="smtp" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>SMTP Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={smtp.host}
                      onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      value={smtp.port}
                      onChange={(e) => setSmtp({ ...smtp, port: e.target.value })}
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={smtp.username}
                      onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={smtp.password}
                      onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Email</Label>
                    <Input
                      value={smtp.from_email}
                      onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>From Name</Label>
                    <Input
                      value={smtp.from_name}
                      onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={smtp.use_tls}
                    onCheckedChange={(v) => setSmtp({ ...smtp, use_tls: v })}
                  />
                  <Label>Use TLS</Label>
                </div>
                <Button onClick={saveSmtp} disabled={saving}>
                  {saving ? "Saving..." : "Save SMTP Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Templates Tab */}
          {isAdminOrManager && (
            <TabsContent value="email-templates" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Email Templates</CardTitle>
                  <Dialog
                    open={showEmailDialog}
                    onOpenChange={(open) => {
                      setShowEmailDialog(open);
                      if (!open) resetForm();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit Template" : "New Email Template"}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Input
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Body</Label>
                          <Textarea
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            placeholder="Use {{first_name}}, {{company}} for personalization"
                            className="min-h-[150px]"
                          />
                        </div>
                        <Button onClick={handleEmailSubmit} className="w-full">
                          {editingItem ? "Update" : "Create"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailTemplates.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-muted-foreground">{t.subject}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEmailEdit(t)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEmailDelete(t.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {emailTemplates.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No templates yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* SMS Templates Tab */}
          {isAdminOrManager && (
            <TabsContent value="sms-templates" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>SMS Templates</CardTitle>
                  <Dialog
                    open={showSmsDialog}
                    onOpenChange={(open) => {
                      setShowSmsDialog(open);
                      if (!open) resetForm();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit Template" : "New SMS Template"}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Use {{first_name}}, {{company}} for personalization"
                          />
                        </div>
                        <Button onClick={handleSmsSubmit} className="w-full">
                          {editingItem ? "Update" : "Create"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Preview</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {smsTemplates.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-xs">
                            {t.content?.slice(0, 50)}...
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleSmsEdit(t)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleSmsDelete(t.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {smsTemplates.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No templates yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Call Scripts Tab */}
          {isAdminOrManager && (
            <TabsContent value="scripts" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Call Scripts</CardTitle>
                  <Dialog
                    open={showScriptDialog}
                    onOpenChange={(open) => {
                      setShowScriptDialog(open);
                      if (!open) resetForm();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Script
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit Script" : "New Call Script"}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Script Content</Label>
                          <Textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Write your call script here..."
                            className="min-h-[300px]"
                          />
                        </div>
                        <Button onClick={handleScriptSubmit} className="w-full">
                          {editingItem ? "Update" : "Create"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Preview</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scripts.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-xs">
                            {t.content?.slice(0, 60)}...
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleScriptEdit(t)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleScriptDelete(t.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {scripts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No scripts yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}