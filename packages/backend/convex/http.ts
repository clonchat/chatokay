import { httpRouter } from "convex/server";
import { webhook } from "./clerk.js";
import { handleTelegramWebhook } from "./telegram.js";

const http = httpRouter();

// Mount Clerk webhook route
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: webhook,
});

// Mount Telegram webhook route with businessId parameter
// Each bot gets its own unique webhook URL
http.route({
  path: "/telegram-webhook/:businessId",
  method: "POST",
  handler: handleTelegramWebhook,
});

export default http;
