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

    // 2. Get SMTP settings from account_settings (stored as individual keys)
    const { data: smtpRows } = await supabase
      .from("account_settings")
      .select("setting_key, setting_value")
      .is("tenant_id", null)
      .like("setting_key", "smtp_%");

    let smtpConfig: { host: string; port: number; username: string; password: string; from_email: string; from_name?: string; use_tls?: boolean } | null = null;

    if (smtpRows && smtpRows.length > 0) {
      const smtpMap: Record<string, unknown> = {};
      for (const row of smtpRows) {
        const key = row.setting_key.replace(/^smtp_/, "");
        // setting_value is stored as JSON; unwrap primitives
        smtpMap[key] = row.setting_value;
      }
      const host = smtpMap.host as string | undefined;
      const portRaw = smtpMap.port;
      const username = smtpMap.username as string | undefined;
      const password = smtpMap.password as string | undefined;
      const fromEmail = smtpMap.from_email as string | undefined;
      if (host && username && password && fromEmail) {
        smtpConfig = {
          host,
          port: typeof portRaw === "number" ? portRaw : parseInt(String(portRaw || "465")),
          username,
          password,
          from_email: fromEmail,
          from_name: (smtpMap.from_name as string | undefined) || "FlowCall",
          use_tls: smtpMap.use_tls === undefined ? undefined : Boolean(smtpMap.use_tls),
        };
      }
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

      // Check which ones we already emailed (marker stored in body prefix)
      const { data: recentLogs } = await supabase
        .from("email_logs")
        .select("body")
        .eq("user_id", userId)
        .like("body", "<!--reminder:%")
        .gte("created_at", new Date(now.getTime() - 60 * 60 * 1000).toISOString())
        .limit(200);

      const alreadySent = new Set<string>();
      recentLogs?.forEach((l) => {
        // Body starts with "<!--reminder:<actionId>-->"
        const m = l.body.match(/^<!--reminder:([^-]+)-->/);
        if (m) alreadySent.add(m[1]);
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
        for (const f of ["full_name", "name", "ime", "company", "company_name", "pavadinimas", "Pavadinimas", "Company"]) {
          if (d[f] && typeof d[f] === "string") {
            leadNames.set(l.id, d[f] as string);
            break;
          }
        }
      });

      // Send one email per action with a unique, descriptive subject
      const useTls = smtpConfig.use_tls !== undefined ? smtpConfig.use_tls : (smtpConfig.port === 465);

      for (const a of newActions) {
        const contact = leadNames.get(a.lead_id) || "contact";
        const when = new Date(a.scheduled_for!);
        const time = when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
        const dateStr = when.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        const type = (a.action_type as string).replace(/_/g, " ");
        const typeCap = type.charAt(0).toUpperCase() + type.slice(1);

        // Unique subject avoids Gmail thread collapsing + looks more personal
        const subject = `${typeCap} ${contact} at ${time} (${dateStr})`;

        const text =
`Hi ${profile.full_name || "there"},

Reminder: ${typeCap} with ${contact} at ${time} on ${dateStr}.

Open FlowCall to view details: https://flowcall.eu

— FlowCall Calendar
You receive this because calendar reminders are enabled in your Preferences.`;

        const html = `<!--reminder:${a.id}--><div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
  <p style="font-size:15px;margin:0 0 12px;">Hi ${profile.full_name || "there"},</p>
  <p style="font-size:15px;margin:0 0 16px;">Reminder: <strong>${typeCap}</strong> with <strong>${contact}</strong> at <strong>${time}</strong> on <strong>${dateStr}</strong>.</p>
  <p style="margin:0 0 24px;"><a href="https://flowcall.eu" style="background:#1a73e8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Open FlowCall</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
  <p style="color:#888;font-size:12px;margin:0;">— FlowCall Calendar<br/>You receive this because calendar reminders are enabled in your Preferences.</p>
</div>`;

        try {
          const client = new SMTPClient({
            connection: {
              hostname: smtpConfig.host,
              port: smtpConfig.port,
              tls: useTls,
              auth: { username: smtpConfig.username, password: smtpConfig.password },
            },
          });

          const messageId = `<reminder-${a.id}-${Date.now()}@flowcall.eu>`;
          const fromAddr = smtpConfig.from_name
            ? `${smtpConfig.from_name} <${smtpConfig.from_email}>`
            : smtpConfig.from_email;

          await client.send({
            from: fromAddr,
            to: profile.email,
            replyTo: smtpConfig.from_email,
            subject,
            content: text,
            html,
            headers: {
              "Message-ID": messageId,
              "List-Unsubscribe": `<mailto:${smtpConfig.from_email}?subject=unsubscribe>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              "X-Entity-Ref-ID": a.id,
              "Auto-Submitted": "auto-generated",
              "Precedence": "bulk",
            },
          });

          await client.close();

          await supabase.from("email_logs").insert([{
            lead_id: a.lead_id,
            user_id: userId,
            subject,
            body: html,
            tenant_id: profile.tenant_id,
            status: "sent",
          }]);

          emailsSent++;
          console.log(`Sent reminder to ${profile.email}: ${subject}`);
        } catch (emailErr) {
          console.error(`Failed reminder to ${profile.email}:`, emailErr);
        }
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
