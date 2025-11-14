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
import { Badge } from "@workspace/ui/components/badge";
import { ArrowLeft, Calendar, CreditCard, DollarSign } from "lucide-react";
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
  const revenue = useQuery(api.subscriptions.getClientRevenue, {
    userId: clientId,
  });
  const subscriptionHistory = useQuery(
    api.subscriptions.getClientSubscriptionHistory,
    { userId: clientId }
  );

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

      {/* Billing Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="h-5 w-5" />
            Facturación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Revenue */}
          <div className="rounded-xl border bg-muted/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Facturado (MRR)</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {revenue?.totalRevenue
                    ? `${revenue.totalRevenue.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}€`
                    : "0,00€"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ingresos recurrentes mensuales
                </p>
              </div>
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Current Subscription Info */}
          {revenue?.currentSubscription && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Suscripción Actual
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Estado</p>
                  {revenue.currentSubscription.status === "active" ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      Activa
                    </Badge>
                  ) : revenue.currentSubscription.status === "past_due" ? (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                      Pago pendiente
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inactiva</Badge>
                  )}
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Plan</p>
                  <p className="text-sm font-medium text-foreground">
                    {revenue.currentSubscription.planType === "annual"
                      ? "Anual"
                      : revenue.currentSubscription.planType === "monthly"
                        ? "Mensual"
                        : "-"}
                  </p>
                </div>
                {revenue.currentSubscription.currentPeriodEnd && (
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      Próxima Renovación
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(
                        revenue.currentSubscription.currentPeriodEnd
                      ).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Ingresos Mensuales
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {revenue.currentSubscription.monthlyRevenue
                      ? `${revenue.currentSubscription.monthlyRevenue.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}€`
                      : "0,00€"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subscription History */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Historial de Suscripciones
            </h3>
            {!subscriptionHistory ? (
              <div className="text-muted-foreground py-4 text-center">
                Cargando...
              </div>
            ) : subscriptionHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No hay historial de suscripciones disponible
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-foreground">
                        Fecha Inicio
                      </th>
                      <th className="text-left p-3 text-foreground">
                        Fecha Fin
                      </th>
                      <th className="text-left p-3 text-foreground">Plan</th>
                      <th className="text-left p-3 text-foreground">Estado</th>
                      <th className="text-right p-3 text-foreground">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionHistory.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-border hover:bg-muted transition-colors"
                      >
                        <td className="p-3 text-sm text-foreground">
                          {new Date(item.startDate).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </td>
                        <td className="p-3 text-sm text-foreground">
                          {item.endDate
                            ? new Date(item.endDate).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "En curso"}
                        </td>
                        <td className="p-3 text-sm text-foreground">
                          {item.planType === "annual" ? "Anual" : "Mensual"}
                        </td>
                        <td className="p-3">
                          {item.status === "active" ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              Activa
                            </Badge>
                          ) : item.status === "past_due" ? (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                              Pago pendiente
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactiva</Badge>
                          )}
                        </td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          {item.amount
                            ? `${item.amount.toLocaleString("es-ES", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}€`
                            : "0,00€"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

