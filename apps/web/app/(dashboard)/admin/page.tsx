"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Users,
  User,
  Briefcase,
  Shield,
  BarChart3,
  MessageSquare,
  Zap,
  DollarSign,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { SubscriptionsChart } from "@/components/dashboard/subscriptions-chart";
import { PlanDistributionChart } from "@/components/dashboard/plan-distribution-chart";

export default function AdminDashboardPage() {
  const userStats = useQuery(api.users.getUserStats);
  const usageStats = useQuery(api.usageTracking.getAllUsageStats, {});
  const revenue = useQuery(api.subscriptions.getTotalPlatformRevenue);
  const revenueByMonth = useQuery(api.subscriptions.getRevenueByMonth, {
    months: 12,
  });
  const subscriptionStats = useQuery(api.subscriptions.getSubscriptionStats);
  const planDistribution = useQuery(api.subscriptions.getRevenueByPlanType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Panel de Administración
        </h1>
        <p className="text-muted-foreground mt-2">Vista general del sistema</p>
      </div>

      {/* User Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Total Usuarios
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {userStats?.total ?? "..."}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Clientes
            </CardTitle>
            <User className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {userStats?.clients ?? "..."}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Comerciales
            </CardTitle>
            <Briefcase className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {userStats?.sales ?? "..."}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Admins
            </CardTitle>
            <Shield className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {userStats?.admins ?? "..."}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Ingresos Mensuales (MRR)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {revenue?.totalMRR
                ? `${revenue.totalMRR.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}€`
                : "0,00€"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recurrentes mensuales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Ingresos Anuales (ARR)
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {revenue?.annualARR
                ? `${revenue.annualARR.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}€`
                : "0,00€"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Proyectados anuales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Suscripciones Activas
            </CardTitle>
            <CreditCard className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {revenue?.activeSubscriptions ?? "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {subscriptionStats?.active ?? 0} activas,{" "}
              {subscriptionStats?.trial ?? 0} en prueba
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Planes Mensuales
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {revenue?.monthlySubscriptions ?? "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {revenue?.annualSubscriptions ?? 0} anuales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {revenueByMonth && (
          <RevenueChart
            data={revenueByMonth}
            title="Ingresos por Mes"
            description="Últimos 12 meses"
          />
        )}
        {revenueByMonth && (
          <SubscriptionsChart
            data={revenueByMonth}
            title="Evolución de Suscripciones"
            description="Suscripciones activas por mes"
          />
        )}
      </div>

      {planDistribution && (
        <div className="grid gap-6 md:grid-cols-2">
          <PlanDistributionChart
            monthlyCount={planDistribution.monthly.count}
            annualCount={planDistribution.annual.count}
            title="Distribución por Plan"
            description="Suscripciones mensuales vs anuales"
          />
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link
                  href="/admin/clientes"
                  className="block rounded-lg border border-border p-4 hover:bg-muted transition-colors"
                >
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Ver Clientes
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Gestionar clientes y ver estadísticas
                  </div>
                </Link>
                <Link
                  href="/admin/comerciales"
                  className="block rounded-lg border border-border p-4 hover:bg-muted transition-colors"
                >
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Ver Comerciales
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Gestionar equipo de ventas
                  </div>
                </Link>
                <Link
                  href="/admin/suscripciones"
                  className="block rounded-lg border border-border p-4 hover:bg-muted transition-colors"
                >
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Ver Suscripciones
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Gestionar todas las suscripciones
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Statistics */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BarChart3 className="h-5 w-5" />
            Uso del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Total Requests
              </span>
              <span className="text-lg font-bold text-foreground">
                {usageStats?.totalRequests?.toLocaleString() ?? "..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Total Tokens
              </span>
              <span className="text-lg font-bold text-foreground">
                {usageStats?.totalTokens?.toLocaleString() ?? "..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Usuarios Únicos
              </span>
              <span className="text-lg font-bold text-foreground">
                {usageStats?.uniqueUsers ?? "..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Costo Total Estimado
              </span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ${usageStats?.totalCost?.toFixed(4) ?? "0.0000"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
