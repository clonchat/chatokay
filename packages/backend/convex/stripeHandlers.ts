import { internalMutation } from "./_generated/server.js";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";

/**
 * Handle checkout completed event
 * This is called from stripe.ts action after retrieving session data
 */
export const handleCheckoutCompleted = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    planType: v.union(v.literal("monthly"), v.literal("annual")),
    priceId: v.string(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    console.log("handleCheckoutCompleted called with:", {
      userId: args.userId,
      planType: args.planType,
      currentPeriodEnd: args.currentPeriodEnd,
    });

    // Update subscription
    await ctx.runMutation(internal.subscriptions.updateSubscriptionFromStripe, {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: "active",
      planType: args.planType,
      priceId: args.priceId,
      currentPeriodEnd: args.currentPeriodEnd,
    });
  },
});

/**
 * Handle subscription updated event
 * This is called from stripe.ts action after retrieving subscription data
 */
export const handleSubscriptionUpdated = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("expired")
    ),
    planType: v.union(v.literal("monthly"), v.literal("annual")),
    priceId: v.string(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    // Update subscription
    await ctx.runMutation(internal.subscriptions.updateSubscriptionFromStripe, {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: args.status,
      planType: args.planType,
      priceId: args.priceId,
      currentPeriodEnd: args.currentPeriodEnd,
    });
  },
});

/**
 * Handle subscription deleted event
 */
export const handleSubscriptionDeleted = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    planType: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    priceId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Update subscription to canceled
    await ctx.runMutation(internal.subscriptions.updateSubscriptionFromStripe, {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: "canceled",
      planType: args.planType,
      priceId: args.priceId,
      currentPeriodEnd: args.currentPeriodEnd,
    });
  },
});

/**
 * Handle payment failed event
 */
export const handlePaymentFailed = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    planType: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    priceId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Update subscription to past_due
    await ctx.runMutation(internal.subscriptions.updateSubscriptionFromStripe, {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: "past_due",
      planType: args.planType,
      priceId: args.priceId,
      currentPeriodEnd: args.currentPeriodEnd,
    });
  },
});

