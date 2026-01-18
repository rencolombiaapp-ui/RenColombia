# Textos de UI para Análisis de Precios

## 📋 Resumen

Este documento describe los textos de UI generados dinámicamente según:
- **source**: `"own"` (datos propios) vs `"market"` (fallback externo)
- **analysis_level**: `"city"` vs `"neighborhood"` vs `"area"`
- **hasActivePlan**: `true` (PRO) vs `false` (no PRO)

## 🎯 Principios de Diseño

- **Claros**: Mensajes directos y fáciles de entender
- **Cortos**: Textos concisos sin información innecesaria
- **Honestos**: Transparencia sobre la fuente y precisión de los datos

---

## 📊 Textos por Escenario

### 1. Datos Propios (`source: "own"`)

#### Usuario NO PRO

**Título:**
```
Análisis de Precio por Zona
```

**Descripción:**
```
Precios en [Ciudad] para [tipo de inmueble]s
Precios en [Barrio], [Ciudad] para [tipo de inmueble]s
```

**Muestra de datos:**
```
Basado en X inmuebles comparables en esta zona
```

**Badge de fuente:**
- No se muestra (datos propios)

**Disclaimer:**
- No se muestra (usuario no PRO)

---

#### Usuario PRO

**Título:**
```
Análisis de Precio por Zona
```

**Descripción:**
```
Precios en [Ciudad] para [tipo de inmueble]s
Precios en [Barrio], [Ciudad] para [tipo de inmueble]s
```

**Muestra de datos:**
```
Basado en X inmuebles comparables en [Barrio]
Basado en X inmuebles comparables en [Ciudad]
```

**Badge de fuente:**
```
Datos RenColombia
```
*Tooltip: "Análisis calculado con datos reales de propiedades publicadas en RenColombia"*

**Disclaimer (solo si sample_size < 10):**
```
Análisis basado en muestra limitada. Considera características específicas de tu inmueble.
```
*Solo si sample_size < 5:*
```
Análisis basado en muestra pequeña. Los resultados pueden variar según características específicas del inmueble.
```

---

### 2. Datos Externos (`source: "market"`)

#### Usuario NO PRO

**Título:**
```
Análisis de Precio por Zona
```

**Descripción:**
```
Precios estimados en [Ciudad] para [tipo de inmueble]s
Precios estimados en [Barrio], [Ciudad] para [tipo de inmueble]s
```

**Muestra de datos:**
```
Basado en datos agregados del mercado (X inmuebles)
```

**Badge de fuente:**
```
Datos externos
```
*Tooltip: "Estos datos provienen de fuentes externas de análisis de mercado"*

**Disclaimer:**
```
Estimación basada en datos agregados. Puede variar según características específicas del inmueble.
```

---

#### Usuario PRO - Nivel Ciudad (`analysis_level: "city"`)

**Título:**
```
Análisis de Precio por Zona
```

**Descripción:**
```
Precios estimados en [Ciudad] para [tipo de inmueble]s
```

**Muestra de datos:**
```
Basado en análisis a nivel de ciudad (X inmuebles en [Ciudad])
```

**Badge de fuente:**
```
Estimado - Ciudad
```
*Tooltip: "Estos datos provienen de fuentes externas de análisis de mercado. Los datos propios de RenColombia son insuficientes en esta zona."*

**Disclaimer:**
```
Estimación a nivel de ciudad basada en datos agregados. Para mayor precisión, considera características específicas del inmueble y barrio.
```

---

#### Usuario PRO - Nivel Barrio (`analysis_level: "neighborhood"`)

**Título:**
```
Análisis de Precio por Zona
```

**Descripción:**
```
Precios estimados en [Barrio], [Ciudad] para [tipo de inmueble]s
```

**Muestra de datos:**
```
Basado en análisis a nivel de barrio (X inmuebles en [Barrio])
```

**Badge de fuente:**
```
Estimado - Barrio
```
*Tooltip: "Estos datos provienen de fuentes externas de análisis de mercado. Los datos propios de RenColombia son insuficientes en esta zona."*

**Disclaimer:**
```
Estimación a nivel de barrio basada en datos agregados. Considera características específicas de tu inmueble.
```

---

#### Usuario PRO - Nivel Área (`analysis_level: "area"`)

**Título:**
```
Análisis de Precio por Zona
```

**Descripción:**
```
Precios estimados en [Ciudad] para [tipo de inmueble]s
```

**Muestra de datos:**
```
Basado en análisis por área específica (X inmuebles)
```

**Badge de fuente:**
```
Estimado - Área
```
*Tooltip: "Estos datos provienen de fuentes externas de análisis de mercado. Los datos propios de RenColombia son insuficientes en esta zona."*

