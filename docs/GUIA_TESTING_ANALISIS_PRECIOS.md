# Guía de Testing - Análisis de Precios RenColombia

## 📋 Resumen

Esta guía te ayudará a probar todas las funcionalidades del análisis de precios, incluyendo:
- ✅ Integración con DANE
- ✅ Fallback con market-stats
- ✅ Textos de UI dinámicos
- ✅ Diferentes escenarios (PRO vs no PRO)

---

## 🔧 Paso 1: Preparación del Entorno

### 1.1 Verificar Migraciones SQL

Asegúrate de que todas las migraciones estén aplicadas:

```bash
# Verificar que existan las migraciones
ls supabase/migrations/ | grep -E "(00013|00024)"
```

**Migraciones necesarias:**
- `00013_create_price_insights.sql` - Tabla de caché de análisis
- `00024_add_dane_integration.sql` - Integración con DANE

### 1.2 Aplicar Migraciones en Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Ejecuta las migraciones en orden:
   ```sql
   -- Primero ejecutar 00013 si no está aplicada
   -- Luego ejecutar 00024
   ```

### 1.3 Configurar Variables de Entorno

Verifica o crea un archivo `.env.local`:

```env
# Supabase (ya deberías tenerlo)
VITE_SUPABASE_URL=tu_url_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Market Stats API (opcional, para testing)
VITE_MARKET_STATS_API_URL=https://api.rencolombia.internal/v1
```

---

## 📊 Paso 2: Preparar Datos de Prueba

### 2.1 Crear Propiedades de Prueba

Necesitas propiedades publicadas para probar el análisis. Puedes usar el script SQL o crear desde la UI:

**Opción A: Desde la UI**
1. Inicia sesión como propietario
2. Ve a `/publicar`
3. Publica al menos 3-5 propiedades en la misma ciudad y tipo

**Opción B: Script SQL (más rápido)**

```sql
-- Crear propiedades de prueba en Bogotá
INSERT INTO public.properties (
  owner_id,
  title,
  description,
  city,
  neighborhood,
  property_type,
  price,
  bedrooms,
  bathrooms,
  area,
  status
) VALUES
  -- Propiedades con datos suficientes (sample_size >= 3)
  (
    'TU_USER_ID_AQUI', -- Reemplaza con tu user_id
    'Apartamento en Chapinero',
    'Hermoso apartamento',
    'Bogotá',
    'Chapinero',
    'apartamento',
    2500000,
    2,
    2,
    60,
    'published'
  ),
  (
    'TU_USER_ID_AQUI',
    'Apartamento en Chapinero 2',
    'Apartamento moderno',
    'Bogotá',
    'Chapinero',
    'apartamento',
    2800000,
    3,
    2,
    70,
    'published'
  ),
  (
    'TU_USER_ID_AQUI',
    'Apartamento en Chapinero 3',
    'Apartamento amplio',
    'Bogotá',
    'Chapinero',
    'apartamento',
    2300000,
    2,
    1,
    55,
    'published'
  ),
  -- Propiedades en otra zona (para probar fallback)
  (
    'TU_USER_ID_AQUI',
    'Casa en Usaquén',
    'Casa independiente',
    'Bogotá',
    'Usaquén',
    'casa',
    3500000,
    3,
    3,
    120,
    'published'
  );
```

### 2.2 Poblar Datos DANE (Opcional pero Recomendado)

Para probar la validación con DANE, inserta datos de referencia:

```sql
-- Insertar datos DANE de referencia para Bogotá
INSERT INTO public.dane_reference_data (
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
) ON CONFLICT (city, property_type, data_period) DO UPDATE
SET
  reference_price = EXCLUDED.reference_price,
  updated_at = NOW(),
  expires_at = EXCLUDED.expires_at;
```

---

## 🧪 Paso 3: Probar Escenarios

### Escenario 1: Datos Propios Suficientes (`source: "own"`, `sample_size >= 3`)

**Objetivo:** Verificar que funciona con datos propios cuando hay suficientes propiedades.

**Pasos:**
1. Ve a la página de inicio (`/`)
2. Navega a la sección "Conoce el precio de arriendo en tu zona"
3. Selecciona:
   - Departamento: Cundinamarca
   - Municipio: Bogotá
   - Tipo: Apartamento
   - Barrio: Chapinero (opcional)
4. Haz clic en buscar

