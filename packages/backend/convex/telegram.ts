import {
  httpAction,
  action,
  internalQuery,
  internalAction,
  internalMutation,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { v } from "convex/values";
import { api } from "./_generated/api.js";

/**
 * Sends a message to a Telegram chat using the bot token
 */
async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string
): Promise<boolean> {
  try {
    // Clean markdown characters that might break Telegram parsing
    // Remove problematic markdown and convert to plain text
    let cleanText = text
      .replace(/\*\*/g, "") // Remove bold markers
      .replace(/\*/g, "") // Remove italic markers
      .replace(/__/g, "") // Remove underline markers
      .replace(/_/g, " ") // Replace single underscores with spaces
      .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, "")) // Remove code blocks but keep content
      .replace(/`([^`]+)`/g, "$1") // Remove inline code markers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1"); // Convert links to plain text

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: cleanText,
        // Remove parse_mode to send as plain text
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Telegram API error: ${response.status} ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
}

/**
 * Sets the webhook URL for a Telegram bot
 */
export const setWebhook = action({
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

/**
 * Gets webhook info for debugging
 */
export const getWebhookInfo = action({
  args: {
    token: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; info?: any; error?: string }> => {
    try {
      const url = `https://api.telegram.org/bot${args.token}/getWebhookInfo`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Failed to get webhook info: ${response.status} ${errorText}`,
        };
      }

      const result = await response.json();
      return { success: true, info: result };
    } catch (error: any) {
      console.error("Error getting webhook info:", error);
      return {
        success: false,
        error: error.message || "Failed to get webhook info",
      };
    }
  },
});

/**
 * Internal query to get business by Telegram token
 */
export const getBusinessByTelegramToken = internalQuery({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const business = await ctx.db
      .query("businesses")
      .filter((q) => q.eq(q.field("telegramBotToken"), args.token))
      .first();

    return business;
  },
});

/**
 * HTTP Action handler for Telegram webhooks
 * Each business gets a unique webhook URL with their businessId
 * URL format: /telegram-webhook/:businessId
 */
export const handleTelegramWebhook = httpAction(async (ctx, request) => {
  console.log("[TG] ===== WEBHOOK CALLED =====");
  console.log("[TG] URL:", request.url);

  try {
    const url = new URL(request.url);
    const businessId = url.searchParams.get("businessId");

    console.log("[TG] Business ID from query:", businessId);

    if (!businessId) {
      console.error("[TG] No businessId in query parameters");
      return new Response(
        "Invalid webhook URL - missing businessId parameter",
        { status: 400 }
      );
    }

    const bodyText = await request.text();
    const body = JSON.parse(bodyText);
    const message = body.message;

    if (!message) {
      console.log("[TG] No message, returning OK");
      return new Response("OK", { status: 200 });
    }

    const messageText: string | undefined = message.text;
    const chatId = message.chat.id;

    console.log(
      "[TG] ChatId:",
      chatId,
      "Message:",
      messageText?.substring(0, 50)
    );

    const business = await ctx.runQuery(internal.businesses.getBusinessById, {
      businessId: businessId as any,
    });

    if (!business || !business.telegramBotToken) {
      console.error("[TG] Business not found or no token:", businessId);
      return new Response("OK", { status: 200 });
    }

    console.log("[TG] ✓ Business identified:", business.subdomain);

    const matchedBusiness = business;
    const matchedToken = business.telegramBotToken;

    if (messageText && messageText.trim() === "/start") {
      console.log("[TG] Processing /start");
      await ctx.runMutation(internal.telegram.clearConversation, { chatId });
      await ctx.scheduler.runAfter(
        0,
        internal.telegram.processTelegramMessage,
        {
          token: matchedToken,
          chatId,
          text: "¡Hola! Soy tu asistente de citas. Pregunta por servicios o disponibilidad para empezar.",
          subdomain: matchedBusiness.subdomain,
          businessId: matchedBusiness._id,
          isDirectText: true,
        }
      );
      console.log("[TG] Scheduled /start response");
      return new Response("OK", { status: 200 });
    }

    if (!messageText || messageText.trim().length === 0) {
      console.log("[TG] No message text");
      return new Response("OK", { status: 200 });
    }

    console.log("[TG] Scheduling message processing");
    await ctx.scheduler.runAfter(0, internal.telegram.processTelegramMessage, {
      token: matchedToken,
      chatId,
      text: messageText,
      subdomain: matchedBusiness.subdomain,
      businessId: matchedBusiness._id,
      isDirectText: false,
    });
    console.log("[TG] Message scheduled");
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[TG] ERROR:", error);
    return new Response("OK", { status: 200 });
  }
});

