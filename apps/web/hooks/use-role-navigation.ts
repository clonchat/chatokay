import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { roleAtom, authStatusAtom } from "@/lib/store/auth-atoms";

/**
 * Hook that provides role-based navigation logic
 */
export function useRoleNavigation() {
  const router = useRouter();
  const role = useAtomValue(roleAtom);
  const authStatus = useAtomValue(authStatusAtom);

  /**
   * Get the default dashboard path for the current user's role
   */
  const getDefaultDashboardPath = (): string => {
    switch (role) {
      case "admin":
        return "/admin";
      case "sales":
        return "/comercial";
      case "client":
        return "/dashboard";
      default:
        return "/dashboard";
    }
  };

  /**
   * Navigate to the appropriate dashboard based on user role
   */
  const navigateToRoleDashboard = () => {
    const path = getDefaultDashboardPath();
    router.push(path);
  };

  /**
   * Check if the current user has access to a specific role-based route
   */
  const hasAccessToRoute = (route: string): boolean => {
    if (route.startsWith("/admin")) {
      return role === "admin";
    }
    if (route.startsWith("/comercial")) {
      return role === "sales" || role === "admin";
    }
    if (route.startsWith("/dashboard")) {
      return role === "client";
    }
    return true; // Public routes
  };

  /**
   * Redirect to the correct page based on authentication status and role
   */
  const redirectToCorrectPage = () => {
    switch (authStatus) {
      case "loading":
        // Still loading, don't redirect yet
        return;

      case "unauthenticated":
        // User not signed in, redirect to sign-in
        router.push("/sign-in");
        break;

      case "onboarding":
        // Client user needs onboarding
        router.push("/onboarding");
        break;

      case "authenticated":
        // Navigate to role-specific dashboard
        navigateToRoleDashboard();
        break;
    }
  };

  return {
    role,
    authStatus,
    getDefaultDashboardPath,
    navigateToRoleDashboard,
    hasAccessToRoute,
    redirectToCorrectPage,
  };
}

