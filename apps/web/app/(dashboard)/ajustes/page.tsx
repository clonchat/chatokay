"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useMutation, useAction } from "convex/react";
import { useUser, useSignIn } from "@clerk/nextjs";
import { api } from "@workspace/backend/_generated/api";
import { businessAtom } from "@/lib/store/auth-atoms";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import toast from "react-hot-toast";
import { getChatbotUrl } from "@/lib/utils/urls";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Send, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

export default function AjustesPage() {
  const business = useAtomValue(businessAtom);
  const { user } = useUser();
  const { signIn } = useSignIn();
  const updateVisualConfig = useMutation(api.businesses.updateVisualConfig);
  const updateBusinessInfo = useMutation(api.businesses.updateBusinessInfo);
  const generateUploadUrl = useMutation(api.businesses.generateUploadUrl);
  const enableGoogleCalendar = useMutation(
    api.googleCalendar.enableGoogleCalendar
  );
  const disableGoogleCalendar = useMutation(
    api.googleCalendar.disableGoogleCalendar
  );
  const testConnection = useAction(api.googleCalendar.testConnection);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [originalBusinessName, setOriginalBusinessName] = useState("");
  const [originalBusinessDescription, setOriginalBusinessDescription] =
    useState("");
  const [originalBusinessEmail, setOriginalBusinessEmail] = useState("");
  const [originalBusinessPhone, setOriginalBusinessPhone] = useState("");
  const [originalTheme, setOriginalTheme] = useState<"light" | "dark">("light");
  const [originalWelcomeMessage, setOriginalWelcomeMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTogglingCalendar, setIsTogglingCalendar] = useState(false);

  // Check if user has Google connected
  const googleAccount = user?.externalAccounts?.find(
    (account) => account.provider === "google"
  );
  const hasGoogleConnected = !!googleAccount;

  // Debug: Log external accounts
  if (process.env.NODE_ENV === "development" && user) {
    console.log("User external accounts:", user.externalAccounts);
    console.log("Google account found:", googleAccount);
  }

  // Initialize values when business loads
  useEffect(() => {
    if (business) {
      const name = business.name || "";
      const desc = business.description || "";
      const email = business.email || "";
      const phone = business.phone || "";
      const themeVal = business.visualConfig?.theme || "light";
      const welcome = business.visualConfig?.welcomeMessage || "";

      setBusinessName(name);
      setBusinessDescription(desc);
      setBusinessEmail(email);
      setBusinessPhone(phone);
      setTheme(themeVal);
      setWelcomeMessage(welcome);

      setOriginalBusinessName(name);
      setOriginalBusinessDescription(desc);
      setOriginalBusinessEmail(email);
      setOriginalBusinessPhone(phone);
      setOriginalTheme(themeVal);
      setOriginalWelcomeMessage(welcome);
    }
  }, [business]);

  // Load logo URL when business changes
  useEffect(() => {
    if (business?.visualConfig?.logoUrl) {
      setLogoPreview(business.visualConfig.logoUrl);
    }
  }, [business?.visualConfig?.logoUrl]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!business) return;

    setIsLoading(true);
    try {
      const hasBusinessInfoChanges =
        businessName !== originalBusinessName ||
        businessDescription !== originalBusinessDescription ||
        businessEmail !== originalBusinessEmail ||
        businessPhone !== originalBusinessPhone;

      const hasVisualConfigChanges =
        theme !== originalTheme ||
        welcomeMessage !== originalWelcomeMessage ||
        logoFile !== null;

      if (!hasBusinessInfoChanges && !hasVisualConfigChanges) {
        toast("No hay cambios para guardar");
        setIsLoading(false);
        return;
      }

      // Update business info only if changed
      if (hasBusinessInfoChanges) {
        const updateData: {
          name?: string;
          description?: string;
          email?: string;
          phone?: string;
        } = {};
        if (businessName !== originalBusinessName) {
          updateData.name = businessName;
        }
        if (businessDescription !== originalBusinessDescription) {
          updateData.description = businessDescription;
        }
        if (businessEmail !== originalBusinessEmail) {
          updateData.email = businessEmail;
        }
        if (businessPhone !== originalBusinessPhone) {
          updateData.phone = businessPhone;
        }
        await updateBusinessInfo({
          businessId: business._id,
          ...updateData,
        });
      }

      // Update visual config only if changed
      if (hasVisualConfigChanges) {
        const updateData: {
          logoUrl?: Id<"_storage">;
          theme?: "light" | "dark";
          welcomeMessage?: string;
        } = {};

        // Upload logo if selected
        if (logoFile) {
          const uploadUrl = await generateUploadUrl();
          const uploadResult = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": logoFile.type },
            body: logoFile,
          });

          if (!uploadResult.ok) {
            throw new Error("Error al subir el logo");
          }

          const { storageId } = await uploadResult.json();
          updateData.logoUrl = storageId as Id<"_storage">;
        }

        if (theme !== originalTheme) {
          updateData.theme = theme;
        }
        if (welcomeMessage !== originalWelcomeMessage) {
          updateData.welcomeMessage = welcomeMessage || undefined;
        }

        await updateVisualConfig({
          businessId: business._id,
          ...updateData,
        });
      }

      toast.success("Configuración actualizada exitosamente");

      // Reset to new original values
      setOriginalBusinessName(businessName);
      setOriginalBusinessDescription(businessDescription);
      setOriginalBusinessPhone(businessPhone);
      setOriginalTheme(theme);
      setOriginalWelcomeMessage(welcomeMessage);
      setLogoFile(null);

      window.location.reload(); // Reload to update the business atom
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar configuración");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = () => {
    // Redirect to Clerk's user profile page where they can connect external accounts
    // This uses the correct OAuth flow that requests all configured scopes including Calendar
    window.location.href = "/perfil";
  };

  const handleEnableCalendar = async () => {
    if (!business) return;

    setIsTogglingCalendar(true);
    try {
      // First test the connection
      setIsTestingConnection(true);
      const result = await testConnection({ businessId: business._id });
      setIsTestingConnection(false);

      if (!result.success) {
        toast.error(result.error || "No se pudo conectar con Google Calendar");
        return;
      }

      // Enable calendar sync
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

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Ajustes</h1>
        <p className="text-foreground/60 mt-2">
          Gestiona la información y apariencia de tu chatbot
        </p>
      </div>

      {/* Business Info - First Section */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Negocio</CardTitle>
          <CardDescription>Información básica de tu negocio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="businessName">Nombre del Negocio</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-2"
              placeholder="Nombre de tu negocio"
            />
          </div>
          <div>
            <Label htmlFor="businessDescription">Descripción</Label>
            <Textarea
              id="businessDescription"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              rows={3}
              className="mt-2"
              placeholder="Describe brevemente tu negocio"
            />
          </div>
          <div>
            <Label htmlFor="businessEmail">Email de Contacto (Opcional)</Label>
            <Input
              id="businessEmail"
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              className="mt-2"
              placeholder="contacto@minegocio.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Los clientes podrán ver este email para contactarte
            </p>
          </div>
          <div>
            <Label htmlFor="businessPhone">Número de Teléfono (Opcional)</Label>
            <Input
              id="businessPhone"
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              className="mt-2"
              placeholder="+1 234 567 8900"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Los clientes podrán ver este número para contactarte
            </p>
          </div>
          <div>
            <Label>Subdominio</Label>
            <Input value={business.subdomain} disabled className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Tu chatbot está disponible en: {getChatbotUrl(business.subdomain)}
            </p>
            <p className="text-xs text-muted-foreground">
              El subdominio no se puede modificar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visual Configuration - Second Section */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración Visual</CardTitle>
          <CardDescription>
            Personaliza la apariencia de tu chatbot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div>
            <Label htmlFor="logo">Logo del Negocio</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="cursor-pointer mt-2"
            />
            {logoPreview && (
              <div className="mt-2">
                <img
                  src={logoPreview}
                  alt="Vista previa del logo"
                  className="h-24 w-24 object-contain border rounded-lg p-2"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceptados: JPG, PNG, GIF (max 5MB)
            </p>
          </div>

          {/* Theme */}
          <div>
            <Label htmlFor="theme">Tema</Label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </div>

          {/* Welcome Message */}
          <div>
            <Label htmlFor="welcomeMessage">Mensaje de Bienvenida</Label>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="¡Hola! ¿En qué puedo ayudarte hoy?"
              rows={3}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este mensaje se mostrará cuando los usuarios abran el chat
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Integration - Third Section */}
      <Card>
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
            // Not connected to Google
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
            // Google connected but calendar not enabled - SIMPLE VERSION
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
            // Calendar enabled
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
              <div className="flex gap-2">
                <Button
                  onClick={handleDisableCalendar}
                  disabled={isTogglingCalendar}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  {isTogglingCalendar
                    ? "Desactivando..."
                    : "Desactivar Sincronización"}
                </Button>
                <Button
                  onClick={handleConnectGoogle}
                  variant="ghost"
                  className="flex-1 sm:flex-none"
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

      {/* Preview - Fourth Section */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Vista Previa del Chatbot</CardTitle>
          <CardDescription>
            Así se verá tu chatbot para los clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-background rounded-lg p-4 max-w-2xl border">
            <div className={`${theme === "dark" ? "dark" : ""}`}>
              <div className="border-b bg-card border-border">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="h-10 w-10 object-contain rounded bg-background p-1 border border-border"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {businessName || business.name}
                      </h3>
                      {businessDescription && (
                        <p className="text-sm text-muted-foreground truncate">
                          {businessDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-lg p-3 bg-muted">
                    <p className="text-sm break-words">
                      {welcomeMessage || "¡Hola! ¿En qué puedo ayudarte hoy?"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border bg-card">
                <div className="px-4 py-4">
                  <div className="flex gap-2">
                    <div className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground flex items-center">
                      Escribe tu mensaje...
                    </div>
                    <Button size="icon" disabled>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t border-border bg-card px-4 py-2">
                <p className="text-center text-xs text-muted-foreground">
                  Powered by{" "}
                  <span className="font-semibold text-primary">ChatOkay</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button asChild>
              <a
                href={getChatbotUrl(business.subdomain)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver Chatbot Completo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card> */}

      {/* Save Button - Bottom */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} size="lg">
          {isLoading ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  );
}
