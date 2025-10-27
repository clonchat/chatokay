"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { MessageSquare, ShoppingBag, Calendar } from "lucide-react";

interface CustomerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
  businessLogo?: string;
  subdomain?: string;
}

export function CustomerSidebar({
  isOpen,
  onClose,
  businessName,
  businessLogo,
  subdomain,
}: CustomerSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Chat",
      href: `/`,
      icon: MessageSquare,
    },
    {
      name: "Servicios",
      href: `/servicios`,
      icon: ShoppingBag,
    },
    {
      name: "Disponibilidad",
      href: `/disponibilidad`,
      icon: Calendar,
    },
  ];

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
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
