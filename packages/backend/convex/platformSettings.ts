import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { requireAdmin } from "./roles.js";

const DEFAULT_PLATFORM_FEE_PERCENTAGE = 10; // 10% por defecto

/**
 * Get platform settings (returns default if not set)
 */
export const getPlatformSettings = query({
  handler: async (ctx) => {
    // Try to get settings from database
    const settings = await ctx.db
      .query("platformSettings")
      .first();

    if (!settings) {
      // Return default settings if not found
      return {
        platformFeePercentage: DEFAULT_PLATFORM_FEE_PERCENTAGE,
        updatedAt: Date.now(),
        updatedBy: null as any,
      };
    }

    return settings;
  },
});

/**
 * Update platform fee percentage (admin only)
 */
export const updatePlatformFeePercentage = mutation({
  args: {
    platformFeePercentage: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Validate percentage (0-100)
    if (args.platformFeePercentage < 0 || args.platformFeePercentage > 100) {
      throw new Error("El porcentaje debe estar entre 0 y 100");
    }

    // Get existing settings or create new
    const existingSettings = await ctx.db
      .query("platformSettings")
      .first();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        platformFeePercentage: args.platformFeePercentage,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
      return existingSettings._id;
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert("platformSettings", {
        platformFeePercentage: args.platformFeePercentage,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
      return settingsId;
    }
  },
});

