import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function useDialRequest() {
  const { user } = useAuth();
  const { toast } = useToast();

  const sendDialRequest = useCallback(async (phoneNumber: string, leadId?: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please sign in to use the dialer.",
      });
      return false;
    }

    try {
      const { error } = await supabase.from("dial_requests").insert({
        user_id: user.id,
        phone_number: phoneNumber,
        lead_id: leadId || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Dial request sent",
        description: "Check your phone to dial the number.",
      });

      return true;
    } catch (error) {
      console.error("Failed to send dial request:", error);
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: "Could not send dial request to your phone.",
      });
      return false;
    }
  }, [user, toast]);

  return { sendDialRequest };
}
