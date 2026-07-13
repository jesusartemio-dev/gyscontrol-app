-- AlterTable
ALTER TABLE "proyecto_tarea" ADD COLUMN     "esPropuestaIA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "justificacionIA" TEXT;

-- CreateTable
CREATE TABLE "cronograma_ia_sugerencia_aceptada" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "generacionId" TEXT,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "edtNombre" TEXT NOT NULL,
    "justificacion" TEXT,
    "aceptadaPorId" TEXT NOT NULL,
    "aceptadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cronograma_ia_sugerencia_aceptada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cronograma_ia_sugerencia_aceptada_nombreNormalizado_idx" ON "cronograma_ia_sugerencia_aceptada"("nombreNormalizado");

-- AddForeignKey
ALTER TABLE "cronograma_ia_sugerencia_aceptada" ADD CONSTRAINT "cronograma_ia_sugerencia_aceptada_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronograma_ia_sugerencia_aceptada" ADD CONSTRAINT "cronograma_ia_sugerencia_aceptada_generacionId_fkey" FOREIGN KEY ("generacionId") REFERENCES "proyecto_cronograma_generacion_ia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronograma_ia_sugerencia_aceptada" ADD CONSTRAINT "cronograma_ia_sugerencia_aceptada_aceptadaPorId_fkey" FOREIGN KEY ("aceptadaPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
