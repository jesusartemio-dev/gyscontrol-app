-- AlterTable
ALTER TABLE "cotizacion_proveedor" ADD COLUMN "formaPago" TEXT;

-- AlterTable
ALTER TABLE "orden_compra" ADD COLUMN "formaPago" TEXT;

-- AlterTable
ALTER TABLE "cuenta_por_cobrar" ADD COLUMN "formaPago" TEXT;

-- AlterTable
ALTER TABLE "cuenta_por_pagar" ADD COLUMN "formaPago" TEXT;
