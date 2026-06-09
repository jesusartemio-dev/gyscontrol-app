-- Migration: Reporte Semanal de Avance (Módulo B — área de Proyectos)
-- Tablas reporte_semanal_avance y proyecto_hito + enums. Aditivo, no toca tablas existentes.

-- CreateEnum
CREATE TYPE "EstadoReporteAvance" AS ENUM ('borrador', 'enviado', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "TipoHito" AS ENUM ('contractual', 'intermedio');

-- CreateTable
CREATE TABLE "reporte_semanal_avance" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "semanaIso" TEXT NOT NULL,
    "numero" INTEGER,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoReporteAvance" NOT NULL DEFAULT 'borrador',
    "alcanceTexto" TEXT,
    "resumenEjecutivo" TEXT,
    "comentariosHitos" JSONB,
    "variaciones" JSONB,
    "impedimentos" JSONB,
    "aprobadorId" TEXT,
    "notasRevision" TEXT,
    "enviadoAt" TIMESTAMP(3),
    "aprobadoAt" TIMESTAMP(3),
    "rechazadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporte_semanal_avance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_hito" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "tipo" "TipoHito" NOT NULL DEFAULT 'intermedio',
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fechaPlan" TIMESTAMP(3),
    "fechaPronostico" TIMESTAMP(3),
    "fechaReal" TIMESTAMP(3),
    "comentario" TEXT,
    "proyectoFaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_hito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reporte_semanal_avance_estado_semanaIso_idx" ON "reporte_semanal_avance"("estado", "semanaIso" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reporte_semanal_avance_proyectoId_semanaIso_key" ON "reporte_semanal_avance"("proyectoId", "semanaIso");

-- CreateIndex
CREATE INDEX "proyecto_hito_proyectoId_tipo_orden_idx" ON "proyecto_hito"("proyectoId", "tipo", "orden");

-- AddForeignKey
ALTER TABLE "reporte_semanal_avance" ADD CONSTRAINT "reporte_semanal_avance_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_semanal_avance" ADD CONSTRAINT "reporte_semanal_avance_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_semanal_avance" ADD CONSTRAINT "reporte_semanal_avance_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_hito" ADD CONSTRAINT "proyecto_hito_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_hito" ADD CONSTRAINT "proyecto_hito_proyectoFaseId_fkey" FOREIGN KEY ("proyectoFaseId") REFERENCES "proyecto_fase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
