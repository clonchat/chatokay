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

// Mount Telegram webhook route
http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: handleTelegramWebhook,
});

export default http;
