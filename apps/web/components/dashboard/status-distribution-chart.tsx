"use client";

import { useQuery } from "convex/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

interface StatusDistributionChartProps {
  businessId: Id<"businesses">;
}

const COLORS = {
  pending: "var(--color-chart-1)",
  confirmed: "var(--color-chart-2)",
  cancelled: "var(--color-chart-3)",
};

export function StatusDistributionChart({ businessId }: StatusDistributionChartProps) {
  const stats = useQuery(api.appointments.getAppointmentStats, { businessId });

  if (stats === undefined) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Distribución de Estados</CardTitle>
          <CardDescription className="text-foreground/60">
            Cargando datos...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data = [
    { name: "Pendientes", value: stats.pending, color: COLORS.pending },
    { name: "Confirmadas", value: stats.confirmed, color: COLORS.confirmed },
    { name: "Canceladas", value: stats.cancelled, color: COLORS.cancelled },
  ].filter((item) => item.value > 0);

  if (stats.total === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Distribución de Estados</CardTitle>
          <CardDescription className="text-foreground/60">
            Estado de tus citas
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

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Distribución de Estados</CardTitle>
        <CardDescription className="text-foreground/60">
          Estado de tus citas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--foreground)",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

