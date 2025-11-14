"use client";

import { useState } from "react";
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
import { Badge } from "@workspace/ui/components/badge";
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PromotionForm } from "@/components/promotion-form";
import { Id } from "@workspace/backend/_generated/dataModel";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

export default function PromocionesPage() {
  const promotions = useQuery(api.promotions.getMyPromotions);
  const referredClients = useQuery(api.users.getMyReferredClients);
  const deletePromotion = useMutation(api.promotions.deletePromotion);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPromotionId, setEditingPromotionId] =
    useState<Id<"promotions"> | null>(null);
  const [deletingPromotionId, setDeletingPromotionId] =
    useState<Id<"promotions"> | null>(null);

  const activePromotions =
    promotions?.filter((p) => p.status === "active") || [];
  const canceledPromotions =
    promotions?.filter((p) => p.status === "canceled") || [];

  const handleEdit = (promotionId: Id<"promotions">) => {
    setEditingPromotionId(promotionId);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPromotionId) return;

    try {
      await deletePromotion({ promotionId: deletingPromotionId });
      toast.success("Promoción eliminada con éxito");
      setDeletingPromotionId(null);
    } catch (error: any) {
      console.error("Error deleting promotion:", error);
      toast.error(error.message || "Error al eliminar la promoción");
    }
  };

  const editingPromotion = editingPromotionId
    ? promotions?.find((p) => p._id === editingPromotionId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Promociones</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona promociones personalizadas para tus clientes
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Promoción
        </Button>
      </div>

      {/* Active Promotions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Promociones Activas ({activePromotions.length})
          </CardTitle>
          <CardDescription>
            Promociones actualmente aplicadas a tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePromotions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes promociones activas</p>
              <p className="text-sm mt-2">
                Crea una nueva promoción para empezar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-foreground">Cliente</th>
                    <th className="text-left p-3 text-foreground">Email</th>
                    <th className="text-right p-3 text-foreground">
                      Precio Mensual
                    </th>
                    <th className="text-right p-3 text-foreground">
                      Precio Anual
                    </th>
                    <th className="text-left p-3 text-foreground">Estado</th>
                    <th className="text-center p-3 text-foreground">
                      Utilizada
                    </th>
                    <th className="text-right p-3 text-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activePromotions.map((promotion) => (
                    <tr
                      key={promotion._id}
                      className="border-b border-border hover:bg-muted transition-colors"
                    >
                      <td className="p-3 font-medium text-foreground">
                        {promotion.client?.name || "Sin nombre"}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {promotion.client?.email || "-"}
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground">
                        {(promotion.monthlyPrice / 100).toLocaleString(
                          "es-ES",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                        €
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground">
                        {(promotion.annualPrice / 100).toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        €
                        <span className="text-xs text-muted-foreground ml-1">
                          (
                          {(promotion.annualPrice / 12 / 100).toLocaleString(
                            "es-ES",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                          €/mes)
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Activa
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {promotion.isUsed ? (
                          <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Sí</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">No</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(promotion._id)}
                            className="h-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setDeletingPromotionId(promotion._id)
                            }
                            className="h-8 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Canceled Promotions */}
      {canceledPromotions.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>
              Promociones Canceladas ({canceledPromotions.length})
            </CardTitle>
            <CardDescription>
              Historial de promociones canceladas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-foreground">Cliente</th>
                    <th className="text-left p-3 text-foreground">Email</th>
                    <th className="text-right p-3 text-foreground">
                      Precio Mensual
                    </th>
                    <th className="text-right p-3 text-foreground">
                      Precio Anual
                    </th>
                    <th className="text-left p-3 text-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {canceledPromotions.map((promotion) => (
                    <tr
                      key={promotion._id}
                      className="border-b border-border hover:bg-muted transition-colors opacity-60"
                    >
                      <td className="p-3 font-medium text-foreground">
                        {promotion.client?.name || "Sin nombre"}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {promotion.client?.email || "-"}
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground">
                        {(promotion.monthlyPrice / 100).toLocaleString(
                          "es-ES",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                        €
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground">
                        {(promotion.annualPrice / 100).toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        €
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">Cancelada</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promotion Form Modal */}
      <PromotionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPromotionId(null);
        }}
        clientUserId={editingPromotion?.clientUserId || null}
        promotionId={editingPromotionId}
        initialMonthlyPrice={
          editingPromotion ? editingPromotion.monthlyPrice / 100 : undefined
        }
        initialNotes={editingPromotion?.notes}
        referredClients={referredClients || []}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingPromotionId}
        onOpenChange={(open) => !open && setDeletingPromotionId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar promoción?</DialogTitle>
            <DialogDescription>
              Esta acción cancelará la promoción. El cliente ya no recibirá el
              descuento en futuras suscripciones. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingPromotionId(null)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
