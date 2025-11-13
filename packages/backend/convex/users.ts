import { v } from "convex/values";
import { query, internalQuery, mutation } from "./_generated/server.js";
import { requireAdmin, requireAdminOrSales } from "./roles.js";

/**
 * Generates a unique referral code in format SALES-XXXXXX
 * where XXXXXX is a 6-character alphanumeric string
 */
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0, O, I, 1
  let code = "SALES-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Query to get the current user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Get the authenticated user's identity from Clerk
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Find the user in our users table by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

// Internal query to get user by ID (for actions)
export const getUserById = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Public query to get user by ID (admin and sales can view)
export const getUserByIdPublic = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Require admin or sales role to view user details
    await requireAdminOrSales(ctx);
    return await ctx.db.get(args.userId);
  },
});

// Query to list all users (admin and sales can view)
export const listAllUsers = query({
  args: {
    role: v.optional(
      v.union(v.literal("client"), v.literal("sales"), v.literal("admin"))
    ),
  },
  handler: async (ctx, args) => {
    // Require admin or sales role to view all users
    await requireAdminOrSales(ctx);

    const allUsers = await ctx.db.query("users").collect();

    // Filter by role if specified
    if (args.role) {
      return allUsers.filter((user) => user.role === args.role);
    }

    return allUsers;
  },
});

// Query to get user count by role (admin only)
export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    // Require admin role
    await requireAdmin(ctx);

    const allUsers = await ctx.db.query("users").collect();

    const stats = {
      total: allUsers.length,
      clients: allUsers.filter((u) => u.role === "client").length,
      sales: allUsers.filter((u) => u.role === "sales").length,
      admins: allUsers.filter((u) => u.role === "admin").length,
    };

    return stats;
  },
});

// Mutation to update current user's country
export const updateMyCountry = mutation({
  args: {
    country: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only update if country is not already set
    if (!user.country) {
      await ctx.db.patch(user._id, { country: args.country });
    }
  },
});

// Mutation to ensure the current user has a referral code
export const ensureReferralCode = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Only sales and admin users can have referral codes
    if (user.role !== "sales" && user.role !== "admin") {
      throw new Error("Only sales and admin users can have referral codes");
    }

    // If user already has a referral code, return it
    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate a new unique referral code
    let newCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      newCode = generateReferralCode();
      const existing = await ctx.db
        .query("users")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", newCode))
        .first();

      if (!existing) {
        break; // Code is unique
      }
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique referral code");
    }

    // Update user with the new referral code
    await ctx.db.patch(user._id, { referralCode: newCode });

    return newCode;
  },
});

// Query to get the current user's referral code (generates if doesn't exist)
export const getMyReferralCode = query({
  args: {},
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

    // Only sales and admin users can have referral codes
    if (user.role !== "sales" && user.role !== "admin") {
      return null;
    }

    // If user has a referral code, return it
    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate and save a new referral code
    // We need to use a mutation for this, but we can trigger it from the frontend
    // For now, return null and let the frontend call ensureReferralCode
    return null;
  },
});

// Query to validate a referral code
export const validateReferralCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.code))
      .first();

    if (!user) {
      return { valid: false, salesUser: null };
    }

    // Check if the user is a sales or admin user
    if (user.role !== "sales" && user.role !== "admin") {
      return { valid: false, salesUser: null };
    }

    return {
      valid: true,
      salesUser: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    };
  },
});

// Query to get clients referred by the current sales user
export const getMyReferredClients = query({
  args: {},
  handler: async (ctx) => {
    // Require sales or admin role
    const currentUser = await requireAdminOrSales(ctx);

    // Get all clients referred by this user
    const referredClients = await ctx.db
      .query("users")
      .withIndex("by_referral_id", (q) => q.eq("referralId", currentUser._id))
      .collect();

    return referredClients;
  },
});

// Query to get clients referred by a specific sales user (admin only)
export const getReferredClientsBySalesId = query({
  args: {
    salesUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    // Get all clients referred by the specified sales user
    const referredClients = await ctx.db
      .query("users")
      .withIndex("by_referral_id", (q) => q.eq("referralId", args.salesUserId))
      .collect();

    return referredClients;
  },
});

// Query to get client count for each sales user (admin only)
export const getSalesUsersWithClientCount = query({
  args: {},
  handler: async (ctx) => {
    // Require admin role
    await requireAdmin(ctx);

    // Get all sales users
    const salesUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "sales"))
      .collect();

    // Get all clients and group by referralId
    const allClients = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "client"))
      .collect();

    const clientCountMap = new Map<string, number>();
    allClients.forEach((client) => {
      if (client.referralId) {
        const count = clientCountMap.get(client.referralId) || 0;
        clientCountMap.set(client.referralId, count + 1);
      }
    });

    // Return sales users with their client counts
    return salesUsers.map((salesUser) => ({
      ...salesUser,
      clientCount: clientCountMap.get(salesUser._id) || 0,
    }));
  },
});
