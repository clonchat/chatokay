"use client";

import { createContext, useContext } from "react";
import type { Id } from "@workspace/backend/_generated/dataModel";

export interface Business {
  _id: string | Id<"businesses">;
  name: string;
  description?: string;
  subdomain: string;
  phone?: string;
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

export interface SubdomainContextType {
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
