"use client";

import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useQuery } from "convex/react";
import { Menu } from "lucide-react";
import { useParams } from "next/navigation";
import { useSidebar } from "../layout";

interface Service {
  id: string;
  name: string;
  duration: number;
  price?: number;
}

export default function ServiciosPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const { toggleSidebar, business: layoutBusiness } = useSidebar();

  // Get business from layout or query it directly
  const businessFromQuery = useQuery(
    api.businesses.getBySubdomain,
    layoutBusiness ? "skip" : subdomain ? { subdomain } : "skip"
  );

  const business = layoutBusiness || businessFromQuery;
  // Loading: no layout business AND query is still undefined
  const loading = !layoutBusiness && businessFromQuery === undefined;
  // Error: query finished but returned null (business not found)
  const error =
    businessFromQuery === null && !loading ? "Negocio no encontrado" : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md px-4">
          <h1 className="text-2xl font-bold text-foreground">
            Error al cargar servicios
          </h1>
          <p className="text-muted-foreground">
            {error || "No se pudo cargar la información"}
          </p>
        </div>
      </div>
    );
  }

  const services = business.services || [];

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
                Nuestros Servicios
              </h1>
              {business.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {business.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {services.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No hay servicios disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Actualmente no tenemos servicios disponibles. Por favor,
                  consulta con nosotros para más información.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {services.map((service) => (
                <Card key={service.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{service.name}</CardTitle>
                      {service.price && (
                        <Badge variant="default">
                          ${service.price.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      <Badge variant="outline" className="mt-2">
                        Duración: {service.duration} minutos
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
