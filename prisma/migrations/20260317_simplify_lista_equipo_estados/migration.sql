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
-- Step 2: Migrate ListaEquipo data to valid states WITHIN old enum
-- ============================================================
UPDATE "lista_equipo" SET "estado" = 'por_revisar' WHERE "estado" = 'enviada';
UPDATE "lista_equipo" SET "estado" = 'por_cotizar' WHERE "estado" = 'por_validar';
UPDATE "lista_equipo" SET "estado" = 'aprobada' WHERE "estado" = 'completada';
UPDATE "lista_equipo" SET "motivoAnulacion" = 'Migrado desde estado rechazada' WHERE "estado" = 'rechazada';

-- ============================================================
-- Step 3: Migrate ListaEquipoItem data within old enum
-- ============================================================
UPDATE "lista_equipo_item" SET "estado" = 'por_cotizar' WHERE "estado" = 'por_validar';
UPDATE "lista_equipo_item" SET "estado" = 'borrador' WHERE "estado" = 'rechazado';

-- ============================================================
-- Step 4: Recreate EstadoListaEquipo enum
-- Must drop defaults before changing enum type, then restore them
-- ============================================================
CREATE TYPE "EstadoListaEquipo_new" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_aprobar', 'aprobada', 'anulada');

ALTER TABLE "lista_equipo" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "lista_equipo" ALTER COLUMN "estado" TYPE "EstadoListaEquipo_new"
  USING (CASE WHEN "estado"::text = 'rechazada' THEN 'anulada'::"EstadoListaEquipo_new" ELSE "estado"::text::"EstadoListaEquipo_new" END);
ALTER TABLE "lista_equipo" ALTER COLUMN "estado" SET DEFAULT 'borrador'::"EstadoListaEquipo_new";

DROP TYPE "EstadoListaEquipo";
ALTER TYPE "EstadoListaEquipo_new" RENAME TO "EstadoListaEquipo";

-- ============================================================
-- Step 5: Recreate EstadoListaItem enum
-- ============================================================
CREATE TYPE "EstadoListaItem_new" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_aprobar', 'aprobado');

ALTER TABLE "lista_equipo_item" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "lista_equipo_item" ALTER COLUMN "estado" TYPE "EstadoListaItem_new"
  USING ("estado"::text::"EstadoListaItem_new");
ALTER TABLE "lista_equipo_item" ALTER COLUMN "estado" SET DEFAULT 'borrador'::"EstadoListaItem_new";

DROP TYPE "EstadoListaItem";
ALTER TYPE "EstadoListaItem_new" RENAME TO "EstadoListaItem";
