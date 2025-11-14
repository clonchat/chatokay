"use node";

import { action } from "./_generated/server.js";
import { v } from "convex/values";
import { internal, api } from "./_generated/api.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

/**
 * Verify Stripe webhook signature (must be in Node.js runtime)
 */
export const verifyWebhook = action({
  args: {
    body: v.string(),
    signature: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        args.secret
      );
      return event;
    } catch (err) {
      console.error("Webhook verification error:", err);
      throw new Error("Invalid webhook signature");
    }
  },
});

/**
 * Create Stripe checkout session
 */
export const createCheckoutSession = action({
  args: {
    planType: v.union(v.literal("monthly"), v.literal("annual")),
  },
  handler: async (ctx, args): Promise<{ url: string | null }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get user from database
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user's subscription
    const subscription = await ctx.runQuery(
      api.subscriptions.getCurrentUserSubscription
    );

    // Only create trial if user truly has no subscription
    // Don't create a new trial if user already had one (even if expired)
    if (!subscription) {
      // Check if user is a client (only clients get trials)
      if (user.role === "client") {
        console.log(
          "No subscription found for client, creating trial subscription"
        );
        await ctx.runMutation(internal.subscriptions.createTrialSubscription, {
          userId: user._id,
        });
        // Get the newly created subscription
        const newSubscription = await ctx.runQuery(
          api.subscriptions.getCurrentUserSubscription
        );
        if (!newSubscription) {
          throw new Error("Failed to create subscription");
        }
        // Use the new subscription
        const subscriptionToUse = newSubscription;

        // Continue with checkout using the new subscription
        const priceId =
          args.planType === "monthly"
            ? process.env.STRIPE_PRICE_ID_MONTHLY
            : process.env.STRIPE_PRICE_ID_ANNUAL;

        if (!priceId) {
          throw new Error("Price ID not configured");
        }

        // Create or get Stripe customer
        let customerId: string = subscriptionToUse.stripeCustomerId || "";
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: {
              userId: user._id,
            },
          });
          customerId = customer.id;

          // Update subscription with customer ID
          await ctx.runMutation(
            internal.subscriptions.updateSubscriptionFromStripe,
            {
              userId: user._id,
              stripeCustomerId: customerId,
              status: subscriptionToUse.status,
              planType: subscriptionToUse.planType ?? undefined,
              priceId: subscriptionToUse.priceId ?? undefined,
              currentPeriodEnd: subscriptionToUse.currentPeriodEnd ?? undefined,
            }
          );
        }

        // Check for active promotion
        const promotion = await ctx.runQuery(
          api.promotions.getPromotionByClient,
          {
            clientUserId: user._id,
          }
        );

        // Get coupon ID for the plan type
        let couponId: string | undefined;
        if (promotion && promotion.stripeCouponId) {
          const [monthlyCouponId, annualCouponId] =
            promotion.stripeCouponId.split(",");
          couponId =
            args.planType === "monthly" ? monthlyCouponId : annualCouponId;
        }

        // Create checkout session
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
          customer: customerId,
          mode: "subscription",
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/suscripciones?success=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/suscripciones?canceled=true`,
          metadata: {
            userId: user._id,
            planType: args.planType,
            ...(promotion ? { promotionId: promotion._id } : {}),
          },
        };

        // Apply coupon if promotion exists
        if (couponId) {
          sessionParams.discounts = [{ coupon: couponId }];
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        return { url: session.url };
      } else {
        throw new Error("Subscription required for this user");
      }
    }

    // Get price ID based on plan type
    const priceId =
      args.planType === "monthly"
        ? process.env.STRIPE_PRICE_ID_MONTHLY
        : process.env.STRIPE_PRICE_ID_ANNUAL;

    if (!priceId) {
      throw new Error("Price ID not configured");
    }

    // Create or get Stripe customer
    let customerId: string = subscription.stripeCustomerId || "";
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id,
        },
      });
      customerId = customer.id;

      // Update subscription with customer ID
      await ctx.runMutation(
        internal.subscriptions.updateSubscriptionFromStripe,
        {
          userId: user._id,
          stripeCustomerId: customerId,
          status: subscription.status,
          planType: subscription.planType ?? undefined,
          priceId: subscription.priceId ?? undefined,
          currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
        }
      );
    }

    // Check for active promotion
    const promotion = await ctx.runQuery(api.promotions.getPromotionByClient, {
      clientUserId: user._id,
    });

    // Get coupon ID for the plan type
    let couponId: string | undefined;
    if (promotion && promotion.stripeCouponId) {
      const [monthlyCouponId, annualCouponId] =
        promotion.stripeCouponId.split(",");
      couponId = args.planType === "monthly" ? monthlyCouponId : annualCouponId;
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/suscripciones?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/suscripciones?canceled=true`,
      metadata: {
        userId: user._id,
        planType: args.planType,
        ...(promotion ? { promotionId: promotion._id } : {}),
      },
    };

    // Apply coupon if promotion exists
    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return { url: session.url };
  },
});

