/*
  Warnings:

  - You are about to drop the column `nivel` on the `ProyectoServicioItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cotizacion" ADD COLUMN     "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalEquiposCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalEquiposInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalGastosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalGastosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalServiciosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalServiciosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Plantilla" ADD COLUMN     "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalEquiposCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalEquiposInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalGastosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalGastosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalServiciosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalServiciosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN     "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalEquiposInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalGastosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalRealEquipos" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalRealGastos" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalRealServicios" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalServiciosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "totalInterno" SET DEFAULT 0,
ALTER COLUMN "totalCliente" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "ProyectoEquipo" ADD COLUMN     "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProyectoEquipoItem" ADD COLUMN     "aprobado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "motivoCambio" TEXT,
ADD COLUMN     "nuevo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProyectoServicio" ADD COLUMN     "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProyectoServicioItem" DROP COLUMN "nivel",
ADD COLUMN     "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "horasEjecutadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "motivoCambio" TEXT,
ADD COLUMN     "nuevo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlantillaGasto" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaGastoItem" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "margen" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaGastoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionGasto" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionGastoItem" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "margen" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionGastoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoGasto" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoGastoItem" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL,
    "margen" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoGastoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaRequerimiento" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT,
    "fechaAprobacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaRequerimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaRequerimientoItem" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "proyectoEquipoItemId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "validadoTecnico" BOOLEAN NOT NULL DEFAULT false,
    "aprobadoGestor" BOOLEAN NOT NULL DEFAULT false,
    "aprobadoCliente" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "nuevo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaRequerimientoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteCompra" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaEnvio" TIMESTAMP(3),
    "fechaEntregaEstimada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaqueteCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteCompraItem" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "requerimientoItemId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "proveedor" TEXT,
    "precioUnitario" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "fechaEntrega" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaqueteCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Valorizacion" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Valorizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroHoras" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "proyectoServicioId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombreServicio" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "recursoNombre" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fechaTrabajo" TIMESTAMP(3) NOT NULL,
    "horasTrabajadas" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "observaciones" TEXT,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroHoras_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlantillaGasto" ADD CONSTRAINT "PlantillaGasto_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaGastoItem" ADD CONSTRAINT "PlantillaGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "PlantillaGasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionGasto" ADD CONSTRAINT "CotizacionGasto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionGastoItem" ADD CONSTRAINT "CotizacionGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "CotizacionGasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGasto" ADD CONSTRAINT "ProyectoGasto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGastoItem" ADD CONSTRAINT "ProyectoGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "ProyectoGasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaRequerimiento" ADD CONSTRAINT "ListaRequerimiento_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaRequerimientoItem" ADD CONSTRAINT "ListaRequerimientoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaRequerimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaRequerimientoItem" ADD CONSTRAINT "ListaRequerimientoItem_proyectoEquipoItemId_fkey" FOREIGN KEY ("proyectoEquipoItemId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteCompra" ADD CONSTRAINT "PaqueteCompra_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteCompraItem" ADD CONSTRAINT "PaqueteCompraItem_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "PaqueteCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteCompraItem" ADD CONSTRAINT "PaqueteCompraItem_requerimientoItemId_fkey" FOREIGN KEY ("requerimientoItemId") REFERENCES "ListaRequerimientoItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valorizacion" ADD CONSTRAINT "Valorizacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