**Resultado Esperado:**
- ✅ Card muestra análisis completo
- ✅ Muestra precio promedio, mediana, rango recomendado
- ✅ Texto: "Basado en X inmuebles comparables en Chapinero"
- ✅ Si eres PRO: Badge "Datos RenColombia" (opcional)
- ✅ Si hay datos DANE: Muestra referencia DANE
- ✅ `source: "own"` en el response

**Verificar en DevTools:**
```javascript
// En la consola del navegador, verificar el response
// Debería tener:
{
  source: "own",
  average_price: 2500000, // o similar
  sample_size: 3, // o más
  recommended_range: { min: ..., max: ... }
}
```

---

### Escenario 2: Datos Propios Insuficientes → Fallback Market-Stats

**Objetivo:** Verificar que usa market-stats cuando `sample_size < 3`.

**Pasos:**
1. Busca una zona con menos de 3 propiedades (o crea una nueva ciudad)
2. Ejemplo: Busca en una ciudad pequeña o barrio sin propiedades
3. O crea solo 1-2 propiedades en una zona específica

**Opción: Simular fallback sin datos**
1. Abre `src/services/priceInsightsService.ts`
2. Temporalmente cambia la condición:
   ```typescript
   // Cambiar de:
   if (result.sample_size >= 3) {
   // A:
   if (result.sample_size >= 10) { // Forzar fallback
   ```

**Resultado Esperado:**
- ✅ Card muestra análisis con datos de market-stats
- ✅ Badge: "Estimado - Ciudad" o "Estimado - Barrio"
- ✅ Texto: "Basado en análisis agregado a nivel de ciudad..."
- ✅ Disclaimer sobre estimación
- ✅ `source: "market"` en el response
- ✅ `analysis_level: "city" | "neighborhood" | "area"`

**Verificar en DevTools:**
```javascript
{
  source: "market",
  analysis_level: "city",
  recommended_range: { min: ..., max: ... },
  sample_size: 50 // Del market-stats
}
```

---

### Escenario 3: Validación con DANE

**Objetivo:** Verificar que la validación con DANE funciona correctamente.

**Pasos:**
1. Asegúrate de tener datos DANE en la BD (Paso 2.2)
2. Busca análisis en una ciudad con datos DANE (ej: Bogotá)
3. Verifica que aparezca la referencia DANE

**Resultado Esperado:**
- ✅ Footer muestra: "Referencia DANE: $X.XXX.XXX (2024-Q1)"
- ✅ Si hay desviación, muestra porcentaje
- ✅ `dane_validation` presente en el response
- ✅ `data_sources` incluye "DANE – análisis agregado y elaboración propia"

**Verificar en DevTools:**
```javascript
{
  dane_validation: {
    reference_price: 2500000,
    deviation_percentage: 5.2,
    coherence_status: "coherent",
    data_period: "2024-Q1"
  },
  data_sources: [
    "RenColombia Marketplace Data",
    "DANE – análisis agregado y elaboración propia"
  ]
}
```

---

### Escenario 4: Textos de UI según Source y Analysis Level

**Objetivo:** Verificar que los textos cambian según el contexto.

#### 4.1 Datos Propios, Usuario PRO

**Pasos:**
1. Inicia sesión con cuenta PRO
2. Busca análisis con datos propios suficientes
3. Verifica textos

**Resultado Esperado:**
- ✅ Título: "Análisis de Precio por Zona"
- ✅ Descripción: "Precios en [Barrio], [Ciudad] para apartamentos"
- ✅ Muestra: "Basado en X inmuebles comparables en [Barrio]"
- ✅ Badge: "Datos RenColombia" (con tooltip)

#### 4.2 Datos Externos, Usuario PRO, Nivel Ciudad

**Pasos:**
1. Inicia sesión con cuenta PRO
2. Busca análisis que use fallback (sample_size < 3)
3. Verifica textos

**Resultado Esperado:**
- ✅ Badge: "Estimado - Ciudad"
- ✅ Descripción: "Precios estimados en [Ciudad]..."
- ✅ Muestra: "Basado en análisis a nivel de ciudad..."
- ✅ Disclaimer: "Estimación a nivel de ciudad basada en datos agregados..."

#### 4.3 Datos Externos, Usuario NO PRO

**Pasos:**
1. Inicia sesión con cuenta NO PRO (o cierra sesión)
2. Busca análisis que use fallback
3. Verifica textos

**Resultado Esperado:**
- ✅ Badge: "Datos externos"
- ✅ Descripción: "Precios estimados..."
- ✅ Muestra: "Basado en datos agregados del mercado..."
- ✅ Disclaimer básico

