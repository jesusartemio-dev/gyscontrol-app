-- CreateEnum
CREATE TYPE "EstadoVentaEquipo" AS ENUM ('creado', 'pedido_generado', 'en_entrega', 'entregado', 'facturado', 'cancelado');

-- AlterTable: Cliente - add equipment sale sequence counter
ALTER TABLE "cliente" ADD COLUMN "ventaEquipoNumeroSecuencia" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: PedidoEquipo - add ventaEquipoId FK
ALTER TABLE "pedido_equipo" ADD COLUMN "ventaEquipoId" TEXT;

-- AlterTable: OrdenCompra - add ventaEquipoId FK
ALTER TABLE "orden_compra" ADD COLUMN "ventaEquipoId" TEXT;

-- CreateTable: VentaEquipo
CREATE TABLE "venta_equipo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoVentaEquipo" NOT NULL DEFAULT 'creado',
    "clienteId" TEXT NOT NULL,
    "comercialId" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "tipoCambio" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venta_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VentaEquipoItem
CREATE TABLE "venta_equipo_item" (
    "id" TEXT NOT NULL,
    "ventaEquipoId" TEXT NOT NULL,
    "catalogoEquipoId" TEXT,
    "codigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT,
    "unidad" TEXT,
    "marca" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitarioCliente" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venta_equipo_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venta_equipo_codigo_key" ON "venta_equipo"("codigo");

CREATE INDEX "venta_equipo_clienteId_estado_idx" ON "venta_equipo"("clienteId", "estado");

CREATE INDEX "venta_equipo_estado_createdAt_idx" ON "venta_equipo"("estado", "createdAt" DESC);

CREATE INDEX "venta_equipo_item_ventaEquipoId_idx" ON "venta_equipo_item"("ventaEquipoId");

-- AddForeignKey
ALTER TABLE "venta_equipo" ADD CONSTRAINT "venta_equipo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "venta_equipo" ADD CONSTRAINT "venta_equipo_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "venta_equipo" ADD CONSTRAINT "venta_equipo_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "venta_equipo_item" ADD CONSTRAINT "venta_equipo_item_ventaEquipoId_fkey" FOREIGN KEY ("ventaEquipoId") REFERENCES "venta_equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "venta_equipo_item" ADD CONSTRAINT "venta_equipo_item_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "catalogo_equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pedido_equipo" ADD CONSTRAINT "pedido_equipo_ventaEquipoId_fkey" FOREIGN KEY ("ventaEquipoId") REFERENCES "venta_equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_ventaEquipoId_fkey" FOREIGN KEY ("ventaEquipoId") REFERENCES "venta_equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
