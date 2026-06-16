-- Vincula RegistroAvance con RegistroHorasCampoTarea
-- Permite que los registros de evidencia técnica se asocien a cualquier tarea de la jornada
-- (tanto tareas del cronograma como tareas extras)

ALTER TABLE "registro_avance"
  ADD COLUMN "registroHorasCampoTareaId" TEXT;

ALTER TABLE "registro_avance"
  ADD CONSTRAINT "registro_avance_registroHorasCampoTareaId_fkey"
  FOREIGN KEY ("registroHorasCampoTareaId")
  REFERENCES "registro_horas_campo_tarea"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "registro_avance_registroHorasCampoTareaId_idx"
  ON "registro_avance"("registroHorasCampoTareaId");
