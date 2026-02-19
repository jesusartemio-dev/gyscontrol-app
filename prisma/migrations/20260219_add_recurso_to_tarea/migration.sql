-- Add recursoId to proyecto_tarea for resource assignment
ALTER TABLE "proyecto_tarea" ADD COLUMN "recursoId" TEXT;

-- Foreign key to recurso table
ALTER TABLE "proyecto_tarea" ADD CONSTRAINT "proyecto_tarea_recursoId_fkey"
  FOREIGN KEY ("recursoId") REFERENCES "recurso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for lookups
CREATE INDEX "proyecto_tarea_recursoId_idx" ON "proyecto_tarea"("recursoId");
