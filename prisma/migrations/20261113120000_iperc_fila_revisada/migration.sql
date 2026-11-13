-- Marca de revisión por fila del IPERC.
--
-- Revisar 168 filas de a una sin dejar rastro de dónde se quedó uno es la
-- forma segura de revisar dos veces lo mismo y ninguna vez lo otro. La marca
-- vive solo en la app: el Excel no la lleva.

ALTER TABLE "iperc_fila" ADD COLUMN "revisadaEn" TIMESTAMP(3);
ALTER TABLE "iperc_fila" ADD COLUMN "revisadaPorId" TEXT;

CREATE INDEX "iperc_fila_revisadaPorId_idx" ON "iperc_fila"("revisadaPorId");

ALTER TABLE "iperc_fila"
    ADD CONSTRAINT "iperc_fila_revisadaPorId_fkey"
    FOREIGN KEY ("revisadaPorId") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
