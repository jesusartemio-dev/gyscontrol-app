-- Cierre de la operación de factoring: lo que descuenta la financiera DESPUÉS
-- del desembolso, cuando el cliente paga y se liquida.
--
--   Saldo a Girar − Interés Reliquidación = Líquido a Girar
--   Excedente + Mora + Com. Interés + Diferencia + Otros = Total Excedente
--
-- Los dos resultados son derivados y no se guardan: son el monto real de los
-- eventos 'saldo_girar' y 'excedente' del Cronograma. Acá van solo los
-- descuentos, que es el dato que faltaba — hasta ahora la diferencia entre lo
-- esperado y lo recibido se registraba sin decir por qué.
--
-- Van con signo, como los manda BANPRO en el Informe de Excedentes.
ALTER TABLE "cobro_valorizacion" ADD COLUMN "interesReliquidacion" DOUBLE PRECISION;
ALTER TABLE "cobro_valorizacion" ADD COLUMN "mora" DOUBLE PRECISION;
ALTER TABLE "cobro_valorizacion" ADD COLUMN "comisionInteres" DOUBLE PRECISION;
ALTER TABLE "cobro_valorizacion" ADD COLUMN "diferencia" DOUBLE PRECISION;
ALTER TABLE "cobro_valorizacion" ADD COLUMN "otros" DOUBLE PRECISION;

-- La financiera factura por separado el interés, los gastos, la reliquidación
-- y la mora. El N° de factura del interés y de gastos ya existían; faltaban
-- las fechas de emisión y los dos conceptos nuevos.
ALTER TABLE "cobro_valorizacion" ADD COLUMN "fechaFacturaInteres" TIMESTAMP(3);
ALTER TABLE "cobro_valorizacion" ADD COLUMN "fechaFacturaGastos" TIMESTAMP(3);
ALTER TABLE "cobro_valorizacion" ADD COLUMN "numeroFacturaReliquidacion" TEXT;
ALTER TABLE "cobro_valorizacion" ADD COLUMN "fechaFacturaReliquidacion" TIMESTAMP(3);
ALTER TABLE "cobro_valorizacion" ADD COLUMN "numeroFacturaMora" TEXT;
ALTER TABLE "cobro_valorizacion" ADD COLUMN "fechaFacturaMora" TIMESTAMP(3);
