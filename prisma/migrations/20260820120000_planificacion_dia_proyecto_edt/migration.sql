-- AlterTable
ALTER TABLE "planificacion_dia" ADD COLUMN     "proyectoEdtId" TEXT;

-- CreateIndex
CREATE INDEX "planificacion_dia_proyectoEdtId_fecha_idx" ON "planificacion_dia"("proyectoEdtId", "fecha");

-- AddForeignKey
ALTER TABLE "planificacion_dia" ADD CONSTRAINT "planificacion_dia_proyectoEdtId_fkey" FOREIGN KEY ("proyectoEdtId") REFERENCES "proyecto_edt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
