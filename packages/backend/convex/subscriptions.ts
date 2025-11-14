import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import { requireAdmin, requireAdminOrSales } from "./roles.js";

/**
 * Get subscription for current user
 */
export const getCurrentUserSubscription = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    return subscription;
  },
});

/**
 * Get subscription by user ID (internal)
 */
export const getSubscriptionByUserId = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Check if user has active subscription (trial or paid)
 */
export const isSubscriptionActive = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return false;
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    if (!subscription) {
      return false;
    }

    const now = Date.now();

    // Check if trial is still active
    if (subscription.status === "trial" && subscription.trialEndDate) {
      return subscription.trialEndDate > now;
    }

    // Check if paid subscription is active
    if (subscription.status === "active") {
      // Also check if current period hasn't ended
      if (subscription.currentPeriodEnd) {
        return subscription.currentPeriodEnd > now;
      }
      return true;
    }

    return false;
  },
});

/**
 * Check subscription status by user ID (internal)
 */
export const checkSubscriptionStatus = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      return { active: false, status: "none" };
    }

    const now = Date.now();

    // Check if trial is still active
    if (subscription.status === "trial" && subscription.trialEndDate) {
      return {
        active: subscription.trialEndDate > now,
        status: subscription.status,
        trialEndDate: subscription.trialEndDate,
      };
    }

    // Check if paid subscription is active
    if (subscription.status === "active") {
      const isActive =
        !subscription.currentPeriodEnd || subscription.currentPeriodEnd > now;
      return {
        active: isActive,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    }

    return {
      active: false,
      status: subscription.status,
    };
  },
});

/**
 * Create trial subscription for new user
 */
export const createTrialSubscription = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if subscription already exists
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create trial subscription (7 days from now)
    const trialEndDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: args.userId,
      status: "trial",
      trialEndDate,
    });

    return subscriptionId;
  },
});

/**
 * Update subscription from Stripe webhook
 */
export const updateSubscriptionFromStripe = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("expired")
    ),
    planType: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    priceId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      // Create new subscription if doesn't exist
      return await ctx.db.insert("subscriptions", {
        userId: args.userId,
        status: args.status,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        planType: args.planType,
        priceId: args.priceId,
        currentPeriodEnd: args.currentPeriodEnd,
      });
    }

    // Update existing subscription
    const updateData: any = {
      status: args.status,
    };

    if (args.stripeCustomerId !== undefined) {
      updateData.stripeCustomerId = args.stripeCustomerId;
    }
    if (args.stripeSubscriptionId !== undefined) {
      updateData.stripeSubscriptionId = args.stripeSubscriptionId;
    }
    if (args.planType !== undefined) {
      updateData.planType = args.planType;
    }
    if (args.priceId !== undefined) {
      updateData.priceId = args.priceId;
    }
    if (args.currentPeriodEnd !== undefined) {
      updateData.currentPeriodEnd = args.currentPeriodEnd;
    }

    await ctx.db.patch(subscription._id, updateData);

    return subscription._id;
  },
});

/**
 * Get subscription status for business (by subdomain)
 */
export const getSubscriptionByBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);
    if (!business) {
      return null;
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", business.userId))
      .first();

    return subscription;
  },
});

/**
 * Get subscription by Stripe customer ID (for actions)
 */
export const getSubscriptionByCustomerId = internalQuery({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.customerId)
      )
      .first();
  },
});

/**
 * List all subscriptions with user data (admin only)
 */
export const listAllSubscriptions = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    // Get user data for each subscription
    const subscriptionsWithUsers = await Promise.all(
      allSubscriptions.map(async (subscription) => {
        const user = await ctx.db.get(subscription.userId);
        return {
          ...subscription,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
              }
            : null,
        };
      })
    );

    return subscriptionsWithUsers;
  },
});

/**
 * List subscriptions for referred clients (sales users)
 */
export const listMyReferredSubscriptions = query({
  handler: async (ctx) => {
    const currentUser = await requireAdminOrSales(ctx);

    // Get all clients referred by this user
    const referredClients = await ctx.db
      .query("users")
      .withIndex("by_referral_id", (q) => q.eq("referralId", currentUser._id))
      .collect();

    // Get subscriptions for referred clients
    const subscriptions = await Promise.all(
      referredClients.map(async (client) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_user_id", (q) => q.eq("userId", client._id))
          .first();

        if (subscription) {
          return {
            ...subscription,
            user: {
              _id: client._id,
              name: client.name,
              email: client.email,
            },
          };
        }

        // Return subscription object with null status if no subscription exists
        return {
          userId: client._id,
          status: undefined,
          user: {
            _id: client._id,
            name: client.name,
            email: client.email,
          },
        };
      })
    );

    return subscriptions;
  },
});

