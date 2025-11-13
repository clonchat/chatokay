import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server.js";
import { requireAdmin, requireAdminOrSales } from "./roles.js";

/**
 * Calculate cost based on token usage
 * Uses estimated proportions: 60% input tokens, 40% output tokens
 * Pricing: $0.03/M input tokens, $0.14/M output tokens
 */
function calculateCost(totalTokens: number): number {
  // Estimate: 60% input, 40% output (typical conversation ratio)
  const inputTokens = totalTokens * 0.6;
  const outputTokens = totalTokens * 0.4;

  // Calculate costs
  const inputCost = (inputTokens / 1_000_000) * 0.03;
  const outputCost = (outputTokens / 1_000_000) * 0.14;

  return inputCost + outputCost;
}

/**
 * Internal mutation to track or increment usage for a user
 * Uses upsert pattern: creates new record or increments existing one
 */
export const trackUsage = internalMutation({
  args: {
    userId: v.id("users"),
    businessId: v.optional(v.id("businesses")),
    tokensUsed: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current date in YYYY-MM-DD format
    const now = new Date();
    const date = now.toISOString().split("T")[0] || "";

    // Try to find existing record for this user and date
    const existing = await ctx.db
      .query("usageTracking")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", date)
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        requestCount: existing.requestCount + 1,
        tokensUsed: existing.tokensUsed + args.tokensUsed,
      });
    } else {
      // Create new record
      await ctx.db.insert("usageTracking", {
        userId: args.userId,
        businessId: args.businessId,
        date,
        requestCount: 1,
        tokensUsed: args.tokensUsed,
      });
    }
  },
});

/**
 * Get usage statistics for a specific user and date range
 */
export const getUserUsage = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin or sales role to view usage
    await requireAdminOrSales(ctx);

    let query = ctx.db
      .query("usageTracking")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId));

    const records = await query.collect();

    // Filter by date range if provided
    let filteredRecords = records;
    if (args.startDate) {
      filteredRecords = filteredRecords.filter(
        (r) => r.date >= args.startDate!
      );
    }
    if (args.endDate) {
      filteredRecords = filteredRecords.filter((r) => r.date <= args.endDate!);
    }

    // Calculate totals
    const totalRequests = filteredRecords.reduce(
      (sum, r) => sum + r.requestCount,
      0
    );
    const totalTokens = filteredRecords.reduce(
      (sum, r) => sum + r.tokensUsed,
      0
    );

    return {
      records: filteredRecords,
      summary: {
        totalRequests,
        totalTokens,
        daysTracked: filteredRecords.length,
      },
    };
  },
});

/**
 * Get top consumers by token usage
 * For sales users: only shows clients referred by them
 * For admin users: shows all clients
 */
export const getTopConsumers = query({
  args: {
    limit: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin or sales role to view top consumers
    const currentUser = await requireAdminOrSales(ctx);

    const limit = args.limit || 10;

    // Get all usage records
    const allRecords = await ctx.db.query("usageTracking").collect();

    // Filter by date range if provided
    let filteredRecords = allRecords;
    if (args.startDate) {
      filteredRecords = filteredRecords.filter(
        (r) => r.date >= args.startDate!
      );
    }
    if (args.endDate) {
      filteredRecords = filteredRecords.filter((r) => r.date <= args.endDate!);
    }

    // If user is sales, filter to only show their referred clients
    let allowedUserIds: Set<string> | null = null;
    if (currentUser.role === "sales") {
      const referredClients = await ctx.db
        .query("users")
        .withIndex("by_referral_id", (q) => q.eq("referralId", currentUser._id))
        .collect();
      allowedUserIds = new Set(referredClients.map((c) => c._id));
    }
    // If user is admin, allowedUserIds stays null (show all)

    // Group by userId and sum up
    const userStats = new Map<
      string,
      { userId: string; totalRequests: number; totalTokens: number }
    >();

    for (const record of filteredRecords) {
      // Skip if sales user and this user is not in their referred clients
      if (allowedUserIds && !allowedUserIds.has(record.userId)) {
        continue;
      }

      const userId = record.userId;
      const existing = userStats.get(userId) || {
        userId,
        totalRequests: 0,
        totalTokens: 0,
      };
      existing.totalRequests += record.requestCount;
      existing.totalTokens += record.tokensUsed;
      userStats.set(userId, existing);
    }

    // Convert to array and sort by tokens used
    const topUsers = Array.from(userStats.values())
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, limit);

    // Fetch user details for each top user
    const usersWithDetails = await Promise.all(
      topUsers.map(async (stat) => {
        const user = await ctx.db.get(stat.userId as any);
        // Ensure user is of type users table by checking for role field
        if (!user || !("role" in user) || !("clerkId" in user)) {
          return {
            ...stat,
            user: null,
            cost: calculateCost(stat.totalTokens),
          };
        }
        return {
          ...stat,
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            country: user.country,
          },
          cost: calculateCost(stat.totalTokens),
        };
      })
    );

    return usersWithDetails;
  },
});

