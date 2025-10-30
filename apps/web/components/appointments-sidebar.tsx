"use client";

import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock } from "lucide-react";
import { useMemo } from "react";

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
      <div className="h-full min-h-0">
        <Card className="bg-card border-border h-full lg:h-full flex flex-col">
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-lg md:text-xl text-foreground">
              Próximas Citas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 md:p-6">
            <div className="flex h-full items-center justify-center text-center text-sm text-foreground/60">
              No hay citas programadas
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      <Card className="bg-card border-border h-full lg:h-full flex flex-col">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-lg md:text-xl text-foreground">
            Próximas Citas
          </CardTitle>
          <p className="text-xs text-foreground/60">
            {appointments.length} {appointments.length === 1 ? "cita" : "citas"}
          </p>
        </CardHeader>
        <CardContent className="flex-1 space-y-2 md:space-y-3 overflow-y-auto p-4 md:p-6">
          {sortedAppointments.map((appointment) => (
            <button
              key={appointment._id}
              onClick={() => onAppointmentClick(appointment._id)}
              className={`w-full rounded-lg border p-2.5 md:p-3 text-left transition-all hover:bg-muted active:bg-muted/80 ${
                appointment.isInProgress
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                  : "border-border bg-card"
              }`}
            >
              {appointment.isInProgress && (
                <div className="mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold text-orange-600 dark:text-orange-400">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  En Curso
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-foreground/60 flex-shrink-0" />
                    <span className="font-medium text-sm md:text-base text-foreground">
                      {formatTime(appointment.appointmentTime)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm md:text-base font-medium text-foreground truncate">
                    {appointment.customerName}
                  </p>
                  <p className="text-xs md:text-sm text-foreground/70 truncate">
                    {appointment.serviceName}
                  </p>
                </div>
                <div
                  className={`ml-1 md:ml-2 rounded-full px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-medium flex-shrink-0 ${
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
              <p className="mt-1 text-[10px] md:text-xs text-foreground/60">
                {formatDate(appointment.appointmentTime)}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
