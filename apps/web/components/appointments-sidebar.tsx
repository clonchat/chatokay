"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Clock, Mail, Phone, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AppointmentsSidebarProps {
  businessId: string;
  onAppointmentClick: (appointmentId: string) => void;
}

export function AppointmentsSidebar({
  businessId,
  onAppointmentClick,
}: AppointmentsSidebarProps) {
  const appointments = useQuery(
    api.appointments.getUpcomingAppointments,
    businessId ? { businessId: businessId as any, limit: 10 } : "skip"
  );

  const sortedAppointments = useMemo(() => {
    if (!appointments) return [];
    return [...appointments].sort((a, b) =>
      a.appointmentTime.localeCompare(b.appointmentTime)
    );
  }, [appointments]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "HH:mm", { locale: es });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM", { locale: es });
  };

  if (!appointments || appointments.length === 0) {
    return (
      <div className="h-full p-4">
        <Card className="bg-card border-border h-full">
          <CardHeader>
            <CardTitle className="text-foreground">Próximas Citas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-full items-center justify-center text-center text-sm text-foreground/60">
              No hay citas programadas
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-foreground">Próximas Citas</CardTitle>
          <p className="text-xs text-foreground/60">
            {appointments.length} {appointments.length === 1 ? "cita" : "citas"}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 overflow-y-auto">
          {sortedAppointments.map((appointment) => (
            <button
              key={appointment._id}
              onClick={() => onAppointmentClick(appointment._id)}
              className={`w-full rounded-lg border p-3 text-left transition-all hover:bg-muted ${
                appointment.isInProgress
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                  : "border-border bg-card"
              }`}
            >
              {appointment.isInProgress && (
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
                  <Clock className="h-4 w-4" />
                  En Curso
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-foreground/60" />
                    <span className="font-medium text-foreground">
                      {formatTime(appointment.appointmentTime)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {appointment.customerName}
                  </p>
                  <p className="text-xs text-foreground/70">
                    {appointment.serviceName}
                  </p>
                </div>
                <div
                  className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                    appointment.status === "confirmed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}
                >
                  {appointment.status === "confirmed"
                    ? "Confirmada"
                    : "Pendiente"}
                </div>
              </div>
              <p className="mt-1 text-xs text-foreground/60">
                {formatDate(appointment.appointmentTime)}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
