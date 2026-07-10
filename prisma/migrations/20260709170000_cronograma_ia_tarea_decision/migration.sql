-- CreateTable
CREATE TABLE "cronograma_ia_tarea_decision" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "generacionId" TEXT,
    "catalogoServicioId" TEXT NOT NULL,
    "edtNombre" TEXT NOT NULL,
    "actividadNombre" TEXT NOT NULL,
    "reglaClave" TEXT,
    "incluidaPorRegla" BOOLEAN NOT NULL,
    "incluidaFinal" BOOLEAN NOT NULL,
    "forzada" BOOLEAN NOT NULL,
    "decididoPorId" TEXT NOT NULL,
    "decididoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cronograma_ia_tarea_decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cronograma_ia_tarea_decision_catalogoServicioId_reglaClave_idx" ON "cronograma_ia_tarea_decision"("catalogoServicioId", "reglaClave");

-- CreateIndex
CREATE INDEX "cronograma_ia_tarea_decision_proyectoId_idx" ON "cronograma_ia_tarea_decision"("proyectoId");

-- AddForeignKey
ALTER TABLE "cronograma_ia_tarea_decision" ADD CONSTRAINT "cronograma_ia_tarea_decision_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronograma_ia_tarea_decision" ADD CONSTRAINT "cronograma_ia_tarea_decision_generacionId_fkey" FOREIGN KEY ("generacionId") REFERENCES "proyecto_cronograma_generacion_ia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronograma_ia_tarea_decision" ADD CONSTRAINT "cronograma_ia_tarea_decision_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "catalogo_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronograma_ia_tarea_decision" ADD CONSTRAINT "cronograma_ia_tarea_decision_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
