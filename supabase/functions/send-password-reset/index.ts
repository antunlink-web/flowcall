import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`Processing password reset for: ${email}`);

    // Create admin client to generate the reset link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate the password reset link
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirectTo || `${Deno.env.get("SUPABASE_URL")}/reset-password`,
      },
    });

    if (linkError) {
      console.error("Error generating reset link:", linkError);
      throw new Error("Failed to generate reset link");
    }

    const resetLink = data.properties?.action_link;
    if (!resetLink) {
      throw new Error("No reset link generated");
    }

    console.log(`Reset link generated for ${email}`);

    // Get SMTP settings
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUsername = Deno.env.get("SMTP_USERNAME");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const fromEmail = "accounts@flowcall.eu";
    const fromName = "FlowCall";

    if (!smtpHost || !smtpUsername || !smtpPassword) {
      console.error("Missing SMTP configuration");
      throw new Error("SMTP settings not configured");
    }

    console.log(`Sending password reset email via ${smtpHost}:${smtpPort}`);

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: {
          username: smtpUsername,
          password: smtpPassword,
        },
      },
    });

    // Email template
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0369a1; margin: 0;">FlowCall</h1>
        </div>
        <h2 style="margin-bottom: 20px;">Reset Your Password</h2>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #0369a1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, you can safely ignore this email. The link will expire in 24 hours.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">
          FlowCall CRM - Cold calling made simple for teams
        </p>
      </div>
    `;

    // Send email
    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: "Reset your FlowCall password",
      content: "auto",
      html,
    });

    await client.close();

    console.log(`Password reset email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send password reset email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
