# Guía Paso a Paso: Configuración de Wompi

Esta guía te ayudará a configurar Wompi desde cero para procesar pagos en RenColombia.

## 📋 Requisitos Previos

- Cuenta de correo electrónico
- Documento de identidad (para verificación en Wompi)
- Acceso a Supabase Dashboard

---

## Paso 1: Crear Cuenta en Wompi

### 1.1. Registrarse en Wompi

1. Ve a [https://wompi.co/](https://wompi.co/)
2. Haz clic en **"Crear cuenta"** o **"Registrarse"**
3. Completa el formulario con:
   - Nombre completo
   - Correo electrónico
   - Contraseña
   - Tipo de documento (Cédula, NIT, etc.)
   - Número de documento
   - Teléfono

### 1.2. Verificar tu Cuenta

1. Revisa tu correo electrónico
2. Haz clic en el enlace de verificación
3. Completa el proceso de verificación de identidad (si es requerido)

---

## Paso 2: Obtener las API Keys de Sandbox

### 2.1. Acceder al Dashboard

1. Inicia sesión en [https://wompi.co/](https://wompi.co/)
2. Ve al **Dashboard** o **Panel de Control**

### 2.2. Activar Modo Sandbox (Pruebas)

1. Busca la opción **"Modo de Pruebas"** o **"Sandbox Mode"**
2. Actívalo (debería aparecer una barra roja indicando que estás en modo de pruebas)
3. **IMPORTANTE**: Asegúrate de estar en modo Sandbox antes de obtener las keys

### 2.3. Obtener las API Keys

1. Ve a **Configuración** → **API Keys** o **Llaves API**
2. Busca la sección de **Sandbox** o **Pruebas**
3. Copia las siguientes keys:
   - **Public Key** (empieza con `pub_test_`)
   - **Private Key** (empieza con `prv_test_`)

   ⚠️ **IMPORTANTE**: 
   - Las keys de sandbox empiezan con `pub_test_` y `prv_test_`
   - Las keys de producción empiezan con `pub_prod_` y `prv_prod_`
   - **NO compartas tus keys privadas con nadie**

---

## Paso 3: Configurar Variables de Entorno en el Proyecto

### 3.1. Crear Archivo .env

1. En la raíz del proyecto RenColombia, crea un archivo llamado `.env`
2. Si ya existe un archivo `.env`, ábrelo con un editor de texto

### 3.2. Agregar Variables de Wompi

Abre el archivo `.env` y agrega las siguientes líneas:

```env
# Wompi Configuration (Sandbox)
VITE_WOMPI_PUBLIC_KEY=pub_test_xxxxxxxxxxxxx
VITE_WOMPI_PRIVATE_KEY=prv_test_xxxxxxxxxxxxx
VITE_WOMPI_ENVIRONMENT=sandbox
```

**Reemplaza** `pub_test_xxxxxxxxxxxxx` y `prv_test_xxxxxxxxxxxxx` con las keys reales que copiaste de Wompi.

**Ejemplo:**
```env
# Wompi Configuration (Sandbox)
VITE_WOMPI_PUBLIC_KEY=pub_test_1234567890abcdef
VITE_WOMPI_PRIVATE_KEY=prv_test_abcdef1234567890
VITE_WOMPI_ENVIRONMENT=sandbox
```

### 3.3. Verificar que el Archivo .env Esté en .gitignore

1. Abre el archivo `.gitignore` en la raíz del proyecto
2. Asegúrate de que tenga esta línea:
   ```
   .env
   ```
3. Esto evita que subas tus credenciales a GitHub por accidente

---

## Paso 4: Reiniciar el Servidor de Desarrollo

### 4.1. Detener el Servidor Actual

1. En la terminal donde está corriendo `npm run dev`, presiona `Ctrl + C`
2. Espera a que se detenga completamente

### 4.2. Iniciar el Servidor Nuevamente

```bash
npm run dev
```

**⚠️ IMPORTANTE**: Las variables de entorno solo se cargan cuando inicia el servidor. Si ya estaba corriendo, debes reiniciarlo.

---

## Paso 5: Verificar la Configuración

### 5.1. Verificar en la Consola del Navegador

1. Abre tu aplicación en el navegador (normalmente `http://localhost:5173`)
2. Abre las **Herramientas de Desarrollador** (F12)
3. Ve a la pestaña **Console**
4. Ejecuta este código en la consola:

```javascript
console.log({
  hasPublicKey: !!import.meta.env.VITE_WOMPI_PUBLIC_KEY,
  hasPrivateKey: !!import.meta.env.VITE_WOMPI_PRIVATE_KEY,
  environment: import.meta.env.VITE_WOMPI_ENVIRONMENT,
  publicKeyPrefix: import.meta.env.VITE_WOMPI_PUBLIC_KEY?.substring(0, 8)
});
```

Deberías ver algo como:
```javascript
{
  hasPublicKey: true,
  hasPrivateKey: true,
  environment: "sandbox",
  publicKeyPrefix: "pub_test_"
}
```

### 5.2. Probar el Flujo de Pago

1. Ve a la página de Planes: `http://localhost:5173/planes`
2. Selecciona un plan de pago (ej: Plan PRO para Propietarios)
3. Haz clic en **"Contratar Plan"**
4. Deberías ser redirigido a la página de checkout de Wompi

---

## Paso 6: Configurar el Webhook (Opcional para Pruebas)

El webhook permite que Wompi notifique automáticamente cuando un pago se completa. Para desarrollo local, esto es opcional.

### 6.1. Obtener la URL del Webhook

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Edge Functions** → **wompi-webhook**
3. Copia la URL del webhook (debería ser algo como):
   ```
   https://tu-proyecto.supabase.co/functions/v1/wompi-webhook
   ```

### 6.2. Desplegar el Webhook (si no está desplegado)

En la terminal, ejecuta:

```bash
supabase functions deploy wompi-webhook
```

### 6.3. Configurar Webhook en Wompi Dashboard

1. Ve al Dashboard de Wompi
2. Ve a **Configuración** → **Webhooks**
3. Haz clic en **"Agregar Webhook"** o **"Nuevo Webhook"**
4. Ingresa:
   - **URL**: La URL del webhook que copiaste
   - **Eventos**: Selecciona `transaction.updated`
5. Guarda la configuración

---

## Paso 7: Probar con Tarjetas de Prueba

Wompi proporciona tarjetas de prueba para el modo Sandbox:

### Tarjeta Aprobada:
- **Número**: `4242 4242 4242 4242`
- **CVV**: Cualquier número de 3 dígitos (ej: `123`)
- **Fecha de Expiración**: Cualquier fecha futura (ej: `12/25`)
- **Nombre**: Cualquier nombre

### Tarjeta Rechazada (para probar errores):
- **Número**: `4000 0000 0000 0002`
- **CVV**: Cualquier número de 3 dígitos
- **Fecha**: Cualquier fecha futura

---

## ✅ Checklist de Verificación

Marca cada paso cuando lo completes:

- [ ] Cuenta creada en Wompi
- [ ] Cuenta verificada
- [ ] Modo Sandbox activado
- [ ] API Keys obtenidas (Public y Private)
- [ ] Archivo `.env` creado en la raíz del proyecto
- [ ] Variables `VITE_WOMPI_*` agregadas al `.env`
- [ ] Keys reales reemplazadas en el `.env`
- [ ] `.env` agregado al `.gitignore`
- [ ] Servidor de desarrollo reiniciado
- [ ] Variables verificadas en la consola del navegador
- [ ] Flujo de pago probado exitosamente
- [ ] Webhook configurado (opcional)

---

## 🐛 Solución de Problemas

### Error: "VITE_WOMPI_PRIVATE_KEY no está configurada"

**Causa**: El archivo `.env` no existe o las variables no están configuradas.

**Solución**:
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Verifica que las variables están escritas correctamente (sin espacios antes o después del `=`)
3. Reinicia el servidor de desarrollo

### Error: "Error de autenticación con Wompi"

**Causa**: Las keys son incorrectas o estás usando keys de producción con modo sandbox.

**Solución**:
1. Verifica que estás usando keys de **Sandbox** (`pub_test_` y `prv_test_`)
2. Verifica que `VITE_WOMPI_ENVIRONMENT=sandbox`
3. Copia las keys nuevamente desde el Dashboard de Wompi

### Error: "Wompi no retornó una URL de checkout válida"

**Causa**: La respuesta de Wompi no tiene la estructura esperada.

**Solución**:
1. Revisa la consola del navegador para ver el error completo
2. Verifica que las keys sean correctas
3. Verifica que el plan tenga un precio válido en la base de datos

### Las Variables No Se Cargan

**Causa**: El servidor no se reinició después de crear el `.env`.

**Solución**:
1. Detén el servidor (`Ctrl + C`)
2. Inicia el servidor nuevamente (`npm run dev`)

---

## 📞 Soporte

Si después de seguir todos los pasos aún tienes problemas:

1. Revisa la consola del navegador (F12) para ver errores específicos
2. Revisa los logs del servidor en la terminal
3. Verifica que todas las variables estén correctamente escritas en el `.env`
4. Asegúrate de estar usando keys de Sandbox si `VITE_WOMPI_ENVIRONMENT=sandbox`

---

## 🔒 Seguridad

**IMPORTANTE**: 
- **NUNCA** subas el archivo `.env` a GitHub o repositorios públicos
- **NUNCA** compartas tus keys privadas (`prv_test_` o `prv_prod_`)
- En producción, considera mover las keys privadas al backend
- Las keys de Sandbox son para pruebas, no para transacciones reales

---

## 🚀 Próximos Pasos

Una vez que todo funcione en Sandbox:

1. Prueba el flujo completo de pago
2. Verifica que el webhook funciona correctamente
3. Cuando estés listo para producción:
   - Obtén las keys de producción desde Wompi
   - Cambia `VITE_WOMPI_ENVIRONMENT=production` en el `.env`
   - Actualiza las keys a las de producción
   - Configura el webhook de producción

---

¡Listo! Con estos pasos deberías tener Wompi configurado y funcionando. 🎉
