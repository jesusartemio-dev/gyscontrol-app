-- Add orden field to cotizacion_equipo
ALTER TABLE "cotizacion_equipo" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

-- Add orden field to cotizacion_equipo_item
ALTER TABLE "cotizacion_equipo_item" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

-- Initialize orden for existing cotizacion_equipo records (by createdAt within each cotizacion)
UPDATE "cotizacion_equipo" SET "orden" = subq.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "cotizacionId" ORDER BY "createdAt") - 1 AS rn
  FROM "cotizacion_equipo"
) AS subq
WHERE "cotizacion_equipo".id = subq.id;

-- Initialize orden for existing cotizacion_equipo_item records (by createdAt within each group)
UPDATE "cotizacion_equipo_item" SET "orden" = subq.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "cotizacionEquipoId" ORDER BY "createdAt") - 1 AS rn
  FROM "cotizacion_equipo_item"
) AS subq
WHERE "cotizacion_equipo_item".id = subq.id;
