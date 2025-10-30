"use client";

import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useSidebar } from "../context";
import { LoadingScreen } from "@/components/loading";

export default function DisponibilidadPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const { toggleSidebar, business: layoutBusiness } = useSidebar();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());

  // Get business from layout or query it directly
  const businessFromQuery = useQuery(
    api.businesses.getBySubdomain,
    layoutBusiness ? "skip" : subdomain ? { subdomain } : "skip"
  );

  const business = layoutBusiness || businessFromQuery;
  // Loading: no layout business AND query is still undefined
  const loading = !layoutBusiness && businessFromQuery === undefined;
  // Error: query finished but returned null (business not found)
  const error =
    businessFromQuery === null && !loading ? "Negocio no encontrado" : null;

  // Get Monday of the current week
  const getWeekStart = (date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
  };

  // Calculate the week start date string for the query
  const weekStartStr = useMemo(() => {
    return (
      getWeekStart(new Date(currentWeekStart)).toISOString().split("T")[0] ?? ""
    );
  }, [currentWeekStart]);

  // Use Convex query to get weekly availability
  const weeklyAvailability = useQuery(
    api.appointments.getWeeklyAvailability,
    business && business._id
      ? { businessId: business._id as any, startDate: weekStartStr }
      : "skip"
  );
  const availability = weeklyAvailability ?? [];

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d 'de' MMMM", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr;
  };

  if (loading) {
    return <LoadingScreen message="Cargando disponibilidad..." />;
  }

  if (error || !business) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md px-4">
          <h1 className="text-2xl font-bold text-foreground">
            Error al cargar disponibilidad
          </h1>
          <p className="text-muted-foreground">
            {error || "No se pudo cargar la información"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header with business info */}
      <header className="border-b bg-card border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {business.logo && (
              <img
                src={business.logo}
                alt={business.name}
                className="h-10 w-10 object-contain rounded bg-background p-1 border border-border"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">
                Disponibilidad
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                Consulta nuestros horarios disponibles
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Semana Anterior
            </Button>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>
                {format(getWeekStart(currentWeekStart), "d MMM", {
                  locale: es,
                })}{" "}
                -{" "}
                {format(
                  new Date(
                    getWeekStart(currentWeekStart).getTime() +
                      6 * 24 * 60 * 60 * 1000
                  ),
                  "d MMM yyyy",
                  { locale: es }
                )}
              </span>
            </div>
            <Button variant="outline" onClick={goToNextWeek}>
              Semana Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Week Schedule */}
          {availability.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay horarios disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No hay horarios disponibles en este momento. Por favor,
                  consulta con nosotros para más información.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {availability.map((day) => (
                <Card key={day.date}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {day.dayName} - {formatDate(day.date)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {day.slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay horarios disponibles este día
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {day.slots.map((slot, idx) => (
                          <div
                            key={idx}
                            className={`text-xs px-2 py-1 rounded text-center transition-colors ${
                              slot.isBooked
                                ? "bg-muted text-muted-foreground line-through cursor-not-allowed"
                                : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50"
                            }`}
                            title={slot.isBooked ? "Ocupado" : "Disponible"}
                          >
                            {formatTime(slot.start)}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
