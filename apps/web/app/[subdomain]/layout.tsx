"use client";

import { CustomerSidebar } from "@/components/customer-sidebar";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { SubdomainContext } from "./context";

export default function SubdomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Call Convex directly instead of using the route handler
  const businessFromQuery = useQuery(
    api.businesses.getBySubdomain,
    subdomain ? { subdomain } : "skip"
  );

  // Convert undefined to null for consistency
  const business = businessFromQuery ?? null;

  // Set default light theme immediately
  useEffect(() => {
    const htmlElement = document.documentElement;
    // Ensure light mode by default (prevent dark flash)
    setTimeout(() => {
      htmlElement.classList.remove("dark");
    }, 0);
  }, []);

  // Apply theme, title, and favicon when business loads
  useEffect(() => {
    if (!business) return;

    const htmlElement = document.documentElement;

    // Apply theme
    /* if (business.theme === "dark") {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    } */

    // Update document title
    const originalTitle = document.title;
    document.title = business.name;

    // Update favicon if logo exists
    if (business.logo) {
      // Remove any existing business favicon
      const existingFavicon = document.querySelector(
        'link[data-business-favicon="true"]'
      );
      if (existingFavicon) {
        existingFavicon.remove();
      }

      // Create new favicon link
      const faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      faviconLink.type = "image/png";
      faviconLink.href = business.logo;
      faviconLink.setAttribute("data-business-favicon", "true");
      document.head.appendChild(faviconLink);
    }

    // Cleanup function
    return () => {
      // Reset theme to light when unmounting
      htmlElement.classList.remove("dark");
      // Reset title
      document.title = originalTitle;
      // DON'T remove the favicon here - let it persist
    };
  }, [business]);

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
