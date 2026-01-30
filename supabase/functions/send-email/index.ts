import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  leadId?: string;
  listId?: string;
}

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name?: string;
  use_tls?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { to, subject, body, listId }: EmailRequest = await req.json();

    if (!to || !subject || !body) {
      throw new Error("Missing required fields: to, subject, body");
    }

    let smtpConfig: EmailConfig | null = null;

    // First try to get SMTP settings from list's email_config
    if (listId) {
      const { data: list, error: listError } = await supabase
        .from("lists")
        .select("email_config")
        .eq("id", listId)
        .maybeSingle();

      if (!listError && list?.email_config) {
        const config = list.email_config as EmailConfig;
        if (config.smtp_host && config.smtp_username && config.smtp_password && config.from_email) {
          smtpConfig = config;
        }
      }
    }

    // Fall back to user's SMTP settings if list doesn't have config
    if (!smtpConfig) {
      const { data: smtpSettings, error: smtpError } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!smtpError && smtpSettings) {
        smtpConfig = {
          smtp_host: smtpSettings.host,
          smtp_port: smtpSettings.port,
          smtp_username: smtpSettings.username,
          smtp_password: smtpSettings.password,
          from_email: smtpSettings.from_email,
          from_name: smtpSettings.from_name,
          use_tls: smtpSettings.use_tls,
        };
      }
    }

    if (!smtpConfig) {
      throw new Error("SMTP settings not configured. Please configure email settings in the list or your personal SMTP settings.");
    }

    // Determine TLS setting - default to true for port 465, otherwise check config
    const useTls = smtpConfig.use_tls !== undefined ? smtpConfig.use_tls : (smtpConfig.smtp_port === 465);

    console.log(`Sending email to ${to} via ${smtpConfig.smtp_host}:${smtpConfig.smtp_port}`);

    // Create SMTP client using denomailer
    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.smtp_host,
        port: smtpConfig.smtp_port,
        tls: useTls,
        auth: {
          username: smtpConfig.smtp_username,
          password: smtpConfig.smtp_password,
        },
      },
    });

    // Generate RFC 5322 compliant Message-ID
    const messageId = `<${crypto.randomUUID()}@flowcall.eu>`;

    // Send email
    await client.send({
      from: smtpConfig.from_name 
        ? `${smtpConfig.from_name} <${smtpConfig.from_email}>` 
        : smtpConfig.from_email,
      to: to,
      subject: subject,
      content: "auto",
      html: body.replace(/\n/g, "<br>"),
      headers: {
        "Message-ID": messageId,
      },
    });

    await client.close();

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
