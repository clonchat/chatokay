import { httpAction } from "./_generated/server.js";
import { api } from "./_generated/api.js";
import type Stripe from "stripe";

/**
 * HTTP action to handle Stripe webhooks
 * This must be in a separate file without "use node" because httpAction cannot be in Node.js runtime
 * The webhook verification is done in a separate action with "use node"
 */
export const webhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Verify webhook signature using action with Node.js runtime
  let event: any;
  try {
    event = await ctx.runAction(api.stripe.verifyWebhook, {
      body,
      signature,
      secret: webhookSecret,
    });
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (!event) {
    return new Response("Invalid webhook event", { status: 400 });
  }

  console.log("Stripe webhook event:", event.type);

  // Handle different event types
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await ctx.runAction(api.stripe.processCheckoutCompleted, {
        sessionId: session.id,
      });
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await ctx.runAction(api.stripe.processSubscriptionUpdated, {
        subscriptionId: subscription.id,
        customerId: subscription.customer as string,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await ctx.runAction(api.stripe.processSubscriptionDeleted, {
        subscriptionId: subscription.id,
        customerId: subscription.customer as string,
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription;
      if (subscriptionId) {
        await ctx.runAction(api.stripe.processSubscriptionUpdated, {
          subscriptionId:
            typeof subscriptionId === "string"
              ? subscriptionId
              : subscriptionId.id,
          customerId:
            typeof invoice.customer === "string"
              ? invoice.customer
              : (invoice.customer as Stripe.Customer)?.id || "",
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription;
      if (subscriptionId) {
        await ctx.runAction(api.stripe.processPaymentFailed, {
          subscriptionId:
            typeof subscriptionId === "string"
              ? subscriptionId
              : subscriptionId.id,
          customerId:
            typeof invoice.customer === "string"
              ? invoice.customer
              : (invoice.customer as Stripe.Customer)?.id || "",
        });
      }
      break;
    }
  }

  return new Response("Webhook processed", { status: 200 });
});

