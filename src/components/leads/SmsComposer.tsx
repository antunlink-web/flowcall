import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, Smartphone, Settings, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSmsRequest } from "@/hooks/useSmsRequest";
import type { SmsTemplate } from "@/hooks/useListTemplates";

interface SmsComposerProps {
  leadId: string;
  phoneNumbers: string[];
  templates: SmsTemplate[];
  templatesLoading?: boolean;
  leadData?: Record<string, any>;
  onSent?: () => void;
}

export function SmsComposer({
  leadId,
  phoneNumbers,
  templates,
  templatesLoading = false,
  leadData = {},
  onSent,
}: SmsComposerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendSmsRequest, getDiallerPreference } = useSmsRequest();
  
  const [message, setMessage] = useState("");
  const [selectedPhone, setSelectedPhone] = useState(phoneNumbers[0] || "");
  const [sending, setSending] = useState(false);

  const diallerPref = getDiallerPreference();
  const isFlowCallSmart = diallerPref === "flowcall-smart";

  // Get lead field helpers
  const getLeadFirstName = () => {
    const nameFields = ["first_name", "firstname", "name", "vardas"];
    for (const [key, value] of Object.entries(leadData)) {
      if (nameFields.includes(key.toLowerCase()) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return "";
  };

  const getLeadLastName = () => {
    const nameFields = ["last_name", "lastname", "surname", "pavardė"];
    for (const [key, value] of Object.entries(leadData)) {
      if (nameFields.includes(key.toLowerCase()) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return "";
  };

  const getLeadCompany = () => {
    const companyFields = ["company", "company_name", "pavadinimas", "įmonė", "firma"];
    for (const [key, value] of Object.entries(leadData)) {
      if (companyFields.includes(key.toLowerCase()) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return "";
  };

  const getLeadEmail = () => {
    const emailFields = ["email", "e-mail", "el. paštas", "el_pastas"];
    for (const [key, value] of Object.entries(leadData)) {
      if (emailFields.includes(key.toLowerCase()) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return "";
  };

  const personalizeText = (text: string) => {
    return text
      .replace(/\{\{first_name\}\}/g, getLeadFirstName())
      .replace(/\{\{last_name\}\}/g, getLeadLastName())
      .replace(/\{\{company\}\}/g, getLeadCompany())
      .replace(/\{\{email\}\}/g, getLeadEmail());
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(personalizeText(template.content));
    }
  };

  const logSms = async () => {
    if (!user) return;
    
    try {
      await supabase.from("sms_logs").insert({
        lead_id: leadId,
        user_id: user.id,
        message: message,
      });
    } catch (error) {
      console.error("Error logging SMS:", error);
    }
  };

  const handleSendDirect = async () => {
    if (!selectedPhone || !message.trim()) return;
    
    // Open SMS app directly
    window.location.href = `sms:${selectedPhone}?body=${encodeURIComponent(message)}`;
    
    // Log the SMS
    await logSms();
    
    toast({
      title: "SMS opened",
      description: "Your SMS app should open with the message.",
    });
    
    setMessage("");
    onSent?.();
  };

  const handleSendViaPhone = async () => {
    if (!selectedPhone || !message.trim()) return;
    
    setSending(true);
    try {
      const success = await sendSmsRequest(selectedPhone, message, leadId);
      
      if (success) {
        // Log the SMS
        await logSms();
        setMessage("");
        onSent?.();
      }
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (isFlowCallSmart) {
      await handleSendViaPhone();
    } else {
      await handleSendDirect();
    }
  };

  if (phoneNumbers.length === 0) {
    return (
      <div className="text-muted-foreground text-sm p-4 border rounded-md text-center">
        No phone number available for this lead
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 space-y-4">
      {/* Header with template selector and phone selector */}
      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Use template
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
            {templatesLoading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No templates available</div>
            ) : (
              templates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  {template.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">To:</span>
          {phoneNumbers.length > 1 ? (
            <Select value={selectedPhone} onValueChange={setSelectedPhone}>
              <SelectTrigger className="h-7 w-auto min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {phoneNumbers.map((phone) => (
                  <SelectItem key={phone} value={phone}>
                    {phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="font-medium font-mono text-foreground">{selectedPhone}</span>
          )}
        </div>
      </div>

      {/* Message textarea */}
      <Textarea
        placeholder="Write your SMS message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="min-h-[120px] resize-none"
      />

      {/* Character count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{message.length} characters</span>
        <span>{Math.ceil(message.length / 160) || 1} SMS segment{Math.ceil(message.length / 160) > 1 ? 's' : ''}</span>
      </div>

      {/* Send buttons */}
      <div className="flex gap-2">
        {isFlowCallSmart ? (
          <Button
            className="flex-1 gap-2"
            onClick={handleSendViaPhone}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
            Send via Phone
          </Button>
        ) : (
          <Button
            className="flex-1 gap-2"
            onClick={handleSendDirect}
            disabled={!message.trim()}
          >
            <Send className="w-4 h-4" />
            Send SMS
          </Button>
        )}
        
        {/* Show alternate option */}
        {isFlowCallSmart ? (
          <Button
            variant="outline"
            onClick={handleSendDirect}
            disabled={!message.trim()}
            title="Open in SMS app"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleSendViaPhone}
            disabled={!message.trim() || sending}
            title="Send via FlowCall Smart"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* FlowCall Smart hint */}
      {!isFlowCallSmart && (
        <p className="text-xs text-muted-foreground text-center">
          Tip: Enable FlowCall Smart in Preferences to send SMS from your companion phone
        </p>
      )}
    </div>
  );
}
