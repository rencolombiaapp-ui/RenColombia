-- ============================================
-- Sistema de Suscripciones y Planes
-- ============================================

-- Tabla de planes disponibles
create table if not exists public.plans (
  id text primary key,
  name text not null,
  description text,
  price_monthly decimal(10, 2) not null,
  price_currency text default 'COP',
  user_type text not null check (user_type in ('tenant', 'landlord', 'inmobiliaria')),
  features jsonb default '[]'::jsonb,
  max_properties integer, -- null = ilimitado
  includes_price_insights boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Comentarios
comment on table public.plans is 'Planes de suscripción disponibles';
comment on column public.plans.user_type is 'Tipo de usuario al que aplica el plan';
comment on column public.plans.max_properties is 'Límite de propiedades (null = ilimitado)';
comment on column public.plans.includes_price_insights is 'Si el plan incluye análisis de precios';

-- Tabla de suscripciones activas
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_id text references public.plans(id) not null,
  status text not null default 'active' check (status in ('active', 'canceled', 'expired', 'pending_payment')),
  wompi_transaction_id text unique, -- ID de transacción en Wompi
  wompi_subscription_id text, -- ID de suscripción recurrente en Wompi (si aplica)
  started_at timestamp with time zone default now(),
  expires_at timestamp with time zone, -- null = sin expiración (recurrente)
  canceled_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Comentarios
comment on table public.subscriptions is 'Suscripciones activas de los usuarios';
comment on column public.subscriptions.status is 'Estado de la suscripción';
comment on column public.subscriptions.wompi_transaction_id is 'ID de la transacción en Wompi';
comment on column public.subscriptions.wompi_subscription_id is 'ID de suscripción recurrente en Wompi';

-- Tabla de transacciones de pago
create table if not exists public.payment_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan_id text references public.plans(id) not null,
  wompi_transaction_id text unique not null,
  amount decimal(10, 2) not null,
  currency text default 'COP',
  status text not null check (status in ('pending', 'approved', 'declined', 'voided', 'error')),
  payment_method text, -- 'card', 'nequi', 'pse', etc.
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Comentarios
comment on table public.payment_transactions is 'Registro de todas las transacciones de pago';
comment on column public.payment_transactions.wompi_transaction_id is 'ID único de la transacción en Wompi';

-- Índices
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_expires_at_idx on public.subscriptions(expires_at);
create index if not exists payment_transactions_user_id_idx on public.payment_transactions(user_id);
create index if not exists payment_transactions_wompi_transaction_id_idx on public.payment_transactions(wompi_transaction_id);

-- Índice único parcial: solo una suscripción activa por usuario
create unique index if not exists subscriptions_user_active_unique_idx 
  on public.subscriptions(user_id) 
  where status = 'active';

-- RLS para plans
alter table public.plans enable row level security;
drop policy if exists "Planes visibles para todos" on public.plans;
create policy "Planes visibles para todos"
  on public.plans for select
  using (is_active = true);

-- RLS para subscriptions
alter table public.subscriptions enable row level security;
drop policy if exists "Usuarios pueden ver sus propias suscripciones" on public.subscriptions;
create policy "Usuarios pueden ver sus propias suscripciones"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Sistema puede insertar suscripciones" on public.subscriptions;
create policy "Sistema puede insertar suscripciones"
  on public.subscriptions for insert
  with check (true); -- Controlado por funciones

drop policy if exists "Sistema puede actualizar suscripciones" on public.subscriptions;
create policy "Sistema puede actualizar suscripciones"
  on public.subscriptions for update
  using (true); -- Controlado por funciones

-- RLS para payment_transactions
alter table public.payment_transactions enable row level security;
drop policy if exists "Usuarios pueden ver sus propias transacciones" on public.payment_transactions;
create policy "Usuarios pueden ver sus propias transacciones"
  on public.payment_transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Sistema puede insertar transacciones" on public.payment_transactions;
create policy "Sistema puede insertar transacciones"
  on public.payment_transactions for insert
  with check (true); -- Controlado por funciones

-- Función para obtener plan activo del usuario
create or replace function public.get_user_active_plan(user_uuid uuid)
returns table (
  plan_id text,
  plan_name text,
  includes_price_insights boolean,
  max_properties integer,
  expires_at timestamp with time zone
) as $$
begin
  return query
  select 
    p.id,
    p.name,
    p.includes_price_insights,
    p.max_properties,
    s.expires_at
  from public.subscriptions s
  join public.plans p on s.plan_id = p.id
  where s.user_id = user_uuid
    and s.status = 'active'
    and (s.expires_at is null or s.expires_at > now())
  order by s.created_at desc
  limit 1;
end;
$$ language plpgsql security definer;

-- Función para verificar si usuario tiene acceso a price insights
create or replace function public.user_has_price_insights_access(user_uuid uuid)
returns boolean as $$
declare
  has_access boolean;
begin
  select exists (
    select 1
    from public.subscriptions s
    join public.plans p on s.plan_id = p.id
    where s.user_id = user_uuid
      and s.status = 'active'
      and p.includes_price_insights = true
      and (s.expires_at is null or s.expires_at > now())
  ) into has_access;
  
  return coalesce(has_access, false);
end;
$$ language plpgsql security definer;

-- Insertar planes iniciales
insert into public.plans (id, name, description, price_monthly, user_type, max_properties, includes_price_insights) values
  ('tenant_free', 'Free', 'Plan gratuito para inquilinos - Acceso completo a búsqueda y funcionalidades básicas', 0, 'tenant', null, false),
  ('landlord_free', 'Free', 'Plan gratuito para propietarios - Pensado para probar la plataforma y subir un inmueble básico', 0, 'landlord', 1, false),
  ('landlord_pro', 'PRO', 'Plan premium para propietarios - Pensado para propietarios que quieren resultados reales', 29900, 'landlord', 5, true),
  ('inmobiliaria_free', 'Free', 'Plan gratuito para inmobiliarias - Perfil básico y hasta 3 inmuebles', 0, 'inmobiliaria', 3, false),
  ('inmobiliaria_pro', 'PRO', 'Plan premium para inmobiliarias', 149900, 'inmobiliaria', null, true)
on conflict (id) do update set
  max_properties = EXCLUDED.max_properties,
  description = EXCLUDED.description,
  includes_price_insights = EXCLUDED.includes_price_insights;

-- Trigger para actualizar updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_subscriptions_updated_at on public.subscriptions;
create trigger update_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.update_updated_at_column();

drop trigger if exists update_payment_transactions_updated_at on public.payment_transactions;
create trigger update_payment_transactions_updated_at
  before update on public.payment_transactions
  for each row
  execute function public.update_updated_at_column();
