"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { useMutation } from "convex/react";
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

export default function AjustesPage() {
  const business = useAtomValue(businessAtom);
  const updateVisualConfig = useMutation(api.businesses.updateVisualConfig);
  const generateUploadUrl = useMutation(api.businesses.generateUploadUrl);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(
    business?.visualConfig?.logoUrl || ""
  );
  const [theme, setTheme] = useState<"light" | "dark">(
    business?.visualConfig?.theme || "light"
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    business?.visualConfig?.welcomeMessage || ""
  );
  const [isLoading, setIsLoading] = useState(false);

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
      let logoUrl: string | undefined = business.visualConfig?.logoUrl;

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
        logoUrl = `${process.env.NEXT_PUBLIC_CONVEX_URL}/api/storage/${storageId}`;
      }

      await updateVisualConfig({
        businessId: business._id,
        logoUrl,
        theme,
        welcomeMessage: welcomeMessage || undefined,
      });

      toast.success("Configuración actualizada exitosamente");
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
          Personaliza la apariencia y configuración de tu chatbot
        </p>
      </div>

      {/* Visual Configuration */}
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

          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardContent>
      </Card>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Negocio</CardTitle>
          <CardDescription>Información básica de tu negocio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre del Negocio</Label>
            <Input value={business.name} disabled className="mt-2" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={business.description || ""}
              disabled
              rows={3}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Subdominio</Label>
            <Input value={business.subdomain} disabled className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Tu chatbot está disponible en: {business.subdomain}.chatokay.com
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chatbot Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Vista Previa del Chatbot</CardTitle>
          <CardDescription>
            Así se verá tu chatbot para los clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 max-w-md">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Chatbot header */}
              <div
                className={`p-4 border-b ${theme === "dark" ? "bg-card text-foreground" : "bg-card"}`}
              >
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-8 w-8 object-contain rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{business.name}</h3>
                    <p className="text-xs opacity-75">En línea</p>
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-4 space-y-3">
                <div className="bg-blue-500 text-foreground rounded-lg p-3 max-w-xs">
                  {welcomeMessage || "¡Hola! ¿En qué puedo ayudarte hoy?"}
                </div>
                <div className="text-sm text-gray-500 text-center">
                  Escribe un mensaje...
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button asChild>
              <a
                href={`https://${business.subdomain}.chatokay.com`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver Chatbot Completo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
