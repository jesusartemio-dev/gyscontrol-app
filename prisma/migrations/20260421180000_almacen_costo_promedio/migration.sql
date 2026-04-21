-- AlterTable
ALTER TABLE "movimiento_almacen" ADD COLUMN     "costoMoneda" TEXT NOT NULL DEFAULT 'PEN',
ADD COLUMN     "costoUnitario" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "stock_almacen" ADD COLUMN     "costoMoneda" TEXT NOT NULL DEFAULT 'PEN',
ADD COLUMN     "costoUnitarioPromedio" DOUBLE PRECISION;
