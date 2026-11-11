-- Programacion automatica por cronograma y fecha fija por tarea
ALTER TABLE "proyecto_cronograma" ADD COLUMN "programacionAutomatica" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "proyecto_tarea" ADD COLUMN "fechaFija" BOOLEAN NOT NULL DEFAULT false;
