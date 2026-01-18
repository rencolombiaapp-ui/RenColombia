# Integración del Módulo de Análisis de Precios

## Archivos Creados

### Backend
- `supabase/migrations/00013_create_price_insights.sql` - Tabla de cache para insights
- `src/services/priceInsightsService.ts` - Servicio de cálculo de precios

### Hooks
- `src/hooks/use-price-insights.ts` - Hook para obtener insights
- `src/hooks/use-has-active-plan.ts` - Hook para verificar plan activo

### Componentes
- `src/components/price-insights/PriceInsightsCard.tsx` - Card principal de análisis
- `src/components/price-insights/PriceComparisonBadge.tsx` - Badge de comparación
- `src/components/price-insights/PriceRecommendationCard.tsx` - Card de recomendación
- `src/components/home/PriceInsightsSection.tsx` - Sección para landing

## Integración en Publish.tsx

Agregar después del campo de precio (alrededor de donde se muestra el input de precio):

```tsx
import { PriceRecommendationCard } from "@/components/price-insights/PriceRecommendationCard";
import { usePropertyPriceInsights } from "@/hooks/use-price-insights";

// Dentro del componente, después de los estados del formulario:
const { data: priceInsights, isLoading: isLoadingInsights } = usePropertyPriceInsights(
  formData.city || null,
  formData.neighborhood || null,
  formData.property_type || null,
  formData.area || null,
  formData.price ? Number(formData.price) : null
);

// En el JSX, después del campo de precio:
{formData.city && formData.property_type && (
  <PriceRecommendationCard
    insights={priceInsights || null}
    isLoading={isLoadingInsights}
    currentPrice={formData.price ? Number(formData.price) : undefined}
    city={formData.city}
    propertyType={formData.property_type}
  />
)}
```

## Integración en PropertyDetail.tsx

Agregar el badge de comparación cerca del precio del inmueble:

```tsx
import { PriceComparisonBadge } from "@/components/price-insights/PriceComparisonBadge";
import { usePropertyPriceInsights } from "@/hooks/use-price-insights";

// Dentro del componente, obtener los datos de la propiedad:
const { data: property } = useProperty(/* ... */);

const { data: priceInsights, isLoading: isLoadingInsights } = usePropertyPriceInsights(
  property?.city || null,
  property?.neighborhood || null,
  property?.property_type || null,
  property?.area || null,
  property?.price ? Number(property.price) : null
);

// En el JSX, cerca del precio:
<div className="flex items-center gap-2">
  <span className="text-3xl font-bold">${property?.price?.toLocaleString()}</span>
  <PriceComparisonBadge
    insights={priceInsights || null}
    isLoading={isLoadingInsights}
  />
</div>
```

## Estado Actual

✅ Landing (Index.tsx) - Integrado
⏳ Publicar (Publish.tsx) - Pendiente de integración manual
⏳ Detalle (PropertyDetail.tsx) - Pendiente de integración manual

## Próximos Pasos

1. Ejecutar la migración `00013_create_price_insights.sql` en Supabase
2. Integrar componentes en Publish.tsx según las instrucciones arriba
3. Integrar componentes en PropertyDetail.tsx según las instrucciones arriba
4. Probar el flujo completo

## Notas

- El control de acceso está implementado: usuarios sin plan ven teasers
- Los cálculos usan datos reales de RenColombia
- El cache dura 24 horas para optimizar rendimiento
- Los outliers se eliminan usando el método IQR
