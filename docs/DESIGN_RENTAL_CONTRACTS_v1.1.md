# Diseño: Contratación Digital de Arrendamientos — RenColombia

**Documento de Diseño — Versión 1.1**  
**Fecha:** 2024  
**Estado:** Propuesta de Diseño Revisada  
**Clasificación:** Internal Design Document

---

## Changelog v1.1

### Ajustes Críticos Incorporados

**v1.1 incluye los siguientes ajustes arquitectónicos y de producto:**

1. **Nuevo Estado de Inmueble: `locked_for_contract`**
   - El inmueble se bloquea inmediatamente cuando el propietario hace clic en "Iniciar Contrato"
   - No espera a que el contrato pase a estado `active`
   - Reduce riesgo de múltiples contratos paralelos
   - Mejora claridad en el proceso de contratación

2. **Regla de Un Solo Contrato Activo por Inmueble**
   - Constraint explícito: máximo 1 contrato en estados activos simultáneamente
   - Previene conflictos y confusión en el proceso
   - Requiere cancelación/expiración del anterior para crear nuevo

3. **Visibilidad y UX del Inmueble Bloqueado**
   - Documentación clara de qué ve cada tipo de usuario
   - Transparencia en el estado del inmueble
   - Comunicación explícita del bloqueo en UI

4. **Disclaimer Legal Obligatorio**
   - Disclaimer requerido en momentos críticos del flujo
   - Protección legal y transparencia con usuarios
   - Cumplimiento con mejores prácticas de legal-tech

---

## Índice

