# Integración con Datos DANE - Análisis de Precios RenColombia

## 📋 Resumen

Este documento describe la integración de datos del DANE (Departamento Administrativo Nacional de Estadística) como fuente secundaria de referencia macroeconómica para el análisis de precios de arriendo en RenColombia.

## ⚖️ Aspectos Legales y de Transparencia

### Reglas Obligatorias

1. **NO redistribución de datos crudos del DANE**
   - Solo utilizamos datos agregados y referencias macroeconómicas
   - Los datos se usan únicamente para validación y contexto
   - Nunca afirmamos que los precios provienen directamente del DANE

2. **Atribución correcta**
   - Siempre citamos: "DANE – análisis agregado y elaboración propia"
   - Texto completo: "Fuente: Datos del mercado RenColombia y DANE (análisis agregado y elaboración propia)"
   - Los datos del marketplace son la fuente primaria

3. **Uso no invasivo**
   - El DANE NO reemplaza los datos reales del marketplace
   - Solo actúa como referencia macroeconómica
   - Se usa para validar coherencia y detectar desviaciones extremas

## 🏗️ Arquitectura

### Fuentes de Información

#### Fuente Primaria (Microdatos)
- **Propiedades publicadas en RenColombia** (`properties`)
- Solo propiedades con `status = 'published'`
- Datos reales del marketplace

#### Fuente Secundaria (Macro Referencia)
- **Índices de precios del DANE**
- Datos agregados por ciudad y área metropolitana
- Uso permitido:
  - ✅ Análisis comparativo
  - ✅ Normalización
  - ✅ Ajustes de referencia
  - ✅ Contexto económico
- ❌ NO redistribución de datasets crudos

### Proceso de Análisis

```
1. Parámetros de entrada
   ↓
2. Verificación de caché
   ↓
3. Consulta de propiedades comparables (RenColombia)
   ↓
4. Filtrado de outliers (IQR)
   ↓
5. Cálculo de estadísticas
   ↓
6. Rango recomendado
   ↓
7. Validación con DANE (NO invasiva)
   ↓
8. Guardar en caché
```

### Validación DANE

El proceso de validación con DANE:

1. **Buscar datos de referencia DANE** para la ciudad y tipo de inmueble
2. **Calcular desviación porcentual**:
   ```
   deviation = ((precio_calculado - precio_DANE) / precio_DANE) * 100
   ```
3. **Determinar estado de coherencia**:
   - `coherent`: desviación < 10%
   - `slight_deviation`: desviación 10-20%
   - `significant_deviation`: desviación > 20%
   - `no_data`: sin datos DANE disponibles

4. **Contextualizar el resultado** sin reemplazar los datos del marketplace

## 📊 Estructura de Base de Datos

### Tabla: `price_insights`

Campos agregados para DANE:

```sql
dane_reference_price decimal(12, 2)        -- Precio de referencia DANE
dane_deviation_percentage decimal(5, 2)   -- Desviación porcentual
dane_coherence_status text                -- Estado de coherencia
dane_data_period text                     -- Período de datos DANE
data_sources jsonb                        -- Array de fuentes de datos
```

### Tabla: `dane_reference_data`

Almacena datos agregados de referencia del DANE:

```sql
CREATE TABLE dane_reference_data (
  id uuid PRIMARY KEY,
  city text NOT NULL,
  area_metropolitan text,
  property_type text,
  reference_price decimal(12, 2) NOT NULL,
  data_period text NOT NULL,
  source_url text,
  notes text,
  created_at timestamp,
  updated_at timestamp,
  expires_at timestamp NOT NULL,
  UNIQUE(city, property_type, data_period)
);
```

**IMPORTANTE**: Esta tabla NO contiene datos crudos del DANE, solo referencias agregadas para análisis comparativo.

## 🔧 Uso del Servicio

### Obtener datos de referencia DANE

```typescript
import { getDaneReferenceData } from "@/services/daneService";

const daneData = await getDaneReferenceData("Bogotá", "apartamento");
```

