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
import { roleAtom, userAtom } from "@/lib/store/auth-atoms";
import { Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface ComercialTopbarProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export function ComercialTopbar({
  onMenuClick,
  isSidebarOpen,
}: ComercialTopbarProps) {
  const { signOut } = useClerk();
  const role = useAtomValue(roleAtom);
  const user = useAtomValue(userAtom);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { theme, setTheme } = useTheme();

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
          <h1 className="text-xl font-semibold text-foreground hidden md:block">
            Panel Comercial
          </h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            {user?.name || "Comercial"}
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Role badge */}
        <div className="hidden md:block">
          <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {role === "admin" ? "Admin como Sales" : "Comercial"}
          </div>
        </div>

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
              sesión nuevamente para acceder a tu panel.
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

