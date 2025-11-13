"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type SortColumn = "name" | "email" | "country" | "requests" | "tokens" | "cost";
type SortDirection = "asc" | "desc";

interface UnifiedClient {
  userId: string;
  name: string;
  email: string;
  country: string | null;
  requests: number;
  tokens: number;
  cost: number;
}

const ITEMS_PER_PAGE = 15;

// Helper function to get current month date range
function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

export default function AdminClientsPage() {
  const router = useRouter();
  const clients = useQuery(api.users.listAllUsers, { role: "client" });
  const { startDate, endDate } = getCurrentMonthRange();
  const topConsumers = useQuery(api.usageTracking.getTopConsumers, {
    limit: 1000, // Get all for unified table
    startDate,
    endDate,
  });

  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("tokens");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Unify clients data with usage statistics
  const unifiedClients = useMemo<UnifiedClient[]>(() => {
    if (!clients) return [];

    // Create a map of usage stats by userId
    const usageMap = new Map<
      string,
      { requests: number; tokens: number; cost: number }
    >();
    if (topConsumers) {
      topConsumers.forEach((consumer) => {
        usageMap.set(consumer.userId, {
          requests: consumer.totalRequests,
          tokens: consumer.totalTokens,
          cost: consumer.cost ?? 0,
        });
      });
    }

    // Combine clients with usage stats
    return clients.map((client) => {
      const usage = usageMap.get(client._id) || {
        requests: 0,
        tokens: 0,
        cost: 0,
      };

      return {
        userId: client._id,
        name: client.name || "Sin nombre",
        email: client.email,
        country: client.country || null,
        requests: usage.requests,
        tokens: usage.tokens,
        cost: usage.cost,
      };
    });
  }, [clients, topConsumers]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return unifiedClients.filter((client) => {
      const nameMatch =
        !searchName ||
        client.name.toLowerCase().includes(searchName.toLowerCase());
      const emailMatch =
        !searchEmail ||
        client.email.toLowerCase().includes(searchEmail.toLowerCase());
      const countryMatch =
        !searchCountry ||
        (client.country &&
          client.country.toLowerCase().includes(searchCountry.toLowerCase()));

      return nameMatch && emailMatch && countryMatch;
    });
  }, [unifiedClients, searchName, searchEmail, searchCountry]);

  // Sort clients
  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients];

    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case "country":
          aValue = a.country?.toLowerCase() || "";
          bValue = b.country?.toLowerCase() || "";
          break;
        case "requests":
          aValue = a.requests;
          bValue = b.requests;
          break;
        case "tokens":
          aValue = a.tokens;
          bValue = b.tokens;
          break;
        case "cost":
          aValue = a.cost;
          bValue = b.cost;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredClients, sortColumn, sortDirection]);

  // Paginate clients
  const totalPages = Math.ceil(sortedClients.length / ITEMS_PER_PAGE);
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedClients.slice(startIndex, endIndex);
  }, [sortedClients, currentPage]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
    setCurrentPage(1);
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
        <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground mt-2">
          Gestión y estadísticas de clientes
        </p>
      </div>

      {/* Unified Clients Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5" />
            Clientes ({filteredClients.length}) - Mes Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={searchEmail}
                onChange={(e) => {
                  setSearchEmail(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por país..."
                value={searchCountry}
                onChange={(e) => {
                  setSearchCountry(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          {!clients ? (
            <div className="text-muted-foreground py-8 text-center">
              Cargando...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay clientes que coincidan con los filtros
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-foreground">
                        <div className="flex items-center gap-2">
                          Cliente
                          <SortButton column="name" />
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
                          País
                          <SortButton column="country" />
                        </div>
                      </th>
                      <th className="text-right p-3 text-foreground">
                        <div className="flex items-center justify-end gap-2">
                          Requests
                          <SortButton column="requests" />
                        </div>
                      </th>
                      <th className="text-right p-3 text-foreground">
                        <div className="flex items-center justify-end gap-2">
                          Tokens
                          <SortButton column="tokens" />
                        </div>
                      </th>
                      <th className="text-right p-3 text-foreground">
                        <div className="flex items-center justify-end gap-2">
                          Costo Estimado
                          <SortButton column="cost" />
                        </div>
                      </th>
                      <th className="text-right p-3 text-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClients.map((client) => (
                      <tr
                        key={client.userId}
                        className="border-b border-border hover:bg-muted transition-colors"
                      >
                        <td className="p-3 font-medium text-foreground">
                          {client.name}
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
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-foreground">
                          {client.requests.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          {client.tokens.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-semibold text-green-600 dark:text-green-400">
                          ${client.cost.toFixed(4)}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/clientes/${client.userId}`)
                            }
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                    {Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      sortedClients.length
                    )}{" "}
                    de {sortedClients.length} clientes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="text-sm text-foreground">
                      Página {currentPage} de {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