**Disclaimer:**
```
Estimación por área específica basada en datos agregados. Considera características específicas de tu inmueble.
```

---

## 💡 Textos para Recomendación de Precio

### Datos Propios (`source: "own"`)

**Título:**
```
Recomendación de Precio
```

**Descripción:**
```
Basado en X inmuebles comparables en [Ciudad]
```

**Disclaimer (solo PRO, sample_size < 5):**
```
Recomendación basada en muestra pequeña. Considera características específicas de tu inmueble.
```

---

### Datos Externos (`source: "market"`)

#### Usuario NO PRO

**Título:**
```
Recomendación de Precio
```

**Descripción:**
```
Estimación basada en datos del mercado (X inmuebles)
```

**Badge:**
```
Estimación externa
```

---

#### Usuario PRO - Nivel Ciudad

**Título:**
```
Recomendación de Precio
```

**Descripción:**
```
Estimación basada en análisis agregado a nivel de ciudad (X inmuebles)
```

**Disclaimer:**
```
Recomendación estimada a nivel de ciudad. Considera características específicas de tu inmueble para ajustar el precio.
```

---

#### Usuario PRO - Nivel Barrio

**Título:**
```
Recomendación de Precio
```

**Descripción:**
```
Estimación basada en análisis agregado a nivel de barrio (X inmuebles en [Barrio])
```

**Disclaimer:**
```
Recomendación estimada a nivel de barrio. Considera características específicas de tu inmueble para ajustar el precio.
```

---

#### Usuario PRO - Nivel Área

**Título:**
```
Recomendación de Precio
```

**Descripción:**
```
Estimación basada en análisis agregado por área específica (X inmuebles)
```

**Disclaimer:**
```
Recomendación estimada por área específica. Considera características específicas de tu inmueble para ajustar el precio.
```

---

## 🎨 Badges y Estados Visuales

### Badges de Fuente

| Source | Analysis Level | Badge Text | Color |
|--------|---------------|------------|-------|
| `own` | - | No se muestra | - |
| `market` | `city` | "Estimado - Ciudad" | Outline |
| `market` | `neighborhood` | "Estimado - Barrio" | Outline |
| `market` | `area` | "Estimado - Área" | Outline |

### Tooltips Informativos

- **Datos propios (PRO)**: "Análisis calculado con datos reales de propiedades publicadas en RenColombia"
- **Datos externos**: "Estos datos provienen de fuentes externas de análisis de mercado. Los datos propios de RenColombia son insuficientes en esta zona."

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Datos Propios, Usuario PRO, Barrio

```
Título: Análisis de Precio por Zona
Descripción: Precios en Chapinero, Bogotá para apartamentos
Muestra: Basado en 15 inmuebles comparables en Chapinero
Badge: Datos RenColombia
```

### Ejemplo 2: Datos Externos, Usuario PRO, Nivel Ciudad

```
Título: Análisis de Precio por Zona
Descripción: Precios estimados en Medellín para casas
Muestra: Basado en análisis a nivel de ciudad (50 inmuebles en Medellín)
Badge: Estimado - Ciudad
Disclaimer: Estimación a nivel de ciudad basada en datos agregados. 
            Para mayor precisión, considera características específicas 
            del inmueble y barrio.
```

### Ejemplo 3: Datos Externos, Usuario NO PRO

```
Título: Análisis de Precio por Zona
Descripción: Precios estimados en Cali para apartamentos
Muestra: Basado en datos agregados del mercado (30 inmuebles)
Badge: Datos externos
Disclaimer: Estimación basada en datos agregados. Puede variar según 
            características específicas del inmueble.
```

---

## 🔧 Implementación

Los textos se generan usando las funciones en `src/lib/priceInsightsTexts.ts`:

```typescript
import { getPriceInsightTexts, getSourceBadgeText, getSampleSizeText } from "@/lib/priceInsightsTexts";

const texts = getPriceInsightTexts(insights, city, neighborhood, propertyType, hasActivePlan);
const badge = getSourceBadgeText(insights.source, insights.analysis_level);
const sampleText = getSampleSizeText(insights, neighborhood, city);
```

---

## ✅ Checklist de Transparencia

- ✅ Siempre indica si los datos son propios o externos
- ✅ Muestra el nivel de análisis (ciudad/barrio/área) cuando aplica
- ✅ Incluye disclaimer cuando la muestra es pequeña o datos son externos
- ✅ Usa lenguaje honesto ("estimado", "basado en", "puede variar")
- ✅ Diferencia claramente entre usuarios PRO y no PRO
