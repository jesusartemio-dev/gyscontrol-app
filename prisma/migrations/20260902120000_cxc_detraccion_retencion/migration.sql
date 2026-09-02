-- Descuentos de ley de la factura, guardados en la CxC (que ES la factura)
-- en vez de en CobroValorizacion (que es la operación de cobro). Se capturan
-- al facturar y el cobro los reutiliza, en vez de volver a leer la factura.
--
-- detraccion_monto va SIEMPRE en la moneda de la factura: es lo que descuenta.
-- detraccion_monto_pen es el importe del depósito en el Banco de la Nación,
-- que en facturas en dólares viene impreso en soles y NO entra al cálculo.
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "detraccionPct" DOUBLE PRECISION;
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "detraccionMonto" DOUBLE PRECISION;
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "detraccionMontoPEN" DOUBLE PRECISION;
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "detraccionCodigo" TEXT;
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "retencionPct" DOUBLE PRECISION;
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "retencionMonto" DOUBLE PRECISION;
