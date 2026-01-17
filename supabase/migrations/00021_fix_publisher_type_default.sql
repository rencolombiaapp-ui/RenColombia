-- ============================================
-- Corregir default de publisher_type a NULL
-- ============================================
-- 
-- Cambiar el default de publisher_type de 'individual' a NULL
-- para que los nuevos usuarios vean "Seleccionar" por defecto
-- y deban elegir antes de publicar

-- Eliminar el default actual
ALTER TABLE public.profiles 
  ALTER COLUMN publisher_type DROP DEFAULT;

-- Establecer default a NULL
ALTER TABLE public.profiles 
  ALTER COLUMN publisher_type SET DEFAULT NULL;

-- Actualizar usuarios existentes que tengan 'individual' pero no hayan publicado
-- (opcional: solo si quieres que los usuarios sin propiedades vuelvan a seleccionar)
-- UPDATE public.profiles 
-- SET publisher_type = NULL 
-- WHERE publisher_type = 'individual' 
--   AND NOT EXISTS (
--     SELECT 1 FROM public.properties WHERE owner_id = profiles.id
--   );
