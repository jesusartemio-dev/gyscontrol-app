-- Migration: Cambio de margen a factorVenta + nuevo factorCosto (Solo Equipos)
-- Fecha: 2026-02-12
-- Descripción: Renombra margen → factorVenta (convirtiendo 0.15 → 1.15),
--              agrega factorCosto (default 1.00), hace precioLista obligatorio

-- ============================================================
-- 1. Rellenar precioLista donde es NULL (antes de hacerlo obligatorio)
-- ============================================================
UPDATE catalogo_equipo SET "precioLista" = "precioInterno" WHERE "precioLista" IS NULL;
UPDATE cotizacion_equipo_item SET "precioLista" = "precioInterno" WHERE "precioLista" IS NULL;
UPDATE plantilla_equipo_item SET "precioLista" = "precioInterno" WHERE "precioLista" IS NULL;
UPDATE plantilla_equipo_item_independiente SET "precioLista" = "precioInterno" WHERE "precioLista" IS NULL;

-- ============================================================
-- 2. Renombrar margen → factorVenta
-- ============================================================
ALTER TABLE catalogo_equipo RENAME COLUMN "margen" TO "factorVenta";
ALTER TABLE cotizacion_equipo_item RENAME COLUMN "margen" TO "factorVenta";
ALTER TABLE plantilla_equipo_item RENAME COLUMN "margen" TO "factorVenta";
ALTER TABLE plantilla_equipo_item_independiente RENAME COLUMN "margen" TO "factorVenta";

-- ============================================================
-- 3. Convertir valores: factorVenta = 1 + margen_anterior
--    Ejemplo: 0.15 → 1.15, 0.20 → 1.20
-- ============================================================
UPDATE catalogo_equipo SET "factorVenta" = 1 + "factorVenta";
UPDATE cotizacion_equipo_item SET "factorVenta" = 1 + "factorVenta";
UPDATE plantilla_equipo_item SET "factorVenta" = 1 + "factorVenta";
UPDATE plantilla_equipo_item_independiente SET "factorVenta" = 1 + "factorVenta";

-- ============================================================
-- 4. Agregar factorCosto con default 1.00
-- ============================================================
ALTER TABLE catalogo_equipo ADD COLUMN "factorCosto" DOUBLE PRECISION NOT NULL DEFAULT 1.00;
ALTER TABLE cotizacion_equipo_item ADD COLUMN "factorCosto" DOUBLE PRECISION NOT NULL DEFAULT 1.00;
ALTER TABLE plantilla_equipo_item ADD COLUMN "factorCosto" DOUBLE PRECISION NOT NULL DEFAULT 1.00;
ALTER TABLE plantilla_equipo_item_independiente ADD COLUMN "factorCosto" DOUBLE PRECISION NOT NULL DEFAULT 1.00;

-- ============================================================
-- 5. Hacer precioLista obligatorio (ya no hay NULLs después del paso 1)
-- ============================================================
ALTER TABLE catalogo_equipo ALTER COLUMN "precioLista" SET NOT NULL;
ALTER TABLE cotizacion_equipo_item ALTER COLUMN "precioLista" SET NOT NULL;
ALTER TABLE plantilla_equipo_item ALTER COLUMN "precioLista" SET NOT NULL;
ALTER TABLE plantilla_equipo_item_independiente ALTER COLUMN "precioLista" SET NOT NULL;

-- ============================================================
-- 6. Actualizar defaults de factorVenta
-- ============================================================
ALTER TABLE catalogo_equipo ALTER COLUMN "factorVenta" SET DEFAULT 1.15;
ALTER TABLE cotizacion_equipo_item ALTER COLUMN "factorVenta" SET DEFAULT 1.15;
ALTER TABLE plantilla_equipo_item ALTER COLUMN "factorVenta" SET DEFAULT 1.15;
ALTER TABLE plantilla_equipo_item_independiente ALTER COLUMN "factorVenta" SET DEFAULT 1.15;
