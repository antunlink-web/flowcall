import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EmailTemplate {
  id: string;
  list_id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface SmsTemplate {
  id: string;
  list_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CallScript {
  id: string;
  list_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ListEmailConfig {
  from_name?: string;
  from_email?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  use_tls?: boolean;
}

export function useListTemplates(listId: string | null) {
  const { toast } = useToast();
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [callScripts, setCallScripts] = useState<CallScript[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = async () => {
    if (!listId) return;
    setLoading(true);

    try {
      const [emailRes, smsRes, scriptRes] = await Promise.all([
        supabase
          .from("email_templates")
          .select("*")
          .eq("list_id", listId)
          .order("created_at", { ascending: false }),
        supabase
          .from("sms_templates")
          .select("*")
          .eq("list_id", listId)
          .order("created_at", { ascending: false }),
        supabase
          .from("call_scripts")
          .select("*")
          .eq("list_id", listId)
          .order("created_at", { ascending: false }),
      ]);

      if (emailRes.data) setEmailTemplates(emailRes.data);
      if (smsRes.data) setSmsTemplates(smsRes.data);
      if (scriptRes.data) setCallScripts(scriptRes.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [listId]);

  // Email Templates CRUD
  const createEmailTemplate = async (template: Omit<EmailTemplate, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase
      .from("email_templates")
      .insert(template)
      .select()
      .single();

    if (error) {
      toast({ title: "Error creating email template", description: error.message, variant: "destructive" });
      return null;
    }

    setEmailTemplates((prev) => [data, ...prev]);
    toast({ title: "Email template created" });
    return data;
  };

  const updateEmailTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
    const { error } = await supabase
      .from("email_templates")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating email template", description: error.message, variant: "destructive" });
      return false;
    }

    setEmailTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    toast({ title: "Email template updated" });
    return true;
  };

  const deleteEmailTemplate = async (id: string) => {
    const { error } = await supabase.from("email_templates").delete().eq("id", id);

    if (error) {
      toast({ title: "Error deleting email template", description: error.message, variant: "destructive" });
      return false;
    }

    setEmailTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Email template deleted" });
    return true;
  };

  // SMS Templates CRUD
  const createSmsTemplate = async (template: Omit<SmsTemplate, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase
      .from("sms_templates")
      .insert(template)
      .select()
      .single();

    if (error) {
      toast({ title: "Error creating SMS template", description: error.message, variant: "destructive" });
      return null;
    }

    setSmsTemplates((prev) => [data, ...prev]);
    toast({ title: "SMS template created" });
    return data;
  };

  const updateSmsTemplate = async (id: string, updates: Partial<SmsTemplate>) => {
    const { error } = await supabase
      .from("sms_templates")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating SMS template", description: error.message, variant: "destructive" });
      return false;
    }

    setSmsTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    toast({ title: "SMS template updated" });
    return true;
  };

  const deleteSmsTemplate = async (id: string) => {
    const { error } = await supabase.from("sms_templates").delete().eq("id", id);

    if (error) {
      toast({ title: "Error deleting SMS template", description: error.message, variant: "destructive" });
      return false;
    }

    setSmsTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "SMS template deleted" });
    return true;
  };

  // Call Scripts CRUD
  const createCallScript = async (script: Omit<CallScript, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase
      .from("call_scripts")
      .insert(script)
      .select()
      .single();

    if (error) {
      toast({ title: "Error creating call script", description: error.message, variant: "destructive" });
      return null;
    }

    setCallScripts((prev) => [data, ...prev]);
    toast({ title: "Call script created" });
    return data;
  };

  const updateCallScript = async (id: string, updates: Partial<CallScript>) => {
    const { error } = await supabase
      .from("call_scripts")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating call script", description: error.message, variant: "destructive" });
      return false;
    }

    setCallScripts((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    toast({ title: "Call script updated" });
    return true;
  };

  const deleteCallScript = async (id: string) => {
    const { error } = await supabase.from("call_scripts").delete().eq("id", id);

    if (error) {
      toast({ title: "Error deleting call script", description: error.message, variant: "destructive" });
      return false;
    }

    setCallScripts((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Call script deleted" });
    return true;
  };

  return {
    emailTemplates,
    smsTemplates,
    callScripts,
    loading,
    fetchTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    createSmsTemplate,
    updateSmsTemplate,
    deleteSmsTemplate,
    createCallScript,
    updateCallScript,
    deleteCallScript,
  };
}
