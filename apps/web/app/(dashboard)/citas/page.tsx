"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import esLocale from "@fullcalendar/core/locales/es";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { businessAtom } from "@/lib/store/auth-atoms";
import { AppointmentsSidebar } from "@/components/appointments-sidebar";
import { AppointmentDetailModal } from "@/components/appointment-detail-modal";
import { Card, CardContent } from "@workspace/ui/components/card";

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

export default function CitasPage() {
  const business = useAtomValue(businessAtom);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);

  // Get all appointments for the calendar
  const allAppointments = useQuery(
    api.appointments.getBusinessAppointments,
    business ? { businessId: business._id } : "skip"
  );

  // Get upcoming appointments for sidebar
  const upcomingAppointments = useQuery(
    api.appointments.getUpcomingAppointments,
    business ? { businessId: business._id, limit: 10 } : "skip"
  );

  // Prepare events for FullCalendar
  const calendarEvents = useMemo(() => {
    if (!allAppointments) return [];

    return allAppointments
      .filter((apt: any) => apt.status !== "cancelled")
      .map((apt: any) => {
        const getStatusColor = () => {
          if (apt.status === "confirmed") return "#10b981"; // green
          if (apt.status === "pending") return "#3b82f6"; // blue
          return "#6b7280"; // gray
        };

        // Check if appointment is in progress
        const now = new Date();
        const aptStart = new Date(apt.appointmentTime);
        const businessInfo = business?.appointmentConfig?.services?.find(
          (s) => s.name === apt.serviceName
        );
        const duration = businessInfo?.duration || 60;
        const aptEnd = new Date(aptStart.getTime() + duration * 60000);
        const isInProgress = now >= aptStart && now <= aptEnd;

        return {
          id: apt._id,
          title: `${apt.customerData?.name || "Cliente"} - ${
            apt.serviceName || "Servicio"
          }`,
          start: apt.appointmentTime,
          end: new Date(aptStart.getTime() + duration * 60000).toISOString(),
          backgroundColor: isInProgress ? "#f97316" : getStatusColor(),
          borderColor: isInProgress ? "#ea580c" : getStatusColor(),
          extendedProps: {
            status: apt.status,
            isInProgress,
          },
        };
      });
  }, [allAppointments, business]);

  // Find selected appointment details
  const selectedAppointment = useMemo(() => {
    if (!selectedAppointmentId || !allAppointments) return null;
    const apt = allAppointments.find(
      (apt: any) => apt._id === selectedAppointmentId
    );
    if (!apt) return null;
    return {
      _id: apt._id,
      customerName: apt.customerData.name,
      customerEmail: apt.customerData.email,
      customerPhone: apt.customerData.phone,
      appointmentTime: apt.appointmentTime,
      serviceName: apt.serviceName,
      status: apt.status,
      notes: apt.notes,
    } as Appointment;
  }, [selectedAppointmentId, allAppointments]);

  const handleAppointmentClick = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
  };

  const handleEventClick = (info: any) => {
    setSelectedAppointmentId(info.event.id);
  };

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground/60">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Calendario de Citas
        </h1>
        <p className="text-foreground/60 mt-2">
          Gestiona todas tus citas desde aquí
        </p>
      </div>

      {/* Main content: Calendar + Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full min-h-0">
        {/* Calendar - 80% width */}
        <div className="flex-[4] min-w-0 h-full min-h-[600px]">
          <Card className="bg-card border-border h-full">
            <CardContent className="h-full p-6">
              <div className="h-full">
                <FullCalendar
                  plugins={[dayGridPlugin]}
                  initialView="dayGridMonth"
                  events={calendarEvents}
                  eventClick={handleEventClick}
                  height="100%"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth",
                  }}
                  locale={esLocale}
                  firstDay={1} // Monday
                  eventTimeFormat={{
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }}
                  dayMaxEvents={3}
                  moreLinkClick="popover"
                  eventDisplay="block"
                  eventBackgroundColor="inherit"
                  eventBorderColor="inherit"
                  displayEventTime={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 20% width */}
        <div className="flex-1 w-full lg:w-auto min-w-[300px] max-w-full lg:max-w-[400px] h-full">
          <AppointmentsSidebar
            businessId={business._id}
            onAppointmentClick={handleAppointmentClick}
          />
        </div>
      </div>

      {/* Modal */}
      <AppointmentDetailModal
        appointment={selectedAppointment}
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointmentId(null)}
      />
    </div>
  );
}
