import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    clerkId: v.string(), // ID de Clerk para la relación
    role: v.optional(
      v.union(v.literal("client"), v.literal("sales"), v.literal("admin"))
    ),
    country: v.optional(v.string()),
    referralCode: v.optional(v.string()), // Código único para comerciales
    referralId: v.optional(v.id("users")), // ID del comercial que refirió al cliente
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_referral_code", ["referralCode"])
    .index("by_referral_id", ["referralId"]),

  businesses: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    subdomain: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    visualConfig: v.object({
      logoUrl: v.optional(v.id("_storage")),
      theme: v.union(v.literal("light"), v.literal("dark")),
      welcomeMessage: v.optional(v.string()),
    }),
    appointmentConfig: v.object({
      services: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          duration: v.number(),
          price: v.optional(v.number()),
          maxPeople: v.optional(v.number()),
        })
      ),
    }),
    availability: v.array(
      v.object({
        day: v.string(),
        slots: v.array(v.object({ start: v.string(), end: v.string() })),
      })
    ),
    googleCalendarEnabled: v.optional(v.boolean()),
    googleCalendarId: v.optional(v.string()),
    telegramBotToken: v.optional(v.string()),
    telegramEnabled: v.optional(v.boolean()),
  })
    .index("by_user_id", ["userId"])
    .index("by_subdomain", ["subdomain"]),

  appointments: defineTable({
    businessId: v.id("businesses"),
    customerData: v.object({
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),
    appointmentTime: v.string(),
    serviceName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
    ownerNote: v.optional(v.string()),
    rescheduledFrom: v.optional(v.string()),
    cancellationToken: v.optional(v.string()),
    googleCalendarEventId: v.optional(v.string()),
  })
    .index("by_business_id", ["businessId"])
    .index("by_cancellation_token", ["cancellationToken"]),

  telegramConversations: defineTable({
    chatId: v.number(),
    businessId: v.id("businesses"),
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system")
        ),
        content: v.string(),
      })
    ),
    lastUpdated: v.number(),
  })
    .index("by_chat_id", ["chatId"])
    .index("by_business_id", ["businessId"]),

  usageTracking: defineTable({
    userId: v.id("users"),
    businessId: v.optional(v.id("businesses")),
    date: v.string(), // YYYY-MM-DD format
    requestCount: v.number(),
    tokensUsed: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_business_and_date", ["businessId", "date"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    businessId: v.optional(v.id("businesses")),
    status: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("expired")
    ),
    trialEndDate: v.optional(v.number()), // timestamp
    currentPeriodEnd: v.optional(v.number()), // timestamp
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    planType: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    priceId: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"]),

  promotions: defineTable({
    salesUserId: v.id("users"), // ID del comercial que creó la promoción
    clientUserId: v.id("users"), // ID del cliente específico
    monthlyPrice: v.number(), // Precio mensual personalizado en céntimos
    annualPrice: v.number(), // Precio anual calculado (monthlyPrice * 12 * 0.8) en céntimos
    stripeCouponId: v.string(), // ID del coupon en Stripe
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("canceled")
    ),
    createdAt: v.number(), // timestamp
    updatedAt: v.number(), // timestamp
    notes: v.optional(v.string()), // Notas opcionales del comercial
  })
    .index("by_sales_user_id", ["salesUserId"])
    .index("by_client_user_id", ["clientUserId"])
    .index("by_status", ["status"]),

  platformSettings: defineTable({
    platformFeePercentage: v.number(), // Porcentaje de costes de plataforma (ej: 10 = 10%)
    updatedAt: v.number(), // timestamp
    updatedBy: v.id("users"), // ID del admin que actualizó
  }),
});
