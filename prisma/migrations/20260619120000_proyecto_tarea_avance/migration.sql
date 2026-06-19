-- CreateEnum
CREATE TYPE "OrigenAvanceTarea" AS ENUM ('campo', 'oficina', 'automatico');

-- CreateTable
CREATE TABLE "proyecto_tarea_avance" (
    "id" TEXT NOT NULL,
    "proyectoTareaId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "porcentaje" INTEGER NOT NULL,
    "origen" "OrigenAvanceTarea" NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_tarea_avance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proyecto_tarea_avance_proyectoId_fecha_idx" ON "proyecto_tarea_avance"("proyectoId", "fecha");

-- CreateIndex
CREATE INDEX "proyecto_tarea_avance_proyectoTareaId_fecha_idx" ON "proyecto_tarea_avance"("proyectoTareaId", "fecha");

-- CreateIndex
CREATE INDEX "proyecto_tarea_avance_proyectoId_origen_fecha_idx" ON "proyecto_tarea_avance"("proyectoId", "origen", "fecha");

-- AddForeignKey
ALTER TABLE "proyecto_tarea_avance" ADD CONSTRAINT "proyecto_tarea_avance_proyectoTareaId_fkey" FOREIGN KEY ("proyectoTareaId") REFERENCES "proyecto_tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea_avance" ADD CONSTRAINT "proyecto_tarea_avance_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea_avance" ADD CONSTRAINT "proyecto_tarea_avance_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
