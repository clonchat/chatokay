"use client";

import { useAuthSync } from "@/hooks/use-auth-sync";

/**
 * Component that handles synchronization between Clerk, Convex, and Jotai.
 * This component doesn't render anything but ensures the auth state is properly synced.
 */
export function AuthSync() {
  useAuthSync();
  return null;
}
