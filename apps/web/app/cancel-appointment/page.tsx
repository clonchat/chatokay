"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function CancelAppointmentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get appointment details
  const appointmentData = useQuery(
    api.appointments.getAppointmentByToken,
    token ? { cancellationToken: token } : "skip"
  );

  const cancelAppointment = useAction(
    api.appointments.cancelAppointmentByToken
  );

  const handleCancel = async () => {
    if (!token) return;

    try {
      setCancelling(true);
      setError(null);
      await cancelAppointment({ cancellationToken: token });
      setCancelled(true);
    } catch (err: any) {
      setError(err.message || "Error al cancelar la cita");
    } finally {
      setCancelling(false);
    }
  };

  // Invalid token
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2">Token inválido</h1>
            <p className="text-muted-foreground mb-6">
              El enlace de cancelación no es válido o ha expirado.
            </p>
            <Link href="/">
              <Button>Volver al inicio</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Loading appointment
  if (appointmentData === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-muted-foreground">Cargando información...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Appointment not found
  if (!appointmentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold mb-2">Cita no encontrada</h1>
            <p className="text-muted-foreground mb-6">
              No se encontró ninguna cita con este token.
            </p>
            <Link href="/">
              <Button>Volver al inicio</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { appointment, business } = appointmentData;

  // Already cancelled
  if (appointment.status === "cancelled") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold mb-2">Cita ya cancelada</h1>
            <p className="text-muted-foreground mb-6">
              Esta cita ya ha sido cancelada anteriormente.
            </p>
            {business && (
              <Link href={`https://${business.subdomain}.chatokay.com`}>
                <Button>Volver a {business.name}</Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Successfully cancelled
  if (cancelled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold mb-2">Cita cancelada</h1>
            <p className="text-muted-foreground mb-6">
              Tu cita ha sido cancelada exitosamente. Recibirás un correo de
              confirmación.
            </p>
            {business && (
              <Link href={`https://${business.subdomain}.chatokay.com`}>
                <Button>Programar nueva cita</Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Format appointment date
  const appointmentDate = new Date(appointment.appointmentTime);
  const formattedDate = format(appointmentDate, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });
  const formattedTime = format(appointmentDate, "HH:mm", { locale: es });

  // Confirm cancellation
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Cancelar cita</h1>
          <p className="text-muted-foreground">
            ¿Estás seguro de que deseas cancelar esta cita?
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4 mb-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Negocio</p>
              <p className="font-semibold">{business?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Servicio</p>
              <p className="font-semibold">{appointment.serviceName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-semibold capitalize">{formattedDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hora</p>
              <p className="font-semibold">{formattedTime}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-semibold">{appointment.customerData.name}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          {business && (
            <Link
              href={`https://${business.subdomain}.chatokay.com`}
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                No cancelar
              </Button>
            </Link>
          )}
          <Button
            onClick={handleCancel}
            disabled={cancelling}
            variant="destructive"
            className="flex-1"
          >
            {cancelling ? "Cancelando..." : "Sí, cancelar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function CancelAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-muted-foreground">Cargando información...</p>
            </div>
          </Card>
        </div>
      }
    >
      <CancelAppointmentContent />
    </Suspense>
  );
}
