-- Add clienteId to ubicacion
ALTER TABLE "ubicacion" ADD COLUMN "clienteId" TEXT;

CREATE INDEX "ubicacion_clienteId_idx" ON "ubicacion"("clienteId");

ALTER TABLE "ubicacion"
  ADD CONSTRAINT "ubicacion_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "cliente"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