---

### Escenario 5: Caché de Análisis

**Objetivo:** Verificar que el caché funciona correctamente.

**Pasos:**
1. Busca un análisis (ej: Bogotá - Apartamento)
2. Espera a que se calcule
3. Busca el mismo análisis nuevamente inmediatamente

**Resultado Esperado:**
- ✅ La segunda búsqueda es instantánea (usa caché)
- ✅ Los datos son idénticos
- ✅ En DevTools, la segunda llamada no hace query a `properties`

**Verificar en BD:**
```sql
-- Verificar que se guardó en caché
SELECT * FROM public.price_insights 
WHERE city = 'Bogotá' 
  AND property_type = 'apartamento'
ORDER BY calculated_at DESC
LIMIT 1;
```

---

### Escenario 6: Comparación de Precio Específico

**Objetivo:** Verificar que la comparación de precio funciona.

**Pasos:**
1. Ve a `/publicar`
2. Ingresa datos de una propiedad:
   - Ciudad: Bogotá
   - Barrio: Chapinero
   - Tipo: Apartamento
   - Precio: 2600000
3. Verifica que aparezca `PriceRecommendationCard`

**Resultado Esperado:**
- ✅ Card muestra rango recomendado
- ✅ Si el precio está dentro del rango: "Tu precio está dentro del rango recomendado"
- ✅ Si está fuera: Muestra porcentaje de diferencia
- ✅ Badge de comparación en el detalle de propiedad

---

## 🔍 Paso 4: Verificación Técnica

### 4.1 Verificar Response del API

Abre DevTools → Network → Busca llamadas a Supabase:

```javascript
// Verificar estructura del response
{
  average_price: number,
  median_price: number,
  recommended_min: number,
  recommended_max: number,
  recommended_range: { min: number, max: number }, // ✅ Nuevo
  sample_size: number,
  source: "own" | "market", // ✅ Nuevo
  analysis_level: "city" | "neighborhood" | "area", // ✅ Nuevo (si market)
  dane_validation: { ... }, // ✅ Si hay datos DANE
  data_sources: string[],
  data_sources_attribution: string
}
```

### 4.2 Verificar Llamadas a Market-Stats

Si el fallback se activa, deberías ver:

```
GET /api/v1/market-stats?city=Bogotá&property_type=apartamento&neighborhood=Chapinero
```

**En DevTools Console:**
```javascript
// Verificar que se llama al cliente
// Busca logs: "[marketStatsClient]"
```

### 4.3 Verificar Caché en BD

```sql
-- Ver todos los análisis cacheados
SELECT 
  city,
  neighborhood,
  property_type,
  sample_size,
  source,
  analysis_level,
  calculated_at,
  expires_at
FROM public.price_insights
ORDER BY calculated_at DESC;
```

---

## 🐛 Paso 5: Testing de Errores

### 5.1 Market-Stats No Disponible

**Simular:**
1. Desconecta internet temporalmente
2. O configura URL incorrecta en `.env.local`
3. Busca análisis con `sample_size < 3`

**Resultado Esperado:**
- ✅ No se rompe la aplicación
- ✅ Muestra datos propios (aunque sean insuficientes)
- ✅ No muestra error al usuario
- ✅ Log en consola: "Error al obtener market-stats fallback"

### 5.2 Sin Datos DANE

**Simular:**
1. Elimina datos DANE de la BD
2. Busca análisis

**Resultado Esperado:**
- ✅ Análisis funciona normalmente
- ✅ No muestra referencia DANE
- ✅ `dane_validation.coherence_status: "no_data"`

### 5.3 Sin Propiedades

**Simular:**
1. Busca en una ciudad sin propiedades publicadas

**Resultado Esperado:**
- ✅ Intenta usar market-stats como fallback
- ✅ Si fallback falla, muestra mensaje: "No hay suficientes datos..."
- ✅ No se rompe la aplicación

---

## 📝 Checklist de Testing

### Funcionalidades Básicas
- [ ] Análisis con datos propios suficientes funciona
- [ ] Análisis con datos propios insuficientes usa fallback
- [ ] Fallback market-stats funciona cuando está disponible
- [ ] Fallback maneja errores correctamente
- [ ] Caché funciona (segunda búsqueda es instantánea)

### Integración DANE
- [ ] Validación DANE funciona cuando hay datos
- [ ] Referencia DANE se muestra en UI
- [ ] Desviación porcentual se calcula correctamente
- [ ] Atribución de fuentes incluye DANE cuando aplica

