import { atom } from "jotai";
import type { Doc } from "@workspace/backend/_generated/dataModel";

// Auth status types
export type AuthStatus =
  | "loading" // Initial loading state
  | "unauthenticated" // User not signed in
  | "onboarding" // User signed in but no business
  | "authenticated"; // User signed in with business

// User atom - stores user data from Convex backend
export const userAtom = atom<Doc<"users"> | null>(null);

// Business atom - stores user's business data
export const businessAtom = atom<Doc<"businesses"> | null>(null);

// Clerk auth state atom - stores Clerk's authentication state
export const clerkAuthAtom = atom<{
  isLoaded: boolean;
  isSignedIn: boolean;
}>({
  isLoaded: false,
  isSignedIn: false,
});

// Auth status atom - computed state based on Clerk auth, user and business
export const authStatusAtom = atom<AuthStatus>((get) => {
  const clerkAuth = get(clerkAuthAtom);
  const user = get(userAtom);
  const business = get(businessAtom);

  // If Clerk is not loaded yet, we're still loading
  if (!clerkAuth.isLoaded) {
    return "loading";
  }

  // If Clerk says user is not signed in, they're unauthenticated
  if (!clerkAuth.isSignedIn) {
    return "unauthenticated";
  }

  // If user is null but Clerk says they're signed in, we're still loading user data
  if (user === null) {
    return "loading";
  }

  // User exists but no business means onboarding needed
  if (business === null) {
    return "onboarding";
  }

  // User has business - fully authenticated
  return "authenticated";
});

// Derived atoms for convenience
export const isAuthenticatedAtom = atom(
  (get) => get(authStatusAtom) === "authenticated"
);
export const needsOnboardingAtom = atom(
  (get) => get(authStatusAtom) === "onboarding"
);
export const isLoadingAtom = atom((get) => get(authStatusAtom) === "loading");
