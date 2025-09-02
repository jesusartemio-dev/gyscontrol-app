/*
  Warnings:

  - The values [APROBADO,RECHAZADO,OBSERVADO] on the enum `EstadoInspeccion` will be removed. If these variants are still used in the database, this will fail.
  - The values [CONFIRMADA,EN_TRANSITO,RECIBIDO_PARCIAL,RECIBIDO_TOTAL,PAGADO,CERRADO,CANCELADO] on the enum `EstadoOrdenCompra` will be removed. If these variants are still used in the database, this will fail.
  - The values [PROGRAMADO,EJECUTADO,CONCILIADO] on the enum `EstadoPago` will be removed. If these variants are still used in the database, this will fail.
  - The values [EN_INSPECCION,APROBADO,RECHAZADO] on the enum `EstadoRecepcion` will be removed. If these variants are still used in the database, this will fail.
  - The values [ADELANTO,PAGO_PARCIAL,PAGO_TOTAL,PAGO_FINAL] on the enum `TipoPago` will be removed. If these variants are still used in the database, this will fail.
  - The values [TOTAL,PARCIAL] on the enum `TipoRecepcion` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `updatedAt` to the `orden_compra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productoId` to the `orden_compra_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `orden_compra_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `recepcion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `recepcion_item` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PrioridadOrden" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'URGENTE', 'CRITICA');

-- CreateEnum
CREATE TYPE "EstadoAprovisionamiento" AS ENUM ('PLANIFICADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION', 'TRANSFERENCIA');

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoInspeccion_new" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CONDICIONAL', 'REQUERIDA');
ALTER TABLE "recepcion_item" ALTER COLUMN "estadoInspeccion" DROP DEFAULT;
ALTER TABLE "recepcion_item" ALTER COLUMN "estadoInspeccion" TYPE "EstadoInspeccion_new" USING ("estadoInspeccion"::text::"EstadoInspeccion_new");
ALTER TYPE "EstadoInspeccion" RENAME TO "EstadoInspeccion_old";
ALTER TYPE "EstadoInspeccion_new" RENAME TO "EstadoInspeccion";
DROP TYPE "EstadoInspeccion_old";
ALTER TABLE "recepcion_item" ALTER COLUMN "estadoInspeccion" SET DEFAULT 'PENDIENTE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoOrdenCompra_new" AS ENUM ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'COMPLETADA', 'CANCELADA');
ALTER TABLE "orden_compra" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "orden_compra" ALTER COLUMN "estado" TYPE "EstadoOrdenCompra_new" USING ("estado"::text::"EstadoOrdenCompra_new");
ALTER TYPE "EstadoOrdenCompra" RENAME TO "EstadoOrdenCompra_old";
ALTER TYPE "EstadoOrdenCompra_new" RENAME TO "EstadoOrdenCompra";
DROP TYPE "EstadoOrdenCompra_old";
ALTER TABLE "orden_compra" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoPago_new" AS ENUM ('PENDIENTE', 'PROCESADO', 'COMPLETADO', 'CANCELADO', 'RECHAZADO');
ALTER TABLE "pago" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "pago" ALTER COLUMN "estado" TYPE "EstadoPago_new" USING ("estado"::text::"EstadoPago_new");
ALTER TYPE "EstadoPago" RENAME TO "EstadoPago_old";
ALTER TYPE "EstadoPago_new" RENAME TO "EstadoPago";
DROP TYPE "EstadoPago_old";
ALTER TABLE "pago" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoRecepcion_new" AS ENUM ('PENDIENTE', 'PARCIAL', 'COMPLETA', 'RECHAZADA', 'DEVOLUCION');
ALTER TABLE "recepcion" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "recepcion" ALTER COLUMN "estado" TYPE "EstadoRecepcion_new" USING ("estado"::text::"EstadoRecepcion_new");
ALTER TYPE "EstadoRecepcion" RENAME TO "EstadoRecepcion_old";
ALTER TYPE "EstadoRecepcion_new" RENAME TO "EstadoRecepcion";
DROP TYPE "EstadoRecepcion_old";
ALTER TABLE "recepcion" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TipoPago_new" AS ENUM ('CONTADO', 'CREDITO_30', 'CREDITO_60', 'CREDITO_90', 'TRANSFERENCIA', 'CHEQUE');
ALTER TABLE "pago" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "pago" ALTER COLUMN "tipo" TYPE "TipoPago_new" USING ("tipo"::text::"TipoPago_new");
ALTER TYPE "TipoPago" RENAME TO "TipoPago_old";
ALTER TYPE "TipoPago_new" RENAME TO "TipoPago";
DROP TYPE "TipoPago_old";
ALTER TABLE "pago" ALTER COLUMN "tipo" SET DEFAULT 'CONTADO';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TipoRecepcion_new" AS ENUM ('NORMAL', 'URGENTE', 'DEVOLUCION', 'EMERGENCIA');
ALTER TABLE "recepcion" ALTER COLUMN "tipoRecepcion" DROP DEFAULT;
ALTER TABLE "recepcion" ALTER COLUMN "tipoRecepcion" TYPE "TipoRecepcion_new" USING ("tipoRecepcion"::text::"TipoRecepcion_new");
ALTER TYPE "TipoRecepcion" RENAME TO "TipoRecepcion_old";
ALTER TYPE "TipoRecepcion_new" RENAME TO "TipoRecepcion";
DROP TYPE "TipoRecepcion_old";
ALTER TABLE "recepcion" ALTER COLUMN "tipoRecepcion" SET DEFAULT 'NORMAL';
COMMIT;

-- DropForeignKey
ALTER TABLE "orden_compra" DROP CONSTRAINT "orden_compra_pedidoEquipoId_fkey";

-- DropForeignKey
ALTER TABLE "orden_compra_item" DROP CONSTRAINT "orden_compra_item_pedidoEquipoItemId_fkey";

-- AlterTable
ALTER TABLE "orden_compra" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fechaSeguimiento" TIMESTAMP(3),
ADD COLUMN     "prioridad" "PrioridadOrden" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "pedidoEquipoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orden_compra_item" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "productoId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "pedidoEquipoItemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pago" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "tipo" SET DEFAULT 'CONTADO';

-- AlterTable
ALTER TABLE "recepcion" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "tipoRecepcion" SET DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "recepcion_item" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "pago_item" (
    "id" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "ordenCompraItemId" TEXT,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pago_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprovisionamiento_financiero" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "recepcionId" TEXT,
    "pagoId" TEXT,
    "estado" "EstadoAprovisionamiento" NOT NULL DEFAULT 'PLANIFICADO',
    "montoTotal" DECIMAL(12,2) NOT NULL,
    "montoRecibido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montoPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFinalizacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "creadoPor" TEXT NOT NULL,
    "aprobadoPor" TEXT,
    "completadoPor" TEXT,
    "canceladoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aprovisionamiento_financiero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_aprovisionamiento" (
    "id" TEXT NOT NULL,
    "aprovisionamientoId" TEXT NOT NULL,
    "ordenCompraId" TEXT,
    "recepcionId" TEXT,
    "pagoId" TEXT,
    "tipoMovimiento" "TipoMovimiento" NOT NULL,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT,
    "descripcion" TEXT NOT NULL,
    "montoAnterior" DECIMAL(12,2),
    "montoNuevo" DECIMAL(12,2),
    "observaciones" TEXT,
    "creadoPor" TEXT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_aprovisionamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT,
    "unidadMedida" TEXT NOT NULL,
    "precioReferencia" DECIMAL(10,2),
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "especificaciones" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aprovisionamiento_financiero_codigo_key" ON "aprovisionamiento_financiero"("codigo");

-- CreateIndex
CREATE INDEX "aprovisionamiento_financiero_ordenCompraId_idx" ON "aprovisionamiento_financiero"("ordenCompraId");

-- CreateIndex
CREATE INDEX "aprovisionamiento_financiero_estado_fechaInicio_idx" ON "aprovisionamiento_financiero"("estado", "fechaInicio");

-- CreateIndex
CREATE INDEX "aprovisionamiento_financiero_codigo_idx" ON "aprovisionamiento_financiero"("codigo");

-- CreateIndex
CREATE INDEX "historial_aprovisionamiento_aprovisionamientoId_fechaMovimi_idx" ON "historial_aprovisionamiento"("aprovisionamientoId", "fechaMovimiento");

-- CreateIndex
CREATE INDEX "historial_aprovisionamiento_tipoMovimiento_fechaMovimiento_idx" ON "historial_aprovisionamiento"("tipoMovimiento", "fechaMovimiento");

-- CreateIndex
CREATE INDEX "historial_aprovisionamiento_creadoPor_fechaMovimiento_idx" ON "historial_aprovisionamiento"("creadoPor", "fechaMovimiento");

-- CreateIndex
CREATE UNIQUE INDEX "producto_codigo_key" ON "producto"("codigo");

-- CreateIndex
CREATE INDEX "producto_codigo_idx" ON "producto"("codigo");

-- CreateIndex
CREATE INDEX "producto_categoria_activo_idx" ON "producto"("categoria", "activo");

-- CreateIndex
CREATE INDEX "producto_nombre_idx" ON "producto"("nombre");

-- CreateIndex
CREATE INDEX "orden_compra_proveedorId_estado_idx" ON "orden_compra"("proveedorId", "estado");

-- CreateIndex
CREATE INDEX "orden_compra_fechaCreacion_estado_idx" ON "orden_compra"("fechaCreacion", "estado");

-- CreateIndex
CREATE INDEX "orden_compra_numero_idx" ON "orden_compra"("numero");

-- CreateIndex
CREATE INDEX "orden_compra_prioridad_estado_idx" ON "orden_compra"("prioridad", "estado");

-- CreateIndex
CREATE INDEX "orden_compra_item_productoId_idx" ON "orden_compra_item"("productoId");

-- CreateIndex
CREATE INDEX "pago_ordenCompraId_estado_idx" ON "pago"("ordenCompraId", "estado");

-- CreateIndex
CREATE INDEX "pago_fechaPago_estado_idx" ON "pago"("fechaPago", "estado");

-- CreateIndex
CREATE INDEX "pago_numero_idx" ON "pago"("numero");

-- CreateIndex
CREATE INDEX "recepcion_ordenCompraId_estado_idx" ON "recepcion"("ordenCompraId", "estado");

-- CreateIndex
CREATE INDEX "recepcion_fechaRecepcion_estado_idx" ON "recepcion"("fechaRecepcion", "estado");

-- CreateIndex
CREATE INDEX "recepcion_numero_idx" ON "recepcion"("numero");

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_pedidoEquipoId_fkey" FOREIGN KEY ("pedidoEquipoId") REFERENCES "PedidoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_item" ADD CONSTRAINT "orden_compra_item_pedidoEquipoItemId_fkey" FOREIGN KEY ("pedidoEquipoItemId") REFERENCES "PedidoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_item" ADD CONSTRAINT "orden_compra_item_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_item" ADD CONSTRAINT "pago_item_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_item" ADD CONSTRAINT "pago_item_ordenCompraItemId_fkey" FOREIGN KEY ("ordenCompraItemId") REFERENCES "orden_compra_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovisionamiento_financiero" ADD CONSTRAINT "aprovisionamiento_financiero_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovisionamiento_financiero" ADD CONSTRAINT "aprovisionamiento_financiero_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "recepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovisionamiento_financiero" ADD CONSTRAINT "aprovisionamiento_financiero_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovisionamiento_financiero" ADD CONSTRAINT "aprovisionamiento_financiero_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovisionamiento_financiero" ADD CONSTRAINT "aprovisionamiento_financiero_aprobadoPor_fkey" FOREIGN KEY ("aprobadoPor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovisionamiento_financiero" ADD CONSTRAINT "aprovisionamiento_financiero_completadoPor_fkey" FOREIGN KEY ("completadoPor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovisionamiento_financiero" ADD CONSTRAINT "aprovisionamiento_financiero_canceladoPor_fkey" FOREIGN KEY ("canceladoPor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_aprovisionamiento" ADD CONSTRAINT "historial_aprovisionamiento_aprovisionamientoId_fkey" FOREIGN KEY ("aprovisionamientoId") REFERENCES "aprovisionamiento_financiero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_aprovisionamiento" ADD CONSTRAINT "historial_aprovisionamiento_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_aprovisionamiento" ADD CONSTRAINT "historial_aprovisionamiento_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "recepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_aprovisionamiento" ADD CONSTRAINT "historial_aprovisionamiento_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_aprovisionamiento" ADD CONSTRAINT "historial_aprovisionamiento_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
