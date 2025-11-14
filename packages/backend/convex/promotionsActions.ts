"use node";

import { action } from "./_generated/server.js";
import { v } from "convex/values";
import { internal, api } from "./_generated/api.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

// Constants for standard pricing
const STANDARD_MONTHLY_PRICE_CENTS = 14000; // 140€ in cents
const STANDARD_ANNUAL_PRICE_CENTS = 144000; // 1440€ in cents

/**
 * Calculate discount percentage for Stripe coupon
 */
function calculateDiscountPercent(
  standardPriceCents: number,
  promotionalPriceCents: number
): number {
  const discount = ((standardPriceCents - promotionalPriceCents) / standardPriceCents) * 100;
  return Math.round(discount * 100) / 100; // Round to 2 decimal places
}

/**
 * Create Stripe coupon for a promotion (action that can be called from mutations)
 */
export const createStripeCoupons = action({
  args: {
    monthlyPriceCents: v.number(),
    annualPriceCents: v.number(),
    promotionId: v.string(),
  },
  handler: async (ctx, args): Promise<{ monthlyCouponId: string; annualCouponId: string }> => {
    // Calculate discounts
    const monthlyDiscountPercent = calculateDiscountPercent(
      STANDARD_MONTHLY_PRICE_CENTS,
      args.monthlyPriceCents
    );
    const annualDiscountPercent = calculateDiscountPercent(
      STANDARD_ANNUAL_PRICE_CENTS,
      args.annualPriceCents
    );

    // Create monthly coupon
    const monthlyCoupon = await stripe.coupons.create({
      percent_off: monthlyDiscountPercent,
      duration: "forever",
      name: `Promo Mensual ${args.promotionId}`,
      metadata: {
        promotionId: args.promotionId,
        planType: "monthly",
      },
    });

    // Create annual coupon
    const annualCoupon = await stripe.coupons.create({
      percent_off: annualDiscountPercent,
      duration: "forever",
      name: `Promo Anual ${args.promotionId}`,
      metadata: {
        promotionId: args.promotionId,
        planType: "annual",
      },
    });

    return {
      monthlyCouponId: monthlyCoupon.id,
      annualCouponId: annualCoupon.id,
    };
  },
});

/**
 * Delete Stripe coupons (action)
 */
export const deleteStripeCoupons = action({
  args: {
    monthlyCouponId: v.string(),
    annualCouponId: v.string(),
  },
  handler: async (ctx, args) => {
    await stripe.coupons.del(args.monthlyCouponId);
    await stripe.coupons.del(args.annualCouponId);
    return { success: true };
  },
});

