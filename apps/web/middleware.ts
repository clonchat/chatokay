import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",
  "/chat(.*)",
  "/privacy",
  "/terms",
]);

function getSubdomain(hostname: string): string | null {
  // For local development
  if (hostname.includes("localhost")) {
    // Check for subdomain in localhost (e.g., polimar.localhost:3000)
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "localhost") {
      return parts[0] || null;
    }
    return null;
  }

  // For production
  const parts = hostname.split(".");

  // Check if it's a subdomain (e.g., polimar.chatokay.com)
  if (parts.length >= 3) {
    // Exclude www
    if (parts[0] === "www") {
      return null;
    }
    return parts[0] || null;
  }

  return null;
}

export default clerkMiddleware(async (auth, request) => {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const subdomain = getSubdomain(hostname);

  // If we're on a subdomain, rewrite to the chat page
  if (subdomain && url.pathname === "/") {
    const chatUrl = url.clone();
    chatUrl.pathname = `/chat/${subdomain}`;
    return NextResponse.rewrite(chatUrl);
  }

  // If we're on a subdomain and accessing the chat route, allow it
  if (subdomain && url.pathname.startsWith("/chat/")) {
    return NextResponse.next();
  }

  // Protect routes that require authentication (only on main domain)
  if (!subdomain && !isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
