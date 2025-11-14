import { httpRouter } from "convex/server";
import { webhook } from "./clerk.js";
import { handleTelegramWebhook } from "./telegram.js";
import { webhook as stripeWebhook } from "./stripeWebhook.js";

const http = httpRouter();

// Mount Clerk webhook route
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: webhook,
});

// Mount Telegram webhook route
// businessId is passed as query parameter: /telegram-webhook?businessId=...
http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: handleTelegramWebhook,
});

// Mount Stripe webhook route
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: stripeWebhook,
});

export default http;
