-- CreateTable
CREATE TABLE "solicitud_anticipo" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "aprobadorId" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "motivo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "comentarioRechazo" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaAprobacion" TIMESTAMP(3),
    "fechaPago" TIMESTAMP(3),
    "montoLiquidado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montoPendiente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitud_anticipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rendicion_gasto" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "solicitudAnticipoId" TEXT,
    "proyectoId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "aprobadorId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "montoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comentarioRechazo" TEXT,
    "observaciones" TEXT,
    "fechaEnvio" TIMESTAMP(3),
    "fechaAprobacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rendicion_gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gasto_linea" (
    "id" TEXT NOT NULL,
    "rendicionGastoId" TEXT NOT NULL,
    "categoriaGastoId" TEXT,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "tipoComprobante" TEXT,
    "numeroComprobante" TEXT,
    "proveedorNombre" TEXT,
    "proveedorRuc" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gasto_linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gasto_adjunto" (
    "id" TEXT NOT NULL,
    "gastoLineaId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "driveFileId" TEXT,
    "tipoArchivo" TEXT,
    "tamano" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gasto_adjunto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_anticipo_numero_key" ON "solicitud_anticipo"("numero");

-- CreateIndex
CREATE INDEX "solicitud_anticipo_proyectoId_estado_idx" ON "solicitud_anticipo"("proyectoId", "estado");

-- CreateIndex
CREATE INDEX "solicitud_anticipo_solicitanteId_estado_idx" ON "solicitud_anticipo"("solicitanteId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "rendicion_gasto_numero_key" ON "rendicion_gasto"("numero");

-- CreateIndex
CREATE INDEX "rendicion_gasto_proyectoId_estado_idx" ON "rendicion_gasto"("proyectoId", "estado");

-- CreateIndex
CREATE INDEX "rendicion_gasto_empleadoId_estado_idx" ON "rendicion_gasto"("empleadoId", "estado");

-- CreateIndex
CREATE INDEX "rendicion_gasto_solicitudAnticipoId_idx" ON "rendicion_gasto"("solicitudAnticipoId");

-- CreateIndex
CREATE INDEX "gasto_linea_rendicionGastoId_idx" ON "gasto_linea"("rendicionGastoId");

-- CreateIndex
CREATE INDEX "gasto_adjunto_gastoLineaId_idx" ON "gasto_adjunto"("gastoLineaId");

-- AddForeignKey
ALTER TABLE "solicitud_anticipo" ADD CONSTRAINT "solicitud_anticipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_anticipo" ADD CONSTRAINT "solicitud_anticipo_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_anticipo" ADD CONSTRAINT "solicitud_anticipo_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendicion_gasto" ADD CONSTRAINT "rendicion_gasto_solicitudAnticipoId_fkey" FOREIGN KEY ("solicitudAnticipoId") REFERENCES "solicitud_anticipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendicion_gasto" ADD CONSTRAINT "rendicion_gasto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendicion_gasto" ADD CONSTRAINT "rendicion_gasto_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendicion_gasto" ADD CONSTRAINT "rendicion_gasto_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto_linea" ADD CONSTRAINT "gasto_linea_rendicionGastoId_fkey" FOREIGN KEY ("rendicionGastoId") REFERENCES "rendicion_gasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto_linea" ADD CONSTRAINT "gasto_linea_categoriaGastoId_fkey" FOREIGN KEY ("categoriaGastoId") REFERENCES "categoria_gasto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto_adjunto" ADD CONSTRAINT "gasto_adjunto_gastoLineaId_fkey" FOREIGN KEY ("gastoLineaId") REFERENCES "gasto_linea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
