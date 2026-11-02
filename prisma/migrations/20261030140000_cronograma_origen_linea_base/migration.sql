-- Vínculo ejecución → línea base, para "Traer cambios de la línea base"
ALTER TABLE "proyecto_actividad" ADD COLUMN "origenActividadId" TEXT;
ALTER TABLE "proyecto_tarea" ADD COLUMN "origenTareaId" TEXT;

CREATE INDEX "proyecto_actividad_origenActividadId_idx" ON "proyecto_actividad"("origenActividadId");
CREATE INDEX "proyecto_tarea_origenTareaId_idx" ON "proyecto_tarea"("origenTareaId");
