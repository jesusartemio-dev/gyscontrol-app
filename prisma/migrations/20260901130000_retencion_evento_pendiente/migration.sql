-- Corrige el diseño de Retención (commit anterior): no se cierra sola al
-- guardar la liquidación -- el Comprobante de Retención del cliente puede
-- demorar o llegar por separado, igual que la constancia de Detracción.
-- Ahora es un evento 'pendiente' más del Cronograma de Cobro.

-- AlterEnum
ALTER TYPE "TipoEventoCobro" ADD VALUE 'retencion';

-- AlterTable: cobro_valorizacion
-- retencionNumeroComprobante ya no aplica -- el número de comprobante se
-- captura al confirmar el evento (marcarAbonoFactoringRecibido), no al
-- guardar la liquidación, igual que detraccion.numeroConstanciaBN.
ALTER TABLE "cobro_valorizacion" DROP COLUMN "retencionNumeroComprobante";
