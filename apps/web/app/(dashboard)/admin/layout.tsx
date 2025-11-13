"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { authStatusAtom, roleAtom } from "@/lib/store/auth-atoms";
import { LoadingScreen } from "@/components/loading";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";

export default function AdminLayout({
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

    // Only admin users can access this area
    if (role && role !== "admin") {
      // Redirect non-admin users to their appropriate dashboard
      if (role === "sales") {
        router.push("/comercial");
      } else if (role === "client") {
        router.push("/dashboard");
      }
      return;
    }
  }, [authStatus, role, router]);

  // Show loading while checking auth status
  if (authStatus === "loading") {
    return <LoadingScreen message="Cargando..." />;
  }

  // If not authenticated or not admin, show loading (will redirect)
  if (authStatus !== "authenticated" || role !== "admin") {
    return <LoadingScreen message="Verificando permisos..." />;
  }

  // Admin user - show admin layout with same styles as client/comercial
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        {/* Topbar */}
        <AdminTopbar
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

