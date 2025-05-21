/*
  Warnings:

  - You are about to drop the column `contacto` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `ruc` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CotizacionProveedor` table. All the data in the column will be lost.
  - You are about to drop the column `listaItemId` on the `CotizacionProveedorItem` table. All the data in the column will be lost.
  - You are about to drop the column `seleccionado` on the `CotizacionProveedorItem` table. All the data in the column will be lost.
  - The `estado` column on the `ListaEquipo` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `precioReferencial` on the `ListaEquipoItem` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `ListaRequerimiento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ListaRequerimientoItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaqueteCompra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaqueteCompraItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fecha` to the `CotizacionProveedor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `proveedorId` to the `CotizacionProveedor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cantidad` to the `CotizacionProveedorItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costoTotal` to the `CotizacionProveedorItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `listaEquipoItemId` to the `CotizacionProveedorItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoListaEquipo" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('borrador', 'enviado', 'atendido', 'parcial', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoPedidoItem" AS ENUM ('pendiente', 'atendido', 'parcial', 'entregado');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('colaborador', 'comercial', 'coordinador', 'logistico', 'gestor', 'gerente', 'admin');

-- DropForeignKey
ALTER TABLE "CotizacionProveedor" DROP CONSTRAINT "CotizacionProveedor_proyectoId_fkey";

-- DropForeignKey
ALTER TABLE "CotizacionProveedorItem" DROP CONSTRAINT "CotizacionProveedorItem_cotizacionId_fkey";

-- DropForeignKey
ALTER TABLE "CotizacionProveedorItem" DROP CONSTRAINT "CotizacionProveedorItem_listaItemId_fkey";

-- DropForeignKey
ALTER TABLE "ListaRequerimiento" DROP CONSTRAINT "ListaRequerimiento_proyectoId_fkey";

-- DropForeignKey
ALTER TABLE "ListaRequerimientoItem" DROP CONSTRAINT "ListaRequerimientoItem_listaId_fkey";

-- DropForeignKey
ALTER TABLE "ListaRequerimientoItem" DROP CONSTRAINT "ListaRequerimientoItem_proyectoEquipoItemId_fkey";

-- DropForeignKey
ALTER TABLE "PaqueteCompra" DROP CONSTRAINT "PaqueteCompra_proyectoId_fkey";

-- DropForeignKey
ALTER TABLE "PaqueteCompraItem" DROP CONSTRAINT "PaqueteCompraItem_paqueteId_fkey";

-- DropForeignKey
ALTER TABLE "PaqueteCompraItem" DROP CONSTRAINT "PaqueteCompraItem_requerimientoItemId_fkey";

-- AlterTable
ALTER TABLE "CotizacionProveedor" DROP COLUMN "contacto",
DROP COLUMN "createdAt",
DROP COLUMN "estado",
DROP COLUMN "ruc",
DROP COLUMN "updatedAt",
ADD COLUMN     "fecha" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "proveedorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CotizacionProveedorItem" DROP COLUMN "listaItemId",
DROP COLUMN "seleccionado",
ADD COLUMN     "cantidad" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "costoTotal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "listaEquipoItemId" TEXT NOT NULL,
ALTER COLUMN "tiempoEntrega" DROP NOT NULL,
ALTER COLUMN "tiempoEntrega" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ListaEquipo" DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoListaEquipo" NOT NULL DEFAULT 'borrador';

-- AlterTable
ALTER TABLE "ListaEquipoItem" DROP COLUMN "precioReferencial",
ADD COLUMN     "cantidadEntregada" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "cantidadPedida" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "comentarioRevision" TEXT,
ADD COLUMN     "costoElegido" DOUBLE PRECISION,
ADD COLUMN     "costoPedido" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "costoReal" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "precioElegido" DOUBLE PRECISION,
ADD COLUMN     "presupuesto" DOUBLE PRECISION,
ADD COLUMN     "proveedorId" TEXT,
ADD COLUMN     "verificado" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProyectoEquipoItem" ADD COLUMN     "equipoOriginalId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'colaborador';

-- DropTable
DROP TABLE "ListaRequerimiento";

-- DropTable
DROP TABLE "ListaRequerimientoItem";

-- DropTable
DROP TABLE "PaqueteCompra";

-- DropTable
DROP TABLE "PaqueteCompraItem";

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEquipo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "codigo" TEXT,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'borrador',
    "fechaPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),

    CONSTRAINT "PedidoEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEquipoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "listaEquipoItemId" TEXT NOT NULL,
    "cantidadPedida" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "fechaNecesaria" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPedidoItem" NOT NULL DEFAULT 'pendiente',
    "cantidadAtendida" DOUBLE PRECISION,

    CONSTRAINT "PedidoEquipoItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_equipoOriginalId_fkey" FOREIGN KEY ("equipoOriginalId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "CotizacionProveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoEquipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