// Constants for pricing
const MONTHLY_PRICE_EUR = 140;
const ANNUAL_PRICE_EUR = 1440; // Total per year
const ANNUAL_MONTHLY_EQUIVALENT = 120; // 1440 / 12

/**
 * Calculate revenue for a single subscription
 * If promotion is provided, uses promotional prices instead of standard prices
 */
function calculateSubscriptionRevenue(
  subscription: {
    status: string | null;
    planType?: "monthly" | "annual" | null;
    currentPeriodEnd?: number | null;
    trialEndDate?: number | null;
    userId?: string;
  },
  includeTrial: boolean = false,
  promotion?: {
    monthlyPrice: number; // in cents
    annualPrice: number; // in cents
  } | null
): number {
  if (
    !subscription.status ||
    subscription.status === "canceled" ||
    subscription.status === "expired"
  ) {
    return 0;
  }

  // Don't count trial subscriptions unless explicitly requested
  if (subscription.status === "trial" && !includeTrial) {
    return 0;
  }

  // Only count active subscriptions for revenue
  if (subscription.status !== "active" && subscription.status !== "past_due") {
    return 0;
  }

  // Use promotional prices if available
  if (promotion) {
    if (subscription.planType === "monthly") {
      return promotion.monthlyPrice / 100; // Convert cents to euros
    } else if (subscription.planType === "annual") {
      return promotion.annualPrice / 12 / 100; // Convert annual to monthly equivalent
    }
  }

  // Use standard prices
  if (subscription.planType === "monthly") {
    return MONTHLY_PRICE_EUR;
  } else if (subscription.planType === "annual") {
    return ANNUAL_MONTHLY_EQUIVALENT;
  }

  return 0;
}

/**
 * Get client revenue and subscription history (admin and sales can view)
 */
export const getClientRevenue = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdminOrSales(ctx);

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        annualRevenue: 0,
        currentSubscription: null,
      };
    }

    // Check for active promotion
    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_client_user_id", (q) => q.eq("clientUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    const monthlyRevenue = calculateSubscriptionRevenue(
      subscription,
      false,
      promotion || undefined
    );

    return {
      totalRevenue: monthlyRevenue,
      monthlyRevenue: subscription.planType === "monthly" ? monthlyRevenue : 0,
      annualRevenue: subscription.planType === "annual" ? monthlyRevenue : 0,
      currentSubscription: {
        ...subscription,
        monthlyRevenue,
      },
    };
  },
});

/**
 * Get client subscription history (admin and sales can view)
 */
export const getClientSubscriptionHistory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdminOrSales(ctx);

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      return [];
    }

    // For now, we only have current subscription
    // In the future, we could track subscription changes
    const history: Array<{
      startDate: number;
      endDate: number | null;
      planType: "monthly" | "annual" | null | undefined;
      status: string;
      amount: number;
    }> = [];

    if (
      subscription.status === "active" ||
      subscription.status === "past_due"
    ) {
      const startDate = subscription.currentPeriodEnd
        ? new Date(
            subscription.currentPeriodEnd -
              (subscription.planType === "annual" ? 365 : 30) *
                24 *
                60 *
                60 *
                1000
          )
        : new Date();

      history.push({
        startDate: startDate.getTime(),
        endDate: subscription.currentPeriodEnd || null,
        planType: subscription.planType,
        status: subscription.status,
        amount: calculateSubscriptionRevenue(subscription),
      });
    }

    return history;
  },
});

/**
 * Get total platform revenue (admin only)
 */
export const getTotalPlatformRevenue = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    let totalMRR = 0;
    let monthlyCount = 0;
    let annualCount = 0;
    let activeCount = 0;

    // Get all active promotions
    const activePromotions = await ctx.db
      .query("promotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const promotionMap = new Map<string, (typeof activePromotions)[0]>();
    activePromotions.forEach((promo) => {
      promotionMap.set(promo.clientUserId, promo);
    });

    allSubscriptions.forEach((sub) => {
      if (sub.status === "active" || sub.status === "past_due") {
        activeCount++;
        const promotion = promotionMap.get(sub.userId);
        const revenue = calculateSubscriptionRevenue(
          sub,
          false,
          promotion || undefined
        );
        totalMRR += revenue;

        if (sub.planType === "monthly") {
          monthlyCount++;
        } else if (sub.planType === "annual") {
          annualCount++;
        }
      }
    });

    return {
      totalMRR,
      annualARR: totalMRR * 12,
      activeSubscriptions: activeCount,
      monthlySubscriptions: monthlyCount,
      annualSubscriptions: annualCount,
    };
  },
});

/**
 * Get revenue from referred clients (sales users)
 */
