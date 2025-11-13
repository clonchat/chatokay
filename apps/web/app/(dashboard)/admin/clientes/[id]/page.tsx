"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { Id } from "@workspace/backend/_generated/dataModel";

function formatMonth(month: string): string {
  const [year, monthNum] = month.split("-");
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as Id<"users">;

  const client = useQuery(api.users.getUserByIdPublic, { userId: clientId });
  const monthlyUsage = useQuery(api.usageTracking.getUserUsageByMonth, {
    userId: clientId,
  });

  if (!client) {
    return (
      <div className="space-y-6">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/clientes")}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {client.name || "Sin nombre"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Detalle de uso del cliente
          </p>
        </div>
      </div>

      {/* Client Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-foreground font-medium">{client.email}</p>
            </div>
            {client.country && (
              <div>
                <p className="text-sm text-muted-foreground">País</p>
                <p className="text-foreground font-medium">{client.country}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Rol</p>
              <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                {client.role}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Usage */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5" />
            Uso Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!monthlyUsage ? (
            <div className="text-muted-foreground py-8 text-center">
              Cargando...
            </div>
          ) : monthlyUsage.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay datos de uso disponibles
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-foreground">Mes</th>
                    <th className="text-right p-3 text-foreground">Requests</th>
                    <th className="text-right p-3 text-foreground">Tokens</th>
                    <th className="text-right p-3 text-foreground">Días Activos</th>
                    <th className="text-right p-3 text-foreground">Costo Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyUsage.map((usage) => (
                    <tr
                      key={usage.month}
                      className="border-b border-border hover:bg-muted transition-colors"
                    >
                      <td className="p-3 font-medium text-foreground capitalize">
                        {formatMonth(usage.month)}
                      </td>
                      <td className="p-3 text-right text-foreground">
                        {usage.requests.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground">
                        {usage.tokens.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-foreground">
                        {usage.daysTracked}
                      </td>
                      <td className="p-3 text-right font-semibold text-green-600 dark:text-green-400">
                        ${usage.cost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

