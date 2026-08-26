-- Liquidación de terceros: evita pagar dos veces el mismo registro de horas.
-- onDelete: SET NULL — si se elimina la hoja (p.ej. un borrador descartado),
-- las horas quedan libres para una nueva liquidación.
ALTER TABLE "registro_horas" ADD COLUMN IF NOT EXISTS "liquidadoEnHojaId" TEXT;

ALTER TABLE "registro_horas"
  ADD CONSTRAINT "registro_horas_liquidadoEnHojaId_fkey"
  FOREIGN KEY ("liquidadoEnHojaId") REFERENCES "hoja_de_gastos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "registro_horas_liquidadoEnHojaId_idx" ON "registro_horas"("liquidadoEnHojaId");
