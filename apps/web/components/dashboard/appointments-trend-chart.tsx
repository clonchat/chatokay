"use client";

import { useQuery } from "convex/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AppointmentsTrendChartProps {
  businessId: Id<"businesses">;
}

export function AppointmentsTrendChart({
  businessId,
}: AppointmentsTrendChartProps) {
  const trendData = useQuery(api.appointments.getAppointmentsTrend, {
    businessId,
  });

  if (trendData === undefined) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Tendencia de Citas</CardTitle>
          <CardDescription className="text-foreground/60">
            Cargando datos...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Format dates for display
  const formattedData = trendData.map((item) => {
    const date = new Date(item.date);
    return {
      ...item,
      dateLabel: format(date, "d MMM", { locale: es }),
    };
  });

  const hasData = formattedData.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Tendencia de Citas</CardTitle>
          <CardDescription className="text-foreground/60">
            Últimos 30 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-foreground/60">
            No hay citas en los últimos 30 días
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Tendencia de Citas</CardTitle>
        <CardDescription className="text-foreground/60">
          Últimos 30 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={formattedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="dateLabel"
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--foreground)", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--foreground)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--foreground)",
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={{ fill: "var(--color-chart-1)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