/**
 * Sync subscription from Stripe (manual sync to fix data)
 */
export const syncSubscriptionFromStripe = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get user from database
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user's subscription
    const subscription = await ctx.runQuery(
      api.subscriptions.getCurrentUserSubscription
    );

    if (!subscription?.stripeSubscriptionId) {
      throw new Error("No Stripe subscription found");
    }

    // Retrieve subscription from Stripe with expanded data
    const stripeSubscription: Stripe.Subscription =
      await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId, {
        expand: ["latest_invoice", "schedule"],
      });
    // For flexible billing mode, we need to use billing_cycle_anchor or start_date
    const billingCycleAnchor = stripeSubscription.billing_cycle_anchor;
    const startDate = stripeSubscription.start_date;
    // current_period_start and current_period_end are standard properties of Subscription
    // Using index access for properties that TypeScript may not recognize in the type definition
    const currentPeriodStart = (
      stripeSubscription as unknown as Record<string, unknown>
    ).current_period_start as number | undefined;
    const currentPeriodEnd = (
      stripeSubscription as unknown as Record<string, unknown>
    ).current_period_end as number | undefined;

    console.log("Syncing subscription from Stripe:", {
      subscriptionId: stripeSubscription.id,
      billing_cycle_anchor: billingCycleAnchor,
      start_date: startDate,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      status: stripeSubscription.status,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      items: stripeSubscription.items.data.map((item) => ({
        priceId: item.price.id,
        interval: item.price.recurring?.interval,
        intervalCount: item.price.recurring?.interval_count,
      })),
    });

    // Determine plan type from price ID
    const priceId = stripeSubscription.items.data[0]?.price.id;
    const planType =
      priceId === process.env.STRIPE_PRICE_ID_ANNUAL ? "annual" : "monthly";

    // Map Stripe status to our status
    let status: "active" | "past_due" | "canceled" | "expired" = "active";
    if (stripeSubscription.status === "past_due") {
      status = "past_due";
    } else if (
      stripeSubscription.status === "canceled" ||
      stripeSubscription.status === "unpaid"
    ) {
      status = "canceled";
    } else if (stripeSubscription.status === "incomplete_expired") {
      status = "expired";
    }

    // Get current_period_end (Stripe returns Unix timestamp in seconds)
    // For flexible billing mode, we may need to calculate it from billing_cycle_anchor
    let currentPeriodEndUnix: number | undefined = currentPeriodEnd;

    if (
      !currentPeriodEndUnix ||
      typeof currentPeriodEndUnix !== "number" ||
      isNaN(currentPeriodEndUnix)
    ) {
      // Try to get period start first
      let periodStartUnix = currentPeriodStart;

      // If no current_period_start, use billing_cycle_anchor or start_date
      if (
        !periodStartUnix ||
        typeof periodStartUnix !== "number" ||
        isNaN(periodStartUnix)
      ) {
        periodStartUnix = billingCycleAnchor || startDate;
      }

      const price = stripeSubscription.items.data[0]?.price;
      const interval = price?.recurring?.interval;
      const intervalCount = price?.recurring?.interval_count || 1;

      if (periodStartUnix && interval) {
        // Calculate period end based on interval using actual date arithmetic
        const periodStartDate = new Date(periodStartUnix * 1000);
        const periodEndDate = new Date(periodStartDate);

        if (interval === "month") {
          periodEndDate.setMonth(periodEndDate.getMonth() + intervalCount);
          currentPeriodEndUnix = Math.floor(periodEndDate.getTime() / 1000);
        } else if (interval === "year") {
          periodEndDate.setFullYear(
            periodEndDate.getFullYear() + intervalCount
          );
          currentPeriodEndUnix = Math.floor(periodEndDate.getTime() / 1000);
        } else if (interval === "day") {
          periodEndDate.setDate(periodEndDate.getDate() + intervalCount);
          currentPeriodEndUnix = Math.floor(periodEndDate.getTime() / 1000);
        } else if (interval === "week") {
          periodEndDate.setDate(periodEndDate.getDate() + intervalCount * 7);
          currentPeriodEndUnix = Math.floor(periodEndDate.getTime() / 1000);
        } else {
          // Fallback: use seconds calculation for unknown intervals
          const periodSeconds = intervalCount * 30 * 24 * 60 * 60; // Default to 30 days
          currentPeriodEndUnix = periodStartUnix + periodSeconds;
        }
        console.log("Calculated current_period_end:", {
          periodStartUnix,
          periodStartDate: new Date(periodStartUnix * 1000).toISOString(),
          interval,
          intervalCount,
          calculatedEnd: currentPeriodEndUnix,
          calculatedEndDate: currentPeriodEndUnix
            ? new Date(currentPeriodEndUnix * 1000).toISOString()
            : "undefined",
        });
      } else {
        // Last resort: use a default period based on plan type
        const defaultPeriod = planType === "annual" ? 365 : 30;
        currentPeriodEndUnix =
          Math.floor(Date.now() / 1000) + defaultPeriod * 24 * 60 * 60;
        console.log("Using default period end:", {
          planType,
          defaultPeriod,
          calculatedEnd: currentPeriodEndUnix,
        });
      }
    }

    if (!currentPeriodEndUnix) {
      throw new Error("Unable to determine subscription period end");
    }

    const currentPeriodEndMs = currentPeriodEndUnix * 1000; // Convert to milliseconds

    // Update subscription
    await ctx.runMutation(internal.subscriptions.updateSubscriptionFromStripe, {
      userId: user._id,
      stripeCustomerId: stripeSubscription.customer as string,
      stripeSubscriptionId: stripeSubscription.id,
      status,
      planType,
      priceId: priceId || "",
      currentPeriodEnd: currentPeriodEndMs,
    });

    const renewalDate = new Date(currentPeriodEndMs).toLocaleDateString(
      "es-ES",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    return {
      success: true,
      message: `Suscripción sincronizada. Nueva fecha de renovación: ${renewalDate}`,
    };
  },
});

