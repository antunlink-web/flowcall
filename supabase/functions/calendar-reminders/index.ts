import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get all users who have email reminders enabled
    const { data: allPrefs, error: prefsError } = await supabase
      .from("account_settings")
      .select("setting_key, setting_value")
      .like("setting_key", "reminder_prefs_%");

    if (prefsError) {
      console.error("Error fetching reminder prefs:", prefsError);
      throw prefsError;
    }

    if (!allPrefs || allPrefs.length === 0) {
      return new Response(JSON.stringify({ message: "No reminder preferences found" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Get SMTP settings from account_settings (platform-wide)
    const { data: smtpData } = await supabase
      .from("account_settings")
      .select("setting_value")
      .eq("setting_key", "smtp_settings")
      .is("tenant_id", null)
      .maybeSingle();

    let smtpConfig: { host: string; port: number; username: string; password: string; from_email: string; from_name?: string; use_tls?: boolean } | null = null;

    if (smtpData?.setting_value) {
      const sv = smtpData.setting_value as Record<string, unknown>;
      smtpConfig = {
        host: sv.host as string,
        port: sv.port as number,
        username: sv.username as string,
        password: sv.password as string,
        from_email: sv.from_email as string,
        from_name: sv.from_name as string | undefined,
        use_tls: sv.use_tls as boolean | undefined,
      };
    }

    // Fallback to env secrets
    if (!smtpConfig) {
      const host = Deno.env.get("SMTP_HOST");
      const port = Deno.env.get("SMTP_PORT");
      const username = Deno.env.get("SMTP_USERNAME");
      const password = Deno.env.get("SMTP_PASSWORD");
      const fromEmail = Deno.env.get("SMTP_FROM_EMAIL");
      if (host && username && password && fromEmail) {
        smtpConfig = {
          host,
          port: parseInt(port || "465"),
          username,
          password,
          from_email: fromEmail,
          from_name: "FlowCall",
          use_tls: true,
        };
      }
    }

    if (!smtpConfig) {
      console.log("No SMTP configuration available, skipping email reminders");
      return new Response(JSON.stringify({ message: "No SMTP config" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const now = new Date();
    let emailsSent = 0;

    for (const pref of allPrefs) {
      const userId = pref.setting_key.replace("reminder_prefs_", "");
      const settings = pref.setting_value as Record<string, unknown>;

      if (!settings.notify_email) continue;

      const reminderMinutes = (settings.reminder_minutes as number) || 15;
      const windowStart = new Date(now.getTime());
      const windowEnd = new Date(now.getTime() + reminderMinutes * 60 * 1000);

      // Get user's email and tenant
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, tenant_id, full_name")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.email || !profile.tenant_id) continue;

      // Get upcoming actions for this user within their reminder window
      const { data: actions } = await supabase
        .from("next_actions")
        .select("id, action_type, scheduled_for, lead_id")
        .eq("tenant_id", profile.tenant_id)
        .in("status", ["pending", "snoozed"])
        .or(`assigned_user_id.eq.${userId},assigned_user_id.is.null`)
        .gte("scheduled_for", windowStart.toISOString())
        .lte("scheduled_for", windowEnd.toISOString())
        .limit(20);

      if (!actions || actions.length === 0) continue;

      // Check which ones we already emailed using subject pattern
      const actionIdList = actions.map((a) => a.id);
      const { data: recentLogs } = await supabase
        .from("email_logs")
        .select("subject")
        .eq("user_id", userId)
        .like("subject", "Calendar Reminder:%")
        .gte("created_at", new Date(now.getTime() - 60 * 60 * 1000).toISOString())
        .limit(200);

      const alreadySent = new Set<string>();
      recentLogs?.forEach((l) => {
        // Subject format: "Calendar Reminder:<actionId>"
        const id = l.subject.split(":")[1];
        if (id) alreadySent.add(id);
      });

      const newActions = actions.filter((a) => !alreadySent.has(a.id));
      if (newActions.length === 0) continue;

      // Get lead names
      const leadIds = [...new Set(newActions.map((a) => a.lead_id))];
      const { data: leads } = await supabase
        .from("leads")
        .select("id, data")
        .in("id", leadIds);

      const leadNames = new Map<string, string>();
      leads?.forEach((l) => {
        const d = l.data as Record<string, unknown> | null;
        if (!d) return;
        for (const f of ["name", "company", "pavadinimas", "Pavadinimas", "Company"]) {
          if (d[f] && typeof d[f] === "string") {
            leadNames.set(l.id, d[f] as string);
            break;
          }
        }
      });

      // Build email body
      const actionRows = newActions.map((a) => {
        const contact = leadNames.get(a.lead_id) || "Unknown contact";
        const time = new Date(a.scheduled_for!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        const type = (a.action_type as string).replace(/_/g, " ");
        return `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${time}</td><td style="padding:8px;border-bottom:1px solid #eee;">${type}</td><td style="padding:8px;border-bottom:1px solid #eee;">${contact}</td></tr>`;
      }).join("");

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1a73e8;">📅 Upcoming Calendar Reminders</h2>
          <p>Hi ${profile.full_name || "there"},</p>
          <p>You have ${newActions.length} upcoming task${newActions.length > 1 ? "s" : ""} in the next ${reminderMinutes} minutes:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead><tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;">Time</th>
              <th style="padding:8px;text-align:left;">Type</th>
              <th style="padding:8px;text-align:left;">Contact</th>
            </tr></thead>
            <tbody>${actionRows}</tbody>
          </table>
          <p style="color:#666;font-size:12px;">— FlowCall Calendar</p>
        </div>
      `;

      // Send email
      try {
        const useTls = smtpConfig.use_tls !== undefined ? smtpConfig.use_tls : (smtpConfig.port === 465);
        const client = new SMTPClient({
          connection: {
            hostname: smtpConfig.host,
            port: smtpConfig.port,
            tls: useTls,
            auth: { username: smtpConfig.username, password: smtpConfig.password },
          },
        });

        const messageId = `<${crypto.randomUUID()}@flowcall.eu>`;

        await client.send({
          from: smtpConfig.from_name
            ? `${smtpConfig.from_name} <${smtpConfig.from_email}>`
            : smtpConfig.from_email,
          to: profile.email,
          subject: "Calendar Reminder",
          content: "auto",
          html,
          headers: { "Message-ID": messageId },
        });

        await client.close();

        // Log each action as sent so we don't re-send
        for (const a of newActions) {
          await supabase.from("email_logs").insert([{
            lead_id: a.lead_id,
            user_id: userId,
            subject: `Calendar Reminder:${a.id}`,
            body: html,
            tenant_id: profile.tenant_id,
            status: "sent",
          }]);
        }

        emailsSent++;
        console.log(`Sent reminder email to ${profile.email} for ${newActions.length} actions`);
      } catch (emailErr) {
        console.error(`Failed to send reminder to ${profile.email}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Calendar reminders error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
