import { atom } from "jotai";
import type { Doc } from "@workspace/backend/_generated/dataModel";

// User role types
export type UserRole = "client" | "sales" | "admin";

// Auth status types
export type AuthStatus =
  | "loading" // Initial loading state
  | "unauthenticated" // User not signed in
  | "onboarding" // User signed in but no business (clients only)
  | "authenticated"; // User signed in with business or sales/admin user

// Business type with resolved logo URL (from the API)
type BusinessWithLogoUrl = Omit<Doc<"businesses">, "visualConfig"> & {
  visualConfig: Omit<Doc<"businesses">["visualConfig"], "logoUrl"> & {
    logoUrl?: string;
  };
};

// User atom - stores user data from Convex backend
export const userAtom = atom<Doc<"users"> | null>(null);

// Business atom - stores user's business data
export const businessAtom = atom<BusinessWithLogoUrl | null>(null);

// Clerk auth state atom - stores Clerk's authentication state
export const clerkAuthAtom = atom<{
  isLoaded: boolean;
  isSignedIn: boolean;
}>({
  isLoaded: false,
  isSignedIn: false,
});

// Role atom - computed from user data
export const roleAtom = atom<UserRole | null>((get) => {
  const user = get(userAtom);
  return user?.role || null;
});

// Auth status atom - computed state based on Clerk auth, user, business, and role
export const authStatusAtom = atom<AuthStatus>((get) => {
  const clerkAuth = get(clerkAuthAtom);
  const user = get(userAtom);
  const business = get(businessAtom);
  const role = get(roleAtom);

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

  // Sales and Admin users skip onboarding - they're authenticated immediately
  if (role === "sales" || role === "admin") {
    return "authenticated";
  }

  // Client users need a business to be fully authenticated
  if (role === "client") {
    // User exists but no business means onboarding needed
    if (business === null) {
      return "onboarding";
    }
    // User has business - fully authenticated
    return "authenticated";
  }

  // Fallback - treat as loading if role is unknown
  return "loading";
});

// Derived atoms for convenience
export const isAuthenticatedAtom = atom(
  (get) => get(authStatusAtom) === "authenticated"
);
export const needsOnboardingAtom = atom(
  (get) => get(authStatusAtom) === "onboarding"
);
export const isLoadingAtom = atom((get) => get(authStatusAtom) === "loading");
