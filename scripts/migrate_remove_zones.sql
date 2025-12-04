-- Migration: Remove Zones from Cronograma System
-- Description: Eliminates the ProyectoZona table and migrates activities directly under EDTs
-- Date: October 2025
-- Version: 5.0.0

BEGIN;

-- Step 1: Create backup of current data (for rollback purposes)
CREATE TABLE IF NOT EXISTS proyecto_zonas_backup AS
SELECT * FROM proyecto_zonas;

CREATE TABLE IF NOT EXISTS proyecto_actividades_backup AS
SELECT * FROM proyecto_actividades;

-- Step 2: Reassign activities from zones to their parent EDTs
UPDATE proyecto_actividades
SET proyecto_edt_id = (
  SELECT pz.proyecto_edt_id
  FROM proyecto_zonas pz
  WHERE pz.id = proyecto_actividades.proyecto_zona_id
)
WHERE proyecto_zona_id IS NOT NULL;

-- Step 3: Make proyecto_edt_id NOT NULL for activities
ALTER TABLE proyecto_actividades
ALTER COLUMN proyecto_edt_id SET NOT NULL;

-- Step 4: Drop foreign key constraint for zona
ALTER TABLE proyecto_actividades
DROP CONSTRAINT IF EXISTS proyecto_actividades_proyecto_zona_id_fkey;

-- Step 5: Drop the zona_id column from activities
ALTER TABLE proyecto_actividades
DROP COLUMN IF EXISTS proyecto_zona_id;

-- Step 6: Drop the proyecto_zonas table
DROP TABLE IF EXISTS proyecto_zonas;

-- Step 7: Update any indexes or constraints that referenced zones
-- (Prisma will handle this when schema is regenerated)

COMMIT;

-- Verification queries (run after migration)
-- SELECT COUNT(*) as actividades_sin_edt FROM proyecto_actividades WHERE proyecto_edt_id IS NULL;
-- SELECT COUNT(*) as zonas_restantes FROM information_schema.tables WHERE table_name = 'proyecto_zonas';