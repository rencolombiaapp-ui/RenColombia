# HOTFIX: Validación Defensiva de auth.uid() NULL

## Problema
Usuarios nuevos reciben "Database error querying schema" al iniciar sesión. Los usuarios antiguos funcionan correctamente.

## Causa Raíz
Funciones RPC marcadas como `SECURITY DEFINER` usan `auth.uid()` sin validar si es NULL. Durante el primer ciclo post-autenticación en usuarios nuevos, `auth.uid()` puede evaluarse como NULL, causando errores en las funciones.

## Solución Aplicada

### BACKEND - Migración 00044

**10 funciones modificadas** con validación defensiva al inicio:

```sql
IF auth.uid() IS NULL THEN
  RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
END IF;
```

#### Funciones Modificadas:

1. **`approve_and_send_contract`** (00031)
   - **Qué se agregó:** Validación defensiva al inicio
   - **Por qué:** Valida `auth.uid()` en línea 57 sin verificar NULL

2. **`tenant_approve_contract`** (00032)
   - **Qué se agregó:** Validación defensiva al inicio
   - **Por qué:** Valida `auth.uid()` en línea 57 sin verificar NULL

3. **`cancel_contract_and_reactivate_property`** (00034)
   - **Qué se agregó:** Validación defensiva al inicio
   - **Por qué:** Valida `auth.uid()` en línea 44 sin verificar NULL

4. **`start_verification`** (00027)
   - **Qué se agregó:** Validación defensiva al inicio
   - **Por qué:** Valida `auth.uid()` en línea 170 sin verificar NULL

5. **`update_contract_clauses`** (00030)
   - **Qué se agregó:** Validación defensiva al inicio
   - **Por qué:** Valida `auth.uid()` en línea 576 sin verificar NULL

6. **`get_pro_plan_interest_stats`** (00037)
   - **Qué se agregó:** Validación defensiva al inicio
   - **Por qué:** Usa `auth.uid()` en línea 95 sin verificar NULL

7. **`start_contract`** (00029, 00030)
   - **Qué se agregó:** Validación defensiva al inicio
   - **Por qué:** Valida `auth.uid()` en línea 161/380 sin verificar NULL

8. **`generate_contract_content`** (00030)
   - **Qué se agregó:** Validación defensiva al inicio
   - **Por qué:** Valida `auth.uid()` sin verificar NULL

9. **`create_contract_request`** (00028)
   - **Qué se agregó:** Validación defensiva al inicio
   - **Por qué:** Valida `auth.uid()` en línea 128 sin verificar NULL

10. **`send_contract_message`** (00033)
    - **Qué se agregó:** Validación defensiva al inicio
    - **Por qué:** Usa `auth.uid()` en línea 110 sin verificar NULL (aunque ya tenía validación después, ahora es más temprana)

### Verificación del Trigger

- ✅ Verificado que `handle_new_user()` es `SECURITY DEFINER`
- ✅ Verificado que el trigger `on_auth_user_created` existe y está activo

### FRONTEND - Guards Defensivos

**4 servicios modificados** con validación antes de llamadas RPC:

1. **`src/services/proPlanInterestService.ts`**
   - **Función:** `getProPlanInterestStats()`
   - **Línea:** ~177
   - **Cambio:** Agregado guard `if (authError || !user?.id) throw new Error("Usuario no autenticado");`

2. **`src/services/rentalContractService.ts`**
   - **Función:** `startContract()`
   - **Línea:** ~191
   - **Cambio:** Agregado guard antes de llamada RPC `start_contract`

3. **`src/services/contractMessageService.ts`**
   - **Función:** `sendContractMessage()`
   - **Línea:** ~93
   - **Cambio:** Agregado guard antes de llamada RPC `send_contract_message`

4. **`src/services/contractRequestService.ts`**
   - **Función:** `createContractRequest()`
   - **Línea:** ~113
   - **Cambio:** Agregado guard antes de llamada RPC `create_contract_request`

**Nota:** `kycService.ts` ya tenía validación de usuario antes de llamadas RPC, no requiere cambios.

## Comportamiento Funcional

✅ **NO cambió:** El comportamiento funcional es EXACTAMENTE el mismo que antes para usuarios válidos.

✅ **Mejora:** Ahora las funciones fallan de forma temprana y clara si `auth.uid()` es NULL, en lugar de fallar silenciosamente o con errores confusos.

## Validación Final

### Checklist de Pruebas:

- [ ] Crear usuario NUEVO
- [ ] Iniciar sesión con usuario nuevo
- [ ] Verificar: NO aparece "Database error querying schema"
- [ ] Verificar: El usuario accede normalmente
- [ ] Probar usuario ANTIGUO
- [ ] Verificar: Todo funciona exactamente igual que antes
- [ ] Probar flujos:
  - [ ] Stats (get_pro_plan_interest_stats)
  - [ ] Contratos (start_contract, approve_and_send_contract, tenant_approve_contract)
  - [ ] KYC (start_verification)
  - [ ] Mensajes (send_contract_message)
  - [ ] Solicitudes de contrato (create_contract_request)

## Riesgos Residuales

⚠️ **Bajo riesgo:** Si alguna función RPC `SECURITY DEFINER` que usa `auth.uid()` no fue identificada en este hotfix, podría causar el mismo problema. Sin embargo, se revisaron todas las funciones conocidas que usan `auth.uid()`.

✅ **Mitigación:** El patrón defensivo es claro y puede aplicarse fácilmente a cualquier función adicional que se identifique.

## Archivos Modificados

### Backend:
- `supabase/migrations/00044_hotfix_auth_uid_null_validation.sql` (NUEVO)

### Frontend:
- `src/services/proPlanInterestService.ts`
- `src/services/rentalContractService.ts`
- `src/services/contractMessageService.ts`
- `src/services/contractRequestService.ts`

## Notas Técnicas

- **No se cambiaron funciones a SECURITY INVOKER:** Se mantuvieron todas como `SECURITY DEFINER` para preservar el comportamiento existente.
- **No se modificaron contratos de funciones:** Todas las funciones mantienen exactamente los mismos parámetros y retornos.
- **No se eliminaron funciones:** Todas las funciones existentes se mantienen.
- **No se tocaron datos existentes:** Solo se agregó validación defensiva.

## Próximos Pasos

1. Ejecutar migración `00044_hotfix_auth_uid_null_validation.sql` en Supabase
2. Desplegar cambios de frontend
3. Probar con usuario nuevo
4. Probar con usuario antiguo
5. Monitorear logs para verificar que no hay errores relacionados
