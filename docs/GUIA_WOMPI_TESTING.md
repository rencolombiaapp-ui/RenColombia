# Guía para Probar la Integración con Wompi

## 📋 Pasos para Configurar y Probar

### 1. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Supabase (ya deberías tenerlas)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-key-publica

# Wompi Sandbox (obtener desde https://wompi.co/)
VITE_WOMPI_PUBLIC_KEY=pub_test_xxxxxxxxxxxxx
VITE_WOMPI_PRIVATE_KEY=prv_test_xxxxxxxxxxxxx
VITE_WOMPI_ENVIRONMENT=sandbox
```

**⚠️ IMPORTANTE**: 
- `VITE_WOMPI_PRIVATE_KEY` se usa en el frontend solo para testing. En producción debería estar en el backend.
- Las keys de sandbox empiezan con `pub_test_` y `prv_test_`

### 2. Obtener Credenciales de Wompi

1. Ve a [https://wompi.co/](https://wompi.co/)
2. Crea una cuenta o inicia sesión
3. Ve al Dashboard → Configuración → API Keys
4. Copia las keys de **Sandbox** (no producción aún)

### 3. Ejecutar las Migraciones

Asegúrate de que la migración de suscripciones esté ejecutada:

```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: supabase/migrations/00014_create_subscriptions.sql
```

### 4. Probar el Flujo Completo

#### Paso 1: Ir a la página de Planes
```
http://localhost:5173/planes
```

#### Paso 2: Seleccionar un Plan
- Haz clic en "Contratar Plan" en cualquier plan de pago
- Serás redirigido a `/checkout?plan_id=landlord_pro`

#### Paso 3: Checkout Automático
- La página `/checkout` creará automáticamente:
  - Una suscripción en estado `pending_payment`
  - Un checkout en Wompi
  - Te redirigirá a la pasarela de pago de Wompi

#### Paso 4: Pagar con Tarjeta de Prueba
En el checkout de Wompi, usa:

**Tarjeta Aprobada:**
- Número: `4242424242424242`
- CVV: Cualquier número de 3 dígitos (ej: `123`)
- Fecha: Cualquier fecha futura (ej: `12/25`)
- Nombre: Cualquier nombre

**Tarjeta Rechazada (para probar errores):**
- Número: `4000000000000002`
- Resto igual que arriba

#### Paso 5: Confirmación
- Después del pago, Wompi te redirigirá a:
  ```
  /checkout/confirm?subscription_id=xxx&transaction_id=xxx
  ```
- La página verificará el pago y activará la suscripción

### 5. Verificar que Funcionó

#### En la Base de Datos (Supabase):

1. **Tabla `subscriptions`**:
   ```sql
   SELECT * FROM subscriptions 
   WHERE user_id = 'tu-user-id'
   ORDER BY created_at DESC;
   ```
   - Debería tener `status = 'active'`
   - Debería tener `wompi_transaction_id` con el ID de la transacción

2. **Tabla `payment_transactions`**:
   ```sql
   SELECT * FROM payment_transactions 
   WHERE user_id = 'tu-user-id'
   ORDER BY created_at DESC;
   ```
   - Debería tener un registro con `status = 'approved'`

#### En la Aplicación:

1. Ve a `/perfil` - Deberías ver tu plan activo
2. Ve a `/planes` - Debería mostrar "Plan Activo" en tu plan
3. Intenta acceder a análisis de precios - Debería funcionar si tienes plan PRO

### 6. Probar el Webhook (Opcional)

El webhook se ejecuta automáticamente cuando Wompi confirma el pago. Para probarlo manualmente:

1. **Deploy el Edge Function**:
   ```bash
   supabase functions deploy wompi-webhook
   ```

2. **Configurar Webhook en Wompi Dashboard**:
   - URL: `https://tu-proyecto.supabase.co/functions/v1/wompi-webhook`
   - Evento: `transaction.updated`

3. **Probar con Wompi Test Mode**:
   - Wompi enviará webhooks automáticamente cuando cambie el estado de una transacción

### 7. Debugging

#### Ver Logs en Consola del Navegador:
- Abre DevTools (F12)
- Ve a la pestaña Console
- Busca errores relacionados con Wompi

#### Ver Logs del Edge Function:
```bash
supabase functions logs wompi-webhook
```

#### Verificar Variables de Entorno:
En la consola del navegador, ejecuta:
```javascript
console.log({
  publicKey: import.meta.env.VITE_WOMPI_PUBLIC_KEY,
  environment: import.meta.env.VITE_WOMPI_ENVIRONMENT
});
```

**⚠️ NO hagas console.log de la private key**

### 8. Errores Comunes

#### Error: "Error al crear checkout"
- Verifica que las variables de entorno estén configuradas
- Verifica que las keys de Wompi sean correctas
- Verifica que estés usando keys de sandbox si `VITE_WOMPI_ENVIRONMENT=sandbox`

#### Error: "No se encontró información de la suscripción"
- Verifica que la migración de suscripciones esté ejecutada
- Verifica que el `subscription_id` en la URL sea correcto

#### Error: "El pago fue rechazado"
- Usa la tarjeta de prueba correcta (`4242424242424242`)
- Verifica que la fecha de expiración sea futura

### 9. URLs de Prueba Directas

Para probar rápidamente sin pasar por la página de planes:

```
# Checkout directo (requiere estar autenticado)
http://localhost:5173/checkout?plan_id=landlord_pro

# Confirmación manual (requiere IDs reales)
http://localhost:5173/checkout/confirm?subscription_id=xxx&transaction_id=xxx
```

### 10. Próximos Pasos

Una vez que todo funcione en sandbox:

1. **Configurar Producción**:
   - Cambiar `VITE_WOMPI_ENVIRONMENT=production`
   - Usar keys de producción de Wompi
   - Configurar webhook de producción

2. **Mejorar Seguridad**:
   - Mover `VITE_WOMPI_PRIVATE_KEY` al backend
   - Implementar validación real de webhooks
   - Agregar rate limiting

3. **Monitoreo**:
   - Configurar alertas para pagos fallidos
   - Agregar logging de transacciones
   - Dashboard de suscripciones activas

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en la consola del navegador
2. Revisa los logs del Edge Function
3. Verifica las variables de entorno
4. Consulta la [documentación de Wompi](https://docs.wompi.co/)
