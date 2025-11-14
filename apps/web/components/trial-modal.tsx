"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Calendar, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export function TrialModal() {
  const subscription = useQuery(api.subscriptions.getCurrentUserSubscription);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Show modal if user has active trial subscription and hasn't seen it yet
    if (subscription?.status === "trial" && subscription.trialEndDate) {
      const now = Date.now();
      const isTrialActive = subscription.trialEndDate > now;

      if (isTrialActive) {
        const hasSeenModal = localStorage.getItem("trial-modal-seen");
        if (!hasSeenModal) {
          setIsOpen(true);
        }
      }
    }
  }, [subscription]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("trial-modal-seen", "true");
  };

  const handleGoToSubscriptions = () => {
    setIsOpen(false);
    localStorage.setItem("trial-modal-seen", "true");
    router.push("/suscripciones");
  };

  const getDaysRemaining = () => {
    if (!subscription?.trialEndDate) return 7;
    const now = Date.now();
    const endDate = subscription.trialEndDate;
    const diff = endDate - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();
  const isTrialActive =
    subscription?.status === "trial" &&
    subscription.trialEndDate &&
    subscription.trialEndDate > Date.now();

  if (!subscription || !isTrialActive) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>¡Bienvenido a ChatOkay!</DialogTitle>
              <DialogDescription className="mt-1">
                Estás en modo Free con período de prueba
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Período de prueba activo
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Tienes{" "}
                  <strong>
                    {daysRemaining} día{daysRemaining !== 1 ? "s" : ""}
                  </strong>{" "}
                  de prueba gratuita para explorar todas las funciones de
                  ChatOkay.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Durante este período podrás:
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
              <li className="list-disc">Crear y personalizar tu chatbot</li>
              <li className="list-disc">
                Configurar servicios y disponibilidad
              </li>
              <li className="list-disc">Gestionar citas desde el dashboard</li>
              <li className="list-disc">Acceder a todas las integraciones</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Importante:</strong> Después del período de prueba,
              necesitarás suscribirte para continuar usando el servicio. Puedes
              gestionar tu suscripción en el apartado{" "}
              <strong>Suscripciones</strong> del menú.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Entendido
          </Button>
          <Button
            onClick={handleGoToSubscriptions}
            className="w-full sm:w-auto"
          >
            Ver planes de suscripción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
