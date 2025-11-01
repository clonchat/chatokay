import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuración Inicial - ChatOkay",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

