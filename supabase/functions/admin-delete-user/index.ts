import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Ingen autorisasjon" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get calling user
    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Ugyldig sesjon" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is admin
    const { data: adminCheck } = await adminClient
      .from("app_admins")
      .select("user_id")
      .eq("user_id", callingUser.id)
      .maybeSingle();

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: "Ingen admin-tilgang" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { target_user_id, confirm_text } = await req.json();

    if (!target_user_id || typeof target_user_id !== "string") {
      return new Response(
        JSON.stringify({ error: "target_user_id mangler" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cannot delete self
    if (target_user_id === callingUser.id) {
      return new Response(
        JSON.stringify({ error: "Du kan ikke slette din egen bruker" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user profile for validation and audit
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", target_user_id)
      .maybeSingle();

    if (!targetProfile?.email) {
      return new Response(
        JSON.stringify({ error: "Finner ikke brukerens e-post" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate confirm text matches "SLETT <email>"
    const expectedConfirm = `SLETT ${targetProfile.email}`;
    if (confirm_text !== expectedConfirm) {
      return new Response(
        JSON.stringify({ error: "Bekreftelsestekst stemmer ikke" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cannot delete last admin
    const { data: targetAdminCheck } = await adminClient
      .from("app_admins")
      .select("user_id")
      .eq("user_id", target_user_id)
      .maybeSingle();

    if (targetAdminCheck) {
      const { count } = await adminClient
        .from("app_admins")
        .select("*", { count: "exact", head: true });

      if (count !== null && count <= 1) {
        return new Response(
          JSON.stringify({ error: "Kan ikke slette siste admin-bruker" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract request metadata for audit
    const ipAddress = req.headers.get("x-forwarded-for")
      || req.headers.get("x-real-ip")
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Log delete request
    await adminClient.from("admin_audit_logs").insert({
      admin_user_id: callingUser.id,
      target_user_id,
      action: "user_delete_requested",
      details: {
        target_name: targetProfile.full_name,
        target_email: targetProfile.email,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // Delete user data from known tables
    const deletedTables: string[] = [];

    const tablesToDelete = [
      "competition_ai_summaries",
      "competition_stage_images",
      "competition_stage_logs",
      "competition_entries",
      "competition_stages",
      "competitions",
      "match_holds",
      "match_sessions",
      "training_series",
      "training_sessions",
      "weapon_shot_logs",
      "ammo_logs",
      "ammo_inventory",
      "barrel_lifespan_profiles",
      "click_table_rows",
      "click_tables",
      "ballistic_profiles",
      "weapon_barrels",
      "weapons",
      "shot_logs",
      "billing_events",
      "licenses",
      "stripe_customers",
      "user_active_setup",
      "focus_points",
    ];

    for (const table of tablesToDelete) {
      try {
        const { error } = await adminClient.from(table).delete().eq("user_id", target_user_id);
        if (!error) {
          deletedTables.push(table);
        }
      } catch {
        // Table might not exist or column might differ - skip safely
      }
    }

    // Delete profile (uses id, not user_id)
    await adminClient.from("profiles").delete().eq("id", target_user_id);
    deletedTables.push("profiles");

    // Remove from app_admins if they were admin
    if (targetAdminCheck) {
      await adminClient.from("app_admins").delete().eq("user_id", target_user_id);
      deletedTables.push("app_admins");
    }

    // Delete auth user via admin API
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(target_user_id);

    // Log completion
    await adminClient.from("admin_audit_logs").insert({
      admin_user_id: callingUser.id,
      target_user_id,
      action: "user_deleted",
      details: {
        target_name: targetProfile.full_name,
        target_email: targetProfile.email,
        deleted_tables: deletedTables,
        auth_deleted: !deleteAuthError,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        deleted_tables: deletedTables,
        auth_deleted: !deleteAuthError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Ukjent feil" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
