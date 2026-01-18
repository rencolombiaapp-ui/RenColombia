# Data Sources & Price Analysis — RenColombia

**Documento Interno — Uso Confidencial**  
**Versión:** 1.0  
**Última actualización:** 2024  
**Clasificación:** Internal Use Only

---

## 1. Overview

RenColombia opera un sistema de análisis de precios de arrendamiento que combina múltiples fuentes de datos para proporcionar recomendaciones precisas y contextualizadas. Este sistema está diseñado para:

- Proporcionar análisis de precios basados en datos del mercado
- Ofrecer recomendaciones de precio para propiedades en publicación
- Validar coherencia de precios mediante referencias macroeconómicas
- Mantener transparencia sobre las fuentes de datos utilizadas

El sistema utiliza una arquitectura de múltiples capas que prioriza datos propios y recurre a fuentes externas solo cuando es necesario, siempre manteniendo agregación estadística y cumplimiento legal.

---

## 2. Types of Data Sources

### 2.1 RenColombia Marketplace Data (Primary Source)

**Descripción:**  
Datos de propiedades publicadas directamente en la plataforma RenColombia por propietarios e inmobiliarias registradas.

**Características:**
- Propiedades con estado `published` en la base de datos
- Información proporcionada voluntariamente por usuarios autenticados
- Datos actualizados en tiempo real según publicación y edición de propiedades

**Campos utilizados:**
- Precio de arriendo (`price`)
- Ubicación (`city`, `neighborhood`)
- Tipo de propiedad (`property_type`)
- Área (`area`)
- Características adicionales (habitaciones, baños, etc.)

**Uso:**
- Cálculo de promedios, medianas y rangos estadísticos
- Análisis comparativo por zona geográfica
- Generación de recomendaciones de precio
- Identificación de outliers mediante métodos estadísticos (IQR)

**Criterio de suficiencia:**
- Mínimo 3 propiedades comparables para análisis válido
- Filtrado por tipo de propiedad, ciudad y barrio (cuando aplica)
- Rango de área ±20% para comparabilidad

---

### 2.2 Aggregated Market Statistics (Fallback Source)

**Descripción:**  
Estadísticas agregadas de mercado obtenidas de un servicio externo interno (`market-stats`). Estos datos son exclusivamente estadísticos y agregados.

**Características:**
- Datos pre-agregados (promedios, percentiles, rangos)
- Sin información identificable de propiedades individuales
- Sin URLs, imágenes o datos personales
- Estadísticas calculadas sobre muestras amplias del mercado

**Estructura de datos recibida:**
```typescript
{
  recommended_range: { min: number, max: number },
  analysis_level: "city" | "neighborhood" | "area",
  sample_size: number,
  p25: number,
  p75: number
}
```

**Cuándo se activa:**
- Cuando los datos propios de RenColombia son insuficientes (`sample_size < 3`)
- Como mecanismo de fallback para garantizar cobertura geográfica
- Solo para proporcionar rangos recomendados, no promedios específicos

**Uso:**
- Únicamente el campo `recommended_range` se utiliza
- No se mezclan promedios entre fuentes
- Se marca claramente como `source: "market"` en el sistema
- Se comunica al usuario como "estimación basada en datos agregados"

**Principios de uso:**
- Uso transformativo: los datos agregados se utilizan para generar insights, no se redistribuyen
- No se almacenan datos individuales de terceros
- No se exponen URLs, identificadores o información identificable
- Los datos se utilizan exclusivamente para análisis estadístico

---

### 2.3 DANE Reference Data (Validation Source)

**Descripción:**  
Datos de referencia macroeconómica del Departamento Administrativo Nacional de Estadística (DANE) de Colombia.

**Características:**
- Datos oficiales y públicos del DANE
- Agregados a nivel de ciudad y tipo de propiedad
- Períodos de referencia documentados (ej: 2024-Q1)
- Fuentes públicas y citables

