import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "past_due";
    case "incomplete":
    case "incomplete_expired":
      return "expired";
    default:
      return "expired";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeSecretKey || !webhookSecret) {
    return new Response(
      JSON.stringify({ error: "Stripe not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
  const db = createClient(supabaseUrl, supabaseServiceKey);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(
      JSON.stringify({ error: "Missing stripe-signature header" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(db, stripe, event.data.object, event.id);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(db, event.data.object, event.id);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(db, event.data.object, event.id);
        break;
      case "invoice.paid":
        await handleInvoicePaid(db, stripe, event.data.object, event.id);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(db, stripe, event.data.object, event.id);
        break;
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return new Response(
      JSON.stringify({ error: "Webhook handler failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function handleCheckoutCompleted(
  db: ReturnType<typeof createClient>,
  stripe: Stripe,
  session: any,
  stripeEventId: string
) {
  const userId = session.metadata?.user_id || session.client_reference_id;
  const productKey = session.metadata?.product_key;
  const planKey = session.metadata?.plan_key;

  if (!userId || !productKey || !planKey) {
    console.error("Missing metadata in checkout session", session.id);
    return;
  }

  const { data: product } = await db
    .from("products")
    .select("id")
    .eq("product_key", productKey)
    .maybeSingle();

  const { data: plan } = await db
    .from("plans")
    .select("id")
    .eq("plan_key", planKey)
    .maybeSingle();

  if (!product || !plan) {
    console.error("Product or plan not found", { productKey, planKey });
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    console.error("No subscription in checkout session", session.id);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const status = mapStripeStatus(subscription.status);
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  const licenseData = {
    user_id: userId,
    product_id: product.id,
    plan_id: plan.id,
    status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingLicense } = await db
    .from("licenses")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .maybeSingle();

  let licenseId: string;

  if (existingLicense) {
    const { data: updated } = await db
      .from("licenses")
      .update(licenseData)
      .eq("id", existingLicense.id)
      .select("id")
      .single();
    licenseId = updated?.id || existingLicense.id;
  } else {
    const { data: inserted } = await db
      .from("licenses")
      .insert(licenseData)
      .select("id")
      .single();
    licenseId = inserted!.id;
  }

  await db.from("billing_events").insert({
    user_id: userId,
    license_id: licenseId,
    event_type: "checkout_completed",
    stripe_event_id: stripeEventId,
    metadata: {
      session_id: session.id,
      subscription_id: subscriptionId,
      status,
    },
  });
}

async function handleSubscriptionUpdated(
  db: ReturnType<typeof createClient>,
  subscription: any,
  stripeEventId: string
) {
  const subscriptionId = subscription.id;
  const status = mapStripeStatus(subscription.status);

  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  const { data: license } = await db
    .from("licenses")
    .select("id, user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!license) {
    console.error("No license found for subscription", subscriptionId);
    return;
  }

  await db
    .from("licenses")
    .update({
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", license.id);

  await db.from("billing_events").insert({
    user_id: license.user_id,
    license_id: license.id,
    event_type: "subscription_updated",
    stripe_event_id: stripeEventId,
    metadata: { subscription_id: subscriptionId, status },
  });
}

async function handleSubscriptionDeleted(
  db: ReturnType<typeof createClient>,
  subscription: any,
  stripeEventId: string
) {
  const subscriptionId = subscription.id;

  const { data: license } = await db
    .from("licenses")
    .select("id, user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!license) {
    console.error("No license found for deleted subscription", subscriptionId);
    return;
  }

  await db
    .from("licenses")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", license.id);

  await db.from("billing_events").insert({
    user_id: license.user_id,
    license_id: license.id,
    event_type: "subscription_canceled",
    stripe_event_id: stripeEventId,
    metadata: { subscription_id: subscriptionId },
  });
}

async function handleInvoicePaid(
  db: ReturnType<typeof createClient>,
  stripe: Stripe,
  invoice: any,
  stripeEventId: string
) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) return;

  const { data: license } = await db
    .from("licenses")
    .select("id, user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!license) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (subscription.status === "active") {
    const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    await db
      .from("licenses")
      .update({
        status: "active",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", license.id);
  }

  await db.from("billing_events").insert({
    user_id: license.user_id,
    license_id: license.id,
    event_type: "invoice_paid",
    stripe_event_id: stripeEventId,
    metadata: {
      subscription_id: subscriptionId,
      invoice_id: invoice.id,
      amount_paid: invoice.amount_paid,
    },
  });
}

async function handleInvoicePaymentFailed(
  db: ReturnType<typeof createClient>,
  _stripe: Stripe,
  invoice: any,
  stripeEventId: string
) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) return;

  const { data: license } = await db
    .from("licenses")
    .select("id, user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!license) return;

  await db
    .from("licenses")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", license.id);

  await db.from("billing_events").insert({
    user_id: license.user_id,
    license_id: license.id,
    event_type: "payment_failed",
    stripe_event_id: stripeEventId,
    metadata: {
      subscription_id: subscriptionId,
      invoice_id: invoice.id,
      attempt_count: invoice.attempt_count,
    },
  });
}
