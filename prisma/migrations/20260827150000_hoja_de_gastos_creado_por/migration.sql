-- Separa "quién generó la hoja" de "quién recibe el dinero" (empleadoId).
-- Caso de uso: pago a terceros — el supervisor la crea, el dinero va a la
-- cuenta del tercero. Aditiva, nullable: las hojas normales (donde creador y
-- beneficiario son la misma persona) no la necesitan.
ALTER TABLE "hoja_de_gastos" ADD COLUMN IF NOT EXISTS "creadoPorId" TEXT;

ALTER TABLE "hoja_de_gastos"
  ADD CONSTRAINT "hoja_de_gastos_creadoPorId_fkey"
  FOREIGN KEY ("creadoPorId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "hoja_de_gastos_creadoPorId_idx" ON "hoja_de_gastos"("creadoPorId");
