-- Agrega campos de control para CxP: nros cheque/letra, y trazabilidad de envío al contador
ALTER TABLE "cuenta_por_pagar" ADD COLUMN "numeroCheque" TEXT;
ALTER TABLE "cuenta_por_pagar" ADD COLUMN "numeroLetra" TEXT;
ALTER TABLE "cuenta_por_pagar" ADD COLUMN "enviadaContador" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "cuenta_por_pagar" ADD COLUMN "fechaEnvioContador" TIMESTAMP(3);
ALTER TABLE "cuenta_por_pagar" ADD COLUMN "enviadaPorId" TEXT;
ALTER TABLE "cuenta_por_pagar" ADD CONSTRAINT "cuenta_por_pagar_enviadaPorId_fkey" FOREIGN KEY ("enviadaPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
