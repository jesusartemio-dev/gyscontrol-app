-- Rename porcentaje to cantidad and convert values (100% = 1 person)
ALTER TABLE "recurso_composicion" RENAME COLUMN "porcentaje" TO "cantidad";
ALTER TABLE "recurso_composicion" ALTER COLUMN "cantidad" SET DEFAULT 1;
ALTER TABLE "recurso_composicion" ALTER COLUMN "cantidad" TYPE INTEGER USING GREATEST(ROUND("cantidad" / 100)::INTEGER, 1);
