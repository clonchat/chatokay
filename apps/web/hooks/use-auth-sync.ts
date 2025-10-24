import { businessAtom, userAtom, clerkAuthAtom } from "@/lib/store/auth-atoms";
import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Hook that synchronizes Convex user and business data with Jotai atoms.
 * This hook runs once when the component mounts and updates atoms when data changes.
 */
export function useAuthSync(): {
  user: ReturnType<typeof useQuery<typeof api.users.getCurrentUser>>;
  business: ReturnType<
    typeof useQuery<typeof api.businesses.getCurrentUserBusiness>
  >;
} {
  const { isLoaded, isSignedIn } = useAuth();
  const user = useQuery(api.users.getCurrentUser);
  const business = useQuery(api.businesses.getCurrentUserBusiness);
  const [, setUser] = useAtom(userAtom);
  const [, setBusiness] = useAtom(businessAtom);
  const [, setClerkAuth] = useAtom(clerkAuthAtom);

  // Update Clerk auth state
  useEffect(() => {
    setClerkAuth({
      isLoaded,
      isSignedIn: isSignedIn ?? false,
    });
  }, [isLoaded, isSignedIn, setClerkAuth]);

  // Update user data
  useEffect(() => {
    if (user !== undefined) {
      setUser(user);
    }
  }, [user, setUser]);

  // Update business data
  useEffect(() => {
    if (business !== undefined) {
      setBusiness(business);
    }
  }, [business, setBusiness]);

  return {
    user,
    business,
  };
}
