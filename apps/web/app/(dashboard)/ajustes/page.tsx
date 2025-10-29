"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useMutation, useAction } from "convex/react";
import { useSignIn } from "@clerk/nextjs";
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
import { Send } from "lucide-react";

export default function AjustesPage() {
  const business = useAtomValue(businessAtom);
  const { signIn } = useSignIn();
  const updateVisualConfig = useMutation(api.businesses.updateVisualConfig);
  const updateBusinessInfo = useMutation(api.businesses.updateBusinessInfo);
  const generateUploadUrl = useMutation(api.businesses.generateUploadUrl);

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

      {/* Preview - Third Section */}
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
