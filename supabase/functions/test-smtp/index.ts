import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  use_tls: boolean;
}

interface TestRequest {
  toEmail: string;
  smtpConfig: SmtpConfig;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toEmail, smtpConfig }: TestRequest = await req.json();

    if (!toEmail || !smtpConfig) {
      return new Response(
        JSON.stringify({ error: "Missing toEmail or smtpConfig" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { host, port, username, password, from_email, use_tls } = smtpConfig;

    if (!host || !username || !password || !from_email) {
      return new Response(
        JSON.stringify({ error: "Incomplete SMTP configuration" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Testing SMTP: ${host}:${port} (TLS: ${use_tls})`);
    console.log(`From: ${from_email} -> To: ${toEmail}`);

    // For port 465: use implicit TLS (tls: true)
    // For port 587: use STARTTLS (tls: false, the library handles upgrade)
    const useImplicitTls = port === 465;
    
    console.log(`Connection config: port=${port}, implicitTLS=${useImplicitTls}`);

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port: port,
        tls: useImplicitTls,
        auth: {
          username: username,
          password: password,
        },
      },
    });

    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0ea5e9;">✅ SMTP Test Successful</h2>
        
        <p>This is a test email from FlowCall to verify your SMTP configuration.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Server:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${host}:${port}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">TLS Mode:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${use_tls ? "Implicit TLS" : "STARTTLS"}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold;">From:</td>
            <td style="padding: 12px;">${from_email}</td>
          </tr>
        </table>
        
        <p style="color: #16a34a; font-weight: bold;">
          If you received this email, your SMTP configuration is working correctly!
        </p>
        
        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
    `;

    // Generate RFC 5322 compliant Message-ID
    const messageId = `<${crypto.randomUUID()}@flowcall.eu>`;

    await client.send({
      from: from_email,
      to: toEmail,
      subject: "[FlowCall] SMTP Test - Configuration Verified",
      content: "auto",
      html: testHtml,
      headers: {
        "Message-ID": messageId,
      },
    });

    await client.close();

    console.log("Test email sent successfully!");

    return new Response(
      JSON.stringify({ success: true, message: "Test email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("SMTP test error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
