/*
  Warnings:

  - You are about to drop the column `observaciones` on the `ListaRequerimiento` table. All the data in the column will be lost.
  - You are about to drop the column `aprobadoCliente` on the `ListaRequerimientoItem` table. All the data in the column will be lost.
  - You are about to drop the column `aprobadoGestor` on the `ListaRequerimientoItem` table. All the data in the column will be lost.
  - You are about to drop the column `validadoTecnico` on the `ListaRequerimientoItem` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `ProyectoEquipoItem` table. All the data in the column will be lost.
  - You are about to drop the column `responsableId` on the `ProyectoEquipoItem` table. All the data in the column will be lost.
  - You are about to drop the column `responsableId` on the `ProyectoServicioItem` table. All the data in the column will be lost.
  - Made the column `proyectoEquipoItemId` on table `ListaRequerimientoItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `descripcion` on table `ProyectoEquipoItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unidad` on table `ProyectoEquipoItem` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('pendiente', 'revisado_tecnico', 'aprobado_coordinador', 'aprobado_gestor', 'en_lista', 'comprado', 'reemplazado', 'entregado');

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
ALTER TABLE "ProyectoEquipoItem" DROP CONSTRAINT "ProyectoEquipoItem_proyectoEquipoId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoEquipoItem" DROP CONSTRAINT "ProyectoEquipoItem_responsableId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoServicioItem" DROP CONSTRAINT "ProyectoServicioItem_responsableId_fkey";

-- AlterTable
ALTER TABLE "CatalogoEquipo" ADD COLUMN     "fechaActualizacion" TIMESTAMP(3),
ADD COLUMN     "precioReal" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ListaRequerimiento" DROP COLUMN "observaciones";

-- AlterTable
ALTER TABLE "ListaRequerimientoItem" DROP COLUMN "aprobadoCliente",
DROP COLUMN "aprobadoGestor",
DROP COLUMN "validadoTecnico",
ADD COLUMN     "cantidadComprada" DOUBLE PRECISION,
ADD COLUMN     "cantidadPendiente" DOUBLE PRECISION,
ADD COLUMN     "fechaRequerida" TIMESTAMP(3),
ALTER COLUMN "proyectoEquipoItemId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PaqueteCompraItem" ADD COLUMN     "precioCotizado" DOUBLE PRECISION,
ADD COLUMN     "precioReferencial" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProyectoEquipoItem" DROP COLUMN "nombre",
DROP COLUMN "responsableId",
ADD COLUMN     "cantidadReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "categoria" TEXT NOT NULL DEFAULT 'SIN-CATEGORIA',
ADD COLUMN     "estado" "EstadoEquipo" NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "fechaEntregaEstimada" TIMESTAMP(3),
ADD COLUMN     "marca" TEXT NOT NULL DEFAULT 'SIN-MARCA',
ADD COLUMN     "precioReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tiempoEntrega" INTEGER,
ALTER COLUMN "descripcion" SET NOT NULL,
ALTER COLUMN "unidad" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProyectoServicioItem" DROP COLUMN "responsableId";

-- CreateTable
CREATE TABLE "ListaEquipos" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaEquipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaEquiposItem" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "proyectoEquipoItemId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioReferencial" DOUBLE PRECISION,

    CONSTRAINT "ListaEquiposItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionProveedor" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "contacto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'enviado',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionProveedorItem" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "listaItemId" TEXT NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "tiempoEntrega" INTEGER NOT NULL,
    "seleccionado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CotizacionProveedorItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "ProyectoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipos" ADD CONSTRAINT "ListaEquipos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquiposItem" ADD CONSTRAINT "ListaEquiposItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquiposItem" ADD CONSTRAINT "ListaEquiposItem_proyectoEquipoItemId_fkey" FOREIGN KEY ("proyectoEquipoItemId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "CotizacionProveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaItemId_fkey" FOREIGN KEY ("listaItemId") REFERENCES "ListaEquiposItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaRequerimiento" ADD CONSTRAINT "ListaRequerimiento_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaRequerimientoItem" ADD CONSTRAINT "ListaRequerimientoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaRequerimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaRequerimientoItem" ADD CONSTRAINT "ListaRequerimientoItem_proyectoEquipoItemId_fkey" FOREIGN KEY ("proyectoEquipoItemId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteCompra" ADD CONSTRAINT "PaqueteCompra_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteCompraItem" ADD CONSTRAINT "PaqueteCompraItem_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "PaqueteCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
