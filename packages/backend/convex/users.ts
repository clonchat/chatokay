import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server.js";

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
