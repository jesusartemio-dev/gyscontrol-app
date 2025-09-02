-- CreateEnum
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('BORRADOR', 'ENVIADA', 'CONFIRMADA', 'EN_TRANSITO', 'RECIBIDO_PARCIAL', 'RECIBIDO_TOTAL', 'PAGADO', 'CERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoRecepcion" AS ENUM ('PENDIENTE', 'EN_INSPECCION', 'APROBADO', 'RECHAZADO', 'PARCIAL');

-- CreateEnum
CREATE TYPE "TipoRecepcion" AS ENUM ('TOTAL', 'PARCIAL');

-- CreateEnum
CREATE TYPE "EstadoInspeccion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'OBSERVADO');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('ADELANTO', 'PAGO_PARCIAL', 'PAGO_TOTAL', 'PAGO_FINAL');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PROGRAMADO', 'EJECUTADO', 'CONCILIADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "orden_compra" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "pedidoEquipoId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "estado" "EstadoOrdenCompra" NOT NULL DEFAULT 'BORRADOR',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRequerida" TIMESTAMP(3) NOT NULL,
    "fechaEntrega" TIMESTAMP(3),
    "montoTotal" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "terminosEntrega" TEXT,
    "condicionesPago" TEXT,
    "observaciones" TEXT,
    "creadoPor" TEXT NOT NULL,
    "aprobadoPor" TEXT,
    "fechaAprobacion" TIMESTAMP(3),

    CONSTRAINT "orden_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_compra_item" (
    "id" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "pedidoEquipoItemId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "especificaciones" TEXT,

    CONSTRAINT "orden_compra_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepcion" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "fechaRecepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoRecepcion" NOT NULL DEFAULT 'PENDIENTE',
    "tipoRecepcion" "TipoRecepcion" NOT NULL DEFAULT 'TOTAL',
    "observaciones" TEXT,
    "recibidoPor" TEXT NOT NULL,
    "inspeccionadoPor" TEXT,
    "fechaInspeccion" TIMESTAMP(3),
    "documentos" TEXT[],

    CONSTRAINT "recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepcion_item" (
    "id" TEXT NOT NULL,
    "recepcionId" TEXT NOT NULL,
    "ordenCompraItemId" TEXT NOT NULL,
    "cantidadRecibida" INTEGER NOT NULL,
    "cantidadAceptada" INTEGER NOT NULL,
    "cantidadRechazada" INTEGER NOT NULL DEFAULT 0,
    "estadoInspeccion" "EstadoInspeccion" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,

    CONSTRAINT "recepcion_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "tipo" "TipoPago" NOT NULL DEFAULT 'PAGO_TOTAL',
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "referenciaPago" TEXT,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "creadoPor" TEXT NOT NULL,
    "aprobadoPor" TEXT,
    "fechaAprobacion" TIMESTAMP(3),

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orden_compra_numero_key" ON "orden_compra"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "recepcion_numero_key" ON "recepcion"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "pago_numero_key" ON "pago"("numero");

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_pedidoEquipoId_fkey" FOREIGN KEY ("pedidoEquipoId") REFERENCES "PedidoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_item" ADD CONSTRAINT "orden_compra_item_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_item" ADD CONSTRAINT "orden_compra_item_pedidoEquipoItemId_fkey" FOREIGN KEY ("pedidoEquipoItemId") REFERENCES "PedidoEquipoItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion" ADD CONSTRAINT "recepcion_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion" ADD CONSTRAINT "recepcion_recibidoPor_fkey" FOREIGN KEY ("recibidoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion_item" ADD CONSTRAINT "recepcion_item_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "recepcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion_item" ADD CONSTRAINT "recepcion_item_ordenCompraItemId_fkey" FOREIGN KEY ("ordenCompraItemId") REFERENCES "orden_compra_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
