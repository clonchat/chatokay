"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Briefcase, Users, Plus, Info, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function AdminSalesPage() {
  const router = useRouter();
  const salesUsers = useQuery(api.users.getSalesUsersWithClientCount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Equipo Comercial
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión del equipo de ventas
          </p>
        </div>
        <Button asChild>
          <Link
            href="/internal/sign-up"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Invitar Comercial
          </Link>
        </Button>
      </div>

      {/* Sales Team List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Briefcase className="h-5 w-5" />
            Comerciales Activos ({salesUsers?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!salesUsers ? (
            <div className="text-muted-foreground">Cargando...</div>
          ) : salesUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Users className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No hay comerciales registrados
              </h3>
              <p className="text-muted-foreground mb-4">
                Invita a tu equipo de ventas para comenzar
              </p>
              <Button asChild>
                <Link
                  href="/internal/sign-up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Invitar Comercial
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-foreground">Nombre</th>
                    <th className="text-left p-3 text-foreground">Email</th>
                    <th className="text-left p-3 text-foreground">País</th>
                    <th className="text-center p-3 text-foreground">Clientes</th>
                    <th className="text-left p-3 text-foreground">Estado</th>
                    <th className="text-left p-3 text-foreground">Rol</th>
                    <th className="text-right p-3 text-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {salesUsers.map((salesUser) => (
                    <tr
                      key={salesUser._id}
                      className="border-b border-border hover:bg-muted transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              {salesUser.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {salesUser.name || "Sin nombre"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {salesUser.email}
                      </td>
                      <td className="p-3">
                        {salesUser.country ? (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {salesUser.country}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-semibold text-foreground">
                          {salesUser.clientCount || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                          Activo
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {salesUser.role}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/comerciales/${salesUser._id}`)}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Info className="h-5 w-5" />
            Información
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Roles disponibles:</strong> Los
              nuevos comerciales se registran automáticamente con rol "sales" a
              través del portal interno.
            </p>
            <p>
              <strong className="text-foreground">Cambio a Admin:</strong> Para
              cambiar un usuario a rol "admin", actualiza manualmente el rol en la
              base de datos.
            </p>
            <p>
              <strong className="text-foreground">Acceso:</strong> Los comerciales
              pueden acceder al panel de ventas en /comercial. Los admins tienen
              acceso a todos los paneles.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

