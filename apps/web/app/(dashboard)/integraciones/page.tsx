"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useMutation, useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@workspace/backend/_generated/api";
import { businessAtom } from "@/lib/store/auth-atoms";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import toast from "react-hot-toast";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Send,
  MessageCircle,
  Lock,
} from "lucide-react";

export default function IntegracionesPage() {
  const business = useAtomValue(businessAtom);
  const { user } = useUser();
  const enableGoogleCalendar = useMutation(
    api.googleCalendar.enableGoogleCalendar
  );
  const disableGoogleCalendar = useMutation(
    api.googleCalendar.disableGoogleCalendar
  );
  const testConnection = useAction(api.googleCalendar.testConnection);
  const updateTelegramToken = useMutation(api.businesses.updateTelegramToken);
  const toggleTelegram = useMutation(api.businesses.toggleTelegram);
  const setWebhookAction = useAction(api.businesses.setTelegramWebhook);

  const [telegramToken, setTelegramToken] = useState("");
  const [originalTelegramToken, setOriginalTelegramToken] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTogglingCalendar, setIsTogglingCalendar] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTogglingTelegram, setIsTogglingTelegram] = useState(false);

  // Check if user has Google connected
  const googleAccount = user?.externalAccounts?.find(
    (account) => account.provider === "google"
  );
  const hasGoogleConnected = !!googleAccount;

  // Initialize Telegram token when business loads
  useEffect(() => {
    if (business) {
      const token = business.telegramBotToken || "";
      setTelegramToken(token);
      setOriginalTelegramToken(token);
    }
  }, [business]);

  const handleConnectGoogle = () => {
    window.location.href = "/perfil";
  };

  const handleEnableCalendar = async () => {
    if (!business) return;

    setIsTogglingCalendar(true);
    try {
      setIsTestingConnection(true);
      const result = await testConnection({ businessId: business._id });
      setIsTestingConnection(false);

      if (!result.success) {
        toast.error(result.error || "No se pudo conectar con Google Calendar");
        return;
      }

      await enableGoogleCalendar({ businessId: business._id });
      toast.success("Sincronización con Google Calendar activada");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Error al activar sincronización");
    } finally {
      setIsTogglingCalendar(false);
      setIsTestingConnection(false);
    }
  };

  const handleDisableCalendar = async () => {
    if (!business) return;

    setIsTogglingCalendar(true);
    try {
      await disableGoogleCalendar({ businessId: business._id });
      toast.success("Sincronización con Google Calendar desactivada");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Error al desactivar sincronización");
    } finally {
      setIsTogglingCalendar(false);
    }
  };

  const handleSaveTelegramToken = async () => {
    if (!business) return;

    setIsSavingTelegram(true);
    try {
      await updateTelegramToken({
        businessId: business._id,
        token: telegramToken || undefined,
      });

      // If token was saved, configure webhook
      if (telegramToken) {
        // Get Convex deployment URL from environment
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (convexUrl) {
          // Extract deployment name from URL (e.g., https://xxx.convex.cloud -> xxx)
          const deploymentMatch = convexUrl.match(
            /https:\/\/([^.]+)\.convex\.cloud/
          );
          if (deploymentMatch) {
            const deploymentName = deploymentMatch[1];
            const webhookUrl = `https://${deploymentName}.convex.cloud/http/telegram-webhook`;

            const webhookResult = await setWebhookAction({
              token: telegramToken,
              webhookUrl,
            });

            if (!webhookResult.success) {
              toast.error(
                `Token guardado pero no se pudo configurar el webhook: ${webhookResult.error}`
              );
            }
          }
        }
      }

      toast.success(
        telegramToken
          ? "Token de Telegram guardado exitosamente"
          : "Token de Telegram eliminado"
      );
      setOriginalTelegramToken(telegramToken);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar token de Telegram");
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleToggleTelegram = async (enabled: boolean) => {
    if (!business) return;

    setIsTogglingTelegram(true);
    try {
      await toggleTelegram({
        businessId: business._id,
        enabled,
      });
      toast.success(enabled ? "Telegram activado" : "Telegram desactivado");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar estado de Telegram");
    } finally {
      setIsTogglingTelegram(false);
    }
  };

  const getWebhookUrl = () => {
    if (typeof window === "undefined") {
      return "No disponible (servidor)";
    }
    // Try to get from environment variable
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl) {
      const deploymentMatch = convexUrl.match(
        /https:\/\/([^.]+)\.convex\.cloud/
      );
      if (deploymentMatch) {
        const deploymentName = deploymentMatch[1];
        return `https://${deploymentName}.convex.cloud/http/telegram-webhook`;
      }
    }
    // Fallback: try to construct from current Convex client if available
    // For production, this would need to be configured via environment
    return "Configurar manualmente en Telegram";
  };

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground/60">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integraciones</h1>
        <p className="text-foreground/60 mt-2">
          Conecta tu negocio con servicios externos
        </p>
      </div>

      {/* Google Calendar Integration */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Integración con Google Calendar
          </CardTitle>
          <CardDescription>
            Sincroniza automáticamente tus citas confirmadas con tu calendario
            de Google
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasGoogleConnected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Conecta tu cuenta de Google
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Para sincronizar citas con Google Calendar, primero debes
                    conectar tu cuenta de Google.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    📝 Pasos para conectar Google Calendar:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>Haz clic en el botón de abajo</li>
                    <li>Ve a la sección "Connected accounts" en tu perfil</li>
                    <li>Click en "Connect" al lado del icono de Google</li>
                    <li>Autoriza el acceso a Google Calendar</li>
                    <li>Vuelve a esta página</li>
                  </ol>
                </div>
                <Button
                  onClick={handleConnectGoogle}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  📋 Ir a Mi Perfil
                </Button>
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Importante:</strong> Iniciar sesión con Google ≠
                  Conectar Google Calendar. Son flujos diferentes.
                </p>
              </div>
            </div>
          ) : !business.googleCalendarEnabled ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    ✓ Google conectado exitosamente
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Ya tienes los permisos necesarios. Solo activa la
                    sincronización para que tus citas se agreguen
                    automáticamente a tu calendario.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <h4 className="font-medium">📝 ¿Cómo funciona?</h4>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    Las citas confirmadas se crean automáticamente en Google
                    Calendar
                  </li>
                  <li>Si cancelas una cita, se elimina del calendario</li>
                  <li>Si reagendas una cita, se actualiza en el calendario</li>
                </ul>
              </div>

              <Button
                onClick={handleEnableCalendar}
                disabled={isTogglingCalendar || isTestingConnection}
                size="lg"
                className="w-full sm:w-auto"
              >
                {isTestingConnection
                  ? "Verificando..."
                  : isTogglingCalendar
                    ? "Activando..."
                    : "Activar Sincronización con Google Calendar"}
              </Button>

              <p className="text-xs text-muted-foreground">
                💡 Al activar, verificaremos que tengas los permisos correctos
                de Google Calendar.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Sincronización activa
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Tus citas confirmadas se sincronizan automáticamente con tu
                    Google Calendar.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleDisableCalendar}
                  disabled={isTogglingCalendar}
                  variant="outline"
                  className="w-full sm:w-auto sm:flex-none"
                >
                  {isTogglingCalendar
                    ? "Desactivando..."
                    : "Desactivar Sincronización"}
                </Button>
                <Button
                  onClick={handleConnectGoogle}
                  variant="ghost"
                  className="w-full sm:w-auto sm:flex-none"
                >
                  Reconectar Google
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Usa "Reconectar Google" si necesitas actualizar los permisos
                de tu cuenta.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telegram Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Integración con Telegram
          </CardTitle>
          <CardDescription>
            Conecta tu bot de Telegram para recibir y responder mensajes de
            clientes automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                📝 Pasos para obtener tu token de Telegram:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li>
                  Abre Telegram y busca @BotFather (el que tiene el tick azul)
                </li>
                <li>Envía el comando /newbot</li>
                <li>
                  Elige un nombre para tu bot (ej: "Citas Peluquería Estilo")
                </li>
                <li>
                  Elige un nombre de usuario que termine en "bot" (ej:
                  CitasEstiloBot)
                </li>
                <li>Copia el token que te proporciona BotFather</li>
                <li>Pégalo en el campo de abajo</li>
              </ol>
            </div>

            <div>
              <Label htmlFor="telegramToken">Token del Bot de Telegram</Label>
              <Input
                id="telegramToken"
                type="password"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="mt-2"
                placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
              />
              <p className="text-xs text-muted-foreground mt-1">
                El token es confidencial. Guárdalo de forma segura.
              </p>
            </div>

            {business.telegramBotToken && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium text-foreground mb-1">
                  Webhook URL configurado:
                </p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {getWebhookUrl()}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSaveTelegramToken}
                disabled={
                  isSavingTelegram || telegramToken === originalTelegramToken
                }
                size="lg"
                className="flex-1 sm:flex-none"
              >
                {isSavingTelegram ? "Guardando..." : "Guardar Token"}
              </Button>

              {business.telegramBotToken && (
                <Button
                  onClick={() =>
                    handleToggleTelegram(!business.telegramEnabled)
                  }
                  disabled={isTogglingTelegram}
                  variant={business.telegramEnabled ? "outline" : "default"}
                  className="flex-1 sm:flex-none"
                >
                  {isTogglingTelegram
                    ? "..."
                    : business.telegramEnabled
                      ? "Desactivar Telegram"
                      : "Activar Telegram"}
                </Button>
              )}
            </div>

            {business.telegramEnabled && (
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    ✓ Telegram activo
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Tu bot está recibiendo mensajes y respondiendo
                    automáticamente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Integration (Disabled) */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Integración con WhatsApp
            <Lock className="h-4 w-4 ml-auto" />
          </CardTitle>
          <CardDescription>
            Próximamente: Conecta tu número de WhatsApp Business para recibir
            mensajes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Funcionalidad en desarrollo
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Esta integración estará disponible próximamente. Te
                notificaremos cuando esté lista.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
