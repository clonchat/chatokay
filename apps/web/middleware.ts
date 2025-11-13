import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/internal/sign-in(.*)",
  "/internal/sign-up(.*)",
  "/api/webhook(.*)",
  "/api/business(.*)",
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
  const authState = await auth();

  // If authenticated user hits root on main domain, redirect to dashboard
  if (authState.userId && url.pathname === "/" && !subdomain) {
    return NextResponse.redirect(new URL("/dashboard", url));
  }

  // If we're on a subdomain, rewrite to the subdomain route structure
  if (subdomain) {
    // Don't rewrite API routes
    if (url.pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // Rewrite the path to include the subdomain parameter
    const chatUrl = url.clone();
    chatUrl.pathname = `/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(chatUrl);
  }

  // Protect routes that require authentication (only on main domain)
  if (!subdomain && !isPublicRoute(request) && !authState.userId) {
    return NextResponse.redirect(new URL("/sign-in", url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
