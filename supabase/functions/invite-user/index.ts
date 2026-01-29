import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: "owner" | "account_manager" | "agent";
  fullName?: string;
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

    // Invite the user using Supabase admin API with tenant_id in metadata
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: fullName || email.split("@")[0],
        invited_role: role,
        invited_tenant_id: inviterTenantId, // CRITICAL: Pass tenant_id for profile creation
      },
    });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
