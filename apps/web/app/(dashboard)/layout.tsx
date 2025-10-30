"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authStatusAtom } from "@/lib/store/auth-atoms";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { LoadingScreen } from "@/components/loading";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authStatus = useAtomValue(authStatusAtom);
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

    // If authenticated, allow access to dashboard
  }, [authStatus, router]);

  // Show loading while checking auth status
  if (authStatus === "loading") {
    return <LoadingScreen message="Cargando..." />;
  }

  // If not authenticated or needs onboarding, show loading (will redirect)
  if (authStatus !== "authenticated") {
    return <LoadingScreen message="Redirigiendo..." />;
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
    </div>
  );
}
