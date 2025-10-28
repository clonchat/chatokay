"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

export default function PerfilPage() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const googleAccount = user?.externalAccounts?.find(
    (account) => account.provider === "google"
  );

  const handleReconnectGoogle = async () => {
    // The simplest way to get new scopes is to sign out and sign in again
    // Clerk will request the updated scopes configured in the dashboard
    const confirmed = window.confirm(
      "Vas a cerrar sesión y serás redirigido a la página de inicio de sesión.\n\n" +
        "Cuando vuelvas a iniciar sesión con Google, asegúrate de aceptar TODOS los permisos, especialmente el de Google Calendar.\n\n" +
        "¿Continuar?"
    );

    if (!confirmed) return;

    // Sign out using Clerk and redirect to sign-in
    await signOut({ redirectUrl: "/sign-in" });
  };

  const handleDisconnectGoogle = async () => {
    if (!googleAccount) return;

    const confirmed = window.confirm(
      "¿Estás seguro de que quieres desconectar Google? Perderás la sincronización con Google Calendar."
    );

    if (!confirmed) return;

    try {
      await googleAccount.destroy();
      window.location.reload();
    } catch (error: any) {
      console.error("Error disconnecting Google:", error);
      alert("Error al desconectar Google: " + error.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-foreground/60 mt-2">
          Gestiona tu cuenta y conecta servicios externos como Google Calendar
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Cuenta</CardTitle>
          <CardDescription>Tu información básica de perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground/60">
              Nombre
            </label>
            <p className="text-base text-foreground mt-1">
              {user?.fullName || user?.firstName || "No configurado"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground/60">
              Email
            </label>
            <p className="text-base text-foreground mt-1">
              {user?.primaryEmailAddress?.emailAddress || "No configurado"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Conexión con Google Calendar</CardTitle>
          <CardDescription>
            Conecta tu cuenta de Google para sincronizar citas automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleAccount ? (
            // Google connected
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Google conectado exitosamente
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Cuenta: {googleAccount.emailAddress}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Estado: {googleAccount.verification?.status || "Verificado"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleDisconnectGoogle} variant="destructive">
                  Desconectar Google
                </Button>
                <Button
                  onClick={() =>
                    window.open(
                      "https://myaccount.google.com/permissions",
                      "_blank"
                    )
                  }
                  variant="outline"
                >
                  Ver Permisos en Google{" "}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  ✅ <strong>Siguiente paso:</strong> Ve a{" "}
                  <a href="/ajustes" className="underline font-medium">
                    Ajustes
                  </a>{" "}
                  para activar la sincronización con Google Calendar.
                </p>
              </div>
            </div>
          ) : (
            // Google not connected - User needs to sign out and sign in again
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Necesitas autorizar el acceso a Google Calendar
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Iniciaste sesión con Google, pero necesitas autorizar el
                    acceso a tu calendario. Cierra sesión y vuelve a entrar para
                    autorizar los nuevos permisos.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3 text-sm">
                <p className="font-medium">📝 Pasos para conectar Calendar:</p>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>
                    <strong>Cierra sesión</strong> haciendo click en el botón de
                    abajo
                  </li>
                  <li>
                    <strong>Vuelve a iniciar sesión</strong> con Google
                  </li>
                  <li>
                    <strong>Google te pedirá nuevos permisos</strong> incluyendo
                    acceso a Calendar
                  </li>
                  <li>
                    <strong>Acepta TODOS los permisos</strong> (email, profile,
                    y calendar)
                  </li>
                  <li>
                    Una vez dentro, vuelve aquí y verás "Google conectado"
                  </li>
                </ol>

                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-900 dark:text-amber-100">
                    <strong>⚠️ Importante:</strong> Cuando vuelvas a iniciar
                    sesión, Google te mostrará una pantalla con TODOS los
                    permisos. Asegúrate de que diga "Ver, editar, compartir y
                    eliminar permanentemente todos los calendarios..."
                  </p>
                </div>
              </div>

              <Button
                onClick={handleReconnectGoogle}
                size="lg"
                className="w-full sm:w-auto"
              >
                Cerrar Sesión y Reconectar
              </Button>

              <p className="text-xs text-muted-foreground">
                💡 <strong>Nota:</strong> Según{" "}
                <a
                  href="https://clerk.com/blog/using-clerk-sso-access-google-calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  la documentación de Clerk
                </a>
                , cuando agregas nuevos scopes a una conexión OAuth, el usuario
                debe volver a autorizar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
