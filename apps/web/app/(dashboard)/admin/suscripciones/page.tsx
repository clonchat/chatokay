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
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  CreditCard,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";

type SortColumn = "client" | "email" | "status" | "plan" | "renewal";
type SortDirection = "asc" | "desc";

export default function AdminSubscriptionsPage() {
  const subscriptions = useQuery(api.subscriptions.listAllSubscriptions);

  const [searchClient, setSearchClient] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("client");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Helper function to get subscription status badge
  const getSubscriptionBadge = (status: string | null | undefined) => {
    if (!status) {
      return (
        <Badge variant="outline" className="text-xs">
          Sin suscripción
        </Badge>
      );
    }

    if (status === "trial") {
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 text-xs">
          Prueba
        </Badge>
      );
    } else if (status === "active") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
          Activa
        </Badge>
      );
    } else if (status === "past_due") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-xs">
          Pago pendiente
        </Badge>
      );
    } else if (status === "canceled") {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs">
          Cancelada
        </Badge>
      );
    } else if (status === "expired") {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs">
          Expirada
        </Badge>
      );
    }
    return null;
  };

  // Helper function to format renewal date
  const getRenewalDate = (currentPeriodEnd: number | undefined) => {
    if (!currentPeriodEnd) return "-";
    return new Date(currentPeriodEnd).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Helper function to get plan type
  const getPlanType = (planType: string | undefined) => {
    if (!planType) return "-";
    return planType === "annual" ? "Anual" : "Mensual";
  };

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];

    return subscriptions.filter((sub) => {
      const clientMatch =
        !searchClient ||
        (sub.user?.name &&
          sub.user.name.toLowerCase().includes(searchClient.toLowerCase()));
      const emailMatch =
        !searchEmail ||
        (sub.user?.email &&
          sub.user.email.toLowerCase().includes(searchEmail.toLowerCase()));
      const statusMatch =
        filterStatus === "all" ||
        (filterStatus === "none" && !sub.status) ||
        sub.status === filterStatus;
      const planMatch =
        filterPlan === "all" ||
        (filterPlan === "none" && !sub.planType) ||
        sub.planType === filterPlan;

      return clientMatch && emailMatch && statusMatch && planMatch;
    });
  }, [subscriptions, searchClient, searchEmail, filterStatus, filterPlan]);

  // Sort subscriptions
  const sortedSubscriptions = useMemo(() => {
    const sorted = [...filteredSubscriptions];

    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "client":
          aValue = a.user?.name?.toLowerCase() || "";
          bValue = b.user?.name?.toLowerCase() || "";
          break;
        case "email":
          aValue = a.user?.email?.toLowerCase() || "";
          bValue = b.user?.email?.toLowerCase() || "";
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        case "plan":
          aValue = a.planType || "";
          bValue = b.planType || "";
          break;
        case "renewal":
          aValue = a.currentPeriodEnd || 0;
          bValue = b.currentPeriodEnd || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredSubscriptions, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortButton = ({ column }: { column: SortColumn }) => {
    const isActive = sortColumn === column;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleSort(column)}
        className="h-auto p-0 hover:bg-transparent"
      >
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Suscripciones</h1>
        <p className="text-muted-foreground mt-2">
          Gestión y visualización de todas las suscripciones
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="h-5 w-5" />
            Suscripciones ({filteredSubscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Todos los estados</option>
              <option value="trial">Prueba</option>
              <option value="active">Activa</option>
              <option value="past_due">Pago pendiente</option>
              <option value="canceled">Cancelada</option>
              <option value="expired">Expirada</option>
              <option value="none">Sin suscripción</option>
            </select>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Todos los planes</option>
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
              <option value="none">Sin plan</option>
            </select>
          </div>

          {/* Table */}
          {!subscriptions ? (
            <div className="text-muted-foreground py-8 text-center">
              Cargando...
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay suscripciones que coincidan con los filtros
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-foreground">
                      <div className="flex items-center gap-2">
                        Cliente
                        <SortButton column="client" />
                      </div>
                    </th>
                    <th className="text-left p-3 text-foreground">
                      <div className="flex items-center gap-2">
                        Email
                        <SortButton column="email" />
                      </div>
                    </th>
                    <th className="text-left p-3 text-foreground">
                      <div className="flex items-center gap-2">
                        Estado
                        <SortButton column="status" />
                      </div>
                    </th>
                    <th className="text-left p-3 text-foreground">
                      <div className="flex items-center gap-2">
                        Plan
                        <SortButton column="plan" />
                      </div>
                    </th>
                    <th className="text-left p-3 text-foreground">
                      <div className="flex items-center gap-2">
                        Fecha Renovación
                        <SortButton column="renewal" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSubscriptions.map((sub) => (
                    <tr
                      key={sub._id || sub.userId}
                      className="border-b border-border hover:bg-muted transition-colors"
                    >
                      <td className="p-3 font-medium text-foreground">
                        {sub.user?.name || "Sin nombre"}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {sub.user?.email || "-"}
                      </td>
                      <td className="p-3">{getSubscriptionBadge(sub.status)}</td>
                      <td className="p-3 text-sm text-foreground">
                        {getPlanType(sub.planType)}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {getRenewalDate(sub.currentPeriodEnd)}
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

