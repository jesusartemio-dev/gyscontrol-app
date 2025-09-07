/*
  Warnings:

  - You are about to drop the `aprovisionamiento_financiero` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `historial_aprovisionamiento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orden_compra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orden_compra_item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pago` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pago_item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recepcion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recepcion_item` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "aprovisionamiento_financiero" DROP CONSTRAINT "aprovisionamiento_financiero_aprobadoPor_fkey";

-- DropForeignKey
ALTER TABLE "aprovisionamiento_financiero" DROP CONSTRAINT "aprovisionamiento_financiero_canceladoPor_fkey";

-- DropForeignKey
ALTER TABLE "aprovisionamiento_financiero" DROP CONSTRAINT "aprovisionamiento_financiero_completadoPor_fkey";

-- DropForeignKey
ALTER TABLE "aprovisionamiento_financiero" DROP CONSTRAINT "aprovisionamiento_financiero_creadoPor_fkey";

-- DropForeignKey
ALTER TABLE "aprovisionamiento_financiero" DROP CONSTRAINT "aprovisionamiento_financiero_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "aprovisionamiento_financiero" DROP CONSTRAINT "aprovisionamiento_financiero_pagoId_fkey";

-- DropForeignKey
ALTER TABLE "aprovisionamiento_financiero" DROP CONSTRAINT "aprovisionamiento_financiero_recepcionId_fkey";

-- DropForeignKey
ALTER TABLE "historial_aprovisionamiento" DROP CONSTRAINT "historial_aprovisionamiento_aprovisionamientoId_fkey";

-- DropForeignKey
ALTER TABLE "historial_aprovisionamiento" DROP CONSTRAINT "historial_aprovisionamiento_creadoPor_fkey";

-- DropForeignKey
ALTER TABLE "historial_aprovisionamiento" DROP CONSTRAINT "historial_aprovisionamiento_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "historial_aprovisionamiento" DROP CONSTRAINT "historial_aprovisionamiento_pagoId_fkey";

-- DropForeignKey
ALTER TABLE "historial_aprovisionamiento" DROP CONSTRAINT "historial_aprovisionamiento_recepcionId_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra" DROP CONSTRAINT "orden_compra_aprobadoPor_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra" DROP CONSTRAINT "orden_compra_creadoPor_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra" DROP CONSTRAINT "orden_compra_pedidoEquipoId_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra" DROP CONSTRAINT "orden_compra_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra_item" DROP CONSTRAINT "orden_compra_item_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra_item" DROP CONSTRAINT "orden_compra_item_pedidoEquipoItemId_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra_item" DROP CONSTRAINT "orden_compra_item_productoId_fkey";

-- DropForeignKey
ALTER TABLE "pago" DROP CONSTRAINT "pago_aprobadoPor_fkey";

-- DropForeignKey
ALTER TABLE "pago" DROP CONSTRAINT "pago_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "pago" DROP CONSTRAINT "pago_recepcionId_fkey";

-- DropForeignKey
ALTER TABLE "pago_item" DROP CONSTRAINT "pago_item_ordenCompraItemId_fkey";

-- DropForeignKey
ALTER TABLE "pago_item" DROP CONSTRAINT "pago_item_pagoId_fkey";

-- DropForeignKey
ALTER TABLE "recepcion" DROP CONSTRAINT "recepcion_ordenCompraId_fkey";

-- DropForeignKey
ALTER TABLE "recepcion" DROP CONSTRAINT "recepcion_responsableInspeccionId_fkey";

-- DropForeignKey
ALTER TABLE "recepcion" DROP CONSTRAINT "recepcion_responsableRecepcionId_fkey";

-- DropForeignKey
ALTER TABLE "recepcion_item" DROP CONSTRAINT "recepcion_item_ordenCompraItemId_fkey";

-- DropForeignKey
ALTER TABLE "recepcion_item" DROP CONSTRAINT "recepcion_item_recepcionId_fkey";

-- DropTable
DROP TABLE "aprovisionamiento_financiero";

-- DropTable
DROP TABLE "historial_aprovisionamiento";

-- DropTable
DROP TABLE "orden_compra";

-- DropTable
DROP TABLE "orden_compra_item";

-- DropTable
DROP TABLE "pago";

-- DropTable
DROP TABLE "pago_item";

-- DropTable
DROP TABLE "recepcion";

-- DropTable
DROP TABLE "recepcion_item";

-- DropEnum
DROP TYPE "EstadoAprovisionamiento";

-- DropEnum
DROP TYPE "EstadoInspeccion";

-- DropEnum
DROP TYPE "EstadoOrdenCompra";

-- DropEnum
DROP TYPE "EstadoPago";

-- DropEnum
DROP TYPE "EstadoRecepcion";

-- DropEnum
DROP TYPE "PrioridadOrden";

-- DropEnum
DROP TYPE "TipoMovimiento";

-- DropEnum
DROP TYPE "TipoPago";

-- DropEnum
DROP TYPE "TipoRecepcion";