export const getMyReferredClientsRevenue = query({
  handler: async (ctx) => {
    const currentUser = await requireAdminOrSales(ctx);

    // Get all clients referred by this user
    const referredClients = await ctx.db
      .query("users")
      .withIndex("by_referral_id", (q) => q.eq("referralId", currentUser._id))
      .collect();

    let totalMRR = 0;
    let monthlyCount = 0;
    let annualCount = 0;
    let activeCount = 0;

    // Get active promotions for referred clients
    const activePromotions = await ctx.db
      .query("promotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const promotionMap = new Map<string, (typeof activePromotions)[0]>();
    activePromotions.forEach((promo) => {
      promotionMap.set(promo.clientUserId, promo);
    });

    for (const client of referredClients) {
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user_id", (q) => q.eq("userId", client._id))
        .first();

      if (
        subscription &&
        (subscription.status === "active" || subscription.status === "past_due")
      ) {
        activeCount++;
        const promotion = promotionMap.get(client._id);
        const revenue = calculateSubscriptionRevenue(
          subscription,
          false,
          promotion || undefined
        );
        totalMRR += revenue;

        if (subscription.planType === "monthly") {
          monthlyCount++;
        } else if (subscription.planType === "annual") {
          annualCount++;
        }
      }
    }

    return {
      totalMRR,
      annualARR: totalMRR * 12,
      activeSubscriptions: activeCount,
      monthlySubscriptions: monthlyCount,
      annualSubscriptions: annualCount,
      totalClients: referredClients.length,
    };
  },
});

/**
 * Get revenue by month for the last 12 months (admin)
 */
export const getRevenueByMonth = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const months = args.months || 12;
    const now = Date.now();
    const monthlyData: Array<{
      month: string;
      revenue: number;
      subscriptions: number;
    }> = [];

    // Get all active subscriptions
    const allSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "past_due")
        )
      )
      .collect();

    // Get all active promotions
    const activePromotions = await ctx.db
      .query("promotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const promotionMap = new Map<string, (typeof activePromotions)[0]>();
    activePromotions.forEach((promo) => {
      promotionMap.set(promo.clientUserId, promo);
    });

    // Calculate revenue for each month
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

      let monthRevenue = 0;
      let monthSubscriptions = 0;

      allSubscriptions.forEach((sub) => {
        // Check if subscription was active during this month
        const subStart = sub.currentPeriodEnd
          ? new Date(
              sub.currentPeriodEnd -
                (sub.planType === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000
            )
          : new Date(0);
        const subEnd = sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd)
          : new Date(now);

        if (subStart <= monthEnd && subEnd >= monthStart) {
          const promotion = promotionMap.get(sub.userId);
          monthRevenue += calculateSubscriptionRevenue(
            sub,
            false,
            promotion || undefined
          );
          monthSubscriptions++;
        }
      });

      monthlyData.push({
        month: monthKey,
        revenue: monthRevenue,
        subscriptions: monthSubscriptions,
      });
    }

    return monthlyData;
  },
});

/**
 * Get revenue by month for referred clients (sales users)
 */
export const getMyReferredClientsRevenueByMonth = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAdminOrSales(ctx);

    const months = args.months || 12;
    const now = Date.now();
    const monthlyData: Array<{
      month: string;
      revenue: number;
      subscriptions: number;
    }> = [];

    // Get all clients referred by this user
    const referredClients = await ctx.db
      .query("users")
      .withIndex("by_referral_id", (q) => q.eq("referralId", currentUser._id))
      .collect();

    // Get subscriptions for referred clients
    const subscriptions: Array<{
      subscription: any;
      userId: string;
    }> = [];

    for (const client of referredClients) {
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user_id", (q) => q.eq("userId", client._id))
        .first();

      if (
        subscription &&
        (subscription.status === "active" || subscription.status === "past_due")
      ) {
        subscriptions.push({
          subscription,
          userId: client._id,
        });
      }
    }

    // Calculate revenue for each month
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

      let monthRevenue = 0;
      let monthSubscriptions = 0;

      // Get active promotions for these subscriptions
      const activePromotions = await ctx.db
        .query("promotions")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();

      const promotionMap = new Map<string, (typeof activePromotions)[0]>();
      activePromotions.forEach((promo) => {
        promotionMap.set(promo.clientUserId, promo);
      });

      subscriptions.forEach(({ subscription: sub, userId }) => {
        const subStart = sub.currentPeriodEnd
          ? new Date(
              sub.currentPeriodEnd -
                (sub.planType === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000
            )
          : new Date(0);
        const subEnd = sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd)
          : new Date(now);

        if (subStart <= monthEnd && subEnd >= monthStart) {
          const promotion = promotionMap.get(userId);
          monthRevenue += calculateSubscriptionRevenue(
            sub,
            false,
            promotion || undefined
          );
          monthSubscriptions++;
        }
      });

      monthlyData.push({
        month: monthKey,
        revenue: monthRevenue,
        subscriptions: monthSubscriptions,
      });
    }

    return monthlyData;
  },
});

