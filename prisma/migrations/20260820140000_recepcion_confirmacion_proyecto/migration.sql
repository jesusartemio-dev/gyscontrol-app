-- Conformidad del proyecto sobre lo despachado por Logística.
-- El valor nuevo del enum NO se puede usar en esta misma transacción; el backfill
-- de las filas históricas va en la migración siguiente.

-- AlterEnum
ALTER TYPE "EstadoRecepcion" ADD VALUE 'confirmado_proyecto';

-- AlterTable
ALTER TABLE "recepcion_pendiente"
  ADD COLUMN "confirmadoProyectoPorId"   TEXT,
  ADD COLUMN "fechaConfirmacionProyecto" TIMESTAMP(3),
  ADD COLUMN "cantidadConfirmada"        DOUBLE PRECISION,
  ADD COLUMN "observacionesConformidad"  TEXT;

-- AddForeignKey
ALTER TABLE "recepcion_pendiente"
  ADD CONSTRAINT "recepcion_pendiente_confirmadoProyectoPorId_fkey"
  FOREIGN KEY ("confirmadoProyectoPorId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