/**
 * Get usage statistics for all users (admin only)
 */
export const getAllUsageStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Get all usage records
    const allRecords = await ctx.db.query("usageTracking").collect();

    // Filter by date range if provided
    let filteredRecords = allRecords;
    if (args.startDate) {
      filteredRecords = filteredRecords.filter(
        (r) => r.date >= args.startDate!
      );
    }
    if (args.endDate) {
      filteredRecords = filteredRecords.filter((r) => r.date <= args.endDate!);
    }

    // Calculate overall totals
    const totalRequests = filteredRecords.reduce(
      (sum, r) => sum + r.requestCount,
      0
    );
    const totalTokens = filteredRecords.reduce(
      (sum, r) => sum + r.tokensUsed,
      0
    );
    const uniqueUsers = new Set(filteredRecords.map((r) => r.userId)).size;
    const totalCost = calculateCost(totalTokens);

    return {
      totalRequests,
      totalTokens,
      uniqueUsers,
      daysTracked: filteredRecords.length,
      totalCost,
    };
  },
});

/**
 * Get usage grouped by month for a specific user
 */
export const getUserUsageByMonth = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Require admin or sales role
    await requireAdminOrSales(ctx);

    const records = await ctx.db
      .query("usageTracking")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    // Group by month (YYYY-MM format)
    const byMonth = records.reduce(
      (acc, record) => {
        const month = record.date.substring(0, 7); // Extract YYYY-MM
        if (!acc[month]) {
          acc[month] = {
            month,
            requests: 0,
            tokens: 0,
            daysTracked: new Set<string>(),
          };
        }
        acc[month].requests += record.requestCount;
        acc[month].tokens += record.tokensUsed;
        acc[month].daysTracked.add(record.date);
        return acc;
      },
      {} as Record<
        string,
        {
          month: string;
          requests: number;
          tokens: number;
          daysTracked: Set<string>;
        }
      >
    );

    // Convert to array and calculate cost
    return Object.values(byMonth)
      .map((entry) => ({
        month: entry.month,
        requests: entry.requests,
        tokens: entry.tokens,
        daysTracked: entry.daysTracked.size,
        cost: calculateCost(entry.tokens),
      }))
      .sort((a, b) => b.month.localeCompare(a.month)); // Most recent first
  },
});

/**
 * Get usage by date (for charts)
 */
export const getUsageByDate = query({
  args: {
    userId: v.optional(v.id("users")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin or sales role
    await requireAdminOrSales(ctx);

    let query = ctx.db.query("usageTracking");

    // Filter by user if provided
    if (args.userId) {
      const records = await ctx.db
        .query("usageTracking")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId!))
        .collect();

      // Filter by date range
      let filteredRecords = records;
      if (args.startDate) {
        filteredRecords = filteredRecords.filter(
          (r) => r.date >= args.startDate!
        );
      }
      if (args.endDate) {
        filteredRecords = filteredRecords.filter(
          (r) => r.date <= args.endDate!
        );
      }

      // Group by date
      const byDate = filteredRecords.reduce(
        (acc, record) => {
          if (!acc[record.date]) {
            acc[record.date] = { date: record.date, requests: 0, tokens: 0 };
          }
          const entry = acc[record.date];
          if (entry) {
            entry.requests += record.requestCount;
            entry.tokens += record.tokensUsed;
          }
          return acc;
        },
        {} as Record<string, { date: string; requests: number; tokens: number }>
      );

      return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    } else {
      // Get all records
      const records = await ctx.db.query("usageTracking").collect();

      // Filter by date range
      let filteredRecords = records;
      if (args.startDate) {
        filteredRecords = filteredRecords.filter(
          (r) => r.date >= args.startDate!
        );
      }
      if (args.endDate) {
        filteredRecords = filteredRecords.filter(
          (r) => r.date <= args.endDate!
        );
      }

      // Group by date
      const byDate = filteredRecords.reduce(
        (acc, record) => {
          if (!acc[record.date]) {
            acc[record.date] = { date: record.date, requests: 0, tokens: 0 };
          }
          const entry = acc[record.date];
          if (entry) {
            entry.requests += record.requestCount;
            entry.tokens += record.tokensUsed;
          }
          return acc;
        },
        {} as Record<string, { date: string; requests: number; tokens: number }>
      );

      return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    }
  },
});