/**
 * Get detailed revenue breakdown for commercial user's referred clients
 * Returns breakdown by active subscription with platform fee and profit calculations
 */
export const getMyReferredClientsRevenueBreakdown = query({
  handler: async (ctx) => {
    const currentUser = await requireAdminOrSales(ctx);

    // Get platform settings
    const platformSettings = await ctx.db.query("platformSettings").first();
    const platformFeePercentage = platformSettings?.platformFeePercentage ?? 10;

    // Get all clients referred by this user
    const referredClients = await ctx.db
      .query("users")
      .withIndex("by_referral_id", (q) => q.eq("referralId", currentUser._id))
      .collect();

    // Get active promotions for referred clients
    const activePromotions = await ctx.db
      .query("promotions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const promotionMap = new Map<string, (typeof activePromotions)[0]>();
    activePromotions.forEach((promo) => {
      promotionMap.set(promo.clientUserId, promo);
    });

    const breakdown: Array<{
      clientId: string;
      clientName: string | null;
      clientEmail: string;
      subscriptionStatus: string | null;
      planType: "monthly" | "annual" | null;
      monthlyRevenue: number;
      platformFee: number;
      remainingAfterFee: number;
      commercialProfit: number;
      chatokayProfit: number;
      hasPromotion: boolean;
    }> = [];

    let totalMonthlyRevenue = 0;
    let totalPlatformFee = 0;
    let totalCommercialProfit = 0;
    let totalChatokayProfit = 0;

    for (const client of referredClients) {
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user_id", (q) => q.eq("userId", client._id))
        .first();

      if (
        subscription &&
        (subscription.status === "active" || subscription.status === "past_due")
      ) {
        const promotion = promotionMap.get(client._id);
        const monthlyRevenue = calculateSubscriptionRevenue(
          subscription,
          false,
          promotion || undefined
        );

        // Calculate breakdown
        const platformFee = (monthlyRevenue * platformFeePercentage) / 100;
        const remainingAfterFee = monthlyRevenue - platformFee;
        const commercialProfit = remainingAfterFee * 0.5; // 50% for commercial
        const chatokayProfit = remainingAfterFee * 0.5; // 50% for ChatOkay

        totalMonthlyRevenue += monthlyRevenue;
        totalPlatformFee += platformFee;
        totalCommercialProfit += commercialProfit;
        totalChatokayProfit += chatokayProfit;

        breakdown.push({
          clientId: client._id,
          clientName: client.name ?? null,
          clientEmail: client.email,
          subscriptionStatus: subscription.status,
          planType: subscription.planType ?? null,
          monthlyRevenue,
          platformFee,
          remainingAfterFee,
          commercialProfit,
          chatokayProfit,
          hasPromotion: !!promotion,
        });
      }
    }

    return {
      breakdown,
      totals: {
        totalMonthlyRevenue,
        totalPlatformFee,
        totalCommercialProfit,
        totalChatokayProfit,
        platformFeePercentage,
      },
    };
  },
});

/**
 * Get subscription statistics (admin only)
 */
export const getSubscriptionStats = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    let active = 0;
    let trial = 0;
    let canceled = 0;
    let expired = 0;
    let pastDue = 0;

    allSubscriptions.forEach((sub) => {
      if (!sub.status) return;

      switch (sub.status) {
        case "active":
          active++;
          break;
        case "trial":
          trial++;
          break;
        case "canceled":
          canceled++;
          break;
        case "expired":
          expired++;
          break;
        case "past_due":
          pastDue++;
          break;
      }
    });

    return {
      active,
      trial,
      canceled,
      expired,
      pastDue,
      total: allSubscriptions.length,
    };
  },
});

/**
 * Get revenue breakdown by plan type (admin only)
 */
export const getRevenueByPlanType = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    let monthlyRevenue = 0;
    let annualRevenue = 0;
    let monthlyCount = 0;
    let annualCount = 0;

    allSubscriptions.forEach((sub) => {
      if (sub.status === "active" || sub.status === "past_due") {
        if (sub.planType === "monthly") {
          monthlyRevenue += MONTHLY_PRICE_EUR;
          monthlyCount++;
        } else if (sub.planType === "annual") {
          annualRevenue += ANNUAL_MONTHLY_EQUIVALENT;
          annualCount++;
        }
      }
    });

    return {
      monthly: {
        revenue: monthlyRevenue,
        count: monthlyCount,
      },
      annual: {
        revenue: annualRevenue,
        count: annualCount,
      },
      total: monthlyRevenue + annualRevenue,
    };
  },
});
