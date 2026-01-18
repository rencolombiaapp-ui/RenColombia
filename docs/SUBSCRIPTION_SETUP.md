# Configuración del Sistema de Suscripciones

## Variables de Entorno Requeridas

Agregar al archivo `.env` o variables de entorno de Vercel:

```env
# Wompi Configuration
VITE_WOMPI_PUBLIC_KEY=pub_test_xxxxxxxxxxxxx
VITE_WOMPI_PRIVATE_KEY=prv_test_xxxxxxxxxxxxx
VITE_WOMPI_ENVIRONMENT=sandbox  # o "production" para producción

# Para el Edge Function (Supabase)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
```

## Configuración de Wompi

1. Crear cuenta en [Wompi](https://wompi.co/)
2. Obtener las API keys desde el dashboard
3. Configurar webhook URL en Wompi:
   - Sandbox: `https://[tu-proyecto].supabase.co/functions/v1/wompi-webhook`
   - Production: `https://[tu-proyecto].supabase.co/functions/v1/wompi-webhook`
4. Eventos a suscribir: `transaction.updated`

## Deploy del Edge Function

```bash
# Desde la raíz del proyecto
supabase functions deploy wompi-webhook
```

## Migraciones de Base de Datos

Ejecutar la migración `00014_create_subscriptions.sql` en Supabase:

```bash
# Opción 1: Desde Supabase Dashboard
# Ve a SQL Editor y ejecuta el contenido del archivo

# Opción 2: Desde CLI
supabase migration up
```

## Planes Configurados

### Propietarios (Landlord)
- **Free**: $0 COP/mes - 1 inmueble, sin análisis de precios
- **PRO**: $29,900 COP/mes - Inmuebles ilimitados, análisis de precios premium

### Inmobiliarias
- **PRO**: $149,900 COP/mes - Inmuebles ilimitados, análisis de precios premium, marca destacada

### Inquilinos
- **Free**: Siempre gratuito - Acceso completo a búsqueda

## Flujo de Pago

1. Usuario selecciona plan en `/planes`
2. Redirige a `/checkout?plan_id=xxx`
3. Se crea suscripción en estado `pending_payment`
4. Se crea checkout en Wompi
5. Usuario es redirigido a Wompi para pagar
6. Wompi redirige a `/checkout/confirm?subscription_id=xxx&transaction_id=xxx`
7. Webhook de Wompi confirma el pago
8. Suscripción se activa automáticamente

## Testing

### Sandbox de Wompi

Usar tarjetas de prueba:
- **Aprobada**: 4242424242424242
- **Rechazada**: 4000000000000002
- CVV: Cualquier número de 3 dígitos
- Fecha: Cualquier fecha futura

## Seguridad

⚠️ **IMPORTANTE**: 
- Nunca exponer `VITE_WOMPI_PRIVATE_KEY` en el frontend
- Usar solo `VITE_WOMPI_PUBLIC_KEY` en el cliente
- Validar webhooks con la secret key de Wompi (implementar en producción)
- Usar HTTPS siempre en producción
