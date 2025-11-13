"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { authStatusAtom, roleAtom } from "@/lib/store/auth-atoms";
import { LoadingScreen } from "@/components/loading";
import { ComercialSidebar } from "@/components/comercial-sidebar";
import { ComercialTopbar } from "@/components/comercial-topbar";

export default function ComercialLayout({
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
      router.push("/internal/sign-in");
      return;
    }

    // Only sales and admin users can access this area
    if (role && role !== "sales" && role !== "admin") {
      // Redirect client users to their dashboard
      router.push("/dashboard");
      return;
    }
  }, [authStatus, role, router]);

  // Show loading while checking auth status
  if (authStatus === "loading") {
    return <LoadingScreen message="Cargando..." />;
  }

  // If not authenticated or not sales/admin, show loading (will redirect)
  if (
    authStatus !== "authenticated" ||
    (role !== "sales" && role !== "admin")
  ) {
    return <LoadingScreen message="Verificando permisos..." />;
  }

  // Sales user - show sales layout with same styles as client layout
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ComercialSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        {/* Topbar */}
        <ComercialTopbar
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

