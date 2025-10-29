import { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://chatokay.com";

export interface SEOConfig {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: "website" | "article";
}

/**
 * Genera metadata completa para SEO incluyendo Open Graph y Twitter Cards
 */
export function generateMetadata(config: SEOConfig): Metadata {
  const url = config.path ? `${baseUrl}${config.path}` : baseUrl;
  const imageUrl = config.image
    ? config.image.startsWith("http")
      ? config.image
      : `${baseUrl}${config.image}`
    : `${baseUrl}/chatokay-logo.png`;

  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    robots: config.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: config.title,
      description: config.description,
      url: url,
      siteName: "ChatOkay",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: config.title,
        },
      ],
      locale: "es_ES",
      type: config.type || "website",
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Keywords comunes para el negocio
 */
export const businessKeywords = [
  "asistente de citas",
  "agenda automática",
  "chatbot de citas",
  "sistema de reservas",
  "agendamiento automático",
  "IA para negocios",
  "chatbot inteligente",
  "Google Calendar",
  "Telegram",
  "WhatsApp",
  "gestión de citas",
  "reservas online",
  "automatización de citas",
  "subdominio personalizado",
];
