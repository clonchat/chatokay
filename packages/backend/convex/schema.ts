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
});
