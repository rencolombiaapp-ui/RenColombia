-- Actualizar planes de propietarios con las especificaciones correctas
-- Esta migración actualiza los planes existentes si ya fueron creados

-- Actualizar plan Free de propietarios
update public.plans
set 
  description = 'Plan gratuito para propietarios - Pensado para probar la plataforma y subir un inmueble básico',
  max_properties = 1,
  includes_price_insights = false
where id = 'landlord_free';

-- Actualizar plan PRO de propietarios
update public.plans
set 
  description = 'Plan premium para propietarios - Pensado para propietarios que quieren resultados reales',
  max_properties = 5, -- Cambiar de ilimitado (null) a 5 inmuebles
  includes_price_insights = true
where id = 'landlord_pro';

-- Si los planes no existen, crearlos
insert into public.plans (id, name, description, price_monthly, user_type, max_properties, includes_price_insights) 
values
  ('tenant_free', 'Free', 'Plan gratuito para inquilinos - Acceso completo a búsqueda y funcionalidades básicas', 0, 'tenant', null, false),
  ('landlord_free', 'Free', 'Plan gratuito para propietarios - Pensado para probar la plataforma y subir un inmueble básico', 0, 'landlord', 1, false),
  ('landlord_pro', 'PRO', 'Plan premium para propietarios - Pensado para propietarios que quieren resultados reales', 29900, 'landlord', 5, true),
  ('inmobiliaria_free', 'Free', 'Plan gratuito para inmobiliarias - Perfil básico y hasta 3 inmuebles', 0, 'inmobiliaria', 3, false)
on conflict (id) do update set
  max_properties = EXCLUDED.max_properties,
  description = EXCLUDED.description,
  includes_price_insights = EXCLUDED.includes_price_insights;
