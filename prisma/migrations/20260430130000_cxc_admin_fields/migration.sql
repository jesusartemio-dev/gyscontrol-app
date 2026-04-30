-- Campos adicionales para CxC requeridos por el formato de export de administración.
-- Todos opcionales para no romper datos existentes.

-- CuentaPorCobrar
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "fechaRecepcion" TIMESTAMP(3);
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "ordenCompraCliente" TEXT;
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "numeroNegociacion" TEXT;

-- PagoCobro: bloque de retención de IGV (paralelo al de detracción)
ALTER TABLE "pago_cobro" ADD COLUMN "esRetencion" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "pago_cobro" ADD COLUMN "retencionPorcentaje" DOUBLE PRECISION;
ALTER TABLE "pago_cobro" ADD COLUMN "retencionMonto" DOUBLE PRECISION;
ALTER TABLE "pago_cobro" ADD COLUMN "retencionNumeroConstancia" TEXT;
