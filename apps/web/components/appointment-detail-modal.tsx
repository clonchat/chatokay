"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Clock,
  Mail,
  Phone,
  User,
  X,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
}

export function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
}: AppointmentDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const confirmAppointment = useMutation(api.appointments.confirmAppointment);
  const cancelAppointment = useMutation(api.appointments.cancelAppointment);

  if (!appointment) return null;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
      time: format(date, "HH:mm", { locale: es }),
    };
  };

  const handleConfirm = async () => {
    if (appointment.status === "confirmed") return;

    setIsLoading(true);
    try {
      await confirmAppointment({ appointmentId: appointment._id });
      toast.success("Cita confirmada correctamente");
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
      await cancelAppointment({ appointmentId: appointment._id });
      toast.success("Cita cancelada correctamente");
      onClose();
    } catch (error) {
      toast.error("Error al cancelar la cita");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const { date, time } = formatDateTime(appointment.appointmentTime);

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
              <p className="mt-1 text-2xl font-bold text-foreground">{time}</p>
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

          {/* Actions */}
          <div className="flex gap-3">
            {appointment.status !== "confirmed" && (
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium h-11"
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Confirmar Cita
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
                Cancelar Cita
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