**Uso:**
- Validación de coherencia de precios calculados
- Detección de desviaciones significativas
- Contexto macroeconómico para análisis
- **NO se utiliza para reemplazar datos del marketplace**

**Campos utilizados:**
- Precio de referencia (`reference_price`)
- Período de datos (`data_period`)
- Tipo de propiedad (`property_type`)
- Ciudad (`city`)

**Procesamiento:**
- Comparación de precios calculados con referencias DANE
- Cálculo de desviación porcentual
- Clasificación de coherencia: `coherent`, `slight_deviation`, `significant_deviation`, `no_data`
- Solo se utiliza cuando hay datos propios suficientes (`sample_size >= 3`)

**Cumplimiento legal:**
- Los datos DANE son de acceso público y uso libre
- Se cita correctamente: "DANE – análisis agregado y elaboración propia"
- No se redistribuyen datos crudos del DANE
- Se utiliza únicamente para análisis agregado y validación

---

## 3. Use of Aggregated Market Data

### 3.1 Nature of Aggregated Data

Los datos de mercado agregados utilizados por RenColombia son exclusivamente:

- **Estadísticas calculadas:** Promedios, medianas, percentiles, rangos
- **Datos pre-procesados:** Resultados de análisis estadístico, no datos crudos
- **Sin identificación:** Sin URLs, imágenes, descripciones o datos personales
- **Sin redistribución:** No se almacenan ni se exponen datos individuales de terceros

### 3.2 Purpose and Activation

**Propósito:**
- Proporcionar cobertura geográfica cuando los datos propios son insuficientes
- Ofrecer referencias de mercado para zonas con baja densidad de propiedades en RenColombia
- Mantener calidad del servicio independientemente del volumen de datos propios

**Activación:**
- Solo cuando `sample_size < 3` en datos propios
- Como mecanismo de fallback, no como fuente primaria
- Siempre marcado claramente como estimación externa

### 3.3 Data Transformation

Los datos agregados se utilizan de manera transformativa:

- Se combinan con análisis propios para generar insights
- Se contextualizan con validación DANE cuando aplica
- Se presentan con disclaimers apropiados sobre la fuente
- No se redistribuyen ni se exponen como datos propios

---

## 4. Data Exclusions

RenColombia **NO utiliza ni expone** los siguientes tipos de datos:

### 4.1 Listings Individuales de Terceros

- **NO se almacenan:** Información de propiedades de otras plataformas
- **NO se exponen:** URLs, imágenes o descripciones de propiedades externas
- **NO se redistribuyen:** Datos individuales de terceros

### 4.2 Información Identificable

- **NO se almacenan:** Identificadores de propiedades de terceros
- **NO se exponen:** Referencias a propiedades específicas fuera de RenColombia
- **NO se vinculan:** Datos personales o información de contacto de terceros

### 4.3 Datos Personales

- **NO se procesan:** Información personal de usuarios de otras plataformas
- **NO se almacenan:** Datos de contacto, nombres o identificadores personales
- **NO se comparten:** Información personal con terceros

### 4.4 Contenido No Agregado

- **NO se utilizan:** Descripciones textuales de propiedades externas
- **NO se procesan:** Imágenes o multimedia de terceros
- **NO se exponen:** Contenido creativo o descriptivo de otras plataformas

### 4.5 URLs y Referencias Externas

- **NO se almacenan:** URLs de propiedades externas
- **NO se exponen:** Enlaces a otras plataformas inmobiliarias
- **NO se redirigen:** Tráfico a sitios de terceros

---

## 5. Data Trust Hierarchy

RenColombia opera con una jerarquía clara de confianza en las fuentes de datos:

### 5.1 Tier 1: Datos Propios (Highest Priority)

**Prioridad:** Máxima  
**Confianza:** Alta  
**Uso:** Análisis primario y recomendaciones

- Datos proporcionados directamente por usuarios de RenColombia
- Verificados mediante autenticación y validación de publicación
- Actualizados en tiempo real
- Marcados como `source: "own"` en el sistema

