import { v } from "convex/values";
import { mutation, query, internalQuery, action } from "./_generated/server.js";
import { internal } from "./_generated/api.js";

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

    if (!business) {
      return null;
    }

    // Get logo URL if it exists
    let logoUrl: string | undefined;
    if (business.visualConfig?.logoUrl) {
      try {
        const url = await ctx.storage.getUrl(business.visualConfig.logoUrl);
        logoUrl = url || undefined;
      } catch (error) {
        console.error("Error getting logo URL:", error);
        logoUrl = undefined;
      }
    }

    return {
      ...business,
      visualConfig: {
        ...business.visualConfig,
        logoUrl,
      },
    };
  },
});

// Public query to get a business by subdomain (no authentication required)
export const getBySubdomain = query({
  args: {
    subdomain: v.string(),
  },
  handler: async (ctx, args) => {
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .first();

    if (!business) {
      return null;
    }

    // Get logo URL if it exists
    let logoUrl: string | undefined;
    if (business.visualConfig?.logoUrl) {
      try {
        const url = await ctx.storage.getUrl(business.visualConfig.logoUrl);
        logoUrl = url || undefined;
      } catch (error) {
        console.error("Error getting logo URL:", error);
        logoUrl = undefined;
      }
    }

    // Return only public information
    return {
      _id: business._id,
      name: business.name,
      description: business.description,
      subdomain: business.subdomain,
      email: business.email,
      phone: business.phone,
      theme: business.visualConfig?.theme,
      logo: logoUrl,
      welcomeMessage: business.visualConfig?.welcomeMessage,
      services: business.appointmentConfig?.services || [],
    };
  },
});

// Internal query to get a business by ID (for actions)
export const getBusinessById = internalQuery({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.businessId);
  },
});

// Mutation to create a new business
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    subdomain: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
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

    // Validate subdomain format: only alphanumeric characters and hyphens
    const subdomainPattern = /^[a-z0-9-]+$/;
    if (!subdomainPattern.test(args.subdomain)) {
      throw new Error(
        "El subdominio solo puede contener letras, números y guiones (-)"
      );
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
      email: args.email,
      phone: args.phone,
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
        maxPeople: v.optional(v.number()),
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

    // Validate and normalize services
    const validatedServices = args.services.map((service) => {
      // Ensure maxPeople is at least 1, default to 1 if not provided
      const maxPeople = service.maxPeople ?? 1;
      if (maxPeople < 1) {
        throw new Error(
          `maxPeople must be at least 1 for service "${service.name}"`
        );
      }
      return {
        ...service,
        maxPeople: maxPeople,
      };
    });

    // Update the services
    await ctx.db.patch(args.businessId, {
      appointmentConfig: {
        services: validatedServices,
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
    logoUrl: v.optional(v.id("_storage")),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
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

    // Get current visual config
    const currentVisualConfig = business.visualConfig || {
      theme: "light" as const,
    };

    // Build the update object, merging with existing config
    const visualConfigUpdate: any = {
      ...currentVisualConfig,
    };

    if (args.logoUrl !== undefined) {
      visualConfigUpdate.logoUrl = args.logoUrl;
    }
    if (args.theme !== undefined) {
      visualConfigUpdate.theme = args.theme;
    }
    if (args.welcomeMessage !== undefined) {
      visualConfigUpdate.welcomeMessage = args.welcomeMessage;
    }

    // Update the visual config
    await ctx.db.patch(args.businessId, {
      visualConfig: visualConfigUpdate,
    });

    return { success: true };
  },
});

// Mutation to update business info
export const updateBusinessInfo = mutation({
  args: {
    businessId: v.id("businesses"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
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

    // Build update object
    const update: any = {};
    if (args.name !== undefined) {
      update.name = args.name;
    }
    if (args.description !== undefined) {
      update.description = args.description;
    }
    if (args.email !== undefined) {
      update.email = args.email;
    }
    if (args.phone !== undefined) {
      update.phone = args.phone;
    }

    // Update the business
    await ctx.db.patch(args.businessId, update);

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

// Mutation to update Telegram bot token
export const updateTelegramToken = mutation({
  args: {
    businessId: v.id("businesses"),
    token: v.optional(v.string()),
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

    // Validate token format if provided
    if (args.token !== undefined && args.token !== null && args.token !== "") {
      // Token format: number:alphanumeric-string
      const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
      if (!tokenPattern.test(args.token)) {
        throw new Error("Invalid Telegram bot token format");
      }
    }

    // Update the token
    await ctx.db.patch(args.businessId, {
      telegramBotToken: args.token || undefined,
      telegramEnabled: args.token ? true : false,
    });

    return { success: true };
  },
});

// Mutation to toggle Telegram enabled/disabled
export const toggleTelegram = mutation({
  args: {
    businessId: v.id("businesses"),
    enabled: v.boolean(),
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

    // Check if token exists before enabling
    if (args.enabled && !business.telegramBotToken) {
      throw new Error("Cannot enable Telegram without a bot token");
    }

    // Update the enabled status
    await ctx.db.patch(args.businessId, {
      telegramEnabled: args.enabled,
    });

    return { success: true };
  },
});

// Internal query to get all businesses with Telegram enabled
export const getAllTelegramBusinesses = internalQuery({
  args: {},
  handler: async (ctx) => {
    const businesses = await ctx.db
      .query("businesses")
      .filter((q) => q.eq(q.field("telegramEnabled"), true))
      .collect();

    return businesses.filter((b) => b.telegramBotToken && b.telegramEnabled);
  },
});

// Action to set Telegram webhook
export const setTelegramWebhook = action({
  args: {
    token: v.string(),
    webhookUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      const url = `https://api.telegram.org/bot${args.token}/setWebhook`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: args.webhookUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Failed to set webhook: ${response.status} ${errorText}`,
        };
      }

      const result = await response.json();
      if (!result.ok) {
        return {
          success: false,
          error: result.description || "Failed to set webhook",
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error setting Telegram webhook:", error);
      return {
        success: false,
        error: error.message || "Failed to set webhook",
      };
    }
  },
});
