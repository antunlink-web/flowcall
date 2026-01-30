import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  companyName: string;
  subdomain: string;
  email: string;
  fullName: string;
  tenantId: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  admin_email: string;
  use_tls: boolean;
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Fetch platform-level SMTP settings (tenant_id is null)
  const { data, error } = await supabase
    .from("account_settings")
    .select("setting_key, setting_value")
    .is("tenant_id", null)
    .in("setting_key", [
      "smtp_host", 
      "smtp_port", 
      "smtp_username", 
      "smtp_password", 
      "smtp_from_email", 
      "admin_notification_email", 
      "smtp_use_tls"
    ]);

  if (error || !data) {
    console.error("Error fetching SMTP settings:", error);
    return null;
  }

  const settingsMap: Record<string, any> = {};
  data.forEach(row => {
    settingsMap[row.setting_key] = row.setting_value;
  });

  if (!settingsMap.smtp_host || !settingsMap.smtp_username || !settingsMap.smtp_password || !settingsMap.smtp_from_email) {
    console.error("Incomplete SMTP configuration in account_settings");
    return null;
  }

  return {
    host: settingsMap.smtp_host,
    port: parseInt(settingsMap.smtp_port) || 587,
    username: settingsMap.smtp_username,
    password: settingsMap.smtp_password,
    from_email: settingsMap.smtp_from_email,
    admin_email: settingsMap.admin_notification_email || settingsMap.smtp_from_email,
    use_tls: settingsMap.smtp_use_tls === true,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const smtpConfig = await getSmtpConfig();
    
    if (!smtpConfig) {
      console.error("SMTP not configured - skipping admin notification");
      return new Response(
        JSON.stringify({ error: "Email configuration not complete", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { companyName, subdomain, email, fullName, tenantId }: NotificationRequest = await req.json();

    console.log(`Sending admin notification for new registration: ${companyName}`);

    // Determine TLS setting based on port
    const useTls = smtpConfig.port === 465;

    console.log(`Connecting to SMTP: ${smtpConfig.host}:${smtpConfig.port} (TLS: ${useTls})`);

    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.host,
        port: smtpConfig.port,
        tls: useTls,
        auth: {
          username: smtpConfig.username,
          password: smtpConfig.password,
        },
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">New Company Registration Request</h2>
        
        <p>A new company has registered and is awaiting approval:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Company Name:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${companyName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Requested Subdomain:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${subdomain}.flowcall.eu</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Contact Person:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Tenant ID:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${tenantId}</td>
          </tr>
        </table>
        
        <p style="margin-top: 20px;">
          <strong>Action Required:</strong> Please review this registration and approve or reject it from the admin dashboard.
        </p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated notification from FlowCall.
        </p>
      </div>
    `;

    await client.send({
      from: smtpConfig.from_email,
      to: smtpConfig.admin_email,
      subject: `[FlowCall] New Registration: ${companyName}`,
      content: "auto",
      html: emailHtml,
    });

    await client.close();

    console.log("Admin notification email sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending admin notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
