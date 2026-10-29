-- Plan de trabajo: 4.º firmante (columna "Aut." de la tabla de emisión NEXA).
ALTER TABLE "plan_trabajo" ADD COLUMN IF NOT EXISTS "autorizadoPor" TEXT;
ALTER TABLE "plan_trabajo" ADD COLUMN IF NOT EXISTS "autorizadoCargo" TEXT;
