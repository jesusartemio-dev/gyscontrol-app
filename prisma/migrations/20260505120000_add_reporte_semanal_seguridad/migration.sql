-- CreateEnum
CREATE TYPE "EstadoReporteSeguridad" AS ENUM ('borrador', 'enviado', 'aprobado', 'rechazado');

-- CreateTable
CREATE TABLE "reporte_semanal_seguridad" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "ingenieroId" TEXT NOT NULL,
    "semanaIso" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoReporteSeguridad" NOT NULL DEFAULT 'borrador',
    "resumenEjecutivo" TEXT,
    "horasHombre" DOUBLE PRECISION,
    "diasSinAccidentes" INTEGER,
    "incidentesCount" INTEGER,
    "accidentesCount" INTEGER,
    "horasCapacitacion" DOUBLE PRECISION,
    "personasCapacitadas" INTEGER,
    "aprobadorId" TEXT,
    "notasRevision" TEXT,
    "enviadoAt" TIMESTAMP(3),
    "aprobadoAt" TIMESTAMP(3),
    "rechazadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporte_semanal_seguridad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reporte_semanal_seguridad_proyectoId_semanaIso_idx" ON "reporte_semanal_seguridad"("proyectoId", "semanaIso");

-- CreateIndex
CREATE INDEX "reporte_semanal_seguridad_ingenieroId_semanaIso_idx" ON "reporte_semanal_seguridad"("ingenieroId", "semanaIso");

-- CreateIndex
CREATE INDEX "reporte_semanal_seguridad_estado_semanaIso_idx" ON "reporte_semanal_seguridad"("estado", "semanaIso" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reporte_semanal_seguridad_proyectoId_semanaIso_key" ON "reporte_semanal_seguridad"("proyectoId", "semanaIso");

-- AddForeignKey
ALTER TABLE "reporte_semanal_seguridad" ADD CONSTRAINT "reporte_semanal_seguridad_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_semanal_seguridad" ADD CONSTRAINT "reporte_semanal_seguridad_ingenieroId_fkey" FOREIGN KEY ("ingenieroId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_semanal_seguridad" ADD CONSTRAINT "reporte_semanal_seguridad_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
