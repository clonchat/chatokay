"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Check, Crown, Calendar, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { PromotionBanner } from "@/components/promotion-banner";

export default function SuscripcionesPage() {
  const subscription = useQuery(api.subscriptions.getCurrentUserSubscription);
  const promotion = useQuery(api.promotions.getClientPromotion);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const createPortalSession = useAction(api.stripe.createPortalSession);
  const syncSubscription = useAction(api.stripe.syncSubscriptionFromStripe);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for success/canceled params from Stripe redirect
    if (searchParams.get("success") === "true") {
      toast.success("¡Suscripción activada con éxito!");
    }
    if (searchParams.get("canceled") === "true") {
      toast.error("Pago cancelado");
    }
  }, [searchParams]);

  const handleSubscribe = async (planType: "monthly" | "annual") => {
    setIsLoading(true);
    try {
      const { url } = await createCheckoutSession({ planType });
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Error al iniciar el proceso de pago");
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      toast.error("Error al abrir el portal de gestión");
      setIsLoading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!subscription?.trialEndDate) return null;
    const now = Date.now();
    const endDate = subscription.trialEndDate;
    const diff = endDate - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();
  const isTrialActive =
    subscription?.status === "trial" && daysRemaining && daysRemaining > 0;
  const isActive = subscription?.status === "active";
  const isExpired = !isTrialActive && !isActive;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Suscripciones</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu suscripción y elige el plan que mejor se adapte a tu
          negocio
        </p>
      </div>

      {/* Promotion Banner */}
      <PromotionBanner />

      {/* Plans */}
      {!isActive && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Monthly Plan */}
          <Card className="relative flex flex-col">
            <CardHeader>
              <CardTitle>Plan Mensual</CardTitle>
              <CardDescription>Pago mensual recurrente</CardDescription>
              <div className="mt-4">
                {promotion ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground line-through text-lg">
                        140€
                      </span>
                      <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                        {(promotion.monthlyPrice / 100).toLocaleString(
                          "es-ES",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                        €
                      </span>
                      <span className="text-muted-foreground">/mes</span>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                      Promoción aplicada
                    </Badge>
                  </div>
                ) : (
                  <>
                    <span className="text-4xl font-bold">140€</span>
                    <span className="text-muted-foreground">/mes</span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    Acceso completo a todas las funciones
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Chatbot personalizado con IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Subdominio personalizado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Integraciones ilimitadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Soporte prioritario</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button
                className="w-full"
                onClick={() => handleSubscribe("monthly")}
                disabled={isLoading}
              >
                Suscribirse ahora
              </Button>
            </CardFooter>
          </Card>

          {/* Annual Plan */}
          <Card className="relative border-primary flex flex-col">
            <div className="absolute top-4 right-4">
              <Badge className="bg-primary text-primary-foreground">
                Recomendado
              </Badge>
            </div>
            <CardHeader>
              <CardTitle>Plan Anual</CardTitle>
              <CardDescription>Pago anual con descuento</CardDescription>
              <div className="mt-4">
                {promotion ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground line-through text-lg">
                        120€
                      </span>
                      <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                        {(promotion.annualPrice / 12 / 100).toLocaleString(
                          "es-ES",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                        €
                      </span>
                      <span className="text-muted-foreground">/mes</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Facturado anualmente (
                      {(promotion.annualPrice / 100).toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      €/año)
                    </p>
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                      Promoción aplicada
                    </Badge>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">120€</span>
                      <span className="text-muted-foreground">/mes</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Facturado anualmente (1.440€/año)
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-2">
                      Ahorra 240€ al año
                    </p>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    Acceso completo a todas las funciones
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Chatbot personalizado con IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Subdominio personalizado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Integraciones ilimitadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Soporte prioritario</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold">
                    20% de descuento
                  </span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button
                className="w-full"
                variant="default"
                onClick={() => handleSubscribe("annual")}
                disabled={isLoading}
              >
                Suscribirse ahora
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estado de tu suscripción</CardTitle>
              <CardDescription>
                Información sobre tu plan actual
              </CardDescription>
            </div>
            {isActive && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                <Crown className="h-3 w-3 mr-1" />
                Pro
              </Badge>
            )}
            {isTrialActive && (
              <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                Free
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="text-white">
                <AlertCircle className="h-3 w-3 mr-1" />
                Expirada
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTrialActive && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Período de prueba activo
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Te quedan{" "}
                    <strong>
                      {daysRemaining} día{daysRemaining !== 1 ? "s" : ""}
                    </strong>{" "}
                    de prueba gratuita. Después de este período, necesitarás una
                    suscripción para continuar usando el servicio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isActive && (
            <div>
              {subscription.planType && (
                <p className="text-sm text-muted-foreground">
                  Plan:{" "}
                  <strong className="text-foreground">
                    {subscription.planType === "annual" ? "Anual" : "Mensual"}
                  </strong>
                </p>
              )}
              {subscription.currentPeriodEnd &&
                typeof subscription.currentPeriodEnd === "number" &&
                !isNaN(subscription.currentPeriodEnd) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Próxima renovación:{" "}
                    <strong className="text-foreground">
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </strong>
                  </p>
                )}
              {(!subscription.currentPeriodEnd ||
                typeof subscription.currentPeriodEnd !== "number" ||
                isNaN(subscription.currentPeriodEnd)) && (
                <p className="text-sm text-muted-foreground mt-1">
                  Suscripción activa
                </p>
              )}
            </div>
          )}

          {isExpired && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">
                    Suscripción expirada
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Tu período de prueba ha finalizado. Suscríbete ahora para
                    continuar usando todas las funciones.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        {isActive && (
          <CardFooter className="flex gap-2">
            <Button onClick={handleManageSubscription} disabled={isLoading}>
              Gestionar suscripción
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setIsLoading(true);
                try {
                  const result = await syncSubscription();
                  toast.success(result.message);
                  // Refresh subscription data
                  window.location.reload();
                } catch (error) {
                  console.error("Error syncing subscription:", error);
                  toast.error("Error al sincronizar suscripción");
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              Sincronizar desde Stripe
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
