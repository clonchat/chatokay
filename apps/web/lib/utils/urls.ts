/**
 * Generates the appropriate chatbot URL based on the environment
 * @param subdomain - The business subdomain
 * @returns The full URL to the chatbot
 */
export function getChatbotUrl(subdomain: string): string {
  // Check if we're in development
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // For localhost development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${subdomain}.localhost:3000`;
    }

    // For production
    return `https://${subdomain}.chatokay.com`;
  }

  // Server-side fallback
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    return `http://${subdomain}.localhost:3000`;
  }

  return `https://${subdomain}.chatokay.com`;
}

/**
 * Generates the appropriate domain for display purposes
 * @param subdomain - The business subdomain
 * @returns The domain string for display
 */
export function getChatbotDomain(subdomain: string): string {
  // Check if we're in development
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // For localhost development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${subdomain}.localhost:3000`;
    }

    // For production
    return `${subdomain}.chatokay.com`;
  }

  // Server-side fallback
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    return `${subdomain}.localhost:3000`;
  }

  return `${subdomain}.chatokay.com`;
}

/**
 * Generates the referral URL with the referral code
 * @param referralCode - The referral code (e.g., "SALES-ABC123")
 * @returns The full URL with referral code query parameter
 */
export function getReferralUrl(referralCode: string): string {
  // Check if we're in development
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // For localhost development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://localhost:3000/sign-up?ref=${referralCode}`;
    }

    // For production
    return `https://chatokay.com/sign-up?ref=${referralCode}`;
  }

  // Server-side fallback
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    return `http://localhost:3000/sign-up?ref=${referralCode}`;
  }

  return `https://chatokay.com/sign-up?ref=${referralCode}`;
}

