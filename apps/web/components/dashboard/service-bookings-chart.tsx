"use client";

import { useQuery } from "convex/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

interface ServiceBookingsChartProps {
  businessId: Id<"businesses">;
}

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function ServiceBookingsChart({ businessId }: ServiceBookingsChartProps) {
  const serviceData = useQuery(api.appointments.getAppointmentsByService, {
    businessId,
  });

  if (serviceData === undefined) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Citas por Servicio</CardTitle>
          <CardDescription className="text-foreground/60">
            Cargando datos...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (serviceData.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Citas por Servicio</CardTitle>
          <CardDescription className="text-foreground/60">
            Popularidad de servicios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-foreground/60">
            No hay citas aún
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by count descending
  const sortedData = [...serviceData].sort((a, b) => b.count - a.count);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Citas por Servicio</CardTitle>
        <CardDescription className="text-foreground/60">
          Popularidad de servicios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="serviceName"
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--foreground)" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="var(--muted-foreground)" tick={{ fill: "var(--foreground)" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--foreground)",
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

