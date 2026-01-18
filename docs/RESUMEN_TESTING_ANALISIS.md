# Resumen Rápido - Testing Análisis de Precios

## 🚀 Inicio Rápido (5 minutos)

### Paso 1: Preparar Datos
```sql
-- Ejecuta: docs/QUICK_TEST_ANALISIS_PRECIOS.sql
-- ⚠️ IMPORTANTE: Reemplaza 'TU_USER_ID_AQUI' con tu user_id
```

### Paso 2: Probar en la App

**Escenario A: Datos Propios (source: "own")**
1. Ve a `/` (homepage)
2. Busca: Bogotá → Chapinero → Apartamento
3. ✅ Debe mostrar análisis con datos propios
4. ✅ Badge: "Datos RenColombia" (si eres PRO)
5. ✅ Texto: "Basado en X inmuebles comparables en Chapinero"

**Escenario B: Fallback (source: "market")**
1. Busca: Bogotá → Usaquén → Casa
2. ✅ Debe mostrar análisis con fallback
3. ✅ Badge: "Estimado - Ciudad"
4. ✅ Texto: "Basado en análisis agregado..."
5. ✅ Disclaimer sobre estimación

**Escenario C: Comparación de Precio**
1. Ve a `/publicar`
2. Ingresa: Bogotá → Chapinero → Apartamento → Precio: 2600000
3. ✅ Debe mostrar recomendación
4. ✅ Debe comparar con el precio ingresado

---

## ✅ Checklist Rápido

- [ ] Propiedades creadas (5 en Chapinero, 1 en Usaquén)
- [ ] Datos DANE insertados
- [ ] Análisis funciona con datos propios
- [ ] Fallback funciona cuando sample_size < 3
- [ ] Textos cambian según source
- [ ] Badges aparecen correctamente
- [ ] Disclaimers aparecen cuando corresponde
- [ ] Comparación de precio funciona

---

## 🔍 Verificación en DevTools

**Console:**
```javascript
// Buscar logs:
"[priceInsightsService]"
"[marketStatsClient]"
```

**Network:**
- Verificar llamadas a Supabase
- Verificar llamadas a market-stats (si fallback activo)
- Verificar estructura del response

**Response Esperado:**
```json
{
  "source": "own" | "market",
  "analysis_level": "city" | "neighborhood" | "area",
  "recommended_range": { "min": ..., "max": ... },
  "sample_size": 5,
  "dane_validation": { ... }
}
```

---

## 📚 Documentación Completa

- **Guía Completa**: `docs/GUIA_TESTING_ANALISIS_PRECIOS.md`
- **Script SQL**: `docs/QUICK_TEST_ANALISIS_PRECIOS.sql`
- **Textos de UI**: `docs/PRICE_INSIGHTS_UI_TEXTS.md`

---

## 🐛 Problemas Comunes

**No aparecen análisis:**
- Verifica que las propiedades tengan `status = 'published'`
- Verifica que la ciudad coincida exactamente

**No aparece fallback:**
- Verifica que `sample_size < 3`
- Verifica `VITE_MARKET_STATS_API_URL` en `.env.local`

**Textos no cambian:**
- Limpia caché del navegador
- Verifica que `source` esté en el response
