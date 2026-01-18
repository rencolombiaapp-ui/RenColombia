# Debug: Error al Crear Checkout con Wompi

## Posibles Causas y Soluciones

### 1. Variables de Entorno No Configuradas

**Síntoma**: Error "VITE_WOMPI_PRIVATE_KEY no está configurada"

**Solución**:
1. Crea un archivo `.env` en la raíz del proyecto
2. Agrega:
   ```env
   VITE_WOMPI_PUBLIC_KEY=pub_test_xxxxxxxxxxxxx
   VITE_WOMPI_PRIVATE_KEY=prv_test_xxxxxxxxxxxxx
   VITE_WOMPI_ENVIRONMENT=sandbox
   ```
3. Reinicia el servidor de desarrollo (`npm run dev`)

### 2. Plan No Existe en la Base de Datos

**Síntoma**: Error "Plan con ID 'inmobiliaria_pro' no existe"

**Solución**:
Ejecuta esta query en Supabase SQL Editor:

```sql
-- Verificar que el plan existe
SELECT * FROM plans WHERE id = 'inmobiliaria_pro';

-- Si no existe, insertarlo manualmente
INSERT INTO public.plans (id, name, description, price_monthly, user_type, max_properties, includes_price_insights) 
VALUES ('inmobiliaria_pro', 'PRO', 'Plan premium para inmobiliarias', 149900, 'inmobiliaria', null, true)
ON CONFLICT (id) DO NOTHING;
```

### 3. Error de Autenticación con Wompi

**Síntoma**: Error "Error de autenticación con Wompi"

**Solución**:
1. Verifica que las keys sean correctas en Wompi Dashboard
2. Asegúrate de usar keys de **Sandbox** si `VITE_WOMPI_ENVIRONMENT=sandbox`
3. Las keys deben empezar con:
   - `pub_test_` para public key
   - `prv_test_` para private key

### 4. Ya Tienes una Suscripción Activa

**Síntoma**: Error "Ya tienes una suscripción activa"

**Solución**:
Cancela o expira tu suscripción actual antes de contratar una nueva:

```sql
-- Ver tus suscripciones
SELECT * FROM subscriptions WHERE user_id = auth.uid();

-- Cancelar suscripción activa (si es necesario)
UPDATE subscriptions 
SET status = 'canceled', canceled_at = now() 
WHERE user_id = auth.uid() AND status = 'active';
```

### 5. Verificar en Consola del Navegador

Abre DevTools (F12) y revisa:
1. **Console**: Busca errores específicos
2. **Network**: Busca la petición a `/transactions` de Wompi
   - Si aparece en rojo, revisa el error
   - Si aparece 401, las keys son incorrectas
   - Si aparece 400, hay un error en los datos enviados

### 6. Verificar Plan en la Base de Datos

Ejecuta en Supabase SQL Editor:

```sql
-- Ver todos los planes
SELECT id, name, price_monthly, user_type, is_active 
FROM plans 
ORDER BY user_type, price_monthly;

-- Verificar específicamente el plan de inmobiliarias
SELECT * FROM plans WHERE id = 'inmobiliaria_pro';
```

Debería mostrar:
- `id`: `inmobiliaria_pro`
- `name`: `PRO`
- `price_monthly`: `149900`
- `user_type`: `inmobiliaria`
- `is_active`: `true`

### 7. Probar con Otro Plan

Para verificar si el problema es específico del plan de inmobiliarias:

1. Prueba con el plan de propietarios: `/checkout?plan_id=landlord_pro`
2. Si funciona, el problema es específico del plan de inmobiliarias
3. Si no funciona, el problema es general (variables de entorno, Wompi, etc.)

### 8. Verificar Variables de Entorno en Runtime

En la consola del navegador, ejecuta:

```javascript
// Verificar variables (NO mostrar private key completo por seguridad)
console.log({
  hasPublicKey: !!import.meta.env.VITE_WOMPI_PUBLIC_KEY,
  hasPrivateKey: !!import.meta.env.VITE_WOMPI_PRIVATE_KEY,
  environment: import.meta.env.VITE_WOMPI_ENVIRONMENT,
  publicKeyPrefix: import.meta.env.VITE_WOMPI_PUBLIC_KEY?.substring(0, 8)
});
```

Debería mostrar:
- `hasPublicKey`: `true`
- `hasPrivateKey`: `true`
- `environment`: `sandbox` o `production`
- `publicKeyPrefix`: `pub_test_` (sandbox) o `pub_prod_` (producción)

## Checklist de Verificación

- [ ] Archivo `.env` existe en la raíz del proyecto
- [ ] Variables `VITE_WOMPI_*` están configuradas
- [ ] Servidor de desarrollo reiniciado después de agregar `.env`
- [ ] Plan `inmobiliaria_pro` existe en la base de datos
- [ ] Plan tiene `is_active = true`
- [ ] Plan tiene `price_monthly > 0`
- [ ] Keys de Wompi son correctas (verificadas en dashboard)
- [ ] No hay suscripción activa previa
- [ ] Consola del navegador no muestra otros errores

## Contactar Soporte

Si después de verificar todo lo anterior el error persiste:

1. Copia el mensaje de error completo de la consola
2. Verifica el estado de la petición en Network tab
3. Comparte los logs con el equipo de desarrollo
