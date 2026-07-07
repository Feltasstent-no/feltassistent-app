import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingLicense } = await serviceClient
      .from("licenses")
      .select(`
        id,
        status,
        current_period_start,
        current_period_end,
        trial_start,
        trial_end,
        cancel_at_period_end,
        plan:plans(name, price_nok, billing_interval)
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingLicense) {
      return new Response(
        JSON.stringify({ license: existingLicense, created: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: product } = await serviceClient
      .from("products")
      .select("id")
      .eq("product_key", "feltassistent")
      .maybeSingle();

    if (!product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: plan } = await serviceClient
      .from("plans")
      .select("id")
      .eq("plan_key", "full")
      .eq("product_id", product.id)
      .maybeSingle();

    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 90);

    const { data: newLicense, error: insertError } = await serviceClient
      .from("licenses")
      .insert({
        user_id: user.id,
        product_id: product.id,
        plan_id: plan.id,
        status: "trialing",
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
        cancel_at_period_end: false,
      })
      .select(`
        id,
        status,
        current_period_start,
        current_period_end,
        trial_start,
        trial_end,
        cancel_at_period_end,
        plan:plans(name, price_nok, billing_interval)
      `)
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to create trial", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await serviceClient.from("billing_events").insert({
      user_id: user.id,
      license_id: newLicense.id,
      event_type: "trial_started",
      metadata: { plan_key: "full", product_key: "feltassistent", trial_days: 90 },
    });

    return new Response(
      JSON.stringify({ license: newLicense, created: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
