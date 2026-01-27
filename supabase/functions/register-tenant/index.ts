import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterTenantRequest {
  companyName: string;
  subdomain: string;
  email: string;
  password: string;
  fullName: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { companyName, subdomain, email, password, fullName }: RegisterTenantRequest = await req.json();

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return new Response(
        JSON.stringify({ error: "Invalid subdomain format. Use only lowercase letters, numbers, and hyphens." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if subdomain is already taken
    const { data: existingTenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (existingTenant) {
      return new Response(
        JSON.stringify({ error: "This subdomain is already taken. Please choose another." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the tenant with pending status (requires admin approval)
    // Set 14-day trial period with 1 default seat
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: companyName,
        subdomain: subdomain,
        status: "pending",
        trial_start_date: new Date().toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        seat_count: 1,
        max_seats: null, // Unlimited during trial
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Tenant creation error:", tenantError);
      return new Response(
        JSON.stringify({ error: "Failed to create organization. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user with tenant_id in metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        tenant_id: tenant.id,
        is_tenant_owner: true,
      },
    });

    if (authError) {
      // Rollback tenant creation if user creation fails
      await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
      console.error("User creation error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create default branding settings for the tenant
    await supabaseAdmin.from("branding_settings").insert({
      tenant_id: tenant.id,
      company_name: companyName,
    });

    // Send admin notification email about new registration
    try {
      const notifyResponse = await fetch(
        `${supabaseUrl}/functions/v1/notify-admin-registration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            companyName,
            subdomain,
            email,
            fullName,
            tenantId: tenant.id,
          }),
        }
      );
      
      if (!notifyResponse.ok) {
        console.error("Failed to send admin notification:", await notifyResponse.text());
      } else {
        console.log("Admin notification sent successfully");
      }
    } catch (notifyError) {
      console.error("Error sending admin notification:", notifyError);
      // Don't fail registration if notification fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        pending: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        },
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
