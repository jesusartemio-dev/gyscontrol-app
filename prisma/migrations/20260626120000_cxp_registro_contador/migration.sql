-- Reemplaza campos de trazabilidad enviada-contador por campo registro_contador
ALTER TABLE "cuenta_por_pagar" DROP CONSTRAINT IF EXISTS "cuenta_por_pagar_enviadaPorId_fkey";
ALTER TABLE "cuenta_por_pagar" DROP COLUMN IF EXISTS "enviadaContador";
ALTER TABLE "cuenta_por_pagar" DROP COLUMN IF EXISTS "fechaEnvioContador";
ALTER TABLE "cuenta_por_pagar" DROP COLUMN IF EXISTS "enviadaPorId";
ALTER TABLE "cuenta_por_pagar" ADD COLUMN "registroContador" TEXT;
