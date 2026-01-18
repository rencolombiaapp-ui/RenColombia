# Integración de Notificaciones de Contratos — RenColombia

**Documento Técnico — Integración con Sistema Existente**  
**Fecha:** 2024  
**Estado:** Implementado  
**Clasificación:** Internal Technical Documentation

---

## Resumen Ejecutivo

Este documento describe la integración del flujo de "Contratación Digital de Arrendamientos" con el sistema de notificaciones existente de RenColombia. **NO se creó un nuevo sistema de notificaciones**. Se extendió el sistema actual para cubrir los eventos de contratos, manteniendo total compatibilidad con las notificaciones existentes.

---

## 1. Análisis del Sistema Existente

### 1.1 Estructura de Notificaciones

**Tabla:** `public.notifications`
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles.id)
- `type` (text, CHECK constraint)
- `title` (text)
- `message` (text)
- `related_id` (uuid, nullable)
- `is_read` (boolean, default false)
- `created_at` (timestamp)

**Función Principal:** `public.create_notification(p_user_id, p_type, p_title, p_message, p_related_id)`
- Security definer (permite creación desde triggers)
- Retorna el ID de la notificación creada
- Manejo de errores interno (no falla el trigger si falla la notificación)

**Patrón de Implementación:**
1. Trigger AFTER INSERT/UPDATE en tabla relacionada
2. Función trigger que obtiene datos necesarios
3. Llama a `create_notification()` con datos formateados
4. Manejo de errores con `BEGIN...EXCEPTION WHEN OTHERS`

### 1.2 Tipos de Notificación Originales

- `property_intention` - Nueva intención de arrendar
- `new_message` - Nuevo mensaje en conversación
- `property_viewed` - Propiedad vista
- `property_favorited` - Propiedad marcada como favorita
- `review_received` - Nueva reseña recibida
- `system` - Notificación del sistema

### 1.3 Servicios y Hooks Existentes

- `src/services/notificationService.ts` - Servicio principal
- Hooks: `useNotifications()`, `useUnreadNotificationCount()`
- UI: Componente de campana de notificaciones (existente)

---

## 2. Eventos de Contratos y Notificaciones

### 2.1 Mapa de Eventos

| Evento | Descripción | Tipo Notificación | Destinatario | Estado |
|--------|-------------|-------------------|--------------|--------|
| **E1** | Inquilino solicita contrato | `contract_request` | Propietario | ✅ Implementado |
| **E2** | Propietario inicia contrato | `contract_started` | Inquilino | ✅ Implementado |
| **E3** | Contrato enviado al inquilino | `contract_pending_approval` | Inquilino | ✅ Implementado |
| **E4** | Contrato aprobado por inquilino | `contract_approved` | Propietario | ✅ Implementado |
| **E5** | Contrato cancelado | `contract_cancelled` | Inquilino | ✅ Implementado |
| **E6** | Mensaje en contrato | `new_message` | Contraparte | ✅ Implementado |

### 2.2 Detalles de Implementación

#### E1: Inquilino Solicita Contrato
- **Migración:** `00028_create_contract_requests.sql`
- **Trigger:** `notify_contract_request_created_trigger`
- **Función:** `notify_contract_request_created()`
- **Momento:** AFTER INSERT en `contract_requests`
- **Condición:** Siempre que se crea una solicitud
- **Mensaje:** "El inquilino [nombre] ha solicitado un contrato para tu inmueble: [título]"

#### E2: Propietario Inicia Contrato
- **Migración:** `00035_complete_contract_notifications.sql`
- **Trigger:** `notify_contract_started_trigger`
- **Función:** `notify_contract_started()`
- **Momento:** AFTER INSERT en `rental_contracts`
- **Condición:** Cuando `status = 'draft'`
- **Mensaje:** "El propietario [nombre] ha iniciado un contrato para el inmueble: [título]. Revisa el contrato cuando esté listo."

#### E3: Contrato Enviado al Inquilino
- **Migración:** `00031_add_contract_approval.sql`
- **Función:** `approve_and_send_contract()` (llama directamente a `create_notification`)
- **Momento:** Cuando propietario aprueba y envía contrato
- **Condición:** `status` cambia de `draft` a `pending_tenant`
- **Mensaje:** "El propietario ha enviado un contrato para el inmueble: [título]. Por favor revisa y aprueba el contrato."

