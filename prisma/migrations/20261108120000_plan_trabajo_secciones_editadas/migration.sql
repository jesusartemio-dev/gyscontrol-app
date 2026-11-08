-- Plan de Trabajo: secciones editadas a mano desde su última generación, para
-- avisar (y respetarlas) antes de regenerar con IA o recalcular.
ALTER TABLE "plan_trabajo" ADD COLUMN "seccionesEditadas" JSONB;
