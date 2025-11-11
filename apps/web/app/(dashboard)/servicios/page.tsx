"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { businessAtom } from "@/lib/store/auth-atoms";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import toast from "react-hot-toast";

export default function ServiciosPage() {
  const business = useAtomValue(businessAtom);
  const updateServices = useMutation(api.businesses.updateServices);

  const [services, setServices] = useState(
    business?.appointmentConfig?.services || []
  );
  const [isLoading, setIsLoading] = useState(false);

  const addService = () => {
    setServices([
      ...services,
      {
        id: crypto.randomUUID(),
        name: "",
        duration: 30,
        price: 0,
        maxPeople: 1,
      },
    ]);
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const updateService = (id: string, field: string, value: any) => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    if (!business) return;

    const validServices = services.filter((s) => s.name.trim() !== "");
    if (validServices.length === 0) {
      toast.error("Por favor añade al menos un servicio");
      return;
    }

    setIsLoading(true);
    try {
      await updateServices({
        businessId: business._id,
        services: validServices,
      });
      toast.success("Servicios actualizados exitosamente");
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar servicios");
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
        <h1 className="text-3xl font-bold text-foreground">Servicios</h1>
        <p className="text-foreground/60 mt-2">
          Gestiona los servicios que ofreces a tus clientes
        </p>
      </div>

      {/* Services table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Lista de Servicios</CardTitle>
          <CardDescription className="text-foreground/60">
            Configura los servicios disponibles para reservar citas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">
                    Nombre del Servicio
                  </th>
                  <th className="text-left p-2 font-medium w-32">
                    Duración (min)
                  </th>
                  <th className="text-left p-2 font-medium w-32">Precio</th>
                  <th className="text-left p-2 font-medium w-32">
                    Número de personas
                  </th>
                  <th className="text-left p-2 font-medium w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center p-4 text-muted-foreground"
                    >
                      No hay servicios. Haz clic en "+ Añadir Servicio" para
                      empezar.
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Input
                          placeholder="Nombre del servicio"
                          value={service.name}
                          onChange={(e) =>
                            updateService(service.id, "name", e.target.value)
                          }
                          className="h-9"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={service.duration}
                          onChange={(e) =>
                            updateService(
                              service.id,
                              "duration",
                              parseInt(e.target.value) || 30
                            )
                          }
                          className="h-9"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={service.price || ""}
                          placeholder="Opcional"
                          onChange={(e) =>
                            updateService(
                              service.id,
                              "price",
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          className="h-9"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={service.maxPeople ?? 1}
                          onChange={(e) =>
                            updateService(
                              service.id,
                              "maxPeople",
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="h-9"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(service.id)}
                          className="h-9 w-9 p-0"
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={addService}>
              + Añadir Servicio
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help text */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Consejos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-foreground/60">
            <li>
              Los servicios aparecerán en el chatbot para que los clientes
              puedan seleccionarlos
            </li>
            <li>
              La duración se usa para calcular automáticamente los horarios
              disponibles
            </li>
            <li>El precio es opcional y se mostrará a los clientes</li>
            <li>
              El número de personas permite servicios grupales (ej: clases de
              spinning con capacidad para 10 personas)
            </li>
            <li>Puedes editar o eliminar servicios en cualquier momento</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
