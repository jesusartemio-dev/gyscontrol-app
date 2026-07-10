-- AlterTable
ALTER TABLE "proyecto_tarea" ADD COLUMN     "catalogoServicioId" TEXT;

-- CreateTable
CREATE TABLE "proyecto_tarea_responsable_asignacion" (
    "id" TEXT NOT NULL,
    "proyectoTareaId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "matrizFilaId" TEXT,
    "edtCodigo" TEXT NOT NULL,
    "responsableIdAsignado" TEXT NOT NULL,
    "codigoOrigen" TEXT NOT NULL,
    "asignadoPorId" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_tarea_responsable_asignacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proyecto_tarea_responsable_asignacion_proyectoId_idx" ON "proyecto_tarea_responsable_asignacion"("proyectoId");

-- CreateIndex
CREATE INDEX "proyecto_tarea_responsable_asignacion_proyectoTareaId_idx" ON "proyecto_tarea_responsable_asignacion"("proyectoTareaId");

-- CreateIndex
CREATE INDEX "proyecto_tarea_catalogoServicioId_idx" ON "proyecto_tarea"("catalogoServicioId");

-- AddForeignKey
ALTER TABLE "proyecto_tarea_responsable_asignacion" ADD CONSTRAINT "proyecto_tarea_responsable_asignacion_proyectoTareaId_fkey" FOREIGN KEY ("proyectoTareaId") REFERENCES "proyecto_tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea_responsable_asignacion" ADD CONSTRAINT "proyecto_tarea_responsable_asignacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea_responsable_asignacion" ADD CONSTRAINT "proyecto_tarea_responsable_asignacion_matrizFilaId_fkey" FOREIGN KEY ("matrizFilaId") REFERENCES "matriz_comunicacion_fila"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea_responsable_asignacion" ADD CONSTRAINT "proyecto_tarea_responsable_asignacion_responsableIdAsignad_fkey" FOREIGN KEY ("responsableIdAsignado") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea_responsable_asignacion" ADD CONSTRAINT "proyecto_tarea_responsable_asignacion_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea" ADD CONSTRAINT "proyecto_tarea_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "catalogo_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
