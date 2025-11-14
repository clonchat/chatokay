"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Save, Percent, Info } from "lucide-react";
import toast from "react-hot-toast";

export default function ConfiguracionPage() {
  const settings = useQuery(api.platformSettings.getPlatformSettings);
  const updateFee = useMutation(api.platformSettings.updatePlatformFeePercentage);

  const [platformFeePercentage, setPlatformFeePercentage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when settings load
  useEffect(() => {
    if (settings && platformFeePercentage === "") {
      setPlatformFeePercentage(settings.platformFeePercentage.toString());
    }
  }, [settings, platformFeePercentage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const fee = parseFloat(platformFeePercentage);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("El porcentaje debe estar entre 0 y 100");
      setIsSaving(false);
      return;
    }

    try {
      await updateFee({ platformFeePercentage: fee });
      toast.success("Configuración guardada con éxito");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar la configuración"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de la configuración de la plataforma
        </p>
      </div>

      {/* Platform Fee Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Percent className="h-5 w-5" />
            Costes de Plataforma
          </CardTitle>
          <CardDescription>
            Configura el porcentaje de costes de plataforma mensuales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="platformFeePercentage">
                Porcentaje de Costes de Plataforma (%)
              </Label>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-xs">
                  <Input
                    id="platformFeePercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                      platformFeePercentage ||
                      settings?.platformFeePercentage.toString() ||
                      "10"
                    }
                    onChange={(e) => setPlatformFeePercentage(e.target.value)}
                    placeholder="10"
                    className="pr-8"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
                <Button type="submit" disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Valor por defecto: 10%. Este porcentaje se aplicará a los ingresos mensuales
                de la plataforma.
              </p>
            </div>

            {/* Info Card */}
            <div className="bg-muted rounded-lg p-4 border border-border">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Información</p>
                  <p>
                    El porcentaje de costes de plataforma determina qué parte de los ingresos
                    mensuales se destina a los costes operativos de la plataforma.
                  </p>
                  <p>
                    <strong className="text-foreground">Valor actual:</strong>{" "}
                    {settings?.platformFeePercentage ?? 10}%
                  </p>
                  {settings?.updatedAt && (
                    <p className="text-xs">
                      Última actualización:{" "}
                      {new Date(settings.updatedAt).toLocaleString("es-ES")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

