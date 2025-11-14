"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { useAtomValue } from "jotai";
import { roleAtom } from "@/lib/store/auth-atoms";
import {
  LayoutDashboard,
  Users,
  Shield,
  CreditCard,
  Sparkles,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/comercial",
    icon: LayoutDashboard,
  },
  {
    name: "Mis Clientes",
    href: "/comercial/clientes",
    icon: Users,
  },
  {
    name: "Suscripciones",
    href: "/comercial/suscripciones",
    icon: CreditCard,
  },
  {
    name: "Promociones",
    href: "/comercial/promociones",
    icon: Sparkles,
  },
];

interface ComercialSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComercialSidebar({ isOpen, onClose }: ComercialSidebarProps) {
  const pathname = usePathname();
  const role = useAtomValue(roleAtom);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-sm">
                  C
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-sidebar-foreground truncate">
                  Panel Comercial
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  ChatOkay
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
            
            {role === "admin" && (
              <Link
                href="/admin"
                onClick={onClose}
                className="group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mt-4 pt-4 border-t border-sidebar-border"
              >
                <Shield className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate">Panel Admin</span>
              </Link>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <div className="text-xs text-muted-foreground">
              <p>ChatOkay v1.0</p>
              <p>Tu asistente de citas con IA</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

