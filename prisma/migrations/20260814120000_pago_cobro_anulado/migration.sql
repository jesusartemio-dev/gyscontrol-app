-- AlterTable: pago_cobro
-- Anulación con rastro de un PagoCobro individual, sin borrarlo — soporta la
-- reversión de una operación de factoring mal registrada (Sub-fase E).
ALTER TABLE "pago_cobro" ADD COLUMN     "anulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motivoAnulacion" TEXT,
ADD COLUMN     "fechaAnulacion" TIMESTAMP(3);
