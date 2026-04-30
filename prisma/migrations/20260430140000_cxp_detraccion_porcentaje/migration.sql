-- % de detracción esperado:
--   - Proveedor.detraccionPorcentajeDefault: sugerencia auto-aprendida (se guarda al
--     crear una CxP marcando "guardar como default para este proveedor").
--   - CuentaPorPagar.detraccionPorcentaje: % efectivo aplicado a esta factura.
--     Permite calcular "detracción pendiente" = monto * % - sum(pagos.detraccionMonto).
ALTER TABLE "proveedor" ADD COLUMN "detraccionPorcentajeDefault" DOUBLE PRECISION;
ALTER TABLE "cuenta_por_pagar" ADD COLUMN "detraccionPorcentaje" DOUBLE PRECISION;
