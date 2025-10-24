"use client";

import { useState, useMemo, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { businessAtom } from "@/lib/store/auth-atoms";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import toast from "react-hot-toast";

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

  const toggleSlot = (dayIndex: number, slotIndex: number) => {
    const newSlots = selectedSlots.map((day, dIdx) =>
      dIdx === dayIndex
        ? day.map((slot, sIdx) => (sIdx === slotIndex ? !slot : slot))
        : day
    );
    setSelectedSlots(newSlots);
  };

  const toggleDay = (dayIndex: number) => {
    const allSelected = selectedSlots[dayIndex]?.every((slot) => slot);
    const newSlots = selectedSlots.map((day, dIdx) =>
      dIdx === dayIndex ? day.map(() => !allSelected) : day
    );
    setSelectedSlots(newSlots);
  };

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

      {/* Calendar */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Calendario Semanal</h2>
          <p className="text-sm text-foreground/60">
            Haz clic en los bloques para marcar tu disponibilidad
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-8 gap-1 text-xs">
              {/* Header row */}
              <div className="p-2 font-medium"></div>
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="p-2 font-medium text-center">
                  <button
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className="text-xs underline hover:text-primary"
                  >
                    {day}
                  </button>
                </div>
              ))}

              {/* Time slots */}
              {TIME_SLOTS.map((time, slotIndex) => (
                <div key={time} className="contents">
                  <div className="p-2 text-right font-medium text-muted-foreground">
                    {time}
                  </div>
                  {DAYS.map((_, dayIndex) => (
                    <button
                      key={`${dayIndex}-${slotIndex}`}
                      type="button"
                      onClick={() => toggleSlot(dayIndex, slotIndex)}
                      className={cn(
                        "p-2 h-8 border rounded transition-colors",
                        selectedSlots[dayIndex]?.[slotIndex]
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted hover:bg-muted/70"
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {/* Help text */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2">💡 Consejos</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/60">
          <li>
            Haz clic en los bloques de tiempo para marcar tu disponibilidad
          </li>
          <li>
            Haz clic en el nombre del día para seleccionar/deseleccionar todo el
            día
          </li>
          <li>Los bloques azules indican horarios disponibles</li>
          <li>
            Los clientes solo podrán reservar citas en los horarios marcados
          </li>
        </ul>
      </div>
    </div>
  );
}
