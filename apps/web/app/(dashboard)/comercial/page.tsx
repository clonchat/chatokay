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
} from "lucide-react";
import { getReferralUrl } from "@/lib/utils/urls";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ComercialDashboardPage() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const referredClients = useQuery(api.users.getMyReferredClients);
  const referralCode = useQuery(api.users.getMyReferralCode);
  const ensureReferralCode = useMutation(api.users.ensureReferralCode);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Panel Comercial
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Bienvenido, {currentUser?.name || "Comercial"}
        </p>
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
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mis Clientes Referidos
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referredClients?.length ?? "..."}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clientes registrados con tu enlace
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Activos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Próximamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversiones</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Próximamente
            </p>
          </CardContent>
        </Card>
      </div>

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

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
                  <BarChart3 className="h-6 w-6 text-slate-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-500">Reportes</h3>
                  <p className="text-sm text-slate-400">
                    Próximamente disponible
                  </p>
                </div>
              </div>
            </div>
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
