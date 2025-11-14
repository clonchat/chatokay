"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { authStatusAtom, roleAtom } from "@/lib/store/auth-atoms";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { LoadingScreen } from "@/components/loading";
import { TrialModal } from "@/components/trial-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authStatus = useAtomValue(authStatusAtom);
  const role = useAtomValue(roleAtom);
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Redirect based on auth status
    if (authStatus === "loading") {
      return; // Still loading, wait
    }

    if (authStatus === "unauthenticated") {
      router.push("/sign-in");
      return;
    }

    if (authStatus === "onboarding") {
      router.push("/onboarding");
      return;
    }

    // Redirect sales/admin users to their respective dashboards
    if (role === "admin") {
      router.push("/admin");
      return;
    }

    if (role === "sales") {
      router.push("/comercial");
      return;
    }

    // If authenticated and client role, allow access to dashboard
  }, [authStatus, role, router]);

  // Show loading while checking auth status
  if (authStatus === "loading") {
    return <LoadingScreen message="Cargando..." />;
  }

  // If not authenticated or needs onboarding, show loading (will redirect)
  if (authStatus !== "authenticated") {
    return <LoadingScreen message="Redirigiendo..." />;
  }

  // Don't render layout for sales/admin users - they have their own layouts
  if (role === "admin" || role === "sales") {
    return <>{children}</>;
  }

  // User is authenticated and has business, show dashboard layout
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        {/* Topbar */}
        <DashboardTopbar
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
      {/* Trial Modal */}
      <TrialModal />
    </div>
  );
}
