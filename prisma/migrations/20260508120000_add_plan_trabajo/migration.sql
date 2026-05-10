-- CreateTable
CREATE TABLE "plan_trabajo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "generadoConIA" BOOLEAN NOT NULL DEFAULT false,
    "fechaGeneracionIA" TIMESTAMP(3),
    "ultimaSeccionRegenerada" TEXT,
    "codigoDocumento" TEXT,
    "numeroRevision" TEXT NOT NULL DEFAULT 'A',
    "tipoEmision" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "numeroConsultor" TEXT,
    "preparadoPor" TEXT,
    "preparadoCargo" TEXT,
    "revisadoPor" TEXT,
    "revisadoCargo" TEXT,
    "aprobadoPor" TEXT,
    "aprobadoCargo" TEXT,
    "objetivo" TEXT,
    "alcanceGeneral" TEXT,
    "alcanceDetallado" JSONB,
    "eppRequeridos" JSONB,
    "herramientasYEquipos" JSONB,
    "restricciones" JSONB,
    "personalAsignado" JSONB,
    "matrizRaci" JSONB,
    "histogramas" JSONB,
    "cronogramaResumen" JSONB,
    "responsabilidades" JSONB,
    "referencias" JSONB,
    "incluirOrganigrama" BOOLEAN NOT NULL DEFAULT true,
    "incluirMatriz" BOOLEAN NOT NULL DEFAULT true,
    "incluirCronograma" BOOLEAN NOT NULL DEFAULT true,
    "incluirHistogramas" BOOLEAN NOT NULL DEFAULT true,
    "incluirTDR" BOOLEAN NOT NULL DEFAULT true,
    "bloquesCompletitud" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_trabajo_generacion" (
    "id" TEXT NOT NULL,
    "planTrabajoId" TEXT NOT NULL,
    "numeroRevision" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "webViewLink" TEXT NOT NULL,
    "driveFolderId" TEXT,
    "archivoNombre" TEXT NOT NULL,
    "tamanioBytes" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "generadoPorId" TEXT NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_trabajo_generacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_trabajo_proyectoId_key" ON "plan_trabajo"("proyectoId");

-- CreateIndex
CREATE INDEX "plan_trabajo_generacion_planTrabajoId_generadoEn_idx" ON "plan_trabajo_generacion"("planTrabajoId", "generadoEn" DESC);

-- AddForeignKey
ALTER TABLE "plan_trabajo" ADD CONSTRAINT "plan_trabajo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_trabajo_generacion" ADD CONSTRAINT "plan_trabajo_generacion_planTrabajoId_fkey" FOREIGN KEY ("planTrabajoId") REFERENCES "plan_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_trabajo_generacion" ADD CONSTRAINT "plan_trabajo_generacion_generadoPorId_fkey" FOREIGN KEY ("generadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
