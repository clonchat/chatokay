"use client";

import { CustomerSidebar } from "@/components/customer-sidebar";
import { useParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

interface Business {
  _id: string;
  name: string;
  description?: string;
  subdomain: string;
  theme?: string;
  logo?: string;
  welcomeMessage?: string;
  services?: Array<{
    id: string;
    name: string;
    duration: number;
    price?: number;
  }>;
}

interface SubdomainContextType {
  toggleSidebar: () => void;
  business: Business | null;
}

export const SubdomainContext = createContext<SubdomainContextType | null>(
  null
);

export const useSidebar = () => {
  const context = useContext(SubdomainContext);
  if (!context) {
    throw new Error("useSidebar must be used within SubdomainLayout");
  }
  return context;
};

export default function SubdomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const [business, setBusiness] = useState<Business | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function fetchBusiness() {
      try {
        const response = await fetch(`/api/business/${subdomain}`);
        if (response.ok) {
          const data = await response.json();
          setBusiness(data);
        }
      } catch (err) {
        console.error("Error fetching business:", err);
      }
    }

    if (subdomain) {
      fetchBusiness();
    }
  }, [subdomain]);

  // Apply theme
  useEffect(() => {
    if (!business) return;

    const htmlElement = document.documentElement;
    if (business.theme === "dark") {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }

    // Update favicon if logo exists
    let faviconLink: HTMLLinkElement | null = null;
    if (business.logo) {
      // Get existing business favicon if it exists
      const existingFavicon = document.querySelector(
        'link[data-business-favicon="true"]'
      );

      // Create new favicon link with cache busting
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      faviconLink.type = "image/png";
      faviconLink.href = business.logo;
      faviconLink.setAttribute("data-business-favicon", "true");

      // Replace existing favicon or append new one
      if (existingFavicon) {
        existingFavicon.remove();
      }
      document.head.appendChild(faviconLink);
    }

    return () => {
      htmlElement.classList.remove("dark");
      // Find and remove the business logo favicon we added
      const businessFavicon = document.querySelector(
        'link[data-business-favicon="true"]'
      );
      if (businessFavicon) {
        businessFavicon.remove();
      }
    };
  }, [business?.theme, business?.logo]);

  const themeClass = business?.theme || "light";

  return (
    <div className={themeClass}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <CustomerSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          businessName={business?.name}
          businessLogo={business?.logo}
          subdomain={subdomain}
        />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-background">
            <SubdomainContext.Provider
              value={{
                toggleSidebar: () => setIsSidebarOpen(!isSidebarOpen),
                business,
              }}
            >
              {children}
            </SubdomainContext.Provider>
          </main>
        </div>
      </div>
    </div>
  );
}