**Criterio de uso:**
- Siempre se priorizan cuando están disponibles
- Se utilizan cuando `sample_size >= 3`
- Se combinan con validación DANE para coherencia

---

### 5.2 Tier 2: Mercado Agregado (Fallback)

**Prioridad:** Media  
**Confianza:** Media-Alta  
**Uso:** Fallback cuando datos propios son insuficientes

- Estadísticas agregadas de servicios externos
- Solo se activa cuando datos propios son insuficientes
- Marcado claramente como `source: "market"` en el sistema
- Presentado con disclaimers apropiados

**Criterio de uso:**
- Solo cuando `sample_size < 3` en datos propios
- Únicamente para rangos recomendados, no promedios
- Siempre con comunicación clara al usuario sobre la fuente

---

### 5.3 Tier 3: Fuentes Oficiales (Validation)

**Prioridad:** Baja (solo validación)  
**Confianza:** Alta (fuentes oficiales)  
**Uso:** Validación y contexto macroeconómico

- Datos del DANE y otras fuentes oficiales
- Utilizados exclusivamente para validación
- No reemplazan datos del marketplace
- Siempre citados correctamente

**Criterio de uso:**
- Solo cuando hay datos propios suficientes (`sample_size >= 3`)
- Para validar coherencia, no para calcular precios
- Siempre con atribución explícita

---

## 6. Legal & Compliance Principles

### 6.1 Transformative Use

RenColombia utiliza datos agregados de manera transformativa:

- Los datos se procesan para generar insights estadísticos
- No se redistribuyen datos crudos de terceros
- Se combinan con análisis propios para crear valor agregado
- El uso es no comercial en términos de redistribución de datos

### 6.2 Statistical Aggregation

Todos los datos externos utilizados son:

- Pre-agregados antes de llegar a RenColombia
- Estadísticos (promedios, percentiles, rangos)
- Sin información identificable
- Sin datos individuales de propiedades

### 6.3 Public Data Compliance (DANE)

El uso de datos DANE cumple con:

- Políticas de datos abiertos del gobierno colombiano
- Requisitos de citación y atribución
- Uso exclusivo para análisis agregado
- No redistribución de datos crudos

### 6.4 User-Generated Content

Los datos propios de RenColombia:

- Son proporcionados voluntariamente por usuarios autenticados
- Están sujetos a términos de servicio y políticas de privacidad
- Se utilizan exclusivamente dentro de la plataforma RenColombia
- Cumplen con regulaciones de protección de datos personales

### 6.5 No Redistribution

RenColombia no redistribuye:

- Datos individuales de propiedades de terceros
- Información identificable de otras plataformas
- Contenido creativo o descriptivo de terceros
- URLs o referencias a propiedades externas

---

## 7. Product Transparency

### 7.1 User-Facing Communication

RenColombia comunica claramente las fuentes de datos a los usuarios:

**Para datos propios (`source: "own"`):**
- Texto: "Basado en X inmuebles comparables en [zona]"
- Atribución: "Fuente: Datos del mercado RenColombia"
- Badge opcional: "Datos RenColombia" (para usuarios PRO)

**Para datos agregados (`source: "market"`):**
- Texto: "Basado en análisis agregado a nivel de [ciudad/barrio]"
- Atribución: "Fuente: Datos de mercado externos"
- Badge: "Estimado - [Nivel]" (ej: "Estimado - Ciudad")
- Disclaimer: "Estimación basada en datos agregados. Considera características específicas de tu inmueble."

**Para validación DANE:**
- Texto: "Referencia DANE: $X.XXX.XXX (período)"
- Atribución: "DANE – análisis agregado y elaboración propia"
- Indicador de coherencia cuando aplica

### 7.2 Technical Indicators

El sistema incluye indicadores técnicos:

- Campo `source`: `"own"` | `"market"`
- Campo `analysis_level`: `"city"` | `"neighborhood"` | `"area"`
- Campo `data_sources`: Array de fuentes utilizadas
- Campo `data_sources_attribution`: Texto de atribución completo

