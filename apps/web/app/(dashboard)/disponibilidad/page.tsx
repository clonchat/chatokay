"use client";

import { useState, useMemo, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { businessAtom } from "@/lib/store/auth-atoms";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import toast from "react-hot-toast";
import {
  RotateCcw,
  CheckSquare,
  Square,
  Clock,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function DisponibilidadPage() {
  const business = useAtomValue(businessAtom);
  const updateAvailability = useMutation(api.businesses.updateAvailability);

  const getHourFromTime = (time: string): number => {
    const [hoursPart] = time.split(":");
    const parsed = Number(hoursPart);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const TIME_SLOTS = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

  // Matrix: [dayIndex][timeSlotIndex] = boolean
  const [selectedSlots, setSelectedSlots] = useState<boolean[][]>(() =>
    DAYS.map(() => TIME_SLOTS.map(() => false))
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    dayIndex: number;
    slotIndex: number;
  } | null>(null);
  const [dragValue, setDragValue] = useState<boolean>(false);

  // Convert existing availability to calendar slots
  useEffect(() => {
    if (business?.availability) {
      const newSlots = DAYS.map(() => TIME_SLOTS.map(() => false));

      business.availability.forEach((dayAvailability) => {
        const dayIndex = DAYS.indexOf(dayAvailability.day);
        if (dayIndex !== -1) {
          dayAvailability.slots.forEach((slot) => {
            const startIndex = TIME_SLOTS.indexOf(slot.start);
            const endIndex = TIME_SLOTS.indexOf(slot.end);

            if (startIndex !== -1 && endIndex !== -1) {
              for (let i = startIndex; i < endIndex; i++) {
                if (newSlots[dayIndex]) {
                  newSlots[dayIndex][i] = true;
                }
              }
            }
          });
        }
      });

      setSelectedSlots(newSlots);
    }
  }, [business?.availability, TIME_SLOTS]);

  const toggleSlot = (dayIndex: number, slotIndex: number, value?: boolean) => {
    const newSlots = selectedSlots.map((day, dIdx) =>
      dIdx === dayIndex
        ? day.map((slot, sIdx) =>
            sIdx === slotIndex ? (value !== undefined ? value : !slot) : slot
          )
        : day
    );
    setSelectedSlots(newSlots);
  };

  const handleSlotMouseDown = (dayIndex: number, slotIndex: number) => {
    setIsDragging(true);
    const currentValue = selectedSlots[dayIndex]?.[slotIndex] || false;
    setDragValue(!currentValue);
    setDragStart({ dayIndex, slotIndex });
    toggleSlot(dayIndex, slotIndex);
  };

  const handleSlotMouseEnter = (dayIndex: number, slotIndex: number) => {
    if (isDragging && dragStart) {
      const startDay = dragStart.dayIndex;
      const startSlot = dragStart.slotIndex;

      // Only allow dragging within the same day
      if (dayIndex === startDay) {
        const minSlot = Math.min(startSlot, slotIndex);
        const maxSlot = Math.max(startSlot, slotIndex);

        const newSlots = selectedSlots.map((day, dIdx) =>
          dIdx === dayIndex
            ? day.map((slot, sIdx) =>
                sIdx >= minSlot && sIdx <= maxSlot ? dragValue : slot
              )
            : day
        );
        setSelectedSlots(newSlots);
      }
    }
  };

  const handleSlotMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Set up global mouse up listener
  useEffect(() => {
    if (isDragging) {
      const handleUp = () => handleSlotMouseUp();
      window.addEventListener("mouseup", handleUp);
      return () => window.removeEventListener("mouseup", handleUp);
    }
  }, [isDragging]);

  const toggleDay = (dayIndex: number) => {
    const allSelected = selectedSlots[dayIndex]?.every((slot) => slot);
    const newSlots = selectedSlots.map((day, dIdx) =>
      dIdx === dayIndex ? day.map(() => !allSelected) : day
    );
    setSelectedSlots(newSlots);
  };

  // Quick action functions
  const setTimeRange = (
    dayIndex: number,
    startHour: number,
    endHour: number
  ) => {
    const startSlotIndex = TIME_SLOTS.findIndex((time) => {
      const hour = getHourFromTime(time);
      return !Number.isNaN(hour) && hour >= startHour;
    });
    const endSlotIndex = TIME_SLOTS.findIndex((time) => {
      const hour = getHourFromTime(time);
      return !Number.isNaN(hour) && hour >= endHour;
    });

    if (startSlotIndex !== -1) {
      const newSlots = selectedSlots.map((day, dIdx) =>
        dIdx === dayIndex
          ? day.map((slot, sIdx) =>
              sIdx >= startSlotIndex &&
              (endSlotIndex === -1 || sIdx < endSlotIndex)
                ? true
                : slot
            )
          : day
      );
      setSelectedSlots(newSlots);
    }
  };

  const clearDay = (dayIndex: number) => {
    const newSlots = selectedSlots.map((day, dIdx) =>
      dIdx === dayIndex ? day.map(() => false) : day
    );
    setSelectedSlots(newSlots);
  };

  const setAllDays = () => {
    const newSlots = selectedSlots.map(() => TIME_SLOTS.map(() => true));
    setSelectedSlots(newSlots);
  };

  const clearAllDays = () => {
    const newSlots = selectedSlots.map(() => TIME_SLOTS.map(() => false));
    setSelectedSlots(newSlots);
  };

  // Group time slots by period
  const morningSlots = TIME_SLOTS.filter((time) => {
    const hour = getHourFromTime(time);
    return !Number.isNaN(hour) && hour >= 8 && hour < 12;
  });
  const afternoonSlots = TIME_SLOTS.filter((time) => {
    const hour = getHourFromTime(time);
    return !Number.isNaN(hour) && hour >= 12 && hour < 18;
  });
  const eveningSlots = TIME_SLOTS.filter((time) => {
    const hour = getHourFromTime(time);
    return !Number.isNaN(hour) && hour >= 18;
  });

  const convertSlotsToAvailability = () => {
    const availability = DAYS.map((day, dayIndex) => {
      const daySlots = selectedSlots[dayIndex] || [];
      const slots: Array<{ start: string; end: string }> = [];

      let start: string | null = null;
      for (let i = 0; i < daySlots.length; i++) {
        if (daySlots[i] && start === null) {
          start = TIME_SLOTS[i] || "";
        } else if (!daySlots[i] && start !== null) {
          const end = TIME_SLOTS[i] || "";
          slots.push({ start, end });
          start = null;
        }
      }

      // If the last slot was selected, close it
      if (start !== null) {
        const lastTime = TIME_SLOTS[TIME_SLOTS.length - 1] || "";
        const [hours, minutes] = lastTime.split(":").map(Number);
        const endTime = `${hours?.toString().padStart(2, "0")}:${((minutes || 0) + 30).toString().padStart(2, "0")}`;
        slots.push({ start, end: endTime });
      }

      return { day, slots };
    });

    return availability;
  };

  const handleSave = async () => {
    if (!business) return;

    const availability = convertSlotsToAvailability();
    const hasAvailability = availability.some((day) => day.slots.length > 0);

    if (!hasAvailability) {
      toast.error("Por favor selecciona al menos un horario disponible");
      return;
    }

    setIsLoading(true);
    try {
      await updateAvailability({ businessId: business._id, availability });
      toast.success("Disponibilidad actualizada exitosamente");
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar disponibilidad");
    } finally {
      setIsLoading(false);
    }
  };

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Disponibilidad</h1>
        <p className="text-foreground/60 mt-2">
          Configura tus horarios disponibles para recibir citas
        </p>
      </div>

      {/* Global Actions */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Acciones rápidas:
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setAllDays}
            className="h-8"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            Seleccionar todo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAllDays}
            className="h-8"
          >
            <Square className="h-3 w-3 mr-1" />
            Limpiar todo
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Calendario Semanal</h2>
          <p className="text-sm text-foreground/60">
            Haz clic o arrastra para seleccionar horarios. Usa los botones
            rápidos para configurar períodos comunes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-8 gap-1 text-xs">
              {/* Header row */}
              <div className="p-2 font-medium"></div>
              {DAYS.map((day, dayIndex) => (
                <div
                  key={day}
                  className="p-2 font-medium text-center space-y-1"
                >
                  <button
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className="text-xs font-semibold hover:text-primary transition-colors block w-full"
                  >
                    {day.substring(0, 3)}
                  </button>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-1"
                      onClick={() => setTimeRange(dayIndex, 8, 12)}
                      title="Mañana (8-12)"
                    >
                      <Sun className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-1"
                      onClick={() => setTimeRange(dayIndex, 12, 18)}
                      title="Tarde (12-18)"
                    >
                      <Sunset className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-1"
                      onClick={() => clearDay(dayIndex)}
                      title="Limpiar día"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Morning section */}
              {morningSlots.length > 0 && (
                <>
                  <div className="col-span-8 py-2 border-t border-border">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Sun className="h-3 w-3" />
                      <span>Mañana</span>
                    </div>
                  </div>
                  {morningSlots.map((time) => {
                    const slotIndex = TIME_SLOTS.indexOf(time);
                    return (
                      <div key={time} className="contents">
                        <div className="p-2 text-right font-medium text-muted-foreground text-[10px]">
                          {time}
                        </div>
                        {DAYS.map((_, dayIndex) => (
                          <button
                            key={`${dayIndex}-${slotIndex}`}
                            type="button"
                            onMouseDown={() =>
                              handleSlotMouseDown(dayIndex, slotIndex)
                            }
                            onMouseEnter={() =>
                              handleSlotMouseEnter(dayIndex, slotIndex)
                            }
                            className={cn(
                              "h-6 border rounded transition-all cursor-pointer",
                              selectedSlots[dayIndex]?.[slotIndex]
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                                : "bg-muted hover:bg-muted/70 border-border"
                            )}
                          />
                        ))}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Afternoon section */}
              {afternoonSlots.length > 0 && (
                <>
                  <div className="col-span-8 py-2 border-t border-border">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Sunset className="h-3 w-3" />
                      <span>Tarde</span>
                    </div>
                  </div>
                  {afternoonSlots.map((time) => {
                    const slotIndex = TIME_SLOTS.indexOf(time);
                    return (
                      <div key={time} className="contents">
                        <div className="p-2 text-right font-medium text-muted-foreground text-[10px]">
                          {time}
                        </div>
                        {DAYS.map((_, dayIndex) => (
                          <button
                            key={`${dayIndex}-${slotIndex}`}
                            type="button"
                            onMouseDown={() =>
                              handleSlotMouseDown(dayIndex, slotIndex)
                            }
                            onMouseEnter={() =>
                              handleSlotMouseEnter(dayIndex, slotIndex)
                            }
                            className={cn(
                              "h-6 border rounded transition-all cursor-pointer",
                              selectedSlots[dayIndex]?.[slotIndex]
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                                : "bg-muted hover:bg-muted/70 border-border"
                            )}
                          />
                        ))}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Evening section */}
              {eveningSlots.length > 0 && (
                <>
                  <div className="col-span-8 py-2 border-t border-border">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Moon className="h-3 w-3" />
                      <span>Noche</span>
                    </div>
                  </div>
                  {eveningSlots.map((time) => {
                    const slotIndex = TIME_SLOTS.indexOf(time);
                    return (
                      <div key={time} className="contents">
                        <div className="p-2 text-right font-medium text-muted-foreground text-[10px]">
                          {time}
                        </div>
                        {DAYS.map((_, dayIndex) => (
                          <button
                            key={`${dayIndex}-${slotIndex}`}
                            type="button"
                            onMouseDown={() =>
                              handleSlotMouseDown(dayIndex, slotIndex)
                            }
                            onMouseEnter={() =>
                              handleSlotMouseEnter(dayIndex, slotIndex)
                            }
                            className={cn(
                              "h-6 border rounded transition-all cursor-pointer",
                              selectedSlots[dayIndex]?.[slotIndex]
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                                : "bg-muted hover:bg-muted/70 border-border"
                            )}
                          />
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={isLoading} size="lg">
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
          <Button
            onClick={clearAllDays}
            variant="outline"
            disabled={isLoading}
            size="lg"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar todo
          </Button>
        </div>
      </div>

      {/* Help text */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Consejos de uso
        </h3>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-foreground/60">
          <li>
            <strong>Clic:</strong> Selecciona o deselecciona un horario
            individual
          </li>
          <li>
            <strong>Arrastrar:</strong> Mantén presionado y arrastra para
            seleccionar múltiples horarios consecutivos
          </li>
          <li>
            <strong>Iconos rápidos:</strong> Usa los botones de sol (☀️) para
            mañana/tarde, o el botón de limpiar (↻) para limpiar un día
          </li>
          <li>
            <strong>Día completo:</strong> Haz clic en el nombre del día para
            seleccionar/deseleccionar todo el día
          </li>
          <li>
            Los bloques{" "}
            <span className="inline-block w-3 h-3 bg-primary rounded"></span>{" "}
            indican horarios disponibles
          </li>
        </ul>
      </div>
    </div>
  );
}