1. [Propuesta de Modelo de Datos](#1-propuesta-de-modelo-de-datos)
2. [Flujo de Pantallas (UX)](#2-flujo-de-pantallas-ux)
3. [MVP de Contratos v1](#3-mvp-de-contratos-v1)
4. [Estados y Reglas de Negocio](#4-estados-y-reglas-de-negocio)

---

## 1. Propuesta de Modelo de Datos

### 1.1 Análisis del Esquema Actual

**Tablas existentes relevantes:**
- `profiles`: Usuarios con roles (`tenant`, `landlord`), `publisher_type` (`individual`, `inmobiliaria`)
- `properties`: Inmuebles con `status` (`draft`, `published`, `rented`, `paused`)
- `subscriptions`: Planes PRO activos (`active`, `canceled`, `expired`)
- `conversations` / `messages`: Sistema de mensajería existente
- `property_intentions`: Intenciones de arrendar (`pending`, `viewed`, `contacted`, `closed`)
- `tenant_insurance_approvals`: Aprobaciones de seguros

**⚠️ IMPORTANTE v1.1:**
- El estado `properties.status` debe incluir el nuevo valor `'locked_for_contract'`
- Este estado se activa ANTES de que el contrato pase a `active`
- Se requiere actualizar el CHECK constraint de `properties.status` para incluir este nuevo estado

**Integración:**
- Las nuevas tablas se relacionan mediante claves foráneas con tablas existentes
- No se modifican tablas existentes directamente (excepto el CHECK constraint mencionado)
- Se aprovecha el sistema de mensajería existente
- Se integra con el sistema de notificaciones existente

---

### 1.2 Nuevas Tablas Propuestas

#### Tabla 1: `contract_requests` (Solicitudes de Contrato)

**Propósito:**  
Almacena las solicitudes iniciales de contratación realizadas por inquilinos sobre inmuebles específicos.

**Campos:**

```sql
CREATE TABLE public.contract_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Estado de la solicitud
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  
  -- Información de la solicitud
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone, -- Expiración automática (ej: 7 días)
  
  -- Verificación KYC del inquilino
  tenant_kyc_status text DEFAULT 'pending' 
    CHECK (tenant_kyc_status IN ('pending', 'verified', 'rejected', 'expired')),
  tenant_kyc_verified_at timestamp with time zone,
  
  -- Metadatos
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Constraint: Un inquilino solo puede tener una solicitud activa por inmueble
  UNIQUE(tenant_id, property_id) 
    WHERE status IN ('pending', 'approved')
);
```

**Relaciones:**
- `property_id` → `properties.id`
- `tenant_id` → `profiles.id` (role = 'tenant')
- `owner_id` → `profiles.id` (role = 'landlord' OR publisher_type = 'inmobiliaria')

**Índices:**
- `contract_requests_property_idx` ON `property_id`
- `contract_requests_tenant_idx` ON `tenant_id`
- `contract_requests_owner_idx` ON `owner_id`
- `contract_requests_status_idx` ON `status`
- `contract_requests_created_idx` ON `created_at DESC`

**RLS Policies:**
- SELECT: Participantes (tenant_id OR owner_id = auth.uid())
- INSERT: Solo tenant_id = auth.uid() Y usuario tiene plan PRO activo
- UPDATE: Solo owner_id = auth.uid() (para aprobar/rechazar)
- DELETE: Solo tenant_id = auth.uid() (para cancelar)

---

#### Tabla 2: `kyc_verifications` (Verificaciones de Identidad)

**Propósito:**  
Almacena los datos de verificación de identidad (KYC) de usuarios. Soporta tanto personas naturales como jurídicas (inmobiliarias).

**Campos:**

```sql
CREATE TABLE public.kyc_verifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de verificación
  verification_type text NOT NULL 
    CHECK (verification_type IN ('person', 'company', 'property')),
  
  -- Estado de verificación
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  
  -- Datos de verificación (persona natural)
  document_type text CHECK (document_type IN ('cc', 'ce', 'passport', 'nit')),
  document_number text,
  document_front_url text, -- URL en storage
  document_back_url text, -- URL en storage (si aplica)
  selfie_url text, -- Selfie con documento (para persona natural)
  
  -- Datos de verificación (empresa/inmobiliaria)
  company_name text,
  company_nit text,
  company_document_url text, -- Cámara de comercio
  
  -- Datos de verificación (inmueble)
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  property_document_type text CHECK (property_document_type IN ('escritura', 'certificado', 'otro')),
  property_document_url text,
  
  -- Metadatos de verificación
  verified_at timestamp with time zone,
  verified_by text, -- 'system' | 'manual' | 'third_party'
  rejection_reason text, -- Razón si fue rechazada
  expires_at timestamp with time zone, -- Expiración de verificación (ej: 1 año)
  
  -- Metadatos
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Constraint: Un usuario solo puede tener una verificación activa por tipo
  UNIQUE(user_id, verification_type) 
    WHERE status = 'verified'
);
```

**Relaciones:**
- `user_id` → `profiles.id`
- `property_id` → `properties.id` (solo si verification_type = 'property')

**Índices:**
- `kyc_verifications_user_idx` ON `user_id`
- `kyc_verifications_status_idx` ON `status`
- `kyc_verifications_type_idx` ON `verification_type`
- `kyc_verifications_expires_idx` ON `expires_at`

**RLS Policies:**
- SELECT: Solo user_id = auth.uid() O owner de property relacionada
- INSERT: Solo user_id = auth.uid()
- UPDATE: Solo user_id = auth.uid() (para re-subir documentos) O sistema (para aprobar/rechazar)
- DELETE: Solo user_id = auth.uid()

---

#### Tabla 3: `rental_contracts` (Contratos de Arrendamiento)

**Propósito:**  
Almacena los contratos de arrendamiento generados y gestionados en la plataforma.

**Campos:**

```sql
CREATE TABLE public.rental_contracts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_request_id uuid REFERENCES public.contract_requests(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Estado del contrato
  status text NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'signed', 'active', 'cancelled', 'expired')),
  
  -- Contenido del contrato
  contract_template_id text, -- ID del template usado (ej: 'standard_rental_v1')
  contract_content text NOT NULL, -- Contenido completo del contrato (Markdown o HTML)
  contract_pdf_url text, -- URL del PDF generado (cuando se genera)
  
  -- Términos del contrato (extraídos para búsqueda y análisis)
  monthly_rent decimal(12, 2) NOT NULL,
  deposit_amount decimal(12, 2),
  contract_duration_months integer,
  start_date date,
  end_date date,
  
  -- Aprobaciones y firmas
  owner_approved_at timestamp with time zone,
  tenant_approved_at timestamp with time zone,
  owner_signed_at timestamp with time zone,
  tenant_signed_at timestamp with time zone,
  
  -- Versión y cambios
  version integer DEFAULT 1 NOT NULL,
  parent_contract_id uuid REFERENCES public.rental_contracts(id) ON DELETE SET NULL, -- Para versionado
  
  -- Metadatos
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  signed_at timestamp with time zone, -- Fecha de firma completa (ambas partes)
  activated_at timestamp with time zone -- Fecha de activación del contrato
);
```

**Relaciones:**
- `contract_request_id` → `contract_requests.id` (opcional, puede crearse sin solicitud)
- `property_id` → `properties.id`
- `tenant_id` → `profiles.id`
- `owner_id` → `profiles.id`
- `parent_contract_id` → `rental_contracts.id` (para versionado)

**Índices:**
- `rental_contracts_property_idx` ON `property_id`
- `rental_contracts_tenant_idx` ON `tenant_id`
- `rental_contracts_owner_idx` ON `owner_id`
- `rental_contracts_status_idx` ON `status`
- `rental_contracts_request_idx` ON `contract_request_id`

**⚠️ IMPORTANTE v1.1:**
- Se requiere un índice único parcial para garantizar un solo contrato activo por inmueble:
```sql
CREATE UNIQUE INDEX rental_contracts_property_active_unique_idx 
  ON public.rental_contracts(property_id) 
  WHERE status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active');
```

**RLS Policies:**
- SELECT: Participantes (tenant_id OR owner_id = auth.uid())
- INSERT: Solo owner_id = auth.uid() (propietario crea el contrato)
- UPDATE: Participantes (tenant_id OR owner_id = auth.uid()) según estado
- DELETE: Solo owner_id = auth.uid() Y status = 'draft' (solo borrar borradores)

---

#### Tabla 4: `contract_messages` (Mensajes de Contrato)

**Propósito:**  
Almacena mensajes específicos relacionados con contratos. Se integra con el sistema de mensajería existente pero añade contexto contractual.

**Campos:**

```sql
CREATE TABLE public.contract_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id uuid REFERENCES public.rental_contracts(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL, -- Opcional: vincular con conversación existente
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de mensaje
  message_type text NOT NULL DEFAULT 'comment' 
    CHECK (message_type IN ('comment', 'change_request', 'approval', 'rejection', 'system')),
  
  -- Contenido
  content text NOT NULL,
  
  -- Si es solicitud de cambio
  change_request_data jsonb, -- { field: 'monthly_rent', old_value: 1000000, new_value: 1200000 }
  
  -- Metadatos
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
```

**Relaciones:**
- `contract_id` → `rental_contracts.id`
- `conversation_id` → `conversations.id` (opcional, integración con mensajería)
- `sender_id` → `profiles.id`

**Índices:**
- `contract_messages_contract_idx` ON `contract_id`
- `contract_messages_sender_idx` ON `sender_id`
- `contract_messages_created_idx` ON `created_at DESC`

**RLS Policies:**
- SELECT: Participantes del contrato (tenant_id OR owner_id del contrato = auth.uid())
- INSERT: Participantes del contrato (sender_id = auth.uid())
- UPDATE: Solo sender_id = auth.uid() (marcar como leído)
- DELETE: No permitido (historial permanente)

---

#### Tabla 5: `contract_documents` (Documentos Adjuntos)

**Propósito:**  
Almacena documentos adjuntos relacionados con contratos (escrituras, certificados, etc.).

**Campos:**

```sql
CREATE TABLE public.contract_documents (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id uuid REFERENCES public.rental_contracts(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de documento
  document_type text NOT NULL 
    CHECK (document_type IN ('escritura', 'certificado', 'cedula', 'camara_comercio', 'otro')),
  
  -- Archivo
  file_name text NOT NULL,
  file_url text NOT NULL, -- URL en storage
  file_size_bytes integer,
  mime_type text,
  
  -- Metadatos
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
```

**Relaciones:**
- `contract_id` → `rental_contracts.id`
- `uploaded_by` → `profiles.id`

**Índices:**
- `contract_documents_contract_idx` ON `contract_id`
- `contract_documents_type_idx` ON `document_type`

**RLS Policies:**
- SELECT: Participantes del contrato
- INSERT: Participantes del contrato (uploaded_by = auth.uid())
- UPDATE: Solo uploaded_by = auth.uid()
- DELETE: Solo uploaded_by = auth.uid() Y contract.status = 'draft'

---

#### Tabla 6: `contract_templates` (Plantillas de Contrato)

**Propósito:**  
Almacena plantillas de contratos reutilizables. Permite personalización por parte de propietarios/inmobiliarias.

**Campos:**

```sql
CREATE TABLE public.contract_templates (
  id text PRIMARY KEY, -- Ej: 'standard_rental_v1', 'custom_landlord_123'
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = template del sistema
  
  -- Información del template
  name text NOT NULL,
  description text,
  is_system_template boolean DEFAULT false NOT NULL, -- Si es template del sistema o personalizado
  
  -- Contenido
  template_content text NOT NULL, -- Contenido con placeholders (ej: {{tenant_name}}, {{monthly_rent}})
  variables jsonb DEFAULT '{}'::jsonb, -- Variables disponibles y sus tipos
  
  -- Metadatos
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
```

**Relaciones:**
- `owner_id` → `profiles.id` (opcional, NULL para templates del sistema)

**Índices:**
- `contract_templates_owner_idx` ON `owner_id`
- `contract_templates_active_idx` ON `is_active`

**RLS Policies:**
- SELECT: Todos pueden ver templates activos del sistema, solo owner puede ver sus templates
- INSERT: Solo owner_id = auth.uid() (crear templates personalizados)
- UPDATE: Solo owner_id = auth.uid() O sistema (para templates del sistema)
- DELETE: Solo owner_id = auth.uid() (no se pueden borrar templates del sistema)

---

### 1.3 Modificaciones a Tablas Existentes

**⚠️ IMPORTANTE v1.1: Actualización del CHECK constraint de `properties.status`**

Se requiere actualizar el CHECK constraint existente para incluir el nuevo estado `locked_for_contract`:

```sql
-- Actualizar el CHECK constraint de properties.status
ALTER TABLE public.properties 
  DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties 
  ADD CONSTRAINT properties_status_check 
  CHECK (status IN ('draft', 'published', 'rented', 'paused', 'locked_for_contract'));
```

**Extensión mediante triggers y funciones:**

Se actualiza la función de trigger para manejar el nuevo estado `locked_for_contract`:

```sql
-- Función para actualizar status de property cuando se crea/modifica contrato
CREATE OR REPLACE FUNCTION public.update_property_on_contract()
RETURNS TRIGGER AS $$
BEGIN
  -- ⚠️ v1.1: Bloqueo inmediato cuando se crea contrato (no espera a 'active')
  IF NEW.status IN ('draft', 'pending_tenant', 'pending_owner', 'approved') 
     AND OLD.status IS NULL THEN
    -- Cuando se crea un contrato nuevo, bloquear el inmueble inmediatamente
    UPDATE public.properties
    SET status = 'locked_for_contract'
    WHERE id = NEW.property_id
    AND status = 'published';
  END IF;
  
  -- Cuando contrato pasa a 'active', cambiar a 'rented'
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    UPDATE public.properties
    SET status = 'rented'
    WHERE id = NEW.property_id;
  END IF;
  
  -- Cuando contrato se cancela o expira, reactivar el inmueble
  IF NEW.status IN ('cancelled', 'expired') 
     AND OLD.status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active') THEN
    UPDATE public.properties
    SET status = CASE 
      WHEN OLD.status = 'active' THEN 'published' -- Si estaba activo, volver a publicado
      ELSE 'published' -- Si estaba bloqueado, volver a publicado
    END
    WHERE id = NEW.property_id
    AND status IN ('locked_for_contract', 'rented');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_property_on_contract_status
  AFTER INSERT OR UPDATE OF status ON public.rental_contracts
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status OR OLD.status IS NULL)
  EXECUTE FUNCTION public.update_property_on_contract();
```

---

### 1.4 Storage Buckets

**Bucket nuevo:** `contract-documents`
- Políticas: Solo participantes del contrato pueden subir/ver documentos
- Estructura: `/contracts/{contract_id}/{document_type}/{filename}`

**Bucket existente:** `documents` (ya existe para seguros)
- Se puede reutilizar o crear bucket específico

---

## 2. Flujo de Pantallas (UX)

### 2.1 Flujo del Inquilino

#### Pantalla 1: Detalle del Inmueble (`PropertyDetail.tsx`)

**Ubicación:** `/propiedad/:id`

**Condiciones de aparición:**
- Usuario autenticado (`auth.uid()` existe)
- Usuario tiene plan PRO activo (`subscriptions.status = 'active'`)
- Inmueble tiene `status = 'published'` **O** `status = 'locked_for_contract'` **Y** usuario es el inquilino involucrado
- No existe `contract_request` activa para este usuario e inmueble

**⚠️ v1.1: Comportamiento según estado del inmueble:**

- **Si `status = 'published'`:**
  - Botón visible: **"Solicitar Contratación Digital"**
  - Badge: "PRO" (indicador de plan)
  - Tooltip: "Solo disponible para usuarios PRO"

- **Si `status = 'locked_for_contract'`:**
  - **Si usuario es el inquilino involucrado:**
    - Botón visible: **"Ver Contrato"** (link a vista de contrato)
    - Badge: "En Proceso"
    - Mensaje informativo: "Este inmueble está en proceso de contratación contigo"
  - **Si usuario NO es el inquilino involucrado:**
    - Botón NO visible
    - Mensaje: "Este inmueble está en proceso de contratación con otro inquilino"
    - Inmueble NO aparece en búsquedas públicas

- **Si `status = 'rented'`:**
  - Botón NO visible
  - Mensaje: "Este inmueble ya está arrendado"

**Elementos UI:**
- Botón: **"Solicitar Contratación Digital"** (solo si `status = 'published'`)
  - Badge: "PRO" (indicador de plan)
  - Tooltip: "Solo disponible para usuarios PRO"
  - Posición: Junto a botones "Quiero este inmueble" y "Enviar mensaje"

**Acción al hacer clic:**
- Abre modal `ContractRequestModal`

---

#### Pantalla 2: Modal de Solicitud de Contrato (`ContractRequestModal.tsx`)

**Ubicación:** Modal sobre `PropertyDetail`

**Estados del modal:**
1. **Formulario inicial** (si KYC no verificado)
2. **Proceso de KYC** (si KYC pendiente)
3. **Confirmación** (si KYC verificado)

**Contenido del formulario inicial:**
- Información del inmueble (read-only)
- Información del inquilino (read-only)
- **⚠️ v1.1: Disclaimer Legal (obligatorio):**
  - Checkbox obligatorio: "He leído y acepto los términos de contratación"
  - Texto de disclaimer visible:
    > "Este contrato es una plantilla generada automáticamente por RenColombia y no sustituye asesoría legal profesional."
  - Checkbox NO se puede desmarcar hasta que el usuario haya visto el disclaimer
- Botón: **"Continuar con Verificación"**

**Acción:**
- Crea registro en `contract_requests` con `status = 'pending'`
- Verifica `kyc_verifications` del usuario
- Si no existe o está expirada → Abre modal de KYC
- Si existe y está verificada → Muestra confirmación

---

#### Pantalla 3: Modal de Verificación KYC (`KYCVerificationModal.tsx`)

**Ubicación:** Modal sobre `ContractRequestModal`

**Contenido (Persona Natural):**
- Paso 1: **Subir documento de identidad**
  - Select: Tipo de documento (CC, CE, Pasaporte)
  - Upload: Frente del documento
  - Upload: Reverso del documento (si aplica)
  
- Paso 2: **Selfie con documento**
  - Cámara web o upload de imagen
  - Instrucciones: "Tome una foto sosteniendo su documento junto a su rostro"
  
- Paso 3: **Revisión**
  - Preview de documentos subidos
  - Botón: **"Enviar para Verificación"**

**Acción:**
- Crea/actualiza registro en `kyc_verifications`
- `status = 'pending'`
- `verification_type = 'person'`
- En MVP: Simula verificación (mock) → `status = 'verified'` después de 2 segundos
- Actualiza `contract_requests.tenant_kyc_status = 'verified'`

---

#### Pantalla 4: Vista de Contrato (`ContractView.tsx`)

**Ubicación:** `/contratos/:contractId`

**Condiciones de aparición:**
- Usuario es participante del contrato (`tenant_id` OR `owner_id` = `auth.uid()`)
- Contrato existe y no está eliminado

**Contenido:**
- Header:
  - Título: "Contrato de Arrendamiento"
  - Badge de estado: `status` del contrato
  - Información del inmueble (link a detalle)
  
- Sección de participantes:
  - Inquilino: Nombre, email, estado de verificación KYC
  - Propietario: Nombre, email, estado de verificación
  
- **⚠️ v1.1: Disclaimer Legal (obligatorio en momentos críticos):**
  - Banner visible cuando `status IN ('pending_tenant', 'pending_owner', 'approved')`:
    > "⚠️ Este contrato es una plantilla generada automáticamente por RenColombia y no sustituye asesoría legal profesional. Recomendamos consultar con un abogado antes de aprobar."
  - Estilo: Banner amarillo/naranja con ícono de advertencia
  - Visible para ambas partes
  
- Contenido del contrato:
  - Renderizado del `contract_content` (Markdown/HTML)
  - Versión: `version`
  - Fecha de creación: `created_at`
  
- Sección de documentos:
  - Lista de `contract_documents`
  - Botón: "Subir Documento" (si `status = 'draft'` o `pending_*`)
  
- Sección de mensajes:
  - Lista de `contract_messages`
  - Input para enviar mensaje
  
- Acciones según estado:
  - Si `status = 'pending_tenant'` → Botón: **"Aprobar Contrato"** (con disclaimer visible)
  - Si `status = 'pending_owner'` → Botón: **"Aprobar Contrato"** (solo owner, con disclaimer visible)
  - Si `status = 'approved'` → Botón: **"Firmar Contrato"** (MVP: simulado, con disclaimer visible)
  - Si `status = 'draft'` → Botón: **"Editar Contrato"** (solo owner)

---

#### Pantalla 5: Notificaciones

**Ubicación:** Dropdown de notificaciones (existente)

**Nuevos tipos de notificación:**
- `contract_request_received`: "Nuevo inquilino solicitó contratación"
- `contract_approved`: "Tu contrato fue aprobado"
- `contract_pending_approval`: "Contrato pendiente de tu aprobación"
- `contract_signed`: "Contrato firmado por ambas partes"
- `contract_message`: "Nuevo mensaje en contrato"
- **⚠️ v1.1:** `property_locked_for_contract`: "El inmueble ha sido bloqueado para contratación"

**Integración:** Usa sistema de notificaciones existente (`notifications` table)

---

### 2.2 Flujo del Propietario/Inmobiliaria

#### Pantalla 1: Lista de Inmuebles (`MyProperties.tsx`)

**Ubicación:** `/mis-inmuebles`

**Modificaciones:**
- Badge en cada card de inmueble:
  - Si existe `contract_request` con `status = 'pending'` → Badge: **"Contrato Solicitado"** (rojo/naranja)
  - Si `property.status = 'locked_for_contract'` → Badge: **"En Proceso de Contrato"** (amarillo)
  - Si existe `rental_contract` con `status = 'active'` → Badge: **"En Contrato"** (verde)
  - Contador: Número de solicitudes pendientes

**⚠️ v1.1: Visibilidad del inmueble bloqueado:**
- El inmueble sigue visible para el propietario
- Badge claro indicando el estado
- Link directo a vista de contrato si existe

**Acción:**
- Click en badge → Abre modal `ContractRequestsModal` o vista de contrato

---

#### Pantalla 2: Modal de Solicitudes de Contrato (`ContractRequestsModal.tsx`)

**Ubicación:** Modal sobre `MyProperties`

**Contenido:**
- Lista de `contract_requests` para el inmueble seleccionado
- Filtros: `status` (pending, approved, rejected)
- Orden: Por fecha de solicitud (más reciente primero)

**Cada item muestra:**
- Foto y nombre del inquilino
- Estado de verificación KYC (badge)
- Fecha de solicitud
- Botones:
  - **"Ver Perfil"** → Abre perfil del inquilino
  - **"Iniciar Contrato"** → **⚠️ v1.1: Acción crítica que bloquea el inmueble**
    - Muestra confirmación: "¿Estás seguro? Esto bloqueará el inmueble para otros inquilinos"
    - **⚠️ v1.1: Disclaimer Legal visible:**
      > "Este contrato es una plantilla generada automáticamente por RenColombia y no sustituye asesoría legal profesional."
    - Al confirmar: Crea `rental_contract` con `status = 'draft'` **Y** actualiza `property.status = 'locked_for_contract'`
    - Abre editor de contrato
  - **"Rechazar"** → Actualiza `status = 'rejected'`

---

#### Pantalla 3: Editor de Contrato (`ContractEditor.tsx`)

**Ubicación:** `/contratos/:contractId/editar`

**Condiciones:**
- Usuario es `owner_id` del contrato
- Contrato tiene `status = 'draft'` o `pending_owner`

**Contenido:**
- Editor de texto rico (Markdown o WYSIWYG)
- Plantilla base cargada desde `contract_templates`
- Variables disponibles:
  - `{{tenant_name}}`
  - `{{tenant_document}}`
  - `{{owner_name}}`
  - `{{property_address}}`
  - `{{monthly_rent}}`
  - `{{deposit_amount}}`
  - `{{start_date}}`
  - `{{end_date}}`
  - etc.

**⚠️ v1.1: Disclaimer Legal (obligatorio al enviar):**
- Banner visible en la parte superior del editor:
  > "⚠️ Este contrato es una plantilla generada automáticamente por RenColombia y no sustituye asesoría legal profesional."
- Checkbox obligatorio antes de enviar: "Confirmo que he revisado el contenido y entiendo que este es un template base"

**Acciones:**
- Botón: **"Guardar Borrador"** → Actualiza `contract_content`, mantiene `status = 'draft'`
- Botón: **"Enviar a Inquilino"** → 
  - Valida que disclaimer haya sido aceptado
  - Cambia `status = 'pending_tenant'`
  - Notifica al inquilino
  - **⚠️ v1.1:** El inmueble ya está bloqueado (`locked_for_contract`), no cambia estado
- Botón: **"Usar Plantilla"** → Selector de templates

---

#### Pantalla 4: Verificación de Propietario/Inmobiliaria

**Ubicación:** Modal o página separada (`OwnerVerification.tsx`)

**Contenido (Persona Natural):**
- Similar a KYC de inquilino
- Tipo: `verification_type = 'person'`

**Contenido (Inmobiliaria):**
- Tipo: `verification_type = 'company'`
- Campos:
  - Nombre de la empresa
  - NIT
  - Upload: Cámara de Comercio
  - Upload: Documento representante legal

**Contenido (Inmueble):**
- Tipo: `verification_type = 'property'`
- Campos:
  - Select: Tipo de documento (Escritura, Certificado, Otro)
  - Upload: Documento del inmueble
  - Select: Inmueble relacionado

**Acción:**
- Crea registro en `kyc_verifications`
- En MVP: Simula verificación (mock)

---

#### Pantalla 5: Vista de Contrato (Igual que Inquilino)

**Diferencias:**
- Si `status = 'draft'` → Botón: **"Editar Contrato"**
- Si `status = 'pending_owner'` → Botón: **"Aprobar Contrato"** (con disclaimer visible)
- Si `status = 'active'` → Botón: **"Reactivar Inmueble"** (si contrato falla)
- **⚠️ v1.1:** Si `property.status = 'locked_for_contract'` → Mensaje informativo: "Este inmueble está bloqueado para contratación. Otros inquilinos no pueden solicitarlo."

---

### 2.3 Estados y Transiciones de Pantallas

**Diagrama de estados:**

```
[Inquilino]
PropertyDetail → ContractRequestModal → KYCVerificationModal → ContractView
                                                                    ↓
                                                            [Aprobación] → ContractView (approved)

[Propietario]
MyProperties → ContractRequestsModal → [Iniciar Contrato] → ContractEditor → ContractView
                                              ↓ (bloquea inmueble)
                                    property.status = 'locked_for_contract'
                                                              ↓
                                                      [Aprobación] → ContractView (approved)
```

---

### 2.4 Visibilidad y UX del Inmueble Bloqueado

**⚠️ v1.1: Nueva Sección - Comportamiento según tipo de usuario**

#### Para el Público General (No autenticado o sin relación con el inmueble)

**Qué ven:**
- El inmueble **NO aparece** en búsquedas públicas
- El inmueble **NO aparece** en listados de propiedades
- Si acceden directamente por URL → Mensaje: "Este inmueble no está disponible"

**Razón:**
- Evitar confusión
- Prevenir intentos de contacto cuando ya hay proceso activo
- Claridad en disponibilidad

---

#### Para el Inquilino que Inició el Proceso

**Qué ven:**
- El inmueble **SÍ aparece** en sus favoritos (si lo tenía)
- El inmueble **SÍ es accesible** desde su historial
- En detalle del inmueble:
  - Badge: **"En Proceso de Contrato"** (amarillo)
  - Mensaje informativo: "Este inmueble está en proceso de contratación contigo"
  - Botón: **"Ver Contrato"** (link a vista de contrato)
  - Botón: **"Cancelar Solicitud"** (si `contract_request.status = 'pending'`)

**UX:**
- Transparencia total sobre el estado
- Acceso fácil al contrato
- Opción de cancelar si cambia de opinión

---

#### Para el Propietario/Inmobiliaria

**Qué ven:**
- El inmueble **SÍ aparece** en su lista "Mis Inmuebles"
- Badge claro: **"En Proceso de Contrato"** (amarillo)
- Contador de solicitudes pendientes (si hay múltiples)
- Link directo a:
  - Vista de contrato (si existe)
  - Modal de solicitudes (si hay solicitudes pendientes)

**UX:**
- Visibilidad completa del estado
- Control total sobre el proceso
- Opción de reactivar si el proceso falla

---

#### Para Otros Inquilinos (No involucrados)

**Qué ven:**
- El inmueble **NO aparece** en búsquedas
- Si acceden directamente por URL → Mensaje: "Este inmueble está en proceso de contratación con otro inquilino"
- **NO pueden:**
  - Marcar como favorito
  - Enviar mensaje
  - Solicitar contratación
  - Ver detalles completos

**Razón:**
- Evitar conflictos
- Claridad en disponibilidad
- Respeto al proceso activo

---

## 3. MVP de Contratos v1

### 3.1 Alcance del MVP (v1)

#### ✅ INCLUIR EN MVP

**Funcionalidades Core:**
1. **Solicitud de Contrato**
   - Inquilino puede solicitar contratación desde detalle de inmueble
   - Validación de plan PRO activo
   - Creación de `contract_request`

2. **KYC Simulado (Mock)**
   - Upload de documentos (selfie + documento)
   - Almacenamiento en storage
   - Simulación de verificación (2-3 segundos, luego `verified`)
   - No integración con proveedores externos reales

3. **Generación Automática de Contrato**
   - Template base del sistema (`standard_rental_v1`)
   - Variables automáticas (nombre, dirección, precio)
   - Generación de contenido inicial

4. **Edición Básica**
   - Editor de texto simple (Markdown o texto plano)
   - Agregar/quitar cláusulas
   - Guardar borrador
   - Enviar a inquilino

5. **Aprobación por Ambas Partes**
   - Propietario aprueba → `status = 'pending_tenant'`
   - Inquilino aprueba → `status = 'approved'`
   - Notificaciones en cada cambio de estado
   - **⚠️ v1.1:** Disclaimer legal obligatorio en cada aprobación

6. **Bloqueo del Inmueble**
   - **⚠️ v1.1: Bloqueo inmediato** cuando propietario hace clic en "Iniciar Contrato"
   - `property.status = 'locked_for_contract'` (NO espera a `active`)
   - Inmueble no aparece en búsquedas públicas
   - Badge "En Proceso de Contrato" en lista de propietario
   - Visible solo para participantes del contrato

7. **Reactivación Manual**
   - Si contrato se cancela o expira → `property.status = 'published'`
   - Botón manual "Reactivar Inmueble" en vista de contrato
   - **⚠️ v1.1:** También reactiva si contrato está en estados `draft`, `pending_*`, `cancelled`, `expired`

8. **Mensajería Básica**
   - Mensajes dentro del contexto del contrato
   - Integración con sistema de mensajería existente
   - Notificaciones de nuevos mensajes

9. **Documentos Adjuntos**
   - Subir documentos relacionados con contrato
   - Ver documentos subidos por ambas partes
   - Tipos: escritura, certificado, cédula, etc.

10. **Vista de Contrato**
    - Renderizado del contenido del contrato
    - Información de participantes
    - Estado y fechas importantes
    - Historial de mensajes
    - **⚠️ v1.1:** Disclaimer legal visible en momentos críticos

11. **⚠️ v1.1: Constraint de Un Solo Contrato Activo**
    - Validación a nivel de base de datos
    - Índice único parcial en `rental_contracts`
    - Prevención de contratos paralelos

---

#### ❌ EXCLUIR DEL MVP (v2 o futuro)

**Funcionalidades Avanzadas:**

1. **Firma Electrónica Avanzada**
   - Integración con proveedores de firma electrónica (DocuSign, SignNow, etc.)
   - Certificados digitales
   - Validez legal completa
   - **v2:** Integración con proveedor externo

2. **Pagos**
   - Integración con pasarelas de pago
   - Pagos recurrentes de arriendo
   - Depósitos y garantías
   - **v2:** Integración con Wompi o similar

3. **Notaría**
   - Integración con notarías digitales
   - Registro en notaría
   - **Futuro:** Requiere acuerdos con notarías

4. **Historial Legal Completo**
   - Versionado avanzado de contratos
   - Auditoría completa de cambios
   - Exportación legal
   - **v2:** Mejoras en versionado

5. **Validaciones Externas Real-time**
   - Verificación real de documentos con entidades gubernamentales
   - Validación de cédulas/NITs en tiempo real
   - **Futuro:** Integración con RUT, DIAN, etc.

6. **Templates Avanzados**
   - Editor visual de templates
   - Templates personalizados por inmobiliaria
   - Biblioteca de cláusulas
   - **v2:** Editor mejorado

7. **Recordatorios Automáticos**
   - Recordatorios de vencimiento
   - Renovaciones automáticas
   - **v2:** Sistema de recordatorios

8. **Analytics y Reportes**
   - Estadísticas de contratos
   - Reportes para inmobiliarias
   - **v2:** Dashboard de analytics

---

### 3.2 Dependencias de Proveedores Externos

**MVP v1:**
- ❌ Ninguna (todo simulado/mock)

**v2 (Futuro):**
- Proveedor de firma electrónica (ej: DocuSign, SignNow, SignRequest)
- Proveedor de validación de documentos (ej: Onfido, Jumio)
- Proveedor de notaría digital (si aplica en Colombia)

---

### 3.3 Limitaciones del MVP

**Técnicas:**
- KYC es simulado (no validación real)
- Firma es simulado (no tiene validez legal completa)
- No integración con pagos
- No registro en notaría

**Legales:**
- Los contratos generados son plantillas base
- No reemplazan asesoría legal profesional
- Requieren revisión legal antes de uso en producción
- Firma simulada no tiene validez legal completa
- **⚠️ v1.1:** Disclaimer legal obligatorio en momentos críticos

**UX:**
- Editor básico (no WYSIWYG avanzado)
- Templates limitados (solo template base)
- Sin versionado visual avanzado

---

## 4. Estados y Reglas de Negocio

### 4.1 Estados del Contrato (`rental_contracts.status`)

#### Estados Principales

1. **`draft`** (Borrador)
   - **Quién puede crear:** Propietario/Inmobiliaria
   - **Quién puede editar:** Solo propietario
   - **Quién puede ver:** Solo propietario
   - **⚠️ v1.1: Efecto en inmueble:** `property.status = 'locked_for_contract'` (inmediato al crear)
   - **Acciones permitidas:**
     - Editar contenido
     - Agregar/quitar cláusulas
     - Subir documentos
     - Eliminar contrato
   - **Transiciones:**
     - `draft` → `pending_tenant` (propietario envía a inquilino)

2. **`pending_tenant`** (Pendiente Aprobación Inquilino)
   - **Quién puede ver:** Ambas partes
   - **Quién puede editar:** Solo propietario (puede hacer cambios)
   - **⚠️ v1.1: Efecto en inmueble:** `property.status = 'locked_for_contract'` (mantiene bloqueo)
   - **⚠️ v1.1: Disclaimer legal:** Obligatorio visible antes de aprobar
   - **Acciones permitidas:**
     - Inquilino: Aprobar o rechazar (con aceptación de disclaimer)
     - Propietario: Editar y re-enviar
   - **Transiciones:**
     - `pending_tenant` → `approved` (inquilino aprueba)
     - `pending_tenant` → `draft` (propietario edita)
     - `pending_tenant` → `cancelled` (inquilino rechaza)

3. **`pending_owner`** (Pendiente Aprobación Propietario)
   - **Quién puede ver:** Ambas partes
   - **Quién puede editar:** Solo propietario
   - **⚠️ v1.1: Efecto en inmueble:** `property.status = 'locked_for_contract'` (mantiene bloqueo)
   - **⚠️ v1.1: Disclaimer legal:** Obligatorio visible antes de aprobar
   - **Acciones permitidas:**
     - Propietario: Aprobar o rechazar (con aceptación de disclaimer)
   - **Transiciones:**
     - `pending_owner` → `approved` (propietario aprueba)
     - `pending_owner` → `draft` (propietario edita)
     - `pending_owner` → `cancelled` (propietario rechaza)

4. **`approved`** (Aprobado por Ambas Partes)
   - **Quién puede ver:** Ambas partes
   - **Quién puede editar:** Nadie (contrato bloqueado)
   - **⚠️ v1.1: Efecto en inmueble:** `property.status = 'locked_for_contract'` (mantiene bloqueo)
   - **⚠️ v1.1: Disclaimer legal:** Obligatorio visible antes de firmar
   - **Acciones permitidas:**
     - Ambas partes: Firmar (simulado en MVP, con aceptación de disclaimer)
   - **Transiciones:**
     - `approved` → `signed` (ambas partes firman)
     - `approved` → `cancelled` (cualquiera cancela antes de firmar)

5. **`signed`** (Firmado)
   - **Quién puede ver:** Ambas partes
   - **Quién puede editar:** Nadie
   - **⚠️ v1.1: Efecto en inmueble:** `property.status = 'locked_for_contract'` (mantiene bloqueo hasta activación)
   - **Acciones permitidas:**
     - Solo lectura
   - **Transiciones:**
     - `signed` → `active` (automático después de `start_date`)

6. **`active`** (Activo)
   - **Quién puede ver:** Ambas partes
   - **Quién puede editar:** Nadie
   - **⚠️ v1.1: Efecto en inmueble:** `property.status = 'rented'` (cambio de estado)
   - **Acciones permitidas:**
     - Solo lectura
     - Propietario: "Reactivar Inmueble" (si contrato falla)
   - **Transiciones:**
     - `active` → `expired` (automático después de `end_date`)
     - `active` → `cancelled` (manual, solo propietario)

7. **`cancelled`** (Cancelado)
   - **Quién puede ver:** Ambas partes
   - **Quién puede editar:** Nadie
   - **⚠️ v1.1: Efecto en inmueble:** `property.status = 'published'` (reactivación automática)
   - **Acciones permitidas:**
     - Solo lectura
   - **Transiciones:** Ninguna (estado final)

8. **`expired`** (Expirado)
   - **Quién puede ver:** Ambas partes
   - **Quién puede editar:** Nadie
   - **⚠️ v1.1: Efecto en inmueble:** `property.status = 'published'` (reactivación automática)
   - **Acciones permitidas:**
     - Solo lectura
   - **Transiciones:** Ninguna (estado final)

---

### 4.2 Estados de Solicitud (`contract_requests.status`)

1. **`pending`** (Pendiente)
   - Solicitud creada, esperando acción del propietario
   - **Transiciones:**
     - `pending` → `approved` (propietario acepta)
     - `pending` → `rejected` (propietario rechaza)
     - `pending` → `expired` (automático después de `expires_at`)
     - `pending` → `cancelled` (inquilino cancela)

2. **`approved`** (Aprobada)
   - Propietario aceptó la solicitud
   - Se puede crear `rental_contract`
   - **⚠️ v1.1:** Al crear contrato, inmueble pasa a `locked_for_contract`
   - **Transiciones:** Ninguna (estado final positivo)

3. **`rejected`** (Rechazada)
   - Propietario rechazó la solicitud
   - **Transiciones:** Ninguna (estado final negativo)

4. **`expired`** (Expirada)
   - Solicitud expiró sin respuesta
   - **Transiciones:** Ninguna (estado final)

5. **`cancelled`** (Cancelada)
   - Inquilino canceló la solicitud
   - **Transiciones:** Ninguna (estado final)

---

### 4.3 Estados de Verificación KYC (`kyc_verifications.status`)

1. **`pending`** (Pendiente)
   - Documentos subidos, esperando verificación
   - En MVP: Simulado, cambia a `verified` después de 2-3 segundos
   - **Transiciones:**
     - `pending` → `verified` (verificación exitosa)
     - `pending` → `rejected` (verificación fallida)

2. **`verified`** (Verificado)
   - Verificación exitosa
   - Válido hasta `expires_at` (ej: 1 año)
   - **Transiciones:**
     - `verified` → `expired` (automático después de `expires_at`)

3. **`rejected`** (Rechazado)
   - Verificación fallida
   - Usuario puede re-subir documentos
   - **Transiciones:**
     - `rejected` → `pending` (usuario re-sube documentos)

4. **`expired`** (Expirado)
   - Verificación expiró
   - Usuario debe renovar
   - **Transiciones:**
     - `expired` → `pending` (usuario renueva)

---

### 4.4 Estados del Inmueble (`properties.status`)

**⚠️ v1.1: Nuevo Estado Agregado**

Estados existentes:
- `draft`: Borrador (no visible públicamente)
- `published`: Publicado (visible en búsquedas)
- `rented`: Arrendado (no visible públicamente)
- `paused`: Pausado (no visible públicamente)

**Nuevo estado v1.1:**
- **`locked_for_contract`**: Bloqueado para contratación
  - **Cuándo se activa:** Inmediatamente cuando propietario hace clic en "Iniciar Contrato"
  - **Efectos:**
    - NO aparece en búsquedas públicas
    - NO se puede marcar como favorito (para nuevos usuarios)
    - NO se pueden generar nuevas solicitudes de contrato
    - Visible solo para:
      - Propietario/inmobiliaria dueño del inmueble
      - Inquilino involucrado en el contrato activo
  - **Cuándo se reactiva:**
    - Cuando contrato pasa a `cancelled` o `expired`
    - Cuando propietario hace clic en "Reactivar Inmueble"
    - Cambia a `published` automáticamente

---

### 4.5 Reglas de Negocio

#### Regla 1: Bloqueo de Inmueble (Actualizada v1.1)

**⚠️ v1.1: Cambio Crítico - Bloqueo Inmediato**

**Cuándo se bloquea:**
- **ANTES (v1.0):** Cuando `rental_contract.status` cambia a `active`
- **AHORA (v1.1):** Inmediatamente cuando propietario hace clic en "Iniciar Contrato"
  - Se crea `rental_contract` con `status = 'draft'`
  - **Simultáneamente:** `property.status = 'locked_for_contract'`
  - NO espera a que el contrato pase a `active`

**Efectos del bloqueo (`locked_for_contract`):**
- Inmueble NO aparece en búsquedas públicas
- Inmueble NO aparece en listados para nuevos usuarios
- Inmueble NO se puede marcar como favorito (para usuarios no involucrados)
- NO se pueden generar nuevas solicitudes de contrato
- Badge "En Proceso de Contrato" visible para propietario
- Visible solo para:
  - Propietario/inmobiliaria dueño del inmueble
  - Inquilino involucrado en el contrato activo

**Cuándo se reactiva:**
- Cuando `rental_contract.status` cambia a `cancelled` o `expired`
- Trigger automático: `property.status = 'published'`
- O manualmente: Botón "Reactivar Inmueble" en vista de contrato
- **⚠️ v1.1:** También se reactiva si el contrato se cancela en estados `draft`, `pending_*`

**Transición a `rented`:**
- Solo cuando `rental_contract.status = 'active'`
- `property.status` cambia de `locked_for_contract` a `rented`

---

#### Regla 2: Un Solo Contrato Activo por Inmueble (Nueva v1.1)

**⚠️ v1.1: Regla Crítica Agregada**

**Constraint de Base de Datos:**
```sql
CREATE UNIQUE INDEX rental_contracts_property_active_unique_idx 
  ON public.rental_contracts(property_id) 
  WHERE status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active');
```

**Regla de Negocio:**
- Un inmueble solo puede tener **1 contrato** en estados activos simultáneamente
- Estados activos: `draft`, `pending_tenant`, `pending_owner`, `approved`, `active`
- Estados no activos: `signed` (transitorio), `cancelled`, `expired`

**Validación:**
- Antes de crear nuevo contrato, verificar que no existe contrato activo
- Si existe contrato activo → Error: "Este inmueble ya tiene un contrato en proceso"
- Opciones:
  1. Cancelar el contrato anterior
  2. Esperar a que expire o se cancele
  3. Continuar con el contrato existente

**Razón:**
- Evitar conflictos entre múltiples contratos
- Claridad en el proceso
- Prevención de errores de negocio
- Mejor experiencia de usuario

---

#### Regla 3: Verificación KYC Requerida

**Para Inquilino:**
- Debe tener `kyc_verifications.status = 'verified'` con `verification_type = 'person'`
- Antes de crear `contract_request`
- Antes de aprobar contrato (`status = 'pending_tenant'`)

**Para Propietario:**
- Debe tener `kyc_verifications.status = 'verified'` con `verification_type = 'person'` o `'company'`
- Antes de crear `rental_contract`
- Antes de aprobar contrato (`status = 'pending_owner'`)

**Para Inmueble (Opcional en MVP):**
- Puede tener `kyc_verifications.status = 'verified'` con `verification_type = 'property'`
- No requerido en MVP, pero se puede agregar

---

#### Regla 4: Plan PRO Requerido

**Para Inquilino:**
- Debe tener `subscriptions.status = 'active'` con plan que incluya contratos
- Validación antes de mostrar botón "Solicitar Contratación"
- Validación antes de crear `contract_request`

**Para Propietario:**
- Debe tener `subscriptions.status = 'active'` con plan PRO
- Validación antes de crear `rental_contract`
- Validación antes de acceder a editor de contratos

---

#### Regla 5: Una Solicitud Activa por Inmueble (por Inquilino)

**Constraint:**
- Un inquilino solo puede tener una `contract_request` activa (`status IN ('pending', 'approved')`) por inmueble
- Si intenta crear otra → Error o cancelar la anterior

**Razón:**
- Evitar spam de solicitudes
- Claridad en el proceso

**⚠️ v1.1: Nota:**
- Esta regla es por inquilino
- Múltiples inquilinos pueden tener solicitudes para el mismo inmueble
- Pero solo UN contrato puede estar activo (Regla 2)

---

#### Regla 6: Versionado de Contratos

**En MVP:**
- Versión simple: `version` integer
- Cada edición incrementa `version`
- `parent_contract_id` apunta a versión anterior

**En v2:**
- Historial completo de cambios
- Comparación visual entre versiones
- Restaurar versiones anteriores

---

#### Regla 7: Expiración de Solicitudes

**Tiempo de expiración:**
- `contract_requests.expires_at` = `requested_at + 7 días`
- Si expira sin respuesta → `status = 'expired'`
- Job automático (cron) para actualizar estados

---

#### Regla 8: Notificaciones

**Eventos que generan notificaciones:**
- `contract_request` creada → Notifica a propietario
- `contract_request` aprobada → Notifica a inquilino
- `rental_contract` creado → Notifica a inquilino
- `rental_contract.status` cambia → Notifica a ambas partes
- `contract_message` creado → Notifica al receptor
- `kyc_verification` verificada → Notifica al usuario
- **⚠️ v1.1:** `property.status` cambia a `locked_for_contract` → Notifica a propietario

**Integración:** Usa sistema de notificaciones existente (`notifications` table)

---

#### Regla 9: Permisos de Edición

**Quién puede editar contrato:**
- Solo propietario/inmobiliaria (`owner_id`)
- Solo cuando `status = 'draft'` o `pending_owner'`
- Una vez enviado a inquilino (`pending_tenant`), propietario puede hacer cambios pero crea nueva versión

**Quién puede aprobar:**
- Inquilino: Solo cuando `status = 'pending_tenant'`
- Propietario: Solo cuando `status = 'pending_owner'`

**Quién puede cancelar:**
- Inquilino: Solo cuando `status IN ('pending_tenant', 'approved')`
- Propietario: Solo cuando `status IN ('draft', 'pending_owner', 'approved', 'active')`

---

#### Regla 10: Integración con Mensajería

**Mensajes de contrato:**
- Se pueden vincular con `conversations` existentes mediante `contract_messages.conversation_id`
- Si no existe conversación → Se crea automáticamente
- Mensajes aparecen tanto en vista de contrato como en mensajería general

---

#### Regla 11: Documentos Adjuntos

**Quién puede subir:**
- Ambas partes cuando `status IN ('draft', 'pending_tenant', 'pending_owner', 'approved')`
- Solo lectura cuando `status IN ('signed', 'active', 'cancelled', 'expired')`

**Quién puede eliminar:**
- Solo quien subió (`uploaded_by`)
- Solo cuando `status = 'draft'`

**Tipos permitidos:**
- Escritura, Certificado, Cédula, Cámara de Comercio, Otro

---

#### Regla 12: Disclaimer Legal Obligatorio (Nueva v1.1)

**⚠️ v1.1: Regla Crítica Agregada**

**Texto del Disclaimer:**
> "Este contrato es una plantilla generada automáticamente por RenColombia y no sustituye asesoría legal profesional."

**Momentos Obligatorios:**

1. **Al crear solicitud de contrato (`ContractRequestModal`):**
   - Checkbox obligatorio antes de continuar
   - Texto visible del disclaimer
   - No se puede proceder sin aceptar

2. **Al aprobar contrato por propietario (`ContractView`, `status = 'pending_owner'`):**
   - Banner visible con disclaimer
   - Checkbox obligatorio antes de aprobar
   - Botón "Aprobar" deshabilitado hasta aceptar

3. **Al aprobar contrato por inquilino (`ContractView`, `status = 'pending_tenant'`):**
   - Banner visible con disclaimer
   - Checkbox obligatorio antes de aprobar
   - Botón "Aprobar" deshabilitado hasta aceptar

4. **Al enviar contrato a inquilino (`ContractEditor`, botón "Enviar a Inquilino"):**
   - Banner visible en editor
   - Checkbox obligatorio antes de enviar
   - Validación antes de cambiar `status = 'pending_tenant'`

5. **Al firmar contrato (`ContractView`, `status = 'approved'`):**
   - Banner visible con disclaimer
   - Checkbox obligatorio antes de firmar
   - Botón "Firmar" deshabilitado hasta aceptar

**Implementación:**
- Banner con estilo destacado (amarillo/naranja)
- Ícono de advertencia
- Checkbox con texto: "He leído y entendido el disclaimer legal"
- Validación en backend antes de cambiar estados críticos
- Registro de aceptación (opcional: campo `legal_disclaimer_accepted_at` en `rental_contracts`)

**Razón:**
- Protección legal para RenColombia
- Transparencia con usuarios
- Cumplimiento con mejores prácticas de legal-tech
- Reducción de riesgo de responsabilidad

---

### 4.6 Diagrama de Estados Completo (Actualizado v1.1)

```
[contract_requests]
pending → approved → [crear rental_contract] → property.status = 'locked_for_contract'
     ↓         ↓
  rejected  expired
     ↓
  cancelled

[rental_contracts]
draft → pending_owner → approved → signed → active → expired
  ↓         ↓              ↓         ↓        ↓
  ↓      draft         cancelled  cancelled cancelled
  ↓
pending_tenant → approved → signed → active → expired
     ↓              ↓         ↓        ↓
  cancelled     cancelled cancelled cancelled

[properties.status]
published → locked_for_contract → rented → published
              ↑                      ↓
              └── (si cancela) ──────┘

[kyc_verifications]
pending → verified → expired
   ↓         ↓
rejected  (renovar)
```

---

## 5. Consideraciones Adicionales

### 5.1 Seguridad

- Todos los documentos en storage privado
- RLS en todas las tablas nuevas
- Validación de permisos en cada acción
- Auditoría de cambios importantes
- **⚠️ v1.1:** Validación de constraint de un solo contrato activo

### 5.2 Performance

- Índices en todas las foreign keys
- Índices en campos de búsqueda frecuente (`status`, `created_at`)
- Caché de templates de contrato
- Paginación en listas de solicitudes/contratos
- **⚠️ v1.1:** Índice único parcial para constraint de contrato activo

### 5.3 Escalabilidad

- Diseño permite múltiples contratos por inmueble (historial)
- Versionado preparado para futuro
- Templates reutilizables
- Sistema de notificaciones escalable
- **⚠️ v1.1:** Bloqueo temprano reduce carga en búsquedas

### 5.4 Legal

- Templates deben ser revisados por abogado antes de producción
- **⚠️ v1.1:** Disclaimer legal obligatorio en momentos críticos
- Cumplimiento con protección de datos personales
- Registro de consentimientos
- **⚠️ v1.1:** Registro de aceptación de disclaimer (recomendado)

---

## 6. Próximos Pasos

1. **Revisión del Diseño v1.1**
   - Revisión técnica del modelo de datos (especialmente constraint de contrato único)
   - Revisión legal de templates y disclaimers
   - Aprobación de producto

2. **Implementación Fase 1**
   - Crear migraciones SQL (incluyendo actualización de CHECK constraint)
   - Implementar servicios backend
   - Implementar componentes UI básicos
   - **⚠️ v1.1:** Implementar bloqueo inmediato de inmueble
   - **⚠️ v1.1:** Implementar constraint de contrato único
   - **⚠️ v1.1:** Implementar disclaimers legales

3. **Testing**
   - Testing de flujos completos
   - Testing de permisos y seguridad
   - Testing de integración con sistemas existentes
   - **⚠️ v1.1:** Testing de bloqueo inmediato
   - **⚠️ v1.1:** Testing de constraint de contrato único
   - **⚠️ v1.1:** Testing de visibilidad según tipo de usuario

4. **MVP Release**
   - Lanzamiento controlado
   - Monitoreo de uso
   - Recolección de feedback

5. **Iteración v2**
   - Integración con firma electrónica
   - Mejoras en editor
   - Analytics y reportes

---

**Fin del Documento de Diseño**

**Versión:** 1.1  
**Última actualización:** 2024  
**Cambios desde v1.0:** Ver Changelog v1.1 al inicio del documento  
**Próxima revisión:** Después de implementación MVP