#### E4: Contrato Aprobado por Inquilino
- **Migración:** `00032_add_tenant_contract_approval.sql`
- **Función:** `tenant_approve_contract()` (llama directamente a `create_notification`)
- **Momento:** Cuando inquilino aprueba contrato
- **Condición:** `status` cambia de `pending_tenant` a `approved`
- **Mensaje:** "El inquilino ha aprobado el contrato para el inmueble: [título]. El contrato está listo para ser firmado."

#### E5: Contrato Cancelado
- **Migración:** `00034_add_contract_cancellation.sql`
- **Trigger:** `notify_contract_cancelled_trigger`
- **Función:** `notify_contract_cancelled()`
- **Momento:** AFTER UPDATE en `rental_contracts`
- **Condición:** Cuando `status` cambia a `cancelled`
- **Mensaje:** "El propietario [nombre] ha cancelado el contrato para el inmueble: [título]"

#### E6: Mensaje en Contrato
- **Migración:** `00033_create_contract_messages.sql`
- **Trigger:** `notify_contract_message_recipient_trigger`
- **Función:** `notify_contract_message_recipient()`
- **Momento:** AFTER INSERT en `contract_messages`
- **Condición:** Siempre que se crea un mensaje
- **Tipo:** Reutiliza `new_message` (tipo existente)
- **Mensaje:** "[Remitente] te envió un mensaje sobre el contrato del inmueble: [título]"

---

## 3. Tipos de Notificación Consolidados

### 3.1 Tipos Originales (NO MODIFICADOS)
- `property_intention`
- `new_message`
- `property_viewed`
- `property_favorited`
- `review_received`
- `system`

### 3.2 Tipos de Contratos (NUEVOS)
- `contract_request` - Solicitud de contrato
- `contract_started` - Contrato iniciado
- `contract_pending_approval` - Contrato pendiente de aprobación
- `contract_approved` - Contrato aprobado
- `contract_cancelled` - Contrato cancelado

### 3.3 Constraint Actualizado

El constraint `notifications_type_check` incluye todos los tipos:

```sql
CHECK (type IN (
  'property_intention',
  'new_message',
  'property_viewed',
  'property_favorited',
  'review_received',
  'system',
  'contract_request',
  'contract_started',
  'contract_pending_approval',
  'contract_approved',
  'contract_cancelled'
))
```

**Migración:** `00035_complete_contract_notifications.sql` (consolidación final)

---

## 4. Patrón de Implementación

### 4.1 Patrón Consistente

Todas las notificaciones de contratos siguen el mismo patrón del sistema existente:

```sql
-- 1. Función trigger
CREATE OR REPLACE FUNCTION public.notify_[evento]()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_id uuid;
  -- Variables para datos
BEGIN
  -- 2. Obtener datos necesarios
  -- 3. Validar datos
  -- 4. Crear notificación
  BEGIN
    v_notification_id := public.create_notification(
      p_user_id,
      p_type,
      p_title,
      p_message,
      p_related_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger
CREATE TRIGGER notify_[evento]_trigger
  AFTER INSERT/UPDATE ON [tabla]
  FOR EACH ROW
  [WHEN (condición)]
  EXECUTE FUNCTION public.notify_[evento]();
```

### 4.2 Manejo de Errores

- **Nunca falla el trigger:** Si la notificación falla, se registra un warning pero el INSERT/UPDATE continúa
- **Validación de datos:** Se verifica que los datos necesarios existan antes de crear la notificación
- **Logging:** Se registran notices/warnings para debugging

---

## 5. Condiciones Estrictas de Disparo

### 5.1 Reglas Implementadas

✅ **Solo se dispara en cambios reales de estado:**
- E2: Solo cuando se crea contrato nuevo (`INSERT`)
- E3: Solo cuando `status` cambia de `draft` a `pending_tenant`
- E4: Solo cuando `status` cambia de `pending_tenant` a `approved`
- E5: Solo cuando `status` cambia a `cancelled` (no si ya estaba cancelado)

✅ **Validación de usuarios:**
- Se verifica que `user_id` no sea NULL
- Se verifica que los usuarios existan

✅ **No duplicados:**
- Triggers usan `WHEN` clauses para evitar disparos innecesarios
- Funciones verifican cambios de estado antes de notificar

### 5.2 NO se Dispara

