-- Script: Vincular ListaEquipoItem existentes con CatalogoEquipo por código
-- Ejecutar en local y producción

-- 1. Verificar cuántos registros se vincularán
SELECT COUNT(*) as items_a_vincular
FROM lista_equipo_item lei
JOIN catalogo_equipo ce ON LOWER(TRIM(lei.codigo)) = LOWER(TRIM(ce.codigo))
WHERE lei."catalogoEquipoId" IS NULL
  AND ce.codigo IS NOT NULL AND ce.codigo != '';

-- 2. Preview de los registros que se vincularán
SELECT lei.id, lei.codigo, lei.descripcion, lei.origen, ce.id as catalogo_id, ce.codigo as catalogo_codigo
FROM lista_equipo_item lei
JOIN catalogo_equipo ce ON LOWER(TRIM(lei.codigo)) = LOWER(TRIM(ce.codigo))
WHERE lei."catalogoEquipoId" IS NULL
  AND ce.codigo IS NOT NULL AND ce.codigo != ''
LIMIT 20;

-- 3. Ejecutar la vinculación
UPDATE lista_equipo_item lei
SET "catalogoEquipoId" = ce.id
FROM catalogo_equipo ce
WHERE lei."catalogoEquipoId" IS NULL
  AND LOWER(TRIM(lei.codigo)) = LOWER(TRIM(ce.codigo))
  AND ce.codigo IS NOT NULL
  AND ce.codigo != '';
