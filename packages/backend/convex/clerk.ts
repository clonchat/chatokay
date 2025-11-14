import { httpAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { Webhook } from "svix";
import { internalMutation } from "./_generated/server.js";
import { v } from "convex/values";

// HTTP action to handle Clerk webhooks
export const webhook = httpAction(async (ctx, request) => {
  // Get the webhook secret from environment variables
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers
  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get the body
  const body = await request.text();

  // Create a new Svix instance with the webhook secret
  const wh = new Webhook(webhookSecret);

  let evt: any;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle the webhook event
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const userData = evt.data;

    // Extract user information
    const clerkId = userData.id;
    const email = userData.email_addresses?.[0]?.email_address || "";
    const firstName = userData.first_name || "";
    const lastName = userData.last_name || "";
    const name =
      firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || lastName || undefined;

    // Country will be detected client-side after registration
    // (Webhooks are server-to-server and don't have access to client IP/headers)
    const country = undefined;

    // Extract role from unsafe metadata if present (for internal signups)
    const role = userData.unsafe_metadata?.role as
      | "sales"
      | "client"
      | undefined;

    // Extract referral code from unsafe metadata if present
    const referralCode = userData.unsafe_metadata?.referralCode as
      | string
      | undefined;

    console.log("Processing user:", {
      clerkId,
      email,
      name,
      country,
      role,
      referralCode,
    });

    try {
      // Call internal mutation to sync user
      await ctx.runMutation(internal.clerk.syncUser, {
        clerkId,
        email,
        name,
        country,
        role,
        referralCode,
      });
      console.log("User synced successfully");
    } catch (error) {
      console.error("Error syncing user:", error);
      return new Response("Error syncing user", { status: 500 });
    }
  }

  return new Response("Webhook processed", { status: 200 });
});

// Internal mutation to sync user data
export const syncUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    country: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("client"), v.literal("sales"), v.literal("admin"))
    ),
    referralCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Syncing user:", args);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    // Resolve referralId from referralCode if provided
    let referralId: any = undefined;
    if (args.referralCode) {
      const salesUser = await ctx.db
        .query("users")
        .withIndex("by_referral_code", (q) =>
          q.eq("referralCode", args.referralCode!)
        )
        .first();

      if (
        salesUser &&
        (salesUser.role === "sales" || salesUser.role === "admin")
      ) {
        referralId = salesUser._id;
        console.log("Found referral sales user:", salesUser._id);
      } else {
        console.warn("Invalid referral code:", args.referralCode);
      }
    }

    if (existingUser) {
      console.log("User exists, updating:", existingUser._id);
      // Update existing user (preserve role if already set)
      const updateData: any = {
        email: args.email,
        name: args.name,
      };

      // Only update country if provided and not already set
      if (args.country && !existingUser.country) {
        updateData.country = args.country;
      }

      // Only update role if provided and not already set
      if (args.role && !existingUser.role) {
        updateData.role = args.role;
      }

      // Only update referralId if provided and not already set
      if (referralId && !existingUser.referralId) {
        updateData.referralId = referralId;
      }

      await ctx.db.patch(existingUser._id, updateData);
    } else {
      console.log("Creating new user");
      // Create new user with default role "client" if not specified
      const finalRole = args.role || "client";
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        role: finalRole,
        country: args.country,
        referralId: referralId,
      });
      console.log("User created with ID:", userId);

      // Create trial subscription for client users
      if (finalRole === "client") {
        await ctx.scheduler.runAfter(
          0,
          internal.subscriptions.createTrialSubscription,
          {
            userId,
          }
        );
      }
    }
  },
});
