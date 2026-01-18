-- Script para limpiar suscripciones pendientes de pago
-- Ejecuta esto en Supabase SQL Editor si tienes suscripciones pendientes bloqueando nuevos checkouts

-- Opción 1: Cancelar todas las suscripciones pendientes de pago del usuario actual
-- Reemplaza 'TU_USER_ID' con tu user_id real
UPDATE subscriptions 
SET status = 'expired', 
    canceled_at = now()
WHERE user_id = auth.uid() 
  AND status = 'pending_payment';

-- Opción 2: Cancelar todas las suscripciones pendientes antiguas (más de 1 hora)
UPDATE subscriptions 
SET status = 'expired', 
    canceled_at = now()
WHERE status = 'pending_payment' 
  AND created_at < now() - interval '1 hour';

-- Opción 3: Ver tus suscripciones actuales antes de cancelar
SELECT id, plan_id, status, created_at, wompi_transaction_id
FROM subscriptions 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
