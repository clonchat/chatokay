import { v } from "convex/values";
import {
  action,
  mutation,
  internalMutation,
  internalAction,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { Id } from "./_generated/dataModel";

// Helper to get Google access token from Clerk
async function getGoogleAccessToken(clerkUserId: string): Promise<string> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY not configured");
  }

  const response = await fetch(
    `https://api.clerk.com/v1/users/${clerkUserId}/oauth_access_tokens/oauth_google`,
    {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get Google access token from Clerk: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error("No Google OAuth tokens found for user");
  }

  // Get the first token (most recent)
  const tokenData = data[0];
  return tokenData.token;
}

// Helper to make Google Calendar API requests
async function makeCalendarRequest(
  accessToken: string,
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const url = `https://www.googleapis.com/calendar/v3${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Calendar API error: ${response.status} ${errorText}`
    );
  }

  if (method === "DELETE") {
    return { success: true };
  }

  return await response.json();
}

// Action to test connection to Google Calendar
export const testConnection = action({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get the business
      const business = await ctx.runQuery(internal.businesses.getBusinessById, {
        businessId: args.businessId,
      });

      if (!business) {
        return { success: false, error: "Business not found" };
      }

      // Get the user
      const user = await ctx.runQuery(internal.users.getUserById, {
        userId: business.userId,
      });

      if (!user || !user.clerkId) {
        return { success: false, error: "User not found" };
      }

      // Try to get access token
      const accessToken = await getGoogleAccessToken(user.clerkId);

      // Test by getting calendar list
      await makeCalendarRequest(accessToken, "/users/me/calendarList/primary");

      return { success: true };
    } catch (error: any) {
      console.error("Google Calendar test connection failed:", error);
      return {
        success: false,
        error: error.message || "Failed to connect to Google Calendar",
      };
    }
  },
});

// Internal action to create a calendar event
export const createCalendarEvent = internalAction({
  args: {
    businessId: v.id("businesses"),
    appointmentId: v.id("appointments"),
    title: v.string(),
    startTime: v.string(),
    duration: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    // Get the business
    const business = await ctx.runQuery(internal.businesses.getBusinessById, {
      businessId: args.businessId,
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // Get the user
    const user = await ctx.runQuery(internal.users.getUserById, {
      userId: business.userId,
    });

    if (!user || !user.clerkId) {
      throw new Error("User not found");
    }

    // Get access token
    const accessToken = await getGoogleAccessToken(user.clerkId);

    // Calculate end time
    const startDate = new Date(args.startTime);
    const endDate = new Date(startDate.getTime() + args.duration * 60000);

    // Get calendar ID (default to primary)
    const calendarId = business.googleCalendarId || "primary";

    // Create event body
    const eventBody = {
      summary: args.title,
      description: args.description || "",
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "UTC",
      },
      reminders: {
        useDefault: true,
      },
    };

    // Create the event
    const event = await makeCalendarRequest(
      accessToken,
      `/calendars/${calendarId}/events`,
      "POST",
      eventBody
    );

    return event.id;
  },
});

// Internal action to update a calendar event
export const updateCalendarEvent = internalAction({
  args: {
    businessId: v.id("businesses"),
    eventId: v.string(),
    startTime: v.string(),
    duration: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    // Get the business
    const business = await ctx.runQuery(internal.businesses.getBusinessById, {
      businessId: args.businessId,
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // Get the user
    const user = await ctx.runQuery(internal.users.getUserById, {
      userId: business.userId,
    });

    if (!user || !user.clerkId) {
      throw new Error("User not found");
    }

    // Get access token
    const accessToken = await getGoogleAccessToken(user.clerkId);

    // Calculate end time
    const startDate = new Date(args.startTime);
    const endDate = new Date(startDate.getTime() + args.duration * 60000);

    // Get calendar ID (default to primary)
    const calendarId = business.googleCalendarId || "primary";

    // Build update body
    const updateBody: any = {
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "UTC",
      },
    };

    if (args.title) {
      updateBody.summary = args.title;
    }

    if (args.description !== undefined) {
      updateBody.description = args.description;
    }

    // Update the event
    await makeCalendarRequest(
      accessToken,
      `/calendars/${calendarId}/events/${args.eventId}`,
      "PATCH",
      updateBody
    );
  },
});

// Internal action to delete a calendar event
export const deleteCalendarEvent = internalAction({
  args: {
    businessId: v.id("businesses"),
    eventId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    // Get the business
    const business = await ctx.runQuery(internal.businesses.getBusinessById, {
      businessId: args.businessId,
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // Get the user
    const user = await ctx.runQuery(internal.users.getUserById, {
      userId: business.userId,
    });

    if (!user || !user.clerkId) {
      throw new Error("User not found");
    }

    // Get access token
    const accessToken = await getGoogleAccessToken(user.clerkId);

    // Get calendar ID (default to primary)
    const calendarId = business.googleCalendarId || "primary";

    // Delete the event
    await makeCalendarRequest(
      accessToken,
      `/calendars/${calendarId}/events/${args.eventId}`,
      "DELETE"
    );
  },
});

// Mutation to enable Google Calendar sync
export const enableGoogleCalendar = mutation({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated");
    }

    // Get the user
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

    // Enable Google Calendar sync
    await ctx.db.patch(args.businessId, {
      googleCalendarEnabled: true,
      googleCalendarId: "primary", // Use primary calendar by default
    });

    return { success: true };
  },
});

// Mutation to disable Google Calendar sync
export const disableGoogleCalendar = mutation({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated");
    }

    // Get the user
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

    // Disable Google Calendar sync
    await ctx.db.patch(args.businessId, {
      googleCalendarEnabled: false,
    });

    return { success: true };
  },
});

