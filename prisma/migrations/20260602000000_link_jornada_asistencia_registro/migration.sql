-- Add proyectoId and registroHorasCampoId to jornada_asistencia
ALTER TABLE "jornada_asistencia" ADD COLUMN "proyectoId" TEXT;
ALTER TABLE "jornada_asistencia" ADD COLUMN "registroHorasCampoId" TEXT;

-- Unique index for the 1:1 link
CREATE UNIQUE INDEX "jornada_asistencia_registroHorasCampoId_key"
  ON "jornada_asistencia"("registroHorasCampoId");

-- Index for project lookups
CREATE INDEX "jornada_asistencia_proyectoId_idx"
  ON "jornada_asistencia"("proyectoId");

-- FK: jornada_asistencia.proyectoId -> proyecto.id
ALTER TABLE "jornada_asistencia"
  ADD CONSTRAINT "jornada_asistencia_proyectoId_fkey"
  FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: jornada_asistencia.registroHorasCampoId -> registro_horas_campo.id
ALTER TABLE "jornada_asistencia"
  ADD CONSTRAINT "jornada_asistencia_registroHorasCampoId_fkey"
  FOREIGN KEY ("registroHorasCampoId") REFERENCES "registro_horas_campo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
