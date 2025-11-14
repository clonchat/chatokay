"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Tag, Sparkles, TrendingDown } from "lucide-react";

export function PromotionBanner() {
  const promotion = useQuery(api.promotions.getClientPromotion);
  const subscription = useQuery(api.subscriptions.getCurrentUserSubscription);

  // Don't show banner if there's no promotion or if user has an active subscription
  if (!promotion || !promotion.salesUser) {
    return null;
  }

  // Hide banner if user has an active subscription (active or trial)
  if (subscription) {
    const now = Date.now();
    const isActiveSubscription =
      subscription.status === "active" ||
      (subscription.status === "trial" &&
        subscription.trialEndDate &&
        subscription.trialEndDate > now);

    if (isActiveSubscription) {
      return null;
    }
  }

  // Calculate discount percentage
  const standardMonthlyPrice = 140;
  const promotionalMonthlyPrice = promotion.monthlyPrice / 100;
  const discountPercent = Math.round(
    ((standardMonthlyPrice - promotionalMonthlyPrice) / standardMonthlyPrice) * 100
  );

  const standardAnnualPrice = 1440;
  const promotionalAnnualPrice = promotion.annualPrice / 100;
  const annualDiscountPercent = Math.round(
    ((standardAnnualPrice - promotionalAnnualPrice) / standardAnnualPrice) * 100
  );

  return (
    <Card className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 border-0 shadow-lg overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                <span className="text-white font-bold text-sm uppercase tracking-wide">
                  ¡Promoción Especial!
                </span>
              </div>
              <Badge className="bg-yellow-400 text-yellow-900 font-bold text-xs px-2 py-1 animate-bounce">
                -{discountPercent}%
              </Badge>
            </div>
            
            <h3 className="text-white text-xl font-bold mb-2 drop-shadow-lg">
              Promoción aplicada por: {promotion.salesUser.name || "Comercial"}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="h-4 w-4 text-yellow-300" />
                  <span className="text-white/90 text-xs font-medium">Plan Mensual</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/60 line-through text-sm">
                    {standardMonthlyPrice.toLocaleString("es-ES")}€
                  </span>
                  <span className="text-white text-2xl font-bold">
                    {promotionalMonthlyPrice.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}€
                  </span>
                  <span className="text-yellow-300 text-xs font-semibold">
                    /mes
                  </span>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-yellow-300" />
                  <span className="text-white/90 text-xs font-medium">Plan Anual</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/60 line-through text-sm">
                    {standardAnnualPrice.toLocaleString("es-ES")}€
                  </span>
                  <span className="text-white text-2xl font-bold">
                    {promotionalAnnualPrice.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}€
                  </span>
                  <span className="text-yellow-300 text-xs font-semibold">
                    /año
                  </span>
                </div>
                <div className="mt-1 text-yellow-300 text-xs font-medium">
                  ({(promotionalAnnualPrice / 12).toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}€/mes)
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full border-4 border-white/30">
            <Sparkles className="h-12 w-12 text-yellow-300 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

