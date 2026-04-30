-- HES (Hoja de Entrada de Servicios) y Guía de Remisión:
-- Documentos que el cliente exige adjuntar a la factura emitida por GYS,
-- para confirmar que el servicio/bien fue recibido. Admin necesita estos
-- numeros para conciliacion y seguimiento de pago.
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "numeroHES" TEXT;
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "numeroGuiaRemision" TEXT;
