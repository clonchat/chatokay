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
import { ArrowLeft, Users, Mail, MapPin, Briefcase } from "lucide-react";
import { Id } from "@workspace/backend/_generated/dataModel";

export default function SalesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const salesId = params.id as Id<"users">;

  const salesUser = useQuery(api.users.getUserByIdPublic, { userId: salesId });
  const referredClients = useQuery(api.users.getReferredClientsBySalesId, {
    salesUserId: salesId,
  });

  if (!salesUser) {
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
          onClick={() => router.push("/admin/comerciales")}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {salesUser.name || "Sin nombre"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Detalle del comercial
          </p>
        </div>
      </div>

      {/* Sales User Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Información del Comercial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground font-medium">{salesUser.email}</p>
              </div>
            </div>
            {salesUser.country && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">País</p>
                  <p className="text-foreground font-medium">{salesUser.country}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rol</p>
                <span className="inline-block rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  {salesUser.role}
                </span>
              </div>
            </div>
            {salesUser.referralCode && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Código de Referido</p>
                  <p className="text-foreground font-medium font-mono">
                    {salesUser.referralCode}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referred Clients */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5" />
            Clientes Referidos ({referredClients?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!referredClients ? (
            <div className="text-muted-foreground py-8 text-center">
              Cargando...
            </div>
          ) : referredClients.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Este comercial no tiene clientes referidos aún
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-foreground">Nombre</th>
                    <th className="text-left p-3 text-foreground">Email</th>
                    <th className="text-left p-3 text-foreground">País</th>
                  </tr>
                </thead>
                <tbody>
                  {referredClients.map((client) => (
                    <tr
                      key={client._id}
                      className="border-b border-border hover:bg-muted transition-colors"
                    >
                      <td className="p-3 font-medium text-foreground">
                        {client.name || "Sin nombre"}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {client.email}
                      </td>
                      <td className="p-3">
                        {client.country ? (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {client.country}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
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