### Textos de UI
- [ ] Textos cambian según `source: "own"`
- [ ] Textos cambian según `source: "market"`
- [ ] Badges aparecen correctamente
- [ ] Disclaimers aparecen cuando corresponde
- [ ] Textos diferentes para PRO vs no PRO
- [ ] Textos diferentes según `analysis_level`

### Response del API
- [ ] `source` está presente
- [ ] `analysis_level` está presente cuando `source: "market"`
- [ ] `recommended_range` está presente siempre
- [ ] `dane_validation` está presente cuando hay datos DANE
- [ ] `data_sources` incluye todas las fuentes

### Edge Cases
- [ ] Sin propiedades → muestra fallback o mensaje apropiado
- [ ] Market-stats no disponible → continúa con datos propios
- [ ] Sin datos DANE → funciona sin referencia DANE
- [ ] Caché expirado → recalcula correctamente

---

## 🚀 Comandos Útiles

### Limpiar Caché de Análisis

```sql
-- Eliminar todos los análisis cacheados
DELETE FROM public.price_insights;

-- Eliminar solo los expirados
SELECT cleanup_expired_price_insights();
```

### Ver Estadísticas

```sql
-- Ver cuántos análisis hay por ciudad
SELECT 
  city,
  property_type,
  COUNT(*) as total,
  COUNT(CASE WHEN source = 'market' THEN 1 END) as market_count,
  COUNT(CASE WHEN source = 'own' THEN 1 END) as own_count
FROM public.price_insights
GROUP BY city, property_type;
```

### Simular Fallback Manualmente

```sql
-- Forzar que un análisis use fallback eliminando propiedades
-- (Solo para testing, no hacer en producción)
UPDATE public.properties 
SET status = 'paused' 
WHERE city = 'Bogotá' 
  AND property_type = 'apartamento'
  AND neighborhood = 'Chapinero';
```

---

## 🎯 Casos de Prueba Recomendados

### Caso 1: Flujo Completo - Datos Propios
1. Publica 5 propiedades en Bogotá - Chapinero
2. Busca análisis en homepage
3. Verifica que muestre datos propios
4. Verifica textos y badges
5. Verifica caché (busca de nuevo)

### Caso 2: Flujo Completo - Fallback
1. Publica solo 1 propiedad en una zona nueva
2. Busca análisis
3. Verifica que use market-stats
4. Verifica textos de "estimado"
5. Verifica badge "Estimado - Ciudad"

### Caso 3: Comparación de Precio
1. Ve a `/publicar`
2. Ingresa precio específico
3. Verifica recomendación
4. Verifica comparación con badge

### Caso 4: Usuario PRO vs NO PRO
1. Prueba con cuenta PRO
2. Prueba con cuenta NO PRO
3. Compara textos y disclaimers
4. Verifica que PRO ve más información

---

## 📊 Verificación Final

Después de probar todos los escenarios, verifica:

1. ✅ No hay errores en consola
2. ✅ Todos los textos son claros y honestos
3. ✅ Los badges aparecen cuando corresponde
4. ✅ Los disclaimers son apropiados
5. ✅ El response tiene todos los campos esperados
6. ✅ El caché funciona correctamente
7. ✅ El fallback funciona cuando es necesario

---

## 🆘 Troubleshooting

### Problema: No aparecen análisis

**Solución:**
- Verifica que haya propiedades con `status = 'published'`
- Verifica que la ciudad coincida exactamente
- Limpia el caché y vuelve a intentar

### Problema: No aparece fallback

**Solución:**
- Verifica que `sample_size < 3`
- Verifica que `VITE_MARKET_STATS_API_URL` esté configurada
- Revisa logs en consola: "[marketStatsClient]"

### Problema: No aparece referencia DANE

**Solución:**
- Verifica que haya datos en `dane_reference_data`
- Verifica que la ciudad coincida (ej: "Bogotá D.C.")
- Verifica que `expires_at > NOW()`

### Problema: Textos no cambian

**Solución:**
- Verifica que `source` y `analysis_level` estén en el response
- Limpia caché del navegador
- Verifica que estés usando la versión actualizada del código

---

## 📚 Recursos Adicionales

- Documentación de textos: `docs/PRICE_INSIGHTS_UI_TEXTS.md`
- Integración DANE: `docs/DANE_INTEGRATION.md`
- Cliente Market-Stats: `src/services/marketStatsClient.ts`
