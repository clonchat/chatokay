"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Users,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Link2,
  Copy,
  ExternalLink,
  DollarSign,
  CreditCard,
  Download,
} from "lucide-react";
import { getReferralUrl } from "@/lib/utils/urls";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { SubscriptionsChart } from "@/components/dashboard/subscriptions-chart";
import { PlanDistributionChart } from "@/components/dashboard/plan-distribution-chart";
import { generateRevenuePDF } from "@/lib/utils/pdf-generator";

export default function ComercialDashboardPage() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const referredClients = useQuery(api.users.getMyReferredClients);
  const referralCode = useQuery(api.users.getMyReferralCode);
  const ensureReferralCode = useMutation(api.users.ensureReferralCode);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const revenue = useQuery(api.subscriptions.getMyReferredClientsRevenue);
  const revenueByMonth = useQuery(
    api.subscriptions.getMyReferredClientsRevenueByMonth,
    { months: 12 }
  );
  const revenueBreakdown = useQuery(
    api.subscriptions.getMyReferredClientsRevenueBreakdown
  );

  // Ensure referral code exists and generate URL
  useEffect(() => {
    const loadReferralCode = async () => {
      if (
        currentUser &&
        (currentUser.role === "sales" || currentUser.role === "admin")
      ) {
        let code = referralCode;
        if (!code) {
          try {
            code = await ensureReferralCode();
          } catch (error) {
            console.error("Error generating referral code:", error);
          }
        }
        if (code) {
          setReferralUrl(getReferralUrl(code));
        }
      }
    };
    loadReferralCode();
  }, [currentUser, referralCode, ensureReferralCode]);

  const handleCopyUrl = async () => {
    if (referralUrl) {
      try {
        await navigator.clipboard.writeText(referralUrl);
        toast.success("URL copiada al portapapeles");
      } catch (error) {
        toast.error("Error al copiar URL");
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!revenueBreakdown) {
      toast.error("Cargando datos...");
      return;
    }

    try {
      const pdf = await generateRevenuePDF(
        revenueBreakdown.breakdown,
        revenueBreakdown.totals,
        currentUser?.name || "Comercial"
      );
      const currentDate = new Date();
      const monthName = currentDate.toLocaleString("es-ES", { month: "long" });
      const year = currentDate.getFullYear();
      const fileName = `ingresos_${monthName}_${year}.pdf`;
      pdf.save(fileName);
      toast.success("PDF descargado con éxito");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Panel Comercial
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Bienvenido, {currentUser?.name || "Comercial"}
          </p>
        </div>
        <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Descargar PDF Ingresos
        </Button>
      </div>

      {/* Referral Link Card */}
      {referralUrl && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Link2 className="h-5 w-5" />
              Tu Enlace de Referido
            </CardTitle>
            <CardDescription className="text-foreground/60">
              Comparte este enlace con clientes potenciales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border border-border">
                <code className="text-sm break-all text-foreground/80">
                  {referralUrl}
                </code>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyUrl}
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-muted"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URL
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-muted"
                >
                  <a
                    href={referralUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    Abrir Enlace
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Mis Clientes Referidos
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {revenue?.totalClients ?? referredClients?.length ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes registrados con tu enlace
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Ingresos Mensuales (MRR)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {revenue?.totalMRR
                ? `${revenue.totalMRR.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}€`
                : "0,00€"}
            </div>
            <p className="text-xs text-muted-foreground">
              Recurrentes mensuales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Ingresos Anuales (ARR)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {revenue?.annualARR
                ? `${revenue.annualARR.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}€`
                : "0,00€"}
            </div>
            <p className="text-xs text-muted-foreground">
              Proyectados anuales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Suscripciones Activas
            </CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {revenue?.activeSubscriptions ?? "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenue?.monthlySubscriptions ?? 0} mensuales,{" "}
              {revenue?.annualSubscriptions ?? 0} anuales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {revenueByMonth && (
        <div className="grid gap-6 md:grid-cols-2">
          <RevenueChart
            data={revenueByMonth}
            title="Ingresos por Mes"
            description="Ingresos de mis clientes - Últimos 12 meses"
          />
          <SubscriptionsChart
            data={revenueByMonth}
            title="Evolución de Suscripciones"
            description="Suscripciones activas de mis clientes"
          />
        </div>
      )}

      {revenue && (
        <PlanDistributionChart
          monthlyCount={revenue.monthlySubscriptions}
          annualCount={revenue.annualSubscriptions}
          title="Distribución por Plan"
          description="Suscripciones mensuales vs anuales de mis clientes"
        />
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <a
              href="/comercial/clientes"
              className="block rounded-lg border border-slate-200 p-6 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Ver Clientes
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Revisa la lista completa de clientes registrados
                  </p>
                </div>
              </div>
            </a>

            <button
              onClick={handleDownloadPDF}
              className="block rounded-lg border border-slate-200 p-6 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-left w-full"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <Download className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Descargar PDF Ingresos
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Descarga el desglose de ingresos del mes actual
                  </p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <p>
              <strong>Panel Comercial:</strong> Desde aquí puedes gestionar y
              ver información de tus clientes.
            </p>
            <p>
              <strong>Acceso:</strong> Tu rol de comercial te permite ver
              estadísticas y datos de clientes, pero no realizar cambios
              administrativos.
            </p>
            <p>
              <strong>Soporte:</strong> Si necesitas acceso adicional o tienes
              preguntas, contacta con el administrador.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
