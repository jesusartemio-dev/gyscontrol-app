-- CreateTable
CREATE TABLE "public"."cotizacion_version" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "snapshot" TEXT NOT NULL,
    "cambios" TEXT,
    "motivoCambio" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cotizacion_version_cotizacionId_version_idx" ON "public"."cotizacion_version"("cotizacionId", "version");

-- CreateIndex
CREATE INDEX "cotizacion_version_estado_createdAt_idx" ON "public"."cotizacion_version"("estado", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_version_cotizacionId_version_key" ON "public"."cotizacion_version"("cotizacionId", "version");

-- AddForeignKey
ALTER TABLE "public"."cotizacion_version" ADD CONSTRAINT "cotizacion_version_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_version" ADD CONSTRAINT "cotizacion_version_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
