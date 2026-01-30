import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: "owner" | "account_manager" | "agent";
  fullName?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
}

async function getSmtpConfig(supabase: any): Promise<SmtpConfig | null> {
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
      "smtp_from_email"
    ]);

  if (error || !data) {
    console.error("Error fetching SMTP settings:", error);
    return null;
  }

  const settingsMap: Record<string, any> = {};
  data.forEach((row: any) => {
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
  };
}

async function sendInviteEmail(smtpConfig: SmtpConfig, to: string, inviteLink: string, fullName: string): Promise<void> {
  const useTls = smtpConfig.port === 465;

  console.log(`Sending invite email via ${smtpConfig.host}:${smtpConfig.port} (TLS: ${useTls})`);

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

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0369a1; margin: 0;">FlowCall</h1>
      </div>
      <h2 style="margin-bottom: 20px;">You've Been Invited!</h2>
      <p>Hello ${fullName},</p>
      <p>You have been invited to join FlowCall. Click the button below to accept your invitation and set up your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" 
           style="background-color: #0369a1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">
        FlowCall CRM - Cold calling made simple for teams
      </p>
    </div>
  `;

  await client.send({
    from: `FlowCall <${smtpConfig.from_email}>`,
    to: to,
    subject: "You've been invited to FlowCall",
    content: "auto",
    html,
  });

  await client.close();
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify they're an admin
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the requesting user is an owner or account_manager
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const userRoles = roleData?.map(r => r.role) || [];
    const canInvite = userRoles.includes("owner") || userRoles.includes("account_manager");

    if (!canInvite) {
      return new Response(
        JSON.stringify({ error: "Only owners and account managers can invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the requesting user's tenant_id - CRITICAL for tenant isolation
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", requestingUser.id)
      .single();

    if (!inviterProfile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Your account is not associated with an organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviterTenantId = inviterProfile.tenant_id;

    // Parse the request body
    const { email, role, fullName }: InviteRequest = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get SMTP settings from database
    const smtpConfig = await getSmtpConfig(supabaseAdmin);
    
    if (!smtpConfig) {
      console.error("SMTP not configured - cannot send invitation email");
      return new Response(
        JSON.stringify({ error: "Email configuration not complete. Please configure SMTP settings." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists in auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingAuthUser) {
      // Check if user has confirmed their email (is active)
      const isConfirmed = existingAuthUser.email_confirmed_at !== null;
      
      if (isConfirmed) {
        // Also check if profile is active
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id, status")
          .eq("email", email)
          .single();
        
        if (existingProfile && existingProfile.status === 'active') {
          return new Response(
            JSON.stringify({ error: "An active user with this email already exists" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // User exists but is not active - delete the old auth user so we can re-invite
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
      if (deleteError) {
        console.error("Error deleting inactive user:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to replace inactive user. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Deleted inactive user to allow re-invitation:", email);
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabaseAdmin
      .from("user_invitations")
      .select("id, accepted_at")
      .eq("email", email)
      .single();

    if (existingInvite && !existingInvite.accepted_at) {
      return new Response(
        JSON.stringify({ error: "An invitation has already been sent to this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the origin from the request for the redirect URL
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const redirectTo = `${origin}/accept-invite`;

    const displayName = fullName || email.split("@")[0];

    // Generate invite link using Supabase admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo,
        data: {
          full_name: displayName,
          invited_role: role,
          invited_tenant_id: inviterTenantId,
        },
      },
    });

    if (inviteError) {
      console.error("Invite link generation error:", inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviteLink = inviteData.properties?.action_link;
    if (!inviteLink) {
      throw new Error("No invite link generated");
    }

    console.log(`Generated invite link for ${email}`);

    // Send invitation email via custom SMTP
    await sendInviteEmail(smtpConfig, email, inviteLink, displayName);

    console.log(`Invitation email sent to ${email}`);

    // Record the invitation in our table WITH tenant_id - CRITICAL for tenant isolation
    const { error: recordError } = await supabaseAdmin
      .from("user_invitations")
      .upsert({
        email,
        invited_by: requestingUser.id,
        role,
        full_name: fullName,
        tenant_id: inviterTenantId, // Associate invitation with inviter's tenant
      }, {
        onConflict: "email"
      });

    if (recordError) {
      console.error("Record error:", recordError);
      // Don't fail the request, invitation was still sent
    }

    console.log("User invited successfully:", email);

    return new Response(
      JSON.stringify({ success: true, message: `Invitation sent to ${email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
