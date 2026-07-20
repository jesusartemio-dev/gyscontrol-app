-- AlterTable
ALTER TABLE "plan_trabajo_generacion" ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'GENERADO',
ADD COLUMN     "vigente" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "plan_trabajo_imagen_pendiente" (
    "id" TEXT NOT NULL,
    "planTrabajoId" TEXT NOT NULL,
    "generacionId" TEXT,
    "driveFileId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "tipoArchivo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_trabajo_imagen_pendiente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_trabajo_imagen_pendiente_planTrabajoId_idx" ON "plan_trabajo_imagen_pendiente"("planTrabajoId");

-- AddForeignKey
ALTER TABLE "plan_trabajo_imagen_pendiente" ADD CONSTRAINT "plan_trabajo_imagen_pendiente_planTrabajoId_fkey" FOREIGN KEY ("planTrabajoId") REFERENCES "plan_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_trabajo_imagen_pendiente" ADD CONSTRAINT "plan_trabajo_imagen_pendiente_generacionId_fkey" FOREIGN KEY ("generacionId") REFERENCES "plan_trabajo_generacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
