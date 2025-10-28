"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Bell } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AppointmentDetailModal } from "./appointment-detail-modal";

interface NotificationsDropdownProps {
  businessId: Id<"businesses">;
}

export function NotificationsDropdown({
  businessId,
}: NotificationsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] =
    useState<Id<"appointments"> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get pending appointments
  const pendingAppointments = useQuery(
    api.appointments.getPendingAppointments,
    { businessId, limit: 5 }
  );

  // Get all appointments to get full details when clicking
  const allAppointments = useQuery(api.appointments.getBusinessAppointments, {
    businessId,
  });

  const pendingCount = pendingAppointments?.length || 0;

  // Trigger animation when new appointments arrive
  useEffect(() => {
    if (pendingCount > previousCount) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 1000);
    }
    setPreviousCount(pendingCount);
  }, [pendingCount]);

  const handleAppointmentClick = (appointmentId: Id<"appointments">) => {
    setIsOpen(false);
    setSelectedAppointmentId(appointmentId);
    setIsModalOpen(true);
  };

  // Get the selected appointment details
  const selectedAppointment = allAppointments?.find(
    (apt) => apt._id === selectedAppointmentId
  );

  // Convert to format expected by modal
  const modalAppointment = selectedAppointment
    ? {
        _id: selectedAppointment._id,
        customerName: selectedAppointment.customerData.name,
        customerEmail: selectedAppointment.customerData.email,
        customerPhone: selectedAppointment.customerData.phone,
        appointmentTime: selectedAppointment.appointmentTime,
        serviceName: selectedAppointment.serviceName,
        status: selectedAppointment.status,
        notes: selectedAppointment.notes,
      }
    : null;

  const formatAppointmentTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd MMM, HH:mm", { locale: es });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className={`h-5 w-5 ${animate ? "animate-bounce" : ""}`} />
        {pendingCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ${
              animate ? "animate-pulse" : ""
            }`}
          >
            {pendingCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown content */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
            <div className="border-b border-border p-3">
              <h3 className="font-semibold text-foreground">
                Citas Pendientes
              </h3>
              <p className="text-xs text-muted-foreground">
                {pendingCount === 0
                  ? "No hay citas pendientes"
                  : `${pendingCount} ${pendingCount === 1 ? "cita pendiente" : "citas pendientes"}`}
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {pendingAppointments && pendingAppointments.length > 0 ? (
                <ul className="divide-y divide-border">
                  {pendingAppointments.map((appointment) => (
                    <li
                      key={appointment._id}
                      className="cursor-pointer p-3 transition-colors hover:bg-muted"
                      onClick={() => handleAppointmentClick(appointment._id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {appointment.customerName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {appointment.serviceName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatAppointmentTime(appointment.appointmentTime)}
                          </p>
                        </div>
                        <div className="ml-2">
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                            Pendiente
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No hay citas pendientes
                  </p>
                </div>
              )}
            </div>

            {pendingCount > 0 && (
              <div className="border-t border-border p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/citas");
                  }}
                >
                  Ver todas las citas
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        appointment={modalAppointment}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAppointmentId(null);
        }}
        businessId={businessId}
      />
    </div>
  );
}
