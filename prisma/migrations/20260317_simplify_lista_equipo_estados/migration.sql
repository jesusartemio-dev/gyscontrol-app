-- Simplify ListaEquipo states: 9 → 6
-- Remove: enviada, por_validar, completada, rechazada
-- Add: anulada
-- Also simplify ListaEquipoItem states: 7 → 5
-- Remove: por_validar, rechazado

-- ============================================================
-- Step 1: Add new columns to lista_equipo
-- ============================================================
ALTER TABLE "lista_equipo" ADD COLUMN IF NOT EXISTS "fechaAnulacion" TIMESTAMP(3);
ALTER TABLE "lista_equipo" ADD COLUMN IF NOT EXISTS "motivoAnulacion" TEXT;

-- ============================================================
-- Step 2: Migrate existing data in removed states (ListaEquipo)
-- ============================================================
-- enviada → por_revisar (was just a transit state)
UPDATE "lista_equipo" SET "estado" = 'por_revisar' WHERE "estado" = 'enviada';
-- por_validar → por_cotizar (validation step removed, go back to cotizar)
UPDATE "lista_equipo" SET "estado" = 'por_cotizar' WHERE "estado" = 'por_validar';
-- completada → aprobada (terminal state merged)
UPDATE "lista_equipo" SET "estado" = 'aprobada' WHERE "estado" = 'completada';
-- rechazada → anulada (rejected lists become annulled)
UPDATE "lista_equipo" SET "estado" = 'anulada', "motivoAnulacion" = 'Migrado desde estado rechazada' WHERE "estado" = 'rechazada';

-- ============================================================
-- Step 3: Migrate existing data in removed states (ListaEquipoItem)
-- ============================================================
-- por_validar → por_cotizar
UPDATE "ListaEquipoItem" SET "estado" = 'por_cotizar' WHERE "estado" = 'por_validar';
-- rechazado → borrador
UPDATE "ListaEquipoItem" SET "estado" = 'borrador' WHERE "estado" = 'rechazado';

-- ============================================================
-- Step 4: Recreate EstadoListaEquipo enum
-- ============================================================
-- Create new enum type
CREATE TYPE "EstadoListaEquipo_new" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_aprobar', 'aprobada', 'anulada');

-- Update column to use new type
ALTER TABLE "lista_equipo" ALTER COLUMN "estado" TYPE "EstadoListaEquipo_new" USING ("estado"::text::"EstadoListaEquipo_new");

-- Drop old enum and rename new one
DROP TYPE "EstadoListaEquipo";
ALTER TYPE "EstadoListaEquipo_new" RENAME TO "EstadoListaEquipo";

-- ============================================================
-- Step 5: Recreate EstadoListaItem enum
-- ============================================================
-- Create new enum type
CREATE TYPE "EstadoListaItem_new" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_aprobar', 'aprobado');

-- Update column to use new type
ALTER TABLE "ListaEquipoItem" ALTER COLUMN "estado" TYPE "EstadoListaItem_new" USING ("estado"::text::"EstadoListaItem_new");

-- Drop old enum and rename new one
DROP TYPE "EstadoListaItem";
ALTER TYPE "EstadoListaItem_new" RENAME TO "EstadoListaItem";
