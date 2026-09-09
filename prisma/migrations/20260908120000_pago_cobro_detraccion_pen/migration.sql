-- Importe del deposito en el Banco de la Nacion al confirmar una detraccion,
-- cuando la CxC no esta en soles. Antes "Marcar recibido" solo tenia el campo
-- monto (en la moneda de la CxC), asi que el numero del voucher en soles se
-- terminaba escribiendo ahi por error -- el mismo bug de moneda que ya se
-- habia corregido en la Hoja de Liquidacion, pero en este otro flujo.
ALTER TABLE "pago_cobro" ADD COLUMN "detraccionMontoPEN" DOUBLE PRECISION;
