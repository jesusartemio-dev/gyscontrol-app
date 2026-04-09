-- Add orden field to lista_equipo, lista_equipo_item, pedido_equipo, pedido_equipo_item
ALTER TABLE "lista_equipo" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "lista_equipo_item" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "pedido_equipo" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "pedido_equipo_item" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

-- Initialize orden based on createdAt within each parent
UPDATE "lista_equipo" SET "orden" = subq.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "proyectoId" ORDER BY "createdAt") - 1 AS rn
  FROM "lista_equipo"
) AS subq WHERE "lista_equipo".id = subq.id;

UPDATE "lista_equipo_item" SET "orden" = subq.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "listaId" ORDER BY "createdAt") - 1 AS rn
  FROM "lista_equipo_item"
) AS subq WHERE "lista_equipo_item".id = subq.id;

UPDATE "pedido_equipo" SET "orden" = subq.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "proyectoId" ORDER BY "createdAt") - 1 AS rn
  FROM "pedido_equipo"
) AS subq WHERE "pedido_equipo".id = subq.id;

UPDATE "pedido_equipo_item" SET "orden" = subq.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "pedidoId" ORDER BY "createdAt") - 1 AS rn
  FROM "pedido_equipo_item"
) AS subq WHERE "pedido_equipo_item".id = subq.id;
