-- Hitos como tareas (Milestone + Deadline de MS Project)
ALTER TABLE "proyecto_tarea" ADD COLUMN     "esHito" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaLimite" TIMESTAMP(3);
