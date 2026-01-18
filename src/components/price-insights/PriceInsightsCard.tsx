import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Lock, BarChart3, Eye } from "lucide-react";
import { useHasActivePlan } from "@/hooks/use-has-active-plan";
import { PriceInsightResult } from "@/services/priceInsightsService";
import { cn } from "@/lib/utils";

interface PriceInsightsCardProps {
  insights: PriceInsightResult | null;
  isLoading?: boolean;
  city?: string;
  neighborhood?: string;
  propertyType?: string;
  showTeaser?: boolean;
}

export function PriceInsightsCard({
  insights,
  isLoading,
  city,
  neighborhood,
  propertyType,
  showTeaser = false,
}: PriceInsightsCardProps) {
  const { data: hasActivePlan = false } = useHasActivePlan();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Análisis de Precio por Zona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.sample_size === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Análisis de Precio por Zona
          </CardTitle>
          <CardDescription>
            No hay suficientes datos para calcular el análisis en esta zona
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Si no tiene plan activo, mostrar teaser
  if (!hasActivePlan || showTeaser) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Análisis de Precio por Zona
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <Lock className="w-3 h-3" />
              Premium
            </Badge>
          </div>
          <CardDescription>
            {city && propertyType
              ? `Precios en ${city}${neighborhood ? ` - ${neighborhood}` : ""} para ${propertyType}s`
              : "Conoce el precio promedio de arriendo en tu zona"}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Precio promedio:</span>
              <span className="font-semibold text-lg blur-sm select-none">
                ${insights.average_price.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rango recomendado:</span>
              <span className="font-semibold blur-sm select-none">
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
              Desbloquea el análisis completo de precios con un plan premium. Obtén insights detallados,
              comparaciones y recomendaciones precisas para tomar mejores decisiones.
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

  // Usuario con plan activo - mostrar datos completos
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Análisis de Precio por Zona
        </CardTitle>
        <CardDescription>
          {city && propertyType
            ? `Precios en ${city}${neighborhood ? ` - ${neighborhood}` : ""} para ${propertyType}s`
            : "Análisis basado en inmuebles comparables"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Precio Promedio</p>
            <p className="text-2xl font-bold text-foreground">
              ${insights.average_price.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Precio Mediana</p>
            <p className="text-2xl font-bold text-foreground">
              ${insights.median_price.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Rango recomendado */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rango Recomendado</span>
            <span className="font-semibold">
              ${insights.recommended_min.toLocaleString()} - ${insights.recommended_max.toLocaleString()}
            </span>
          </div>
          <Progress
            value={
              ((insights.recommended_max - insights.recommended_min) /
                (insights.max_price - insights.min_price)) *
              100
            }
            className="h-2"
          />
        </div>

        {/* Rango completo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rango de Precios</span>
            <span className="font-semibold">
              ${insights.min_price.toLocaleString()} - ${insights.max_price.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Comparación si está disponible */}
        {insights.price_comparison && (
          <div
            className={cn(
              "p-4 rounded-lg border",
              insights.price_comparison.status === "fair"
                ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                : insights.price_comparison.status === "below"
                ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                : "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {insights.price_comparison.status === "fair" ? (
                <Minus className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : insights.price_comparison.status === "below" ? (
                <TrendingDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              )}
              <span className="font-semibold text-sm">
                {insights.price_comparison.status === "fair"
                  ? "Precio justo"
                  : insights.price_comparison.status === "below"
                  ? "Por debajo del promedio"
                  : "Por encima del promedio"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {Math.abs(insights.price_comparison.percentage_diff).toFixed(1)}%{" "}
              {insights.price_comparison.percentage_diff > 0 ? "por encima" : "por debajo"} del
              promedio del mercado
            </p>
          </div>
        )}

        {/* Muestra de datos */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Basado en {insights.sample_size} inmueble{insights.sample_size !== 1 ? "s" : ""}{" "}
            comparable{insights.sample_size !== 1 ? "s" : ""} en esta zona
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
