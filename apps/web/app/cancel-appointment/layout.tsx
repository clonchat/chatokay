import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancelar Cita - ChatOkay",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CancelAppointmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

