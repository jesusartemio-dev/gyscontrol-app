-- AlterTable: add default 'pendiente' to estado column
ALTER TABLE "catalogo_equipo" ALTER COLUMN "estado" SET DEFAULT 'pendiente';

-- Backfill: update existing records with empty or null estado
UPDATE "catalogo_equipo" SET "estado" = 'pendiente' WHERE "estado" = '' OR "estado" IS NULL;
