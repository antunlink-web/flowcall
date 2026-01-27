import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApproveRequest {
  tenantId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is a product owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is product owner
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isProductOwner = roles?.some(r => r.role === "product_owner");
    if (!isProductOwner) {
      return new Response(
        JSON.stringify({ error: "Only product owners can approve tenants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tenantId }: ApproveRequest = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tenant.status === "active") {
      return new Response(
        JSON.stringify({ error: "Tenant is already active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the owner user for this tenant
    const { data: ownerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("tenant_id", tenantId)
      .single();

    if (profileError || !ownerProfile) {
      console.error("Owner profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "Owner profile not found for this tenant" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update tenant status to active
    const { error: updateError } = await supabaseAdmin
      .from("tenants")
      .update({ status: "active" })
      .eq("id", tenantId);

    if (updateError) {
      console.error("Failed to update tenant status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to approve tenant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send approval email to user
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUsername = Deno.env.get("SMTP_USERNAME");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");

    if (smtpHost && smtpUsername && smtpPassword && smtpFromEmail) {
      try {
        const useTls = smtpPort === 465;
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
        });

        const loginUrl = `https://${tenant.subdomain}.flowcall.eu/auth`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">🎉 Your FlowCall Account is Approved!</h2>
            
            <p>Dear ${ownerProfile.full_name || "User"},</p>
            
            <p>Great news! Your organization <strong>${tenant.name}</strong> has been approved and is now active.</p>
            
            <p>You can now access your FlowCall workspace at:</p>
            
            <p style="margin: 20px 0;">
              <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0284c7; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Login to ${tenant.subdomain}.flowcall.eu
              </a>
            </p>
            
            <p>Or copy this link: <a href="${loginUrl}">${loginUrl}</a></p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">
                <strong>What's next?</strong>
              </p>
              <ul style="color: #666; font-size: 14px;">
                <li>Log in with the email and password you registered with</li>
                <li>Set up your team by inviting users</li>
                <li>Create your first lead list and start calling</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              If you have any questions, please don't hesitate to contact our support team.
            </p>
            
            <p style="color: #666; font-size: 12px;">
              — The FlowCall Team
            </p>
          </div>
        `;

        await client.send({
          from: smtpFromEmail,
          to: ownerProfile.email,
          subject: `Your FlowCall Account is Approved - ${tenant.name}`,
          content: "auto",
          html: emailHtml,
        });

        await client.close();
        console.log(`Approval email sent to ${ownerProfile.email}`);
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Don't fail the approval if email fails
      }
    } else {
      console.log("SMTP not configured, skipping approval email");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Tenant "${tenant.name}" has been approved`,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          status: "active"
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error approving tenant:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