### Validar con DANE

```typescript
import { validateWithDane } from "@/services/daneService";

const validation = await validateWithDane(
  calculatedAverage,  // Precio promedio calculado
  "Bogotá",          // Ciudad
  "apartamento"      // Tipo de inmueble
);

// Resultado:
// {
//   reference_price: 2500000,
//   deviation_percentage: 5.2,
//   coherence_status: "coherent",
//   data_period: "2024-Q1",
//   source_url: "..."
// }
```

### Obtener atribución de fuentes

```typescript
import { getDataSourcesAttribution } from "@/services/daneService";

const attribution = getDataSourcesAttribution(hasDaneData);
// "Fuente: Datos del mercado RenColombia y DANE (análisis agregado y elaboración propia)"
```

## 📝 Poblar Datos DANE

### Script SQL de Ejemplo

Ver `docs/DANE_REFERENCE_DATA_EXAMPLE.sql` para un ejemplo de cómo poblar datos de referencia DANE.

**IMPORTANTE**: 
- Los datos deben obtenerse de fuentes oficiales del DANE
- Solo se almacenan datos agregados, nunca datos crudos
- Siempre incluir `source_url` y `data_period`
- Establecer `expires_at` según la frecuencia de actualización de los datos

### Formato de Datos

```sql
INSERT INTO dane_reference_data (
  city,
  property_type,
  reference_price,
  data_period,
  source_url,
  notes,
  expires_at
) VALUES (
  'Bogotá D.C.',
  'apartamento',
  2500000,
  '2024-Q1',
  'https://www.dane.gov.co/...',
  'Datos agregados del DANE para análisis comparativo',
  NOW() + INTERVAL '3 months'
);
```

## 🎨 Componentes UI

### PriceInsightsCard

Muestra análisis completo con atribución de fuentes:

```tsx
<PriceInsightsCard
  insights={insights}
  isLoading={isLoading}
  city={city}
  neighborhood={neighborhood}
  propertyType={propertyType}
/>
```

Incluye automáticamente:
- Atribución de fuentes en el footer
- Referencia DANE si está disponible
- Desviación porcentual respecto al DANE

### PriceRecommendationCard

Muestra recomendaciones con contexto DANE:

```tsx
<PriceRecommendationCard
  insights={insights}
  currentPrice={price}
  city={city}
  propertyType={propertyType}
/>
```

## ✅ Criterios de Calidad

- ✔ Estadísticas reproducibles
- ✔ Sin datos personales
- ✔ Sin redistribución de datos oficiales crudos
- ✔ Explicaciones claras para usuarios finales
- ✔ Coherente con planes y control de acceso
- ✔ Atribución correcta de fuentes
- ✔ Validación no invasiva

## 🔒 Control de Acceso

El acceso a datos DANE sigue las mismas reglas que el análisis de precios:

- **Sin plan PRO**: Ve teasers con datos difuminados
- **Con plan PRO**: Ve análisis completo incluyendo validación DANE

## 📚 Referencias

- [DANE - Índices de Precios de Vivienda](https://www.dane.gov.co/)
- [Política de Datos Abiertos del DANE](https://www.dane.gov.co/)

## ⚠️ Notas Importantes

1. **Los datos DANE son solo referencia**: Nunca reemplazan los datos reales del marketplace
2. **Actualización periódica**: Los datos DANE deben actualizarse según la frecuencia de publicación del DANE
3. **Validación de coherencia**: Si hay desviaciones significativas, revisar los datos del marketplace antes de alertar
4. **Transparencia**: Siempre mostrar claramente las fuentes de datos

## 🚀 Próximos Pasos

1. ✅ Migración SQL creada
2. ✅ Servicio DANE implementado
3. ✅ Integración en análisis de precios
4. ✅ Componentes UI actualizados
5. ⏳ Poblar datos iniciales de referencia DANE
6. ⏳ Implementar actualización automática de datos DANE
7. ⏳ Agregar alertas para desviaciones significativas
