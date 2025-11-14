"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { ClipboardList, BarChart3, MessageSquare, User as UserIcon } from "lucide-react";
import { ClientContactModal } from "@/components/client-contact-modal";
import { Id } from "@workspace/backend/_generated/dataModel";

export default function ComercialClientsPage() {
  const referredClients = useQuery(api.users.getMyReferredClients);
  // Backend already filters to show only referred clients for sales users
  const topConsumers = useQuery(api.usageTracking.getTopConsumers, {
    limit: 5,
  });

  const [contactModalUserId, setContactModalUserId] = useState<Id<"users"> | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Clientes
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Vista de clientes registrados
        </p>
      </div>

      {/* Top Active Clients */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Clientes Más Activos</CardTitle>
        </CardHeader>
        <CardContent>
          {!topConsumers ? (
            <div>Cargando...</div>
          ) : topConsumers.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              No hay datos de actividad disponibles para tus clientes referidos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Cliente</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">País</th>
                    <th className="text-right p-3">Requests</th>
                    <th className="text-right p-3">Tokens</th>
                    <th className="text-right p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {topConsumers.map((consumer, index) => (
                    <tr
                      key={consumer.userId}
                      className="border-b hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <td className="p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {index + 1}
                        </div>
                      </td>
                      <td className="p-3 font-medium">
                        {consumer.user?.name || "Sin nombre"}
                      </td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                        {consumer.user?.email}
                      </td>
                      <td className="p-3">
                        {consumer.user?.country ? (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {consumer.user.country}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-sm">
                        {consumer.totalRequests.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {consumer.totalTokens.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContactModalUserId(consumer.userId as Id<"users">)}
                            className="h-8"
                          >
                            <UserIcon className="h-4 w-4 mr-1" />
                            Contacto
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Referred Clients */}
      <Card>
        <CardHeader>
          <CardTitle>
            Mis Clientes Referidos ({referredClients?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!referredClients ? (
            <div>Cargando...</div>
          ) : referredClients.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <p className="mb-2">No tienes clientes referidos aún.</p>
              <p className="text-sm">
                Comparte tu enlace de referido para comenzar a ganar clientes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search and filters could go here */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Cliente</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">País</th>
                      <th className="text-right p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referredClients.map((client) => (
                      <tr
                        key={client._id}
                        className="border-b hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {client.name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase() || "?"}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">
                                {client.name || "Sin nombre"}
                              </div>
                              <div className="text-xs text-slate-500">
                                ID: {client._id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                          {client.email}
                        </td>
                        <td className="p-3">
                          {client.country ? (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {client.country}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No especificado
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setContactModalUserId(client._id)}
                              className="h-8"
                            >
                              <UserIcon className="h-4 w-4 mr-1" />
                              Contacto
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Funcionalidades</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <ClipboardList className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>Asignación de clientes específicos a comerciales</span>
            </li>
            <li className="flex items-start gap-2">
              <BarChart3 className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>Reportes detallados de actividad por cliente</span>
            </li>
            <li className="flex items-start gap-2">
              <MessageSquare className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>Comunicación directa con clientes</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Contact Modal */}
      {contactModalUserId && (
        <ClientContactModal
          userId={contactModalUserId}
          userName={
            referredClients?.find((c) => c._id === contactModalUserId)?.name || null
          }
          userEmail={
            referredClients?.find((c) => c._id === contactModalUserId)?.email || ""
          }
          isOpen={!!contactModalUserId}
          onClose={() => setContactModalUserId(null)}
        />
      )}
    </div>
  );
}
