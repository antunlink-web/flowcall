import { useState } from "react";
import { Lead } from "@/types/crm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface EmailComposerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EmailTemplate[];
  onSent: () => void;
}

export function EmailComposer({
  lead,
  open,
  onOpenChange,
  templates,
  onSent,
}: EmailComposerProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const personalize = (text: string) => {
    if (!lead) return text;
    return text
      .replace(/\{\{first_name\}\}/g, lead.first_name || "")
      .replace(/\{\{last_name\}\}/g, lead.last_name || "")
      .replace(/\{\{company\}\}/g, lead.company || "")
      .replace(/\{\{email\}\}/g, lead.email || "");
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(personalize(template.subject));
      setBody(personalize(template.body));
    }
  };

  const handleSend = async () => {
    if (!lead?.email || !user) return;

    setSending(true);
    try {
      // Call edge function to send email via SMTP
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: lead.email,
          subject,
          body,
          leadId: lead.id,
        },
      });

      if (error) throw error;

      // Log the email
      await supabase.from("email_logs").insert({
        lead_id: lead.id,
        user_id: user.id,
        subject,
        body,
        status: "sent",
      });

      toast({ title: "Email sent successfully" });
      onSent();
      onOpenChange(false);
      setSubject("");
      setBody("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please check your SMTP settings",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!lead) return null;

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Email to {fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-muted-foreground">To</Label>
              <p className="font-medium">{lead.email}</p>
            </div>
            {templates.length > 0 && (
              <div className="w-48">
                <Label>Template</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="min-h-[200px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!subject || !body || sending}
            >
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}