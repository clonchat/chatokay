import {
  mutation,
  query,
  action,
  internalMutation,
} from "./_generated/server.js";
import { v } from "convex/values";
import { requireAdminOrSales } from "./roles.js";
import { internal, api } from "./_generated/api.js";

/**
 * Calculate annual price from monthly price (20% discount)
 * annualPrice = monthlyPrice * 12 * 0.8
 */
function calculateAnnualPrice(monthlyPriceCents: number): number {
  return Math.round(monthlyPriceCents * 12 * 0.8);
}

/**
 * Internal mutation to create promotion record
 */
export const createPromotionRecord = internalMutation({
  args: {
    salesUserId: v.id("users"),
    clientUserId: v.id("users"),
    monthlyPrice: v.number(),
    annualPrice: v.number(),
    stripeCouponId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promotions", {
      salesUserId: args.salesUserId,
      clientUserId: args.clientUserId,
      monthlyPrice: args.monthlyPrice,
      annualPrice: args.annualPrice,
      stripeCouponId: args.stripeCouponId,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: args.notes,
    });
  },
});

/**
 * Internal mutation to update promotion with Stripe coupon IDs
 */
export const updatePromotionCoupons = internalMutation({
  args: {
    promotionId: v.id("promotions"),
    stripeCouponId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.promotionId, {
      stripeCouponId: args.stripeCouponId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create a new promotion (action that can call Stripe)
 */
export const createPromotion = action({
  args: {
    clientUserId: v.id("users"),
    monthlyPrice: v.number(), // Price in euros (will be converted to cents)
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user via query
    const currentUser = await ctx.runQuery(api.users.getCurrentUser);
    if (
      !currentUser ||
      (currentUser.role !== "admin" && currentUser.role !== "sales")
    ) {
      throw new Error("No autorizado");
    }

    // Validate monthly price (between 10€ and 140€)
    if (args.monthlyPrice < 10 || args.monthlyPrice > 140) {
      throw new Error("El precio mensual debe estar entre 10€ y 140€");
    }

    // Check if client exists and is referred by this sales user (or admin can create for anyone)
    const client = await ctx.runQuery(api.users.getUserByIdPublic, {
      userId: args.clientUserId,
    });
    if (!client) {
      throw new Error("Cliente no encontrado");
    }

    // If not admin, verify client is referred by this sales user
    if (currentUser.role !== "admin" && client.referralId !== currentUser._id) {
      throw new Error(
        "Solo puedes crear promociones para tus clientes referidos"
      );
    }

    // Check if client already has an active promotion
    const existingPromotion = await ctx.runQuery(
      api.promotions.getPromotionByClient,
      {
        clientUserId: args.clientUserId,
      }
    );

    if (existingPromotion) {
      throw new Error("Este cliente ya tiene una promoción activa");
    }

    // Convert price to cents
    const monthlyPriceCents = Math.round(args.monthlyPrice * 100);
    const annualPriceCents = calculateAnnualPrice(monthlyPriceCents);

    // Create Stripe coupons first
    const coupons = await ctx.runAction(
      api.promotionsActions.createStripeCoupons,
      {
        monthlyPriceCents,
        annualPriceCents,
        promotionId: "temp", // Will be updated after creation
      }
    );

    // Create promotion record with coupon IDs
    try {
      const promotionId = await ctx.runMutation(
        internal.promotions.createPromotionRecord,
        {
          salesUserId: currentUser._id,
          clientUserId: args.clientUserId,
          monthlyPrice: monthlyPriceCents,
          annualPrice: annualPriceCents,
          stripeCouponId: `${coupons.monthlyCouponId},${coupons.annualCouponId}`,
          notes: args.notes,
        }
      );

      return promotionId;
    } catch (error) {
      // If DB creation fails, try to delete Stripe coupons (best effort)
      try {
        await ctx.runAction(api.promotionsActions.deleteStripeCoupons, {
          monthlyCouponId: coupons.monthlyCouponId,
          annualCouponId: coupons.annualCouponId,
        });
      } catch (deleteError) {
        console.error(
          "Error deleting Stripe coupons after failure:",
          deleteError
        );
      }
      throw new Error(`Error al crear promoción: ${error}`);
    }
  },
});

/**
 * Internal mutation to update promotion record
 */
export const updatePromotionRecord = internalMutation({
  args: {
    promotionId: v.id("promotions"),
    monthlyPrice: v.optional(v.number()),
    annualPrice: v.optional(v.number()),
    stripeCouponId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: {
      monthlyPrice?: number;
      annualPrice?: number;
      stripeCouponId?: string;
      updatedAt: number;
      notes?: string;
    } = {
      updatedAt: Date.now(),
    };

    if (args.monthlyPrice !== undefined) {
      updates.monthlyPrice = args.monthlyPrice;
    }
    if (args.annualPrice !== undefined) {
      updates.annualPrice = args.annualPrice;
    }
    if (args.stripeCouponId !== undefined) {
      updates.stripeCouponId = args.stripeCouponId;
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.promotionId, updates);
    return args.promotionId;
  },
});

/**
 * Update an existing promotion (action that can call Stripe)
 */
export const updatePromotion = action({
  args: {
    promotionId: v.id("promotions"),
    monthlyPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user via query
    const currentUser = await ctx.runQuery(api.users.getCurrentUser);
    if (
      !currentUser ||
      (currentUser.role !== "admin" && currentUser.role !== "sales")
    ) {
      throw new Error("No autorizado");
    }

    // Get promotion
    const promotion = await ctx.runQuery(api.promotions.getPromotionById, {
      promotionId: args.promotionId,
    });
    if (!promotion) {
      throw new Error("Promoción no encontrada");
    }

    // Verify user owns this promotion or is admin
    if (
      currentUser.role !== "admin" &&
      promotion.salesUserId !== currentUser._id
    ) {
      throw new Error("No tienes permiso para editar esta promoción");
    }

    if (promotion.status !== "active") {
      throw new Error("Solo se pueden editar promociones activas");
    }

    const updates: {
      monthlyPrice?: number;
      annualPrice?: number;
      stripeCouponId?: string;
      notes?: string;
    } = {};

    // If monthly price changed, recalculate annual and update Stripe coupons
    if (args.monthlyPrice !== undefined) {
      if (args.monthlyPrice < 10 || args.monthlyPrice > 140) {
        throw new Error("El precio mensual debe estar entre 10€ y 140€");
      }

      const monthlyPriceCents = Math.round(args.monthlyPrice * 100);
      const annualPriceCents = calculateAnnualPrice(monthlyPriceCents);

      updates.monthlyPrice = monthlyPriceCents;
      updates.annualPrice = annualPriceCents;

      // Update Stripe coupons
      try {
        const [oldMonthlyCouponId, oldAnnualCouponId] =
          promotion.stripeCouponId.split(",");

        // Delete old coupons
        await ctx.runAction(api.promotionsActions.deleteStripeCoupons, {
          monthlyCouponId: oldMonthlyCouponId,
          annualCouponId: oldAnnualCouponId,
        });

        // Create new coupons
        const coupons = await ctx.runAction(
          api.promotionsActions.createStripeCoupons,
          {
            monthlyPriceCents,
            annualPriceCents,
            promotionId: args.promotionId,
          }
        );

        updates.stripeCouponId = `${coupons.monthlyCouponId},${coupons.annualCouponId}`;
      } catch (error) {
        throw new Error(`Error al actualizar cupones en Stripe: ${error}`);
      }
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    // Update promotion record
    await ctx.runMutation(internal.promotions.updatePromotionRecord, {
      promotionId: args.promotionId,
      ...updates,
    });

    return args.promotionId;
  },
});

/**
 * Delete (cancel) a promotion
 */
export const deletePromotion = mutation({
  args: {
    promotionId: v.id("promotions"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAdminOrSales(ctx);

    const promotion = await ctx.db.get(args.promotionId);
    if (!promotion) {
      throw new Error("Promoción no encontrada");
    }

    // Verify user owns this promotion or is admin
    if (
      currentUser.role !== "admin" &&
      promotion.salesUserId !== currentUser._id
    ) {
      throw new Error("No tienes permiso para eliminar esta promoción");
    }

    // Mark as canceled (don't delete for audit trail)
    await ctx.db.patch(args.promotionId, {
      status: "canceled",
      updatedAt: Date.now(),
    });

    // Optionally delete Stripe coupons (we'll keep them for now in case we need to reactivate)
    // If needed, we can delete them later

    return args.promotionId;
  },
});

/**
 * Get active promotion for a client
 * - Admin/Sales: can query any client's promotion
 * - Client: can only query their own promotion
 */
export const getPromotionByClient = query({
  args: {
    clientUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("No autorizado");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("Usuario no encontrado");
    }

    // If user is client, they can only query their own promotion
    if (
      currentUser.role === "client" &&
      currentUser._id !== args.clientUserId
    ) {
      throw new Error("No autorizado");
    }

    // Admin and sales can query any promotion, clients can only query their own
    if (
      currentUser.role !== "admin" &&
      currentUser.role !== "sales" &&
      currentUser.role !== "client"
    ) {
      throw new Error("No autorizado");
    }

    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_client_user_id", (q) =>
        q.eq("clientUserId", args.clientUserId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!promotion) {
      return null;
    }

    // Get sales user info
    const salesUser = await ctx.db.get(promotion.salesUserId);

    return {
      ...promotion,
      salesUser: salesUser
        ? {
            _id: salesUser._id,
            name: salesUser.name,
            email: salesUser.email,
          }
        : null,
    };
  },
});

/**
 * Get all promotions created by current sales user
 */
export const getMyPromotions = query({
  handler: async (ctx) => {
    const currentUser = await requireAdminOrSales(ctx);

    const promotions = await ctx.db
      .query("promotions")
      .withIndex("by_sales_user_id", (q) =>
        q.eq("salesUserId", currentUser._id)
      )
      .collect();

    // Enrich with client info and check if promotion is being used
    const enrichedPromotions = await Promise.all(
      promotions.map(async (promo) => {
        const client = await ctx.db.get(promo.clientUserId);

        // Check if client has an active subscription (promotion is being used)
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_user_id", (q) => q.eq("userId", promo.clientUserId))
          .first();

        const isUsed = !!(
          subscription &&
          (subscription.status === "active" ||
            subscription.status === "past_due") &&
          promo.status === "active"
        );

        return {
          ...promo,
          client: client
            ? {
                _id: client._id,
                name: client.name,
                email: client.email,
              }
            : null,
          isUsed,
        };
      })
    );

    return enrichedPromotions;
  },
});

/**
 * Get promotion by ID (internal query helper)
 */
export const getPromotionById = query({
  args: {
    promotionId: v.id("promotions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.promotionId);
  },
});

/**
 * Get active promotion for current client user
 */
export const getClientPromotion = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "client") {
      return null;
    }

    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_client_user_id", (q) =>
        q.eq("clientUserId", currentUser._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!promotion) {
      return null;
    }

    // Get sales user info
    const salesUser = await ctx.db.get(promotion.salesUserId);

    return {
      ...promotion,
      salesUser: salesUser
        ? {
            _id: salesUser._id,
            name: salesUser.name,
            email: salesUser.email,
          }
        : null,
    };
  },
});
