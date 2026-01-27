import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

// Email templates for different auth actions
const getEmailTemplate = (actionType: string, data: {
  email: string;
  confirmationUrl?: string;
  token?: string;
  tokenHash?: string;
  redirectTo?: string;
  siteUrl?: string;
}) => {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
  `;

  switch (actionType) {
    case "recovery":
    case "reset_password":
      return {
        subject: "Reset your FlowCall password",
        html: `
          <div style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0369a1; margin: 0;">FlowCall</h1>
            </div>
            <h2 style="margin-bottom: 20px;">Reset Your Password</h2>
            <p>You requested to reset your password. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.confirmationUrl}" 
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
        `,
      };

    case "signup":
    case "email_confirmation":
      return {
        subject: "Confirm your FlowCall email",
        html: `
          <div style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0369a1; margin: 0;">FlowCall</h1>
            </div>
            <h2 style="margin-bottom: 20px;">Welcome to FlowCall!</h2>
            <p>Thanks for signing up. Please confirm your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.confirmationUrl}" 
                 style="background-color: #0369a1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Confirm Email
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">
              FlowCall CRM - Cold calling made simple for teams
            </p>
          </div>
        `,
      };

    case "invite":
      return {
        subject: "You've been invited to FlowCall",
        html: `
          <div style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0369a1; margin: 0;">FlowCall</h1>
            </div>
            <h2 style="margin-bottom: 20px;">You're Invited!</h2>
            <p>You've been invited to join a team on FlowCall. Click the button below to accept the invitation:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.confirmationUrl}" 
                 style="background-color: #0369a1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This invitation will expire in 7 days.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">
              FlowCall CRM - Cold calling made simple for teams
            </p>
          </div>
        `,
      };

    case "magiclink":
      return {
        subject: "Your FlowCall login link",
        html: `
          <div style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0369a1; margin: 0;">FlowCall</h1>
            </div>
            <h2 style="margin-bottom: 20px;">Login to FlowCall</h2>
            <p>Click the button below to securely log in to your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.confirmationUrl}" 
                 style="background-color: #0369a1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Log In
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">
              FlowCall CRM - Cold calling made simple for teams
            </p>
          </div>
        `,
      };

    case "email_change":
      return {
        subject: "Confirm your new email address",
        html: `
          <div style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0369a1; margin: 0;">FlowCall</h1>
            </div>
            <h2 style="margin-bottom: 20px;">Confirm Email Change</h2>
            <p>You requested to change your email address. Click the button below to confirm:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.confirmationUrl}" 
                 style="background-color: #0369a1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Confirm New Email
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this change, please contact support immediately.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">
              FlowCall CRM - Cold calling made simple for teams
            </p>
          </div>
        `,
      };

    default:
      return {
        subject: "FlowCall Notification",
        html: `
          <div style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0369a1; margin: 0;">FlowCall</h1>
            </div>
            <p>You have a notification from FlowCall.</p>
            ${data.confirmationUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.confirmationUrl}" 
                   style="background-color: #0369a1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  Click Here
                </a>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">
              FlowCall CRM - Cold calling made simple for teams
            </p>
          </div>
        `,
      };
  }
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    console.log("Received auth email hook request");
    console.log("Headers:", JSON.stringify(headers, null, 2));

    // Get the webhook secret from environment
    const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    
    let emailData: {
      user: { email: string };
      email_data: {
        token?: string;
        token_hash?: string;
        redirect_to?: string;
        email_action_type: string;
        site_url?: string;
        confirmation_url?: string;
      };
    };

    // Verify webhook signature if secret is configured
    if (hookSecret) {
      try {
        const wh = new Webhook(hookSecret);
        emailData = wh.verify(payload, headers) as typeof emailData;
        console.log("Webhook signature verified");
      } catch (verifyError) {
        console.error("Webhook verification failed:", verifyError);
        // Try parsing as regular JSON if webhook verification fails
        emailData = JSON.parse(payload);
        console.log("Parsed as regular JSON (no webhook verification)");
      }
    } else {
      // No secret configured, parse as JSON
      emailData = JSON.parse(payload);
      console.log("No webhook secret configured, parsed as JSON");
    }

    console.log("Email data:", JSON.stringify(emailData, null, 2));

    const { user, email_data } = emailData;
    const { token, token_hash, redirect_to, email_action_type, site_url, confirmation_url } = email_data;

    // Build confirmation URL if not provided
    let finalConfirmationUrl = confirmation_url;
    if (!finalConfirmationUrl && token_hash) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      finalConfirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}${redirect_to ? `&redirect_to=${encodeURIComponent(redirect_to)}` : ''}`;
    }

    // Get email template based on action type
    const template = getEmailTemplate(email_action_type, {
      email: user.email,
      confirmationUrl: finalConfirmationUrl,
      token,
      tokenHash: token_hash,
      redirectTo: redirect_to,
      siteUrl: site_url,
    });

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

    console.log(`Sending ${email_action_type} email to ${user.email} via ${smtpHost}:${smtpPort}`);

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

    // Send email
    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: user.email,
      subject: template.subject,
      content: "auto",
      html: template.html,
    });

    await client.close();

    console.log(`Email sent successfully to ${user.email}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in email-hook:", error);
    return new Response(
      JSON.stringify({ 
        error: {
          http_code: 500,
          message: error.message || "Failed to send email" 
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
