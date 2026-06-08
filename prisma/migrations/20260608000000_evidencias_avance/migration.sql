-- Migration: Evidencias Técnicas / de Avance (Área de Proyectos)
-- Análogo a Evidencias de Seguridad, para personal de proyectos.

-- CreateEnum
CREATE TYPE "EstadoEvidenciaAvance" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "TipoRegistroAvance" AS ENUM ('avance_general', 'montaje_instalacion', 'conexionado_electrico', 'instrumentacion', 'pruebas_comisionamiento', 'inspeccion_calidad');

-- CreateTable
CREATE TABLE "evidencia_avance" (
    "id" TEXT NOT NULL,
    "registroHorasCampoId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "estado" "EstadoEvidenciaAvance" NOT NULL DEFAULT 'abierta',
    "observaciones" TEXT,
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidencia_avance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_avance" (
    "id" TEXT NOT NULL,
    "evidenciaAvanceId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "tipo" "TipoRegistroAvance" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "disciplina" TEXT,
    "proyectoTareaId" TEXT,
    "porcentajeAvance" INTEGER,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registro_avance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_avance_foto" (
    "id" TEXT NOT NULL,
    "registroAvanceId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "driveFileId" TEXT,
    "tipoArchivo" TEXT,
    "tamano" INTEGER,
    "leyenda" TEXT,
    "incluirEnReporte" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_avance_foto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evidencia_avance_registroHorasCampoId_key" ON "evidencia_avance"("registroHorasCampoId");

-- CreateIndex
CREATE INDEX "evidencia_avance_creadoPorId_idx" ON "evidencia_avance"("creadoPorId");

-- CreateIndex
CREATE INDEX "registro_avance_evidenciaAvanceId_idx" ON "registro_avance"("evidenciaAvanceId");

-- CreateIndex
CREATE INDEX "registro_avance_autorId_createdAt_idx" ON "registro_avance"("autorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "registro_avance_tipo_createdAt_idx" ON "registro_avance"("tipo", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "registro_avance_proyectoTareaId_idx" ON "registro_avance"("proyectoTareaId");

-- CreateIndex
CREATE INDEX "registro_avance_foto_registroAvanceId_orden_idx" ON "registro_avance_foto"("registroAvanceId", "orden");

-- AddForeignKey
ALTER TABLE "evidencia_avance" ADD CONSTRAINT "evidencia_avance_registroHorasCampoId_fkey" FOREIGN KEY ("registroHorasCampoId") REFERENCES "registro_horas_campo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia_avance" ADD CONSTRAINT "evidencia_avance_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_avance" ADD CONSTRAINT "registro_avance_evidenciaAvanceId_fkey" FOREIGN KEY ("evidenciaAvanceId") REFERENCES "evidencia_avance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_avance" ADD CONSTRAINT "registro_avance_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_avance" ADD CONSTRAINT "registro_avance_proyectoTareaId_fkey" FOREIGN KEY ("proyectoTareaId") REFERENCES "proyecto_tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_avance_foto" ADD CONSTRAINT "registro_avance_foto_registroAvanceId_fkey" FOREIGN KEY ("registroAvanceId") REFERENCES "registro_avance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
