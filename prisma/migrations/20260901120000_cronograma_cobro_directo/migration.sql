-- Generaliza el Cronograma de Cobro (antes solo factoring) para que tambien
-- cubra cobro directo con Detraccion/Retencion pendientes.

-- AlterEnum: TipoAbonoFactoring -> TipoEventoCobro (ahora cubre ambos tipos
-- de cobro, no solo factoring), agrega el evento 'neto' (rol equivalente al
-- Adelanto de factoring: el evento base, siempre 'recibido' de inmediato).
ALTER TYPE "TipoAbonoFactoring" RENAME TO "TipoEventoCobro";
ALTER TYPE "TipoEventoCobro" ADD VALUE 'neto';

-- AlterTable: cobro_valorizacion
-- Retencion: mismo patron que Detraccion (se descuenta del Monto Factura
-- antes de calcular el resto). montoNetoDirecto: monto neto editable de la
-- mini liquidacion de cobro directo (Monto Factura - Detraccion - Retencion).
ALTER TABLE "cobro_valorizacion" ADD COLUMN     "retencionPct" DOUBLE PRECISION,
ADD COLUMN     "retencionMonto" DOUBLE PRECISION,
ADD COLUMN     "retencionNumeroComprobante" TEXT,
ADD COLUMN     "montoNetoDirecto" DOUBLE PRECISION;
