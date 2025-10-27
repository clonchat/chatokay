"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useSidebar } from "../layout";

interface Business {
  _id: string;
  name: string;
  logo?: string;
  description?: string;
}

interface WeeklyAvailability {
  date: string;
  dayName: string;
  slots: Array<{
    start: string;
    end: string;
    isBooked: boolean;
  }>;
}

export default function DisponibilidadPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const { toggleSidebar } = useSidebar();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

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

  // Fetch business info
  useEffect(() => {
    async function fetchBusiness() {
      try {
        const response = await fetch(`/api/business/${subdomain}`);
        if (!response.ok) {
          throw new Error("Negocio no encontrado");
        }
        const data = await response.json();
        setBusiness(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }

    if (subdomain) {
      fetchBusiness();
    }
  }, [subdomain]);

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Cargando disponibilidad...</p>
        </div>
      </div>
    );
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
