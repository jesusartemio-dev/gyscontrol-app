-- CreateEnum
CREATE TYPE "EstadoEntregaItem" AS ENUM ('pendiente', 'en_proceso', 'parcial', 'entregado', 'retrasado', 'cancelado');

-- AlterTable
ALTER TABLE "PedidoEquipoItem" ADD COLUMN     "estadoEntrega" "EstadoEntregaItem" NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "fechaEntregaEstimada" TIMESTAMP(3),
ADD COLUMN     "fechaEntregaReal" TIMESTAMP(3),
ADD COLUMN     "observacionesEntrega" TEXT;

-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN     "correo" TEXT,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "telefono" TEXT;
