import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUsername = Deno.env.get("SMTP_USERNAME");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");

    if (!smtpHost || !smtpUsername || !smtpPassword || !smtpFromEmail || !adminEmail) {
      console.error("Missing SMTP configuration");
      return new Response(
        JSON.stringify({ error: "Email configuration not complete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { companyName, subdomain, email, fullName, tenantId }: NotificationRequest = await req.json();

    console.log(`Sending admin notification for new registration: ${companyName}`);

    // Determine TLS setting based on port
    // Port 465 = implicit TLS (connect with TLS)
    // Port 587 = STARTTLS (connect plain, upgrade to TLS)
    const useTls = smtpPort === 465;

    console.log(`Connecting to SMTP: ${smtpHost}:${smtpPort} (TLS: ${useTls})`);

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: useTls,
        auth: {
          username: smtpUsername,
          password: smtpPassword,
        },
      },
      debug: {
        log: true,
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
      from: smtpFromEmail,
      to: adminEmail,
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