❌ En refresh de página (no hay cambios de estado)
❌ En reintentos (validación de estado previene duplicados)
❌ En validaciones fallidas (no hay INSERT/UPDATE)
❌ En estados intermedios irrelevantes (solo cambios significativos)

---

## 6. Compatibilidad y Seguridad

### 6.1 Notificaciones Existentes

✅ **NO modificadas:**
- Todas las notificaciones existentes siguen funcionando igual
- Los tipos originales no fueron cambiados
- Los triggers existentes no fueron modificados
- La UI existente sigue funcionando

### 6.2 Nuevas Notificaciones

✅ **Integradas correctamente:**
- Usan el mismo servicio (`notificationService.ts`)
- Aparecen en la misma UI (campana de notificaciones)
- Siguen el mismo formato y estructura
- Compatibles con hooks existentes

### 6.3 Seguridad

✅ **RLS Policies:**
- Las notificaciones se crean con `SECURITY DEFINER`
- Solo usuarios autorizados pueden ver sus notificaciones
- No hay cambios en las políticas de seguridad existentes

---

## 7. Verificación de Integración

### 7.1 Checklist de Eventos

- [x] E1: Inquilino solicita contrato → Notifica propietario
- [x] E2: Propietario inicia contrato → Notifica inquilino
- [x] E3: Contrato enviado al inquilino → Notifica inquilino
- [x] E4: Contrato aprobado por inquilino → Notifica propietario
- [x] E5: Contrato cancelado → Notifica inquilino
- [x] E6: Mensaje en contrato → Notifica contraparte

### 7.2 Checklist de Compatibilidad

- [x] Notificaciones existentes siguen funcionando
- [x] Tipos originales no modificados
- [x] UI existente compatible
- [x] Servicios existentes compatibles
- [x] Hooks existentes compatibles
- [x] No hay breaking changes

---

## 8. Archivos Modificados

### 8.1 Migraciones SQL

1. `00028_create_contract_requests.sql` - E1
2. `00031_add_contract_approval.sql` - E3
3. `00032_add_tenant_contract_approval.sql` - E4
4. `00033_create_contract_messages.sql` - E6
5. `00034_add_contract_cancellation.sql` - E5
6. `00035_complete_contract_notifications.sql` - E2 + Consolidación

### 8.2 Servicios TypeScript

1. `src/services/notificationService.ts` - Actualizado tipo `Notification` para incluir tipos de contratos

---

## 9. Pruebas Recomendadas

### 9.1 Pruebas de Integración

1. **Verificar notificaciones existentes:**
   - Crear intención de propiedad → Debe notificar propietario
   - Enviar mensaje → Debe notificar destinatario
   - Marcar como favorita → Debe notificar propietario

2. **Verificar notificaciones de contratos:**
   - Inquilino solicita contrato → Propietario recibe notificación
   - Propietario inicia contrato → Inquilino recibe notificación
   - Propietario envía contrato → Inquilino recibe notificación
   - Inquilino aprueba contrato → Propietario recibe notificación
   - Propietario cancela contrato → Inquilino recibe notificación
   - Enviar mensaje en contrato → Contraparte recibe notificación

3. **Verificar no duplicados:**
   - Actualizar contrato sin cambiar estado → No debe crear notificación
   - Cancelar contrato ya cancelado → No debe crear notificación duplicada

---

## 10. Mantenimiento Futuro

### 10.1 Agregar Nuevos Tipos

Si se necesita agregar un nuevo tipo de notificación de contratos:

1. Agregar el tipo al constraint en `00035_complete_contract_notifications.sql`
2. Actualizar `Notification` interface en `notificationService.ts`
3. Crear trigger/función siguiendo el patrón existente
4. Documentar en este archivo

### 10.2 Modificar Mensajes

Los mensajes están en las funciones trigger/funciones RPC. Para modificarlos:

1. Localizar la función correspondiente
2. Modificar el `format()` del mensaje
3. Mantener el mismo formato y estructura

---

## 11. Conclusión

✅ **Integración Completa:**
- Todos los eventos de contratos generan notificaciones
- Usa el sistema existente sin modificaciones
- Compatible con UI y servicios actuales
- Sin breaking changes
- Sin duplicados
- Sin regresiones

✅ **Sistema Robusto:**
- Manejo de errores adecuado
- Validaciones estrictas
- Logging para debugging
- Documentación completa

---

**Última actualización:** 2024  
**Mantenido por:** Backend Team
