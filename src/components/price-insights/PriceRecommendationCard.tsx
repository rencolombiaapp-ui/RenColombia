import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, TrendingDown, Minus, DollarSign, AlertCircle } from "lucide-react";
import { useHasActivePlan } from "@/hooks/use-has-active-plan";
import { PriceInsightResult } from "@/services/priceInsightsService";
import { cn } from "@/lib/utils";

interface PriceRecommendationCardProps {
  insights: PriceInsightResult | null;
  isLoading?: boolean;
  currentPrice?: number;
  city?: string;
  propertyType?: string;
}

export function PriceRecommendationCard({
  insights,
  isLoading,
  currentPrice,
  city,
  propertyType,
}: PriceRecommendationCardProps) {
  const { data: hasActivePlan = false } = useHasActivePlan();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5" />
            Recomendación de Precio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.sample_size === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5" />
            Recomendación de Precio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>No hay suficientes datos para recomendar un precio en esta zona</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si no tiene plan activo
  if (!hasActivePlan) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5" />
              Recomendación de Precio
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <Lock className="w-3 h-3" />
              Premium
            </Badge>
          </div>
          <CardDescription>
            Obtén recomendaciones precisas basadas en el mercado
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Precio recomendado:</span>
              <span className="font-semibold text-lg blur-sm select-none">
                ${insights.recommended_min.toLocaleString()} - ${insights.recommended_max.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Basado en:</span>
              <span className="font-semibold">{insights.sample_size} inmuebles</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Desbloquea recomendaciones de precio precisas con un plan premium. Obtén insights
              detallados para fijar el precio óptimo de tu inmueble.
            </p>
            <Link to="/planes">
              <Button className="w-full" variant="default">
                Ver planes disponibles
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Usuario con plan activo
  const isInRange =
    currentPrice &&
    currentPrice >= insights.recommended_min &&
    currentPrice <= insights.recommended_max;

  const comparison = insights.price_comparison;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="w-5 h-5" />
          Recomendación de Precio
        </CardTitle>
        <CardDescription>
          Basado en {insights.sample_size} inmueble{insights.sample_size !== 1 ? "s" : ""}{" "}
          comparable{insights.sample_size !== 1 ? "s" : ""} en esta zona
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Rango Recomendado</span>
            <span className="font-bold text-lg text-foreground">
              ${insights.recommended_min.toLocaleString()} - ${insights.recommended_max.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Precio promedio:</span>
            <span className="font-semibold">${insights.average_price.toLocaleString()}</span>
          </div>
        </div>

        {currentPrice && comparison && (
          <div
            className={cn(
              "p-3 rounded-lg border",
              comparison.status === "fair"
                ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                : comparison.status === "below"
                ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                : "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {comparison.status === "fair" ? (
                <Minus className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : comparison.status === "below" ? (
                <TrendingDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              )}
              <span className="font-semibold text-sm">
                Tu precio está{" "}
                {comparison.status === "fair"
                  ? "dentro del rango recomendado"
                  : comparison.status === "below"
                  ? "por debajo del promedio"
                  : "por encima del promedio"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.abs(comparison.percentage_diff).toFixed(1)}%{" "}
              {comparison.percentage_diff > 0 ? "por encima" : "por debajo"} del promedio del
              mercado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
