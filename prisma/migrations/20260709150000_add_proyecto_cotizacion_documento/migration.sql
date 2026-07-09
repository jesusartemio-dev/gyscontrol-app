-- CreateTable
CREATE TABLE "proyecto_cotizacion_documento" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "driveFileId" TEXT,
    "urlArchivo" TEXT NOT NULL,
    "tamanoBytes" INTEGER,
    "paginasPdf" INTEGER,
    "numeroPropuesta" TEXT,
    "clienteDetectado" TEXT,
    "moneda" TEXT DEFAULT 'USD',
    "fechaPropuesta" TIMESTAMP(3),
    "confianzaExtraccion" TEXT,
    "totalEquiposExtraido" DOUBLE PRECISION,
    "totalServiciosExtraido" DOUBLE PRECISION,
    "totalGastosExtraido" DOUBLE PRECISION,
    "descuentoExtraido" DOUBLE PRECISION,
    "grandTotalExtraido" DOUBLE PRECISION,
    "grandTotalIncluyeImpuestos" BOOLEAN,
    "resumenAlcance" JSONB,
    "exclusiones" JSONB,
    "lineasClasificadas" JSONB,
    "advertenciasExtraccion" JSONB,
    "diffSnapshot" JSONB,
    "estadoVerificacion" TEXT,
    "fechaVerificacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_cotizacion_documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_cotizacion_documento_proyectoId_key" ON "proyecto_cotizacion_documento"("proyectoId");

-- AddForeignKey
ALTER TABLE "proyecto_cotizacion_documento" ADD CONSTRAINT "proyecto_cotizacion_documento_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
