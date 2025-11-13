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
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const userStats = useQuery(api.users.getUserStats);
  const usageStats = useQuery(api.usageTracking.getAllUsageStats, {});

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

      {/* Usage Statistics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5" />
              Uso del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
              <div className="flex items-center justify-between pt-2 border-t border-border">
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

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Acciones Rápidas</CardTitle>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
