-- AlterTable
ALTER TABLE "plan_trabajo_imagen_pendiente" ADD COLUMN "posibleReemplazoDeId" TEXT;

-- AddForeignKey
ALTER TABLE "plan_trabajo_imagen_pendiente" ADD CONSTRAINT "plan_trabajo_imagen_pendiente_posibleReemplazoDeId_fkey" FOREIGN KEY ("posibleReemplazoDeId") REFERENCES "plan_trabajo_imagen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
