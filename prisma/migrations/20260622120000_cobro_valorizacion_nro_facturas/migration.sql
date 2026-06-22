-- Agrega campos de número de factura al bloque Costos del reporte Financiero de CxC
ALTER TABLE "cobro_valorizacion" ADD COLUMN "numeroFacturaInteres" TEXT;
ALTER TABLE "cobro_valorizacion" ADD COLUMN "numeroFacturaGastos" TEXT;
