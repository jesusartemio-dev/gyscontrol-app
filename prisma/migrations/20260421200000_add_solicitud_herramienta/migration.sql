-- CreateEnum
CREATE TYPE "EstadoSolicitudHerramienta" AS ENUM ('pendiente', 'atendida', 'cancelada');

-- CreateTable
CREATE TABLE "solicitud_herramienta" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "observaciones" TEXT,
    "estado" "EstadoSolicitudHerramienta" NOT NULL DEFAULT 'pendiente',
    "prestamoId" TEXT,
    "atendidaPorId" TEXT,
    "fechaAtencion" TIMESTAMP(3),
    "notaAtencion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitud_herramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_herramienta_item" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "catalogoHerramientaId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "solicitud_herramienta_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_herramienta_numero_key" ON "solicitud_herramienta"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_herramienta_prestamoId_key" ON "solicitud_herramienta"("prestamoId");

-- CreateIndex
CREATE INDEX "solicitud_herramienta_solicitanteId_estado_idx" ON "solicitud_herramienta"("solicitanteId", "estado");

-- CreateIndex
CREATE INDEX "solicitud_herramienta_estado_createdAt_idx" ON "solicitud_herramienta"("estado", "createdAt");

-- AddForeignKey
ALTER TABLE "solicitud_herramienta" ADD CONSTRAINT "solicitud_herramienta_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_herramienta" ADD CONSTRAINT "solicitud_herramienta_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_herramienta" ADD CONSTRAINT "solicitud_herramienta_atendidaPorId_fkey" FOREIGN KEY ("atendidaPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_herramienta" ADD CONSTRAINT "solicitud_herramienta_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "prestamo_herramienta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_herramienta_item" ADD CONSTRAINT "solicitud_herramienta_item_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud_herramienta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_herramienta_item" ADD CONSTRAINT "solicitud_herramienta_item_catalogoHerramientaId_fkey" FOREIGN KEY ("catalogoHerramientaId") REFERENCES "catalogo_herramienta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

