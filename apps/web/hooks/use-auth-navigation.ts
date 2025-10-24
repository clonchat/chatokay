import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { authStatusAtom, userAtom, businessAtom } from "@/lib/store/auth-atoms";

/**
 * Hook that provides navigation logic based on authentication state.
 * Uses Jotai atoms to determine the correct page to redirect to.
 */
export function useAuthNavigation() {
  const router = useRouter();
  const authStatus = useAtomValue(authStatusAtom);
  const user = useAtomValue(userAtom);
  const business = useAtomValue(businessAtom);

  /**
   * Redirects to the appropriate page based on authentication state.
   * This function should be called when you need to ensure the user is on the right page.
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
        // User signed in but no business, redirect to onboarding
        router.push("/onboarding");
        break;

      case "authenticated":
        // User has business, redirect to dashboard
        router.push("/dashboard");
        break;
    }
  };

  /**
   * Checks if the user should be on the current page.
   * Returns true if the user is on the correct page for their auth status.
   */
  const isOnCorrectPage = (currentPath: string): boolean => {
    switch (authStatus) {
      case "loading":
        return true; // Allow any page while loading

      case "unauthenticated":
        return currentPath === "/" || currentPath.startsWith("/sign-");

      case "onboarding":
        return currentPath === "/onboarding";

      case "authenticated":
        return currentPath.startsWith("/dashboard");

      default:
        return false;
    }
  };

  return {
    authStatus,
    user,
    business,
    redirectToCorrectPage,
    isOnCorrectPage,
  };
}
