import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    clerkId: v.string(), // ID de Clerk para la relación
  }).index("by_clerk_id", ["clerkId"]),

  businesses: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    subdomain: v.string(),
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
        })
      ),
    }),
    availability: v.array(
      v.object({
        day: v.string(),
        slots: v.array(v.object({ start: v.string(), end: v.string() })),
      })
    ),
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
  })
    .index("by_business_id", ["businessId"])
    .index("by_cancellation_token", ["cancellationToken"]),
});
