-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('entrada_recepcion', 'salida_proyecto', 'devolucion_proyecto', 'alta_herramienta', 'prestamo_herramienta', 'devolucion_herramienta', 'baja_herramienta', 'ajuste_inventario');

-- CreateEnum
CREATE TYPE "EstadoHerramientaUnidad" AS ENUM ('disponible', 'prestada', 'en_reparacion', 'dada_de_baja');

-- CreateEnum
CREATE TYPE "EstadoPrestamo" AS ENUM ('activo', 'devuelto', 'devuelto_parcial', 'vencido', 'perdido');

-- CreateEnum
CREATE TYPE "EstadoPrestamoItem" AS ENUM ('prestado', 'devuelto', 'perdido');

-- CreateEnum
CREATE TYPE "EstadoDevolucion" AS ENUM ('registrada', 'anulada');

-- CreateTable
CREATE TABLE "almacen" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "almacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_almacen" (
    "id" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "catalogoEquipoId" TEXT,
    "catalogoHerramientaId" TEXT,
    "cantidadDisponible" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantidadReservada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_almacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_almacen" (
    "id" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "catalogoEquipoId" TEXT,
    "catalogoHerramientaId" TEXT,
    "herramientaUnidadId" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recepcionPendienteId" TEXT,
    "entregaItemId" TEXT,
    "prestamoHerramientaId" TEXT,
    "devolucionMaterialId" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "movimiento_almacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_herramienta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT,
    "fotoUrl" TEXT,
    "gestionPorUnidad" BOOLEAN NOT NULL DEFAULT false,
    "unidadMedida" TEXT NOT NULL DEFAULT 'unidad',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_herramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "herramienta_unidad" (
    "id" TEXT NOT NULL,
    "catalogoHerramientaId" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "codigoQR" TEXT,
    "almacenId" TEXT NOT NULL,
    "estado" "EstadoHerramientaUnidad" NOT NULL DEFAULT 'disponible',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "herramienta_unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestamo_herramienta" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "fechaPrestamo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDevolucionEstimada" TIMESTAMP(3),
    "fechaDevolucionReal" TIMESTAMP(3),
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'activo',
    "entregadoPorId" TEXT NOT NULL,
    "recibidoPorId" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestamo_herramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestamo_herramienta_item" (
    "id" TEXT NOT NULL,
    "prestamoId" TEXT NOT NULL,
    "herramientaUnidadId" TEXT,
    "catalogoHerramientaId" TEXT,
    "cantidadPrestada" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "cantidadDevuelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechaDevolucionItem" TIMESTAMP(3),
    "estado" "EstadoPrestamoItem" NOT NULL DEFAULT 'prestado',

    CONSTRAINT "prestamo_herramienta_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucion_material" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "fechaDevolucion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" TEXT NOT NULL,
    "devueltoPorId" TEXT,
    "observaciones" TEXT,
    "estado" "EstadoDevolucion" NOT NULL DEFAULT 'registrada',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devolucion_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucion_material_item" (
    "id" TEXT NOT NULL,
    "devolucionId" TEXT NOT NULL,
    "catalogoEquipoId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "pedidoEquipoItemId" TEXT,
    "observacionesItem" TEXT,
    "estadoItem" TEXT NOT NULL DEFAULT 'bueno',

    CONSTRAINT "devolucion_material_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_almacen_almacenId_catalogoEquipoId_key" ON "stock_almacen"("almacenId", "catalogoEquipoId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_almacen_almacenId_catalogoHerramientaId_key" ON "stock_almacen"("almacenId", "catalogoHerramientaId");

-- CreateIndex
CREATE INDEX "movimiento_almacen_almacenId_fechaMovimiento_idx" ON "movimiento_almacen"("almacenId", "fechaMovimiento");

-- CreateIndex
CREATE INDEX "movimiento_almacen_catalogoEquipoId_idx" ON "movimiento_almacen"("catalogoEquipoId");

-- CreateIndex
CREATE INDEX "movimiento_almacen_catalogoHerramientaId_idx" ON "movimiento_almacen"("catalogoHerramientaId");

-- CreateIndex
CREATE INDEX "movimiento_almacen_tipo_fechaMovimiento_idx" ON "movimiento_almacen"("tipo", "fechaMovimiento");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_herramienta_codigo_key" ON "catalogo_herramienta"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "herramienta_unidad_codigoQR_key" ON "herramienta_unidad"("codigoQR");

-- CreateIndex
CREATE UNIQUE INDEX "herramienta_unidad_catalogoHerramientaId_serie_key" ON "herramienta_unidad"("catalogoHerramientaId", "serie");

-- CreateIndex
CREATE INDEX "prestamo_herramienta_usuarioId_estado_idx" ON "prestamo_herramienta"("usuarioId", "estado");

-- CreateIndex
CREATE INDEX "prestamo_herramienta_estado_fechaDevolucionEstimada_idx" ON "prestamo_herramienta"("estado", "fechaDevolucionEstimada");

-- CreateIndex
CREATE INDEX "devolucion_material_proyectoId_fechaDevolucion_idx" ON "devolucion_material"("proyectoId", "fechaDevolucion");

-- AddForeignKey
ALTER TABLE "stock_almacen" ADD CONSTRAINT "stock_almacen_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_almacen" ADD CONSTRAINT "stock_almacen_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "catalogo_equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_almacen" ADD CONSTRAINT "stock_almacen_catalogoHerramientaId_fkey" FOREIGN KEY ("catalogoHerramientaId") REFERENCES "catalogo_herramienta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_almacen" ADD CONSTRAINT "movimiento_almacen_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_almacen" ADD CONSTRAINT "movimiento_almacen_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_almacen" ADD CONSTRAINT "movimiento_almacen_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "catalogo_equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_almacen" ADD CONSTRAINT "movimiento_almacen_catalogoHerramientaId_fkey" FOREIGN KEY ("catalogoHerramientaId") REFERENCES "catalogo_herramienta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_almacen" ADD CONSTRAINT "movimiento_almacen_herramientaUnidadId_fkey" FOREIGN KEY ("herramientaUnidadId") REFERENCES "herramienta_unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_almacen" ADD CONSTRAINT "movimiento_almacen_recepcionPendienteId_fkey" FOREIGN KEY ("recepcionPendienteId") REFERENCES "recepcion_pendiente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_almacen" ADD CONSTRAINT "movimiento_almacen_prestamoHerramientaId_fkey" FOREIGN KEY ("prestamoHerramientaId") REFERENCES "prestamo_herramienta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_almacen" ADD CONSTRAINT "movimiento_almacen_devolucionMaterialId_fkey" FOREIGN KEY ("devolucionMaterialId") REFERENCES "devolucion_material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "herramienta_unidad" ADD CONSTRAINT "herramienta_unidad_catalogoHerramientaId_fkey" FOREIGN KEY ("catalogoHerramientaId") REFERENCES "catalogo_herramienta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "herramienta_unidad" ADD CONSTRAINT "herramienta_unidad_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_herramienta" ADD CONSTRAINT "prestamo_herramienta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_herramienta" ADD CONSTRAINT "prestamo_herramienta_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_herramienta" ADD CONSTRAINT "prestamo_herramienta_entregadoPorId_fkey" FOREIGN KEY ("entregadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_herramienta" ADD CONSTRAINT "prestamo_herramienta_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_herramienta_item" ADD CONSTRAINT "prestamo_herramienta_item_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "prestamo_herramienta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_herramienta_item" ADD CONSTRAINT "prestamo_herramienta_item_herramientaUnidadId_fkey" FOREIGN KEY ("herramientaUnidadId") REFERENCES "herramienta_unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_herramienta_item" ADD CONSTRAINT "prestamo_herramienta_item_catalogoHerramientaId_fkey" FOREIGN KEY ("catalogoHerramientaId") REFERENCES "catalogo_herramienta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_material" ADD CONSTRAINT "devolucion_material_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_material" ADD CONSTRAINT "devolucion_material_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_material" ADD CONSTRAINT "devolucion_material_devueltoPorId_fkey" FOREIGN KEY ("devueltoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_material_item" ADD CONSTRAINT "devolucion_material_item_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "devolucion_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_material_item" ADD CONSTRAINT "devolucion_material_item_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "catalogo_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
