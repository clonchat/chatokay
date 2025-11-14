"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Id } from "@workspace/backend/_generated/dataModel";
import toast from "react-hot-toast";
import { Calculator, Sparkles } from "lucide-react";

interface PromotionFormProps {
  isOpen: boolean;
  onClose: () => void;
  clientUserId?: Id<"users"> | null;
  promotionId?: Id<"promotions"> | null;
  initialMonthlyPrice?: number;
  initialNotes?: string;
  referredClients?: Array<{
    _id: Id<"users">;
    name?: string | null;
    email: string;
  }>;
}

export function PromotionForm({
  isOpen,
  onClose,
  clientUserId: initialClientUserId,
  promotionId,
  initialMonthlyPrice,
  initialNotes,
  referredClients = [],
}: PromotionFormProps) {
  const createPromotion = useAction(api.promotions.createPromotion);
  const updatePromotion = useAction(api.promotions.updatePromotion);

  const [clientUserId, setClientUserId] = useState<Id<"users"> | "">(
    initialClientUserId || ""
  );
  const [monthlyPrice, setMonthlyPrice] = useState<string>(
    initialMonthlyPrice?.toString() || ""
  );
  const [notes, setNotes] = useState(initialNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate annual price (monthlyPrice * 12 * 0.8)
  const annualPrice =
    monthlyPrice && !isNaN(parseFloat(monthlyPrice))
      ? parseFloat(monthlyPrice) * 12 * 0.8
      : 0;

  const monthlyPricePerMonth = annualPrice / 12;

  useEffect(() => {
    if (isOpen) {
      setClientUserId(initialClientUserId || "");
      setMonthlyPrice(initialMonthlyPrice?.toString() || "");
      setNotes(initialNotes || "");
    }
  }, [isOpen, initialClientUserId, initialMonthlyPrice, initialNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientUserId) {
      toast.error("Debes seleccionar un cliente");
      return;
    }

    const price = parseFloat(monthlyPrice);
    if (isNaN(price) || price < 10 || price > 140) {
      toast.error("El precio mensual debe estar entre 10€ y 140€");
      return;
    }

    setIsSubmitting(true);

    try {
      if (promotionId) {
        // Update existing promotion
        await updatePromotion({
          promotionId,
          monthlyPrice: price,
          notes: notes || undefined,
        });
        toast.success("Promoción actualizada con éxito");
      } else {
        // Create new promotion
        await createPromotion({
          clientUserId: clientUserId as Id<"users">,
          monthlyPrice: price,
          notes: notes || undefined,
        });
        toast.success("Promoción creada con éxito");
      }

      // Reset form
      setClientUserId("");
      setMonthlyPrice("");
      setNotes("");
      onClose();
    } catch (error: any) {
      console.error("Error saving promotion:", error);
      toast.error(error.message || "Error al guardar la promoción");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              {promotionId ? "Editar Promoción" : "Crear Nueva Promoción"}
            </div>
          </DialogTitle>
          <DialogDescription>
            {promotionId
              ? "Modifica los detalles de la promoción"
              : "Crea una promoción personalizada para un cliente. El precio anual se calculará automáticamente (20% de descuento)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Select
              value={clientUserId.toString()}
              onValueChange={(value) => setClientUserId(value as Id<"users">)}
              disabled={!!initialClientUserId || !!promotionId}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {referredClients.length === 0 ? (
                  <SelectItem value="no-clients" disabled>
                    No hay clientes disponibles
                  </SelectItem>
                ) : (
                  referredClients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name ?? client.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {referredClients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No tienes clientes referidos disponibles
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyPrice">Precio Mensual (€) *</Label>
            <Input
              id="monthlyPrice"
              type="number"
              min="10"
              max="140"
              step="0.01"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              placeholder="60.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              Precio entre 10€ y 140€
            </p>
          </div>

          {monthlyPrice && !isNaN(parseFloat(monthlyPrice)) && (
            <div className="bg-muted rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Precio Anual Calculado
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total anual:</span>
                  <span className="font-semibold text-foreground">
                    {annualPrice.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    €
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Equivalente mensual:
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {monthlyPricePerMonth.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    €/mes
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                  <span>Descuento aplicado:</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    20% menos que el mensual
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre esta promoción..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !clientUserId}>
              {isSubmitting
                ? "Guardando..."
                : promotionId
                  ? "Actualizar Promoción"
                  : "Crear Promoción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
