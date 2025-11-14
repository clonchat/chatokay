"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useAtomValue } from "jotai";
import { businessAtom } from "@/lib/store/auth-atoms";
import { Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationsDropdown } from "./notifications-dropdown";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

interface DashboardTopbarProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export function DashboardTopbar({
  onMenuClick,
  isSidebarOpen,
}: DashboardTopbarProps) {
  const { signOut } = useClerk();
  const business = useAtomValue(businessAtom);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { theme, setTheme } = useTheme();
  const subscription = useQuery(api.subscriptions.getCurrentUserSubscription);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setIsLoggingOut(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        {/* Page title */}
        <div>
          {/* Hide business name on mobile */}
          <div className="flex items-center gap-2 hidden md:flex">
            <h1 className="text-xl font-semibold text-foreground">
              {business?.name || "Dashboard"}
            </h1>
            {/* Subscription badge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                subscription?.status === "active"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {subscription?.status === "active" ? "Pro" : "Free"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground hidden md:block">
            Panel de control
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Business info */}
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-foreground">
            {business?.subdomain}.chatokay.com
          </p>
          <p className="text-xs text-muted-foreground">
            Tu chatbot está activo
          </p>
        </div>

        {/* Notifications */}
        {business && <NotificationsDropdown businessId={business._id} />}

        {/* Theme toggle button */}
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Logout button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLogoutModal(true)}
          disabled={isLoggingOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isLoggingOut ? "Cerrando..." : "Cerrar Sesión"}
        </Button>
      </div>

      {/* Logout confirmation modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar sesión?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres cerrar sesión? Tendrás que iniciar
              sesión nuevamente para acceder a tu dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Cerrando..." : "Cerrar Sesión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
