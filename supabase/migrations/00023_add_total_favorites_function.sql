-- ============================================
-- Función para calcular el total de favoritos de un propietario
-- ============================================
-- Calcula la suma de todos los favoritos recibidos en todos los inmuebles
-- publicados por un propietario o inmobiliaria

-- Función RPC para obtener el total de favoritos de un propietario
create or replace function public.get_total_favorites_for_owner(owner_uuid uuid)
returns integer as $$
begin
  return (
    select count(*)::integer
    from public.favorites f
    inner join public.properties p on p.id = f.property_id
    where p.owner_id = owner_uuid
  );
end;
$$ language plpgsql security definer;

-- Comentario de documentación
comment on function public.get_total_favorites_for_owner(uuid) is 'Calcula el total de favoritos recibidos en todos los inmuebles de un propietario o inmobiliaria';

-- ============================================
-- Función para obtener el conteo de favoritos por propiedad
-- ============================================
-- Retorna un JSON con property_id y favorites_count para múltiples propiedades

create or replace function public.get_favorites_count_by_properties(property_ids uuid[])
returns table (
  property_id uuid,
  favorites_count integer
) as $$
begin
  return query
  select 
    f.property_id,
    count(*)::integer as favorites_count
  from public.favorites f
  where f.property_id = any(property_ids)
  group by f.property_id;
end;
$$ language plpgsql security definer;

-- Comentario de documentación
comment on function public.get_favorites_count_by_properties(uuid[]) is 'Obtiene el conteo de favoritos para múltiples propiedades. Retorna solo las propiedades que tienen favoritos.';
