"use client";

import { businessAtom } from "@/lib/store/auth-atoms";
import { getChatbotUrl } from "@/lib/utils/urls";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useAtomValue } from "jotai";
import { Bot, Calendar, ExternalLink, Wrench } from "lucide-react";
import Link from "next/link";
import { StatusDistributionChart } from "@/components/dashboard/status-distribution-chart";
import { ServiceBookingsChart } from "@/components/dashboard/service-bookings-chart";
import { DayOfWeekChart } from "@/components/dashboard/day-of-week-chart";
import { AppointmentsTrendChart } from "@/components/dashboard/appointments-trend-chart";

export default function DashboardPage() {
  const business = useAtomValue(businessAtom);

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground/60">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Bienvenido a {business.name}
        </h1>
        <p className="text-foreground/60 mt-2">
          Panel de control de tu chatbot de citas
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bot className="h-5 w-5" />
              Tu Chatbot
            </CardTitle>
            <CardDescription className="text-foreground/60">
              Enlace público a tu chatbot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border border-border">
                <code className="text-sm break-all text-foreground/80">
                  {getChatbotUrl(business.subdomain)}
                </code>
              </div>
              <Button asChild className="w-full">
                <a
                  href={getChatbotUrl(business.subdomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Visitar Chatbot
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Wrench className="h-5 w-5" />
              Servicios
            </CardTitle>
            <CardDescription className="text-foreground/60">
              {business.appointmentConfig.services.length} servicios
              configurados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              variant="outline"
              className="w-full border-border text-foreground hover:bg-muted"
            >
              <Link href="/servicios">Gestionar Servicios</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="h-5 w-5" />
              Disponibilidad
            </CardTitle>
            <CardDescription className="text-foreground/60">
              Horarios configurados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/60 mb-4">
              {business.availability.filter((d) => d.slots.length > 0).length}{" "}
              días disponibles
            </p>
            <Button
              asChild
              variant="outline"
              className="w-full border-border text-foreground hover:bg-muted"
            >
              <Link href="/disponibilidad">Gestionar Horarios</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts section */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatusDistributionChart businessId={business._id} />
        <ServiceBookingsChart businessId={business._id} />
        <DayOfWeekChart businessId={business._id} />
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <AppointmentsTrendChart businessId={business._id} />
      </div>

      {/* Next steps */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Próximos Pasos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-foreground/60">
            <li>Personaliza la apariencia de tu chatbot</li>
            <li>Configura notificaciones de citas</li>
            <li>Integra con Google Calendar</li>
            <li>Comparte el enlace con tus clientes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
