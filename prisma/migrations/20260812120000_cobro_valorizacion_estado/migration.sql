-- CreateEnum
CREATE TYPE "EstadoCobroValorizacion" AS ENUM ('en_negociacion', 'desembolsada', 'confirmada', 'letra_cambio');

-- AlterTable
ALTER TABLE "cobro_valorizacion" ADD COLUMN     "estado" "EstadoCobroValorizacion" NOT NULL DEFAULT 'en_negociacion',
ADD COLUMN     "fechaConfirmacion" TIMESTAMP(3);

-- Backfill: las operaciones que ya tienen fechaDesembolso poblada no deben quedar en
-- 'en_negociacion' (el default de la columna) -- eso retrocedería su estado real.
-- Ninguna fila existente se marca 'confirmada' ni 'letra_cambio': no hay dato de
-- confirmación ni de impago para ninguna operación histórica.
UPDATE "cobro_valorizacion" SET "estado" = 'desembolsada' WHERE "fechaDesembolso" IS NOT NULL;
