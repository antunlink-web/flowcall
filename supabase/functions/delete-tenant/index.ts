import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Verify the caller is a product_owner
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const isProductOwner = roles?.some((r: any) => r.role === "product_owner");
    if (!isProductOwner) throw new Error("Only product owners can delete tenants");

    const { tenantId } = await req.json();
    if (!tenantId) throw new Error("Missing tenantId");

    // Use service role to bypass RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete in order respecting FK constraints
    const tables = [
      "email_logs",
      "sms_logs",
      "call_logs",
      "sms_requests",
      "dial_requests",
      "leads",
      "list_users",
      "email_templates",
      "sms_templates",
      "call_scripts",
      "lists",
      "campaigns",
      "smtp_settings",
      "branding_settings",
      "account_settings",
      "user_devices",
      "user_invitations",
    ];

    for (const table of tables) {
      const { error } = await adminClient.from(table).delete().eq("tenant_id", tenantId);
      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        // Continue trying other tables
      }
    }

    // Delete user_roles for users in this tenant
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenantId);

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map((p: any) => p.id);
      for (const uid of userIds) {
        await adminClient.from("user_roles").delete().eq("user_id", uid);
      }
    }

    // Delete profiles
    const { error: profilesError } = await adminClient.from("profiles").delete().eq("tenant_id", tenantId);
    if (profilesError) console.error("Error deleting profiles:", profilesError);

    // Delete tenant
    const { error: tenantError } = await adminClient.from("tenants").delete().eq("id", tenantId);
    if (tenantError) throw tenantError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
