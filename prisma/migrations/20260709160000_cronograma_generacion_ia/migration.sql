-- AlterTable
ALTER TABLE "proyecto_cronograma" ADD COLUMN     "operacionIAEnCurso" TEXT,
ADD COLUMN     "operacionIAIniciadaEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "proyecto_cronograma_generacion_ia" (
    "id" TEXT NOT NULL,
    "proyectoCronogramaId" TEXT NOT NULL,
    "configuracion" JSONB NOT NULL,
    "propuestaActividades" JSONB,
    "propuestaTareas" JSONB,
    "resultado" JSONB,
    "advertencias" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "generadoPorId" TEXT NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aplicadoEn" TIMESTAMP(3),

    CONSTRAINT "proyecto_cronograma_generacion_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proyecto_cronograma_generacion_ia_proyectoCronogramaId_gene_idx" ON "proyecto_cronograma_generacion_ia"("proyectoCronogramaId", "generadoEn" DESC);

-- AddForeignKey
ALTER TABLE "proyecto_cronograma_generacion_ia" ADD CONSTRAINT "proyecto_cronograma_generacion_ia_proyectoCronogramaId_fkey" FOREIGN KEY ("proyectoCronogramaId") REFERENCES "proyecto_cronograma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_cronograma_generacion_ia" ADD CONSTRAINT "proyecto_cronograma_generacion_ia_generadoPorId_fkey" FOREIGN KEY ("generadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
