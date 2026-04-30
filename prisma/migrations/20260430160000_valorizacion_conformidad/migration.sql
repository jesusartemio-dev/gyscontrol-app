-- Conformidad del cliente sobre la valorización (HES, Guía de Remisión, acta).
-- Es el documento habilitador para emitir la factura. Cronológicamente:
-- valorizacion aprobada_cliente → cliente emite conformidad → GYS factura.
-- Estos campos se heredan a la CxC al transicionar la valorización a "facturada".
ALTER TABLE "valorizacion" ADD COLUMN "tipoConformidad" TEXT;
ALTER TABLE "valorizacion" ADD COLUMN "numeroHES" TEXT;
ALTER TABLE "valorizacion" ADD COLUMN "numeroGuiaRemision" TEXT;
ALTER TABLE "valorizacion" ADD COLUMN "fechaConformidad" TIMESTAMP(3);
