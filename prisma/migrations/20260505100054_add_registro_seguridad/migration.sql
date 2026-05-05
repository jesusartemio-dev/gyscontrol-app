-- CreateEnum
CREATE TYPE "TipoRegistroSeguridad" AS ENUM ('charla', 'inspeccion', 'observacion', 'incidente', 'actividad_general', 'riesgo_critico', 'medio_ambiente', 'prevencion_salud');

-- CreateTable
CREATE TABLE "registro_seguridad" (
    "id" TEXT NOT NULL,
    "registroHorasCampoId" TEXT NOT NULL,
    "ingenieroId" TEXT NOT NULL,
    "tipo" "TipoRegistroSeguridad" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "asistentes" INTEGER,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registro_seguridad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_seguridad_foto" (
    "id" TEXT NOT NULL,
    "registroSeguridadId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "driveFileId" TEXT,
    "tipoArchivo" TEXT,
    "tamano" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_seguridad_foto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registro_seguridad_registroHorasCampoId_idx" ON "registro_seguridad"("registroHorasCampoId");

-- CreateIndex
CREATE INDEX "registro_seguridad_ingenieroId_createdAt_idx" ON "registro_seguridad"("ingenieroId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "registro_seguridad_tipo_createdAt_idx" ON "registro_seguridad"("tipo", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "registro_seguridad_foto_registroSeguridadId_orden_idx" ON "registro_seguridad_foto"("registroSeguridadId", "orden");

-- AddForeignKey
ALTER TABLE "registro_seguridad" ADD CONSTRAINT "registro_seguridad_registroHorasCampoId_fkey" FOREIGN KEY ("registroHorasCampoId") REFERENCES "registro_horas_campo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_seguridad" ADD CONSTRAINT "registro_seguridad_ingenieroId_fkey" FOREIGN KEY ("ingenieroId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_seguridad_foto" ADD CONSTRAINT "registro_seguridad_foto_registroSeguridadId_fkey" FOREIGN KEY ("registroSeguridadId") REFERENCES "registro_seguridad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
