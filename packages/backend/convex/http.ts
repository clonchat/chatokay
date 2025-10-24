import { httpRouter } from "convex/server";
import { webhook } from "./clerk.js";

const http = httpRouter();

// Mount Clerk webhook route
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: webhook,
});

export default http;
