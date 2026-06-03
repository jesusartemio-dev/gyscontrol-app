-- Agrega creadoPorId a RegistroHorasCampo para auditar al creador original,
-- ya que ahora supervisorId puede reasignarse a un responsable.

ALTER TABLE "registro_horas_campo" ADD COLUMN "creadoPorId" TEXT;

-- Backfill: el creador original es el supervisor actual de cada jornada existente.
UPDATE "registro_horas_campo" SET "creadoPorId" = "supervisorId" WHERE "creadoPorId" IS NULL;

ALTER TABLE "registro_horas_campo"
  ADD CONSTRAINT "registro_horas_campo_creadoPorId_fkey"
  FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