// Internal mutation to get or create conversation
export const getOrCreateConversation = internalMutation({
  args: {
    chatId: v.number(),
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    let conversation = await ctx.db
      .query("telegramConversations")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();

    if (!conversation) {
      const conversationId = await ctx.db.insert("telegramConversations", {
        chatId: args.chatId,
        businessId: args.businessId,
        messages: [],
        lastUpdated: Date.now(),
      });
      conversation = await ctx.db.get(conversationId);
    }

    return conversation;
  },
});

// Internal mutation to add message to conversation
export const addMessageToConversation = internalMutation({
  args: {
    chatId: v.number(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("telegramConversations")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const updatedMessages = [
      ...conversation.messages,
      { role: args.role, content: args.content },
    ];

    // Keep only last 20 messages to avoid too long context
    const messagesToKeep = updatedMessages.slice(-20);

    await ctx.db.patch(conversation._id, {
      messages: messagesToKeep,
      lastUpdated: Date.now(),
    });

    return messagesToKeep;
  },
});

// Internal mutation to clear conversation (for /start)
export const clearConversation = internalMutation({
  args: {
    chatId: v.number(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("telegramConversations")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();

    if (conversation) {
      await ctx.db.patch(conversation._id, {
        messages: [],
        lastUpdated: Date.now(),
      });
    }
  },
});

// Internal action that processes the message and sends reply
export const processTelegramMessage = internalAction({
  args: {
    token: v.string(),
    chatId: v.number(),
    text: v.string(),
    subdomain: v.string(),
    businessId: v.id("businesses"),
    isDirectText: v.boolean(),
  },
  handler: async (ctx, args): Promise<void> => {
    console.log("[processTelegramMessage] ===== STARTING PROCESSING =====");
    console.log("[processTelegramMessage] Args:", {
      chatId: args.chatId,
      text: args.text.substring(0, 100),
      subdomain: args.subdomain,
      isDirectText: args.isDirectText,
      tokenExists: !!args.token,
    });

    try {
      if (args.isDirectText) {
        console.log("[processTelegramMessage] Sending direct text message");
        const sent = await sendTelegramMessage(
          args.token,
          args.chatId,
          args.text
        );
        console.log("[processTelegramMessage] Direct message sent:", sent);
        return;
      }

      // Get or create conversation history
      console.log("[processTelegramMessage] Getting conversation history");
      await ctx.runMutation(internal.telegram.getOrCreateConversation, {
        chatId: args.chatId,
        businessId: args.businessId,
      });

      // Add user message to conversation and get updated messages
      const updatedMessages = await ctx.runMutation(
        internal.telegram.addMessageToConversation,
        {
          chatId: args.chatId,
          role: "user",
          content: args.text,
        }
      );

      console.log(
        "[processTelegramMessage] Conversation has",
        updatedMessages.length,
        "messages"
      );

      // Call chat.sendMessage with full conversation history
      console.log("[processTelegramMessage] Calling chat.sendMessage");
      const sessionId = `telegram-${args.chatId}`;
      const response = await ctx.runAction(api.chat.sendMessage, {
        messages: updatedMessages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        })),
        subdomain: args.subdomain,
        sessionId,
      });
      console.log(
        "[processTelegramMessage] Chat response received, length:",
        response.content?.length
      );
      console.log(
        "[processTelegramMessage] Chat response preview:",
        response.content?.substring(0, 100)
      );

      // Add assistant response to conversation
      await ctx.runMutation(internal.telegram.addMessageToConversation, {
        chatId: args.chatId,
        role: "assistant",
        content: response.content,
      });

      const sent = await sendTelegramMessage(
        args.token,
        args.chatId,
        response.content
      );
      console.log("[processTelegramMessage] Response sent to Telegram:", sent);
    } catch (err) {
      console.error("[processTelegramMessage] Error:", err);
      console.error(
        "[processTelegramMessage] Error details:",
        err instanceof Error ? err.message : String(err)
      );
      try {
        await sendTelegramMessage(
          args.token,
          args.chatId,
          "Lo siento, no pude procesar tu mensaje en este momento. Intenta nuevamente."
        );
      } catch (sendErr) {
        console.error(
          "[processTelegramMessage] Error sending error message:",
          sendErr
        );
      }
    }
  },
});
