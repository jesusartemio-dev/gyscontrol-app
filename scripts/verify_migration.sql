-- Verificar estado de la migración de zonas
-- Ejecutar después de la migración para confirmar que todo está correcto

-- 1. Verificar que no existe tabla proyecto_zonas
SELECT COUNT(*) as zonas_table_exists
FROM information_schema.tables
WHERE table_name = 'proyecto_zonas';

-- 2. Verificar que actividades tienen proyecto_edt_id NOT NULL
SELECT COUNT(*) as actividades_sin_edt
FROM proyecto_actividades
WHERE proyecto_edt_id IS NULL;

-- 3. Verificar que no existe columna proyecto_zona_id
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'proyecto_actividades'
AND column_name = 'proyecto_zona_id';

-- 4. Contar total de actividades
SELECT COUNT(*) as total_actividades FROM proyecto_actividades;

-- 5. Verificar estructura de una actividad de ejemplo
SELECT id, nombre, proyecto_id, proyecto_edt_id
FROM proyecto_actividades
LIMIT 1;