"use client";

import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogClose,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useAction, useQuery } from "convex/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  CalendarClock,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Id } from "@workspace/backend/_generated/dataModel";

interface Appointment {
  _id: Id<"appointments">;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  appointmentTime: string;
  serviceName: string;
  status: "pending" | "confirmed" | "cancelled";
  notes?: string;
  isInProgress?: boolean;
  duration?: number;
  endTime?: string;
}

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  businessId?: Id<"businesses">;
}

export function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
  businessId,
}: AppointmentDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [ownerNote, setOwnerNote] = useState("");
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const confirmAppointment = useAction(api.appointments.confirmAppointment);
  const cancelAppointment = useAction(api.appointments.cancelAppointment);
  const rescheduleAppointment = useAction(
    api.appointments.rescheduleAppointment
  );

  // Get available slots for selected date
  const availableSlots = useQuery(
    api.appointments.getAvailableSlots,
    selectedDate && businessId ? { businessId, date: selectedDate } : "skip"
  );

  // Reset states when appointment changes or modal opens/closes
  useEffect(() => {
    if (isOpen && appointment) {
      setOwnerNote("");
      setIsRescheduleMode(false);
      setSelectedDate("");
      setSelectedTime("");
    }
  }, [isOpen, appointment]);

  if (!appointment) return null;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
      time: format(date, "HH:mm", { locale: es }),
    };
  };

  const calculateEndTime = (startTime: string, durationMinutes?: number) => {
    if (!durationMinutes) return null;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return format(end, "HH:mm", { locale: es });
  };

  const handleConfirm = async () => {
    if (appointment.status === "confirmed") return;

    setIsLoading(true);
    try {
      await confirmAppointment({
        appointmentId: appointment._id,
        ownerNote: ownerNote.trim() || undefined,
      });
      toast.success("Cita confirmada y cliente notificado por correo");
      onClose();
    } catch (error) {
      toast.error("Error al confirmar la cita");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (appointment.status === "cancelled") return;

    setIsLoading(true);
    try {
      await cancelAppointment({
        appointmentId: appointment._id,
        ownerNote: ownerNote.trim() || undefined,
      });
      toast.success("Cita cancelada y cliente notificado por correo");
      onClose();
    } catch (error) {
      toast.error("Error al cancelar la cita");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Por favor selecciona una fecha y hora");
      return;
    }

    setIsLoading(true);
    try {
      const newAppointmentTime = `${selectedDate}T${selectedTime}`;
      await rescheduleAppointment({
        appointmentId: appointment._id,
        newAppointmentTime,
        ownerNote: ownerNote.trim() || undefined,
      });
      toast.success("Cita reprogramada y cliente notificado por correo");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al reprogramar la cita"
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const { date, time } = formatDateTime(appointment.appointmentTime);
  const endTime = calculateEndTime(
    appointment.appointmentTime,
    appointment.duration
  );

  const getStatusColor = () => {
    switch (appointment.status) {
      case "confirmed":
        return "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 dark:bg-green-500/20";
      case "cancelled":
        return "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400 dark:bg-gray-500/20";
      default:
        return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 dark:bg-blue-500/20";
    }
  };

  const getStatusText = () => {
    switch (appointment.status) {
      case "confirmed":
        return "Confirmada";
      case "cancelled":
        return "Cancelada";
      default:
        return "Pendiente";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogClose onClick={onClose} />
        <div className="flex flex-col gap-1 pb-4">
          <div className="flex gap-2">
            <h1 className="text-2xl font-bold">Detalles de la Cita</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor()}`}
            >
              {getStatusText()}
            </span>
          </div>
          <DialogDescription>
            Información completa de la cita programada
          </DialogDescription>
        </div>

        <div className="space-y-6">
          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
              <Calendar className="h-4 w-4" />
              Fecha y Hora
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-foreground/70">{date}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {time}
                {endTime && (
                  <span className="text-foreground/60"> - {endTime}</span>
                )}
              </p>
              {appointment.duration && (
                <div className="mt-3 flex items-center gap-2 text-xs text-foreground/60">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Duración: {appointment.duration} minutos</span>
                </div>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* Customer Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
              <User className="h-4 w-4" />
              Cliente
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <p className="text-lg font-semibold text-foreground">
                {appointment.customerName}
              </p>
              <div className="space-y-2">
                {appointment.customerEmail && (
                  <div className="flex items-center gap-2.5 text-sm text-foreground/70">
                    <Mail className="h-4 w-4 text-foreground/50" />
                    <a
                      href={`mailto:${appointment.customerEmail}`}
                      className="hover:text-foreground hover:underline transition-colors"
                    >
                      {appointment.customerEmail}
                    </a>
                  </div>
                )}
                {appointment.customerPhone && (
                  <div className="flex items-center gap-2.5 text-sm text-foreground/70">
                    <Phone className="h-4 w-4 text-foreground/50" />
                    <a
                      href={`tel:${appointment.customerPhone}`}
                      className="hover:text-foreground hover:underline transition-colors"
                    >
                      {appointment.customerPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Service */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
              <CheckCircle className="h-4 w-4" />
              Servicio
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-base font-medium text-foreground">
                {appointment.serviceName}
              </p>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <>
              <hr className="border-border" />
              <div className="space-y-3">
                <span className="text-sm font-semibold text-foreground/70">
                  Notas
                </span>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {appointment.notes}
                  </p>
                </div>
              </div>
            </>
          )}

          <hr className="border-border" />

          {/* Owner Note */}
          <div className="space-y-3">
            <Label
              htmlFor="ownerNote"
              className="text-sm font-semibold text-foreground/70"
            >
              Nota para el cliente (opcional)
            </Label>
            <Textarea
              id="ownerNote"
              placeholder="Añade una nota que se enviará al cliente por correo..."
              value={ownerNote}
              onChange={(e) => setOwnerNote(e.target.value)}
              rows={3}
              disabled={isLoading}
              className="resize-none"
            />
          </div>

          {/* Reschedule Section */}
          {isRescheduleMode && appointment.status !== "cancelled" && (
            <>
              <hr className="border-border" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
                  <CalendarClock className="h-4 w-4" />
                  Reprogramar Cita
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="newDate" className="text-sm">
                      Nueva Fecha
                    </Label>
                    <input
                      id="newDate"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      disabled={isLoading}
                    />
                  </div>

                  {selectedDate &&
                    availableSlots &&
                    availableSlots.length > 0 && (
                      <div>
                        <Label className="text-sm">Horarios Disponibles</Label>
                        <div className="mt-2 grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {availableSlots
                            .filter(
                              (slot: { isBooked: boolean }) => !slot.isBooked
                            )
                            .map((slot: { start: string; end: string }) => (
                              <Button
                                key={slot.start}
                                type="button"
                                variant={
                                  selectedTime === slot.start
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setSelectedTime(slot.start)}
                                disabled={isLoading}
                                className="text-xs"
                              >
                                {slot.start}
                              </Button>
                            ))}
                        </div>
                      </div>
                    )}

                  {selectedDate &&
                    availableSlots &&
                    availableSlots.filter(
                      (slot: { isBooked: boolean }) => !slot.isBooked
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No hay horarios disponibles para esta fecha
                      </p>
                    )}
                </div>
              </div>
            </>
          )}

          <hr className="border-border" />

          {/* Actions */}
          <div className="space-y-3">
            {isRescheduleMode ? (
              <>
                <Button
                  onClick={handleReschedule}
                  disabled={isLoading || !selectedDate || !selectedTime}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium h-11"
                  size="lg"
                >
                  <CalendarClock className="mr-2 h-5 w-5" />
                  {isLoading ? "Reprogramando..." : "Confirmar Reprogramación"}
                </Button>
                <Button
                  onClick={() => setIsRescheduleMode(false)}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Cancelar Reprogramación
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-3">
                  {appointment.status !== "confirmed" && (
                    <Button
                      onClick={handleConfirm}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium h-11"
                      size="lg"
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      {isLoading ? "Confirmando..." : "Confirmar"}
                    </Button>
                  )}
                  {appointment.status !== "cancelled" && (
                    <Button
                      onClick={handleCancel}
                      disabled={isLoading}
                      variant="outline"
                      className="flex-1 border-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground font-medium h-11"
                      size="lg"
                    >
                      <X className="mr-2 h-5 w-5" />
                      {isLoading ? "Cancelando..." : "Cancelar"}
                    </Button>
                  )}
                </div>
                {appointment.status !== "cancelled" && (
                  <Button
                    onClick={() => setIsRescheduleMode(true)}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full border-2 font-medium h-11"
                    size="lg"
                  >
                    <CalendarClock className="mr-2 h-5 w-5" />
                    Reprogramar Cita
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
