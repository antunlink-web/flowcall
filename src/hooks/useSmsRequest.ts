import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function useSmsRequest() {
  const { user } = useAuth();
  const { toast } = useToast();

  const sendSmsRequest = useCallback(async (phoneNumber: string, message: string, leadId?: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please sign in to send SMS.",
      });
      return false;
    }

    // Send SMS request to companion phone
    try {
      const { error } = await supabase.from("sms_requests").insert({
        user_id: user.id,
        phone_number: phoneNumber,
        message: message,
        lead_id: leadId || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "SMS request sent",
        description: "Check your phone to send the message.",
      });

      return true;
    } catch (error) {
      console.error("Failed to send SMS request:", error);
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: "Could not send SMS request to your phone.",
      });
      return false;
    }
  }, [user, toast]);

  return { sendSmsRequest };
}
