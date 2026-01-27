-- Migration: Add PlantillaDuracionCronograma table
-- Date: 2023-11-25

CREATE TABLE IF NOT EXISTS "plantilla_duracion_cronograma" (
    "id" TEXT NOT NULL,
    "tipoProyecto" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "duracionDias" DOUBLE PRECISION NOT NULL,
    "horasPorDia" DOUBLE PRECISION NOT NULL,
    "bufferPorcentaje" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plantilla_duracion_cronograma_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "plantilla_duracion_cronograma_tipoProyecto_nivel_key" ON "plantilla_duracion_cronograma"("tipoProyecto", "nivel");
CREATE INDEX IF NOT EXISTS "plantilla_duracion_cronograma_tipoProyecto_activo_idx" ON "plantilla_duracion_cronograma"("tipoProyecto", "activo");
CREATE INDEX IF NOT EXISTS "plantilla_duracion_cronograma_nivel_activo_idx" ON "plantilla_duracion_cronograma"("nivel", "activo");