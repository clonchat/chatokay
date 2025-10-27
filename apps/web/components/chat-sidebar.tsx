"use client";

import { useState, useMemo } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import { Badge } from "@workspace/ui/components/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

interface Service {
  id: string;
  name: string;
  duration: number;
  price?: number;
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

interface ChatSidebarProps {
  services: Service[];
  businessId: string;
}

export function ChatSidebar({ services, businessId }: ChatSidebarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());

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
  const weeklyAvailability = useQuery(api.appointments.getWeeklyAvailability, {
    businessId: businessId as any,
    startDate: weekStartStr,
  });
  const loading = weeklyAvailability === undefined;
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

  return (
    <aside className="w-full md:w-80 h-[calc(100vh-80px)] overflow-y-auto bg-card border-r border-border p-4">
      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="availability">Disponibilidad</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          <div className="space-y-3">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay servicios disponibles
              </p>
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  className="p-3 rounded-lg border border-border bg-background"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-foreground">
                        {service.name}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {service.duration} min
                        </Badge>
                        {service.price && (
                          <Badge variant="outline" className="text-xs">
                            ${service.price.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <div className="space-y-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousWeek}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
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
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextWeek}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Week Schedule */}
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Cargando disponibilidad...
              </div>
            ) : (
              <div className="space-y-4">
                {availability.map((day) => (
                  <div
                    key={day.date}
                    className="border rounded-lg p-3 bg-background"
                  >
                    <div className="mb-2">
                      <h4 className="font-semibold text-sm text-foreground">
                        {day.dayName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(day.date)}
                      </p>
                    </div>
                    {day.slots.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No hay horarios disponibles
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {day.slots.map((slot, idx) => (
                          <div
                            key={idx}
                            className={`text-xs px-2 py-1 rounded text-center ${
                              slot.isBooked
                                ? "bg-muted text-muted-foreground line-through"
                                : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            }`}
                            title={slot.isBooked ? "Ocupado" : "Disponible"}
                          >
                            {formatTime(slot.start)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
