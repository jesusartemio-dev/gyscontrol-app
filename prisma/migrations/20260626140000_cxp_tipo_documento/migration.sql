-- Agrega tipo de documento a CuentaPorPagar para diferenciar facturas de notas de crédito
ALTER TABLE "cuenta_por_pagar" ADD COLUMN "tipoDocumento" TEXT NOT NULL DEFAULT 'factura';