### 7.3 Disclaimer Strategy

Los disclaimers varían según:

- **Tipo de fuente:** Propia vs. externa
- **Nivel de análisis:** Ciudad vs. barrio vs. área
- **Tamaño de muestra:** Muestra pequeña requiere disclaimer adicional
- **Tipo de usuario:** PRO vs. no PRO (más información para usuarios PRO)

---

## 8. Internal Notes

### 8.1 Future Evolution

**Consideraciones técnicas:**
- El sistema está diseñado para escalar con nuevas fuentes de datos
- La arquitectura permite agregar proveedores de datos agregados sin cambios mayores
- El sistema de caché permite optimizar consultas a fuentes externas

**Consideraciones de producto:**
- Evaluación continua de calidad de datos agregados
- Monitoreo de cobertura geográfica
- Mejora continua de algoritmos de análisis

### 8.2 Potential Data Providers

**Criterios de evaluación:**
- Datos exclusivamente agregados y estadísticos
- Sin información identificable
- Cumplimiento con regulaciones de datos
- Calidad y cobertura geográfica

**Proceso de incorporación:**
- Evaluación técnica y legal
- Pruebas de integración
- Actualización de documentación
- Comunicación a usuarios sobre nuevas fuentes

### 8.3 Periodic Review

**Revisión de fuentes:**
- Anual: Revisión completa de fuentes de datos
- Trimestral: Evaluación de calidad y cobertura
- Ad-hoc: Cuando se identifiquen problemas o mejoras

**Documentación:**
- Este documento se actualiza cuando se agregan nuevas fuentes
- Cambios significativos requieren revisión legal
- Versiones documentadas para trazabilidad

### 8.4 Risk Mitigation

**Riesgos identificados:**
- Cambios en disponibilidad de fuentes externas
- Cambios en políticas de datos de proveedores
- Regulaciones nuevas sobre uso de datos

**Mitigación:**
- Sistema de fallback robusto (datos propios siempre prioritarios)
- Documentación clara de fuentes y uso
- Cumplimiento proactivo con regulaciones
- Transparencia con usuarios sobre fuentes

---

## 9. Technical Architecture Summary

### 9.1 Data Flow

```
1. Request de análisis de precio
   ↓
2. Verificar datos propios (RenColombia Marketplace)
   ↓
3a. Si sample_size >= 3:
    - Calcular estadísticas propias
    - Validar con DANE (opcional)
    - Retornar análisis con source: "own"
   ↓
3b. Si sample_size < 3:
    - Consultar market-stats (fallback)
    - Si disponible: usar recommended_range
    - Retornar análisis con source: "market"
   ↓
4. Cachear resultado (24 horas)
   ↓
5. Presentar al usuario con atribución apropiada
```

### 9.2 Data Storage

**Datos propios:**
- Almacenados en base de datos RenColombia (Supabase)
- Tabla: `properties`
- Caché de análisis: `price_insights` (24 horas)

**Datos agregados:**
- No se almacenan permanentemente
- Consultados bajo demanda cuando se necesita fallback
- Timeout: 5 segundos

**Datos DANE:**
- Almacenados en tabla `dane_reference_data`
- Actualizados manualmente desde fuentes oficiales
- Expiración configurable (típicamente 3-6 meses)

---

## 10. Compliance Checklist

- [x] Datos agregados exclusivamente estadísticos
- [x] Sin información identificable de terceros
- [x] Sin URLs o referencias externas
- [x] Atribución correcta de fuentes
- [x] Disclaimers apropiados en UI
- [x] Cumplimiento con políticas DANE
- [x] Uso transformativo de datos
- [x] No redistribución de datos crudos
- [x] Documentación clara de fuentes
- [x] Jerarquía de confianza definida

---

**Fin del documento**

**Próxima revisión:** Trimestral o cuando se agreguen nuevas fuentes de datos  
**Contacto:** Equipo de Producto y Data — RenColombia
