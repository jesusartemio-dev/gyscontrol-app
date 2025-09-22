-- AlterTable
ALTER TABLE "public"."CatalogoServicio" ADD COLUMN     "orden" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Cotizacion" ADD COLUMN     "fechaValidezHasta" TIMESTAMP(3),
ADD COLUMN     "formaPago" TEXT,
ADD COLUMN     "incluyeIGV" BOOLEAN DEFAULT false,
ADD COLUMN     "moneda" TEXT DEFAULT 'USD',
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "revision" TEXT DEFAULT 'R01',
ADD COLUMN     "validezOferta" INTEGER DEFAULT 15;

-- AlterTable
ALTER TABLE "public"."CotizacionEquipo" ADD COLUMN     "plazoEntregaSemanas" INTEGER;

-- AlterTable
ALTER TABLE "public"."CotizacionGasto" ADD COLUMN     "plazoEntregaSemanas" INTEGER;

-- AlterTable
ALTER TABLE "public"."CotizacionServicio" ADD COLUMN     "plazoEntregaSemanas" INTEGER;

-- AlterTable
ALTER TABLE "public"."CotizacionServicioItem" ADD COLUMN     "orden" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."cotizacion_tarea" ADD COLUMN     "cotizacionServicioItemId" TEXT;

-- CreateTable
CREATE TABLE "public"."cotizacion_exclusion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_exclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cotizacion_condicion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "tipo" TEXT,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_condicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cotizacion_exclusion_cotizacionId_orden_idx" ON "public"."cotizacion_exclusion"("cotizacionId", "orden");

-- CreateIndex
CREATE INDEX "cotizacion_condicion_cotizacionId_orden_idx" ON "public"."cotizacion_condicion"("cotizacionId", "orden");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_cotizacionServicioItemId_idx" ON "public"."cotizacion_tarea"("cotizacionServicioItemId");

-- AddForeignKey
ALTER TABLE "public"."cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_cotizacionServicioItemId_fkey" FOREIGN KEY ("cotizacionServicioItemId") REFERENCES "public"."CotizacionServicioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_exclusion" ADD CONSTRAINT "cotizacion_exclusion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_condicion" ADD CONSTRAINT "cotizacion_condicion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
