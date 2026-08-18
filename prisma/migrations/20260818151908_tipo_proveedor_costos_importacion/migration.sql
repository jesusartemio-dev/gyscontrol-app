-- AlterTable
ALTER TABLE "orden_compra" ADD COLUMN     "arancelMonto" DOUBLE PRECISION,
ADD COLUMN     "fleteMonto" DOUBLE PRECISION,
ADD COLUMN     "gastosAgenteMonto" DOUBLE PRECISION,
ADD COLUMN     "igvAduanaMonto" DOUBLE PRECISION,
ADD COLUMN     "seguroMonto" DOUBLE PRECISION,
ADD COLUMN     "tipoCompraOverride" TEXT;

-- AlterTable
ALTER TABLE "proveedor" ADD COLUMN     "tipoProveedor" TEXT;
