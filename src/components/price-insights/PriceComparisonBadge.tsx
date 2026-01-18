import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Lock } from "lucide-react";
import { useHasActivePlan } from "@/hooks/use-has-active-plan";
import { PriceInsightResult } from "@/services/priceInsightsService";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface PriceComparisonBadgeProps {
  insights: PriceInsightResult | null;
  isLoading?: boolean;
}

export function PriceComparisonBadge({
  insights,
  isLoading,
}: PriceComparisonBadgeProps) {
  const { data: hasActivePlan = false } = useHasActivePlan();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <div className="w-3 h-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
        Analizando...
      </Badge>
    );
  }

  if (!insights || !insights.price_comparison) {
    return null;
  }

  // Si no tiene plan activo, mostrar badge bloqueado
  if (!hasActivePlan) {
    return (
      <Link to="/planes">
        <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
          <Lock className="w-3 h-3" />
          Comparación premium
        </Badge>
      </Link>
    );
  }

  // Usuario con plan activo - mostrar comparación
  const { status, percentage_diff } = insights.price_comparison;
  const absDiff = Math.abs(percentage_diff);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        status === "fair"
          ? "border-green-500 text-green-700 dark:text-green-400"
          : status === "below"
          ? "border-blue-500 text-blue-700 dark:text-blue-400"
          : "border-orange-500 text-orange-700 dark:text-orange-400"
      )}
    >
      {status === "fair" ? (
        <Minus className="w-3 h-3" />
      ) : status === "below" ? (
        <TrendingDown className="w-3 h-3" />
      ) : (
        <TrendingUp className="w-3 h-3" />
      )}
      <span>
        {absDiff.toFixed(1)}%{" "}
        {status === "fair"
          ? "precio justo"
          : percentage_diff > 0
          ? "por encima"
          : "por debajo"}
      </span>
    </Badge>
  );
}
