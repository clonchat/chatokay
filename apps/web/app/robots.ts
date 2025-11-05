import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://chatokay.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/sign-in",
          "/sign-up",
          "/dashboard",
          "/onboarding",
          "/ajustes",
          "/citas",
          "/disponibilidad",
          "/integraciones",
          "/perfil",
          "/servicios",
          "/debug",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

