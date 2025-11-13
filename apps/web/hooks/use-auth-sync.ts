import { businessAtom, userAtom, clerkAuthAtom } from "@/lib/store/auth-atoms";
import { api } from "@workspace/backend/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
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
  const updateMyCountry = useMutation(api.users.updateMyCountry);
  const countryDetected = useRef(false);

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

  // Detect and update country if user doesn't have one
  useEffect(() => {
    if (user && !user.country && !countryDetected.current && isSignedIn) {
      countryDetected.current = true;

      // Detect country using a simple public API directly from the browser
      // Using ipapi.co which is free and reliable
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((data) => {
          if (data.country_code) {
            updateMyCountry({ country: data.country_code })
              .then(() => {
                console.log("Country updated:", data.country_code);
              })
              .catch((error) => {
                console.error("Error updating country:", error);
                countryDetected.current = false; // Retry on next mount if failed
              });
          }
        })
        .catch((error) => {
          console.error("Error detecting country:", error);
          // Try fallback API
          fetch("https://ip-api.com/json/?fields=countryCode")
            .then((res) => res.json())
            .then((data) => {
              if (data.countryCode) {
                updateMyCountry({ country: data.countryCode })
                  .then(() => {
                    console.log(
                      "Country updated (fallback):",
                      data.countryCode
                    );
                  })
                  .catch((error) => {
                    console.error("Error updating country (fallback):", error);
                    countryDetected.current = false;
                  });
              }
            })
            .catch((fallbackError) => {
              console.error(
                "All country detection methods failed:",
                fallbackError
              );
              countryDetected.current = false; // Allow retry
            });
        });
    }
  }, [user, isSignedIn, updateMyCountry]);

  return {
    user,
    business,
  };
}