/**
 * Create Stripe customer portal session
 */
export const createPortalSession = action({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get user from database
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user's subscription
    const subscription = await ctx.runQuery(
      api.subscriptions.getCurrentUserSubscription
    );

    if (!subscription?.stripeCustomerId) {
      throw new Error("No active subscription found");
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/suscripciones`,
    });

    return { url: session.url };
  },
});

/**
 * Process checkout completed event (action that calls Stripe API and then internal mutation)
 */
export const processCheckoutCompleted = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
      expand: ["subscription"],
    });

    if (!session.customer || !session.subscription) {
      console.error("Missing customer or subscription in checkout session");
      return;
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
    const customerId = session.customer as string;

    // Retrieve the full subscription object directly from Stripe
    // This ensures we get all the correct data including current_period_end
    const subscription: Stripe.Subscription =
      await stripe.subscriptions.retrieve(subscriptionId);

    // Access current_period_end using index access since TypeScript types may not include it
    const currentPeriodEndValue = (
      subscription as unknown as Record<string, unknown>
    ).current_period_end as number | undefined;

    console.log("Retrieved subscription from Stripe:", {
      id: subscription.id,
      current_period_end: currentPeriodEndValue,
      current_period_end_date:
        currentPeriodEndValue && typeof currentPeriodEndValue === "number"
          ? new Date(currentPeriodEndValue * 1000).toISOString()
          : "invalid",
      status: subscription.status,
      items: subscription.items.data.map((item) => ({
        priceId: item.price.id,
        interval: item.price.recurring?.interval,
      })),
    });

    // Get userId from session metadata or find by customer ID
    let userId: string | undefined;
    if (session.metadata?.userId) {
      userId = session.metadata.userId;
    } else {
      // Find user by customer ID
      const userSubscription = await ctx.runQuery(
        internal.subscriptions.getSubscriptionByCustomerId,
        { customerId }
      );

      if (!userSubscription) {
        console.error("Subscription not found for customer:", customerId);
        return;
      }
      userId = userSubscription.userId;
    }

    // Determine plan type from price ID or metadata
    const priceId = subscription.items.data[0]?.price.id;
    const planType =
      priceId === process.env.STRIPE_PRICE_ID_ANNUAL
        ? "annual"
        : session.metadata?.planType === "annual"
          ? "annual"
          : "monthly";

    // Get current_period_end from subscription (Stripe returns Unix timestamp in seconds)
    // Using index access for properties that TypeScript may not recognize
    const currentPeriodEndUnix = (
      subscription as unknown as Record<string, unknown>
    ).current_period_end as number | undefined;
    const currentPeriodEnd =
      currentPeriodEndUnix && typeof currentPeriodEndUnix === "number"
        ? currentPeriodEndUnix * 1000 // Convert to milliseconds
        : undefined;

    console.log("Processing checkout completed:", {
      userId,
      planType,
      currentPeriodEndUnix,
      currentPeriodEnd,
      currentPeriodEndDate: currentPeriodEnd
        ? new Date(currentPeriodEnd).toISOString()
        : "undefined",
    });

    // Call internal mutation handler
    await ctx.runMutation(internal.stripeHandlers.handleCheckoutCompleted, {
      userId: userId as any,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      planType,
      priceId: priceId || "",
      currentPeriodEnd:
        currentPeriodEnd || Date.now() + 30 * 24 * 60 * 60 * 1000, // Fallback to 30 days from now
    });
  },
});

/**
 * Process subscription updated event (action that calls Stripe API and then internal mutation)
 */
export const processSubscriptionUpdated = action({
  args: {
    subscriptionId: v.string(),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription: Stripe.Subscription =
      await stripe.subscriptions.retrieve(args.subscriptionId);

    // Find user by customer ID
    const userSubscription = await ctx.runQuery(
      internal.subscriptions.getSubscriptionByCustomerId,
      { customerId: args.customerId }
    );

    if (!userSubscription) {
      console.error("Subscription not found for customer:", args.customerId);
      return;
    }

    // Determine plan type from price ID
    const priceId = subscription.items.data[0]?.price.id;
    const planType =
      priceId === process.env.STRIPE_PRICE_ID_ANNUAL ? "annual" : "monthly";

    // Map Stripe status to our status
    let status: "active" | "past_due" | "canceled" | "expired" = "active";
    if (subscription.status === "past_due") {
      status = "past_due";
    } else if (
      subscription.status === "canceled" ||
      subscription.status === "unpaid"
    ) {
      status = "canceled";
    } else if (subscription.status === "incomplete_expired") {
      status = "expired";
    }

    // Get current_period_end from subscription (Stripe returns Unix timestamp in seconds)
    // Using index access for properties that TypeScript may not recognize
    const currentPeriodEndUnix = (
      subscription as unknown as Record<string, unknown>
    ).current_period_end as number | undefined;
    const currentPeriodEnd =
      currentPeriodEndUnix && typeof currentPeriodEndUnix === "number"
        ? currentPeriodEndUnix * 1000 // Convert to milliseconds
        : undefined;

    // Call internal mutation handler
    await ctx.runMutation(internal.stripeHandlers.handleSubscriptionUpdated, {
      userId: userSubscription.userId,
      stripeCustomerId: args.customerId,
      stripeSubscriptionId: subscription.id,
      status,
      planType,
      priceId: priceId || "",
      currentPeriodEnd:
        currentPeriodEnd || Date.now() + 30 * 24 * 60 * 60 * 1000, // Fallback to 30 days from now
    });
  },
});

/**
 * Process subscription deleted event (action that calls internal mutation)
 */
export const processSubscriptionDeleted = action({
  args: {
    subscriptionId: v.string(),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by customer ID
    const userSubscription = await ctx.runQuery(
      internal.subscriptions.getSubscriptionByCustomerId,
      { customerId: args.customerId }
    );

    if (!userSubscription) {
      console.error("Subscription not found for customer:", args.customerId);
      return;
    }

    // Call internal mutation handler
    await ctx.runMutation(internal.stripeHandlers.handleSubscriptionDeleted, {
      userId: userSubscription.userId,
      stripeCustomerId: args.customerId,
      stripeSubscriptionId: args.subscriptionId,
      planType: userSubscription.planType ?? undefined,
      priceId: userSubscription.priceId ?? undefined,
      currentPeriodEnd: userSubscription.currentPeriodEnd ?? undefined,
    });
  },
});

/**
 * Process payment failed event (action that calls internal mutation)
 */
export const processPaymentFailed = action({
  args: {
    subscriptionId: v.string(),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by customer ID
    const userSubscription = await ctx.runQuery(
      internal.subscriptions.getSubscriptionByCustomerId,
      { customerId: args.customerId }
    );

    if (!userSubscription) {
      console.error("Subscription not found for customer:", args.customerId);
      return;
    }

    // Call internal mutation handler
    await ctx.runMutation(internal.stripeHandlers.handlePaymentFailed, {
      userId: userSubscription.userId,
      stripeCustomerId: args.customerId,
      stripeSubscriptionId: args.subscriptionId,
      planType: userSubscription.planType ?? undefined,
      priceId: userSubscription.priceId ?? undefined,
      currentPeriodEnd: userSubscription.currentPeriodEnd ?? undefined,
    });
  },
});
