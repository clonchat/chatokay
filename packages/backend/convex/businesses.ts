import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

// Query to get the current user's business
export const getCurrentUserBusiness = query({
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

    if (!user) {
      return null;
    }

    // Find and return the business associated with this user
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    return business;
  },
});

// Mutation to create a new business
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    subdomain: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated to create a business");
    }

    // Find the user in our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found in database");
    }

    // Check if user already has a business
    const existingBusiness = await ctx.db
      .query("businesses")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    if (existingBusiness) {
      throw new Error("User already has a business");
    }

    // Check if subdomain is already taken
    const subdomainTaken = await ctx.db
      .query("businesses")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .first();

    if (subdomainTaken) {
      throw new Error("Subdomain is already taken");
    }

    // Create the business with default values
    const businessId = await ctx.db.insert("businesses", {
      userId: user._id,
      name: args.name,
      description: args.description,
      subdomain: args.subdomain,
      visualConfig: {
        theme: "light",
      },
      appointmentConfig: {
        services: [],
      },
      availability: [],
    });

    return businessId;
  },
});

// Mutation to update services
export const updateServices = mutation({
  args: {
    businessId: v.id("businesses"),
    services: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        duration: v.number(),
        price: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated");
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the business
    const business = await ctx.db.get(args.businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    // Verify the user owns this business
    if (business.userId !== user._id) {
      throw new Error("User does not own this business");
    }

    // Update the services
    await ctx.db.patch(args.businessId, {
      appointmentConfig: {
        services: args.services,
      },
    });

    return { success: true };
  },
});

// Mutation to update availability
export const updateAvailability = mutation({
  args: {
    businessId: v.id("businesses"),
    availability: v.array(
      v.object({
        day: v.string(),
        slots: v.array(
          v.object({
            start: v.string(),
            end: v.string(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated");
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the business
    const business = await ctx.db.get(args.businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    // Verify the user owns this business
    if (business.userId !== user._id) {
      throw new Error("User does not own this business");
    }

    // Update the availability
    await ctx.db.patch(args.businessId, {
      availability: args.availability,
    });

    return { success: true };
  },
});

// Mutation to update visual configuration
export const updateVisualConfig = mutation({
  args: {
    businessId: v.id("businesses"),
    logoUrl: v.optional(v.string()),
    theme: v.union(v.literal("light"), v.literal("dark")),
    welcomeMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated");
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the business
    const business = await ctx.db.get(args.businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    // Verify the user owns this business
    if (business.userId !== user._id) {
      throw new Error("User does not own this business");
    }

    // Update the visual config
    await ctx.db.patch(args.businessId, {
      visualConfig: {
        logoUrl: args.logoUrl,
        theme: args.theme,
        welcomeMessage: args.welcomeMessage,
      },
    });

    return { success: true };
  },
});

// Mutation to generate upload URL for logo
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated");
    }

    // Generate and return upload URL
    return await ctx.storage.generateUploadUrl();
  },
});
