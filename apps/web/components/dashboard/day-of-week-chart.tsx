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

interface DayOfWeekChartProps {
  businessId: Id<"businesses">;
}

const DAY_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-1)",
  "var(--color-chart-2)",
];

export function DayOfWeekChart({ businessId }: DayOfWeekChartProps) {
  const dayData = useQuery(api.appointments.getAppointmentsByDayOfWeek, {
    businessId,
  });

  if (dayData === undefined) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Citas por Día de la Semana</CardTitle>
          <CardDescription className="text-foreground/60">
            Cargando datos...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Sort by day order
  const sortedData = DAY_ORDER.map((day) => {
    const found = dayData.find((d) => d.day === day);
    return found || { day, count: 0 };
  });

  const hasData = sortedData.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Citas por Día de la Semana</CardTitle>
          <CardDescription className="text-foreground/60">
            Días más ocupados
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
        <CardTitle className="text-foreground">Citas por Día de la Semana</CardTitle>
        <CardDescription className="text-foreground/60">
          Días más ocupados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="day"
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--foreground)" }}
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

