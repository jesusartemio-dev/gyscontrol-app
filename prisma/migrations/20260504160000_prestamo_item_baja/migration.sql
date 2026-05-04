-- Trazabilidad de bajas oficiales de items de prestamo (Fase 2 del flujo
-- de devoluciones). Cuando una herramienta perdida en prestamo se da de baja
-- oficialmente desde /logistica/almacen/herramientas, el item del prestamo
-- queda en estado 'perdido' con motivo, fecha y autor de la baja.
ALTER TABLE "prestamo_herramienta_item" ADD COLUMN "motivoBaja" TEXT;
ALTER TABLE "prestamo_herramienta_item" ADD COLUMN "fechaBaja" TIMESTAMP(3);
ALTER TABLE "prestamo_herramienta_item" ADD COLUMN "dadoDeBajaPorId" TEXT;

ALTER TABLE "prestamo_herramienta_item"
  ADD CONSTRAINT "prestamo_herramienta_item_dadoDeBajaPorId_fkey"
  FOREIGN KEY ("dadoDeBajaPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
