-- Migration: Snapshot semanal de avance por tarea (Fase 2 — Curva S de avance)
-- Tablas proyecto_avance_snapshot y proyecto_avance_snapshot_tarea. Aditivo, no toca tablas existentes.

-- CreateTable
CREATE TABLE "proyecto_avance_snapshot" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "proyectoCronogramaId" TEXT,
    "semanaIso" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "tomadoPorId" TEXT,
    "progresoGeneral" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_avance_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_avance_snapshot_tarea" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "proyectoTareaId" TEXT,
    "nombreTarea" TEXT NOT NULL,
    "proyectoFaseNombre" TEXT,
    "horasEstimadas" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "porcentaje" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_avance_snapshot_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proyecto_avance_snapshot_proyectoId_semanaIso_idx" ON "proyecto_avance_snapshot"("proyectoId", "semanaIso");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_avance_snapshot_proyectoId_semanaIso_key" ON "proyecto_avance_snapshot"("proyectoId", "semanaIso");

-- CreateIndex
CREATE INDEX "proyecto_avance_snapshot_tarea_snapshotId_idx" ON "proyecto_avance_snapshot_tarea"("snapshotId");

-- AddForeignKey
ALTER TABLE "proyecto_avance_snapshot" ADD CONSTRAINT "proyecto_avance_snapshot_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_avance_snapshot" ADD CONSTRAINT "proyecto_avance_snapshot_proyectoCronogramaId_fkey" FOREIGN KEY ("proyectoCronogramaId") REFERENCES "proyecto_cronograma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_avance_snapshot" ADD CONSTRAINT "proyecto_avance_snapshot_tomadoPorId_fkey" FOREIGN KEY ("tomadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_avance_snapshot_tarea" ADD CONSTRAINT "proyecto_avance_snapshot_tarea_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "proyecto_avance_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_avance_snapshot_tarea" ADD CONSTRAINT "proyecto_avance_snapshot_tarea_proyectoTareaId_fkey" FOREIGN KEY ("proyectoTareaId") REFERENCES "proyecto_tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
